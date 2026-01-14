// src/utils/TaskManager.js
import getAppEnvironment from "@/utils/EnvUtil.js";
import {batchLogger} from "@/utils/logger.js";
class TaskManager {
    constructor() {
        this.env = getAppEnvironment();
        this.tasks = new Map(); // 存储任务状态
        this.electronHandlers = new Map(); // 存储Electron任务处理器

        batchLogger.info(`[TaskManager] 初始化完成 | 环境: ${this.env.isDesktop ? 'Electron' : 'Web'}`);
    }

    /**
     * 注册新任务
     * @param {string} taskId - 任务唯一ID
     * @param {Object} config - 任务配置
     * @param {Function} executor - 任务执行函数
     * @returns {boolean} 是否注册成功
     */
    registerTask(taskId, config, executor) {
        if (this.tasks.has(taskId)) {
            batchLogger.warn(`[TaskManager] 任务 ${taskId} 已存在`);
            return false;
        }

        // 创建任务对象
        const task = {
            id: taskId,
            config,
            executor,
            status: 'registered',
            createdAt: new Date()
        };

        this.tasks.set(taskId, task);

        // 根据环境选择注册方式
        if (this.env.isElectron && this.env.supportSchedule) {
            return this._registerElectronTask(task);
        } else {
            return this._registerWebTask(task);
        }
    }

    /**
     * 激活任务
     * @param {string} taskId - 任务ID
     * @returns {boolean} 是否激活成功
     */
    activateTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            batchLogger.warn(`[TaskManager] 激活失败: 任务 ${taskId} 不存在`);
            return false;
        }

        if (task.status === 'active') {
            batchLogger.info(`[TaskManager] 任务 ${taskId} 已是激活状态`);
            return true;
        }

        if (this.env.isElectron && this.env.supportSchedule) {
            return this._activateElectronTask(task);
        } else {
            return this._activateWebTask(task);
        }
    }

    /**
     * 停用任务
     * @param {string} taskId - 任务ID
     * @returns {boolean} 是否停用成功
     */
    deactivateTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            batchLogger.warn(`[TaskManager] 停用失败: 任务 ${taskId} 不存在`);
            return false;
        }

        if (task.status === 'inactive') {
            batchLogger.info(`[TaskManager] 任务 ${taskId} 已是停用状态`);
            return true;
        }

        if (this.env.isElectron && this.env.supportSchedule) {
            return this._deactivateElectronTask(task);
        } else {
            return this._deactivateWebTask(task);
        }
    }

    /**
     * 注销任务
     * @param {string} taskId - 任务ID
     * @returns {boolean} 是否注销成功
     */
    unregisterTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            batchLogger.warn(`[TaskManager] 注销失败: 任务 ${taskId} 不存在`);
            return false;
        }

        // 先停用任务
        if (task.status === 'active') {
            this.deactivateTask(taskId);
        }

        // 根据环境选择注销方式
        if (this.env.isElectron && this.env.supportSchedule) {
            this._unregisterElectronTask(task);
        } else {
            this._unregisterWebTask(task);
        }

        // 从任务列表中移除
        this.tasks.delete(taskId);
        batchLogger.info(`[TaskManager] 任务 ${taskId} 已注销`);
        return true;
    }

    /**
     * 获取任务状态
     * @param {string} taskId - 任务ID
     * @returns {string|null} 任务状态
     */
    getTaskStatus(taskId) {
        const task = this.tasks.get(taskId);
        return task ? task.status : null;
    }

    /**
     * 获取所有任务
     * @returns {Array} 任务列表
     */
    getAllTasks() {
        return Array.from(this.tasks.values());
    }

    // ======================
    // Electron 环境实现
    // ======================
    _registerElectronTask(task) {
        try {
            const { type, cronExpression, interval, immediate } = task.config;

            // 调用Electron API注册任务
            window.schedulerAPI.scheduleTask(task.id, {
                type,
                cronExpression: type === 'cron' ? cronExpression : '',
                interval: type === 'interval' ? interval : null,
                immediate
            });

            // 设置任务执行处理器
            const handler = window.schedulerAPI.onTaskExecute(task.id, async () => {
                try {
                    await task.executor();
                    batchLogger.info(`[TaskManager] 任务 ${task.id} 执行成功`);
                } catch (error) {
                    batchLogger.error(`[TaskManager] 任务 ${task.id} 执行失败:`, error);
                }
            });

            // 保存处理器引用
            this.electronHandlers.set(task.id, handler);
            task.status = 'registered';

            batchLogger.info(`[TaskManager] Electron任务 ${task.id} 注册成功`, task.config);
            return true;
        } catch (error) {
            batchLogger.error(`[TaskManager] Electron任务 ${task.id} 注册失败:`, error);
            return false;
        }
    }

    _activateElectronTask(task) {
        try {
            window.schedulerAPI.activateTask(task.id);
            task.status = 'active';
            batchLogger.info(`[TaskManager] Electron任务 ${task.id} 已激活`);
            return true;
        } catch (error) {
            batchLogger.error(`[TaskManager] Electron任务 ${task.id} 激活失败:`, error);
            return false;
        }
    }

    _deactivateElectronTask(task) {
        try {
            window.schedulerAPI.deactivateTask(task.id);
            task.status = 'inactive';
            batchLogger.info(`[TaskManager] Electron任务 ${task.id} 已停用`);
            return true;
        } catch (error) {
            batchLogger.error(`[TaskManager] Electron任务 ${task.id} 停用失败:`, error);
            return false;
        }
    }

    _unregisterElectronTask(task) {
        try {
            // 移除处理器
            const handler = this.electronHandlers.get(task.id);
            if (handler) {
                handler();
                this.electronHandlers.delete(task.id);
            }

            // 注销任务
            window.schedulerAPI.unregisterTask(task.id);
            batchLogger.info(`[TaskManager] Electron任务 ${task.id} 已注销`);
        } catch (error) {
            batchLogger.error(`[TaskManager] Electron任务 ${task.id} 注销失败:`, error);
        }
    }

    // ======================
    // 浏览器环境实现
    // ======================
    _registerWebTask(task) {
        try {
            task.status = 'registered';
            batchLogger.info(`[TaskManager] Web任务 ${task.id} 注册成功`, task.config);
            return true;
        } catch (error) {
            batchLogger.error(`[TaskManager] Web任务 ${task.id} 注册失败:`, error);
            return false;
        }
    }

    _activateWebTask(task) {
        try {
            const { type, cronExpression, interval } = task.config;

            if (type === 'interval') {
                // 间隔任务
                task.timerId = setInterval(() => {
                    task.executor().catch(e => batchLogger.error(`[TaskManager] 任务 ${task.id} 执行失败:`, e));
                }, interval);
            } else if (type === 'cron') {
                // Cron任务 - 简化处理为每分钟检查一次
                task.timerId = setInterval(() => {
                    // 实际应用中应使用cron-parser库进行精确计算
                    task.executor().catch(e => batchLogger.error(`[TaskManager] 任务 ${task.id} 执行失败:`, e));
                }, 3600000); // 每60分钟检查一次
            }

            task.status = 'active';
            batchLogger.info(`[TaskManager] Web任务 ${task.id} 已激活`);
            return true;
        } catch (error) {
            batchLogger.error(`[TaskManager] Web任务 ${task.id} 激活失败:`, error);
            return false;
        }
    }

    _deactivateWebTask(task) {
        try {
            if (task.timerId) {
                clearInterval(task.timerId);
                task.timerId = null;
            }
            task.status = 'inactive';
            batchLogger.info(`[TaskManager] Web任务 ${task.id} 已停用`);
            return true;
        } catch (error) {
            batchLogger.error(`[TaskManager] Web任务 ${task.id} 停用失败:`, error);
            return false;
        }
    }

    _unregisterWebTask(task) {
        try {
            if (task.timerId) {
                clearInterval(task.timerId);
            }
            batchLogger.info(`[TaskManager] Web任务 ${task.id} 已注销`);
        } catch (error) {
            batchLogger.error(`[TaskManager] Web任务 ${task.id} 注销失败:`, error);
        }
    }
}

// 导出单例实例
export default new TaskManager();