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
document.addEventListener('DOMContentLoaded', () => {
    // 1. العناصر الأساسية
    const boardDialog = document.getElementById('board-dialog');
    const btnOpen = document.getElementById('btn-open-board');
    const btnClose = document.getElementById('btn-close-board');
    const canvas = document.getElementById('main-canvas');
    const ctx = canvas.getContext('2d');
    
    const brushColor = document.getElementById('brush-color');
    const bgColor = document.getElementById('bg-color');
    const brushSize = document.getElementById('brush-size');
    const brushType = document.getElementById('brush-type');
    const brushOpacity = document.getElementById('brush-opacity');
    
    const btnClear = document.getElementById('btn-clear-canvas');
    const btnUndo = document.getElementById('btn-undo');
    const btnSolo = document.getElementById('btn-solo-mode');
    const btnShareAll = document.getElementById('btn-share-all');
    const btnSaveGallery = document.getElementById('btn-save-to-gallery');
    const miniGallery = document.getElementById('mini-gallery');

    let drawing = false;
    let isSolo = false;
    let undoStack = [];
    let galleryData = []; // لتخزين بيانات الـ 30 رسمة

    // 2. إعدادات فتح وإغلاق اللوحة
    if(btnOpen) {
        btnOpen.onclick = () => {
            boardDialog.showModal();
            if (canvas.width === 0) initCanvas();
        };
    }
    if(btnClose) btnClose.onclick = () => boardDialog.close();

    function initCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        ctx.fillStyle = bgColor.value;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 3. منطق الرسم (بخاخ، ريشة، ممحاة)
    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX || e.touches[0].clientX) - rect.left,
            y: (e.clientY || e.touches[0].clientY) - rect.top
        };
    };

    const startDrawing = (e) => {
        drawing = true;
        saveState();
        draw(e);
    };

    const stopDrawing = () => {
        drawing = false;
        ctx.beginPath();
    };

    const draw = (e) => {
        if (!drawing) return;
        const pos = getPos(e);
        const type = brushType.value;
        const color = brushColor.value;
        const size = brushSize.value;

        ctx.globalAlpha = brushOpacity.value;

        if (type === 'spray') {
            ctx.fillStyle = color;
            for (let i = 0; i < 20; i++) {
                const off = size * 1.5;
                ctx.fillRect(pos.x + (Math.random() * off - off / 2), pos.y + (Math.random() * off - off / 2), 1, 1);
            }
        } else {
            ctx.lineWidth = size;
            ctx.lineCap = 'round';
            ctx.globalCompositeOperation = (type === 'eraser') ? 'destination-out' : 'source-over';
            ctx.strokeStyle = color;
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        }

        if (!isSolo && typeof socket !== 'undefined') {
            socket.emit('artStream', { x: pos.x, y: pos.y, color, size, type, opacity: ctx.globalAlpha });
        }
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('touchstart', (e) => { startDrawing(e); e.preventDefault(); }, {passive:false});
    canvas.addEventListener('touchmove', (e) => { draw(e); e.preventDefault(); }, {passive:false});

    // 4. نظام المعرض (30 رسمة + تسمية + تعديل)
    btnSaveGallery.onclick = () => {
        if (galleryData.length >= 30) {
            alert("المعرض ممتلئ! (30/30)");
            return;
        }

        const artName = prompt("شو بدك تسمي الرسمة؟", `رسمة ${galleryData.length + 1}`);
        if (!artName) return;

        const dataURL = canvas.toDataURL();
        const artObject = { id: Date.now(), name: artName, image: dataURL };
        galleryData.push(artObject);
        updateGalleryUI();
    };

    function updateGalleryUI() {
        miniGallery.innerHTML = '';
        galleryData.forEach(art => {
            const card = document.createElement('div');
            card.className = 'gallery-card';
            card.innerHTML = `
                <img src="${art.image}">
                <span>${art.name}</span>
            `;
            
            card.onclick = () => {
                const action = confirm(`رسمة: ${art.name}\n- "موافق" للتعديل عليها.\n- "إلغاء" لعرضها للكل.`);
                if (action) {
                    // وضع التعديل: تحميل الرسمة للكانفاس
                    const img = new Image();
                    img.src = art.image;
                    img.onload = () => {
                        ctx.globalCompositeOperation = 'source-over';
                        ctx.drawImage(img, 0, 0);
                        alert("جاهز للتعديل!");
                    };
                } else {
                    // وضع العرض للكل
                    if (typeof socket !== 'undefined') socket.emit('syncFullCanvas', art.image);
                }
            };
            miniGallery.appendChild(card);
        });
        document.querySelector('h4').innerText = `📸 المعرض (${galleryData.length}/30)`;
    }

    // 5. الأزرار الأخرى
    function saveState() {
        if (undoStack.length >= 25) undoStack.shift();
        undoStack.push(canvas.toDataURL());
    }

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

    btnClear.onclick = () => {
        if(confirm("بدك تمسح كل شي؟")) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = bgColor.value;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            if (typeof socket !== 'undefined') socket.emit('clearArt');
        }
    };

    btnSolo.onclick = () => {
        isSolo = !isSolo;
        btnSolo.innerText = isSolo ? "🔐 وضع منفرد: ON" : "🔐 وضع منفرد: OFF";
        btnSolo.style.background = isSolo ? "#ffd700" : "#3e2f1c";
        btnSolo.style.color = isSolo ? "black" : "gold";
    };

    btnShareAll.onclick = () => {
        if (typeof socket !== 'undefined') {
            socket.emit('syncFullCanvas', canvas.toDataURL());
            alert("تمت مشاركة اللوحة مع الجميع!");
        }
    };

    bgColor.oninput = () => {
        ctx.fillStyle = bgColor.value;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (typeof socket !== 'undefined') socket.emit('canvasBgChange', bgColor.value);
    };
});
/* ============================================================ */
/* المحرك النهائي لستوديو الرسم - إصلاح الأزرار والخلفية (نزار قطوش) */
/* ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('main-canvas');
    if (!canvas) return; // تأمين إذا الكانفاس مش موجود

    const ctx = canvas.getContext('2d');
    let drawing = false;

    // أدوات التحكم - تأكد أن الـ ID في HTML يطابق هذه الأسماء
    const colorPicker = document.getElementById('color-picker');
    const bgColorPicker = document.getElementById('bg-color-picker'); // أضف هذا الـ ID في HTML للخلفية
    const brushSize = document.getElementById('brush-size');
    const clearBtn = document.getElementById('clear-canvas');
    const saveBtn = document.getElementById('save-drawing');

    // إعدادات افتراضية
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. وظيفة ضبط الحجم (عشان الرسم ما يطلع بعيد عن الماوس)
    function initCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        ctx.lineCap = 'round'; // نعيدها بعد ضبط الحجم
        ctx.strokeStyle = colorPicker ? colorPicker.value : '#ffd700';
        ctx.lineWidth = brushSize ? brushSize.value : 5;
    }
    
    window.addEventListener('load', initCanvas);
    window.addEventListener('resize', initCanvas);
    initCanvas();

    // 2. منطق الرسم (دعم الجوال والكمبيوتر)
    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function start(e) {
        drawing = true;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        if (e.type === 'touchstart') e.preventDefault();
    }

    function move(e) {
        if (!drawing) return;
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        if (e.type === 'touchmove') e.preventDefault();
    }

    function stop() {
        drawing = false;
    }

    // ربط أحداث اللمس والماوس
    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);

    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', stop);

    // 3. تشغيل الأزرار (Event Listeners)
    
    if (colorPicker) {
        colorPicker.oninput = (e) => ctx.strokeStyle = e.target.value;
    }

    if (brushSize) {
        brushSize.oninput = (e) => ctx.lineWidth = e.target.value;
    }

    // تغيير لون الخلفية (اللي سألت عنها)
    if (bgColorPicker) {
        bgColorPicker.oninput = (e) => {
            canvas.style.backgroundColor = e.target.value;
        };
    }

    if (clearBtn) {
        clearBtn.onclick = () => {
            if (confirm('تصفير اللوحة؟')) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        };
    }

    if (saveBtn) {
        saveBtn.onclick = () => {
            const link = document.createElement('a');
            link.download = 'nizar-art.png';
            link.href = canvas.toDataURL();
            link.click();
        };
    }
});
