let sessionPromptShown = false;
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
let inactivityTimer;
let tabPromptShown = {}; // Tracks if the prompt has been shown in specific tabs

function isWithinActiveHours(currentTime, startTime, endTime) {
  const current = currentTime.getHours() * 60 + currentTime.getMinutes();
  const start = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
  const end = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
  return current >= start && current < end;
}

function isActiveDay(currentDay, activeDays) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return activeDays.includes(days[currentDay]);
}

function resetPassCount() {
  chrome.storage.sync.set({ passCount: 0 }, () => {
    console.log('Pass count reset to 0');
  });
}

function schedulePassCountReset() {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  
  chrome.alarms.create('resetPassCount', { when: tomorrow.getTime() });
}

function resetSession() {
  sessionPromptShown = false;
  clearTimeout(inactivityTimer);
}

function isYouTubeUrl(url) {
  return url && url.startsWith('https://www.youtube.com/');
}

// Initialize pass count, set up reset, and handle browser startup
chrome.runtime.onInstalled.addListener(() => {
  
  resetPassCount();
  schedulePassCountReset();
});

chrome.runtime.onStartup.addListener(() => {
  resetSession();
  resetPassCount();
  schedulePassCountReset();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url === 'https://www.youtube.com/') {
    if (!tabPromptShown[tabId]) {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(resetSession, INACTIVITY_TIMEOUT);
      chrome.storage.sync.get({
        startTime: '08:00',
        endTime: '17:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        passCount: 0
      }, function(items) {
        const currentTime = new Date();
        if (isWithinActiveHours(currentTime, items.startTime, items.endTime) &&
            isActiveDay(currentTime.getDay(), items.days)) {
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: showPopup,
            args: [items.passCount]
          });
          tabPromptShown[tabId] = true;
        }
      });
    }
  } else if (changeInfo.url && !isYouTubeUrl(changeInfo.url)) {
    tabPromptShown[tabId] = false;
  }
});

chrome.tabs.onActivated.addListener(() => {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(resetSession, INACTIVITY_TIMEOUT);
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  delete tabPromptShown[tabId];
});

function showPopup(passCount) {
  if (document.getElementById('educational-purpose-check')) {
    return; // Popup already exists, don't create another one
  }

  const overlay = document.createElement('div');
  overlay.id = 'educational-purpose-check';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
  `;

  const popup = document.createElement('div');
  popup.style.cssText = `
    background-color: white;
    padding: 20px;
    border-radius: 5px;
    text-align: center;
  `;

  popup.innerHTML = `
    <h2>Educational Purpose Check</h2>
    <p>Are you using YouTube for educational purposes?</p>
    <label>
      <input type="radio" name="purpose" value="yes"> Yes
    </label>
    <label>
      <input type="radio" name="purpose" value="no"> No
    </label>
    <label>
      <input type="radio" name="purpose" value="pass" ${passCount >= 3 ? 'disabled' : ''}> No (Pass) - ${3 - passCount} left
    </label>
    <br><br>
    <button id="submit">Submit</button>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  document.getElementById('submit').addEventListener('click', function() {
    const selected = document.querySelector('input[name="purpose"]:checked');
    if (selected) {
      if (selected.value === 'yes') {
        overlay.remove();
      } else if (selected.value === 'pass') {
        chrome.runtime.sendMessage({action: "usePass"});
        overlay.remove();
      } else {
        chrome.runtime.sendMessage({action: "closeTab"});
      }
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "closeTab") {
    chrome.tabs.remove(sender.tab.id);
  } else if (request.action === "usePass") {
    chrome.storage.sync.get({passCount: 0}, (items) => {
      const newPassCount = items.passCount + 1;
      chrome.storage.sync.set({passCount: newPassCount});
    });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'resetPassCount') {
    resetPassCount();
    schedulePassCountReset(); // Schedule the next reset
  }
});
