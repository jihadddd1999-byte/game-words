const socket = io();

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

const btnInstructions = document.getElementById('btn-instructions');
const instructionsDialog = document.getElementById('instructions-dialog');
const closeInstructionsBtn = document.getElementById('close-instructions');

const btnZizo = document.getElementById('btn-zizo');

const playersList = document.getElementById('players-list');

let playerId = null;
let currentWord = '';
let startTime = 0;
let myScore = 0;
let myWins = 0;
let playerName = localStorage.getItem('playerName') || `لاعب${Math.floor(Math.random() * 1000)}`;

let canAnswer = true;

// أسماء خاصة مع ألوان وأهتزاز متوافق مع السيرفر
const specialNameColors = {
  "جهاد": "#00ffe7",
  "زيزو": "#ff3366",
  "أسامة": "#cc33ff",
  "مصطفى": "#33ff99",
  "حلا": "#ff33cc",
  "نور": "#ffff33",
  "كول": "#33ccff"
};

function scrollChatToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// تلوين اسم اللاعب مع إظهار عدد الفوز وإضافة اهتزاز للأسماء الخاصة
function colorizeName(name) {
  const color = specialNameColors[name];
  const winsCount = (playersData[name] && playersData[name].wins) || 0;
  let style = color ? `color: ${color}; font-weight: 700;` : '';
  let shakeClass = (name === "زيزو") ? "special-word shake" : "special-word";

  // لو الاسم "زيزو" اضف اهتزاز وهكذا فقط له
  if (color) {
    return `<span class="${shakeClass}" style="${style}">${name}</span>${winsCount > 0 ? ` <sup style="color:#fff; font-weight:bold;">🏆${winsCount}</sup>` : ''}`;
  } else {
    return `${name}${winsCount > 0 ? ` <sup style="color:#fff; font-weight:bold;">🏆${winsCount}</sup>` : ''}`;
  }
}

// قائمة لتخزين بيانات اللاعبين (أسماء + عدد مرات الفوز) لتسهيل التلوين
const playersData = {};

// تمييز الكلمات الخاصة داخل نص الرسالة مع ألوان وهزة (من الشات)
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
    // حماية من الاستبدال داخل كلمات أخرى عبر \b
    const regex = new RegExp(`\\b${word}\\b`, 'gu');
    result = result.replace(regex, `<span class="special-word${shakeClass}" style="color:${color}">${word}</span>`);
  });

  return result;
}

function addChatMessage({ name, message, system = false }) {
  const div = document.createElement('div');
  div.classList.add('chat-message');
  if (system) {
    div.classList.add('chat-system-message');
    div.textContent = message;
  } else {
    const nameSpan = document.createElement('span');
    nameSpan.classList.add('chat-name');
    nameSpan.innerHTML = colorizeName(name);

    const messageSpan = document.createElement('span');
    messageSpan.classList.add('chat-text');
    messageSpan.innerHTML = highlightSpecialWords(message);

    div.appendChild(nameSpan);
    div.appendChild(document.createTextNode(' : '));
    div.appendChild(messageSpan);
  }
  chatMessages.appendChild(div);
  scrollChatToBottom();
}

function updatePlayersList(players) {
  playersList.innerHTML = '';
  players.forEach((p, i) => {
    playersData[p.name] = { wins: p.wins, score: p.score };

    const li = document.createElement('li');
    li.dataset.id = p.id;

    let color = '';
    if (i === 0) color = 'red';
    else if (i === 1) color = 'green';
    else if (i === 2) color = 'orange';
    else color = '#00d1ff';

    li.style.color = color;

    li.innerHTML = `${i + 1}. ${colorizeName(p.name)} - ${p.score} نقطة`;
    playersList.appendChild(li);
  });
}

// --- الأحداث ---

btnChat.addEventListener('click', () => {
  if (chatContainer.classList.contains('open')) {
    chatContainer.classList.remove('open');
    btnChat.setAttribute('aria-expanded', 'false');
    chatContainer.hidden = true;
  } else {
    chatContainer.classList.add('open');
    btnChat.setAttribute('aria-expanded', 'true');
    chatContainer.hidden = false;
    chatInput.focus();
  }
});

btnCloseChat.addEventListener('click', () => {
  chatContainer.classList.remove('open');
  btnChat.setAttribute('aria-expanded', 'false');
  chatContainer.hidden = true;
});

chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const msg = chatInput.value.trim();
  if (!msg) return;

  socket.emit('sendMessage', msg);
  chatInput.value = '';
});

btnChangeName.addEventListener('click', () => {
  inputName.value = playerName;
  changeNameDialog.showModal();
});

cancelNameBtn.addEventListener('click', () => {
  changeNameDialog.close();
});

changeNameForm.addEventListener('submit', e => {
  e.preventDefault();
  const newName = inputName.value.trim();
  if (newName && newName !== playerName) {
    playerName = newName;
    localStorage.setItem('playerName', playerName);
    socket.emit('setName', playerName);
  }
  changeNameDialog.close();
});

btnInstructions.addEventListener('click', () => {
  instructionsDialog.showModal();
});

closeInstructionsBtn.addEventListener('click', () => {
  instructionsDialog.close();
});

btnZizo.addEventListener('click', () => {
  window.open('https://sp-p2.onrender.com', '_blank');
});

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

// استقبال الكلمة الجديدة
socket.on('newWord', word => {
  currentWord = word;
  wordDisplay.textContent = word;
  startTime = Date.now();
  answerTimeDisplay.textContent = '';
  canAnswer = true;
});

// استقبال تحديث النقاط
socket.on('updateScore', score => {
  myScore = score;
  pointsDisplay.textContent = `النقاط: ${myScore} - مرات الفوز: ${myWins}`;
});

// استقبال تحديث قائمة اللاعبين مع عدد مرات الفوز
socket.on('updatePlayers', players => {
  updatePlayersList(players);
  // تحديث wins اذا الاسم مطابق
  const me = players.find(p => p.id === playerId);
  if (me) {
    myWins = me.wins || 0;
    pointsDisplay.textContent = `النقاط: ${myScore} - مرات الفوز: ${myWins}`;
  }
});

// استقبال رسائل الشات
socket.on('chatMessage', data => {
  addChatMessage({
    name: data.system ? '' : data.name,
    message: data.message,
    system: data.system,
  });
});

// استقبال فوز لاعب
socket.on('playerWon', data => {
  myWins = data.wins;
  alert(`🎉 مبروك ${data.name} لقد فزت باللعبة!`);
  pointsDisplay.textContent = `النقاط: ${myScore} - مرات الفوز: ${myWins}`;
});

// استقبال طرد اللاعب
socket.on('kicked', () => {
  alert('تم طردك من اللعبة بواسطة الأدمن.');
  window.location.reload();
});

// استقبال الترحيب وحفظ الـ id
socket.on('welcome', data => {
  playerId = data.id;
  socket.emit('setName', playerName);
});

// عند الإجابة الصحيحة
socket.on('correctAnswer', data => {
  answerTimeDisplay.textContent = `أجبت في: ${data.timeUsed} ثانية`;
  canAnswer = false;
  setTimeout(() => {
    answerTimeDisplay.textContent = '';
    canAnswer = true;
  }, 2000);
});

// عند الإجابة الخاطئة
socket.on('wrongAnswer', () => {
  canAnswer = true;
});

// إعادة تفعيل الإجابة
socket.on('enableAnswer', () => {
  canAnswer = true;
});
