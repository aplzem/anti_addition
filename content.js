// 内容脚本 - 显示提醒对话框和计时器
let reminderDialog = null;
let reminderOverlay = null;
let timerElement = null;
let timerInterval = null;

// 创建计时器元素
function createTimer() {
  if (timerElement) return;
  
  timerElement = document.createElement('div');
  timerElement.id = 'zhihu-timer';
  timerElement.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 8px 12px;
    border-radius: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
    font-weight: 500;
    z-index: 9998;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.3s ease;
    cursor: pointer;
    user-select: none;
  `;
  
  timerElement.innerHTML = `
    <span style="margin-right: 6px;">⏱️</span>
    <span id="timer-text">0小时0分钟0秒</span>
  `;
  
  // 添加悬停效果
  timerElement.addEventListener('mouseenter', () => {
    timerElement.style.background = 'rgba(0, 0, 0, 0.8)';
    timerElement.style.transform = 'scale(1.05)';
  });
  
  timerElement.addEventListener('mouseleave', () => {
    timerElement.style.background = 'rgba(0, 0, 0, 0.7)';
    timerElement.style.transform = 'scale(1)';
  });
  
  // 点击切换透明度（半透明/完全不透明）
  timerElement.addEventListener('click', () => {
    if (timerElement.style.opacity === '0.3') {
      timerElement.style.opacity = '1';
    } else {
      timerElement.style.opacity = '0.3';
    }
  });
  
  // 添加右键菜单，防止意外隐藏
  timerElement.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
  
  document.body.appendChild(timerElement);
  
  // 开始更新计时器
  startTimerUpdate();
}

// 开始更新计时器
function startTimerUpdate() {
  if (timerInterval) clearInterval(timerInterval);
  
  // 立即获取一次数据
  updateTimerFromBackground();
  
  // 每10秒更新一次，与后台脚本同步
  timerInterval = setInterval(() => {
    updateTimerFromBackground();
  }, 10000);
}

// 从后台获取数据并更新计时器
async function updateTimerFromBackground() {
  try {
    const response = await sendMessage({ action: 'getUsage' });
    if (response && response.dailyUsage !== undefined) {
      updateTimerDisplay(response.dailyUsage);
    }
  } catch (error) {
    console.log('Failed to update timer:', error);
  }
}

// 更新计时器显示
function updateTimerDisplay(seconds) {
  if (!timerElement) return;
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const timerText = timerElement.querySelector('#timer-text');
  if (timerText) {
    timerText.textContent = `${hours}小时${minutes}分钟`;
  }
  
  // 根据使用时长改变颜色
  if (seconds >= 3600) { // 超过1小时
    timerElement.style.background = 'rgba(220, 53, 69, 0.8)'; // 红色
  } else if (seconds >= 1800) { // 超过30分钟
    timerElement.style.background = 'rgba(255, 193, 7, 0.8)'; // 黄色
  } else {
    timerElement.style.background = 'rgba(0, 0, 0, 0.7)'; // 默认黑色
  }
}

// 安全的消息发送函数
function sendMessage(message) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

// 创建提醒对话框
function createReminderDialog(usage, limit) {
  if (reminderDialog) reminderDialog.remove();
  if (reminderOverlay) reminderOverlay.remove();
  
  reminderDialog = document.createElement('div');
  reminderDialog.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: white; border: 2px solid #ff6b6b; border-radius: 10px;
    padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    min-width: 300px; text-align: center;
  `;
  
  const hours = Math.floor(usage / 3600);
  const minutes = Math.floor((usage % 3600) / 60);
  const seconds = usage % 60;
  
  reminderDialog.innerHTML = `
    <div style="margin-bottom: 15px;">
      <div style="font-size: 20px; color: #ff6b6b; margin-bottom: 10px;">使用时长提醒</div>
      <div style="font-size: 14px; color: #333; margin-bottom: 15px;">
        您今天在知乎的使用时长已达到设定限制<br>
        已使用: <strong>${hours}小时${minutes}分钟${seconds}秒</strong>
      </div>
    </div>
    <button id="acknowledge-btn" style="
      background: #ff6b6b; color: white; border: none; padding: 10px 20px;
      border-radius: 5px; cursor: pointer; font-size: 14px;
    ">确认</button>
  `;
  
  const acknowledgeBtn = reminderDialog.querySelector('#acknowledge-btn');
  acknowledgeBtn.addEventListener('click', () => {
    removeReminderDialog();
    sendMessage({ action: 'acknowledgeReminder' });
  });
  
  document.body.appendChild(reminderDialog);
  
  // 添加背景遮罩
  reminderOverlay = document.createElement('div');
  reminderOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); z-index: 9999;
  `;
  reminderOverlay.id = 'zhihu-reminder-overlay';
  document.body.appendChild(reminderOverlay);
}

// 移除提醒对话框
function removeReminderDialog() {
  if (reminderDialog) {
    reminderDialog.remove();
    reminderDialog = null;
  }
  
  if (reminderOverlay) {
    reminderOverlay.remove();
    reminderOverlay = null;
  }
  
  // 也检查并移除可能存在的旧遮罩
  const oldOverlay = document.getElementById('zhihu-reminder-overlay');
  if (oldOverlay) {
    oldOverlay.remove();
  }
}

// 移除计时器
function removeTimer() {
  if (timerElement) {
    timerElement.remove();
    timerElement = null;
  }
  
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showReminder') {
    createReminderDialog(request.usage, request.limit);
  }
});

// 页面加载完成后创建计时器
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createTimer);
} else {
  createTimer();
}

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  removeReminderDialog();
  removeTimer();
}); 