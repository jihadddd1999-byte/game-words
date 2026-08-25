const socket = io();

// ===== Keep server alive =====
setInterval(() => {
  fetch("/ping").catch(() => {});
}, 4 * 60 * 1000);

// --- عناصر DOM الأساسية ---
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

// ===== الأزرار والنوافذ الجديدة (الألوان والأدمن) =====
const btnColorsDialog = document.getElementById('btn-colors-dialog');
const colorsDialog = document.getElementById('colors-dialog');
const closeColorsBtn = document.getElementById('close-colors');
const adminControlPanel = document.getElementById('admin-control-panel');

// --- المتغيرات الأساسية والحفظ المحلي ---
let playerId = null;
let currentWord = '';
let startTime = 0;
let myScore = 0;
let playerName = localStorage.getItem('playerName') || `لاعب${Math.floor(Math.random() * 1000)}`;
let playerColor = localStorage.getItem('playerColor') || '#00e5ff';
let savedTheme = localStorage.getItem('gameTheme') || 'default';
let canAnswer = true;
let isUserAtBottom = true;
let newMessageCount = 0;
let isBlind = false;

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

// تطبيق الثيم المحفوظ فور الفتح
applyTheme(savedTheme);

function applyTheme(themeName) {
  document.body.className = `theme-${themeName}`;
  localStorage.setItem('gameTheme', themeName);
}

// --- دوال مساعدة للشات والأسماء ---
function scrollChatToBottom() {
  if (isUserAtBottom && chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

function colorizeName(name, color = null) {
  if (name === "كول") {
    return `<span class="kol-wrapper"><span class="kol-name">كول</span></span>`;
  }
  if (!color) {
    color = specialNameColors[name] || '#00e5ff';
  }
  return `<span style="color: ${color}; font-weight: 700;">${name}</span>`;
}

function highlightSpecialWords(text) {
  const specialWords = {
    'زيزو': { color: '#ff3366' },
    'جهاد': { color: '#00ffe7' },
    'حلا': { color: '#ff33cc' },
    'كول': { color: '#33ccff' },
    'مصطفى': { color: '#33ff99' },
  };

  let result = text;
  Object.keys(specialWords).forEach(word => {
    const { color } = specialWords[word];
    const regex = new RegExp(`\\b${word}\\b`, 'gu');
    result = result.replace(regex, `<span class="special-word" style="color:${color}">${word}</span>`);
  });
  return result;
}

function addChatMessage({ name, message, system = false, color = null, time = '', isWhisper = false }) {
  const div = document.createElement('div');
  div.classList.add('chat-message');

  if (!time) {
    const now = new Date();
    time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }

  if (isWhisper) {
    div.style.background = 'rgba(255, 215, 0, 0.2)';
    div.style.borderRight = '4px solid gold';
    div.innerHTML = `<b style="color:gold;">🤫 همس سرّي من الأدمن:</b> ${message} <span style="font-size:10px; color:#888;">[${time}]</span>`;
  } else if (system) {
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

  const atBottom = chatMessages.scrollTop + chatMessages.clientHeight >= chatMessages.scrollHeight - 30;
  if (atBottom || isUserAtBottom) {
    scrollChatToBottom();
    newMessageCount = 0;
    hideNewMessageBadge();
  } else {
    newMessageCount++;
    showNewMessageBadge(newMessageCount);
  }

  if (!chatContainer.classList.contains('open') && !system) {
    btnChat.classList.add('notify');
  }
}

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

// --- تحديث قائمة اللاعبين مع أدوات التحكم الفردية للأدمن ---
function updatePlayersList(players, bannedList = []) {
  playersList.innerHTML = '';
  const amIAdmin = players.find(p => p.id === playerId)?.isAdmin || false;

  players.forEach((p, i) => {
    const li = document.createElement('li');
    li.dataset.id = p.id;

    let color = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '#00d1ff';
    li.style.color = color;

    const vipCrown = p.isVIP ? '👑 ' : '';
    let playerHtml = `${i + 1}. ${vipCrown}${colorizeName(p.name, p.color)} - ${p.score} نقطة`;

    if (amIAdmin && p.id !== playerId) {
      playerHtml += `
        <div class="admin-player-tools" style="display:inline-block; margin-right:8px;">
          <button title="طرد وباند مع سبب" onclick="adminKickBan('${p.id}')">❌</button>
          <button title="طرد مؤقت" onclick="adminTempBan('${p.id}')">⏳</button>
          <button title="منع/سماح الكتابة" onclick="socket.emit('admin_action', {type:'toggle_mute', targetId:'${p.id}'})">${p.isMuted ? '💬' : '🔇'}</button>
          <button title="إخفاء/إظهار الشات" onclick="socket.emit('admin_action', {type:'toggle_chat_view', targetId:'${p.id}'})">${p.canSeeChat ? '👁️‍🗨️' : '👁️'}</button>
          <button title="سحب صلاحية الرسم" onclick="socket.emit('admin_action', {type:'toggle_draw', targetId:'${p.id}'})">${p.canDraw ? '🎨' : '🔒'}</button>
          <button title="وضع العمياء" onclick="socket.emit('admin_action', {type:'toggle_blind', targetId:'${p.id}'})">${p.isBlind ? '🕶️' : '👁️'}</button>
          <button title="وضع بطء الكتابة" onclick="socket.emit('admin_action', {type:'toggle_slow', targetId:'${p.id}'})">${p.slowMode ? '⚡' : '⏱️'}</button>
          <button title="تعديل الاسم" onclick="adminRename('${p.id}')">✏️</button>
          <button title="تصفير النقاط" onclick="socket.emit('admin_action', {type:'reset_score', targetId:'${p.id}'})">🔄</button>
          <button title="إضافة نقاط" onclick="adminAddScore('${p.id}', 5)">➕</button>
          <button title="خصم نقاط" onclick="adminAddScore('${p.id}', -5)">➖</button>
          <button title="همس خفي" onclick="adminWhisper('${p.id}')">🤫</button>
          <button title="منح لقب VIP" onclick="socket.emit('admin_action', {type:'toggle_vip', targetId:'${p.id}'})">👑</button>
        </div>
      `;
    }

    li.innerHTML = playerHtml;
    playersList.appendChild(li);
  });

  // إضافة الأسماء المبندة مع خيار فك الباند للأدمن
  if (amIAdmin && bannedList.length > 0) {
    const bannedHeader = document.createElement('li');
    bannedHeader.style.color = '#ff4444';
    bannedHeader.style.marginTop = '10px';
    bannedHeader.innerHTML = '<b>المحذورين:</b>';
    playersList.appendChild(bannedHeader);

    bannedList.forEach(b => {
      const li = document.createElement('li');
      li.style.color = '#888';
      li.innerHTML = `${b.name} (${b.reason}) <button onclick="socket.emit('admin_action', {type:'unban', targetIp:'${b.ip}'})">🔓 فك الباند</button>`;
      playersList.appendChild(li);
    });
  }
}

// --- دوال أدوات الأدمن الفردية ---
function adminKickBan(id) {
  const reason = prompt("أدخل سبب الطرد والباند:") || "مخالفة الشروط";
  socket.emit('admin_action', { type: 'kick_ban', targetId: id, reason });
}
function adminTempBan(id) {
  const mins = parseInt(prompt("أدخل مدة الطرد بالدقائق:", "5")) || 5;
  socket.emit('admin_action', { type: 'temp_ban', targetId: id, minutes: mins });
}
function adminRename(id) {
  const newName = prompt("أدخل الاسم الجديد للاعب:");
  if (newName) socket.emit('admin_action', { type: 'force_rename', targetId: id, newName });
}
function adminAddScore(id, amount) {
  socket.emit('admin_action', { type: 'modify_score', targetId: id, amount });
}
function adminWhisper(id) {
  const msg = prompt("اكتب الهمس السري لهذا اللاعب:");
  if (msg) socket.emit('admin_action', { type: 'whisper', targetId: id, message: msg });
}

// --- الأحداث والمستمعات ---

// زر نافذة الألوان الخارجي وتغيير الثيم المحفوظ
if (btnColorsDialog) {
  btnColorsDialog.addEventListener('click', () => {
    if (colorsDialog) colorsDialog.showModal();
  });
}
if (closeColorsBtn) {
  closeColorsBtn.addEventListener('click', () => {
    if (colorsDialog) colorsDialog.close();
  });
}

document.querySelectorAll('.theme-option-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const theme = e.target.dataset.theme;
    applyTheme(theme);
  });
});

// الأحداث العادية للشات والمنافسة
btnChat.addEventListener('click', () => {
  if (chatContainer.classList.contains('open')) {
    chatContainer.classList.remove('open');
    chatContainer.hidden = true;
    btnChat.classList.remove('notify');
  } else {
    chatContainer.classList.add('open');
    chatContainer.hidden = false;
    chatInput.focus();
    btnChat.classList.remove('notify');
    scrollChatToBottom();
  }
});

btnCloseChat.addEventListener('click', () => {
  chatContainer.classList.remove('open');
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

cancelNameBtn.addEventListener('click', () => changeNameDialog.close());

changeNameForm.addEventListener('submit', e => {
  e.preventDefault();
  const newName = inputName.value.trim();
  const newColor = inputColor.value;
  if (newName) {
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

if (btnZizo) {
  btnZizo.addEventListener('click', () => {
    const boardDialog = document.getElementById('board-dialog');
    if (boardDialog) boardDialog.showModal();
  });
}

inputAnswer.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (!canAnswer) return;
    const answer = String(inputAnswer.value).trim();
    if (!answer) return;

    const timeUsed = ((Date.now() - startTime) / 1000).toFixed(2);
    socket.emit('submitAnswer', { answer, timeUsed });
    inputAnswer.value = '';
  }
});

chatMessages.addEventListener('scroll', () => {
  const position = chatMessages.scrollTop + chatMessages.clientHeight;
  isUserAtBottom = position >= chatMessages.scrollHeight - 15;
  if (isUserAtBottom) hideNewMessageBadge();
});

// --- أحداث Socket.io ---

socket.on('welcome', data => {
  playerId = data.id;
  socket.emit('setName', { name: playerName, color: playerColor });
});

socket.on('newWord', data => {
  currentWord = data.word;
  wordDisplay.textContent = isBlind ? "???" : data.word;
  startTime = Date.now();
  answerTimeDisplay.textContent = data.isReverse ? "🌀 الكلمة معكوسة! اكتبها صح" : "";
  canAnswer = true;
});

socket.on('updateScore', score => {
  myScore = score;
  pointsDisplay.textContent = `النقاط: ${myScore}`;
});

socket.on('updatePlayers', ({ players, bannedList }) => {
  updatePlayersList(players, bannedList);
});

socket.on('isAdmin', isAdmin => {
  if (adminControlPanel) {
    adminControlPanel.style.display = isAdmin ? 'block' : 'none';
  }
});

socket.on('chatMessage', data => addChatMessage(data));

socket.on('whisperMessage', data => {
  addChatMessage({ message: data.message, isWhisper: true });
});

socket.on('playerWon', data => alert(`🎉 مبروك ${data.name} لقد فزت باللعبة!`));

socket.on('kicked_with_reason', reason => {
  alert(`تم طردك وباند حسابتك! السبب: ${reason}`);
  window.location.reload();
});

socket.on('temp_banned', mins => {
  alert(`تم حظرك مؤقتاً لمدة ${mins} دقائق!`);
  window.location.reload();
});

socket.on('update_mute_status', isMuted => {
  chatInput.disabled = isMuted;
  chatInput.placeholder = isMuted ? "أنت ممنوع من الكتابة بواسطة الأدمن" : "اكتب رسالة...";
});

socket.on('update_chat_view_status', canSeeChat => {
  chatContainer.style.display = canSeeChat ? 'block' : 'none';
});

socket.on('update_blind_status', blindState => {
  isBlind = blindState;
  wordDisplay.textContent = isBlind ? "???" : currentWord;
});

socket.on('freeze_status', frozen => {
  inputAnswer.disabled = frozen;
  inputAnswer.placeholder = frozen ? "تم تجميد الإجابات من الأدمن..." : "اكتب إجابتك هنا...";
});

socket.on('broadcast_popup', msg => {
  alert(`📢 إعلان هام من الأدمن:\n\n${msg}`);
});

socket.on('show_audit_logs', logs => {
  let logText = logs.map(l => `[${l.time}] ${l.text}`).join('\n');
  alert(`📜 سجل المراقبة (Audit Logs):\n\n` + (logText || "لا توجد سجلات بعد."));
});

socket.on('correctAnswer', data => {
  answerTimeDisplay.textContent = `أجبت في: ${data.timeUsed} ثانية (+${data.pointsEarned} نقطة)`;
});

// =========================
//      TYPING SYSTEM
// =========================
const typingMessages = {};
chatInput.addEventListener('input', () => {
  if (chatInput.value.trim().length > 0) socket.emit('typing', playerName);
  else socket.emit('stopTyping', playerName);
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

// ==========================================
//          استوديو الرسم والتراسل
// ==========================================
let persistentCanvasData = null; 
let isSoloMode = false;
let lastX = 0, lastY = 0;
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
        <button onclick="loadToCanvas(${index})" style="flex:1; padding:5px;">📝</button>
        <button onclick="deleteGalleryItem(${index})" style="flex:1; padding:5px; background:#ff4444; color:white; border:none;">🗑️</button>
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if(!isSoloMode) socket.emit('load-gallery-all', canvas.toDataURL());
  };
};

window.deleteGalleryItem = (idx) => {
  if(confirm("حذف هذه الرسمة؟")) {
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
    ctx.lineWidth = brushSize.value;
    let currentColor = brushColor.value;

    if (brushType.value === 'eraser') {
      ctx.strokeStyle = bgColor.value;
      currentColor = bgColor.value;
    } else {
      ctx.globalAlpha = brushOpacity.value;
      ctx.strokeStyle = brushColor.value;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();

    if (!isSoloMode) {
      socket.emit('draw-data', {
        x: x / canvas.width, y: y / canvas.height,
        prevX: lastX / canvas.width, prevY: lastY / canvas.height,
        color: currentColor, size: brushSize.value,
        opacity: brushType.value === 'eraser' ? 1.0 : brushOpacity.value,
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
    ctx.strokeStyle = data.color;
    ctx.beginPath();
    ctx.moveTo(data.prevX * canvas.width, data.prevY * canvas.height);
    ctx.lineTo(data.x * canvas.width, data.y * canvas.height);
    ctx.stroke();
    ctx.restore();
  });

  socket.on('load-remote', (imgData) => {
    if (isSoloMode) return;
    const img = new Image();
    img.src = imgData;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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
    btnSolo.innerHTML = isSoloMode ? '🔐 وضع منفرد: <span style="color:#00ff00;">ON</span>' : '🔐 وضع منفرد: <span style="color:#ff4444;">OFF</span>';
  };

  btnUndo.onclick = () => {
    if (undoStack.length > 0) {
      const img = new Image();
      img.src = undoStack.pop();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
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
    const artName = prompt("اسم الرسمة:", `عمل ${galleryData.length + 1}`);
    if (artName) {
      galleryData.push({ name: artName, img: canvas.toDataURL() });
      localStorage.setItem('myArtGallery', JSON.stringify(galleryData));
      updateGalleryUI();
    }
  };
};

initStudio();
