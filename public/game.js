// game.js (محدث) -------------------------------------------------------
const socket = io();

// --- عناصر DOM (احتفاظ بالعناصر القديمة + عناصر جديدة) ---
const wordDisplay = document.getElementById('current-word');
const inputAnswer = document.getElementById('input-answer');
const pointsDisplay = document.getElementById('points-display') || document.getElementById('points-display') || (function(){ 
  const el = document.createElement('div'); el.id='points-display'; el.textContent='النقاط: 0'; return el;
})();
const answerTimeDisplay = document.getElementById('answer-time');

// answers display (سجل الإجابات تحت خانة الإجابة)
let answersDisplay = document.getElementById('answers-display');
if (!answersDisplay) {
  answersDisplay = document.createElement('div');
  answersDisplay.id = 'answers-display';
  // نحط العنصر بعد answerTimeDisplay إن وُجد داخل نفس الـ section
  if (answerTimeDisplay && answerTimeDisplay.parentNode) {
    answerTimeDisplay.parentNode.insertBefore(answersDisplay, answerTimeDisplay.nextSibling);
  } else {
    document.body.appendChild(answersDisplay);
  }
}

const btnChat = document.getElementById('btn-chat');
const chatContainer = document.getElementById('chat-container');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const btnCloseChat = document.getElementById('btn-close-chat');

const btnChangeName = document.getElementById('btn-change-name');
const changeNameDialog = document.getElementById('change-name-dialog');
const changeNameForm = document.getElementById('change-name-form');
const inputName = document.getElementById('input-name');
const cancelNameBtn = document.getElementById('cancel-name');

const btnInstructions = document.getElementById('btn-instructions');
const instructionsDialog = document.getElementById('instructions-dialog');
const closeInstructionsBtn = document.getElementById('close-instructions');

const btnZizo = document.getElementById('btn-zizo');

const playersList = document.getElementById('players-list');

const nameColorPicker = document.getElementById('name-color-picker') || document.getElementById('player-name-color') || document.getElementById('name-color') || document.getElementById('name-color-picker');
const btnNight = document.getElementById('btn-night') || document.getElementById('dark-mode-toggle');
const btnStats = document.getElementById('btn-stats');
const statsDialog = document.getElementById('stats-dialog');
const statsTableBody = document.querySelector('#stats-table tbody');

const btnVote = document.getElementById('btn-vote');
const voteDialog = document.getElementById('vote-dialog');
const voteForm = document.getElementById('vote-form');

const btnNotificationsToggle = document.getElementById('btn-notifications-toggle');
const chatBadge = document.getElementById('chat-badge');
const newMessageToast = document.getElementById('new-message-toast');
const openChatFromToast = document.getElementById('open-chat-from-toast');

const btnPowerups = document.getElementById('btn-powerups');
const powerupsPanel = document.getElementById('powerups-panel');
const btnTeam = document.getElementById('btn-team');

// --- حالة محلية/ثوابت ---
let playerId = null;
let currentWord = '';
let startTime = 0;
let myScore = 0;
let winsCount = 0;
let playerName = localStorage.getItem('playerName') || `لاعب${Math.floor(Math.random() * 1000)}`;
let playerColor = localStorage.getItem('playerColor') || '#ffcc00';
let notifyEnabled = (localStorage.getItem('notifyEnabled') !== 'false'); // default true
let canAnswer = true;
let wakeLock = null;

// خرائط ألوان خاصة (احتفظت بالخارطة مثل عندك)
const specialNameColors = {
  "جهاد": "#00ffe7",
  "زيزو": "#ff3366",
  "أسامة": "#cc33ff",
  "مصطفى": "#33ff99",
  "حلا": "#ff33cc",
  "نور": "#ffff33",
  "كول": "#33ccff"
};

// إحصائيات محلية في localStorage: map اسم -> {bestTime, totalPoints, wins}
let statsMap = {};
try {
  const raw = localStorage.getItem('gameStats_v1');
  statsMap = raw ? JSON.parse(raw) : {};
} catch (e) {
  statsMap = {};
}

// --- وظائف مساعدة ---
function saveStatsMap() {
  try { localStorage.setItem('gameStats_v1', JSON.stringify(statsMap)); } catch (e) { /* ignore */ }
}

function updateStatForPlayer(name, { timeUsed = null, points = 0, won = false } = {}) {
  if (!name) return;
  const key = name;
  if (!statsMap[key]) statsMap[key] = { bestTime: null, totalPoints: 0, wins: 0 };
  if (timeUsed !== null) {
    const t = parseFloat(timeUsed);
    if (!isNaN(t)) {
      if (statsMap[key].bestTime === null || t < statsMap[key].bestTime) statsMap[key].bestTime = t;
    }
  }
  if (points) statsMap[key].totalPoints = (statsMap[key].totalPoints || 0) + Number(points);
  if (won) statsMap[key].wins = (statsMap[key].wins || 0) + 1;
  saveStatsMap();
}

function openStatsDialog() {
  // ملء الجدول
  if (!statsTableBody) return;
  statsTableBody.innerHTML = '';
  Object.keys(statsMap).sort((a,b)=> (statsMap[b].totalPoints||0) - (statsMap[a].totalPoints||0)).forEach(name => {
    const s = statsMap[name];
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(name)}</td><td>${s.bestTime === null ? '-' : s.bestTime.toFixed(2)}</td><td>${s.totalPoints||0}</td><td>${s.wins||0}</td>`;
    statsTableBody.appendChild(tr);
  });
  try { statsDialog.showModal(); } catch(e){ statsDialog.style.display='block'; }
}

function escapeHtml(text) {
  if (text == null) return '';
  return String(text).replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]; });
}

function scrollChatToBottom() {
  if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
}

function getColorForName(name, id) {
  if (!name) return '#aaffff';
  if (specialNameColors[name]) return specialNameColors[name];
  // local mapping by name
  const stored = localStorage.getItem('color_for_' + name);
  if (stored) return stored;
  // if it's me
  if (id && id === playerId) return playerColor;
  // default
  return '#aaffff';
}

function colorizeNameHTML(name, id) {
  const color = getColorForName(name, id);
  return `<span class="chat-name" style="color:${color}; font-weight:700;">${escapeHtml(name)}</span>`;
}

function highlightSpecialWords(text) {
  // reuse your specialWords mapping
  const specialWords = {
    'زيزو': { color: '#ff3366', shake: true },
    'جهاد': { color: '#00ffe7', shake: false },
    'حلا': { color: '#ff33cc', shake: false },
    'كول': { color: '#33ccff', shake: false },
    'مصطفى': { color: '#33ff99', shake: false },
  };
  let result = escapeHtml(text);
  Object.keys(specialWords).forEach(word => {
    const { color, shake } = specialWords[word];
    const shakeClass = shake ? ' special-shake' : '';
    const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gu');
    result = result.replace(regex, `<span class="special-word${shakeClass}" style="color:${color}">${word}</span>`);
  });
  return result;
}

function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// عرض رسالة شات (لا يغيّر سلوكك الأصلي)
function addChatMessage({ name, message, system = false }) {
  if (!chatMessages) return;
  const div = document.createElement('div');
  div.classList.add('chat-message');
  if (system) {
    div.classList.add('chat-system-message');
    div.textContent = message;
  } else {
    div.innerHTML = `${colorizeNameHTML(name)} : ${highlightSpecialWords(message)}`;
  }
  chatMessages.appendChild(div);
  scrollChatToBottom();
}

// عرض سجل الإجابات (يظهر للجميع تحت خانة الإجابة)
function showAnswerLog(name, timeUsed) {
  try {
    const entry = document.createElement('div');
    entry.className = 'answer-log-entry';
    const color = getColorForName(name);
    entry.innerHTML = `<span style="color:${color}; font-weight:800;">${escapeHtml(name)}</span> أجاب في <strong>${parseFloat(timeUsed).toFixed(2)}</strong> ثانية`;
    // أضف مؤثر ومدة عرض
    answersDisplay.insertBefore(entry, answersDisplay.firstChild);
    // نزيل العنصر بعد 6 ثواني
    setTimeout(() => {
      if (entry.parentNode) entry.parentNode.removeChild(entry);
    }, 6000);
  } catch (e) { console.error(e); }
}

// إظهار توست إشعار
let toastTimeout = null;
function showNewMessageToast() {
  if (!newMessageToast) return;
  newMessageToast.hidden = false;
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    if (newMessageToast) newMessageToast.hidden = true;
  }, 6000);
}

// تنظيف إشعار الشات
function clearChatNotification() {
  if (chatBadge) chatBadge.hidden = true;
  if (newMessageToast) newMessageToast.hidden = true;
}

// --- التعامل مع Wake Lock لمنع السليب ---
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        console.log('Wake Lock released');
      });
      console.log('Wake Lock acquired');
    }
  } catch (err) {
    console.warn('Wake Lock error:', err);
  }
}
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible') {
    await requestWakeLock();
  } else {
    // لا حاجة لفعل شيء؛ سيتحرر تلقائياً
  }
});
// نطلب عندما يحمل السكربت
requestWakeLock();

// --- الأحداث (بقيت الوظائف كما كانت مع الإضافات) ---

// فتح/إغلاق الشات مع تحكم بالإشعارات
btnChat && btnChat.addEventListener('click', () => {
  if (!chatContainer) return;
  if (chatContainer.classList.contains('open')) {
    chatContainer.classList.remove('open');
    btnChat.setAttribute('aria-expanded', 'false');
    chatContainer.hidden = true;
  } else {
    chatContainer.classList.add('open');
    btnChat.setAttribute('aria-expanded', 'true');
    chatContainer.hidden = false;
    if (chatInput) chatInput.focus();
    // مسح إشعارات الشات عند الفتح
    clearChatNotification();
  }
});

btnCloseChat && btnCloseChat.addEventListener('click', () => {
  if (!chatContainer) return;
  chatContainer.classList.remove('open');
  btnChat.setAttribute('aria-expanded', 'false');
  chatContainer.hidden = true;
});

// إرسال رسالة الشات
chatForm && chatForm.addEventListener('submit', e => {
  e.preventDefault();
  if (!chatInput) return;
  const msg = chatInput.value.trim();
  if (!msg) return;
  socket.emit('sendMessage', msg);
  chatInput.value = '';
});

// تغيير الاسم
btnChangeName && btnChangeName.addEventListener('click', () => {
  if (!changeNameDialog) return;
  inputName.value = playerName;
  // افتراضيًا لو كان لون محفوظ نعرضه في color picker
  if (nameColorPicker) nameColorPicker.value = playerColor;
  try { changeNameDialog.showModal(); } catch(e){ changeNameDialog.style.display='block'; }
});

cancelNameBtn && cancelNameBtn.addEventListener('click', () => {
  try { changeNameDialog.close(); } catch(e){ changeNameDialog.style.display='none'; }
});

changeNameForm && changeNameForm.addEventListener('submit', e => {
  e.preventDefault();
  const newName = inputName.value.trim();
  if (newName && newName !== playerName) {
    // نحفظ الاسم
    playerName = newName;
    localStorage.setItem('playerName', playerName);
    // نرسل الاسم للسيرفر (كما في كودك الأصلي)
    socket.emit('setName', playerName);
    // نحفظ لون الاسم المرفق
    if (nameColorPicker && nameColorPicker.value) {
      playerColor = nameColorPicker.value;
      localStorage.setItem('playerColor', playerColor);
      // حفظ لون هذا الاسم في خريطة محلية لتطبيقه على الجميع لاحقاً
      localStorage.setItem('color_for_' + playerName, playerColor);
    }
    // تحديث الإحصائيات المحليّة إذا لم تكن موجودة
    if (!statsMap[playerName]) statsMap[playerName] = { bestTime: null, totalPoints: 0, wins: 0 };
    saveStatsMap();
  }
  try { changeNameDialog.close(); } catch(e){ changeNameDialog.style.display='none'; }
});

// تعليمات
btnInstructions && btnInstructions.addEventListener('click', () => {
  try { instructionsDialog.showModal(); } catch(e){ instructionsDialog.style.display='block'; }
});
closeInstructionsBtn && closeInstructionsBtn.addEventListener('click', () => {
  try { instructionsDialog.close(); } catch(e){ instructionsDialog.style.display='none'; }
});

// فتح لعبة زيزو
btnZizo && btnZizo.addEventListener('click', () => {
  window.open('https://sp-p2.onrender.com', '_blank');
});

// اختيار لون الاسم مباشرة من color picker
if (nameColorPicker) {
  nameColorPicker.value = playerColor;
  nameColorPicker.addEventListener('input', (e) => {
    playerColor = e.target.value;
    localStorage.setItem('playerColor', playerColor);
    // ربط اللون باسم اللاعب حالياً
    if (playerName) localStorage.setItem('color_for_' + playerName, playerColor);
    // تحديث عرض الأسماء في الواجهة فوراً
    // نعيد رسم قائمة اللاعبين إن كانت موجودة
    if (document.querySelectorAll('#players-list li').length) {
      // نحفّظ مؤقتًا players data بإعادة طلب من السيرفر أو استخدام حدث updatePlayers حال وصل
      // أسهل: نطلب تحديث من السيرفر (إذا كانت هناك طريقة). سنرسل طلب بسيط:
      socket.emit('requestPlayersUpdate');
    }
  });
}

// زر الوضع الليلي
if (btnNight) {
  // حمل الوضع المخزون
  if (localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark-mode');
  btnNight.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const on = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', on ? 'true' : 'false');
  });
}

// زر الإحصائيات
if (btnStats) {
  btnStats.addEventListener('click', openStatsDialog);
}
if (statsDialog) {
  const closeStatsBtn = document.getElementById('close-stats');
  if (closeStatsBtn) closeStatsBtn.addEventListener('click', () => {
    try { statsDialog.close(); } catch(e){ statsDialog.style.display='none'; }
  });
}

// زر التصويت
if (btnVote) {
  btnVote.addEventListener('click', () => {
    try { voteDialog.showModal(); } catch(e){ voteDialog.style.display='block'; }
  });
}
if (voteForm) {
  voteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const mode = voteForm.querySelector('input[name="mode"]:checked').value;
    socket.emit('voteMode', mode); // سيرفر ممكن ما يدعم، لكن نرسل
    const status = document.getElementById('vote-status');
    if (status) status.textContent = `تم إرسال التصويت: ${mode}`;
    try { voteDialog.close(); } catch(e){ voteDialog.style.display='none'; }
  });
  const cancelVote = document.getElementById('cancel-vote');
  if (cancelVote) cancelVote.addEventListener('click', () => { try { voteDialog.close(); } catch(e){ voteDialog.style.display='none'; }});
}

// إشعارات الشات
if (btnNotificationsToggle) {
  btnNotificationsToggle.addEventListener('click', () => {
    notifyEnabled = !notifyEnabled;
    localStorage.setItem('notifyEnabled', notifyEnabled ? 'true' : 'false');
    btnNotificationsToggle.style.opacity = notifyEnabled ? '1' : '0.5';
  });
  // وضع ابتدائي
  btnNotificationsToggle.style.opacity = notifyEnabled ? '1' : '0.5';
}

// فتح الشات من التوست
if (openChatFromToast) openChatFromToast.addEventListener('click', () => {
  if (btnChat) btnChat.click();
  if (newMessageToast) newMessageToast.hidden = true;
});

// عرض/إخفاء لوحة الباور-أبز
if (btnPowerups && powerupsPanel) {
  btnPowerups.addEventListener('click', () => {
    const hidden = powerupsPanel.hasAttribute('hidden');
    if (hidden) { powerupsPanel.removeAttribute('hidden'); powerupsPanel.setAttribute('aria-hidden','false'); }
    else { powerupsPanel.setAttribute('hidden',''); powerupsPanel.setAttribute('aria-hidden','true'); }
  });
  const btnClosePowerups = document.getElementById('btn-close-powerups');
  if (btnClosePowerups) btnClosePowerups.addEventListener('click', ()=> {
    powerupsPanel.setAttribute('hidden',''); powerupsPanel.setAttribute('aria-hidden','true');
  });
}

// زر وضع الفرق (واجهة فقط هنا)
if (btnTeam) {
  btnTeam.addEventListener('click', () => {
    socket.emit('toggleTeamMode'); // سيرفر قد يتعامل مع هذا الحدث إن دعّمته
  });
}

// تسجيل حدث الإجابة (Enter)
inputAnswer && inputAnswer.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (!canAnswer) return;
    const answer = inputAnswer.value.trim();
    if (!answer) return;
    canAnswer = false;
    const timeUsed = ((Date.now() - startTime) / 1000).toFixed(2);
    socket.emit('submitAnswer', { answer, timeUsed });
    // نعرض فورياً في حال كانت الإجابة تخصنا (تابع server سيؤكد إذا صحيحة)
    inputAnswer.value = '';
  }
});

// --- استقبال أحداث من السيرفر ---
// كلمة جديدة
socket.on('newWord', word => {
  currentWord = word;
  if (wordDisplay) wordDisplay.textContent = word;
  startTime = Date.now();
  if (answerTimeDisplay) answerTimeDisplay.textContent = '';
  canAnswer = true;
});

// تحديث النقاط (لنفس اللاعب)
socket.on('updateScore', score => {
  myScore = score;
  if (pointsDisplay) pointsDisplay.textContent = `النقاط: ${myScore}`;
  // خزّن مجموع النقاط في الإحصائيات المحلية للاسم الحالي
  if (playerName) updateStatForPlayer(playerName, { points: score });
});

// تحديث قائمة اللاعبين
socket.on('updatePlayers', players => {
  updatePlayersList(players);
});

// استقبال رسائل الشات
socket.on('chatMessage', data => {
  // إذا كانت رسالة نظامية تخبر عن إجابة صحيحة بصيغة محددة، نعرضها في answersDisplay بدلاً من الشات
  if (data && data.system && typeof data.message === 'string') {
    // نمط الرسالة كما في server: "✅ <name> أجاب بشكل صحيح في <time> ثانية!"
    const re = /(?:✅\s*)?(.+?)\s.*?أجاب.*?([\d.]+)\sثانية/;
    const m = data.message.match(re);
    if (m) {
      const answeredName = m[1].trim();
      const timeUsed = parseFloat(m[2]);
      // عرض السجل
      showAnswerLog(answeredName, timeUsed);
      // تحديث إحصائيات محلياً
      updateStatForPlayer(answeredName, { timeUsed, points: 10 }); // نقطة ثابتة 10 كما في السيرفر
      return; // لا نضيف هذه الرسالة إلى الشات
    }
    // إذا كانت رسالة نظامية عامة (دخول/خروج) نضيفها للشات
    addChatMessage({ name: '', message: data.message, system: true });
    return;
  }

  // رسالة عادية من لاعب
  if (!chatContainer || chatContainer.hidden) {
    // الشات مغلق => نعرض شارة وإشعار توست إذا مفعّل
    if (chatBadge) chatBadge.hidden = false;
    if (notifyEnabled) {
      showNewMessageToast();
    }
  }
  addChatMessage({ name: data.name, message: data.message, system: data.system });
});

// استقبال حدث الإجابة الصحيحة (يصل فقط إلى اللاعب الذي أجاب حسب سيرفرك)
socket.on('correctAnswer', data => {
  // data: { timeUsed }
  if (answerTimeDisplay) answerTimeDisplay.textContent = `أجبت في: ${data.timeUsed} ثانية`;
  // نضيف إلى الإحصائيات الخاصة بي
  updateStatForPlayer(playerName, { timeUsed: data.timeUsed, points: 10 });
  canAnswer = false;
  setTimeout(() => {
    if (answerTimeDisplay) answerTimeDisplay.textContent = '';
    canAnswer = true;
  }, 2000);
});

// خطأ في الإجابة
socket.on('wrongAnswer', () => {
  canAnswer = true;
});

// تفعيل الإجابة
socket.on('enableAnswer', () => {
  canAnswer = true;
});

// استقبال ترحيب (تعيين id وارسال الاسم واللون)
socket.on('welcome', data => {
  playerId = data.id;
  // ارسل الاسم كما كان (كما في كودك)
  socket.emit('setName', playerName);
  // أرسل لون الاسم إلى السيرفر (سيرفر قد لا يستخدمه، لكن مفيد لو دعّمته لاحقاً)
  socket.emit('setColor', playerColor);
  // خزّن لون هذا الاسم محليًا
  if (playerName) localStorage.setItem('color_for_' + playerName, playerColor);
});

// إعلان فوز لاعب
socket.on('playerWon', data => {
  // data: { name, wins }
  winsCount = data.wins || winsCount;
  // تحديث الإحصائيات
  if (data && data.name) {
    updateStatForPlayer(data.name, { won: true });
  }
  // رسالة فورية للاعب الفائز (أظهر alert كما في القديم)
  if (data && data.name && data.name === playerName) {
    alert(`🎉 مبروك ${data.name} لقد فزت باللعبة!`);
  } else {
    // اظهار alert للكل (التصرف القديم كان يعرض للاعب صاحب الحدث فقط؛ نحتفظ به)
    alert(`🎉 الفائز: ${data.name}`);
  }
});

// طرد اللاعب
socket.on('kicked', () => {
  alert('تم طردك من اللعبة بواسطة الأدمن.');
  window.location.reload();
});

// عندما ينقطع الاتصال أو يعود، نُحاول إعادة تهيئة بعض الأشياء
socket.on('disconnect', () => {
  console.warn('Disconnected from server');
});

// --- تحديث قائمة اللاعبين (نحتفظ بالشكل لكن نلوّن الأسماء) ---
function updatePlayersList(players) {
  playersList.innerHTML = '';
  players.forEach((p, i) => {
    const li = document.createElement('li');
    li.dataset.id = p.id;
    let color = '';
    if (i === 0) color = 'red';
    else if (i === 1) color = 'green';
    else if (i === 2) color = 'orange';
    else color = '#00d1ff';
    li.style.color = color;
    // استخدام اللون الخاص باللاعب إن وُجد
    const playerColorForName = getColorForName(p.name, p.id);
    li.innerHTML = `${i + 1}. <span style="color:${playerColorForName}; font-weight:800;">${escapeHtml(p.name)}</span> - ${p.score} نقطة`;
    playersList.appendChild(li);
  });
}

// --- حدث الطلب اليدوي لتحديث اللاعبين من السيرفر (في حال استخدمناه) ---
socket.on('playersList', (players) => {
  updatePlayersList(players);
});

// --- أحداث إضافية (تفاعل مع الباور-أبز مثلا) ---
socket.on('powerupGranted', ({ playerId: pid, power }) => {
  // تأثير بسيط — يمكنك تعديله لاحقاً
  if (pid === playerId) {
    // عرض إشعار صغير
    const tmp = document.createElement('div');
    tmp.className = 'system-toast';
    tmp.textContent = `حصلت على باور-أب: ${power}`;
    document.body.appendChild(tmp);
    setTimeout(()=> tmp.remove(), 3500);
  }
});

// --- طلب تحديث عند بداية التشغيل ---
socket.emit('requestPlayersUpdate');

// نهاية الملف
// -----------------------------------------------------------------------
