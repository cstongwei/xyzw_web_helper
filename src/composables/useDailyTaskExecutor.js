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
    markCompeteToday,
    isBetweenTime, isTodayInWeekdays, ensureWebSocketConnected, LocalStorageUtil
} from '@/utils/CommonUtil.js';
import {createSharedLogger} from "@/utils/sharedLogger.js";
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

    // 同步服务器任务完成状态
    const syncCompleteFromServer = (resp) => {
        if (!resp?.role?.dailyTask?.complete) {
            LogUtil.info('角色信息中无任务完成数据')
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
            tokenName,          // 必需：token 名称
            roleInfo,          // 必需：角色信息
            settings,          // 必需：设置对象
            createLogFn,             // 必需：日志函数 (message, type?)
            progressFn         // 可选：进度回调函数 (tokenId, progress)
        } = params
        LogUtil.info(`tokenId: ${tokenId}`);
        LogUtil.info(`settings: ${JSON.stringify(settings)}`);
        const roleData = roleInfo?.role
        if (!roleData) throw new Error('角色数据不存在')

        const completedTasks = roleData.dailyTask?.complete ?? {}
        const isTaskCompleted = (taskId) => completedTasks[taskId] === -1
        const statistics = roleData.statistics ?? {}
        const statisticsTime = roleData.statisticsTime ?? {}
        // const teamInfo = await tokenStore.sendMessageWithPromise(tokenId, 'presetteam_getinfo', {}, 8000)
        const teamInfo =  await executeGameCommand(tokenId,tokenName, 'presetteam_getinfo', {}, '获取阵容信息',8000);
        let originalFormation = teamInfo?.presetTeamInfo?.useTeamId ?? 1;
        // createLogFn(`当前阵容信息${JSON.stringify(teamInfo)}`, 'info')
        createLogFn('开始执行每日任务补差', 'info')

        // 构建任务列表
        const taskList = []

        // 1. 分享游戏 (任务ID: 2)
        if (!isTaskCompleted(2)&&!hasCompeteToday(tokenId,2)) {
            taskList.push({
                name: '分享一次游戏',
                execute: async () => {
                    await executeGameCommand(tokenId,tokenName, 'system_mysharecallback',
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
                    await executeGameCommand(tokenId, tokenName,'friend_batch', {}, '赠送好友金币')
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
                        await executeGameCommand(tokenId, tokenName,'hero_recruit',
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
                            await executeGameCommand(tokenId, tokenName,'hero_recruit',
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
                        await executeGameCommand(tokenId, tokenName,'system_buygold',
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
                    execute: async () => await executeGameCommand(tokenId,tokenName, 'system_mysharecallback',
                        {isSkipShareCard: true, type: 2}, `挂机加钟 ${i + 1}`)
                })
            }

            taskList.push({
                name: '领取挂机奖励',
                execute: async () => await executeGameCommand(tokenId, tokenName,'system_claimhangupreward', {}, '领取挂机奖励')
            })

            taskList.push({
                name: '挂机加钟 5/5',
                execute: async () => await executeGameCommand(tokenId, tokenName,'system_mysharecallback',
                    {isSkipShareCard: true, type: 2}, '挂机加钟 5')
            })
        }

        // 6. 开宝箱 (任务ID: 7)
        if (!isTaskCompleted(7) && settings.openBox &&!hasCompeteToday(tokenId,7)) {
            const numPerOpen = 10
            taskList.push({
                name: '开启木质宝箱',
                execute: async () => {
                    await executeGameCommand(tokenId, tokenName,'item_openbox',
                        {itemId: 2001, number: numPerOpen}, `开启木质宝箱${numPerOpen}个 `)
                    markCompeteToday(tokenId, 7)
                }
            })
        }

        // 7. 盐罐 (任务ID: 14)
        if (!isTaskCompleted(14) && settings.claimBottle) {
            taskList.push({
                name: '领取盐罐奖励',
                execute: async () => await executeGameCommand(tokenId, tokenName,'bottlehelper_claim', {}, '领取盐罐奖励')
            })
        }

        // 8. 竞技场 (任务ID: 13)
        const isArenaAvailableTime = isBetweenTime('08:01', '21:58')
        if (!isTaskCompleted(13) && settings.arenaEnable && isArenaAvailableTime && !hasCompeteToday(tokenId,13)) {
            taskList.push({
                name: '竞技场战斗',
                execute: async () => {
                    createLogFn('开始竞技场战斗流程')

                    if (new Date().getHours() < 8) {
                        createLogFn('当前时间未到8点，跳过竞技场战斗', 'warning')
                        return
                    }

                    if (new Date().getHours() > 22) {
                        createLogFn('当前时间已过22点，跳过竞技场战斗', 'warning')
                        return
                    }

                    await switchToFormationIfNeeded(tokenId,tokenName, settings.arenaFormation, '竞技场阵容', createLogFn)
                    //开始竞技场
                    await executeGameCommand(tokenId, tokenName,'arena_startarea', {}, '开始竞技场')
                    for (let i = 1; i <= 3; i++) {
                        createLogFn(`竞技场战斗 ${i}/3`)


                        // 获取目标
                        let targets
                        try {
                            targets = await executeGameCommand(tokenId, tokenName,'arena_getareatarget',
                                {}, `获取竞技场目标${i}`)
                        } catch (err) {
                            createLogFn(`竞技场战斗${i} - 获取对手失败: ${err.message}`, 'error')
                            break
                        }

                        const targetId = pickArenaTargetId(targets)
                        if (targetId) {
                            await executeGameCommand(tokenId, tokenName,'fight_startareaarena',
                                { targetId }, `竞技场战斗${i}`, 10000)
                        } else {
                            createLogFn(`竞技场战斗${i} - 未找到目标`, 'warning')
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
                    execute: () => switchToFormationIfNeeded(tokenId,tokenName, settings.bossFormation, 'BOSS阵容', createLogFn)
                })
                remainingLegionBoss = remainingLegionBoss>2?2:remainingLegionBoss;
                for (let i = 0; i < remainingLegionBoss; i++) {
                    taskList.push({
                        name: `军团BOSS ${i + 1}/${remainingLegionBoss}`,
                        execute: async () => {
                            await executeGameCommand(tokenId, tokenName,'fight_startlegionboss', {}, `军团BOSS ${i + 1}`, 12000)
                            if (i === remainingLegionBoss - 1) {
                                markCompeteToday(tokenId, 'legion:boss')
                            }
                        }
                    })
                }
            }
        }

        const isEveryDayBossTime = isBetweenTime('08:01', '22:58')
        if(isEveryDayBossTime){
            taskList.push({
                name: '每日BOSS阵容检查',
                execute: async () => await switchToFormationIfNeeded(tokenId,tokenName, settings.bossFormation, 'BOSS阵容', createLogFn )
            })
            // 每日BOSS
            const todayBossId = getTodayBossId()
            for (let i = 0; i < 3; i++) {
                taskList.push({
                    name: `每日BOSS ${i + 1}/3`,
                    execute: async () => {
                        await executeGameCommand(tokenId, tokenName,'fight_startboss',
                            {bossId: todayBossId}, `每日BOSS ${i + 1}`, 12000)
                    }
                })
            }
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
                execute: async () => await executeGameCommand(tokenId,tokenName, reward.cmd, reward.params || {}, reward.name)
            })
        })
        if(!hasCompeteToday(tokenId,'collection_goodslist')){
            // 珍宝阁免费礼包
            taskList.push(
                {
                    name: '开始领取珍宝阁礼包',
                    execute: async () => await executeGameCommand(tokenId,tokenName, 'collection_goodslist', {}, '开始领取珍宝阁礼包')
                }
            )
            taskList.push(
                {
                    name: '领取珍宝阁免费礼包',
                    execute: async () => {
                        await executeGameCommand(tokenId, tokenName,'collection_claimfreereward', {}, '领取珍宝阁免费礼包')
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
                        await executeGameCommand(tokenId, tokenName,'artifact_lottery', {
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
                    await executeGameCommand(tokenId, tokenName,'artifact_lottery', {
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
                            await executeGameCommand(tokenId, tokenName,'genie_sweep', {genieId: gid}, `${kingdoms[gid - 1]}灯神免费扫荡`)
                            markCompeteToday(tokenId, `genie:daily:free:${gid}`)
                        }
                    })
                }
            }
        }
        // 领取免费灯神扫荡券
        for (let i = 0; i < 3; i++) {
            if(!hasCompeteToday(tokenId,`genie_buysweep:${i}`)){
                taskList.push({
                    name: `领取免费扫荡卷 ${i + 1}/3`,
                    execute: async () => {
                        await executeGameCommand(tokenId, tokenName,'genie_buysweep', {}, `领取免费扫荡卷 ${i + 1}`)
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
                        await executeGameCommand(tokenId, tokenName,'store_purchase', {goodsId: 1}, '黑市购买1次物品')
                        markCompeteToday(tokenId, 12)
                    }
                })
            }
        }

        // 咸王梦境领取
        if (isTodayInWeekdays([1, 3, 4, 7])) {
            const mjbattleTeam = { "0": 107 }
            taskList.push({
                name: '咸王梦境',
                execute: async () => await executeGameCommand(tokenId, tokenName,'dungeon_selecthero', {battleTeam: mjbattleTeam}, '咸王梦境')
            })
        }
        // 深海灯神领取
        if (isTodayInWeekdays([1])&& isTodayAvailable(statisticsTime[`genie:daily:free:5`])) {
            taskList.push({
                name: '深海灯神',
                execute: async () => await executeGameCommand(tokenId, tokenName,'genie_sweep', {
                    genieId: 5,
                    sweepCnt: 1
                }, '深海灯神')
            })
        }
        // 13. 任务奖励领取
        for (let taskId = 1; taskId <= 10; taskId++) {
            taskList.push({
                name: `领取任务奖励${taskId}`,
                execute: async () => await executeGameCommand(tokenId,tokenName, 'task_claimdailypoint',
                    {taskId}, `领取任务奖励${taskId}`, 5000)
            })
        }

        // 日常和周常奖励
        taskList.push(
            {
                name: '领取日常任务奖励',
                execute: async () => await executeGameCommand(tokenId,tokenName, 'task_claimdailyreward', {}, '领取日常任务奖励')
            },
            {
                name: '领取周常任务奖励',
                execute: async () => await executeGameCommand(tokenId, tokenName,'task_claimweekreward', {}, '领取周常任务奖励')
            }
        )
        taskList.push({
            name: '恢复原始阵容',
            execute: async () => {
                createLogFn('所有任务完成，尝试切回原阵容...', 'info')
                await switchToFormationIfNeeded(tokenId, tokenName,originalFormation,'阵容还原', createLogFn)
            }
        })
        // 执行任务列表
        const totalTasks = taskList.length
        createLogFn(`共有 ${totalTasks-1} 个任务待执行`)

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
                createLogFn(`任务执行失败: ${task.name} - ${error.message}`, 'error')
                // 继续执行下一个任务
            }
        }

        // 确保进度为100%
        if (progressFn) progressFn(tokenId, 100)
        createLogFn('所有任务执行完成', 'success')

        //答题
        if(!hasCompeteToday(tokenId,'answer_test')){
            await preloadQuestions()
            executeGameCommand(tokenId, tokenName,'study_startgame', {}, `开始答题`);
            // tokenStore.sendMessage(tokenId, 'study_startgame')
            createLogFn(`[${tokenId}] 触发答题，等待8秒，防止多账号串题`, 'info')
            await new Promise(resolve => setTimeout(resolve, 8000))
            createLogFn(`[${tokenId}] 答题等待结束`, 'success')
            markCompeteToday(tokenId,'answer_test')
        } else {
            createLogFn(`[${tokenId}] 今天已答题，跳过答题逻辑`, 'warning')
            // 最后刷新一次角色信息
            await new Promise(resolve => setTimeout(resolve, 2000))
        }
        await refreshRoleInfo(tokenId,tokenName,syncCompleteFromServer)
    }

    // 执行单个账号的每日任务（供DailyTask.vue使用）
    const executeDailyBusiness = async (token) => {
        const key = `daily-TASK:${token.id}`
        const taskRun = LocalStorageUtil.get( key)
        const now = new Date();
        const TWO_HOURS_MS = 2 * 60 * 60 * 1000; // 2小时对应的毫秒数

        if (taskRun) {
            const storedTime = new Date(taskRun);
            if (!isNaN(storedTime.getTime())) {
                const diffMs = now - storedTime;
                if (diffMs <= TWO_HOURS_MS) {
                    // 2小时内，视为任务正在运行或刚完成，不重复执行
                    const messages = [];
                    messages.push('任务已经启动，不重复执行');
                    return { success: false, messages };
                }
                LogUtil.warn(`[${token.id}] 检测到任务运行超过2小时，允许重新执行`);
            } else {
                LogUtil.warn(`[${token.id}] 存储的时间无效，允许重新执行`);
            }
        }
        LocalStorageUtil.set(key, new Date().toISOString())

        const messages = []
        const createLogFn = createSharedLogger(token.name, messages);
        const result = await ensureWebSocketConnected(token);
        if (!result.success) {
            LocalStorageUtil.delete(key)
            return result;
        }

        try {
            createLogFn(`开始执行每日任务自动补差...`, 'info')
            const roleInfo = await refreshRoleInfo(token.id,token.name,syncCompleteFromServer)
            if (!roleInfo?.role) {
                throw new Error('获取角色信息失败或数据异常')
            }

            const res = await tokenStore.sendMessageWithPromise(token.id, "fight_startlevel");
            tokenStore.setBattleVersion(res?.battleData?.version);
            LogUtil.info('BattleVersion='+tokenStore.getBattleVersion())
            const dailyPoint = roleInfo.role.dailyTask?.dailyPoint || 0
            createLogFn(`当前每日任务进度: ${dailyPoint}/100`, 'info')
            const tokenSettings = loadTokenSettings(token.id)
            const settings = tokenSettings || getDefaultConfig()
            // 使用通用的executeDailyTasks
            await executeDailyTasks({
                tokenId: token.id,
                tokenName: token.name,
                roleInfo,
                settings,
                createLogFn,
                progressFn: () => {}
            })

            createLogFn(`每日任务自动执行完成`, 'success')
            return { success: true, messages }
        } catch (error) {
            const errorMsg = `${token.name} 每日任务执行失败: ${error.message}`
            createLogFn(errorMsg, 'error')
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
        isTodayAvailable,
        getTodayBossId
    }
}