// @/composables/useDailyTaskExecutor.js
import { ref } from 'vue'
import { useTokenStore } from '@/stores/tokenStore'
import LogUtil from "@/utils/LogUtil.js";
import {preloadQuestions} from "@/utils/studyQuestionsFromJSON.js";
import {
    switchToFormationIfNeeded,
    executeGameCommand,
    refreshRoleInfo,
    hasCompeteToday,
    markCompeteToday
} from '@/utils/CommonUtil.js';
// 每日任务列表
const tasks = ref([
    { id: 1, name: '登录一次游戏', completed: false, loading: false },
    { id: 2, name: '分享一次游戏', completed: false, loading: false },
    { id: 3, name: '赠送好友3次金币', completed: false, loading: false },
    { id: 4, name: '进行2次招募', completed: false, loading: false },
    { id: 5, name: '领取5次挂机奖励', completed: false, loading: false },
    { id: 6, name: '进行3次点金', completed: false, loading: false },
    { id: 7, name: '开启3次宝箱', completed: false, loading: false },
    { id: 12, name: '黑市购买1次物品（请设置采购清单）', completed: false, loading: false },
    { id: 13, name: '进行1场竞技场战斗', completed: false, loading: false },
    { id: 14, name: '收获1个任意盐罐', completed: false, loading: false }
])

export default function useDailyTaskExecutor() {
    const tokenStore = useTokenStore()

    // 默认配置
    const getDefaultConfig = () => ({
        arenaFormation: 1,
        bossFormation: 1,
        bossTimes: 2,
        claimBottle: true,
        payRecruit: false,
        openBox: false,
        arenaEnable: true,
        claimHangUp: true,
        claimEmail: true,
        blackMarketPurchase: true
    })

    // 加载Token设置
    const loadTokenSettings = (tokenId) => {
        try {
            const raw = localStorage.getItem(`daily-settings:${tokenId}`)
            if (!raw) return getDefaultConfig()

            const parsed = JSON.parse(raw)

            // 转换时间字段（字符串 -> Date对象）
            if (parsed.dailyExecuteTime) {
                if (typeof parsed.dailyExecuteTime === 'string') {
                    const [hours, minutes] = parsed.dailyExecuteTime.split(':').map(Number)
                    parsed.dailyExecuteTime = new Date()
                    parsed.dailyExecuteTime.setHours(hours, minutes, 0, 0)
                } else if (typeof parsed.dailyExecuteTime === 'number') {
                    // 如果是时间戳，转换为Date对象
                    const date = new Date(parsed.dailyExecuteTime)
                    if (!isNaN(date.getTime())) {
                        parsed.dailyExecuteTime = date
                    } else {
                        parsed.dailyExecuteTime = new Date(new Date().setHours(8, 5, 0, 0))
                    }
                }
            } else {
                parsed.dailyExecuteTime = new Date(new Date().setHours(8, 5, 0, 0))
            }

            return parsed
        } catch (error) {
            console.error('加载每日任务设置失败:', error)
            return getDefaultConfig()
        }
    }

    // 保存Token设置
    const saveTokenSettings = (tokenId, config) => {
        try {
            // 创建副本以避免修改原始对象
            const configCopy = { ...config }

            // 转换时间为字符串以便存储
            if (configCopy.dailyExecuteTime instanceof Date) {
                const hours = String(configCopy.dailyExecuteTime.getHours()).padStart(2, '0')
                const minutes = String(configCopy.dailyExecuteTime.getMinutes()).padStart(2, '0')
                configCopy.dailyExecuteTime = `${hours}:${minutes}`
            }

            localStorage.setItem(`daily-settings:${tokenId}`, JSON.stringify(configCopy))
        } catch (error) {
            console.error('保存每日任务设置失败:', error)
        }
    }

    // const switchBackFormationIfNeeded=async (tokenId, originalFormation, logFn) => {
    //     //切换回原本阵容
    //     if(!originalFormation){
    //         originalFormation=1
    //     }
    //     await switchToFormationIfNeeded(tokenId, originalFormation, '原阵容', logFn)
    //
    //     const finalCheck = await tokenStore.sendMessageWithPromise(tokenId, 'presetteam_getinfo', {}, 5000);
    //     const finalFormation = finalCheck?.presetTeamInfo?.useTeamId;
    //     if (finalFormation !== originalFormation) {
    //         logFn(`🚨 警告：最终阵容 (${finalFormation}) 与原始阵容 (${originalFormation}) 不一致！`, 'error');
    //     }
    // }
    // // 智能阵容切换辅助函数
    // const switchToFormationIfNeeded = async (tokenId, targetFormation, formationName, logFn) => {
    //     try {
    //         const cachedTeamInfo = tokenStore.gameData?.presetTeam?.presetTeamInfo
    //         let currentFormation = cachedTeamInfo?.useTeamId
    //
    //         if (currentFormation) {
    //             logFn(`从缓存获取当前阵容: ${currentFormation}`)
    //         } else {
    //             logFn(`缓存中无阵容信息，从服务器获取...`)
    //             const teamInfo = await tokenStore.sendMessageWithPromise(tokenId, 'presetteam_getinfo', {}, 8000)
    //             currentFormation = teamInfo?.presetTeamInfo?.useTeamId
    //             logFn(`从服务器获取当前阵容: ${currentFormation}`)
    //         }
    //
    //         if (currentFormation === targetFormation) {
    //             logFn(`当前已是${formationName}${targetFormation}，无需切换`, 'success')
    //             return false
    //         }
    //
    //         logFn(`当前阵容: ${currentFormation}, 目标阵容: ${targetFormation}，开始切换...`)
    //         await tokenStore.sendMessageWithPromise(tokenId, 'presetteam_saveteam',
    //             { teamId: targetFormation }, 8000)
    //         logFn(`成功切换到${formationName}${targetFormation}`, 'success')
    //         return true
    //     } catch (error) {
    //         logFn(`阵容检查失败，直接切换: ${error.message}`, 'warning')
    //         try {
    //             await tokenStore.sendMessageWithPromise(tokenId, 'presetteam_saveteam',
    //                 { teamId: targetFormation }, 8000)
    //             return true
    //         } catch (fallbackError) {
    //             logFn(`强制切换也失败: ${fallbackError.message}`, 'error')
    //             throw fallbackError
    //         }
    //     }
    // }

    // 检查是否今日可用
    const isTodayAvailable = (statisticsTime) => {
        if (!statisticsTime) return true
        const today = new Date().toDateString()
        const recordDate = new Date(statisticsTime).toDateString()
        return today !== recordDate
    }

    // 获取今日BOSS ID
    const getTodayBossId = () => {
        const DAY_BOSS_MAP = [9904, 9905, 9901, 9902, 9903, 9904, 9905]
        const dayOfWeek = new Date().getDay()
        return DAY_BOSS_MAP[dayOfWeek]
    }
    // const executeGameCommand = async (tokenId, cmd, params = {}, description = '', timeout = 8000) => {
    //     try {
    //         if (description) LogUtil.info(`执行: ${description}`)
    //
    //         const result = await tokenStore.sendMessageWithPromise(tokenId, cmd, params, timeout)
    //         // 让指令等待一点时间
    //         await new Promise(resolve => setTimeout(resolve, 500))
    //         if (description) LogUtil.info(`${description} - 成功`, 'success')
    //         return result
    //     } catch (error) {
    //         if (description) LogUtil.info(`${description} - 失败: ${error.message}`, 'error')
    //         throw error
    //     }
    // }
    const pickArenaTargetId = (targets) => {
        const candidate =
            targets?.rankList?.[0] ||
            targets?.roleList?.[0] ||
            targets?.targets?.[0] ||
            targets?.targetList?.[0] ||
            targets?.list?.[0]

        if (candidate?.roleId) return candidate.roleId
        if (candidate?.id) return candidate.id
        return targets?.roleId || targets?.id
    }

    // 刷新角色信息
    // const refreshRoleInfo = async (tokenId) => {
    //     LogUtil.info('正在获取角色信息...')
    //
    //     try {
    //         const response = await tokenStore.sendGetRoleInfo(tokenId)
    //         LogUtil.info('角色信息获取成功', 'success')
    //
    //         // 同步任务状态
    //         if (response) {
    //             syncCompleteFromServer(response)
    //         }
    //         return response
    //     } catch (error) {
    //         LogUtil.info(`获取角色信息失败: ${error.message}`, 'error')
    //         throw error
    //     }
    // }

    // 同步服务器任务完成状态
    const syncCompleteFromServer = (resp) => {
        if (!resp?.role?.dailyTask?.complete) {
            LogUtil.info('角色信息中无任务完成数据', 'warning')
            return
        }

        const complete = resp.role.dailyTask.complete
        const isDone = (v) => v === -1

        LogUtil.info('开始同步任务完成状态...')
        LogUtil.info(`服务器返回的任务完成数据: ${JSON.stringify(complete)}`)

        let syncedCount = 0
        let completedCount = 0

        // 先重置所有任务为未完成，然后根据服务器数据更新
        tasks.value.forEach(task => {
            task.completed = false
        })

        // 同步服务器返回的完成状态
        Object.keys(complete).forEach(k => {
            const id = Number(k)
            const idx = tasks.value.findIndex(t => t.id === id)

            if (idx >= 0) {
                const isCompleted = isDone(complete[k])
                tasks.value[idx].completed = isCompleted
                syncedCount++

                if (isCompleted) {
                    completedCount++
                }

                LogUtil.info(`任务${id} "${tasks.value[idx].name}": ${isCompleted ? '已完成' : '未完成'}`)
            } else {
                LogUtil.info(`服务器返回未知任务ID: ${id} (完成值: ${complete[k]})`)
            }
        })
        LogUtil.info(`任务状态同步完成: ${completedCount}/${syncedCount} 已完成`)
    }
    // 通用的每日任务执行器
    const executeDailyTasks = async (params) => {
        const {
            tokenId,           // 必需：token ID
            roleInfo,          // 必需：角色信息
            settings,          // 必需：设置对象
            logFn,             // 必需：日志函数 (message, type?)
            progressFn         // 可选：进度回调函数 (tokenId, progress)
        } = params
        LogUtil.info(`tokenId: ${tokenId}`);
        // LogUtil.info(`roleInfo: ${JSON.stringify(roleInfo)}`);
        LogUtil.info(`settings: ${JSON.stringify(settings)}`);
        const roleData = roleInfo?.role
        if (!roleData) throw new Error('角色数据不存在')

        const completedTasks = roleData.dailyTask?.complete ?? {}
        const isTaskCompleted = (taskId) => completedTasks[taskId] === -1
        const statistics = roleData.statistics ?? {}
        const statisticsTime = roleData.statisticsTime ?? {}
        // const teamInfo = await tokenStore.sendMessageWithPromise(tokenId, 'presetteam_getinfo', {}, 8000)
        const teamInfo =  await executeGameCommand(tokenId, 'presetteam_getinfo', {}, '获取阵容信息',8000);
        let originalFormation  = teamInfo?.presetTeamInfo?.useTeamId
        logFn('开始执行每日任务补差')

        // 构建任务列表
        const taskList = []

        // 1. 分享游戏 (任务ID: 2)
        if (!isTaskCompleted(2)&&!hasCompeteToday(tokenId,2)) {
            taskList.push({
                name: '分享一次游戏',
                execute: async () => {
                    await executeGameCommand(tokenId, 'system_mysharecallback',
                        {isSkipShareCard: true, type: 2}, '分享游戏')
                    markCompeteToday(tokenId, 2)
                }
            })
        }

        // 2. 赠送好友金币 (任务ID: 3)
        if (!isTaskCompleted(3)&&!hasCompeteToday(tokenId,3)) {
            taskList.push({
                name: '赠送好友金币',
                execute: async () => {
                    await executeGameCommand(tokenId, 'friend_batch', {}, '赠送好友金币')
                    markCompeteToday(tokenId, 3)
                }
            })
        }

        // 3. 招募 (任务ID: 4)
        if (!isTaskCompleted(4)) {
            if(!hasCompeteToday(tokenId,'hero_recruit')){
                taskList.push({
                    name: '免费招募',
                    execute: async () => {
                        await executeGameCommand(tokenId, 'hero_recruit',
                            {recruitType: 3, recruitNumber: 1}, '免费招募')
                        markCompeteToday(tokenId, 'hero_recruit')
                    }
                })
            }
            if (settings.payRecruit) {
                if(!hasCompeteToday(tokenId,'hero_recruit_1')){
                    taskList.push({
                        name: '付费招募',
                        execute: async () => {
                            await executeGameCommand(tokenId, 'hero_recruit',
                                {recruitType: 1, recruitNumber: 1}, '付费招募')
                            markCompeteToday(tokenId, 'hero_recruit_1')
                        }
                    })
                }
            }
        }

        // 4. 点金 (任务ID: 6)
        if (!isTaskCompleted(6) && isTodayAvailable(statisticsTime['buy:gold']) &&!hasCompeteToday(tokenId,6)) {
            for (let i = 0; i < 3; i++) {
                taskList.push({
                    name: `免费点金 ${i + 1}/3`,
                    execute: async () => {
                        await executeGameCommand(tokenId, 'system_buygold',
                            {buyNum: 1}, `免费点金 ${i + 1}`)
                        if (i === 2) {
                            markCompeteToday(tokenId, 6)
                        }
                    }
                })
            }
        }

        // 5. 挂机奖励 (任务ID: 5)
        if (!isTaskCompleted(5) && settings.claimHangUp) {
            for (let i = 0; i < 4; i++) {
                taskList.push({
                    name: `挂机加钟 ${i + 1}/4`,
                    execute: async () => await executeGameCommand(tokenId, 'system_mysharecallback',
                        {isSkipShareCard: true, type: 2}, `挂机加钟 ${i + 1}`)
                })
            }

            taskList.push({
                name: '领取挂机奖励',
                execute: async () => await executeGameCommand(tokenId, 'system_claimhangupreward', {}, '领取挂机奖励')
            })

            taskList.push({
                name: '挂机加钟 5/5',
                execute: async () => await executeGameCommand(tokenId, 'system_mysharecallback',
                    {isSkipShareCard: true, type: 2}, '挂机加钟 5')
            })
        }

        // 6. 开宝箱 (任务ID: 7)
        if (!isTaskCompleted(7) && settings.openBox &&!hasCompeteToday(tokenId,7)) {
            const numPerOpen = 10
            taskList.push({
                name: '开启木质宝箱',
                execute: async () => {
                    await executeGameCommand(tokenId, 'item_openbox',
                        {itemId: 2001, number: numPerOpen}, `开启木质宝箱${numPerOpen}个 `)
                    markCompeteToday(tokenId, 7)
                }
            })
        }

        // 7. 盐罐 (任务ID: 14)
        if (!isTaskCompleted(14) && settings.claimBottle) {
            taskList.push({
                name: '领取盐罐奖励',
                execute: async () => await executeGameCommand(tokenId, 'bottlehelper_claim', {}, '领取盐罐奖励')
            })
        }

        // 8. 竞技场 (任务ID: 13)
        if (!isTaskCompleted(13) && settings.arenaEnable && !hasCompeteToday(tokenId,13)) {
            taskList.push({
                name: '竞技场战斗',
                execute: async () => {
                    logFn('开始竞技场战斗流程')

                    if (new Date().getHours() < 8) {
                        logFn('当前时间未到8点，跳过竞技场战斗', 'warning')
                        return
                    }

                    if (new Date().getHours() > 22) {
                        logFn('当前时间已过22点，跳过竞技场战斗', 'warning')
                        return
                    }

                    await switchToFormationIfNeeded(tokenId, settings.arenaFormation, '竞技场阵容', logFn)
                    //开始竞技场
                    await executeGameCommand(tokenId, 'arena_startarea', {}, '开始竞技场')
                    for (let i = 1; i <= 3; i++) {
                        logFn(`竞技场战斗 ${i}/3`)


                        // 获取目标
                        let targets
                        try {
                            targets = await executeGameCommand(tokenId, 'arena_getareatarget',
                                {}, `获取竞技场目标${i}`)
                        } catch (err) {
                            logFn(`竞技场战斗${i} - 获取对手失败: ${err.message}`, 'error')
                            break
                        }

                        const targetId = pickArenaTargetId(targets)
                        if (targetId) {
                            await executeGameCommand(tokenId, 'fight_startareaarena',
                                { targetId }, `竞技场战斗${i}`, 10000)
                        } else {
                            logFn(`竞技场战斗${i} - 未找到目标`, 'warning')
                        }
                        if(i===2){
                            markCompeteToday(tokenId,13)
                        }
                        // 战斗间隔
                        await new Promise(resolve => setTimeout(resolve, 1000))
                    }
                }
            })
        }

        // 9. BOSS战斗
        if (settings.bossTimes > 0 && !hasCompeteToday(tokenId,'legion:boss')) {
            let alreadyLegionBoss = statistics['legion:boss'] ?? 0
            // 如果上次挑战时间不是今天，说明今天还没打过，视为0次
            if (isTodayAvailable(statisticsTime['legion:boss'])) {
                alreadyLegionBoss = 0
            }
            let remainingLegionBoss = Math.max(settings.bossTimes - alreadyLegionBoss, 0)
            if (remainingLegionBoss > 0) {
                taskList.push({
                    name: '军团BOSS阵容检查',
                    execute: () => switchToFormationIfNeeded(tokenId, settings.bossFormation, 'BOSS阵容', logFn)
                })
                remainingLegionBoss = remainingLegionBoss>2?2:remainingLegionBoss;
                for (let i = 0; i < remainingLegionBoss; i++) {
                    taskList.push({
                        name: `军团BOSS ${i + 1}/${remainingLegionBoss}`,
                        execute: async () => {
                            await executeGameCommand(tokenId, 'fight_startlegionboss', {}, `军团BOSS ${i + 1}`, 12000)
                            if (i === remainingLegionBoss - 1) {
                                markCompeteToday(tokenId, 'legion:boss')
                            }
                        }
                    })
                }
            }
        }
        taskList.push({
            name: '每日BOSS阵容检查',
            execute: async () => await switchToFormationIfNeeded(tokenId, settings.bossFormation, 'BOSS阵容', logFn)
        })
        // 每日BOSS
        const todayBossId = getTodayBossId()
        for (let i = 0; i < 3; i++) {
            taskList.push({
                name: `每日BOSS ${i + 1}/3`,
                execute: async () => {
                    await executeGameCommand(tokenId, 'fight_startboss',
                        {bossId: todayBossId}, `每日BOSS ${i + 1}`, 12000)
                }
            })
        }


        // 10. 固定奖励领取
        const fixedRewards = [
            { name: '福利签到', cmd: 'system_signinreward' },
            { name: '俱乐部', cmd: 'legion_signin' },
            { name: '领取每日礼包', cmd: 'discount_claimreward' },
            { name: '领取每日免费奖励', cmd: 'collection_claimfreereward' },
            { name: '领取免费礼包', cmd: 'card_claimreward' },
            { name: '领取永久卡礼包', cmd: 'card_claimreward', params: { cardId: 4003 } }
        ]

        if (settings.claimEmail) {
            fixedRewards.push({ name: '领取邮件奖励', cmd: 'mail_claimallattachment' })
        }

        fixedRewards.forEach(reward => {
            taskList.push({
                name: reward.name,
                execute: async () => await executeGameCommand(tokenId, reward.cmd, reward.params || {}, reward.name)
            })
        })
        if(!hasCompeteToday(tokenId,'collection_goodslist')){
            // 珍宝阁免费礼包
            taskList.push(
                {
                    name: '开始领取珍宝阁礼包',
                    execute: async () => await executeGameCommand(tokenId, 'collection_goodslist', {}, '开始领取珍宝阁礼包')
                }
            )
            taskList.push(
                {
                    name: '领取珍宝阁免费礼包',
                    execute: async () => {
                        await executeGameCommand(tokenId, 'collection_claimfreereward', {}, '领取珍宝阁免费礼包')
                        markCompeteToday(tokenId, 'collection_goodslist')
                    }
                }
            )
        }


        // 11. 免费活动
        if (isTodayAvailable(statisticsTime['artifact:normal:lottery:time']) && !hasCompeteToday(tokenId,'artifact:normal:lottery:time')) {
            for (let i = 0; i < 2; i++) {
                taskList.push({
                    name: `免费钓鱼 ${i + 1}/3`,
                    execute: async () => {
                        await executeGameCommand(tokenId, 'artifact_lottery', {
                            lotteryNumber: 1,
                            newFree: true,
                            type: 1
                        }, `免费钓鱼 ${i + 1}`)
                    }
                })
            }
            taskList.push({
                name: `免费钓鱼 3/3`,
                execute: async () => {
                    await executeGameCommand(tokenId, 'artifact_lottery', {
                        lotteryNumber: 1,
                        newFree: true,
                        type: 1
                    }, `免费钓鱼 3`)
                    markCompeteToday(tokenId, 'artifact:normal:lottery:time')
                }
            })
        }

        // 灯神免费扫荡
        const kingdoms = ['魏国', '蜀国', '吴国', '群雄']
        for (let gid = 1; gid <= 4; gid++) {
            if (isTodayAvailable(statisticsTime[`genie:daily:free:${gid}`])) {
                if(!hasCompeteToday(tokenId,`genie:daily:free:${gid}`)){
                    taskList.push({
                        name: `${kingdoms[gid - 1]}灯神免费扫荡`,
                        execute: async () => {
                            await executeGameCommand(tokenId, 'genie_sweep', {genieId: gid}, `${kingdoms[gid - 1]}灯神免费扫荡`)
                            markCompeteToday(tokenId, `genie:daily:free:${gid}`)
                        }
                    })
                }
            }
        }
        // 灯神免费扫荡卷
        for (let i = 0; i < 3; i++) {
            if(!hasCompeteToday(tokenId,`genie_buysweep:${i}`)){
                taskList.push({
                    name: `领取免费扫荡卷 ${i + 1}/3`,
                    execute: async () => {
                        await executeGameCommand(tokenId, 'genie_buysweep', {}, `领取免费扫荡卷 ${i + 1}`)
                        markCompeteToday(tokenId, `genie_buysweep:${i}`)
                    }
                })
            }
        }

        // 12. 黑市购买任务 (任务ID: 12)
        if(!hasCompeteToday(tokenId,12)){
            if (!isTaskCompleted(12) && settings.blackMarketPurchase) {
                taskList.push({
                    name: '黑市购买1次物品',
                    execute: async () => {
                        await executeGameCommand(tokenId, 'store_purchase', {goodsId: 1}, '黑市购买1次物品')
                        markCompeteToday(tokenId, 12)
                    }
                })
            }
        }

        // 咸王梦境领取
        const mengyandayOfWeek = new Date().getDay()
        if (mengyandayOfWeek === 0 || mengyandayOfWeek === 1 || mengyandayOfWeek === 3 || mengyandayOfWeek === 4) {
            const mjbattleTeam = { "0": 107 }
            taskList.push({
                name: '咸王梦境',
                execute: async () => await executeGameCommand(tokenId, 'dungeon_selecthero', {battleTeam: mjbattleTeam}, '咸王梦境')
            })
        }
        // 深海灯神领取
        if (mengyandayOfWeek === 1 && isTodayAvailable(statisticsTime[`genie:daily:free:5`])) {
            taskList.push({
                name: '深海灯神',
                execute: async () => await executeGameCommand(tokenId, 'genie_sweep', {
                    genieId: 5,
                    sweepCnt: 1
                }, '深海灯神')
            })
        }
        // 13. 任务奖励领取
        for (let taskId = 1; taskId <= 10; taskId++) {
            taskList.push({
                name: `领取任务奖励${taskId}`,
                execute: async () => await executeGameCommand(tokenId, 'task_claimdailypoint',
                    {taskId}, `领取任务奖励${taskId}`, 5000)
            })
        }

        // 日常和周常奖励
        taskList.push(
            {
                name: '领取日常任务奖励',
                execute: async () => await executeGameCommand(tokenId, 'task_claimdailyreward', {}, '领取日常任务奖励')
            },
            {
                name: '领取周常任务奖励',
                execute: async () => await executeGameCommand(tokenId, 'task_claimweekreward', {}, '领取周常任务奖励')
            }
        )
        taskList.push({
            name: '恢复原始阵容',
            execute: async () => {
                logFn('所有任务完成，正在切回原始阵容...', 'success')
                await switchToFormationIfNeeded(tokenId, originalFormation,'阵容还原', logFn)
            }
        })
        // 执行任务列表
        const totalTasks = taskList.length
        logFn(`共有 ${totalTasks-1} 个任务待执行`)

        for (let i = 0; i < totalTasks; i++) {
            const task = taskList[i]

            try {
                await task.execute()

                // 更新进度
                const progress = Math.floor(((i + 1) / totalTasks) * 100)
                if (progressFn) progressFn(tokenId, progress)

                if(i<totalTasks -1){
                    // 任务间隔
                    await new Promise(resolve => setTimeout(resolve, 500))
                }
            } catch (error) {
                logFn(`任务执行失败: ${task.name} - ${error.message}`, 'error')
                // 继续执行下一个任务
            }
        }

        // 确保进度为100%
        if (progressFn) progressFn(tokenId, 100)
        logFn('所有任务执行完成', 'success')

        //答题
        if(!hasCompeteToday(tokenId,'answer_test')){
            await preloadQuestions()
            executeGameCommand(tokenId, 'study_startgame', {}, `开始答题`);
            // tokenStore.sendMessage(tokenId, 'study_startgame')
            logFn(`[${tokenId}] 触发答题，等待8秒，防止多账号串题`, 'info')
            await new Promise(resolve => setTimeout(resolve, 8000))
            logFn(`[${tokenId}] 答题等待结束`, 'success')
            markCompeteToday(tokenId,'answer_test')
        } else {
            logFn(`[${tokenId}] 今天已答题，跳过答题逻辑`, 'warning')
            // 最后刷新一次角色信息
            await new Promise(resolve => setTimeout(resolve, 2000))
        }
        await refreshRoleInfo(tokenId,syncCompleteFromServer)
    }

    // 执行单个账号的每日任务（供DailyTask.vue使用）
    const executeDailyBusiness = async (token) => {
        const key = `daily-TASK:${token.id}`
        const taskRun = localStorage.getItem(key)
        if (taskRun) return
        localStorage.setItem(key, new Date().toISOString())
        let wsStatus = tokenStore.getWebSocketStatus(token.id)
        if (wsStatus === 'connected') {
            LogUtil.debug(`${token.name} WebSocket 已连接，跳过`)
        }else if(wsStatus === 'connecting'){
            LogUtil.debug(`${token.name} WebSocket 正在连接，等待800ms`)
            await new Promise(resolve => setTimeout(resolve, 800))
            wsStatus = tokenStore.getWebSocketStatus(token.id)
        }else{
            const autoReconnectEnabled = ref(localStorage.getItem('autoReconnectEnabled') !== 'false')
            if(autoReconnectEnabled.value){
                await tokenStore.createWebSocketConnection(token.id, token.token, token.wsUrl)
                wsStatus = tokenStore.getWebSocketStatus(token.id)
                LogUtil.info(`${token.name} WebSocket 连接完成`)
            }else {
                LogUtil.info(`${token.name} 不允许自动连接，暂不连接ws`)
                const messages = []
                messages.push('ws连接关闭，且不允许自动连接')
                return { success: false,messages }
            }

        }
        const messages = []
        const logFn = (message, type = 'info') => {
            const time = new Date().toLocaleTimeString()
            const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️'
            const messageItem = `${prefix} ${message}`
            messages.push(messageItem)
            LogUtil.info(messageItem)
        }

        try {
            logFn(`开始为 ${token.name} (ID: ${token.id}) 执行每日任务自动补差...`)
            logFn(`WebSocket连接状态: ${wsStatus}`)
            if (wsStatus !== 'connected') {
                throw new Error('WebSocket连接未建立')
            }

            const roleInfo = await refreshRoleInfo(token.id,syncCompleteFromServer)
            if (!roleInfo?.role) {
                throw new Error('获取角色信息失败或数据异常')
            }

            const res = await tokenStore.sendMessageWithPromise(token.id, "fight_startlevel");
            tokenStore.setBattleVersion(res?.battleData?.version);
            LogUtil.info('BattleVersion='+tokenStore.getBattleVersion())
            const dailyPoint = roleInfo.role.dailyTask?.dailyPoint || 0
            logFn(`${token.name}当前每日任务进度: ${dailyPoint}/100`)
            const tokenSettings = loadTokenSettings(token.id)
            const settings = tokenSettings || getDefaultConfig()
            // 使用通用的executeDailyTasks
            await executeDailyTasks({
                tokenId: token.id,
                roleInfo,
                settings,
                logFn,
                progressFn: () => {}
            })

            logFn(`${token.name} 每日任务自动执行完成`, 'success')
            return { success: true, messages }
        } catch (error) {
            const errorMsg = `${token.name} 每日任务执行失败: ${error.message}`
            logFn(errorMsg, 'error')
            return { success: false, messages }
        }finally {
            localStorage.removeItem(key)
        }
    }

    return {
        getDefaultConfig,
        loadTokenSettings,
        saveTokenSettings,
        executeDailyTasks,
        executeDailyBusiness,
        switchToFormationIfNeeded,
        isTodayAvailable,
        getTodayBossId
    }
}