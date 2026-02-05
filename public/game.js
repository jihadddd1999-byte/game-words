const socket = io();

// ===== Keep server alive (Render fix) =====
setInterval(() => {
  fetch("/ping").catch(() => {});
}, 4 * 60 * 1000); // كل 4 دقائق

// --- عناصر DOM ---
const wordDisplay = document.getElementById('current-word');
const inputAnswer = document.getElementById('input-answer');
const pointsDisplay = document.getElementById('points-display');
const answerTimeDisplay = document.getElementById('answer-time');

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
const inputColor = document.getElementById('input-color');

const btnInstructions = document.getElementById('btn-instructions');
const instructionsDialog = document.getElementById('instructions-dialog');
const closeInstructionsBtn = document.getElementById('close-instructions');

const btnZizo = document.getElementById('btn-zizo');

const playersList = document.getElementById('players-list');

// --- المتغيرات الأساسية ---
let playerId = null;
let currentWord = '';
let startTime = 0;
let myScore = 0;
let playerName = localStorage.getItem('playerName') || `لاعب${Math.floor(Math.random() * 1000)}`;
let playerColor = localStorage.getItem('playerColor') || '#00e5ff';
let canAnswer = true; // للتحكم بالسماح بالإجابة

// ألوان خاصة لأسماء محددة (مطابقة للسيرفر)
const specialNameColors = {
  "جهاد": "#00ffe7",
  "ز": "#ff3366",
  "أسامة": "#cc33ff",
  "مصطفى": "#33ff99",
  "حلا": "#ff33cc",
  "نور": "#ffff33",
  "كول": "#33ccff"
};

// --- دوال مساعدة ---

// تمرير الشات لأسفل تلقائي
function scrollChatToBottom() {
  if (isUserAtBottom) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

function colorizeName(name, color = null) {

  // تأثير خاص لاسم كول (فقط بالشات)
  if (name === "كول") {
    return `
      <span class="kol-wrapper">
        <span class="kol-name">كول</span>
      </span>
    `;
  }

  if (!color) {
    color = specialNameColors[name] || '#00e5ff';
  }
  return `<span style="color: ${color}; font-weight: 700;">${name}</span>`;
}

// تمييز كلمات خاصة في نص الرسائل مع اهتزاز إن لزم الأمر
function highlightSpecialWords(text) {
  const specialWords = {
    'زيزو': { color: '#ff3366', shake: true },
    'جهاد': { color: '#00ffe7', shake: false },
    'حلا': { color: '#ff33cc', shake: false },
    'كول': { color: '#33ccff', shake: false },
    'مصطفى': { color: '#33ff99', shake: false },
  };

  let result = text;

  Object.keys(specialWords).forEach(word => {
    const { color, shake } = specialWords[word];
    const shakeClass = shake ? ' shake' : '';
    const regex = new RegExp(`\\b${word}\\b`, 'gu');
    result = result.replace(regex, `<span class="special-word${shakeClass}" style="color:${color}">${word}</span>`);
  });

  return result;
}

// إضافة رسالة جديدة للشات
function addChatMessage({ name, message, system = false, color = null, time = '' }) {
  const div = document.createElement('div');
  div.classList.add('chat-message');

  if (!time) {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    time = `${hours}:${minutes}`;
  }

  if (system) {
    div.classList.add('chat-system-message');
    div.textContent = message;

    const timeSpan = document.createElement('span');
    timeSpan.textContent = ` [${time}]`;
    timeSpan.style.fontSize = '10px';
    timeSpan.style.color = '#888';
    div.appendChild(timeSpan);

  } else {
    const nameSpan = document.createElement('span');
    nameSpan.classList.add('chat-name');
    nameSpan.innerHTML = colorizeName(name, color);

    const messageSpan = document.createElement('span');
    messageSpan.classList.add('chat-text');
    messageSpan.innerHTML = highlightSpecialWords(message);

    div.appendChild(nameSpan);
    div.appendChild(document.createTextNode(' : '));
    div.appendChild(messageSpan);

    const timeSpan = document.createElement('span');
    timeSpan.textContent = ` [${time}]`;
    timeSpan.style.fontSize = '10px';
    timeSpan.style.color = '#888';
    div.appendChild(timeSpan);
  }

  chatMessages.appendChild(div);
  scrollChatToBottom();
  
  if (!chatContainer.classList.contains('open') && !system) {
    btnChat.classList.add('notify');
    playNotificationSound();
  }
}

// دالة تشغيل صوت تنبيه
function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
    oscillator.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.15);
  } catch (e) {}
}

// تحديث قائمة اللاعبين
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
    li.innerHTML = `${i + 1}. ${colorizeName(p.name, p.color)} - ${p.score} نقطة`;
    playersList.appendChild(li);
  });
}

// --- الأحداث الأساسية ---

// فتح/غلق الشات مع إزالة البادجات عند الفتح
btnChat.addEventListener('click', () => {
  const isOpen = chatContainer.classList.toggle('open');
  btnChat.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  chatContainer.hidden = !isOpen;

  if (isOpen) {
    chatInput.focus();
    newMessageCount = 0;
    hideChatBadge();
    hideTopBadge();
    isUserAtBottom = true;
    chatMessages.scrollTop = chatMessages.scrollHeight;
    btnChat.classList.remove('notify');
  } else {
    btnChat.classList.remove('notify');
  }
});

// زر إغلاق الشات
btnCloseChat.addEventListener('click', () => {
  chatContainer.classList.remove('open');
  btnChat.setAttribute('aria-expanded', 'false');
  chatContainer.hidden = true;
  btnChat.classList.remove('notify');
});

// إرسال رسالة شات
chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const msg = chatInput.value.trim();
  if (!msg) return;

  socket.emit('sendMessage', msg);
  chatInput.value = '';
});

// فتح مودال تغيير الاسم
btnChangeName.addEventListener('click', () => {
  inputName.value = playerName;
  inputColor.value = playerColor;
  changeNameDialog.showModal();
});

// إغلاق مودال تغيير الاسم عند إلغاء
cancelNameBtn.addEventListener('click', () => {
  changeNameDialog.close();
});

// تأكيد تغيير الاسم واللون
changeNameForm.addEventListener('submit', e => {
  e.preventDefault();
  const newName = inputName.value.trim();
  const newColor = inputColor.value;
  if (newName && (newName !== playerName || newColor !== playerColor)) {
    playerName = newName;
    playerColor = newColor;
    localStorage.setItem('playerName', playerName);
    localStorage.setItem('playerColor', playerColor);
    socket.emit('setName', { name: playerName, color: playerColor });
  }
  changeNameDialog.close();
});

// فتح وإغلاق نافذة التعليمات
btnInstructions.addEventListener('click', () => instructionsDialog.showModal());
closeInstructionsBtn.addEventListener('click', () => instructionsDialog.close());

// إرسال الإجابة عند الضغط على Enter
inputAnswer.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (!canAnswer) return;
    const answer = inputAnswer.value.trim();
    if (!answer) return;

    canAnswer = false;
    const timeUsed = ((Date.now() - startTime) / 1000).toFixed(2);
    socket.emit('submitAnswer', { answer, timeUsed });
    inputAnswer.value = '';
  }
});

// استقبال كلمة جديدة
socket.on('newWord', word => {
  currentWord = word;
  wordDisplay.textContent = word;
  startTime = Date.now();
  answerTimeDisplay.textContent = '';
  canAnswer = true;
});

// تحديث النقاط وقائمة اللاعبين
socket.on('updateScore', score => {
  myScore = score;
  pointsDisplay.textContent = `النقاط: ${myScore}`;
});
socket.on('updatePlayers', players => updatePlayersList(players));

// استقبال رسالة شات
socket.on('chatMessage', data => {
  addChatMessage({
    name: data.system ? '' : data.name,
    message: data.message,
    system: data.system,
    color: data.color || null,
    time: data.time || ''
  });
});

// إشعارات الفوز والطرد
socket.on('playerWon', data => alert(`🎉 مبروك ${data.name} لقد فزت باللعبة!`));
socket.on('kicked', () => {
  alert('تم طردك من اللعبة بواسطة الأدمن.');
  window.location.reload();
});

// استقبال بيانات الترحيب
socket.on('welcome', data => {
  playerId = data.id;
  socket.emit('setName', { name: playerName, color: playerColor });
});

// الإجابة الصحيحة والخاطئة
socket.on('correctAnswer', data => {
  answerTimeDisplay.textContent = `أجبت في: ${data.timeUsed} ثانية`;
  canAnswer = false;
  setTimeout(() => {
    answerTimeDisplay.textContent = '';
    canAnswer = true;
  }, 2000);
});
socket.on('wrongAnswer', () => { canAnswer = true; });
socket.on('enableAnswer', () => { canAnswer = true; });

// =========================
//      BADGES SYSTEM
// =========================
let isUserAtBottom = true;
let newMessageCount = 0;

// البادج داخل الشات
function showChatBadge(count) {
  let badge = document.getElementById('newMessageBadge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'newMessageBadge';
    badge.style.position = 'absolute';
    badge.style.left = '10px';
    badge.style.bottom = '10px';
    badge.style.backgroundColor = '#ffff00';
    badge.style.color = '#000';
    badge.style.padding = '4px 8px';
    badge.style.borderRadius = '12px';
    badge.style.fontWeight = '700';
    badge.style.fontSize = '12px';
    badge.style.cursor = 'pointer';
    badge.style.transition = 'transform 0.2s ease';

    badge.addEventListener('click', () => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
      newMessageCount = 0;
      hideChatBadge();
      hideTopBadge();
      isUserAtBottom = true;
    });

    chatContainer.style.position = 'relative';
    chatContainer.appendChild(badge);
  }

  badge.textContent = `↓ ${count} رسالة جديدة`;
  badge.style.display = 'block';
  badge.style.transform = 'scale(1.2)';
  setTimeout(() => { badge.style.transform = 'scale(1)'; }, 200);
}
function hideChatBadge() { const badge = document.getElementById('newMessageBadge'); if (badge) badge.style.display = 'none'; }

// البادج فوق زر الشات
let topBadge = null;
function showTopBadge(count) {
  if (!topBadge) {
    topBadge = document.createElement('div');
    topBadge.id = 'topChatBadge';
    topBadge.style.position = 'absolute';
    topBadge.style.top = '0px';
    topBadge.style.right = '0px';
    topBadge.style.transform = 'translate(50%,-50%)';
    topBadge.style.backgroundColor = '#FFFF00';
    topBadge.style.color = '#fff';
    topBadge.style.padding = '2px 6px';
    topBadge.style.borderRadius = '50%';
    topBadge.style.fontWeight = '700';
    topBadge.style.fontSize = '12px';
    topBadge.style.cursor = 'pointer';
    topBadge.style.zIndex = '1000';
    btnChat.style.position = 'relative';
    btnChat.appendChild(topBadge);
  }
  topBadge.textContent = count;
  topBadge.style.display = 'block';
}
function hideTopBadge() { if (topBadge) topBadge.style.display = 'none'; }

// تعديل addChatMessage لإظهار البادجين
const originalAddChatMessage = addChatMessage;
addChatMessage = function(data) {
  originalAddChatMessage(data);

  const atBottom = chatMessages.scrollTop + chatMessages.clientHeight >= chatMessages.scrollHeight - 10;

  if (atBottom) {
    newMessageCount = 0;
    hideChatBadge();
    hideTopBadge();
    isUserAtBottom = true;
  } else {
    newMessageCount++;
    showChatBadge(newMessageCount);

    if (!chatContainer.classList.contains('open')) {
      showTopBadge(newMessageCount);
    }
    isUserAtBottom = false;
  }
};

// التحقق من scroll المستخدم داخل الشات
chatMessages.addEventListener('scroll', () => {
  const threshold = 10;
  const position = chatMessages.scrollTop + chatMessages.clientHeight;
  const height = chatMessages.scrollHeight;

  isUserAtBottom = position >= height - threshold;

  if (isUserAtBottom) {
    newMessageCount = 0;
    hideChatBadge();
    hideTopBadge();
  }
});

// =========================
//      TYPING SYSTEM
// =========================
const typingMessages = {};

chatInput.addEventListener('input', () => {
  const text = chatInput.value.trim();

  if (text.length > 0) socket.emit('typing', playerName);
  else socket.emit('stopTyping', playerName);
});

socket.on('typing', typingNames => {
  Object.keys(typingMessages).forEach(name => {
    if (!typingNames.includes(name)) {
      typingMessages[name].remove();
      delete typingMessages[name];
    }
  });

  typingNames.forEach(name => {
    if (name === playerName) return;

    if (!typingMessages[name]) {
      const div = document.createElement('div');
      div.className = 'chat-message chat-typing';
      div.dataset.typing = name;
      div.textContent = `${name} يكتب...`;

      chatMessages.appendChild(div);
      scrollChatToBottom();

      typingMessages[name] = div;
    }
  });
});
