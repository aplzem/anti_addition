// 后台脚本 - 监控知乎使用时长
let zhihuTabs = new Map(); // 存储知乎标签页开始时间
let dailyUsage = 0; // 今日使用时长（秒）
let dailyLimit = 3600; // 默认限制1小时
let reminderInterval = 5; // 默认弹窗间隔5秒
let isOverLimit = false;
let reminderTimer = null;

// 初始化
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    dailyLimit: 3600,
    dailyUsage: 0,
    reminderInterval: 5,
    lastResetDate: new Date().toDateString()
  });
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('zhihu.com')) {
    startTracking(tabId);
  }
});

// 监听标签页激活
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url && tab.url.includes('zhihu.com')) {
      startTracking(activeInfo.tabId);
    } else {
      stopTracking(activeInfo.tabId);
    }
  });
});

// 监听标签页关闭
chrome.tabs.onRemoved.addListener((tabId) => {
  stopTracking(tabId);
});

// 开始跟踪
function startTracking(tabId) {
  if (!zhihuTabs.has(tabId)) {
    zhihuTabs.set(tabId, Date.now());
  }
}

// 停止跟踪
function stopTracking(tabId) {
  if (zhihuTabs.has(tabId)) {
    const startTime = zhihuTabs.get(tabId);
    const duration = Math.floor((Date.now() - startTime) / 1000);
    dailyUsage += duration;
    zhihuTabs.delete(tabId);
    chrome.storage.local.set({ dailyUsage: dailyUsage });
    checkDailyLimit();
  }
}

// 检查限制
function checkDailyLimit() {
  if (dailyUsage >= dailyLimit && !isOverLimit) {
    isOverLimit = true;
    startReminder();
  }
}

// 开始提醒
function startReminder() {
  if (reminderTimer) clearInterval(reminderTimer);
  
  reminderTimer = setInterval(() => {
    chrome.tabs.query({ url: "*://*.zhihu.com/*" }, (tabs) => {
      tabs.forEach(tab => {
        try {
          chrome.tabs.sendMessage(tab.id, { 
            action: 'showReminder',
            usage: dailyUsage,
            limit: dailyLimit
          }).catch(error => {
            console.log('Failed to send reminder to tab:', tab.id, error);
          });
        } catch (error) {
          console.log('Error sending reminder to tab:', tab.id, error);
        }
      });
    });
  }, reminderInterval * 1000); // 使用设置的间隔时间
}

// 停止提醒
function stopReminder() {
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
  }
  isOverLimit = false;
}

// 重置使用时长
function resetDailyUsage() {
  dailyUsage = 0;
  isOverLimit = false;
  stopReminder();
  chrome.storage.local.set({ 
    dailyUsage: 0,
    lastResetDate: new Date().toDateString()
  });
}

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === 'getUsage') {
      sendResponse({ dailyUsage, dailyLimit, reminderInterval, isOverLimit });
    } else if (request.action === 'setSettings') {
      dailyLimit = request.limit;
      reminderInterval = request.reminderInterval;
      chrome.storage.local.set({ 
        dailyLimit: request.limit,
        reminderInterval: request.reminderInterval
      });
      checkDailyLimit();
      sendResponse({ success: true });
    } else if (request.action === 'acknowledgeReminder') {
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.log('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }
  
  // 返回true表示异步响应
  return true;
});

// 每10秒更新使用时长
setInterval(() => {
  const now = Date.now();
  zhihuTabs.forEach((startTime, tabId) => {
    const duration = Math.floor((now - startTime) / 1000);
    dailyUsage += duration;
    zhihuTabs.set(tabId, now);
  });
  chrome.storage.local.set({ dailyUsage: dailyUsage });
  checkDailyLimit();
}, 10000); // 每10秒更新

// 启动时加载数据
chrome.storage.local.get(['dailyUsage', 'dailyLimit', 'reminderInterval', 'lastResetDate'], (result) => {
  dailyUsage = result.dailyUsage || 0;
  dailyLimit = result.dailyLimit || 3600;
  reminderInterval = result.reminderInterval || 5;
  
  const today = new Date().toDateString();
  if (result.lastResetDate !== today) {
    resetDailyUsage();
  }
}); 