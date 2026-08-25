const socket = io();

// ===== Keep server alive (Render fix) =====
setInterval(() => {
  fetch("/ping").catch(() => {});
}, 4 * 60 * 1000);

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

const playersList = document.getElementById('players-list');

// --- المتغيرات الأساسية ---
let playerId = null;
let currentWord = '';
let startTime = 0;
let myScore = 0;
let playerName = localStorage.getItem('playerName') || `لاعب${Math.floor(Math.random() * 1000)}`;
let playerColor = localStorage.getItem('playerColor') || '#00e5ff';
let canAnswer = true;
let isUserAtBottom = true;
let newMessageCount = 0;
const typingMessages = {};

// ألوان خاصة لأسماء محددة
const specialNameColors = {
  "جهاد": "#00ffe7",
  "ز": "#ff3366",
  "أسامة": "#cc33ff",
  "مصطفى": "#33ff99",
  "حلا": "#ff33cc",
  "نور": "#ffff33",
  "كول": "#33ccff"
};

// --- دوال الشات والواجهة ---
function scrollChatToBottom() {
  if (isUserAtBottom) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

function colorizeName(name, color = null) {
  if (name === "كول") {
    return `<span class="kol-wrapper"><span class="kol-name">كول</span></span>`;
  }
  const nameColor = color || specialNameColors[name] || '#00e5ff';
  return `<span style="color: ${nameColor}; font-weight: 700;">${name}</span>`;
}

function highlightSpecialWords(text) {
  const specialWords = {
    'زيزو': { color: '#ff3366', shake: true },
    'جهاد': { color: '#00ffe7', shake: false },
    'حلا': { color: '#ff33cc', shake: false },
    'كول': { color: '#33ccff', shake: false },
    'مصطفى': { color: '#33ff99', shake: false }
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

function showNewMessageBadge(count) {
  let badge = document.getElementById('newMessageBadge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'newMessageBadge';
    badge.style.cssText = 'position:absolute; bottom:200px; right:20px; background:#ffff00; color:#000; padding:6px 12px; border-radius:12px; cursor:pointer; z-index:10000; font-weight:700;';
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

function addChatMessage({ name, message, system = false, color = null, time = '' }) {
  const div = document.createElement('div');
  div.classList.add('chat-message');

  if (!time) {
    const now = new Date();
    time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }

  if (system) {
    div.classList.add('chat-system-message');
    div.innerHTML = `${message} <span style="font-size:10px; color:#888;">[${time}]</span>`;
  } else {
    div.innerHTML = `
      <span class="chat-name">${colorizeName(name, color)}</span> : 
      <span class="chat-text">${highlightSpecialWords(message)}</span>
      <span style="font-size:10px; color:#888;"> [${time}]</span>
    `;
  }

  chatMessages.appendChild(div);
  
  const atBottom = chatMessages.scrollTop + chatMessages.clientHeight >= chatMessages.scrollHeight - 10;
  if (atBottom) {
    newMessageCount = 0;
    hideNewMessageBadge();
    scrollChatToBottom();
  } else {
    newMessageCount++;
    showNewMessageBadge(newMessageCount);
  }

  if (!chatContainer.classList.contains('open') && !system) {
    btnChat.classList.add('notify');
    playNotificationSound();
  }
}

function updatePlayersList(players) {
  playersList.innerHTML = '';
  const isAdmin = players.length > 0 && players[0].id === playerId;

  players.forEach((p, i) => {
    const li = document.createElement('li');
    li.dataset.id = p.id;
    const colors = ['gold', 'silver', 'bronze'];
    li.style.color = colors[i] || '#00d1ff';

    let playerHtml = `${i + 1}. ${colorizeName(p.name, p.color)} - ${p.score} نقطة`;

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

// --- أحداث التفاعل مع الواجهة ---
btnChat.addEventListener('click', () => {
  const isOpen = chatContainer.classList.toggle('open');
  btnChat.setAttribute('aria-expanded', isOpen);
  chatContainer.hidden = !isOpen;
  btnChat.classList.remove('notify');
  if (isOpen) chatInput.focus();
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
  socket.emit('stopTyping', playerName);
  chatInput.value = '';
});

chatInput.addEventListener('input', () => {
  if (chatInput.value.trim().length > 0) {
    socket.emit('typing', playerName);
  } else {
    socket.emit('stopTyping', playerName);
  }
});

chatMessages.addEventListener('scroll', () => {
  isUserAtBottom = chatMessages.scrollTop + chatMessages.clientHeight >= chatMessages.scrollHeight - 10;
});

btnChangeName.addEventListener('click', () => {
  inputName.value = playerName;
  inputColor.value = playerColor;
  changeNameDialog.showModal();
});

cancelNameBtn.addEventListener('click', () => changeNameDialog.close());

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

btnInstructions.addEventListener('click', () => instructionsDialog.showModal());
closeInstructionsBtn.addEventListener('click', () => instructionsDialog.close());

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

// --- أحداث السوكيت ---
socket.on('welcome', data => {
  playerId = data.id;
  socket.emit('setName', { name: playerName, color: playerColor });
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

socket.on('updatePlayers', updatePlayersList);

socket.on('chatMessage', data => {
  addChatMessage({
    name: data.system ? '' : data.name,
    message: data.message,
    system: data.system,
    color: data.color || null,
    time: data.time || ''
  });
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
      div.textContent = `${name} يكتب...`;
      chatMessages.appendChild(div);
      scrollChatToBottom();
      typingMessages[name] = div;
    }
  });
});

socket.on('correctAnswer', data => {
  answerTimeDisplay.textContent = `أجبت في: ${data.timeUsed} ثانية`;
  canAnswer = false;
  setTimeout(() => {
    answerTimeDisplay.textContent = '';
    canAnswer = true;
  }, 2000);
});

socket.on('wrongAnswer', () => { canAnswer = true; });
socket.on('enableAnswer', () => { canAnswer = true; });

socket.on('playerWon', data => alert(`🎉 مبروك ${data.name} لقد فزت باللعبة!`));
socket.on('kicked', () => {
  alert('تم طردك من اللعبة بواسطة الأدمن.');
  window.location.reload();
});

socket.on('update_mute_status', isMuted => {
  chatInput.disabled = isMuted;
  chatInput.placeholder = isMuted ? "أنت ممنوع من الكتابة بواسطة الأدمن" : "اكتب رسالة...";
  if (isMuted) alert("⚠️ تنبيه: قام الأدمن بمنعك من الكتابة.");
});

socket.on('update_chat_view_status', canSeeChat => {
  chatContainer.style.display = canSeeChat ? 'block' : 'none';
  if (!canSeeChat) alert("⚠️ تنبيه: قام الأدمن بإخفاء الشات عنك.");
});

// ==========================================
//   استوديو نزار المطور (Canvas Studio)
// ==========================================
let persistentCanvasData = null; 
let isSoloMode = false;
let lastX = 0, lastY = 0;
let undoStack = []; 
let galleryData = JSON.parse(localStorage.getItem('myArtGallery')) || [];

function updateGalleryUI() {
  const miniGallery = document.getElementById('art-mini-gallery');
  if (!miniGallery) return;
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
    if (!isSoloMode) socket.emit('load-gallery-all', canvas.toDataURL());
  };
};

window.deleteGalleryItem = (idx) => {
  if (confirm("هل أنت متأكد من حذف هذه الرسمة؟")) {
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

  function resetCanvasBackground() {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = bgColor.value;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  bgColor.oninput = () => {
    resetCanvasBackground();
    if (!isSoloMode) socket.emit('clear-board-all', { color: bgColor.value });
  };

  function saveState() {
    if (undoStack.length >= 25) undoStack.shift();
    undoStack.push(canvas.toDataURL());
  }

  if (btnOpen) {
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

  if (btnClose) {
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
        color: currentColor, 
        size: brushSize.value,
        opacity: (brushType.value === 'spray' || brushType.value === 'eraser') ? 1.0 : brushOpacity.value, 
        type: brushType.value
      });
    }
    [lastX, lastY] = [x, y];
  };

  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  window.addEventListener('mouseup', () => drawing = false);
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); }, { passive: false });

  // استقبال رسومات وتحديثات بقية اللاعبين
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
      if (data && data.color) bgColor.value = data.color;
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
        if (!isSoloMode) socket.emit('load-gallery-all', canvas.toDataURL());
      };
    }
  };

  btnClear.onclick = () => {
    if (confirm("تفريغ اللوحة؟")) {
      resetCanvasBackground();
      if (!isSoloMode) socket.emit('clear-board-all', { color: bgColor.value });
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
