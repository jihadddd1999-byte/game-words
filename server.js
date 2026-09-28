/* ==========================================================================
   🛡️ سيرفر لعبة الكلمات السريعة - Node.js & Socket.io (Combined Version)
   ========================================================================== */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// إعدادات البيئة والمنافذ
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';
const MAX_PLAYERS = 30;
const WINNING_SCORE = 1000;
const POINTS_PER_CORRECT = 1;

// خدمة الملفات الثابتة من مجلد public
app.use(express.static(path.join(__dirname, 'public')));

// قائمة الكلمات
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

const specialNamesColors = {
  "جهاد": "#00ffe7",
  "زيزو": "#ff3366",
  "أسامة": "#cc33ff",
  "مصطفى": "#33ff99",
  "حلا": "#ff33cc",
  "نور": "#ffff33",
};

// الذاكرة العشوائية لحالة النظام
const players = new Map();
const authenticatedAdmins = new Set();
const bannedIPs = new Map();
const kickedIPs = new Map();
const playerTimers = new Map();
const typingUsers = new Set();

let currentWord = '';
let wordTimer = null;

const roomState = {
  isLocked: false,
  isMutedAll: false,
  isFrozenAll: false,
  isDoubleRound: false,
  isSuddenDeath: false,
  nextCustomWord: '',
  tickerText: 'مرحباً بكم في لعبة الكلمات السريعة!',
  tickerVisible: true
};

// ==========================================================================
// 🛠️ الدوال المساعدة
// ==========================================================================

function chooseNewWord() {
  if (roomState.nextCustomWord) {
    currentWord = roomState.nextCustomWord;
    roomState.nextCustomWord = '';
  } else {
    const idx = Math.floor(Math.random() * words.length);
    currentWord = words[idx];
  }
  io.emit('newWord', currentWord);
}

function getClientIP(socket) {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return socket.handshake.address || socket.request.connection.remoteAddress;
}

function getFormattedPlayersList() {
  const list = [];
  players.forEach((player) => {
    list.push({
      id: player.id,
      name: player.name,
      score: player.score,
      isVip: player.isVip,
      muted: player.muted,
      frozen: player.frozen,
      blinded: player.blinded,
      color: specialNamesColors[player.name] || player.color || '#00e5ff'
    });
  });
  return list.sort((a, b) => b.score - a.score);
}

function updatePlayersList() {
  const sortedList = getFormattedPlayersList();
  io.emit('updatePlayers', sortedList);
  broadcastToAdmins('admin:players_updated', sortedList);
}

function broadcastToAdmins(eventName, data) {
  authenticatedAdmins.forEach((adminSocketId) => {
    io.to(adminSocketId).emit(eventName, data);
  });
}

function sendSystemMessage(message) {
  io.emit('chatMessage', { system: true, message });
}

function clearPlayerTimer(playerId, type) {
  const key = `${playerId}:${type}`;
  if (playerTimers.has(key)) {
    clearTimeout(playerTimers.get(key));
    playerTimers.delete(key);
  }
}

// ==========================================================================
// 🔌 الاتصال عبر Socket.io
// ==========================================================================

io.on('connection', (socket) => {
  const clientIP = getClientIP(socket);

  // 1. فحص الباند
  if (bannedIPs.has(clientIP)) {
    const banInfo = bannedIPs.get(clientIP);
    if (Date.now() < banInfo.bannedUntil) {
      socket.emit('chatMessage', { system: true, message: 'أنت محظور من دخول اللعبة حالياً.' });
      socket.disconnect(true);
      return;
    } else {
      bannedIPs.delete(clientIP);
    }
  }

  // 2. فحص الطرد المؤقت
  if (kickedIPs.has(clientIP)) {
    const kickInfo = kickedIPs.get(clientIP);
    if (Date.now() < kickInfo.kickedUntil) {
      socket.emit('chatMessage', { system: true, message: 'تم طردك مؤقتاً، يرجى الانتظار.' });
      socket.disconnect(true);
      return;
    } else {
      kickedIPs.delete(clientIP);
    }
  }

  // 3. فحص قفل الغرفة أو الحد الأقصى
  if (roomState.isLocked || players.size >= MAX_PLAYERS) {
    socket.emit('chatMessage', { system: true, message: 'الغرفة مغلقة أو مكتملة العدد.' });
    socket.disconnect(true);
    return;
  }

  // إنشاء بيانات اللاعب
  const newPlayer = {
    id: socket.id,
    name: `لاعب_${socket.id.substring(0, 4)}`,
    score: 0,
    wins: 0,
    canAnswer: true,
    color: '#00e5ff',
    ip: clientIP,
    isVip: false,
    muted: roomState.isMutedAll,
    frozen: roomState.isFrozenAll,
    blinded: false
  };

  players.set(socket.id, newPlayer);

  socket.emit('welcome', { id: socket.id });
  socket.emit('ticker:updated', { text: roomState.tickerText, visible: roomState.tickerVisible });
  sendSystemMessage(`${newPlayer.name} دخل اللعبة.`);
  updatePlayersList();

  if (!currentWord) {
    chooseNewWord();
  } else {
    socket.emit('newWord', currentWord);
    socket.emit('updateScore', newPlayer.score);
  }

  // ==========================================
  // 🎨 استوديو الرسم
  // ==========================================
  socket.on('draw-data', (data) => socket.broadcast.emit('draw-remote', data));
  socket.on('clear-board-all', (data) => io.emit('clear-board-remote', data));
  socket.on('load-gallery-all', (imgData) => socket.broadcast.emit('load-remote', imgData));

  // ==========================================
  // 💬 الشات والتفاعل
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

  socket.on('sendMessage', (msg) => {
    const player = players.get(socket.id);
    if (!player || player.muted) return;
    const message = msg.trim();
    if (!message) return;

    io.emit('chatMessage', { name: player.name, message, system: false, color: player.color });
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

    if (answer === currentWord) {
      const addedPoints = roomState.isDoubleRound ? POINTS_PER_CORRECT * 2 : POINTS_PER_CORRECT;
      player.score += addedPoints;
      socket.emit('updateScore', player.score);
      io.emit('chatMessage', { system: true, message: `✅ ${player.name} أجاب بشكل صحيح في ${timeUsed} ثانية!` });
      socket.emit('correctAnswer', { timeUsed });
      updatePlayersList();
      player.canAnswer = false;

      if (player.score >= WINNING_SCORE) {
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
   🛡️ سيرفر لعبة الكلمات السريعة - النسخة الشاملة والمصرحة
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

app.use(express.static(path.join(__dirname, 'public')));

// ==========================================================================
// 📊 الذاكرة والحالة العامة
// ==========================================================================

const players = new Map();             // جميع اللاعبين
const authenticatedAdmins = new Set();  // الأدمنا النشطين
let superAdminSocketId = null;         // أول أدمن يفعل الكلمة (صاحب السجل)

const bannedIPs = new Map();           // IP => { bannedUntil: number|'PERMANENT', autoReentry: boolean }
const kickedIPs = new Map();           // IP => { kickedUntil: number|'PERMANENT' }
const allowedMuteBypass = new Set();   // المسموح لهم بالكتابة أثناء الكتم العام

const roomState = {
  isLocked: false,
  isMutedAll: false,
  isFrozenAll: false,
  isDoubleRound: false,
  isSuddenDeath: false,
  suddenDeathTimer: 30,
  suddenDeathRequiredAnswers: 1,
  winningScore: 1000,
  pointsMode: 'first_only',             // 'first_only' أو 'all_correct'
  pointsPerAnswer: 1,
  currentWord: '',
  nextCustomWord: '',
  tickerText: 'مرحباً بكم في لعبة الكلمات السريعة!',
  tickerVisible: true
};

const words = ["قلب","رمح","عشب","صندوق","حبل","اشارة مرور","ثعلب","يضحك","قنفذ","علم","بقرة","كلب","شبح","قنبلة","نعامة","سجق","ديك","قطايف","روبوت","بطة","يمشي","ابرة","ذئب","نافذة","فرشة","صحن","بطريق","ملك","سكر","برج ايفل","مزرعة","ملفوف","روبيان","مكة","مندي","ثلج","ذبابة","طاولة","ميكانيكي","جدار","ايسكريم","سكين","ماعز","كرة سلة","بطاطا","اصبع","سروال","بصل","سلك","سائق","طماطم","كنافة","اذن","جوال","نمر","طاووس","ثور","خوخ","توصيلة","قمر","شارع","منسف","مانجو","دم","ماء","طيار","عود","باص","جزيرة","تاج","عصا","تمساح","قدم","بيض","حزين","فأس","هاتف","حوت","ظفر","قفل","ساعة","عسل","جوز الهند","كنب","عصفور","فطر","قطه","مخدة","شاورما","توت","مسطرة","فراولة","هدهد","قرد","زهرة","ذرة","مكتب","دولاب","فيش","فشار","سماء","يسبح","فيل","تنين","شريط","ذهب","الارض","بروكلي","غيوم","شوكولاته","برجر","فلوس","وحيد القرن","فانوس","سنجاب","ملعقة","خريطة","صرصور","منديل","كاتشب","مصاصة","دب قطبي","نيزك","رمان","عقرب","حمار","تلفاز","حفرة","نار","حقيبة","كرة قدم","درع","دب","بقلاوة","اناناس","سرير","زيتون","غوريلا","سلم","شاحنة","مسجد","بركان","قوس","شطرنج","عامل نظافة","غسالة","منشار","باب","دمية","جاموس","عائلة","ليل","حذاء","زرافة","طابعة","نمل","خيار","شوربة","ستارة","كيس","ريموت","دباسة","سلطعون","باذنجان","مزهرية","سيف","مكتبة","ورقة","فستان","مشمش","كوب","كشري","سلحفاة","حليب","مجرة","نسر","غواصة","خشب","نظارة","افوكادو","قارب","بيانو","مسرح","شنب","اسنان","انف","مروحة","قهوة","فقمة","حديقة","بلياردو","ساعة رملية","نهر","فول","فلاشة","مصباح","لسان","سيارة","قلم رصاص","سمكة","كوكيز","طائرة","ضفدع","كاميرا","تمر","شراب","عين","كوالا","زر","بامية","ضبع","غراب","خبز","مسمار","موية","نخلة","كرز","بيتزا","شوكة","دكتور","مرآة","مايك","طريق","مغني","غابة","جبل","هيكل عظمي","بحر","مظلة","كبة","لاعب","خس","برج خليفة","جزر","وسادة","خيمة","خياط","سبانخ","رقص","دجاج","صيدلي","اطفائي","كبسة","كيبورد","سجاده","محفظة","خنزير","عنب","شاشة","قاضي","شجرة","شاي","نعال","نجوم","فراخ","فلفل","نحلة","شامبو","خفاش","كنز","قوس قزح","اخطبوط","محاسب","كتاب","طباخ","برق","غزال","خاتم","عظم","فطيرة","دفتر","ببغاء","جمل","برتقال","حمار وحشي","زبالة","الماس","غرفة","ستيك","حلاوة","نقانق","دودة","ملعب","ممثل","زيت","مدرسة","الكعبة","مكياج","بسكوت","سمبوسة","شاحن","جبن","شمام","مذيع","صحراء","فرشاة","حمام","بومة","موز","صبار","وحش","جاكيت","جوافة","بطارية","شمعة","ليمون","جوهرة","معدة","شاطئ","باندا","دونات","فراشة","ارنب","اسد","سفينة","عصير","ولاعة","مكرونة","ثوب","قدر","تبولة","بطيخ","سوشي","صاروخ","جالس","سماعة","شرطي","مكيف","قطة","مقلوبة","مقص","دجاج مشوي","فرس النهر","طبل","يركض","مكنسة","حاجب","اعصار","كوخ","مطر","فهد","قبعة","ثعبان","رسام","حمص","يد","عنكبوت","برياني","سحلية","لحم","وردة","مطعم","جرس","سبورة","بطن","قارورة","سينما","مهندس","عطر","ورق عنب","معلم","ممرضة","كريب","قطار","كباب","طفل","شلال","سلطة","مشط","خلاط","نوم","شتاء","ثلاجة","كهربائي","كأس","جامعة","برج","تفاح","جمجمة","كرسي","بطاطس","كيك","صابون","هرم","ساعة يد","كوكب","لابتوب","شنطة","عمارة","بيت","ديناصور","فرن","رز","مفتاح","رموش","جوارب","مدينة","قلم","سلة","حصان","زومبي","نجمة","علبة","مطبخ","فاصوليا","كمبيوتر","ملوخية","قميص","مرحاض","فم","صقر"];

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
    // إخفاء اللاعب كلياً إذا كان متخفياً بالكامل
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
      isVip: p.isVip,
      muted: p.muted,
      frozen: p.frozen,
      blinded: p.blinded,
      canDraw: p.canDraw,
      isAdmin: p.isAdmin,
      hideAdminBadge: p.hideAdminBadge,
      isHiddenFromRoom: p.isHiddenFromRoom,
      color: p.color
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

  // 1. فحص حظر الـ IP
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

  // 3. فحص قفل الروم
  if (roomState.isLocked) {
    socket.emit('chatMessage', { system: true, message: 'الروم مغلقة حالياً بواسطة الأدمن.' });
    socket.disconnect(true);
    return;
  }

  // إنشاء بيانات اللاعب الجديد
  const newPlayer = {
    id: socket.id,
    name: `لاعب_${socket.id.substring(0, 4)}`,
    score: 0,
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

  if (!roomState.currentWord) chooseNewWord();
  else socket.emit('newWord', roomState.currentWord);

  updatePlayersList();

  // ==========================================
  // 🔐 1. مصادقة الأدمن والتخفي
  // ==========================================
  socket.on('admin:authenticate', (data, callback) => {
    if (data && data.password === ADMIN_PASSWORD) {
      const player = players.get(socket.id);
      if (player) player.isAdmin = true;

      authenticatedAdmins.add(socket.id);

      // تحديد الأدمن الأساسي الأول صاحب سجل المراقبة
      if (!superAdminSocketId) {
        superAdminSocketId = socket.id;
        socket.emit('admin:set_super', { isSuper: true });
      } else if (superAdminSocketId === socket.id) {
        socket.emit('admin:set_super', { isSuper: true });
      } else {
        socket.emit('admin:set_super', { isSuper: false });
      }

      if (typeof callback === 'function') callback({ success: true });
      updatePlayersList();
    } else {
      if (typeof callback === 'function') callback({ success: false });
    }
  });

  // زر التخفي (إخفاء الرتبة أو إخفاء التواجد كلياً)
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
  // 👤 2. العقوبات الفردية
  // ==========================================

  // باند IP (مؤقت أو دائم)
  socket.on('admin:player:ban', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const { playerId, isPermanent, durationMinutes } = data;
    const target = players.get(playerId);

    if (target) {
      const bannedUntil = isPermanent ? 'PERMANENT' : Date.now() + (durationMinutes || 5) * 60 * 1000;
      bannedIPs.set(target.ip, { bannedUntil });

      const targetSocket = io.sockets.sockets.get(playerId);
      if (targetSocket) {
        targetSocket.emit('chatMessage', { system: true, message: 'تم حظرك من اللعبة.' });
        targetSocket.disconnect(true);
      }
      players.delete(playerId);
      updatePlayersList();
      io.emit('admin:banned_list_updated', Array.from(bannedIPs.entries()));
    }
  });

  // فك الباند أونلاين
  socket.on('admin:unban_ip', (ip) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    bannedIPs.delete(ip);
    io.emit('admin:banned_list_updated', Array.from(bannedIPs.entries()));
  });

  // طرد مؤقت أو دائم
  socket.on('admin:player:kick', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const { playerId, isPermanent, durationMinutes } = data;
    const target = players.get(playerId);

    if (target) {
      const kickedUntil = isPermanent ? 'PERMANENT' : Date.now() + (durationMinutes || 5) * 60 * 1000;
      kickedIPs.set(target.ip, { kickedUntil });

      const targetSocket = io.sockets.sockets.get(playerId);
      if (targetSocket) {
        targetSocket.emit('chatMessage', { system: true, message: 'تم طردك من الروم.' });
        targetSocket.disconnect(true);
      }
      players.delete(playerId);
      updatePlayersList();
      io.emit('admin:kicked_list_updated', Array.from(kickedIPs.entries()));
    }
  });

  // فك الطرد
  socket.on('admin:unkick_ip', (ip) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    kickedIPs.delete(ip);
    io.emit('admin:kicked_list_updated', Array.from(kickedIPs.entries()));
  });

  // أزرار التبديل الفردية (كتم، تجميد، عمياء، VIP، رسم)
  socket.on('admin:player:toggle_state', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const { playerId, key } = data; // key: 'muted' | 'frozen' | 'blinded' | 'isVip' | 'canDraw'
    const target = players.get(playerId);

    if (target && key in target) {
      target[key] = !target[key];

      if (key === 'blinded') {
        io.to(playerId).emit('admin:effect:blind', { active: target.blinded });
      }
      updatePlayersList();
    }
  });

  // تغيير اسم لاعب وإرسال الإشعار
  socket.on('admin:player:rename', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const target = players.get(data.playerId);
    if (target && data.newName) {
      const oldName = target.name;
      target.name = data.newName.trim();
      io.emit('chatMessage', {
        system: true,
        message: `📢 أدمن اللعبة غير اسم (${oldName}) إلى (${target.name})`
      });
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

  // تحذير اللاعب (Shake & Alert)
  socket.on('admin:player:warn', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    io.to(data.playerId).emit('admin:warn_effect', { message: data.message || 'تحذير من الأدمن!' });
  });

  // الهمس الخاص وتسجيله في سجل المراقبة
  socket.on('admin:player:whisper', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const sender = players.get(socket.id);
    const target = players.get(data.playerId);

    if (target) {
      io.to(data.playerId).emit('admin:whisper_received', {
        message: data.message,
        from: sender ? sender.name : 'الأدمن'
      });
      logToAudit(data.message, sender ? sender.name : 'الأدمن', target.name);
    }
  });

  // ==========================================
  // 🎯 3. التحكم بالجولات والشات العام
  // ==========================================

  // كتم الشات العام وتحديد الاستثناءات
  socket.on('admin:room:toggle_mute_all', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.isMutedAll = !roomState.isMutedAll;
    io.emit('roomState:sync', roomState);
  });

  socket.on('admin:room:allow_mute_bypass', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    if (data.allow) allowedMuteBypass.add(data.playerId);
    else allowedMuteBypass.delete(data.playerId);
  });

  // جولة مضاعفة
  socket.on('admin:room:toggle_double_round', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.isDoubleRound = !roomState.isDoubleRound;
    io.emit('roomState:sync', roomState);
  });

  // جولة الموت المفاجئ
  socket.on('admin:room:trigger_sudden_death', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.isSuddenDeath = true;
    roomState.suddenDeathTimer = data.timer || 30;
    roomState.suddenDeathRequiredAnswers = data.requiredAnswers || 1;
    io.emit('game:sudden_death_started', {
      timer: roomState.suddenDeathTimer,
      required: roomState.suddenDeathRequiredAnswers
    });
  });

  // إعدادات اللعبة (هدف الفوز ونظام النقاط)
  socket.on('admin:room:update_settings', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    if (data.winningScore) roomState.winningScore = parseInt(data.winningScore);
    if (data.pointsMode) roomState.pointsMode = data.pointsMode;
    if (data.pointsPerAnswer) roomState.pointsPerAnswer = parseInt(data.pointsPerAnswer);
    io.emit('roomState:sync', roomState);
  });

  // تصفير النقاط
  socket.on('admin:room:reset_scores', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    players.forEach(p => p.score = 0);
    updatePlayersList();
  });

  // قفل الروم
  socket.on('admin:room:toggle_lock', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.isLocked = !roomState.isLocked;
    io.emit('roomState:sync', roomState);
  });

  // الإعلانات العامة والشريط
  socket.on('admin:broadcast:send', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    io.emit('broadcast:received', { message: data.message });
  });

  socket.on('admin:ticker:update', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.tickerText = data.text;
    roomState.tickerVisible = data.visible;
    io.emit('ticker:updated', { text: roomState.tickerText, visible: roomState.tickerVisible });
  });

  // ==========================================
  // 💬 الشات العادي
  // ==========================================
  socket.on('sendMessage', (msg) => {
    const player = players.get(socket.id);
    if (!player || player.frozen) return;

    // فحص الكتم العام والفردي والاستثناءات
    if (roomState.isMutedAll && !player.isAdmin && !allowedMuteBypass.has(socket.id)) return;
    if (player.muted) return;

    const message = msg.trim();
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
    if (superAdminSocketId === socket.id) {
      superAdminSocketId = null; // إعادة تعيين الأدمن الأول عند الخروج
    }
    authenticatedAdmins.delete(socket.id);
    players.delete(socket.id);
    allowedMuteBypass.delete(socket.id);
    updatePlayersList();
  });
});

server.listen(PORT, () => console.log(`🚀 السيرفر الشامل يعمل بنجاح على المنفذ: ${PORT}`));
