import LogUtil from "@/utils/LogUtil.js";

function getFormattedTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 📌 纯文本、机器友好的日志格式（用于文件）
const formatFileLog = (tokenName, actionMsg, type = 'info') => {
    const time = getFormattedTime();
    const level = type.toUpperCase();
    return `[${time}] [${level}] ${tokenName} - ${actionMsg}`;
};

// 📌 带图标的 UI 友好格式（用于前端展示）
const formatUIMessage = (tokenName, actionMsg, type = 'info') => {
    const time = getFormattedTime();
    const prefix =
        type === 'error' ? '❌' :
            type === 'success' ? '✅' :
                type === 'warning' ? '⚠️' :
                    'ℹ️';
    return `${time} ${prefix} ${tokenName} - ${actionMsg.trim()}`;
};

// 🏭 工厂函数
export const createSharedLogger = (tokenName, messages) => {
    if (!Array.isArray(messages)) {
        throw new Error('messages must be an array');
    }

    /**
     * 日志写入函数（新增target参数）
     * @param {string} actionMsg - 日志内容
     * @param {string} [type='info'] - 日志类型（success/error/warning/info）
     * @param {string} [target='both'] - 输出目标：ui（仅UI）/ file（仅文件）/ both（默认，两者都输出）
     */
    return (actionMsg, type = 'info', target = 'both') => {
        if (!actionMsg || actionMsg.trim() === '') {
            return;
        }

        // 1. 校验目标参数，兜底默认值
        const validTargets = ['ui', 'file', 'both'];
        const finalTarget = validTargets.includes(target) ? target : 'both';

        // 2. 格式化两种日志（保留你原有逻辑）
        const logMethod = LogUtil[type] || LogUtil.info || console.log;
        // 3. 根据目标参数判断输出逻辑
        // 输出到UI（messages数组）
        if (finalTarget === 'ui' || finalTarget === 'both') {
            const uiMessage = formatUIMessage(tokenName, actionMsg, type);
            messages.push(uiMessage);
        }

        // 输出到文件（LogUtil）
        if (finalTarget === 'file' || finalTarget === 'both') {
            const fileLog = formatFileLog(tokenName, actionMsg, type);
            logMethod(fileLog);
        }
    };
};