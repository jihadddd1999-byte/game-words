const socket = io();

// عناصر DOM
const currentWordEl = document.getElementById('current-word');
const inputAnswer = document.getElementById('input-answer');
const pointsDisplay = document.getElementById('points-display');
const answerResult = document.getElementById('answer-result');
const answerTimeEl = document.getElementById('answer-time');

const btnChat = document.getElementById('btn-chat');
const btnCloseChat = document.getElementById('btn-close-chat');
const chatContainer = document.getElementById('chat-container');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const newMsgCountEl = document.getElementById('new-msg-count');

const btnChangeName = document.getElementById('btn-change-name');
const changeNameDialog = document.getElementById('change-name-dialog');
const changeNameForm = document.getElementById('change-name-form');
const inputName = document.getElementById('input-name');
const btnCancelName = document.getElementById('cancel-name');
const btnConfirmName = document.getElementById('confirm-name');

const btnInstructions = document.getElementById('btn-instructions');
const instructionsDialog = document.getElementById('instructions-dialog');
const btnCloseInstructions = document.getElementById('close-instructions');

const playersList = document.getElementById('players-list');

const playerProfileDialog = document.getElementById('player-profile-dialog');
const profileName = document.getElementById('profile-name');
const profileFastestTime = document.getElementById('profile-fastest-time');
const profileTotalPoints = document.getElementById('profile-total-points');
const profileWins = document.getElementById('profile-wins');
const closePlayerProfileBtn = document.getElementById('close-player-profile');

// بيانات اللاعب المحلي
let myId = null;
let myScore = 0;
let canAnswer = true;

// حفظ أسرع وقت لكل لاعب
const fastestTimes = {};

// عداد رسائل الشات الجديدة
let newMsgCount = 0;

// --- دوال مساعدة ---

// وظيفة لتوليد رسالة في الشات
function addChatMessage({ name, message, system = false, color = null }) {
  const msgEl = document.createElement('div');
  msgEl.classList.add('chat-message');
  if(system) {
    msgEl.classList.add('chat-system-message');
    msgEl.textContent = message;
  } else {
    const nameSpan = document.createElement('span');
    nameSpan.classList.add('chat-name');
    nameSpan.textContent = name;
    if(color) {
      nameSpan.style.color = color;
    }
    nameSpan.tabIndex = 0; // يمكن الوصول للعنصر عبر الكيبورد
    nameSpan.style.cursor = 'pointer';

    // عند الضغط على اسم اللاعب يظهر ملفه
    nameSpan.addEventListener('click', () => openPlayerProfile(name));

    const messageSpan = document.createElement('span');
    messageSpan.textContent = ': ' + message;

    msgEl.appendChild(nameSpan);
    msgEl.appendChild(messageSpan);
  }
  chatMessages.appendChild(msgEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // زيادة عداد الرسائل الجديدة إذا الشات مخفي
  if(chatContainer.hidden) {
    newMsgCount++;
    updateNewMsgCount();
  }
}

// تحديث عداد الرسائل الجديدة
function updateNewMsgCount() {
  if(newMsgCount > 0) {
    newMsgCountEl.style.display = 'inline-block';
    newMsgCountEl.textContent = newMsgCount > 99 ? '99+' : newMsgCount;
  } else {
    newMsgCountEl.style.display = 'none';
    newMsgCountEl.textContent = '';
  }
}

// فتح الشات - فول سكرين
function openChat() {
  chatContainer.hidden = false;
  chatContainer.classList.add('open');
  btnChat.setAttribute('aria-expanded', 'true');
  chatInput.focus();
  newMsgCount = 0;
  updateNewMsgCount();
}

// إغلاق الشات
function closeChat() {
  chatContainer.classList.remove('open');
  // بعد انتهاء الانتقال نخفي العنصر
  chatContainer.addEventListener('transitionend', () => {
    if (!chatContainer.classList.contains('open')) {
      chatContainer.hidden = true;
    }
  }, { once: true });
  btnChat.setAttribute('aria-expanded', 'false');
}

// تحديث قائمة اللاعبين في الواجهة
function updatePlayersList(players) {
  playersList.innerHTML = '';
  players.forEach(p => {
    const li = document.createElement('li');
    li.textContent = `${p.name} - نقاط: ${p.score}`;
    if(p.color) {
      li.style.color = p.color;
    }
    li.tabIndex = 0;
    li.style.cursor = 'pointer';
    // عند الضغط يفتح ملف اللاعب
    li.addEventListener('click', () => openPlayerProfile(p.name));
    playersList.appendChild(li);
  });
}

// فتح ملف اللاعب وعرض بياناته
function openPlayerProfile(playerName) {
  // نرسل للسيرفر نطلب بيانات ملف اللاعب (ممكن تخزينها بالسيرفر)
  socket.emit('requestPlayerProfile', playerName);
  // نظهر مودال بانتظار البيانات
  profileName.textContent = playerName;
  profileFastestTime.textContent = 'جارٍ التحميل...';
  profileTotalPoints.textContent = 'جارٍ التحميل...';
  profileWins.textContent = 'جارٍ التحميل...';
  playerProfileDialog.showModal();
}

// تحديث ملف اللاعب بالبيانات
function updatePlayerProfile(data) {
  profileName.textContent = data.name || '';
  profileFastestTime.textContent = data.fastestTime != null ? data.fastestTime.toFixed(2) : '-';
  profileTotalPoints.textContent = data.totalPoints || 0;
  profileWins.textContent = data.wins || 0;
}

// --- أحداث واجهة المستخدم ---

btnChat.addEventListener('click', () => {
  if(chatContainer.hidden) {
    openChat();
  } else {
    closeChat();
  }
});

btnCloseChat.addEventListener('click', closeChat);

chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const msg = chatInput.value.trim();
  if(msg === '') return;
  socket.emit('sendMessage', msg);
  chatInput.value = '';
});

btnChangeName.addEventListener('click', () => {
  changeNameDialog.showModal();
  inputName.value = '';
  inputName.focus();
});

btnCancelName.addEventListener('click', () => {
  changeNameDialog.close();
});

changeNameForm.addEventListener('submit', e => {
  e.preventDefault();
  const newName = inputName.value.trim();
  if(newName.length > 0) {
    socket.emit('setName', newName);
  }
  changeNameDialog.close();
});

btnInstructions.addEventListener('click', () => {
  instructionsDialog.showModal();
});

btnCloseInstructions.addEventListener('click', () => {
  instructionsDialog.close();
});

closePlayerProfileBtn.addEventListener('click', () => {
  playerProfileDialog.close();
});

// عند الضغط على Enter في خانة الإجابة
inputAnswer.addEventListener('keydown', e => {
  if(e.key === 'Enter') {
    e.preventDefault();
    if(!canAnswer) return;
    const answer = inputAnswer.value.trim();
    if(answer.length === 0) return;
    const timeUsed = parseFloat(answerTimeEl.textContent) || 0;
    socket.emit('submitAnswer', { answer, timeUsed });
    inputAnswer.value = '';
  }
});

// استقبال رسالة ترحيب وحفظ ID
socket.on('welcome', data => {
  myId = data.id;
});

// استقبال كلمة جديدة
socket.on('newWord', word => {
  currentWordEl.textContent = word;
  answerResult.textContent = '';
  canAnswer = true;
});

// استقبال تحديث النقاط
socket.on('updateScore', score => {
  myScore = score;
  pointsDisplay.textContent = `النقاط: ${score}`;
});

// استقبال تحديث قائمة اللاعبين
socket.on('updatePlayers', players => {
  updatePlayersList(players);
});

// استقبال رسالة شات
socket.on('chatMessage', data => {
  addChatMessage(data);
});

// استقبال تنبيه إجابة صحيحة (لكن لا نعرضها في الشات، بل تحت خانة الإجابة)
socket.on('correctAnswer', data => {
  if(data && typeof data.timeUsed === 'number') {
    answerResult.textContent = `✅ أجبت بشكل صحيح في ${data.timeUsed.toFixed(2)} ثانية!`;
  }
  canAnswer = false;
});

// استقبال كلمة نظامية في الشات (مثل خطأ أو طرد) - أضفنا معالجة لعرضها كما هي في الشات

// استقبال تحديث خاصيات الإجابة (ممكن تستخدمها إن أردت)
socket.on('enableAnswer', () => {
  canAnswer = true;
});

// استقبال ملف لاعب
socket.on('playerProfileData', data => {
  if(data && data.name) {
    updatePlayerProfile(data);
  }
});

// إعادة تعيين عرض نتيجة الإجابة عند كلمة جديدة
socket.on('newWord', () => {
  answerResult.textContent = '';
  canAnswer = true;
});

// فتح ملف اللاعب من قائمة اللاعبين والشات
// نفس الوظيفة مرتبطة عبر الأحداث DOM

// عند استلام رسالة جديدة وأنت الشات مغلق نزيد العداد (مطبق ضمن addChatMessage)

// تهيئة: إخفاء الشات عند بدء التشغيل
chatContainer.hidden = true;

// تهيئة: إخفاء عداد الرسائل الجديدة
updateNewMsgCount();
