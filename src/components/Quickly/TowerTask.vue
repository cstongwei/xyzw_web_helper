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
import { useTokenStore } from '@/stores/tokenStore'
import { Pause, Play, PlayCircle, Refresh, DocumentText, Settings } from '@vicons/ionicons5'
import { NIcon, NButton, NBadge, NModal, NTag, NSelect, NInput } from 'naive-ui'
import { useTaskManager } from '@/composables/useTaskManager'
import { ref, computed, watch, onMounted } from 'vue'

// 公共常量
const DEFAULT_INTERVAL_MINUTES = 60 // 默认间隔60分钟
const DELAY_SHORT = 500
const SETTINGS_KEY = 'tower_token_formation_settings'
const MAX_CLIMB_TIMES = 100 // 最大爬塔次数
const CLIMB_TIMEOUT = 60000 // 爬塔超时时间（ms）

// 弹窗控制
const isSettingModalOpen = ref(false)
const isLogModalOpen = ref(false)

// Token存储
const tokenStore = useTokenStore()

// 阵容配置
const tokenFormationSettings = ref([])

// ========== 阵容配置相关方法 ==========
/**
 * 获取保存的阵容配置
 */
const getSavedFormationSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (error) {
    console.error('读取阵容配置失败:', error)
    return {}
  }
}

/**
 * 保存阵容配置
 */
const saveTokenFormationSettings = () => {
  try {
    const settings = {}
    tokenFormationSettings.value.forEach(item => {
      settings[item.tokenId] = item.formation
    })
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    window.$message?.success('阵容配置保存成功')
    isSettingModalOpen.value = false
  } catch (error) {
    console.error('保存阵容配置失败:', error)
    window.$message?.error('阵容配置保存失败')
  }
}

/**
 * 获取单个Token的实际阵容信息
 */
const getTokenFormationInfo = async (tokenId) => {
  try {
    console.log(`[getTokenFormationInfo] 获取Token ${tokenId} 阵容信息`)
    const formationInfo = await tokenStore.sendMessageWithPromise(tokenId, 'presetteam_getinfo', {}, 8000)
    const presetTeamInfo = formationInfo?.presetTeamInfo || {}
    const currentUseTeamId = presetTeamInfo?.useTeamId || 1
    const presetTeams = presetTeamInfo?.presetTeamInfo || {}

    const teamIds = Object.keys(presetTeams).map(Number).filter(id => !isNaN(id)).sort((a, b) => a - b)
    const formationOptions = teamIds.map(teamId => ({
      label: `阵容${teamId}`,
      value: teamId.toString()
    }))

    return {
      currentUseTeamId: currentUseTeamId.toString(),
      formationOptions
    }
  } catch (error) {
    console.error(`[getTokenFormationInfo] Token ${tokenId} 获取失败:`, error)
    return {
      currentUseTeamId: '1',
      formationOptions: [{ label: '阵容1', value: '1' }]
    }
  }
}

/**
 * 初始化Token阵容配置
 */
const initTokenFormationSettings = async () => {
  console.log('[initTokenFormationSettings] 开始初始化阵容配置')
  const allTokens = tokenStore.gameTokens || []
  const savedSettings = getSavedFormationSettings()

  tokenFormationSettings.value = []
  for (const token of allTokens) {
    const { currentUseTeamId, formationOptions } = await getTokenFormationInfo(token.id)
    const defaultFormation = savedSettings[token.id] || currentUseTeamId

    tokenFormationSettings.value.push({
      tokenId: token.id,
      tokenName: token.name,
      formation: defaultFormation,
      formationOptions,
      currentUseTeamId
    })
  }
}

/**
 * 恢复默认配置
 */
const initDefaultSettings = () => {
  tokenFormationSettings.value.forEach(item => {
    item.formation = item.currentUseTeamId
  })
  window.$message?.info('已恢复为游戏当前选中的阵容')
}

/**
 * 打开阵容设置弹窗
 */
const openSettingModal = async () => {
  await initTokenFormationSettings()
  isSettingModalOpen.value = true
}

/**
 * 获取配置状态文本
 */
const getSettingsStatusText = () => {
  const savedSettings = getSavedFormationSettings()
  const tokenCount = Object.keys(savedSettings).length
  const totalTokenCount = tokenStore.gameTokens?.length || 0

  if (totalTokenCount === 0) {
    return '无Token'
  }
  return `已配置${tokenCount}/${totalTokenCount}个Token`
}

// ========== 爬塔核心逻辑 ==========
/**
 * 获取塔信息
 */
const getTowerInfo = async (tokenId, messages = []) => {
  try {
    messages.push(`[${new Date().toLocaleString()}] 开始获取Token塔信息`)
    const wsStatus = tokenStore.getWebSocketStatus(tokenId)
    messages.push(`[${new Date().toLocaleString()}] WebSocket连接状态：${wsStatus}`)

    if (wsStatus !== 'connected') {
      messages.push(`[${new Date().toLocaleString()}] WebSocket未连接，跳过塔信息获取`)
      return
    }

    // 刷新角色信息（包含塔数据）
    messages.push(`[${new Date().toLocaleString()}] 发送角色信息刷新指令`)
    await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 5000)

    // 获取塔信息
    messages.push(`[${new Date().toLocaleString()}] 发送塔信息获取指令`)
    await tokenStore.sendMessageWithPromise(tokenId, 'tower_getinfo', {}, 5000)
    messages.push(`[${new Date().toLocaleString()}] 塔信息获取成功`)
  } catch (error) {
    messages.push(`[${new Date().toLocaleString()}] 获取塔信息失败：${error.message}`)
    console.error(`[getTowerInfo] Token ${tokenId} 获取失败:`, error)
  }
}

/**
 * 获取Token当前体力
 */
const getTokenTowerEnergy = (tokenId, messages = []) => {
  try {
    messages.push(`[${new Date().toLocaleString()}] 开始获取Token体力值`)
    const roleInfo = tokenStore.gameData?.[tokenId]?.roleInfo || tokenStore.gameData?.roleInfo
    const tower = roleInfo?.role?.tower || {}
    const energy = tower.energy || 0
    messages.push(`[${new Date().toLocaleString()}] 成功获取体力值：${energy}`)
    return energy
  } catch (error) {
    messages.push(`[${new Date().toLocaleString()}] 获取体力值失败：${error.message}`)
    console.error(`[getTokenTowerEnergy] Token ${tokenId} 获取失败:`, error)
    return 0
  }
}

/**
 * 执行爬塔战斗
 */
const executeTowerBattle = async (tokenId, tokenName, messages) => {
  let stopFlag = false
  let climbTimeout = null
  let climbCount = 0

  messages.push(`[${new Date().toLocaleString()}] 开始批量爬塔（最大次数：${MAX_CLIMB_TIMES}次，超时保护：${CLIMB_TIMEOUT/1000}秒）`)

  try {
    // 超时保护
    climbTimeout = setTimeout(() => {
      stopFlag = true
      messages.push(`[${new Date().toLocaleString()}] 爬塔超时，强制终止`)
    }, CLIMB_TIMEOUT)

    // 批量爬塔循环
    for (let i = 0; i < MAX_CLIMB_TIMES; i++) {
      if (stopFlag) {
        messages.push(`[${new Date().toLocaleString()}] 检测到停止标记，终止爬塔循环`)
        break
      }

      messages.push(`[${new Date().toLocaleString()}] 开始第${i+1}次爬塔尝试`)

      // 刷新塔信息
      await getTowerInfo(tokenId, messages)

      // 检查体力
      const energy = getTokenTowerEnergy(tokenId, messages)
      if (energy <= 0) {
        messages.push(`[${new Date().toLocaleString()}] 体力耗尽（剩余：${energy}），终止爬塔`)
        break
      }

      // 执行爬塔
      messages.push(`[${new Date().toLocaleString()}] 第${i+1}次爬塔：体力剩余${energy}，发送爬塔指令`)
      await tokenStore.sendMessageWithPromise(tokenId, 'fight_starttower', {}, 10000)
      climbCount++
      messages.push(`[${new Date().toLocaleString()}] 第${climbCount}次爬塔指令发送成功`)

      // 达到最大次数
      if (i === MAX_CLIMB_TIMES - 1) {
        messages.push(`[${new Date().toLocaleString()}] 达到最大爬塔次数（${MAX_CLIMB_TIMES}次），终止循环`)
        break
      }

      // 间隔2秒
      await new Promise(res => setTimeout(res, 2000))
    }

    messages.push(`[${new Date().toLocaleString()}] 批量爬塔完成，实际执行：${climbCount}次，剩余体力：${getTokenTowerEnergy(tokenId)}`)
  } catch (error) {
    const errorMsg = `[${new Date().toLocaleString()}] 批量爬塔失败：${error.message || '未知错误'}`
    messages.push(errorMsg)
    throw new Error(errorMsg)
  } finally {
    if (climbTimeout) clearTimeout(climbTimeout)
    messages.push(`[${new Date().toLocaleString()}] 爬塔流程结束，共执行${climbCount}次`)
  }
}

/**
 * 单个Token的爬塔处理（适配useTaskManager）
 */
const executeSingleTokenBusiness = async (token) => {
  const messages = []
  try {
    // 1. 基础信息
    messages.push(`[${new Date().toLocaleString()}] 开始处理Token：${token.name}（ID：${token.id}）`)

    // 2. 获取原始阵容
    messages.push(`[${new Date().toLocaleString()}] 开始获取原始阵容信息`)
    const { currentUseTeamId } = await getTokenFormationInfo(token.id)
    const originalFormation = currentUseTeamId
    messages.push(`[${new Date().toLocaleString()}] 原始阵容：${originalFormation}号`)

    // 3. 获取目标阵容
    const savedSettings = getSavedFormationSettings()
    const targetFormation = savedSettings[token.id] || originalFormation
    messages.push(`[${new Date().toLocaleString()}] 目标阵容：${targetFormation}号（${savedSettings[token.id] ? '自定义配置' : '游戏当前阵容'}）`)

    // 4. 切换阵容
    if (targetFormation !== originalFormation) {
      messages.push(`[${new Date().toLocaleString()}] 切换到爬塔阵容：${targetFormation}号`)
      await tokenStore.sendMessageWithPromise(token.id, 'presetteam_saveteam', { teamId: targetFormation }, 8000)
      await new Promise(resolve => setTimeout(resolve, DELAY_SHORT))
      messages.push(`[${new Date().toLocaleString()}] 阵容切换完成`)
    } else {
      messages.push(`[${new Date().toLocaleString()}] 原始阵容已为目标阵容，无需切换`)
    }

    // 5. 爬塔核心逻辑
    messages.push(`[${new Date().toLocaleString()}] 开始爬塔流程，检查体力`)
    const energy = getTokenTowerEnergy(token.id, messages)
    if (energy <= 0) {
      messages.push(`[${new Date().toLocaleString()}] 体力耗尽（剩余：${energy}），终止爬塔`)
    } else {
      messages.push(`[${new Date().toLocaleString()}] 体力充足（剩余：${energy}），开始执行爬塔`)
      await executeTowerBattle(token.id, token.name, messages)
    }

    // 6. 还原阵容
    if (targetFormation !== originalFormation) {
      messages.push(`[${new Date().toLocaleString()}] 开始还原原始阵容：${originalFormation}号`)
      try {
        await tokenStore.sendMessageWithPromise(token.id, 'presetteam_saveteam', { teamId: originalFormation }, 8000)
        messages.push(`[${new Date().toLocaleString()}] 原始阵容还原成功`)
      } catch (restoreError) {
        messages.push(`[${new Date().toLocaleString()}] 还原原始阵容失败：${restoreError.message}`)
      }
    }

    messages.push(`[${new Date().toLocaleString()}] Token ${token.name} 爬塔流程完成`)
    return { success: true, messages }
  } catch (error) {
    const errorMsg = `[${new Date().toLocaleString()}] Token ${token.name} 爬塔处理失败：${error.message}`
    messages.push(errorMsg)
    return { success: false, messages }
  }
}

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
  executeBusiness: executeSingleTokenBusiness,
})

// 组件间隔配置（同步到任务管理器）
const intervalMinutes = ref(DEFAULT_INTERVAL_MINUTES.toString())

// 同步间隔配置到任务管理器
watch(intervalMinutes, (newVal) => {
  taskManagerInterval.value = newVal
}, { immediate: true })

/**
 * 验证间隔输入（包装方法）
 */
const validateIntervalWrapper = () => {
  const num = Number(intervalMinutes.value)
  if (isNaN(num) || num < 1) {
    intervalMinutes.value = DEFAULT_INTERVAL_MINUTES.toString()
    window.$message?.warning(`执行间隔不能小于1分钟，已重置为默认${DEFAULT_INTERVAL_MINUTES}分钟`)
  } else {
    intervalMinutes.value = num.toString()
  }
  // 触发任务管理器的间隔验证
  validateInterval()
}

/**
 * 启动任务（包装方法）
 */
const startTask = () => {
  // 先验证间隔
  validateIntervalWrapper()
  // 启动任务
  startTowerTask()
}

/**
 * 打开日志弹窗
 */
const openLogModal = () => {
  isLogModalOpen.value = true
}

// ========== 监听与初始化 ==========
watch(taskStatus, (newStatus, oldStatus) => {
  console.log('任务状态变化:', oldStatus, '→', newStatus)
}, { immediate: true })

onMounted(() => {
  console.log('=== TowerTask 组件挂载 ===')
  tokenFormationSettings.value = []
})
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