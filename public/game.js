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
  chatMessages.scrollTop = chatMessages.scrollHeight;
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
    // استخدم regex للبحث عن الكلمة فقط كاملة (كلمة منفصلة)
    const regex = new RegExp(`\\b${word}\\b`, 'gu');
    result = result.replace(regex, `<span class="special-word${shakeClass}" style="color:${color}">${word}</span>`);
  });

  return result;
}

// إضافة رسالة جديدة للشات

function addChatMessage({ name, message, system = false, color = null, time = '' }) {
  const div = document.createElement('div');
  div.classList.add('chat-message');

  // توليد الوقت إذا ما وصل من السيرفر
  if (!time) {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    time = `${hours}:${minutes}`;
  }

  if (system) {
    div.classList.add('chat-system-message');
    div.textContent = message;

    // إضافة الوقت في نهاية الرسالة
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

    // إضافة الوقت في نهاية الرسالة
    const timeSpan = document.createElement('span');
    timeSpan.textContent = ` [${time}]`;
    timeSpan.style.fontSize = '10px';
    timeSpan.style.color = '#888';
    div.appendChild(timeSpan);
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
    if (i === 0) color = 'gold';       // المركز الأول ذهبي
    else if (i === 1) color = 'silver'; // الثاني سلفر
    else if (i === 2) color = 'bronze';// الثالث برونزي 
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
    color: data.color || null,
    time: data.time || ''
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

let isUserAtBottom = true;

// === تعديل scrollChatToBottom لمنع النزول عند قراءة رسائل قديمة ===
function scrollChatToBottom() {
  if (isUserAtBottom) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

// === إضافة badge للرسائل الجديدة ===
let newMessageCount = 0;

function showNewMessageBadge(count) {
  let badge = document.getElementById('newMessageBadge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'newMessageBadge';
    badge.style.position = 'absolute';
    badge.style.bottom = '200px';
    badge.style.right = '20px';
    badge.style.backgroundColor = '#ffff00';
    badge.style.color = '#000000';
    badge.style.padding = '6px 12px';
    badge.style.borderRadius = '12px';
    badge.style.cursor = 'pointer';
    badge.style.zIndex = '10000';
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

// تعديل addChatMessage لإضافة عداد الرسائل الجديدة
const originalAddChatMessage = addChatMessage;
addChatMessage = function(data) {
  originalAddChatMessage(data);

  const atBottom = chatMessages.scrollTop + chatMessages.clientHeight >= chatMessages.scrollHeight - 10;
  if (atBottom) {
    newMessageCount = 0;
    hideNewMessageBadge();
  } else {
    newMessageCount++;
    showNewMessageBadge(newMessageCount);
  }
};

// تحقق من scroll المستخدم
chatMessages.addEventListener('scroll', () => {
  const threshold = 10;
  const position = chatMessages.scrollTop + chatMessages.clientHeight;
  const height = chatMessages.scrollHeight;

  isUserAtBottom = position >= height - threshold;
});
// =========================
//      TYPING SYSTEM
// =========================

// نخزن رسائل جاري الكتابة لكل لاعب
const typingMessages = {};

// لما اللاعب يكتب
chatInput.addEventListener('input', () => {
  const text = chatInput.value.trim();

  if (text.length > 0) {
    // إرسال جاري الكتابة للسيرفر
    socket.emit('typing', playerName);
  } else {
    // حذف جاري الكتابة لو النص صار فارغ
    socket.emit('stopTyping', playerName);
  }
});

// استقبال اللاعبين الذين يكتبون
socket.on('typing', typingNames => {
  // إزالة أي مؤشرات قديمة لم تعد موجودة
  Object.keys(typingMessages).forEach(name => {
    if (!typingNames.includes(name)) {
      typingMessages[name].remove();
      delete typingMessages[name];
    }
  });

  typingNames.forEach(name => {
    // لا تظهر لنفسك
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

// عند إرسال رسالة
chatForm.addEventListener('submit', () => {
  // إرسال أمر لإخفاء جاري الكتابة
  socket.emit('stopTyping', playerName);

  if (typingMessages[playerName]) {
    typingMessages[playerName].remove();
    delete typingMessages[playerName];
  }
});
// --- إعدادات المرسم الذكي ---
const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');
const galleryGrid = document.getElementById('gallery-grid');
const galleryDialog = document.getElementById('gallery-dialog');
let isDrawing = false;
let canOthersDraw = true;

// ضبط الحجم
function setupCanvas() {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}
window.addEventListener('load', setupCanvas);

// --- وظائف الرسم ---
function getCoordinates(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX || e.touches[0].clientX) - rect.left;
  const y = (e.clientY || e.touches[0].clientY) - rect.top;
  return { x, y };
}

const start = (e) => {
  isDrawing = true;
  const { x, y } = getCoordinates(e);
  ctx.beginPath();
  ctx.moveTo(x, y);
  emitArt(x, y, 'start');
};

const move = (e) => {
  if (!isDrawing) return;
  const { x, y } = getCoordinates(e);
  
  const color = document.getElementById('brush-color').value;
  const size = document.getElementById('brush-size').value;
  const opacity = document.getElementById('brush-opacity').value;

  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineTo(x, y);
  ctx.stroke();
  
  emitArt(x, y, 'draw', color, size, opacity);
};

// التزامن عبر Socket
function emitArt(x, y, type, color, size, opacity) {
  if (!canOthersDraw && type !== 'start' && type !== 'draw') return;
  socket.emit('artStream', { x, y, type, color, size, opacity, senderId: socket.id });
}

socket.on('artStream', (data) => {
  if (!canOthersDraw && data.senderId !== socket.id) return;
  
  ctx.globalAlpha = data.opacity;
  ctx.strokeStyle = data.color;
  ctx.lineWidth = data.size;
  if (data.type === 'start') {
    ctx.beginPath();
    ctx.moveTo(data.x, data.y);
  } else {
    ctx.lineTo(data.x, data.y);
    ctx.stroke();
  }
});

// --- إدارة المعرض (30 رسمة) ---
let myGallery = JSON.parse(localStorage.getItem('artGallery') || '[]');

function saveToGallery() {
  if (myGallery.length >= 30) return alert("المعرض ممتلئ! احذف بعض الرسومات.");
  const dataURL = canvas.toDataURL();
  myGallery.push(dataURL);
  localStorage.setItem('artGallery', JSON.stringify(myGallery));
  updateGalleryUI();
}

function updateGalleryUI() {
  document.getElementById('gallery-count').textContent = myGallery.length;
  galleryGrid.innerHTML = '';
  myGallery.forEach((imgData, index) => {
    const div = document.createElement('div');
    div.className = 'gallery-item';
    div.innerHTML = `
      <img src="${imgData}" onclick="loadArt(${index})">
      <button class="delete-art" onclick="deleteArt(${index})">×</button>
    `;
    galleryGrid.appendChild(div);
  });
}

window.loadArt = (index) => {
  const img = new Image();
  img.src = myGallery[index];
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    galleryDialog.close();
    // إرسال اللوحة المحملة للجميع
    socket.emit('syncFullCanvas', canvas.toDataURL());
  };
};

// قفل المشاركة
document.getElementById('toggle-lock').addEventListener('click', (e) => {
  canOthersDraw = !canOthersDraw;
  e.target.textContent = canOthersDraw ? '🔓' : '🔒';
  socket.emit('lockStatus', canOthersDraw);
});

// الأحداث
canvas.addEventListener('mousedown', start);
canvas.addEventListener('mousemove', move);
window.addEventListener('mouseup', () => isDrawing = false);
document.getElementById('save-to-gallery').addEventListener('click', saveToGallery);
document.getElementById('open-gallery').addEventListener('click', () => {
    updateGalleryUI();
    galleryDialog.showModal();
});
document.getElementById('close-gallery').addEventListener('click', () => galleryDialog.close());
document.getElementById('clear-canvas').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('clearArt');
});
let undoStack = [];
let currentShape = 'free'; // free, circle, rect, eraser
let isSoloMode = false;
let isLocked = false;
let startX, startY;
let snapshot; // لحفظ حالة اللوحة عند بدء رسم شكل هندسي

// وظيفة التراجع (Undo)
function saveState() {
  if (undoStack.length > 20) undoStack.shift();
  undoStack.push(canvas.toDataURL());
}

document.getElementById('undo-btn').addEventListener('click', () => {
  if (undoStack.length > 0) {
    let previousState = undoStack.pop();
    let img = new Image();
    img.src = previousState;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      if (!isSoloMode) socket.emit('syncFullCanvas', previousState);
    };
  }
});

// تغيير لون الخلفية
document.getElementById('bg-color').addEventListener('input', (e) => {
  canvas.style.backgroundColor = e.target.value;
  if (!isSoloMode) socket.emit('canvasBgChange', e.target.value);
});

// تبديل الوضع المنفرد
document.getElementById('toggle-solo').addEventListener('click', (e) => {
  isSoloMode = !isSoloMode;
  document.getElementById('solo-badge').classList.toggle('hidden');
  document.getElementById('share-to-all').classList.toggle('hidden');
  e.target.style.background = isSoloMode ? '#ff3366' : '';
});

// رسم الأشكال
canvas.addEventListener('mousedown', (e) => {
  saveState();
  const pos = getCoordinates(e);
  startX = pos.x;
  startY = pos.y;
  isDrawing = true;
  
  if (currentShape !== 'free') {
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDrawing) return;
  const pos = getCoordinates(e);
  
  if (currentShape === 'free' || currentShape === 'eraser') {
    drawFree(pos.x, pos.y);
  } else {
    // رسم الأشكال الهندسية يحتاج مسح اللوحة وإعادة رسمها لتظهر الحركة
    ctx.putImageData(snapshot, 0, 0);
    drawShape(pos.x, pos.y);
  }
});

function drawShape(endX, endY) {
  ctx.beginPath();
  ctx.lineWidth = document.getElementById('brush-size').value;
  ctx.strokeStyle = document.getElementById('brush-color').value;
  
  if (currentShape === 'circle') {
    let radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
  } else if (currentShape === 'rect') {
    ctx.rect(startX, startY, endX - startX, endY - startY);
  }
  ctx.stroke();
}

function drawFree(x, y) {
  ctx.lineWidth = document.getElementById('brush-size').value;
  ctx.lineCap = 'round';
  ctx.globalAlpha = document.getElementById('brush-opacity').value;
  
  if (currentShape === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'; // تفعيل الممحاة
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = document.getElementById('brush-color').value;
  }
  
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  
  if (!isSoloMode && !isLocked) {
     emitArt(x, y, 'draw', ctx.strokeStyle, ctx.lineWidth, ctx.globalAlpha);
  }
}

// أزرار الأشكال
document.querySelectorAll('.shape-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector('.shape-btn.active')?.classList.remove('active');
    btn.classList.add('active');
    currentShape = btn.dataset.shape;
  });
});

// مشاركة الرسمة المنفردة مع الجميع
document.getElementById('share-to-all').addEventListener('click', () => {
  const dataURL = canvas.toDataURL();
  socket.emit('syncFullCanvas', dataURL);
  alert("تمت مشاركة رسمتك مع جميع اللاعبين!");
});
  
// 1. استقبال مسح اللوحة من السيرفر
socket.on('clearArt', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// 2. استقبال صورة كاملة (لما حد يشارك رسمة من المعرض أو الوضع المنفرد)
socket.on('loadFullCanvas', (imgData) => {
    const img = new Image();
    img.src = imgData;
    img.onload = () => {
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
});

// 3. استقبال تغيير لون الخلفية
socket.on('updateCanvasBg', (color) => {
    canvas.style.backgroundColor = color;
    document.getElementById('bg-color').value = color;
});

// 4. استقبال حالة القفل (مين مسموح له يرسم)
socket.on('lockStatus', (locked) => {
    isLocked = locked;
    document.getElementById('toggle-lock').textContent = isLocked ? '🔒' : '🔓';
    // تنبيه بسيط للشات
    console.log(isLocked ? "الرسم مقفل الآن" : "الرسم متاح للجميع");
});
