// LogUtil.js

import getAppEnvironment from "./EnvUtil";

/**
 * 智能日志工具：Electron 环境走 IPC，浏览器环境走 console
 */
const LogUtil = (function () {
    // 判断是否在 Electron 环境中（通过 preload 注入的 appLogger）
    const isElectron = getAppEnvironment().isElectron;

    // 定义日志级别
    const levels = ['log', 'info', 'warn', 'error', 'debug'];

    // 创建日志方法
    const logger = {};

    levels.forEach(level => {
        if (isElectron) {
            // Electron 环境：调用 appLogger
            logger[level] = function (...args) {
                // 保持与 console 一致的行为：支持多参数
                const message = args.map(arg => {
                    if (arg == null) return '';
                    if (typeof arg === 'object') {
                        try {
                            return JSON.stringify(arg, null, 2);
                        } catch (e) {
                            return '[Non-serializable object]';
                        }
                    }
                    return String(arg);
                }).join(' ');

                // 调用 preload 暴露的 API
                window.appLogger[level](message);
            };
        } else {
            // 浏览器环境：直接使用 console
            logger[level] = console[level].bind(console);
        }
    });

    return logger;
})();

export default LogUtil;