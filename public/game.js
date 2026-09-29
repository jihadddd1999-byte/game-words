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

// تحديث قائمة اللاعبين بالترتيب مع أزرار الأدمن (إذا كان المستخدم هو أول لاعب في القائمة)
function updatePlayersList(players) {
  playersList.innerHTML = '';
  // هل أنا الأدمن؟ (أول لاعب في القائمة يحمل الـ id الخاص بي)
  const isAdmin = players.length > 0 && players[0].id === playerId;

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

    // إذا كنت أنا الأدمن ولا تعرض الأزرار لنفسك (أو اعرضها للجميع ما عدا نفسك)
    if (isAdmin && p.id !== playerId) {
      playerHtml += `
        <div style="display: inline-block; margin-right: 10px; font-size: 12px;">
          <button onclick="socket.emit('kickPlayer', '${p.id}')" style="background: red; color: white; border: none; padding: 2px 5px; margin: 0 2px; cursor: pointer; border-radius: 3px;">طرد ❌</button>
          <button onclick="socket.emit('admin_toggle_mute', '${p.id}')" style="background: ${p.isMuted ? 'darkorange' : 'orange'}; color: white; border: none; padding: 2px 5px; margin: 0 2px; cursor: pointer; border-radius: 3px;">${p.isMuted ? 'إلغاء المنع 💬' : 'منع 🔇'}</button>
          <button onclick="socket.emit('admin_toggle_chat_view', '${p.id}')" style="background: ${p.canSeeChat ? 'purple' : 'gray'}; color: white; border: none; padding: 2px 5px; margin: 0 2px; cursor: pointer; border-radius: 3px;">${p.canSeeChat ? 'إخفاء الشات 👁️‍🗨️' : 'إظهار 👁️'}</button>
        </div>
      `;
    }

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
  socket.emit('setName', { name: playerName, color: playerColor });
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
   🛡️ نظام الأدمن والعميل المتقدم للعبة الكلمات السريعة - game.js
   إدارة كاملة للاعبين، العقوبات الحية مع مؤقتات، الإعلانات، الأحداث والسجلات
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================================================
  // 🔌 1. تهيئة الاتصال وعناصر واجهة الأدمن واللاعب
  // ==========================================================================
  const socket = typeof io !== 'undefined' ? io() : null;

  // عناصر واجهة الأدمن والنوافذ المنبثقة
  const btnAdminAuth = document.getElementById('btn-admin-auth');
  const adminLoginModal = document.getElementById('admin-login-modal');
  const adminLoginForm = document.getElementById('admin-login-form');
  const adminPasswordInput = document.getElementById('admin-password-input');
  const btnCancelAdminLogin = document.getElementById('btn-cancel-admin-login');

  const adminPanelModal = document.getElementById('admin-panel-modal');
  const btnCloseAdminPanel = document.getElementById('btn-close-admin-panel');
  const adminPlayersContainer = document.getElementById('admin-players-container');
  const adminPlayersCount = document.getElementById('admin-players-count');
  const btnRefreshPlayers = document.getElementById('btn-refresh-players');
  const adminAuditLogs = document.getElementById('admin-audit-logs');
  const btnClearAuditLogs = document.getElementById('btn-clear-audit-logs');

  // عناصر الشريط الإخباري والإعلانات
  const tickerBanner = document.getElementById('ticker-banner');
  const tickerText = document.getElementById('ticker-text');
  const btnCloseTickerView = document.getElementById('btn-close-ticker-view');
  const broadcastModal = document.getElementById('broadcast-modal');
  const broadcastMessageText = document.getElementById('broadcast-message-text');
  const btnCloseBroadcast = document.getElementById('btn-close-broadcast');

  // عناصر التحكم بالإعلانات والكلمات في اللوحة
  const admBroadcastInput = document.getElementById('adm-broadcast-input');
  const admBtnSendBroadcast = document.getElementById('adm-btn-send-broadcast');
  const admTickerInput = document.getElementById('adm-ticker-input');
  const admBtnSetTicker = document.getElementById('adm-btn-set-ticker');
  const admBtnToggleTicker = document.getElementById('adm-btn-toggle-ticker');
  const admCustomWordInput = document.getElementById('adm-custom-word-input');
  const admBtnSetCustomWord = document.getElementById('adm-btn-set-custom-word');

  // الأزرار الجماعية
  const admBtnSkipWord = document.getElementById('adm-btn-skip-word');
  const admBtnDoubleRound = document.getElementById('adm-btn-double-round');
  const admBtnSuddenDeath = document.getElementById('adm-btn-sudden-death');
  const admBtnFreezeAll = document.getElementById('adm-btn-freeze-all');
  const admBtnMuteAll = document.getElementById('adm-btn-mute-all');
  const admBtnLockRoom = document.getElementById('adm-btn-lock-room');
  const admBtnResetGame = document.getElementById('adm-btn-reset-game');
  const admBtnCleanRoom = document.getElementById('adm-btn-clean-room');

  // حالة الجلسة المحلية للأدمن واللاعب
  let isAdminAuthenticated = false;
  let isSuperAdmin = false;
  let activePlayersList = [];
  let isMutedLocal = false;
  let isFrozenLocal = false;

  // ==========================================================================
  // 🔐 2. نظام تسجيل الدخول وفتح/إغلاق اللوحة
  // ==========================================================================

  if (btnAdminAuth) {
    btnAdminAuth.addEventListener('click', () => {
      if (isAdminAuthenticated) {
        openAdminPanel();
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

  if (btnCancelAdminLogin) {
    btnCancelAdminLogin.addEventListener('click', closeAdminLoginModal);
  }

  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const password = adminPasswordInput ? adminPasswordInput.value.trim() : '';

      if (!password) {
        alert('الرجاء إدخال كلمة المرور.');
        return;
      }

      if (socket) {
        socket.emit('admin:authenticate', { password }, (response) => {
          if (response && response.success) {
            isAdminAuthenticated = true;
            isSuperAdmin = !!response.isSuper;
            closeAdminLoginModal();
            openAdminPanel();
            logAudit(`تم تسجيل الدخول كأدمن بنجاح ${isSuperAdmin ? '(أدمن أساسي 👑)' : ''}.`, 'info');
          } else {
            alert('كلمة المرور غير صحيحة!');
            logAudit('محاولة فاشلة لتسجيل دخول الأدمن.', 'danger');
          }
        });
      }
    });
  }

  function openAdminPanel() {
    if (adminPanelModal) adminPanelModal.style.display = 'flex';
    refreshPlayersData();
  }

  function closeAdminPanel() {
    if (adminPanelModal) adminPanelModal.style.display = 'none';
  }

  if (btnCloseAdminPanel) {
    btnCloseAdminPanel.addEventListener('click', closeAdminPanel);
  }

  // ==========================================================================
  // 👥 3. عرض بطاقات اللاعبين وإدارة العقوبات الفردية والمؤقتات
  // ==========================================================================

  function refreshPlayersData() {
    if (socket && isAdminAuthenticated) {
      socket.emit('admin:get_players');
    }
  }

  if (btnRefreshPlayers) {
    btnRefreshPlayers.addEventListener('click', () => {
      refreshPlayersData();
      logAudit('تم تحديث قائمة اللاعبين.', 'info');
    });
  }

  function renderPlayerCards(players) {
    activePlayersList = players;
    if (!adminPlayersContainer) return;

    adminPlayersContainer.innerHTML = '';
    if (adminPlayersCount) adminPlayersCount.textContent = `اللاعبين: ${players.length}`;

    if (players.length === 0) {
      adminPlayersContainer.innerHTML = '<div style="color: var(--admin-text-muted); text-align: center; grid-column: 1/-1; padding: 20px;">لا يوجد لاعبون متصلون بالروم حالياً.</div>';
      return;
    }

    players.forEach((player) => {
      const card = document.createElement('div');
      card.className = 'player-admin-card';
      card.id = `player-card-${player.id}`;

      card.innerHTML = `
        <div class="player-card-header">
          <div class="player-info">
            <span class="player-avatar">👤</span>
            <span class="player-card-name" style="color: ${player.color}">${escapeHtml(player.name || 'بدون اسم')}</span>
            ${player.isVip ? '<span class="vip-badge">VIP</span>' : ''}
            ${player.isAdmin ? '<span class="admin-badge">ADMIN</span>' : ''}
          </div>
          <span class="player-card-score">${player.score} pt</span>
        </div>

        <div class="player-custom-controls">
          <div class="input-inline-group">
            <label>⏱️ المدة (بالدقائق):</label>
            <input type="number" class="custom-input input-sm player-timer-input" id="timer-${player.id}" placeholder="مثال: 5" min="1" value="5">
          </div>

          <div class="input-inline-group">
            <label>📝 سبب العقوبة:</label>
            <input type="text" class="custom-input input-sm" id="reason-${player.id}" placeholder="مثال: مخالفة القوانين">
          </div>
        </div>

        <div class="player-actions-grid">
          <button class="btn-action danger btn-p-ban" data-id="${player.id}">
            <span>❌ باند IP</span>
          </button>
          <button class="btn-action warning btn-p-kick" data-id="${player.id}">
            <span>⏳ طرد</span>
          </button>
          <button class="btn-action btn-p-mute" data-id="${player.id}">
            <span>${player.muted ? '🔊 فك الكتم' : '🔇 كتم'}</span>
          </button>
          <button class="btn-action btn-p-freeze" data-id="${player.id}">
            <span>${player.frozen ? '🔥 فك التجميد' : '🧊 تجميد'}</span>
          </button>
          <button class="btn-action btn-p-blind" data-id="${player.id}">
            <span>👁️ عمياء</span>
          </button>
          <button class="btn-action btn-p-vip" data-id="${player.id}">
            <span>👑 VIP</span>
          </button>
        </div>

        <div class="player-custom-controls">
          <div class="input-inline-group">
            <label>💬 همس خاص للاعب:</label>
            <div class="input-with-btn">
              <input type="text" class="custom-input input-sm" id="whisper-input-${player.id}" placeholder="رسالة سرية...">
              <button class="btn-custom btn-secondary btn-sm btn-p-whisper" data-id="${player.id}">إرسال</button>
            </div>
          </div>
        </div>
      `;

      adminPlayersContainer.appendChild(card);
    });

    bindPlayerCardEvents();
  }

  function bindPlayerCardEvents() {
    // 1. باند IP
    document.querySelectorAll('.btn-p-ban').forEach(btn => {
      btn.onclick = () => {
        const pId = btn.dataset.id;
        const durationMinutes = getTimerValue(pId);
        const reason = getReasonValue(pId);
        emitAdminAction('player:ban', { playerId: pId, durationMinutes, isPermanent: durationMinutes >= 999, reason });
      };
    });

    // 2. طرد
    document.querySelectorAll('.btn-p-kick').forEach(btn => {
      btn.onclick = () => {
        const pId = btn.dataset.id;
        const durationMinutes = getTimerValue(pId);
        const reason = getReasonValue(pId);
        emitAdminAction('player:kick', { playerId: pId, durationMinutes, isPermanent: false, reason });
      };
    });

    // 3. كتم
    document.querySelectorAll('.btn-p-mute').forEach(btn => {
      btn.onclick = () => {
        const pId = btn.dataset.id;
        emitAdminAction('player:toggle_mute', { playerId: pId });
      };
    });

    // 4. تجميد
    document.querySelectorAll('.btn-p-freeze').forEach(btn => {
      btn.onclick = () => {
        const pId = btn.dataset.id;
        emitAdminAction('player:toggle_freeze', { playerId: pId });
      };
    });

    // 5. شاشة عمياء
    document.querySelectorAll('.btn-p-blind').forEach(btn => {
      btn.onclick = () => {
        const pId = btn.dataset.id;
        emitAdminAction('player:toggle_blind', { playerId: pId });
      };
    });

    // 6. VIP
    document.querySelectorAll('.btn-p-vip').forEach(btn => {
      btn.onclick = () => {
        const pId = btn.dataset.id;
        emitAdminAction('player:toggle_vip', { playerId: pId });
      };
    });

    // 7. همس خاص
    document.querySelectorAll('.btn-p-whisper').forEach(btn => {
      btn.onclick = () => {
        const pId = btn.dataset.id;
        const input = document.getElementById(`whisper-input-${pId}`);
        const message = input ? input.value.trim() : '';
        if (message) {
          emitAdminAction('player:whisper', { playerId: pId, message });
          input.value = '';
        }
      };
    });
  }

  function getTimerValue(playerId) {
    const timerInput = document.getElementById(`timer-${playerId}`);
    return timerInput ? (parseInt(timerInput.value) || 5) : 5;
  }

  function getReasonValue(playerId) {
    const reasonInput = document.getElementById(`reason-${playerId}`);
    return reasonInput ? reasonInput.value.trim() : '';
  }

  // ==========================================================================
  // 🎯 4. التحكم الجماعي بالروم واللعبة
  // ==========================================================================

  if (admBtnDoubleRound) {
    admBtnDoubleRound.onclick = () => emitAdminAction('room:toggle_double_round');
  }

  if (admBtnSuddenDeath) {
    admBtnSuddenDeath.onclick = () => emitAdminAction('room:trigger_sudden_death', { timer: 30, requiredAnswers: 1 });
  }

  if (admBtnFreezeAll) {
    admBtnFreezeAll.onclick = () => emitAdminAction('room:toggle_freeze_all');
  }

  if (admBtnMuteAll) {
    admBtnMuteAll.onclick = () => emitAdminAction('room:toggle_mute_all');
  }

  if (admBtnLockRoom) {
    admBtnLockRoom.onclick = () => emitAdminAction('room:toggle_lock');
  }

  // ==========================================================================
  // 📢 5. الإعلانات، الشريط الإخباري والكلمات المخصصة
  // ==========================================================================

  if (admBtnSetTicker) {
    admBtnSetTicker.onclick = () => {
      const msg = admTickerInput ? admTickerInput.value.trim() : '';
      if (msg) {
        emitAdminAction('ticker:update', { text: msg, speed: 15, visible: true });
        admTickerInput.value = '';
      }
    };
  }

  if (admBtnToggleTicker) {
    admBtnToggleTicker.onclick = () => {
      if (tickerBanner) {
        const isCurrentlyVisible = tickerBanner.style.display !== 'none';
        emitAdminAction('ticker:update', { visible: !isCurrentlyVisible });
      }
    };
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
        logAudit(`تعيين الكلمة القادمة: "${word}"`, 'info');
        admCustomWordInput.value = '';
      }
    };
  }

  if (btnCloseBroadcast) {
    btnCloseBroadcast.onclick = () => {
      if (broadcastModal) broadcastModal.style.display = 'none';
    };
  }

  // ==========================================================================
  // 📜 6. مراقبة التحركات وسجل Audit Logs
  // ==========================================================================

  function logAudit(message, type = 'info') {
    if (!adminAuditLogs) return;
    const time = new Date().toLocaleTimeString('ar-EG', { hour12: false });
    const item = document.createElement('div');
    item.className = `log-item ${type}`;
    item.textContent = `[${time}] ${message}`;
    adminAuditLogs.appendChild(item);
    adminAuditLogs.scrollTop = adminAuditLogs.scrollHeight;
  }

  if (btnClearAuditLogs) {
    btnClearAuditLogs.onclick = () => {
      if (adminAuditLogs) adminAuditLogs.innerHTML = '';
    };
  }

  function updateTickerTextLocally(text, speed, visible) {
    if (tickerText && text) tickerText.textContent = text;
    if (tickerBanner) tickerBanner.style.display = visible ? 'flex' : 'none';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function emitAdminAction(eventName, data = {}) {
    if (socket && isAdminAuthenticated) {
      socket.emit(`admin:${eventName}`, data);
    }
  }

  // ==========================================================================
  // 📡 7. استقبال أحداث السيرفر للعميل للأحداث المباشرة
  // ==========================================================================

  if (socket) {
    // 1. تحديث قائمة اللاعبين
    socket.on('admin:players_updated', (players) => {
      if (isAdminAuthenticated) renderPlayerCards(players);
    });

    // 2. تحديث الشريط الإخباري
    socket.on('ticker:updated', (data) => {
      updateTickerTextLocally(data.text, data.speed, data.visible);
    });

    // 3. التنبيهات والسجلات المباشرة
    socket.on('admin:notify', (data) => {
      logAudit(data.message, data.type === 'audit' ? 'info' : 'warning');
    });

    // 4. استقبال الهمس المباشر والرد عليه
    socket.on('whisper:received', (data) => {
      const replyMessage = prompt(`💬 همس من [${data.fromName}]:\n"${data.message}"\n\nأدخل ردك هنا (أو اتركه فارغاً للإلغاء):`);
      if (replyMessage && replyMessage.trim() !== '') {
        socket.emit('player:whisper:reply', {
          targetId: data.fromId,
          message: replyMessage.trim()
        });
      }
    });

    // 5. تطبيق عقوبات السيرفر المباشرة على العميل (كتم/تجميد/عمياء)
    socket.on('admin:effect:mute', (data) => {
      isMutedLocal = !!data.active;
      const chatInput = document.getElementById('chat-input');
      if (chatInput) {
        chatInput.disabled = isMutedLocal;
        chatInput.placeholder = isMutedLocal ? '🔇 تم كتمك من قبل الأدمن...' : 'اكتب إجابتك أو رسالتك هنا...';
      }
    });

    socket.on('admin:effect:freeze', (data) => {
      isFrozenLocal = !!data.active;
      const answerBtn = document.getElementById('btn-submit-answer');
      const chatInput = document.getElementById('chat-input');
      if (answerBtn) answerBtn.disabled = isFrozenLocal;
      if (chatInput) chatInput.disabled = isFrozenLocal;
    });

    socket.on('admin:effect:blind', (data) => {
      let overlay = document.getElementById('blind-overlay');
      if (data.active) {
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'blind-overlay';
          overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#000;z-index:99999;display:flex;justify-content:center;align-items:center;color:#fff;font-size:24px;';
          overlay.innerHTML = '🙈 الشاشة عمياء بقرار من الأدمن!';
          document.body.appendChild(overlay);
        }
      } else if (overlay) {
        overlay.remove();
      }
    });

    // 6. استقبال طلبات الانضمام والأذونات (للأدمن الأساسي)
    socket.on('admin:join_request', (data) => {
      if (confirm(`📩 طلب دخول جديد من: ${data.name} (IP: ${data.ip})\nالسبب: ${data.type === 'kicked' ? 'لاعب مطرود يستأذن' : 'الغرفة مغلقة'}\nهل تريد الموافقة؟`)) {
        socket.emit('admin:handle_join_request', { requestId: data.requestId, approve: true });
      } else {
        socket.emit('admin:handle_join_request', { requestId: data.requestId, approve: false });
      }
    });

    // 7. رفض الوصول وإتاحة خيار طلب الاستئذان
    socket.on('accessDenied', (data) => {
      if (data.canRequestPermission) {
        if (confirm(`${data.message}\n\nهل ترغب في إرسال طلب استئذان بالدخول للأدمن الأساسي؟`)) {
          const name = prompt('أدخل اسمك لتقديمه مع الطلب:') || 'لاعب';
          socket.emit('requestJoinPermission', { name });
          alert('تم إرسال الطلب، يرجى الانتظار لحين مراجعة الأدمن.');
        }
      } else {
        alert(data.message || 'تم رفض وصولك للعبة.');
      }
    });

    socket.on('joinPermissionApproved', () => {
      alert('🎉 تمت الموافقة على طلب دخولك من قبل الأدمن!');
      window.location.reload();
    });

    // 8. استقبال قوائم العقوبات
    socket.on('admin:punishment_lists', (data) => {
      renderPunishmentTable('banned-list-container', data.banned, 'unban');
      renderPunishmentTable('kicked-list-container', data.kicked, 'unkick');
    });

    // 9. مزامنة حالة الروم
    socket.on('roomState:sync', (state) => {
      updateStatusBadge('adm-btn-mute-all', state.isMutedAll);
      updateStatusBadge('adm-btn-lock-room', state.isLocked);
      updateStatusBadge('adm-btn-freeze-all', state.isFrozenAll);
    });
  }

  function updateStatusBadge(btnId, isActive) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    let badge = btn.querySelector('.status-badge');
    if (!badge) {
      badge = document.createElement('span');
      btn.appendChild(badge);
    }
    badge.className = `status-badge ${isActive ? 'on' : 'off'}`;
    badge.innerText = isActive ? ' ON' : ' OFF';
  }

  function renderPunishmentTable(containerId, list, actionType) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!list || list.length === 0) {
      container.innerHTML = '<p class="empty-msg" style="color:var(--admin-text-muted);padding:10px;">لا يوجد عناصر في القائمة</p>';
      return;
    }

    let html = '<table class="admin-table" style="width:100%;text-align:right;"><tr><th>الاسم / IP</th><th>السبب</th><th>الإجراء</th></tr>';
    list.forEach(item => {
      html += `<tr>
        <td>${escapeHtml(item.name || item.ip)}</td>
        <td>${escapeHtml(item.reason || 'بدون سبب')}</td>
        <td><button class="btn-custom btn-primary btn-sm" onclick="${actionType === 'unban' ? `unbanIp('${item.ip}')` : `unkickIp('${item.ip}')`}">إلغاء</button></td>
      </tr>`;
    });
    html += '</table>';
    container.innerHTML = html;
  }

  window.unbanIp = function(ip) { 
    if (socket) socket.emit('admin:unban_ip', ip); 
  };
  window.unkickIp = function(ip) { 
    if (socket) socket.emit('admin:unkick_ip', ip); 
  };
});
