<template>
  <div class="token-import-page">
    <div class="container">
      <!-- 加载中提示 -->
      <div v-if="!isLoaded" style="text-align: center; padding: 40px 0;">
        <n-skeleton width="100%" height="400px" />
        <p style="margin-top: 16px; color: var(--n-text-color-secondary);">加载初始化资源中...</p>
      </div>

      <!-- 主内容 -->
      <template v-else>
        <!-- 自动重连关闭提示（可选） -->
        <n-alert
            v-if="!autoReconnectEnabled && tokenStore.hasTokens"
            type="warning"
            style="margin-bottom: 24px;"
            closable
        >
          ⚠️ 自动重连已关闭。如需后台保持连接，请开启自动重连。
        </n-alert>

        <!-- 账号连接状态区域 -->
        <div class="accounts-connection-section" v-if="tokenStore.hasTokens">
          <div class="section-header">
            <div class="header-left">
              <h2>
                账号连接状态
                <span v-if="tokenStore.gameTokens.length > 0">
                  （{{ connectedCount }} / {{ tokenStore.gameTokens.length }}）
                </span>
              </h2>
              <n-text depth="2" style="margin-left: 8px;">
                自动重连：
                <n-switch
                    v-model:value="autoReconnectEnabled"
                    size="small"
                />
                {{ autoReconnectEnabled ? '开' : '关' }}
              </n-text>
            </div>
            <n-button type="primary" @click="connectAllAccounts" :loading="isConnectingAll">
              <template #icon>
                <n-icon><Link /></n-icon>
              </template>
              快速连接所有账号
            </n-button>
          </div>

          <div class="accounts-grid">
            <n-card
                v-for="token in tokenStore.gameTokens"
                :key="token.id"
                class="account-card"
                :class="{
                'status-connected': getConnectionStatus(token.id) === 'connected',
                'status-disconnected': getConnectionStatus(token.id) === 'disconnected',
                'status-error': getConnectionStatus(token.id) === 'error',
                'status-connecting': getConnectionStatus(token.id) === 'connecting'
              }"
                size="small"
                :bordered="false"
                embedded
            >
              <template #header>
                <n-space size="small" align="center" wrap>
                  <span class="account-name">{{ token.name || '未知角色' }}</span>
                  <n-tag v-if="token.server" type="error" size="small">{{ token.server }}</n-tag>
                  <n-text depth="1" :type="getStatusType(token.id)">
                    {{ getConnectionStatusText(token.id) }}
                  </n-text>
                  <!-- 仅在断开或错误时显示重连按钮 -->
                  <n-button
                      size="tiny"
                      type="info"
                      ghost
                      @click.stop="reconnectSingle(token)"
                      :loading="reconnectingTokens.has(token.id)"
                      v-if="['disconnected', 'error'].includes(getConnectionStatus(token.id))"
                  >
                    重连
                  </n-button>
                </n-space>
              </template>
            </n-card>
          </div>
        </div>

        <!-- 四个任务组件 -->
        <div class="tasks-container">
          <HangupTask />
          <SaltJarTask />
          <DailyTask />
          <TowerTask />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { Link } from '@vicons/ionicons5'

// 组件
import ThemeToggle from '@/components/Common/ThemeToggle.vue'

import HangupTask from '@/components/Quickly/HangupTask.vue'
import SaltJarTask from '@/components/Quickly/SaltJarTask.vue'
import DailyTask from '@/components/Quickly/DailyTask.vue'
import TowerTask from '@/components/Quickly/TowerTask.vue'

// Store & Utils
import { useTokenStore } from '@/stores/tokenStore'
import LogUtil from "@/utils/LogUtil.js"
import { timedTaskManager } from '@/utils/timedTaskManager'

const tokenStore = useTokenStore()
const message = useMessage()

// ===== 状态 =====
const isLoaded = ref(false)
const isConnectingAll = ref(false)
const reconnectingTokens = ref(new Set())
const isReconnectingGlobally = ref(false) // 防重入锁
// ===== 定时任务相关 =====
let reconnectTaskId = `reconnect-all-wc`    // 唯一定时任务 ID
let reconInterval = 60000 * 100     //100分钟

// ===== 自动重连开关（持久化到 localStorage）=====
const autoReconnectEnabled = ref(localStorage.getItem('autoReconnectEnabled') !== 'false')

/**
 *  统一调用 TimedTaskManager（无需判断环境）
 * 01:30, 02:30, 08:30, 11:30, 14:30, 17:30, 21:30, 22:30
 * 各执行一次全局账号链接任务。
 */
const registerAutoReconnectTask = () => {
  timedTaskManager.createTask({
    id: reconnectTaskId,
    fn: () => {
      LogUtil.info(`定时任务执行全局账号重连: ${reconnectTaskId}`)
      if (autoReconnectEnabled.value) {
        connectAllAccounts()
      } else {
        LogUtil.info('自动重连已关闭，跳过本次任务')
      }
    },
    scheduleType: 'cron',
    cronExpression: '30 1,2,8,11,14,17,21,22 * * *',
    immediate: false,
    maxRetry: 0,
    onError: (error) => {
      LogUtil.error(`重连任务执行失败:`, error)
      message.error('自动重连任务执行失败，请查看日志')
    }
  })
}

// 监听变化并保存
watch(autoReconnectEnabled, (val) => {
  localStorage.setItem('autoReconnectEnabled', String(val))
  if(!val){
    timedTaskManager.deleteTask(reconnectTaskId)
    LogUtil.info(`用户关闭定时连接销毁全局重连任务: ${reconnectTaskId}`)
  }else{
    registerAutoReconnectTask()
  }
})



// ========== 生命周期 ==========

onMounted(async () => {
  try {
    await tokenStore.initTokenStore()
    message.success('Token管理服务初始化完成')
    isLoaded.value = true
    if (tokenStore.hasTokens && autoReconnectEnabled.value) {
      registerAutoReconnectTask()
    }
  } catch (error) {
    const errorMsg = `系统初始化失败：${error.message}`
    console.error(errorMsg, error)
    message.error(errorMsg)
  }
})

onUnmounted(() => {
  // 统一销毁任务（无需判断环境）
  timedTaskManager.deleteTask(reconnectTaskId)
  LogUtil.info(`已销毁全局重连任务: ${reconnectTaskId}`)
})


// ========== 计算属性 ==========
const connectedCount = computed(() => {
  return tokenStore.gameTokens.filter(
      (token) => getConnectionStatus(token.id) === 'connected'
  ).length
})

// ========== 工具函数 ==========
const getConnectionStatus = (tokenId) => {
  return tokenStore.getWebSocketStatus(tokenId)
}

const getConnectionStatusText = (tokenId) => {
  const status = getConnectionStatus(tokenId)
  const map = {
    connected: '已连接',
    connecting: '连接中...',
    disconnected: '已断开',
    error: '连接错误',
    disconnecting: '断开中...'
  }
  return map[status] || '未连接'
}

const getStatusType = (tokenId) => {
  const status = getConnectionStatus(tokenId)
  if (status === 'connected') return 'success'
  if (status === 'error') return 'error'
  if (status === 'connecting' || status === 'disconnecting') return 'info'
  return 'warning'
}

// ========== 连接逻辑 ==========
const connectSingle = async (token) => {
  const status = getConnectionStatus(token.id)
  if (status === 'connected' || status === 'connecting') {
    LogUtil.debug(`${token.name} WebSocket 已连接或正在连接，跳过`)
    return true
  }
  await tokenStore.createWebSocketConnection(token.id, token.token, token.wsUrl)
  LogUtil.info(`${token.name} WebSocket 连接完成`)
  return true
}

const connectAllAccounts = async () => {
  if (isReconnectingGlobally.value) {
    LogUtil.debug('全局重连任务已在运行，跳过本次触发')
    return
  }

  isReconnectingGlobally.value = true
  try {
    if (!tokenStore.hasTokens) {
      LogUtil.info('暂无账号可连接')
      return
    }

    LogUtil.info('开始全局账号重连检测...')
    isConnectingAll.value = true
    message.info(`开始检查 ${tokenStore.gameTokens.length} 个账号的连接状态...`)

    const tokens = [...tokenStore.gameTokens]
    for (let i = 0; i < tokens.length; i++) {
      await connectSingle(tokens[i])
      if (i < tokens.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }

    LogUtil.info('全局账号重连检测完成')
    message.success('账号连接状态已同步', { duration: 2000 })
  } catch (err) {
    console.error('全局重连异常:', err)
    message.error('账号重连过程中发生错误，请查看日志')
  } finally {
    isReconnectingGlobally.value = false
    isConnectingAll.value = false
  }
}

const reconnectSingle = async (token) => {
  reconnectingTokens.value.add(token.id)
  try {
    tokenStore.closeWebSocketConnection(token.id)
    await new Promise(r => setTimeout(r, 300))
    await tokenStore.createWebSocketConnection(token.id, token.token, token.wsUrl)
    message.success(`已尝试重连：${token.name}`)
  } catch (err) {
    console.error(`重连失败: ${token.name}`, err)
    message.error(`重连失败：${token.name}`)
  } finally {
    reconnectingTokens.value.delete(token.id)
  }
}
</script>

<style scoped lang="scss">
.token-import-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #747de9 0%, #865ed9 100%);
  padding: 32px 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px);
  background-size: 20px 20px;

  [data-theme='dark'] & {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  }
}

.container {
  max-width: 1400px;
  margin: 24px auto;
  padding: 32px 24px;
  background: var(--n-card-color, #ffffff);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--n-border-color-lighter, #f0f0f0);

  [data-theme='dark'] & {
    background: var(--n-card-color, #1e293b);
    border: 1px solid var(--n-border-color-lighter, #334155);
  }
}

.page-header {
  text-align: center;
  margin-bottom: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 32px 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);

  [data-theme='dark'] & {
    background: linear-gradient(135deg, #0f172a 0%, #1f2937 100%);
  }

  .header-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    color: #ffffff;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  h1 {
    font-size: 32px;
    font-weight: 700;
    margin: 0;
    color: #ffffff;
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  }

  p {
    font-size: 18px;
    margin: 0;
    color: #ffffff;
    opacity: 0.95;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  }
}

/* ===== 账号连接状态区域 ===== */
.accounts-connection-section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  h2 {
    font-size: 20px;
    font-weight: 600;
    color: var(--n-text-color, #333);
    margin: 0;

    [data-theme='dark'] & {
      color: #ffffff;
    }
  }
}

.accounts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.account-card {
  transition: all 0.2s;
  border-radius: 8px !important;
  padding: 8px !important;

  &.status-connected {
    border-left: 4px solid var(--success-color, #10b981);
    background-color: rgba(16, 185, 129, 0.04) !important;
  }

  &.status-connecting {
    border-left: 4px solid var(--primary-color, #3b82f6);
    background-color: rgba(59, 130, 246, 0.04) !important;
  }

  &.status-disconnected {
    border-left: 4px solid var(--n-border-color, #d9d9d9);
    background-color: rgba(156, 163, 175, 0.04) !important;
  }

  &.status-error {
    border-left: 4px solid var(--error-color, #ef4444);
    background-color: rgba(239, 68, 68, 0.04) !important;
  }

  [data-theme='dark'] & {
    &.status-connected { background-color: rgba(16, 185, 129, 0.08) !important; }
    &.status-connecting { background-color: rgba(59, 130, 246, 0.08) !important; }
    &.status-disconnected { background-color: rgba(100, 116, 139, 0.08) !important; }
    &.status-error { background-color: rgba(239, 68, 68, 0.08) !important; }
  }

  :deep(.n-card-header) {
    padding: 0;
  }

  :deep(.n-card__content) {
    display: none;
  }
}

.account-name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

/* 任务容器 */
.tasks-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
}

@media (max-width: 992px) {
  .tasks-container {
    grid-template-columns: 1fr;
  }
  .accounts-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}

@media (max-width: 576px) {
  .token-import-page {
    padding: 16px 0;
  }
  .container {
    padding: 24px 16px;
    margin: 16px auto;
  }
  .page-header {
    margin-bottom: 24px;
    padding: 24px 16px;
  }
  .accounts-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
}
</style>