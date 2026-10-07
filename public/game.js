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
  socket.emit('identify', { token: deviceToken, name: playerName, color: playerColor, proof: ownerProof });
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

// تحديث قائمة اللاعبين بالترتيب
function updatePlayersList(players) {
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
    let playerHtml = `${i + 1}. ${colorizeName(p.name, p.color)} - ${p.score} نقطة`;

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
    time: data.time || ''
  });
});

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
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
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
        undoStack.push(canvas.toDataURL());
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
        saveState();
        const rect = canvas.getBoundingClientRect();
        lastX = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        lastY = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
    };

    const draw = (e) => {
        if (!drawing) return;
        const rect = canvas.getBoundingClientRect();
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
            const img = new Image();
            img.src = lastImg;
            img.onload = () => {
                ctx.save();
                ctx.globalAlpha = 1.0;
                ctx.globalCompositeOperation = 'source-over';
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                ctx.restore();
                if(!isSoloMode) socket.emit('load-gallery-all', canvas.toDataURL());
            };
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
//     نظام تبديل الثيمات المعزول (زر 🖌️)
// ==========================================
(() => {
  const customThemes = [
    { className: '', name: 'الذهبي الأساسي' },
    { className: 'theme-violet', name: 'البنفسجي النيون' },
    { className: 'theme-glass', name: 'الزجاجي الأزرق' },
    { className: 'theme-emerald', name: 'الزمردي المظلم' },
    { className: 'theme-stealth', name: 'السايبر المظلم' }
  ];

  let currentCustomIndex = parseInt(localStorage.getItem('customThemeIndex')) || 0;

  function applyCustomTheme(index) {
    const activeTheme = customThemes[index];

    // إزالة كلاسات الثيمات الأربعة فقط حتى لا نلغي كلاس dark-mode إن وجد
    customThemes.forEach(t => {
      if (t.className) document.body.classList.remove(t.className);
    });

    // إضافة الكلاس الجديد
    if (activeTheme.className) {
      document.body.classList.add(activeTheme.className);
    }

    // حفظ الاختيار
    localStorage.setItem('customThemeIndex', index);
  }

  // تطبيق الثيم عند تحميل الصفحة
  applyCustomTheme(currentCustomIndex);

  // ربط الحدث بالزر الجديد
  const themeBtn = document.getElementById('btn-theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      currentCustomIndex = (currentCustomIndex + 1) % customThemes.length;
      applyCustomTheme(currentCustomIndex);
    });
  }
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

  // زر لوحة الأدمن مخفي عن الجميع، والسيرفر بيظهره فقط للأدمن الأساسي وللـ VIP
  if (btnAdminAuth) btnAdminAuth.style.display = 'none';

  // ---------- الحالة المحلية ----------
  let isAdminAuthenticated = false;
  let isOwner = false;
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
    renderAllowed();
  }

  function onAdminGranted(owner) {
    isAdminAuthenticated = true;
    isOwner = !!owner;
    updateOwnerUI();
    renderPlayerCards(activePlayersList);
  }

  if (btnAdminAuth) {
    btnAdminAuth.addEventListener('click', () => {
      if (isAdminAuthenticated) openAdminPanel();
      else openAdminLoginModal();
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

      socket.emit('admin:authenticate', { password }, (response) => {
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
      });
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
            ${player.isAdmin ? '<span class="vip-badge">أدمن</span>' : ''}
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
          <button class="btn-action ${ledClass(player.isVip)}" data-act="vip" data-id="${id}">
            <span>👑 VIP</span>
            <span class="tooltip-icon" title="منح أو سحب رتبة VIP وتظهر رسالة بالشات">❓</span>
          </button>
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
    if (btnAdminAuth) btnAdminAuth.style.display = 'none';
    updateOwnerUI();
  });

  socket.on('admin:session', (d) => {
    stealthMode = d.stealthMode || 0;
    renderStealth();
    onAdminGranted(!!d.isOwner);
    if (ownerIpLine && d.isOwner && d.ip) {
      ownerIpLine.textContent = `عنوان IP تاعك الحالي: ${d.ip} — اللعبة بتميّزه وبتحميك من أي أمر. لتثبيته حتى بعد إعادة تشغيل Render ضعه بمتغير البيئة OWNER_IP (أو افتح /my-ip).`;
    }
  });

  // إظهار/إخفاء زر لوحة الأدمن حسب قرار السيرفر
  socket.on('admin:button', (d) => {
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
