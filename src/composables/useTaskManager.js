import { ref, computed, onUnmounted } from 'vue'
import { useTokenStore } from '@/stores/tokenStore'
import { timedTaskManager } from '@/utils/timedTaskManager'
import { useMessage } from 'naive-ui'
import LogUtil from "@/utils/LogUtil.js";

// 公共常量
const CONNECT_TIMEOUT = 15000 // WebSocket 连接超时（ms）
const DELAY_MEDIUM = 500 // 连接检查间隔（ms）
const RETRY_INTERVAL_MS = 2 * 60 * 1000 // 失败重试间隔：2分钟
const MAX_RETRY_TIMES = 10 // 最大重试次数
const DEFAULT_INTERVAL_MINUTES = 280 // 默认间隔分钟

/**
 * 公共任务管理 Composable
 * @param {Object} options - 任务配置
 * @param {string} options.taskKey - 任务唯一标识（如 'hangup'/'saltjar'）
 * @param {string} options.taskName - 任务名称（如 '挂机收益+加钟'/'盐罐管理'）
 * @param {Function} options.executeBusiness - 子组件提供的业务逻辑 (token) => Promise<{success: boolean, messages: string[]}>
 * @returns {Object} 公共任务能力
 */
export function useTaskManager(options) {
    // 校验必填配置
    if (!options.taskKey || !options.taskName || typeof options.executeBusiness !== 'function') {
        throw new Error('taskKey、taskName、executeBusiness 为必填配置')
    }

    // 状态初始化
    const tokenStore = useTokenStore()
    const message = useMessage()
    const TASK_ID = `task-${options.taskKey}` // 全局唯一任务ID

    // 任务配置
    const intervalMinutes = ref('') // 输入框值（字符串）
    const validatedInterval = ref(DEFAULT_INTERVAL_MINUTES) // 验证后的间隔（数字）

    // 任务状态
    const taskStatus = ref('idle') // running/paused/error/idle
    const executeCount = ref(0)
    const lastExecuteTime = ref('')
    const nextExecuteTime = ref('')
    const countdownText = ref('00:00:00')
    const logBatches = ref([])
    const expandedBatchIds = ref(new Set())
    let countdownFrame = null // 倒计时动画帧

    // ========== 公共工具方法 ==========
    /**
     * 生成批次ID
     */
    const generateBatchId = () => {
        return Date.now() + '-' + Math.random().toString(36).substr(2, 9)
    }

    /**
     * 日志关键词高亮
     */
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

    /**
     * 验证执行间隔
     */
    const validateInterval = (fixTimeTask) => {
        if(fixTimeTask){
            return
        }
        const inputVal = Number(intervalMinutes.value)
        if (!intervalMinutes.value || isNaN(inputVal) || inputVal < 1) {
            validatedInterval.value = DEFAULT_INTERVAL_MINUTES
            message.warning(`执行间隔输入无效，已恢复默认值：${DEFAULT_INTERVAL_MINUTES} 分钟`)
        } else {
            validatedInterval.value = inputVal
            message.success(`执行间隔已设置为：${inputVal} 分钟`)
        }
    }

    // ========== 公共Token连接逻辑 ==========
    /**
     * 公共Token连接方法
     */
    const connectToken = async (token) => {
        const messages = []
        try {
            let connectionStatus = tokenStore.getWebSocketStatus(token.id)
            if (connectionStatus === 'connected') {
                messages.push(`[${new Date().toLocaleString()}] Token ${token.name} 已连接，跳过连接步骤`)
                messages.push(`[${new Date().toLocaleString()}] Token ${token.name} 当前连接状态: ${connectionStatus}`)
                return { success: true, needTry:false, messages }
            }else if(connectionStatus === 'connecting'){
                LogUtil.debug(`${token.name} WebSocket 正在连接，等待800ms`)
                await new Promise(resolve => setTimeout(resolve, 800))
                connectionStatus = tokenStore.getWebSocketStatus(token.id)
                messages.push(`[${new Date().toLocaleString()}] Token ${token.name} 当前连接状态: ${connectionStatus}`)
                if (connectionStatus === 'connected') {
                    return { success: true,needTry:false,  messages }
                }
            }else{
                const autoReconnectEnabled = ref(localStorage.getItem('autoReconnectEnabled') !== 'false')
                if(!autoReconnectEnabled.value){
                    messages.push(`[${new Date().toLocaleString()}] Token ${token.name} 当前连接状态: ${connectionStatus}，但不允许自动连接`)
                    LogUtil.debug(`${token.name} 不允许自动连接，暂不连接ws`)
                    return { success: false,needTry:false, messages }
                }
            }
            messages.push(`[${new Date().toLocaleString()}] 正在为 Token ${token.name} 建立 WebSocket 连接...`)
            await tokenStore.createWebSocketConnection(token.id, token.token, token.wsUrl)

            await new Promise((resolve, reject) => {
                let waitTime = 0
                const checkTimer = setInterval(() => {
                    const currentStatus = tokenStore.getWebSocketStatus(token.id)
                    waitTime += DELAY_MEDIUM

                    if (currentStatus === 'connected') {
                        clearInterval(checkTimer)
                        messages.push(`[${new Date().toLocaleString()}] Token ${token.name} 连接成功`)
                        resolve(true)
                    } else if (currentStatus === 'error' || waitTime >= CONNECT_TIMEOUT) {
                        clearInterval(checkTimer)
                        const errorMsg = `[${new Date().toLocaleString()}] Token ${token.name} 连接失败/超时（已等待 ${CONNECT_TIMEOUT/1000} 秒）`
                        messages.push(errorMsg)
                        reject(new Error(errorMsg))
                    }
                }, DELAY_MEDIUM)
            })

            return { success: true,needTry:false,  messages }
        } catch (error) {
            const errorMsg = `[${new Date().toLocaleString()}] Token ${token.name} 连接失败: ${error.message}`
            messages.push(errorMsg)
            return { success: false, needTry:true,  messages }
        }
    }

    // ========== 公共Token重试框架 ==========
    /**
     * 公共Token执行+失败重试框架
     */
    const processTokenWithRetry = async (token, retryCount = 0) => {
        let allMessages = []

        try {
            // 1. 公共连接逻辑
            const connectResult = await connectToken(token)
            allMessages = [...allMessages, ...connectResult.messages]

            if (!connectResult.success) {
                if (connectResult.needTry){
                    throw new Error(`Token ${token.name} 连接失败，触发重试（${retryCount + 1}/${MAX_RETRY_TIMES}）`)
                }else{
                    return { success: false, allMessages }
                }
            }

            // 2. 执行子组件提供的业务逻辑
            const businessResult = await options.executeBusiness(token)
            allMessages = [...allMessages, ...businessResult.messages]

            if (businessResult.success) {
                return { success: true, allMessages }
            } else {
                throw new Error(`Token ${token.name} ${options.taskName} 业务执行失败，触发重试（${retryCount + 1}/${MAX_RETRY_TIMES}）`)
            }
        } catch (error) {
            allMessages.push(`[${new Date().toLocaleString()}] 错误：${error.message}`)

            // 3. 重试逻辑
            if (retryCount < MAX_RETRY_TIMES) {
                allMessages.push(`[${new Date().toLocaleString()}] 将在 ${RETRY_INTERVAL_MS/60000} 分钟后进行第 ${retryCount + 1} 次重试...`)
                await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL_MS))
                return await processTokenWithRetry(token, retryCount + 1)
            } else {
                allMessages.push(`[${new Date().toLocaleString()}] 已达最大重试次数（${MAX_RETRY_TIMES}次），${options.taskName} 任务最终失败`)
                return { success: false, allMessages }
            }
        }
    }

    // ========== 公共批量处理逻辑 ==========
    /**
     * 批量处理Token（通用逻辑）
     */
    const batchProcessTokens = async () => {
        const tokens = tokenStore.gameTokens || []
        const batchId = generateBatchId()
        const currentTime = new Date().toLocaleString()

        // 无Token处理
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

        // 初始化批次日志
        const batchRecord = {
            batchId,
            timestamp: currentTime,
            type: 'processing',
            mainMessage: `[${currentTime}] ${options.taskName}任务开始执行，共 ${tokens.length} 个 Token`,
            tokenDetails: []
        }
        logBatches.value.push(batchRecord)
        message.info(batchRecord.mainMessage)

        // 遍历处理Token（单个失败不阻塞）
        for (const token of tokens) {
            const tokenDetail = {
                tokenName: token.name || '未知Token',
                tokenId: token.id || '未知ID',
                status: 'success',
                messages: []
            }

            // 调用公共重试框架
            const result = await processTokenWithRetry(token, 0)

            tokenDetail.messages = result.allMessages
            tokenDetail.status = result.success ? 'success' : 'error'
            batchRecord.tokenDetails.push(tokenDetail)
        }

        // 更新批次日志
        batchRecord.type = batchRecord.tokenDetails.some(t => t.status === 'error') ? 'error' : 'success'
        batchRecord.mainMessage = `[${new Date().toLocaleString()}] ${options.taskName}任务处理完成，成功：${batchRecord.tokenDetails.filter(t => t.status === 'success').length} / 失败：${batchRecord.tokenDetails.filter(t => t.status === 'error').length}`

        // 更新任务统计
        executeCount.value += 1
        lastExecuteTime.value = new Date().toLocaleString()
        calculateNextExecuteTime()
        message.success(batchRecord.mainMessage)
    }

    // ========== 公共任务生命周期管理 ==========
    /**
     * 启动任务
     */
    const startTask = (fixTimeTask = false) => {
        // 验证间隔
        validateInterval(fixTimeTask)

        // 删除原有任务（防止重复）
        if (timedTaskManager.getTaskStatus(TASK_ID)) {
            timedTaskManager.deleteTask(TASK_ID)
        }

        // 创建新任务
        const success = timedTaskManager.createTask({
            id: TASK_ID,
            fn: batchProcessTokens,
            interval: validatedInterval.value * 60 * 1000,
            immediate: true,
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
        })

        if (success) {
            taskStatus.value = 'running'
            const batchId = generateBatchId()
            logBatches.value.push({
                batchId,
                timestamp: new Date().toLocaleString(),
                type: 'system',
                mainMessage: `[${new Date().toLocaleString()}] ${options.taskName}任务已启动（间隔：${validatedInterval.value} 分钟）`,
                tokenDetails: []
            })
            message.success(`${options.taskName}任务已启动（间隔：${validatedInterval.value} 分钟）`)
        } else {
            message.error(`${options.taskName}任务启动失败，请检查任务配置`)
        }
    }

    /**
     * 暂停任务
     */
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
            message.error(`${options.taskName}任务暂停失败，任务可能未运行`)
        }
    }

    /**
     * 恢复任务
     */
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
            message.error(`${options.taskName}任务恢复失败，请检查任务状态`)
        }
    }

    /**
     * 重启任务
     */
    const restartTask = (fixTimeTask =false) => {
        // 验证间隔（允许重启时更新间隔）
        validateInterval(fixTimeTask)

        // 暂停原有任务
        timedTaskManager.pauseTask(TASK_ID)

        // 重启任务（更新间隔）
        const success = timedTaskManager.restartTask(TASK_ID, {
            interval: validatedInterval.value * 60 * 1000
        })

        if (success) {
            taskStatus.value = 'running'
            executeCount.value = 0 // 重置计数
            lastExecuteTime.value = ''
            calculateNextExecuteTime()
            const batchId = generateBatchId()
            logBatches.value.push({
                batchId,
                timestamp: new Date().toLocaleString(),
                type: 'system',
                mainMessage: `[${new Date().toLocaleString()}] ${options.taskName}任务已重启（间隔：${validatedInterval.value} 分钟），执行计数已重置`,
                tokenDetails: []
            })
            message.success(`${options.taskName}任务已重启（间隔：${validatedInterval.value} 分钟），执行计数已重置`)
        } else {
            message.error(`${options.taskName}任务重启失败，请重试`)
        }
    }

    /**
     * 清空日志
     */
    const clearLogs = () => {
        logBatches.value = []
        message.success(`${options.taskName}任务日志已清空`)
    }

    /**
     * 切换日志批次展开状态
     */
    const toggleBatchExpand = (batchId) => {
        if (expandedBatchIds.value.has(batchId)) {
            expandedBatchIds.value.delete(batchId)
        } else {
            expandedBatchIds.value.add(batchId)
        }
    }

    // ========== 公共倒计时逻辑 ==========
    /**
     * 更新倒计时
     */
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

    /**
     * 计算下次执行时间
     */
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

        const lastExecTime = lastExecuteTime.value ? new Date(lastExecuteTime.value) : new Date()
        const intervalMs = validatedInterval.value * 60 * 1000
        const nextTime = new Date(lastExecTime.getTime() + intervalMs)
        const nextTimeStr = nextTime.toLocaleString()

        updateCountdown(nextTimeStr, nextTime)
    }

    // ========== 任务状态格式化 ==========
    const taskStatusStyle = computed(() => {
        const statusMap = {
            running: 'success',
            paused: 'warning',
            error: 'error',
            idle: 'default'
        }
        return statusMap[taskStatus.value]
    })

    const taskStatusText = computed(() => {
        const statusMap = {
            running: '运行中',
            paused: '已暂停',
            error: '执行失败',
            idle: '未运行'
        }
        return statusMap[taskStatus.value]
    })

    // ========== 组件卸载清理 ==========
    onUnmounted(() => {
        // 清理倒计时
        if (countdownFrame) {
            cancelAnimationFrame(countdownFrame)
        }
        // 暂停任务
        timedTaskManager.pauseTask(TASK_ID)
        // 记录日志
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

    // ========== 返回公共能力 ==========
    return {
        // 配置
        intervalMinutes,
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