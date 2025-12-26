import { ref, computed, onUnmounted } from 'vue'
import { useTokenStore } from '@/stores/tokenStore'
import { timedTaskManager } from '@/utils/timedTaskManager'
import { useMessage } from 'naive-ui'
import LogUtil from "@/utils/LogUtil.js";
import { ensureWebSocketConnected } from "@/utils/CommonUtil.js";

// 公共常量
const CONNECT_TIMEOUT = 15000
const DELAY_MEDIUM = 500
const RETRY_INTERVAL_MS = 30 * 1000
const MAX_RETRY_TIMES = 10
const DEFAULT_INTERVAL_MINUTES = 381


/**
 * 公共任务管理 Composable
 * @param {Object} options - 任务配置
 * @param {string} options.taskKey - 任务唯一标识（如 'hangup'/'saltjar'）
 * @param {string} options.taskName - 任务名称
 * @param {Function} options.executeBusiness - 业务逻辑 (token) => Promise<{success: boolean, messages: string[]}>
 * @param {'interval'|'cron'} [options.scheduleType='interval'] - 调度类型（新增）
 * @param {string} [options.cronExpression] - Cron 表达式（仅 scheduleType='cron' 时有效）
 */
export function useTaskManager(options) {
    // 校验必填
    if (!options.taskKey || !options.taskName || typeof options.executeBusiness !== 'function') {
        throw new Error('taskKey、taskName、executeBusiness 为必填配置')
    }

    const tokenStore = useTokenStore()
    const message = useMessage()
    const TASK_ID = `task-${options.taskKey}`

    // 新增：调度类型与表达式（向后兼容）
    const scheduleType = options.scheduleType || 'interval'
    const cronExpression = options.cronExpression
    const immediate = options.immediate
    // 原有 interval 配置（仅 interval 模式使用）
    const intervalMinutes = ref('')
    const validatedInterval = ref(DEFAULT_INTERVAL_MINUTES)

    // 任务状态
    const taskStatus = ref('idle')
    const executeCount = ref(0)
    const lastExecuteTime = ref('')
    const nextExecuteTime = ref('')
    const countdownText = ref('00:00:00')
    const logBatches = ref([])
    const expandedBatchIds = ref(new Set())
    let countdownFrame = null

    // ========== 工具方法（不变）==========
    const generateBatchId = () => Date.now() + '-' + Math.random().toString(36).substr(2, 9)

    const formatLogMsg = (msg) => {
        if (!msg) return ''
        const keywords = ['领取挂机', '加钟', '盐罐机器人', '爬塔', '体力', '阵容', 'Token']
        let formattedMsg = msg
        keywords.forEach(keyword => {
            const reg = new RegExp(keyword, 'g')
            formattedMsg = formattedMsg.replace(reg, `<span class="keyword-highlight">${keyword}</span>`)
        })
        return formattedMsg
    }

    // ⚠️ 注意：validateInterval 仅对 interval 模式有效
    const validateInterval = (fixTimeTask) => {
        if (fixTimeTask || scheduleType !== 'interval') return
        const inputVal = Number(intervalMinutes.value)
        if (!intervalMinutes.value || isNaN(inputVal) || inputVal < 1) {
            validatedInterval.value = DEFAULT_INTERVAL_MINUTES
            message.warning(`执行间隔输入无效，已恢复默认值：${DEFAULT_INTERVAL_MINUTES} 分钟`)
        } else {
            validatedInterval.value = inputVal
            message.success(`执行间隔已设置为：${inputVal} 分钟`)
        }
    }

    // ========== Token 重试 & 批处理（不变）==========
    const processTokenWithRetry = async (token, retryCount = 0) => {
        let allMessages = []
        try {
            const connectResult = await ensureWebSocketConnected(token)
            allMessages = [...allMessages, ...connectResult.messages]
            if (!connectResult.success) {
                if (connectResult.needTry) {
                    throw new Error(`Token ${token.name} 连接失败，触发重试（${retryCount + 1}/${MAX_RETRY_TIMES}）`)
                } else {
                    return { success: false, allMessages }
                }
            }
            const businessResult = await options.executeBusiness(token)
            allMessages = [...allMessages, ...businessResult.messages]
            if (businessResult.success) {
                return { success: true, allMessages }
            } else {
                throw new Error(`Token ${token.name} ${options.taskName} 业务执行失败，触发重试（${retryCount + 1}/${MAX_RETRY_TIMES}）`)
            }
        } catch (error) {
            allMessages.push(`[${token.name}] 错误：${error.message}`)
            if (retryCount < MAX_RETRY_TIMES) {
                allMessages.push(`[${token.name}] 将在 ${RETRY_INTERVAL_MS / 60000} 分钟后进行第 ${retryCount + 1} 次重试...`)
                await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL_MS))
                return await processTokenWithRetry(token, retryCount + 1)
            } else {
                allMessages.push(`[${token.name}] 已达最大重试次数（${MAX_RETRY_TIMES}次），${options.taskName} 任务最终失败`)
                return { success: false, allMessages }
            }
        }
    }

    const batchProcessTokens = async () => {
        const tokens = tokenStore.gameTokens || []
        const batchId = generateBatchId()
        const currentTime = new Date().toLocaleString()

        if (tokens.length === 0) {
            const emptyBatch = {
                batchId,
                timestamp: currentTime,
                type: 'empty',
                mainMessage: `[${currentTime}] 当前无可用Token，本次${options.taskName}任务跳过执行`,
                tokenDetails: []
            }
            logBatches.value.push(emptyBatch)
            executeCount.value += 1
            lastExecuteTime.value = currentTime
            calculateNextExecuteTime()
            message.warning(`当前无可用Token，本次${options.taskName}任务已跳过`)
            return
        }

        const batchRecord = {
            batchId,
            timestamp: currentTime,
            type: 'processing',
            mainMessage: `[${currentTime}] ${options.taskName}任务开始执行，共 ${tokens.length} 个 Token`,
            tokenDetails: []
        }
        logBatches.value.push(batchRecord)
        message.info(batchRecord.mainMessage)

        for (const token of tokens) {
            const tokenDetail = {
                tokenName: token.name || '未知Token',
                tokenId: token.id || '未知ID',
                status: 'success',
                messages: []
            }
            const result = await processTokenWithRetry(token, 0)
            tokenDetail.messages = result.allMessages
            tokenDetail.status = result.success ? 'success' : 'error'
            batchRecord.tokenDetails.push(tokenDetail)
        }

        batchRecord.type = batchRecord.tokenDetails.some(t => t.status === 'error') ? 'error' : 'success'
        batchRecord.mainMessage = `[${new Date().toLocaleString()}] ${options.taskName}任务处理完成，成功：${batchRecord.tokenDetails.filter(t => t.status === 'success').length} / 失败：${batchRecord.tokenDetails.filter(t => t.status === 'error').length}`

        executeCount.value += 1
        lastExecuteTime.value = new Date().toLocaleString()
        calculateNextExecuteTime()
        message.success(batchRecord.mainMessage)
    }

    // ========== 任务生命周期（关键改造点）==========
    const startTask = (fixTimeTask = false) => {
        // 仅 interval 模式需要验证输入
        if (scheduleType === 'interval') {
            validateInterval(fixTimeTask)
        }

        // 清理旧任务
        if (timedTaskManager.getTaskStatus(TASK_ID)) {
            timedTaskManager.deleteTask(TASK_ID)
        }

        // 构建任务参数
        const taskConfig = {
            id: TASK_ID,
            fn: async () => {
                try {
                    await batchProcessTokens()
                } finally {

                }
            },
            immediate: immediate,
            maxRetry: 3,
            onError: async (error) => {
                const batchId = generateBatchId()
                logBatches.value.push({
                    batchId,
                    timestamp: new Date().toLocaleString(),
                    type: 'error',
                    mainMessage: `[${new Date().toLocaleString()}] ${options.taskName}任务执行失败：${error.message}`,
                    tokenDetails: []
                })
                console.error(`${options.taskName}任务执行失败`, error)
                message.error(`${options.taskName}任务执行失败：${error.message}`)
                taskStatus.value = 'error'
            }
        }

        // 根据调度类型注入不同参数
        if (scheduleType === 'cron') {
            if (!cronExpression) {
                message.error('Cron 模式必须提供 cronExpression')
                return
            }
            taskConfig.scheduleType = 'cron'
            taskConfig.cronExpression = cronExpression
        } else {
            // 默认 interval 模式
            taskConfig.scheduleType = 'interval'
            taskConfig.interval = validatedInterval.value * 60 * 1000
        }

        const success = timedTaskManager.createTask(taskConfig)

        if (success) {
            taskStatus.value = 'running'
            const batchId = generateBatchId()
            logBatches.value.push({
                batchId,
                timestamp: new Date().toLocaleString(),
                type: 'system',
                mainMessage: `[${new Date().toLocaleString()}] ${options.taskName}任务已启动（模式：${scheduleType}${scheduleType === 'cron' ? `, cron: ${cronExpression}` : `, 间隔：${validatedInterval.value} 分钟`})`,
                tokenDetails: []
            })
            message.success(`${options.taskName}任务已启动（模式：${scheduleType}${scheduleType === 'cron' ? `, cron: ${cronExpression}` : `, 间隔：${validatedInterval.value} 分钟`})`)
        } else {
            message.error(`${options.taskName}任务启动失败`)
        }
    }

    const pauseTask = () => {
        const success = timedTaskManager.pauseTask(TASK_ID)
        if (success) {
            taskStatus.value = 'paused'
            calculateNextExecuteTime()
            const batchId = generateBatchId()
            logBatches.value.push({
                batchId,
                timestamp: new Date().toLocaleString(),
                type: 'system',
                mainMessage: `[${new Date().toLocaleString()}] ${options.taskName}任务已暂停`,
                tokenDetails: []
            })
            message.success(`${options.taskName}任务已暂停`)
        } else {
            message.error(`${options.taskName}任务暂停失败`)
        }
    }

    const resumeTask = () => {
        const success = timedTaskManager.resumeTask(TASK_ID)
        if (success) {
            taskStatus.value = 'running'
            calculateNextExecuteTime()
            const batchId = generateBatchId()
            logBatches.value.push({
                batchId,
                timestamp: new Date().toLocaleString(),
                type: 'system',
                mainMessage: `[${new Date().toLocaleString()}] ${options.taskName}任务已恢复执行`,
                tokenDetails: []
            })
            message.success(`${options.taskName}任务已恢复执行`)
        } else {
            message.error(`${options.taskName}任务恢复失败`)
        }
    }

    const restartTask = (fixTimeTask = false) => {
        if (scheduleType === 'interval') {
            validateInterval(fixTimeTask)
        }
        timedTaskManager.pauseTask(TASK_ID)
        // 构建重启参数
        const restartConfig = {
            fn: async () => {
                try {
                    await batchProcessTokens()
                } finally {
                }
            }
        }

        if (scheduleType === 'cron') {
            restartConfig.scheduleType = 'cron'
            restartConfig.cronExpression = cronExpression
            restartConfig.immediate = immediate
        } else {
            restartConfig.scheduleType = 'interval'
            restartConfig.interval = validatedInterval.value * 60 * 1000
            restartConfig.immediate = immediate
        }

        const success = timedTaskManager.restartTask(TASK_ID, restartConfig)

        if (success) {
            taskStatus.value = 'running'
            executeCount.value = 0
            lastExecuteTime.value = ''
            calculateNextExecuteTime()
            const batchId = generateBatchId()
            logBatches.value.push({
                batchId,
                timestamp: new Date().toLocaleString(),
                type: 'system',
                mainMessage: `[${new Date().toLocaleString()}] ${options.taskName}任务已重启（模式：${scheduleType}${scheduleType === 'cron' ? `, cron: ${cronExpression}` : `, 间隔：${validatedInterval.value} 分钟`})，执行计数已重置`,
                tokenDetails: []
            })
            message.success(`${options.taskName}任务已重启（模式：${scheduleType}${scheduleType === 'cron' ? `, cron: ${cronExpression}` : `, 间隔：${validatedInterval.value} 分钟`})，执行计数已重置`)
        } else {
            message.error(`${options.taskName}任务重启失败`)
        }
    }

    const clearLogs = () => {
        logBatches.value = []
        message.success(`${options.taskName}任务日志已清空`)
    }

    const toggleBatchExpand = (batchId) => {
        if (expandedBatchIds.value.has(batchId)) {
            expandedBatchIds.value.delete(batchId)
        } else {
            expandedBatchIds.value.add(batchId)
        }
    }

    // ========== 倒计时逻辑（适配 cron）==========
    const updateCountdown = (nextTimeStr, nextTime) => {
        const now = Date.now()
        const diff = nextTime.getTime() - now
        if (diff <= 0) {
            nextExecuteTime.value = nextTimeStr
            countdownText.value = '00:00:00'
            return
        }
        const hours = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0')
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0')
        const seconds = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0')
        countdownText.value = `${hours}:${minutes}:${seconds}`
        nextExecuteTime.value = nextTimeStr
        countdownFrame = requestAnimationFrame(() => updateCountdown(nextTimeStr, nextTime))
    }

    const calculateNextExecuteTime = () => {
        if (taskStatus.value !== 'running') {
            nextExecuteTime.value = '任务未运行/已暂停'
            countdownText.value = '00:00:00'
            if (countdownFrame) {
                cancelAnimationFrame(countdownFrame)
                countdownFrame = null
            }
            return
        }

        // 如果是 cron 模式且在 Web 环境，尝试获取下次执行时间
        if (scheduleType === 'cron' && !timedTaskManager.env.supportSchedule) {
            const nextTime = timedTaskManager.getNextFireTime(TASK_ID)
            if (nextTime) {
                updateCountdown(nextTime.toLocaleString(), nextTime)
                return
            }
        }

        // 否则回退到 interval 模式计算
        const lastExecTime = lastExecuteTime.value ? new Date(lastExecuteTime.value) : new Date()
        const intervalMs = (scheduleType === 'interval' ? validatedInterval.value : DEFAULT_INTERVAL_MINUTES) * 60 * 1000
        const nextTime = new Date(lastExecTime.getTime() + intervalMs)
        updateCountdown(nextTime.toLocaleString(), nextTime)
    }

    // ========== 状态计算（不变）==========
    const taskStatusStyle = computed(() => {
        const statusMap = { running: 'success', paused: 'warning', error: 'error', idle: 'default' }
        return statusMap[taskStatus.value]
    })

    const taskStatusText = computed(() => {
        const statusMap = { running: '运行中', paused: '已暂停', error: '执行失败', idle: '未运行' }
        return statusMap[taskStatus.value]
    })

    // ========== 卸载清理（不变）==========
    onUnmounted(() => {
        if (countdownFrame) cancelAnimationFrame(countdownFrame)
        timedTaskManager.pauseTask(TASK_ID)
        const batchId = generateBatchId()
        logBatches.value.push({
            batchId,
            timestamp: new Date().toLocaleString(),
            type: 'system',
            mainMessage: `[${new Date().toLocaleString()}] ${options.taskName}任务组件已卸载，任务已暂停`,
            tokenDetails: []
        })
        message.info(`${options.taskName}任务组件已卸载，相关资源已清理`)
    })

    // ========== 返回（暴露 scheduleType 供 UI 使用）==========
    return {
        // 配置
        intervalMinutes,
        scheduleType, // 新增：暴露调度类型
        cronExpression, // 新增：暴露 cron 表达式
        DEFAULT_INTERVAL_MINUTES,
        // 状态
        taskStatus,
        taskStatusStyle,
        taskStatusText,
        executeCount,
        lastExecuteTime,
        nextExecuteTime,
        countdownText,
        logBatches,
        expandedBatchIds,
        // 方法
        startTask,
        pauseTask,
        resumeTask,
        restartTask,
        clearLogs,
        toggleBatchExpand,
        formatLogMsg,
        validateInterval
    }
}