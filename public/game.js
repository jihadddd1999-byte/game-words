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
  "زيزو": "#ff3366",
  "أسامة": "#cc33ff",
  "مصطفى": "#33ff99",
  "حلا": "#ff33cc",
  "نور": "#ffff33",
  "كول": "#33ccff"
};

// --- دوال مساعدة ---

// تمرير الشات لأسفل تلقائي
function scrollChatToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// تلوين الاسم حسب اللون المخصص أو لون اللاعب
function colorizeName(name, color = null) {
  if (!color) {
    color = specialNameColors[name] || '#00e5ff'; // اللون الافتراضي لو ما محدد
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
    // استخدم regex للبحث عن الكلمة فقط كاملة (كلمة منفصلة)
    const regex = new RegExp(`\\b${word}\\b`, 'gu');
    result = result.replace(regex, `<span class="special-word${shakeClass}" style="color:${color}">${word}</span>`);
  });

  return result;
}

// إضافة رسالة جديدة للشات
function addChatMessage({ name, message, system = false, color = null }) {
  const div = document.createElement('div');
  div.classList.add('chat-message');

  if (system) {
    div.classList.add('chat-system-message');
    div.textContent = message;
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
  }

  chatMessages.appendChild(div);
  scrollChatToBottom();

  // إشعار صوتي ووميض في زر الشات إذا الشات مغلق والرسالة ليست نظامية
  if (!chatContainer.classList.contains('open') && !system) {
    btnChat.classList.add('notify');
    playNotificationSound();
  }
}

// دالة تشغيل صوت تنبيه (صوت بسيط قصير)
function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
    oscillator.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.15);
  } catch (e) {
    // صوت غير مدعوم أو مشكلة، تجاهل
  }
}

// تحديث قائمة اللاعبين بالترتيب مع الألوان
function updatePlayersList(players) {
  playersList.innerHTML = '';
  players.forEach((p, i) => {
    const li = document.createElement('li');
    li.dataset.id = p.id;

    let color = '';
    if (i === 0) color = 'red';       // المركز الأول أحمر
    else if (i === 1) color = 'green'; // الثاني أخضر
    else if (i === 2) color = 'orange';// الثالث برتقالي
    else color = '#00d1ff';            // باقي المراكز أزرق سماوي

    li.style.color = color;
    li.innerHTML = `${i + 1}. ${colorizeName(p.name, p.color)} - ${p.score} نقطة`;
    playersList.appendChild(li);
  });
}

// --- الأحداث ---

// فتح/غلق الشات
btnChat.addEventListener('click', () => {
  if (chatContainer.classList.contains('open')) {
    chatContainer.classList.remove('open');
    btnChat.setAttribute('aria-expanded', 'false');
    chatContainer.hidden = true;
    btnChat.classList.remove('notify'); // إزالة التنبيه عند الفتح
  } else {
    chatContainer.classList.add('open');
    btnChat.setAttribute('aria-expanded', 'true');
    chatContainer.hidden = false;
    chatInput.focus();
    btnChat.classList.remove('notify'); // إزالة التنبيه عند الفتح
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

// فتح مودال تغيير الاسم مع تعبئة القيم الحالية
btnChangeName.addEventListener('click', () => {
  inputName.value = playerName;
  inputColor.value = playerColor;
  changeNameDialog.showModal();
});

// إغلاق مودال تغيير الاسم عند إلغاء
cancelNameBtn.addEventListener('click', () => {
  changeNameDialog.close();
});

// تأكيد تغيير الاسم واللون وإرسالها للسيرفر وتخزينها محليًا
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

// فتح نافذة التعليمات
btnInstructions.addEventListener('click', () => {
  instructionsDialog.showModal();
});

// إغلاق نافذة التعليمات
closeInstructionsBtn.addEventListener('click', () => {
  instructionsDialog.close();
});


// إرسال الإجابة عند الضغط على Enter في حقل الإجابة
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

// استقبال تحديث نقاط اللاعب
socket.on('updateScore', score => {
  myScore = score;
  pointsDisplay.textContent = `النقاط: ${myScore}`;
});

// تحديث قائمة اللاعبين
socket.on('updatePlayers', players => {
  updatePlayersList(players);
});

// استقبال رسالة شات
socket.on('chatMessage', data => {
  addChatMessage({
    name: data.system ? '' : data.name,
    message: data.message,
    system: data.system,
    color: data.color || null
  });
});

// إشعار فوز لاعب
socket.on('playerWon', data => {
  alert(`🎉 مبروك ${data.name} لقد فزت باللعبة!`);
});

// تم طرد اللاعب من السيرفر
socket.on('kicked', () => {
  alert('تم طردك من اللعبة بواسطة الأدمن.');
  window.location.reload();
});

// استقبال بيانات الترحيب وتعيين معرف اللاعب وإرسال اسمه ولونه للسيرفر
socket.on('welcome', data => {
  playerId = data.id;
  socket.emit('setName', { name: playerName, color: playerColor });
});

// استقبال إجابة صحيحة: عرض زمن الإجابة مؤقتًا ومنع الإجابة مؤقتاً
socket.on('correctAnswer', data => {
  answerTimeDisplay.textContent = `أجبت في: ${data.timeUsed} ثانية`;
  canAnswer = false;
  setTimeout(() => {
    answerTimeDisplay.textContent = '';
    canAnswer = true;
  }, 2000);
});

// استقبال إجابة خاطئة: إعادة السماح بالإجابة
socket.on('wrongAnswer', () => {
  canAnswer = true;
});

// إعادة تمكين الإجابة (إذا لزم الأمر)
socket.on('enableAnswer', () => {
  canAnswer = true;
});

// === إضافة auto-scroll + badge للرسائل الجديدة مدمجة بالكامل ===
(function() {
  let newMessageCount = 0;

  // دوال badge للرسائل الجديدة
  function showNewMessageBadge(count) {
    let badge = document.getElementById('newMessageBadge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'newMessageBadge';
      badge.style.position = 'absolute';
      badge.style.bottom = '80px'; // فوق input الشات
      badge.style.right = '20px';
      badge.style.backgroundColor = '#ff3b30';
      badge.style.color = '#fff';
      badge.style.padding = '6px 12px';
      badge.style.borderRadius = '12px';
      badge.style.cursor = 'pointer';
      badge.style.zIndex = '1000';
      badge.style.fontWeight = '700';
      badge.addEventListener('click', () => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
        newMessageCount = 0;
        hideNewMessageBadge();
      });
      document.body.appendChild(badge);
    }
    badge.textContent = `↓ ${count} رسالة جديدة`;
    badge.style.display = 'block';
  }

  function hideNewMessageBadge() {
    const badge = document.getElementById('newMessageBadge');
    if (badge) badge.style.display = 'none';
  }

  // متابعة scroll المستخدم لتحديث حالة auto-scroll
  chatMessages.addEventListener('scroll', () => {
    const atBottom = chatMessages.scrollTop + chatMessages.clientHeight >= chatMessages.scrollHeight - 10;
    if (atBottom) {
      newMessageCount = 0;
      hideNewMessageBadge();
    }
  });

  // تعديل دالة addChatMessage الأصلية لإضافة auto-scroll
  const originalAddChatMessage = addChatMessage;
  addChatMessage = function(data) {
    originalAddChatMessage(data); // استدعاء الوظيفة الأصلية

    const atBottom = chatMessages.scrollTop + chatMessages.clientHeight >= chatMessages.scrollHeight - 10;
    if (atBottom) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
      newMessageCount = 0;
      hideNewMessageBadge();
    } else {
      newMessageCount++;
      showNewMessageBadge(newMessageCount);
    }
  };
})();
