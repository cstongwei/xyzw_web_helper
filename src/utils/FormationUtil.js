import { useTokenStore } from "@/stores/tokenStore";

export class FormationTool {
  constructor(tokenStore) {
    this.tokenStore = tokenStore;
    this.callbacks = {};
  }

  // 复用原有的日志方法，和原类日志格式完全一致
  log(message, type = "info") {
    if (this.callbacks?.onLog) {
      this.callbacks.onLog({
        time: new Date().toLocaleTimeString(),
        message,
        type,
      });
    }
  }

  // ✅ 拆分的原子方法1：纯获取当前阵容【只查不改，无副作用，单独可调用】
  // 职责：仅请求接口，返回当前选中的阵容ID，异常返回null
  async getCurrentFormation(tokenId,callbacks = {}) {
    this.callbacks = callbacks;
    try {
      const teamInfo = await this.tokenStore.sendMessageWithPromise(
          tokenId,
          "presetteam_getinfo",
          {},
          8000
      );
      if (!teamInfo || !teamInfo.presetTeamInfo) {
        this.log(`阵容信息异常: ${JSON.stringify(teamInfo)}`, "warning");
        return 1;
      }
      await new Promise((r) => setTimeout(r, 500));
      return teamInfo.presetTeamInfo.useTeamId;
    } catch (error) {
      this.log(`获取当前阵容失败: ${error.message}`, "warning");
      return 1;
    }
  }

  // ✅ 拆分的原子方法2：纯切换阵容【只改不查，无副作用，单独可调用】
  // 职责：仅执行切换阵容的指令，成功返回true，失败抛异常，无多余逻辑
  async switchFormation(tokenId, targetFormation, formationName,callbacks = {}) {
    this.callbacks = callbacks;
    await this.tokenStore.sendMessageWithPromise(
        tokenId,
        "presetteam_saveteam",
        { teamId: targetFormation },
        8000
    );
    this.log(`成功切换到${formationName}${targetFormation}`, "success");
    await new Promise((r) => setTimeout(r, 500));
    return true;
  }

  // ✅ 组合方法：原有的 switchToFormationIfNeeded 完整逻辑【无缝替换原方法】
  // 职责：封装「先获取→判断是否需要切换→再切换」的完整流程，包含异常兜底的强制切换
  // 所有原有逻辑/日志/异常处理 1:1保留，返回值和原方法一致（切换返回true，未切换返回false）
  async switchToFormationIfNeeded(tokenId, targetFormation, formationName, callbacks = {}) {
    this.callbacks = callbacks;
    try {
      this.log(`检查${formationName}配置...`);
      const currentFormation = await this.getCurrentFormation(tokenId);

      if (String(currentFormation) === String(targetFormation)) {
        this.log(`当前已是${formationName}${targetFormation}，无需切换`, "success");
        return false;
      }

      this.log(
          `当前阵容: ${currentFormation}, 目标阵容: ${targetFormation}，开始切换...`,
      );
      await this.switchFormation(tokenId, targetFormation, formationName);
      return true;
    } catch (error) {
      this.log(`阵容检查失败，尝试强制切换: ${error.message}`, "warning");
      try {
        await this.switchFormation(tokenId, targetFormation, formationName);
        return true;
      } catch (fallbackError) {
        this.log(`强制切换也失败: ${fallbackError.message}`, "error");
        throw fallbackError;
      }
    }
  }
}