import getAppEnvironment from "@/utils/EnvUtil.js";

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

    createTask({ id, fn, interval, immediate = false, maxRetry = 0, onError }) {
        if (this.tasks.has(id)) {
            console.warn(`[TimedTaskManager] 任务${id}已存在，请勿重复创建`);
            return false;
        }

        const task = {
            id,
            fn,
            interval,
            immediate,
            maxRetry,
            onError,
            status: this.TASK_STATUS.STOPPED,
            retryCount: 0,
            lastExecuteTime: null,
            timerId: null,
            electronHandler: null,
            isRetryPaused: false
        };

        this.tasks.set(id, task);
        task.status = this.TASK_STATUS.RUNNING;

        if (this.env.supportSchedule) {
            this._createElectronTask(task);
        } else {
            this._createWebTask(task);
        }

        console.info(`[TimedTaskManager] 任务${id}创建成功，间隔${interval}ms，立即执行:${immediate}，环境:${this.env.isDesktop ? 'Electron' : 'Web'}`);
        return true;
    }

    _createElectronTask(task) {
        const { id, interval } = task;

        window.schedulerAPI.scheduleTask(id, {
            type: 'interval',
            interval: interval
        });

        const handler = window.schedulerAPI.onTaskExecute(id, async () => {
            await this._executeTask(task);
        });

        this.electronTaskHandlers.set(id, handler);
        task.electronHandler = handler;

        // if (task.immediate) {
        //     this._executeTask(task);
        // }
    }

    _createWebTask(task) {
        if (task.immediate) {
            this._executeTask(task).then(() => {
                if (task.status === this.TASK_STATUS.RUNNING) {
                    this._startCycle(task);
                }
            });
        } else {
            this._startCycle(task);
        }
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
        console.info(`[TimedTaskManager] 任务${id}已暂停`);
        return true;
    }

    resumeTask(id) {
        const task = this.tasks.get(id);
        if (!task || task.status !== this.TASK_STATUS.PAUSED) return false;

        if (this.env.supportSchedule) {
            window.schedulerAPI.activateTask(id);
        } else {
            this._startCycle(task);
        }

        task.isRetryPaused = false;
        task.status = this.TASK_STATUS.RUNNING;

        console.info(`[TimedTaskManager] 任务${id}已恢复`);
        return true;
    }

    restartTask(id, newOptions = {}) {
        const task = this.tasks.get(id);
        if (!task) return false;

        this.deleteTask(id);
        return this.createTask({
            id: task.id,
            fn: task.fn,
            interval: newOptions.interval || task.interval,
            immediate: newOptions.immediate || task.immediate,
            maxRetry: newOptions.maxRetry || task.maxRetry,
            onError: newOptions.onError || task.onError
        });
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
        console.info(`[TimedTaskManager] 任务${id}已销毁`);
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
        console.info(`[TimedTaskManager] 所有任务已清空`);
    }

    getTaskStatus(id) {
        const task = this.tasks.get(id);
        return task ? task.status : null;
    }

    async _executeTask(task) {
        try {
            task.lastExecuteTime = new Date();
            console.log(`[TimedTaskManager] 任务${task.id}开始执行 - ${task.lastExecuteTime.toLocaleString()}`);
            await task.fn();

            // 执行成功后重置重试计数
            task.retryCount = 0;
            console.log(`[TimedTaskManager] 任务${task.id}执行成功`);

            if (this.env.supportSchedule && task.isRetryPaused) {
                window.schedulerAPI.activateTask(task.id);
                task.isRetryPaused = false;
                task.status = this.TASK_STATUS.RUNNING; // 同步本地状态，保证一致性
                console.info(`[TimedTaskManager] 任务${task.id}恢复主进程定时（重试成功）`);
            }
        } catch (error) {
            console.error(`[TimedTaskManager] 任务${task.id}执行失败:`, error);

            if (typeof task.onError === 'function') {
                task.onError(error, task);
            }

            // 仅在任务运行时处理重试
            if (task.status === this.TASK_STATUS.RUNNING) {
                task.retryCount++;

                if (task.retryCount <= task.maxRetry) {
                    console.info(`[TimedTaskManager] 任务${task.id}将进行第${task.retryCount}次重试`);

                    if (this.env.supportSchedule) {
                        // Electron环境：暂停主进程任务，避免双定时器
                        this.pauseTask(task.id);
                        task.isRetryPaused = true;

                        setTimeout(() => {
                            const currentTask = this.tasks.get(task.id);
                            if (currentTask) {
                                this._executeTask(currentTask);
                            }
                        }, 1000);
                    } else {
                        // Web环境：使用自定义间隔启动循环
                        this._startCycle(task, 1000);
                    }
                } else {
                    console.error(`[TimedTaskManager] 任务${task.id}重试${task.maxRetry}次失败，停止执行`);
                    task.isRetryPaused = false;
                    this.deleteTask(task.id);
                }
            }
        }
    }

    _startCycle(task, customInterval) {
        const interval = customInterval || task.interval;

        if (task.timerId) {
            clearTimeout(task.timerId);
        }

        task.timerId = setTimeout(async () => {
            await this._executeTask(task);

            if (task.status === this.TASK_STATUS.RUNNING) {
                this._startCycle(task);
            }
        }, interval);

        console.log(`[TimedTaskManager] 任务${task.id}已安排下一次执行（${interval}ms后）`);
    }
}

export const timedTaskManager = new TimedTaskManager();