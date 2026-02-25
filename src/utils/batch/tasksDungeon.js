/**
 * 宝库、梦境类任务
 * 包含: batchbaoku13, batchbaoku45, batchmengjing,batchbuymengjing
 */

/**
 * 创建宝库、梦境类任务执行器
 * @param {Object} deps - 依赖项
 * @returns {Object} 任务函数集合
 */
export function createTasksDungeon(deps) {
  const {
    selectedTokens,
    tokens,
    tokenStatus,
    isRunning,
    shouldStop,
    ensureConnection,
    releaseConnectionSlot,
    connectionQueue,
    batchSettings,
    tokenStore,
    addLog,
    message,
    currentRunningTokenId,
  } = deps;

  /**
   * 一键宝库前3层
   */
  const batchbaoku13 = async () => {
    if (selectedTokens.value.length === 0) return;
    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const taskPromises = selectedTokens.value.map(async (tokenId) => {
      if (shouldStop.value) return;
      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始一键宝库: ${token.name} ===`,
          type: "info",
        });
        await ensureConnection(tokenId);
        const bosstowerinfo = await tokenStore.sendMessageWithPromise(
          tokenId,
          "bosstower_getinfo",
          {},
        );
        const towerId = bosstowerinfo.bossTower.towerId;
        if (towerId >= 1 && towerId <= 3) {
          for (let i = 0; i < 2; i++) {
            if (shouldStop.value) break;
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "bosstower_startboss",
              {},
            );
            await new Promise((r) => setTimeout(r, 500));
          }
          for (let i = 0; i < 9; i++) {
            if (shouldStop.value) break;
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "bosstower_startbox",
              {},
            );
            await new Promise((r) => setTimeout(r, 500));
          }
        }
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 宝库战斗已完成，请上线手动领取奖励 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 宝库战斗失败: ${error.message || "未知错误"}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    await Promise.all(taskPromises);
    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量宝库结束");
  };

  /**
   * 一键宝库4,5层
   */
  const batchbaoku45 = async () => {
    if (selectedTokens.value.length === 0) return;
    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const taskPromises = selectedTokens.value.map(async (tokenId) => {
      if (shouldStop.value) return;
      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始一键宝库: ${token.name} ===`,
          type: "info",
        });
        await ensureConnection(tokenId);
        const bosstowerinfo = await tokenStore.sendMessageWithPromise(
          tokenId,
          "bosstower_getinfo",
          {},
        );
        const towerId = bosstowerinfo.bossTower.towerId;
        if (towerId >= 4 && towerId <= 5) {
          for (let i = 0; i < 2; i++) {
            if (shouldStop.value) break;
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "bosstower_startboss",
              {},
            );
            await new Promise((r) => setTimeout(r, 500));
          }
        }
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 宝库战斗已完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 宝库战斗失败: ${error.message || "未知错误"}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    await Promise.all(taskPromises);
    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量宝库结束");
  };
  const isMengjingOpen=() =>{
    const now = new Date();
    const day = now.getDay(); // 0=周日, 1=周一, 2=周二, 3=周三, 4=周四, 5=周五, 6=周六
    return day === 0 || day === 1 || day === 3 || day === 4; // 周日、周一、周三、周四
  }
  /**
   * 一键梦境
   */
  const batchmengjing = async () => {
    if (selectedTokens.value.length === 0) return;
    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const taskPromises = selectedTokens.value.map(async (tokenId) => {
      if (shouldStop.value) return;
      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始咸王梦境: ${token.name} ===`,
          type: "info",
        });
        await ensureConnection(tokenId);
        if (shouldStop.value) return;
        const mjbattleTeam = { 0: 107 };
        if (isMengjingOpen()) {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "dungeon_selecthero",
            { battleTeam: mjbattleTeam },
            5000,
          );
          await new Promise((r) => setTimeout(r, 500));
          tokenStatus.value[tokenId] = "completed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== ${token.name} 咸王梦境已完成 ===`,
            type: "success",
          });
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== ${token.name} 当前未在开放时间 ===`,
            type: "error",
          });
        }
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 咸王梦境失败: ${error.message || "未知错误"}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    await Promise.all(taskPromises);
    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量梦境结束");
  };

  const goldItemsConfig = {
    1: [5, 6], // 初级商人: 挑战票, 咸神火把
    2: [6, 7], // 中级商人: 橙将碎片, 紫将碎片
    3: [5, 6, 7], // 高级商人: 橙将碎片, 红将碎片, 普通鱼竿
  };
  // 特殊非金币商品（但需购买）
  const specialItemsConfig = {
    1: [2, 3], // 初级商人： 木头箱、青铜箱
    3: [2],    // 高级商人： 金鱼竿
  };
  const isGoldItem =(merchantId, index) =>{
    return Boolean(
        goldItemsConfig[merchantId] && goldItemsConfig[merchantId].includes(index)
    );
  }
  const isSpecialItem=(merchantId, index)=>{
    return Boolean(
        specialItemsConfig[merchantId]?.includes(index)
    );
  }
  const getRoleInfo=async (token)=> {
    try {
      return  tokenStore.sendMessageWithPromise(
          token.id,
          "role_getroleinfo",
          {},
          15000,
      );
    } catch (error) {
      console.error(error);
      tokenStatus.value[token.id] = "failed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `${token.name} 获取角色信息失败: ${error.message || "未知错误"}`,
        type: "error",
      });
      return null;
    }
  }
  const getMengjingInfo=async (token) => {
    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `${token.name} 获取当前关卡和梦境商人信息`,
        type: "info",
      });
      const response = await getRoleInfo(token);
      let merchantData = {};
      let levelId = 0;
      if (response && response.role) {
        // 获取商品列表
        if (response.role.dungeon && response.role.dungeon.merchant) {
          merchantData = response.role.dungeon.merchant;
        }
        // 获取关卡ID
        if (response.role.levelId) {
          levelId = response.role.levelId;
        }
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 当前梦境关卡ID: ${levelId}`,
          type: "info",
        });
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 当前梦境商人信息: ${JSON.stringify(merchantData)}`,
          type: "info",
        });
        return {merchantData: merchantData, levelId: levelId};
      }
    } catch (error) {
      console.error(error);
      tokenStatus.value[token.id] = "failed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `${token.name} 获取当前关卡和梦境商人信息失败: ${error.message || "未知错误"}`,
        type: "error",
      });
    }
    return null;
  }
  const buyItem =async (token, merchantId, index, pos) => {
    const tokenId = token.id;
    try {
      const response = await tokenStore.sendMessageWithPromise(
          tokenId,
          "dungeon_buymerchant",
          {
            id: merchantId,
            index: index,
            pos: pos,
          },
          15000,
      );
      return response && (response.role || response.reward);
    } catch (error) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `${token.name} 购买梦境商品失败：${error.message || "未知错误"}`,
        type: "error",
      });
      return false;
    }
  }
  /**
   * 一键购买梦境
   * @returns {Promise<void>}
   */
  const batchbuymengjing = async () => {
    if (selectedTokens.value.length === 0) return;
    if (!isMengjingOpen()) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `当前不是梦境开放时间（周三/周四/周日/周一）`,
        type: "warning",
      });
      return;
    }
    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const taskPromises = selectedTokens.value.map(async (tokenId) => {
      if (shouldStop.value) return;
      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始购买咸王梦境: ${token.name} ===`,
          type: "info",
        });
        await ensureConnection(tokenId);
        if (shouldStop.value) {
          return;
        }
        const mengjingInfo = await getMengjingInfo(token);
        if (!mengjingInfo) {
          return;
        }
        const { merchantData, levelId } = mengjingInfo;
        if (levelId < 4000) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== ${token.name} 关卡数小于4000，无法购买金币商品或鱼竿 ===`,
            type: "warning",
          });
          return;
        }
        let successCount = 0;
        let failCount = 0;
        for (const merchantId in merchantData) {
          const items = merchantData[merchantId];
          const numId = parseInt(merchantId, 10);

          for (let pos = items.length - 1; pos >= 0; pos--) {
            const index = items[pos];
            // 购买三类商品：
            // 1. 金币商品（由 isGoldItem 判断）
            // 2. 高级商人（ID=3）的金鱼竿（index=2，虽非金币商品但需一并购买）
            // 3. 初级商人（ID=1）的青铜箱子（index=3）和木头箱子（index=2）
            if (isGoldItem(numId, index) || isSpecialItem(numId, index)) {
              try {
                const success = await buyItem(token, numId, index, pos);
                if (success) successCount++;
                else failCount++;
              } catch (error) {
                failCount++;
              }
              await new Promise((r) => setTimeout(r, 500));
            }
          }
        }

        await new Promise((r) => setTimeout(r, 500));
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 购买咸王梦境已完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 购买咸王梦境失败: ${error.message || "未知错误"}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    await Promise.all(taskPromises);
    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量购买咸王梦境结束");
  };



  return {
    batchbaoku13,
    batchbaoku45,
    batchmengjing,
    batchbuymengjing,
  };
}
