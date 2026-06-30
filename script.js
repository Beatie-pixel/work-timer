let startTime = localStorage.getItem('startTime') ? parseInt(localStorage.getItem('startTime')) : null;
let history = JSON.parse(localStorage.getItem('workHistory') || '[]');
let timerInterval = null;
let openMonths = JSON.parse(localStorage.getItem('openMonths') || '{}');

let breakStartTime = localStorage.getItem('breakStartTime') ? parseInt(localStorage.getItem('breakStartTime')) : null;
let totalBreakMsThisSession = localStorage.getItem('totalBreakMsThisSession') ? parseInt(localStorage.getItem('totalBreakMsThisSession')) : 0;
let breakCountdownInterval = null;

const clockInBtn = document.getElementById('clock-in-btn');
const clockOutBtn = document.getElementById('clock-out-btn');
const displayTime = document.getElementById('display-time');
const statusBadge = document.getElementById('status-badge');
const activeSince = document.getElementById('active-since');
const historyList = document.getElementById('history-list');
const mainCard = document.getElementById('main-card');
const breakCard = document.getElementById('break-card');
const breakCountdown = document.getElementById('break-countdown');
const breakToggleBtn = document.getElementById('break-toggle-btn');
const clearHistoryBtn = document.getElementById('clear-history-btn');

function formatDuration(ms) {
    const totalMinutes = Math.floor(ms / 60000);
    const netMinutes = totalMinutes > 30 ? totalMinutes - 30 : totalMinutes;
    const hours = Math.floor(netMinutes / 60);
    const minutes = netMinutes % 60;
    return hours + "h " + minutes.toString().padStart(2, '0') + "m";
}

function parseTimeToMinutes(timeStr) {
    const parts = timeStr.split(' ');
    let mins = 0;
    parts.forEach(p => {
        if (p.includes('h')) mins += parseInt(p) * 60;
        if (p.includes('m')) mins += parseInt(p);
    });
    return mins;
}

function formatMinutesToHoursString(totalMins) {
    const hours = Math.floor(totalMins / 60);
    const minutes = totalMins % 60;
    return hours + "h " + minutes.toString().padStart(2, '0') + "m";
}

window.updateUI = function() {
  if (startTime) {
    const elapsed = Date.now() - startTime;
    displayTime.innerText = formatDuration(elapsed);
    clockInBtn.disabled = true;
    breakCard.classList.remove('break-card-hidden');

    if (breakStartTime) {
        statusBadge.innerText = "On Break";
        statusBadge.style.color = "var(--warning)";
        statusBadge.style.background = "rgba(241, 196, 15, 0.15)";
        mainCard.classList.remove('active-glow');
        mainCard.classList.add('break-glow');
        clockOutBtn.disabled = true;
    } else {
        statusBadge.innerText = "Tracking Time";
        statusBadge.style.color = "var(--success)";
        statusBadge.style.background = "rgba(48, 209, 88, 0.15)";
        mainCard.classList.remove('break-glow');
        mainCard.classList.add('active-glow');
        clockOutBtn.disabled = false;
    }
    
    activeSince.innerText = "Started at " + new Date(startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    if (!timerInterval) {
      timerInterval = setInterval(window.updateUI, 60000);
    }
  } else {
    displayTime.innerText = "0h 00m";
    statusBadge.innerText = "Ready";
    statusBadge.style.color = "var(--text-muted)";
    statusBadge.style.background = "rgba(255,255,255,0.05)";
    mainCard.classList.remove('active-glow', 'break-glow');
    breakCard.classList.add('break-card-hidden');
    activeSince.innerText = "Not clocked in";
    clockInBtn.disabled = false;
    clockOutBtn.disabled = true;
    
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }
  
  updateBreakCountdownUI();
  renderHistory();
}

function updateBreakCountdownUI() {
    if (!breakStartTime) {
        const standardDurationMs = 30 * 60 * 1000;
        const netAvailableMs = Math.max(0, standardDurationMs - totalBreakMsThisSession);
        const totalSecs = Math.ceil(netAvailableMs / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        
        breakCountdown.innerText = mins.toString().padStart(2, '0') + ":" + secs.toString().padStart(2, '0');
        breakToggleBtn.innerText = "Start Break";
        breakToggleBtn.classList.remove('break-active');
        
        if (breakCountdownInterval) {
            clearInterval(breakCountdownInterval);
            breakCountdownInterval = null;
        }
    } else {
        const standardDurationMs = 30 * 60 * 1000;
        const currentSessionElapsed = Date.now() - breakStartTime;
        const totalAccumulatedBreakMs = totalBreakMsThisSession + currentSessionElapsed;
        const netAvailableMs = Math.max(0, standardDurationMs - totalAccumulatedBreakMs);
        const totalSecs = Math.ceil(netAvailableMs / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        
        breakCountdown.innerText = mins.toString().padStart(2, '0') + ":" + secs.toString().padStart(2, '0');
        breakToggleBtn.innerText = "Stop Break";
        breakToggleBtn.classList.add('break-active');
        
        if (!breakCountdownInterval) {
            breakCountdownInterval = setInterval(updateBreakCountdownUI, 1000);
        }
    }
}

window.handleBreakToggle = function() {
    if (!breakStartTime) {
        breakStartTime = Date.now();
        localStorage.setItem('breakStartTime', breakStartTime);
    } else {
        const elapsedThisSession = Date.now() - breakStartTime;
        totalBreakMsThisSession += elapsedThisSession;
        localStorage.setItem('totalBreakMsThisSession', totalBreakMsThisSession);
        breakStartTime = null;
        localStorage.removeItem('breakStartTime');
    }
    window.updateUI();
}

window.clockIn = function() {
  startTime = Date.now();
  totalBreakMsThisSession = 0;
  breakStartTime = null;
  localStorage.setItem('startTime', startTime);
  localStorage.setItem('totalBreakMsThisSession', 0);
  localStorage.removeItem('breakStartTime');
  window.updateUI();
}

window.clockOut = function() {
  if (!startTime) return;
  if (breakStartTime) {
      const elapsedThisSession = Date.now() - breakStartTime;
      totalBreakMsThisSession += elapsedThisSession;
      breakStartTime = null;
      localStorage.removeItem('breakStartTime');
  }

  const endTime = Date.now();
  const duration = endTime - startTime;
  const rawDate = new Date();
  const finalBreakMinutesLogged = Math.round(totalBreakMsThisSession / 60000);
  
  const entry = {
    id: Date.now(),
    monthKey: rawDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    date: rawDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
    in: new Date(startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    out: new Date(endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    actualBreakMinutes: finalBreakMinutesLogged,
    total: formatDuration(duration)
  };
  
  history.unshift(entry);
  localStorage.setItem('workHistory', JSON.stringify(history));
  localStorage.removeItem('startTime');
  localStorage.removeItem('totalBreakMsThisSession');
  startTime = null;
  totalBreakMsThisSession = 0;
  window.updateUI();
}

window.toggleMonth = function(monthKey) {
    openMonths[monthKey] = !openMonths[monthKey];
    localStorage.setItem('openMonths', JSON.stringify(openMonths));
    renderHistory();
}

window.clearAllHistory = function() {
    if (confirm("Are you sure you want to permanently delete all logged entries?")) {
        history = [];
        openMonths = {};
        localStorage.removeItem('workHistory');
        localStorage.removeItem('openMonths');
        renderHistory();
    }
}

function renderHistory() {
  if (history.length === 0) {
    historyList.innerHTML = '<div class="empty-state">No entries recorded yet</div>';
    if(clearHistoryBtn) clearHistoryBtn.style.display = 'none';
    return;
  }
  if(clearHistoryBtn) clearHistoryBtn.style.display = 'block';

  const groups = {};
  history.forEach(item => {
      const key = item.monthKey || new Date(item.id).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = { items: [], totalMinutes: 0 };
      groups[key].items.push(item);
      groups[key].totalMinutes += parseTimeToMinutes(item.total);
  });

  let fullHtml = '';
  Object.keys(groups).forEach(monthKey => {
      const isExpanded = openMonths[monthKey] ? 'open' : '';
      const summaryText = formatMinutesToHoursString(groups[monthKey].totalMinutes);
      
      const logItemsHtml = groups[monthKey].items.map(item => {
          return '<div class="history-item"><div><div class="history-date">' + item.date + '</div><div class="history-details"><span>💼 ' + item.in + ' — ' + item.out + '</span><span style="color: var(--warning); opacity: 0.85;">☕ Taken Break: ' + (item.actualBreakMinutes || 0) + 'm (30m deducted)</span></div></div><div class="history-total">' + item.total + '</div></div>';
      }).join('');

      fullHtml += '<div class="month-container ' + isExpanded + '"><div class="month-header" onclick="toggleMonth(\'' + monthKey + '\')"><div class="month-title"><span class="chevron">▶</span> 📂 ' + monthKey + '</div><div class="month-summary">' + summaryText + '</div></div><div class="month-content">' + logItemsHtml + '</div></div>';
  });
  historyList.innerHTML = fullHtml;
}

window.updateUI();
// Background event hook to trap Chrome's installation engine
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent old mobile browsers from firing standard banner notifications automatically
    e.preventDefault();
    // Cache the event loop token so we can launch it via our custom button
    deferredInstallPrompt = e;
    
    // Select the new action button layout element and make it visible
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
        installBtn.style.display = 'block';
    }
});

window.triggerNativeInstall = function() {
    if (!deferredInstallPrompt) return;
    
    // Unroll the native Android installation card panel layout sheet
    deferredInstallPrompt.prompt();
    
    // Evaluate what action the user commits to inside the dialog window
    deferredInstallPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            // Hide our custom display element cleanly if installation completes
            const installBtn = document.getElementById('pwa-install-btn');
            if (installBtn) installBtn.style.display = 'none';
        }
        deferredInstallPrompt = null;
    });
};

