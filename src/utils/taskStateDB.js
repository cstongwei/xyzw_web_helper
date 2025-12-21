// Lightweight IndexedDB wrapper for task state persistence (独立数据库)
const TASK_DB_NAME = 'xyzw_task_db' // 独立的任务数据库名称
const TASK_DB_VERSION = 1 // 任务数据库版本
const TASK_STORE_NAME = 'taskStates' // 任务状态存储库名称
const GLOBAL_TASK_STATE_KEY = 'globalTaskState' // 单条记录存储全局任务状态

/**
 * 定时任务状态存储类（独立数据库）
 * 与 Token 数据库完全隔离，职责单一
 */
export class TaskStateDB {
    /**
     * 打开独立的任务数据库连接
     */
    static openDB() {
        return new Promise((resolve, reject) => {
            // 打开独立的任务数据库（非 xyzw_token_db）
            const req = indexedDB.open(TASK_DB_NAME, TASK_DB_VERSION)

            // 数据库首次创建/版本升级时执行
            req.onupgradeneeded = (event) => {
                const db = req.result
                // 创建任务状态存储库（keyPath 为 'id'，存储单条全局状态）
                if (!db.objectStoreNames.contains(TASK_STORE_NAME)) {
                    db.createObjectStore(TASK_STORE_NAME, { keyPath: 'id' })
                }
                console.log('任务数据库初始化/升级完成')
            }

            req.onsuccess = () => {
                console.log('任务数据库连接成功')
                resolve(req.result)
            }
            req.onerror = () => {
                console.error('任务数据库连接失败:', req.error)
                reject(req.error)
            }
        })
    }

    /**
     * 封装存储库操作（事务处理）
     * @param {string} mode - 事务模式：readonly / readwrite
     * @param {Function} fn - 操作存储库的回调函数
     * @returns {Promise<any>} 操作结果
     */
    static async withStore(mode, fn) {
        const db = await this.openDB()
        return new Promise((resolve, reject) => {
            const tx = db.transaction(TASK_STORE_NAME, mode)
            const store = tx.objectStore(TASK_STORE_NAME)
            const result = fn(store)

            tx.oncomplete = () => {
                db.close() // 操作完成后关闭数据库连接
                resolve(result)
            }
            tx.onerror = () => {
                db.close()
                reject(tx.error)
            }
            tx.onabort = () => {
                db.close()
                reject(tx.error)
            }
        })
    }

    /**
     * 保存定时任务状态到独立数据库
     * @param {Object} state - 任务状态对象（count、taskStatus、logBatches 等）
     * @returns {Promise<void>}
     */
    static async saveTaskState(state) {
        return this.withStore('readwrite', (store) => {
            // 存储单条全局任务状态，id 固定为 GLOBAL_TASK_STATE_KEY
            store.put({ id: GLOBAL_TASK_STATE_KEY, ...state })
        })
    }

    /**
     * 从独立数据库加载定时任务状态
     * @returns {Promise<Object|undefined>} 任务状态（无数据返回 undefined）
     */
    static async loadTaskState() {
        return this.withStore('readonly', (store) => {
            return new Promise((resolve, reject) => {
                const req = store.get(GLOBAL_TASK_STATE_KEY)
                req.onsuccess = () => {
                    // 返回状态数据（剔除 id 字段）
                    const savedState = req.result
                    resolve(savedState ? {
                        count: savedState.count,
                        taskStatus: savedState.taskStatus,
                        lastExecuteTime: savedState.lastExecuteTime,
                        nextExecuteTime: savedState.nextExecuteTime,
                        countdownText: savedState.countdownText,
                        logBatches: savedState.logBatches
                    } : undefined)
                }
                req.onerror = () => reject(req.error)
            })
        })
    }

    /**
     * 清空独立数据库中的任务状态
     * @returns {Promise<void>}
     */
    static async clearTaskState() {
        return this.withStore('readwrite', (store) => {
            store.delete(GLOBAL_TASK_STATE_KEY)
        })
    }

    /**
     * 销毁整个任务数据库（谨慎使用）
     * @returns {Promise<void>}
     */
    static async deleteTaskDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.deleteDatabase(TASK_DB_NAME)
            req.onsuccess = () => resolve()
            req.onerror = () => reject(req.error)
        })
    }
}

// 导出便捷方法（与 Token 存储风格一致）
export async function saveTaskState(state) {
    return TaskStateDB.saveTaskState(state)
}

export async function loadTaskState() {
    return TaskStateDB.loadTaskState()
}

export async function clearTaskState() {
    return TaskStateDB.clearTaskState()
}

export async function deleteTaskDB() {
    return TaskStateDB.deleteTaskDB()
}