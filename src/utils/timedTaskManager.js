// @ts-nocheck
import getAppEnvironment from "@/utils/EnvUtil.js";
import LogUtil from "@/utils/LogUtil.js";

// 仅在非 Electron 环境（即 Web）中动态导入 cron-parser
let cronParser = null;
if (typeof window !== 'undefined' && !getAppEnvironment().isDesktop) {
    import('cron-parser').then(mod => {
        cronParser = mod.default || mod;
    }).catch(err => {
        console.error('[TimedTaskManager] 加载 cron-parser 失败:', err);
    });
}

class TimedTaskManager {
    constructor() {
        this.env = getAppEnvironment();
        this.tasks = new Map();
        this.TASK_STATUS = {
            RUNNING: 'running',
            PAUSED: 'paused',
            STOPPED: 'stopped'
        };
        this.electronTaskHandlers = new Map();
    }

    /**
     * 创建任务
     * @param {Object} options
     * @param {string} options.id - 任务唯一ID
     * @param {Function} options.fn - 执行函数
     * @param {number} [options.interval] - 间隔毫秒数（scheduleType=interval 时必需）
     * @param {string} [options.cronExpression] - Cron 表达式（scheduleType=cron 时必需）
     * @param {'interval'|'cron'} [options.scheduleType='interval'] - 调度类型
     * @param {boolean} [options.immediate=false] - 是否立即执行一次
     * @param {number} [options.maxRetry=0] - 最大重试次数
     * @param {Function} [options.onError] - 错误回调
     * @returns {boolean}
     */
    createTask({ id, fn, interval, cronExpression, scheduleType = 'interval', immediate = false, maxRetry = 0, onError }) {
        if (this.tasks.has(id)) {
            LogUtil.warn(`[TimedTaskManager] 任务 ${id} 已存在，请勿重复创建`);
            return false;
        }

        if (scheduleType === 'cron') {
            if (!cronExpression) {
                LogUtil.error('[TimedTaskManager] cron 模式必须提供 cronExpression');
                return false;
            }
        } else if (scheduleType === 'interval') {
            if (interval == null || interval <= 0) {
                LogUtil.error('[TimedTaskManager] interval 模式必须提供有效 interval（>0）');
                return false;
            }
        } else {
            LogUtil.error('[TimedTaskManager] 不支持的 scheduleType:', scheduleType);
            return false;
        }

        const task = {
            id,
            fn,
            interval,
            cronExpression,
            scheduleType,
            immediate,
            maxRetry,
            onError,
            status: this.TASK_STATUS.STOPPED,
            retryCount: 0,
            lastExecuteTime: null,
            timerId: null,
            electronHandler: null,
            isRetryPaused: false,
            nextFireTime: null // 仅 Web cron 使用
        };

        this.tasks.set(id, task);
        task.status = this.TASK_STATUS.RUNNING;

        if (this.env.supportSchedule) {
            // Electron：委托主进程
            this._createElectronTask(task);
        } else {
            // Web：区分调度类型
            if (scheduleType === 'cron') {
                this._createWebCronTask(task);
            } else {
                this._createWebIntervalTask(task);
            }
        }

        LogUtil.info(
            `[TimedTaskManager] 任务 ${id} 创建成功`,
            `类型: ${scheduleType}`,
            scheduleType === 'cron' ? `cron: ${cronExpression}` : `间隔: ${interval}ms`,
            `环境: ${this.env.isDesktop ? 'Electron' : 'Web'}`
        );
        return true;
    }

    _createElectronTask(task) {
        const config =
            task.scheduleType === 'cron'
                ? { type: 'cron', cron: task.cronExpression,immediate:task.immediate }
                : { type: 'interval', interval: task.interval,immediate:task.immediate };

        window.schedulerAPI.scheduleTask(task.id, config);

        const handler = window.schedulerAPI.onTaskExecute(task.id, async () => {
            await this._executeTask(task);
        });

        this.electronTaskHandlers.set(task.id, handler);
        task.electronHandler = handler;
    }

    _createWebIntervalTask(task) {
        const run = async () => {
            await this._executeTask(task);
            if (task.status === this.TASK_STATUS.RUNNING) {
                this._startIntervalCycle(task);
            }
        };

        if (task.immediate) {
            run();
        } else {
            this._startIntervalCycle(task);
        }
    }

    _createWebCronTask(task) {
        if (!cronParser) {
            console.error('[TimedTaskManager] cron-parser 未加载，无法创建 cron 任务');
            if (typeof task.onError === 'function') {
                task.onError(new Error('缺少 cron-parser 依赖'), task);
            }
            this.deleteTask(task.id);
            return;
        }

        // 立即安排下一次执行
        this._scheduleNextCronExecution(task);

        // 如果 immediate 为 true，则额外立即执行一次（不干扰 cron 计划）
        if (task.immediate) {
            this._executeTask(task);
        }
    }

    _scheduleNextCronExecution(task) {
        if (!cronParser) return;

        try {
            const interval = cronParser.parseExpression(task.cronExpression, { currentDate: new Date() });
            const next = interval.next();
            task.nextFireTime = next.toDate();
            const delay = task.nextFireTime.getTime() - Date.now();

            if (delay > 0) {
                task.timerId = setTimeout(async () => {
                    await this._executeTask(task);
                    if (task.status === this.TASK_STATUS.RUNNING) {
                        this._scheduleNextCronExecution(task);
                    }
                }, delay);
            } else {
                // 安全兜底：理论上不会发生
                LogUtil.warn('[TimedTaskManager] cron 下次执行时间已过，重新计算');
                this._scheduleNextCronExecution(task);
            }
        } catch (e) {
            LogUtil.error(`[TimedTaskManager] cron 表达式解析失败: "${task.cronExpression}"`, e);
            if (typeof task.onError === 'function') {
                task.onError(new Error('Cron 表达式无效: ' + e.message), task);
            }
            this.deleteTask(task.id);
        }
    }

    _startIntervalCycle(task, customInterval) {
        const interval = customInterval || task.interval;
        if (task.timerId) {
            clearTimeout(task.timerId);
        }
        task.timerId = setTimeout(async () => {
            await this._executeTask(task);
            if (task.status === this.TASK_STATUS.RUNNING) {
                this._startIntervalCycle(task);
            }
        }, interval);
    }

    pauseTask(id) {
        const task = this.tasks.get(id);
        if (!task || task.status !== this.TASK_STATUS.RUNNING) return false;

        if (this.env.supportSchedule) {
            window.schedulerAPI.deactivateTask(id);
        } else {
            clearTimeout(task.timerId);
        }

        task.status = this.TASK_STATUS.PAUSED;
        LogUtil.info(`[TimedTaskManager] 任务 ${id} 已暂停`);
        return true;
    }

    resumeTask(id) {
        const task = this.tasks.get(id);
        if (!task || task.status !== this.TASK_STATUS.PAUSED) return false;

        if (this.env.supportSchedule) {
            window.schedulerAPI.activateTask(id);
        } else {
            if (task.scheduleType === 'cron') {
                this._scheduleNextCronExecution(task);
            } else {
                this._startIntervalCycle(task);
            }
        }

        task.isRetryPaused = false;
        task.status = this.TASK_STATUS.RUNNING;
        LogUtil.info(`[TimedTaskManager] 任务 ${id} 已恢复`);
        return true;
    }

    restartTask(id, newOptions = {}) {
        const task = this.tasks.get(id);
        if (!task) return false;

        this.deleteTask(id);

        const merged = {
            id: task.id,
            fn: task.fn,
            scheduleType: newOptions.scheduleType ?? task.scheduleType,
            interval: newOptions.interval ?? task.interval,
            cronExpression: newOptions.cronExpression ?? task.cronExpression,
            immediate: newOptions.immediate !== undefined ? newOptions.immediate : task.immediate,
            maxRetry: newOptions.maxRetry ?? task.maxRetry,
            onError: newOptions.onError ?? task.onError
        };

        return this.createTask(merged);
    }

    deleteTask(id) {
        const task = this.tasks.get(id);
        if (!task) return false;

        if (this.env.supportSchedule) {
            window.schedulerAPI.unregisterTask(id);
            if (task.electronHandler) {
                task.electronHandler();
                this.electronTaskHandlers.delete(id);
            }
        } else {
            clearTimeout(task.timerId);
        }

        this.tasks.delete(id);
        LogUtil.info(`[TimedTaskManager] 任务 ${id} 已销毁`);
        return true;
    }

    clearAllTasks() {
        this.tasks.forEach((task) => {
            if (this.env.supportSchedule) {
                window.schedulerAPI.unregisterTask(task.id);
                if (task.electronHandler) task.electronHandler();
            } else {
                clearTimeout(task.timerId);
            }
        });
        this.tasks.clear();
        this.electronTaskHandlers.clear();
        LogUtil.info(`[TimedTaskManager] 所有任务已清空`);
    }

    getTaskStatus(id) {
        const task = this.tasks.get(id);
        return task ? task.status : null;
    }

    /**
     * 获取 cron 任务下次执行时间（仅 Web 端有效）
     */
    getNextFireTime(id) {
        const task = this.tasks.get(id);
        if (!task || task.scheduleType !== 'cron') return null;
        if (this.env.supportSchedule) {
            LogUtil.warn('[TimedTaskManager] Electron 环境无法获取下次执行时间（需主进程支持）');
            return null;
        }
        return task.nextFireTime;
    }

    async _executeTask(task) {
        try {
            task.lastExecuteTime = new Date();
            LogUtil.log(`[TimedTaskManager] 任务 ${task.id} 开始执行 - ${task.lastExecuteTime.toLocaleString()}`);
            await task.fn();

            task.retryCount = 0; // 重置重试计数
            LogUtil.log(`[TimedTaskManager] 任务 ${task.id} 执行成功`);

            // Electron 重试恢复
            if (this.env.supportSchedule && task.isRetryPaused) {
                window.schedulerAPI.activateTask(task.id);
                task.isRetryPaused = false;
                task.status = this.TASK_STATUS.RUNNING;
                LogUtil.info(`[TimedTaskManager] 任务 ${task.id} 恢复主进程定时（重试成功）`);
            }
        } catch (error) {
            LogUtil.error(`[TimedTaskManager] 任务 ${task.id} 执行失败:`, error);

            if (typeof task.onError === 'function') {
                task.onError(error, task);
            }

            if (task.status === this.TASK_STATUS.RUNNING) {
                task.retryCount++;
                if (task.retryCount <= task.maxRetry) {
                    LogUtil.info(`[TimedTaskManager] 任务 ${task.id} 将进行第 ${task.retryCount} 次重试`);

                    if (this.env.supportSchedule) {
                        this.pauseTask(task.id);
                        task.isRetryPaused = true;
                        setTimeout(() => {
                            const current = this.tasks.get(task.id);
                            if (current) this._executeTask(current);
                        }, 1000);
                    } else {
                        // Web：1秒后重试
                        this._startIntervalCycle(task, 1000);
                    }
                } else {
                    LogUtil.error(`[TimedTaskManager] 任务 ${task.id} 重试 ${task.maxRetry} 次失败，停止执行`);
                    task.isRetryPaused = false;
                    this.deleteTask(task.id);
                }
            }
        }
    }
}

export const timedTaskManager = new TimedTaskManager();