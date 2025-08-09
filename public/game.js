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
const playersList = document.getElementById('players-list');
const answerTimeElem = document.getElementById('answer-time');
const playersTopList = document.getElementById('players-top-list');

let myPlayerId = null;
let myScore = 0;
let canAnswer = true;
let currentWord = '';
let answerStartTime = null;
let unreadMessagesCount = 0;

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
  if (chatContainer.classList.contains('open')) {
    closeChat();
  } else {
    openChat();
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

// استقبال الترحيب ومعرف اللاعب
socket.on('welcome', data => {
  myPlayerId = data.id;
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

// استقبال قائمة اللاعبين المحدثة
socket.on('updatePlayers', players => {
  renderPlayersList(players);
});

// استقبال قائمة أفضل 5 لاعبين
socket.on('updateTopPlayers', topPlayers => {
  renderPlayersTopList(topPlayers);
});

// استقبال رسائل الشات
socket.on('chatMessage', data => {
  addChatMessage(data);

  if (!chatContainer.classList.contains('open')) {
    unreadMessagesCount++;
    updateChatNotification();
  }
});

// عرض الوقت واسم اللاعب تحت خانة الإجابة عند الإجابة الصحيحة
socket.on('showAnswerTime', ({ name, time }) => {
  answerTimeElem.textContent = `${name} أجاب خلال ${time.toFixed(2)} ثانية`;
  setTimeout(() => {
    answerTimeElem.textContent = '';
  }, 3000);
});

// إرسال رسالة الشات
chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const msg = chatInput.value.trim();
  if (!msg) return;
  socket.emit('sendMessage', msg);
  chatInput.value = '';
});

// إرسال الإجابة عند الضغط على Enter
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

// تغيير الاسم - فتح نافذة
btnChangeName.addEventListener('click', () => {
  changeNameDialog.showModal();
  inputName.value = '';
  inputName.focus();
});

// إلغاء تغيير الاسم
btnCancelName.addEventListener('click', () => {
  changeNameDialog.close();
});

// تأكيد تغيير الاسم
changeNameForm.addEventListener('submit', e => {
  e.preventDefault();
  const newName = inputName.value.trim();
  if (newName.length === 0) return;
  socket.emit('setName', newName);
  changeNameDialog.close();
});

// إضافة رسالة جديدة للشات
function addChatMessage(data) {
  const div = document.createElement('div');
  div.classList.add('chat-message');

  if (data.system) {
    div.classList.add('chat-system-message');
    div.textContent = data.message;
  } else {
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

    highlightSpecialWords(div, data.message);
  }

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

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

// عرض قائمة اللاعبين في الشريط الجانبي
function renderPlayersList(players) {
  playersList.innerHTML = '';
  players.forEach(player => {
    const li = document.createElement('li');
    li.tabIndex = 0;
    li.style.color = player.color || '#aaffff';
    li.textContent = `${player.name} - نقاط: ${player.score}`;
    playersList.appendChild(li);
  });
}

// عرض قائمة أفضل 5 لاعبين
function renderPlayersTopList(topPlayers) {
  playersTopList.innerHTML = '';
  topPlayers.forEach((p, idx) => {
    const li = document.createElement('li');
    li.textContent = `${idx + 1}. ${p.name} - نقاط: ${p.totalScore} - فوز: ${p.wins}`;
    playersTopList.appendChild(li);
  });
}
