<template>
  <div class="batch-daily-tasks">
    <div class="main-layout">
      <!-- Left Column -->
      <div class="left-column">
        <!-- Header -->
        <div class="page-header">
          <h2>批量日常任务</h2>
          <div class="actions">
            <n-button type="primary" @click="startBatch" :disabled="isRunning || selectedTokens.length === 0">
              {{ isRunning ? "执行中..." : "开始执行" }}
            </n-button>
            <n-button @click="stopBatch" :disabled="!isRunning" type="error" style="margin-left: 12px">
              停止
            </n-button>
          </div>
        </div>

        <!-- Token Selection -->
        <n-card title="账号列表" class="token-list-card">
          <n-space style="margin-bottom: 12px">
            <n-button size="small" @click="claimHangUpRewards" :disabled="isRunning || selectedTokens.length === 0">
              领取挂机
            </n-button>
            <n-button size="small" @click="batchAddHangUpTime" :disabled="isRunning || selectedTokens.length === 0">
              一键加钟
            </n-button>
            <n-button size="small" @click="resetBottles" :disabled="isRunning || selectedTokens.length === 0">
              重置罐子
            </n-button>
            <n-button size="small" @click="batchlingguanzi" :disabled="isRunning || selectedTokens.length === 0">
              一键领取罐子
            </n-button>
            <n-button size="small" @click="climbTower" :disabled="isRunning || selectedTokens.length === 0">
              一键爬塔
            </n-button>
            <n-button size="small" @click="batchStudy" :disabled="isRunning || selectedTokens.length === 0">
              一键答题
            </n-button>
            <n-button size="small" @click="batchSmartSendCar" :disabled="isRunning || selectedTokens.length === 0 || !isCarActivityOpen
              ">
              智能发车
            </n-button>
            <n-button size="small" @click="doClaimCars" :disabled="isRunning || selectedTokens.length === 0
              ">
              一键收车
            </n-button>
            <n-button size="small" @click="openHelperModal('box')" :disabled="isRunning || selectedTokens.length === 0">
              批量开箱
            </n-button>
            <n-button size="small" @click="batchClaimBoxPointReward"
              :disabled="isRunning || selectedTokens.length === 0">
              领取宝箱积分
            </n-button>
            <n-button size="small" @click="openHelperModal('fish')"
              :disabled="isRunning || selectedTokens.length === 0">
              批量钓鱼
            </n-button>
            <n-button size="small" @click="openHelperModal('recruit')"
              :disabled="isRunning || selectedTokens.length === 0">
              批量招募
            </n-button>
            <n-button size="small" @click="batchbaoku13" :disabled="isRunning || selectedTokens.length === 0 || !isbaokuActivityOpen
              ">
              一键宝库前3层
            </n-button>
            <n-button size="small" @click="batchbaoku45" :disabled="isRunning || selectedTokens.length === 0 || !isbaokuActivityOpen
              ">
              一键宝库4,5层
            </n-button>
            <n-button size="small" @click="batchmengjing" :disabled="isRunning ||
              selectedTokens.length === 0 ||
              !ismengjingActivityOpen
              ">
              一键梦境
            </n-button>
            <n-button size="small" @click="batchclubsign" :disabled="isRunning || selectedTokens.length === 0">
              一键俱乐部签到
            </n-button>
            <n-button size="small" @click="batcharenafight" :disabled="isRunning || selectedTokens.length === 0 || !isarenaActivityOpen
              ">
              一键竞技场战斗3次
            </n-button>
            <n-button size="small" @click="batchTopUpFish" :disabled="isRunning || selectedTokens.length === 0">
              一键钓鱼补齐
            </n-button>
            <n-button size="small" @click="batchTopUpArena" :disabled="isRunning || selectedTokens.length === 0 || !isarenaActivityOpen
              ">
              一键竞技场补齐
            </n-button>
            <n-button size="small" @click="batchClaimFreeEnergy"
              :disabled="isRunning || selectedTokens.length === 0 || !isWeirdTowerActivityOpen">
              一键领取怪异塔免费道具
            </n-button>
            <n-button size="small" @click="legion_storebuygoods" :disabled="isRunning || selectedTokens.length === 0">
              一键购买四圣碎片
            </n-button>
            <n-button size="small" @click="legionStoreBuySkinCoins"
              :disabled="isRunning || selectedTokens.length === 0">
              一键购买俱乐部5皮肤币
            </n-button>
            <n-button size="small" @click="store_purchase" :disabled="isRunning || selectedTokens.length === 0">
              一键黑市采购
            </n-button>
            <n-button size="small" @click="collection_claimfreereward"
              :disabled="isRunning || selectedTokens.length === 0">
              免费领取珍宝阁
            </n-button>
          </n-space>
          <n-space vertical>
            <n-checkbox :checked="isAllSelected" :indeterminate="isIndeterminate" @update:checked="handleSelectAll">
              全选
            </n-checkbox>
            <n-checkbox-group v-model:value="selectedTokens">
              <n-grid :x-gap="12" :y-gap="8" :cols="2">
                <n-grid-item v-for="token in tokens" :key="token.id">
                  <div class="token-row">
                    <n-checkbox :value="token.id" :label="token.name" style="flex: 1">
                      <div class="token-item">
                        <span>{{ token.name }}</span>
                        <n-tag size="small" :type="getStatusType(token.id)" style="margin-left: 8px">
                          {{ getStatusText(token.id) }}
                        </n-tag>
                      </div>
                    </n-checkbox>
                    <n-button size="tiny" circle @click.stop="openSettings(token)">
                      <template #icon>
                        <n-icon>
                          <Settings />
                        </n-icon>
                      </template>
                    </n-button>
                  </div>
                </n-grid-item>
              </n-grid>
            </n-checkbox-group>
          </n-space>
        </n-card>

        <!-- Scheduled Tasks -->
        <n-card title="定时任务" class="scheduled-tasks-card" style="margin-top: 16px">
          <n-space style="margin-bottom: 12px">
            <n-button type="primary" size="small" @click="openTaskModal">
              新增定时任务
            </n-button>
            <n-button size="small" @click="showTasksModal = true">
              查看定时任务
            </n-button>
          </n-space>

          <!-- 任务预告区域 -->
          <div class="task-preview" style="
            margin: 16px 0;
            padding: 16px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background-color: #fafafa;
          ">
            <h4 style="margin: 0 0 12px 0; color: #333;">即将执行的任务</h4>
            <div v-if="shortestCountdownTask" style="
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 12px;
              background-color: white;
              border-radius: 6px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            ">
              <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">{{ shortestCountdownTask.task.name }}
              </div>
              <div style="
                  font-size: 24px;
                  font-weight: bold;
                  color: #1677ff;
                " :style="{ color: shortestCountdownTask.countdown.isNearExecution ? '#ff4d4f' : '#1677ff' }">
                {{ shortestCountdownTask.countdown.formatted }}
              </div>
            </div>
            <div v-else style="
              text-align: center;
              padding: 24px;
              color: #6b7280;
              font-style: italic;
            ">
              暂无定时任务
            </div>
          </div>

          <!-- 简单的任务统计 -->
          <div class="tasks-count" v-if="scheduledTasks.length > 0">
            <p>已保存 {{ scheduledTasks.length }} 个定时任务</p>
          </div>
          <div class="tasks-count" v-else>
            <p>暂无定时任务</p>
          </div>
        </n-card>
      </div>

      <!-- Right Column - Execution Log -->
      <div class="right-column">
        <n-card :title="currentRunningTokenName
          ? `正在执行: ${currentRunningTokenName}`
          : '执行日志'
          " class="log-card">
          <template #header-extra>
            <div class="log-header-controls">
              <n-checkbox v-model:checked="autoScrollLog" size="small">
                自动滚动
              </n-checkbox>
              <n-button size="small" @click="copyLogs" style="margin-left: 8px">
                复制日志
              </n-button>
            </div>
          </template>
          <n-progress type="line" :percentage="currentProgress" :indicator-placement="'inside'" processing />
          <div class="log-container" ref="logContainer">
            <div v-for="(log, index) in logs" :key="index" class="log-item" :class="log.type">
              <span class="log-icon">
                {{{ error: '❌', success: '✅', warning: '⚠️', info: 'ℹ️', debug: '🔧' }[log.type || 'info']}}
              </span>
              <span class="time">{{ log.time }}</span>
              <span class="message"
                    :class="{
                       'text-red-500': log.type === 'error',
                       'text-green-500': log.type === 'success',
                       'text-yellow-500': log.type === 'warning',
                       'text-blue-500': log.type === 'info',
                       'text-gray-500': log.type === 'debug'}"
              >{{ log.message }}</span>
            </div>
          </div>
        </n-card>
      </div>
    </div>

    <!-- Settings Modal -->
    <n-modal v-model:show="showSettingsModal" preset="card" :title="`任务设置 - ${currentSettingsTokenName}`"
      style="width: 90%; max-width: 400px">
      <div class="settings-content">
        <div class="settings-grid">
          <div class="setting-item">
            <label class="setting-label">竞技场阵容</label>
            <n-select v-model:value="currentSettings.arenaFormation" :options="formationOptions" size="small" />
          </div>
          <div class="setting-item">
            <label class="setting-label">BOSS阵容</label>
            <n-select v-model:value="currentSettings.bossFormation" :options="formationOptions" size="small" />
          </div>
          <div class="setting-item">
            <label class="setting-label">BOSS次数</label>
            <n-select v-model:value="currentSettings.bossTimes" :options="bossTimesOptions" size="small" />
          </div>
          <div class="setting-item">
            <label class="setting-label">爬塔阵容</label>
            <n-select v-model:value="currentSettings.towerFormation" :options="formationOptions" size="small" />
          </div>
          <div class="setting-switches">
            <div class="switch-row">
              <span class="switch-label">领罐子</span><n-switch v-model:value="currentSettings.claimBottle" />
            </div>
            <div class="switch-row">
              <span class="switch-label">领挂机</span><n-switch v-model:value="currentSettings.claimHangUp" />
            </div>
            <div class="switch-row">
              <span class="switch-label">竞技场</span><n-switch v-model:value="currentSettings.arenaEnable" />
            </div>
            <div class="switch-row">
              <span class="switch-label">开宝箱</span><n-switch v-model:value="currentSettings.openBox" />
            </div>
            <div class="switch-row">
              <span class="switch-label">领取邮件奖励</span><n-switch v-model:value="currentSettings.claimEmail" />
            </div>
            <div class="switch-row">
              <span class="switch-label">黑市购买物品</span><n-switch v-model:value="currentSettings.blackMarketPurchase" />
            </div>
            <div class="switch-row">
              <span class="switch-label">付费招募</span><n-switch v-model:value="currentSettings.payRecruit" />
            </div>
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button type="primary" @click="saveSettings">保存设置</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Helper Modal (开箱/钓鱼/招募) -->
    <n-modal v-model:show="showHelperModal" preset="card" :title="helperModalTitle"
      style="width: 90%; max-width: 400px">
      <div class="settings-content">
        <div class="settings-grid">
          <div class="setting-item" v-if="helperType === 'box'">
            <label class="setting-label">宝箱类型</label>
            <n-select v-model:value="helperSettings.boxType" :options="boxTypeOptions" size="small" />
          </div>
          <div class="setting-item" v-if="helperType === 'fish'">
            <label class="setting-label">鱼竿类型</label>
            <n-select v-model:value="helperSettings.fishType" :options="fishTypeOptions" size="small" />
          </div>
          <div class="setting-item">
            <label class="setting-label">消耗数量（10的倍数）</label>
            <n-input-number v-model:value="helperSettings.count" :min="10" :max="10000" :step="10" size="small" />
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showHelperModal = false" style="margin-right: 12px">取消</n-button>
          <n-button type="primary" @click="executeHelper">开始执行</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Tasks List Modal -->
    <n-modal v-model:show="showTasksModal" preset="card" title="定时任务列表" style="width: 90%; max-width: 800px">
      <div class="tasks-list" style="max-height: 600px; overflow-y: auto">
        <div v-for="task in scheduledTasks" :key="task.id" class="task-item" style="
            margin-bottom: 16px;
            padding: 12px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
          ">
          <div style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
            ">
            <div style="font-weight: bold">{{ task.name }}</div>
            <n-switch v-model:value="task.enabled" @update:value="toggleTaskEnabled(task.id, $event)">
            </n-switch>
          </div>
          <div style="margin-bottom: 4px">
            <span style="color: #6b7280">运行类型：</span>
            <span>{{
              task.runType === "daily" ? "每天固定时间" : "Cron表达式"
              }}</span>
          </div>
          <div style="margin-bottom: 4px">
            <span style="color: #6b7280">运行时间：</span>
            <span>{{
              task.runType === "daily" ? task.runTime : task.cronExpression
              }}</span>
          </div>
          <div style="margin-bottom: 4px">
            <span style="color: #6b7280">下次执行：</span>
            <span :style="{
              fontWeight: 'bold',
              color: taskCountdowns[task.id]?.isNearExecution ? '#ff4d4f' : '#1677ff'
            }">
              {{ taskCountdowns[task.id]?.formatted || '计算中...' }}
            </span>
          </div>
          <div style="margin-bottom: 4px">
            <span style="color: #6b7280">选中账号：</span>
            <span>{{ task.selectedTokens.length }} 个</span>
          </div>
          <div style="margin-bottom: 8px">
            <span style="color: #6b7280">选中任务：</span>
            <span>{{ task.selectedTasks.length }} 个</span>
          </div>
          <div style="display: flex; gap: 8px">
            <n-button size="tiny" @click="editTask(task)"> 编辑 </n-button>
            <n-button size="tiny" type="error" @click="deleteTask(task.id)">
              删除
            </n-button>
          </div>
        </div>
        <div v-if="scheduledTasks.length === 0" style="text-align: center; padding: 24px; color: #6b7280">
          暂无定时任务
        </div>
      </div>
    </n-modal>

    <!-- Task Modal -->
    <n-modal v-model:show="showTaskModal" preset="card" :title="editingTask ? '编辑定时任务' : '新增定时任务'"
      style="width: 90%; max-width: 600px">
      <div class="settings-content">
        <div class="settings-grid">
          <div class="setting-item">
            <label class="setting-label">任务名称</label>
            <n-input v-model:value="taskForm.name" placeholder="请输入任务名称" />
          </div>
          <div class="setting-item">
            <label class="setting-label">运行类型</label>
            <n-radio-group v-model:value="taskForm.runType" @update:value="resetRunType">
              <n-radio value="daily">每天固定时间</n-radio>
              <n-radio value="cron">Cron表达式</n-radio>
            </n-radio-group>
          </div>
          <div class="setting-item" v-if="taskForm.runType === 'daily'">
            <label class="setting-label">运行时间</label>
            <n-time-picker v-model:value="taskForm.runTime" format="HH:mm" />
          </div>
          <div class="setting-item" v-if="taskForm.runType === 'cron'">
            <label class="setting-label">Cron表达式</label>
            <n-input v-model:value="taskForm.cronExpression" placeholder="请输入Cron表达式" />
          </div>
          <div class="setting-item">
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
              ">
              <label class="setting-label">选择账号</label>
              <n-space size="small">
                <n-button size="small" @click="selectAllTokens">
                  全选
                </n-button>
                <n-button size="small" @click="deselectAllTokens">
                  全不选
                </n-button>
              </n-space>
            </div>
            <n-checkbox-group v-model:value="taskForm.selectedTokens">
              <n-grid :cols="2" :x-gap="12" :y-gap="8">
                <n-grid-item v-for="token in tokens" :key="token.id">
                  <n-checkbox :value="token.id">{{ token.name }}</n-checkbox>
                </n-grid-item>
              </n-grid>
            </n-checkbox-group>
          </div>
          <div class="setting-item">
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
              ">
              <label class="setting-label">选择任务</label>
              <n-space size="small">
                <n-button size="small" @click="selectAllTasks"> 全选 </n-button>
                <n-button size="small" @click="deselectAllTasks">
                  全不选
                </n-button>
              </n-space>
            </div>
            <n-checkbox-group v-model:value="taskForm.selectedTasks">
              <n-grid :cols="2" :x-gap="12" :y-gap="8">
                <n-grid-item v-for="task in availableTasks" :key="task.value">
                  <n-checkbox :value="task.value">{{ task.label }}</n-checkbox>
                </n-grid-item>
              </n-grid>
            </n-checkbox-group>
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showTaskModal = false" style="margin-right: 12px">取消</n-button>
          <n-button type="primary" @click="saveTask">保存</n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
// Import required dependencies
import { ref, computed, nextTick, reactive, watch, onMounted, onBeforeUnmount } from "vue";
import { useTokenStore } from "@/stores/tokenStore";
import { DailyTaskRunner } from "@/utils/dailyTaskRunner";
import { preloadQuestions } from "@/utils/studyQuestionsFromJSON.js";
import { useMessage } from "naive-ui";
import { Settings } from "@vicons/ionicons5";
import {batchLogger} from "@/utils/logger.js";
import getAppEnvironment from "@/utils/envUtil.js";
import TaskManager from "@/utils/taskManager.js";
import {FormationTool} from "@/utils/FormationUtil.js";
const env = getAppEnvironment();
batchLogger.info("当前环境:", env.toString());
// Initialize token store, message service, and task runner
const tokenStore = useTokenStore();
const message = useMessage();
const runner = new DailyTaskRunner(tokenStore);

const formationTool = new FormationTool(tokenStore);
const tokens = computed(() => tokenStore.gameTokens);
const isCarActivityOpen = computed(() => {
  const day = new Date().getDay();
  // 1=Mon, 2=Tue, 3=Wed
  return day >= 1 && day <= 3;
});
const ismengjingActivityOpen = computed(() => {
  const day = new Date().getDay();
  return day === 0 || day === 1 || day === 3 || day === 4;
});
const isbaokuActivityOpen = computed(() => {
  const day = new Date().getDay();
  return day != 1 && day != 2;
});
const isarenaActivityOpen = computed(() => {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 22;
});
const getCurrentActivityWeek = computed(() => {
  const now = new Date();
  const start = new Date('2025-12-12T12:00:00'); // 起始时间：黑市周开始
  const weekDuration = 7 * 24 * 60 * 60 * 1000; // 一周毫秒数
  const cycleDuration = 3 * weekDuration; // 三周期毫秒数

  const elapsed = now - start;
  if (elapsed < 0) return null; // 活动开始前

  const cyclePosition = elapsed % cycleDuration;

  if (cyclePosition < weekDuration) {
    return '黑市周';
  } else if (cyclePosition < 2 * weekDuration) {
    return '招募周';
  } else {
    return '宝箱周';
  }
});

const isWeirdTowerActivityOpen = computed(() => {
  return getCurrentActivityWeek.value === '黑市周';
});

const selectedTokens = ref([]);
const tokenStatus = ref({}); // { tokenId: 'waiting' | 'running' | 'completed' | 'failed' }
const isRunning = ref(false);
const shouldStop = ref(false);

// Settings Modal State
const showSettingsModal = ref(false);
const currentSettingsTokenId = ref(null);
const currentSettingsTokenName = ref("");
const currentSettings = reactive({
  arenaFormation: 1,
  bossFormation: 1,
  bossTimes: 2,
  towerFormation:2,
  claimBottle: true,
  payRecruit: true,
  openBox: true,
  arenaEnable: true,
  claimHangUp: true,
  claimEmail: true,
  blackMarketPurchase: true,
});

// Helper Modal State
const showHelperModal = ref(false);
const helperType = ref("box"); // 'box' | 'fish' | 'recruit'
const helperSettings = reactive({
  boxType: 2001,
  fishType: 1,
  count: 100,
});

const helperModalTitle = computed(() => {
  const titles = { box: "批量开宝箱", fish: "批量钓鱼", recruit: "批量招募" };
  return titles[helperType.value] || "批量助手";
});

// ======================
// Scheduled Tasks Feature
// ======================

// Scheduled Tasks State Management
const scheduledTasks = ref([]); // List of all scheduled tasks
const showTaskModal = ref(false); // Control the visibility of the add/edit task modal
const showTasksModal = ref(false); // Control the visibility of the tasks list modal
const editingTask = ref(null); // Currently editing task
const taskForm = reactive({
  name: "", // Task name
  runType: "daily", // 'daily' or 'cron'
  runTime: null, // Daily run time (HH:mm format)
  cronExpression: "", // Cron expression for complex scheduling
  selectedTokens: [], // Selected token IDs
  selectedTasks: [], // Selected task function names
  enabled: true, // Whether the task is enabled
});
// Available tasks for scheduling - Maps task function names to display labels
const availableTasks = [
  { label: "日常任务", value: "startBatch" },
  { label: "领取挂机", value: "claimHangUpRewards" },
  { label: "一键加钟", value: "batchAddHangUpTime" },
  { label: "重置罐子", value: "resetBottles" },
  { label: "一键领取罐子", value: "batchlingguanzi" },
  { label: "一键爬塔", value: "climbTower" },
  { label: "一键答题", value: "batchStudy" },
  { label: "智能发车", value: "batchSmartSendCar" },
  { label: "一键收车", value: "batchClaimCars" },
  { label: "批量开箱", value: "batchOpenBox" },
  { label: "领取宝箱积分", value: "batchClaimBoxPointReward" },
  { label: "批量钓鱼", value: "batchFish" },
  { label: "批量招募", value: "batchRecruit" },
  { label: "一键宝库前3层", value: "batchbaoku13" },
  { label: "一键宝库4,5层", value: "batchbaoku45" },
  { label: "一键梦境", value: "batchmengjing" },
  { label: "一键俱乐部签到", value: "batchclubsign" },
  { label: "一键竞技场战斗3次", value: "batcharenafight" },
  { label: "一键钓鱼补齐", value: "batchTopUpFish" },
  { label: "一键竞技场补齐", value: "batchTopUpArena" },
  { label: "一键领取怪异塔免费道具", value: "batchClaimFreeEnergy" },
  { label: "一键购买四圣碎片", value: "legion_storebuygoods" },
  { label: "一键黑市采购", value: "store_purchase" },
  { label: "免费领取珍宝阁", value: "collection_claimfreereward" },
];

const CarresearchItem = [
  20, 21, 22, 23, 24, 26, 28, 30, 32, 34,
  36, 38, 40, 42, 44, 47, 50, 53, 56, 59,
  62, 65, 68, 71, 74, 78, 82, 86, 90, 94,
  99, 104, 109, 114, 119, 126, 133, 140, 147, 154,
  163, 172, 181, 190, 199, 210, 221, 232, 243, 369,
  393, 422, 457, 498, 548, 607, 678, 763, 865, 1011
];

// Task table columns configuration for the tasks list modal
const taskColumns = [
  { title: "任务名称", key: "name", width: 150 },
  { title: "运行类型", key: "runType", width: 100 },
  {
    title: "运行时间",
    key: "runTime",
    width: 150,
    render: (row) => {
      // Display appropriate time format based on run type
      return row.runType === "daily" ? row.runTime : row.cronExpression;
    },
  },
  {
    title: "选中账号",
    key: "selectedTokens",
    width: 150,
    render: (row) => `${row.selectedTokens.length} 个`,
  },
  {
    title: "选中任务",
    key: "selectedTasks",
    width: 150,
    render: (row) => `${row.selectedTasks.length} 个`,
  },
  {
    title: "状态",
    key: "enabled",
    width: 80,
    render: (row) => (row.enabled ? "启用" : "禁用"),
  },
  { title: "操作", key: "actions", width: 150 },
];

// ======================
// Scheduled Tasks Storage
// ======================

// Load scheduled tasks from localStorage
const loadScheduledTasks = () => {
  try {
    const saved = localStorage.getItem("scheduledTasks");
    console.log("Raw localStorage data:", saved);
    if (saved) {
      const parsed = JSON.parse(saved);
      console.log("Parsed data:", parsed);
      console.log("Is array:", Array.isArray(parsed));
      // Ensure we have an array
      scheduledTasks.value = Array.isArray(parsed) ? parsed : [];
      console.log("Loaded scheduled tasks:", scheduledTasks.value);
      console.log("Loaded tasks count:", scheduledTasks.value.length);
    } else {
      console.log("No saved tasks in localStorage");
      scheduledTasks.value = [];
    }
  } catch (error) {
    console.error("Failed to load scheduled tasks:", error);
    scheduledTasks.value = [];
  }
};

// Save scheduled tasks to localStorage
const saveScheduledTasks = () => {
  try {
    const dataToSave = JSON.stringify(scheduledTasks.value);
    console.log("Saving to localStorage:", dataToSave);
    localStorage.setItem("scheduledTasks", dataToSave);
    // Verify save was successful
    const saved = localStorage.getItem("scheduledTasks");
    console.log("Verified saved data:", saved);
    console.log("Saved scheduled tasks:", scheduledTasks.value);
    console.log("Saved tasks count:", scheduledTasks.value.length);
  } catch (error) {
    console.error("Failed to save scheduled tasks:", error);
  }
};

// Open task modal for adding new task
const openTaskModal = () => {
  editingTask.value = null;
  Object.assign(taskForm, {
    name: "",
    runType: "daily",
    runTime: undefined,
    cronExpression: "",
    selectedTokens: [],
    selectedTasks: [],
    enabled: true,
  });
  showTaskModal.value = true;
};

// Edit existing task
const editTask = (task) => {
  editingTask.value = task;
  const taskData = { ...task };
  if (task.runType === 'daily' && task.runTime && typeof task.runTime === 'string') {
    const [hours, minutes] = task.runTime.split(':').map(Number);
    const now = new Date();
    taskData.runTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
  }
  Object.assign(taskForm, taskData);
  showTaskModal.value = true;
};

// Validate cron expression
const validateCronExpression = (expression) => {
  if (!expression) return { valid: false, message: "Cron表达式不能为空" };

  const cronParts = expression.split(" ").filter(Boolean);
  if (cronParts.length !== 5) {
    return { valid: false, message: "Cron表达式必须包含5个字段：分 时 日 月 周" };
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = cronParts;

  // 定义通用的cron字段验证函数
  const validateCronField = (field, min, max, fieldName) => {
    // 支持：* / */5 / 0/1 / 1-5 / 1,3,5 / 1-10/2
    const cronFieldRegex = new RegExp(`^(?:\\*|\\*/\\d+|[0-9]+/\\d+|(?:[0-9]+-?)*[0-9]+(?:,[0-9]+-?)*[0-9]+(?:/\\d+)?)$`);

    if (!cronFieldRegex.test(field)) {
      return { valid: false, message: `${fieldName}字段格式错误` };
    }

    // 如果是简单数字，验证范围
    if (/^\d+$/.test(field)) {
      const num = parseInt(field);
      if (num < min || num > max) {
        return { valid: false, message: `${fieldName}字段必须在${min}-${max}之间` };
      }
    }

    return { valid: true };
  };

  // Validate minute (0-59)
  const minuteValidation = validateCronField(minute, 0, 59, "分钟");
  if (!minuteValidation.valid) {
    return minuteValidation;
  }

  // Validate hour (0-23)
  const hourValidation = validateCronField(hour, 0, 23, "小时");
  if (!hourValidation.valid) {
    return hourValidation;
  }

  // Validate dayOfMonth (1-31)
  const dayOfMonthValidation = validateCronField(dayOfMonth, 1, 31, "日期");
  if (!dayOfMonthValidation.valid) {
    return dayOfMonthValidation;
  }

  // Validate month (1-12)
  const monthValidation = validateCronField(month, 1, 12, "月份");
  if (!monthValidation.valid) {
    return monthValidation;
  }

  // Validate dayOfWeek (0-7, where 0 and 7 both represent Sunday)
  const dayOfWeekValidation = validateCronField(dayOfWeek, 0, 7, "星期");
  if (!dayOfWeekValidation.valid) {
    return dayOfWeekValidation;
  }

  return { valid: true, message: "Cron表达式格式正确" };
};

// Save task (create or update)
const saveTask = () => {
  if (!taskForm.name) {
    message.warning("请输入任务名称");
    return;
  }

  if (taskForm.runType === "daily" && !taskForm.runTime) {
    message.warning("请选择运行时间");
    return;
  }

  if (taskForm.runType === "cron") {
    if (!taskForm.cronExpression) {
      message.warning("请输入Cron表达式");
      return;
    }

    // Validate cron expression
    const validation = validateCronExpression(taskForm.cronExpression);
    if (!validation.valid) {
      message.warning(validation.message);
      return;
    }
  }

  if (taskForm.selectedTokens.length === 0) {
    message.warning("请选择至少一个账号");
    return;
  }

  if (taskForm.selectedTasks.length === 0) {
    message.warning("请选择至少一个任务");
    return;
  }

  // Format runTime as string for storage
  let formattedRunTime = null;
  if (taskForm.runType === "daily" && taskForm.runTime) {
    const time = new Date(taskForm.runTime);
    formattedRunTime = time.toLocaleTimeString("zh-CN", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const taskData = {
    id: editingTask.value?.id || "task_" + Date.now(),
    name: taskForm.name,
    runType: taskForm.runType,
    runTime: formattedRunTime,
    cronExpression: taskForm.runType === "cron" ? taskForm.cronExpression : "",
    selectedTokens: [...taskForm.selectedTokens],
    selectedTasks: [...taskForm.selectedTasks],
    enabled: taskForm.enabled,
  };

  let isNew = !editingTask.value;

  if (editingTask.value) {
    // Update existing task
    const index = scheduledTasks.value.findIndex(
      (t) => t.id === editingTask.value.id,
    );
    if (index !== -1) {
      scheduledTasks.value[index] = taskData;
    }
  } else {
    // Add new task
    scheduledTasks.value.push(taskData);
  }

  saveScheduledTasks();
  console.log(
    "After saving task, scheduledTasks.length:",
    scheduledTasks.value.length,
  );
  console.log("Scheduled tasks:", scheduledTasks.value);

  const config = {
    type: taskData.runType === "cron" ? "cron" : "interval",
    cronExpression: taskData.runType === "cron" ? taskData.cronExpression : "",
    interval: taskData.runType === "daily" ? 24 * 60 * 60 * 1000 : null,
    immediate: false
  };

  // 创建任务执行函数
  const executor = () => executeScheduledTask(taskData);

  // 注册任务到TaskManager
  if (TaskManager.registerTask(taskData.id, config, executor)) {
    if (taskData.enabled) {
      TaskManager.activateTask(taskData.id);
    }
    batchLogger.info(`[TaskManager] 任务 ${taskData.id} 注册成功`);
  } else {
    batchLogger.error(`[TaskManager] 任务 ${taskData.id} 注册失败`);
  }

  // Add log entry for task save
  addTaskSaveLog(taskData, isNew);

  showTaskModal.value = false;
  message.success("定时任务已保存");
};

// Delete task
const deleteTask = (taskId) => {
  TaskManager.unregisterTask(taskId);
  const task = scheduledTasks.value.find((t) => t.id === taskId);
  if (task) {
    scheduledTasks.value = scheduledTasks.value.filter((t) => t.id !== taskId);
    saveScheduledTasks();
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务 ${task.name} 已删除 ===`,
      type: "info",
    });
    message.success("定时任务已删除");
  }
};

// Toggle task enabled state
const toggleTaskEnabled = (taskId, enabled) => {
  if (enabled) {
    TaskManager.activateTask(taskId);
  } else {
    TaskManager.deactivateTask(taskId);
  }
  const task = scheduledTasks.value.find((t) => t.id === taskId);
  if (task) {
    task.enabled = enabled;
    saveScheduledTasks();
    message.success(`定时任务已${enabled ? "启用" : "禁用"}`);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务 ${task.name} 已${enabled ? "启用" : "禁用"} ===`,
      type: "info",
    });
  }
};

// Add log entry for task save
const addTaskSaveLog = (task, isNew) => {
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== ${isNew ? "新增" : "修改"}定时任务: ${task.name} ===`,
    type: "info",
  });
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `运行类型: ${task.runType === "daily" ? "每天固定时间" : "Cron表达式"}`,
    type: "info",
  });
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `运行时间: ${task.runType === "daily" ? task.runTime : task.cronExpression}`,
    type: "info",
  });
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `选中账号: ${task.selectedTokens.length} 个`,
    type: "info",
  });
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `选中任务: ${task.selectedTasks.length} 个`,
    type: "info",
  });
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `状态: ${task.enabled ? "启用" : "禁用"}`,
    type: "info",
  });
};

// Reset run type related fields
const resetRunType = () => {
  if (taskForm.runType === "daily") {
    taskForm.cronExpression = "";
  } else {
    taskForm.runTime = undefined;
  }
};

// Select all tokens
const selectAllTokens = () => {
  taskForm.selectedTokens = tokens.value.map((token) => token.id);
};

// Deselect all tokens
const deselectAllTokens = () => {
  taskForm.selectedTokens = [];
};

// Select all tasks
const selectAllTasks = () => {
  taskForm.selectedTasks = availableTasks.map((task) => task.value);
};

// Deselect all tasks
const deselectAllTasks = () => {
  taskForm.selectedTasks = [];
};

// 一键购买四圣碎片
const legion_storebuygoods = async () => {
  if (selectedTokens.value.length === 0) return;

  isRunning.value = true;
  shouldStop.value = false;

  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });

  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;

    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;

    const token = tokens.value.find((t) => t.id === tokenId);

    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始购买四圣碎片: ${token.name} ===`,
        type: "info",
      });

      await ensureConnection(tokenId);

      // Execute purchase command
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 发送购买请求...`,
        type: "info",
      });
      const result = await tokenStore.sendMessageWithPromise(
        tokenId,
        "legion_storebuygoods",
        { "id": 6 },
        5000,
      );

      await new Promise((r) => setTimeout(r, 500));

      // Handle result
      if (result.error) {
        if (result.error.includes("俱乐部商品购买数量超出上限")) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `[${token.name}] 本周已购买过四圣碎片，跳过`,
            type: "info",
          });
        } else if (result.error.includes("物品不存在")) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `[${token.name}] 盐锭不足或未加入军团，购买失败`,
            type: "error",
          });
          tokenStatus.value[tokenId] = "failed";
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `[${token.name}] 购买失败: ${result.error}`,
            type: "error",
          });
          tokenStatus.value[tokenId] = "failed";
        }
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 购买成功，获得四圣碎片`,
          type: "success",
        });
        tokenStatus.value[tokenId] = "completed";
      }

      currentProgress.value = 100;
    } catch (error) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 购买过程出错: ${error.message}`,
        type: "error",
      });
      tokenStatus.value[tokenId] = "failed";
    } finally {
      await new Promise((r) => setTimeout(r, 1000)); // Add a small delay between accounts
    }
  }

  currentRunningTokenId.value = null;
  isRunning.value = false;
  shouldStop.value = false;
};

// 一键购买俱乐部5皮肤币
const legionStoreBuySkinCoins = async () => {
  if (selectedTokens.value.length === 0) return;

  isRunning.value = true;
  shouldStop.value = false;

  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });

  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;

    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;

    const token = tokens.value.find((t) => t.id === tokenId);

    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始购买俱乐部5皮肤币: ${token.name} ===`,
        type: "info",
      });

      await ensureConnection(tokenId);

      // Execute purchase command
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 发送购买请求...`,
        type: "info",
      });
      let result ={};
      for (let i = 0; i < 5; i++) {
          result = await tokenStore.sendMessageWithPromise(
          tokenId,
          "legion_storebuygoods",
          { "id": 1 },
          5000,
        );

        await new Promise((r) => setTimeout(r, 500));
      }

      // Handle result
      if (result.error) {
        if (result.error.includes("俱乐部商品购买数量超出上限")) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `[${token.name}] 本周已购买过皮肤币，跳过`,
            type: "info",
          });
        } else if (result.error.includes("物品不存在")) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `[${token.name}] 盐锭不足或未加入军团，购买失败`,
            type: "error",
          });
          tokenStatus.value[tokenId] = "failed";
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `[${token.name}] 购买失败: ${result.error}`,
            type: "error",
          });
          tokenStatus.value[tokenId] = "failed";
        }
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 购买成功，获得皮肤币`,
          type: "success",
        });
        tokenStatus.value[tokenId] = "completed";
      }

      currentProgress.value = 100;
    } catch (error) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 购买过程出错: ${error.message}`,
        type: "error",
      });
      tokenStatus.value[tokenId] = "failed";
    } finally {
      await new Promise((r) => setTimeout(r, 1000)); // Add a small delay between accounts
    }
  }

  currentRunningTokenId.value = null;
  isRunning.value = false;
  shouldStop.value = false;
};

// 免费领取珍宝阁每日奖励
const collection_claimfreereward = async () => {
  if (selectedTokens.value.length === 0) return;
  isRunning.value = true;
  shouldStop.value = false;
  selectedTokens.value.forEach((id) => { tokenStatus.value[id] = "waiting"; });

  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;

    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;

    const token = tokens.value.find((t) => t.id === tokenId);

    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始免费领取珍宝阁: ${token.name} ===`,
        type: "info",
      });

      await ensureConnection(tokenId);

      // Execute claim free reward command
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 发送珍宝阁免费领取请求...`,
        type: "info",
      });
      const result = await tokenStore.sendMessageWithPromise(
        tokenId,
        "collection_claimfreereward",
        {}, // Empty body as specified in the JSON template
        5000,
      );

      await new Promise((r) => setTimeout(r, 500));

      // Handle result
      if (result.error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 珍宝阁领取失败: ${result.error}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 珍宝阁领取成功`,
          type: "success",
        });
        tokenStatus.value[tokenId] = "completed";
      }

      currentProgress.value = 100;
    } catch (error) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 珍宝阁领取过程出错: ${error.message}`,
        type: "error",
      });
      tokenStatus.value[tokenId] = "failed";
    } finally {
      await new Promise((r) => setTimeout(r, 1000)); // Add a small delay between accounts
    }
  }

  currentRunningTokenId.value = null;
  isRunning.value = false;
  shouldStop.value = false;
};

// 黑市一键采购
const store_purchase = async () => {
  if (selectedTokens.value.length === 0) return;

  isRunning.value = true;
  shouldStop.value = false;

  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });

  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;

    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;

    const token = tokens.value.find((t) => t.id === tokenId);

    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始黑市一键采购: ${token.name} ===`,
        type: "info",
      });

      await ensureConnection(tokenId);

      // Execute purchase command
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 发送黑市采购请求...`,
        type: "info",
      });
      const result = await tokenStore.sendMessageWithPromise(
        tokenId,
        "store_purchase",
        {}, // Empty body as specified in the JSON template
        5000,
      );

      await new Promise((r) => setTimeout(r, 500));

      // Handle result
      if (result.error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 黑市采购失败: ${result.error}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 黑市采购成功`,
          type: "success",
        });
        tokenStatus.value[tokenId] = "completed";
      }

      currentProgress.value = 100;
    } catch (error) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 黑市采购过程出错: ${error.message}`,
        type: "error",
      });
      tokenStatus.value[tokenId] = "failed";
    } finally {
      await new Promise((r) => setTimeout(r, 1000)); // Add a small delay between accounts
    }
  }

  currentRunningTokenId.value = null;
  isRunning.value = false;
  shouldStop.value = false;
};

// ======================
// Scheduled Tasks Countdown
// ======================

// Calculate next execution time for a task
// 解析cron字段，返回可能的值数组
const parseCronField = (field, min, max) => {
  const values = new Set();

  // 处理星号
  if (field === '*') {
    for (let i = min; i <= max; i++) {
      values.add(i);
    }
    return Array.from(values);
  }

  // 处理步长，如 */5 或 0/1
  if (field.includes('/')) {
    const [range, step] = field.split('/');
    const stepNum = parseInt(step);

    let start = min;
    let end = max;

    // 处理范围部分
    if (range !== '*') {
      if (range.includes('-')) {
        const [rangeStart, rangeEnd] = range.split('-').map(Number);
        start = rangeStart;
        end = rangeEnd;
      } else {
        start = parseInt(range);
        end = max;
      }
    }

    // 生成步长值
    for (let i = start; i <= end; i += stepNum) {
      values.add(i);
    }
    return Array.from(values);
  }

  // 处理范围，如 1-5
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(Number);
    for (let i = start; i <= end; i++) {
      values.add(i);
    }
    return Array.from(values);
  }

  // 处理列表，如 1,3,5
  if (field.includes(',')) {
    const parts = field.split(',');
    for (const part of parts) {
      values.add(parseInt(part));
    }
    return Array.from(values);
  }

  // 处理单个数字
  return [parseInt(field)];
};

const calculateNextExecutionTime = (task) => {
  const now = new Date();

  if (task.runType === 'daily') {
    // For daily tasks, parse the runTime and calculate next execution
    const [hours, minutes] = task.runTime.split(':').map(Number);
    const nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);

    // If today's time has passed, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun;
  } else if (task.runType === 'cron') {
    // For cron tasks, parse the cron expression
    const cronParts = task.cronExpression.split(' ').filter(Boolean);
    if (cronParts.length < 5) return null;

    const [minuteField, hourField, dayOfMonthField, monthField, dayOfWeekField] = cronParts;

    // 解析各个字段的可能值
    const possibleMinutes = parseCronField(minuteField, 0, 59);
    const possibleHours = parseCronField(hourField, 0, 23);
    const possibleDaysOfMonth = parseCronField(dayOfMonthField, 1, 31);
    const possibleMonths = parseCronField(monthField, 1, 12);
    const possibleDaysOfWeek = parseCronField(dayOfWeekField, 0, 7);

    // 从当前时间开始，寻找下一个匹配的时间
    let nextRun = new Date(now);
    nextRun.setSeconds(0, 0);
    nextRun.setMinutes(nextRun.getMinutes() + 1); // 从下一分钟开始检查

    // 最多检查未来一年
    const maxCheckTime = new Date(now);
    maxCheckTime.setFullYear(maxCheckTime.getFullYear() + 1);

    while (nextRun <= maxCheckTime) {
      const minutes = nextRun.getMinutes();
      const hours = nextRun.getHours();
      const dayOfMonth = nextRun.getDate();
      const month = nextRun.getMonth() + 1; // JavaScript月份是0-based
      const dayOfWeek = nextRun.getDay(); // 0是周日

      // 检查所有字段是否匹配
      if (possibleMinutes.includes(minutes) &&
        possibleHours.includes(hours) &&
        possibleDaysOfMonth.includes(dayOfMonth) &&
        possibleMonths.includes(month) &&
        possibleDaysOfWeek.includes(dayOfWeek)) {
        return nextRun;
      }

      // 检查下一分钟
      nextRun.setMinutes(nextRun.getMinutes() + 1);
    }

    return null;
  }

  return null;
};

// Format time difference as "X天X小时X分X秒"
const formatTimeDifference = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  let result = '';
  if (days > 0) result += `${days}天`;
  if (remainingHours > 0 || days > 0) result += `${remainingHours}小时`;
  if (remainingMinutes > 0 || remainingHours > 0 || days > 0) result += `${remainingMinutes}分`;
  result += `${remainingSeconds}秒`;

  return result;
};

// Task countdowns ref
const taskCountdowns = ref({});
const nextExecutionTimes = ref({});

// Update countdowns for all tasks
const updateCountdowns = () => {
  const now = Date.now();

  scheduledTasks.value.forEach(task => {
    if (!nextExecutionTimes.value[task.id] || nextExecutionTimes.value[task.id] <= now) {
      // Calculate next execution time if not set or passed
      nextExecutionTimes.value[task.id] = calculateNextExecutionTime(task);
    }

    if (nextExecutionTimes.value[task.id]) {
      const timeDiff = nextExecutionTimes.value[task.id] - now;
      taskCountdowns.value[task.id] = {
        remainingTime: Math.max(0, timeDiff),
        formatted: formatTimeDifference(Math.max(0, timeDiff)),
        isNearExecution: timeDiff < 5 * 60 * 1000 // Less than 5 minutes
      };
    }
  });
};

// 计算最短倒计时任务
const shortestCountdownTask = computed(() => {
  if (scheduledTasks.value.length === 0) return null;

  let shortestTask = null;
  let shortestTime = Infinity;

  // 遍历所有任务，找到倒计时最短的任务
  scheduledTasks.value.forEach(task => {
    const countdown = taskCountdowns.value[task.id];
    if (countdown && countdown.remainingTime < shortestTime) {
      shortestTime = countdown.remainingTime;
      shortestTask = {
        task,
        countdown
      };
    }
  });

  return shortestTask;
});

// Start countdown interval
let countdownInterval = null;

const startCountdown = () => {
  // Clear any existing interval
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  // Update countdowns immediately
  updateCountdowns();

  // Update countdowns every second
  countdownInterval = setInterval(updateCountdowns, 1000);
};

// ======================
// Scheduled Tasks Scheduler
// ======================


// Watch for changes to scheduledTasks for debugging
watch(
  scheduledTasks,
  (newVal) => {
    console.log("scheduledTasks changed:", newVal.length);
    console.log("New value:", newVal);
    // Reset countdowns when tasks change
    nextExecutionTimes.value = {};
    taskCountdowns.value = {};
    updateCountdowns();
  },
  { deep: true },
);

// 修复TimePicker的"Invalid time value"错误：确保runTime的初始值不是null
watch(
  () => showTaskModal.value,
  (isVisible) => {
    if (isVisible && !taskForm.runTime) {
      // 当模态框显示且runTime为null时，将其设置为undefined
      taskForm.runTime = undefined;
    }
  }
);

// Debug: Log initial state when component mounts
onMounted(() => {
  // Initialize scheduled tasks from localStorage
  loadScheduledTasks();
  batchLogger.info(
      "Component mounted, initial scheduledTasks:",
      scheduledTasks.value,
  );
  batchLogger.info("Initial scheduledTasks length:", scheduledTasks.value.length);

  // 注册所有启用的任务
  scheduledTasks.value.forEach(task => {
    if (task.enabled) {
      const config = {
        type: task.runType === "cron" ? "cron" : "interval",
        cronExpression: task.runType === "cron" ? task.cronExpression : "",
        interval: task.runType === "daily" ? 24 * 60 * 60 * 1000 : null,
        immediate: false
      };

      const executor = () => executeScheduledTask(task);

      if (TaskManager.registerTask(task.id, config, executor)) {
        TaskManager.activateTask(task.id);
        batchLogger.info(`[TaskManager] 任务 ${task.id} 已注册并激活`);
      } else {
        batchLogger.error(`[TaskManager] 任务 ${task.id} 注册失败`);
      }
    }
  });

  // 启动倒计时
  startCountdown();

  // 添加环境信息日志
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 定时任务系统已启动 [${env.isDesktop ? 'Electron' : 'Browser'}] ===`,
    type: "info"
  });
});

// Cleanup countdown interval on unmount
onBeforeUnmount(() => {
  scheduledTasks.value.forEach(task => {
    TaskManager.unregisterTask(task.id);
  });

  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  addLog({
    time: new Date().toLocaleTimeString(),
    message: "=== 定时任务调度服务已停止 ===",
    type: "info",
  });
});

// Task scheduler - ensure it runs properly
const scheduleTaskExecution = () => {
  // Log the start of the scheduler
  addLog({
    time: new Date().toLocaleTimeString(),
    message: "=== 定时任务调度服务已启动 ===",
    type: "info",
  });

  // Store interval ID for cleanup
  let intervalId = null;
  let lastTaskExecution = null;

  // Health check for the scheduler
  const healthCheck = () => {
    console.log(`[${new Date().toISOString()}] Task scheduler health check - running: ${intervalId !== null}`);
    // If interval is not running, restart it
    if (!intervalId) {
      console.error(`[${new Date().toISOString()}] Task scheduler interval is not running, restarting...`);
      startScheduler();
    }

    // Add a safety mechanism to prevent isRunning from being stuck
    if (isRunning.value) {
      const now = Date.now();
      const tenMinutesAgo = now - 10 * 60 * 1000; // 10 minutes ago
      if (lastTaskExecution && lastTaskExecution < tenMinutesAgo) {
        console.error(`[${new Date().toISOString()}] isRunning has been true for more than 10 minutes, resetting to false`);
        isRunning.value = false;
        addLog({
          time: new Date().toLocaleTimeString(),
          message: "=== 检测到任务执行超时，已重置isRunning状态 ===",
          type: "warning",
        });
      }
    }
  };

  // Start the scheduler
  const startScheduler = () => {
    // Clear any existing interval first
    if (intervalId) {
      clearInterval(intervalId);
    }

    // Check every 10 seconds instead of 60 seconds for more timely task execution
    intervalId = setInterval(() => {
      try {
        const now = new Date();
        const currentTime = now.toLocaleTimeString("zh-CN", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        // Log the current check time for debugging
        console.log(`[${new Date().toISOString()}] Checking scheduled tasks...`);

        // Add detailed log about scheduler status (commented out for cleaner logs)
        // addLog({
        //   time: currentTime,
        //   message: `=== 定时任务调度服务检查中，isRunning: ${isRunning.value}，任务数量: ${scheduledTasks.value.length} ===`,
        //   type: "info",
        // });

        // Don't skip all tasks if isRunning is true, just skip individual task execution if already running
        const tasksToRun = scheduledTasks.value.filter(task => task.enabled);

        if (tasksToRun.length === 0) {
          console.log(`[${new Date().toISOString()}] No enabled tasks to check`);
          return;
        }

        tasksToRun.forEach((task) => {
          let shouldRun = false;
          let reason = '';

          if (task.runType === "daily") {
            // Check if current time matches the scheduled time
            const taskTime = task.runTime;
            const nowTime = now.toLocaleTimeString("zh-CN", {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
            });
            shouldRun = nowTime === taskTime;
            reason = `currentTime=${nowTime}, taskTime=${taskTime}, match=${shouldRun}`;
          } else if (task.runType === "cron") {
            // Improved cron expression parsing
            try {
              const cronParts = task.cronExpression.split(" ").filter(Boolean);

              if (cronParts.length < 5) {
                console.error(`[${new Date().toISOString()}] Invalid cron expression: ${task.cronExpression}, must have at least 5 parts`);
                addLog({
                  time: currentTime,
                  message: `=== 定时任务 ${task.name} 的Cron表达式无效: ${task.cronExpression}，必须包含至少5个字段 ===`,
                  type: "error",
                });
                return;
              }

              const [minuteField, hourField, dayOfMonthField, monthField, dayOfWeekField] = cronParts;

              // 使用之前定义的parseCronField函数解析cron字段
              const possibleMinutes = parseCronField(minuteField, 0, 59);
              const possibleHours = parseCronField(hourField, 0, 23);
              const possibleDaysOfMonth = parseCronField(dayOfMonthField, 1, 31);
              const possibleMonths = parseCronField(monthField, 1, 12);
              const possibleDaysOfWeek = parseCronField(dayOfWeekField, 0, 7);

              // 检查当前时间是否匹配cron表达式
              const matchesMinute = possibleMinutes.includes(now.getMinutes());
              const matchesHour = possibleHours.includes(now.getHours());
              const matchesDayOfMonth = possibleDaysOfMonth.includes(now.getDate());
              const matchesMonth = possibleMonths.includes(now.getMonth() + 1); // months are 0-based in JS
              const matchesDayOfWeek = possibleDaysOfWeek.includes(now.getDay()); // 0是周日

              shouldRun = matchesMinute && matchesHour && matchesDayOfMonth && matchesMonth && matchesDayOfWeek;
              reason = `minute=${matchesMinute}, hour=${matchesHour}, dayOfMonth=${matchesDayOfMonth}, month=${matchesMonth}, dayOfWeek=${matchesDayOfWeek}`;
            } catch (error) {
              console.error(`[${new Date().toISOString()}] Error parsing cron expression ${task.cronExpression}:`, error);
              addLog({
                time: currentTime,
                message: `=== 解析定时任务 ${task.name} 的Cron表达式失败: ${error.message} ===`,
                type: "error",
              });
              return;
            }
          }

          // Add detailed log about task check result (commented out for cleaner logs)
          console.log(`[${new Date().toISOString()}] Task ${task.name}: shouldRun=${shouldRun}, reason=${reason}`);
          // addLog({
          //   time: currentTime,
          //   message: `=== 检查任务 ${task.name}: 应该执行=${shouldRun}，原因=${reason} ===`,
          //   type: shouldRun ? "success" : "info",
          // });

          if (shouldRun) {
            // Check if the task was already executed in the last minute to avoid duplicate execution
            const taskExecutionKey = `${task.id}_${now.getDate()}_${now.getHours()}_${now.getMinutes()}`;
            const lastExecutionKey = localStorage.getItem(`lastTaskExecution_${task.id}`);

            if (lastExecutionKey !== taskExecutionKey) {
              // Update last execution time
              localStorage.setItem(`lastTaskExecution_${task.id}`, taskExecutionKey);

              // Execute the task
              console.log(`[${new Date().toISOString()}] Executing task ${task.name}`);
              lastTaskExecution = Date.now();
              executeScheduledTask(task);
            } else {
              console.log(`[${new Date().toISOString()}] Task ${task.name} already executed in this minute, skipping`);
              addLog({
                time: currentTime,
                message: `=== 任务 ${task.name} 本分钟内已执行，跳过 ===`,
                type: "info",
              });
            }
          }
        });
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in task scheduler:`, error);
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 定时任务调度服务发生错误: ${error.message} ===`,
          type: "error",
        });
      }
    }, 10000); // Check every 10 seconds

    console.log(`[${new Date().toISOString()}] Task scheduler started with interval ID: ${intervalId}`);
  };

  // Start the scheduler
  startScheduler();

  // Health check every 5 minutes instead of 1 hour for more frequent safety checks
  setInterval(healthCheck, 5 * 60 * 1000);

  // Initial health check
  healthCheck();

  // Cleanup on component unmount
  onBeforeUnmount(() => {
    console.log(`[${new Date().toISOString()}] Cleaning up task scheduler...`);
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "=== 定时任务调度服务已停止 ===",
      type: "info",
    });
  });
};

// Verify task dependencies with retry and fault tolerance
const verifyTaskDependencies = async (task) => {
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 开始验证定时任务 ${task.name} 的依赖 ===`,
    type: "info",
  });

  // Verify localStorage is available
  try {
    localStorage.setItem("test", "test");
    localStorage.removeItem("test");
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "✅ localStorage可用",
      type: "info",
    });
  } catch (error) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `❌ localStorage不可用: ${error.message}`,
      type: "error",
    });
    return false;
  }

  // Verify token store is available
  if (!tokenStore || !tokenStore.gameTokens) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "❌ Token存储不可用",
      type: "error",
    });
    return false;
  }

  // Verify task functions exist
  for (const taskName of task.selectedTasks) {
    const taskFunction = eval(taskName);
    if (typeof taskFunction !== "function") {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `❌ 任务函数不存在: ${taskName}`,
        type: "error",
      });
      return false;
    }
  }

  // WebSocket connection check with retry and manual connect mechanism
  const checkWebSocketWithRetry = async (tokenId, maxRetries = 3, retryDelay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      // 检查当前连接状态
      const status = tokenStore.getWebSocketStatus(tokenId);
      if (status === "connected") {
        return true;
      }

      // 尝试手动触发WebSocket连接
      if (i < maxRetries) {
        const tokenName = tokenStore.gameTokens.find(t => t.id === tokenId)?.name || tokenId;

        try {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `⏳ 账号 ${tokenName} WebSocket未连接，尝试手动连接... (${i + 1}/${maxRetries})`,
            type: "warning",
          });

          // 获取token的完整信息
          const token = tokenStore.gameTokens.find(t => t.id === tokenId);
          if (token && token.token) {
            // 尝试使用createWebSocketConnection方法手动连接
            if (typeof tokenStore.createWebSocketConnection === 'function') {
              tokenStore.createWebSocketConnection(tokenId, token.token);
            }
            // 如果createWebSocketConnection方法不存在，尝试使用selectToken方法
            else if (typeof tokenStore.selectToken === 'function') {
              tokenStore.selectToken(tokenId, true); // forceReconnect为true
            }

            // 等待一段时间让连接建立
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          } else {
            // 如果token信息不完整，跳过连接尝试
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `⚠️  账号 ${tokenName} 缺少token信息，无法尝试手动连接`,
              type: "warning",
            });
            break;
          }
        } catch (error) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `❌ 账号 ${tokenName} 尝试手动连接失败: ${error.message}`,
            type: "error",
          });
          // 继续下一次重试
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    // 最后再次检查连接状态
    return tokenStore.getWebSocketStatus(tokenId) === "connected";
  };

  // Check WebSocket connections with retry
  const connectedTokens = [];
  const disconnectedTokens = [];

  for (const tokenId of task.selectedTokens) {
    const tokenName = tokenStore.gameTokens.find(t => t.id === tokenId)?.name || tokenId;
    const isConnected = await checkWebSocketWithRetry(tokenId);

    if (isConnected) {
      connectedTokens.push({ id: tokenId, name: tokenName });
    } else {
      disconnectedTokens.push({ id: tokenId, name: tokenName });
    }
  }

  // Log connection status
  if (connectedTokens.length > 0) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `✅ 已连接账号: ${connectedTokens.map(t => t.name).join(", ")}`,
      type: "info",
    });
  }

  if (disconnectedTokens.length > 0) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `⚠️  未连接账号: ${disconnectedTokens.map(t => t.name).join(", ")}`,
      type: "warning",
    });
  }

  // If no tokens are connected, return false
  if (connectedTokens.length === 0) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务 ${task.name} 没有可用的连接账号，取消执行 ===`,
      type: "error",
    });
    return false;
  }

  // Store connected tokens for execution
  task.connectedTokens = connectedTokens.map(t => t.id);

  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 定时任务 ${task.name} 的依赖验证通过，将执行 ${connectedTokens.length} 个账号 ===`,
    type: "success",
  });
  return true;
};

// Execute a scheduled task with dependency verification
const executeScheduledTask = async (task) => {
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 开始执行定时任务: ${task.name} [${env.isDesktop ? 'Electron' : 'Browser'}] ===`,
    type: "info",
  });

  try {
    // Verify dependencies before executing task
    const dependenciesValid = await verifyTaskDependencies(task);
    if (!dependenciesValid) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务 ${task.name} 依赖验证失败，取消执行 ===`,
        type: "error",
      });
      return;
    }

    // Set selected tokens from the task - use selectedTokens if connectedTokens is not available
    selectedTokens.value = [...(task.connectedTokens || task.selectedTokens)];

    // Execute each selected task
    for (const taskName of task.selectedTasks) {
      if (shouldStop.value) break;

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `执行任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName}`,
        type: "info",
      });

      // Call the task function dynamically
      const taskFunction = eval(taskName);
      if (typeof taskFunction === "function") {
        await taskFunction();
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `任务函数不存在: ${taskName}`,
          type: "error",
        });
      }
    }

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务执行完成: ${task.name} ===`,
      type: "success",
    });
  } catch (error) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务执行失败: ${error.message} ===`,
      type: "error",
    });
    console.error(`[${new Date().toISOString()}] Error executing scheduled task ${task.name}:`, error);
  }
};

const boxTypeOptions = [
  { label: "木质宝箱", value: 2001 },
  { label: "青铜宝箱", value: 2002 },
  { label: "黄金宝箱", value: 2003 },
  { label: "铂金宝箱", value: 2004 },
];

const fishTypeOptions = [
  { label: "普通鱼竿", value: 1 },
  { label: "黄金鱼竿", value: 2 },
];

const openHelperModal = (type) => {
  helperType.value = type;
  showHelperModal.value = true;
};

const executeHelper = () => {
  // 验证数量是10的倍数
  if (helperSettings.count % 10 !== 0 || helperSettings.count < 10) {
    message.warning("消耗数量必须是10的整数倍，最小为10");
    return;
  }
  showHelperModal.value = false;
  if (helperType.value === "box") {
    batchOpenBox();
  } else if (helperType.value === "fish") {
    batchFish();
  } else if (helperType.value === "recruit") {
    batchRecruit();
  }
};

const formationOptions = [1, 2, 3, 4, 5, 6].map((v) => ({
  label: `阵容${v}`,
  value: v,
}));
const bossTimesOptions = [0, 1, 2, 3, 4].map((v) => ({
  label: `${v}次`,
  value: v,
}));

const loadSettings = (tokenId) => {
  try {
    const raw = localStorage.getItem(`daily-settings:${tokenId}`);
    const defaultSettings = {
      arenaFormation: 1,
      bossFormation: 1,
      bossTimes: 2,
      towerFormation: 1,
      claimBottle: true,
      payRecruit: true,
      openBox: true,
      arenaEnable: true,
      claimHangUp: true,
      claimEmail: true,
      blackMarketPurchase: true,
    };
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch (error) {
    console.error("Failed to load settings:", error);
    return null;
  }
};

const openSettings = (token) => {
  currentSettingsTokenId.value = token.id;
  currentSettingsTokenName.value = token.name;
  const saved = loadSettings(token.id);
  Object.assign(currentSettings, saved);
  showSettingsModal.value = true;
};

const saveSettings = () => {
  if (currentSettingsTokenId.value) {
    localStorage.setItem(
      `daily-settings:${currentSettingsTokenId.value}`,
      JSON.stringify(currentSettings),
    );
    message.success(`已保存 ${currentSettingsTokenName.value} 的设置`);
    showSettingsModal.value = false;
  }
};

const currentRunningTokenId = ref(null);
const currentProgress = ref(0);
const logs = ref([]);
const logContainer = ref(null);
const autoScrollLog = ref(true);

const currentRunningTokenName = computed(() => {
  const t = tokens.value.find((x) => x.id === currentRunningTokenId.value);
  return t ? t.name : "";
});

// Selection logic
const isAllSelected = computed(
  () =>
    selectedTokens.value.length === tokens.value.length &&
    tokens.value.length > 0,
);
const isIndeterminate = computed(
  () =>
    selectedTokens.value.length > 0 &&
    selectedTokens.value.length < tokens.value.length,
);

const handleSelectAll = (checked) => {
  if (checked) {
    selectedTokens.value = tokens.value.map((t) => t.id);
  } else {
    selectedTokens.value = [];
  }
};

const getStatusType = (tokenId) => {
  const status = tokenStatus.value[tokenId];
  if (status === "completed") return "success";
  if (status === "failed") return "error";
  if (status === "running") return "info";
  return "default";
};

const getStatusText = (tokenId) => {
  const status = tokenStatus.value[tokenId];
  if (status === "completed") return "已完成";
  if (status === "failed") return "失败";
  if (status === "running") return "执行中";
  return "等待中";
};

const pickArenaTargetId = (targets) => {
  const candidate =
    targets?.rankList?.[0] ||
    targets?.roleList?.[0] ||
    targets?.targets?.[0] ||
    targets?.targetList?.[0] ||
    targets?.list?.[0];

  if (candidate?.roleId) return candidate.roleId;
  if (candidate?.id) return candidate.id;
  return targets?.roleId || targets?.id;
};

// 月度任务常量
const FISH_TARGET = 320;
const ARENA_TARGET = 240;
// 日期辅助函数
const getTodayStartSec = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
};
const isTodayAvailable = (lastTimeSec) => {
  if (!lastTimeSec || typeof lastTimeSec !== "number") return true;
  return lastTimeSec < getTodayStartSec();
};
// 计算月度任务进度
const calculateMonthProgress = () => {
  const now = new Date();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const dayOfMonth = now.getDate();
  return Math.min(1, Math.max(0, dayOfMonth / daysInMonth));
};

const addLog = (log) => {
  logs.value.push(log);
  if (logs.value.length > 1200) {
    logs.value.shift(); // 移除第一条（最早的一条）
  }
  // console.log(`要输出消息了哦:${log.message}`);
  if (typeof batchLogger[log.type] === 'function') {
    batchLogger[log.type](log.message);
  } else {
    batchLogger.info(log.message);
  }
  nextTick(() => {
    if (logContainer.value && autoScrollLog.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }
  });
};

watch(autoScrollLog, (newValue) => {
  if (newValue && logContainer.value) {
    nextTick(() => {
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    });
  }
});

const copyLogs = () => {
  if (logs.value.length === 0) {
    message.warning("没有可复制的日志");
    return;
  }
  const logText = logs.value
    .map((log) => `${log.time} ${log.message}`)
    .join("\n");
  navigator.clipboard
    .writeText(logText)
    .then(() => {
      message.success("日志已复制到剪贴板");
    })
    .catch((err) => {
      message.error("复制日志失败: " + err.message);
    });
};

const waitForConnection = async (tokenId, timeout = 2000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status === "connected") return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};

const resetBottles = async () => {
  if (selectedTokens.value.length === 0) return;

  isRunning.value = true;
  shouldStop.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];

  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });

  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;

    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;

    const token = tokens.value.find((t) => t.id === tokenId);

    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始重置罐子: ${token.name} ===`,
        type: "info",
      });

      await ensureConnection(tokenId);

      // Execute commands
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `停止计时...`,
        type: "info",
      });
      await tokenStore.sendMessageWithPromise(
        tokenId,
        "bottlehelper_stop",
        {},
        5000,
      );

      await new Promise((r) => setTimeout(r, 500));

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `开始计时...`,
        type: "info",
      });
      await tokenStore.sendMessageWithPromise(
        tokenId,
        "bottlehelper_start",
        {},
        5000,
      );

      tokenStatus.value[tokenId] = "completed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== ${token.name} 重置完成 ===`,
        type: "success",
      });
    } catch (error) {
      console.error(error);
      tokenStatus.value[tokenId] = "failed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `重置失败: ${error.message}`,
        type: "error",
      });
    }

    currentProgress.value = 100;
    await new Promise((r) => setTimeout(r, 500));
  }

  isRunning.value = false;
  currentRunningTokenId.value = null;
  message.success("批量重置罐子结束");
};

const claimHangUpRewards = async () => {
  if (selectedTokens.value.length === 0) return;

  isRunning.value = true;
  shouldStop.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];

  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });

  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;

    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;

    const token = tokens.value.find((t) => t.id === tokenId);

    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始领取挂机: ${token.name} ===`,
        type: "info",
      });

      await ensureConnection(tokenId);

      // Execute commands

      // 1. Claim reward
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 领取挂机奖励`,
        type: "info",
      });
      await tokenStore.sendMessageWithPromise(
        tokenId,
        "system_claimhangupreward",
        {},
        5000,
      );
      await new Promise((r) => setTimeout(r, 500));

      // 2. Add time 4 times
      for (let i = 0; i < 4; i++) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 挂机加钟 ${i + 1}/4`,
          type: "info",
        });
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "system_mysharecallback",
          { isSkipShareCard: true, type: 2 },
          5000,
        );
        await new Promise((r) => setTimeout(r, 500));
      }

      tokenStatus.value[tokenId] = "completed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== ${token.name} 领取完成 ===`,
        type: "success",
      });
    } catch (error) {
      console.error(error);
      tokenStatus.value[tokenId] = "failed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 领取失败: ${error.message}`,
        type: "error",
      });
    }

    currentProgress.value = 100;
    await new Promise((r) => setTimeout(r, 500));
  }

  isRunning.value = false;
  currentRunningTokenId.value = null;
  message.success("批量领取挂机结束");
};

const batchbaoku13 = async () => {
  if (selectedTokens.value.length === 0) return;
  isRunning.value = true;
  shouldStop.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];
  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });
  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;
    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;
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
        message: `[${token.name}] 宝库战斗失败: ${error.message || "未知错误"}`,
        type: "error",
      });
    }
    currentProgress.value = 100;
    await new Promise((r) => setTimeout(r, 500));
  }
  isRunning.value = false;
  currentRunningTokenId.value = null;
  message.success("批量宝库结束");
};

const batchbaoku45 = async () => {
  if (selectedTokens.value.length === 0) return;
  isRunning.value = true;
  shouldStop.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];
  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });
  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;
    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;
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
        message: `[${token.name}] 宝库战斗失败: ${error.message || "未知错误"}`,
        type: "error",
      });
    }
    currentProgress.value = 100;
    await new Promise((r) => setTimeout(r, 500));
  }
  isRunning.value = false;
  currentRunningTokenId.value = null;
  message.success("批量宝库结束");
};

const batchmengjing = async () => {
  if (selectedTokens.value.length === 0) return;
  isRunning.value = true;
  shouldStop.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];
  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });
  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;
    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;
    const token = tokens.value.find((t) => t.id === tokenId);
    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始一键宝库: ${token.name} ===`,
        type: "info",
      });
      await ensureConnection(tokenId);
      if (shouldStop.value) break;
      const mjbattleTeam = { 0: 107 };
      const dayOfWeek = new Date().getDay();
      if (
        (dayOfWeek === 0) ||
        (dayOfWeek === 1) ||
        (dayOfWeek === 3) ||
        (dayOfWeek === 4)
      ) {
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
        break;
      }
    } catch (error) {
      console.error(error);
      tokenStatus.value[tokenId] = "failed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `咸王梦境失败: ${error.message || "未知错误"}`,
        type: "error",
      });
    }
    currentProgress.value = 100;
    await new Promise((r) => setTimeout(r, 500));
  }
  isRunning.value = false;
  currentRunningTokenId.value = null;
  message.success("批量梦境结束");
};

const batchlingguanzi = async () => {
  if (selectedTokens.value.length === 0) return;
  isRunning.value = true;
  shouldStop.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];
  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });
  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;
    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;
    const token = tokens.value.find((t) => t.id === tokenId);
    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始一键领取盐罐: ${token.name} ===`,
        type: "info",
      });
      await ensureConnection(tokenId);
      if (shouldStop.value) break;
      await tokenStore.sendMessageWithPromise(
        tokenId,
        "bottlehelper_claim",
        {},
        5000,
      );
      await new Promise((r) => setTimeout(r, 500));
      tokenStatus.value[tokenId] = "completed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== ${token.name} 领取盐罐已完成 ===`,
        type: "success",
      });
    } catch (error) {
      console.error(error);
      tokenStatus.value[tokenId] = "failed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `领取盐罐失败: ${error.message || "未知错误"}`,
        type: "error",
      });
    }
    currentProgress.value = 100;
    await new Promise((r) => setTimeout(r, 500));
  }
  isRunning.value = false;
  currentRunningTokenId.value = null;
  message.success("批量领取盐罐结束");
};

const batchclubsign = async () => {
  if (selectedTokens.value.length === 0) return;
  isRunning.value = true;
  shouldStop.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];
  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });
  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;
    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;
    const token = tokens.value.find((t) => t.id === tokenId);
    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始一键俱乐部签到: ${token.name} ===`,
        type: "info",
      });
      await ensureConnection(tokenId);
      if (shouldStop.value) break;
      await tokenStore.sendMessageWithPromise(
        tokenId,
        "legion_signin",
        {},
        5000,
      );
      await new Promise((r) => setTimeout(r, 500));
      tokenStatus.value[tokenId] = "completed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== ${token.name} 俱乐部签到已完成 ===`,
        type: "success",
      });
    } catch (error) {
      console.error(error);
      tokenStatus.value[tokenId] = "failed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `俱乐部签到失败: ${error.message || "未知错误"}`,
        type: "error",
      });
    }
    currentProgress.value = 100;
    await new Promise((r) => setTimeout(r, 500));
  }
  isRunning.value = false;
  currentRunningTokenId.value = null;
  message.success("批量俱乐部签到结束");
};

const batcharenafight = async () => {
  if (selectedTokens.value.length === 0) return;
  isRunning.value = true;
  shouldStop.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];
  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });
  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;
    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;
    const token = tokens.value.find((t) => t.id === tokenId);
    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始一键竞技场战斗: ${token.name} ===`,
        type: "info",
      });
      await ensureConnection(tokenId);
      if (shouldStop.value) break;
      for (let i = 0; i < 3; i++) {
        // 开始竞技场
        await tokenStore.sendMessageWithPromise(tokenId, "arena_startarea", {});
        let targets;
        try {
          targets = await tokenStore.sendMessageWithPromise(
            tokenId,
            "arena_getareatarget",
            {},
          );
        } catch (err) {
          message.error(`获取竞技场目标失败：${err.message}`);
          break;
        }
        const targetId = pickArenaTargetId(targets);
        if (!targetId) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `[${token.name}] 未找到可用的竞技场目标`,
            type: "error",
          });
          break;
        }
        try {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "fight_startareaarena",
            { targetId },
          );
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 竞技场战斗 ${i + 1}/3`,
            type: "info",
          });
          await new Promise((r) => setTimeout(r, 500));
        } catch (e) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `[${token.name}] 竞技场对决失败`,
            type: "error",
          });
        }
      }
      await new Promise((r) => setTimeout(r, 500));
      tokenStatus.value[tokenId] = "completed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== ${token.name} 竞技场战斗已完成 ===`,
        type: "success",
      });
    } catch (error) {
      console.error(error);
      tokenStatus.value[tokenId] = "failed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 竞技场战斗失败: ${error.message || "未知错误"}`,
        type: "error",
      });
    }
    currentProgress.value = 100;
    await new Promise((r) => setTimeout(r, 500));
  }
  isRunning.value = false;
  currentRunningTokenId.value = null;
  message.success("批量竞技场战斗结束");
};

const batchAddHangUpTime = async () => {
  if (selectedTokens.value.length === 0) return;
  isRunning.value = true;
  shouldStop.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];
  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });
  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;
    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;
    const token = tokens.value.find((t) => t.id === tokenId);
    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始一键加钟: ${token.name} ===`,
        type: "info",
      });
      await ensureConnection(tokenId);
      for (let i = 0; i < 4; i++) {
        if (shouldStop.value) break;
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 执行加钟 ${i + 1}/4`,
          type: "info",
        });
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "system_mysharecallback",
          { isSkipShareCard: true, type: 2 },
          5000,
        );
        await new Promise((r) => setTimeout(r, 500));
      }
      tokenStatus.value[tokenId] = "completed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== ${token.name} 加钟完成 ===`,
        type: "success",
      });
    } catch (error) {
      console.error(error);
      tokenStatus.value[tokenId] = "failed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 加钟失败: ${error.message || "未知错误"}`,
        type: "error",
      });
    }
    currentProgress.value = 100;
    await new Promise((r) => setTimeout(r, 500));
  }
  isRunning.value = false;
  currentRunningTokenId.value = null;
  message.success("批量加钟结束");
};

const ensureConnection = async (tokenId) => {
  // Always fetch the latest token data from the store
  const latestToken = tokens.value.find((t) => t.id === tokenId);

  // 1. Check current status
  let status = tokenStore.getWebSocketStatus(tokenId);
  let connected = status === "connected";

  // 2. If not connected, try to connect
  if (!connected) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `[${latestToken.name}] 正在连接...`,
      type: "info",
    });
    tokenStore.createWebSocketConnection(
      tokenId,
      latestToken.token,
      latestToken.wsUrl,
    );
    connected = await waitForConnection(tokenId);

    if (!connected) {
      // First attempt failed
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${latestToken.name}] 连接超时，尝试重连...`,
        type: "warning",
      });

      // 3. Retry connection (Force reconnect)
      tokenStore.closeWebSocketConnection(tokenId);
      await new Promise((r) => setTimeout(r, 2000)); // Wait longer for cleanup

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${latestToken.name}] 正在重连...`,
        type: "info",
      });

      // Re-fetch token again just in case it was updated during the wait
      const refreshedToken = tokens.value.find((t) => t.id === tokenId);
      tokenStore.createWebSocketConnection(
        tokenId,
        refreshedToken.token,
        refreshedToken.wsUrl,
      );

      connected = await waitForConnection(tokenId);
    }
  }

  if (!connected) {
    throw new Error("连接失败 (重试后仍超时)");
  }

  // Initialize Game Data (Critical for Battle Version and Session)
  try {
    // Fetch Role Info first (Standard flow)
    await tokenStore.sendMessageWithPromise(
      tokenId,
      "role_getroleinfo",
      {},
      5000,
    );

    // Fetch Battle Version
    const res = await tokenStore.sendMessageWithPromise(
      tokenId,
      "fight_startlevel",
      {},
      5000,
    );
    if (res?.battleData?.version) {
      tokenStore.setBattleVersion(res.battleData.version);
    }
  } catch (e) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `[${latestToken.name}]  初始化数据失败: ${e.message}`,
      type: "warning",
    });
  }

  return true;
};

const climbTower = async () => {
  if (selectedTokens.value.length === 0) return;

  isRunning.value = true;
  shouldStop.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];

  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });

  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;

    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;

    const token = tokens.value.find((t) => t.id === tokenId);
    let switchFormation = false
    let originFormation;
    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始爬塔: ${token.name} ===`,
        type: "info",
      });

      await ensureConnection(tokenId);
      // 切换爬塔阵容
      //获取配置
      const settings = loadSettings(tokenId)
      originFormation = await formationTool.getCurrentFormation(tokenId,
          {
            onLog: (log) => addLog(log)
          });
      switchFormation = String(originFormation) !== String(settings.towerFormation)
      if(switchFormation){
        await formationTool.switchFormation(tokenId,
            settings.towerFormation,
            "爬塔阵容",
            {
              onLog: (log) => addLog(log),
              })
      }
      // Initial check
      // 模仿 TowerStatus.vue 的逻辑，同时请求 tower_getinfo 和 role_getroleinfo
      await tokenStore
        .sendMessageWithPromise(tokenId, "tower_getinfo", {}, 5000)
        .catch(() => { });
      let roleInfo = await tokenStore.sendGetRoleInfo(tokenId);
      let energy = roleInfo?.role?.tower?.energy || 0;
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 初始体力: ${energy}`,
        type: "info",
      });

      let count = 0;
      const MAX_CLIMB = 100;
      let consecutiveFailures = 0;

      while (energy > 0 && count < MAX_CLIMB) {
        if (shouldStop.value) break;

        try {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "fight_starttower",
            {},
            5000,
          );
          count++;
          consecutiveFailures = 0;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `[${token.name}] 爬塔第 ${count} 次`,
            type: "info",
          });

          // 增加等待时间，确保服务器数据更新
          await new Promise((r) => setTimeout(r, 2000));

          // Refresh energy - 同时发送 tower_getinfo 以确保数据最新
          tokenStore.sendMessage(tokenId, "tower_getinfo");
          roleInfo = await tokenStore.sendGetRoleInfo(tokenId);

          // 优先从 store 中获取最新的（虽然 sendGetRoleInfo 返回的也是最新的，但双重保险）
          const storeRoleInfo = tokenStore.gameData?.roleInfo;
          energy =
            storeRoleInfo?.role?.tower?.energy ??
            roleInfo?.role?.tower?.energy ??
            0;
        } catch (err) {
          // Check for specific error code indicating no energy/attempts left
          if (err.message && err.message.includes("200400")) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `[${token.name}] 爬塔次数已用完 (200400)`,
              type: "info",
            });
            break;
          }

          consecutiveFailures++;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `[${token.name}] 战斗出错: ${err.message} (重试 ${consecutiveFailures}/3)`,
            type: "warning",
          });

          if (consecutiveFailures >= 8) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `[${token.name}] 连续失败次数过多，停止爬塔`,
              type: "error",
            });
            break;
          }

          await new Promise((r) => setTimeout(r, 2000));

          // 尝试刷新体力，防止因体力不足导致的错误死循环
          try {
            roleInfo = await tokenStore.sendGetRoleInfo(tokenId);
            energy = roleInfo?.role?.tower?.energy || 0;
          } catch (e) {
            // 忽略刷新失败
          }
        }
      }

      tokenStatus.value[tokenId] = "completed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== ${token.name} 爬塔结束，共 ${count} 次 ===`,
        type: "success",
      });
    } catch (error) {
      console.error(error);
      tokenStatus.value[tokenId] = "failed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 爬塔失败: ${error.message}`,
        type: "error",
      });
    }finally {
      if(switchFormation){
        await formationTool.switchFormation(tokenId,
            originFormation,
            "还原阵容",
            {
              onLog: (log) => addLog(log),
            })
      }
    }
    currentProgress.value = 100;
    await new Promise((r) => setTimeout(r, 500));
  }

  isRunning.value = false;
  currentRunningTokenId.value = null;
  message.success("批量爬塔结束");
};

const batchStudy = async () => {
  if (selectedTokens.value.length === 0) return;

  isRunning.value = true;
  shouldStop.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];

  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });

  // Preload questions
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `正在加载题库...`,
    type: "info",
  });
  await preloadQuestions();

  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;

    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;

    const token = tokens.value.find((t) => t.id === tokenId);

    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始答题: ${token.name} ===`,
        type: "info",
      });

      await ensureConnection(tokenId);

      // Reset local study status
      tokenStore.gameData.studyStatus = {
        isAnswering: false,
        questionCount: 0,
        answeredCount: 0,
        status: "",
        timestamp: null,
      };

      // Send start command
      await tokenStore.sendMessageWithPromise(
        tokenId,
        "study_startgame",
        {},
        5000,
      );

      // Wait for completion
      let maxWait = 90; // 90 seconds timeout
      let completed = false;
      let lastStatus = "";

      while (maxWait > 0) {
        if (shouldStop.value) break;

        const status = tokenStore.gameData.studyStatus;

        if (status.status !== lastStatus) {
          lastStatus = status.status;
          if (status.status === "answering") {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `[${token.name}] 开始答题...`,
              type: "info",
            });
          } else if (status.status === "claiming_rewards") {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `[${token.name}] 正在领取奖励...`,
              type: "info",
            });
          }
        }

        if (status.status === "answering" && status.questionCount > 0) {
          // Update progress log occasionally or just rely on final success
          // addLog({ time: new Date().toLocaleTimeString(), message: `进度: ${status.answeredCount}/${status.questionCount}`, type: 'info' })
        }

        if (status.status === "completed") {
          completed = true;
          break;
        }

        await new Promise((r) => setTimeout(r, 1000));
        maxWait--;
      }

      if (completed) {
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 答题完成 ===`,
          type: "success",
        });
      } else {
        if (shouldStop.value) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `[${token.name}] 答题已停止`,
            type: "warning",
          });
        } else {
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `[${token.name}] 答题超时或未开始`,
            type: "error",
          });
        }
      }
    } catch (error) {
      console.error(error);
      tokenStatus.value[tokenId] = "failed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 答题失败: ${error.message}`,
        type: "error",
      });
    }

    currentProgress.value = 100;
    await new Promise((r) => setTimeout(r, 500));
  }

  isRunning.value = false;
  currentRunningTokenId.value = null;
  message.success("批量答题结束");
};

// 批量钓鱼补齐
const batchTopUpFish = async () => {
  if (selectedTokens.value.length === 0) return;
  isRunning.value = true;
  shouldStop.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];
  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });
  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;
    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;
    const token = tokens.value.find((t) => t.id === tokenId);
    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始钓鱼补齐: ${token.name} ===`,
        type: "info",
      });
      await ensureConnection(tokenId);
      // 获取月度任务进度
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 获取月度任务进度...`,
        type: "info",
      });
      const result = await tokenStore.sendMessageWithPromise(
        tokenId,
        "activity_get",
        {},
        10000,
      );
      const act = result?.activity || result?.body?.activity || result;

      if (!act) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 获取月度任务进度失败`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
        continue;
      }
      const myMonthInfo = act.myMonthInfo || {};
      const fishNum = Number(myMonthInfo?.["2"]?.num || 0);

      // 计算目标数量
      const monthProgress = calculateMonthProgress();
      const now = new Date();
      const daysInMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
      ).getDate();
      const dayOfMonth = now.getDate();
      const remainingDays = Math.max(0, daysInMonth - dayOfMonth);
      const shouldBe =
        remainingDays === 0
          ? FISH_TARGET
          : Math.min(FISH_TARGET, Math.ceil(monthProgress * FISH_TARGET));
      const need = Math.max(0, shouldBe - fishNum);
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 当前进度: ${fishNum}/${FISH_TARGET}，需要补齐: ${need}次`,
        type: "info",
      });
      if (need <= 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 当前进度已达标，无需补齐`,
          type: "success",
        });
        tokenStatus.value[tokenId] = "completed";
        continue;
      }
      // 执行钓鱼补齐
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 开始执行钓鱼补齐...`,
        type: "info",
      });
      // 检查免费次数
      let role = tokenStore.gameData?.roleInfo?.role;
      if (!role) {
        try {
          const roleInfo = await tokenStore.sendGetRoleInfo(tokenId);
          role = roleInfo?.role;
        } catch { }
      }
      let freeUsed = 0;
      const lastFreeTime = Number(
        role?.statisticsTime?.["artifact:normal:lottery:time"] || 0,
      );
      if (isTodayAvailable(lastFreeTime)) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 检测到今日免费钓鱼次数，开始消耗 3 次`,
          type: "info",
        });
        for (let i = 0; i < 3 && need > freeUsed && !shouldStop.value; i++) {
          try {
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "artifact_lottery",
              { lotteryNumber: 1, newFree: true, type: 1 },
              8000,
            );
            freeUsed++;
            await new Promise((r) => setTimeout(r, 500));
          } catch (e) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `[${token.name}] 免费钓鱼失败: ${e.message}`,
              type: "error",
            });
            break;
          }
        }
      }
      // 获取最新进度
      const updatedResult = await tokenStore.sendMessageWithPromise(
        tokenId,
        "activity_get",
        {},
        10000,
      );
      const updatedAct =
        updatedResult?.activity ||
        updatedResult?.body?.activity ||
        updatedResult;
      const updatedMyMonthInfo = updatedAct.myMonthInfo || {};
      const updatedFishNum = Number(updatedMyMonthInfo?.["2"]?.num || 0);
      let remaining = Math.max(0, shouldBe - updatedFishNum);
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 免费次数后进度: ${updatedFishNum}/${FISH_TARGET}，还需补齐: ${remaining}次`,
        type: "info",
      });
      if (remaining <= 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 已通过免费次数完成目标`,
          type: "success",
        });
        tokenStatus.value[tokenId] = "completed";
        continue;
      }
      // 付费钓鱼
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 开始付费钓鱼补齐: 共需 ${remaining} 次（每次最多10）`,
        type: "info",
      });

      while (remaining > 0 && !shouldStop.value) {
        const batch = Math.min(10, remaining);
        try {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "artifact_lottery",
            { lotteryNumber: batch, newFree: true, type: 1 },
            12000,
          );
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `[${token.name}] 完成 ${batch} 次付费钓鱼`,
            type: "info",
          });
          remaining -= batch;
          await new Promise((r) => setTimeout(r, 800));
        } catch (e) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `[${token.name}] 付费钓鱼失败: ${e.message}`,
            type: "error",
          });
          break;
        }
      }
      // 最终进度检查
      const finalResult = await tokenStore.sendMessageWithPromise(
        tokenId,
        "activity_get",
        {},
        10000,
      );
      const finalAct =
        finalResult?.activity || finalResult?.body?.activity || finalResult;
      const finalMyMonthInfo = finalAct.myMonthInfo || {};
      const finalFishNum = Number(finalMyMonthInfo?.["2"]?.num || 0);
      if (finalFishNum >= shouldBe || finalFishNum >= FISH_TARGET) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 钓鱼补齐完成，最终进度: ${finalFishNum}/${FISH_TARGET}`,
          type: "success",
        });
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 钓鱼补齐已停止，未达到目标，最终进度: ${finalFishNum}/${FISH_TARGET}`,
          type: "warning",
        });
      }
      tokenStatus.value[tokenId] = "completed";
    } catch (error) {
      console.error(error);
      tokenStatus.value[tokenId] = "failed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 钓鱼补齐失败: ${error.message}`,
        type: "error",
      });
    }
    currentProgress.value = 100;
    await new Promise((r) => setTimeout(r, 500));
  }
  isRunning.value = false;
  currentRunningTokenId.value = null;
  message.success("批量钓鱼补齐结束");
};
// 批量竞技场补齐
const batchTopUpArena = async () => {
  if (selectedTokens.value.length === 0) return;
  isRunning.value = true;
  shouldStop.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];
  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });
  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;
    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;
    const token = tokens.value.find((t) => t.id === tokenId);
    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始竞技场补齐: ${token.name} ===`,
        type: "info",
      });
      await ensureConnection(tokenId);
      // 获取月度任务进度
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 获取月度任务进度...`,
        type: "info",
      });
      const result = await tokenStore.sendMessageWithPromise(
        tokenId,
        "activity_get",
        {},
        10000,
      );
      const act = result?.activity || result?.body?.activity || result;

      if (!act) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 获取月度任务进度失败`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
        continue;
      }
      const myArenaInfo = act.myArenaInfo || {};
      const arenaNum = Number(myArenaInfo?.num || 0);

      // 计算目标数量
      const monthProgress = calculateMonthProgress();
      const now = new Date();
      const daysInMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
      ).getDate();
      const dayOfMonth = now.getDate();
      const remainingDays = Math.max(0, daysInMonth - dayOfMonth);
      const shouldBe =
        remainingDays === 0
          ? ARENA_TARGET
          : Math.min(ARENA_TARGET, Math.ceil(monthProgress * ARENA_TARGET));
      const need = Math.max(0, shouldBe - arenaNum);
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 当前进度: ${arenaNum}/${ARENA_TARGET}，需要补齐: ${need}次`,
        type: "info",
      });
      if (need <= 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 当前进度已达标，无需补齐`,
          type: "success",
        });
        tokenStatus.value[tokenId] = "completed";
        continue;
      }
      // 执行竞技场补齐
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 开始执行竞技场补齐...`,
        type: "info",
      });
      // 开始竞技场
      try {
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "arena_startarea",
          {},
          6000,
        );
      } catch (error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 开始竞技场失败: ${error.message}`,
          type: "warning",
        });
        // 继续执行，可能已经在竞技场中
      }
      let safetyCounter = 0;
      const safetyMaxFights = 100;
      let round = 1;
      let remaining = need;
      while (
        remaining > 0 &&
        safetyCounter < safetyMaxFights &&
        !shouldStop.value
      ) {
        const planFights = Math.ceil(remaining / 2); // 估计每场战斗可能获得2次进度
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 第${round}轮：计划战斗 ${planFights} 场`,
          type: "info",
        });

        for (
          let i = 0;
          i < planFights &&
          safetyCounter < safetyMaxFights &&
          !shouldStop.value;
          i++
        ) {
          let targets;
          try {
            targets = await tokenStore.sendMessageWithPromise(
              tokenId,
              "arena_getareatarget",
              {},
              8000,
            );
          } catch (err) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `[${token.name}] 获取竞技场目标失败：${err.message}`,
              type: "error",
            });
            break;
          }

          const targetId = pickArenaTargetId(targets);
          if (!targetId) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `[${token.name}] 未找到可用的竞技场目标`,
              type: "warning",
            });
            break;
          }

          try {
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "fight_startareaarena",
              { targetId },
              15000,
            );
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `[${token.name}] 竞技场战斗 ${i + 1}/${planFights} 完成`,
              type: "info",
            });
          } catch (e) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `[${token.name}] 竞技场对决失败：${e.message}`,
              type: "error",
            });
            // 继续尝试下一场战斗
          }

          safetyCounter++;
          await new Promise((r) => setTimeout(r, 1200));
        }

        // 获取最新进度
        const updatedResult = await tokenStore.sendMessageWithPromise(
          tokenId,
          "activity_get",
          {},
          10000,
        );
        const updatedAct =
          updatedResult?.activity ||
          updatedResult?.body?.activity ||
          updatedResult;
        const updatedMyArenaInfo = updatedAct.myArenaInfo || {};
        const updatedArenaNum = Number(updatedMyArenaInfo?.num || 0);
        remaining = Math.max(0, shouldBe - updatedArenaNum);

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 第${round}轮后进度: ${updatedArenaNum}/${ARENA_TARGET}，还需补齐: ${remaining}次`,
          type: "info",
        });

        round++;
      }
      // 最终进度检查
      const finalResult = await tokenStore.sendMessageWithPromise(
        tokenId,
        "activity_get",
        {},
        10000,
      );
      const finalAct =
        finalResult?.activity || finalResult?.body?.activity || finalResult;
      const finalMyArenaInfo = finalAct.myArenaInfo || {};
      const finalArenaNum = Number(finalMyArenaInfo?.num || 0);
      if (finalArenaNum >= shouldBe || finalArenaNum >= ARENA_TARGET) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 竞技场补齐完成，最终进度: ${finalArenaNum}/${ARENA_TARGET}`,
          type: "success",
        });
      } else if (safetyCounter >= safetyMaxFights) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 达到安全上限，竞技场补齐已停止，最终进度: ${finalArenaNum}/${ARENA_TARGET}`,
          type: "warning",
        });
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 竞技场补齐已停止，未达到目标，最终进度: ${finalArenaNum}/${ARENA_TARGET}`,
          type: "warning",
        });
      }
      tokenStatus.value[tokenId] = "completed";
    } catch (error) {
      console.error(error);
      tokenStatus.value[tokenId] = "failed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 竞技场补齐失败: ${error.message}`,
        type: "error",
      });
    }
    currentProgress.value = 100;
    await new Promise((r) => setTimeout(r, 500));
  }
  isRunning.value = false;
  currentRunningTokenId.value = null;
  message.success("批量竞技场补齐结束");
};

// --- Car Helper Functions ---
const normalizeCars = (raw) => {
  const r = raw || {};
  const body = r.body || r;
  const roleCar = body.roleCar || body.rolecar || {};

  // 优先从 roleCar.carDataMap 解析（id -> info）
  const carMap = roleCar.carDataMap || roleCar.cardatamap;
  if (carMap && typeof carMap === "object") {
    return Object.entries(carMap).map(([id, info], idx) => ({
      key: idx,
      id,
      ...(info || {}),
    }));
  }

  // 兜底
  let arr =
    body.cars || body.list || body.data || body.carList || body.vehicles || [];
  if (!Array.isArray(arr) && typeof arr === "object" && arr !== null)
    arr = Object.values(arr);
  if (Array.isArray(body) && arr.length === 0) arr = body;
  return (Array.isArray(arr) ? arr : []).map((it, idx) => ({
    key: idx,
    ...it,
  }));
};

const gradeLabel = (color) => {
  const map = {
    1: "绿·普通",
    2: "蓝·稀有",
    3: "紫·史诗",
    4: "橙·传说",
    5: "红·神话",
    6: "金·传奇",
  };
  return map[color] || "未知";
};
/**
 * 全部大奖
 **/
const MINOR_PRIZES = [
  { type: 3, itemId: 3201, value: 10 },  //万能
  { type: 3, itemId: 1001, value: 10 },  //招募
  { type: 3, itemId: 1022, value: 2000 },  //白玉
  { type: 2, itemId: 0, value: 2000 },
  { type: 3, itemId: 1023, value: 5 },   //彩玉
  { type: 3, itemId: 1022, value: 2500 },  //白玉
  { type: 3, itemId: 1001, value: 12 },  //招募
];
/**
 * 真正高价值大奖
 */
const MAJOR_PRIZES = MINOR_PRIZES.filter(p => p.itemId !== 3201);
const hasPrizeMatching = (rewards, prizeList) => {
  if (!Array.isArray(rewards)) return false;
  return prizeList.some((p) =>
      rewards.some(
          (r) =>
              r.type === p.type &&
              r.itemId === p.itemId &&
              Number(r.value || 0) >= p.value,
      ),
  );
};

const isMinorPrize = (rewards) => hasPrizeMatching(rewards, MINOR_PRIZES);
const isMajorPrize = (rewards) => hasPrizeMatching(rewards, MAJOR_PRIZES);

const countRacingRefreshTickets = (rewards) => {
  if (!Array.isArray(rewards)) return 0;
  return rewards.reduce(
    (acc, r) =>
      acc + (r.type === 3 && r.itemId === 35002 ? Number(r.value || 0) : 0),
    0,
  );
};

const shouldSendCar = (car, tickets,token) => {
  const rewards = Array.isArray(car?.rewards) ? car.rewards : [];
  if(isMajorPrize(rewards)){
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `[${token.name}] 车辆[${gradeLabel(car.color)}]包含高价值大奖，直接发车`,
      type: "info",
    });
    return true
  }
  if (tickets > 15) return false;
  if(isMinorPrize(rewards)){
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `[${token.name}] 车辆[${gradeLabel(car.color)}]包含大奖，刷新券只剩${tickets}张，直接发车`,
      type: "info",
    });
    return true
  }
  const color = Number(car?.color || 0);
  const racingTickets = countRacingRefreshTickets(rewards);
  let sendFlag = false;
  if (tickets >= 6) {
    sendFlag = color >= 5 || racingTickets >= 4;
  }else{
    sendFlag = color >= 4 || racingTickets >= 2
  }
  if(sendFlag){
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `[${token.name}] 车辆[${gradeLabel(car.color)}]将就发车`,
      type: "info",
    });
  }
  return sendFlag;
};

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const canClaim = (car) => {
  const t = Number(car?.sendAt || 0);
  if (!t) return false;
  const tsMs = t < 1e12 ? t * 1000 : t;
  return Date.now() - tsMs >= FOUR_HOURS_MS;
};

const batchSmartSendCar = async () => {
  if (selectedTokens.value.length === 0) return;
  if(!isCarActivityOpen.value){
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `今天不需要发车`,
      type: "warn",
    });
    return; // 不是周一二三，直接退出，不执行任务
  }

  isRunning.value = true;
  shouldStop.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];

  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });

  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;

    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;

    const token = tokens.value.find((t) => t.id === tokenId);

    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始智能发车: ${token.name} ===`,
        type: "info",
      });

      await ensureConnection(tokenId);

      // 1. Fetch Car Info
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 获取车辆信息...`,
        type: "info",
      });
      const res = await tokenStore.sendMessageWithPromise(
        tokenId,
        "car_getrolecar",
        {},
        10000,
      );
      let carList = normalizeCars(res?.body ?? res);

      // 2. Fetch Tickets
      let refreshTickets = 0;
      try {
        const roleRes = await tokenStore.sendMessageWithPromise(
          tokenId,
          "role_getroleinfo",
          {},
          10000,
        );
        const qty = roleRes?.role?.items?.[35002]?.quantity;
        refreshTickets = Number(qty || 0);
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 剩余车票: ${refreshTickets}`,
          type: "info",
        });
      } catch (_) { }

      // 3. Process Cars
      for (const car of carList) {
        if (shouldStop.value) break;

        if (Number(car.sendAt || 0) !== 0) continue; // Already sent

        // Check if we should send immediately
        if (shouldSendCar(car, refreshTickets,token)) {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "car_send",
            {
              carId: String(car.id),
              helperId: 0,
              text: "",
              isUpgrade: false,
            },
            10000,
          );
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }

        // Try to refresh
        let shouldRefresh = false;
        const free = Number(car.refreshCount ?? 0) === 0;
        if (refreshTickets >= 6) shouldRefresh = true;
        else if (free) shouldRefresh = true;
        else {
          // No tickets and not free, just send
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `[${token.name}] 车辆[${gradeLabel(car.color)}]不满足条件且无刷新次数，直接发车`,
            type: "warning",
          });
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "car_send",
            {
              carId: String(car.id),
              helperId: 0,
              text: "",
              isUpgrade: false,
            },
            10000,
          );
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }

        // Refresh loop
        while (shouldRefresh) {
          if (shouldStop.value) break;

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `[${token.name}] 车辆[${gradeLabel(car.color)}]尝试刷新...`,
            type: "info",
          });
          const resp = await tokenStore.sendMessageWithPromise(
            tokenId,
            "car_refresh",
            { carId: String(car.id) },
            10000,
          );
          const data = resp?.car || resp?.body?.car || resp;

          // Update local car info
          if (data && typeof data === "object") {
            if (data.color != null) car.color = Number(data.color);
            if (data.refreshCount != null)
              car.refreshCount = Number(data.refreshCount);
            if (data.rewards != null) car.rewards = data.rewards;
          }

          // Update tickets
          try {
            const roleRes = await tokenStore.sendMessageWithPromise(
              tokenId,
              "role_getroleinfo",
              {},
              5000,
            );
            refreshTickets = Number(
              roleRes?.role?.items?.[35002]?.quantity || 0,
            );
          } catch (_) { }

          // Check if good enough now
          if (shouldSendCar(car, refreshTickets,token)) {
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "car_send",
              {
                carId: String(car.id),
                helperId: 0,
                text: "",
                isUpgrade: false,
              },
              10000,
            );
            await new Promise((r) => setTimeout(r, 500));
            break;
          }

          // Check if can continue refreshing
          const freeNow = Number(car.refreshCount ?? 0) === 0;
          if (refreshTickets >= 6) shouldRefresh = true;
          else if (freeNow) shouldRefresh = true;
          else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `[${token.name}] 刷新后车辆[${gradeLabel(car.color)}]仍不满足条件且无刷新次数，发车`,
              type: "warning",
            });
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "car_send",
              {
                carId: String(car.id),
                helperId: 0,
                text: "",
                isUpgrade: false,
              },
              10000,
            );
            await new Promise((r) => setTimeout(r, 500));
            break;
          }

          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      tokenStatus.value[tokenId] = "completed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== ${token.name} 智能发车完成 ===`,
        type: "success",
      });
    } catch (error) {
      console.error(error);
      tokenStatus.value[tokenId] = "failed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 智能发车失败: ${error.message}`,
        type: "error",
      });
    }

    currentProgress.value = 100;
    await new Promise((r) => setTimeout(r, 500));
  }

  isRunning.value = false;
  currentRunningTokenId.value = null;
  message.success("批量智能发车结束");
};
const doClaimCars = async () => {
  if (selectedTokens.value.length === 0) return;
  isRunning.value = true;
  shouldStop.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];

  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });

  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;

    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;

    const token = tokens.value.find((t) => t.id === tokenId);

    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始一键收车: ${token.name} ===`,
        type: "info",
      });

      await ensureConnection(tokenId);

      // 1. Fetch Car Info
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 获取车辆信息...`,
        type: "info",
      });
      const res = await tokenStore.sendMessageWithPromise(
          tokenId,
          "car_getrolecar",
          {},
          10000,
      );
      let carList = normalizeCars(res?.body ?? res);
      let refreshlevel = res?.roleCar?.research?.[1] || 0;

      // 2. Claim Cars
      let claimedCount = 0;
      for (const car of carList) {
        if (canClaim(car)) {
          try {
            await tokenStore.sendMessageWithPromise(
                tokenId,
                "car_claim",
                { carId: String(car.id) },
                10000,
            );
            claimedCount++;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `[${token.name}] 收车成功: ${gradeLabel(car.color)}`,
              type: "success",
            });
            const roleRes = await tokenStore.sendMessageWithPromise(
                tokenId,
                "role_getroleinfo",
                {},
                5000,
            );
            let refreshpieces = Number(
                roleRes?.role?.items?.[35009]?.quantity || 0,
            );
            while (refreshlevel < CarresearchItem.length && refreshpieces >= CarresearchItem[refreshlevel]) {
              try {
                await tokenStore.sendMessageWithPromise(tokenId, 'car_research', { researchId: 1 }, 5000);
                refreshlevel++;

                // 更新refreshpieces数量
                const updatedRoleRes = await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "role_getroleinfo",
                    {},
                    5000,
                );
                refreshpieces = Number(
                    updatedRoleRes?.role?.items?.[35009]?.quantity || 0,
                );

                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `[${token.name}] 执行车辆改装升级，当前等级: ${refreshlevel}`,
                  type: "success",
                });

                await new Promise((r) => setTimeout(r, 300));
              } catch (e) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `[${token.name}] 车辆改装升级失败: ${e.message}`,
                  type: "error",
                });
                break; // 升级失败时跳出循环
              }
            }
          } catch (e) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `[${token.name}] 收车失败: ${e.message}`,
              type: "warning",
            });
          }
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      if (claimedCount === 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 没有可收取的车辆`,
          type: "info",
        });
      }

      tokenStatus.value[tokenId] = "completed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== ${token.name} 收车完成，共收取 ${claimedCount} 辆 ===`,
        type: "success",
      });
    } catch (error) {
      console.error(error);
      tokenStatus.value[tokenId] = "failed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 收车失败: ${error.message}`,
        type: "error",
      });
    }

    currentProgress.value = 100;
    await new Promise((r) => setTimeout(r, 500));
  }

  isRunning.value = false;
  currentRunningTokenId.value = null;
  message.success("批量一键收车结束");
};
const batchClaimCars = async () => {
  if(!isCarActivityOpen.value){
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `今天不需要收车`,
      type: "warn",
    });
    return;
  }
  await doClaimCars();
};

const startBatch = async () => {
  if (selectedTokens.value.length === 0) return;

  isRunning.value = true;
  shouldStop.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];

  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });

  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;

    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;

    let retryCount = 0;
    const MAX_RETRIES = 1;
    let success = false;

    while (retryCount <= MAX_RETRIES && !success) {
      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        if (retryCount === 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 开始执行: ${token.name} ===`,
            type: "info",
          });
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 尝试重试: ${token.name} (第${retryCount}次) ===`,
            type: "info",
          });
        }

        await ensureConnection(tokenId);

        // Run tasks
        await runner.run(tokenId, {
          onLog: (log) => addLog(log),
          onProgress: (p) => {
            currentProgress.value = p;
          },
        });

        success = true;
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 执行完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        if (retryCount < MAX_RETRIES) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `[${token.name}] 执行出错: ${error.message}，等待3秒后重试...`,
            type: "warning",
          });
          // Wait for potential token refresh in store
          await new Promise((r) => setTimeout(r, 3000));
          retryCount++;
        } else {
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `[${token.name}] 执行失败: ${error.message}`,
            type: "error",
          });
        }
      }
    }

    // Optional: Disconnect if it wasn't connected before?
    // For now, keep it connected or let the store manage it.
    // Maybe wait a bit before next
    await new Promise((r) => setTimeout(r, 1000));
  }

  isRunning.value = false;
  currentRunningTokenId.value = null;
  message.success("批量任务执行结束");
};

// --- 批量助手函数 ---
const batchClaimBoxPointReward = async () => {
  if (selectedTokens.value.length === 0) return;

  isRunning.value = true;
  shouldStop.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];

  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });

  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;

    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;

    const token = tokens.value.find((t) => t.id === tokenId);

    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始领取宝箱积分: ${token.name} ===`,
        type: "info",
      });

      await ensureConnection(tokenId);

      await tokenStore.sendMessageWithPromise(
        tokenId,
        "item_batchclaimboxpointreward",
        {},
        5000,
      );
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 宝箱积分领取成功`,
        type: "success",
      });

      await tokenStore.sendMessage(tokenId, "role_getroleinfo");
      tokenStatus.value[tokenId] = "completed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== ${token.name} 领取完成 ===`,
        type: "success",
      });
    } catch (error) {
      console.error(error);
      tokenStatus.value[tokenId] = "failed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 领取失败: ${error.message}`,
        type: "error",
      });
    }

    currentProgress.value = 100;
    await new Promise((r) => setTimeout(r, 500));
  }

  isRunning.value = false;
  currentRunningTokenId.value = null;
  message.success("批量领取宝箱积分结束");
};

const batchOpenBox = async () => {
  if (selectedTokens.value.length === 0) return;

  isRunning.value = true;
  shouldStop.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];

  const boxType = helperSettings.boxType;
  const totalCount = helperSettings.count;
  const batches = Math.floor(totalCount / 10);
  const remainder = totalCount % 10;
  const boxNames = {
    2001: "木质宝箱",
    2002: "青铜宝箱",
    2003: "黄金宝箱",
    2004: "铂金宝箱",
  };

  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });

  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;

    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;

    const token = tokens.value.find((t) => t.id === tokenId);

    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始批量开箱: ${token.name} ===`,
        type: "info",
      });
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 宝箱类型: ${boxNames[boxType]}, 数量: ${totalCount}`,
        type: "info",
      });

      await ensureConnection(tokenId);

      for (let i = 0; i < batches; i++) {
        if (shouldStop.value) break;
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "item_openbox",
          { itemId: boxType, number: 10 },
          5000,
        );
        currentProgress.value = Math.floor(
          ((i + 1) / (batches + (remainder > 0 ? 1 : 0))) * 100,
        );
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 开箱进度: ${(i + 1) * 10}/${totalCount}`,
          type: "info",
        });
        await new Promise((r) => setTimeout(r, 300));
      }

      if (remainder > 0 && !shouldStop.value) {
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "item_openbox",
          { itemId: boxType, number: remainder },
          5000,
        );
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 开箱进度: ${totalCount}/${totalCount}`,
          type: "info",
        });
      }
      await tokenStore.sendMessageWithPromise(
        tokenId,
        "item_batchclaimboxpointreward",
      );
      await new Promise((r) => setTimeout(r, 500));
      await tokenStore.sendMessage(tokenId, "role_getroleinfo");
      tokenStatus.value[tokenId] = "completed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== ${token.name} 开箱完成 ===`,
        type: "success",
      });
    } catch (error) {
      console.error(error);
      tokenStatus.value[tokenId] = "failed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 开箱失败: ${error.message}`,
        type: "error",
      });
    }

    currentProgress.value = 100;
    await new Promise((r) => setTimeout(r, 500));
  }

  isRunning.value = false;
  currentRunningTokenId.value = null;
  message.success("批量开箱结束");
};

const batchFish = async () => {
  if (selectedTokens.value.length === 0) return;

  isRunning.value = true;
  shouldStop.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];

  const fishType = helperSettings.fishType;
  const totalCount = helperSettings.count;
  const batches = Math.floor(totalCount / 10);
  const remainder = totalCount % 10;
  const fishNames = { 1: "普通鱼竿", 2: "黄金鱼竿" };

  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });

  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;

    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;

    const token = tokens.value.find((t) => t.id === tokenId);

    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始批量钓鱼: ${token.name} ===`,
        type: "info",
      });
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 鱼竿类型: ${fishNames[fishType]}, 数量: ${totalCount}`,
        type: "info",
      });

      await ensureConnection(tokenId);

      for (let i = 0; i < batches; i++) {
        if (shouldStop.value) break;
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "artifact_lottery",
          { type: fishType, lotteryNumber: 10, newFree: true },
          5000,
        );
        currentProgress.value = Math.floor(
          ((i + 1) / (batches + (remainder > 0 ? 1 : 0))) * 100,
        );
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 钓鱼进度: ${(i + 1) * 10}/${totalCount}`,
          type: "info",
        });
        await new Promise((r) => setTimeout(r, 300));
      }

      if (remainder > 0 && !shouldStop.value) {
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "artifact_lottery",
          { type: fishType, lotteryNumber: remainder, newFree: true },
          5000,
        );
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 钓鱼进度: ${totalCount}/${totalCount}`,
          type: "info",
        });
      }

      await tokenStore.sendMessage(tokenId, "role_getroleinfo");
      tokenStatus.value[tokenId] = "completed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== ${token.name} 钓鱼完成 ===`,
        type: "success",
      });
    } catch (error) {
      console.error(error);
      tokenStatus.value[tokenId] = "failed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 钓鱼失败: ${error.message}`,
        type: "error",
      });
    }

    currentProgress.value = 100;
    await new Promise((r) => setTimeout(r, 500));
  }

  isRunning.value = false;
  currentRunningTokenId.value = null;
  message.success("批量钓鱼结束");
};

const batchRecruit = async () => {
  if (selectedTokens.value.length === 0) return;

  isRunning.value = true;
  shouldStop.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];

  const totalCount = helperSettings.count;
  const batches = Math.floor(totalCount / 10);
  const remainder = totalCount % 10;

  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });

  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;

    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;

    const token = tokens.value.find((t) => t.id === tokenId);

    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始批量招募: ${token.name} ===`,
        type: "info",
      });
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 招募数量: ${totalCount}`,
        type: "info",
      });

      await ensureConnection(tokenId);

      for (let i = 0; i < batches; i++) {
        if (shouldStop.value) break;
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "hero_recruit",
          { recruitType: 1, recruitNumber: 10 },
          5000,
        );
        currentProgress.value = Math.floor(
          ((i + 1) / (batches + (remainder > 0 ? 1 : 0))) * 100,
        );
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 招募进度: ${(i + 1) * 10}/${totalCount}`,
          type: "info",
        });
        await new Promise((r) => setTimeout(r, 300));
      }

      if (remainder > 0 && !shouldStop.value) {
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "hero_recruit",
          { recruitType: 1, recruitNumber: remainder },
          5000,
        );
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 招募进度: ${totalCount}/${totalCount}`,
          type: "info",
        });
      }

      await tokenStore.sendMessage(tokenId, "role_getroleinfo");
      tokenStatus.value[tokenId] = "completed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== ${token.name} 招募完成 ===`,
        type: "success",
      });
    } catch (error) {
      console.error(error);
      tokenStatus.value[tokenId] = "failed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 招募失败: ${error.message}`,
        type: "error",
      });
    }

    currentProgress.value = 100;
    await new Promise((r) => setTimeout(r, 500));
  }

  isRunning.value = false;
  currentRunningTokenId.value = null;
  message.success("批量招募结束");
};

const batchClaimFreeEnergy = async () => {
  if (selectedTokens.value.length === 0) return;
  isRunning.value = true;
  shouldStop.value = false;

  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });

  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;
    currentRunningTokenId.value = tokenId;
    tokenStatus.value[tokenId] = "running";
    currentProgress.value = 0;

    const token = tokens.value.find((t) => t.id === tokenId);
    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始领取怪异塔免费道具: ${token.name} ===`,
        type: "info",
      });

      await ensureConnection(tokenId);

      // 获取免费道具数量
      const freeEnergyResult = await tokenStore.sendMessageWithPromise(
        tokenId,
        'mergebox_getinfo',
        {
          actType: 1
        },
        5000
      );

      if (freeEnergyResult && freeEnergyResult.mergeBox.freeEnergy > 0) {
        // 领取免费道具
        await tokenStore.sendMessageWithPromise(
          tokenId,
          'mergebox_claimfreeenergy',
          {
            actType: 1
          },
          5000
        );
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 成功领取免费道具${freeEnergyResult.mergeBox.freeEnergy}个`,
          type: "success"
        });
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `===  ${token.name} 暂无免费道具可领取`,
          type: "success"
        });
      }

      tokenStatus.value[tokenId] = "completed";
    } catch (error) {
      console.error(error);
      tokenStatus.value[tokenId] = "failed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== ${token.name} 领取免费道具失败: ${error.message || "未知错误"}`,
        type: "error",
      });
    }
    currentProgress.value = 100;
    await new Promise((r) => setTimeout(r, 500));
  }

  isRunning.value = false;
  currentRunningTokenId.value = null;
  message.success("批量领取怪异塔免费道具结束");
};

const stopBatch = () => {
  shouldStop.value = true;
  addLog({
    time: new Date().toLocaleTimeString(),
    message: "正在停止...",
    type: "warning",
  });
};
</script>

<style scoped>
.batch-daily-tasks {
  padding: 20px;
  height: 100vh;
  box-sizing: border-box;
  overflow: hidden;
}

.main-layout {
  display: flex;
  gap: 20px;
  height: 100%;
  overflow: hidden;
}

.left-column {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
  padding-right: 8px;
}

.right-column {
  width: 400px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 700px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.token-item {
  display: flex;
  align-items: center;
}

.log-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.log-card :deep(.n-card__content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.log-header-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.log-container {
  flex: 1;
  overflow-y: auto;
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
  font-family: monospace;
  min-height: 200px;
}

.log-item {
  margin-bottom: 4px;
  font-size: 12px;
}

.log-item.error {
  color: #d03050;
}

.log-item.success {
  color: #18a058;
}

.log-item.warning {
  color: #f0a020;
}

.log-item.info {
  color: #333;
}

.time {
  color: #999;
  margin-right: 8px;
}

.token-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 8px;
}

/* Settings Modal Styles */
.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-label {
  font-size: 14px;
  color: #666;
}

.setting-switches {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.switch-row:last-child {
  border-bottom: none;
}

.switch-label {
  font-size: 14px;
  color: #666;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .right-column {
    width: 380px;
  }
}

@media (max-width: 992px) {
  .batch-daily-tasks {
    height: auto;
    overflow: visible;
  }

  .main-layout {
    flex-direction: column;
    height: auto;
    overflow: visible;
  }

  .left-column {
    overflow-y: visible;
    padding-right: 0;
  }

  .right-column {
    width: 100%;
    height: auto;
    flex-shrink: 0;
  }

  .log-container {
    height: 300px;
    min-height: 300px;
  }
}

@media (max-width: 768px) {
  .batch-daily-tasks {
    padding: 12px;
    height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .main-layout {
    height: auto;
    overflow: visible;
    flex-direction: column;
  }

  .left-column {
    overflow: visible;
    padding-right: 0;
    flex: none;
    height: auto;
  }

  .right-column {
    height: auto;
    width: 100%;
    flex: none;
  }

  .page-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .page-header .actions {
    display: flex;
    gap: 8px;
  }

  .log-card {
    height: auto !important;
  }

  .log-card :deep(.n-card__content) {
    flex: none !important;
    overflow: visible !important;
    display: block !important;
  }

  .log-container {
    height: 300px;
    min-height: 300px;
    flex: none !important;
  }

  .log-header-controls {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
