/* ==========================================================================
   🛡️ سيرفر لعبة الكلمات السريعة - النسخة الكاملة والمشاملة بدون حذف
   كلمة السر: 20018151070792005932
   ========================================================================== */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '20018151070792005932';
const MAX_PLAYERS = 30;

app.use(express.static(path.join(__dirname, 'public')));

// قائمة الكلمات الكاملة
const words = [
  "قلب","رمح","عشب","صندوق","حبل","اشارة مرور","ثعلب","يضحك","قنفذ","علم","بقرة","كلب","شبح","قنبلة","نعامة","سجق","ديك","قطايف","روبوت","بطة",
  "يمشي","ابرة","ذئب","نافذة","فرشة","صحن","بطريق","ملك","سكر","برج ايفل","مزرعة","ملفوف","روبيان","مكة","مندي","ثلج","ذبابة","طاولة",
  "ميكانيكي","جدار","ايسكريم","سكين","ماعز","كرة سلة","بطاطا","اصبع","سروال","بصل","سلك","سائق","طماطم","كنافة","اذن","جوال","نمر","طاووس",
  "ثور","خوخ","توصيلة","قمر","شارع","منسف","مانجو","دم","ماء","طيار","عود","باص","جزيرة","تاج","عصا","تمساح","قدم","بيض","حزين","فأس",
  "هاتف","حوت","ظفر","قفل","ساعة","عسل","جوز الهند","كنب","عصفور","فطر","قطه","مخدة","شاورما","توت","مسطرة","فراولة","هدهد","قرد","زهرة",
  "ذرة","مكتب","دولاب","فيش","فشار","سماء","يسبح","فيل","تنين","شريط","ذهب","الارض","بروكلي","غيوم","شوكولاته","برجر","فلوس","وحيد القرن",
  "فانوس","سنجاب","ملعقة","خريطة","صرصور","منديل","كاتشب","مصاصة","دب قطبي","نيزك","رمان","عقرب","حمار","تلفاز","حفرة","نار","حقيبة",
  "كرة قدم","درع","دب","بقلاوة","اناناس","سرير","زيتون","غوريلا","سلم","شاحنة","مسجد","بركان","قوس","شطرنج","عامل نظافة","غسالة",
  "منشار","باب","دمية","جاموس","عائلة","ليل","حذاء","زرافة","طابعة","نمل","خيار","شوربة","ستارة","كيس","ريموت","دباسة","سلطعون",
  "باذنجان","مزهرية","سيف","مكتبة","ورقة","فستان","مشمش","كوب","كشري","سلحفاة","حليب","مجرة","نسر","غواصة","خشب","نظارة","افوكادو",
  "قارب","بيانو","مسرح","شنب","اسنان","انف","مروحة","قهوة","فقمة","حديقة","بلياردو","ساعة رملية","نهر","فول","فلاشة","مصباح","لسان",
  "سيارة","قلم رصاص","سمكة","كوكيز","طائرة","ضفدع","كاميرا","تمر","شراب","عين","كوالا","زر","بامية","ضبع","غراب","خبز","مسمار","موية",
  "نخلة","كرز","بيتزا","شوكة","دكتور","مرآة","مايك","طريق","مغني","غابة","جبل","هيكل عظمي","بحر","مظلة","كبة","لاعب","خس","برج خليفة",
  "جزر","وسادة","خيمة","خياط","سبانخ","رقص","دجاج","صيدلي","اطفائي","كبسة","كيبورد","سجاده","محفظة","خنزير","عنب","شاشة","قاضي",
  "شجرة","شاي","نعال","نجوم","فراخ","فلفل","نحلة","شامبو","خفاش","كنز","قوس قزح","اخطبوط","محاسب","كتاب","طباخ","برق","غزال","خاتم",
  "عظم","فطيرة","دفتر","ببغاء","جمل","برتقال","حمار وحشي","زبالة","الماس","غرفة","ستيك","حلاوة","نقانق","دودة","ملعب","ممثل","زيت",
  "مدرسة","الكعبة","مكياج","بسكوت","سمبوسة","شاحن","جبن","شمام","مذيع","صحراء","فرشاة","حمام","بومة","موز","صبار","وحش","جاكيت",
  "جوافة","بطارية","شمعة","ليمون","جوهرة","معدة","شاطئ","باندا","دونات","فراشة","ارنب","اسد","سفينة","عصير","ولاعة","مكرونة","ثوب",
  "قدر","تبولة","بطيخ","سوشي","صاروخ","جالس","سماعة","شرطي","مكيف","قطة","مقلوبة","مقص","دجاج مشوي","فرس النهر","طبل","يركض",
  "مكنسة","حاجب","اعصار","كوخ","مطر","فهد","قبعة","ثعبان","رسام","حمص","يد","عنكبوت","برياني","سحلية","لحم","وردة","مطعم","جرس",
  "سبورة","بطن","قارورة","سينما","مهندس","عطر","ورق عنب","معلم","ممرضة","كريب","قطار","كباب","طفل","شلال","سلطة","مشط","خلاط",
  "نوم","شتاء","ثلاجة","كهربائي","كأس","جامعة","برج","تفاح","جمجمة","كرسي","بطاطس","كيك","صابون","هرم","ساعة يد","كوكب","لابتوب",
  "شنطة","عمارة","بيت","ديناصور","فرن","رز","مفتاح","رموش","جوارب","مدينة","قلم","سلة","حصان","زومبي","نجمة","علبة","مطبخ","فاصوليا",
  "كمبيوتر","ملوخية","قميص","مرحاض","فم","صقر"
];

// ألوان الأسماء الخاصة
const specialNamesColors = {
  "جهاد": "#00ffe7",
  "زيزو": "#ff3366",
  "أسامة": "#cc33ff",
  "مصطفى": "#33ff99",
  "حلا": "#ff33cc",
  "نور": "#ffff33"
};

// ==========================================================================
// 📊 الذاكرة والحالة العامة
// ==========================================================================

const players = new Map();             
const authenticatedAdmins = new Set();  
let superAdminSocketId = null;         

const bannedIPs = new Map();           
const kickedIPs = new Map();           
const allowedMuteBypass = new Set();   
const typingUsers = new Set();

let wordTimer = null;

const roomState = {
  isLocked: false,
  isMutedAll: false,
  isFrozenAll: false,
  isDoubleRound: false,
  isSuddenDeath: false,
  suddenDeathTimer: 30,
  suddenDeathRequiredAnswers: 1,
  winningScore: 1000,
  pointsMode: 'first_only',             
  pointsPerAnswer: 1,
  currentWord: '',
  nextCustomWord: '',
  tickerText: 'مرحباً بكم في لعبة الكلمات السريعة!',
  tickerVisible: true
};

// ==========================================================================
// 🛠️ الدوال المساعدة
// ==========================================================================

function getClientIP(socket) {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return socket.handshake.address || socket.request.connection.remoteAddress;
}

function chooseNewWord() {
  if (roomState.nextCustomWord) {
    roomState.currentWord = roomState.nextCustomWord;
    roomState.nextCustomWord = '';
  } else {
    const idx = Math.floor(Math.random() * words.length);
    roomState.currentWord = words[idx];
  }
  io.emit('newWord', roomState.currentWord);
}

function getFormattedPlayersList(forAdmin = false) {
  const list = [];
  players.forEach((p) => {
    if (!forAdmin && p.isHiddenFromRoom) return;

    let displayName = p.name;
    if (p.isAdmin && !p.hideAdminBadge) {
      displayName = `[الأدمن] ${p.name}`;
    }

    list.push({
      id: p.id,
      name: displayName,
      rawName: p.name,
      score: p.score,
      wins: p.wins,
      isVip: p.isVip,
      muted: p.muted,
      frozen: p.frozen,
      blinded: p.blinded,
      canDraw: p.canDraw,
      isAdmin: p.isAdmin,
      hideAdminBadge: p.hideAdminBadge,
      isHiddenFromRoom: p.isHiddenFromRoom,
      color: specialNamesColors[p.name] || p.color || '#00e5ff'
    });
  });
  return list.sort((a, b) => b.score - a.score);
}

function updatePlayersList() {
  io.emit('updatePlayers', getFormattedPlayersList(false));
  authenticatedAdmins.forEach(adminId => {
    io.to(adminId).emit('admin:players_updated', getFormattedPlayersList(true));
  });
}

function sendSystemMessage(message) {
  io.emit('chatMessage', { system: true, message });
}

function logToAudit(message, from = 'النظام', to = 'الكل') {
  if (superAdminSocketId) {
    io.to(superAdminSocketId).emit('admin:audit_log', {
      timestamp: new Date().toLocaleTimeString('ar-EG'),
      from,
      to,
      message
    });
  }
}

// ==========================================================================
// 🔌 الاتصال عبر Socket.io
// ==========================================================================

io.on('connection', (socket) => {
  const clientIP = getClientIP(socket);

  // 1. فحص الباند
  if (bannedIPs.has(clientIP)) {
    const banData = bannedIPs.get(clientIP);
    if (banData.bannedUntil === 'PERMANENT' || Date.now() < banData.bannedUntil) {
      socket.emit('chatMessage', { system: true, message: 'أنت محظور بشكل دائم أو مؤقت من دخول اللعبة.' });
      socket.disconnect(true);
      return;
    } else {
      bannedIPs.delete(clientIP);
    }
  }

  // 2. فحص الطرد
  if (kickedIPs.has(clientIP)) {
    const kickData = kickedIPs.get(clientIP);
    if (kickData.kickedUntil === 'PERMANENT' || Date.now() < kickData.kickedUntil) {
      socket.emit('chatMessage', { system: true, message: 'أنت مطرود من الروم حالياً.' });
      socket.disconnect(true);
      return;
    } else {
      kickedIPs.delete(clientIP);
    }
  }

  // 3. فحص قفل الروم والعدد الأقصى
  if (roomState.isLocked || players.size >= MAX_PLAYERS) {
    socket.emit('chatMessage', { system: true, message: 'الغرفة مغلقة أو مكتملة العدد.' });
    socket.disconnect(true);
    return;
  }

  const newPlayer = {
    id: socket.id,
    name: `لاعب_${socket.id.substring(0, 4)}`,
    score: 0,
    wins: 0,
    canAnswer: true,
    ip: clientIP,
    isVip: false,
    muted: roomState.isMutedAll,
    frozen: roomState.isFrozenAll,
    blinded: false,
    canDraw: true,
    isAdmin: false,
    hideAdminBadge: false,
    isHiddenFromRoom: false,
    color: '#00e5ff'
  };

  players.set(socket.id, newPlayer);

  socket.emit('welcome', { id: socket.id });
  socket.emit('ticker:updated', { text: roomState.tickerText, visible: roomState.tickerVisible });
  socket.emit('roomState:sync', roomState);
  sendSystemMessage(`${newPlayer.name} دخل اللعبة.`);

  if (!roomState.currentWord) chooseNewWord();
  else {
    socket.emit('newWord', roomState.currentWord);
    socket.emit('updateScore', newPlayer.score);
  }

  updatePlayersList();

  // ==========================================
  // 🎨 استوديو الرسم
  // ==========================================
  socket.on('draw-data', (data) => {
    const player = players.get(socket.id);
    if (player && player.canDraw) {
      socket.broadcast.emit('draw-remote', data);
    }
  });

  socket.on('clear-board-all', (data) => {
    const player = players.get(socket.id);
    if (player && player.canDraw) {
      io.emit('clear-board-remote', data);
    }
  });

  socket.on('load-gallery-all', (imgData) => {
    const player = players.get(socket.id);
    if (player && player.canDraw) {
      socket.broadcast.emit('load-remote', imgData);
    }
  });

  // ==========================================
  // 💬 الشات وإعدادات الاسم
  // ==========================================
  socket.on('setName', (data) => {
    if (!data || typeof data.name !== 'string') return;
    const player = players.get(socket.id);
    if (!player) return;

    const oldName = player.name;
    player.name = data.name.trim().substring(0, 20);

    if (specialNamesColors[player.name]) {
      player.color = specialNamesColors[player.name];
    } else if (data.color && /^#([0-9A-F]{3}){1,2}$/i.test(data.color)) {
      player.color = data.color;
    } else {
      player.color = '#00e5ff';
    }

    updatePlayersList();
    sendSystemMessage(`${oldName} غير اسمه إلى ${player.name}`);

    if (player.name === "كول") {
      socket.emit('chatMessage', { system: true, message: "🌸 أهلاً كول! نورتِ اللعبة 🤍" });
    }
  });

  socket.on('typing', () => {
    const player = players.get(socket.id);
    if (!player) return;
    typingUsers.add(player.name);
    io.emit('typing', [...typingUsers]);
  });

  socket.on('stopTyping', () => {
    const player = players.get(socket.id);
    if (!player) return;
    typingUsers.delete(player.name);
    io.emit('typing', [...typingUsers]);
  });

  socket.on('submitAnswer', (data) => {
    const player = players.get(socket.id);
    if (!player || !data || typeof data.answer !== 'string' || !player.canAnswer || player.frozen) return;

    const answer = data.answer.trim();
    const timeUsed = parseFloat(data.timeUsed) || 0;

    if (answer === roomState.currentWord) {
      const basePoints = roomState.pointsPerAnswer || 1;
      const addedPoints = roomState.isDoubleRound ? basePoints * 2 : basePoints;
      
      player.score += addedPoints;
      socket.emit('updateScore', player.score);
      io.emit('chatMessage', { system: true, message: `✅ ${player.name} أجاب بشكل صحيح في ${timeUsed} ثانية!` });
      socket.emit('correctAnswer', { timeUsed });
      updatePlayersList();

      if (roomState.pointsMode === 'first_only') {
        player.canAnswer = false;
      }

      if (player.score >= roomState.winningScore) {
        player.wins++;
        io.emit('playerWon', { name: player.name, wins: player.wins });
        players.forEach(p => { p.score = 0; p.canAnswer = true; });
        updatePlayersList();
      }

      if (wordTimer) clearTimeout(wordTimer);
      wordTimer = setTimeout(() => {
        chooseNewWord();
        players.forEach(p => p.canAnswer = true);
      }, 2000);
    } else {
      socket.emit('chatMessage', { system: true, message: '❌ إجابة خاطئة!' });
      player.canAnswer = true;
      socket.emit('wrongAnswer');
    }
  });

          /**
 * ==========================================================================
 * 🚀 لعبة الكلمات السريعة - الباك إند المتقدم (Server-Side Logic)
 * 🛡️ إدارة نظام الأدمن الأساسي، الغرفة المغلقت، العقوبات والتحكم الكامل
 * ==========================================================================
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// إعداد تقديم الملفات الاستاتيكية
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 📊 قواعد البيانات في الذاكرة (In-Memory Data Structures)
// ==========================================

const players = new Map();             // socket.id -> Player Object
const authenticatedAdmins = new Set(); // Set of socket.ids
let superAdminSocketId = null;         // معرف الأدمن الأساسي
let superAdminIp = null;               // IP الأدمن الأساسي للتعرف عليه عند العودة

const pendingAdminApprovals = new Map(); // socket.id -> { name, ip }
const pendingRoomRequests = new Map();   // requestId -> { socketId, name, type: 'LOCK' | 'KICK', reason }

const bannedIPs = new Map();   // IP -> { bannedUntil, reason }
const kickedIPs = new Map();   // IP -> { kickedUntil, reason }
const allowedMuteBypass = new Set(); // socket.ids allowed during mute all

// حالة الغرفة الجماعية
const roomState = {
  isLocked: false,
  isMutedAll: false,
  isFrozenAll: false,
  isDoubleRound: false,
  isSuddenDeath: false,
  suddenDeathTimer: 30,
  suddenDeathRequiredAnswers: 1,
  winningScore: 100,
  pointsPerAnswer: 10,
  maxCorrectAnswersPerRound: 1, // كم لاعب يقدر يجاوب بالجولة
  currentWord: "",
  category: "",
  nextCustomWord: "",
  tickerText: "مرحباً بكم في لعبة الكلمات السريعة!",
  tickerVisible: true,
  tickerSpeed: 20, // السرعة بالثواني
  correctAnswersCount: 0
};

let auditLogs = [];
let wordTimer = null;

// ==========================================
// 🛠️ الدوال المساعدة (Helper Functions)
// ==========================================

function getClientIP(socket) {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return socket.handshake.address || socket.id;
}

function logToAudit(action, adminName, targetName = "", details = "") {
  const logEntry = {
    id: Date.now() + Math.random().toString(36).substr(2, 4),
    timestamp: new Date().toLocaleTimeString('ar-EG'),
    action,
    adminName: adminName || "الأدمن الأساسي",
    targetName,
    details
  };
  auditLogs.unshift(logEntry);
  if (auditLogs.length > 100) auditLogs.pop();

  // إرسال السجل للأدمن الأساسي فقط لحماية الخصوصية
  if (superAdminSocketId) {
    io.to(superAdminSocketId).emit('admin:audit_log_added', logEntry);
  }
}

function updatePlayersList() {
  const playersArray = [];
  players.forEach((p, socketId) => {
    // إخفاء الأدمن المخفي عن باقي اللاعبين
    if (p.isHiddenFromRoom) {
      // يرسل فقط للأدمنية
      return;
    }
    playersArray.push({
      id: socketId,
      name: p.name,
      score: p.score,
      isVip: !!p.isVip,
      isAdmin: !!p.isAdmin,
      hideAdminBadge: !!p.hideAdminBadge,
      muted: !!p.muted,
      frozen: !!p.frozen,
      blinded: !!p.blinded,
      isSuperAdmin: socketId === superAdminSocketId
    });
  });

  io.emit('players:list_update', playersArray);

  // إرسال القائمة الكاملة شاملا المخفيين للأدمنية المعتمدين
  const fullAdminList = [];
  players.forEach((p, socketId) => {
    fullAdminList.push({
      id: socketId,
      name: p.name,
      ip: p.ip,
      score: p.score,
      isVip: !!p.isVip,
      isAdmin: !!p.isAdmin,
      hideAdminBadge: !!p.hideAdminBadge,
      isHiddenFromRoom: !!p.isHiddenFromRoom,
      muted: !!p.muted,
      frozen: !!p.frozen,
      blinded: !!p.blinded,
      isSuperAdmin: socketId === superAdminSocketId
    });
  });

  authenticatedAdmins.forEach(adminId => {
    io.to(adminId).emit('admin:full_players_update', fullAdminList);
  });
}

function sendSystemMessage(message, targetSocketId = null) {
  const payload = { system: true, message, time: new Date().toLocaleTimeString('ar-EG') };
  if (targetSocketId) {
    io.to(targetSocketId).emit('chatMessage', payload);
  } else {
    io.emit('chatMessage', payload);
  }
}

// ==========================================
// 🔌 الاتصالات ومعالجة أحداث Socket.io
// ==========================================

io.on('connection', (socket) => {
  const clientIP = getClientIP(socket);

  // 1. التحقق من الحظر الباند والطرط قبل السماح بالاتصال
  const banInfo = bannedIPs.get(clientIP);
  if (banInfo) {
    if (banInfo.bannedUntil === 'PERMANENT' || Date.now() < banInfo.bannedUntil) {
      socket.emit('access_denied', {
        reason: 'BAN',
        message: `أنت محظور دائماً أو مؤقتاً من اللعبة. السبب: ${banInfo.reason || 'تحفظ الأدمن بالسبب'}`
      });
      return socket.disconnect(true);
    } else {
      bannedIPs.delete(clientIP);
    }
  }

  const kickInfo = kickedIPs.get(clientIP);
  if (kickInfo) {
    if (kickInfo.kickedUntil === 'PERMANENT' || Date.now() < kickInfo.kickedUntil) {
      socket.emit('access_denied', {
        reason: 'KICK',
        message: `تم طردك من الغرفة من قبل الأدمن. السبب: ${kickInfo.reason || 'الأدمن يتحفظ بالسبب'}`,
        canRequestEntry: true
      });
      return socket.disconnect(true);
    } else {
      kickedIPs.delete(clientIP);
    }
  }

  // 2. التحقق من قفل الغرفة
  if (roomState.isLocked) {
    // التعرف التلقائي على الأدمن الأساسي بحسب الـ IP إذا عاد
    if (superAdminIp && superAdminIp === clientIP) {
      // السماح بدخول الأدمن الأساسي تلقائياً
    } else {
      socket.emit('room_locked_prompt', {
        message: "الغرفة مغلقة حالياً من قبل الأدمن الأساسي."
      });
      // لا نقطع الاتصال فوراً لنسمح بطلب الإذن
    }
  }

  // تسجيل اللاعب فور انضمامه
  socket.on('joinGame', (data) => {
    const rawName = (data && data.name) ? data.name.trim() : "";
    const playerName = rawName || `لاعب_${Math.floor(1000 + Math.random() * 9000)}`;

    // التثبت من إمكانية الدخول لو كانت الغرفة مغلقة
    if (roomState.isLocked && superAdminIp !== clientIP && !socket.isAllowedByAdmin) {
      return socket.emit('room_locked_prompt', { message: "الغرفة مغلقة. يجب الحصول على إذن الأدمن أولاً." });
    }

    const playerObj = {
      id: socket.id,
      name: playerName,
      ip: clientIP,
      score: 0,
      isAdmin: false,
      isVip: false,
      hideAdminBadge: false,
      isHiddenFromRoom: false,
      muted: false,
      frozen: false,
      blinded: false
    };

    // التعرف التلقائي الذاتي على الأدمن الأساسي عند إعادة الدخول بنفس الـ IP
    if (superAdminIp === clientIP) {
      superAdminSocketId = socket.id;
      playerObj.isAdmin = true;
      authenticatedAdmins.add(socket.id);
      socket.emit('admin:auth_success', { isSuperAdmin: true, autoRestored: true });
      sendSystemMessage(`👑 عاد الأدمن الأساسي (${playerName}) إلى اللعبة!`);
    }

    players.set(socket.id, playerObj);

    // إرسال حالة اللعبة الحالية فوراً للاعب الجديد
    socket.emit('roomState:sync', roomState);
    socket.emit('ticker:updated', {
      text: roomState.tickerText,
      visible: roomState.tickerVisible,
      speed: roomState.tickerSpeed
    });

    updatePlayersList();
    sendSystemMessage(`انضم ${playerName} إلى اللعبة.`);
  });

  // ==========================================
  // 🔐 1. مصادقة الأدمن والأدمن الأساسي (Super Admin Logic)
  // ==========================================

  socket.on('admin:authenticate', (data, callback) => {
    const response = typeof callback === 'function' ? callback : () => {};
    const player = players.get(socket.id);
    if (!player) return response({ success: false, message: "لم يتم العثور على بيانات اللاعب." });

    if (!data || data.password !== ADMIN_PASSWORD) {
      return response({ success: false, message: "كلمة المرور غير صحيحة!" });
    }

    // الحالة الأولى: لا يوجد أدمن أساسي محدد بعد (أول شخص يدخل كلمة السر صحيحة)
    if (!superAdminSocketId) {
      superAdminSocketId = socket.id;
      superAdminIp = player.ip;
      player.isAdmin = true;
      authenticatedAdmins.add(socket.id);

      socket.emit('admin:set_super', { isSuper: true });
      sendSystemMessage(`👑 تم التعرف على (${player.name}) كـ الأدمن الأساسي للعبة!`);
      logToAudit("تعيين الأدمن الأساسي", player.name, player.name, "أول تسجيل دخول بكلمة السر");

      updatePlayersList();
      return response({ success: true, isSuper: true, message: "تم تسجيل دخولك كأدمن أساسي بنجاح." });
    }

    // إذا كان نفس الأدمن الأساسي يعيد المصادقة
    if (superAdminSocketId === socket.id || superAdminIp === player.ip) {
      superAdminSocketId = socket.id;
      player.isAdmin = true;
      authenticatedAdmins.add(socket.id);
      socket.emit('admin:set_super', { isSuper: true });
      return response({ success: true, isSuper: true });
    }

    // الحالة الثانية: الأدمن الأساسي موجود بالفعل، يلزم موافقته لدخول أي أدمن إضافي
    pendingAdminApprovals.set(socket.id, {
      socketId: socket.id,
      name: player.name,
      ip: player.ip
    });

    // إرسال طلب موافقة للأدمن الأساسي
    io.to(superAdminSocketId).emit('admin:approval_request', {
      requestId: socket.id,
      playerName: player.name,
      playerIp: player.ip
    });

    response({ pending: true, message: "تم إرسال طلب الدخول للأدمن الأساسي بانتظار الموافقة..." });
  });

  // معالجة قرار الأدمن الأساسي بشأن طلبات دخول الأدمنية الفرعيين
  socket.on('admin:resolve_approval', (data) => {
    if (socket.id !== superAdminSocketId) return; // حماية: الأدمن الأساسي فقط

    const { requestId, approve } = data;
    const targetPending = pendingAdminApprovals.get(requestId);
    if (!targetPending) return;

    const targetSocket = io.sockets.sockets.get(requestId);
    const targetPlayer = players.get(requestId);

    if (approve) {
      if (targetPlayer) {
        targetPlayer.isAdmin = true;
        authenticatedAdmins.add(requestId);
        if (targetSocket) {
          targetSocket.emit('admin:auth_success', { isSuperAdmin: false });
          targetSocket.emit('admin:set_super', { isSuper: false });
          sendSystemMessage(`🛡️ وافق الأدمن الأساسي على منح صلاحيات الأدمن للـ (${targetPlayer.name}).`);
        }
      }
      logToAudit("موافقة دخول أدمن", players.get(socket.id)?.name, targetPlayer?.name || requestId);
    } else {
      if (targetSocket) {
        targetSocket.emit('admin:auth_rejected', { message: "رفض الأدمن الأساسي دخولك إلى لوحة التحكم." });
      }
      logToAudit("رفض دخول أدمن", players.get(socket.id)?.name, targetPlayer?.name || requestId);
    }

    pendingAdminApprovals.delete(requestId);
    updatePlayersList();
  });

  // سحب صلاحية الأدمن الفرعي أو إخراجه بواسطة الأدمن الأساسي
  socket.on('admin:revoke_sub_admin', (data) => {
    if (socket.id !== superAdminSocketId) return;
    const { targetPlayerId } = data;
    
    if (targetPlayerId === superAdminSocketId) return; // لا يمكن إخراج النفس

    const targetPlayer = players.get(targetPlayerId);
    if (targetPlayer) {
      targetPlayer.isAdmin = false;
      authenticatedAdmins.delete(targetPlayerId);
      
      const targetSocket = io.sockets.sockets.get(targetPlayerId);
      if (targetSocket) {
        targetSocket.emit('admin:revoked', { message: "تم سحب صلاحيات الأدمن منك بواسطة الأدمن الأساسي." });
      }
      sendSystemMessage(`⚠️ قام الأدمن الأساسي بسحب صلاحيات الأدمن من (${targetPlayer.name}).`);
      logToAudit("سحب صلاحية أدمن", players.get(socket.id)?.name, targetPlayer.name);
      updatePlayersList();
    }
  });

  // نمط التخفي والتنكر
  socket.on('admin:toggle_stealth', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const player = players.get(socket.id);
    if (player) {
      player.hideAdminBadge = !!data.hideBadge;
      player.isHiddenFromRoom = !!data.hideFromRoom;
      updatePlayersList();
      logToAudit("تعديل نمط التخفي", player.name, "", `شارة: ${data.hideBadge}, اختفاء: ${data.hideFromRoom}`);
    }
  });

  // ==========================================
  // 👤 2. إدارة العقوبات واللاعبين (Ban, Kick, State, Whisper)
  // ==========================================

  // طرد لاعب مع تحديد السبب وإمكانية طلب الإذن
  socket.on('admin:player:kick', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const { playerId, reason, isPermanent, durationMinutes } = data;
    const target = players.get(playerId);
    const adminPlayer = players.get(socket.id);

    if (target) {
      const kickReason = (reason && reason.trim()) ? reason.trim() : "الأدمن يتحفظ بالسبب";
      const kickedUntil = isPermanent ? 'PERMANENT' : Date.now() + (durationMinutes || 5) * 60 * 1000;
      
      kickedIPs.set(target.ip, { kickedUntil, reason: kickReason });

      const targetSocket = io.sockets.sockets.get(playerId);
      if (targetSocket) {
        targetSocket.emit('player_kicked_event', {
          reason: kickReason,
          message: `تم طردك من اللعبة بواسطة الأدمن. السبب: ${kickReason}`
        });
        targetSocket.disconnect(true);
      }

      sendSystemMessage(`🚫 قام الأدمن بطرد اللاعب (${target.name}). السبب: ${kickReason}`);
      logToAudit("طرد لاعب", adminPlayer?.name, target.name, kickReason);

      players.delete(playerId);
      updatePlayersList();
    }
  });

  // حظر لاعب نهائياً أو مؤقتاً
  socket.on('admin:player:ban', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const { playerId, reason, isPermanent, durationMinutes } = data;
    const target = players.get(playerId);
    const adminPlayer = players.get(socket.id);

    if (target) {
      const banReason = (reason && reason.trim()) ? reason.trim() : "الأدمن يتحفظ بالسبب";
      const bannedUntil = isPermanent ? 'PERMANENT' : Date.now() + (durationMinutes || 10) * 60 * 1000;

      bannedIPs.set(target.ip, { bannedUntil, reason: banReason });

      const targetSocket = io.sockets.sockets.get(playerId);
      if (targetSocket) {
        targetSocket.emit('access_denied', {
          reason: 'BAN',
          message: `تم حظرك نهائياً من اللعبة. السبب: ${banReason}`
        });
        targetSocket.disconnect(true);
      }

      sendSystemMessage(`⛔ قام الأدمن بحظر اللاعب (${target.name}) من اللعبة. السبب: ${banReason}`);
      logToAudit("حظر IP", adminPlayer?.name, target.name, banReason);

      players.delete(playerId);
      updatePlayersList();
    }
  });

  // طلب إذن الدخول من قبل اللاعب المطرود أو أثناء قفل الغرفة
  socket.on('room:request_entry', (data) => {
    const clientIP = getClientIP(socket);
    const playerName = data?.name || "لاعب مطرود/منتظر";
    const requestId = socket.id;

    pendingRoomRequests.set(requestId, {
      socketId: socket.id,
      ip: clientIP,
      name: playerName
    });

    if (superAdminSocketId) {
      io.to(superAdminSocketId).emit('admin:entry_request_received', {
        requestId,
        playerName,
        ip: clientIP
      });
      socket.emit('entry_request_sent', { message: "تم إرسال طلب الدخول للأدمن الأساسي. بانتظار الرد..." });
    } else {
      socket.emit('entry_request_failed', { message: "الأدمن الأساسي غير متواجد حالياً." });
    }
  });

  // معالجة طلب إذن الدخول من قبل الأدمن الأساسي
  socket.on('admin:resolve_entry_request', (data) => {
    if (socket.id !== superAdminSocketId) return;
    const { requestId, approve, responseMessage } = data;
    const request = pendingRoomRequests.get(requestId);

    if (!request) return;

    const targetSocket = io.sockets.sockets.get(requestId);
    if (approve) {
      // إزالة من قائمة المطرودين وتأييد الدخول
      kickedIPs.delete(request.ip);
      if (targetSocket) {
        targetSocket.isAllowedByAdmin = true;
        targetSocket.emit('entry_request_approved', {
          message: responseMessage || "تم قبول طلب دخولك للغرفة من قبل الأدمن!"
        });
      }
      logToAudit("قبول طلب دخول", players.get(socket.id)?.name, request.name);
    } else {
      if (targetSocket) {
        targetSocket.emit('entry_request_rejected', {
          message: responseMessage || "تم رفض طلب دخولك للغرفة من قبل الأدمن."
        });
      }
      logToAudit("رفض طلب دخول", players.get(socket.id)?.name, request.name, responseMessage);
    }

    pendingRoomRequests.delete(requestId);
  });

  // التحكم بالحالات (كتم، تجميد، عمياء، VIP) وإمكانية إلغائها فورياً
  socket.on('admin:player:toggle_state', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const { playerId, key, stateValue } = data;
    const target = players.get(playerId);
    const adminPlayer = players.get(socket.id);

    if (target && key in target) {
      // استخدام القيمة الصريحة أو القلم القلاب (Toggle)
      target[key] = (typeof stateValue === 'boolean') ? stateValue : !target[key];

      // تأثير العمياء المباشر
      if (key === 'blinded') {
        io.to(playerId).emit('admin:effect:blind', { active: target.blinded });
      }

      // تأثير الـ VIP المباشر مع رسالة الشات النظامية
      if (key === 'isVip') {
        if (target.isVip) {
          sendSystemMessage(`🌟 منح الأدمن رتبة (VIP) للاعب (${target.name}). يستطيع الآن طلب الدخول المباشر لوحة التحكم!`);
        } else {
          sendSystemMessage(`ℹ️ تم سحب رتبة (VIP) من اللاعب (${target.name}).`);
        }
      }

      logToAudit(`تغيير حالة [${key}]`, adminPlayer?.name, target.name, `الحالة الجديدة: ${target[key]}`);
      updatePlayersList();
    }
  });

  // نظام الهمس المباشر الموجه وحصريته للأدمن الأساسي
  socket.on('admin:player:whisper', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const sender = players.get(socket.id);
    const target = players.get(data.playerId);

    if (target && data.message) {
      const msgContent = data.message.trim();
      
      // إرسال الرسالة إلى اللاعب المستهدف
      io.to(data.playerId).emit('admin:whisper_received', {
        message: msgContent,
        fromAdminName: sender ? sender.name : "الأدمن الأساسي",
        fromAdminId: socket.id
      });

      // توثيق الهمس في سجل المراقبة وتوجيهه للأدمن الأساسي فقط
      logToAudit("رسالة همس 💬", sender ? sender.name : "الأدمن", target.name, msgContent);
      
      socket.emit('admin:whisper_sent_success', {
        targetName: target.name,
        message: msgContent
      });
    }
  });

  // رد اللاعب على همس الأدمن
  socket.on('player:reply_whisper', (data) => {
    const sender = players.get(socket.id);
    if (!sender || !data.message) return;

    if (superAdminSocketId) {
      io.to(superAdminSocketId).emit('admin:whisper_reply_received', {
        fromPlayerId: socket.id,
        fromPlayerName: sender.name,
        message: data.message.trim()
      });

      logToAudit("رد على الهمس 💬", sender.name, "الأدمن الأساسي", data.message.trim());
    }
  });

  // تعديل اسم اللاعب من قبل الأدمن
  socket.on('admin:player:rename', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const target = players.get(data.playerId);
    const adminPlayer = players.get(socket.id);

    if (target && data.newName) {
      const oldName = target.name;
      target.name = data.newName.trim();
      
      sendSystemMessage(`📢 قام الأدمن بتغيير اسم اللاعب من (${oldName}) إلى (${target.name}).`);
      logToAudit("تغيير اسم لاعب", adminPlayer?.name, target.name, `الاسم السابق: ${oldName}`);
      updatePlayersList();
    }
  });

  // تعديل النقاط مع خيار الخفاء/الإظهار في الشات
  socket.on('admin:player:adjust_score', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const { playerId, points, silent } = data;
    const target = players.get(playerId);
    const adminPlayer = players.get(socket.id);

    if (target && !isNaN(points)) {
      const pointsNum = parseInt(points);
      target.score += pointsNum;

      if (!silent) {
        sendSystemMessage(`🎯 قام الأدمن بـ (${pointsNum >= 0 ? 'زيادة' : 'إنقاص'}) نقاط اللاعب (${target.name}) بمقدار [${Math.abs(pointsNum)}] نقطة.`);
      }

      logToAudit("تعديل نقاط", adminPlayer?.name, target.name, `التغيير: ${pointsNum}, النقاط الكلية: ${target.score}`);
      updatePlayersList();
    }
  });

  // ==========================================
  // 🎯 3. التحكم بالجولات والروم وإعداها المتقدمة
  // ==========================================

  // قفل / فتح الغرفة
  socket.on('admin:room:toggle_lock', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.isLocked = !roomState.isLocked;
    
    if (roomState.isLocked) {
      sendSystemMessage("🔒 قام الأدمن بقفل الغرفة. لن يستطيع أي لاعب جديد الدخول بدون إذن.");
    } else {
      sendSystemMessage("🔓 قام الأدمن بفتح الغرفة للجميع.");
    }

    io.emit('roomState:sync', roomState);
    logToAudit("تغيير قفل الغرفة", players.get(socket.id)?.name, "", roomState.isLocked ? "مغلقة" : "مفتوحة");
  });

  // كتم الشات العام وتحديد استثناء الأدمن الأساسي
  socket.on('admin:room:toggle_mute_all', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.isMutedAll = !roomState.isMutedAll;

    if (roomState.isMutedAll) {
      sendSystemMessage("🔇 قام الأدمن بكتم الشات العام. الأدمن الأساسي فقط هو من يستطيع الكتابة الآن!");
    } else {
      sendSystemMessage("🔊 تم فك الكتم العام. الجميع يستطيع التحدث الآن!");
    }

    io.emit('roomState:sync', roomState);
    logToAudit("كتم الجميع", players.get(socket.id)?.name, "", roomState.isMutedAll ? "مفعل" : "معطل");
  });

  // تجميد جميع اللاعبين
  socket.on('admin:room:toggle_freeze_all', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.isFrozenAll = !roomState.isFrozenAll;

    players.forEach((p, sId) => {
      if (sId !== superAdminSocketId) {
        p.frozen = roomState.isFrozenAll;
      }
    });

    if (roomState.isFrozenAll) {
      sendSystemMessage("❄️ قام الأدمن بتجميد جميع اللاعبين في الغرفة!");
    } else {
      sendSystemMessage("🔥 قام الأدمن بفك التجميد عن الجميع!");
    }

    updatePlayersList();
    logToAudit("تجميد الجميع", players.get(socket.id)?.name, "", roomState.isFrozenAll ? "مفعل" : "معطل");
  });

  // طرد جميع اللاعبين العاديين
  socket.on('admin:room:kick_all', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const adminPlayer = players.get(socket.id);

    players.forEach((p, sId) => {
      if (!p.isAdmin && sId !== superAdminSocketId) {
        const targetSocket = io.sockets.sockets.get(sId);
        if (targetSocket) {
          targetSocket.emit('player_kicked_event', {
            reason: 'طرد جماعي من قبل الأدمن',
            message: 'تم تطبيق طرد جماعي للغرفة من قبل الأدمن.'
          });
          targetSocket.disconnect(true);
        }
        players.delete(sId);
      }
    });

    sendSystemMessage("🧹 قام الأدمن بطرد جميع اللاعبين غير الأدمنية من الغرفة.");
    logToAudit("طرد جماعي", adminPlayer?.name, "جميع اللاعبين");
    updatePlayersList();
  });

  // إطلاق الموت المفاجئ
  socket.on('admin:room:trigger_sudden_death', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.isSuddenDeath = true;
    roomState.suddenDeathTimer = data?.timer || 30;
    roomState.suddenDeathRequiredAnswers = data?.requiredAnswers || 1;

    io.emit('game:sudden_death_started', {
      timer: roomState.suddenDeathTimer,
      required: roomState.suddenDeathRequiredAnswers
    });

    sendSystemMessage(`⚡ تم تفعيل جولة الموت المفاجئ! الوقت: [${roomState.suddenDeathTimer}] ثانية.`);
    logToAudit("تفعيل الموت المفاجئ", players.get(socket.id)?.name);
  });

  // تحديث إعدادات النقاط والفائزين
  socket.on('admin:room:update_settings', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    if (data.winningScore) roomState.winningScore = parseInt(data.winningScore);
    if (data.pointsPerAnswer) roomState.pointsPerAnswer = parseInt(data.pointsPerAnswer);
    if (data.maxCorrectAnswersPerRound) roomState.maxCorrectAnswersPerRound = parseInt(data.maxCorrectAnswersPerRound);

    io.emit('roomState:sync', roomState);
    sendSystemMessage(`⚙️ تم تحديث إعدادات الغرفة (نقاط الفوز: ${roomState.winningScore} | النقاط للإجابة: ${roomState.pointsPerAnswer} | أقصى عدد للمستجيبين: ${roomState.maxCorrectAnswersPerRound}).`);
    logToAudit("تحديث إعدادات اللعبة", players.get(socket.id)?.name);
  });

  // التحكم بشريط الأخبار العائم وسرعته
  socket.on('admin:ticker:update', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    if (typeof data.text === 'string') roomState.tickerText = data.text.trim();
    if (typeof data.visible === 'boolean') roomState.tickerVisible = data.visible;
    if (data.speed) roomState.tickerSpeed = parseInt(data.speed);

    io.emit('ticker:updated', {
      text: roomState.tickerText,
      visible: roomState.tickerVisible,
      speed: roomState.tickerSpeed
    });

    logToAudit("تحديث الشريط الإخباري", players.get(socket.id)?.name, "", `نص: ${roomState.tickerText}`);
  });

  // إرسال الإعلان المنبثق الجماعي
  socket.on('admin:broadcast:send', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    if (data && data.message) {
      io.emit('broadcast:received', {
        message: data.message.trim(),
        adminName: players.get(socket.id)?.name || "الأدمن"
      });
      logToAudit("إعلان منبثق", players.get(socket.id)?.name, "جميع اللاعبين", data.message);
    }
  });

  // ==========================================
  // 💬 الشات العام ومعالجة الإجابات
  // ==========================================
  socket.on('sendMessage', (msg) => {
    const player = players.get(socket.id);
    if (!player || player.frozen) return;

    // منع الكتم العام إلا للأدمن الأساسي
    if (roomState.isMutedAll && socket.id !== superAdminSocketId && !allowedMuteBypass.has(socket.id)) {
      return socket.emit('chatMessage', { system: true, message: "⚠️ الشات العام مكتوم حالياً من قبل الأدمن." });
    }

    if (player.muted) {
      return socket.emit('chatMessage', { system: true, message: "⚠️ أنت مكتوم من الكتابة بواسطة الأدمن." });
    }

    const message = msg ? msg.trim() : "";
    if (!message) return;

    let displayName = player.name;
    if (player.isAdmin && !player.hideAdminBadge) {
      displayName = socket.id === superAdminSocketId ? `[👑 الأدمن الأساسي] ${player.name}` : `[🛡️ أدمن] ${player.name}`;
    } else if (player.isVip) {
      displayName = `[🌟 VIP] ${player.name}`;
    }

    io.emit('chatMessage', {
      id: socket.id,
      name: displayName,
      message,
      system: false,
      isVip: player.isVip,
      isAdmin: player.isAdmin
    });
  });

  // ==========================================
  // 🚪 الانفصال (Disconnect Logic)
  // ==========================================
  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    if (player) {
      sendSystemMessage(`غادر ${player.name} اللعبة.`);
      players.delete(socket.id);
    }

    // عدم تصفير superAdminIp لنضمن التعرف الذاتي عليه فور عودته بنفس الـ IP
    if (superAdminSocketId === socket.id) {
      superAdminSocketId = null;
      sendSystemMessage("⚠️ خرج الأدمن الأساسي من اللعبة (النظام يحتفظ بصلاحياته عند عودته).");
    }

    authenticatedAdmins.delete(socket.id);
    allowedMuteBypass.delete(socket.id);
    pendingAdminApprovals.delete(socket.id);
    pendingRoomRequests.delete(socket.id);

    updatePlayersList();
  });
});

// مسار الفحص والإنعاش للسيرفر
app.get('/ping', (req, res) => res.status(200).send('Server active'));

server.listen(PORT, () => {
  console.log(`🚀 السيرفر يعمل بنجاح وكفاءة عالية على المنفذ: ${PORT}`);
});
