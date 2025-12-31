// @/utils/CommonUtil.js
import { useTokenStore } from '@/stores/tokenStore'
import LogUtil from "@/utils/LogUtil.js";
import {createSharedLogger} from "@/utils/sharedLogger.js";

/**
 * localStorage 相关常量（统一管理，外部可导入使用，避免重复定义）
 */
export const LocalStorageConsts = {
    // 账号自动连接开关 存储键
    ACCOUNT_RECONNECT_STORAGE_KEY: 'accountAutoReconnectMap',
    // 全局自动连接开关 存储键
    GLOBAL_RECONNECT_STORAGE_KEY: 'autoReconnectEnabled',
    // 每日任务 存储键前缀
    DAILY_TASK_KEY_PREFIX: 'dailytask-'
};
/**
 * 可外部使用的 localStorage 操作工具
 * 处理存储异常（如存储满），提供统一的 get/set/remove 方法
 */
export const LocalStorageUtil = {
    /**
     * 设置 localStorage 项
     * @param {string} key - 存储键
     * @param {string} value - 存储值（仅支持字符串，复杂类型需自行 JSON 序列化）
     * @returns {boolean} - 操作是否成功
     */
    set: (key, value) => {
        try {
            if (typeof key !== 'string' || typeof value !== 'string') {
                console.warn(`LocalStorageUtil.set: key 和 value 必须为字符串，key=${key}, value=${value}`);
                return false;
            }
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                LogUtil.error(`LocalStorageUtil.set: localStorage 存储已满，无法设置键 [${key}]`);
                // 可选：此处可添加兜底逻辑（如清理过期数据，暂不实现，保持简洁）
            } else {
                LogUtil.error(`LocalStorageUtil.set: 设置键 [${key}] 失败`, e);
            }
            return false;
        }
    },

    /**
     * 获取 localStorage 项
     * @param {string} key - 存储键
     * @returns {string|null} - 存储值，不存在或失败时返回 null
     */
    get: (key) => {
        try {
            if (typeof key !== 'string') {
                console.warn(`LocalStorageUtil.get: key 必须为字符串，key=${key}`);
                return null;
            }
            return localStorage.getItem(key);
        } catch (e) {
            LogUtil.error(`LocalStorageUtil.get: 获取键 [${key}] 失败`, e);
            return null;
        }
    },
    /**
     * 存储复杂对象（自动 JSON 序列化）
     * @param {string} key - 存储键
     * @param {any} value - 存储对象
     * @returns {boolean} - 操作是否成功
     */
    setObject: (key, value) => {
        try {
            const strValue = JSON.stringify(value);
            return LocalStorageUtil.set(key, strValue);
        } catch (e) {
            LogUtil.error(`LocalStorageUtil.setObject: 序列化对象失败，键 [${key}]`, e);
            return false;
        }
    },

    /**
     * 获取复杂对象（自动 JSON 反序列化）
     * @param {string} key - 存储键
     * @returns {any|null} - 存储对象，不存在或失败时返回 null
     */
    getObject: (key) => {
        try {
            const strValue = LocalStorageUtil.get(key);
            if (!strValue) return null;
            return JSON.parse(strValue);
        } catch (e) {
            LogUtil.error(`LocalStorageUtil.getObject: 反序列化对象失败，键 [${key}]`, e);
            return null;
        }
    },
    /**
     * 移除 localStorage 项
     * @param {string} key - 存储键
     * @returns {boolean} - 操作是否成功
     */
    delete: (key) => {
        try {
            if (typeof key !== 'string') {
                console.warn(`LocalStorageUtil.delete: key 必须为字符串，key=${key}`);
                return false;
            }
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            LogUtil.error(`LocalStorageUtil.delete: 移除键 [${key}] 失败`, e);
            return false;
        }
    },

    /**
     * 获取所有 localStorage 键名
     * @returns {string[]} - 所有键名数组
     */
    keys: () => {
        try {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) keys.push(key);
            }
            return keys;
        } catch (e) {
            LogUtil.error(`LocalStorageUtil.keys: 获取所有键失败`, e);
            return [];
        }
    }
};

// 执行游戏命令（带日志和错误处理）
export const executeGameCommand = async (tokenId, tokenName,cmd, params = {}, description = '', timeout = 8000) => {
    try {
        if (description) LogUtil.info(`${tokenName} 执行: ${description}`);

        const tokenStore = useTokenStore();
        const result = await tokenStore.sendMessageWithPromise(tokenId, cmd, params, timeout);
        await delaySeconds(0.5);
        if (description) LogUtil.info(`${tokenName} ${description} - 成功`, 'success');
        return result;
    } catch (error) {
        if (description) LogUtil.error(`${tokenName} ${description} - 失败: ${error.message}`);
        throw error;
    }
};

export const sendGameCommand = (tokenId, tokenName,cmd, params = {}, options = {}, description = '') => {
    try {
        if (description) LogUtil.info(`${tokenName} 执行: ${description}`);
        const tokenStore = useTokenStore();
        return tokenStore.sendMessage(tokenId, cmd,options)
    } catch (error) {
        if (description) LogUtil.error(`${tokenName} ${description} - 失败: ${error.message}`);
        throw error;
    }
};

/**
 * 判断当前时间是否在指定的两个时间点之间（包含边界）
 * @param {string} startTime - 起始时间，格式 'HH:mm'，例如 '08:00'
 * @param {string} endTime - 结束时间，格式 'HH:mm'，例如 '21:00'
 * @returns {boolean} - 当前时间是否在 [startTime, endTime] 区间内
 */
export const isBetweenTime = (startTime, endTime) => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const parseTimeToMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            throw new Error(`无效的时间格式: ${timeStr}，应为 'HH:mm'`);
        }
        return hours * 60 + minutes;
    };

    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);

    if (startMinutes <= endMinutes) {
        // 同一天区间，例如 08:00 ~ 21:00
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
        // 跨天区间，例如 22:00 ~ 06:00（虽然你的需求没提，但健壮性考虑）
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
};

/**
 * 判断今天是否是指定的星期几之一（支持多个）
 * @param {number[]} weekdays - 星期几数组，1=周一, 2=周二, ..., 7=周日
 * @returns {boolean} - 如果今天在指定的星期几中，返回 true
 */
export const isTodayInWeekdays = (weekdays) => {
    if (!Array.isArray(weekdays) || weekdays.length === 0) {
        return false;
    }

    // 获取今天是星期几（JS: 0=周日, 1=周一, ..., 6=周六）
    const todayJsDay = new Date().getDay(); // 0 ~ 6

    // 转换为中文习惯：1=周一 ... 7=周日
    const todayChineseDay = todayJsDay === 0 ? 7 : todayJsDay; // 周日(0) → 7，其他不变

    // 检查是否在传入的列表中
    return weekdays.some(day => {
        if (typeof day !== 'number' || day < 1 || day > 7) {
            console.warn(`isTodayInWeekdays: 无效的星期值 ${day}，应为 1~7 的整数`);
            return false;
        }
        return day === todayChineseDay;
    });
};

// 格式化日期为 yyyyMMdd
export const formatDateToYMD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
};

// 检查今日是否已完成某任务
export const hasCompeteToday = (tokenId, taskName) => {
    const today = new Date();
    const yyyMMdd = formatDateToYMD(today);
    const key = `${LocalStorageConsts.DAILY_TASK_KEY_PREFIX}${taskName}-${tokenId}-${yyyMMdd}`;

    try {
        cleanExpiredCompletionRecords(tokenId, taskName, yyyMMdd);
    } catch (e) {
        console.error('清理过期记录失败:', e);
    }
    return LocalStorageUtil.get(key) === 'true';
};

// 清理过期的完成记录
export const cleanExpiredCompletionRecords = (tokenId, taskName, todayYmd) => {
    // 使用统一常量 + 封装工具
    const currentKey = `${LocalStorageConsts.DAILY_TASK_KEY_PREFIX}${taskName}-${tokenId}-${todayYmd}`;
    const relevantKeys = [];

    // 替换为封装工具获取所有键
    const allKeys = LocalStorageUtil.keys();
    allKeys.forEach(key => {
        if (key && key.startsWith(`${LocalStorageConsts.DAILY_TASK_KEY_PREFIX}${taskName}-${tokenId}-`)) {
            relevantKeys.push(key);
        }
    });

    relevantKeys.forEach(key => {
        if (key === currentKey) return;
        LogUtil.info('删除任务完成标记', key);
        // 替换为封装工具
        LocalStorageUtil.delete(key);
        LogUtil.info(`已清理过期记录: ${key}`);
    });
};

// 标记今日任务完成
export const markCompeteToday = (tokenId, taskName) => {
    const today = new Date();
    const yyyMMdd = formatDateToYMD(today);
    // 使用统一常量 + 封装工具
    const key = `${LocalStorageConsts.DAILY_TASK_KEY_PREFIX}${taskName}-${tokenId}-${yyyMMdd}`;
    // 替换为封装工具
    LocalStorageUtil.set(key, 'true');
    LogUtil.info(`标记任务完成: ${key}`);
};

/**
 * 判断当前账号是否允许自动建立WebSocket连接（先全局，后账号）
 * @param {Object} token - 账号token对象（必须包含id属性）
 * @param {Function} [createLog] - 可选：日志创建函数，不传则不输出日志
 * @returns {boolean} - true=允许自动连接，false=不允许
 */
export const isAutoConnectAllowed = (token, createLog = () => {}) => {
    // 1. 先判断全局自动重连开关（使用统一常量 + 封装工具）
    const globalReconnectValue = LocalStorageUtil.get(LocalStorageConsts.GLOBAL_RECONNECT_STORAGE_KEY);
    const autoReconnectEnabled = globalReconnectValue !== 'false';
    if (!autoReconnectEnabled) {
        createLog(`全局自动连接开关已关闭，禁止自动连接`, 'warning');
        return false;
    }

    // 2. 再判断当前账号自动连接开关（使用统一常量 + 封装工具）
    let accountAutoReconnectEnabled = true; // 默认开启（兼容无存储/解析失败场景）
    try {
        // 读取本地存储的账号开关映射表（替换为封装工具）
        const accountSwitchObj = LocalStorageUtil.getObject(LocalStorageConsts.ACCOUNT_RECONNECT_STORAGE_KEY);
        if (accountSwitchObj) {
            // 精准匹配当前账号的开关状态（不存在则默认开启）
            accountAutoReconnectEnabled = accountSwitchObj[token.id] ?? true;
        }
    } catch (error) {
        // 解析失败时默认开启，避免阻断正常功能
        console.error(`读取账号【${token.id || '未知'}】自动连接开关失败:`, error);
        accountAutoReconnectEnabled = true;
    }

    // 账号开关关闭时返回false
    if (!accountAutoReconnectEnabled) {
        createLog(`账号【${token.name || token.id}】自动连接开关已关闭，禁止自动连接`, 'warning');
        return false;
    }

    // 全局+账号开关均开启，允许自动连接
    return true;
};

/**
 * 确保指定 token 的 WebSocket 处于已连接状态
 * @param {Object} token - token 对象，需包含 id, name, token, wsUrl 字段
 * @returns {Promise<{ success: boolean; needTry?: boolean; messages?: string[] }>}
 */
export const ensureWebSocketConnected = async (token) => {
    const messages = [];
    const tokenStore = useTokenStore();
    const DELAY_MEDIUM = 200;
    const CONNECT_TIMEOUT = 5000;
    const createLog = createSharedLogger(token.name, messages);
    try {
        let connectionStatus = tokenStore.getWebSocketStatus(token.id);

        // 已连接：直接成功
        if (connectionStatus === 'connected') {
            createLog("已连接，跳过连接步骤", "success");
            return { success: true, needTry: false, messages };
        }

        // 正在连接：等待最多 1200ms（与原 ensureWebSocketConnected 一致）
        if (connectionStatus === 'connecting') {
            const startTime = Date.now();
            while (connectionStatus === 'connecting' && Date.now() - startTime < 1200) {
                await new Promise(resolve => setTimeout(resolve, 100));
                connectionStatus = tokenStore.getWebSocketStatus(token.id);
            }
            if (connectionStatus === 'connected') {
                createLog("连接成功（等待后）", "success")
                return { success: true, needTry: false, messages };
            }
        }

        // 检查是否允许自动重连
        const allowAutoConnect = isAutoConnectAllowed(token, createLog);
        if (!allowAutoConnect) {
            return { success: false, needTry: false, messages };
        }

        // 开始连接
        createLog(`尝试建立连接`)
        await tokenStore.createWebSocketConnection(token.id, token.token, token.wsUrl);

        // 等待连接结果（带超时）
        await new Promise((resolve, reject) => {
            let waitTime = 0;
            const checkTimer = setInterval(() => {
                const currentStatus = tokenStore.getWebSocketStatus(token.id);
                waitTime += DELAY_MEDIUM;

                if (currentStatus === 'connected') {
                    clearInterval(checkTimer);
                    createLog(`重试连接成功`, 'success')
                    resolve(true);
                } else if (currentStatus === 'error' || waitTime >= CONNECT_TIMEOUT) {
                    clearInterval(checkTimer);
                    const  errorMsg = `重试连接失败/超时（已等待 ${CONNECT_TIMEOUT / 1000} 秒）`
                    createLog(errorMsg,'error')
                    reject(new Error(errorMsg));
                }
            }, DELAY_MEDIUM);
        });

        return { success: true, needTry: false, messages };

    } catch (error) {
        const errorMsg = createLog(`创建 WebSocket 连接失败: ${error.message}`);
        messages.push(errorMsg);
        LogUtil.error(`${token.name} 创建 WebSocket 连接时出错:`, error);
        return { success: false, needTry: true, messages };
    }
};

export const getFormationInfo = async (tokenId, tokenName) => {
    try {
        LogUtil.info(`[getFormationInfo] 获取${tokenName} 阵容信息`)
        const formationInfo = await executeGameCommand(tokenId,tokenName, 'presetteam_getinfo', {}, '获取阵容信息')
        const presetTeamInfo = formationInfo?.presetTeamInfo || {}
        const currentUseTeamId = presetTeamInfo?.useTeamId || 1
        const presetTeams = presetTeamInfo?.presetTeamInfo || {}

        const teamIds = Object.keys(presetTeams).map(Number).filter(id => !isNaN(id)).sort((a, b) => a - b)
        const formationOptions = teamIds.map(teamId => ({
            label: `阵容${teamId}`,
            value: teamId.toString()
        }))

        return {
            currentUseTeamId: currentUseTeamId.toString(),
            formationOptions
        }
    } catch (error) {
        LogUtil.error(`[getFormationInfo] ${tokenName} 获取失败:`, error)
        return {
            currentUseTeamId: '1',
            formationOptions: [{ label: '阵容1', value: '1' }]
        }
    }
};

// 切换到指定阵容（智能判断是否需要切换）
export const switchToFormationIfNeeded = async (tokenId,tokenName, targetFormation, formationName, logFn) => {
    const tokenStore = useTokenStore();

    try {
        const cachedTeamInfo = tokenStore.gameData?.presetTeam?.presetTeamInfo;
        let currentFormation = cachedTeamInfo?.useTeamId;

        if (currentFormation) {
            logFn(`从缓存获取当前阵容: ${currentFormation}`);
        } else {
            logFn(`缓存中无阵容信息，从服务器获取...`);
            const teamInfo = await getFormationInfo(tokenId,tokenName)
            currentFormation = teamInfo.currentUseTeamId;
            logFn(`从服务器获取${tokenName}当前阵容: ${currentFormation}`);
        }
        targetFormation = targetFormation || '1';
        const current = Number(currentFormation);
        const target = Number(targetFormation);
        if (current === target) {
            logFn(`${tokenName}当前已是${formationName}${targetFormation}，无需切换`, 'success');
            return false;
        }

        logFn(`${tokenName} - 当前阵容: ${currentFormation}, 目标阵容: ${targetFormation}，开始切换...`);
        await executeGameCommand(tokenId,tokenName, 'presetteam_saveteam', { teamId: targetFormation }, `切换到阵容${formationName}${targetFormation}`)
        logFn(`${tokenName} - 成功切换到${formationName}${targetFormation}`, 'success');
        return true;
    } catch (error) {
        logFn(`${tokenName}-阵容检查失败，直接切换: ${error.message}`, 'warning');
        try {
            await executeGameCommand(tokenId,tokenName, 'presetteam_saveteam', { teamId: targetFormation }, `切换到阵容${formationName}${targetFormation}`)
            return true;
        } catch (fallbackError) {
            logFn(`${tokenName}-强制切换也失败: ${fallbackError.message}`, 'error');
            throw fallbackError;
        }
    }
};

// 刷新角色信息（支持回调同步任务状态）
export const refreshRoleInfo = async (tokenId,tokenName, onSyncComplete = ()=>{}) => {
    const tokenStore = useTokenStore();
    LogUtil.info(`正在获取角色${tokenName}信息...`);

    try {
        const response = await tokenStore.sendGetRoleInfo(tokenId);
        LogUtil.info(`${tokenName}角色信息获取成功`);

        // 如果提供了回调，则调用它来处理同步逻辑
        if (response && typeof onSyncComplete === 'function') {
            onSyncComplete(response);
        }

        return response;
    } catch (error) {
        LogUtil.info(`获取角色${tokenName}信息失败: ${error.message}`);
        throw error;
    }

};

export const delaySeconds = (seconds) => new Promise(resolve => setTimeout(resolve, seconds*1000));