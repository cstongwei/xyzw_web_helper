<template>
  <div class="task-card">
    <!-- 组件头部：标题 + 间隔配置 + 阵容按钮 + 规则提示 -->
    <div class="task-header">
      <h2 class="task-title">塔防任务自动执行</h2>
      <!-- 执行间隔配置 -->
      <div class="task-config">
        <n-input
            v-model:value="intervalMinutes"
            type="number"
            placeholder="输入执行间隔（分钟）"
            :min="1"
            style="width: 180px; margin-right: 10px;"
            @input="validateIntervalWrapper"
        />
        <span class="config-tip">默认：{{ DEFAULT_INTERVAL_MINUTES }} 分钟</span>
      </div>
      <!-- 阵容按钮 + 规则提示 -->
      <div class="task-formation-wrap">
        <n-button
            size="small"
            type="primary"
            @click="openSettingModal"
            class="formation-btn"
        >
          <template #icon><n-icon><Settings /></n-icon></template>
          阵容设置
        </n-button>
        <!-- 规则提示 -->
        <n-tag type="info" size="small" class="rule-tip">
          阵容规则：执行时使用保存的配置，结束后自动还原原始阵容
        </n-tag>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="task-actions">
      <n-button type="primary" @click="startTask" :disabled="taskStatus === 'running'">
        <template #icon><n-icon><Play /></n-icon></template>
        启动任务
      </n-button>
      <n-button type="warning" @click="pauseTask" :disabled="taskStatus !== 'running'">
        <template #icon><n-icon><Pause /></n-icon></template>
        暂停任务
      </n-button>
      <n-button type="success" @click="resumeTask" :disabled="taskStatus !== 'paused'">
        <template #icon><n-icon><PlayCircle /></n-icon></template>
        恢复任务
      </n-button>
      <n-button type="info" @click="restartTask">
        <template #icon><n-icon><Refresh /></n-icon></template>
        重启任务
      </n-button>
      <!-- 查看日志按钮 -->
      <n-button type="secondary" @click="openLogModal" :disabled="!logBatches.length">
        <template #icon><n-icon><DocumentText /></n-icon></template>
        查看日志
      </n-button>
    </div>

    <!-- 任务状态卡片 -->
    <div class="task-status-card">
      <div class="status-header">
        <span class="status-title">任务状态</span>
        <n-badge :status="taskStatusStyle" :text="taskStatusText" />
      </div>
      <div class="status-content">
        <div class="status-item-group">
          <div class="status-item">
            <span class="status-label">执行次数：</span>
            <span class="status-value">{{ executeCount }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">最后执行：</span>
            <span class="status-value">{{ lastExecuteTime || '未执行' }}</span>
          </div>
          <div class="status-item highlight">
            <span class="status-label">下次执行：</span>
            <span class="status-value">{{ nextExecuteTime || '计算中...' }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">倒计时：</span>
            <span class="status-value">{{ countdownText || '00:00:00' }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">配置状态：</span>
            <span class="status-value">{{ getSettingsStatusText() }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 阵容设置弹窗 -->
    <n-modal
        v-model:show="isSettingModalOpen"
        preset="card"
        title="Token爬塔阵容设置"
        size="large"
        :style="{ width: '90%', maxWidth: '800px' }"
    >
      <div class="setting-modal-content">
        <!-- 弹窗操作按钮 -->
        <div class="setting-actions">
          <n-button size="small" type="secondary" @click="initDefaultSettings">
            恢复为游戏当前阵容
          </n-button>
          <n-button size="small" type="primary" @click="saveTokenFormationSettings">
            保存设置
          </n-button>
        </div>
        <!-- Token列表 -->
        <div class="token-settings-list" v-if="tokenFormationSettings.length > 0">
          <div
              class="token-settings-item"
              v-for="(item, index) in tokenFormationSettings"
              :key="index"
          >
            <div class="token-info">
              <span class="token-name">{{ index + 1 }}、{{ item.tokenName }}</span>
              <span class="token-current-team" v-if="item.currentUseTeamId">
                （当前游戏选中：阵容{{ item.currentUseTeamId }}）
              </span>
            </div>
            <div class="formation-select">
              <n-select
                  v-model:value="item.formation"
                  :options="item.formationOptions"
                  placeholder="暂无可用阵容"
                  style="width: 120px;"
                  :disabled="item.formationOptions.length === 0"
              />
            </div>
          </div>
        </div>
        <div class="empty-tip" v-else>
          暂无可用Token，请先添加Token后再配置
        </div>
      </div>
    </n-modal>

    <!-- 日志弹窗 -->
    <n-modal
        v-model:show="isLogModalOpen"
        preset="card"
        title="执行日志（最近50批次）"
        size="large"
        :style="{ width: '90%', maxWidth: '1000px' }"
    >
      <div class="log-modal-content">
        <div class="logs-header">
          <n-button
              size="small"
              type="error"
              text
              @click="clearLogs"
              class="clear-log-btn"
          >
            清空日志
          </n-button>
        </div>
        <div class="logs-list" v-if="logBatches.length">
          <div
              class="batch-log-item"
              v-for="(batch, index) in logBatches.slice(-50).reverse()"
              :key="batch.batchId"
              :class="{ 'batch-error': batch.type === 'error' || batch.type === 'processing' && batch.tokenDetails.some(t => t.status === 'error') }"
          >
            <div
                class="batch-main-row"
                @click="batch.tokenDetails.length > 0 && toggleBatchExpand(batch.batchId)"
                :class="{ expanded: expandedBatchIds.has(batch.batchId) }"
                :style="{ cursor: batch.tokenDetails.length > 0 ? 'pointer' : 'default' }"
            >
              <span class="batch-main-message">{{ batch.mainMessage }}</span>
              <span class="expand-icon" v-if="batch.tokenDetails.length > 0">
                {{ expandedBatchIds.has(batch.batchId) ? '▼' : '▶' }}
              </span>
            </div>
            <div class="token-details" v-if="expandedBatchIds.has(batch.batchId) && batch.tokenDetails.length > 0">
              <div
                  class="token-detail-item"
                  v-for="(token, tokenIndex) in batch.tokenDetails"
                  :key="tokenIndex"
                  :class="`token-status-${token.status === 'success' ? 'success' : 'error'}`"
              >
                <div class="token-header">
                  <span class="token-name">Token: {{ token.tokenName }} (ID: {{ token.tokenId }})</span>
                  <span class="token-status-badge" :class="token.status === 'success' ? 'success' : 'error'">
                    {{ token.status === 'success' ? '处理成功' : '处理失败' }}
                  </span>
                </div>
                <div class="token-messages">
                  <div
                      class="token-message-item"
                      v-for="(msg, msgIndex) in token.messages"
                      :key="msgIndex"
                      v-html="formatLogMsg(msg)"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="no-logs-tip" v-else>
          暂无执行日志
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import {useTokenStore} from '@/stores/tokenStore'
import {DocumentText, Pause, Play, PlayCircle, Refresh, Settings} from '@vicons/ionicons5'
import {NBadge, NButton, NIcon, NInput, NModal, NSelect, NTag} from 'naive-ui'
import {useTaskManager} from '@/composables/useTaskManager'
import {computed, onMounted,onUnmounted, ref, watch} from 'vue'
import {
  delaySeconds,
  ensureWebSocketConnected,
  executeGameCommand,
  getFormationInfo,
  sendGameCommand,
  switchToFormationIfNeeded
} from '@/utils/CommonUtil.js';
import LogUtil from "@/utils/LogUtil.js";
import {createSharedLogger} from "@/utils/sharedLogger.js";
import {$emit, onSome} from "@/stores/events/index";

// 公共常量
const DEFAULT_INTERVAL_MINUTES = 60 // 默认间隔60分钟
const SETTINGS_KEY = 'tower_token_formation_settings'
const MAX_CLIMB_TIMES = 100 // 最大爬塔次数
const CLIMB_TIMEOUT = 5 * 60000 // 爬塔超时时间（ms）
const CLIMB_INTERVAL = 2000 // 爬塔间隔时间（ms）

// 弹窗控制
const isSettingModalOpen = ref(false)
const isLogModalOpen = ref(false)
const isSerialProcessing = ref(false);

// Token存储
const tokenStore = useTokenStore()
const roleInfo = computed(() => {
  return tokenStore.gameData?.roleInfo || null
})

// 阵容配置
const tokenFormationSettings = ref([])
const tokenTowerCache = new Map();

// 爬塔状态管理：key=tokenId，value=爬塔状态
const climbContextMap = new Map([
  /* 状态结构：
  {
    isClimbing: boolean, // 是否正在爬塔
    isStopped: boolean,  // 是否强制停止
    climbCount: number,  // 当前爬塔次数
    maxClimbTimes: number, // 最大爬塔次数
    timeoutTimer: null | Timer, // 超时定时器
    originalFormation: any, // 原始阵容
    targetFormation: any, // 目标阵容
    token: any, // Token信息
    logFn: Function, // 日志函数
    messages: Array // 日志消息数组
  }
  */
]);
// ========== 显性爬塔驱动函数（替代setTimeout） ==========
/**
 * 显性触发下一次爬塔（无隐式任务排队，可被await阻塞）
 * @param {string} tokenId - TokenID
 * @param {number} nextClimbCount - 下一次爬塔次数
 * @param {number} currentEnergy - 当前体力值
 */
const triggerNextClimb = (tokenId, nextClimbCount, currentEnergy) => {
  const climbContext = climbContextMap.get(tokenId);
  // 严格状态校验（核心：拦截领奖等待/已停止/体力不足等非法状态）
  if (
      !climbContext ||
      !climbContext.isClimbing ||
      climbContext.isStopped ||
      climbContext.isWaitingForReward || // 领奖期间直接拦截
      currentEnergy <= 0 ||
      nextClimbCount > climbContext.maxClimbTimes
  ) {
    climbContext?.logFn(`当前状态不允许发送第${nextClimbCount}次爬塔指令，取消发送`, 'info');
    return;
  }

  const { logFn, token } = climbContext;
  // 显性发送爬塔指令（无定时器，直接执行）
  logFn(`第${nextClimbCount}次爬塔：体力剩余${currentEnergy}，发送fight_starttower指令`, 'success');
  executeGameCommand(tokenId, token.name, 'fight_starttower', {}, '爬塔', 10000)
      .catch(err => {
        logFn(`[显性驱动] 第${nextClimbCount}次爬塔指令发送失败：${err.message}`, 'error');
        stopClimb(tokenId, '指令发送失败');
      });
};
// ========== 事件监听：核心事件驱动逻辑 ==========
/**
 * role_getroleinfo 指令的响应监听：触发第一次爬塔指令
 */
onSome(['reflushRoleInfo'], (data) => {
  if (!data || !data.tokenId || !data.body) return;

  // 1. 缓存角色信息
  tokenTowerCache.set(data.tokenId, {
    ...(tokenTowerCache.get(data.tokenId) || {}),
    roleInfo: data.body.role,
    tokenId: data.tokenId,
    updateTime: new Date().toISOString()
  });

  const climbContext = climbContextMap.get(data.tokenId);
  // 2. 校验爬塔状态：仅当正在爬塔、未停止、有体力时，触发第一次爬塔
  if (!climbContext || !climbContext.isClimbing || climbContext.isStopped) return;

  const { logFn, token } = climbContext;
  const towerCache = tokenTowerCache.get(data.tokenId);
  const energy = towerCache?.roleInfo?.tower?.energy || 0;

  // 3. 判断体力，触发首次爬塔
  if (energy <= 0) {
    logFn(`体力不足（剩余：${energy}），终止爬塔`, 'success');
    stopClimb(data.tokenId, '体力不足');
    return;
  }

  // 4. 发送第一次爬塔指令
  logFn(`爬塔：体力剩余${energy}，发送fight_starttower指令`, 'success');
  executeGameCommand(data.tokenId, token.name, 'fight_starttower', {}, '爬塔', 10000)
      .catch(err => {
        logFn(`爬塔指令发送失败：${err.message}`, 'error');
        stopClimb(data.tokenId, '指令发送失败');
      });
});

/**
 * fight_starttower 指令的响应监听：循环判断体力，继续爬塔
 */
onSome(['reflushFightTowerInfo'], async (data) => {
  if (!data || !data.tokenId){
    return;
  }
  const climbContext = climbContextMap.get(data.tokenId);
  if (!climbContext || !climbContext.isClimbing || climbContext.isStopped) {
    return;
  }
  const {logFn, token} = climbContext;
  logFn(`收到爬塔结果数据:${JSON.stringify(data)}`, 'info','file');
  if (!data || !data.tokenId) return;

  // 1. 缓存战斗结果
  tokenTowerCache.set(data.tokenId, {
    ...(tokenTowerCache.get(data.tokenId) || {}),
    towerFightResult: data || {},
    tokenId: data.tokenId,
    updateTime: new Date().toISOString()
  });

  const {isSuccess, towerId} = data
  if (!isSuccess && towerId === undefined) {
    return;
  }

  const layer = towerId % 10
  const rewardFloor = Math.floor(towerId / 10)
  logFn(`当前正在爬:${rewardFloor}-${layer + 1}层塔`, 'info');
  // 如果是新层数的第一层(layer=0)，检查是否有奖励可领取
  if (layer === 0) {
    // 锁定领奖等待状态（核心：立即标记为true，拦截后续指令）
    const roleInfo = tokenTowerCache.get(data.tokenId).roleInfo
    const towerRewards = roleInfo?.tower?.reward
    const {client} = data;
    logFn(`检测到有奖励 ${JSON.stringify(towerRewards)}`, 'info');
    if (towerRewards && !towerRewards[rewardFloor]) {
      climbContext.isWaitingForReward = true;
      // 保存奖励信息
      tokenTowerCache.get(data.tokenId).towerFightResult.autoReward = true
      tokenTowerCache.get(data.tokenId).towerFightResult.rewardFloor = rewardFloor
      logFn(`发送领取奖励指令`, 'info')
      client?.send('tower_claimreward', {rewardId: rewardFloor})
    }
  }
  // 2. 校验爬塔状态：非爬塔中/已停止，直接返回
  if (!climbContext || !climbContext.isClimbing || climbContext.isStopped) return;
  const towerCache = tokenTowerCache.get(data.tokenId);
  const energy = towerCache?.roleInfo?.tower?.energy || 0;
  let {climbCount} = climbContext;

  // 3. 爬塔次数+1
  climbCount++;
  climbContext.climbCount = climbCount;
  logFn(`第${climbCount}次爬塔完成，当前剩余体力：${energy}`, 'success');

  // 4. 终止条件判断
  // 条件1：体力耗尽
  if (energy <= 0) {
    logFn(`体力耗尽（剩余：${energy}），终止爬塔循环`, 'success');
    stopClimb(data.tokenId, '体力耗尽');
    return;
  }
  const {maxClimbTimes} = climbContext;
  // 条件2：达到最大爬塔次数
  if (climbCount >= maxClimbTimes) {
    logFn(`达到最大爬塔次数（${maxClimbTimes}次），终止爬塔循环`, 'success');
    stopClimb(data.tokenId, '达到最大次数');
    return;
  }
  // 条件3：已被强制停止
  if (climbContext.isStopped) {
    logFn(`爬塔已被强制停止`, 'warning');
    stopClimb(data.tokenId, '已强制停止');
    return;
  }

  // 5. 满足继续爬塔条件，延迟发送下一次指令
  logFn(`满足继续爬塔条件，${CLIMB_INTERVAL / 1000}秒后发送下一次爬塔指令`, 'info');
  // 显性异步延迟（替代setTimeout，可被领奖的10秒await阻塞）
  await delaySeconds(CLIMB_INTERVAL / 1000);
  const nextClimbCount = climbCount + 1;
  // 显性调用爬塔函数（无隐式任务，状态实时校验）
  if(climbContext.isWaitingForReward){
    logFn(`即将等待5秒，确保领奖完成，climbContext存在性：${!!climbContext}，爬塔状态：${climbContext?.isClimbing ? '运行中' : '已停止'}，是否强制停止：${climbContext?.isStopped ? '是' : '否'}`, 'info');
    await delaySeconds(5);
    climbContext.isWaitingForReward = false;
    logFn(`5秒等待结束，当前climbContext：${JSON.stringify(!!climbContext)}`, 'info');
    triggerNextClimb(data.tokenId, nextClimbCount, energy)
  }else{
    triggerNextClimb(data.tokenId, nextClimbCount, energy)
  } 
});

// ========== 爬塔核心方法 ==========
/**
 * 初始化爬塔状态
 * @param token Token信息
 * @param logFn 日志函数
 * @param messages 日志消息数组
 * @param originalFormation 原始阵容
 * @param targetFormation 目标阵容
 */
const initClimbContext = (token, logFn, messages, originalFormation, targetFormation,climbCompleteCallback) => {
  // 清除原有状态
  if (climbContextMap.has(token.id)) {
    const oldStatus = climbContextMap.get(token.id);
    if (oldStatus.timeoutTimer) clearTimeout(oldStatus.timeoutTimer);
  }

  // 设置超时定时器
  const timeoutTimer = setTimeout(() => {
    logFn(`爬塔超时（${CLIMB_TIMEOUT/1000}秒），强制终止`, 'warning');
    stopClimb(token.id, '超时强制停止');
  }, CLIMB_TIMEOUT);

  // 存储新状态
  climbContextMap.set(token.id, {
    isClimbing: true,
    isStopped: false,
    isWaitingForReward: false, // 领奖等待标记，默认false
    climbCount: 0,
    maxClimbTimes: MAX_CLIMB_TIMES,
    timeoutTimer,
    originalFormation,
    targetFormation,
    token,
    logFn,
    messages,
    climbCompleteCallback
  });
};

/**
 * 停止爬塔
 * @param tokenId TokenID
 * @param reason 停止原因
 */
const stopClimb = async (tokenId, reason = '未知原因') => {
  const climbContext = climbContextMap.get(tokenId);
  if (!climbContext) return;

  // 1. 更新状态
  climbContext.isClimbing = false;
  climbContext.isStopped = true;
  const { logFn, token, originalFormation, targetFormation, climbCount, messages, timeoutTimer,climbCompleteCallback } = climbContext;
  climbContext.isWaitingForReward = false;
  // 2. 清除超时定时器
  if (timeoutTimer) clearTimeout(timeoutTimer);

  // 3. 还原阵容
  const needSwitch = originalFormation !== targetFormation;
  if (needSwitch) {
    await switchToFormationIfNeeded(tokenId, token.name, originalFormation, '还原阵容', logFn)
        .then(() => logFn(`阵容已还原为${originalFormation}`, 'success'))
        .catch(err => logFn(`阵容还原失败：${err.message}`, 'error'));
  }

  // 4. 日志记录
  logFn(`爬塔流程结束，共执行${climbCount}次，停止原因：${reason}`, 'success');
  if (typeof climbCompleteCallback === 'function') {
    climbCompleteCallback();
  }

  return { success: true, messages };
};

/**
 * 执行爬塔（事件驱动版，替代原有for循环）
 */
const executeTowerBattle = async (token, logFn, messages, originalFormation, targetFormation,climbCompleteCallback) => {
  // 1. 初始化爬塔状态
  initClimbContext(token, logFn, messages, originalFormation, targetFormation,climbCompleteCallback);
  logFn(`爬塔初始化完成，最大次数：${MAX_CLIMB_TIMES}，超时保护：${CLIMB_TIMEOUT/1000}秒`, 'info');

  // 2. 发送角色信息和塔信息查询指令，触发reflushRoleInfo事件（进而触发首次爬塔）
  logFn(`发送角色信息查询指令，准备触发首次爬塔`, 'info');
  sendGameCommand(token.id, token.name, 'role_getroleinfo', {});
  sendGameCommand(token.id, token.name, 'tower_getinfo', {});
};

/**
 * 单个Token的爬塔处理（适配useTaskManager）
 */
const executeSingleTokenBusiness = (token) => {
  const messagesRef = ref([]);
  const messages = messagesRef.value;
  const logFn = createSharedLogger(token.name, messages);
  return new Promise(async (resolve, reject) => {
    try {
      // 1. 基础校验：WebSocket连接
      logFn(`开始处理爬塔`, 'info');
      const conRest = await ensureWebSocketConnected(token);
      if (!conRest.success) {
        logFn(`连接失败，终止爬塔`, 'error');
        return resolve({ ...conRest, messages: messagesRef.value });
      }

      // 2. 阵容配置：获取目标阵容和原始阵容
      const savedSettings = getSavedFormationSettings();
      const targetFormation = savedSettings[token.id];
      const { currentUseTeamId, formationOptions } = await getFormationInfo(token.id, token.name);
      const originalFormation = currentUseTeamId;
      const needSwitch = originalFormation !== targetFormation;

      // 3. 切换至目标阵容
      if (needSwitch) {
        await switchToFormationIfNeeded(token.id, token.name, targetFormation, '爬塔阵容', logFn);
        logFn(`已切换至爬塔阵容${targetFormation}，原始阵容${originalFormation}`, 'success');
      } else {
        logFn(`当前阵容${originalFormation}无需切换，直接开始爬塔`, 'success');
      }

      // 4. 设置版本序号
      const res = await tokenStore.sendMessageWithPromise(token.id, "fight_startlevel");
      tokenStore.setBattleVersion(res?.battleData?.version);
      const climbCompleteCallback = () => {
        resolve({ success: true, messages: messagesRef.value });
      };
      // 5. 启动事件驱动爬塔
      await executeTowerBattle(token, logFn, messages, originalFormation, targetFormation,climbCompleteCallback);
    } catch (error) {
      const errorMsg = ` 爬塔处理初始化失败：${error.message}`;
      logFn(errorMsg, 'error');
      // 异常时清理状态
      if (climbContextMap.has(token.id)) {
        await stopClimb(token.id, '初始化失败');
      }
      reject({ success: false, messages: messagesRef.value });
    }
  });
};

// ========== 阵容配置相关方法 ==========
/**
 * 获取保存的阵容配置
 */
const getSavedFormationSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error('读取阵容配置失败:', error);
    return {};
  }
};

/**
 * 保存阵容配置
 */
const saveTokenFormationSettings = () => {
  try {
    const settings = {};
    tokenFormationSettings.value.forEach(item => {
      settings[item.tokenId] = item.formation;
    });
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    window.$message?.success('阵容配置保存成功');
    isSettingModalOpen.value = false;
  } catch (error) {
    console.error('保存阵容配置失败:', error);
    window.$message?.error('阵容配置保存失败');
  }
};

/**
 * 初始化Token阵容配置
 */
const initTokenFormationSettings = async () => {
  console.log('[initTokenFormationSettings] 开始初始化阵容配置');
  const allTokens = tokenStore.gameTokens || [];
  const savedSettings = getSavedFormationSettings();
  tokenFormationSettings.value = [];

  for (const token of allTokens) {
    const result = await ensureWebSocketConnected(token);
    if (!result.success) {
      LogUtil.error(`无法初始化阵容配置: ${token.name}，${JSON.stringify(result)}`);
      continue;
    }
    const { currentUseTeamId, formationOptions } = await getFormationInfo(token.id, token.name);
    const defaultFormation = savedSettings[token.id] || currentUseTeamId;
    tokenFormationSettings.value.push({
      tokenId: token.id,
      tokenName: token.name,
      formation: defaultFormation,
      formationOptions,
      currentUseTeamId
    });
  }
};

/**
 * 恢复默认配置
 */
const initDefaultSettings = () => {
  tokenFormationSettings.value.forEach(item => {
    item.formation = item.currentUseTeamId;
  });
  window.$message?.info('已恢复为游戏当前选中的阵容');
};

/**
 * 打开阵容设置弹窗
 */
const openSettingModal = async () => {
  await initTokenFormationSettings();
  isSettingModalOpen.value = true;
};

/**
 * 获取配置状态文本
 */
const getSettingsStatusText = () => {
  const savedSettings = getSavedFormationSettings();
  const tokenCount = Object.keys(savedSettings).length;
  const totalTokenCount = tokenStore.gameTokens?.length || 0;

  if (totalTokenCount === 0) {
    return '无Token';
  }
  return `已配置${tokenCount}/${totalTokenCount}个Token`;
};

// ========== 任务管理器初始化 ==========
const {
  taskStatus,
  taskStatusStyle,
  taskStatusText,
  executeCount,
  lastExecuteTime,
  nextExecuteTime,
  countdownText,
  logBatches,
  expandedBatchIds,
  startTask: startTowerTask,
  pauseTask,
  resumeTask,
  restartTask,
  clearLogs,
  toggleBatchExpand,
  formatLogMsg,
  intervalMinutes: taskManagerInterval,
  validateInterval
} = useTaskManager({
  taskKey: 'tower',
  taskName: '塔防任务',
  scheduleType: 'cron',
  cronExpression: '43 2,8,14,21 * * *',
  immediate: true,
  executeBusiness: executeSingleTokenBusiness,
});

// 组件间隔配置（同步到任务管理器）
const intervalMinutes = ref(DEFAULT_INTERVAL_MINUTES.toString());

// 同步间隔配置到任务管理器
watch(intervalMinutes, (newVal) => {
  taskManagerInterval.value = newVal;
}, { immediate: true });

/**
 * 验证间隔输入（包装方法）
 */
const validateIntervalWrapper = () => {
  const num = Number(intervalMinutes.value);
  if (isNaN(num) || num < 1) {
    intervalMinutes.value = DEFAULT_INTERVAL_MINUTES.toString();
    window.$message?.warning(`执行间隔不能小于1分钟，已重置为默认${DEFAULT_INTERVAL_MINUTES}分钟`);
  } else {
    intervalMinutes.value = num.toString();
  }
  validateInterval();
};

/**
 * 启动任务（包装方法）
 */
const startTask = () => {
  // 先验证间隔
  validateIntervalWrapper();
  if (isSerialProcessing.value || taskStatus.value === 'running') {
    window.$message?.warning('当前正在执行塔防任务，请勿重复启动');
    return;
  }

  // 包装任务执行，标记串行状态
  isSerialProcessing.value = true;
  const wrapTask = async () => {
    try {
      await startTowerTask(); // 原有启动逻辑
    } catch (error) {
      console.error('塔防任务启动异常:', error);
      window.$message?.error('任务启动失败');
    } finally {
      // 任务结束（无论成功/失败/暂停），重置串行标记
      isSerialProcessing.value = false;
    }
  };

  wrapTask();
};

/**
 * 打开日志弹窗
 */
const openLogModal = () => {
  isLogModalOpen.value = true;
};

// ========== 监听与初始化 ==========
watch(taskStatus, (newStatus, oldStatus) => {
  console.log('任务状态变化:', oldStatus, '→', newStatus);
}, { immediate: true });

onMounted(() => {
  console.log('=== TowerTask 组件挂载 ===');
  tokenFormationSettings.value = [];
});

onUnmounted(() => {
  // 1. 清除所有爬塔状态和定时器
  climbContextMap.forEach((status, tokenId) => {
    if (status.timeoutTimer) clearTimeout(status.timeoutTimer);
    status.isClimbing = false;
    status.isStopped = true;
  });
  climbContextMap.clear();

  // 2. 清空临时缓存
  tokenTowerCache.clear();

  // 3. 移除事件监听
  $emit.off('reflushRoleInfo');
  $emit.off('reflushFightTowerInfo');
  $emit.off('reflushTowerInfo');
});
</script>

<style scoped lang="scss">
// 主样式
.task-card {
  display: flex;
  flex-direction: column;
  gap: 24px;
  background: var(--n-card-color, #ffffff);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid var(--n-border-color, #e5e7eb);

  [data-theme="dark"] & {
    background: var(--n-card-color, #1e293b);
    border: 1px solid var(--n-border-color, #334155);
  }
}

// 头部样式
.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;

  .task-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--n-text-color-primary, #111827);
  }

  .task-config {
    display: flex;
    align-items: center;
    gap: 8px;

    .config-tip {
      font-size: 14px;
      color: var(--n-text-color-secondary, #6b7280);
    }
  }

  .task-formation-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    margin-top: 8px;

    .formation-btn {
      height: 32px;
      padding: 0 12px;
      font-size: 13px;
      flex-shrink: 0;
    }

    .rule-tip {
      margin: 0;
      font-size: 12px;
      padding: 4px 8px;
    }
  }
}

// 操作按钮样式
.task-actions {
  display: flex;
  gap: 12px;
  flex-wrap: nowrap;
  overflow-x: auto;
  padding-bottom: 8px;
  scrollbar-width: thin;
  scrollbar-color: var(--n-scrollbar-color) transparent;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: var(--n-scrollbar-color);
    border-radius: 3px;
  }

  .n-button {
    padding: 8px 16px;
    border-radius: 8px;
    flex-shrink: 0;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
}

// 状态卡片样式
.task-status-card {
  background: var(--n-card-color-hover, #f9fafb);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--n-border-color-light, #d1d5db);

  [data-theme="dark"] & {
    background: var(--n-card-color-hover, #273449);
    border: 1px solid var(--n-border-color-light, #475569);
  }

  .status-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .status-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--n-text-color-primary, #111827);
    }
  }

  .status-content {
    .status-item-group {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }

    .status-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px dashed var(--n-border-color-lighter, #f3f4f6);

      &.highlight {
        .status-value {
          color: var(--n-primary-color);
          font-weight: 600;
        }
      }

      .status-label {
        font-size: 14px;
        color: var(--n-text-color-secondary, #6b7280);
        font-weight: 500;
      }

      .status-value {
        font-size: 14px;
        color: var(--n-text-color-primary, #111827);
        font-weight: 500;
      }
    }
  }
}

// 阵容设置弹窗样式
.setting-modal-content {
  padding: 8px 0;

  .setting-actions {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--n-border-color-lighter);
  }

  .token-settings-list {
    max-height: 400px;
    overflow-y: auto;
    scrollbar-width: thin;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-thumb {
      background-color: var(--n-scrollbar-color);
      border-radius: 3px;
    }
  }

  .token-settings-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 8px;
    border-bottom: 1px solid var(--n-border-color-lighter);

    &:last-child {
      border-bottom: none;
    }

    .token-info {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .token-name {
        font-size: 14px;
        font-weight: 500;
        color: var(--n-text-color-primary);
      }

      .token-current-team {
        font-size: 12px;
        color: var(--n-text-color-secondary);
        font-style: italic;
      }
    }
  }

  .empty-tip {
    text-align: center;
    padding: 40px 0;
    color: var(--n-text-color-secondary);
    font-size: 14px;
  }
}

// 日志弹窗样式
.log-modal-content {
  padding: 8px 0;

  .logs-header {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 16px;

    .clear-log-btn {
      color: var(--n-error-color);

      &:hover {
        background-color: var(--n-error-color-light);
      }
    }
  }

  .logs-list {
    max-height: 600px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--n-scrollbar-color) transparent;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-thumb {
      background-color: var(--n-scrollbar-color);
      border-radius: 3px;
    }
  }

  .batch-log-item {
    margin-bottom: 12px;
    padding: 12px;
    background: var(--n-card-color, #ffffff);
    border-radius: 6px;
    border-left: 3px solid var(--n-border-color, #e5e7eb);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

    [data-theme="dark"] & {
      background: var(--n-card-color, #1e293b);
      border-left: 3px solid var(--n-border-color, #334155);
    }

    &.batch-error {
      border-left-color: var(--n-error-color);
      background-color: rgba(var(--n-error-color-rgb), 0.08);
    }

    .batch-main-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      cursor: pointer;

      .batch-main-message {
        font-size: 14px;
        color: var(--n-text-color-primary, #111827);
        word-break: break-all;
      }

      .expand-icon {
        font-size: 12px;
        color: var(--n-text-color-secondary, #6b7280);
        margin-left: 8px;
      }
    }

    .token-details {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px dashed var(--n-border-color-lighter, #f3f4f6);

      .token-detail-item {
        margin-bottom: 8px;
        padding: 8px;
        background: var(--n-card-color-hover, #f9fafb);
        border-radius: 4px;
        border: 1px solid var(--n-border-color-lighter, #f3f4f6);

        [data-theme="dark"] & {
          background: var(--n-card-color-hover, #273449);
          border: 1px solid var(--n-border-color-lighter, #334155);
        }

        &.token-status-error {
          background-color: rgba(var(--n-error-color-rgb), 0.08);
        }

        .token-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 13px;

          .token-name {
            color: var(--n-text-color-primary, #111827);
            font-weight: 500;
          }

          .token-status-badge {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;

            &.success {
              background-color: var(--n-success-color-light);
              color: var(--n-success-color);
            }

            &.error {
              background-color: var(--n-error-color-light);
              color: var(--n-error-color);
            }
          }
        }

        .token-messages {
          padding-left: 8px;
          border-left: 2px solid var(--n-border-color-lighter, #f3f4f6);

          .token-message-item {
            font-size: 12px;
            color: var(--n-text-color-secondary, #6b7280);
            margin-bottom: 4px;
            word-break: break-all;

            :deep(.keyword-highlight) {
              color: #2563eb !important;
              font-weight: 700 !important;
              background-color: rgba(37, 99, 235, 0.1) !important;
              padding: 0 2px !important;
              border-radius: 2px !important;
            }
          }
        }
      }
    }
  }

  .no-logs-tip {
    text-align: center;
    padding: 40px 0;
    color: var(--n-text-color-secondary);
    font-size: 14px;
  }
}

// 响应式适配
@media (max-width: 768px) {
  .task-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .task-formation-wrap {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .task-actions {
    flex-wrap: wrap;
    overflow-x: visible;
    padding-bottom: 0;
  }

  .status-item-group {
    grid-template-columns: 1fr !important;
  }

  .log-modal-content .logs-list {
    max-height: 400px;
  }
}
</style>