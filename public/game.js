const socket = io();

const currentWordElem = document.getElementById('current-word');
const inputAnswer = document.getElementById('input-answer');
const pointsDisplay = document.getElementById('points-display');
const btnChat = document.getElementById('btn-chat');
const chatContainer = document.getElementById('chat-container');
const btnCloseChat = document.getElementById('btn-close-chat');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const btnChangeName = document.getElementById('btn-change-name');
const changeNameDialog = document.getElementById('change-name-dialog');
const changeNameForm = document.getElementById('change-name-form');
const inputName = document.getElementById('input-name');
const btnCancelName = document.getElementById('cancel-name');
const btnConfirmName = document.getElementById('confirm-name');
const playersList = document.getElementById('players-list');
const answerTimeElem = document.getElementById('answer-time');
const btnInstructions = document.getElementById('btn-instructions');
const instructionsDialog = document.getElementById('instructions-dialog');
const closeInstructions = document.getElementById('close-instructions');
const btnZizo = document.getElementById('btn-zizo');

// مودال معلومات اللاعب (ديناميكي)
let playerInfoDialog = null;

let myPlayerId = null;
let myScore = 0;
let canAnswer = true;
let currentWord = '';
let answerStartTime = null;
let unreadMessagesCount = 0;

// كلمات خاصة ملونة ومهتزة
const specialNamesColors = {
  "جهاد": "#00ffe7",
  "زيزو": "#ff3366",
  "أسامة": "#cc33ff",
  "مصطفى": "#33ff99",
  "حلا": "#ff33cc",
  "نور": "#ffff33",
  "كول": "#33ccff"
};

// فتح وإغلاق الشات
btnChat.addEventListener('click', () => {
  const expanded = btnChat.getAttribute('aria-expanded') === 'true';
  if (!expanded) {
    openChat();
  } else {
    closeChat();
  }
});

btnCloseChat.addEventListener('click', closeChat);

function openChat() {
  chatContainer.classList.add('open');
  btnChat.setAttribute('aria-expanded', 'true');
  chatInput.focus();
  unreadMessagesCount = 0;
  updateChatNotification();
}

function closeChat() {
  chatContainer.classList.remove('open');
  btnChat.setAttribute('aria-expanded', 'false');
  chatInput.value = '';
  chatInput.blur();
}

// إرسال الرسائل في الشات
chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const msg = chatInput.value.trim();
  if (!msg) return;
  socket.emit('sendMessage', msg);
  chatInput.value = '';
});

// استقبال كلمة جديدة
socket.on('newWord', word => {
  currentWord = word;
  currentWordElem.textContent = word;
  inputAnswer.value = '';
  canAnswer = true;
  answerStartTime = performance.now();
  answerTimeElem.textContent = '';
});

// استقبال تحديث النقاط
socket.on('updateScore', score => {
  myScore = score;
  pointsDisplay.textContent = `النقاط: ${score}`;
  canAnswer = true;
});

// استقبال تحديث قائمة اللاعبين
socket.on('updatePlayers', players => {
  renderPlayersList(players);
});

// استقبال رسالة شات
socket.on('chatMessage', data => {
  addChatMessage(data);

  // إذا الشات مغلق، نزود عداد الرسائل غير المقروءة
  if (!chatContainer.classList.contains('open')) {
    unreadMessagesCount++;
    updateChatNotification();
  }
});

// استقبال تأكيد إجابة صحيحة بدون رسالة شات (حسب طلبك)
socket.on('correctAnswer', () => {
  canAnswer = false;
});

// استقبال طرد من السيرفر
socket.on('kicked', () => {
  alert('تم طردك من اللعبة.');
  location.reload();
});

// استقبال فوز لاعب (يظهر فقط في نافذة اللاعبين)
socket.on('playerWon', ({ name, wins }) => {
  // يمكن اضافة إشعار هنا اذا حبيت
});

// رد على محاولة الاجابة الخاطئة
socket.on('wrongAnswer', () => {
  canAnswer = true;
});

// استقبال ترحيب مع id اللاعب
socket.on('welcome', ({ id }) => {
  myPlayerId = id;
});

// عرض معلومات اللاعب (عند الضغط على اسمه)
function renderPlayersList(players) {
  playersList.innerHTML = '';

  players.forEach(player => {
    const li = document.createElement('li');
    li.tabIndex = 0;
    li.style.color = player.color || '#aaffff';
    li.textContent = `${player.name} - نقاط: ${player.score}`;
    li.dataset.playerId = player.id;

    // عند الضغط على اسم اللاعب، نعرض مودال معلوماته
    li.addEventListener('click', () => {
      requestPlayerInfo(player.id);
    });
    li.addEventListener('keypress', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        requestPlayerInfo(player.id);
      }
    });

    playersList.appendChild(li);
  });
}

// طلب بيانات اللاعب من السيرفر
function requestPlayerInfo(playerId) {
  socket.emit('requestPlayerInfo', playerId);
}

// استقبال بيانات لاعب للعرض
socket.on('playerInfoData', data => {
  showPlayerInfoModal(data);
});

// عرض مودال معلومات اللاعب
function showPlayerInfoModal(data) {
  if (playerInfoDialog) {
    playerInfoDialog.remove();
  }

  playerInfoDialog = document.createElement('dialog');
  playerInfoDialog.id = 'player-info-dialog';
  playerInfoDialog.setAttribute('aria-modal', 'true');
  playerInfoDialog.setAttribute('aria-labelledby', 'player-info-title');

  playerInfoDialog.innerHTML = `
    <button class="close-player-info-btn" aria-label="إغلاق معلومات اللاعب">&times;</button>
    <h3 id="player-info-title">معلومات اللاعب: ${escapeHtml(data.name)}</h3>
    <p><strong>النقاط الكلية: </strong>${data.totalScore}</p>
    <p><strong>عدد مرات الفوز: </strong>${data.wins}</p>
    <p><strong>أسرع وقت للإجابة: </strong>${data.bestTime.toFixed(2)} ثانية</p>
  `;

  document.body.appendChild(playerInfoDialog);

  const closeBtn = playerInfoDialog.querySelector('.close-player-info-btn');
  closeBtn.addEventListener('click', () => {
    playerInfoDialog.close();
  });

  // إغلاق المودال بالضغط خارج الصندوق أو بمفتاح Escape
  playerInfoDialog.addEventListener('cancel', e => {
    e.preventDefault();
    playerInfoDialog.close();
  });

  playerInfoDialog.showModal();
}

// هروب النص لمنع XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ارسال الاجابة
inputAnswer.addEventListener('keydown', e => {
  if (e.key === 'Enter' && canAnswer) {
    e.preventDefault();
    submitAnswer();
  }
});

function submitAnswer() {
  const answer = inputAnswer.value.trim();
  if (!answer) return;
  if (!canAnswer) return;

  const timeUsed = (performance.now() - answerStartTime) / 1000;
  socket.emit('submitAnswer', { answer, timeUsed });
}

// تحديث اشعار الرسائل الجديدة في زر الشات
function updateChatNotification() {
  let notify = btnChat.querySelector('.chat-notify');
  if (!notify) {
    notify = document.createElement('span');
    notify.classList.add('chat-notify');
    btnChat.appendChild(notify);
  }
  if (unreadMessagesCount > 0) {
    notify.style.display = 'inline-block';
    notify.textContent = unreadMessagesCount;
  } else {
    notify.style.display = 'none';
  }
}

// عرض رسالة في الشات
function addChatMessage(data) {
  const div = document.createElement('div');
  div.classList.add('chat-message');

  if (data.system) {
    div.classList.add('chat-system-message');
    div.textContent = data.message;
  } else {
    // نميز الأسماء حسب الألوان الخاصة
    const nameSpan = document.createElement('span');
    nameSpan.classList.add('chat-name');
    nameSpan.textContent = data.name;
    if (specialNamesColors[data.name]) {
      nameSpan.style.color = specialNamesColors[data.name];
      nameSpan.classList.add('special-word', 'shake');
    }
    div.appendChild(nameSpan);

    const msgSpan = document.createElement('span');
    msgSpan.textContent = `: ${data.message}`;
    div.appendChild(msgSpan);

    // تمييز الكلمات الخاصة داخل الرسالة (مثلاً زيزو، جهاد، مصطفى)
    highlightSpecialWords(div, data.message);
  }

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// تمييز كلمات خاصة في الشات
function highlightSpecialWords(container, message) {
  const specialWords = Object.keys(specialNamesColors);
  specialWords.forEach(word => {
    const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
    container.innerHTML = container.innerHTML.replace(regex, match => {
      const color = specialNamesColors[word];
      return `<span class="special-word shake" style="color:${color}">${match}</span>`;
    });
  });
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// فتح وإغلاق مودال تغيير الاسم
btnChangeName.addEventListener('click', () => {
  inputName.value = '';
  changeNameDialog.showModal();
  inputName.focus();
});

btnCancelName.addEventListener('click', () => {
  changeNameDialog.close();
});

changeNameForm.addEventListener('submit', e => {
  e.preventDefault();
  const newName = inputName.value.trim();
  if (newName.length > 0) {
    socket.emit('setName', newName);
    changeNameDialog.close();
  }
});

// تعليمات اللعبة
btnInstructions.addEventListener('click', () => {
  instructionsDialog.showModal();
});

closeInstructions.addEventListener('click', () => {
  instructionsDialog.close();
});

// زر لعبة زيزو يفتح رابط خارجي
btnZizo.addEventListener('click', () => {
  window.open('https://sp-p2.onrender.com', '_blank');
});

// استقبال عرض زمن الاجابة واسم اللاعب فوق النقاط (أسفل كلمة الوقت)
socket.on('showAnswerTime', ({ name, time }) => {
  answerTimeElem.textContent = `${name} أجاب خلال ${time.toFixed(2)} ثانية`;
});

// حذف عرض الزمن بعد 3 ثواني
socket.on('clearAnswerTime', () => {
  setTimeout(() => {
    answerTimeElem.textContent = '';
  }, 3000);
});

// عند فتح الشات يتم مسح الإشعارات
chatContainer.addEventListener('transitionend', () => {
  if (chatContainer.classList.contains('open')) {
    unreadMessagesCount = 0;
    updateChatNotification();
  }
});
