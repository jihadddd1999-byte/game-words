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
        
// ==========================================
//      نظام لوحة الرسم (STUDIO SYSTEM)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. ربط العناصر (تأكد أن الـ ID في HTML يطابق هذه الأسماء)
    const boardDialog = document.getElementById('board-dialog'); // المودال نفسه
    const btnOpen = document.getElementById('btn-open-board');   // زر الفتح بالصفحة
    const btnClose = document.getElementById('btn-close-board'); // زر الإغلاق (X)
    const canvas = document.getElementById('main-canvas');
    const ctx = canvas.getContext('2d');
    
    // أدوات التحكم
    const brushColor = document.getElementById('brush-color') || document.getElementById('color-picker');
    const bgColor = document.getElementById('bg-color') || document.getElementById('bg-color-picker');
    const brushSize = document.getElementById('brush-size');
    const brushType = document.getElementById('brush-type');
    const brushOpacity = document.getElementById('brush-opacity');
    
    const btnClear = document.getElementById('btn-clear-canvas');
    const btnUndo = document.getElementById('btn-undo');
    const btnSaveGallery = document.getElementById('btn-save-to-gallery');
    const miniGallery = document.getElementById('mini-gallery');

    let drawing = false;
    let undoStack = [];
    let galleryData = []; 

    // 2. إعدادات فتح وإغلاق اللوحة
    if(btnOpen) {
        btnOpen.onclick = () => {
            boardDialog.showModal();
            // ضبط حجم الكانفاس ليتناسب مع الحاوية فور الفتح
            setTimeout(initCanvas, 100); 
        };
    }
    
    if(btnClose) btnClose.onclick = () => boardDialog.close();

    function initCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        // تعبئة خلفية الكانفاس باللون المختار
        ctx.fillStyle = bgColor ? bgColor.value : "#1a140a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // إعدادات الفرشاة الأساسية
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }

    // 3. منطق الرسم (دعم لمس وماوس)
    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (e) => {
        drawing = true;
        saveState(); // حفظ الحالة للتراجع
        draw(e);
    };

    const stopDrawing = () => {
        drawing = false;
        ctx.beginPath();
    };

    const draw = (e) => {
        if (!drawing) return;
        const pos = getPos(e);
        
        const type = brushType ? brushType.value : 'brush';
        const color = brushColor ? brushColor.value : '#ffd700';
        const size = brushSize ? brushSize.value : 5;
        const opacity = brushOpacity ? brushOpacity.value : 1;

        ctx.globalAlpha = opacity;

        if (type === 'spray') {
            ctx.fillStyle = color;
            for (let i = 0; i < 15; i++) {
                const off = size * 2;
                ctx.fillRect(pos.x + (Math.random() * off - off / 2), pos.y + (Math.random() * off - off / 2), 1, 1);
            }
        } else {
            ctx.lineWidth = size;
            ctx.lineCap = 'round';
            // إذا النوع ممحاة نستخدم "destination-out"
            ctx.globalCompositeOperation = (type === 'eraser') ? 'destination-out' : 'source-over';
            ctx.strokeStyle = color;
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        }
    };

    // مستمعات الأحداث
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDrawing);
    
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e); }, {passive:false});
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); }, {passive:false});
    canvas.addEventListener('touchend', stopDrawing);

    // 4. الأزرار الوظيفية
    
    // تغيير لون الخلفية فورياً
    if(bgColor) {
        bgColor.oninput = () => {
            // تنبيه: هذا سيمسح الرسم الحالي إلا إذا قمت برسم مستطيل خلفي
            if(confirm("تغيير لون الخلفية سيمسح الرسمة الحالية، موافق؟")) {
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = bgColor.value;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        };
    }

    if(btnClear) {
        btnClear.onclick = () => {
            if(confirm("بدك تمسح كل شي؟")) {
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = bgColor ? bgColor.value : "#1a140a";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        };
    }

    function saveState() {
        if (undoStack.length >= 20) undoStack.shift();
        undoStack.push(canvas.toDataURL());
    }

    if(btnUndo) {
        btnUndo.onclick = () => {
            if (undoStack.length > 0) {
                const img = new Image();
                img.src = undoStack.pop();
                img.onload = () => {
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                };
            }
        };
    }
});
