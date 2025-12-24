// @/utils/CommonUtil.js
import { useTokenStore } from '@/stores/tokenStore'
import LogUtil from "@/utils/LogUtil.js";

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
    const key = `dailytask-${taskName}-${tokenId}-${yyyMMdd}`;

    try {
        cleanExpiredCompletionRecords(tokenId, taskName, yyyMMdd);
    } catch (e) {
        console.error('清理过期记录失败:', e);
    }

    return localStorage.getItem(key) === 'true';
};

// 清理过期的完成记录
export const cleanExpiredCompletionRecords = (tokenId, taskName, todayYmd) => {
    const currentKey = `dailytask-${taskName}-${tokenId}-${todayYmd}`;
    const relevantKeys = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`dailytask-${taskName}-${tokenId}-`)) {
            relevantKeys.push(key);
        }
    }

    relevantKeys.forEach(key => {
        if (key === currentKey) return;
        LogUtil.info('删除任务完成标记', key);
        localStorage.removeItem(key);
        LogUtil.info(`已清理过期记录: ${key}`);
    });
};

// 标记今日任务完成
export const markCompeteToday = (tokenId, taskName) => {
    const today = new Date();
    const yyyMMdd = formatDateToYMD(today);
    const key = `dailytask-${taskName}-${tokenId}-${yyyMMdd}`;
    localStorage.setItem(key, 'true');
    LogUtil.info(`标记任务完成: ${key}`);
};

// 执行游戏命令（带日志和错误处理）
export const executeGameCommand = async (tokenId, cmd, params = {}, description = '', timeout = 8000) => {
    try {
        if (description) LogUtil.info(`执行: ${description}`);

        const tokenStore = useTokenStore();
        const result = await tokenStore.sendMessageWithPromise(tokenId, cmd, params, timeout);
        await new Promise(resolve => setTimeout(resolve, 500));
        if (description) LogUtil.info(`${description} - 成功`, 'success');
        return result;
    } catch (error) {
        if (description) LogUtil.info(`${description} - 失败: ${error.message}`, 'error');
        throw error;
    }
};

// 切换到指定阵容（智能判断是否需要切换）
export const switchToFormationIfNeeded = async (tokenId, targetFormation, formationName, logFn) => {
    const tokenStore = useTokenStore();

    try {
        const cachedTeamInfo = tokenStore.gameData?.presetTeam?.presetTeamInfo;
        let currentFormation = cachedTeamInfo?.useTeamId;

        if (currentFormation) {
            logFn(`从缓存获取当前阵容: ${currentFormation}`);
        } else {
            logFn(`缓存中无阵容信息，从服务器获取...`);
            const teamInfo = await tokenStore.sendMessageWithPromise(tokenId, 'presetteam_getinfo', {}, 8000);
            currentFormation = teamInfo?.presetTeamInfo?.useTeamId;
            logFn(`从服务器获取当前阵容: ${currentFormation}`);
        }

        if (currentFormation === targetFormation) {
            logFn(`当前已是${formationName}${targetFormation}，无需切换`, 'success');
            return false;
        }

        logFn(`当前阵容: ${currentFormation}, 目标阵容: ${targetFormation}，开始切换...`);
        await tokenStore.sendMessageWithPromise(tokenId, 'presetteam_saveteam', { teamId: targetFormation }, 8000);
        logFn(`成功切换到${formationName}${targetFormation}`, 'success');
        return true;
    } catch (error) {
        logFn(`阵容检查失败，直接切换: ${error.message}`, 'warning');
        try {
            await tokenStore.sendMessageWithPromise(tokenId, 'presetteam_saveteam', { teamId: targetFormation }, 8000);
            return true;
        } catch (fallbackError) {
            logFn(`强制切换也失败: ${fallbackError.message}`, 'error');
            throw fallbackError;
        }
    }
};

// 刷新角色信息（支持回调同步任务状态）
export const refreshRoleInfo = async (tokenId, onSyncComplete = null) => {
    const tokenStore = useTokenStore();
    LogUtil.info('正在获取角色信息...');

    try {
        const response = await tokenStore.sendGetRoleInfo(tokenId);
        LogUtil.info('角色信息获取成功', 'success');

        // 如果提供了回调，则调用它来处理同步逻辑
        if (response && typeof onSyncComplete === 'function') {
            onSyncComplete(response);
        }

        return response;
    } catch (error) {
        LogUtil.info(`获取角色信息失败: ${error.message}`, 'error');
        throw error;
    }
};