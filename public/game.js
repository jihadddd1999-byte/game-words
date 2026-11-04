const socket = io();

// ===== Keep server alive (Render fix) =====
setInterval(() => {
  fetch("/ping").catch(() => {});
}, 4 * 60 * 1000); // كل 4 دقائق

// ===== هوية الجهاز: تُستخدم للتعرف على الأدمن الأساسي والعقوبات حتى بعد الرفرش =====
function makeDeviceToken() {
  try {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
  } catch (e) {}
  let t = '';
  for (let i = 0; i < 4; i++) t += Math.random().toString(36).slice(2);
  return t + Date.now().toString(36);
}
let deviceToken = null;
try { deviceToken = localStorage.getItem('deviceToken'); } catch (e) {}
if (!deviceToken) {
  deviceToken = makeDeviceToken();
  try { localStorage.setItem('deviceToken', deviceToken); } catch (e) {}
}

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
let playerName = null;
try { playerName = localStorage.getItem('playerName'); } catch (e) {}
if (!playerName) {
  playerName = `لاعب${Math.floor(Math.random() * 1000)}`;
  try { localStorage.setItem('playerName', playerName); } catch (e) {}
}
let playerColor = localStorage.getItem('playerColor') || '#00e5ff';
let canAnswer = true; // للتحكم بالسماح بالإجابة

// بصمة الأدمن الأساسي (بتنحفظ بمتصفحك وبتخلي السيرفر يعرفك حتى لو نسي كل شي)
let ownerProof = null;
try { ownerProof = localStorage.getItem('ownerProof'); } catch (e) {}

// أول ما يتصل اللاعب بيرسل اسمه الحقيقي + هوية جهازه، والسيرفر بيقرر دخوله
socket.on('connect', () => {
  let backup = null;
  try { backup = JSON.parse(localStorage.getItem('progBackup') || 'null'); } catch (e) {}
  socket.emit('identify', { token: deviceToken, name: playerName, color: playerColor, proof: ownerProof, backup });
});

// نسخة احتياطية موقّعة من السيرفر لتقدّمك (مستوى، عملات، أغراض...): بترجعلك حتى لو Render سكّر ونسي كل شي
socket.on('progress:backup', (b) => {
  if (!b || typeof b.p !== 'string') return;
  try { localStorage.setItem('progBackup', JSON.stringify(b)); } catch (e) {}
});

socket.on('admin:owner_proof', (d) => {
  if (!d || !d.proof) return;
  ownerProof = d.proof;
  try { localStorage.setItem('ownerProof', d.proof); } catch (e) {}
});

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

// ===== نظام التقدّم: بيانات مشتركة بين عرض الأسماء ونافذة اللاعب =====
const PG = { cat: null, state: null, at: 0, players: null, rot: 0 };
const PG_TIERS = [1, 5, 10, 20, 30, 40, 50, 65, 80, 100];
function tierOf(lv) { let t = 0; PG_TIERS.forEach((v, i) => { if (lv >= v) t = i; }); return t; }
function pgEsc(v) { return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
// المستوى (أُس) + اللقب + الشارات الصغيرة جنب الاسم
function metaHtml(m) {
  if (!m || !m.lv) return '';
  const cf = m.cf && /^cf_[a-z]+$/.test(m.cf) ? ' ' + m.cf : '';
  let h = `<sup class="lvx t${tierOf(m.lv)}${cf}" title="المستوى ${m.lv}">${m.lv}</sup>`;
  const cat = PG.cat;
  if (cat) {
    const t = m.ti && cat.titles.find(x => x.id === m.ti);
    if (t) h += `<span class="ttl t${tierOf(t.lv)}">${pgEsc(t.n)}</span>`;
    (m.bd || []).forEach(id => {
      const b = cat.badges.find(x => x.id === id);
      if (b) h += `<span class="bdg" title="${pgEsc(b.n)}">${b.e}</span>`;
    });
  }
  return h;
}

function colorizeName(name, color = null, glow = null, nc = null) {
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
  if (nc && PG.cat && PG.cat.shop) { const it = PG.cat.shop.find(x => x.id === nc && x.cat === 'nc'); if (it && it.v) color = it.v; }
  const gcls = glow && /^[gs]_[a-z]+$/.test(glow) ? ` class="ng-${glow}"` : '';
  return `<span${gcls} style="color: ${color}; font-weight: 700;">${name}</span>`;
}

// اسم بتأثير خاص (مثل REDO للأدمن الأساسي): السيرفر هو اللي بيحدد مين له التأثير (fx)
function nameHtml(displayName, rawName, color, fx, meta) {
  if (fx === 'redo' && rawName && String(displayName).endsWith(String(rawName))) {
    const prefix = String(displayName).slice(0, String(displayName).length - String(rawName).length);
    const pre = prefix ? `<span style="color: ${color || '#00e5ff'}; font-weight: 700;">${prefix}</span>` : '';
    return `${pre}<span class="redo-name">${rawName}<i class="rb rb1"></i><i class="rb rb2"></i><i class="rb rb3"></i><i class="rb rb4"></i></span>${metaHtml(meta)}`;
  }
  return colorizeName(displayName, color, meta && meta.gl, meta && meta.nc) + metaHtml(meta);
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
function addChatMessage({ name, message, system = false, color = null, time = '', fx = null, rawName = '', meta = null }) {
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
    nameSpan.innerHTML = nameHtml(name, rawName, color, fx, meta);

    if (meta && meta.erin === 1) div.classList.add('erin-msg');
    const messageSpan = document.createElement('span');
    messageSpan.classList.add('chat-text');
    if (meta && meta.cc && /^cc_[a-z]+$/.test(meta.cc)) messageSpan.classList.add(meta.cc);
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

// تحديث قائمة اللاعبين بالترتيب
function updatePlayersList(players) {
  PG.players = players;
  playersList.innerHTML = '';

  players.forEach((p, i) => {
    const li = document.createElement('li');
    li.dataset.id = p.id;

    let color = '';
    if (i === 0) color = 'gold';       
    else if (i === 1) color = 'silver'; 
    else if (i === 2) color = 'bronze';
    else color = '#00d1ff';            

    li.style.color = color;
    
    // بناء النص الأساسي للاعب
    let playerHtml = `${i + 1}. ${nameHtml(p.name, p.rawName, p.color, p.fx, p.meta)} - ${p.score} نقطة <button type="button" class="pg-pbtn" data-pv="${String(p.id).replace(/[^\w-]/g, '')}" title="عرض الملف الشخصي" aria-label="عرض الملف الشخصي">👤</button>`;

    li.innerHTML = playerHtml;
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
    btnChat.classList.remove('notify');
  } else {
    chatContainer.classList.add('open');
    btnChat.setAttribute('aria-expanded', 'true');
    chatContainer.hidden = false;
    chatInput.focus();
    btnChat.classList.remove('notify');
  }
});

btnCloseChat.addEventListener('click', () => {
  chatContainer.classList.remove('open');
  btnChat.setAttribute('aria-expanded', 'false');
  chatContainer.hidden = true;
  btnChat.classList.remove('notify');
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
  inputColor.value = playerColor;
  changeNameDialog.showModal();
});

cancelNameBtn.addEventListener('click', () => {
  changeNameDialog.close();
});

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

btnInstructions.addEventListener('click', () => {
  instructionsDialog.showModal();
});

closeInstructionsBtn.addEventListener('click', () => {
  instructionsDialog.close();
});

// في جزء التعامل مع Enter في inputAnswer:
inputAnswer.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (!canAnswer) return;
    const answer = String(inputAnswer.value).trim();
    if (!answer) return;

    canAnswer = false;
    const timeUsed = ((Date.now() - startTime) / 1000).toFixed(2);
    socket.emit('submitAnswer', { answer, timeUsed });
    inputAnswer.value = '';
  }
});


socket.on('newWord', word => {
  currentWord = word;
  wordDisplay.textContent = word;
  startTime = Date.now();
  answerTimeDisplay.textContent = '';
  canAnswer = true;
});

socket.on('updateScore', score => {
  myScore = score;
  pointsDisplay.textContent = `النقاط: ${myScore}`;
});

socket.on('updatePlayers', players => {
  updatePlayersList(players);
});

socket.on('chatMessage', data => {
  addChatMessage({
    name: data.system ? '' : data.name,
    message: data.message,
    system: data.system,
    color: data.color || null,
    time: data.time || '',
    fx: data.fx || null,
    rawName: data.rawName || '',
    meta: data.meta || null
  });
});

// 🤖 ايرين: مؤشّر الكتابة + ستايل رسائلها
socket.on('erin:typing', (d) => {
  const old = chatMessages.querySelector('.erin-typing'); if (old) old.remove();
  if (!d || !d.on) return;
  const div = document.createElement('div');
  div.className = 'chat-message chat-system-message erin-typing';
  div.textContent = '🤖 ايرين عم تكتب…';
  chatMessages.appendChild(div);
  scrollChatToBottom();
  setTimeout(() => div.remove(), 90000);
});
(() => {
  const st = document.createElement('style');
  st.textContent = `.chat-message.erin-msg { border-inline-start: 3px solid #a78bfa; background: rgba(167, 139, 250, .12); border-radius: 8px; padding: 5px 9px; }
  .chat-message.erin-msg .chat-text { line-height: 1.6; }
  .chat-message.erin-typing { opacity: .75; font-style: italic; }`;
  document.head.appendChild(st);
})();

socket.on('playerWon', data => {
  alert(`🎉 مبروك ${data.name} لقد فزت باللعبة!`);
});

socket.on('kicked', () => {
  alert('تم طردك من اللعبة بواسطة الأدمن.');
  window.location.reload();
});

// مستقبلات حالة المنع وإخفاء الشات للأدمن
socket.on('update_mute_status', (isMuted) => {
  chatInput.disabled = isMuted;
  chatInput.placeholder = isMuted ? "أنت ممنوع من الكتابة بواسطة الأدمن" : "اكتب رسالة...";
  if (isMuted) alert("⚠️ تنبيه: قام الأدمن بمنعك من الكتابة.");
});

socket.on('update_chat_view_status', (canSeeChat) => {
  chatContainer.style.display = canSeeChat ? 'block' : 'none';
  if (!canSeeChat) alert("⚠️ تنبيه: قام الأدمن بإخفاء الشات عنك.");
});

socket.on('welcome', data => {
  playerId = data.id;
});

socket.on('correctAnswer', data => {
  answerTimeDisplay.textContent = `أجبت في: ${data.timeUsed} ثانية`;
  canAnswer = false;
  setTimeout(() => {
    answerTimeDisplay.textContent = '';
    canAnswer = true;
  }, 2000);
});

socket.on('wrongAnswer', () => {
  canAnswer = true;
});

socket.on('enableAnswer', () => {
  canAnswer = true;
});

let isUserAtBottom = true;

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

chatMessages.addEventListener('scroll', () => {
  const threshold = 10;
  const position = chatMessages.scrollTop + chatMessages.clientHeight;
  const height = chatMessages.scrollHeight;

  isUserAtBottom = position >= height - threshold;
});

// =========================
//      TYPING SYSTEM
// =========================

const typingMessages = {};

chatInput.addEventListener('input', () => {
  const text = chatInput.value.trim();
  if (text.length > 0) {
    socket.emit('typing', playerName);
  } else {
    socket.emit('stopTyping', playerName);
  }
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

chatForm.addEventListener('submit', () => {
  socket.emit('stopTyping', playerName);

  if (typingMessages[playerName]) {
    typingMessages[playerName].remove();
    delete typingMessages[playerName];
  }
});

// ==========================================
//   استوديو نزار المطور (V2 - Gallery Fix)
// ==========================================

let persistentCanvasData = null; 
let isSoloMode = false;
let lastX = 0;
let lastY = 0;
let undoStack = []; 
let galleryData = JSON.parse(localStorage.getItem('myArtGallery')) || [];

function updateGalleryUI() {
    const miniGallery = document.getElementById('art-mini-gallery');
    if(!miniGallery) return;
    miniGallery.innerHTML = '';
    galleryData.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'gallery-card'; 
        div.innerHTML = `
            <img src="${item.img}" style="width:100%; border-radius:5px;">
            <span style="font-size:12px; display:block; margin:5px 0;">${item.name}</span>
            <div style="display:flex; gap:2px; width:100%;">
                <button onclick="loadToCanvas(${index})" style="flex:1; padding:5px; cursor:pointer;">📝</button>
                <button onclick="deleteGalleryItem(${index})" style="flex:1; padding:5px; background:#ff4444; color:white; border:none; cursor:pointer;">🗑️</button>
            </div>
        `;
        miniGallery.appendChild(div);
    });
}

window.loadToCanvas = (idx) => {
    const canvas = document.getElementById('main-canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = galleryData[idx].img;
    img.onload = () => {
        ctx.save();
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        if(!isSoloMode) socket.emit('load-gallery-all', canvas.toDataURL());
    };
};

window.deleteGalleryItem = (idx) => {
    if(confirm("هل أنت متأكد من حذف هذه الرسمة؟")) {
        galleryData.splice(idx, 1);
        localStorage.setItem('myArtGallery', JSON.stringify(galleryData));
        updateGalleryUI();
    }
};

const initStudio = () => {
    const canvas = document.getElementById('main-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const boardDialog = document.getElementById('board-dialog');
    const btnOpen = document.getElementById('btn-open-board');
    const btnClose = document.getElementById('art-btn-close-board');
    const brushColor = document.getElementById('art-brush-color');
    const bgColor = document.getElementById('art-bg-color');
    const brushSize = document.getElementById('art-brush-size');
    const brushType = document.getElementById('art-brush-type');
    const brushOpacity = document.getElementById('art-brush-opacity');
    const btnClear = document.getElementById('art-btn-clear-canvas');
    const btnUndo = document.getElementById('art-btn-undo');
    const btnSaveGallery = document.getElementById('art-btn-save-to-gallery');
    const btnSolo = document.getElementById('art-btn-solo-mode');

    let drawing = false;
    let rectCache = null;                                    // قياس الكانفس مرة وحدة بدل مع كل حركة (كان بيبطّئ الرسم)
    const getRect = () => rectCache || (rectCache = canvas.getBoundingClientRect());
    window.addEventListener('resize', () => { rectCache = null; });
    window.addEventListener('scroll', () => { rectCache = null; }, true);

    updateGalleryUI();

    bgColor.oninput = () => {
        resetCanvasBackground();
        if(!isSoloMode) socket.emit('clear-board-all', { color: bgColor.value });
    };

    function resetCanvasBackground() {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = bgColor.value;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    function saveState() {
        if (undoStack.length >= 25) undoStack.shift();
        try {                                              // نسخة سريعة على كرت الشاشة بدل ترميز PNG كامل مع كل ضغطة
            const snap = document.createElement('canvas');
            snap.width = canvas.width; snap.height = canvas.height;
            snap.getContext('2d').drawImage(canvas, 0, 0);
            undoStack.push(snap);
        } catch (e) { undoStack.push(canvas.toDataURL()); }
    }

    if(btnOpen) {
        btnOpen.onclick = () => {
            boardDialog.showModal();
            const container = canvas.parentElement;
            if (canvas.width !== container.clientWidth) {
                canvas.width = container.clientWidth;
                canvas.height = container.clientHeight;
                resetCanvasBackground();
            }
            if (persistentCanvasData) {
                const img = new Image();
                img.src = persistentCanvasData;
                img.onload = () => ctx.drawImage(img, 0, 0);
            }
        };
    }

    if(btnClose) {
        btnClose.onclick = () => {
            persistentCanvasData = canvas.toDataURL();
            boardDialog.close();
        };
    }

    const startDrawing = (e) => {
        drawing = true;
        rectCache = null;
        saveState();
        const rect = getRect();
        lastX = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        lastY = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
    };

    const draw = (e) => {
        if (!drawing) return;
        const rect = getRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = brushSize.value;
        let currentColor = brushColor.value;

        if (brushType.value === 'eraser') {
            ctx.strokeStyle = bgColor.value;
            ctx.globalAlpha = 1.0;
            currentColor = bgColor.value;
        } else if (brushType.value === 'spray') {
            ctx.fillStyle = brushColor.value;
            ctx.globalAlpha = 1.0; 
            for (let i = 0; i < 40; i++) {
                const offset = Math.random() * brushSize.value * 2 - brushSize.value;
                ctx.fillRect(x + offset, y + Math.random() * brushSize.value * 2 - brushSize.value, 1.5, 1.5);
            }
        } else {
            ctx.globalAlpha = brushOpacity.value;
            ctx.strokeStyle = brushColor.value;
        }

        if (brushType.value !== 'spray') {
            ctx.lineTo(x, y);
            ctx.stroke();
            // بالشفافية الكاملة بنبدأ مسار جديد لكل مقطع (نفس الشكل بالضبط بس أسرع بكثير لأنه ما بنعيد رسم الخط كله كل مرة)
            if (ctx.globalAlpha >= 0.99) { ctx.beginPath(); ctx.moveTo(x, y); }
        }
        ctx.restore();

        if (!isSoloMode) {
            socket.emit('draw-data', {
                x: x / canvas.width,
                y: y / canvas.height,
                prevX: lastX / canvas.width,
                prevY: lastY / canvas.height,
                color: currentColor, size: brushSize.value,
                opacity: (brushType.value === 'spray' || brushType.value === 'eraser') ? 1.0 : brushOpacity.value, 
                type: brushType.value
            });
        }
        [lastX, lastY] = [x, y];
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', () => drawing = false);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e); }, {passive:false});
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); }, {passive:false});

    socket.on('draw-remote', (data) => {
        if (isSoloMode) return;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineWidth = data.size;
        ctx.globalAlpha = data.opacity;

        const currentX = data.x * canvas.width;
        const currentY = data.y * canvas.height;
        const prevX = data.prevX * canvas.width;
        const prevY = data.prevY * canvas.height;

        if (data.type === 'spray') {
            ctx.fillStyle = data.color;
            for (let i = 0; i < 40; i++) {
                const offset = Math.random() * data.size * 2 - data.size;
                ctx.fillRect(currentX + offset, currentY + Math.random() * data.size * 2 - data.size, 1.5, 1.5);
            }
        } else {
            ctx.strokeStyle = data.color;
            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
        }
        ctx.restore();
    });

    socket.on('load-remote', (imgData) => {
        if (isSoloMode) return;
        const img = new Image();
        img.src = imgData;
        img.onload = () => {
            ctx.save();
            ctx.globalAlpha = 1.0;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            ctx.restore();
        };
    });

    socket.on('clear-board-remote', (data) => { 
        if (!isSoloMode) {
            if (data && data.color) {
                bgColor.value = data.color;
            }
            resetCanvasBackground(); 
        }
    });

    btnSolo.onclick = () => {
        isSoloMode = !isSoloMode;
        btnSolo.classList.toggle('active', isSoloMode);
        btnSolo.innerHTML = isSoloMode ? 
            '🔐 وضع منفرد: <span style="color:#00ff00;">ON</span>' : 
            '🔐 وضع منفرد: <span style="color:#ff4444;">OFF</span>';
    };

    btnUndo.onclick = () => {
        if (undoStack.length > 0) {
            const lastImg = undoStack.pop();
            const paintBack = (img) => {
                ctx.save();
                ctx.globalAlpha = 1.0;
                ctx.globalCompositeOperation = 'source-over';
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                ctx.restore();
                if(!isSoloMode) socket.emit('load-gallery-all', canvas.toDataURL());
            };
            if (typeof lastImg === 'string') {
                const img = new Image();
                img.src = lastImg;
                img.onload = () => paintBack(img);
            } else paintBack(lastImg);
        }
    };

    btnClear.onclick = () => {
        if(confirm("تفريغ اللوحة؟")) {
            resetCanvasBackground();
            if(!isSoloMode) socket.emit('clear-board-all', { color: bgColor.value });
        }
    };

    btnSaveGallery.onclick = () => {
        const artName = prompt("اسم الرسمة:", `عمل نزار ${galleryData.length + 1}`);
        if (artName) {
            galleryData.push({ name: artName, img: canvas.toDataURL() });
            localStorage.setItem('myArtGallery', JSON.stringify(galleryData));
            updateGalleryUI();
        }
    };
};

initStudio();

// ==========================================
//     نظام الثيمات التقليدية (زر 🖌️) — بيغيّر شكل اللعبة كلها + لون وتصميم الكتاب
// ==========================================
(() => {
  const enc = (c) => String(c).replace('#', '%23');
  const grain = (a, f, rgb = '0 0 0') => { const [r, g, b] = rgb.split(' '); return `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${f}' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  0 0 0 ${a} 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`; };

  // ---------- تعريف الثيمات ----------
  // bg: خلفية الصفحة | panel: لوح الواجهة | foil: تذهيب/تفضيض | paper: ورق الكتاب | cov: غلاف الكتاب | btn: أزرار الكتاب
  const TH = [
    { id: 'gold', n: 'الذهبي الأساسي', bg: ['#3e2f1c', '#7a5a22'], panel: ['rgba(74,48,18,.95)', 'rgba(44,27,9,.97)'], line: '#d9a441', foil: ['#fff1b8', '#e0aa3e', '#9a6a1a'], title: '#ffd978', text: '#fff2c2', muted: '#8b6a3a',
      paper: ['#fbf1d6', '#efdcae', '#e0c88c'], ink: '#4a2f12', cov: ['#8a2f35', '#5c1a20', '#3b0d12'], btn: ['#7a2b2f', '#4a1017', '#3a0c11'], btntext: '#ffe9a8', glow: 'rgba(255,200,80,.30)', tex: 'leather', emblem: 'star', frame: 'double' },
    { id: 'violet', n: 'البنفسجي الملكي', bg: ['#1a0b33', '#43207a'], panel: ['rgba(44,20,84,.95)', 'rgba(24,10,50,.97)'], line: '#cdb0ff', foil: ['#f6eeff', '#c9a7ff', '#7d52d6'], title: '#e6d4ff', text: '#f3e8ff', muted: '#7a5cae',
      paper: ['#f8f2ff', '#e9dcfb', '#d8c6f2'], ink: '#3a1d6e', cov: ['#7c3aed', '#5424b0', '#2e1065'], btn: ['#5b2ea8', '#3a1a78', '#26104f'], btntext: '#efe0ff', glow: 'rgba(190,140,255,.35)', tex: 'velvet', emblem: 'rosette', frame: 'solid' },
    { id: 'blue', n: 'الأزرق اللازوردي', bg: ['#07182e', '#154673'], panel: ['rgba(10,40,76,.95)', 'rgba(5,22,45,.97)'], line: '#a9cbe8', foil: ['#f2f9ff', '#a9cbe8', '#5d86ad'], title: '#d6ebff', text: '#e8f3ff', muted: '#5a7fa3',
      paper: ['#f5f8fc', '#e3ebf4', '#cfdae8'], ink: '#12324f', cov: ['#2a62a8', '#164580', '#0a2850'], btn: ['#1f5189', '#12396a', '#0a2548'], btntext: '#e4f2ff', glow: 'rgba(120,190,255,.32)', tex: 'cloth', emblem: 'crescent', frame: 'dotted' },
    { id: 'emerald', n: 'الزمردي الأندلسي', bg: ['#04231a', '#0e5a40'], panel: ['rgba(8,52,38,.95)', 'rgba(4,30,22,.97)'], line: '#d9b455', foil: ['#fff3bd', '#dcb24a', '#8f6a18'], title: '#f1dc8e', text: '#eafbe3', muted: '#6d7f4a',
      paper: ['#f7f3df', '#e9e2bd', '#d9d09c'], ink: '#16402e', cov: ['#1f7a54', '#14543a', '#0a3023'], btn: ['#176143', '#0d422d', '#082a1d'], btntext: '#f6e7a6', glow: 'rgba(90,220,150,.28)', tex: 'leather', emblem: 'knot', frame: 'double' },
    { id: 'charcoal', n: 'الفحمي النحاسي', bg: ['#0b0c10', '#23262f'], panel: ['rgba(30,32,40,.96)', 'rgba(14,15,20,.98)'], line: '#d49a52', foil: ['#ffe8c9', '#d49a52', '#7d4a1c'], title: '#f3cf9a', text: '#ece6dc', muted: '#7b6a55',
      paper: ['#f1ece2', '#ded7c7', '#cac1ac'], ink: '#2a2620', cov: ['#43454f', '#2a2c34', '#121319'], btn: ['#3a3d47', '#23252d', '#14151b'], btntext: '#ffe2b8', glow: 'rgba(230,160,90,.25)', tex: 'leather', emblem: 'star', frame: 'solid' },
    { id: 'turquoise', n: 'الفيروزي العثماني', bg: ['#062b30', '#117078'], panel: ['rgba(8,56,64,.95)', 'rgba(4,32,38,.97)'], line: '#e8c46a', foil: ['#fff8d8', '#e6bb55', '#9a6d1e'], title: '#fbe9a8', text: '#effcfb', muted: '#5f8f8f',
      paper: ['#fdf8e8', '#f2e7c8', '#e4d4a8'], ink: '#0e4a4e', cov: ['#1ab0b4', '#0e7d82', '#07484c'], btn: ['#0f7b80', '#0a5559', '#06383b'], btntext: '#fff3c4', glow: 'rgba(80,230,230,.28)', tex: 'tile', emblem: 'tile', frame: 'double' },
    { id: 'terracotta', n: 'الطيني الأندلسي', bg: ['#3a1a10', '#85421f'], panel: ['rgba(72,32,16,.95)', 'rgba(44,18,8,.97)'], line: '#e2a65a', foil: ['#ffe9be', '#e0a24f', '#94601a'], title: '#ffd9a0', text: '#fff0dc', muted: '#8f6240',
      paper: ['#fbeed3', '#f0dbb0', '#e2c68c'], ink: '#5a2a12', cov: ['#c8683e', '#9d4524', '#6b2812'], btn: ['#a4482a', '#74301a', '#4d1f10'], btntext: '#ffe6bd', glow: 'rgba(255,160,90,.30)', tex: 'leather', emblem: 'rosette', frame: 'double' },
    { id: 'rose', n: 'الوردي الدمشقي', bg: ['#35101f', '#7a2848'], panel: ['rgba(72,22,44,.95)', 'rgba(42,10,26,.97)'], line: '#eab0a2', foil: ['#fff0ea', '#eaaa9c', '#a85a4c'], title: '#ffd9d0', text: '#ffeef0', muted: '#9a5f70',
      paper: ['#fff4ef', '#f7ddd5', '#eac6bb'], ink: '#5a1a30', cov: ['#bd3f66', '#8a2749', '#561430'], btn: ['#93294e', '#661836', '#430e24'], btntext: '#ffe3dc', glow: 'rgba(255,140,170,.30)', tex: 'velvet', emblem: 'crescent', frame: 'solid' },
    { id: 'sand', n: 'الرملي الصحراوي', bg: ['#4a3820', '#9a7842'], panel: ['rgba(86,62,32,.95)', 'rgba(54,38,18,.97)'], line: '#e6c27a', foil: ['#fff4cf', '#dfbd68', '#946e22'], title: '#fbe6ae', text: '#fff6e2', muted: '#8a7248',
      paper: ['#fffaf0', '#f4e8cd', '#e6d3a8'], ink: '#4a3418', cov: ['#bb915a', '#8f6a38', '#5e4020'], btn: ['#8d6535', '#654523', '#432d14'], btntext: '#fff0c8', glow: 'rgba(255,220,140,.28)', tex: 'leather', emblem: 'knot', frame: 'dotted' },
    { id: 'noir', n: 'الأسود الفاخر', bg: ['#060606', '#1d1708'], panel: ['rgba(20,17,10,.97)', 'rgba(8,7,4,.98)'], line: '#f0c44c', foil: ['#fff6c2', '#f0c44c', '#a8780e'], title: '#ffe48a', text: '#f5ecd2', muted: '#7d6a35',
      paper: ['#f7f0dc', '#e7dcb8', '#d6c894'], ink: '#2a210e', cov: ['#2c2c2c', '#171717', '#050505'], btn: ['#2a2415', '#171208', '#0a0803'], btntext: '#ffe48a', glow: 'rgba(255,205,80,.28)', tex: 'lacquer', emblem: 'rosette', frame: 'double' }
  ];
  const BY = new Map(TH.map(t => [t.id, t]));
  const LEGACY = ['gold', 'violet', 'blue', 'emerald', 'charcoal'];     // ترتيب الثيمات القديمة (للي كان مختار ثيم قبل)
  const OLD_CLS = ['theme-violet', 'theme-glass', 'theme-emerald', 'theme-stealth'];

  // ---------- أشكال الزخرفة ----------
  const cornerSvg = (tf) => `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><g transform='${tf}' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'><path d='M3 38 V9 Q3 3 9 3 H38'/><path d='M9 38 V15 Q9 9 15 9 H38' stroke-width='1'/><path d='M15 15 Q23 15 23 23' stroke-width='1.2'/></g><g transform='${tf}' fill='black'><circle cx='9' cy='9' r='2.8'/><circle cx='30' cy='3' r='1.4'/><circle cx='3' cy='30' r='1.4'/></g></svg>")`;
  const CORNERS = [cornerSvg(''), cornerSvg('translate(40 0) scale(-1 1)'), cornerSvg('translate(0 40) scale(1 -1)'), cornerSvg('translate(40 40) scale(-1 -1)')];
  const LINE = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 12' preserveAspectRatio='none'><path d='M0 6 H94' stroke='black' stroke-width='1.3'/><path d='M0 9 H70' stroke='black' stroke-width='.6'/><path d='M99 6 L107 1 L115 6 L107 11 Z' fill='black'/><circle cx='95' cy='6' r='1.5' fill='black'/></svg>")`;
  const patternFor = (t) => `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><g fill='none' stroke='${enc(t.foil[1])}' stroke-width='1' opacity='.16'><path d='M30 4 L36 24 L56 30 L36 36 L30 56 L24 36 L4 30 L24 24 Z'/><circle cx='30' cy='30' r='3.5'/><path d='M0 0 L9 0 M0 0 L0 9 M60 0 H51 M60 0 V9 M0 60 H9 M0 60 V51 M60 60 H51 M60 60 V51'/></g></svg>")`;
  const covTex = (t) => {
    const f = enc(t.foil[1]);
    switch (t.tex) {
      case 'velvet': return `${grain(.16, '1.4', '1 1 1')}, radial-gradient(ellipse at 50% 0%, rgba(255,255,255,.14), transparent 60%)`;
      case 'cloth': return 'repeating-linear-gradient(45deg, rgba(255,255,255,.07) 0 1.5px, transparent 1.5px 4px), repeating-linear-gradient(-45deg, rgba(0,0,0,.14) 0 1.5px, transparent 1.5px 4px)';
      case 'lacquer': return 'linear-gradient(115deg, rgba(255,255,255,.16) 0 16%, transparent 34%), linear-gradient(180deg, rgba(255,255,255,.05), transparent 40%)';
      case 'tile': return `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44'><g fill='none' stroke='${f}' stroke-width='1' opacity='.38'><path d='M22 2 L27 17 L42 22 L27 27 L22 42 L17 27 L2 22 L17 17 Z'/><circle cx='22' cy='22' r='3'/></g></svg>")`;
      default: return grain(.42, '.85');
    }
  };
  const FRAME = { double: '1.5px solid var(--foil2)', solid: '2px solid var(--foil2)', dotted: '2px dotted var(--foil2)' };

  // ---------- شعارات الغلاف (كل ثيم له شكل) ----------
  function polyStar(n, R, r, rot = 0) {
    let p = '';
    for (let i = 0; i < n * 2; i++) { const a = (Math.PI * i) / n - Math.PI / 2 + rot, rad = i % 2 ? r : R; p += (i ? 'L' : 'M') + (50 + rad * Math.cos(a)).toFixed(1) + ' ' + (50 + rad * Math.sin(a)).toFixed(1) + ' '; }
    return p + 'Z';
  }
  function emblem(kind) {
    const G = 'url(#bkgold)';
    const defs = '<defs><linearGradient id="bkgold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--foil1)"/><stop offset=".5" style="stop-color:var(--foil2)"/><stop offset="1" style="stop-color:var(--foil3)"/></linearGradient></defs>';
    const ring = `<circle cx="50" cy="50" r="46" fill="none" stroke="${G}" stroke-width="1.8"/><circle cx="50" cy="50" r="41" fill="none" stroke="${G}" stroke-width=".8" stroke-dasharray="1.6 2.2"/>`;
    const core = (a, b) => `<circle cx="50" cy="50" r="${a}" fill="${G}"/><circle cx="50" cy="50" r="${b}" style="fill:var(--cov3)"/><circle cx="50" cy="50" r="${(b * .4).toFixed(1)}" fill="${G}"/>`;
    let body = '';
    if (kind === 'crescent') {
      body = `<mask id="bkcm"><rect width="100" height="100" fill="white"/><circle cx="58" cy="46" r="24" fill="black"/></mask><circle cx="46" cy="50" r="31" fill="${G}" mask="url(#bkcm)"/><path d="${polyStar(5, 10, 4.2)}" transform="translate(21 -6) scale(.9)" fill="${G}"/><circle cx="50" cy="50" r="36" fill="none" stroke="${G}" stroke-width=".7" opacity=".6"/>`;
    } else if (kind === 'rosette') {
      let petals = ''; for (let i = 0; i < 12; i++) petals += `<ellipse cx="50" cy="26" rx="5.4" ry="15" transform="rotate(${i * 30} 50 50)" fill="none" stroke="${G}" stroke-width="1.3"/>`;
      body = petals + `<circle cx="50" cy="50" r="17" fill="none" stroke="${G}" stroke-width="1.2"/>` + core(10, 6);
    } else if (kind === 'knot') {
      body = `<rect x="22" y="22" width="56" height="56" fill="none" stroke="${G}" stroke-width="1.8" stroke-linejoin="round"/><rect x="22" y="22" width="56" height="56" fill="none" stroke="${G}" stroke-width="1.8" stroke-linejoin="round" transform="rotate(45 50 50)"/><circle cx="50" cy="50" r="19" fill="none" stroke="${G}" stroke-width="1"/>` + core(11, 6.5);
    } else if (kind === 'tile') {
      body = `<path d="${polyStar(12, 38, 26)}" fill="none" stroke="${G}" stroke-width="1.5" stroke-linejoin="round"/><path d="${polyStar(6, 22, 13, .26)}" fill="none" stroke="${G}" stroke-width="1.1" stroke-linejoin="round"/>` + core(9, 5.5);
    } else {
      body = `<path d="M50 10 L58 38 L86 30 L66 50 L86 70 L58 62 L50 90 L42 62 L14 70 L34 50 L14 30 L42 38 Z" fill="none" stroke="${G}" stroke-width="1.4" stroke-linejoin="round"/>` + core(13, 8);
    }
    return `<svg class="bk-emblem" viewBox="0 0 100 100" aria-hidden="true">${defs}${ring}${body}</svg>`;
  }

  // ---------- الستايل ----------
  function vars(t) {
    const L = [['bg1', t.bg[0]], ['bg2', t.bg[1]], ['panel1', t.panel[0]], ['panel2', t.panel[1]], ['line', t.line], ['foil1', t.foil[0]], ['foil2', t.foil[1]], ['foil3', t.foil[2]], ['title', t.title], ['text', t.text], ['muted', t.muted],
      ['paper1', t.paper[0]], ['paper2', t.paper[1]], ['paper3', t.paper[2]], ['ink', t.ink], ['cov1', t.cov[0]], ['cov2', t.cov[1]], ['cov3', t.cov[2]], ['btn1', t.btn[0]], ['btn2', t.btn[1]], ['btn3', t.btn[2]], ['btntext', t.btntext], ['glow', t.glow], ['frame', FRAME[t.frame] || FRAME.double]];
    return L.map(([k, v]) => `--${k}: ${v};`).join(' ') + ` --pat: ${patternFor(t)}; --cov-tex: ${covTex(t)};`;
  }
  const paperGrain = grain(.3, '.7', '.45 .3 .1');
  const css = `
  ${TH.map(t => `body.bt-${t.id} { ${vars(t)} }`).join('\n')}
  body.bt.dark-mode { --bg1: #07080c; --bg2: #12141c; --panel1: rgba(20,21,30,.96); --panel2: rgba(10,11,16,.98); --paper1: #4a4436; --paper2: #3d392d; --paper3: #302d24; --ink: #eadfc2; --text: #d4d4d4; --muted: #b9ab85; }
  body.bt { background-color: var(--bg1); background-image: var(--pat), radial-gradient(ellipse at 50% -8%, var(--bg2), var(--bg1) 74%); color: var(--text); }
  body.bt #app-container { position: relative; background: linear-gradient(180deg, var(--panel1), var(--panel2)); border: 2px solid var(--line); border-radius: 18px; padding: 20px 18px 18px;
    box-shadow: 0 0 0 5px var(--panel2), 0 0 0 6px color-mix(in srgb, var(--line) 55%, transparent), 0 18px 50px rgba(0,0,0,.6), 0 0 44px var(--glow); }
  body.bt #app-container::before { content: ''; position: absolute; inset: 7px; border: 1px solid color-mix(in srgb, var(--line) 45%, transparent); border-radius: 13px; pointer-events: none; }
  body.bt #app-container::after { content: ''; position: absolute; inset: 9px; pointer-events: none; background: var(--foil2);
    -webkit-mask: ${CORNERS[0]} left top / 34px 34px no-repeat, ${CORNERS[1]} right top / 34px 34px no-repeat, ${CORNERS[2]} left bottom / 34px 34px no-repeat, ${CORNERS[3]} right bottom / 34px 34px no-repeat;
    mask: ${CORNERS[0]} left top / 34px 34px no-repeat, ${CORNERS[1]} right top / 34px 34px no-repeat, ${CORNERS[2]} left bottom / 34px 34px no-repeat, ${CORNERS[3]} right bottom / 34px 34px no-repeat; opacity: .9; }
  /* العنوان بزخارف على الجنبين */
  body.bt #app-container > header { display: flex; align-items: center; gap: 12px; margin: 2px 6px 12px; }
  body.bt #app-container > header::before, body.bt #app-container > header::after, body.bt .players-list-container h2::before, body.bt .players-list-container h2::after { content: ''; flex: 1; height: 12px; min-width: 24px; background: linear-gradient(90deg, var(--foil3), var(--foil1)); -webkit-mask: ${LINE} center / 100% 100% no-repeat; mask: ${LINE} center / 100% 100% no-repeat; }
  body.bt #app-container > header::before, body.bt .players-list-container h2::before { transform: scaleX(-1); }
  body.bt #app-container > header h1 { margin: 0; font-size: 1.9rem; line-height: 1.2; color: var(--title); text-shadow: 0 2px 0 rgba(0,0,0,.55), 0 0 16px var(--glow); }
  body.bt .game-section { gap: 11px; }
  /* الكلمة: لفافة ورق بعصاتين على الجنبين */
  body.bt .word-box { position: relative; background: ${paperGrain}, linear-gradient(180deg, var(--paper1), var(--paper2) 62%, var(--paper3)); color: var(--ink); text-shadow: 0 1px 0 rgba(255,255,255,.55); border-radius: 6px; padding: 14px 30px; font-size: 2.3rem;
    box-shadow: inset 0 0 0 3px var(--paper1), inset 0 0 0 4px color-mix(in srgb, var(--foil3) 70%, transparent), inset 0 0 26px rgba(120,80,20,.35), 0 6px 16px rgba(0,0,0,.5); }
  body.bt .word-box::before, body.bt .word-box::after { content: ''; position: absolute; top: -7px; bottom: -7px; width: 15px; border-radius: 8px; background: linear-gradient(90deg, var(--foil3), var(--foil1) 45%, var(--foil2) 60%, var(--foil3)); box-shadow: 0 3px 8px rgba(0,0,0,.55), inset 0 0 0 1px rgba(0,0,0,.25); }
  body.bt .word-box::before { right: -8px; } body.bt .word-box::after { left: -8px; }
  body.bt #input-answer { background: ${paperGrain}, linear-gradient(180deg, var(--paper1), var(--paper2)); color: var(--ink); border: 2px solid var(--foil2); border-radius: 10px; font-size: 1.25rem;
    box-shadow: inset 0 2px 7px rgba(90,55,10,.4), 0 2px 0 rgba(0,0,0,.45); }
  body.bt #input-answer::placeholder { color: var(--muted); opacity: .9; }
  body.bt #input-answer:focus { border-color: var(--foil1); box-shadow: inset 0 2px 7px rgba(90,55,10,.4), 0 0 0 3px var(--glow), 0 0 16px var(--glow); }
  body.bt .answer-time { color: var(--foil1); min-height: 1.05em; margin: -4px 0 0; }
  body.bt #points-display { display: inline-flex; align-items: center; gap: 10px; padding: 4px 26px; border-radius: 99px; font-weight: 800; color: var(--btntext);
    background: linear-gradient(180deg, var(--btn1), var(--btn3)); border: 1px solid var(--foil2); box-shadow: inset 0 0 0 2px var(--btn3), inset 0 0 0 3px rgba(255,255,255,.12), 0 3px 9px rgba(0,0,0,.5); }
  body.bt #points-display::before, body.bt #points-display::after { content: '✦'; color: var(--foil2); font-size: .8em; }
  body.bt #answers-display { background: linear-gradient(180deg, var(--panel1), var(--panel2)); border: 1px solid color-mix(in srgb, var(--line) 50%, transparent); color: var(--foil1); box-shadow: inset 0 0 14px rgba(0,0,0,.4); }
  body.bt .controls { margin: 14px 0 10px; gap: 8px; }
  /* قائمة المتصدرين */
  body.bt .players-list-container { background: linear-gradient(180deg, var(--panel1), var(--panel2)); border: 1px solid var(--line); border-radius: 12px; padding: 12px 16px 10px; scrollbar-width: thin; scrollbar-color: var(--foil3) transparent;
    box-shadow: inset 0 0 0 3px var(--panel2), inset 0 0 0 4px color-mix(in srgb, var(--line) 45%, transparent), 0 6px 18px rgba(0,0,0,.45); }
  body.bt .players-list-container h2 { display: flex; align-items: center; gap: 10px; margin: 0 0 8px; font-size: 1.25rem; color: var(--title); text-shadow: 0 1px 0 rgba(0,0,0,.5); }
  body.bt #players-list li { border-bottom: 1px dotted color-mix(in srgb, var(--line) 45%, transparent); border-radius: 4px; transition: background .2s; }
  body.bt #players-list li:hover { background: rgba(255,255,255,.05); }
  body.bt .pg-pbtn { border-color: color-mix(in srgb, var(--foil2) 70%, transparent); }
  /* الشات */
  body.bt .chat-container { background: linear-gradient(180deg, var(--panel1), var(--panel2)); border: 2px solid var(--line); border-radius: 14px; box-shadow: 0 0 0 4px var(--panel2), 0 0 0 5px color-mix(in srgb, var(--line) 50%, transparent), 0 16px 44px rgba(0,0,0,.65); }
  body.bt .chat-header { background: ${covTexLayers()}; color: var(--title); border-bottom: 1px solid var(--foil3); text-shadow: 0 1px 0 rgba(0,0,0,.5); }
  body.bt .chat-header button { color: var(--title); }
  body.bt .chat-messages { color: var(--text); scrollbar-width: thin; scrollbar-color: var(--foil3) transparent; }
  body.bt .chat-system-message { color: var(--foil1); }
  body.bt .chat-text { color: var(--text); }
  body.bt #chat-input { background: ${paperGrain}, linear-gradient(180deg, var(--paper1), var(--paper2)); color: var(--ink); border: 1.5px solid var(--foil2); border-radius: 10px; }
  body.bt #chat-input::placeholder { color: var(--muted); }
  body.bt #btn-send-chat { background: linear-gradient(180deg, var(--btn1), var(--btn3)); color: var(--btntext); border: 1px solid var(--foil2); border-radius: 10px; box-shadow: inset 0 0 0 2px var(--btn3), 0 2px 6px rgba(0,0,0,.45); }
  body.bt #btn-send-chat:hover { box-shadow: inset 0 0 0 2px var(--btn3), 0 0 14px var(--glow); }
  /* النوافذ */
  body.bt dialog#change-name-dialog, body.bt dialog#instructions-dialog { background: ${covTexLayers()}; color: var(--title); border: 2px solid var(--foil2); border-radius: 12px;
    box-shadow: 0 0 0 4px var(--cov3), 0 0 0 5px color-mix(in srgb, var(--foil2) 60%, transparent), 0 20px 50px rgba(0,0,0,.7), inset 0 0 40px rgba(0,0,0,.35); }
  body.bt dialog#change-name-dialog input { background: ${paperGrain}, linear-gradient(180deg, var(--paper1), var(--paper2)); color: var(--ink); border: 2px solid var(--foil2); box-shadow: inset 0 2px 6px rgba(90,55,10,.4); text-align: center; }
  body.bt dialog#instructions-dialog button, body.bt dialog#change-name-dialog button, body.bt #close-instructions { background: linear-gradient(180deg, var(--btn1), var(--btn3)); color: var(--btntext); border: 1px solid var(--foil2); box-shadow: inset 0 0 0 2px var(--btn3), 0 2px 7px rgba(0,0,0,.5); text-shadow: 0 1px 1px rgba(0,0,0,.6); }
  body.bt #instructions-title { color: var(--title); text-shadow: 0 2px 0 rgba(0,0,0,.5), 0 0 14px var(--glow); }
  body.bt .instructions-content, body.bt .instructions-content ol { color: var(--text); }
  body.bt .studio-popup { border-color: var(--line) !important; }
  /* مركز اللاعب والمتجر */
  body.bt .pg-card { background: linear-gradient(160deg, var(--panel1), var(--panel2)); border: 2px solid var(--line); box-shadow: 0 20px 60px rgba(0,0,0,.65), 0 0 40px var(--glow); }
  body.bt .pg-head h3 { color: var(--title); }
  body.bt .pg-tab.on { background: linear-gradient(180deg, var(--btn1), var(--btn3)); color: var(--btntext); box-shadow: inset 0 0 0 1px var(--foil2), 0 4px 14px var(--glow); }
  /* لما لوحة الرسم تنفتح بنوقّف كل الحركات اللي وراها عشان الرسم يكون أسلس */
  html.art-open *:not(#board-dialog):not(#board-dialog *) { animation-play-state: paused !important; }
  .studio-popup::backdrop { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; background: rgba(0, 0, 0, .94) !important; }
  `;
  function covTexLayers() { return 'var(--cov-tex), linear-gradient(135deg, var(--cov1), var(--cov2) 60%, var(--cov3))'; }
  const style = document.createElement('style');
  style.id = 'themes-css';
  style.textContent = css;
  document.head.appendChild(style);

  // ---------- التطبيق ----------
  const listeners = [];
  let cur = null;
  const themeBtn = () => document.getElementById('btn-theme-toggle');
  function label() { const b = themeBtn(); if (b && cur) { const txt = `🖌️ الثيم: ${cur.n}`; if (b.textContent !== txt) b.textContent = txt; } }
  function stripOld() { const cl = document.body.classList; OLD_CLS.forEach(c => { if (cl.contains(c)) cl.remove(c); }); }
  function set(id, save = true) {
    const t = BY.get(id) || TH[0];
    cur = t;
    const b = document.body;
    [...b.classList].forEach(c => { if (c.startsWith('bt-')) b.classList.remove(c); });
    b.classList.add('bt', 'bt-' + t.id);
    stripOld();
    if (save) { try { localStorage.setItem('themeId', t.id); } catch (e) {} }
    label();
    listeners.forEach(fn => { try { fn(t); } catch (e) {} });
  }
  function initial() {
    let id = null;
    try { id = localStorage.getItem('themeId'); } catch (e) {}
    if (!BY.has(id)) {
      let idx = 0; try { idx = parseInt(localStorage.getItem('customThemeIndex')) || 0; } catch (e) {}
      id = LEGACY[idx] || 'gold';
    }
    return id;
  }
  const api = {
    list: TH, emblem,
    get current() { return cur; },
    set: (id) => set(id),
    next() { const i = TH.indexOf(cur); set(TH[(i + 1) % TH.length].id); },
    onChange(fn) { listeners.push(fn); if (cur) fn(cur); }
  };
  window.__themes = api;
  set(initial(), false);

  // نص الزر: السكربت القديم اللي بـ index.html بيكتب عليه، فبنرجّع النص الصحيح
  const attach = () => {
    const b = themeBtn(); if (!b || b.dataset.thBound) return; b.dataset.thBound = '1';
    new MutationObserver(label).observe(b, { childList: true, characterData: true, subtree: true });
    b.addEventListener('click', () => api.next());
    label();
  };
  attach();
  document.addEventListener('DOMContentLoaded', () => { attach(); stripOld(); label(); });
  // الكلاسات القديمة (theme-violet...) اللي بيضيفها سكربت index.html بنشيلها فوراً عشان ما تخرّب الشكل الجديد
  new MutationObserver(stripOld).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  // لوحة الرسم: لما تنفتح بنوقّف حركات الصفحة اللي وراها (أسلس رسم)
  const bd = document.getElementById('board-dialog');
  if (bd) { const sync = () => document.documentElement.classList.toggle('art-open', bd.hasAttribute('open')); new MutationObserver(sync).observe(bd, { attributes: true, attributeFilter: ['open'] }); sync(); }
})();

/* ==========================================================================
   ✨ إضافات جديدة (لا تغيّر تصميم اللعبة): ستايلات الليدات والشروحات والطلبات
   ========================================================================== */
(() => {
  const css = `
  .btn-action { position: relative; }
  .btn-action.led-on, .btn-action.led-off { transition: box-shadow .25s ease, border-color .25s ease; }
  .btn-action.led-on { border-color: #22c55e !important; box-shadow: 0 0 0 1px #22c55e, 0 0 12px rgba(34,197,94,.65) !important; }
  .btn-action.led-off { border-color: #ef4444 !important; box-shadow: 0 0 0 1px rgba(239,68,68,.85), 0 0 8px rgba(239,68,68,.4) !important; }
  .btn-action.led-on::before, .btn-action.led-on::after,
  .btn-action.led-off::before, .btn-action.led-off::after {
    content: ''; position: absolute; width: 7px; height: 7px; border-radius: 50%;
  }
  .btn-action.led-on::before, .btn-action.led-off::before { top: -4px; right: -4px; }
  .btn-action.led-on::after, .btn-action.led-off::after { bottom: -4px; left: -4px; }
  .btn-action.led-on::before, .btn-action.led-on::after { background: #22c55e; box-shadow: 0 0 8px #22c55e; }
  .btn-action.led-off::before, .btn-action.led-off::after { background: #ef4444; box-shadow: 0 0 6px #ef4444; }

  .tooltip-icon { padding: 4px 6px; margin: -4px -2px; cursor: pointer !important; }
  .tip-bubble {
    position: fixed; z-index: 10060; max-width: 240px; background: #0d1117; color: #f0f6fc;
    border: 1px solid rgba(255,255,255,.2); border-radius: 8px; padding: 8px 10px; font-size: .8rem;
    line-height: 1.5; box-shadow: 0 8px 24px rgba(0,0,0,.5); direction: rtl; text-align: right; pointer-events: none;
  }

  .custom-modal-overlay[popover] { border: 0; margin: 0; inset: 0; color: var(--admin-text-main); }

  .admin-requests-box {
    position: fixed; inset: auto; top: 64px; left: 50%; transform: translateX(-50%);
    width: min(92vw, 420px); max-height: 80vh; overflow-y: auto; margin: 0; padding: 0; border: 0;
    background: transparent; display: none; flex-direction: column; gap: 10px; z-index: 10040;
    color: var(--admin-text-main);
  }
  .req-card {
    background: var(--admin-bg-card); border: 1px solid var(--admin-border-focus);
    border-radius: var(--admin-radius-md); padding: 12px; box-shadow: var(--admin-shadow-soft); direction: rtl;
  }
  .req-title { font-weight: 700; color: var(--admin-text-bright); margin-bottom: 6px; }
  .req-text { font-size: .85rem; margin-bottom: 8px; line-height: 1.5; white-space: pre-line; }
  .req-actions { display: flex; gap: 8px; margin-top: 8px; }
  .req-actions .btn-custom { flex: 1; }

  .sanction-row {
    display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 10px;
    border: 1px solid var(--admin-border-matte); border-radius: var(--admin-radius-sm);
    background: rgba(0,0,0,.2); margin-bottom: 8px;
  }
  .sanction-info { font-size: .82rem; color: var(--admin-text-main); flex: 1; word-break: break-word; }
  .sanction-row .btn-action { flex: 0 0 auto; padding: 6px 12px; }
  `;
  const st = document.createElement('style');
  st.id = 'extra-admin-styles';
  st.textContent = css;
  document.head.appendChild(st);
})();

/* ==========================================================================
   ⚡ تأثير REDO: اسم بنفسجي بتأثير رعد + ضربات رعد (مع صوت) على الشاشات
   السيرفر هو اللي بيحدد مين له التأثير، وكل قد إيش بيجي رعد، ولمين بيوصل
   ========================================================================== */
(() => {
  // صورة اسم REDO (نفس صورة الأدمن، بخلفية شفافة) مضمّنة هون عشان ما يلزم ملف زيادة
  const IMG = 'data:image/webp;base64,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';
  // خيوط البرق لحالها (بيضاء رفيعة) عشان تضرب وتومض بدون ما الاسم كله يضوي
  const BOLTS = 'data:image/webp;base64,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';

  const css = `
  :root { --redo-img: url("${IMG}"); --redo-bolts: url("${BOLTS}"); }
  /* الاسم: الكلمة الحقيقية موجودة بس شفافة، والشكل بيجي من صورة REDO. الصورة ثابتة، والبرق بيضرب بأجزاء منفصلة */
  .redo-name {
    position: relative; display: inline-block; width: 3.84em; height: 1.25em; margin: .45em 2em;
    vertical-align: middle; white-space: nowrap; line-height: 1.25; text-indent: 0;
    color: transparent; -webkit-text-fill-color: transparent; text-shadow: none; -webkit-text-stroke: 0;
    user-select: none; -webkit-user-select: none;
  }
  .redo-name::before, .redo-name .rb {
    content: ''; position: absolute; left: -1.41em; top: -1.78em; width: 6.93em; height: 3.96em; display: block;
    background: var(--redo-img) center / 100% 100% no-repeat; pointer-events: none;
  }
  /* الطبقة الثابتة: الحروف والتوهج والبرق الهادي */
  .redo-name::before { opacity: .96; }
  /* طبقات الضرب: كل واحدة بتضيء منطقة برق لحالها بتوقيت مختلف، بوميض سريع متقطّع زي البرق الحقيقي */
  .redo-name .rb {
    opacity: 0; will-change: opacity;
    background-image: var(--redo-bolts);
    filter: brightness(1.6) drop-shadow(0 0 .03em #fff) drop-shadow(0 0 .07em #fff) drop-shadow(0 0 .2em #d8b4fe) drop-shadow(0 0 .45em #a855f7);
  }
  .redo-name .rb1 { -webkit-mask-image: radial-gradient(ellipse 22% 48% at 12% 58%, #000 55%, transparent 100%); mask-image: radial-gradient(ellipse 22% 48% at 12% 58%, #000 55%, transparent 100%); animation: redoB1 5.3s linear infinite; }
  .redo-name .rb2 { -webkit-mask-image: radial-gradient(ellipse 17% 36% at 69% 16%, #000 55%, transparent 100%); mask-image: radial-gradient(ellipse 17% 36% at 69% 16%, #000 55%, transparent 100%); animation: redoB2 7.1s linear infinite -2.4s; }
  .redo-name .rb3 { -webkit-mask-image: radial-gradient(ellipse 16% 44% at 89% 50%, #000 55%, transparent 100%); mask-image: radial-gradient(ellipse 16% 44% at 89% 50%, #000 55%, transparent 100%); animation: redoB3 6.2s linear infinite -4.1s; }
  .redo-name .rb4 { -webkit-mask-image: radial-gradient(ellipse 26% 22% at 62% 92%, #000 55%, transparent 100%); mask-image: radial-gradient(ellipse 26% 22% at 62% 92%, #000 55%, transparent 100%); animation: redoB4 8.9s linear infinite -1.3s; }
  @keyframes redoB1 {
    0% { opacity: 0; animation-timing-function: steps(1, end); }
    8.00% { opacity: 1; transform: translate(.025em,-.012em); animation-timing-function: steps(1, end); }
    8.90% { opacity: 0.12; transform: translate(0,0); animation-timing-function: steps(1, end); }
    9.80% { opacity: 0.95; transform: translate(-.02em,.012em); animation-timing-function: steps(1, end); }
    11.00% { opacity: 0.2; transform: translate(0,0); animation-timing-function: steps(1, end); }
    11.80% { opacity: 0.7; transform: translate(.012em,0); animation-timing-function: linear; }
    13.60% { opacity: 0; transform: translate(0,0); animation-timing-function: linear; }
    56.00% { opacity: 1; transform: translate(.025em,-.012em); animation-timing-function: steps(1, end); }
    56.90% { opacity: 0.12; transform: translate(0,0); animation-timing-function: steps(1, end); }
    57.80% { opacity: 0.95; transform: translate(-.02em,.012em); animation-timing-function: steps(1, end); }
    59.00% { opacity: 0.2; transform: translate(0,0); animation-timing-function: steps(1, end); }
    59.80% { opacity: 0.7; transform: translate(.012em,0); animation-timing-function: linear; }
    61.60% { opacity: 0; transform: translate(0,0); animation-timing-function: linear; }
    100% { opacity: 0; }
  }
  @keyframes redoB2 {
    0% { opacity: 0; animation-timing-function: steps(1, end); }
    31.00% { opacity: 1; transform: translate(.025em,-.012em); animation-timing-function: steps(1, end); }
    31.67% { opacity: 0.12; transform: translate(0,0); animation-timing-function: steps(1, end); }
    32.34% { opacity: 0.95; transform: translate(-.02em,.012em); animation-timing-function: steps(1, end); }
    33.24% { opacity: 0.2; transform: translate(0,0); animation-timing-function: steps(1, end); }
    33.84% { opacity: 0.7; transform: translate(.012em,0); animation-timing-function: linear; }
    35.18% { opacity: 0; transform: translate(0,0); animation-timing-function: linear; }
    73.00% { opacity: 1; transform: translate(.025em,-.012em); animation-timing-function: steps(1, end); }
    73.67% { opacity: 0.12; transform: translate(0,0); animation-timing-function: steps(1, end); }
    74.34% { opacity: 0.95; transform: translate(-.02em,.012em); animation-timing-function: steps(1, end); }
    75.24% { opacity: 0.2; transform: translate(0,0); animation-timing-function: steps(1, end); }
    75.84% { opacity: 0.7; transform: translate(.012em,0); animation-timing-function: linear; }
    77.18% { opacity: 0; transform: translate(0,0); animation-timing-function: linear; }
    100% { opacity: 0; }
  }
  @keyframes redoB3 {
    0% { opacity: 0; animation-timing-function: steps(1, end); }
    14.00% { opacity: 1; transform: translate(.025em,-.012em); animation-timing-function: steps(1, end); }
    14.77% { opacity: 0.12; transform: translate(0,0); animation-timing-function: steps(1, end); }
    15.54% { opacity: 0.95; transform: translate(-.02em,.012em); animation-timing-function: steps(1, end); }
    16.56% { opacity: 0.2; transform: translate(0,0); animation-timing-function: steps(1, end); }
    17.25% { opacity: 0.7; transform: translate(.012em,0); animation-timing-function: linear; }
    18.79% { opacity: 0; transform: translate(0,0); animation-timing-function: linear; }
    47.00% { opacity: 1; transform: translate(.025em,-.012em); animation-timing-function: steps(1, end); }
    47.77% { opacity: 0.12; transform: translate(0,0); animation-timing-function: steps(1, end); }
    48.54% { opacity: 0.95; transform: translate(-.02em,.012em); animation-timing-function: steps(1, end); }
    49.56% { opacity: 0.2; transform: translate(0,0); animation-timing-function: steps(1, end); }
    50.25% { opacity: 0.7; transform: translate(.012em,0); animation-timing-function: linear; }
    51.79% { opacity: 0; transform: translate(0,0); animation-timing-function: linear; }
    88.00% { opacity: 1; transform: translate(.025em,-.012em); animation-timing-function: steps(1, end); }
    88.77% { opacity: 0.12; transform: translate(0,0); animation-timing-function: steps(1, end); }
    89.54% { opacity: 0.95; transform: translate(-.02em,.012em); animation-timing-function: steps(1, end); }
    90.56% { opacity: 0.2; transform: translate(0,0); animation-timing-function: steps(1, end); }
    91.25% { opacity: 0.7; transform: translate(.012em,0); animation-timing-function: linear; }
    92.79% { opacity: 0; transform: translate(0,0); animation-timing-function: linear; }
    100% { opacity: 0; }
  }
  @keyframes redoB4 {
    0% { opacity: 0; animation-timing-function: steps(1, end); }
    63.00% { opacity: 1; transform: translate(.025em,-.012em); animation-timing-function: steps(1, end); }
    63.54% { opacity: 0.12; transform: translate(0,0); animation-timing-function: steps(1, end); }
    64.07% { opacity: 0.95; transform: translate(-.02em,.012em); animation-timing-function: steps(1, end); }
    64.79% { opacity: 0.2; transform: translate(0,0); animation-timing-function: steps(1, end); }
    65.26% { opacity: 0.7; transform: translate(.012em,0); animation-timing-function: linear; }
    66.33% { opacity: 0; transform: translate(0,0); animation-timing-function: linear; }
    100% { opacity: 0; }
  }

  /* لحظة ضربة الرعد (من السيرفر): كل مناطق البرق بتضرب مع بعض بتأخير بسيط، والصورة بتومض ومضة قصيرة */
  body.redo-striking .redo-name::before { animation: redoBaseHit .9s ease-out 1; }
  body.redo-striking .redo-name .rb { animation: redoRbHit .9s steps(1, end) 1; }
  body.redo-striking .redo-name .rb2 { animation-delay: .04s; }
  body.redo-striking .redo-name .rb3 { animation-delay: .08s; }
  body.redo-striking .redo-name .rb4 { animation-delay: .12s; }
  @keyframes redoBaseHit { 0% { filter: brightness(1.5); } 20% { filter: brightness(1.05); } 32% { filter: brightness(1.35); } 60%, 100% { filter: brightness(1); } }
  @keyframes redoRbHit {
    0% { opacity: 1; transform: translate(.03em, -.015em); } 10% { opacity: .15; transform: none; }
    20% { opacity: 1; transform: translate(-.025em, .015em); } 32% { opacity: .25; transform: none; }
    42% { opacity: .8; } 60% { opacity: .3; } 75% { opacity: .5; } 100% { opacity: 0; }
  }

  /* طبقة البرق على الشاشة (فوق كل شي، ما بتمنع الضغط) */
  #redo-fx-layer {
    position: fixed; inset: 0; width: 100vw; height: 100vh; margin: 0; padding: 0; border: 0;
    background: transparent; overflow: hidden; pointer-events: none; z-index: 10050;
  }
  #redo-fx-layer .redo-flash {
    position: absolute; inset: 0; opacity: 0;
    background: radial-gradient(ellipse at var(--fx-x, 50%) 0%, rgba(233,213,255,.55) 0%, rgba(126,34,206,.28) 38%, rgba(30,10,60,0) 75%);
  }
  #redo-fx-layer svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }

  @media (prefers-reduced-motion: reduce) {
    .redo-name, .redo-name::before, .redo-name::after,
    body.redo-striking .redo-name, body.redo-striking .redo-name::before, body.redo-striking .redo-name::after { animation: none; }
    .redo-name .rb, body.redo-striking .redo-name .rb { animation: none; opacity: 0; }
  }
  `;
  const st = document.createElement('style');
  st.id = 'redo-fx-styles';
  st.textContent = css;
  document.head.appendChild(st);

  const reduceMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------- صوت الرعد (بيتولّد بالمتصفح، بدون ملفات) ----------
  let actx = null;
  function unlockAudio() {
    try {
      if (!actx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) actx = new AC();
      }
      if (actx && actx.state === 'suspended') actx.resume();
    } catch (e) {}
  }
  // المتصفح بيمنع الصوت قبل أول لمسة، فنفعّله عند أول ضغطة أو كتابة
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlockAudio, { passive: true }));

  function playThunder(volume) {
    if (!volume || !actx || actx.state !== 'running') return;
    try {
      const v = Math.min(1, volume) * 0.8;
      const t0 = actx.currentTime + 0.02;
      const sr = actx.sampleRate;

      // الهدير العميق: نويز بني بيخفت ويغمق تدريجياً
      const dur = 3.4;
      const n = Math.floor(sr * dur);
      const buf = actx.createBuffer(1, n, sr);
      const ch = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < n; i++) {
        last = (last + 0.025 * (Math.random() * 2 - 1)) / 1.025;
        ch[i] = Math.max(-1, Math.min(1, last * 4));
      }
      const rumble = actx.createBufferSource();
      rumble.buffer = buf;
      const lp = actx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(1100, t0);
      lp.frequency.exponentialRampToValueAtTime(70, t0 + dur);
      const g = actx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.95 * v, t0 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.30 * v, t0 + 0.45);
      g.gain.exponentialRampToValueAtTime(0.65 * v, t0 + 0.8);
      g.gain.exponentialRampToValueAtTime(0.20 * v, t0 + 1.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      rumble.connect(lp); lp.connect(g); g.connect(actx.destination);
      rumble.start(t0);

      // طقّة البرق بالبداية
      const cn = Math.floor(sr * 0.22);
      const cbuf = actx.createBuffer(1, cn, sr);
      const cd = cbuf.getChannelData(0);
      for (let i = 0; i < cn; i++) cd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / cn, 3);
      const crack = actx.createBufferSource();
      crack.buffer = cbuf;
      const hp = actx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1500;
      const cg = actx.createGain();
      cg.gain.value = 0.45 * v;
      crack.connect(hp); hp.connect(cg); cg.connect(actx.destination);
      crack.start(t0);
    } catch (e) {}
  }

  // ---------- شكل البرق على الشاشة ----------
  function jag(x1, y1, x2, y2, off, iter) {
    let pts = [[x1, y1], [x2, y2]];
    for (let k = 0; k < iter; k++) {
      const next = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[i + 1];
        const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
        const o = (Math.random() * 2 - 1) * off;
        next.push([(ax + bx) / 2 + (-dy / len) * o, (ay + by) / 2 + (dx / len) * o], pts[i + 1]);
      }
      pts = next;
      off *= 0.55;
    }
    return pts;
  }
  const toPath = (pts) => 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');

  let boltSeq = 0;
  function boltSvg() {
    const w = window.innerWidth, h = window.innerHeight;
    const x0 = w * (0.12 + Math.random() * 0.76);
    const main = jag(x0, -20, x0 + (Math.random() - 0.5) * w * 0.35, h * (0.55 + Math.random() * 0.35), w * 0.08, 6);
    const paths = [toPath(main)];
    const branches = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < branches; i++) {
      const s = main[Math.floor(main.length * (0.2 + Math.random() * 0.6))];
      const dir = Math.random() < 0.5 ? -1 : 1;
      paths.push(toPath(jag(s[0], s[1], s[0] + dir * w * (0.08 + Math.random() * 0.2), s[1] + h * (0.1 + Math.random() * 0.25), w * 0.04, 5)));
    }
    const id = 'redoBlur' + (++boltSeq);
    const all = paths.map(p => `<path d="${p}"/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <defs><filter id="${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter></defs>
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <g filter="url(#${id})" stroke="#a855f7" stroke-width="13" opacity=".95">${all}</g>
        <g stroke="#c084fc" stroke-width="5" opacity=".85">${all}</g>
        <path d="${paths[0]}" stroke="#faf5ff" stroke-width="3.2"/>
        ${paths.slice(1).map(p => `<path d="${p}" stroke="#f3e8ff" stroke-width="1.8"/>`).join('')}
      </g></svg>`;
  }

  let layer = null;
  let active = 0;
  function getLayer() {
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'redo-fx-layer';
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);
    }
    return layer;
  }

  function screenFlash() {
    const L = getLayer();
    const flash = document.createElement('div');
    flash.className = 'redo-flash';
    flash.style.setProperty('--fx-x', (10 + Math.random() * 80) + '%');
    L.appendChild(flash);

    const count = Math.random() < 0.35 ? 2 : 1; // أحياناً برقين مع بعض
    const svgs = [];
    for (let i = 0; i < count; i++) {
      const holder = document.createElement('div');
      holder.innerHTML = boltSvg();
      const svg = holder.firstElementChild;
      L.appendChild(svg);
      svgs.push(svg);
    }

    active++;
    topLayerShow(L);

    const fa = flash.animate(
      [{ opacity: 0 }, { opacity: 1, offset: 0.06 }, { opacity: 0.25, offset: 0.14 }, { opacity: 0.6, offset: 0.22 }, { opacity: 0 }],
      { duration: 950, easing: 'ease-out' }
    );
    fa.onfinish = () => {
      flash.remove();
      if (--active <= 0) { active = 0; topLayerHide(L); }
    };
    svgs.forEach((svg, i) => {
      const a = svg.animate(
        [{ opacity: 0 }, { opacity: 1, offset: 0.05 }, { opacity: 0.25, offset: 0.15 }, { opacity: 1, offset: 0.22 }, { opacity: 0 }],
        { duration: 750, delay: i * 70, easing: 'linear', fill: 'both' }
      );
      a.onfinish = () => svg.remove();
    });
  }

  let strikeTimer = null;
  function nameStrike() {
    document.body.classList.add('redo-striking');
    clearTimeout(strikeTimer);
    strikeTimer = setTimeout(() => document.body.classList.remove('redo-striking'), 1000);
  }

  // ---------- ضربة رعد جاية من السيرفر ----------
  socket.on('fx:strike', (d) => {
    d = d || {};
    if (document.hidden) return;
    nameStrike();
    if (d.screen && !reduceMotion()) screenFlash();
    if (d.volume) setTimeout(() => playThunder(d.volume), d.screen ? 250 + Math.random() * 450 : 0);
  });
})();

/* ==========================================================================
   🧰 دوال مشتركة
   ========================================================================== */

// عرض عنصر فوق كل شيء (حتى فوق نوافذ <dialog> مثل لوحة الرسم)
function topLayerShow(el) {
  try {
    if (el.showPopover) {
      if (!el.hasAttribute('popover')) el.setAttribute('popover', 'manual');
      if (!el.matches(':popover-open')) el.showPopover();
    }
  } catch (e) {}
}
function topLayerHide(el) {
  try {
    if (el.hidePopover && el.matches(':popover-open')) el.hidePopover();
  } catch (e) {}
}

function closeAllDialogs() {
  document.querySelectorAll('dialog[open]').forEach(d => { try { d.close(); } catch (e) {} });
}

function openChatPanel() {
  if (!chatContainer.classList.contains('open')) {
    chatContainer.classList.add('open');
    btnChat.setAttribute('aria-expanded', 'true');
    chatContainer.hidden = false;
  }
  btnChat.classList.remove('notify');
}

function leaveGame() {
  try { socket.disconnect(); } catch (e) {}
  try { window.close(); } catch (e) {}
  window.location.replace('about:blank');
}

/* ==========================================================================
   🧊 حالة اللاعب: كتم / تجميد / عمياء
   ========================================================================== */
let myStatus = { muted: false, frozen: false, blinded: false, globalMute: false };
const ANSWER_PLACEHOLDER = inputAnswer.getAttribute('placeholder') || '';
const CHAT_PLACEHOLDER = chatInput.getAttribute('placeholder') || '';
let blindEl = null;

function showBlind() {
  if (blindEl) return;
  blindEl = document.createElement('div');
  blindEl.style.cssText = 'position:fixed;inset:0;background:#000;z-index:2147483000;';
  document.body.appendChild(blindEl);
}
function hideBlind() {
  if (blindEl) { blindEl.remove(); blindEl = null; }
}

function applyStatus() {
  const chatBlocked = myStatus.muted || myStatus.frozen || myStatus.blinded;
  chatInput.disabled = chatBlocked;
  chatInput.placeholder = myStatus.frozen ? '🧊 أنت مجمّد'
    : myStatus.globalMute ? '🔇 الشات مقفل: الأدمن فقط يستطيع الكتابة'
    : myStatus.muted ? '🔇 أنت ممنوع من الكتابة'
    : CHAT_PLACEHOLDER;

  inputAnswer.disabled = myStatus.frozen || myStatus.blinded;
  inputAnswer.placeholder = myStatus.frozen ? '🧊 أنت مجمّد' : ANSWER_PLACEHOLDER;

  if (myStatus.blinded) { closeAllDialogs(); showBlind(); } else hideBlind();
}

socket.on('player:status', (s) => {
  myStatus = Object.assign({}, myStatus, s);
  applyStatus();
});

/* ==========================================================================
   💬 الهمس: يوصل برسالة النظام ويقدر اللاعب يرد عليه
   ========================================================================== */
socket.on('admin:whisper_received', (data) => addWhisperMessage(data));

function addWhisperMessage({ message, from, fromId, isReply }) {
  const div = document.createElement('div');
  div.className = 'chat-message chat-system-message';

  const head = document.createElement('div');
  head.textContent = `💬 ${isReply ? 'رد همس' : 'همس'} من (${from}): ${message}`;
  div.appendChild(head);

  const form = document.createElement('form');
  form.style.cssText = 'display:flex;gap:6px;margin-top:6px;';

  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 500;
  input.autocomplete = 'off';
  input.placeholder = 'اكتب ردك...';
  input.style.cssText = 'flex:1;min-width:0;padding:6px 10px;border-radius:10px;border:1px solid #b8860b44;background:rgba(255,215,0,.2);color:inherit;font-size:13px;';

  const btn = document.createElement('button');
  btn.type = 'submit';
  btn.textContent = `الهمس أيضاً لـ(${from})`;
  btn.style.cssText = 'padding:6px 10px;border-radius:10px;border:none;cursor:pointer;font-weight:700;background:linear-gradient(135deg,#b8860b,#ffd700);color:#3e2f1c;font-size:12px;white-space:nowrap;';

  form.appendChild(input);
  form.appendChild(btn);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    socket.emit('whisper:reply', { toId: fromId, message: text });
    const echo = document.createElement('div');
    echo.textContent = `↪️ همس إلى (${from}): ${text}`;
    echo.style.cssText = 'font-size:12px;opacity:.85;margin-top:4px;';
    div.appendChild(echo);
    input.value = '';
  });
  div.appendChild(form);

  chatMessages.appendChild(div);
  openChatPanel();
  scrollChatToBottom();
  playNotificationSound();
}

/* ==========================================================================
   💀 الموت المفاجئ (شارة بالعد التنازلي)
   ========================================================================== */
let sdBadge = null;
let sdInterval = null;

function clearSuddenBadge() {
  if (sdInterval) { clearInterval(sdInterval); sdInterval = null; }
  if (sdBadge) { sdBadge.remove(); sdBadge = null; }
}

socket.on('game:sudden_death_started', (d) => {
  clearSuddenBadge();
  const endsAt = Date.now() + (d.remaining || d.timer || 30) * 1000;
  sdBadge = document.createElement('div');
  sdBadge.style.cssText = 'position:fixed;bottom:14px;left:50%;transform:translateX(-50%);background:#7f1d1d;color:#fff;padding:8px 16px;border-radius:999px;font-weight:800;z-index:10000;box-shadow:0 0 14px rgba(239,68,68,.7);';
  document.body.appendChild(sdBadge);
  const tick = () => {
    const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    sdBadge.textContent = `💀 الموت المفاجئ — ${left}ث — المطلوب ${d.required}`;
  };
  tick();
  sdInterval = setInterval(tick, 250);
});

socket.on('game:sudden_death_ended', () => clearSuddenBadge());

/* ==========================================================================
   🚪 بوابة الدخول: مطرود / محظور / الغرفة مغلقة / الأدمن الأساسي غائب
   ========================================================================== */
let gateEl = null;

function hideGate() {
  if (gateEl) { gateEl.remove(); gateEl = null; }
}

function showGate(d) {
  closeAllDialogs();
  hideBlind();
  hideGate();

  gateEl = document.createElement('div');
  gateEl.className = 'custom-modal-overlay';
  gateEl.style.zIndex = '10050';

  const card = document.createElement('div');
  card.className = 'custom-modal-card login-card';

  const header = document.createElement('div');
  header.className = 'modal-header';
  const h = document.createElement('h3');
  h.textContent = d.title || '';
  header.appendChild(h);
  card.appendChild(header);

  const addLine = (text, bright) => {
    if (!text) return;
    const p = document.createElement('p');
    p.className = 'modal-subtitle';
    p.style.margin = '8px 0';
    if (bright) p.style.color = 'var(--admin-text-bright)';
    p.textContent = text;
    card.appendChild(p);
  };
  addLine(d.message, false);
  addLine(d.reason, true);
  addLine(d.note, true);
  addLine(d.status, false);

  const actions = document.createElement('div');
  actions.className = 'modal-actions';
  actions.style.cssText = 'display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;justify-content:center;';

  if (d.canRequest) {
    const reqBtn = document.createElement('button');
    reqBtn.type = 'button';
    reqBtn.className = 'btn-custom btn-primary';
    reqBtn.textContent = '🔑 طلب الإذن للدخول';
    reqBtn.onclick = () => {
      reqBtn.disabled = true;
      socket.emit('gate:request_access');
    };
    actions.appendChild(reqBtn);
  }

  const exitBtn = document.createElement('button');
  exitBtn.type = 'button';
  exitBtn.className = 'btn-custom btn-secondary';
  exitBtn.textContent = '🚪 خروج';
  exitBtn.onclick = leaveGame;
  actions.appendChild(exitBtn);

  card.appendChild(actions);
  gateEl.appendChild(card);
  document.body.appendChild(gateEl);
}

socket.on('gate:blocked', (d) => {
  playerId = null;
  const adminBtn = document.getElementById('btn-admin-auth');
  if (adminBtn) adminBtn.style.display = 'none';
  myStatus = { muted: false, frozen: false, blinded: false, globalMute: false };
  applyStatus();
  clearSuddenBadge();
  showGate(d);
});

socket.on('gate:approved', (d) => {
  hideGate();
  if (d && d.note) addChatMessage({ system: true, message: `📩 رسالة الأدمن: ${d.note}` });
});

/* ==========================================================================
   🛡️ نظام الأدمن المتقدم للعبة الكلمات السريعة
   (يستخدم نفس الاتصال الرئيسي socket - بدون اتصال ثاني)
   ========================================================================== */
(() => {
  const $ = (id) => document.getElementById(id);

  // ---------- عناصر الواجهة ----------
  const btnAdminAuth = $('btn-admin-auth');
  const adminLoginModal = $('admin-login-modal');
  const adminLoginForm = $('admin-login-form');
  const adminPasswordInput = $('admin-password-input');
  const btnCancelAdminLogin = $('btn-cancel-admin-login');

  const adminPanelModal = $('admin-panel-modal');
  const btnCloseAdminPanel = $('btn-close-admin-panel');
  const adminPlayersContainer = $('admin-players-container');
  const adminPlayersCount = $('admin-players-count');
  const btnRefreshPlayers = $('btn-refresh-players');
  const adminAuditLogs = $('admin-audit-logs');
  const btnClearAuditLogs = $('btn-clear-audit-logs');

  const tickerBanner = $('ticker-banner');
  const tickerText = $('ticker-text');
  const btnCloseTickerView = $('btn-close-ticker-view');
  const broadcastModal = $('broadcast-modal');
  const broadcastMessageText = $('broadcast-message-text');
  const btnCloseBroadcast = $('btn-close-broadcast');

  const admBroadcastInput = $('adm-broadcast-input');
  const admBtnSendBroadcast = $('adm-btn-send-broadcast');
  const admTickerInput = $('adm-ticker-input');
  const admBtnSetTicker = $('adm-btn-set-ticker');
  const admBtnToggleTicker = $('adm-btn-toggle-ticker');
  const admCustomWordInput = $('adm-custom-word-input');
  const admBtnSetCustomWord = $('adm-btn-set-custom-word');

  const admBtnSkipWord = $('adm-btn-skip-word');
  const admBtnDoubleRound = $('adm-btn-double-round');
  const admBtnSuddenDeath = $('adm-btn-sudden-death');
  const admBtnFreezeAll = $('adm-btn-freeze-all');
  const admBtnMuteAll = $('adm-btn-mute-all');
  const admBtnLockRoom = $('adm-btn-lock-room');
  const admBtnResetGame = $('adm-btn-reset-game');
  const admBtnCleanRoom = $('adm-btn-clean-room');

  // زر لوحة الأدمن بيظهره السيرفر بعد ما يتعرف على اللاعب
  if (btnAdminAuth) btnAdminAuth.style.display = 'none';

  // ---------- الحالة المحلية ----------
  let isAdminAuthenticated = false;
  let isOwner = false;
  let vipEntry = false; // الـ VIP بيدخل لوحة الأدمن بدون كلمة سر
  let activePlayersList = [];
  let roomStateLocal = {};
  let sanctions = { bans: [], kicks: [], at: Date.now() };
  let allowedList = [];
  let stealthMode = 0;
  let tickerState = { text: '', visible: false, speed: 40 };

  // ---------- إضافة عناصر الواجهة الجديدة (بدون تعديل index.html) ----------
  const globalGrid = adminPanelModal ? adminPanelModal.querySelector('.global-actions-grid') : null;
  if (globalGrid) {
    globalGrid.insertAdjacentHTML('beforeend', `
      <button id="adm-btn-stealth" class="btn-action">
        <span class="btn-icon">👻</span>
        <span class="btn-label">الاختفاء: ظاهر كأدمن</span>
        <span class="tooltip-icon" title="يبدّل بين: ظاهر كأدمن، مخفي الشارة (تظهر كلاعب عادي)، اختفاء كامل (لا أحد يلاحظ وجودك)">❓</span>
      </button>`);
  }
  const admBtnStealth = $('adm-btn-stealth');

  const controlsForm = adminPanelModal ? adminPanelModal.querySelector('.global-controls-form') : null;
  if (controlsForm) {
    controlsForm.insertAdjacentHTML('beforeend', `
      <div class="control-card-row">
        <div class="control-label-wrap">
          <label>⏩ سرعة الشريط الإخباري</label>
          <span class="tooltip-icon" title="تحكم بسرعة حركة الكلام داخل الشريط (الرقم الأكبر = أسرع)">❓</span>
        </div>
        <div class="input-with-btn">
          <input type="range" id="adm-ticker-speed" min="10" max="200" step="5" value="40" style="flex:1">
          <span id="adm-ticker-speed-val" class="players-count-tag">40</span>
        </div>
      </div>
      <div class="control-card-row">
        <div class="control-label-wrap">
          <label>⭐ النقاط التي ياخذها اللاعب عند الإجابة</label>
          <span class="tooltip-icon" title="عدد النقاط لكل إجابة صحيحة">❓</span>
        </div>
        <input type="number" id="adm-points-per-answer" class="custom-input" min="1" value="1">
      </div>
      <div class="control-card-row">
        <div class="control-label-wrap">
          <label>👥 كم لاعب ياخذ نقاط على نفس الكلمة</label>
          <span class="tooltip-icon" title="1 = أول لاعب يجاوب فقط ياخذ النقاط، حتى لو جاوب غيره صح. 0 = كل من يجاوب صح ياخذ نقاط">❓</span>
        </div>
        <input type="number" id="adm-max-scorers" class="custom-input" min="0" value="1">
      </div>
      <div class="control-card-row">
        <div class="control-label-wrap">
          <label>🏆 النقاط المطلوبة للفوز</label>
          <span class="tooltip-icon" title="أول لاعب يوصل لهذا العدد من النقاط يفوز باللعبة">❓</span>
        </div>
        <div class="input-with-btn">
          <input type="number" id="adm-winning-score" class="custom-input" min="1" value="1000">
          <button id="adm-btn-save-settings" class="btn-custom btn-primary">حفظ الإعدادات</button>
        </div>
      </div>`);
  }
  const admTickerSpeed = $('adm-ticker-speed');
  const admTickerSpeedVal = $('adm-ticker-speed-val');
  const admPointsPerAnswer = $('adm-points-per-answer');
  const admMaxScorers = $('adm-max-scorers');
  const admWinningScore = $('adm-winning-score');
  const admBtnSaveSettings = $('adm-btn-save-settings');

  const auditSection = adminAuditLogs ? adminAuditLogs.closest('.admin-section') : null;
  if (auditSection) {
    auditSection.insertAdjacentHTML('beforebegin', `
      <section class="admin-section">
        <div class="section-header">
          <div class="section-title">
            <span class="sec-icon">🚫</span>
            <h3>المطرودون والمحظورون</h3>
          </div>
        </div>
        <p class="section-hint">تقدر تفك الطرد أو الحظر في أي وقت حتى لو في مؤقت (الليد الأخضر = مفعّل، اضغط ليصير أحمر ويتلغى):</p>
        <div id="admin-sanctions-list"></div>
      </section>
      <section class="admin-section" id="owner-only-section" style="display:none">
        <div class="section-header">
          <div class="section-title">
            <span class="sec-icon">👑</span>
            <h3>صلاحيات الأدمن الأساسي</h3>
          </div>
        </div>
        <p class="section-hint" id="owner-ip-line"></p>
        <p class="section-hint">اللاعبون المسموح لهم بدخول لوحة الأدمن وأنت غير متواجد (تضيفهم من بطاقة اللاعب بزر "سماح بدخول اللوحة عند غيابي"):</p>
        <div id="admin-allowed-list"></div>
      </section>`);
  }
  const sanctionsListEl = $('admin-sanctions-list');
  const ownerSection = $('owner-only-section');
  const allowedListEl = $('admin-allowed-list');
  const ownerIpLine = $('owner-ip-line');

  // ---------- ⚡ قسم تأثير الرعد (للأدمن الأساسي فقط) ----------
  if (ownerSection) {
    ownerSection.insertAdjacentHTML('afterend', `
      <section class="admin-section" id="thunder-section" style="display:none">
        <div class="section-header">
          <div class="section-title">
            <span class="sec-icon">⚡</span>
            <h3>تأثير الرعد (اسم REDO)</h3>
          </div>
        </div>
        <p class="section-hint">لما تكتب اسمك REDO بيظهر اسمك بتأثير الرعد البنفسجي بالمتصدرين والشات، وبيجي رعد كل فترة مع صوت. من هون بتتحكم فيه (الأخضر = مفعّل). ولإخفاء الرعد عن لاعب معين استخدم زر "إخفاء الرعد عنه" في بطاقته:</p>
        <div class="global-actions-grid">
          <button id="adm-thunder-screen" class="btn-action">
            <span class="btn-icon">🌩️</span>
            <span class="btn-label">الرعد على شاشات اللاعبين</span>
            <span class="tooltip-icon" title="لما يكون مفعّل بيجي برق بشاشات كل اللاعبين (ما عدا اللي أخفيته عنهم). لما تطفيه بيضل التأثير على اسمك بس">❓</span>
          </button>
          <button id="adm-thunder-sound" class="btn-action">
            <span class="btn-icon">🔊</span>
            <span class="btn-label">صوت الرعد</span>
            <span class="tooltip-icon" title="تشغيل أو إلغاء صوت الرعد عند اللاعبين (وعندك)">❓</span>
          </button>
          <button id="adm-thunder-now" class="btn-action highlight">
            <span class="btn-icon">⚡</span>
            <span class="btn-label">رعد الآن</span>
            <span class="tooltip-icon" title="ضربة رعد فورية للتجربة أو للمفاجأة">❓</span>
          </button>
        </div>
        <div class="control-card-row" style="margin-top:12px">
          <div class="control-label-wrap">
            <label>⏱️ الرعد كل كم ثانية تقريباً (10 - 600)</label>
          </div>
          <div class="input-with-btn">
            <input type="number" id="adm-thunder-interval" class="custom-input" min="10" max="600" value="30">
            <button id="adm-thunder-save" class="btn-custom btn-primary">حفظ</button>
          </div>
        </div>
      </section>`);
  }
  // ---------- 🤖 قسم ايرين (للأدمن الأساسي فقط) ----------
  if (thunderSectionEl0()) {
    thunderSectionEl0().insertAdjacentHTML('afterend', `
      <section class="admin-section" id="erin-section" style="display:none">
        <div class="section-header">
          <div class="section-title">
            <span class="sec-icon">🤖</span>
            <h3>ايرين (الذكاء الاصطناعي)</h3>
          </div>
        </div>
        <p class="section-hint">لما أي لاعب يكتب «ايرين» بالشات بتجاوبه وبتبحث بالإنترنت وبتتذكّر اللي حكيتوه. الأخضر = مفعّلة. «مسح الذاكرة» بيحذف كل اللي حكيتوه وخزّنته نهائياً.</p>
        <div id="erin-status" class="section-hint"></div>
        <div class="global-actions-grid">
          <button id="adm-erin-toggle" class="btn-action">
            <span class="btn-icon">🤖</span>
            <span class="btn-label">تفعيل ايرين</span>
          </button>
          <button id="adm-erin-clear" class="btn-action highlight">
            <span class="btn-icon">🗑️</span>
            <span class="btn-label">مسح كل الذاكرة</span>
          </button>
        </div>
        <div id="erin-notes" style="margin-top:10px;max-height:150px;overflow:auto;font-size:.82rem;line-height:1.6"></div>
      </section>`);
  }
  function thunderSectionEl0() { return document.getElementById('thunder-section'); }
  const erinSection = $('erin-section');
  const admErinToggle = $('adm-erin-toggle');
  const admErinClear = $('adm-erin-clear');
  const erinStatusEl = $('erin-status');
  const erinNotesEl = $('erin-notes');
  let erinState = null;
  function renderErin(s) {
    if (!s) return;
    erinState = Object.assign(erinState || {}, s);
    const e = erinState;
    setLed(admErinToggle, e.enabled);
    if (erinStatusEl) {
      erinStatusEl.textContent = (e.hasKey ? '' : '⚠️ ما في مفتاح ANTHROPIC_API_KEY على السيرفر، ايرين ما رح تشتغل لحد ما تضيفه. · ') +
        `الذاكرة: ${e.notes} ملاحظة · ${e.hist} رسالة محادثة · أسئلة اليوم: ${e.today}/${e.limit}` + (e.lastError ? ` · آخر خطأ: ${e.lastError}` : '');
    }
    if (erinNotesEl && Array.isArray(e.list)) {
      erinNotesEl.innerHTML = e.list.length ? e.list.slice().reverse().map(n => `<div>• ${n.w ? '<b>' + escapeHtml(n.w) + '</b>: ' : ''}${escapeHtml(n.t)}</div>`).join('') : '<div style="opacity:.6">الذاكرة فاضية</div>';
    }
  }
  function loadErin() { socket.emit('admin:erin:get', (r) => { if (r && r.ok) renderErin(r.s); }); }
  if (admErinToggle) admErinToggle.addEventListener('click', () => {
    socket.emit('admin:erin:toggle', { enabled: !(erinState && erinState.enabled) }, (r) => { if (r && r.ok) renderErin(r.s); });
  });
  if (admErinClear) admErinClear.addEventListener('click', () => {
    if (!confirm('تمسح كل اللي حكيته مع ايرين وكل المعلومات اللي خزّنتها؟ ما بتنرجع.')) return;
    socket.emit('admin:erin:clear', (r) => { if (r && r.ok) { erinState = Object.assign(erinState || {}, { list: [] }); renderErin(r.s); } });
  });
  socket.on('admin:erin:state', (s) => { if (isOwner) { renderErin(s); if (s && s.list === undefined) loadErin(); } });

  const thunderSection = $('thunder-section');
  const admThunderScreen = $('adm-thunder-screen');
  const admThunderSound = $('adm-thunder-sound');
  const admThunderNow = $('adm-thunder-now');
  const admThunderInterval = $('adm-thunder-interval');
  const admThunderSave = $('adm-thunder-save');
  let thunderState = { screen: true, sound: true, interval: 30 };

  // ---------- أدوات مساعدة ----------
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function nameOf(id) {
    const p = activePlayersList.find(x => x.id === id);
    return p ? (p.rawName || p.name) : 'لاعب';
  }

  function logAudit(message, type = 'info') {
    if (!adminAuditLogs) return;
    const time = new Date().toLocaleTimeString('ar-EG', { hour12: false });
    const item = document.createElement('div');
    item.className = `log-item ${type}`;
    item.textContent = `[${time}] ${message}`;
    adminAuditLogs.appendChild(item);
    adminAuditLogs.scrollTop = adminAuditLogs.scrollHeight;
  }

  // ليد أخضر = مفعّل، أحمر = مطفي
  function setLed(btn, on) {
    if (!btn) return;
    btn.classList.toggle('led-on', !!on);
    btn.classList.toggle('led-off', !on);
  }

  // كل الليدات حمراء من أول ما تفتح اللعبة
  [admBtnDoubleRound, admBtnSuddenDeath, admBtnFreezeAll, admBtnMuteAll, admBtnLockRoom, admBtnStealth]
    .forEach(b => setLed(b, false));

  function emitAdminAction(eventName, data = {}) {
    if (isAdminAuthenticated) socket.emit(`admin:${eventName}`, data);
  }

  // ---------- شرح الأزرار عند الضغط على علامة الاستفهام ----------
  (() => {
    if (!adminPanelModal) return;
    let bubble = null;
    let hideTimer = null;

    function hide() {
      if (bubble) { bubble.remove(); bubble = null; }
      clearTimeout(hideTimer);
    }

    function findIcon(e) {
      const direct = e.target.closest && e.target.closest('.tooltip-icon');
      if (direct) return direct;
      const btn = e.target.closest && e.target.closest('button');
      if (btn && (e.clientX || e.clientY)) {
        const icons = btn.querySelectorAll('.tooltip-icon');
        for (const ic of icons) {
          const r = ic.getBoundingClientRect();
          if (e.clientX >= r.left - 6 && e.clientX <= r.right + 6 && e.clientY >= r.top - 6 && e.clientY <= r.bottom + 6) return ic;
        }
      }
      return null;
    }

    adminPanelModal.addEventListener('click', (e) => {
      const icon = findIcon(e);
      if (!icon) { hide(); return; }
      // نمنع الضغطة من تشغيل الزر نفسه
      e.preventDefault();
      e.stopPropagation();

      const text = icon.getAttribute('title') || icon.dataset.tip || '';
      const same = bubble && bubble.dataset.for === (icon.dataset.tipId || '');
      hide();
      if (same || !text) return;

      if (!icon.dataset.tipId) icon.dataset.tipId = 't' + Math.random().toString(36).slice(2);
      bubble = document.createElement('div');
      bubble.className = 'tip-bubble';
      bubble.dataset.for = icon.dataset.tipId;
      bubble.textContent = text;
      document.body.appendChild(bubble);

      const r = icon.getBoundingClientRect();
      const bw = bubble.offsetWidth;
      let left = r.left + r.width / 2 - bw / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - bw - 8));
      let top = r.bottom + 8;
      if (top + bubble.offsetHeight > window.innerHeight - 8) top = Math.max(8, r.top - bubble.offsetHeight - 8);
      bubble.style.left = left + 'px';
      bubble.style.top = top + 'px';
      hideTimer = setTimeout(hide, 6000);
    }, true);
  })();

  // ---------- تسجيل الدخول وفتح/إغلاق اللوحة ----------
  function updateOwnerUI() {
    if (ownerSection) ownerSection.style.display = isOwner ? '' : 'none';
    // سجل المراقبة وزر الاختفاء للأدمن الأساسي فقط
    if (auditSection) auditSection.style.display = isOwner ? '' : 'none';
    if (admBtnStealth) admBtnStealth.style.display = isOwner ? '' : 'none';
    if (thunderSection) thunderSection.style.display = isOwner ? '' : 'none';
    if (erinSection) { erinSection.style.display = isOwner ? '' : 'none'; if (isOwner) loadErin(); }
    renderAllowed();
  }

  function onAdminGranted(owner) {
    isAdminAuthenticated = true;
    isOwner = !!owner;
    updateOwnerUI();
    renderPlayerCards(activePlayersList);
  }

  // نتيجة محاولة الدخول للوحة (بكلمة سر أو بدونها للـ VIP)
  function handleAuthResponse(response) {
    if (response && response.success && response.pending) {
      closeAdminLoginModal();
      alert('✅ كلمة المرور صحيحة. تم إرسال طلبك إلى الأدمن الأساسي، انتظر موافقته.');
    } else if (response && response.success) {
      onAdminGranted(!!response.isOwner);
      closeAdminLoginModal();
      openAdminPanel();
      logAudit('تم تسجيل الدخول كأدمن بنجاح.', 'info');
    } else if (response && response.reason === 'owner_absent') {
      alert('⛔ الأدمن الأساسي غير متواجد حالياً ولم يسمح لك بدخول اللوحة وهو غائب.');
    } else if (response && response.reason === 'not_allowed') {
      alert('⛔ ما عندك صلاحية لفتح لوحة الأدمن.');
    } else {
      alert('كلمة المرور غير صحيحة!');
      logAudit('محاولة فاشلة لتسجيل دخول الأدمن.', 'danger');
    }
  }

  if (btnAdminAuth) {
    btnAdminAuth.addEventListener('click', () => {
      if (isAdminAuthenticated) {
        openAdminPanel();
      } else if (vipEntry) {
        // VIP: بدون كلمة سر. لو السيرفر رفض (مثلاً انسحبت منه الـ VIP) نفتح نافذة كلمة السر
        socket.emit('admin:authenticate', {}, (response) => {
          if (response && (response.success || response.reason === 'owner_absent')) handleAuthResponse(response);
          else openAdminLoginModal();
        });
      } else {
        openAdminLoginModal();
      }
    });
  }

  function openAdminLoginModal() {
    if (adminLoginModal) adminLoginModal.style.display = 'flex';
    if (adminPasswordInput) {
      adminPasswordInput.value = '';
      adminPasswordInput.focus();
    }
  }

  function closeAdminLoginModal() {
    if (adminLoginModal) adminLoginModal.style.display = 'none';
  }

  if (btnCancelAdminLogin) btnCancelAdminLogin.addEventListener('click', closeAdminLoginModal);

  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const password = adminPasswordInput ? adminPasswordInput.value.trim() : '';
      if (!password) {
        alert('الرجاء إدخال كلمة المرور.');
        return;
      }

      socket.emit('admin:authenticate', { password }, handleAuthResponse);
    });
  }

  function openAdminPanel() {
    if (adminPanelModal) adminPanelModal.style.display = 'flex';
    refreshPlayersData();
  }

  function closeAdminPanel() {
    if (adminPanelModal) adminPanelModal.style.display = 'none';
  }

  if (btnCloseAdminPanel) btnCloseAdminPanel.addEventListener('click', closeAdminPanel);

  // ---------- بطاقات اللاعبين ----------
  function refreshPlayersData() {
    if (isAdminAuthenticated) socket.emit('admin:get_players');
  }

  if (btnRefreshPlayers) {
    btnRefreshPlayers.addEventListener('click', () => {
      refreshPlayersData();
      logAudit('تم تحديث قائمة اللاعبين.', 'info');
    });
  }

  // حفظ واسترجاع ما كتبه الأدمن في الحقول حتى لا يضيع عند تحديث القائمة
  function snapshotInputs(root) {
    const data = {};
    root.querySelectorAll('input').forEach(i => {
      if (i.id) data[i.id] = i.type === 'checkbox' ? i.checked : i.value;
    });
    const ae = document.activeElement;
    let focus = null;
    if (ae && ae.id && root.contains(ae)) {
      let start = null, end = null;
      try { start = ae.selectionStart; end = ae.selectionEnd; } catch (e) {}
      focus = { id: ae.id, start, end };
    }
    return { data, focus };
  }

  function restoreInputs(root, snap) {
    Object.keys(snap.data).forEach(id => {
      const el = root.querySelector('#' + CSS.escape(id));
      if (!el) return;
      if (el.type === 'checkbox') el.checked = snap.data[id];
      else el.value = snap.data[id];
    });
    if (snap.focus) {
      const el = root.querySelector('#' + CSS.escape(snap.focus.id));
      if (el) {
        el.focus();
        try { if (snap.focus.start !== null) el.setSelectionRange(snap.focus.start, snap.focus.end); } catch (e) {}
      }
    }
  }

  const ledClass = (on) => (on ? 'led-on' : 'led-off');

  function renderPlayerCards(players) {
    activePlayersList = players || [];
    if (!adminPlayersContainer) return;

    const snap = snapshotInputs(adminPlayersContainer);
    adminPlayersContainer.innerHTML = '';
    if (adminPlayersCount) adminPlayersCount.textContent = `اللاعبين: ${activePlayersList.length}`;

    const visible = activePlayersList.filter(p => p.id !== playerId && !p.isOwner && (isOwner || !p.isAdmin));

    if (visible.length === 0) {
      adminPlayersContainer.innerHTML = '<div style="color: var(--admin-text-muted); text-align: center; grid-column: 1/-1; padding: 20px;">لا يوجد لاعبون آخرون متصلون بالروم حالياً.</div>';
      return;
    }

    visible.forEach((player) => {
      const id = player.id;
      const card = document.createElement('div');
      card.className = 'player-admin-card';
      card.id = `player-card-${id}`;

      let ownerExtras = '';
      if (isOwner) {
        ownerExtras += `
          <button class="btn-action ${ledClass(player.allowedAbsent)}" data-act="allow" data-id="${id}">
            <span>✅ سماح بدخول اللوحة عند غيابي</span>
            <span class="tooltip-icon" title="يسمح لهذا اللاعب بدخول لوحة الأدمن (بكلمة المرور) حتى لو أنت غير موجود. بدون هذا السماح ما حدا بدخل اللوحة وأنت غايب. اضغط مرة ثانية للإلغاء">❓</span>
          </button>`;
        ownerExtras += `
          <button class="btn-action ${ledClass(player.thunderHidden)}" data-act="nothunder" data-id="${id}">
            <span>⚡ إخفاء الرعد عنه</span>
            <span class="tooltip-icon" title="لما يكون مفعّل (أخضر) ما بيظهر الرعد ولا صوته عند هذا اللاعب. اضغط مرة ثانية ليرجع يشوفه">❓</span>
          </button>`;
        ownerExtras += `
          <button class="btn-action" data-act="prog" data-id="${id}">
            <span>📊 التقدم والسلسلة</span>
            <span class="tooltip-icon" title="للأدمن الأساسي فقط: إضافة سلسلة أيام، وتعديل المستوى والعملات وإحصائيات اللاعب ومنحه شارات وأغراض">❓</span>
          </button>`;
        if (player.isAdmin) {
          ownerExtras += `
          <button class="btn-action danger" data-act="revoke" data-id="${id}">
            <span>🛡️ إزالة الأدمن</span>
            <span class="tooltip-icon" title="سحب صلاحية الأدمن من هذا اللاعب وإخراجه من اللوحة. لازم يكتب كلمة المرور ويوافق عليه الأدمن الأساسي كل مرة">❓</span>
          </button>`;
        }
      }

      card.innerHTML = `
        <div class="player-card-header">
          <div class="player-info">
            <span class="player-avatar">👤</span>
            <span class="player-card-name">${escapeHtml(player.rawName || player.name)}</span>
            ${player.isAdmin ? '<span class="vip-badge">ادمن ثانوي</span>' : ''}
            ${player.isVip ? '<span class="vip-badge">VIP</span>' : ''}
          </div>
          <span class="player-card-score">${player.score} pt</span>
        </div>

        <div class="player-custom-controls">
          <div class="input-inline-group">
            <label>⏱️ مدة العقوبة/المؤقت (بالدقائق، فاضي = حتى تلغيها أنت):</label>
            <input type="number" class="custom-input input-sm player-timer-input" id="timer-${id}" placeholder="مثال: 10" min="1" value="">
          </div>

          <div class="input-inline-group checkbox-group">
            <label>
              <input type="checkbox" class="player-auto-reentry-check" id="auto-entry-${id}" checked>
              السماح بالدخول التلقائي بعد انتهاء المدة
            </label>
          </div>

          <div class="input-inline-group">
            <label>📝 سبب الطرد/الحظر (اختياري):</label>
            <input type="text" class="custom-input input-sm" id="reason-${id}" placeholder="اكتب السبب..." maxlength="200">
          </div>
        </div>

        <div class="player-actions-grid">
          <button class="btn-action danger" data-act="ban" data-id="${id}">
            <span>❌ باند IP</span>
            <span class="tooltip-icon" title="حظر اللاعب وتطبيق مؤقت الحظر بدقة. تقدر تفكه من قائمة المطرودين والمحظورين">❓</span>
          </button>
          <button class="btn-action warning" data-act="kick" data-id="${id}">
            <span>⏳ طرد</span>
            <span class="tooltip-icon" title="إخراج اللاعب فوراً مع رسالة بالسبب، وبقدر يطلب إذن بالدخول منك. يبقى مطرود حتى تفك الطرد">❓</span>
          </button>
          <button class="btn-action ${ledClass(player.muted)}" data-act="mute" data-id="${id}">
            <span>${player.muted ? '🔊 فك الكتم' : '🔇 كتم'}</span>
            <span class="tooltip-icon" title="منع/سماح بالتحدث في الشات للمدة المحددة. اضغط مرة ثانية لإلغائه في أي وقت">❓</span>
          </button>
          <button class="btn-action ${ledClass(player.frozen)}" data-act="freeze" data-id="${id}">
            <span>${player.frozen ? '🔥 فك التجميد' : '🧊 تجميد'}</span>
            <span class="tooltip-icon" title="منع اللاعب من إدخال الإجابات ومن الكتابة. اضغط مرة ثانية لإلغائه في أي وقت">❓</span>
          </button>
          <button class="btn-action ${ledClass(player.blinded)}" data-act="blind" data-id="${id}">
            <span>👁️ عمياء</span>
            <span class="tooltip-icon" title="تعتيم شاشة اللاعب بالكامل. اضغط مرة ثانية لإلغائه في أي وقت">❓</span>
          </button>
          ${isOwner ? `<button class="btn-action ${ledClass(player.isVip)}" data-act="vip" data-id="${id}">
            <span>👑 VIP</span>
            <span class="tooltip-icon" title="يخلي اللاعب يدخل لوحة الأدمن بدون كلمة سر كأدمن ثانوي (الغير VIP لازم كلمة السر وموافقتك). اضغط مرة ثانية للإلغاء">❓</span>
          </button>` : ''}
          ${ownerExtras}
        </div>

        <div class="player-custom-controls">
          <div class="input-inline-group">
            <label>✏️ تغيير الاسم:</label>
            <div class="input-with-btn">
              <input type="text" class="custom-input input-sm" id="rename-input-${id}" placeholder="الاسم الجديد" maxlength="20">
              <button class="btn-custom btn-primary btn-sm" data-act="rename" data-id="${id}">حفظ</button>
            </div>
          </div>

          <div class="input-inline-group">
            <label>💎 تعديل النقاط:</label>
            <div class="input-with-btn">
              <input type="number" class="custom-input input-sm" id="score-input-${id}" placeholder="±50">
              <button class="btn-custom btn-primary btn-sm" data-act="score" data-id="${id}">تطبيق</button>
            </div>
          </div>

          <div class="input-inline-group checkbox-group">
            <label>
              <input type="checkbox" id="announce-${id}" checked>
              إظهار رسالة بالشات عن تغيير النقاط
            </label>
          </div>

          <div class="input-inline-group">
            <label>💬 همس خاص للاعب:</label>
            <div class="input-with-btn">
              <input type="text" class="custom-input input-sm" id="whisper-input-${id}" placeholder="رسالة سرية..." maxlength="500">
              <button class="btn-custom btn-secondary btn-sm" data-act="whisper" data-id="${id}">إرسال</button>
            </div>
          </div>
        </div>
      `;

      adminPlayersContainer.appendChild(card);
    });

    restoreInputs(adminPlayersContainer, snap);
  }

  const getVal = (id) => { const el = $(id); return el ? el.value : ''; };
  const getTimer = (pid) => parseInt(getVal(`timer-${pid}`)) || 0;
  const getAuto = (pid) => { const c = $(`auto-entry-${pid}`); return c ? c.checked : true; };
  const durText = (m) => (m > 0 ? `${m} دقيقة` : 'حتى تلغيها');

  if (adminPlayersContainer) {
    adminPlayersContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const pid = btn.dataset.id;
      const act = btn.dataset.act;
      const name = nameOf(pid);
      const p = activePlayersList.find(x => x.id === pid) || {};

      switch (act) {
        case 'ban': {
          const durationMinutes = getTimer(pid);
          emitAdminAction('player:ban', { playerId: pid, durationMinutes, autoReentry: getAuto(pid), reason: getVal(`reason-${pid}`).trim() });
          logAudit(`تم حظر (${name}) لمدة: ${durText(durationMinutes)}.`, 'danger');
          break;
        }
        case 'kick': {
          const durationMinutes = getTimer(pid);
          emitAdminAction('player:kick', { playerId: pid, durationMinutes, autoReentry: getAuto(pid), reason: getVal(`reason-${pid}`).trim() });
          logAudit(`تم طرد (${name}) [المدة: ${durText(durationMinutes)}].`, 'warning');
          break;
        }
        case 'mute':
        case 'freeze':
        case 'blind': {
          const key = act === 'mute' ? 'muted' : act === 'freeze' ? 'frozen' : 'blinded';
          const labels = { mute: 'الكتم', freeze: 'التجميد', blind: 'الشاشة العمياء' };
          const turningOn = !p[key];
          const durationMinutes = getTimer(pid);
          emitAdminAction('player:set_flag', { playerId: pid, key, durationMinutes });
          setLed(btn, turningOn);
          logAudit(turningOn
            ? `تفعيل ${labels[act]} على (${name}) لمدة: ${durText(durationMinutes)}.`
            : `إلغاء ${labels[act]} عن (${name}).`, 'warning');
          break;
        }
        case 'vip':
          emitAdminAction('player:set_flag', { playerId: pid, key: 'isVip' });
          setLed(btn, !p.isVip);
          logAudit(p.isVip ? `سحب VIP من (${name}).` : `منح VIP لـ (${name}).`, 'info');
          break;
        case 'allow':
          emitAdminAction('owner:allow_entry', { playerId: pid, allow: !p.allowedAbsent });
          setLed(btn, !p.allowedAbsent);
          logAudit(p.allowedAbsent ? `إلغاء سماح دخول اللوحة عند غيابك لـ (${name}).` : `السماح لـ (${name}) بدخول اللوحة عند غيابك.`, 'info');
          break;
        case 'nothunder':
          emitAdminAction('thunder:hide_for', { playerId: pid, hide: !p.thunderHidden });
          setLed(btn, !p.thunderHidden);
          logAudit(p.thunderHidden ? `إرجاع الرعد للاعب (${name}).` : `إخفاء الرعد عن (${name}).`, 'info');
          break;
        case 'prog':
          if (window.__openProgEditor) window.__openProgEditor(pid, name);
          break;
        case 'revoke':
          emitAdminAction('revoke_admin', { playerId: pid });
          logAudit(`إزالة صلاحية الأدمن عن (${name}).`, 'warning');
          break;
        case 'rename': {
          const input = $(`rename-input-${pid}`);
          const newName = input ? input.value.trim() : '';
          if (newName) {
            emitAdminAction('player:rename', { playerId: pid, newName });
            logAudit(`تغيير اسم اللاعب (${name}) إلى: ${newName}`, 'info');
            input.value = '';
          }
          break;
        }
        case 'score': {
          const input = $(`score-input-${pid}`);
          const points = input ? parseInt(input.value) : 0;
          if (!isNaN(points) && points !== 0) {
            const announce = !!($(`announce-${pid}`) && $(`announce-${pid}`).checked);
            emitAdminAction('player:adjust_score', { playerId: pid, points, announce });
            logAudit(`تعديل نقاط (${name}) بمقدار (${points}) ${announce ? 'مع رسالة بالشات' : 'بدون رسالة'}.`, 'info');
            input.value = '';
          }
          break;
        }
        case 'whisper': {
          const input = $(`whisper-input-${pid}`);
          const message = input ? input.value.trim() : '';
          if (message) {
            emitAdminAction('player:whisper', { playerId: pid, message });
            input.value = '';
          }
          break;
        }
      }
    });
  }

  // ---------- التحكم الجماعي ----------
  function applyRoomState(s) {
    roomStateLocal = s || {};
    setLed(admBtnDoubleRound, roomStateLocal.isDoubleRound);
    setLed(admBtnSuddenDeath, roomStateLocal.isSuddenDeath);
    setLed(admBtnFreezeAll, roomStateLocal.isFrozenAll);
    setLed(admBtnMuteAll, roomStateLocal.isMutedAll);
    setLed(admBtnLockRoom, roomStateLocal.isLocked);

    const fill = (el, v) => { if (el && v !== undefined && document.activeElement !== el) el.value = v; };
    fill(admPointsPerAnswer, roomStateLocal.pointsPerAnswer);
    fill(admMaxScorers, roomStateLocal.maxScorers);
    fill(admWinningScore, roomStateLocal.winningScore);
  }

  if (admBtnSkipWord) {
    admBtnSkipWord.onclick = () => {
      emitAdminAction('room:skip_word');
      logAudit('تم تخطي الكلمة الحالية بنجاح.', 'info');
    };
  }

  if (admBtnDoubleRound) {
    admBtnDoubleRound.onclick = () => {
      emitAdminAction('room:toggle_double_round');
      logAudit('تفعيل/إلغاء الجولة المضاعفة X2.', 'info');
    };
  }

  if (admBtnSuddenDeath) {
    admBtnSuddenDeath.onclick = () => {
      if (roomStateLocal.isSuddenDeath) {
        emitAdminAction('room:trigger_sudden_death', {});
        logAudit('إلغاء الموت المفاجئ.', 'warning');
        return;
      }
      const t = prompt('⏱️ مدة الموت المفاجئ بالثواني:', '30');
      if (t === null) return;
      const r = prompt('✅ عدد الإجابات الصحيحة المطلوبة للفوز:', '1');
      if (r === null) return;
      emitAdminAction('room:trigger_sudden_death', { timer: parseInt(t) || 30, requiredAnswers: parseInt(r) || 1 });
      logAudit('تفعيل وضع الموت المفاجئ!', 'warning');
    };
  }

  if (admBtnFreezeAll) {
    admBtnFreezeAll.onclick = () => {
      emitAdminAction('room:toggle_freeze_all');
      logAudit('تطبيق/إلغاء تجميد كافة اللاعبين.', 'warning');
    };
  }

  if (admBtnMuteAll) {
    admBtnMuteAll.onclick = () => {
      emitAdminAction('room:toggle_mute_all');
      logAudit('قفل/فتح الشات العام للجميع.', 'warning');
    };
  }

  if (admBtnLockRoom) {
    admBtnLockRoom.onclick = () => {
      emitAdminAction('room:toggle_lock');
      logAudit('تغيير حالة قفل الغرفة.', 'warning');
    };
  }

  if (admBtnResetGame) {
    admBtnResetGame.onclick = () => {
      if (confirm('هل أنت تأكد من تصفير نتائج جميع اللاعبين؟')) {
        emitAdminAction('room:reset_scores');
        logAudit('تم تصفير جميع نقاط اللاعبين في الروم.', 'danger');
      }
    };
  }

  if (admBtnCleanRoom) {
    admBtnCleanRoom.onclick = () => {
      if (confirm('تحذير: هل أنت متأكد من طرد كافة اللاعبين المتصلين؟')) {
        emitAdminAction('room:kick_all');
        logAudit('تم تنفيذ طرد جماعي وتفريغ الروم.', 'danger');
      }
    };
  }

  const stealthLabels = ['الاختفاء: ظاهر كأدمن', 'الاختفاء: مخفي الشارة', 'الاختفاء: اختفاء كامل'];
  function renderStealth() {
    if (!admBtnStealth) return;
    const label = admBtnStealth.querySelector('.btn-label');
    if (label) label.textContent = stealthLabels[stealthMode] || stealthLabels[0];
    setLed(admBtnStealth, stealthMode > 0);
  }
  if (admBtnStealth) {
    admBtnStealth.onclick = () => {
      emitAdminAction('set_stealth', { mode: (stealthMode + 1) % 3 });
    };
  }

  if (admBtnSaveSettings) {
    admBtnSaveSettings.onclick = () => {
      emitAdminAction('room:update_settings', {
        pointsPerAnswer: admPointsPerAnswer.value,
        maxScorers: admMaxScorers.value,
        winningScore: admWinningScore.value
      });
      logAudit(`تحديث الإعدادات: ${admPointsPerAnswer.value} نقطة للإجابة، ${admMaxScorers.value} لاعب ياخذ نقاط، الفوز عند ${admWinningScore.value}.`, 'info');
    };
  }

  // ---------- الإعلانات، الشريط الإخباري والكلمات ----------
  // نافذة الإعلان تظهر فوق أي نافذة مفتوحة (مثل لوحة الرسم)
  function showBroadcast(message) {
    if (!broadcastModal) return;
    if (broadcastMessageText) broadcastMessageText.textContent = message;
    broadcastModal.style.display = 'flex';
    topLayerShow(broadcastModal);
    playNotificationSound();
  }

  if (admBtnSendBroadcast) {
    admBtnSendBroadcast.onclick = () => {
      const msg = admBroadcastInput ? admBroadcastInput.value.trim() : '';
      if (msg) {
        emitAdminAction('broadcast:send', { message: msg });
        logAudit(`إرسال إعلان عام: "${msg}"`, 'info');
        admBroadcastInput.value = '';
      }
    };
  }

  if (btnCloseBroadcast) {
    btnCloseBroadcast.onclick = () => {
      if (broadcastModal) {
        topLayerHide(broadcastModal);
        broadcastModal.style.display = 'none';
      }
    };
  }

  if (admBtnSetTicker) {
    admBtnSetTicker.onclick = () => {
      const msg = admTickerInput ? admTickerInput.value.trim() : '';
      if (msg) {
        emitAdminAction('ticker:update', { text: msg, visible: true, speed: tickerState.speed });
        logAudit(`تحديث نص الشريط الإخباري: "${msg}"`, 'info');
        admTickerInput.value = '';
      }
    };
  }

  if (admBtnToggleTicker) {
    admBtnToggleTicker.onclick = () => {
      emitAdminAction('ticker:update', { text: tickerState.text, visible: !tickerState.visible, speed: tickerState.speed });
      logAudit('تبديل حالة إظهار الشريط الإخباري.', 'info');
    };
  }

  let speedTimer = null;
  if (admTickerSpeed) {
    admTickerSpeed.addEventListener('input', () => {
      if (admTickerSpeedVal) admTickerSpeedVal.textContent = admTickerSpeed.value;
      clearTimeout(speedTimer);
      speedTimer = setTimeout(() => {
        emitAdminAction('ticker:update', { text: tickerState.text, visible: tickerState.visible, speed: parseInt(admTickerSpeed.value) });
      }, 300);
    });
  }

  if (btnCloseTickerView) {
    btnCloseTickerView.onclick = () => {
      if (tickerBanner) tickerBanner.style.display = 'none';
    };
  }

  if (admBtnSetCustomWord) {
    admBtnSetCustomWord.onclick = () => {
      const word = admCustomWordInput ? admCustomWordInput.value.trim() : '';
      if (word) {
        emitAdminAction('room:set_custom_word', { word });
        logAudit(`تعيين الكلمة المخصصة للجولة القادمة: "${word}"`, 'info');
        admCustomWordInput.value = '';
      }
    };
  }

  // ---------- الشريط الإخباري: حركة بطيئة بسرعة يتحكم فيها الأدمن ----------
  const tickerContent = tickerBanner ? tickerBanner.querySelector('.ticker-content') : null;
  const tickerWrap = tickerBanner ? tickerBanner.querySelector('.ticker-content-wrapper') : null;
  let tickerAnim = null;

  function restartTicker() {
    if (!tickerContent || !tickerWrap) return;
    if (tickerAnim) { tickerAnim.cancel(); tickerAnim = null; }
    tickerContent.style.animation = 'none';
    if (tickerBanner.style.display === 'none' || !tickerState.text) return;

    const ww = tickerWrap.clientWidth;
    const cw = tickerContent.offsetWidth;
    if (!ww || !cw) return;

    const rtl = getComputedStyle(tickerWrap).direction === 'rtl';
    const from = rtl ? cw : ww;
    const to = rtl ? -ww : -cw;
    const speed = Math.max(5, tickerState.speed || 40); // بكسل بالثانية
    const duration = ((ww + cw) / speed) * 1000;

    tickerAnim = tickerContent.animate(
      [{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }],
      { duration, iterations: Infinity, easing: 'linear' }
    );
  }

  if (tickerContent) {
    tickerContent.addEventListener('mouseenter', () => { if (tickerAnim) tickerAnim.pause(); });
    tickerContent.addEventListener('mouseleave', () => { if (tickerAnim) tickerAnim.play(); });
  }
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(restartTicker, 200);
  });

  // ---------- قوائم المطرودين / المسموح لهم / سجل الهمس ----------
  function renderSanctions() {
    if (!sanctionsListEl) return;
    sanctionsListEl.innerHTML = '';
    const items = [
      ...sanctions.bans.map(b => Object.assign({ type: 'ban' }, b)),
      ...sanctions.kicks.map(k => Object.assign({ type: 'kick' }, k))
    ];
    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'section-hint';
      empty.textContent = 'لا يوجد مطرودون أو محظورون حالياً.';
      sanctionsListEl.appendChild(empty);
      return;
    }
    items.forEach(it => {
      const row = document.createElement('div');
      row.className = 'sanction-row';

      let remain = 'حتى تفكه أنت';
      if (it.remaining !== null && it.remaining !== undefined) {
        const left = Math.max(0, it.remaining - (Date.now() - sanctions.at));
        remain = `متبقي ~${Math.ceil(left / 60000)} دقيقة`;
      }
      const info = document.createElement('div');
      info.className = 'sanction-info';
      info.textContent = `${it.type === 'ban' ? '⛔ محظور' : '🚫 مطرود'}: ${it.name} — ${remain}` +
        (it.reason ? ` — السبب: ${it.reason}` : '') +
        (it.requestDenied ? ' — (رُفض طلبه)' : '');

      const btn = document.createElement('button');
      btn.className = 'btn-action led-on';
      btn.innerHTML = `<span>${it.type === 'ban' ? '🔓 فك الحظر' : '🔓 فك الطرد'}</span>`;
      btn.onclick = () => {
        setLed(btn, false);
        emitAdminAction('sanction:lift', { type: it.type, id: it.id });
        logAudit(`${it.type === 'ban' ? 'فك الحظر' : 'فك الطرد'} عن (${it.name}).`, 'info');
      };

      row.appendChild(info);
      row.appendChild(btn);
      sanctionsListEl.appendChild(row);
    });
  }
  setInterval(renderSanctions, 20000);

  function renderAllowed() {
    if (!allowedListEl) return;
    allowedListEl.innerHTML = '';
    if (!isOwner) return;
    if (allowedList.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'section-hint';
      empty.textContent = 'لا يوجد لاعبون مسموح لهم حالياً.';
      allowedListEl.appendChild(empty);
      return;
    }
    allowedList.forEach(a => {
      const row = document.createElement('div');
      row.className = 'sanction-row';
      const info = document.createElement('div');
      info.className = 'sanction-info';
      info.textContent = `✅ ${a.name}`;
      const btn = document.createElement('button');
      btn.className = 'btn-action led-on';
      btn.innerHTML = '<span>إزالة السماح</span>';
      btn.onclick = () => {
        setLed(btn, false);
        emitAdminAction('owner:remove_allowed', { key: a.key });
      };
      row.appendChild(info);
      row.appendChild(btn);
      allowedListEl.appendChild(row);
    });
  }

  // ---------- ⚡ أزرار الرعد ----------
  function renderThunder() {
    setLed(admThunderScreen, thunderState.screen);
    setLed(admThunderSound, thunderState.sound);
    if (admThunderInterval && document.activeElement !== admThunderInterval) admThunderInterval.value = thunderState.interval;
  }
  renderThunder();

  if (admThunderScreen) {
    admThunderScreen.onclick = () => {
      thunderState.screen = !thunderState.screen;
      renderThunder();
      emitAdminAction('thunder:update', { screen: thunderState.screen });
      logAudit(thunderState.screen ? 'تفعيل الرعد على شاشات اللاعبين.' : 'إيقاف الرعد على شاشات اللاعبين.', 'info');
    };
  }
  if (admThunderSound) {
    admThunderSound.onclick = () => {
      thunderState.sound = !thunderState.sound;
      renderThunder();
      emitAdminAction('thunder:update', { sound: thunderState.sound });
      logAudit(thunderState.sound ? 'تشغيل صوت الرعد.' : 'إلغاء صوت الرعد.', 'info');
    };
  }
  if (admThunderNow) {
    admThunderNow.onclick = () => emitAdminAction('thunder:strike');
  }
  if (admThunderSave) {
    admThunderSave.onclick = () => {
      const iv = parseInt(admThunderInterval ? admThunderInterval.value : '');
      if (iv >= 10) {
        emitAdminAction('thunder:update', { interval: iv });
        logAudit(`الرعد كل ~${iv} ثانية.`, 'info');
      }
    };
  }
  socket.on('admin:thunder_state', (d) => {
    if (!d) return;
    thunderState = { screen: !!d.screen, sound: !!d.sound, interval: d.interval || 30 };
    renderThunder();
  });

  if (btnClearAuditLogs) {
    btnClearAuditLogs.onclick = () => {
      if (adminAuditLogs) adminAuditLogs.innerHTML = '';
      whisperRows.clear();
    };
  }

  // سجل الهمس: بيتحدث تلقائياً لو أي لاعب غيّر اسمه
  const whisperRows = new Map();
  function whisperText(e) {
    const t = new Date(e.ts).toLocaleTimeString('ar-EG', { hour12: false });
    return `[${t}] 💬 همس من (${e.from}) إلى (${e.to}): ${e.message}`;
  }
  function upsertWhisperRow(e) {
    if (!adminAuditLogs) return;
    let row = whisperRows.get(e.id);
    if (!row || !row.isConnected) {
      row = document.createElement('div');
      row.className = 'log-item warning';
      adminAuditLogs.appendChild(row);
      whisperRows.set(e.id, row);
      adminAuditLogs.scrollTop = adminAuditLogs.scrollHeight;
    }
    row.textContent = whisperText(e);
  }

  // ---------- طلبات الدخول والموافقات (تظهر للأدمن الأساسي فقط) ----------
  const requestsBox = document.createElement('div');
  requestsBox.id = 'admin-requests-box';
  requestsBox.className = 'admin-requests-box';
  document.body.appendChild(requestsBox);

  function refreshRequestsBox() {
    if (requestsBox.children.length > 0) {
      requestsBox.style.display = 'flex';
      topLayerShow(requestsBox);
    } else {
      topLayerHide(requestsBox);
      requestsBox.style.display = 'none';
    }
  }

  function removeRequestCard(key) {
    [...requestsBox.children].forEach(c => { if (c.dataset.key === key) c.remove(); });
    refreshRequestsBox();
  }

  function addRequestCard(key, title, text, onDecide) {
    removeRequestCard(key);
    const card = document.createElement('div');
    card.className = 'req-card';
    card.dataset.key = key;

    const t = document.createElement('div');
    t.className = 'req-title';
    t.textContent = title;
    const p = document.createElement('div');
    p.className = 'req-text';
    p.textContent = text;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'custom-input input-sm';
    input.placeholder = 'رسالة اختيارية مع القرار...';
    input.maxLength = 200;

    const actions = document.createElement('div');
    actions.className = 'req-actions';
    const accept = document.createElement('button');
    accept.className = 'btn-custom btn-primary btn-sm';
    accept.textContent = '✅ قبول';
    const reject = document.createElement('button');
    reject.className = 'btn-custom btn-secondary btn-sm';
    reject.textContent = '⛔ رفض';
    accept.onclick = () => { onDecide(true, input.value.trim()); removeRequestCard(key); };
    reject.onclick = () => { onDecide(false, input.value.trim()); removeRequestCard(key); };
    actions.appendChild(accept);
    actions.appendChild(reject);

    card.appendChild(t);
    card.appendChild(p);
    card.appendChild(input);
    card.appendChild(actions);
    requestsBox.appendChild(card);
    refreshRequestsBox();
    playNotificationSound();
  }

  function addApprovalCard(r) {
    addRequestCard(`ap:${r.requestId}`, '🔐 طلب دخول للوحة الأدمن',
      `اللاعب (${r.name}) كتب كلمة المرور الصحيحة ويطلب الدخول إلى لوحة الأدمن.`,
      (approve, message) => {
        emitAdminAction('approval_response', { requestId: r.requestId, approve, message });
        logAudit(`${approve ? 'تمت الموافقة على' : 'تم رفض'} دخول (${r.name}) إلى اللوحة.`, approve ? 'info' : 'warning');
      });
  }

  function addEntryCard(r) {
    const text = r.kind === 'kicked'
      ? `اللاعب (${r.name}) المطرود يطلب الإذن للدخول.\nسبب الطرد: ${(r.reason || '').replace(/^السبب:\s*/, '') || 'الأدمن يتحفظ بالسبب'}`
      : `اللاعب (${r.name}) يريد الدخول والغرفة مغلقة.`;
    addRequestCard(`en:${r.requestId}`, '🚪 طلب إذن بالدخول', text, (approve, message) => {
      emitAdminAction('entry_response', { requestId: r.requestId, approve, message });
      logAudit(`${approve ? 'تمت الموافقة على' : 'تم رفض'} طلب دخول (${r.name}).`, approve ? 'info' : 'warning');
    });
  }

  // ---------- استقبال أحداث السيرفر ----------
  // عند أي اتصال جديد نصفّر حالة الأدمن، والسيرفر بيرجّعها إذا كان هو الأدمن الأساسي
  socket.on('connect', () => {
    isAdminAuthenticated = false;
    isOwner = false;
    vipEntry = false;
    if (btnAdminAuth) btnAdminAuth.style.display = 'none';
    updateOwnerUI();
  });

  socket.on('admin:session', (d) => {
    stealthMode = d.stealthMode || 0;
    renderStealth();
    onAdminGranted(!!d.isOwner);
    if (ownerIpLine && d.isOwner && d.ip) {
      ownerIpLine.textContent = `عنوان IP تاعك الحالي: ${d.ip}`;
    }
  });

  // إظهار/إخفاء زر لوحة الأدمن حسب قرار السيرفر
  socket.on('admin:button', (d) => {
    vipEntry = !!(d && d.vip);
    if (btnAdminAuth) btnAdminAuth.style.display = (d && d.visible) ? '' : 'none';
  });

  socket.on('admin:stealth_state', (d) => {
    stealthMode = d.mode || 0;
    renderStealth();
  });

  socket.on('admin:approval_result', (d) => {
    if (d.approved) {
      alert('✅ وافق الأدمن الأساسي على دخولك إلى اللوحة.' + (d.message ? `\nرسالة الأدمن: ${d.message}` : ''));
      openAdminPanel();
    } else {
      alert('⛔ ' + d.message);
    }
  });

  socket.on('admin:revoked', () => {
    isAdminAuthenticated = false;
    isOwner = false;
    updateOwnerUI();
    closeAdminPanel();
    alert('⚠️ قام الأدمن الأساسي بإزالة صلاحية الأدمن عنك.');
  });

  socket.on('admin:players_updated', (players) => {
    activePlayersList = players || [];
    if (isAdminAuthenticated) renderPlayerCards(activePlayersList);
  });

  socket.on('admin:sanctions_updated', (s) => {
    sanctions = { bans: s.bans || [], kicks: s.kicks || [], at: Date.now() };
    renderSanctions();
  });

  socket.on('admin:allowed_updated', (list) => {
    allowedList = list || [];
    renderAllowed();
  });

  socket.on('admin:approval_request', (r) => { if (isOwner) addApprovalCard(r); });
  socket.on('admin:entry_request', (r) => { if (isOwner) addEntryCard(r); });
  socket.on('admin:request_cancelled', (r) => {
    removeRequestCard(`ap:${r.requestId}`);
    removeRequestCard(`en:${r.requestId}`);
  });
  socket.on('admin:pending_requests', (d) => {
    (d.approvals || []).forEach(addApprovalCard);
    (d.entries || []).forEach(addEntryCard);
  });

  socket.on('admin:audit_log', (e) => upsertWhisperRow(e));
  socket.on('admin:audit_sync', (list) => (list || []).forEach(upsertWhisperRow));

  socket.on('roomState:sync', applyRoomState);

  socket.on('broadcast:received', (data) => showBroadcast(data.message));

  socket.on('ticker:updated', (d) => {
    tickerState = { text: d.text || '', visible: !!d.visible, speed: d.speed || tickerState.speed };
    if (tickerText) tickerText.textContent = tickerState.text;
    if (tickerBanner) tickerBanner.style.display = (tickerState.visible && tickerState.text) ? 'flex' : 'none';
    if (admTickerSpeed && document.activeElement !== admTickerSpeed) {
      admTickerSpeed.value = tickerState.speed;
      if (admTickerSpeedVal) admTickerSpeedVal.textContent = tickerState.speed;
    }
    restartTicker();
  });
})();

/* ==========================================================================
   🌟 نظام التقدّم (الواجهة): مستوى جنب الاسم + ألقاب وشارات وتأثيرات + التحدي اليومي + عجلة الحظ + ملفي + المتجر (قريباً)
   كل الأرقام بيحسبها السيرفر، وهون بس عرض وطلبات
   ========================================================================== */
(() => {
  const css = `
  /* ---------- المستوى (أُس) واللقب والشارات جنب الاسم ---------- */
  .t0 { --tc: #9aa4b2; } .t1 { --tc: #5eead4; } .t2 { --tc: #4ade80; } .t3 { --tc: #60a5fa; } .t4 { --tc: #a78bfa; }
  .t5 { --tc: #fbbf24; } .t6 { --tc: #fb923c; } .t7 { --tc: #f472b6; } .t8 { --tc: #f0abfc; } .t9 { --tc: #bae6fd; }
  .lvx {
    display: inline-block; font: 800 .62em/1.35 system-ui, sans-serif; letter-spacing: 0; margin-inline-start: .22em;
    padding: 0 .38em; border-radius: .8em; vertical-align: super; color: var(--tc);
    background: rgba(8, 8, 16, .45); border: 1px solid color-mix(in srgb, var(--tc) 65%, transparent);
    text-shadow: none; box-shadow: 0 0 .5em color-mix(in srgb, var(--tc) 35%, transparent); cursor: default; user-select: none;
  }
  .lvx.t5, .lvx.t6, .lvx.t7 { box-shadow: 0 0 .7em color-mix(in srgb, var(--tc) 55%, transparent); }
  .lvx.t8 { animation: pgHue 5s linear infinite; }
  .lvx.t9 { animation: pgShine 2.6s ease-in-out infinite; }
  .ttl {
    display: inline-block; font: 700 .6em/1.4 inherit; margin-inline-start: .45em; padding: .02em .55em; border-radius: 99px;
    vertical-align: middle; white-space: nowrap; letter-spacing: 0; text-shadow: none; cursor: default; user-select: none;
    color: var(--tc); background: linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.02));
    border: 1px solid color-mix(in srgb, var(--tc) 55%, transparent);
  }
  .bdg { display: inline-block; font-size: .8em; margin-inline-start: .2em; vertical-align: middle; cursor: default; text-shadow: none; filter: drop-shadow(0 0 3px rgba(255,255,255,.3)); }
  @keyframes pgHue { to { filter: hue-rotate(360deg); } }
  @keyframes pgShine { 0%, 100% { box-shadow: 0 0 .5em #7dd3fc88; } 50% { box-shadow: 0 0 1em #e0f2fe; } }

  /* تأثيرات الاسم (بتنفتح بالمستوى) */
  .ng-g_green  { text-shadow: 0 0 5px #22c55e, 0 0 12px #16a34a99; }
  .ng-g_blue   { text-shadow: 0 0 5px #38bdf8, 0 0 12px #2563ebaa; }
  .ng-g_purple { text-shadow: 0 0 5px #c084fc, 0 0 13px #7e22ceaa; }
  .ng-g_gold   { text-shadow: 0 0 4px #fde047, 0 0 12px #f59e0bcc, 0 0 20px #b4530999; }
  .ng-g_fire   { text-shadow: 0 -1px 3px #fff, 0 -3px 7px #fde047, 0 -6px 12px #fb923c, 0 -9px 18px #ef4444; animation: pgFire 1.4s ease-in-out infinite alternate; }
  .ng-g_ice    { text-shadow: 0 0 4px #e0f2fe, 0 0 11px #38bdf8, 0 0 20px #0ea5e9; }
  .ng-g_rainbow, .ng-g_diamond { -webkit-text-fill-color: transparent; color: transparent !important; background-clip: text; -webkit-background-clip: text; background-size: 220% 100%; }
  .ng-g_rainbow { background-image: linear-gradient(90deg, #f43f5e, #f59e0b, #84cc16, #06b6d4, #8b5cf6, #f43f5e); animation: pgSlide 4s linear infinite; }
  .ng-g_diamond { background-image: linear-gradient(110deg, #bae6fd 25%, #fff 45%, #7dd3fc 55%, #bae6fd 75%); animation: pgSlide 2.8s linear infinite; filter: drop-shadow(0 0 4px #7dd3fc); }
  @keyframes pgFire { from { text-shadow: 0 -1px 3px #fff, 0 -3px 6px #fde047, 0 -5px 11px #fb923c, 0 -8px 16px #ef4444; } to { text-shadow: 0 -2px 4px #fff, 0 -4px 8px #fde047, 0 -8px 14px #fb923c, 0 -12px 22px #ef4444; } }
  @keyframes pgSlide { to { background-position: -220% 0; } }

  /* ---------- أزرار القائمة ---------- */
  #btn-daily, #btn-pass, #btn-profile, #btn-store { position: relative; }
  .pg-dot { position: absolute; top: 2px; inset-inline-end: 6px; width: 12px; height: 12px; border-radius: 50%; background: #ef4444; border: 2px solid #fff; box-shadow: 0 0 8px #ef4444; display: none; animation: pgPulse 1.6s ease-in-out infinite; }
  .pg-dot.on { display: block; }
  .pg-lvtag { font-size: .72em; opacity: .85; margin-inline-start: .35em; }
  @keyframes pgPulse { 50% { transform: scale(1.25); } }

  /* ---------- النافذة ---------- */
  #pg-overlay {
    position: fixed; inset: 0; width: 100vw; height: 100vh; max-width: none; max-height: none; margin: 0; padding: 14px; border: 0;
    background: rgba(6, 4, 14, .72); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    display: none; align-items: center; justify-content: center; overflow: hidden; z-index: 10040; color: #f3eefc;
    font-family: inherit; direction: rtl;
  }
  #pg-overlay:popover-open, #pg-overlay.pg-open { display: flex; }
  .pg-card {
    width: min(460px, 100%); max-height: min(92vh, 780px); display: flex; flex-direction: column; border-radius: 22px; overflow: hidden;
    background: linear-gradient(160deg, #1c1433 0%, #120d24 60%, #0d0a1a 100%);
    border: 1px solid rgba(167, 139, 250, .35); box-shadow: 0 20px 60px rgba(0,0,0,.6), 0 0 40px rgba(124, 58, 237, .25);
    animation: pgIn .28s ease-out;
  }
  @keyframes pgIn { from { opacity: 0; transform: translateY(14px) scale(.97); } }
  .pg-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px 4px; }
  .pg-head h3 { margin: 0; font-size: 1.05rem; font-weight: 800; color: #fde68a; }
  .pg-x { background: rgba(255,255,255,.08); border: 0; color: #e9e3ff; width: 32px; height: 32px; border-radius: 50%; font-size: 1.1rem; cursor: pointer; }
  .pg-x:hover { background: rgba(255,255,255,.18); }
  .pg-tabs { display: flex; gap: 6px; padding: 8px 12px 10px; }
  .pg-tab { flex: 1; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.05); color: #cfc6ee; padding: 8px 4px; border-radius: 12px; font: 700 .86rem inherit; cursor: pointer; transition: .2s; position: relative; }
  .pg-tab.on { background: linear-gradient(135deg, #7c3aed, #c026d3); color: #fff; border-color: transparent; box-shadow: 0 4px 16px rgba(168, 85, 247, .45); }
  .pg-body { overflow-y: auto; padding: 4px 14px 16px; scrollbar-width: thin; }
  .pg-sec { margin-top: 14px; }
  .pg-sec > h4 { margin: 0 0 8px; font-size: .9rem; color: #ddd6fe; display: flex; align-items: center; gap: 6px; }
  .pg-sec > h4 small { color: #9d92c4; font-weight: 600; margin-inline-start: auto; font-size: .75rem; }
  .pg-box { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.09); border-radius: 16px; padding: 12px; }

  /* التحدي */
  .pg-ch { display: flex; gap: 12px; align-items: center; }
  .pg-ch-ic { font-size: 2.2rem; width: 58px; height: 58px; flex: none; display: grid; place-items: center; border-radius: 16px; background: linear-gradient(135deg, #4c1d95, #86198f); box-shadow: 0 0 18px rgba(192, 38, 211, .45); }
  .pg-ch-t { font-weight: 800; font-size: 1rem; color: #fff; }
  .pg-ch-d { color: #c4b9e6; font-size: .85rem; margin-top: 2px; }
  .pg-bar { height: 12px; border-radius: 99px; background: rgba(255,255,255,.1); overflow: hidden; margin-top: 12px; position: relative; }
  .pg-bar > i { display: block; height: 100%; width: 0; border-radius: inherit; background: linear-gradient(90deg, #a855f7, #f0abfc); box-shadow: 0 0 12px #c084fc; transition: width .6s cubic-bezier(.2,.8,.2,1); }
  .pg-bar.done > i { background: linear-gradient(90deg, #22c55e, #86efac); box-shadow: 0 0 12px #4ade80; }
  .pg-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 8px; font-size: .82rem; color: #bfb4e3; flex-wrap: wrap; }
  .pg-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 99px; background: rgba(255,255,255,.08); font-weight: 700; color: #fde68a; font-size: .8rem; }
  .pg-time { font-variant-numeric: tabular-nums; color: #f0abfc; font-weight: 700; }
  .pg-ok { color: #86efac; font-weight: 800; }

  /* السلسلة */
  .pg-streak { display: flex; align-items: center; gap: 12px; }
  .pg-flame { font-size: 2.1rem; filter: drop-shadow(0 0 8px #fb923c); }
  .pg-flame.off { filter: grayscale(1) opacity(.5); }
  .pg-sn { font-size: 1.5rem; font-weight: 900; color: #fff; line-height: 1; }
  .pg-sl { font-size: .78rem; color: #bfb4e3; }
  .pg-ms { display: flex; gap: 6px; margin-top: 10px; }
  .pg-m { flex: 1; text-align: center; padding: 6px 2px; border-radius: 12px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.09); font-size: .72rem; color: #a99fcf; }
  .pg-m b { display: block; font-size: .95rem; color: #ddd6fe; }
  .pg-m.got { background: linear-gradient(160deg, rgba(251,146,60,.28), rgba(244,63,94,.18)); border-color: rgba(251,146,60,.6); color: #ffedd5; }
  .pg-m.got b { color: #fff; }

  /* العجلة */
  .pg-wheel-wrap { position: relative; width: min(280px, 78vw); aspect-ratio: 1; margin: 6px auto 4px; }
  .pg-wheel-wrap svg { width: 100%; height: 100%; overflow: visible; display: block; }
  .pg-wheel-rot { transform-origin: 100px 100px; transform-box: view-box; }
  .pg-wheel-rot.spin { transition: transform 5.2s cubic-bezier(.12, .62, .08, 1); }
  .pg-pointer { position: absolute; top: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 13px solid transparent; border-right: 13px solid transparent; border-top: 26px solid #fde047; filter: drop-shadow(0 2px 4px rgba(0,0,0,.7)) drop-shadow(0 0 8px #facc15); z-index: 2; }
  .pg-lights circle { animation: pgBlink 1.2s steps(1) infinite; }
  .pg-lights circle:nth-child(even) { animation-delay: .6s; }
  @keyframes pgBlink { 0% { opacity: 1; } 50% { opacity: .25; } }
  /* ---------- المتجر والمسار: ألوان وتأثيرات وإطارات ---------- */
  .ng-s_shadow  { text-shadow: 0 2px 0 #000, 0 0 8px #000, 0 0 14px rgba(255,255,255,.4); }
  .ng-s_neon    { text-shadow: 0 0 3px #fff, 0 0 9px #22d3ee, 0 0 20px #22d3ee, 0 0 32px #e879f9; animation: pgNeon 2.2s ease-in-out infinite alternate; }
  .ng-s_glitch  { animation: pgGlitch 1.1s steps(1) infinite; }
  .ng-s_electric { text-shadow: 0 0 5px #fef08a, 0 0 12px #60a5fa, 0 0 22px #3b82f6; animation: pgZap 1.7s steps(1) infinite; }
  .ng-s_sakura, .ng-s_ocean, .ng-s_lava, .ng-s_aurora, .ng-s_gold, .ng-s_galaxy, .ng-s_eternal {
    -webkit-text-fill-color: transparent; color: transparent !important; background-clip: text; -webkit-background-clip: text; background-size: 240% 100%;
  }
  .ng-s_sakura { background-image: linear-gradient(90deg, #fbcfe8, #f472b6, #fda4af, #f472b6, #fbcfe8); animation: pgSlide 5s linear infinite; filter: drop-shadow(0 0 4px #f9a8d4); }
  .ng-s_ocean  { background-image: linear-gradient(90deg, #22d3ee, #3b82f6, #67e8f9, #3b82f6, #22d3ee); animation: pgSlide 4s linear infinite; filter: drop-shadow(0 0 4px #38bdf8); }
  .ng-s_lava   { background-image: linear-gradient(90deg, #fde047, #f97316, #dc2626, #f97316, #fde047); animation: pgSlide 2.6s linear infinite; filter: drop-shadow(0 0 5px #f97316); }
  .ng-s_aurora { background-image: linear-gradient(90deg, #34d399, #22d3ee, #a78bfa, #f0abfc, #34d399); animation: pgSlide 6s linear infinite; filter: drop-shadow(0 0 5px #67e8f9); }
  .ng-s_gold   { background-image: linear-gradient(110deg, #b45309 20%, #fde047 40%, #fff 50%, #fde047 60%, #b45309 80%); animation: pgSlide 3s linear infinite; filter: drop-shadow(0 0 4px #f59e0b); }
  .ng-s_galaxy { background-image: linear-gradient(90deg, #4338ca, #7c3aed, #ec4899, #38bdf8, #4338ca); animation: pgSlide 5s linear infinite; filter: drop-shadow(0 0 6px #a78bfa); }
  .ng-s_eternal { background-image: linear-gradient(90deg, #fde047, #f472b6, #a78bfa, #22d3ee, #34d399, #fde047); animation: pgSlide 3.2s linear infinite, pgHue 7s linear infinite; filter: drop-shadow(0 0 7px #fff); }
  @keyframes pgNeon { from { text-shadow: 0 0 2px #fff, 0 0 7px #22d3ee, 0 0 14px #22d3ee, 0 0 24px #e879f9; } to { text-shadow: 0 0 4px #fff, 0 0 12px #22d3ee, 0 0 26px #22d3ee, 0 0 42px #e879f9; } }
  @keyframes pgGlitch { 0%, 100% { text-shadow: 2px 0 #f0f, -2px 0 #0ff; } 20% { text-shadow: -2px 0 #f0f, 2px 0 #0ff; } 40% { text-shadow: 1px 1px #f0f, -1px -1px #0ff; } 60% { text-shadow: none; } 80% { text-shadow: 3px 0 #f0f, -3px 0 #0ff; } }
  @keyframes pgZap { 0%, 100% { text-shadow: 0 0 5px #fef08a, 0 0 12px #60a5fa, 0 0 22px #3b82f6; } 50% { text-shadow: 0 0 2px #fef08a, 0 0 5px #60a5fa; } 55% { text-shadow: 0 0 9px #fff, 0 0 20px #93c5fd, 0 0 34px #3b82f6; } 60% { text-shadow: 0 0 5px #fef08a, 0 0 12px #60a5fa; } }

  /* إطارات المستوى */
  .lvx.cf_bronze  { color: #ffe0c2; background: linear-gradient(135deg, #7c3f12, #b8672b); border-color: #e09a5a; box-shadow: 0 0 .4em #b8672b99; }
  .lvx.cf_silver  { color: #fff; background: linear-gradient(135deg, #64748b, #cbd5e1); border-color: #f1f5f9; box-shadow: 0 0 .5em #cbd5e1aa; text-shadow: 0 1px 1px #0008; }
  .lvx.cf_gold    { color: #3b2300; background: linear-gradient(135deg, #f59e0b, #fde047); border-color: #fff7c2; box-shadow: 0 0 .7em #fbbf24cc; }
  .lvx.cf_diamond { color: #083344; background: linear-gradient(135deg, #67e8f9, #e0f2fe, #a5f3fc); border-color: #fff; box-shadow: 0 0 .8em #67e8f9; animation: pgShine 2.2s ease-in-out infinite; }
  .lvx.cf_legend  { color: #fff; background: linear-gradient(135deg, #7c3aed, #db2777, #f59e0b); border-color: #fde68a; box-shadow: 0 0 1em #db2777, 0 0 .5em #f59e0b; animation: pgHue 4s linear infinite; }
  .lvx.cf_flame   { color: #fff7ed; background: linear-gradient(0deg, #b91c1c, #f97316); border-color: #fde047; box-shadow: 0 -.1em .6em #f97316, 0 0 .3em #fde047; animation: pgFlame 1.1s ease-in-out infinite alternate; }
  .lvx.cf_ice     { color: #0c4a6e; background: linear-gradient(135deg, #e0f2fe, #7dd3fc); border-color: #fff; box-shadow: 0 0 .7em #7dd3fc; }
  .lvx.cf_neon    { color: #fff; background: #0b0720; border-color: #f0abfc; box-shadow: 0 0 .5em #e879f9, inset 0 0 .4em #e879f9aa; text-shadow: 0 0 4px #f0abfc; animation: pgNeonBox 1.8s ease-in-out infinite alternate; }
  .lvx.cf_royal   { color: #fde68a; background: linear-gradient(135deg, #3b0764, #6d28d9); border-color: #fbbf24; box-shadow: 0 0 .6em #7c3aedaa, 0 0 0 1px #fbbf2455; }
  .lvx.cf_rainbow { color: #fff; border: 1.5px solid transparent; background: linear-gradient(#150f2b, #150f2b) padding-box, linear-gradient(90deg, #f43f5e, #f59e0b, #84cc16, #06b6d4, #8b5cf6, #f43f5e) border-box; animation: pgHue 5s linear infinite; }
  @keyframes pgFlame { to { box-shadow: 0 -.2em .9em #f97316, 0 0 .4em #fde047; } }
  @keyframes pgNeonBox { to { box-shadow: 0 0 .9em #e879f9, inset 0 0 .6em #e879f9; } }

  /* ألوان رسائل الشات */
  .chat-text.cc_gold { color: #fde68a !important; text-shadow: 0 0 6px #f59e0b66; }
  .chat-text.cc_cyan { color: #67e8f9 !important; text-shadow: 0 0 6px #06b6d466; }
  .chat-text.cc_pink { color: #f9a8d4 !important; text-shadow: 0 0 6px #ec489966; }
  .chat-text.cc_green { color: #86efac !important; text-shadow: 0 0 6px #22c55e66; }
  .chat-text.cc_ember { color: #fdba74 !important; text-shadow: 0 0 7px #ea580c88; }
  .chat-text.cc_royal { color: #c4b5fd !important; text-shadow: 0 0 8px #7c3aedaa; }
  .chat-text.cc_rainbow { color: transparent !important; -webkit-text-fill-color: transparent; background: linear-gradient(90deg, #f43f5e, #f59e0b, #84cc16, #06b6d4, #8b5cf6, #f43f5e) 0 0 / 240% 100%; -webkit-background-clip: text; background-clip: text; animation: pgSlide 5s linear infinite; }

  /* خلفيات الملف الشخصي */
  .pf_sunset { background: linear-gradient(135deg, rgba(249,115,22,.45), rgba(190,24,93,.4) 55%, rgba(76,29,149,.5)) !important; border-color: rgba(251,146,60,.5) !important; }
  .pf_ocean  { background: linear-gradient(135deg, rgba(6,182,212,.4), rgba(37,99,235,.42) 60%, rgba(30,27,75,.55)) !important; border-color: rgba(103,232,249,.5) !important; }
  .pf_forest { background: linear-gradient(135deg, rgba(34,197,94,.38), rgba(21,128,61,.4) 55%, rgba(6,78,59,.55)) !important; border-color: rgba(134,239,172,.5) !important; }
  .pf_night  { background: radial-gradient(circle at 80% 15%, rgba(147,197,253,.3), transparent 35%), linear-gradient(160deg, rgba(30,27,75,.85), rgba(2,6,23,.9)) !important; border-color: rgba(129,140,248,.5) !important; }
  .pf_gold   { background: linear-gradient(135deg, rgba(251,191,36,.5), rgba(180,83,9,.45) 55%, rgba(69,26,3,.6)) !important; border-color: rgba(253,224,71,.65) !important; }
  .pf_aurora { background: linear-gradient(135deg, rgba(52,211,153,.4), rgba(34,211,238,.35) 35%, rgba(167,139,250,.42) 70%, rgba(240,171,252,.35)) !important; border-color: rgba(167,243,208,.55) !important; }
  .pf_dawn   { background: linear-gradient(160deg, rgba(254,215,170,.4), rgba(251,113,133,.4) 50%, rgba(99,102,241,.45)) !important; border-color: rgba(253,186,116,.55) !important; }
  .pf_royal  { background: linear-gradient(135deg, rgba(109,40,217,.6), rgba(76,29,149,.6) 60%, rgba(251,191,36,.3)) !important; border-color: rgba(251,191,36,.6) !important; box-shadow: 0 0 22px rgba(124,58,237,.4); }
  .pf_cosmos { background: radial-gradient(circle at 20% 20%, rgba(236,72,153,.4), transparent 38%), radial-gradient(circle at 80% 70%, rgba(56,189,248,.35), transparent 40%), linear-gradient(160deg, rgba(30,10,60,.9), rgba(3,7,18,.95)) !important; border-color: rgba(192,132,252,.6) !important; box-shadow: 0 0 26px rgba(168,85,247,.45); }

  /* ---------- نوافذ المتجر والمسار ---------- */
  .pg-card { position: relative; }
  .pg-body { position: relative; }
  .pg-tab { font-size: .78rem; padding: 8px 2px; }
  .pg-coinbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 14px; border-radius: 16px; background: linear-gradient(135deg, rgba(251,191,36,.18), rgba(245,158,11,.08)); border: 1px solid rgba(251,191,36,.4); }
  .pg-coinbar b { font-size: 1.25rem; color: #fde68a; }
  .pg-coinbar span { font-size: .78rem; color: #cfc6ee; }
  .pg-deal { position: relative; margin-top: 12px; padding: 12px; border-radius: 18px; border: 1px solid rgba(251,113,133,.6); background: linear-gradient(135deg, rgba(190,24,93,.35), rgba(124,58,237,.3)); overflow: hidden; }
  .pg-deal::after { content: ''; position: absolute; inset: 0; background: linear-gradient(110deg, transparent 35%, rgba(255,255,255,.14) 50%, transparent 65%); transform: translateX(-120%); animation: pgSweep 3.6s ease-in-out infinite; pointer-events: none; }
  .pg-deal h5 { margin: 0 0 8px; font-size: .86rem; color: #fecdd3; display: flex; justify-content: space-between; align-items: center; }
  .pg-deal h5 em { font-style: normal; background: #e11d48; color: #fff; border-radius: 99px; padding: 1px 9px; font-weight: 900; font-size: .78rem; }
  .pg-cats { display: flex; gap: 6px; overflow-x: auto; padding: 12px 0 4px; scrollbar-width: none; }
  .pg-cats::-webkit-scrollbar { display: none; }
  .pg-cat { flex: none; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.05); color: #cfc6ee; padding: 6px 12px; border-radius: 99px; font: 700 .78rem inherit; cursor: pointer; }
  .pg-cat.on { background: linear-gradient(135deg, #7c3aed, #c026d3); color: #fff; border-color: transparent; }
  .pg-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .pg-item { display: flex; flex-direction: column; gap: 6px; padding: 10px; border-radius: 16px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); text-align: center; min-width: 0; }
  .pg-item.owned { border-color: rgba(74,222,128,.5); background: rgba(34,197,94,.08); }
  .pg-prev { min-height: 62px; display: grid; place-items: center; border-radius: 12px; background: rgba(0,0,0,.28); padding: 8px 4px; font-size: 1.1rem; overflow: hidden; border: 1px solid transparent; }
  .pg-prev .big { font-size: 2.2rem; }
  .pg-prev .lvx { font-size: 1.15rem; margin: 0; vertical-align: baseline; position: static; }
  .pg-in { font-weight: 800; font-size: .86rem; color: #fff; }
  .pg-id { font-size: .7rem; color: #a99fcf; line-height: 1.35; min-height: 1.35em; }
  .pg-buy, .pg-eqb, .pg-usebtn { border: 0; border-radius: 12px; padding: 7px 8px; font: 800 .82rem inherit; cursor: pointer; color: #3b2300; background: linear-gradient(135deg, #fde047, #f59e0b); }
  .pg-buy:hover:not(:disabled), .pg-eqb:hover, .pg-usebtn:hover:not(:disabled) { filter: brightness(1.1); }
  .pg-buy.poor { background: rgba(255,255,255,.1); color: #fca5a5; }
  .pg-buy:disabled { opacity: .5; cursor: default; }
  .pg-buy s { opacity: .6; font-weight: 600; margin-inline-end: 4px; font-size: .72rem; }
  .pg-eqb { background: rgba(255,255,255,.12); color: #e9e3ff; }
  .pg-eqb.on { background: linear-gradient(135deg, #16a34a, #4ade80); color: #052e16; cursor: default; }
  .pg-own { font-weight: 800; font-size: .8rem; color: #86efac; padding: 7px 0; }
  .pg-trk { font-weight: 700; font-size: .74rem; color: #fcd34d; padding: 7px 0; }
  .pg-invrow { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 14px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.09); margin-top: 8px; }
  .pg-invrow .e { font-size: 1.6rem; flex: none; }
  .pg-invrow .t { flex: 1; min-width: 0; font-size: .82rem; } .pg-invrow .t b { color: #fff; } .pg-invrow .t span { display: block; color: #a99fcf; font-size: .7rem; }
  .pg-usebtn { flex: none; }
  .pg-active { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .pg-pill { padding: 4px 11px; border-radius: 99px; font-size: .76rem; font-weight: 800; background: rgba(168,85,247,.25); border: 1px solid rgba(216,180,254,.5); color: #f5e9ff; }
  .pg-pill time { font-variant-numeric: tabular-nums; color: #fde68a; }
  .pg-picker { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; background: rgba(10,6,22,.94); backdrop-filter: blur(3px); border-radius: inherit; padding: 14px; overflow-y: auto; }
  .pg-picker h4 { margin: 0 0 10px; color: #bae6fd; } .pg-picker .list { display: grid; gap: 8px; }
  .pg-picker button.p { text-align: start; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.06); color: #fff; font: 700 .9rem inherit; cursor: pointer; }
  .pg-picker button.p:hover { background: rgba(125,211,252,.2); border-color: #7dd3fc; }
  .pg-picker .x { margin-top: 12px; align-self: center; padding: 8px 22px; border-radius: 12px; border: 0; background: rgba(255,255,255,.12); color: #fff; font: 700 .9rem inherit; cursor: pointer; }
  /* المسار */
  .pg-lr { display: flex; align-items: center; gap: 10px; padding: 8px 10px; margin-top: 6px; border-radius: 14px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.04); }
  .pg-lr.done { opacity: .62; }
  .pg-lr.cur { border-color: #fde047; background: linear-gradient(135deg, rgba(251,191,36,.22), rgba(192,38,211,.18)); box-shadow: 0 0 18px rgba(251,191,36,.35); }
  .pg-lr.big { border-color: rgba(216,180,254,.5); background: linear-gradient(135deg, rgba(124,58,237,.22), rgba(192,38,211,.12)); }
  .pg-lr.big.todo .pg-ln { background: linear-gradient(135deg, #7c3aed, #db2777); }
  .pg-ln { flex: none; width: 38px; height: 38px; display: grid; place-items: center; border-radius: 12px; font-weight: 900; color: #fff; background: rgba(255,255,255,.1); font-variant-numeric: tabular-nums; }
  .pg-lr.cur .pg-ln { background: linear-gradient(135deg, #f59e0b, #fde047); color: #3b2300; }
  .pg-lr.done .pg-ln { background: rgba(34,197,94,.35); }
  .pg-lrw { flex: 1; display: flex; flex-wrap: wrap; gap: 5px; min-width: 0; }
  .pg-rc { font-size: .72rem; font-weight: 700; padding: 2px 8px; border-radius: 99px; background: rgba(255,255,255,.08); color: #e9e3ff; white-space: nowrap; }
  .pg-rc.u { background: rgba(56,189,248,.16); color: #bae6fd; } .pg-rc.x { background: rgba(251,191,36,.16); color: #fde68a; }
  .pg-lst { flex: none; font-size: 1rem; }
  /* ملفي المطوّر */
  .pg-hero-box.pf { border: 1px solid rgba(255,255,255,.12); }
  .pg-badgelist { display: flex; flex-wrap: wrap; gap: 6px; }
  .pg-bchip { padding: 4px 10px; border-radius: 99px; background: rgba(255,255,255,.08); font-size: .76rem; font-weight: 700; color: #f5e9ff; }
  .pg-hint { color: #a99fcf; font-size: .78rem; padding: 4px 2px; }
  .pg-hint button { border: 0; background: transparent; color: #f0abfc; font: 800 .78rem inherit; cursor: pointer; text-decoration: underline; }
  .pg-pbtn { margin-inline-start: 6px; padding: 0 6px; height: 1.35em; min-width: 1.6em; line-height: 1; font-size: .72em; border-radius: 99px; border: 1px solid rgba(255,255,255,.28); background: rgba(255,255,255,.1); color: #fff; cursor: pointer; vertical-align: middle; transition: transform .15s, background .15s; }
  .pg-pbtn:hover { background: rgba(168,85,247,.55); transform: scale(1.12); }
  /* محرر التقدم للأدمن الأساسي */
  #apg-overlay { position: fixed; inset: 0; width: 100vw; height: 100vh; max-width: none; max-height: none; margin: 0; padding: 14px; border: 0; background: rgba(4,6,14,.78); display: none; align-items: center; justify-content: center; overflow: hidden; z-index: 10070; direction: rtl; color: #e5e7eb; font-family: inherit; }
  #apg-overlay.apg-open { display: flex; }
  .apg-card { width: min(520px, 100%); max-height: min(94vh, 820px); overflow-y: auto; border-radius: 18px; background: #0f1320; border: 1px solid rgba(96,165,250,.4); box-shadow: 0 20px 60px rgba(0,0,0,.7); padding: 14px 14px 18px; }
  .apg-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .apg-head h3 { margin: 0; font-size: 1rem; color: #93c5fd; } .apg-head button { background: rgba(255,255,255,.08); border: 0; color: #fff; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; }
  .apg-sec { margin-top: 12px; padding: 10px; border-radius: 14px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); }
  .apg-sec > b { display: block; font-size: .85rem; color: #fde68a; margin-bottom: 8px; }
  .apg-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .apg-row button, .apg-btn { border: 1px solid rgba(255,255,255,.15); background: rgba(255,255,255,.07); color: #fff; padding: 6px 11px; border-radius: 10px; font: 700 .8rem inherit; cursor: pointer; }
  .apg-row button:hover, .apg-btn:hover { background: rgba(96,165,250,.25); }
  .apg-btn.ok { background: linear-gradient(135deg, #16a34a, #22c55e); border-color: transparent; color: #052e16; }
  .apg-btn.bad { background: rgba(220,38,38,.2); border-color: rgba(248,113,113,.5); color: #fecaca; }
  .apg-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .apg-grid label { display: flex; flex-direction: column; gap: 3px; font-size: .72rem; color: #9ca3af; }
  .apg-grid input, .apg-in, .apg-sel { width: 100%; box-sizing: border-box; background: #0b0f1a; border: 1px solid rgba(255,255,255,.18); color: #fff; border-radius: 9px; padding: 7px 8px; font: 600 .86rem inherit; direction: ltr; text-align: center; }
  .apg-sel { direction: rtl; text-align: start; }
  .apg-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
  .apg-chip { padding: 3px 9px; border-radius: 99px; background: rgba(59,130,246,.18); border: 1px solid rgba(96,165,250,.4); font-size: .74rem; cursor: pointer; }
  .apg-chip:hover { background: rgba(220,38,38,.3); }
  .apg-note { font-size: .72rem; color: #9ca3af; margin-top: 6px; }
  .pg-spin { display: block; width: 100%; margin-top: 10px; padding: 12px; border: 0; border-radius: 14px; font: 800 1rem inherit; cursor: pointer; color: #3b2300; background: linear-gradient(135deg, #fde047, #f59e0b); box-shadow: 0 6px 20px rgba(245, 158, 11, .45); transition: transform .15s, filter .2s; }
  .pg-spin:hover:not(:disabled) { transform: translateY(-1px) scale(1.01); }
  .pg-spin:disabled { cursor: default; filter: grayscale(.75) brightness(.7); box-shadow: none; }
  .pg-result { min-height: 24px; text-align: center; margin-top: 8px; font-weight: 800; color: #fde68a; font-size: 1rem; }
  .pg-result.pop { animation: pgPop .5s ease-out; }
  @keyframes pgPop { 0% { transform: scale(.6); opacity: 0; } 70% { transform: scale(1.12); } 100% { transform: scale(1); opacity: 1; } }

  /* ملفي */
  .pg-hero { display: flex; align-items: center; gap: 14px; }
  .pg-ring { position: relative; width: 96px; height: 96px; flex: none; }
  .pg-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
  .pg-ring .bgc { stroke: rgba(255,255,255,.1); } .pg-ring .fgc { stroke: var(--tc); transition: stroke-dashoffset .8s; filter: drop-shadow(0 0 6px var(--tc)); }
  .pg-ring .lvn { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; line-height: 1; }
  .pg-ring .lvn b { font-size: 1.9rem; font-weight: 900; color: #fff; display: block; } .pg-ring .lvn span { font-size: .62rem; color: #bfb4e3; letter-spacing: .05em; }
  .pg-name { font-size: 1.25rem; font-weight: 800; word-break: break-word; }
  .pg-xp { font-size: .8rem; color: #bfb4e3; margin-top: 6px; }
  .pg-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
  .pg-st { text-align: center; padding: 8px 4px; border-radius: 14px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08); }
  .pg-st b { display: block; font-size: 1.05rem; color: #fff; } .pg-st span { font-size: .7rem; color: #a99fcf; }
  .pg-next { margin-top: 12px; padding: 10px 12px; border-radius: 14px; font-size: .86rem; background: linear-gradient(135deg, rgba(124,58,237,.3), rgba(192,38,211,.2)); border: 1px dashed rgba(216, 180, 254, .55); color: #f5e9ff; }
  .pg-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .pg-opt { border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.06); color: #e9e3ff; padding: 7px 11px; border-radius: 12px; font: 700 .82rem inherit; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: .15s; }
  .pg-opt:hover:not(.lock) { background: rgba(255,255,255,.14); }
  .pg-opt.sel { border-color: #f0abfc; background: rgba(192, 38, 211, .25); box-shadow: 0 0 12px rgba(217, 70, 239, .4); }
  .pg-opt[data-ti]:not(.lock) { color: var(--tc, #e9e3ff); }
  .pg-opt.lock { opacity: .45; cursor: default; }
  .pg-opt small { font-weight: 600; color: #a99fcf; font-size: .72rem; }
  .pg-badges { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .pg-bd { display: flex; gap: 8px; align-items: center; padding: 8px; border-radius: 14px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.05); cursor: pointer; text-align: start; color: inherit; font: inherit; transition: .15s; }
  .pg-bd .e { font-size: 1.5rem; flex: none; } .pg-bd b { display: block; font-size: .82rem; color: #fff; } .pg-bd span { font-size: .7rem; color: #a99fcf; line-height: 1.3; display: block; }
  .pg-bd.sel { border-color: #fbbf24; background: rgba(251, 191, 36, .14); box-shadow: 0 0 12px rgba(251, 191, 36, .3); }
  .pg-bd.lock { opacity: .4; filter: grayscale(.8); cursor: default; }

  /* المتجر (شكل فقط) */
  .pg-store { text-align: center; padding: 18px 6px 8px; }
  .pg-store .big { font-size: 4rem; filter: drop-shadow(0 0 18px #c084fc); animation: pgFloat 3s ease-in-out infinite; }
  .pg-soon { display: inline-block; margin: 8px 0 6px; padding: 8px 24px; border-radius: 99px; font-weight: 900; font-size: 1.15rem; color: #fff; background: linear-gradient(135deg, #7c3aed, #db2777); box-shadow: 0 6px 24px rgba(219, 39, 119, .45); position: relative; overflow: hidden; }
  .pg-soon::after { content: ''; position: absolute; inset: 0; background: linear-gradient(110deg, transparent 35%, rgba(255,255,255,.45) 50%, transparent 65%); transform: translateX(-120%); animation: pgSweep 2.8s ease-in-out infinite; }
  .pg-store p { color: #bfb4e3; font-size: .88rem; margin: 6px 12px 0; line-height: 1.7; }
  .pg-ghosts { display: flex; gap: 10px; justify-content: center; margin-top: 16px; }
  .pg-ghost { width: 82px; height: 98px; border-radius: 16px; background: rgba(255,255,255,.05); border: 1px dashed rgba(255,255,255,.18); display: grid; place-items: center; font-size: 1.8rem; color: rgba(255,255,255,.3); position: relative; overflow: hidden; }
  .pg-ghost::after { content: ''; position: absolute; inset: 0; background: linear-gradient(110deg, transparent 35%, rgba(255,255,255,.12) 50%, transparent 65%); transform: translateX(-120%); animation: pgSweep 3.4s ease-in-out infinite; }
  .pg-ghost:nth-child(2)::after { animation-delay: .5s; } .pg-ghost:nth-child(3)::after { animation-delay: 1s; }
  @keyframes pgFloat { 50% { transform: translateY(-8px); } } @keyframes pgSweep { to { transform: translateX(120%); } }

  /* إشعارات */
  #pg-toasts { position: fixed; inset: 0 0 auto 0; width: 100%; max-width: none; height: auto; margin: 0; padding: 10px 12px; border: 0; background: transparent; overflow: visible; pointer-events: none; display: none; flex-direction: column; align-items: center; gap: 8px; z-index: 10060; direction: rtl; }
  #pg-toasts.on { display: flex; }
  .pg-toast { max-width: min(92vw, 420px); padding: 10px 16px; border-radius: 16px; font-weight: 800; font-size: .92rem; color: #fff; text-align: center; background: linear-gradient(135deg, rgba(76, 29, 149, .96), rgba(134, 25, 143, .96)); border: 1px solid rgba(240, 171, 252, .6); box-shadow: 0 8px 28px rgba(0,0,0,.5), 0 0 22px rgba(192, 38, 211, .45); animation: pgToast 3.6s ease forwards; }
  .pg-toast.big { font-size: 1rem; padding: 12px 20px; }
  @keyframes pgToast { 0% { opacity: 0; transform: translateY(-16px) scale(.9); } 8% { opacity: 1; transform: none; } 88% { opacity: 1; } 100% { opacity: 0; transform: translateY(-10px); } }
  .pg-lvup { position: relative; padding: 16px 26px 14px; border-radius: 22px; text-align: center; color: #fff; background: radial-gradient(circle at 50% 0%, rgba(251, 191, 36, .35), transparent 60%), linear-gradient(160deg, #3b1670, #1a0d36); border: 1px solid rgba(253, 224, 71, .7); box-shadow: 0 12px 40px rgba(0,0,0,.6), 0 0 36px rgba(251, 191, 36, .45); animation: pgToast 4.6s ease forwards; overflow: visible; }
  .pg-lvup .u { font-size: .8rem; color: #fde68a; letter-spacing: .08em; } .pg-lvup .n { font-size: 2.6rem; font-weight: 900; line-height: 1.1; text-shadow: 0 0 16px #fbbf24; }
  .pg-lvup .r { font-size: .84rem; color: #f5e9ff; margin-top: 4px; }
  .pg-conf { position: absolute; left: 50%; top: 50%; width: 7px; height: 11px; border-radius: 2px; opacity: 0; animation: pgConf 1.5s ease-out forwards; }
  @keyframes pgConf { 0% { opacity: 1; transform: translate(0, 0) rotate(0); } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(var(--rt)); } }
  .pg-xpfloat { position: fixed; margin: 0; right: auto; bottom: auto; background: transparent; border: 0; padding: 0; width: auto; height: auto; overflow: visible; z-index: 10060; pointer-events: none; font-weight: 900; color: #e9d5ff; text-shadow: 0 0 10px #a855f7, 0 2px 4px #000; font-size: 1rem; animation: pgFloatUp 1.3s ease-out forwards; direction: rtl; }
  @keyframes pgFloatUp { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-46px); } }

  @media (prefers-reduced-motion: reduce) {
    .lvx, .ng-g_fire, .ng-g_rainbow, .ng-g_diamond, .pg-lights circle, .pg-store .big, .pg-soon::after, .pg-ghost::after, .pg-dot, .pg-card { animation: none !important; }
    .pg-wheel-rot.spin { transition-duration: 1.2s; }
  }
  `;
  const st = document.createElement('style');
  st.id = 'pg-styles';
  st.textContent = css;
  document.head.appendChild(st);

  // ---------- أدوات ----------
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtT = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':');
  };
  const nf = (n) => Number(n || 0).toLocaleString('en-US');
  const catTitle = (id) => PG.cat && PG.cat.titles.find(t => t.id === id);
  const catGlow = (id) => PG.cat && PG.cat.glows.find(g => g.id === id);
  const catBadge = (id) => PG.cat && PG.cat.badges.find(b => b.id === id);

  let tab = 'daily';
  let spinning = false;
  let held = { state: null, toasts: [] };
  let tickTimer = null;
  let ac = null;

  // ---------- أصوات صغيرة ----------
  function audio() {
    try {
      if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (A) ac = new A(); }
      if (ac && ac.state === 'suspended') ac.resume();
    } catch (e) {}
    return ac;
  }
  function beep(freq, dur, type = 'sine', vol = 0.08, when = 0) {
    const c = audio(); if (!c) return;
    try {
      const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + when;
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  const tick = () => beep(1500, 0.035, 'square', 0.035);
  const fanfare = () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.22, 'triangle', 0.09, i * 0.09));
  const chime = () => [880, 1175, 1568].forEach((f, i) => beep(f, 0.3, 'sine', 0.08, i * 0.1));

  // ---------- أزرار القائمة ----------
  const controls = $('.controls') || document.body;
  const adminBtn = $('#btn-admin-auth');
  const mk = (id, html) => { const b = document.createElement('button'); b.id = id; b.className = 'btn-main'; b.type = 'button'; b.innerHTML = html; return b; };
  const bDaily = mk('btn-daily', '🎯 التحدي اليومي<i class="pg-dot"></i>');
  const bProfile = mk('btn-profile', '👤 ملفي<span class="pg-lvtag"></span>');
  const bPass = mk('btn-pass', '🏅 المسار');
  const bStore = mk('btn-store', '🛍️ المتجر');
  [bDaily, bPass, bProfile, bStore].forEach(b => controls.insertBefore(b, adminBtn && adminBtn.parentNode === controls ? adminBtn : null));

  // ---------- النافذة ----------
  const ov = document.createElement('div');
  ov.id = 'pg-overlay';
  ov.setAttribute('popover', 'manual');
  ov.innerHTML = `
    <div class="pg-card" role="dialog" aria-modal="true" aria-label="مركز اللاعب">
      <div class="pg-head"><h3 id="pg-title"></h3><button class="pg-x" type="button" aria-label="إغلاق">✕</button></div>
      <div class="pg-tabs">
        <button class="pg-tab" data-tab="daily" type="button">🎯 التحدي اليومي</button>
        <button class="pg-tab" data-tab="pass" type="button">🏅 المسار</button>
        <button class="pg-tab" data-tab="profile" type="button">👤 ملفي</button>
        <button class="pg-tab" data-tab="store" type="button">🛍️ المتجر</button>
      </div>
      <div class="pg-body" id="pg-body"></div>
    </div>`;
  document.body.appendChild(ov);
  const toastBox = document.createElement('div');
  toastBox.id = 'pg-toasts';
  toastBox.setAttribute('popover', 'manual');
  document.body.appendChild(toastBox);

  const isOpen = () => ov.classList.contains('pg-open');
  function openPanel(t, arg) {
    tab = t || tab;
    if (tab === 'view') { viewId = arg; viewData = null; fetchView(); }
    ov.classList.add('pg-open');
    topLayerShow(ov);
    socket.emit('progress:get');
    render();
    startTick();
  }
  function closePanel() {
    ov.classList.remove('pg-open');
    topLayerHide(ov);
    stopTick();
  }
  bDaily.addEventListener('click', () => openPanel('daily'));
  bPass.addEventListener('click', () => openPanel('pass'));
  bProfile.addEventListener('click', () => openPanel('profile'));
  bStore.addEventListener('click', () => openPanel('store'));
  $('.pg-x', ov).addEventListener('click', closePanel);
  ov.addEventListener('click', (e) => { if (e.target === ov) closePanel(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) closePanel(); });
  ov.querySelectorAll('.pg-tab').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));

  // ---------- العدّاد الحي ----------
  function startTick() { stopTick(); tickTimer = setInterval(updateTimers, 1000); }
  function stopTick() { clearInterval(tickTimer); tickTimer = null; }
  function updateTimers() {
    const s = PG.state; if (!s) return;
    const el = Date.now() - PG.at;
    const left = Math.max(0, s.daily.reset - el);
    document.querySelectorAll('[data-reset]').forEach(n => { n.textContent = fmtT(left); });
    document.querySelectorAll('[data-bx]').forEach(n => { const t = Math.max(0, (s.boost[n.dataset.bx] || 0) - el); n.textContent = t > 0 ? fmtT(t) : 'انتهى'; });
    const sp = $('#pg-spin');
    if (sp && !spinning && !s.wheel.can) sp.querySelector('.t') && (sp.querySelector('.t').textContent = fmtT(left));
    if (left <= 0 && isOpen()) socket.emit('progress:get');
  }

  // ---------- الرسم ----------
  function render() {
    const s = PG.state;
    ov.querySelectorAll('.pg-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    $('#pg-title').textContent = TAB_TITLE[tab] || '';
    const body = $('#pg-body');
    if (!PG.cat || (!s && tab !== 'view')) { body.innerHTML = '<div class="pg-box" style="text-align:center;margin-top:14px">جاري التحميل…</div>'; return; }
    if (spinning) return;                                   // ما نخرّب العجلة وهي بتلف
    const prevTab = body.dataset.tab, keepTop = body.scrollTop;
    body.innerHTML = tab === 'daily' ? dailyHtml(s) : tab === 'pass' ? passHtml(s) : tab === 'profile' ? profileHtml(s) : tab === 'store' ? storeHtml(s) : viewHtml();
    body.dataset.tab = tab;
    body.scrollTop = prevTab === tab ? keepTop : 0;
    if (tab === 'pass' && prevTab !== 'pass') { const cur = body.querySelector('.pg-lr.cur'); if (cur) body.scrollTop = Math.max(0, cur.offsetTop - 150); }
    if (tab === 'daily') bindDaily();
    if (tab === 'profile') bindProfile();
    if (tab === 'store') bindStore();
    updateTimers();
  }

  function dailyHtml(s) {
    const d = s.daily, pct = Math.min(100, Math.round((d.p / d.tg) * 100));
    const ms = (PG.cat.streak || []).map(m => `<div class="pg-m ${s.streak >= m.d ? 'got' : ''}"><b>${m.d} أيام</b>🪙 <bdi dir="ltr">${m.coins}</bdi>${m.xp ? '<br>✨ <bdi dir="ltr">' + m.xp + '</bdi>' : ''}</div>`).join('');
    return `
    <div class="pg-sec pg-box">
      <div class="pg-streak">
        <div class="pg-flame ${s.streak > 0 ? '' : 'off'}">🔥</div>
        <div><div class="pg-sn">${s.streak} ${s.streak === 1 ? 'يوم' : 'أيام'}</div><div class="pg-sl">${s.streak > 0 ? 'سلسلة أيام متتالية — لا تقطعها!' : 'جاوب كلمة اليوم وابدأ سلسلتك'}${s.best > 0 ? ' · أفضل: ' + s.best : ''}</div></div>
      </div>
      <div class="pg-ms">${ms}</div>
    </div>
    <div class="pg-sec">
      <h4>🎯 تحدي اليوم <small>فكرة جديدة كل يوم</small></h4>
      <div class="pg-box">
        <div class="pg-ch"><div class="pg-ch-ic">${esc(d.icon)}</div><div><div class="pg-ch-t">${esc(d.title)}</div><div class="pg-ch-d">${esc(d.desc)}</div></div></div>
        <div class="pg-bar ${d.done ? 'done' : ''}"><i style="width:${pct}%"></i></div>
        <div class="pg-row"><span><bdi dir="ltr">${d.p} / ${d.tg}</bdi></span><span><span class="pg-chip">✨ خبرة <bdi dir="ltr">+${d.xp}</bdi></span> <span class="pg-chip">🪙 <bdi dir="ltr">+${d.coins}</bdi></span></span></div>
        <div class="pg-row">${d.done ? '<span class="pg-ok">✅ أنجزت تحدي اليوم!</span>' : '<span>⏳ ينتهي بعد</span>'}<span class="pg-time" data-reset></span></div>
      </div>
    </div>
    <div class="pg-sec">
      <h4>🎡 عجلة الحظ <small>لفّة مجانية كل يوم</small></h4>
      <div class="pg-box">
        <div class="pg-wheel-wrap"><div class="pg-pointer"></div>${wheelSvg()}</div>
        <div class="pg-result" id="pg-result"></div>
        <button id="pg-spin" class="pg-spin" type="button" ${s.wheel.can ? '' : 'disabled'}>${s.wheel.can ? (s.wheel.free ? '🎡 لفّ العجلة' : `🎟️ لفّ بتذكرة (×${s.wheel.tickets})`) : '⏳ لفّتك الجاية بعد <span class="t pg-time" style="color:#3b2300"></span>'}</button>
      </div>
    </div>`;
  }

  function wheelSvg() {
    const items = PG.cat.wheel, n = items.length, step = 360 / n;
    const cols = ['#7c3aed', '#db2777', '#2563eb', '#f59e0b', '#059669', '#9333ea', '#e11d48', '#0891b2'];
    const pt = (a, r) => [100 + r * Math.sin(a * Math.PI / 180), 100 - r * Math.cos(a * Math.PI / 180)];
    let sec = '', lab = '', lights = '';
    items.forEach((it, i) => {
      const a0 = i * step - step / 2, a1 = i * step + step / 2, [x0, y0] = pt(a0, 94), [x1, y1] = pt(a1, 94);
      const last = i === n - 1 && n % 2 === 1;
      sec += `<path d="M100 100 L${x0.toFixed(2)} ${y0.toFixed(2)} A94 94 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z" fill="${last ? '#be185d' : cols[i % cols.length]}" stroke="rgba(255,255,255,.55)" stroke-width="1"/>`;
      lab += `<g transform="rotate(${i * step} 100 100)"><text x="100" y="27" text-anchor="middle" font-size="15">${esc(it.i)}</text><text transform="translate(100 66) rotate(-90)" text-anchor="middle" dominant-baseline="central" font-size="11.5" font-weight="900" fill="#fff" direction="ltr" style="paint-order:stroke;stroke:rgba(0,0,0,.5);stroke-width:2.4px;font-family:system-ui,sans-serif">${esc(it.t)}</text></g>`;
    });
    for (let i = 0; i < 20; i++) { const [x, y] = pt(i * 18, 99); lights += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.4" fill="#fde047"/>`; }
    const rot = PG.rot || 0;
    return `<svg viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="99" fill="#2a1450" stroke="#fbbf24" stroke-width="2.5"/>
      <g class="pg-wheel-rot" id="pg-wheel" style="transform:rotate(${rot}deg)">${sec}${lab}</g>
      <g class="pg-lights">${lights}</g>
      <circle cx="100" cy="100" r="15" fill="#fbbf24" stroke="#fff" stroke-width="2"/><text x="100" y="105.5" text-anchor="middle" font-size="15">⭐</text>
    </svg>`;
  }

  function myMeta(s) { return { lv: s.lv, ti: s.shown.ti, gl: s.eq.gl, bd: s.shown.bd, nc: s.eq.nc, cf: s.eq.cf, cc: s.eq.cc }; }
  const shopItem = (id) => PG.cat && PG.cat.shop.find(x => x.id === id);
  const CAT_LBL = { nc: '🎨 لون اسم', gl: '✨ تأثير اسم', cf: '🔰 إطار مستوى', ti: '🏷️ لقب', bd: '🎖️ شارة', pf: '🖼️ خلفية ملف', cc: '💬 لون شات', use: '🧰 أداة' };
  const STORE_CATS = [['all', '🛍️ الكل'], ['nc', '🎨 ألوان'], ['gl', '✨ تأثيرات'], ['cf', '🔰 إطارات'], ['ti', '🏷️ ألقاب'], ['bd', '🎖️ شارات'], ['pf', '🖼️ خلفيات'], ['cc', '💬 شات'], ['use', '🧰 أدوات']];
  const TAB_TITLE = { daily: '🎯 التحدي اليومي', pass: '🏅 مسار المستويات', profile: '👤 ملفي', store: '🛍️ المتجر', view: '👤 ملف لاعب' };
  let storeCat = 'all', viewId = null, viewData = null;
  const eqOf = (s, it) => (it.cat === 'ti' ? s.shown.ti : it.cat === 'bd' ? null : s.eq[it.cat]);
  const ratio = (s) => { const t = (s.a || 0) + (s.wr || 0); return t ? Math.round((s.a || 0) * 100 / t) : 0; };

  function previewHtml(it) {
    switch (it.cat) {
      case 'nc': return `<span style="color:${it.v};font-weight:800">اسمك</span>`;
      case 'gl': return `<span class="ng-${it.id}" style="color:#fff;font-weight:800">اسمك</span>`;
      case 'cf': return `<sup class="lvx t3 ${it.id}">12</sup>`;
      case 'ti': return `<span class="ttl t5">${esc(it.n)}</span>`;
      case 'cc': return `<span class="chat-text ${it.id}" style="font-weight:700">رسالتك هنا</span>`;
      case 'pf': return `<span class="${it.id}" style="font-size:.8rem;font-weight:800;padding:8px 18px;border-radius:10px;display:inline-block;color:#fff">ملفك</span>`;
      default: return `<span class="big">${it.e || '🎁'}</span>`;
    }
  }

  function itemCard(it, s, owned) {
    const isUse = it.cat === 'use';
    const own = !isUse && owned.has(it.id);
    const cnt = isUse ? (s.inv[it.id] || 0) : 0;
    const deal = s.deal.id === it.id;
    const price = deal ? s.deal.price : it.p;
    let act;
    if (own) {
      const cur = eqOf(s, it);
      act = it.cat === 'bd' ? '<div class="pg-own">✓ مملوك</div>'
        : `<button class="pg-eqb${cur === it.id ? ' on' : ''}" type="button" data-eq="${it.cat}|${it.id}">${cur === it.id ? 'ملبوس ✓' : 'البس'}</button>`;
    } else if (it.tr) act = `<div class="pg-trk">🏅 هدية المستوى ${it.tr}</div>`;
    else if (it.lv && s.lv < it.lv) act = `<div class="pg-trk">🔒 يفتح بالمستوى ${it.lv}</div>`;
    else if (isUse && cnt >= it.max) act = '<div class="pg-own">الحد الأقصى</div>';
    else act = `<button class="pg-buy${s.coins < price ? ' poor' : ''}" type="button" data-buy="${it.id}">${deal ? `<s>${nf(it.p)}</s>` : ''}🪙 ${nf(price)}</button>`;
    const desc = it.d || CAT_LBL[it.cat].replace(/^\S+\s/, '');
    return `<div class="pg-item${own ? ' owned' : ''}"><div class="pg-prev">${previewHtml(it)}</div><div class="pg-in">${esc(it.n)}${isUse && cnt ? ` <small style="color:#86efac">×${cnt}</small>` : ''}</div><div class="pg-id">${esc(desc)}</div>${act}</div>`;
  }

  function storeHtml(s) {
    const shop = PG.cat.shop, owned = new Set(s.own);
    const dealIt = shopItem(s.deal.id);
    const buffs = [];
    if (s.boost.xp > 0) buffs.push(`<span class="pg-pill">✨ خبرة ×2 · <time data-bx="xp">${fmtT(s.boost.xp)}</time></span>`);
    if (s.boost.coin > 0) buffs.push(`<span class="pg-pill">🪙 عملات ×2 · <time data-bx="coin">${fmtT(s.boost.coin)}</time></span>`);
    if (s.dbl > 0) buffs.push(`<span class="pg-pill">⚡ نقاط مضاعفة ×${s.dbl}</span>`);
    const invRows = Object.keys(s.inv).filter(id => s.inv[id] > 0 && shopItem(id)).map(id => {
      const it = shopItem(id), auto = id === 'shield' || id === 'ticket';
      return `<div class="pg-invrow"><span class="e">${it.e}</span><div class="t"><b>${esc(it.n)} ×${s.inv[id]}</b><span>${esc(it.d)}</span></div>${auto ? `<span class="pg-trk">${id === 'ticket' ? 'بتنفع بالعجلة' : 'تلقائي'}</span>` : `<button class="pg-usebtn" type="button" data-use="${id}">استخدم</button>`}</div>`;
    }).join('');
    let grid = '';
    const cats = storeCat === 'all' ? STORE_CATS.filter(c => c[0] !== 'all') : STORE_CATS.filter(c => c[0] === storeCat);
    cats.forEach(c => {
      const items = shop.filter(it => it.cat === c[0]);
      if (!items.length) return;
      grid += `<div class="pg-sec"><h4>${c[1]} <small>${items.filter(i => i.cat !== 'use' && owned.has(i.id)).length ? items.filter(i => owned.has(i.id)).length + ' مملوك' : ''}</small></h4><div class="pg-grid">${items.map(it => itemCard(it, s, owned)).join('')}</div></div>`;
    });
    return `
    <div class="pg-coinbar"><div><span>رصيدك</span><br><b>🪙 ${nf(s.coins)}</b></div><div style="text-align:end"><span>مستواك</span><br><b style="color:#fff">${s.lv}</b></div></div>
    ${buffs.length ? `<div class="pg-active">${buffs.join('')}</div>` : ''}
    ${invRows ? `<div class="pg-sec"><h4>🎒 حقيبتي</h4>${invRows}</div>` : ''}
    ${dealIt ? `<div class="pg-deal"><h5><span>🔥 عرض اليوم</span><em>-${s.deal.pct}%</em></h5><div class="pg-grid" style="grid-template-columns:1fr">${itemCard(dealIt, s, owned)}</div><div class="pg-row" style="justify-content:center">⏳ ينتهي بعد <span class="pg-time" data-reset></span></div></div>` : ''}
    <div class="pg-cats">${STORE_CATS.map(c => `<button class="pg-cat${storeCat === c[0] ? ' on' : ''}" type="button" data-cat="${c[0]}">${c[1]}</button>`).join('')}</div>
    ${grid}
    <div class="pg-hint" style="text-align:center;margin-top:14px">💡 العملات بتجيبها من الإجابات الصح، التحدي اليومي، السلسلة، عجلة الحظ ومسار المستويات</div>`;
  }

  function passHtml(s) {
    const T = PG.cat.track;
    const frac = s.need ? Math.round(s.cur * 100 / s.need) : 100;
    const rows = T.map(t => {
      const st = t.lv < s.lv ? 'done' : t.lv === s.lv ? 'cur' : 'todo';
      const chips = [];
      if (t.c) chips.push(`<span class="pg-rc">🪙 +${nf(t.c)}</span>`);
      if (t.x) Object.keys(t.x).forEach(id => { const it = shopItem(id); if (it) chips.push(`<span class="pg-rc u">${it.e} ${esc(it.n)}${t.x[id] > 1 ? ' ×' + t.x[id] : ''}</span>`); });
      t.it.forEach(id => { const it = shopItem(id); if (it) chips.push(`<span class="pg-rc x">${CAT_LBL[it.cat]} «${esc(it.n)}»</span>`); });
      t.ti.forEach(id => { const x = catTitle(id); if (x) chips.push(`<span class="pg-rc x">🏷️ لقب «${esc(x.n)}»</span>`); });
      t.gl.forEach(id => { const x = catGlow(id); if (x) chips.push(`<span class="pg-rc x">✨ تأثير «${esc(x.n)}»</span>`); });
      const big = t.it.length || t.ti.length || t.gl.length;
      return `<div class="pg-lr ${st}${big ? ' big' : ''}"><div class="pg-ln">${t.lv}</div><div class="pg-lrw">${chips.join('') || '<span class="pg-rc">أهلاً بك 👋</span>'}</div><div class="pg-lst">${st === 'todo' ? '🔒' : st === 'cur' ? '⭐' : '✅'}</div></div>`;
    }).join('');
    return `
    <div class="pg-sec pg-box">
      <div class="pg-ch"><div class="pg-ch-ic" style="font-size:1.6rem;font-weight:900">${s.lv}</div><div style="flex:1;min-width:0"><div class="pg-ch-t">المستوى ${s.lv} من ${PG.cat.maxLevel}</div><div class="pg-ch-d">${s.need ? `${nf(s.cur)} / ${nf(s.need)} خبرة للمستوى ${s.lv + 1}` : 'وصلت لأعلى مستوى 👑'}</div></div></div>
      <div class="pg-bar"><i style="width:${frac}%"></i></div>
      ${s.next ? `<div class="pg-next">🎁 الجائزة الكبيرة القادمة بالمستوى <b>${s.next.lv}</b>: ${esc(s.next.n)}</div>` : ''}
    </div>
    <div class="pg-sec"><h4>🏅 المسار <small>كل مستوى = مكافأة</small></h4>${rows}</div>`;
  }

  function profileHtml(s) {
    const me = (PG.players || []).find(p => p.id === playerId) || {};
    const tier = tierOf(s.lv), C = 2 * Math.PI * 44, frac = s.need ? s.cur / s.need : 1;
    const nameP = nameHtml(me.name || 'أنت', me.rawName || me.name || 'أنت', me.color || '#00e5ff', me.fx, myMeta(s));
    const own = new Set(s.own), shop = PG.cat.shop, eq = s.eq, sel = (c) => (c ? ' sel' : '');
    const days = Math.max(1, Math.ceil((Date.now() - (s.js || Date.now())) / 86400e3));
    const titles = `<button class="pg-opt${sel(!s.shown.ti)}" type="button" data-eq="ti|">بدون</button>` + PG.cat.titles.filter(t => !t.shop || own.has(t.id)).map(t => {
      const ok = t.shop ? true : s.lv >= t.lv;
      return `<button class="pg-opt t${tierOf(t.lv || 20)}${sel(s.shown.ti === t.id)}${ok ? '' : ' lock'}" type="button" data-eq="ti|${t.id}" ${ok ? '' : 'disabled'}>${ok ? '' : '🔒 '}${esc(t.n)}${ok ? '' : ` <small>مستوى ${t.lv}</small>`}</button>`;
    }).join('');
    const glows = `<button class="pg-opt${sel(!eq.gl)}" type="button" data-eq="gl|">بدون</button>` + PG.cat.glows.filter(g => !g.shop || own.has(g.id)).map(g => {
      const ok = g.shop ? true : s.lv >= g.lv;
      return `<button class="pg-opt${sel(eq.gl === g.id)}${ok ? '' : ' lock'}" type="button" data-eq="gl|${g.id}" ${ok ? '' : 'disabled'}>${ok ? `<span class="ng-${g.id}" style="color:#fff;font-weight:800">اسمك</span>` : '🔒'} <small>${esc(g.n)}${ok ? '' : ' · مستوى ' + g.lv}</small></button>`;
    }).join('');
    const pickRow = (cat) => {
      const items = shop.filter(x => x.cat === cat && own.has(x.id));
      if (!items.length) return `<div class="pg-hint">ما عندك ولا واحد · <button type="button" data-goto="${cat}">افتح المتجر</button></div>`;
      return `<div class="pg-chips"><button class="pg-opt${sel(!eq[cat])}" type="button" data-eq="${cat}|">بدون</button>${items.map(it => `<button class="pg-opt${sel(eq[cat] === it.id)}" type="button" data-eq="${cat}|${it.id}"><span>${previewHtml(it)}</span><small>${esc(it.n)}</small></button>`).join('')}</div>`;
    };
    const chosen = s.shown.bd;
    const badges = PG.cat.badges.filter(b => !b.shop || s.badges.includes(b.id)).map(b => {
      const got = s.badges.includes(b.id), on = chosen.includes(b.id);
      return `<button class="pg-bd${on ? ' sel' : ''}${got ? '' : ' lock'}" type="button" data-bd="${b.id}" ${got ? '' : 'disabled'}><span class="e">${got ? b.e : '🔒'}</span><div><b>${esc(b.n)}</b><span>${esc(b.d)}</span></div></button>`;
    }).join('');
    const buffs = [];
    if (s.boost.xp > 0) buffs.push(`<span class="pg-pill">✨ خبرة ×2 · <time data-bx="xp">${fmtT(s.boost.xp)}</time></span>`);
    if (s.boost.coin > 0) buffs.push(`<span class="pg-pill">🪙 عملات ×2 · <time data-bx="coin">${fmtT(s.boost.coin)}</time></span>`);
    if (s.dbl > 0) buffs.push(`<span class="pg-pill">⚡ نقاط مضاعفة ×${s.dbl}</span>`);
    if (s.inv.shield) buffs.push(`<span class="pg-pill">🛡️ درع ×${s.inv.shield}</span>`);
    return `
    <div class="pg-sec pg-box pg-hero-box pf ${eq.pf || ''}">
      <div class="pg-hero">
        <div class="pg-ring t${tier}"><svg viewBox="0 0 100 100"><circle class="bgc" cx="50" cy="50" r="44" fill="none" stroke-width="8"/><circle class="fgc" cx="50" cy="50" r="44" fill="none" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - frac)).toFixed(1)}"/></svg><div class="lvn"><div><b>${s.lv}</b><span>المستوى</span></div></div></div>
        <div style="min-width:0"><div class="pg-name">${nameP}</div><div class="pg-xp">${s.need ? `${nf(s.cur)} / ${nf(s.need)} خبرة للمستوى ${s.lv + 1}` : 'وصلت لأعلى مستوى 👑'}</div></div>
      </div>
      ${buffs.length ? `<div class="pg-active">${buffs.join('')}</div>` : ''}
      <div class="pg-stats">
        <div class="pg-st"><b>🪙 ${nf(s.coins)}</b><span>عملاتك</span></div>
        <div class="pg-st"><b>🔥 ${s.streak}</b><span>السلسلة${s.best > s.streak ? ' (أفضل ' + s.best + ')' : ''}</span></div>
        <div class="pg-st"><b>✅ ${nf(s.s.a)}</b><span>إجابات صحيحة</span></div>
        <div class="pg-st"><b>🏆 ${nf(s.s.w)}</b><span>جولات فزتها</span></div>
        <div class="pg-st"><b>⚡ ${nf(s.s.f)}</b><span>إجابات سريعة</span></div>
        <div class="pg-st"><b>🧩 ${nf(s.s.dc)}</b><span>تحديات منجزة</span></div>
        <div class="pg-st"><b>🎯 ${ratio(s.s)}%</b><span>الدقة</span></div>
        <div class="pg-st"><b>⏱️ ${s.s.bt ? (s.s.bt / 1000).toFixed(2) + ' ث' : '—'}</b><span>أسرع إجابة</span></div>
        <div class="pg-st"><b>📅 ${days}</b><span>يوم معنا</span></div>
      </div>
      ${s.next ? `<div class="pg-next">🎁 المستوى <b>${s.next.lv}</b> بيفتحلك: ${esc(s.next.n)}</div>` : ''}
      ${s.ow ? '<button class="pg-buy" type="button" data-editme style="width:100%;margin-top:10px">🛠️ تعديل ملفي وإحصائياتي (الأدمن الأساسي)</button>' : ''}
    </div>
    <div class="pg-sec"><h4>🏷️ اللقب <small>بيظهر جنب اسمك</small></h4><div class="pg-chips">${titles}</div></div>
    <div class="pg-sec"><h4>✨ تأثير الاسم</h4><div class="pg-chips">${glows}</div></div>
    <div class="pg-sec"><h4>🎨 لون الاسم</h4>${pickRow('nc')}</div>
    <div class="pg-sec"><h4>🔰 إطار المستوى</h4>${pickRow('cf')}</div>
    <div class="pg-sec"><h4>💬 لون رسائلك بالشات</h4>${pickRow('cc')}</div>
    <div class="pg-sec"><h4>🖼️ خلفية ملفك</h4>${pickRow('pf')}</div>
    <div class="pg-sec"><h4>🎖️ الشارات <small>${chosen.length}/3 ظاهرة</small></h4><div class="pg-badges">${badges}</div></div>`;
  }

  function viewHtml() {
    if (!viewData) return '<div class="pg-box" style="text-align:center;margin-top:14px">جاري التحميل…</div>';
    if (viewData.gone) return '<div class="pg-box" style="text-align:center;margin-top:14px">اللاعب مو موجود حالياً</div>';
    const d = viewData, tier = tierOf(d.lv), C = 2 * Math.PI * 44, frac = d.need ? d.cur / d.need : 1;
    const nameP = nameHtml(d.name, d.name, d.color, d.fx, d.meta);
    const days = Math.max(1, Math.ceil((Date.now() - (d.js || Date.now())) / 86400e3));
    const bd = (d.badges || []).map(id => catBadge(id)).filter(Boolean).map(b => `<span class="pg-bchip">${b.e} ${esc(b.n)}</span>`).join('');
    return `
    <div class="pg-sec pg-box pg-hero-box pf ${d.pf || ''}">
      <div class="pg-hero">
        <div class="pg-ring t${tier}"><svg viewBox="0 0 100 100"><circle class="bgc" cx="50" cy="50" r="44" fill="none" stroke-width="8"/><circle class="fgc" cx="50" cy="50" r="44" fill="none" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - frac)).toFixed(1)}"/></svg><div class="lvn"><div><b>${d.lv}</b><span>المستوى</span></div></div></div>
        <div style="min-width:0"><div class="pg-name">${nameP}</div><div class="pg-xp">نقاطه بالجولة: ${nf(d.score)} · فوز: ${nf(d.wins)}</div></div>
      </div>
      <div class="pg-stats">
        <div class="pg-st"><b>🔥 ${d.streak}</b><span>السلسلة${d.best > d.streak ? ' (أفضل ' + d.best + ')' : ''}</span></div>
        <div class="pg-st"><b>✅ ${nf(d.s.a)}</b><span>إجابات صحيحة</span></div>
        <div class="pg-st"><b>🏆 ${nf(d.s.w)}</b><span>جولات فاز بها</span></div>
        <div class="pg-st"><b>⚡ ${nf(d.s.f)}</b><span>إجابات سريعة</span></div>
        <div class="pg-st"><b>🎯 ${ratio(d.s)}%</b><span>الدقة</span></div>
        <div class="pg-st"><b>📅 ${days}</b><span>يوم باللعبة</span></div>
      </div>
    </div>
    <div class="pg-sec"><h4>🎖️ الشارات <small>${(d.badges || []).length}</small></h4>${bd ? `<div class="pg-badgelist">${bd}</div>` : '<div class="pg-hint">ما كسب شارات بعد</div>'}</div>`;
  }

  // ---------- التفاعل ----------
  const BUY_ERR = { coins: 'عملاتك ما بتكفي 🪙', level: 'لازم توصل لمستوى أعلى 🔒', owned: 'عندك هالغرض أصلاً', max: 'وصلت للحد الأقصى', nobuy: 'هالغرض هدية من المسار', none: 'غرض غير موجود' };
  const USE_ERR = { empty: 'ما عندك منها', max: 'مفعّلة بالحد الأقصى', target: 'اختر لاعب صح', immune: 'ما بتقدر تجمّد الأدمن', already: 'هو مجمّد أصلاً', cooldown: 'استنى كم ثانية قبل التجميد الجاي', auto: 'بتشتغل لحالها' };
  function buy(id) {
    const it = shopItem(id);
    socket.emit('store:buy', { id }, (r) => {
      if (!r || !r.ok) { showToast('⚠️ ' + (BUY_ERR[r && r.reason] || 'تعذّر الشراء') + (r && r.lv ? ` (مستوى ${r.lv})` : '')); return; }
      chime();
      showToast(`✅ اشتريت «${it ? it.n : ''}»`, true);
    });
  }
  function handleUse(r) {
    if (!r || !r.ok) { showToast('⚠️ ' + (USE_ERR[r && r.reason] || 'ما قدرت أستخدمها')); return; }
    if (r.prize) fanfare(); else chime();
    showToast(r.t || 'تم', true);
  }
  function pickTarget() {
    const others = (PG.players || []).filter(p => p.id !== playerId && !p.isAdmin);
    const box = document.createElement('div');
    box.className = 'pg-picker';
    box.innerHTML = `<h4>❄️ مين بدك تجمّد؟</h4><div class="list">${others.map(p => `<button class="p" type="button" data-t="${esc(p.id)}">${esc(p.rawName || p.name)}</button>`).join('') || '<div class="pg-hint">ما في لاعبين غيرك حالياً</div>'}</div><button class="x" type="button">إلغاء</button>`;
    $('.pg-card', ov).appendChild(box);
    box.querySelector('.x').onclick = () => box.remove();
    box.querySelectorAll('[data-t]').forEach(b => { b.onclick = () => { box.remove(); socket.emit('store:use', { id: 'ice', target: b.dataset.t }, handleUse); }; });
  }
  function useItem(id) {
    if (id === 'ice') return pickTarget();
    socket.emit('store:use', { id }, handleUse);
  }
  function fetchView() {
    socket.emit('profile:view', { playerId: viewId }, (res) => {
      viewData = res && res.ok ? res.p : { gone: true };
      if (isOpen() && tab === 'view') render();
    });
  }
  playersList.addEventListener('click', (e) => {
    const b = e.target.closest('.pg-pbtn');
    if (!b || !b.dataset.pv) return;
    if (b.dataset.pv === playerId) openPanel('profile'); else openPanel('view', b.dataset.pv);
  });

  function bindEquip() {
    const body = $('#pg-body');
    body.querySelectorAll('[data-eq]').forEach(b => b.addEventListener('click', () => {
      const i = b.dataset.eq.indexOf('|');
      socket.emit('profile:equip', { [b.dataset.eq.slice(0, i)]: b.dataset.eq.slice(i + 1) });
    }));
    body.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => { storeCat = b.dataset.goto; tab = 'store'; render(); }));
  }
  function bindProfile() {
    bindEquip();
    const em = $('#pg-body').querySelector('[data-editme]');
    if (em) em.addEventListener('click', () => {
      const me = (PG.players || []).find(p => p.id === playerId) || {};
      closePanel();
      if (window.__openProgEditor) window.__openProgEditor(playerId, me.rawName || me.name || 'أنا');
    });
    $('#pg-body').querySelectorAll('[data-bd]').forEach(b => b.addEventListener('click', () => {
      const cur = PG.state.shown.bd.slice(), id = b.dataset.bd, i = cur.indexOf(id);
      if (i >= 0) cur.splice(i, 1);
      else { if (cur.length >= 3) cur.shift(); cur.push(id); }
      socket.emit('profile:equip', { bd: cur });
    }));
  }
  function bindStore() {
    bindEquip();
    const body = $('#pg-body');
    body.querySelectorAll('[data-cat]').forEach(x => x.addEventListener('click', () => { storeCat = x.dataset.cat; render(); }));
    body.querySelectorAll('[data-buy]').forEach(x => x.addEventListener('click', () => buy(x.dataset.buy)));
    body.querySelectorAll('[data-use]').forEach(x => x.addEventListener('click', () => useItem(x.dataset.use)));
  }

  function bindDaily() {
    const btn = $('#pg-spin');
    if (btn) btn.addEventListener('click', doSpin);
  }

  function doSpin() {
    if (spinning || !PG.state || !PG.state.wheel.can) return;
    audio();
    spinning = true;
    const btn = $('#pg-spin'); btn.disabled = true; btn.textContent = '🎡 ...';
    socket.emit('wheel:spin', {}, (res) => {
      if (!res || !res.ok) { spinning = false; socket.emit('progress:get'); return; }
      const wheel = $('#pg-wheel'), n = PG.cat.wheel.length, step = 360 / n;
      const jitter = (Math.random() - 0.5) * step * 0.6;
      PG.rot = (PG.rot || 0) - ((PG.rot || 0) % 360) + 360 * 6 - res.index * step + jitter;
      wheel.classList.add('spin');
      wheel.style.transform = `rotate(${PG.rot}deg)`;
      let lastSec = -1;
      const loop = () => {
        if (!spinning) return;
        const m = new DOMMatrix(getComputedStyle(wheel).transform);
        const ang = (Math.atan2(m.b, m.a) * 180 / Math.PI + 360) % 360;
        const secIdx = Math.floor((((360 - ang) + step / 2) % 360) / step);
        if (lastSec !== -1 && secIdx !== lastSec) tick();
        lastSec = secIdx;
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      setTimeout(() => finishSpin(res), reduceMotionPg() ? 1300 : 5400);
    });
  }
  const reduceMotionPg = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function finishSpin(res) {
    spinning = false;
    chime();
    const r = $('#pg-result');
    if (r) { r.innerHTML = `🎉 ربحت ${esc(res.prize.i)} ${esc(res.prize.n || res.prize.t)}!`; r.classList.add('pop'); }
    if (held.state) { PG.state = held.state; PG.at = Date.now(); held.state = null; }
    const q = held.toasts.splice(0); q.forEach(t => (t.lvl ? showLevelUp(t.lvl) : showToast(t.t, t.big)));
    refreshButtons();
    if (isOpen()) { const keep = r && r.innerHTML; render(); const rr = $('#pg-result'); if (rr && keep) { rr.innerHTML = keep; rr.classList.add('pop'); } }
  }

  // ---------- إشعارات ----------
  function showToast(t, big) {
    if (spinning) { held.toasts.push({ t, big }); return; }
    toastBox.classList.add('on'); topLayerShow(toastBox);
    const d = document.createElement('div');
    d.className = 'pg-toast' + (big ? ' big' : '');
    d.textContent = t;
    toastBox.appendChild(d);
    setTimeout(() => { d.remove(); if (!toastBox.children.length) { toastBox.classList.remove('on'); topLayerHide(toastBox); } }, 3700);
  }
  function showLevelUp(d) {
    if (spinning) { held.toasts.push({ lvl: d }); return; }
    toastBox.classList.add('on'); topLayerShow(toastBox);
    const el = document.createElement('div');
    el.className = 'pg-lvup';
    const ups = (d.ups || []).map(u => `🎁 ${esc(u)}`).join('<br>');
    el.innerHTML = `<div class="u">⬆️ مستوى جديد</div><div class="n">${d.lv}</div>${ups ? `<div class="r">${ups}<br><small>فعّله من «ملفي»</small></div>` : ''}${d.coins ? `<div class="r">+${d.coins} 🪙</div>` : ''}`;
    const colors = ['#fbbf24', '#f472b6', '#a78bfa', '#34d399', '#60a5fa', '#fb923c'];
    for (let i = 0; i < 26; i++) {
      const c = document.createElement('i'); c.className = 'pg-conf';
      const a = Math.random() * Math.PI * 2, r = 70 + Math.random() * 90;
      c.style.cssText = `background:${colors[i % colors.length]};--dx:${Math.cos(a) * r}px;--dy:${Math.sin(a) * r - 20}px;--rt:${Math.random() * 720 - 360}deg;animation-delay:${Math.random() * .15}s`;
      el.appendChild(c);
    }
    toastBox.appendChild(el);
    fanfare();
    setTimeout(() => { el.remove(); if (!toastBox.children.length) { toastBox.classList.remove('on'); topLayerHide(toastBox); } }, 4700);
  }
  function floatXp(n) {
    const ref = $('#points-display'); if (!ref) return;
    const r = ref.getBoundingClientRect();
    const f = document.createElement('div');
    f.className = 'pg-xpfloat'; f.textContent = `+${n} ✨`;
    f.style.left = `${r.left + r.width / 2 - 24}px`; f.style.top = `${r.top - 6}px`;
    document.body.appendChild(f); topLayerShow(f);
    setTimeout(() => f.remove(), 1400);
  }

  function refreshButtons() {
    const s = PG.state; if (!s) return;
    bDaily.querySelector('.pg-dot').classList.toggle('on', !!s.wheel.can);
    bProfile.querySelector('.pg-lvtag').textContent = `Lv.${s.lv}`;
  }

  // ---------- أحداث السيرفر ----------
  socket.on('progress:catalog', (c) => {
    PG.cat = c;
    if (PG.players) updatePlayersList(PG.players);
    if (isOpen()) render();
  });
  socket.on('progress:state', (s) => {
    if (spinning) { held.state = s; return; }
    const old = PG.state;
    PG.state = s; PG.at = Date.now();
    if (old && s.xp > old.xp && !isOpen()) floatXp(s.xp - old.xp);
    refreshButtons();
    if (isOpen()) render();
  });
  socket.on('progress:toast', (d) => showToast(d.t, d.big));
  socket.on('progress:levelup', (d) => showLevelUp(d));
  socket.on('updatePlayers', () => { if (isOpen() && tab === 'profile' && !spinning) render(); });
  window.PG_CATALOG = () => PG.cat;
})();

// ============================================================
// 📊 محرر التقدم والإحصائيات والسلسلة — للأدمن الأساسي فقط
// (السيرفر بيرفض أي طلب من غير الأدمن الأساسي)
// ============================================================
(function () {
  const ov = document.createElement('div');
  ov.id = 'apg-overlay';
  ov.setAttribute('popover', 'manual');
  document.body.appendChild(ov);
  const esc = (v) => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const FIELDS = [['lv', 'المستوى'], ['xp', 'الخبرة (XP)'], ['coins', 'العملات'], ['bs', 'أفضل سلسلة'],
    ['a', 'إجابات صحيحة'], ['w', 'جولات فاز بها'], ['f', 'إجابات سريعة'], ['dc', 'تحديات منجزة'],
    ['sp', 'لفّات العجلة'], ['wr', 'إجابات خاطئة'], ['bt', 'أسرع إجابة (ms)'], ['score', 'نقاط الجولة (مؤقتة)'], ['wins', 'فوز الجلسة (مؤقت)']];
  let pid = null, pname = '', D = null;
  const read = (d) => ({ lv: d.lv, xp: d.xp, coins: d.coins, bs: d.bs, a: d.s.a, w: d.s.w, f: d.s.f, dc: d.s.dc, sp: d.s.sp, wr: d.s.wr, bt: d.s.bt, score: d.score, wins: d.wins });

  function close() { ov.classList.remove('apg-open'); topLayerHide(ov); }
  function note(t) { const n = ov.querySelector('.apg-note.live'); if (n) n.textContent = t; }
  function call(ev, data, okMsg) {
    socket.emit(ev, Object.assign({ playerId: pid }, data), (r) => {
      if (!r || !r.ok) { note('⚠️ ما انحفظ (لازم تكون الأدمن الأساسي واللاعب موجود)'); return; }
      D = r.d; draw(); note(okMsg || '✅ تم');
    });
  }
  function draw() {
    if (!D) { ov.innerHTML = '<div class="apg-card"><div class="apg-head"><h3>📊 جاري التحميل…</h3><button type="button" data-x>✕</button></div></div>'; ov.querySelector('[data-x]').onclick = close; return; }
    const cat = (window.PG_CATALOG && window.PG_CATALOG()) || null;
    const badges = cat ? cat.badges : [], shop = cat ? cat.shop : [];
    const v = read(D);
    ov.innerHTML = `
    <div class="apg-card" role="dialog" aria-modal="true">
      <div class="apg-head"><h3>📊 تقدّم اللاعب: ${esc(D.name)}</h3><button type="button" data-x aria-label="إغلاق">✕</button></div>
      <div class="apg-note">للأدمن الأساسي فقط · التغييرات بتنحفظ على حساب اللاعب وبتضل حتى لو السيرفر طفى (ما عدا «نقاط الجولة» و«فوز الجلسة» لأنها بتتصفّر بطبيعة اللعبة)</div>
      <div class="apg-sec"><b>🔥 السلسلة الحالية: ${D.streak} يوم</b>
        <div class="apg-row">
          <button type="button" data-sa="1">+1</button><button type="button" data-sa="3">+3</button><button type="button" data-sa="7">+7</button><button type="button" data-sa="30">+30</button><button type="button" data-sa="-1">−1</button>
          <input class="apg-in" id="apg-sset" type="number" min="0" max="3650" placeholder="رقم" style="width:80px">
          <button type="button" class="apg-btn ok" data-sset>تعيين</button>
          <button type="button" class="apg-btn bad" data-sa0>تصفير</button>
        </div></div>
      <div class="apg-sec"><b>📈 الإحصائيات</b>
        <div class="apg-grid">${FIELDS.map(f => `<label>${f[1]}<input type="number" min="0" data-f="${f[0]}" value="${v[f[0]] == null ? 0 : v[f[0]]}"></label>`).join('')}</div>
        <div class="apg-row" style="margin-top:8px"><button type="button" class="apg-btn ok" data-save>💾 حفظ الإحصائيات</button></div>
        <div class="apg-note">صرف اللاعب الكلي: 🪙 ${D.spent || 0} · الشارات: ${D.badges.length} · الأغراض: ${D.own.length}</div></div>
      <div class="apg-sec"><b>🎖️ الشارات</b>
        <div class="apg-row"><select class="apg-sel" id="apg-bd">${badges.map(b => `<option value="${esc(b.id)}">${b.e} ${esc(b.n)}</option>`).join('')}</select>
          <button type="button" class="apg-btn ok" data-gb="1">منح</button><button type="button" class="apg-btn bad" data-gb="0">سحب</button></div>
        <div class="apg-chips">${D.badges.map(id => { const b = badges.find(x => x.id === id); return b ? `<span class="apg-chip" data-rb="${esc(id)}" title="اضغط للسحب">${b.e} ${esc(b.n)}</span>` : ''; }).join('') || '<span class="apg-note">ما عنده شارات</span>'}</div></div>
      <div class="apg-sec"><b>🎁 الأغراض</b>
        <div class="apg-row"><select class="apg-sel" id="apg-it">${shop.map(i => `<option value="${esc(i.id)}">${i.e ? i.e + ' ' : ''}${esc(i.n)}</option>`).join('')}</select>
          <input class="apg-in" id="apg-qty" type="number" min="1" max="99" value="1" style="width:64px">
          <button type="button" class="apg-btn ok" data-gi="1">منح</button><button type="button" class="apg-btn bad" data-gi="0">سحب</button></div>
        <div class="apg-chips">${D.own.map(id => { const i = shop.find(x => x.id === id); return i ? `<span class="apg-chip" data-ri="${esc(id)}" title="اضغط للسحب">${esc(i.n)}</span>` : ''; }).join('')}${Object.keys(D.inv).map(id => { const i = shop.find(x => x.id === id); return i ? `<span class="apg-chip" data-ri="${esc(id)}" title="اضغط لسحب واحد">${i.e} ${esc(i.n)} ×${D.inv[id]}</span>` : ''; }).join('') || ''}</div></div>
      <div class="apg-sec"><b>⚠️ تصفير كامل</b>
        <div class="apg-row"><button type="button" class="apg-btn bad" data-reset>🗑️ تصفير كل تقدّم اللاعب</button></div></div>
      <div class="apg-note live"></div>
    </div>`;
    const q = (s) => ov.querySelectorAll(s);
    ov.querySelector('[data-x]').onclick = close;
    q('[data-sa]').forEach(b => b.onclick = () => call('admin:prog:streak', { add: Number(b.dataset.sa) }, '✅ تم تعديل السلسلة'));
    ov.querySelector('[data-sset]').onclick = () => { const n = ov.querySelector('#apg-sset').value; if (n !== '') call('admin:prog:streak', { set: Number(n) }, '✅ تم تعيين السلسلة'); };
    ov.querySelector('[data-sa0]').onclick = () => call('admin:prog:streak', { set: 0 }, '✅ تم تصفير السلسلة');
    ov.querySelector('[data-save]').onclick = () => {
      const set = {};
      ov.querySelectorAll('[data-f]').forEach(i => { if (i.value !== '' && Number(i.value) !== v[i.dataset.f]) set[i.dataset.f] = Number(i.value); });
      if (set.lv !== undefined) delete set.xp;                          // المستوى أقوى من الخبرة لو تغيّروا سوا
      if (!Object.keys(set).length) { note('ما في تغييرات'); return; }
      call('admin:prog:set', { set }, '✅ انحفظت الإحصائيات');
    };
    q('[data-gb]').forEach(b => b.onclick = () => call('admin:prog:grant', { kind: 'badge', id: ov.querySelector('#apg-bd').value, give: b.dataset.gb === '1' }, '✅ تم'));
    q('[data-rb]').forEach(b => b.onclick = () => call('admin:prog:grant', { kind: 'badge', id: b.dataset.rb, give: false }, '✅ انسحبت الشارة'));
    q('[data-gi]').forEach(b => b.onclick = () => call('admin:prog:grant', { kind: 'item', id: ov.querySelector('#apg-it').value, qty: Number(ov.querySelector('#apg-qty').value) || 1, give: b.dataset.gi === '1' }, '✅ تم'));
    q('[data-ri]').forEach(b => b.onclick = () => call('admin:prog:grant', { kind: 'item', id: b.dataset.ri, qty: 1, give: false }, '✅ انسحب الغرض'));
    ov.querySelector('[data-reset]').onclick = () => { if (confirm(`تصفير كل تقدّم «${pname}» (مستوى، عملات، أغراض، شارات، سلسلة)؟`)) call('admin:prog:reset', {}, '✅ انصفّر التقدّم'); };
  }
  ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ov.classList.contains('apg-open')) close(); });

  window.__openProgEditor = function (id, name) {
    pid = id; pname = name || ''; D = null;
    ov.classList.add('apg-open'); topLayerShow(ov); draw();
    socket.emit('admin:prog:get', { playerId: id }, (r) => {
      if (!r || !r.ok) { ov.innerHTML = '<div class="apg-card"><div class="apg-head"><h3>⚠️ غير متاح</h3><button type="button" data-x>✕</button></div><div class="apg-note">هالأداة للأدمن الأساسي فقط واللاعب لازم يكون موجود.</div></div>'; ov.querySelector('[data-x]').onclick = close; return; }
      D = r.d; draw();
    });
  };
})();

// ============================================================
// 📖 كتاب القائمة: كل أزرار القائمة جوّا كتاب تقليدي (غلاف عليه زر الشات، وبيفتح صفحتين، 4 أزرار بكل صفحة)
// بنحرّك نفس الأزرار الأصلية جوّا الكتاب (فبتضل كل وظائفها شغالة)، وما بنغيّر شي بباقي اللعبة
// ============================================================
(function () {
  const controls = document.querySelector('.controls');
  const chat = document.getElementById('btn-chat');
  if (!controls || !chat) return;
  const admin = document.getElementById('btn-admin-auth');
  const PER = 4;
  const ORDER = ['btn-daily', 'btn-pass', 'btn-profile', 'btn-store', 'btn-change-name', 'btn-instructions', 'btn-open-board', 'dark-mode-toggle', 'btn-theme-toggle'];
  const rank = (b) => { const i = ORDER.indexOf(b.id); return i < 0 ? 100 : i; };
  const btns = [...controls.querySelectorAll('.btn-main')].filter(b => b !== chat && b !== admin).sort((a, b) => rank(a) - rank(b));
  if (!btns.length) return;
  const pages = [];
  for (let i = 0; i < btns.length; i += PER) pages.push(btns.slice(i, i + PER));
  const P = pages.length, N = 1 + Math.ceil((P - 1) / 2), MAXS = Math.ceil(P / 2);
  const ar = (n) => Number(n).toLocaleString('ar-EG');
  const FLIP_MS = 950;

  // ---------- الستايل ----------
  const grain = (r, g, b, a, f) => `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${f}' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  0 0 0 ${a} 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;
  const st = document.createElement('style');
  st.textContent = `
  #bk-root { flex: 1 1 100%; width: 100%; --W: clamp(138px, calc(50vw - 34px), 234px); --H: calc(var(--W) * 1.62); direction: ltr; user-select: none; -webkit-tap-highlight-color: transparent; }
  #bk-root .bk-stage { position: relative; overflow-x: clip; display: flex; justify-content: center; width: 100%; height: calc(var(--H) + 30px); padding-top: 24px; box-sizing: border-box; }
  #bk-root .bk-book { position: relative; width: var(--W); height: var(--H); perspective: 1700px; perspective-origin: 100% 40%; transition: transform ${FLIP_MS}ms cubic-bezier(.5, .05, .25, 1); }
  #bk-root .bk-book.open { transform: translateX(calc(var(--W) / -2)); }
  /* ظلّ الكتاب على الطاولة */
  #bk-root .bk-book::before { content: ''; position: absolute; left: -6px; right: -6px; bottom: -14px; height: 26px; background: radial-gradient(ellipse at center, rgba(0,0,0,.5), transparent 70%); filter: blur(5px); transition: transform ${FLIP_MS}ms cubic-bezier(.5,.05,.25,1); }
  #bk-root .bk-book::before { transform-origin: 0% 50%; }
  #bk-root .bk-book.open::before { transform: scaleX(1.98); }
  /* الصفحة الأخيرة اللي تحت كل الورقات + لوح الغلاف الخلفي */
  #bk-root .bk-board { position: absolute; left: -7px; top: -5px; width: calc(100% + 7px); height: calc(100% + 10px); border-radius: 8px 3px 3px 8px; background: ${grain(0, 0, 0, .35, '.8')}, var(--cov-tex), linear-gradient(135deg, var(--cov2), var(--cov3)); box-shadow: 0 10px 26px rgba(0,0,0,.55), inset 0 0 0 1px var(--foil2); opacity: 0; transition: opacity .5s .2s; }
  #bk-root .bk-book.open .bk-board { opacity: 1; }
  #bk-root .bk-leaf { position: absolute; left: 0; top: 0; width: 100%; height: 100%; transform-origin: 100% 50%; transform-style: preserve-3d; transition: transform ${FLIP_MS}ms cubic-bezier(.5, .05, .25, 1); }
  #bk-root .bk-leaf.flipped { transform: rotateY(180deg); }
  #bk-root .bk-book:not(.open) .bk-leaf.l0:hover { transform: rotateY(9deg); cursor: pointer; }
  #bk-root .bk-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; box-sizing: border-box; overflow: hidden; }
  #bk-root .bk-face.back { transform: rotateY(180deg); }
  #bk-root .bk-leaf:not(.flipped) .bk-face.back, #bk-root .bk-leaf.flipped .bk-face.front { pointer-events: none; }
  /* ---- الورق ---- */
  #bk-root .bk-page { display: flex; flex-direction: column; direction: rtl; padding: calc(var(--W) * .07) calc(var(--W) * .07) 6px; color: var(--ink);
    background: ${grain(.45, .3, .1, .3, '.7')}, radial-gradient(ellipse at 50% 40%, var(--paper1), var(--paper2) 70%, var(--paper3)); }
  #bk-root .bk-face.front.bk-page { border-radius: 4px 0 0 4px; padding-right: calc(var(--W) * .12); box-shadow: -2px 0 0 #f4ead0, -4px 0 0 #d9c99f, -5px 0 0 #efe3c2; }
  #bk-root .bk-face.back.bk-page { border-radius: 0 4px 4px 0; padding-left: calc(var(--W) * .12); }
  #bk-root .bk-face.front.bk-page::before { content: ''; position: absolute; top: 0; bottom: 0; right: 0; width: 16%; background: linear-gradient(to left, rgba(90, 55, 15, .42), rgba(90, 55, 15, .12) 45%, transparent); pointer-events: none; }
  #bk-root .bk-face.back.bk-page::before { content: ''; position: absolute; top: 0; bottom: 0; left: 0; width: 16%; background: linear-gradient(to right, rgba(90, 55, 15, .42), rgba(90, 55, 15, .12) 45%, transparent); pointer-events: none; }
  #bk-root .bk-face.bk-cover-back { border-right: 6px solid var(--cov3); border-top: 5px solid var(--cov3); border-bottom: 5px solid var(--cov3); box-shadow: inset 0 0 0 1px var(--foil3); }
  /* حركة ظلّ الورقة وقت الانقلاب */
  #bk-root .bk-face::after { content: ''; position: absolute; inset: 0; opacity: 0; pointer-events: none; background: linear-gradient(90deg, rgba(0,0,0,.5), rgba(0,0,0,.05) 70%); }
  #bk-root .bk-leaf.turning .bk-face::after { animation: bkShade ${FLIP_MS}ms ease-in-out; }
  @keyframes bkShade { 0%, 100% { opacity: 0; } 50% { opacity: .55; } }
  #bk-root .bk-orn { text-align: center; color: var(--foil3); font-size: .72rem; letter-spacing: .35em; line-height: 1; padding: 1px 0 calc(var(--W) * .03); border-bottom: 1px solid color-mix(in srgb, var(--foil3) 45%, transparent); margin-bottom: calc(var(--W) * .035); }
  #bk-root .bk-grid { flex: 1; min-height: 0; display: grid; grid-template-rows: repeat(${PER}, 1fr); gap: calc(var(--W) * .035); }
  #bk-root .bk-foot { display: flex; align-items: center; justify-content: space-between; gap: 4px; height: 22px; margin-top: 5px; font-size: .7rem; color: var(--ink); }
  #bk-root .bk-foot .no { font-weight: 700; letter-spacing: .05em; }
  #bk-root .bk-nav { all: unset; box-sizing: border-box; cursor: pointer; padding: 2px 9px; border-radius: 99px; font: 700 .68rem/1.5 inherit; color: var(--ink); background: color-mix(in srgb, var(--foil2) 18%, transparent); border: 1px solid color-mix(in srgb, var(--foil3) 60%, transparent); transition: background .2s, transform .15s; }
  #bk-root .bk-nav:hover { background: color-mix(in srgb, var(--foil2) 45%, transparent); transform: translateY(-1px); }
  #bk-root .bk-nav:focus-visible { outline: 2px solid var(--foil2); }
  /* ---- أزرار القائمة جوّا الصفحة ---- */
  #bk-root .bk-page .btn-main { all: unset; box-sizing: border-box; position: relative; display: flex; align-items: center; justify-content: center; gap: 4px; text-align: center; cursor: pointer; min-width: 0; padding: 3px 8px;
    font: 700 .76rem/1.25 'Segoe UI', Tahoma, sans-serif; color: var(--btntext); border-radius: 9px; text-shadow: 0 1px 1px rgba(0,0,0,.6);
    background: ${grain(0, 0, 0, .3, '.9')}, linear-gradient(160deg, var(--btn1), var(--btn2) 60%, var(--btn3));
    border: 1px solid var(--foil2); box-shadow: inset 0 0 0 2px var(--btn3), inset 0 0 0 3px color-mix(in srgb, var(--foil2) 55%, transparent), 0 2px 5px rgba(60, 30, 5, .45);
    transition: transform .15s ease, box-shadow .2s ease, filter .2s ease; }
  #bk-root .bk-page .btn-main:hover, #bk-root .bk-page .btn-main:focus-visible { transform: translateY(-2px) scale(1.02); filter: brightness(1.18); box-shadow: inset 0 0 0 2px var(--btn3), inset 0 0 0 3px var(--foil1), 0 5px 10px rgba(60, 30, 5, .55), 0 0 12px var(--glow); outline: none; }
  #bk-root .bk-page .btn-main:active { transform: translateY(1px) scale(.98); }
  #bk-root .bk-page .btn-main .pg-dot { top: 4px; right: 5px; }
  /* ---- الغلاف ---- */
  #bk-root .bk-cover { background: var(--cov-tex), radial-gradient(ellipse at 30% 20%, var(--cov1), var(--cov2) 55%, var(--cov3)); border-radius: 5px 3px 3px 5px; box-shadow: 0 8px 22px rgba(0,0,0,.55), inset 0 0 0 1px var(--foil3), inset 0 0 22px rgba(0,0,0,.55); cursor: pointer; }
  #bk-root .bk-cover::before { content: ''; position: absolute; inset: 7px 20px 7px 7px; border: 1.5px solid var(--foil2); border-radius: 3px; box-shadow: inset 0 0 0 3px rgba(0,0,0,.25), inset 0 0 0 4px color-mix(in srgb, var(--foil2) 50%, transparent); pointer-events: none; }
  #bk-root .bk-spine { position: absolute; top: 0; bottom: 0; right: 0; width: 15px; border-radius: 0 3px 3px 0; background: repeating-linear-gradient(0deg, transparent 0 22px, rgba(217,164,65,.0) 22px 23px), linear-gradient(90deg, rgba(0,0,0,.45), rgba(255,255,255,.1) 38%, rgba(0,0,0,.5)); box-shadow: inset 1px 0 0 var(--foil3); }
  #bk-root .bk-spine::before, #bk-root .bk-spine::after { content: ''; position: absolute; left: 1px; right: 1px; height: 2px; background: linear-gradient(90deg, var(--foil3), var(--foil1), var(--foil3)); }
  #bk-root .bk-spine::before { top: 16%; } #bk-root .bk-spine::after { bottom: 16%; }
  #bk-root .bk-corner { color: var(--foil2); position: absolute; width: calc(var(--W) * .17); height: calc(var(--W) * .17); pointer-events: none; }
  #bk-root .bk-corner.tl { top: 8px; left: 8px; } #bk-root .bk-corner.tr { top: 8px; right: 23px; transform: scaleX(-1); }
  #bk-root .bk-corner.bl { bottom: 8px; left: 8px; transform: scaleY(-1); } #bk-root .bk-corner.br { bottom: 8px; right: 23px; transform: scale(-1, -1); }
  #bk-root .bk-emblem { position: absolute; left: 50%; top: 53%; width: 58%; transform: translate(-60%, -50%); filter: drop-shadow(0 1px 1px rgba(0,0,0,.7)); pointer-events: none; }
  #bk-root .bk-halo { position: absolute; left: 50%; top: 53%; width: 78%; aspect-ratio: 1; transform: translate(-60%, -50%); border-radius: 50%; background: radial-gradient(circle, var(--glow), transparent 68%); animation: bkHalo 3.6s ease-in-out infinite; pointer-events: none; }
  @keyframes bkHalo { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
  #bk-root .bk-title { position: absolute; left: 0; right: 15px; bottom: 11%; text-align: center; font: 800 calc(var(--W) * .082)/1.2 'Segoe UI', Tahoma, sans-serif; letter-spacing: .02em; background: linear-gradient(180deg, var(--foil1), var(--foil2) 60%, var(--foil3)); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 1px 0 rgba(0,0,0,.6)); pointer-events: none; }
  #bk-root .bk-title small { display: block; margin-top: 2px; font-size: .62em; font-weight: 600; opacity: .85; animation: bkHint 2.4s ease-in-out infinite; }
  @keyframes bkHint { 0%, 100% { opacity: .45; } 50% { opacity: 1; } }
  /* ---- زر الشات: لوحة ذهبية على الغلاف، وبتصير علّامة قراءة (شريط) فوق الكتاب لما يفتح ---- */
  #bk-root .bk-chat { all: unset; box-sizing: border-box; position: absolute; z-index: 500; left: calc(var(--W) * .5); top: calc(var(--W) * .1); width: calc(var(--W) * .66); height: 38px; margin-left: calc(var(--W) * -.33); display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer;
    font: 800 .92rem/1 'Segoe UI', Tahoma, sans-serif; color: var(--cov3); border-radius: 9px; text-shadow: 0 1px 0 rgba(255,255,255,.45);
    background: linear-gradient(180deg, var(--foil1), var(--foil2) 55%, var(--foil3)); border: 1px solid var(--foil1); box-shadow: 0 3px 8px rgba(0,0,0,.55), inset 0 -3px 6px rgba(0,0,0,.3), 0 0 14px var(--glow);
    clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 100%, 0 100%);
    transition: left ${FLIP_MS}ms cubic-bezier(.5,.05,.25,1), top ${FLIP_MS}ms cubic-bezier(.5,.05,.25,1), width ${FLIP_MS}ms cubic-bezier(.5,.05,.25,1), margin-left ${FLIP_MS}ms cubic-bezier(.5,.05,.25,1), height ${FLIP_MS}ms ease, clip-path ${FLIP_MS}ms ease, filter .2s, transform .15s, background .6s; }
  #bk-root .bk-chat:hover { filter: brightness(1.12); transform: translateY(-1px); }
  #bk-root .bk-chat:focus-visible { outline: 2px solid #fff; }
  #bk-root .bk-book.open .bk-chat { left: var(--W); top: -22px; width: 84px; height: 40px; margin-left: -42px; padding-bottom: 8px; font-size: .78rem; color: var(--btntext); text-shadow: 0 1px 1px rgba(0,0,0,.7);
    background: linear-gradient(180deg, var(--cov1), var(--cov2) 70%, var(--cov3)); border-color: var(--foil2); clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%); }
  #bk-root .bk-chat.notify::after { content: ''; position: absolute; top: 4px; right: 5px; width: 10px; height: 10px; border-radius: 50%; background: #ff3b3b; box-shadow: 0 0 8px #ff3b3b; animation: bkPing 1.1s ease-in-out infinite; }
  @keyframes bkPing { 50% { transform: scale(1.35); opacity: .65; } }
  #bk-root .bk-center { position: absolute; z-index: 400; top: 0; bottom: 0; left: calc(100% - 2px); width: 4px; background: linear-gradient(90deg, rgba(0,0,0,.35), rgba(0,0,0,.05)); opacity: 0; pointer-events: none; transition: opacity .4s .3s; }
  #bk-root .bk-book.open .bk-center { opacity: 1; }
  /* ---- محراب الكتاب: قوس + فوانيس + رف خشب (بيملا الفراغ حوالين الكتاب) ---- */
  #bk-root .bk-stage { margin: 4px 0 0; border-radius: 120px 120px 14px 14px / 70px 70px 14px 14px; padding-bottom: 14px; height: calc(var(--H) + 58px); border: 1.5px solid var(--foil3); border-bottom: 0;
    background: radial-gradient(ellipse at 50% 38%, var(--glow), transparent 62%), var(--pat), linear-gradient(180deg, rgba(0,0,0,.38), rgba(0,0,0,.12) 55%, rgba(0,0,0,.34)); box-shadow: inset 0 0 0 4px rgba(0,0,0,.25), inset 0 0 0 5px color-mix(in srgb, var(--foil3) 45%, transparent), inset 0 14px 40px rgba(0,0,0,.45); }
  #bk-root .bk-shelf { height: 12px; margin: 0 -3px 6px; border-radius: 3px 3px 7px 7px; background: linear-gradient(180deg, var(--foil2), var(--foil3) 45%, var(--cov3)); box-shadow: 0 5px 12px rgba(0,0,0,.5), inset 0 1px 0 var(--foil1); }
  #bk-root .bk-lamp { position: absolute; top: 8px; width: 20px; height: 44px; pointer-events: none; transform-origin: 50% 0; animation: bkSway 5s ease-in-out infinite alternate; }
  #bk-root .bk-lamp.l { left: 12px; } #bk-root .bk-lamp.r { right: 12px; animation-delay: -2.4s; }
  #bk-root .bk-lamp::before { content: ''; position: absolute; left: 9.5px; top: -8px; width: 1px; height: 12px; background: var(--foil2); }
  #bk-root .bk-lamp i { position: absolute; left: 3px; top: 4px; width: 14px; height: 22px; border-radius: 3px 3px 7px 7px; background: linear-gradient(180deg, var(--foil1), #fff6cf 40%, var(--foil2)); border: 1.5px solid var(--foil3); box-shadow: 0 0 14px 4px var(--glow); }
  #bk-root .bk-lamp::after { content: ''; position: absolute; left: 4px; top: 0; width: 12px; height: 6px; border-radius: 6px 6px 0 0; background: var(--foil3); }
  @keyframes bkSway { from { transform: rotate(-4deg); } to { transform: rotate(4deg); } }
  /* ---- لوحة اختيار الثيم على الصفحة الفاضية ---- */
  #bk-root .bk-swatches { grid-column: 1; display: flex; flex-direction: column; min-height: 0; border: 1px dashed color-mix(in srgb, var(--foil3) 70%, transparent); border-radius: 9px; padding: 4px 5px 5px; background: color-mix(in srgb, var(--paper3) 28%, transparent); }
  #bk-root .bk-swatches b { text-align: center; font-size: .66rem; color: var(--foil3); letter-spacing: .04em; margin-bottom: 3px; }
  #bk-root .bk-swgrid { flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(5, 1fr); gap: 3px; align-content: center; justify-items: center; }
  #bk-root .bk-sw { all: unset; box-sizing: border-box; width: 100%; max-width: 30px; aspect-ratio: 1; border-radius: 50%; cursor: pointer; border: 1.5px solid var(--ink); background: linear-gradient(135deg, var(--a) 0 50%, var(--b) 50% 100%); box-shadow: 0 1px 3px rgba(0,0,0,.4); transition: transform .15s; }
  #bk-root .bk-sw:hover { transform: scale(1.12); }
  #bk-root .bk-sw.on { outline: 2px solid var(--foil2); outline-offset: 1px; box-shadow: 0 0 8px var(--glow); }
  #bk-root .bk-blank { flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; margin: 2px 0; border: 1px solid color-mix(in srgb, var(--foil3) 45%, transparent); border-radius: 8px; box-shadow: inset 0 0 0 3px transparent, inset 0 0 0 4px color-mix(in srgb, var(--foil3) 25%, transparent); text-align: center; color: var(--foil3); }
  #bk-root .bk-bemb { display: block; width: 66%; opacity: .6; }
  #bk-root .bk-bemb .bk-emblem { position: static; display: block; width: 100%; transform: none; filter: none; }
  #bk-root .bk-bt { font: 800 calc(var(--W) * .075)/1.3 'Segoe UI', Tahoma, sans-serif; }
  #bk-root .bk-bt small { display: block; margin-top: 2px; font-size: .62em; font-weight: 600; opacity: .85; }
  #bk-root [inert] { pointer-events: none; }
  @media (prefers-reduced-motion: reduce) { #bk-root * { transition-duration: .01ms !important; animation-duration: .01ms !important; } }
  `;
  document.head.appendChild(st);

  // ---------- عناصر زخرفية ----------
  const corner = (cls) => `<svg class="bk-corner ${cls}" viewBox="0 0 40 40" aria-hidden="true"><path d="M3 38 V9 Q3 3 9 3 H38" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M9 38 V15 Q9 9 15 9 H38" fill="none" stroke="currentColor" stroke-width=".8" opacity=".8"/><circle cx="9" cy="9" r="2.6" fill="currentColor"/><path d="M15 15 Q22 15 22 22" fill="none" stroke="currentColor" stroke-width="1"/></svg>`;
  const emblemHtml = () => (window.__themes ? window.__themes.emblem(window.__themes.current.emblem) : '');

  // ---------- بناء الكتاب ----------
  const root = document.createElement('div');
  root.id = 'bk-root';
  const stage = document.createElement('div'); stage.className = 'bk-stage';
  const book = document.createElement('div'); book.className = 'bk-book';
  stage.appendChild(book); root.appendChild(stage);
  stage.insertAdjacentHTML('afterbegin', '<div class="bk-lamp l"><i></i></div><div class="bk-lamp r"><i></i></div>');
  const shelf = document.createElement('div'); shelf.className = 'bk-shelf'; root.appendChild(shelf);
  const board = document.createElement('div'); board.className = 'bk-board'; book.appendChild(board);

  const blankPage = (cls) => { const f = document.createElement('div'); f.className = `bk-face ${cls} bk-page`; f.innerHTML = `<div class="bk-orn">❧ ✦ ❧</div><div class="bk-blank"><span class="bk-bemb">${emblemHtml()}</span><div class="bk-bt">بالتوفيق<small>نلعب ونتعلّم ✦ ونتسلّى</small></div></div><div class="bk-foot"><span></span><span></span></div>`; return f; };
  const base = blankPage('front'); base.style.cssText = 'position:absolute;inset:0;z-index:1';
  base.classList.add('bk-base'); book.appendChild(base);

  function pageFace(n, side, leafIndex) {                       // n: رقم الصفحة (يبدأ من 1)
    const f = document.createElement('div');
    f.className = `bk-face ${side} bk-page` + (leafIndex === 0 && side === 'back' ? ' bk-cover-back' : '');
    const list = pages[n - 1];
    if (!list) return blankPage(side);
    const grid = document.createElement('div'); grid.className = 'bk-grid';
    list.forEach(b => grid.appendChild(b));
    const free = PER - list.length;
    if (free >= 2 && n === P && window.__themes) {            // آخر صفحة فيها مكان فاضي: بنحط فيها اختيار الثيم بدل الفراغ
      const sw = document.createElement('div'); sw.className = 'bk-swatches'; sw.style.gridRow = `span ${free}`;
      sw.innerHTML = '<b>🖌️ اختر ثيمك</b><div class="bk-swgrid">' + window.__themes.list.map(t => `<button type="button" class="bk-sw" data-th="${t.id}" title="${t.n}" aria-label="${t.n}" style="--a:${t.cov[0]};--b:${t.foil[1]}"></button>`).join('') + '</div>';
      grid.appendChild(sw);
    }
    const foot = document.createElement('div'); foot.className = 'bk-foot';
    let nav = '<span></span>';
    if (side === 'back') nav = `<button type="button" class="bk-nav" data-bk="prev">${leafIndex === 0 ? '✕ إغلاق' : '▶ السابق'}</button>`;
    else if (leafIndex < MAXS) nav = '<button type="button" class="bk-nav" data-bk="next">التالي ◀</button>';
    foot.innerHTML = side === 'back' ? `${nav}<span class="no">${ar(n)}</span>` : `<span class="no">${ar(n)}</span>${nav}`;
    f.innerHTML = '<div class="bk-orn">❧ ✦ ❧</div>';
    f.appendChild(grid); f.appendChild(foot);
    return f;
  }

  const leaves = [];
  for (let i = 0; i < N; i++) {
    const leaf = document.createElement('div'); leaf.className = `bk-leaf l${i}`;
    let front, back;
    if (i === 0) {
      front = document.createElement('div'); front.className = 'bk-face front bk-cover';
      front.innerHTML = `<div class="bk-spine"></div>${['tl', 'tr', 'bl', 'br'].map(corner).join('')}<div class="bk-halo"></div><span class="bk-emb">${emblemHtml()}</span><div class="bk-title">قائمة اللعبة<small>اضغط لفتح الكتاب</small></div>`;
      front.setAttribute('role', 'button'); front.setAttribute('tabindex', '0'); front.setAttribute('aria-label', 'افتح كتاب القائمة');
    } else front = pageFace(2 * i, 'front', i);
    back = pageFace(2 * i + 1, 'back', i);
    leaf.appendChild(front); leaf.appendChild(back);
    book.appendChild(leaf);
    leaves.push({ el: leaf, front, back });
  }
  const center = document.createElement('div'); center.className = 'bk-center'; book.appendChild(center);
  chat.classList.add('bk-chat');
  book.appendChild(chat);
  controls.insertBefore(root, controls.firstChild);

  // ---------- الحالة ----------
  let state = 0, queue = null;
  const setInert = (el, on) => { if (on) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); } else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); } };
  function layout(turning) {
    leaves.forEach((l, i) => {
      const flipped = i < state;
      l.el.classList.toggle('flipped', flipped);
      l.el.style.zIndex = turning === i ? 300 : flipped ? 10 + i : 10 + (N - i);
      setInert(l.front, !(i === state));                   // الوجه الأمامي ظاهر بس لأعلى ورقة لسا ما انقلبت
      setInert(l.back, !(i === state - 1));                // والخلفي بس لآخر ورقة انقلبت
    });
    setInert(base, state < N);                              // الصفحة الأخيرة تحت الكل
    book.classList.toggle('open', state > 0);
    root.dataset.state = String(state);
  }
  let sctx = null;
  function paper(low) {                                     // صوت ورقة خفيف
    try {
      const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
      sctx = sctx || new A(); if (sctx.state === 'suspended') sctx.resume();
      const len = Math.floor(sctx.sampleRate * (low ? .22 : .32)), buf = sctx.createBuffer(1, len, sctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) { const t = i / len; d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * t) * (1 - t * .5); }
      const src = sctx.createBufferSource(); src.buffer = buf;
      const bp = sctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = low ? 700 : 2400; bp.Q.value = .7;
      const g = sctx.createGain(); g.gain.value = low ? .12 : .07;
      src.connect(bp); bp.connect(g); g.connect(sctx.destination); src.start();
    } catch (e) {}
  }
  function step(dir) {                                      // ورقة وحدة
    const idx = dir > 0 ? state : state - 1;
    if (idx < 0 || idx >= leaves.length || (dir > 0 && state >= MAXS)) return false;
    const l = leaves[idx];
    state += dir;
    layout(idx);
    l.el.classList.add('turning');
    paper(idx === 0);
    setTimeout(() => { l.el.classList.remove('turning'); layout(); }, FLIP_MS);
    return true;
  }
  function goTo(target) {                                   // انقلاب متتابع لو أكتر من ورقة (مثلاً عند إغلاق الكتاب)
    clearInterval(queue);
    target = Math.max(0, Math.min(MAXS, target));
    if (target === state) return;
    const dir = target > state ? 1 : -1;
    step(dir);
    if (target === state) return;
    queue = setInterval(() => { if (state === target || !step(dir)) clearInterval(queue); if (state === target) clearInterval(queue); }, 260);
  }
  layout();

  // ---------- التفاعل ----------
  leaves[0].front.addEventListener('click', (e) => { if (e.target.closest('.bk-chat')) return; if (state === 0) goTo(1); });
  leaves[0].front.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (state === 0) goTo(1); } });
  book.addEventListener('click', (e) => {
    const n = e.target.closest('[data-bk]'); if (!n) return;
    if (n.dataset.bk === 'next') goTo(state + 1);
    else if (state === 1) goTo(0); else goTo(state - 1);
    if (n.dataset.bk === 'prev' && n.textContent.includes('إغلاق')) goTo(0);
  });
  // الكتاب بيضل مفتوح بعد ما تكبس أي زر (ما في إغلاق تلقائي)؛ بتسكّره بزر «✕ إغلاق» أو Esc أو بالضغط على الغلاف.
  // سحب بالإصبع: يمين = الصفحة التالية، يسار = السابقة (الكتاب عربي)
  let tx = null, ty = null;
  stage.addEventListener('touchstart', (e) => { if (e.touches.length === 1) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; } }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (tx === null || state === 0) { tx = null; return; }
    const dx = e.changedTouches[0].clientX - tx, dy = Math.abs(e.changedTouches[0].clientY - ty); tx = null;
    if (Math.abs(dx) < 60 || dy > 50) return;
    if (dx > 0) goTo(state + 1); else goTo(state - 1);
  }, { passive: true });
  document.addEventListener('keydown', (e) => {
    if (state === 0) return;
    const tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable)) return;
    if (e.key === 'Escape') goTo(0);
    else if (e.key === 'ArrowLeft') goTo(state + 1);
    else if (e.key === 'ArrowRight') goTo(state - 1);
  });
  book.addEventListener('click', (e) => { const w = e.target.closest('[data-th]'); if (w && window.__themes) window.__themes.set(w.dataset.th); });
  const sync = (t) => {
    book.querySelectorAll('.bk-emb, .bk-bemb').forEach(em => { em.innerHTML = window.__themes.emblem(t.emblem); });
    book.querySelectorAll('.bk-sw').forEach(x => x.classList.toggle('on', x.dataset.th === t.id));
  };
  if (window.__themes) window.__themes.onChange(sync);
  window.__bookGoTo = goTo;
})();
