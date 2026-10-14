// ============================================================
// STUDY TRACKER — Full JavaScript
// ============================================================

// ============================================================
// 1. CALENDAR BAR
// ============================================================
const calendarBar = document.getElementById('calendarBar');

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const RING_RADIUS = 22;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function getProgressForDate(dateKey) {
    const stored = localStorage.getItem('dailyProgress');
    if (!stored) return 0;
    try {
        const data = JSON.parse(stored);
        return data[dateKey] || 0;
    } catch (e) {
        return 0;
    }
}

function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function createDayElement(date, offset) {
    const isToday = offset === 0;
    const dateKey = formatDateKey(date);
    const progress = getProgressForDate(dateKey);
    const isComplete = progress >= 1;
    const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

    const dayItem = document.createElement('div');
    dayItem.className = 'day-item';
    if (isToday) dayItem.classList.add('today');
    if (isComplete) dayItem.classList.add('complete');

    dayItem.innerHTML = `
        <span class="day-name">${DAY_NAMES[date.getDay()]}</span>
        <div class="day-circle">
            <svg class="ring" viewBox="0 0 52 52">
                <circle class="ring-track" cx="26" cy="26" r="${RING_RADIUS}" />
                <circle class="ring-progress" cx="26" cy="26" r="${RING_RADIUS}"
                        stroke-dasharray="${RING_CIRCUMFERENCE}"
                        stroke-dashoffset="${dashOffset}" />
            </svg>
            <span class="day-date">${date.getDate()}</span>
        </div>
    `;
    return dayItem;
}

function renderCalendar() {
    if (!calendarBar) return;
    calendarBar.innerHTML = '';
    const today = new Date();
    for (let offset = -2; offset <= 2; offset++) {
        const date = new Date(today);
        date.setDate(today.getDate() + offset);
        calendarBar.appendChild(createDayElement(date, offset));
    }
}

function scheduleNextMidnightUpdate() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight - now;
    setTimeout(() => {
        renderCalendar();
        scheduleNextMidnightUpdate();
    }, msUntilMidnight);
}

// ============================================================
// 2. THEME TOGGLE
// ============================================================
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        themeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
    });
}

// ============================================================
// ============================================================
// 3. SECTION SWITCHING (Bottom Nav)
// ============================================================
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        // Update active nav
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // Switch sections
        const target = item.dataset.section;
        document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
        const targetSection = document.getElementById(target + 'Section');
        if (targetSection) targetSection.classList.add('active');

        // Render report when switching to it
        if (target === 'report') renderReport();

        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

// ============================================================
// 4. POMODORO TIMER
// ============================================================

// ---------- DOM ----------
const timerDisplay = document.getElementById('timerDisplay');
const timerMode = document.getElementById('timerMode');
const timerRingWrapper = document.querySelector('.timer-ring-wrapper');
const timerRingProgress = document.querySelector('.timer-ring-progress');
const startPauseBtn = document.getElementById('startPauseBtn');
const resetBtn = document.getElementById('resetBtn');
const cycleDots = document.querySelectorAll('.cycle-dot');
const subjectSelect = document.getElementById('subjectSelect');

const presetBtns = document.querySelectorAll('.preset-btn[data-focus]');
const customPresetBtn = document.getElementById('customPresetBtn');
const customModal = document.getElementById('customModal');
const customFocusInput = document.getElementById('customFocus');
const customBreakInput = document.getElementById('customBreak');
const saveCustomBtn = document.getElementById('saveCustom');
const cancelCustomBtn = document.getElementById('cancelCustom');

// ---------- RING MATH ----------
const TIMER_RADIUS = 45;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;
if (timerRingProgress) {
    timerRingProgress.setAttribute('stroke-dasharray', TIMER_CIRCUMFERENCE);
    timerRingProgress.setAttribute('stroke-dashoffset', '0');
}

// ---------- CONFIG ----------
let FOCUS_MINUTES = 25;
let SHORT_BREAK_MINUTES = 5;
let LONG_BREAK_MINUTES = 15;
const POMODOROS_PER_CYCLE = 4;

// ---------- STATE ----------
let timeLeftInSeconds = FOCUS_MINUTES * 60;
let isRunning = false;
let currentMode = 'focus';
let completedPomodoros = 0;
let tickInterval = null;

// ---------- HELPERS ----------
function getTotalSecondsForMode() {
    if (currentMode === 'focus') return FOCUS_MINUTES * 60;
    if (currentMode === 'shortBreak') return SHORT_BREAK_MINUTES * 60;
    return LONG_BREAK_MINUTES * 60;
}

function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateDisplay() {
    if (!timerDisplay) return;

    timerDisplay.textContent = formatTime(timeLeftInSeconds);
    timerDisplay.classList.toggle('running', isRunning);

    if (currentMode === 'focus') {
        timerMode.textContent = 'Focus';
        timerRingWrapper.classList.remove('break-mode');
    } else if (currentMode === 'shortBreak') {
        timerMode.textContent = 'Short Break';
        timerRingWrapper.classList.add('break-mode');
    } else {
        timerMode.textContent = 'Long Break';
        timerRingWrapper.classList.add('break-mode');
    }

    cycleDots.forEach((dot, i) => {
        dot.classList.toggle('completed', i < completedPomodoros);
    });

    const total = getTotalSecondsForMode();
    const progress = Math.max(0, Math.min(1, timeLeftInSeconds / total));
    const offset = TIMER_CIRCUMFERENCE * (1 - progress);
    timerRingProgress.setAttribute('stroke-dashoffset', offset);
}

function playBeep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
    } catch (e) { console.log('Audio unavailable'); }
}

function tick() {
    timeLeftInSeconds--;
    updateDisplay();
    if (timeLeftInSeconds <= 0) handleTimerComplete();
}

function startTimer() {
    if (isRunning) return;
    isRunning = true;
    startPauseBtn.textContent = 'Pause';
    updateDisplay();
    tickInterval = setInterval(tick, 1000);
}

function pauseTimer() {
    if (!isRunning) return;
    isRunning = false;
    startPauseBtn.textContent = 'Start';
    clearInterval(tickInterval);
    tickInterval = null;
    updateDisplay();
}

function toggleTimer() {
    if (isRunning) pauseTimer();
    else startTimer();
}

function resetTimer() {
    pauseTimer();
    timeLeftInSeconds = getTotalSecondsForMode();
    updateDisplay();
}

function handleTimerComplete() {
    pauseTimer();
    playBeep();

    if (currentMode === 'focus') {
        logSession();
        completedPomodoros++;
        if (completedPomodoros >= POMODOROS_PER_CYCLE) {
            switchMode('longBreak');
            completedPomodoros = 0;
        } else {
            switchMode('shortBreak');
        }
    } else {
        switchMode('focus');
    }
}

function switchMode(newMode) {
    currentMode = newMode;
    timeLeftInSeconds = getTotalSecondsForMode();
    updateDisplay();
    startTimer();
}

function logSession() {
    const session = {
        id: Date.now(),
        subject: subjectSelect.value,
        duration: FOCUS_MINUTES,
        date: new Date().toISOString()
    };
    const stored = localStorage.getItem('studySessions');
    const sessions = stored ? JSON.parse(stored) : [];
    sessions.push(session);
    localStorage.setItem('studySessions', JSON.stringify(sessions));
    bumpTodayProgress();
}

function bumpTodayProgress() {
    const dateKey = formatDateKey(new Date());
    const storedProgress = localStorage.getItem('dailyProgress');
    const progress = storedProgress ? JSON.parse(storedProgress) : {};
    const storedSessions = localStorage.getItem('studySessions');
    const sessions = storedSessions ? JSON.parse(storedSessions) : [];
    const todayCount = sessions.filter(s => formatDateKey(new Date(s.date)) === dateKey).length;
    const GOAL = 4;
    progress[dateKey] = Math.min(todayCount / GOAL, 1);
    localStorage.setItem('dailyProgress', JSON.stringify(progress));
    renderCalendar();
}

// ---------- PRESETS ----------
function markPresetActive(activeBtn) {
    presetBtns.forEach(b => b.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
}

presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        FOCUS_MINUTES = parseInt(btn.dataset.focus);
        SHORT_BREAK_MINUTES = parseInt(btn.dataset.break);
        LONG_BREAK_MINUTES = SHORT_BREAK_MINUTES * 3;
        currentMode = 'focus';
        completedPomodoros = 0;
        resetTimer();
        markPresetActive(btn);
    });
});

// ---------- CUSTOM MODAL ----------
if (customPresetBtn) {
    customPresetBtn.addEventListener('click', () => {
        customFocusInput.value = FOCUS_MINUTES;
        customBreakInput.value = SHORT_BREAK_MINUTES;
        customModal.classList.add('active');
    });
}
if (cancelCustomBtn) {
    cancelCustomBtn.addEventListener('click', () => customModal.classList.remove('active'));
}
if (customModal) {
    customModal.addEventListener('click', (e) => {
        if (e.target === customModal) customModal.classList.remove('active');
    });
}
if (saveCustomBtn) {
    saveCustomBtn.addEventListener('click', () => {
        const focus = parseInt(customFocusInput.value);
        const brk = parseInt(customBreakInput.value);
        if (!focus || focus < 1 || focus > 180) {
            alert('Focus must be between 1 and 180 minutes.');
            return;
        }
        if (!brk || brk < 1 || brk > 60) {
            alert('Break must be between 1 and 60 minutes.');
            return;
        }
        FOCUS_MINUTES = focus;
        SHORT_BREAK_MINUTES = brk;
        LONG_BREAK_MINUTES = brk * 3;
        currentMode = 'focus';
        completedPomodoros = 0;
        resetTimer();
        markPresetActive(null);
        customModal.classList.remove('active');
    });
}

// ---------- EVENTS ----------
startPauseBtn.addEventListener('click', toggleTimer);
resetBtn.addEventListener('click', resetTimer);

// ============================================================
// 5. REPORT PAGE
// ============================================================

const SUBJECT_COLORS = {
    'Literature': '#6d5ae6',
    'Theatre': '#e6557a',
    'Web Development': '#3b82f6',
    'Language': '#10b981',
    'Other': '#f59e0b'
};

function getSessions() {
    const stored = localStorage.getItem('studySessions');
    return stored ? JSON.parse(stored) : [];
}

function formatDuration(minutes) {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function calculateStreak(sessions) {
    if (sessions.length === 0) return 0;
    const dates = new Set(sessions.map(s => formatDateKey(new Date(s.date))));
    const today = new Date();
    const todayKey = formatDateKey(today);
    let streak = 0;
    const startOffset = dates.has(todayKey) ? 0 : 1;

    for (let i = startOffset; i < 365; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        if (dates.has(formatDateKey(d))) streak++;
        else break;
    }
    return streak;
}

function renderSummaryCards(sessions) {
    const today = new Date();
    const todayKey = formatDateKey(today);

    const todayMinutes = sessions
        .filter(s => formatDateKey(new Date(s.date)) === todayKey)
        .reduce((sum, s) => sum + s.duration, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 6);
    weekAgo.setHours(0, 0, 0, 0);
    const weekMinutes = sessions
        .filter(s => new Date(s.date) >= weekAgo)
        .reduce((sum, s) => sum + s.duration, 0);

    const streak = calculateStreak(sessions);

    document.getElementById('statToday').textContent = todayMinutes > 0 ? formatDuration(todayMinutes) : '0m';
    document.getElementById('statWeek').textContent = weekMinutes > 0 ? formatDuration(weekMinutes) : '0m';
    document.getElementById('statStreak').textContent = `${streak} day${streak !== 1 ? 's' : ''}`;
}

function renderWeeklyChart(sessions) {
    const chart = document.getElementById('weeklyChart');
    chart.innerHTML = '';

    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        days.push(d);
    }

    const dayMinutes = days.map(d => {
        const key = formatDateKey(d);
        return sessions
            .filter(s => formatDateKey(new Date(s.date)) === key)
            .reduce((sum, s) => sum + s.duration, 0);
    });

    const maxMinutes = Math.max(...dayMinutes, 1);
    const todayKey = formatDateKey(today);

    days.forEach((d, i) => {
        const minutes = dayMinutes[i];
        const heightPercent = minutes === 0 ? 3 : (minutes / maxMinutes) * 100;
        const isToday = formatDateKey(d) === todayKey;

        const wrapper = document.createElement('div');
        wrapper.className = 'chart-bar-wrapper' + (isToday ? ' today' : '');
        wrapper.innerHTML = `
            <span class="chart-bar-time">${minutes > 0 ? formatDuration(minutes) : ''}</span>
            <div class="chart-bar-track">
                <div class="chart-bar-fill" style="height: ${heightPercent}%"></div>
            </div>
            <span class="chart-bar-day">${DAY_NAMES[d.getDay()]}</span>
        `;
        chart.appendChild(wrapper);
    });
}

function renderSubjectBreakdown(sessions) {
    const container = document.getElementById('subjectList');
    container.innerHTML = '';

    const totals = {};
    sessions.forEach(s => {
        totals[s.subject] = (totals[s.subject] || 0) + s.duration;
    });

    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
        container.innerHTML = '<p class="report-empty-line">No data yet</p>';
        return;
    }

    const maxMinutes = entries[0][1];

    entries.forEach(([subject, minutes]) => {
        const percent = (minutes / maxMinutes) * 100;
        const color = SUBJECT_COLORS[subject] || '#64748b';

        const row = document.createElement('div');
        row.className = 'subject-row';
        row.innerHTML = `
            <div class="subject-row-header">
                <span class="subject-name">
                    <span class="subject-dot" style="background:${color}"></span>
                    ${subject}
                </span>
                <span class="subject-time">${formatDuration(minutes)}</span>
            </div>
            <div class="subject-bar-track">
                <div class="subject-bar-fill" style="width:0%;background:${color}"></div>
            </div>
        `;
        container.appendChild(row);

        // Animate after paint
        requestAnimationFrame(() => {
            row.querySelector('.subject-bar-fill').style.width = percent + '%';
        });
    });
}

function renderRecentSessions(sessions) {
    const container = document.getElementById('recentSessions');
    container.innerHTML = '';

    const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = sorted.slice(0, 8);

    const today = new Date();
    const todayKey = formatDateKey(today);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayKey = formatDateKey(yesterday);

    const grouped = {};
    recent.forEach(s => {
        const key = formatDateKey(new Date(s.date));
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(s);
    });

    Object.entries(grouped).forEach(([dateKey, items]) => {
        let label;
        if (dateKey === todayKey) label = 'Today';
        else if (dateKey === yesterdayKey) label = 'Yesterday';
        else {
            const d = new Date(dateKey + 'T00:00:00');
            label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        const group = document.createElement('div');
        group.className = 'session-group';

        const title = document.createElement('h4');
        title.className = 'session-group-title';
        title.textContent = label;
        group.appendChild(title);

        items.forEach(s => {
            const time = new Date(s.date).toLocaleTimeString('en-US', {
                hour: 'numeric', minute: '2-digit'
            });
            const color = SUBJECT_COLORS[s.subject] || '#64748b';

            const item = document.createElement('div');
            item.className = 'report-session-item';
            item.innerHTML = `
                <div class="report-session-left">
                    <span class="report-session-dot" style="background:${color}"></span>
                    <div>
                        <div class="report-session-subject">${s.subject}</div>
                        <div class="report-session-time">${time}</div>
                    </div>
                </div>
                <div class="report-session-duration">${formatDuration(s.duration)}</div>
            `;
            group.appendChild(item);
        });

        container.appendChild(group);
    });
}

function renderReport() {
    const sessions = getSessions();
    const empty = document.getElementById('reportEmpty');
    const content = document.getElementById('reportContent');

    if (sessions.length === 0) {
        empty.style.display = 'block';
        content.style.display = 'none';
        return;
    }

    empty.style.display = 'none';
    content.style.display = 'block';

    renderSummaryCards(sessions);
    renderWeeklyChart(sessions);
    renderSubjectBreakdown(sessions);
    renderRecentSessions(sessions);
}

// ============================================================
// 6. SETTINGS
// ============================================================

// ---------- DEFAULT SETTINGS ----------
const DEFAULT_SETTINGS = {
    theme: 'light',
    soundOn: true,
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    autoStartBreaks: true,
    subjects: ['Literature', 'Theatre', 'Web Development', 'Language', 'Other']
};

// ---------- LOAD / SAVE ----------
function loadSettings() {
    const stored = localStorage.getItem('studyTrackerSettings');
    if (stored) {
        try {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        } catch (e) {
            return { ...DEFAULT_SETTINGS };
        }
    }
    return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings) {
    localStorage.setItem('studyTrackerSettings', JSON.stringify(settings));
}

let settings = loadSettings();

// ---------- APPLY THEME ----------
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// ---------- APPLY SETTINGS TO TIMER ----------
function applySettingsToTimer() {
    FOCUS_MINUTES = settings.focusMinutes;
    SHORT_BREAK_MINUTES = settings.shortBreakMinutes;
    LONG_BREAK_MINUTES = settings.longBreakMinutes;
    // Reset the timer to the focus mode with new durations
    currentMode = 'focus';
    completedPomodoros = 0;
    resetTimer();
}

// ---------- POPULATE SUBJECT DROPDOWN ----------
function populateSubjectDropdown() {
    if (!subjectSelect) return;
    const current = subjectSelect.value;
    subjectSelect.innerHTML = '';
    settings.subjects.forEach(subject => {
        const opt = document.createElement('option');
        opt.value = subject;
        opt.textContent = subject;
        subjectSelect.appendChild(opt);
    });
    // Restore previous selection if still valid
    if (settings.subjects.includes(current)) {
        subjectSelect.value = current;
    }
}

// ---------- RENDER SUBJECT MANAGER ----------
function renderSubjectManager() {
    const container = document.getElementById('subjectManager');
    if (!container) return;
    container.innerHTML = '';

    settings.subjects.forEach(subject => {
        const color = SUBJECT_COLORS[subject] || '#64748b';
        const row = document.createElement('div');
        row.className = 'managed-subject';
        row.innerHTML = `
            <div class="managed-subject-left">
                <span class="managed-subject-dot" style="background:${color}"></span>
                <span class="managed-subject-name">${subject}</span>
            </div>
            <button class="managed-subject-remove" data-subject="${subject}" title="Remove">✕</button>
        `;
        container.appendChild(row);
    });

    // Wire up remove buttons
    container.querySelectorAll('.managed-subject-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const subject = btn.dataset.subject;
            // Prevent removing the last subject
            if (settings.subjects.length <= 1) {
                alert('You need at least one subject.');
                return;
            }
            settings.subjects = settings.subjects.filter(s => s !== subject);
            saveSettings(settings);
            renderSubjectManager();
            populateSubjectDropdown();
        });
    });
}

// ---------- INITIALIZE SETTINGS UI ----------
function initSettingsUI() {
    // Theme buttons
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === settings.theme);
        btn.addEventListener('click', () => {
            settings.theme = btn.dataset.theme;
            saveSettings(settings);
            applyTheme(settings.theme);
            document.querySelectorAll('.theme-option').forEach(b => {
                b.classList.toggle('active', b.dataset.theme === settings.theme);
            });
        });
    });

    // Sound toggle
    const soundToggle = document.getElementById('soundToggle');
    if (soundToggle) {
        soundToggle.checked = settings.soundOn;
        soundToggle.addEventListener('change', () => {
            settings.soundOn = soundToggle.checked;
            saveSettings(settings);
        });
    }

    // Focus input
    const focusInput = document.getElementById('settingFocus');
    if (focusInput) {
        focusInput.value = settings.focusMinutes;
        focusInput.addEventListener('change', () => {
            const val = parseInt(focusInput.value);
            if (!val || val < 1 || val > 180) {
                focusInput.value = settings.focusMinutes;
                return;
            }
            settings.focusMinutes = val;
            saveSettings(settings);
            applySettingsToTimer();
        });
    }

    // Short break input
    const shortInput = document.getElementById('settingShortBreak');
    if (shortInput) {
        shortInput.value = settings.shortBreakMinutes;
        shortInput.addEventListener('change', () => {
            const val = parseInt(shortInput.value);
            if (!val || val < 1 || val > 60) {
                shortInput.value = settings.shortBreakMinutes;
                return;
            }
            settings.shortBreakMinutes = val;
            saveSettings(settings);
            applySettingsToTimer();
        });
    }

    // Long break input
    const longInput = document.getElementById('settingLongBreak');
    if (longInput) {
        longInput.value = settings.longBreakMinutes;
        longInput.addEventListener('change', () => {
            const val = parseInt(longInput.value);
            if (!val || val < 1 || val > 60) {
                longInput.value = settings.longBreakMinutes;
                return;
            }
            settings.longBreakMinutes = val;
            saveSettings(settings);
            applySettingsToTimer();
        });
    }

    // Auto-start toggle
    const autoStartToggle = document.getElementById('autoStartToggle');
    if (autoStartToggle) {
        autoStartToggle.checked = settings.autoStartBreaks;
        autoStartToggle.addEventListener('change', () => {
            settings.autoStartBreaks = autoStartToggle.checked;
            saveSettings(settings);
        });
    }

    // Add subject
    const addSubjectBtn = document.getElementById('addSubjectBtn');
    const newSubjectInput = document.getElementById('newSubjectInput');
    if (addSubjectBtn && newSubjectInput) {
        const addSubject = () => {
            const name = newSubjectInput.value.trim();
            if (!name) return;
            if (settings.subjects.includes(name)) {
                alert('That subject already exists.');
                return;
            }
            settings.subjects.push(name);
            saveSettings(settings);
            newSubjectInput.value = '';
            renderSubjectManager();
            populateSubjectDropdown();
        };
        addSubjectBtn.addEventListener('click', addSubject);
        newSubjectInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addSubject();
        });
    }

    // Clear data
    const clearBtn = document.getElementById('clearDataBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            const confirmed = confirm(
                'This will delete ALL your study sessions. Are you sure?'
            );
            if (!confirmed) return;
            localStorage.removeItem('studySessions');
            localStorage.removeItem('dailyProgress');
            renderCalendar();
            renderReport();
            alert('All data cleared.');
        });
    }

    // Populate subjects
    renderSubjectManager();
    populateSubjectDropdown();
}

// ============================================================
// 7. PATCH: sound respects setting
// ============================================================
const originalPlayBeep = playBeep;
playBeep = function() {
    if (settings.soundOn) originalPlayBeep();
};

// ============================================================
// 8. PATCH: auto-start respects setting
// ============================================================
const originalSwitchMode = switchMode;
switchMode = function(newMode) {
    currentMode = newMode;
    timeLeftInSeconds = getTotalSecondsForMode();
    updateDisplay();
    if (settings.autoStartBreaks) {
        startTimer();
    }
};

// ============================================================
// 9. INITIALIZE
// ============================================================
applyTheme(settings.theme);
applySettingsToTimer();
renderCalendar();
scheduleNextMidnightUpdate();
updateDisplay();
initSettingsUI();