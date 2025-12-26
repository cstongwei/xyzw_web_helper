<template>
  <div class="task-card">
    <!-- 组件头部 -->
    <div class="task-header">
      <h2>每日任务自动执行</h2>
      <div class="task-config">
        <n-time-picker
            v-model:value="dailyExecuteTimeValue"
            format="HH:mm"
            placeholder="选择每日执行时间"
            style="width: 120px; margin-right: 10px;"
        />
        <span class="config-tip">默认：08:05</span>
        <n-checkbox
            v-model:checked="getCurrentAccountConfig().shouldExecuteNow"
            :disabled="taskStatus === 'running'"
            class="execute-now-checkbox"
        >
          启动后立即执行
        </n-checkbox>
        <n-button
            size="small"
            type="primary"
            quaternary
            @click="openSettingsModal"
            class="settings-gear"
            title="任务设置"
        >
          <template #icon><n-icon><Settings /></n-icon></template>
        </n-button>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="task-actions">
      <n-button type="primary" @click="startTask" :disabled="taskStatus === 'running'">
        <template #icon><n-icon><Play /></n-icon></template>
        启动任务
      </n-button>
      <n-button type="warning" @click="pauseTaskWrapper" :disabled="taskStatus !== 'running'">
        <template #icon><n-icon><Pause /></n-icon></template>
        暂停任务
      </n-button>
      <n-button type="success" @click="resumeTaskWrapper" :disabled="taskStatus !== 'paused'">
        <template #icon><n-icon><PlayCircle /></n-icon></template>
        恢复任务
      </n-button>
      <n-button type="info" @click="restartTask(true)">
        <template #icon><n-icon><Refresh /></n-icon></template>
        重启任务
      </n-button>
      <!-- 查看日志按钮 -->
      <n-button type="secondary" @click="openLogModal" :disabled="!logBatches.length">
        <template #icon><n-icon><DocumentText /></n-icon></template>
        查看执行日志
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
            <span class="status-value">{{ nextExecuteTimeDisplay || '计算中...' }}</span>
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

    <!-- 任务设置弹窗 -->
    <n-modal v-model:show="isSettingsModalOpen" preset="card" title="每日任务设置" style="width: 600px">
      <template #header>
        <div class="modal-header">
          <n-icon>
            <Settings />
          </n-icon>
          <span>每日任务设置</span>
        </div>
      </template>

      <div class="settings-content">
        <!-- 账号选择区域 -->
        <div class="account-selector-section">
          <div class="section-title">选择要配置的账号：</div>
          <div class="account-selector">
            <n-select
                v-model:value="selectedTokenId"
                :options="tokenOptions"
                placeholder="请选择要配置的账号"
                style="width: 280px"
                @update:value="onAccountChange"
            />
          </div>
        </div>

        <!-- 设置内容区域 -->
        <div class="settings-form" v-if="selectedTokenId">
          <div class="settings-grid">
            <!-- 竞技场设置 -->
            <div class="setting-item">
              <label class="setting-label">竞技场阵容</label>
              <n-select
                  v-model:value="getCurrentAccountConfig().arenaFormation"
                  :options="formationOptions"
                  size="small"
                  placeholder="选择竞技场阵容"
              />
            </div>

            <!-- BOSS设置 -->
            <div class="setting-item">
              <label class="setting-label">BOSS阵容</label>
              <n-select
                  v-model:value="getCurrentAccountConfig().bossFormation"
                  :options="formationOptions"
                  size="small"
                  placeholder="选择BOSS阵容"
              />
            </div>

            <!-- BOSS次数 -->
            <div class="setting-item">
              <label class="setting-label">BOSS次数</label>
              <n-select
                  v-model:value="getCurrentAccountConfig().bossTimes"
                  :options="bossTimesOptions"
                  size="small"
                  placeholder="选择BOSS次数"
              />
            </div>

            <!-- 功能开关 -->
            <div class="setting-switches">
              <div class="switch-row">
                <span class="switch-label">领罐子</span>
                <n-switch v-model:value="getCurrentAccountConfig().claimBottle" />
              </div>

              <div class="switch-row">
                <span class="switch-label">领挂机</span>
                <n-switch v-model:value="getCurrentAccountConfig().claimHangUp" />
              </div>

              <div class="switch-row">
                <span class="switch-label">竞技场</span>
                <n-switch v-model:value="getCurrentAccountConfig().arenaEnable" />
              </div>

              <div class="switch-row">
                <span class="switch-label">开宝箱</span>
                <n-switch v-model:value="getCurrentAccountConfig().openBox" />
              </div>

              <div class="switch-row">
                <span class="switch-label">领取邮件奖励</span>
                <n-switch v-model:value="getCurrentAccountConfig().claimEmail" />
              </div>

              <div class="switch-row">
                <span class="switch-label">黑市购买物品</span>
                <n-switch v-model:value="getCurrentAccountConfig().blackMarketPurchase" />
              </div>

              <div class="switch-row">
                <span class="switch-label">付费招募</span>
                <n-switch v-model:value="getCurrentAccountConfig().payRecruit" />
              </div>
            </div>
          </div>

          <!-- 保存按钮 -->
          <div class="settings-actions">
            <n-button
                size="small"
                type="primary"
                @click="saveCurrentAccountSettings"
            >
              保存设置
            </n-button>
            <n-button
                size="small"
                @click="loadCurrentAccountSettings"
            >
              重新加载
            </n-button>
            <n-button
                size="small"
                type="info"
                @click="copySettingsToAllAccounts"
            >
              应用到所有账号
            </n-button>
          </div>
        </div>

        <!-- 未选择账号时的提示 -->
        <div class="no-account-selected" v-else>
          <n-empty description="请先选择一个账号进行设置" size="small">
            <template #icon>
              <n-icon>
                <Settings />
              </n-icon>
            </template>
          </n-empty>
        </div>
      </div>
    </n-modal>

    <!-- 日志弹窗 -->
    <n-modal
        v-model:show="isLogModalOpen"
        preset="card"
        title="执行日志（最近50批次）"
        size="large"
        :style="{ width: 'calc(100vw * 0.6)', maxWidth: '800px' }"
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
              :class="{ 'batch-error': batch.type === 'error' }"
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
                  :class="`token-status-${token.status}`"
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useTokenStore } from '@/stores/tokenStore'
import { Pause, Play, PlayCircle, Refresh, DocumentText, Settings } from '@vicons/ionicons5'
import { NIcon, NButton, NBadge, NTimePicker, NModal, NCheckbox, NSelect, NSwitch, useMessage, NEmpty } from 'naive-ui'
import { useTaskManager } from '@/composables/useTaskManager'
import useDailyTaskExecutor from '@/composables/useDailyTaskExecutor'

const tokenStore = useTokenStore()
const message = useMessage()
const {
  getDefaultConfig,
  loadTokenSettings,
  saveTokenSettings,
  executeDailyBusiness,
} = useDailyTaskExecutor()

// 弹窗控制
const isSettingsModalOpen = ref(false)
const isLogModalOpen = ref(false)
const openSettingsModal = () => {
  isSettingsModalOpen.value = true
  loadFormationOptions()
}
const openLogModal = () => {
  isLogModalOpen.value = true
}


// 账号选择
const selectedTokenId = ref(null)
const tokenOptions = computed(() => {
  return tokenStore.gameTokens.map(token => ({
    label: token.name || `账号${token.id}`,
    value: token.id
  }))
})

// 初始化选中账号
const initSelectedToken = () => {
  if (tokenStore.gameTokens.length > 0) {
    selectedTokenId.value = tokenStore.gameTokens[0].id
  }
}

// 账号切换
const onAccountChange = (tokenId) => {
  selectedTokenId.value = tokenId
  // 重新加载该账号的设置
  loadCurrentAccountSettings()
}

// 获取当前选中的Token
const getCurrentSelectedToken = () => {
  return tokenStore.gameTokens.find(token => token.id === selectedTokenId.value)
}

const getCurrentSelectedTokenName = () => {
  const token = getCurrentSelectedToken()
  return token ? token.name : '未知账号'
}

// 每个账号的独立配置存储
const accountConfigs = ref({})


// 获取当前账号的配置
const getCurrentAccountConfig = () => {
  if (!selectedTokenId.value) {
    return getDefaultConfig()
  }

  if (!accountConfigs.value[selectedTokenId.value]) {
    // 加载保存的配置或使用默认配置
    const saved = loadTokenSettings(selectedTokenId.value)
    accountConfigs.value[selectedTokenId.value] = saved || getDefaultConfig()
  }

  return accountConfigs.value[selectedTokenId.value]
}

// 时间选择器绑定值（使用时间戳）
const dailyExecuteTimeValue = ref(new Date(new Date().setHours(8, 5, 0, 0)).getTime())

// 监听时间选择器变化（时间戳 -> Date对象）
watch(dailyExecuteTimeValue, (newVal) => {
  if (selectedTokenId.value && typeof newVal === 'number') {
    const date = new Date(newVal)
    const config = getCurrentAccountConfig()
    config.dailyExecuteTime = date
    saveTokenSettings(selectedTokenId.value, config)
    updateNextExecuteTimeDisplay()
  }
})

// 阵容选项
const formationOptions = ref([])
const bossTimesOptions = ref([0, 1, 2, 3, 4].map(v => ({ label: `${v}次`, value: v })))

// 加载阵容选项
const loadFormationOptions = async () => {
  const token = getCurrentSelectedToken()
  if (!token) {
    formationOptions.value = [1, 2, 3, 4].map(v => ({ label: `阵容${v}`, value: v }))
    return
  }

  try {
    const formationInfo = await tokenStore.sendMessageWithPromise(
        token.id,
        'presetteam_getinfo',
        {},
        8000
    )
    const presetTeamInfo = formationInfo?.presetTeamInfo || {}
    const presetTeams = presetTeamInfo?.presetTeams || presetTeamInfo

    const teamIds = Object.keys(presetTeams).map(Number).filter(id => !isNaN(id)).sort((a, b) => a - b)
    formationOptions.value = teamIds.map(teamId => ({
      label: `阵容${teamId}`,
      value: teamId
    }))

    if (formationOptions.value.length === 0) {
      formationOptions.value = [1, 2, 3, 4].map(v => ({ label: `阵容${v}`, value: v }))
    }
  } catch (error) {
    console.error('加载阵容选项失败:', error)
    formationOptions.value = [1, 2, 3, 4].map(v => ({ label: `阵容${v}`, value: v }))
  }
}

// 保存当前账号设置
const saveCurrentAccountSettings = () => {
  const token = getCurrentSelectedToken()
  if (!token) {
    message.warning('请先选择一个账号')
    return
  }

  const config = getCurrentAccountConfig()
  saveTokenSettings(token.id, config)
  message.success('设置保存成功')
}

// 加载当前账号设置
const loadCurrentAccountSettings = () => {
  const token = getCurrentSelectedToken()
  if (!token) {
    message.warning('请先选择一个账号')
    return
  }

  const saved = loadTokenSettings(token.id)
  if (saved) {
    accountConfigs.value[token.id] = { ...getDefaultConfig(), ...saved }
    // 更新时间选择器（Date对象 -> 时间戳）
    if (saved.dailyExecuteTime instanceof Date) {
      dailyExecuteTimeValue.value = saved.dailyExecuteTime.getTime()
    } else if (typeof saved.dailyExecuteTime === 'string') {
      // 解析字符串格式的时间
      const [hours, minutes] = saved.dailyExecuteTime.split(':').map(Number)
      const newDate = new Date()
      newDate.setHours(hours, minutes, 0, 0)
      dailyExecuteTimeValue.value = newDate.getTime()
    }
    message.success('设置加载成功')
  } else {
    accountConfigs.value[token.id] = getDefaultConfig()
    dailyExecuteTimeValue.value = new Date(new Date().setHours(8, 5, 0, 0)).getTime()
    message.info('使用默认设置')
  }
}

// 复制设置到所有账号
const copySettingsToAllAccounts = () => {
  const currentConfig = getCurrentAccountConfig()
  const token = getCurrentSelectedToken()

  if (!token) return

  tokenStore.gameTokens.forEach(t => {
    saveTokenSettings(t.id, { ...currentConfig })
  })

  message.success('设置已应用到所有账号')
}

// 获取设置状态文本
const getSettingsStatusText = () => {
  if (!selectedTokenId.value) {
    return '未选择账号'
  }
  return '配置已就绪'
}


// 计算下次执行时间（真正的每日执行）
const getNextDailyExecuteTime = () => {
  const config = getCurrentAccountConfig()
  const time = config.dailyExecuteTime

  // 确保time是Date对象
  let hours, minutes
  if (time instanceof Date) {
    hours = time.getHours()
    minutes = time.getMinutes()
  } else {
    // 默认使用08:05
    hours = 8
    minutes = 5
  }

  const now = new Date()
  const next = new Date(now)
  next.setHours(hours, minutes, 0, 0)

  // 如果今天的时间已过，设置为明天
  if (next <= now) {
    next.setDate(next.getDate() + 1)
  }

  return next.getTime() // 返回时间戳
}

// 更新下次执行时间显示
const nextExecuteTimeDisplay = ref('')
const updateNextExecuteTimeDisplay = () => {
  const nextTime = new Date(getNextDailyExecuteTime())
  nextExecuteTimeDisplay.value = nextTime.toLocaleString()
}

// 注入任务管理器
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
  startTask: startDailyTask,
  pauseTask,
  resumeTask,
  restartTask,
  clearLogs,
  toggleBatchExpand,
  formatLogMsg,
  validateInterval,
} = useTaskManager({
  taskKey: 'daily-timed-task',
  taskName: '每日任务',
  scheduleType: 'cron',
  cronExpression: '37 1,11,17,22 * * *',
  immediate: true,
  executeBusiness: executeDailyBusiness,
  getNextExecuteTime: getNextDailyExecuteTime
})

// 立即执行所有 Token 的任务
// const executeAllTokensNow = async () => {
//   if (!tokenStore.hasTokens) {
//     message.warning('暂无账号可执行任务')
//     return
//   }
//
//   const batchId = Date.now()
//   const batchLog = {
//     batchId,
//     mainMessage: `[${new Date().toLocaleString()}] 手动立即执行每日任务 - 共${tokenStore.gameTokens.length}个账号`,
//     tokenDetails: [],
//     type: 'info'
//   }
//
//   for (let i = 0; i < tokenStore.gameTokens.length; i++) {
//     const token = tokenStore.gameTokens[i];
//     selectedTokenId.value = token.id;
//     const result = await executeDailyBusiness(token);
//     batchLog.tokenDetails.push({
//       tokenId: token.id,
//       tokenName: token.name || '未知角色',
//       status: result.success ? 'success' : 'error',
//       messages: result.messages
//     });
//
//     // 如果不是最后一个 token，则等待 10 秒
//     if (i < tokenStore.gameTokens.length - 1) {
//       await new Promise(resolve => setTimeout(resolve, 10000));
//     }
//   }
//
//   logBatches.value.push(batchLog)
//   executeCount.value++
//   lastExecuteTime.value = new Date().toLocaleString()
// }
const startTask = async () => {
  // 启动任务管理器
  startDailyTask(true)
  updateNextExecuteTimeDisplay()

  // 启动倒计时更新
  startCountdownUpdate()
}

// 倒计时更新逻辑
let countdownInterval = null
const startCountdownUpdate = () => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }

  countdownInterval = setInterval(() => {
    if (taskStatus.value === 'running') {
      updateNextExecuteTimeDisplay()

      // 计算倒计时
      const now = new Date()
      const nextTime = new Date(getNextDailyExecuteTime())
      const diff = nextTime - now

      if (diff <= 0) {
        countdownText.value = '00:00:00'
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0')
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0')
        const seconds = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0')
        countdownText.value = `${hours}:${minutes}:${seconds}`
      }
    }
  }, 1000)
}

// 暂停任务时停止倒计时
const pauseTaskWrapper = () => {
  pauseTask()
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
}

// 恢复任务时重启倒计时
const resumeTaskWrapper = () => {
  resumeTask()
  startCountdownUpdate()
}

// 生命周期
onMounted(() => {
  initSelectedToken()
  loadFormationOptions()

  // 初始化所有账号的配置
  tokenStore.gameTokens.forEach(token => {
    if (!accountConfigs.value[token.id]) {
      const saved = loadTokenSettings(token.id)
      accountConfigs.value[token.id] = saved || getDefaultConfig()
    }
  })

  // 设置初始时间值（Date对象 -> 时间戳）
  const config = getCurrentAccountConfig()
  if (config.dailyExecuteTime instanceof Date) {
    dailyExecuteTimeValue.value = config.dailyExecuteTime.getTime()
  } else {
    dailyExecuteTimeValue.value = new Date(new Date().setHours(8, 5, 0, 0)).getTime()
  }

  // 初始计算下次执行时间
  updateNextExecuteTimeDisplay()
})

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})
</script>

<style scoped>
.task-card {
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  padding: 16px;
  margin-bottom: 16px;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.task-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
}

.task-config {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-tip {
  font-size: 12px;
  color: var(--text-color-secondary);
}

.execute-now-checkbox {
  margin: 0 8px;
}

.settings-gear {
  margin-left: 4px;
}

.task-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

/* 修改后的任务状态卡片样式 */
.task-status-card {
  background: var(--card-bg-secondary);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--border-light);
}

.task-status-card .status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.task-status-card .status-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.task-status-card .status-content {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.task-status-card .status-item-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.task-status-card .status-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px dashed var(--border-lighter);
}

.task-status-card .status-item.highlight .status-value {
  color: var(--primary-color);
  font-weight: 600;
}

.task-status-card .status-label {
  font-size: 14px;
  color: var(--text-color-secondary);
  font-weight: 500;
}

.task-status-card .status-value {
  font-size: 14px;
  color: var(--text-color);
  font-weight: 500;
}

/* 设置弹窗样式 */
.settings-content {
  max-height: 70vh;
  overflow-y: auto;
}

.account-selector-section {
  margin-bottom: 20px;
  padding: 16px;
  background-color: var(--card-bg-secondary);
  border-radius: 6px;
  border: 1px solid var(--border-light);
}

.section-title {
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 12px;
  font-size: 14px;
}

.account-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-form {
  padding: 0 4px;
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.setting-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.setting-switches {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 8px;
}

.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-light);
}

.switch-row:last-child {
  border-bottom: none;
}

.switch-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.settings-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.no-account-selected {
  padding: 40px 20px;
  text-align: center;
}

/* 日志弹窗样式 */
.log-modal-content {
  max-height: 70vh;
  overflow-y: auto;
}

.logs-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.clear-log-btn {
  font-size: 12px;
}

.logs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.batch-log-item {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
}

.batch-log-item.batch-error {
  border-color: var(--error-color);
}

.batch-main-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: var(--bg-color-secondary);
  transition: background-color 0.2s;
}

.batch-main-row:hover {
  background-color: var(--bg-color-hover);
}

.batch-main-row.expanded {
  border-bottom: 1px solid var(--border-color);
}

.batch-main-message {
  font-weight: 500;
  font-size: 13px;
  color: var(--text-color);
}

.expand-icon {
  font-size: 12px;
  color: var(--text-color-secondary);
  width: 16px;
  text-align: center;
}

.token-details {
  background-color: var(--bg-color);
}

.token-detail-item {
  border-bottom: 1px solid var(--border-light);
}

.token-detail-item:last-child {
  border-bottom: none;
}

.token-detail-item.token-status-success {
  border-left: 3px solid var(--success-color);
}

.token-detail-item.token-status-error {
  border-left: 3px solid var(--error-color);
}

.token-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background-color: var(--bg-color-tertiary);
  font-size: 12px;
}

.token-name {
  font-weight: 500;
  color: var(--text-color);
}

.token-status-badge {
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
}

.token-status-badge.success {
  background-color: var(--success-color-light);
  color: var(--success-color);
}

.token-status-badge.error {
  background-color: var(--error-color-light);
  color: var(--error-color);
}

.token-messages {
  padding: 6px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.token-message-item {
  font-family: monospace;
  font-size: 11px;
  line-height: 1.4;
  color: var(--text-color-secondary);
  word-break: break-word;
}

.no-logs-tip {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-color-secondary);
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .task-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .task-config {
    flex-wrap: wrap;
  }

  .task-actions {
    justify-content: center;
  }

  .task-status-card .status-item-group {
    grid-template-columns: 1fr;
  }

  .setting-switches {
    grid-template-columns: 1fr;
  }

  .settings-actions {
    flex-direction: column;
  }

  .account-selector {
    gap: 8px;
  }
}
</style>