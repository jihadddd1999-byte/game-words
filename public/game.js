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
   ⚙️ نظام لوحة التحكم بالأدمن والربط التفاعلي (Admin JS Controller)
   ========================================================================== */

// 1️⃣ المتغيرات والعناصر الأساسية للوحة الأدمن
const ADMIN_CORRECT_PASS = "20018151070792005932";
let currentAdminPassword = ""; // تُحفظ عند تسجيل الدخول الناجح

// المودالات والنوافذ
const adminAuthBtn = document.getElementById("btn-admin-auth");
const adminLoginDialog = document.getElementById("admin-login-dialog");
const adminLoginForm = document.getElementById("admin-login-form");
const adminPasswordInput = document.getElementById("admin-password-input");
const btnCancelAdminLogin = document.getElementById("btn-cancel-admin-login");

const adminPanelDialog = document.getElementById("admin-panel-dialog");
const btnCloseAdminPanel = document.getElementById("btn-close-admin-panel");

// 2️⃣ فتح نافذة تسجيل دخول الأدمن
if (adminAuthBtn) {
  adminAuthBtn.addEventListener("click", () => {
    if (currentAdminPassword === ADMIN_CORRECT_PASS) {
      // إذا كان قد سجل دخوله سابقاً بنجاح، افتح اللوحة مباشرة
      openAdminPanel();
    } else {
      adminPasswordInput.value = "";
      if (typeof adminLoginDialog.showModal === "function") {
        adminLoginDialog.showModal();
      } else {
        adminLoginDialog.style.display = "block";
      }
    }
  });
}

// إلغاء نافذة الدخول
if (btnCancelAdminLogin) {
  btnCancelAdminLogin.addEventListener("click", () => {
    closeDialog(adminLoginDialog);
  });
}

// تأكيد كلمة سر الأدمن
if (adminLoginForm) {
  adminLoginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const enteredPass = adminPasswordInput.value.trim();

    if (enteredPass === ADMIN_CORRECT_PASS) {
      currentAdminPassword = enteredPass;
      closeDialog(adminLoginDialog);
      openAdminPanel();
      appendAuditLog("تم تسجيل دخول الأدمن بنجاح.", "info");
    } else {
      alert("❌ كلمة السر غير صحيحة!");
      adminPasswordInput.value = "";
    }
  });
}

// إغلاق لوحة الأدمن الرئيسية
if (btnCloseAdminPanel) {
  btnCloseAdminPanel.addEventListener("click", () => {
    closeDialog(adminPanelDialog);
  });
}

function openAdminPanel() {
  if (typeof adminPanelDialog.showModal === "function") {
    adminPanelDialog.showModal();
  } else {
    adminPanelDialog.style.display = "block";
  }
  // طلب تحديث إحصائيات الروم وقائمة اللاعبين من السيرفر
  requestAdminStatsUpdate();
}

function closeDialog(dialogElement) {
  if (dialogElement) {
    if (typeof dialogElement.close === "function") {
      dialogElement.close();
    } else {
      dialogElement.style.display = "none";
    }
  }
}

// 3️⃣ دالة إضافة السجلات إلى سجل المراقبة (Audit Logs)
function appendAuditLog(message, type = "info") {
  const auditContainer = document.getElementById("admin-audit-logs");
  if (!auditContainer) return;

  const logItem = document.createElement("div");
  const currentTime = new Date().toLocaleTimeString("ar-EG");
  logItem.className = `log-item ${type}`;
  logItem.textContent = `[${currentTime}] ${message}`;

  auditContainer.appendChild(logItem);
  auditContainer.scrollTop = auditContainer.scrollHeight;
}

// 4️⃣ ربط أزرار التحكم الجماعي بالروم
function setupAdminGlobalControls() {
  // دالة مساعدة لاستخراج المدة المحددة من اللوحة
  const getSelectedDuration = () => {
    const type = document.getElementById("admin-duration-type").value;
    const val = parseInt(document.getElementById("admin-duration-value").value) || 30;
    return { type, val };
  };

  // زر تخطي الكلمة
  bindAdminBtn("adm-btn-skip-word", () => {
    emitAdminAction("admin_skip_word", {});
    appendAuditLog("تم إرسال أمر: تخطي الكلمة الحالية", "warn");
  });

  // جولة مضاعفة X2
  bindAdminBtn("adm-btn-double-round", () => {
    emitAdminAction("admin_double_round", {});
    appendAuditLog("تم تفعيل جولة النقاط المضاعفة (X2)", "info");
  });

  // الموت المفاجئ
  bindAdminBtn("adm-btn-sudden-death", () => {
    emitAdminAction("admin_sudden_death", { duration: 30 });
    appendAuditLog("تم بدء جولة الموت المفاجئ (30 ثانية)", "danger");
  });

  // تجميد / فك الجميع
  bindAdminBtn("adm-btn-freeze-all", () => {
    const duration = getSelectedDuration();
    emitAdminAction("admin_freeze_all", { duration });
    appendAuditLog(`تم إرسال أمر تجميد/فك تجميد الجميع (${duration.val} ${duration.type})`, "warn");
  });

  // كتم الشات عن الجميع
  bindAdminBtn("adm-btn-mute-all", () => {
    emitAdminAction("admin_mute_all", {});
    appendAuditLog("تم إرسال أمر كتم/فك كتم الشات عن الجميع", "warn");
  });

  // وضع التخفي
  bindAdminBtn("adm-btn-stealth", () => {
    emitAdminAction("admin_toggle_stealth", {});
    appendAuditLog("تم تغيير حالة وضع التخفي للأدمن", "info");
  });

  // قفل / فتح الروم
  bindAdminBtn("adm-btn-lock-room", () => {
    emitAdminAction("admin_toggle_lock_room", {});
    appendAuditLog("تم تغيير حالة قفل الروم أمام الانضمام الجديد", "warn");
  });

  // إعادة تعيين المسابقة
  bindAdminBtn("adm-btn-reset-game", () => {
    if (confirm("هل أنت تأكد من إعادة تعيين النقاط والمسابقة للجميع؟")) {
      emitAdminAction("admin_reset_game", {});
      appendAuditLog("تم إعادة تعيين نقاط المسابقة للجميع", "danger");
    }
  });

  // طرد جماعي (Clean Room)
  bindAdminBtn("adm-btn-clean-room", () => {
    if (confirm("⚠️ تنبيه: هل تريد حقاً طرد كافة اللاعبين من الروم؟")) {
      emitAdminAction("admin_clean_room", {});
      appendAuditLog("تم تنظيف الروم وطرد كافة اللاعبين المتصلين", "danger");
    }
  });

  // ✍️ إرسال كلمة مخصصة
  bindAdminBtn("adm-btn-set-custom-word", () => {
    const wordInput = document.getElementById("adm-custom-word-input");
    const customWord = wordInput ? wordInput.value.trim() : "";
    if (customWord) {
      emitAdminAction("admin_set_custom_word", { word: customWord });
      appendAuditLog(`تم تعيين كلمة مخصصة: "${customWord}"`, "info");
      wordInput.value = "";
    }
  });

  // ⏰ كتم الشات المؤقت
  bindAdminBtn("adm-btn-mute-timer", () => {
    const secondsInput = document.getElementById("adm-mute-timer-input");
    const seconds = parseInt(secondsInput ? secondsInput.value : 0);
    if (seconds > 0) {
      emitAdminAction("admin_mute_timer", { durationSeconds: seconds });
      appendAuditLog(`تم تطبيق كتم مؤقت للشات لمدة ${seconds} ثانية`, "warn");
    }
  });

  // 🎯 حفظ هدف الفوز
  bindAdminBtn("adm-btn-set-win-score", () => {
    const winScore = parseInt(document.getElementById("adm-win-score-input").value);
    if (winScore > 0) {
      emitAdminAction("admin_set_win_score", { winScore });
      appendAuditLog(`تم تحديد هدف الفوز بـ: ${winScore} نقطة`, "info");
    }
  });

  // 🎯 تأكيد نظام توزيع النقاط
  bindAdminBtn("adm-btn-save-point-system", () => {
    const system = document.getElementById("adm-point-system").value;
    emitAdminAction("admin_set_point_system", { system });
    appendAuditLog(`تم تغيير نظام توزيع النقاط إلى: ${system}`, "info");
  });

  // 📢 إرسال إعلان شاشات
  bindAdminBtn("adm-btn-send-broadcast", () => {
    const broadcastInput = document.getElementById("adm-broadcast-input");
    const msg = broadcastInput ? broadcastInput.value.trim() : "";
    if (msg) {
      emitAdminAction("admin_send_broadcast", { message: msg });
      appendAuditLog(`تم إرسال إعلان عام للشاشات: "${msg}"`, "info");
      broadcastInput.value = "";
    }
  });

  // 📢 تحديث الشريط الإخباري
  bindAdminBtn("adm-btn-set-ticker", () => {
    const tickerInput = document.getElementById("adm-ticker-input");
    const text = tickerInput ? tickerInput.value.trim() : "";
    if (text) {
      emitAdminAction("admin_set_ticker_text", { text });
      appendAuditLog(`تم تحديث الشريط الإخباري: "${text}"`, "info");
    }
  });

  // 👁️ إخفاء / إظهار الشريط الإخباري
  bindAdminBtn("adm-btn-toggle-ticker", () => {
    emitAdminAction("admin_toggle_ticker", {});
    appendAuditLog("تم تغيير حالة عرض الشريط الإخباري", "info");
  });

  // ربط خانات الأوضاع الخاصة (Checkboxes)
  const checkboxes = [
    { id: "adm-chk-reverse-word", event: "admin_toggle_reverse_word" },
    { id: "adm-chk-blur-mode", event: "admin_toggle_blur_mode" },
    { id: "adm-chk-missing-letter", event: "admin_toggle_missing_letter" },
    { id: "adm-chk-reverse-input", event: "admin_toggle_reverse_input" }
  ];

  checkboxes.forEach((item) => {
    const chk = document.getElementById(item.id);
    if (chk) {
      chk.addEventListener("change", (e) => {
        emitAdminAction(item.event, { enabled: e.target.checked });
        appendAuditLog(`تم تغيير حالة المود (${item.id}) إلى: ${e.target.checked ? "مفعل" : "معطل"}`, "info");
      });
    }
  });
}

// دالة مساعدة لربط الأزرار بحماية
function bindAdminBtn(elementId, actionFn) {
  const btn = document.getElementById(elementId);
  if (btn) {
    btn.addEventListener("click", actionFn);
  }
}

// إرسال الأمر للسيرفر مع كلمة السر
function emitAdminAction(eventName, payload = {}) {
  if (typeof socket !== "undefined" && socket) {
    socket.emit(eventName, {
      ...payload,
      adminPassword: currentAdminPassword
    });
  }
}

function requestAdminStatsUpdate() {
  emitAdminAction("admin_get_stats", {});
}

// 5️⃣ استقبال التحديثات والأنباء من السيرفر على جانب العميل

if (typeof socket !== "undefined" && socket) {

  // استقبال تحديث الإحصائيات وجدول اللاعبين للوحة الأدمن
  socket.on("admin_stats_response", (data) => {
    if (document.getElementById("stat-online-count")) {
      document.getElementById("stat-online-count").textContent = data.onlineCount || 0;
      document.getElementById("stat-avg-speed").textContent = (data.avgSpeed || 0) + "ث";
      document.getElementById("stat-total-answers").textContent = data.totalAnswers || 0;
      document.getElementById("stat-active-player").textContent = data.activePlayer || "لا يوجد";
    }

    // بناء جدول التحكم باللاعبين
    renderAdminPlayersTable(data.players || []);
    // بناء قائمة المحظورين
    renderAdminBannedList(data.bannedList || []);
  });

  // استقبال إعلان الشاشة العام (Broadcast)
  socket.on("receive_broadcast", (data) => {
    const dialog = document.getElementById("broadcast-dialog");
    const msgText = document.getElementById("broadcast-message-text");
    if (dialog && msgText) {
      msgText.textContent = data.message;
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.style.display = "block";
    }
  });

  // زر إغلاق الإعلان العام
  const btnCloseBroadcast = document.getElementById("btn-close-broadcast");
  if (btnCloseBroadcast) {
    btnCloseBroadcast.addEventListener("click", () => {
      closeDialog(document.getElementById("broadcast-dialog"));
    });
  }

  // استقبال تحديث الشريط الإخباري
  socket.on("update_ticker", (data) => {
    const banner = document.getElementById("ticker-banner");
    const textEl = document.getElementById("ticker-text");
    if (banner && textEl) {
      textEl.textContent = data.text;
      banner.style.display = data.visible ? "block" : "none";
    }
  });

  // استقبال الرسالة السرية / الهمس الخاص
  socket.on("receive_whisper", (data) => {
    const chatMessages = document.getElementById("chat-messages");
    if (chatMessages) {
      const whisperDiv = document.createElement("div");
      whisperDiv.className = "chat-message whisper-message";
      whisperDiv.style.background = "rgba(107, 33, 168, 0.4)";
      whisperDiv.style.border = "1px solid #a855f7";
      whisperDiv.style.padding = "6px 10px";
      whisperDiv.style.borderRadius = "8px";
      whisperDiv.style.margin = "4px 0";
      whisperDiv.innerHTML = `<strong style="color: #f0abfc;">${data.sender}:</strong> <span style="color: #ffeb3b; font-weight: bold;">${data.message}</span>`;
      
      chatMessages.appendChild(whisperDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      // فتح الشات تلقائياً للاعب ليقرأ الهمس
      const chatContainer = document.getElementById("chat-container");
      if (chatContainer) chatContainer.hidden = false;
    }
  });
}

// 6️⃣ بناء جدول التحكم الفردي باللاعبين ديناميكياً
function renderAdminPlayersTable(players) {
  const tbody = document.getElementById("admin-players-table-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (players.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8;">لا يوجد لاعبون متصلون حالياً</td></tr>`;
    return;
  }

  players.forEach((p) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><strong>${p.name}</strong> ${p.isVip ? '👑' : ''}</td>
      <td>${p.score || 0}</td>
      <td>
        <button class="btn-sm btn-danger" onclick="adminActionPlayer('${p.socketId}', 'ban')">❌ باند</button>
        <button class="btn-sm" onclick="adminActionPlayer('${p.socketId}', 'tempban')">⏳ طرد</button>
        <button class="btn-sm" onclick="adminActionPlayer('${p.socketId}', 'mute')">🔇 كتم</button>
        <button class="btn-sm" onclick="adminActionPlayer('${p.socketId}', 'drawlock')">🔒 منع الرسم</button>
        <button class="btn-sm" onclick="adminActionPlayer('${p.socketId}', 'blind')">👁️ عمياء</button>
        <button class="btn-sm" onclick="adminActionPlayer('${p.socketId}', 'vip')">👑 VIP</button>
        <button class="btn-sm" onclick="adminActionPlayer('${p.socketId}', 'warn')">⚠️ تحذير</button>
        <button class="btn-sm" onclick="adminActionPlayer('${p.socketId}', 'reset_score')">🔄 0 نقاط</button>
      </td>
      <td>
        <div style="display:flex; gap:4px; align-items:center; margin-bottom:4px;">
          <input type="text" id="name-input-${p.socketId}" placeholder="اسم جديد" class="input-sm-name" />
          <button class="btn-sm" onclick="adminChangePlayerName('${p.socketId}')">تعديل</button>
        </div>
        <div style="display:flex; gap:4px; align-items:center; margin-bottom:4px;">
          <input type="number" id="pts-input-${p.socketId}" placeholder="±نقاط" class="input-sm-pts" />
          <button class="btn-sm" onclick="adminAddPlayerPoints('${p.socketId}')">تطبيق</button>
        </div>
        <div style="display:flex; gap:4px; align-items:center;">
          <input type="text" id="whisper-input-${p.socketId}" placeholder="همس سرّي" class="input-sm-whisper" />
          <button class="btn-sm" onclick="adminWhisperPlayer('${p.socketId}')">إرسال</button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// 7️⃣ دوال التفاعل الفردي مع اللاعبين
window.adminActionPlayer = function(targetSocketId, actionType) {
  const durationType = document.getElementById("admin-duration-type").value;
  const durationVal = parseInt(document.getElementById("admin-duration-value").value) || 30;

  emitAdminAction("admin_player_action", {
    targetSocketId,
    actionType,
    duration: { type: durationType, val: durationVal }
  });

  appendAuditLog(`تم تطبيق إجراء فردي (${actionType}) على اللاعب: ${targetSocketId}`, "warn");
};

window.adminChangePlayerName = function(targetSocketId) {
  const input = document.getElementById(`name-input-${targetSocketId}`);
  const newName = input ? input.value.trim() : "";
  if (newName) {
    emitAdminAction("admin_change_player_name", { targetSocketId, newName });
    appendAuditLog(`تم تغيير اسم اللاعب إلى: "${newName}"`, "info");
    input.value = "";
  }
};

window.adminAddPlayerPoints = function(targetSocketId) {
  const input = document.getElementById(`pts-input-${targetSocketId}`);
  const pts = parseInt(input ? input.value : 0);
  if (!isNaN(pts) && pts !== 0) {
    emitAdminAction("admin_adjust_player_points", { targetSocketId, pointsDelta: pts });
    appendAuditLog(`تم تعديل نقاط اللاعب بمقدار: (${pts})`, "info");
    input.value = "";
  }
};

window.adminWhisperPlayer = function(targetSocketId) {
  const input = document.getElementById(`whisper-input-${targetSocketId}`);
  const msg = input ? input.value.trim() : "";
  if (msg) {
    emitAdminAction("admin_whisper_player", { targetSocketId, whisperMessage: msg });
    appendAuditLog(`تم إرسال همس خاص إلى (${targetSocketId}): "${msg}"`, "info");
    input.value = "";
  }
};

// 8️⃣ عرض قائمة المحظورين وإلغاء الحظر
function renderAdminBannedList(bannedList) {
  const container = document.getElementById("adm-banned-list");
  if (!container) return;

  container.innerHTML = "";

  if (bannedList.length === 0) {
    container.innerHTML = `<span>لا يوجد لاعبون محظورون حالياً</span>`;
    return;
  }

  bannedList.forEach((item) => {
    const tag = document.createElement("div");
    tag.className = "banned-tag";
    tag.innerHTML = `
      <span>${item.name || item.ip}</span>
      <button title="إلغاء الحظر" onclick="adminUnbanPlayer('${item.ip}')">✖️</button>
    `;
    container.appendChild(tag);
  });
}

window.adminUnbanPlayer = function(ip) {
  emitAdminAction("admin_unban_player", { ip });
  appendAuditLog(`تم إلغاء الحظر عن IP: ${ip}`, "info");
};

// تهيئة اللوحة عند فتح الصفحة
document.addEventListener("DOMContentLoaded", () => {
  setupAdminGlobalControls();
});
