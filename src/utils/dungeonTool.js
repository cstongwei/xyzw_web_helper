/**
 * 咸王梦境工具类
 */
export class DungeonTool {
    constructor(tokenStore) {
        this.tokenStore = tokenStore;
        // 金币购买的商品配置 [商人ID][商品索引]
        this.goldItemsConfig = {
            1: [5, 6], // 初级商人: 挑战票, 咸神火把
            2: [6, 7], // 中级商人: 橙将碎片, 紫将碎片
            3: [5, 6, 7], // 高级商人: 橙将碎片, 红将碎片, 普通鱼竿
        };
        // 特殊非金币商品（但需购买）
        this.specialItemsConfig = {
            1: [2, 3], // 初级商人： 木头箱、青铜箱
            3: [2],    // 高级商人： 金鱼竿
        };
    }

    // 复用原有的日志方法，和原类日志格式完全一致
    log(message, type = "info",callbacks) {
        if (callbacks?.onLog) {
            callbacks.onLog({
                time: new Date().toLocaleTimeString(),
                message,
                type,
            });
        }
    }
    delay(seconds) {
        return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    }
    isDungeonOpen() {
        const now = new Date();
        const day = now.getDay(); // 0=周日, 1=周一, 2=周二, 3=周三, 4=周四, 5=周五, 6=周六
        return day === 0 || day === 1 || day === 3 || day === 4; // 周日、周一、周三、周四
    }
    isGoldItem(merchantId, index) {
        return Boolean(
            this.goldItemsConfig[merchantId] && this.goldItemsConfig[merchantId].includes(index)
        );
    }
    isSpecialItem(merchantId, index) {
        return Boolean(
            this.specialItemsConfig[merchantId]?.includes(index)
        );
    }

   // 购买商品
    async buyItem(token,merchantId, index, pos,callbacks = {}) {
        const tokenId = token.id;
        try {
            const response = await this.tokenStore.sendMessageWithPromise(
                tokenId,
                "dungeon_buymerchant",
                {
                    id: merchantId,
                    index: index,
                    pos: pos,
                },
                15000,
            );
            return response && (response.role|| response.reward);
        } catch (error) {
            this.log(`[${token.name}] 购买商品失败:`, "error",callbacks);
            return false;
        }
    }

    /**
     * 获取角色信息
     */
    async getRoleInfo(token,callbacks = {}) {
        try {
            this.log(`[${token.name}] 获取角色信息`, "info",callbacks);
            return await this.tokenStore.sendMessageWithPromise(
                token.id,
                "role_getroleinfo",
                {},
                15000,
            );
        } catch (error) {
            this.log(`[${token.name}] 获取角色信息失败`, "error",callbacks);
            throw error;
        }
    }

    /**
     * 获取当前角色的关卡和梦境商人信息
     */
    async getDungeonInfo(token,callbacks = {}) {
        try {
            this.log(`[${token.name}] 获取当前关卡和梦境商人信息`, "info",callbacks);
            const response = await this.getRoleInfo(token,callbacks);
            let merchantData = {};
            let levelId = 0;
            if (response && response.role) {
                // 获取商品列表
                if (response.role.dungeon && response.role.dungeon.merchant) {
                    merchantData = response.role.dungeon.merchant;
                }
                // 获取关卡ID
                if (response.role.levelId) {
                    levelId= response.role.levelId;
                }
                this.log(`[${token.name}] 当前关卡ID: ${levelId}`, "info",callbacks)
                this.log(`[${token.name}] 当前梦境商人信息: ${JSON.stringify(merchantData)}`, "info",callbacks)
                return { merchantData: merchantData, levelId: levelId };
            }
        } catch (error) {
            this.log(`[${token.name}] 获取当前关卡和梦境商人信息失败`,"error",callbacks);
        }
        return null;
    }

    // 一键购买所有金币商品
    async buyAllGoldItems(token, callbacks = {}) {
        if (!this.isDungeonOpen()) {
            this.log(`[${token.name}] 当前不是梦境开放时间（周三/周四/周日/周一）`, "warning",callbacks)
            return;
        }
        const dungeonInfo = await this.getDungeonInfo(token,callbacks);
        if (!dungeonInfo) {
            this.log(`[${token.name}] 获取当前关卡和梦境商人信息失败`, "error",callbacks)
            return;
        }
        const { merchantData, levelId } = dungeonInfo;
        if (levelId < 4000) {
            this.log(`[${token.name}] 关卡数小于4000，无法购买金币商品`, "warning",callbacks)
            return;
        }
        let successCount = 0;
        let failCount = 0;

        // 遍历所有商人的商品
        for (const merchantId in merchantData) {
            const items = merchantData[merchantId];
            const numId = parseInt(merchantId);

            // 从后往前购买（pos从大到小）
            for (let pos = items.length - 1; pos >= 0; pos--) {
                const index = items[pos];
                if (this.isGoldItem(numId, index)) {
                    try {
                        const success = await this.buyItem(token,numId, index, pos,callbacks);
                        if (success) {
                            successCount++;
                        } else {
                            failCount++;
                        }
                    } catch (error) {
                        failCount++;
                    }
                    // 延迟避免请求过快
                    await this.delay(0.5);
                }
            }
        }
        this.log(`[${token.name}] 一键购买金币商品完成: 成功 ${successCount} 件, 失败 ${failCount} 件`, "success",callbacks);
    }

    // 一键购买所有高级商人鱼竿
    async buyAllGoldFishItems(token, callbacks = {}) {
        if (!this.isDungeonOpen()) {
            this.log(`[${token.name}] 当前不是梦境开放时间（周三/周四/周日/周一）`, "warning",callbacks)
            return;
        }

        const dungeonInfo = await this.getDungeonInfo(token,callbacks);
        if (!dungeonInfo) {
            this.log(`[${token.name}] 获取当前关卡和梦境商人信息失败`, "error",callbacks)
            return;
        }
        const { merchantData, levelId } = dungeonInfo;
        if (levelId < 4000) {
            this.log(`[${token.name}] 关卡数小于4000，无法购买金币商品`, "warning",callbacks)
            return;
        }

        let successCount = 0;
        let failCount = 0;

        const items = merchantData[3];
        // 从后往前购买（pos从大到小）
        for (let pos = items.length - 1; pos >= 0; pos--) {
            const index = items[pos];
            if (index === 2) {
                try {
                    const success = await this.buyItem(token,3, index, pos,callbacks);
                    if (success) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                } catch (error) {
                    failCount++;
                }

                // 延迟避免请求过快
                await this.delay(0.5);
            }
        }
        this.log(`[${token.name}] 一键购买高级商人鱼竿完成: 成功 ${successCount} 件, 失败 ${failCount} 件`, "success",callbacks);
    }

    /**
     * 一键购买所有金币商品 + 高级商人鱼竿（金杆子）
     */
    async buyAllNeedItems(token, callbacks = {}) {
        if (!this.isDungeonOpen()) {
            this.log(`[${token.name}] 当前不是梦境开放时间（周三/周四/周日/周一）`, "warning", callbacks);
            return;
        }

        const dungeonInfo = await this.getDungeonInfo(token, callbacks);
        if (!dungeonInfo) {
            this.log(`[${token.name}] 获取当前关卡和梦境商人信息失败`, "error", callbacks);
            return;
        }

        const { merchantData, levelId } = dungeonInfo;
        if (levelId < 4000) {
            this.log(`[${token.name}] 关卡数小于4000，无法购买金币商品或鱼竿`, "warning", callbacks);
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
                if (this.isGoldItem(numId, index) || this.isSpecialItem(numId, index)) {
                    try {
                        const success = await this.buyItem(token, numId, index, pos, callbacks);
                        if (success) successCount++;
                        else failCount++;
                    } catch (error) {
                        failCount++;
                    }
                    await this.delay(0.5);
                }
            }
        }
        this.log(
            `[${token.name}] 一键购买梦境完成: 成功 ${successCount} 件, 失败 ${failCount} 件`,
            "success",
            callbacks
        );
    }
}