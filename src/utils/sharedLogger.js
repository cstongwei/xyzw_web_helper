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

    return (actionMsg, type = 'info') => {
        // UI 展示用美化格式（带图标、简洁时间）
        const uiMessage = formatUIMessage(tokenName, actionMsg, type);
        messages.push(uiMessage);

        // 文件日志用标准格式（无 emoji，带 token 和完整时间）
        const fileLog = formatFileLog(tokenName, actionMsg, type);
        const logMethod = LogUtil[type] || LogUtil.info || console.log;
        logMethod(fileLog);
    };
};