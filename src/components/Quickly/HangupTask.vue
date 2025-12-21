<template>
  <div class="task-card">
    <!-- 组件头部 -->
    <div class="task-header">
      <h2>挂机收益+加钟任务</h2>
      <div class="task-config">
        <n-input
            v-model:value="intervalMinutes"
            type="number"
            placeholder="输入执行间隔（分钟）"
            :min="1"
            style="width: 180px; margin-right: 10px;"
            @input="validateInterval"
        />
        <span class="config-tip">默认：{{ DEFAULT_INTERVAL_MINUTES }} 分钟</span>
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
      <!-- 新增：查看日志按钮 -->
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
        </div>
      </div>
    </div>

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
import { useTokenStore } from '@/stores/tokenStore'
import { Pause, Play, PlayCircle, Refresh, DocumentText } from '@vicons/ionicons5'
import { NIcon, NButton, NBadge, NInput, NModal } from 'naive-ui'
import { useTaskManager } from '@/composables/useTaskManager'
import { ref } from 'vue'

// 新增：控制日志弹窗显示
const isLogModalOpen = ref(false)
const openLogModal = () => {
  isLogModalOpen.value = true
}

// ========== 子组件差异化配置 & 业务逻辑 ==========
const tokenStore = useTokenStore()
const DELAY_SHORT = 300 // 业务延迟（ms）
const ADD_TIME_COUNT = 4 // 加钟执行次数

/**
 * 子组件提供的差异化业务逻辑：挂机+加钟指令发送
 */
const executeHangupBusiness = async (token) => {
  const messages = []
  try {
    // 领取挂机奖励
    messages.push(`[${new Date().toLocaleString()}] 为 ${token.name} 执行${'领取挂机'}操作...`)
    const claimSuccess = tokenStore.sendMessage(token.id, 'system_claimhangupreward')
    if (!claimSuccess) throw new Error(`${token.name} 领取挂机奖励指令发送失败`)
    messages.push(`[${new Date().toLocaleString()}] ${token.name} ${'领取挂机'}操作成功`)

    await new Promise(resolve => setTimeout(resolve, DELAY_SHORT))

    // 执行加钟操作
    messages.push(`[${new Date().toLocaleString()}] 为 ${token.name} 执行${'加钟'}操作（共${ADD_TIME_COUNT}次）...`)
    const addTimeTasks = []
    for (let i = 0; i < ADD_TIME_COUNT; i++) {
      addTimeTasks.push(new Promise((resolve) => {
        setTimeout(() => {
          const addSuccess = tokenStore.sendMessage(
              token.id,
              'system_mysharecallback',
              { isSkipShareCard: true, type: 2 }
          )
          if (addSuccess) {
            messages.push(`[${new Date().toLocaleString()}] ${token.name} ${'加钟'}操作第 ${i+1} 次执行成功`)
          } else {
            messages.push(`[${new Date().toLocaleString()}] ${token.name} ${'加钟'}操作第 ${i+1} 次执行失败`)
          }
          resolve()
        }, i * DELAY_SHORT)
      }))
    }
    await Promise.all(addTimeTasks)

    // 最终刷新状态
    messages.push(`[${new Date().toLocaleString()}] 为 ${token.name} 执行最终状态刷新...`)
    tokenStore.sendMessage(token.id, 'role_getroleinfo')
    messages.push(`[${new Date().toLocaleString()}] ${token.name} 挂机+加钟任务处理完成`)

    return { success: true, messages }
  } catch (error) {
    const errorMsg = `[${new Date().toLocaleString()}] ${token.name} 挂机+加钟任务处理失败: ${error.message}`
    messages.push(errorMsg)
    return { success: false, messages }
  }
}

// ========== 注入公共任务管理能力 ==========
const {
  // 配置
  intervalMinutes,
  DEFAULT_INTERVAL_MINUTES,
  // 状态
  taskStatus,
  taskStatusStyle,
  taskStatusText,
  executeCount,
  lastExecuteTime,
  nextExecuteTime,
  countdownText,
  logBatches,
  expandedBatchIds,
  // 方法
  startTask,
  pauseTask,
  resumeTask,
  restartTask,
  clearLogs,
  toggleBatchExpand,
  formatLogMsg,
  validateInterval
} = useTaskManager({
  taskKey: 'hangup', // 唯一标识
  taskName: '挂机收益+加钟', // 任务名称
  executeBusiness: executeHangupBusiness // 差异化业务逻辑
})
</script>

<style scoped lang="scss">
// 任务卡片主样式 - 增强实体感
.task-card {
  display: flex;
  flex-direction: column;
  gap: 24px;
  // 实色背景，消除透明蒙版感
  background: var(--n-card-color, #ffffff);
  border-radius: 12px;
  padding: 24px;
  // 轻量化阴影，增强立体感但不朦胧
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

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    // 加深文字颜色，提升对比度
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
}

// 操作按钮样式
// 操作按钮样式
.task-actions {
  display: flex;
  gap: 12px;
  flex-wrap: nowrap; // 关键：取消换行，强制一行显示
  overflow-x: auto; // 小屏时允许横向滚动
  padding-bottom: 8px; // 给滚动条预留空间
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
    flex-shrink: 0; // 关键：按钮不收缩，保证完整显示
    // 轻微阴影，增强按钮实体感
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
}

// 响应式适配调整
@media (max-width: 768px) {
  .task-header {
    flex-direction: column;
    align-items: flex-start;
  }

  // 小屏（平板/手机）恢复换行，保证操作体验
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

// 状态卡片样式 - 增强实体感
.task-status-card {
  // 实色背景，替换透明hover效果
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
        // 加深次要文字颜色，提升对比度
        color: var(--n-text-color-secondary, #6b7280);
        font-weight: 500;
      }

      .status-value {
        font-size: 14px;
        // 加深主要文字颜色，提升清晰度
        color: var(--n-text-color-primary, #111827);
        font-weight: 500;
      }
    }
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
    // 实色背景，增强区分度
    background: var(--n-card-color, #ffffff);
    border-radius: 6px;
    border-left: 3px solid var(--n-border-color, #e5e7eb);
    // 轻微阴影，增强日志项实体感
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

    [data-theme="dark"] & {
      background: var(--n-card-color, #1e293b);
      border-left: 3px solid var(--n-border-color, #334155);
    }

    &.batch-error {
      border-left-color: var(--n-error-color);
      // 轻微底色，不透明，增强辨识度
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

  .task-actions {
    flex-direction: column;
  }

  .status-item-group {
    grid-template-columns: 1fr !important;
  }

  .log-modal-content .logs-list {
    max-height: 400px;
  }
}
</style>