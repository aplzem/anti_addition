// 弹窗脚本
document.addEventListener('DOMContentLoaded', function() {
  const hoursInput = document.getElementById('hours');
  const minutesInput = document.getElementById('minutes');
  const secondsInput = document.getElementById('seconds');
  const reminderIntervalInput = document.getElementById('reminder-interval');
  const saveSettingsBtn = document.getElementById('save-settings');
  const statusEl = document.getElementById('status');
  
  // 安全的消息发送函数
  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Message error:', chrome.runtime.lastError.message);
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
  
  // 加载当前设置
  async function loadCurrentSettings() {
    try {
      const response = await sendMessage({ action: 'getUsage' });
      if (response) {
        hoursInput.value = Math.floor(response.dailyLimit / 3600);
        minutesInput.value = Math.floor((response.dailyLimit % 3600) / 60);
        secondsInput.value = response.dailyLimit % 60;
        reminderIntervalInput.value = response.reminderInterval || 5;
      }
    } catch (error) {
      console.log('Failed to load settings:', error);
      // 使用默认值
      hoursInput.value = 1;
      minutesInput.value = 0;
      secondsInput.value = 0;
      reminderIntervalInput.value = 5;
    }
  }
  
  // 显示状态消息
  function showStatus(message, type = 'success') {
    statusEl.textContent = message;
    statusEl.className = `status ${type} show`;
  }
  
  // 隐藏状态消息
  function hideStatus() {
    statusEl.classList.remove('show');
  }
  
  // 保存设置
  saveSettingsBtn.addEventListener('click', async () => {
    const hours = parseInt(hoursInput.value) || 0;
    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;
    const reminderInterval = parseInt(reminderIntervalInput.value) || 5;
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    
    if (totalSeconds === 0) {
      showStatus('请设置有效的使用时长限制！', 'error');
      setTimeout(hideStatus, 3000);
      return;
    }
    
    if (reminderInterval < 1 || reminderInterval > 60) {
      showStatus('弹窗间隔时间必须在1-60秒之间！', 'error');
      setTimeout(hideStatus, 3000);
      return;
    }
    
    // 禁用按钮，防止重复点击
    saveSettingsBtn.disabled = true;
    saveSettingsBtn.textContent = '⏳ 保存中...';
    
    try {
      const response = await sendMessage({ 
        action: 'setSettings', 
        limit: totalSeconds,
        reminderInterval: reminderInterval
      });
      
      if (response && response.success) {
        // 显示成功状态
        showStatus('✅ 设置已保存');
        
        // 1.5秒后自动关闭弹窗
        setTimeout(() => {
          window.close();
        }, 1500);
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      console.log('Save settings error:', error);
      // 保存失败，恢复按钮状态
      saveSettingsBtn.disabled = false;
      saveSettingsBtn.textContent = '💾 保存设置';
      showStatus('❌ 保存失败，请重试', 'error');
      setTimeout(hideStatus, 3000);
    }
  });
  
  // 输入验证
  hoursInput.addEventListener('input', () => {
    let value = parseInt(hoursInput.value);
    if (value < 0) hoursInput.value = 0;
    if (value > 24) hoursInput.value = 24;
  });
  
  minutesInput.addEventListener('input', () => {
    let value = parseInt(minutesInput.value);
    if (value < 0) minutesInput.value = 0;
    if (value > 59) minutesInput.value = 59;
  });
  
  secondsInput.addEventListener('input', () => {
    let value = parseInt(secondsInput.value);
    if (value < 0) secondsInput.value = 0;
    if (value > 59) secondsInput.value = 59;
  });
  
  reminderIntervalInput.addEventListener('input', () => {
    let value = parseInt(reminderIntervalInput.value);
    if (value < 1) reminderIntervalInput.value = 1;
    if (value > 60) reminderIntervalInput.value = 60;
  });
  
  // 初始加载设置
  loadCurrentSettings();
}); 