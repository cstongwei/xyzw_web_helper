/**
 * 获取当前应用运行环境信息
 * - 在 Electron 渲染进程中：通过 preload.js 注入 window.APP_ENV
 * - 在普通浏览器中：返回非桌面环境（isDesktop: false）
 *
 * @returns {{
 *   isDesktop: boolean,
 *   desktopRuntime: string,
 *   isElectron: boolean,
 *   supportSchedule: boolean,
 *   isWeb(): boolean,
 *   toString(): string
 * }}
 */
const getAppEnvironment = () => {
    let rawEnv = null;

    // 安全检测 window 是否存在（兼容 SSR / 测试环境）
    if (typeof window !== 'undefined') {
        // 1. 优先使用 Electron 通过 contextBridge 注入的 APP_ENV
        if (window.APP_ENV && typeof window.APP_ENV === 'object') {
            rawEnv = window.APP_ENV;
        }
        // 2. （可选）开发时可通过全局变量手动 mock（例如测试用）
        // else if (window.__MOCK_DESKTOP_ENV__) {
        //     rawEnv = window.__MOCK_DESKTOP_ENV__;
        // }
    }

    // 判断是否为桌面应用
    const isDesktop = !!rawEnv?.isDesktop;

    // 获取桌面运行时（如 'electron'）
    const desktopRuntime = isDesktop && typeof rawEnv?.desktopRuntime === 'string'
        ? rawEnv.desktopRuntime
        : '';

    // 是否为 Electron 环境
    const isElectron = isDesktop && desktopRuntime === 'electron';

    // 是否支持定时任务调度（需同时满足：是 Electron + schedulerAPI 存在）
    const supportSchedule = isElectron && typeof window?.schedulerAPI !== 'undefined';

    return {
        isDesktop,
        desktopRuntime,
        isElectron,
        supportSchedule,

        /**
         * 判断是否运行在 Web 浏览器（非桌面）
         * @returns {boolean}
         */
        isWeb() {
            return !this.isDesktop;
        },

        /**
         * 返回环境信息的字符串表示（用于日志或调试）
         * @returns {string}
         */
        toString() {
            return JSON.stringify(
                {
                    isDesktop: this.isDesktop,
                    desktopRuntime: this.desktopRuntime,
                    isElectron: this.isElectron,
                    supportSchedule: this.supportSchedule
                },
                null,
                2
            );
        }
    };
};

export default getAppEnvironment;