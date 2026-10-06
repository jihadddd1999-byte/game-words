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

/* ==========================================================================
   🎮 واجهة الألعاب المتنوعة (الشطرنج حالياً)
   - زر "ألعاب متنوعة" + قائمة الألعاب + شاشة الشطرنج
   - ضد الكمبيوتر (5 مستويات) أو ضد لاعب من الروم بدعوة
   - مشاهدة المباريات الجارية + شات خاص باللاعبين الاثنين فقط
   - عند اختيار أي قطعة بيشرحلك كيف بتتحرك وأين تقدر تروح
   ========================================================================== */
(() => {
  'use strict';
  if (window.__gamesUiLoaded) return;
  window.__gamesUiLoaded = true;

  /* ------------------------------------------------------------------ */
  /*  الستايل                                                             */
  /* ------------------------------------------------------------------ */
  const css = `
  .gm-launch{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-width:110px;padding:10px 22px;border:0;border-radius:40px;cursor:pointer;font:inherit;font-weight:800;font-size:1.1rem;color:#fff8dc;background:linear-gradient(120deg,#6d28d9,#be185d 50%,#f59e0b);background-size:220% 220%;animation:gmShift 7s ease infinite;box-shadow:0 0 18px rgba(190,24,93,.55),0 6px 14px rgba(0,0,0,.35),inset 0 -3px 10px rgba(0,0,0,.25);overflow:hidden;transition:transform .15s ease}
  .gm-launch:hover,.gm-launch:focus{transform:translateY(-2px) scale(1.05);outline:none}
  .gm-launch::after{content:'';position:absolute;top:0;left:-70%;width:45%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-20deg);animation:gmSheen 3.4s ease-in-out infinite}
  .gm-launch .gm-ico{font-size:1.4rem;display:inline-block;animation:gmBob 2.6s ease-in-out infinite}
  .gm-launch .gm-dot{position:absolute;top:6px;right:10px;width:11px;height:11px;border-radius:50%;background:#22c55e;box-shadow:0 0 10px #22c55e;display:none;z-index:2}
  .gm-launch.has-alert .gm-dot{display:block;animation:gmPulse 1.2s infinite}
  @keyframes gmShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
  @keyframes gmSheen{0%,55%{left:-70%}100%{left:130%}}
  @keyframes gmBob{0%,100%{transform:translateY(0) rotate(-6deg)}50%{transform:translateY(-3px) rotate(6deg)}}
  @keyframes gmPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.35)}}
  @keyframes gmFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  @keyframes gmPop{0%{transform:scale(.55)}60%{transform:scale(1.14)}100%{transform:scale(1)}}
  @keyframes gmPulseBg{50%{background:rgba(239,68,68,.42)}}

  .gm-overlay{position:fixed;inset:0;width:100%;height:100%;margin:0;padding:0;border:0;z-index:10020;display:none;flex-direction:column;overflow-y:auto;overflow-x:hidden;direction:rtl;color:#f7efd2;background:radial-gradient(1200px 600px at 50% -10%,#3b1f6b 0%,#1a1033 45%,#0b0716 100%);-webkit-overflow-scrolling:touch;font-family:inherit}
  .gm-overlay.open{display:flex}
  .gm-overlay::before{content:'';position:fixed;inset:0;pointer-events:none;background-image:radial-gradient(rgba(255,215,120,.12) 1px,transparent 1px);background-size:26px 26px;opacity:.5}
  .gm-wrap{position:relative;width:100%;max-width:560px;margin:0 auto;padding:12px 12px 30px;display:flex;flex-direction:column;gap:12px}
  .gm-top{display:flex;align-items:center;gap:10px}
  .gm-title{flex:1;margin:0;font-size:1.25rem;font-weight:900;color:#ffd75e;text-shadow:0 0 14px rgba(255,200,60,.55)}
  .gm-iconbtn{width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,215,120,.35);background:rgba(255,255,255,.07);color:#ffe9a8;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex:0 0 auto;font-family:inherit}
  .gm-iconbtn:hover{background:rgba(255,215,120,.2)}
  .gm-card{background:linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.03));border:1px solid rgba(255,215,120,.22);border-radius:18px;padding:14px;backdrop-filter:blur(8px);box-shadow:0 10px 30px rgba(0,0,0,.35)}
  .gm-card h3{margin:0 0 10px;font-size:1.02rem;color:#ffe08a;display:flex;align-items:center;gap:8px}
  .gm-sub{font-size:.8rem;opacity:.75;line-height:1.5;margin:0 0 10px}

  .gm-games{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .gm-game{position:relative;border-radius:20px;padding:20px 10px 16px;text-align:center;cursor:pointer;border:1px solid rgba(255,215,120,.35);background:linear-gradient(160deg,#3a2368,#1b1033);overflow:hidden;color:inherit;font:inherit;transition:transform .18s,box-shadow .18s}
  .gm-game:hover{transform:translateY(-4px);box-shadow:0 14px 28px rgba(139,92,246,.35)}
  .gm-game .gm-big{font-size:3.6rem;line-height:1;filter:drop-shadow(0 6px 10px rgba(0,0,0,.5))}
  .gm-game b{display:block;margin-top:8px;font-size:1.1rem;color:#ffe08a}
  .gm-game small{opacity:.75}
  .gm-game.soon{opacity:.55;cursor:not-allowed;filter:grayscale(.4)}
  .gm-game.soon:hover{transform:none;box-shadow:none}
  .gm-game .gm-tag{position:absolute;top:8px;left:8px;background:#f59e0b;color:#2b1700;font-size:.68rem;font-weight:800;padding:2px 8px;border-radius:10px}

  .gm-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
  .gm-chip{flex:1 1 auto;min-width:78px;padding:9px 10px;border-radius:12px;border:1px solid rgba(255,215,120,.3);background:rgba(255,255,255,.06);color:#f7efd2;font:inherit;font-weight:700;cursor:pointer;text-align:center;font-size:.88rem;transition:all .15s}
  .gm-chip.on{background:linear-gradient(135deg,#ffd75e,#d99a0b);color:#2b1700;border-color:transparent;box-shadow:0 0 14px rgba(255,200,60,.55)}
  .gm-btn{width:100%;padding:12px;border:0;border-radius:14px;font:inherit;font-weight:900;font-size:1rem;cursor:pointer;color:#2b1700;background:linear-gradient(135deg,#ffe08a,#e0a30c);box-shadow:0 6px 0 #8a5a0a,0 10px 18px rgba(0,0,0,.4);transition:transform .1s}
  .gm-btn:active{transform:translateY(3px);box-shadow:0 3px 0 #8a5a0a}
  .gm-btn.sm{width:auto;padding:8px 14px;font-size:.85rem;box-shadow:0 3px 0 #8a5a0a}
  .gm-btn.ghost{background:rgba(255,255,255,.08);color:#ffe9a8;box-shadow:none;border:1px solid rgba(255,215,120,.35)}
  .gm-btn.danger{background:linear-gradient(135deg,#f87171,#b91c1c);color:#fff;box-shadow:0 3px 0 #7f1d1d}
  .gm-btn:disabled{opacity:.45;cursor:not-allowed}
  .gm-row{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:12px;background:rgba(255,255,255,.05);margin-bottom:8px}
  .gm-row .gm-name{flex:1;min-width:0;font-weight:700;word-break:break-word}
  .gm-row small{opacity:.7;font-weight:400}
  .gm-dot2{width:12px;height:12px;border-radius:50%;flex:0 0 auto;box-shadow:0 0 8px currentColor}
  .gm-empty{opacity:.65;font-size:.88rem;text-align:center;padding:8px}
  .gm-wait{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:rgba(139,92,246,.2);border:1px solid rgba(167,139,250,.5)}
  .gm-wait span{flex:1}

  .gm-board{width:min(100%,520px,66vh);margin:0 auto;padding:10px;border-radius:20px;background:linear-gradient(145deg,#f3cf6a,#a87114 55%,#6b4408);box-shadow:0 18px 40px rgba(0,0,0,.55),0 0 0 2px rgba(255,235,170,.4) inset,0 0 30px rgba(255,190,50,.25);position:relative}
  .gm-grid{display:grid;grid-template-columns:repeat(8,1fr);aspect-ratio:1;border-radius:10px;overflow:hidden;container-type:inline-size;direction:ltr;box-shadow:0 0 0 2px rgba(60,35,5,.7)}
  .gm-sq{position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;aspect-ratio:1}
  .gm-sq.l{background:linear-gradient(135deg,#f6e3b4,#e9cf94)}
  .gm-sq.d{background:linear-gradient(135deg,#bf8a45,#a8742f)}
  .gm-co{position:absolute;font-size:9px;font-size:max(8px,1.9cqw);font-weight:800;opacity:.75;pointer-events:none;z-index:1}
  .gm-co.r{top:2px;left:3px}.gm-co.f{bottom:1px;right:3px}
  .gm-sq.l .gm-co{color:#8a5a22}.gm-sq.d .gm-co{color:#f6e3b4}
  .gm-sq.last::before{content:'';position:absolute;inset:0;background:rgba(255,226,70,.42)}
  .gm-sq.sel{box-shadow:inset 0 0 0 3px #fff3a0,inset 0 0 18px 4px rgba(255,215,0,.8)}
  .gm-sq.check::before{content:'';position:absolute;inset:0;background:radial-gradient(circle,rgba(255,40,40,.95) 0%,rgba(255,40,40,.45) 45%,transparent 72%)}
  .gm-sq.tgt::after{content:'';position:absolute;width:30%;height:30%;border-radius:50%;background:rgba(30,20,10,.38);box-shadow:0 0 0 2px rgba(255,255,255,.25);z-index:1}
  .gm-sq.tgt.cap::after{width:88%;height:88%;background:transparent;border:5px solid rgba(220,38,38,.75);box-shadow:none}
  .gm-sq.tgt:hover{filter:brightness(1.12)}
  .gm-p{position:relative;z-index:2;line-height:1;font-size:min(9.2vw,50px);font-size:9.4cqw;font-family:'Segoe UI Symbol','Noto Sans Symbols 2','Apple Symbols','DejaVu Sans',serif;pointer-events:none}
  .gm-p.w{color:#fffdf4;-webkit-text-stroke:1.3px #3b2a12;text-shadow:0 2px 3px rgba(0,0,0,.45)}
  .gm-p.b{color:#17110a;-webkit-text-stroke:.7px #f3d680;text-shadow:0 2px 3px rgba(0,0,0,.5)}
  .gm-p.moved{animation:gmPop .35s ease-out}

  .gm-bar{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid transparent;transition:all .25s}
  .gm-bar.turn{border-color:#ffd75e;box-shadow:0 0 18px rgba(255,200,60,.5);background:rgba(255,215,0,.1)}
  .gm-av{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.3rem;background:radial-gradient(circle at 30% 30%,#fff,#d9c690);color:#2b1700;flex:0 0 auto}
  .gm-av.b{background:radial-gradient(circle at 30% 30%,#555,#0d0a06);color:#ffe9a8}
  .gm-binfo{flex:1;min-width:0}
  .gm-bname{font-weight:800;font-size:.98rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .gm-bsub{font-size:.75rem;opacity:.75;min-height:1em}
  .gm-cap{font-size:1rem;letter-spacing:-2px;direction:ltr;text-align:right;line-height:1.2;min-height:1.2em}
  .gm-cap .w{color:#fffdf4;-webkit-text-stroke:.8px #3b2a12}
  .gm-cap .b{color:#17110a;-webkit-text-stroke:.5px #f3d680}
  .gm-adv{font-weight:800;color:#86efac;font-size:.8rem;margin-right:6px;letter-spacing:0}

  .gm-status{padding:9px 12px;border-radius:12px;text-align:center;font-weight:800;background:rgba(255,255,255,.07);border:1px solid rgba(255,215,120,.2)}
  .gm-status.me{background:linear-gradient(135deg,rgba(34,197,94,.25),rgba(34,197,94,.1));border-color:#22c55e}
  .gm-status.warn{background:rgba(239,68,68,.22);border-color:#ef4444;animation:gmPulseBg 1.2s infinite}
  .gm-status.end{background:linear-gradient(135deg,rgba(255,215,0,.3),rgba(255,215,0,.1));border-color:#ffd75e}

  .gm-hint{border-radius:16px;padding:12px 14px;background:linear-gradient(160deg,rgba(139,92,246,.22),rgba(139,92,246,.07));border:1px solid rgba(167,139,250,.5);line-height:1.7;font-size:.9rem;animation:gmFade .25s ease}
  .gm-hint p{margin:2px 0 6px}
  .gm-hint-head{display:flex;align-items:center;gap:10px;margin-bottom:4px}
  .gm-hint-ic{font-size:2.1rem;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5));font-family:'Segoe UI Symbol','Noto Sans Symbols 2','Apple Symbols','DejaVu Sans',serif}
  .gm-hint-ic.w{color:#fffdf4;-webkit-text-stroke:1px #3b2a12}
  .gm-hint-ic.b{color:#17110a;-webkit-text-stroke:.6px #f3d680}
  .gm-hint b{color:#ffe08a;font-size:1.02rem}
  .gm-hint small{opacity:.75}
  .gm-hint .tag{display:inline-block;padding:1px 9px;margin:2px 3px;border-radius:10px;background:rgba(255,255,255,.12);font-weight:700;font-size:.82rem}
  .gm-hint .tag.cap{background:rgba(239,68,68,.35)}
  .gm-hint .tag.sp{background:rgba(245,158,11,.4)}
  .gm-hint .warn{color:#fca5a5;font-weight:700}

  .gm-hist{display:flex;gap:6px;overflow-x:auto;padding:6px 2px;direction:ltr;scrollbar-width:thin}
  .gm-mv{flex:0 0 auto;padding:3px 9px;border-radius:9px;background:rgba(255,255,255,.08);font-size:.8rem;font-weight:700;white-space:nowrap}
  .gm-mv i{opacity:.6;font-style:normal;margin-right:5px}
  .gm-ctrls{display:flex;flex-wrap:wrap;gap:8px}
  .gm-ctrls .gm-btn{flex:1 1 auto;position:relative}
  .gm-badge{position:absolute;top:-6px;left:-6px;min-width:18px;height:18px;border-radius:9px;background:#ef4444;color:#fff;font-size:.7rem;display:none;align-items:center;justify-content:center;padding:0 4px}

  .gm-chat{display:none;flex-direction:column;gap:8px}
  .gm-chat.open{display:flex}
  .gm-msgs{height:150px;overflow-y:auto;padding:8px;border-radius:12px;background:rgba(0,0,0,.28);display:flex;flex-direction:column;gap:6px}
  .gm-msg{max-width:85%;padding:6px 10px;border-radius:12px;background:rgba(255,255,255,.1);font-size:.88rem;word-break:break-word;align-self:flex-start}
  .gm-msg.me{align-self:flex-end;background:rgba(255,215,0,.22)}
  .gm-msg small{display:block;opacity:.6;font-size:.7rem}
  .gm-chatform{display:flex;gap:8px}
  .gm-chatform input{flex:1;min-width:0;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,215,120,.35);background:rgba(255,255,255,.08);color:#fff8dc;font:inherit}
  .gm-chatform input::placeholder{color:rgba(255,233,168,.5)}

  .gm-result{position:absolute;inset:10px;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;border-radius:12px;background:rgba(10,6,20,.84);backdrop-filter:blur(3px);animation:gmFade .4s ease;padding:16px}
  .gm-result .gm-trophy{font-size:3.2rem;animation:gmBob 2s ease-in-out infinite}
  .gm-result h2{margin:0;color:#ffe08a;font-size:1.35rem}
  .gm-result p{margin:0;opacity:.85}
  .gm-result .gm-btn{max-width:240px}
  .gm-promo{position:absolute;inset:10px;z-index:6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:rgba(10,6,20,.82);border-radius:12px;animation:gmFade .2s ease}
  .gm-promo div{display:flex;gap:10px}
  .gm-promo button{width:62px;height:62px;border-radius:14px;border:1px solid #ffd75e;background:rgba(255,255,255,.1);cursor:pointer;font-size:2.3rem;line-height:1;font-family:'Segoe UI Symbol','Noto Sans Symbols 2','Apple Symbols','DejaVu Sans',serif}
  .gm-promo button.w{color:#fffdf4;-webkit-text-stroke:1px #3b2a12}
  .gm-promo button.b{color:#17110a;-webkit-text-stroke:.6px #f3d680;background:rgba(255,255,255,.35)}

  .gm-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:10090;background:#1b1033;color:#ffe9a8;border:1px solid #ffd75e;padding:10px 18px;border-radius:14px;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,.5);max-width:90vw;text-align:center;animation:gmFade .25s ease}
  .gm-invites{position:fixed;inset:auto;top:70px;left:50%;transform:translateX(-50%);width:min(92vw,400px);margin:0;padding:0;border:0;background:transparent;display:none;flex-direction:column;gap:10px;z-index:10080;color:#f7efd2;direction:rtl;overflow:visible}
  .gm-inv{padding:14px;border-radius:16px;background:linear-gradient(160deg,#3a2368,#1b1033);border:1px solid #ffd75e;box-shadow:0 12px 30px rgba(0,0,0,.55);animation:gmFade .3s}
  .gm-inv p{margin:0 0 10px;line-height:1.6;font-weight:700}
  .gm-inv div{display:flex;gap:8px}
  `;
  const styleEl = document.createElement('style');
  styleEl.id = 'gm-style';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ------------------------------------------------------------------ */
  /*  ثوابت ومساعدات                                                      */
  /* ------------------------------------------------------------------ */
  const FILES = 'abcdefgh';
  const GLYPH = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };
  const VS = '\uFE0E'; // يمنع ظهور القطع بشكل إيموجي
  const VALUE = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
  const PIECES = {
    K: { name: 'الملك', how: 'يتحرك خانة واحدة فقط بأي اتجاه (أفقي أو عمودي أو قطري). هو أهم قطعة: لو انحاصر (كش مات) بتخسر. ما بيقدر يروح لخانة مهدّدة من الخصم، وممكن "يبيّت" مع القلعة مرة وحدة بشروط معيّنة.' },
    Q: { name: 'الوزير', how: 'أقوى قطعة: بتتحرك أي عدد من الخانات أفقياً أو عمودياً أو قطرياً، بشرط ما يكون في قطعة بالطريق. بتأكل أول قطعة خصم بتقابلها.' },
    R: { name: 'القلعة', how: 'بتتحرك أي عدد من الخانات أفقياً أو عمودياً فقط (مش قطرياً)، وما بتقفز فوق القطع. بتشارك الملك بحركة التبييت.' },
    B: { name: 'الفيل', how: 'بيتحرك أي عدد من الخانات قطرياً فقط، وبيضل طول اللعبة على نفس لون الخانات اللي بدأ عليها.' },
    N: { name: 'الحصان', how: 'بيتحرك على شكل حرف L: خانتين باتجاه ثم خانة للجنب. وهو القطعة الوحيدة اللي بتقفز فوق باقي القطع.' },
    P: { name: 'الجندي', how: 'بيمشي للأمام خانة وحدة (وبأول حركة ممكن خانتين)، وبياكل بشكل قطري خانة وحدة للأمام. لما يوصل لآخر اللوحة بيترقّى لوزير أو قلعة أو فيل أو حصان.' }
  };
  const LEVELS = [
    { n: 1, label: '🌱 مبتدئ', desc: 'بيغلط كتير، مناسب للتعلّم.' },
    { n: 2, label: '🙂 سهل', desc: 'بيفكر بحركتين وبيغلط أحياناً.' },
    { n: 3, label: '😎 متوسط', desc: 'لعب منطقي، بيحتاج تركيز.' },
    { n: 4, label: '🔥 صعب', desc: 'بيفكر بعمق وبيستغل أخطاءك.' },
    { n: 5, label: '👑 خبير', desc: 'أقوى مستوى، بيفكر لعدة ثواني.' }
  ];
  const REASONS = {
    checkmate: 'كش مات!', resign: 'استسلام', stalemate: 'ستالميت (ما في حركات متاحة)',
    fifty: 'قاعدة الخمسين نقلة', insufficient: 'مواد غير كافية للفوز', repetition: 'تكرار الوضع ثلاث مرات',
    agreement: 'اتفاق على التعادل', abandon: 'انسحاب اللاعب'
  };

  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const h = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined && html !== null) e.innerHTML = html;
    return e;
  };
  const on = (el, ev, fn) => el.addEventListener(ev, fn);
  const sqName = (i) => FILES[i & 7] + (8 - (i >> 3));
  const glyph = (ch) => GLYPH[ch.toUpperCase()] + VS;
  const isWhitePiece = (ch) => ch === ch.toUpperCase();

  function fenBoard(fen) {
    const board = new Array(64).fill('');
    fen.split(' ')[0].split('/').forEach((row, r) => {
      let f = 0;
      for (const ch of row) {
        if (ch >= '1' && ch <= '8') f += parseInt(ch, 10);
        else board[r * 8 + f++] = ch;
      }
    });
    return board;
  }

  function toast(msg) {
    const t = h('div', 'gm-toast');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  /* ------------------------------------------------------------------ */
  /*  محرك الشطرنج (للحركات المتاحة) + الذكاء الاصطناعي في Worker          */
  /* ------------------------------------------------------------------ */
  let Engine = null;
  let engineLoading = false;
  const engineWaiters = [];
  function ensureEngine(cb) {
    if (Engine) return cb();
    engineWaiters.push(cb);
    if (engineLoading) return;
    engineLoading = true;
    if (window.ChessEngine) { Engine = window.ChessEngine; engineWaiters.splice(0).forEach(f => f()); return; }
    const s = document.createElement('script');
    s.src = 'chess-engine.js';
    s.onload = () => { Engine = window.ChessEngine; engineWaiters.splice(0).forEach(f => f()); };
    s.onerror = () => { engineLoading = false; toast('تعذر تحميل محرك الشطرنج (chess-engine.js)'); };
    document.head.appendChild(s);
  }

  function legalList(fen) {
    const pos = new Engine.Position().load(fen);
    return pos.legalMoves().map(m => ({ from: m & 63, to: (m >> 6) & 63, promo: (m >> 12) & 15, flags: m >> 16 }));
  }
  const PROMO_LETTER = { 2: 'n', 3: 'b', 4: 'r', 5: 'q' };

  let worker = null;
  let aiSeq = 0;
  const aiCallbacks = {};
  function getWorker() {
    if (worker !== null) return worker;
    try {
      worker = new Worker('chess-engine.js');
      worker.onmessage = (e) => {
        const d = e.data || {};
        const cb = aiCallbacks[d.id];
        if (cb) { delete aiCallbacks[d.id]; cb(d.result); }
      };
      worker.onerror = () => {
        worker = false;
        Object.keys(aiCallbacks).forEach(k => { const cb = aiCallbacks[k]; delete aiCallbacks[k]; cb(null); });
      };
    } catch (e) { worker = false; }
    return worker;
  }
  function askAI(fen, level, rep2, cb) {
    const id = ++aiSeq;
    const w = getWorker();
    if (w) {
      aiCallbacks[id] = cb;
      w.postMessage({ id, fen, level, rep2 });
    } else {
      setTimeout(() => {
        let r = null;
        try { r = Engine.findBestMove(fen, level, rep2); } catch (e) {}
        cb(r);
      }, 50);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  الحالة العامة للواجهة                                               */
  /* ------------------------------------------------------------------ */
  const S = {
    open: false, screen: 'menu',
    level: 3, color: 'white',
    players: [], live: { sessions: [], busy: [] },
    currentId: null, state: null, chat: [], unread: 0, chatOpen: false,
    sel: null, board: [], byFrom: {}, myTurn: false,
    hints: true, aiFen: null, aiRetries: 0,
    outInvite: null, promo: null, lastRenderedFen: null
  };
  try { S.hints = localStorage.getItem('gmHints') !== '0'; } catch (e) {}
  const myId = () => (typeof playerId !== 'undefined' ? playerId : null);

  /* ------------------------------------------------------------------ */
  /*  العناصر الثابتة: الزر + الطبقة + الدعوات                            */
  /* ------------------------------------------------------------------ */
  const launch = h('button', 'gm-launch');
  launch.type = 'button';
  launch.id = 'btn-games';
  launch.innerHTML = '<span class="gm-ico">🎮</span><span>ألعاب متنوعة</span><span class="gm-dot"></span>';
  const controls = document.querySelector('.controls');
  const boardBtn = document.getElementById('btn-open-board');
  if (boardBtn && boardBtn.parentNode) boardBtn.parentNode.insertBefore(launch, boardBtn.nextSibling);
  else if (controls) controls.appendChild(launch);
  else document.body.appendChild(launch);

  const overlay = h('div', 'gm-overlay');
  const wrap = h('div', 'gm-wrap');
  overlay.appendChild(wrap);
  document.body.appendChild(overlay);

  const invitesBox = h('div', 'gm-invites');
  document.body.appendChild(invitesBox);

  function updateLaunchAlert() {
    const alertOn = !!S.state && S.state.status === 'active' && !S.open;
    launch.classList.toggle('has-alert', alertOn || invitesBox.children.length > 0);
  }

  function openOverlay() {
    if (typeof closeAllDialogs === 'function') closeAllDialogs();
    ensureEngine(() => {});
    S.open = true;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (S.state && S.currentId) S.screen = 'game';
    else if (S.screen === 'game') S.screen = 'menu';
    render();
    updateLaunchAlert();
  }
  function closeOverlay() {
    S.open = false;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    updateLaunchAlert();
  }
  on(launch, 'click', openOverlay);

  /* ------------------------------------------------------------------ */
  /*  رسم الشاشات                                                         */
  /* ------------------------------------------------------------------ */
  function render() {
    if (!S.open) return;
    if (S.screen === 'game' && S.state) renderGame();
    else if (S.screen === 'hub') renderHub();
    else renderMenu();
  }

  function header(title, backFn) {
    const top = h('div', 'gm-top');
    if (backFn) {
      const b = h('button', 'gm-iconbtn', '➜');
      b.type = 'button';
      b.title = 'رجوع';
      on(b, 'click', backFn);
      top.appendChild(b);
    }
    top.appendChild(h('h2', 'gm-title', title));
    const x = h('button', 'gm-iconbtn', '✕');
    x.type = 'button';
    x.title = 'إغلاق';
    on(x, 'click', () => { if (S.screen === 'game') leaveIfNeeded(); closeOverlay(); });
    top.appendChild(x);
    return top;
  }

  /* ---------- قائمة الألعاب ---------- */
  function renderMenu() {
    S.screen = 'menu';
    wrap.innerHTML = '';
    wrap.appendChild(header('🎮 ألعاب متنوعة'));
    wrap.appendChild(h('p', 'gm-sub', 'اختار لعبة والعب ضد الكمبيوتر أو ضد أصحابك اللي بالغرفة.'));

    const grid = h('div', 'gm-games');
    const chess = h('button', 'gm-game', '<div class="gm-big">♞</div><b>الشطرنج</b><small>ضد الكمبيوتر أو لاعبين</small>');
    chess.type = 'button';
    on(chess, 'click', () => { S.screen = S.state && S.currentId ? 'game' : 'hub'; if (S.screen === 'hub') requestLive(); render(); });
    const xo = h('button', 'gm-game soon', '<span class="gm-tag">قريباً</span><div class="gm-big">✕◯</div><b>إكس أو</b><small>قريباً</small>');
    xo.type = 'button';
    on(xo, 'click', () => toast('لعبة إكس أو قريباً ✨'));
    grid.appendChild(chess);
    grid.appendChild(xo);
    wrap.appendChild(grid);

    if (S.state && S.currentId) {
      const card = h('div', 'gm-card');
      card.appendChild(h('h3', '', '▶️ عندك مباراة'));
      const b = h('button', 'gm-btn', 'متابعة المباراة');
      b.type = 'button';
      on(b, 'click', () => { S.screen = 'game'; render(); });
      card.appendChild(b);
      wrap.appendChild(card);
    }
  }

  /* ---------- شاشة الشطرنج: اختيار نوع اللعب ---------- */
  function requestLive() { socket.emit('games:live_request'); }

  function colorChips(parent) {
    const chips = h('div', 'gm-chips');
    [['white', '⚪ أبيض'], ['black', '⚫ أسود'], ['random', '🎲 عشوائي']].forEach(([val, label]) => {
      const c = h('button', 'gm-chip' + (S.color === val ? ' on' : ''), label);
      c.type = 'button';
      on(c, 'click', () => { S.color = val; render(); });
      chips.appendChild(c);
    });
    parent.appendChild(chips);
  }

  function renderHub() {
    S.screen = 'hub';
    wrap.innerHTML = '';
    wrap.appendChild(header('♞ الشطرنج', () => { S.screen = 'menu'; render(); }));

    if (S.state && S.currentId) {
      const card = h('div', 'gm-card');
      const a = S.state.slots[0], b = S.state.slots[1];
      card.appendChild(h('h3', '', '▶️ مباراتك الحالية'));
      card.appendChild(h('p', 'gm-sub', `${esc(a.name)} ⚔️ ${esc(b.name)}`));
      const btn = h('button', 'gm-btn', 'متابعة المباراة');
      btn.type = 'button';
      on(btn, 'click', () => { S.screen = 'game'; render(); });
      card.appendChild(btn);
      wrap.appendChild(card);
    }

    if (S.outInvite) {
      const w = h('div', 'gm-wait');
      w.appendChild(h('span', '', `⏳ بانتظار رد ${esc(S.outInvite.name)}...`));
      const c = h('button', 'gm-btn sm danger', 'إلغاء');
      c.type = 'button';
      on(c, 'click', () => { socket.emit('games:invite_cancel', { id: S.outInvite.id }); S.outInvite = null; render(); });
      w.appendChild(c);
      wrap.appendChild(w);
    }

    // ضد الكمبيوتر
    const ai = h('div', 'gm-card');
    ai.appendChild(h('h3', '', '🤖 ضد الكمبيوتر'));
    ai.appendChild(h('p', 'gm-sub', 'اختار مستوى الصعوبة ولونك:'));
    const lv = h('div', 'gm-chips');
    LEVELS.forEach(L => {
      const c = h('button', 'gm-chip' + (S.level === L.n ? ' on' : ''), L.label);
      c.type = 'button';
      on(c, 'click', () => { S.level = L.n; render(); });
      lv.appendChild(c);
    });
    ai.appendChild(lv);
    ai.appendChild(h('p', 'gm-sub', esc(LEVELS[S.level - 1].desc)));
    colorChips(ai);
    const start = h('button', 'gm-btn', '⚔️ ابدأ المباراة');
    start.type = 'button';
    start.disabled = !!S.state && S.state.status === 'active';
    on(start, 'click', () => {
      ensureEngine(() => socket.emit('games:create_ai', { game: 'chess', level: S.level, color: S.color }));
    });
    ai.appendChild(start);
    wrap.appendChild(ai);

    // ضد لاعب
    const pv = h('div', 'gm-card');
    pv.appendChild(h('h3', '', '👥 ضد لاعب من الروم'));
    pv.appendChild(h('p', 'gm-sub', 'اختار لونك، ثم اضغط "تحدّي" على اللاعب. إذا قبل الدعوة بتبدأ المباراة فوراً.'));
    colorChips(pv);
    const me = myId();
    const others = S.players.filter(p => p.id !== me);
    if (!others.length) pv.appendChild(h('div', 'gm-empty', 'ما في لاعبين ثانيين بالغرفة هلأ.'));
    others.forEach(p => {
      const busy = S.live.busy.indexOf(p.id) >= 0;
      const row = h('div', 'gm-row');
      row.appendChild(h('span', 'gm-dot2', ''));
      row.lastChild.style.color = p.color || '#00e5ff';
      row.lastChild.style.background = p.color || '#00e5ff';
      row.appendChild(h('span', 'gm-name', `${esc(p.name)} ${busy ? '<small>(بمباراة)</small>' : ''}`));
      const b = h('button', 'gm-btn sm', '⚔️ تحدّي');
      b.type = 'button';
      b.disabled = busy || (!!S.state && S.state.status === 'active');
      on(b, 'click', () => { socket.emit('games:invite', { game: 'chess', to: p.id, color: S.color }); });
      row.appendChild(b);
      pv.appendChild(row);
    });
    wrap.appendChild(pv);

    // مباريات جارية
    const lv2 = h('div', 'gm-card');
    lv2.appendChild(h('h3', '', '📺 مباريات جارية'));
    lv2.appendChild(h('p', 'gm-sub', 'تقدر تشاهد أي مباراة، أو تتحدى لاعب ثاني، أو تلعب ضد الكمبيوتر.'));
    const sessions = (S.live.sessions || []).filter(s => s.game === 'chess');
    if (!sessions.length) lv2.appendChild(h('div', 'gm-empty', 'ما في مباريات جارية الآن.'));
    sessions.forEach(s => {
      const row = h('div', 'gm-row');
      const nm = (x) => (x.ai ? '🤖 ' : '') + esc(x.name);
      row.appendChild(h('span', 'gm-name', `${nm(s.white)} ⚔️ ${nm(s.black)}<br><small>${s.moves} نقلة · 👁 ${s.spectators}</small>`));
      const mine = S.currentId === s.id;
      const b = h('button', 'gm-btn sm' + (mine ? '' : ' ghost'), mine ? 'مباراتك' : '👁 مشاهدة');
      b.type = 'button';
      on(b, 'click', () => {
        if (mine) { S.screen = 'game'; render(); return; }
        if (S.state && S.state.status === 'active') return toast('أنت داخل مباراة جارية.');
        S.currentId = s.id; S.state = null; S.chat = []; S.sel = null; S.screen = 'game';
        chatEl = null; chatMsgsEl = null; chatForId = null;
        ensureEngine(() => socket.emit('games:spectate', { id: s.id }));
      });
      row.appendChild(b);
      lv2.appendChild(row);
    });
    wrap.appendChild(lv2);
  }

  /* ---------- شاشة المباراة ---------- */
  const mySlot = (st) => st.slots.findIndex(s => s.id && s.id === myId());
  const turnIdx = (st) => (st.turn === 'w' ? 0 : 1);

  function materialDiff(board) {
    let w = 0, b = 0;
    board.forEach(ch => { if (!ch) return; const v = VALUE[ch.toUpperCase()]; if (isWhitePiece(ch)) w += v; else b += v; });
    return w - b;
  }

  function resultText(st) {
    const reason = REASONS[st.reason] || '';
    if (st.result === '1-0') return { icon: '🏆', title: `فاز ${esc(st.slots[0].name)} (الأبيض)`, sub: reason };
    if (st.result === '0-1') return { icon: '🏆', title: `فاز ${esc(st.slots[1].name)} (الأسود)`, sub: reason };
    return { icon: '🤝', title: 'تعادل', sub: reason };
  }

  function lastMoveText(st) {
    if (!st.lastMove) return '';
    const to = FILES.indexOf(st.lastMove.to[0]) + (8 - parseInt(st.lastMove.to[1], 10)) * 8;
    const ch = S.board[to];
    if (!ch) return '';
    return `آخر نقلة: ${PIECES[ch.toUpperCase()].name} من ${st.lastMove.from} إلى ${st.lastMove.to}`;
  }

  function hintHtml(st, sq) {
    const ch = S.board[sq];
    const info = PIECES[ch.toUpperCase()];
    const mine = mySlot(st) >= 0 && (isWhitePiece(ch) === (mySlot(st) === 0));
    let html = `<div class="gm-hint-head"><span class="gm-hint-ic ${isWhitePiece(ch) ? 'w' : 'b'}">${glyph(ch)}</span><div><b>${info.name}</b> <small>${mine ? '(قطعتك)' : '(قطعة الخصم)'} · على ${sqName(sq)}</small></div></div>`;
    html += `<p>📖 <b>كيف بتتحرك:</b> ${info.how}</p>`;
    if (mine && S.myTurn) {
      const moves = S.byFrom[sq] || [];
      if (moves.length) {
        const tags = moves.map(m => {
          const target = S.board[m.to];
          let cls = 'tag', txt = sqName(m.to);
          if (m.flags & 2) { cls += ' cap'; txt += ' ⚔️ أكل بالمرور'; }
          else if (target) { cls += ' cap'; txt += ` ⚔️ بتاكل ${PIECES[target.toUpperCase()].name}`; }
          if (m.flags & 12) { cls += ' sp'; txt += ' 🏰 تبييت'; }
          if (m.promo) txt += ' 👑 ترقية';
          return `<span class="${cls}">${txt}</span>`;
        });
        const uniq = [];
        const seen = {};
        tags.forEach(t => { if (!seen[t]) { seen[t] = 1; uniq.push(t); } });
        html += `<p>🎯 <b>وين بتقدر تروح الآن (${uniq.length}):</b><br>${uniq.join('')}</p>`;
      } else {
        html += `<p class="warn">⛔ هذه القطعة ما إلها حركات الآن${st.check ? ': ملكك في كش، لازم تحميه أولاً.' : ': هي محاصرة أو حركتها بتعرّض ملكك للكش.'}</p>`;
      }
    } else if (mine) {
      html += '<p><small>استنى دورك لتشوف حركاتك المتاحة.</small></p>';
    }
    return html;
  }

  function renderGame() {
    const st = S.state;
    S.screen = 'game';
    if (!Engine) { ensureEngine(render); }
    const me = mySlot(st);
    const flipped = me === 1;
    S.board = fenBoard(st.fen);
    S.myTurn = st.status === 'active' && me >= 0 && turnIdx(st) === me;
    S.byFrom = {};
    if (S.myTurn && Engine) {
      try { legalList(st.fen).forEach(m => { (S.byFrom[m.from] = S.byFrom[m.from] || []).push(m); }); } catch (e) {}
    }
    if (S.sel !== null && !S.board[S.sel]) S.sel = null;

    wrap.innerHTML = '';
    const back = () => {
      if (me < 0 || st.status === 'finished') { leaveIfNeeded(); S.screen = 'hub'; requestLive(); }
      else S.screen = 'hub';
      render();
    };
    wrap.appendChild(header(me >= 0 ? '♞ الشطرنج' : '👁 مشاهدة', back));

    const topIdx = flipped ? 0 : 1, botIdx = flipped ? 1 : 0;
    wrap.appendChild(playerBar(st, topIdx));

    // اللوحة
    const boardBox = h('div', 'gm-board');
    const grid = h('div', 'gm-grid');
    const check = st.check && st.status === 'active';
    const kingCh = st.turn === 'w' ? 'K' : 'k';
    const tgts = {};
    if (S.sel !== null) (S.byFrom[S.sel] || []).forEach(m => { tgts[m.to] = m; });
    for (let i = 0; i < 64; i++) {
      const sq = flipped ? 63 - i : i;
      const f = sq & 7, r = sq >> 3;
      const ch = S.board[sq];
      let cls = 'gm-sq ' + (((f + r) & 1) ? 'd' : 'l');
      if (st.lastMove && (sqName(sq) === st.lastMove.from || sqName(sq) === st.lastMove.to)) cls += ' last';
      if (S.sel === sq) cls += ' sel';
      if (check && ch === kingCh) cls += ' check';
      if (tgts[sq]) cls += ' tgt' + ((S.board[sq] || (tgts[sq].flags & 2)) ? ' cap' : '');
      const cell = h('div', cls);
      cell.dataset.sq = String(sq);
      if (i % 8 === 0) cell.appendChild(h('span', 'gm-co r', String(8 - r)));
      if (i >= 56) cell.appendChild(h('span', 'gm-co f', FILES[f]));
      if (ch) {
        const moved = st.lastMove && sqName(sq) === st.lastMove.to && S.lastRenderedFen !== st.fen;
        cell.appendChild(h('span', 'gm-p ' + (isWhitePiece(ch) ? 'w' : 'b') + (moved ? ' moved' : ''), glyph(ch)));
      }
      on(cell, 'click', () => onSquare(sq));
      grid.appendChild(cell);
    }
    S.lastRenderedFen = st.fen;
    boardBox.appendChild(grid);

    if (S.promo) boardBox.appendChild(promoPicker(st, me));
    if (st.status === 'finished') boardBox.appendChild(resultCard(st, me));
    wrap.appendChild(boardBox);

    wrap.appendChild(playerBar(st, botIdx));

    // الحالة
    const stat = h('div', 'gm-status');
    if (st.status === 'finished') {
      const r = resultText(st); stat.classList.add('end'); stat.innerHTML = `${r.icon} ${r.title}${r.sub ? ' — ' + esc(r.sub) : ''}`;
    } else if (S.myTurn) {
      stat.classList.add(st.check ? 'warn' : 'me');
      stat.textContent = st.check ? '⚠️ كش! ملكك في خطر — دورك' : '✅ دورك الآن';
    } else {
      const cur = st.slots[turnIdx(st)];
      stat.textContent = cur.ai ? '🤔 الكمبيوتر يفكر...' : (cur.online === false ? `⚠️ ${cur.name} غير متصل حالياً` : `⏳ دور ${cur.name}`);
      if (st.check) { stat.classList.add('warn'); stat.textContent += ' — كش!'; }
    }
    wrap.appendChild(stat);

    // عرض تعادل
    if (st.status === 'active' && st.drawOffer !== null && me >= 0) {
      if (st.drawOffer !== me) {
        const box = h('div', 'gm-wait');
        box.appendChild(h('span', '', '🤝 خصمك بيعرض عليك التعادل'));
        const y = h('button', 'gm-btn sm', 'قبول'); y.type = 'button';
        const n = h('button', 'gm-btn sm danger', 'رفض'); n.type = 'button';
        on(y, 'click', () => socket.emit('games:draw_reply', { id: st.id, accept: true }));
        on(n, 'click', () => socket.emit('games:draw_reply', { id: st.id, accept: false }));
        box.appendChild(y); box.appendChild(n);
        wrap.appendChild(box);
      } else {
        wrap.appendChild(h('div', 'gm-wait', '<span>⏳ بانتظار رد خصمك على عرض التعادل...</span>'));
      }
    }

    // التلميحات
    if (S.hints) {
      const hint = h('div', 'gm-hint');
      if (S.sel !== null && S.board[S.sel]) hint.innerHTML = hintHtml(st, S.sel);
      else {
        const lm = lastMoveText(st);
        hint.innerHTML = (S.myTurn
          ? '👆 <b>اضغط على أي قطعة</b> لتعرف كيف بتتحرك وين تقدر تروح.'
          : '👆 اضغط على أي قطعة على اللوحة لتعرف كيف بتتحرك.') + (lm ? `<p><small>${lm}</small></p>` : '');
      }
      wrap.appendChild(hint);
    }

    // الأزرار
    const ctrls = h('div', 'gm-ctrls');
    const hintBtn = h('button', 'gm-btn sm ghost', S.hints ? '💡 التلميحات: تشغيل' : '💡 التلميحات: إيقاف');
    hintBtn.type = 'button';
    on(hintBtn, 'click', () => { S.hints = !S.hints; try { localStorage.setItem('gmHints', S.hints ? '1' : '0'); } catch (e) {} render(); });
    ctrls.appendChild(hintBtn);
    if (me >= 0 && st.status === 'active') {
      const rs = h('button', 'gm-btn sm danger', '🏳️ استسلام'); rs.type = 'button';
      on(rs, 'click', () => { if (confirm('متأكد بدك تستسلم؟')) socket.emit('games:resign', { id: st.id }); });
      ctrls.appendChild(rs);
      if (st.mode === 'pvp' && st.drawOffer === null) {
        const dr = h('button', 'gm-btn sm ghost', '🤝 عرض تعادل'); dr.type = 'button';
        on(dr, 'click', () => socket.emit('games:draw_offer', { id: st.id }));
        ctrls.appendChild(dr);
      }
    }
    if (me >= 0 && st.mode === 'pvp') {
      const cb = h('button', 'gm-btn sm ghost', '💬 شات خاص'); cb.type = 'button';
      const badge = h('span', 'gm-badge', String(S.unread));
      badge.style.display = S.unread > 0 && !S.chatOpen ? 'flex' : 'none';
      cb.appendChild(badge);
      on(cb, 'click', () => { S.chatOpen = !S.chatOpen; if (S.chatOpen) S.unread = 0; render(); });
      ctrls.appendChild(cb);
    }
    if (me < 0) ctrls.appendChild(h('div', 'gm-sub', `👁 أنت تشاهد المباراة · ${st.spectators} مشاهد`));
    wrap.appendChild(ctrls);

    // الشات الخاص (اللاعبان فقط)
    if (me >= 0 && st.mode === 'pvp') wrap.appendChild(chatPanel(st, me));

    // سجل النقلات
    if (st.moves.length) {
      const hist = h('div', 'gm-hist');
      st.moves.forEach((san, i) => {
        const mv = h('span', 'gm-mv', (i % 2 === 0 ? `<i>${(i >> 1) + 1}.</i>` : '') + esc(san));
        hist.appendChild(mv);
      });
      wrap.appendChild(hist);
      setTimeout(() => { hist.scrollLeft = hist.scrollWidth; }, 0);
    }
  }

  function playerBar(st, idx) {
    const slot = st.slots[idx];
    const white = idx === 0;
    const bar = h('div', 'gm-bar' + (st.status === 'active' && turnIdx(st) === idx ? ' turn' : ''));
    bar.appendChild(h('div', 'gm-av' + (white ? '' : ' b'), slot.ai ? '🤖' : (white ? '♔' : '♚')));
    const info = h('div', 'gm-binfo');
    const nm = h('div', 'gm-bname');
    nm.textContent = (slot.ai ? 'الكمبيوتر' : slot.name);
    info.appendChild(nm);
    const sub = slot.ai ? `مستوى: ${LEVELS[(slot.level || 3) - 1].label}` : (slot.online === false ? '⚠️ غير متصل' : (white ? 'الأبيض' : 'الأسود'));
    info.appendChild(h('div', 'gm-bsub', esc(sub)));
    bar.appendChild(info);
    const caps = (st.captured && st.captured[white ? 'w' : 'b']) || [];
    const order = { q: 0, r: 1, b: 2, n: 3, p: 4 };
    const sorted = caps.slice().sort((a, b) => order[a] - order[b]);
    const cap = h('div', 'gm-cap');
    cap.innerHTML = sorted.map(c => `<span class="${white ? 'b' : 'w'}">${GLYPH[c.toUpperCase()] + VS}</span>`).join('');
    const diff = materialDiff(S.board);
    const adv = white ? diff : -diff;
    if (adv > 0) cap.innerHTML += `<span class="gm-adv">+${adv}</span>`;
    bar.appendChild(cap);
    return bar;
  }

  function resultCard(st, me) {
    const r = resultText(st);
    const box = h('div', 'gm-result');
    box.appendChild(h('div', 'gm-trophy', r.icon));
    box.appendChild(h('h2', '', r.title));
    if (r.sub) box.appendChild(h('p', '', esc(r.sub)));
    if (me >= 0) {
      const again = h('button', 'gm-btn', '🔁 مباراة جديدة (نفس الخصم)'); again.type = 'button';
      on(again, 'click', () => socket.emit('games:rematch', { id: st.id }));
      box.appendChild(again);
    }
    const hub = h('button', 'gm-btn ghost', 'القائمة'); hub.type = 'button';
    on(hub, 'click', () => { leaveIfNeeded(); S.screen = 'hub'; requestLive(); render(); });
    box.appendChild(hub);
    const view = h('button', 'gm-btn ghost', 'عرض اللوحة'); view.type = 'button';
    on(view, 'click', () => box.remove());
    box.appendChild(view);
    return box;
  }

  function promoPicker(st, me) {
    const box = h('div', 'gm-promo');
    box.appendChild(h('b', '', 'اختار القطعة للترقية:'));
    const row = h('div');
    const white = me === 0;
    [['q', 'Q'], ['r', 'R'], ['b', 'B'], ['n', 'N']].forEach(([l, up]) => {
      const b = h('button', white ? 'w' : 'b', GLYPH[up] + VS); b.type = 'button';
      on(b, 'click', () => { const p = S.promo; S.promo = null; sendMove(p.from, p.to, l); });
      row.appendChild(b);
    });
    box.appendChild(row);
    const cancel = h('button', 'gm-btn sm ghost', 'إلغاء'); cancel.type = 'button';
    on(cancel, 'click', () => { S.promo = null; render(); });
    box.appendChild(cancel);
    return box;
  }

  /* ---------- الشات الخاص ---------- */
  let chatEl = null, chatMsgsEl = null, chatForId = null;
  function chatPanel(st, me) {
    if (!chatEl || chatForId !== st.id) {
      chatForId = st.id;
      chatEl = h('div', 'gm-chat');
      chatMsgsEl = h('div', 'gm-msgs');
      const form = h('form', 'gm-chatform');
      const input = h('input');
      input.type = 'text'; input.maxLength = 300; input.placeholder = 'اكتب رسالة لخصمك... (خاصة بينكم فقط)'; input.autocomplete = 'off';
      const send = h('button', 'gm-btn sm', 'إرسال'); send.type = 'submit';
      form.appendChild(input); form.appendChild(send);
      on(form, 'submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        socket.emit('games:chat', { id: st.id, text });
        input.value = '';
      });
      chatEl.appendChild(chatMsgsEl);
      chatEl.appendChild(form);
      S.chat.forEach(m => addChatBubble(m, me));
    }
    chatEl.classList.toggle('open', S.chatOpen);
    return chatEl;
  }
  function addChatBubble(msg, me) {
    if (!chatMsgsEl) return;
    const b = h('div', 'gm-msg' + (msg.from === me ? ' me' : ''));
    const who = h('small'); who.textContent = msg.name;
    const txt = h('span'); txt.textContent = msg.text;
    b.appendChild(who); b.appendChild(txt);
    chatMsgsEl.appendChild(b);
    chatMsgsEl.scrollTop = chatMsgsEl.scrollHeight;
  }

  /* ---------- التفاعل مع اللوحة ---------- */
  function onSquare(sq) {
    const st = S.state;
    if (!st || S.promo) return;
    if (S.sel !== null && S.myTurn) {
      const cands = (S.byFrom[S.sel] || []).filter(m => m.to === sq);
      if (cands.length) {
        if (cands[0].promo) { S.promo = { from: S.sel, to: sq }; render(); return; }
        sendMove(S.sel, sq, '');
        return;
      }
    }
    S.sel = (S.board[sq] && S.sel !== sq) ? sq : null;
    render();
  }

  function sendMove(fromSq, toSq, promo) {
    const st = S.state;
    if (!st) return;
    S.sel = null;
    socket.emit('games:move', { id: st.id, from: sqName(fromSq), to: sqName(toSq), promo: promo || '' });
    render();
  }
  function leaveIfNeeded() {
    const st = S.state;
    if (!st) return;
    const me = mySlot(st);
    if (me < 0 || st.status === 'finished') {
      socket.emit('games:leave', { id: st.id });
      S.state = null; S.currentId = null; S.chat = []; S.unread = 0; S.chatOpen = false; S.sel = null; S.aiFen = null;
      chatEl = null; chatMsgsEl = null; chatForId = null;
    }
  }

  /* ---------- حركة الكمبيوتر (بيحسبها جهازك والسيرفر بيتحقق) ---------- */
  function maybeAI() {
    const st = S.state;
    if (!st || st.mode !== 'ai' || st.status !== 'active' || !Engine) return;
    const slot = st.slots[turnIdx(st)];
    if (!slot.ai) return;
    const host = st.slots[st.hostSlot];
    if (!host || host.id !== myId()) return;
    if (S.aiFen === st.fen) return;
    S.aiFen = st.fen;
    const t0 = Date.now();
    askAI(st.fen, slot.level || 3, st.rep2 || [], (res) => {
      setTimeout(() => {
        const cur = S.state;
        if (!cur || cur.id !== st.id || cur.fen !== st.fen || cur.status !== 'active') return;
        let mv = null;
        try {
          const legal = legalList(cur.fen);
          if (res && legal.some(m => sqName(m.from) === res.from && sqName(m.to) === res.to)) mv = res;
          else if (legal.length) {
            const r = legal[Math.floor(Math.random() * legal.length)];
            mv = { from: sqName(r.from), to: sqName(r.to), promo: r.promo ? PROMO_LETTER[r.promo] : '' };
          }
        } catch (e) {}
        if (mv) socket.emit('games:ai_move', { id: st.id, from: mv.from, to: mv.to, promo: mv.promo || '' });
      }, Math.max(0, 700 - (Date.now() - t0)));
    });
  }

  /* ------------------------------------------------------------------ */
  /*  الدعوات                                                             */
  /* ------------------------------------------------------------------ */
  function showInviteBox() {
    if (invitesBox.children.length) { invitesBox.style.display = 'flex'; if (typeof topLayerShow === 'function') topLayerShow(invitesBox); }
    else { if (typeof topLayerHide === 'function') topLayerHide(invitesBox); invitesBox.style.display = 'none'; }
    updateLaunchAlert();
  }
  function removeInvite(id) {
    [...invitesBox.children].forEach(c => { if (c.dataset.id === id) c.remove(); });
    showInviteBox();
  }

  socket.on('games:invite', (d) => {
    const side = d.pref === 'white' ? 'الأسود' : d.pref === 'black' ? 'الأبيض' : 'لون عشوائي';
    const card = h('div', 'gm-inv');
    card.dataset.id = d.id;
    const p = h('p');
    p.textContent = `♞ ${d.from.name} بيتحداك بمباراة شطرنج — رح تلعب بـ${side}`;
    const row = h('div');
    const y = h('button', 'gm-btn sm', '✅ قبول'); y.type = 'button';
    const n = h('button', 'gm-btn sm danger', '⛔ رفض'); n.type = 'button';
    on(y, 'click', () => {
      ensureEngine(() => socket.emit('games:invite_reply', { id: d.id, accept: true }));
      removeInvite(d.id);
    });
    on(n, 'click', () => { socket.emit('games:invite_reply', { id: d.id, accept: false }); removeInvite(d.id); });
    row.appendChild(y); row.appendChild(n);
    card.appendChild(p); card.appendChild(row);
    invitesBox.appendChild(card);
    showInviteBox();
    if (typeof playNotificationSound === 'function') playNotificationSound();
    setTimeout(() => removeInvite(d.id), 62000);
  });

  socket.on('games:invite_sent', (d) => { S.outInvite = { id: d.id, name: d.to.name }; render(); });

  socket.on('games:invite_result', (d) => {
    removeInvite(d.id);
    if (S.outInvite && S.outInvite.id === d.id) {
      S.outInvite = null;
      if (d.status === 'declined') toast(`${d.by || 'اللاعب'} رفض الدعوة`);
      else if (d.status === 'expired') toast('انتهت مهلة الدعوة بدون رد');
      else if (d.status === 'cancelled') toast('تم إلغاء الدعوة');
      render();
    }
  });

  /* ------------------------------------------------------------------ */
  /*  أحداث السيرفر                                                       */
  /* ------------------------------------------------------------------ */
  function adopt(st, chat) {
    S.currentId = st.id;
    S.state = st;
    if (chat) { S.chat = chat; chatEl = null; chatMsgsEl = null; chatForId = null; }
  }

  socket.on('updatePlayers', (list) => { S.players = list || []; if (S.open && S.screen === 'hub') render(); });

  socket.on('games:live', (d) => { S.live = d || { sessions: [], busy: [] }; if (S.open && S.screen === 'hub') render(); });

  socket.on('games:started', (d) => {
    S.currentId = d.id; S.chat = []; S.unread = 0; S.chatOpen = false; S.sel = null; S.aiFen = null; S.outInvite = null;
    chatEl = null; chatMsgsEl = null; chatForId = null;
    ensureEngine(() => { if (!S.open) openOverlay(); S.screen = 'game'; render(); });
  });

  socket.on('games:state', (st) => {
    if (!st || !S.currentId || st.id !== S.currentId) return;
    adopt(st);
    ensureEngine(() => {
      if (S.open) render();
      maybeAI();
      updateLaunchAlert();
    });
  });

  socket.on('games:resume', (d) => {
    if (!d || !d.state) return;
    adopt(d.state, d.chat || []);
    S.aiFen = null;
    ensureEngine(() => {
      if (d.state.status === 'active' && !S.open) openOverlay();
      if (S.open) { S.screen = 'game'; render(); }
      maybeAI();
      updateLaunchAlert();
    });
  });

  socket.on('games:chat', (d) => {
    if (!d || d.id !== S.currentId) return;
    S.chat.push(d.msg);
    const me = S.state ? mySlot(S.state) : -1;
    addChatBubble(d.msg, me);
    if (d.msg.from !== me && !(S.open && S.chatOpen)) {
      S.unread++;
      if (S.open) render();
      if (typeof playNotificationSound === 'function') playNotificationSound();
    }
  });

  socket.on('games:closed', (d) => {
    if (d && d.id === S.currentId) {
      S.state = null; S.currentId = null; S.chat = []; S.sel = null; S.promo = null;
      chatEl = null; chatMsgsEl = null; chatForId = null;
      if (S.open) { S.screen = 'hub'; render(); }
      updateLaunchAlert();
    }
  });

  socket.on('games:error', (d) => {
    if (d && d.message) toast(d.message);
    if (d && d.id && S.state && d.id === S.state.id && S.state.mode === 'ai' && S.aiRetries < 3) {
      S.aiRetries++; S.aiFen = null; setTimeout(maybeAI, 800);
    }
  });

  // لو انحجب اللاعب أو انطرد: بنسكّر كل شي
  socket.on('gate:blocked', () => {
    closeOverlay();
    S.state = null; S.currentId = null; S.chat = []; S.sel = null; S.outInvite = null; S.screen = 'menu';
    invitesBox.innerHTML = ''; showInviteBox();
  });

  socket.on('connect', () => { S.aiFen = null; S.aiRetries = 0; });
})();

/* ==========================================================================
   ♟️ محرك الشطرنج - قواعد كاملة + ذكاء اصطناعي بخمس مستويات
   نفس الملف بيشتغل على السيرفر (للتحقق من الحركات) وعلى المتصفح، وكـ Web Worker للذكاء الاصطناعي
   ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChessEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
  var WK = 1, WQ = 2, BK = 4, BQ = 8;
  var F_DOUBLE = 1, F_EP = 2, F_CK = 4, F_CQ = 8, F_CAP = 16;
  var FILES = 'abcdefgh';
  var LETTER = { 1: 'P', 2: 'N', 3: 'B', 4: 'R', 5: 'Q', 6: 'K' };
  var TYPE_OF = { p: 1, n: 2, b: 3, r: 4, q: 5, k: 6 };
  var START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  // المربع 0 = a8 ... 63 = h1
  function sqName(s) { return FILES[s & 7] + (8 - (s >> 3)); }
  function nameSq(n) { return (8 - (n.charCodeAt(1) - 48)) * 8 + (n.charCodeAt(0) - 97); }

  var KNIGHT = [], KING = [], RAY = [];
  var DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
  (function init() {
    var KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
    for (var s = 0; s < 64; s++) {
      var r = s >> 3, f = s & 7, kn = [], kg = [];
      KN.forEach(function (d) {
        var rr = r + d[0], ff = f + d[1];
        if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) kn.push(rr * 8 + ff);
      });
      DIRS.forEach(function (d) {
        var rr = r + d[0], ff = f + d[1];
        if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) kg.push(rr * 8 + ff);
      });
      KNIGHT[s] = kn;
      KING[s] = kg;
      RAY[s] = DIRS.map(function (d) {
        var out = [], rr = r + d[0], ff = f + d[1];
        while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) { out.push(rr * 8 + ff); rr += d[0]; ff += d[1]; }
        return out;
      });
    }
  })();

  var CASTLE_MASK = new Int8Array(64).fill(15);
  CASTLE_MASK[60] = 15 & ~(WK | WQ); CASTLE_MASK[63] = 15 & ~WK; CASTLE_MASK[56] = 15 & ~WQ;
  CASTLE_MASK[4] = 15 & ~(BK | BQ); CASTLE_MASK[7] = 15 & ~BK; CASTLE_MASK[0] = 15 & ~BQ;

  /* ======================================================================
     الرقعة
     ====================================================================== */
  function Position() {
    this.board = new Int8Array(64);
    this.turn = 1; this.castle = 0; this.ep = -1; this.half = 0; this.full = 1;
    this.wk = -1; this.bk = -1;
    this.stMove = new Int32Array(2048);
    this.stCap = new Int8Array(2048);
    this.stCastle = new Int8Array(2048);
    this.stEp = new Int8Array(2048);
    this.stHalf = new Int16Array(2048);
    this.ply = 0;
  }

  Position.prototype.load = function (fen) {
    var parts = fen.trim().split(/\s+/), rows = parts[0].split('/');
    this.board.fill(0);
    for (var r = 0; r < 8; r++) {
      var f = 0;
      for (var i = 0; i < rows[r].length; i++) {
        var ch = rows[r][i];
        if (ch >= '1' && ch <= '8') { f += +ch; continue; }
        var lower = ch.toLowerCase(), t = TYPE_OF[lower], color = ch === lower ? -1 : 1, s = r * 8 + f;
        this.board[s] = color * t;
        if (t === K) { if (color === 1) this.wk = s; else this.bk = s; }
        f++;
      }
    }
    this.turn = parts[1] === 'b' ? -1 : 1;
    var cs = parts[2] || '-', c = 0;
    if (cs.indexOf('K') >= 0) c |= WK;
    if (cs.indexOf('Q') >= 0) c |= WQ;
    if (cs.indexOf('k') >= 0) c |= BK;
    if (cs.indexOf('q') >= 0) c |= BQ;
    this.castle = c;
    this.ep = parts[3] && parts[3] !== '-' ? nameSq(parts[3]) : -1;
    this.half = parseInt(parts[4] || '0', 10) || 0;
    this.full = parseInt(parts[5] || '1', 10) || 1;
    this.ply = 0;
    return this;
  };

  Position.prototype.fen = function () {
    var out = [];
    for (var r = 0; r < 8; r++) {
      var row = '', empty = 0;
      for (var f = 0; f < 8; f++) {
        var p = this.board[r * 8 + f];
        if (!p) { empty++; continue; }
        if (empty) { row += empty; empty = 0; }
        var ch = 'pnbrqk'.charAt(Math.abs(p) - 1);
        row += p > 0 ? ch.toUpperCase() : ch;
      }
      if (empty) row += empty;
      out.push(row);
    }
    var c = '';
    if (this.castle & WK) c += 'K';
    if (this.castle & WQ) c += 'Q';
    if (this.castle & BK) c += 'k';
    if (this.castle & BQ) c += 'q';
    return out.join('/') + ' ' + (this.turn === 1 ? 'w' : 'b') + ' ' + (c || '-') + ' ' +
      (this.ep >= 0 ? sqName(this.ep) : '-') + ' ' + this.half + ' ' + this.full;
  };

  // مفتاح الوضعية لكشف التكرار (الـ en passant يُحسب فقط لو ممكن فعلاً)
  Position.prototype.key = function () {
    var parts = this.fen().split(' ');
    var epOk = false;
    if (this.ep >= 0) {
      var b = this.board, ep = this.ep, f = ep & 7;
      if (this.turn === 1) epOk = (f > 0 && b[ep + 7] === P) || (f < 7 && b[ep + 9] === P);
      else epOk = (f > 0 && b[ep - 9] === -P) || (f < 7 && b[ep - 7] === -P);
    }
    return parts[0] + ' ' + parts[1] + ' ' + parts[2] + ' ' + (epOk ? parts[3] : '-');
  };

  Position.prototype.isAttacked = function (sq, by) {
    var b = this.board, r = sq >> 3, f = sq & 7, i, j, ray, p;
    if (by === 1) {
      if (r < 7) { if (f > 0 && b[sq + 7] === P) return true; if (f < 7 && b[sq + 9] === P) return true; }
    } else {
      if (r > 0) { if (f > 0 && b[sq - 9] === -P) return true; if (f < 7 && b[sq - 7] === -P) return true; }
    }
    var kn = KNIGHT[sq], nn = by * N;
    for (i = 0; i < kn.length; i++) if (b[kn[i]] === nn) return true;
    var kg = KING[sq], kk = by * K;
    for (i = 0; i < kg.length; i++) if (b[kg[i]] === kk) return true;
    var rr = by * R, qq = by * Q, bb = by * B;
    for (i = 0; i < 4; i++) {
      ray = RAY[sq][i];
      for (j = 0; j < ray.length; j++) { p = b[ray[j]]; if (p) { if (p === rr || p === qq) return true; break; } }
    }
    for (i = 4; i < 8; i++) {
      ray = RAY[sq][i];
      for (j = 0; j < ray.length; j++) { p = b[ray[j]]; if (p) { if (p === bb || p === qq) return true; break; } }
    }
    return false;
  };

  Position.prototype.inCheck = function () {
    return this.isAttacked(this.turn === 1 ? this.wk : this.bk, -this.turn);
  };

  var PROMOS = [Q, R, B, N];

  // توليد الحركات (شبه قانونية). capsOnly = الأكل والترقية فقط (للبحث الهادئ)
  Position.prototype.genMoves = function (capsOnly, onlySq) {
    var b = this.board, us = this.turn, moves = [], s, p, t, i, j, to, tp, ray, kn, kg;
    var from0 = onlySq === undefined ? 0 : onlySq, to0 = onlySq === undefined ? 64 : onlySq + 1;
    for (s = from0; s < to0; s++) {
      p = b[s];
      if (!p || (p > 0 ? 1 : -1) !== us) continue;
      t = p * us;
      if (t === P) {
        var r = s >> 3, f = s & 7, dir = us === 1 ? -8 : 8;
        var promoRank = us === 1 ? 1 : 6, startRank = us === 1 ? 6 : 1, one = s + dir;
        if (!b[one]) {
          if (r === promoRank) {
            if (capsOnly) moves.push(s | (one << 6) | (Q << 12));
            else for (j = 0; j < 4; j++) moves.push(s | (one << 6) | (PROMOS[j] << 12));
          } else if (!capsOnly) {
            moves.push(s | (one << 6));
            if (r === startRank && !b[one + dir]) moves.push(s | ((one + dir) << 6) | (F_DOUBLE << 16));
          }
        }
        for (var df = -1; df <= 1; df += 2) {
          var ff = f + df;
          if (ff < 0 || ff > 7) continue;
          to = one + df; tp = b[to];
          if (tp && (tp > 0 ? 1 : -1) !== us) {
            if (r === promoRank) for (j = 0; j < 4; j++) moves.push(s | (to << 6) | (PROMOS[j] << 12) | (F_CAP << 16));
            else moves.push(s | (to << 6) | (F_CAP << 16));
          } else if (!tp && to === this.ep) {
            moves.push(s | (to << 6) | ((F_EP | F_CAP) << 16));
          }
        }
      } else if (t === N) {
        kn = KNIGHT[s];
        for (i = 0; i < kn.length; i++) {
          to = kn[i]; tp = b[to];
          if (!tp) { if (!capsOnly) moves.push(s | (to << 6)); }
          else if ((tp > 0 ? 1 : -1) !== us) moves.push(s | (to << 6) | (F_CAP << 16));
        }
      } else if (t === K) {
        kg = KING[s];
        for (i = 0; i < kg.length; i++) {
          to = kg[i]; tp = b[to];
          if (!tp) { if (!capsOnly) moves.push(s | (to << 6)); }
          else if ((tp > 0 ? 1 : -1) !== us) moves.push(s | (to << 6) | (F_CAP << 16));
        }
        if (!capsOnly) {
          if (us === 1 && s === 60) {
            if ((this.castle & WK) && !b[61] && !b[62] && b[63] === R &&
              !this.isAttacked(60, -1) && !this.isAttacked(61, -1) && !this.isAttacked(62, -1))
              moves.push(s | (62 << 6) | (F_CK << 16));
            if ((this.castle & WQ) && !b[59] && !b[58] && !b[57] && b[56] === R &&
              !this.isAttacked(60, -1) && !this.isAttacked(59, -1) && !this.isAttacked(58, -1))
              moves.push(s | (58 << 6) | (F_CQ << 16));
          } else if (us === -1 && s === 4) {
            if ((this.castle & BK) && !b[5] && !b[6] && b[7] === -R &&
              !this.isAttacked(4, 1) && !this.isAttacked(5, 1) && !this.isAttacked(6, 1))
              moves.push(s | (6 << 6) | (F_CK << 16));
            if ((this.castle & BQ) && !b[3] && !b[2] && !b[1] && b[0] === -R &&
              !this.isAttacked(4, 1) && !this.isAttacked(3, 1) && !this.isAttacked(2, 1))
              moves.push(s | (2 << 6) | (F_CQ << 16));
          }
        }
      } else {
        var d0 = t === B ? 4 : 0, d1 = t === R ? 4 : 8;
        for (i = d0; i < d1; i++) {
          ray = RAY[s][i];
          for (j = 0; j < ray.length; j++) {
            to = ray[j]; tp = b[to];
            if (!tp) { if (!capsOnly) moves.push(s | (to << 6)); }
            else {
              if ((tp > 0 ? 1 : -1) !== us) moves.push(s | (to << 6) | (F_CAP << 16));
              break;
            }
          }
        }
      }
    }
    return moves;
  };

  Position.prototype.make = function (m) {
    var b = this.board, from = m & 63, to = (m >> 6) & 63, promo = (m >> 12) & 15, fl = m >> 16;
    var piece = b[from], us = piece > 0 ? 1 : -1, cap = b[to], ply = this.ply;
    this.stMove[ply] = m; this.stCastle[ply] = this.castle; this.stEp[ply] = this.ep; this.stHalf[ply] = this.half;
    if (fl & F_EP) { var cs = to + (us === 1 ? 8 : -8); cap = b[cs]; b[cs] = 0; }
    this.stCap[ply] = cap;
    b[to] = promo ? us * promo : piece;
    b[from] = 0;
    if (fl & F_CK) { b[to - 1] = b[to + 1]; b[to + 1] = 0; }
    else if (fl & F_CQ) { b[to + 1] = b[to - 2]; b[to - 2] = 0; }
    if (piece === K * us) { if (us === 1) this.wk = to; else this.bk = to; }
    this.castle &= CASTLE_MASK[from] & CASTLE_MASK[to];
    this.ep = (fl & F_DOUBLE) ? (from + to) >> 1 : -1;
    if (piece === P * us || cap) this.half = 0; else this.half++;
    if (us === -1) this.full++;
    this.turn = -us;
    this.ply = ply + 1;
  };

  Position.prototype.unmake = function () {
    var ply = --this.ply, m = this.stMove[ply];
    var from = m & 63, to = (m >> 6) & 63, promo = (m >> 12) & 15, fl = m >> 16;
    var b = this.board, us = -this.turn;
    var piece = promo ? us * P : b[to], cap = this.stCap[ply];
    b[from] = piece;
    if (fl & F_EP) { b[to] = 0; b[to + (us === 1 ? 8 : -8)] = cap; } else b[to] = cap;
    if (fl & F_CK) { b[to + 1] = b[to - 1]; b[to - 1] = 0; }
    else if (fl & F_CQ) { b[to - 2] = b[to + 1]; b[to + 1] = 0; }
    if (piece === K * us) { if (us === 1) this.wk = from; else this.bk = from; }
    this.castle = this.stCastle[ply]; this.ep = this.stEp[ply]; this.half = this.stHalf[ply];
    if (us === -1) this.full--;
    this.turn = us;
  };

  function filterLegal(pos, pseudo) {
    var out = [], us = pos.turn;
    for (var i = 0; i < pseudo.length; i++) {
      pos.make(pseudo[i]);
      if (!pos.isAttacked(us === 1 ? pos.wk : pos.bk, -us)) out.push(pseudo[i]);
      pos.unmake();
    }
    return out;
  }

  Position.prototype.legalMoves = function () { return filterLegal(this, this.genMoves(false)); };
  Position.prototype.legalMovesFrom = function (sq) { return filterLegal(this, this.genMoves(false, sq)); };
  Position.prototype.pseudoMovesFrom = function (sq) { return this.genMoves(false, sq); };

  function perft(pos, depth) {
    if (depth === 0) return 1;
    var moves = pos.genMoves(false), n = 0, us = pos.turn;
    for (var i = 0; i < moves.length; i++) {
      pos.make(moves[i]);
      if (!pos.isAttacked(us === 1 ? pos.wk : pos.bk, -us)) n += depth === 1 ? 1 : perft(pos, depth - 1);
      pos.unmake();
    }
    return n;
  }

  /* ======================================================================
     اللعبة: حركات + SAN + نتيجة
     ====================================================================== */
  function insufficient(pos) {
    var b = pos.board, minors = 0, bishopColors = {}, knights = 0;
    for (var s = 0; s < 64; s++) {
      var t = Math.abs(b[s]);
      if (!t || t === K) continue;
      if (t === P || t === R || t === Q) return false;
      minors++;
      if (t === N) knights++;
      else bishopColors[((s >> 3) + (s & 7)) & 1] = true;
    }
    if (minors <= 1) return true;
    if (knights === 0 && Object.keys(bishopColors).length === 1) return true;
    return false;
  }

  function Game(fen) {
    this.pos = new Position().load(fen || START_FEN);
    this.sanList = [];
    this.lastMove = null;
    this.captured = { w: [], b: [] };
    this.keys = {};
    this._addKey();
  }
  Game.prototype._addKey = function () {
    var k = this.pos.key();
    this.keys[k] = (this.keys[k] || 0) + 1;
  };
  Game.prototype.fen = function () { return this.pos.fen(); };
  Game.prototype.rep2 = function () {
    var self = this;
    return Object.keys(this.keys).filter(function (k) { return self.keys[k] >= 2; });
  };

  Game.prototype.findMove = function (from, to, promo) {
    if (typeof from !== 'string' || typeof to !== 'string' || !/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) return null;
    var legal = this.pos.legalMoves(), f = nameSq(from), t = nameSq(to);
    var pr = promo ? (TYPE_OF[String(promo).toLowerCase()] || 0) : 0;
    for (var i = 0; i < legal.length; i++) {
      var m = legal[i];
      if ((m & 63) !== f || ((m >> 6) & 63) !== t) continue;
      var mp = (m >> 12) & 15;
      if (mp) { if ((pr || Q) === mp) return m; }
      else return m;
    }
    return null;
  };

  Game.prototype.san = function (m, legal) {
    var pos = this.pos, from = m & 63, to = (m >> 6) & 63, promo = (m >> 12) & 15, fl = m >> 16;
    var piece = Math.abs(pos.board[from]), s, i;
    if (fl & F_CK) s = 'O-O';
    else if (fl & F_CQ) s = 'O-O-O';
    else {
      var cap = (fl & F_CAP) !== 0;
      if (piece === P) {
        s = cap ? FILES[from & 7] + 'x' : '';
        s += sqName(to);
        if (promo) s += '=' + LETTER[promo];
      } else {
        s = LETTER[piece];
        var ambiguous = false, sameFile = false, sameRank = false;
        for (i = 0; i < legal.length; i++) {
          var o = legal[i];
          if (o === m) continue;
          var of = o & 63;
          if (((o >> 6) & 63) === to && Math.abs(pos.board[of]) === piece) {
            ambiguous = true;
            if ((of & 7) === (from & 7)) sameFile = true;
            if ((of >> 3) === (from >> 3)) sameRank = true;
          }
        }
        if (ambiguous) {
          if (!sameFile) s += FILES[from & 7];
          else if (!sameRank) s += (8 - (from >> 3));
          else s += sqName(from);
        }
        if (cap) s += 'x';
        s += sqName(to);
      }
    }
    pos.make(m);
    var chk = pos.inCheck(), hasMove = true;
    if (chk) hasMove = pos.legalMoves().length > 0;
    pos.unmake();
    if (chk) s += hasMove ? '+' : '#';
    return s;
  };

  // ينفذ حركة. بيرجع null لو غير قانونية
  Game.prototype.move = function (from, to, promo) {
    var m = this.findMove(from, to, promo);
    if (m === null) return null;
    var legal = this.pos.legalMoves();
    var san = this.san(m, legal);
    var mover = this.pos.turn;
    var mf = m & 63, mt = (m >> 6) & 63;
    this.pos.make(m);
    var cap = Math.abs(this.pos.stCap[this.pos.ply - 1]);
    if (cap) this.captured[mover === 1 ? 'w' : 'b'].push(LETTER[cap].toLowerCase());
    this.sanList.push(san);
    this.lastMove = { from: sqName(mf), to: sqName(mt) };
    this._addKey();
    return { san: san, from: sqName(mf), to: sqName(mt), captured: cap ? LETTER[cap].toLowerCase() : '', flags: m >> 16, promo: (m >> 12) & 15 ? LETTER[(m >> 12) & 15].toLowerCase() : '' };
  };

  Game.prototype.status = function () {
    var pos = this.pos, legal = pos.legalMoves();
    if (!legal.length) {
      if (pos.inCheck()) return { over: true, result: pos.turn === 1 ? '0-1' : '1-0', reason: 'checkmate' };
      return { over: true, result: '1/2-1/2', reason: 'stalemate' };
    }
    if (pos.half >= 100) return { over: true, result: '1/2-1/2', reason: 'fifty' };
    if (insufficient(pos)) return { over: true, result: '1/2-1/2', reason: 'insufficient' };
    if (this.keys[pos.key()] >= 3) return { over: true, result: '1/2-1/2', reason: 'repetition' };
    return { over: false, check: pos.inCheck() };
  };

  /* ======================================================================
     الذكاء الاصطناعي
     ====================================================================== */
  var VALUE = [0, 100, 320, 330, 500, 900, 0];
  var PST = {
    1: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    2: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    3: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    4: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    5: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    6: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20]
  };
  var KING_END = [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50];

  var MATE = 100000, INF = 1000000;

  // التقييم من وجهة نظر اللي عليه الدور
  function evaluate(pos) {
    var b = pos.board, s, p, t, npm = 0, score = 0, wB = 0, bBi = 0;
    for (s = 0; s < 64; s++) {
      p = b[s];
      if (!p) continue;
      t = p > 0 ? p : -p;
      if (t !== P && t !== K) npm += VALUE[t];
    }
    var endgame = npm <= 2400;
    for (s = 0; s < 64; s++) {
      p = b[s];
      if (!p) continue;
      if (p > 0) {
        score += VALUE[p] + (p === K ? (endgame ? KING_END[s] : PST[6][s]) : PST[p][s]);
        if (p === B) wB++;
      } else {
        t = -p;
        score -= VALUE[t] + (t === K ? (endgame ? KING_END[s ^ 56] : PST[6][s ^ 56]) : PST[t][s ^ 56]);
        if (t === B) bBi++;
      }
    }
    if (wB >= 2) score += 30;
    if (bBi >= 2) score -= 30;
    return pos.turn === 1 ? score : -score;
  }

  function moveScore(pos, m, pv, st, ply) {
    if (m === pv) return 1e9;
    var fl = m >> 16, promo = (m >> 12) & 15;
    if (fl & F_CAP) {
      var victim = (fl & F_EP) ? P : Math.abs(pos.board[(m >> 6) & 63]);
      return 100000 + victim * 10 - Math.abs(pos.board[m & 63]) + (promo ? 5000 : 0);
    }
    if (promo) return 90000 + promo;
    if (st && st.killers[ply * 2] === m) return 80000;
    if (st && st.killers[ply * 2 + 1] === m) return 79000;
    return st ? Math.min(st.hist[m & 4095], 70000) : 0;
  }

  function orderMoves(pos, moves, pv, st, ply) {
    var n = moves.length, sc = new Array(n), i, j, m, s;
    for (i = 0; i < n; i++) sc[i] = moveScore(pos, moves[i], pv, st, ply);
    for (i = 1; i < n; i++) {
      m = moves[i]; s = sc[i]; j = i - 1;
      while (j >= 0 && sc[j] < s) { moves[j + 1] = moves[j]; sc[j + 1] = sc[j]; j--; }
      moves[j + 1] = m; sc[j + 1] = s;
    }
  }

  function qsearch(pos, alpha, beta, st, qd) {
    st.nodes++;
    var stand = evaluate(pos);
    if (qd >= 6 || stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    var moves = pos.genMoves(true), us = pos.turn, i, score;
    orderMoves(pos, moves, 0, null, 0);
    for (i = 0; i < moves.length; i++) {
      pos.make(moves[i]);
      if (pos.isAttacked(us === 1 ? pos.wk : pos.bk, -us)) { pos.unmake(); continue; }
      score = -qsearch(pos, -beta, -alpha, st, qd + 1);
      pos.unmake();
      if (score >= beta) return score;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  function negamax(pos, depth, alpha, beta, ply, st) {
    st.nodes++;
    if ((st.nodes & 2047) === 0 && Date.now() > st.deadline) st.abort = true;
    if (st.abort) return 0;
    if (pos.half >= 100) return 0;
    var us = pos.turn, inCheck = pos.inCheck();
    if (inCheck && ply < 40) depth++;
    if (depth <= 0) return qsearch(pos, alpha, beta, st, 0);

    var moves = pos.genMoves(false), best = -INF, legal = 0, i, m, score;
    orderMoves(pos, moves, 0, st, ply);
    for (i = 0; i < moves.length; i++) {
      m = moves[i];
      pos.make(m);
      if (pos.isAttacked(us === 1 ? pos.wk : pos.bk, -us)) { pos.unmake(); continue; }
      legal++;
      score = -negamax(pos, depth - 1, -beta, -alpha, ply + 1, st);
      pos.unmake();
      if (st.abort) return 0;
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) {
        if (!(m >> 16 & F_CAP) && !((m >> 12) & 15)) {
          if (st.killers[ply * 2] !== m) { st.killers[ply * 2 + 1] = st.killers[ply * 2]; st.killers[ply * 2] = m; }
          st.hist[m & 4095] += depth * depth;
        }
        break;
      }
    }
    if (!legal) return inCheck ? -MATE + ply : 0;
    return best;
  }

  var LEVELS = {
    1: { depth: 1, noise: 220, time: 400 },
    2: { depth: 2, noise: 90, time: 800 },
    3: { depth: 3, noise: 25, time: 1500 },
    4: { depth: 5, noise: 0, time: 2200 },
    5: { depth: 9, noise: 0, time: 4000 }
  };

  function toMoveObj(m) {
    var promo = (m >> 12) & 15;
    return { from: sqName(m & 63), to: sqName((m >> 6) & 63), promo: promo ? LETTER[promo].toLowerCase() : '' };
  }

  // أفضل حركة حسب المستوى (1 = مبتدئ ... 5 = خبير)
  function findBestMove(fen, level, rep2) {
    var cfg = LEVELS[level] || LEVELS[3];
    var pos = new Position().load(fen);
    var rep = {};
    (rep2 || []).forEach(function (k) { rep[k] = true; });
    var st = { nodes: 0, abort: false, deadline: Date.now() + cfg.time, killers: new Int32Array(256), hist: new Int32Array(4096) };
    var rootMoves = pos.legalMoves();
    if (!rootMoves.length) return null;
    if (rootMoves.length === 1) return Object.assign(toMoveObj(rootMoves[0]), { score: 0, depth: 0, nodes: 0 });

    // خلط عشوائي حتى ما تتكرر نفس الحركات بالتعادل
    for (var i = rootMoves.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), tmp = rootMoves[i]; rootMoves[i] = rootMoves[j]; rootMoves[j] = tmp;
    }
    var us = pos.turn;

    function scoreRoot(m, depth, alpha, beta) {
      pos.make(m);
      var sc;
      if (rep[pos.key()]) sc = 0;                       // يتجنب التكرار الثلاثي لو متقدم
      else sc = -negamax(pos, depth - 1, -beta, -alpha, 1, st);
      pos.unmake();
      return sc;
    }

    // مستويات ضعيفة: تقييم كل حركة + ضوضاء عشوائية
    if (cfg.noise > 0) {
      var bestM = rootMoves[0], bestS = -INF, k;
      for (k = 0; k < rootMoves.length; k++) {
        var sc = scoreRoot(rootMoves[k], cfg.depth, -INF, INF);
        sc += (Math.random() * 2 - 1) * cfg.noise;
        if (sc > bestS) { bestS = sc; bestM = rootMoves[k]; }
      }
      return Object.assign(toMoveObj(bestM), { score: bestS, depth: cfg.depth, nodes: st.nodes });
    }

    // مستويات قوية: تعميق تدريجي مع حد زمني
    orderMoves(pos, rootMoves, 0, st, 0);
    var bestMove = rootMoves[0], bestScore = -INF, doneDepth = 0, d;
    for (d = 1; d <= cfg.depth; d++) {
      var iterBest = null, iterScore = -INF, alpha = -INF, n;
      for (n = 0; n < rootMoves.length; n++) {
        var s2 = scoreRoot(rootMoves[n], d, alpha, INF);
        if (st.abort) break;
        if (s2 > iterScore) { iterScore = s2; iterBest = rootMoves[n]; }
        if (s2 > alpha) alpha = s2;
      }
      if (st.abort) break;
      bestMove = iterBest; bestScore = iterScore; doneDepth = d;
      // أفضل حركة أول شي بالتكرار القادم
      var idx = rootMoves.indexOf(bestMove);
      if (idx > 0) { rootMoves.splice(idx, 1); rootMoves.unshift(bestMove); }
      if (bestScore > MATE - 100 || Date.now() > st.deadline) break;
    }
    return Object.assign(toMoveObj(bestMove), { score: bestScore, depth: doneDepth, nodes: st.nodes });
  }

  var api = {
    START_FEN: START_FEN, Position: Position, Game: Game, perft: perft,
    findBestMove: findBestMove, LEVELS: LEVELS, sqName: sqName, nameSq: nameSq, evaluate: evaluate
  };

  // داخل Web Worker: استقبل المطلوب وأرجع الحركة
  if (typeof importScripts === 'function' && typeof document === 'undefined' && typeof self !== 'undefined' && typeof self.postMessage === 'function') {
    self.onmessage = function (e) {
      var d = e.data || {}, res = null;
      try { res = findBestMove(d.fen, d.level, d.rep2 || []); } catch (err) { res = null; }
      self.postMessage({ id: d.id, result: res });
    };
  }

  return api;
});
