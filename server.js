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

/* ==========================================================================
   🎮 لعبة الكلمات السريعة - Server Logic (server.js)
   شامل نظام الأدمن، العقوبات الحية، الاستئذان، والإعلانات
   ========================================================================== */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// ==========================================
// 📦 حالات البيانات وقواعد السيرفر (State)
// ==========================================
const players = new Map();             // socket.id => playerData
const authenticatedAdmins = new Set();  // socket.id
const allowedMuteBypass = new Set();   // socket.id
const bannedIPs = new Map();           // IP => { bannedUntil, autoReentry }
const kickedIPs = new Map();           // IP => { kickedUntil, autoReentry }
const pendingJoinRequests = new Map(); // requestId => { socketId, name, ip }

let superAdminSocketId = null;
let wordTimer = null;
const typingUsers = new Set();

// حالة الغرفة الموحدة
const roomState = {
  currentWord: '',
  nextCustomWord: '',
  isMutedAll: false,
  isLocked: false,
  isDoubleRound: false,
  isSuddenDeath: false,
  suddenDeathTimer: 30,
  suddenDeathRequiredAnswers: 1,
  winningScore: 1000,
  pointsMode: 'standard',
  pointsPerAnswer: 10,
  notifyPointChanges: true,
  tickerText: '',
  tickerVisible: false
};

// ==========================================
// 🛠️ دوال مساعدة للسيرفر
// ==========================================
function getClientIp(socket) {
  return socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
}

function updatePlayersList() {
  const playersData = Array.from(players.entries())
    .filter(([_, p]) => !p.isHiddenFromRoom)
    .map(([id, p]) => ({
      id,
      name: p.name,
      score: p.score || 0,
      isVip: !!p.isVip,
      muted: !!p.muted,
      frozen: !!p.frozen,
      blinded: !!p.blinded,
      isAdmin: !!p.isAdmin,
      hideAdminBadge: !!p.hideAdminBadge
    }));

  io.emit('admin:players_updated', playersData);
  io.emit('playersList', playersData);
}

function sendSystemMessage(message) {
  io.emit('chatMessage', { system: true, message });
}

function logToAudit(message, sender = 'النظام', target = 'الكل') {
  const auditData = { message, sender, target, timestamp: new Date() };
  authenticatedAdmins.forEach(adminId => {
    io.to(adminId).emit('admin:notify', {
      type: 'audit',
      message: `[${sender} -> ${target}]: ${message}`
    });
  });
}

function chooseNewWord() {
  if (roomState.nextCustomWord) {
    roomState.currentWord = roomState.nextCustomWord;
    roomState.nextCustomWord = '';
  } else {
    const defaultWords = ['برمجية', 'تحدي', 'سرعة', 'حاسوب', 'شابكة', 'تطوير'];
    roomState.currentWord = defaultWords[Math.floor(Math.random() * defaultWords.length)];
  }
  io.emit('game:new_word', { word: roomState.currentWord, isDouble: roomState.isDoubleRound });
}

// ==========================================
// 🔌 الاتصال والمعالجات الأساسية
// ==========================================
io.on('connection', (socket) => {
  const clientIp = getClientIp(socket);

  // 1️⃣ التحقق من العقوبات النشطة (Bans / Kicks)
  const now = Date.now();

  if (bannedIPs.has(clientIp)) {
    const banInfo = bannedIPs.get(clientIp);
    if (banInfo.bannedUntil === 'PERMANENT' || banInfo.bannedUntil > now) {
      socket.emit('chatMessage', { system: true, message: 'أنت محظور من دخول اللعبة حالياً.' });
      socket.disconnect(true);
      return;
    } else {
      bannedIPs.delete(clientIp); // انتهاء العقوبة التلقائية
    }
  }

  if (kickedIPs.has(clientIp)) {
    const kickInfo = kickedIPs.get(clientIp);
    if (kickInfo.kickedUntil === 'PERMANENT' || kickInfo.kickedUntil > now) {
      socket.emit('chatMessage', { system: true, message: 'تم طردك مؤقتاً ولم تنتهِ فترة الانتظار بعد.' });
      socket.disconnect(true);
      return;
    } else {
      kickedIPs.delete(clientIp);
    }
  }

  // 2️⃣ التحقق من قفل الغرفة واستئذان الدخول
  if (roomState.isLocked) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    pendingJoinRequests.set(requestId, { socketId: socket.id, ip: clientIp });

    // تنبيه الأدمن بطلب انضمام جديد
    authenticatedAdmins.forEach(adminId => {
      io.to(adminId).emit('admin:join_request', {
        requestId,
        ip: clientIp,
        name: 'زائر جديد'
      });
    });
  }

  // تسجيل اللاعب المبدئي
  players.set(socket.id, {
    ip: clientIp,
    name: `لاعب_${socket.id.substring(0, 4)}`,
    score: 0,
    muted: false,
    frozen: false,
    blinded: false,
    isVip: false,
    isAdmin: false,
    hideAdminBadge: false,
    isHiddenFromRoom: false
  });

  // مزامنة حالة الروم مع العميل الجديد
  socket.emit('roomState:sync', roomState);
  if (roomState.tickerText) {
    socket.emit('ticker:updated', { text: roomState.tickerText, visible: roomState.tickerVisible });
  }

  // ==========================================
  // 🔐 1. مصادقة الأدمن والتخفي
  // ==========================================
  socket.on('admin:authenticate', (data, callback) => {
    if (data && data.password === ADMIN_PASSWORD) {
      const player = players.get(socket.id);
      if (player) player.isAdmin = true;

      authenticatedAdmins.add(socket.id);

      if (!superAdminSocketId) {
        superAdminSocketId = socket.id;
        socket.emit('admin:set_super', { isSuper: true });
      } else {
        socket.emit('admin:set_super', { isSuper: superAdminSocketId === socket.id });
      }

      if (typeof callback === 'function') callback({ success: true });
      updatePlayersList();

      // إرسال قوائم العقوبات الحالية للأدمن
      socket.emit('admin:punishment_lists', {
        banned: Array.from(bannedIPs.entries()).map(([ip, val]) => ({ ip, ...val })),
        kicked: Array.from(kickedIPs.entries()).map(([ip, val]) => ({ ip, ...val }))
      });
    } else {
      if (typeof callback === 'function') callback({ success: false });
    }
  });

  socket.on('admin:get_players', () => {
    if (authenticatedAdmins.has(socket.id)) updatePlayersList();
  });

  socket.on('admin:toggle_stealth', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const player = players.get(socket.id);
    if (player) {
      player.hideAdminBadge = !!data.hideBadge;
      player.isHiddenFromRoom = !!data.hideFromRoom;
      updatePlayersList();
    }
  });

  // ==========================================
  // 👤 2. العقوبات وإدارة اللاعبين
  // ==========================================

  // باند IP
  socket.on('admin:player:ban', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const { playerId, isPermanent, duration, durationMinutes, autoReentry } = data;
    const target = players.get(playerId);
    const mins = duration || durationMinutes || 5;

    if (target) {
      const bannedUntil = isPermanent ? 'PERMANENT' : Date.now() + mins * 60 * 1000;
      bannedIPs.set(target.ip, { bannedUntil, autoReentry: !!autoReentry, name: target.name });

      const targetSocket = io.sockets.sockets.get(playerId);
      if (targetSocket) {
        targetSocket.emit('chatMessage', { system: true, message: 'تم حظرك من اللعبة بواسطة الأدمن.' });
        targetSocket.disconnect(true);
      }
      players.delete(playerId);
      updatePlayersList();
      broadcastPunishmentLists();
    }
  });

  socket.on('admin:unban_ip', (ip) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    bannedIPs.delete(ip);
    broadcastPunishmentLists();
  });

  // طرد
  socket.on('admin:player:kick', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const { playerId, isPermanent, duration, durationMinutes, autoReentry } = data;
    const target = players.get(playerId);
    const mins = duration || durationMinutes || 5;

    if (target) {
      const kickedUntil = isPermanent ? 'PERMANENT' : Date.now() + mins * 60 * 1000;
      kickedIPs.set(target.ip, { kickedUntil, autoReentry: !!autoReentry, name: target.name });

      const targetSocket = io.sockets.sockets.get(playerId);
      if (targetSocket) {
        targetSocket.emit('chatMessage', { system: true, message: 'تم طردك من الروم.' });
        targetSocket.disconnect(true);
      }
      players.delete(playerId);
      updatePlayersList();
      broadcastPunishmentLists();
    }
  });

  socket.on('admin:unkick_ip', (ip) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    kickedIPs.delete(ip);
    broadcastPunishmentLists();
  });

  // كتم فردي
  socket.on('admin:player:toggle_mute', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const target = players.get(data.playerId);
    if (target) {
      target.muted = !target.muted;
      updatePlayersList();
    }
  });

  // تجميد فردي
  socket.on('admin:player:toggle_freeze', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const target = players.get(data.playerId);
    if (target) {
      target.frozen = !target.frozen;
      updatePlayersList();
    }
  });

  // تعتيم / شاشة عمياء
  socket.on('admin:player:toggle_blind', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const target = players.get(data.playerId);
    if (target) {
      target.blinded = !target.blinded;
      io.to(data.playerId).emit('admin:effect:blind', { active: target.blinded });
      updatePlayersList();
    }
  });

  // تبديل VIP
  socket.on('admin:player:toggle_vip', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const target = players.get(data.playerId);
    if (target) {
      target.isVip = !target.isVip;
      updatePlayersList();
    }
  });

  // تغيير الاسم
  socket.on('admin:player:rename', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const target = players.get(data.playerId);
    if (target && data.newName) {
      const oldName = target.name;
      target.name = data.newName.trim();
      sendSystemMessage(`📢 تغيير اسم (${oldName}) إلى (${target.name}) بواسطة الأدمن`);
      updatePlayersList();
    }
  });

  // تعديل النقاط
  socket.on('admin:player:adjust_score', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const target = players.get(data.playerId);
    if (target && !isNaN(data.points)) {
      target.score += parseInt(data.points);
      updatePlayersList();
    }
  });

  // همس خاص
  socket.on('admin:player:whisper', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const sender = players.get(socket.id);
    const target = players.get(data.playerId);

    if (target) {
      io.to(data.playerId).emit('admin:notify', {
        type: 'whisper',
        message: data.message,
        from: sender ? sender.name : 'الأدمن'
      });
      logToAudit(data.message, sender ? sender.name : 'الأدمن', target.name);
    }
  });

  // معالجة طلب الاستئذان بالدخول
  socket.on('admin:handle_join_request', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const { requestId, approve } = data;
    const reqInfo = pendingJoinRequests.get(requestId);

    if (reqInfo) {
      io.to(reqInfo.socketId).emit('joinPermissionResponse', {
        approved: approve,
        message: approve ? 'تم قبول طلبك!' : 'تم رفض طلب انضمامك للروم.'
      });
      pendingJoinRequests.delete(requestId);
    }
  });

  // ==========================================
  // 🎯 3. التحكم بالجولات والروم
  // ==========================================
  socket.on('admin:room:skip_word', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    chooseNewWord();
  });

  socket.on('admin:room:set_custom_word', (data) => {
    if (!authenticatedAdmins.has(socket.id) || !data || !data.word) return;
    roomState.nextCustomWord = data.word.trim();
  });

  socket.on('admin:room:toggle_mute_all', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.isMutedAll = !roomState.isMutedAll;
    io.emit('roomState:sync', roomState);
  });

  socket.on('admin:room:toggle_freeze_all', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    players.forEach(p => { if (!p.isAdmin) p.frozen = !p.frozen; });
    updatePlayersList();
  });

  socket.on('admin:room:toggle_double_round', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.isDoubleRound = !roomState.isDoubleRound;
    io.emit('roomState:sync', roomState);
  });

  socket.on('admin:room:trigger_sudden_death', (data = {}) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.isSuddenDeath = true;
    roomState.suddenDeathTimer = data.timer || 30;
    roomState.suddenDeathRequiredAnswers = data.requiredAnswers || 1;
    io.emit('game:sudden_death_started', {
      timer: roomState.suddenDeathTimer,
      required: roomState.suddenDeathRequiredAnswers
    });
  });

  socket.on('admin:room:reset_scores', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    players.forEach(p => p.score = 0);
    updatePlayersList();
  });

  socket.on('admin:room:kick_all', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    players.forEach((player, pId) => {
      if (!player.isAdmin) {
        const targetSocket = io.sockets.sockets.get(pId);
        if (targetSocket) {
          targetSocket.emit('chatMessage', { system: true, message: 'تم إخلاء الغرفة بقرار من الأدمن.' });
          targetSocket.disconnect(true);
        }
        players.delete(pId);
      }
    });
    updatePlayersList();
  });

  socket.on('admin:room:toggle_lock', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.isLocked = !roomState.isLocked;
    io.emit('roomState:sync', roomState);
  });

  // الإعلانات والشريط الإخباري
  socket.on('admin:broadcast:send', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    io.emit('broadcast:received', { message: data.message });
  });

  socket.on('admin:ticker:update_text', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.tickerText = data.text;
    io.emit('ticker:updated', { text: roomState.tickerText, visible: roomState.tickerVisible });
  });

  socket.on('admin:ticker:toggle_visibility', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.tickerVisible = !roomState.tickerVisible;
    io.emit('ticker:updated', { text: roomState.tickerText, visible: roomState.tickerVisible });
  });

  // ==========================================
  // 💬 الشات العادي والمعالجة
  // ==========================================
  socket.on('sendMessage', (msg) => {
    const player = players.get(socket.id);
    if (!player || player.frozen) return;

    if (roomState.isMutedAll && !player.isAdmin && !allowedMuteBypass.has(socket.id)) return;
    if (player.muted) return;

    const message = typeof msg === 'string' ? msg.trim() : '';
    if (!message) return;

    let displayName = player.name;
    if (player.isAdmin && !player.hideAdminBadge) {
      displayName = `[الأدمن] ${player.name}`;
    }

    io.emit('chatMessage', { name: displayName, message, system: false, color: player.color });
  });

  // ==========================================
  // 🚪 الانفصال
  // ==========================================
  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    if (player) {
      typingUsers.delete(player.name);
      io.emit('typing', [...typingUsers]);
      sendSystemMessage(`${player.name} خرج من اللعبة.`);
      players.delete(socket.id);
    }

    if (superAdminSocketId === socket.id) {
      superAdminSocketId = null;
    }
    authenticatedAdmins.delete(socket.id);
    allowedMuteBypass.delete(socket.id);
    updatePlayersList();

    if (players.size === 0) {
      roomState.currentWord = '';
      if (wordTimer) {
        clearTimeout(wordTimer);
        wordTimer = null;
      }
    }
  });
});

function broadcastPunishmentLists() {
  const banned = Array.from(bannedIPs.entries()).map(([ip, val]) => ({ ip, ...val }));
  const kicked = Array.from(kickedIPs.entries()).map(([ip, val]) => ({ ip, ...val }));

  authenticatedAdmins.forEach(adminId => {
    io.to(adminId).emit('admin:punishment_lists', { banned, kicked });
  });
}

app.get('/ping', (req, res) => res.status(200).send('alive'));

server.listen(PORT, () => console.log(`🚀 Server running successfully on port: ${PORT}`));

   
