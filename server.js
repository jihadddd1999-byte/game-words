const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const MAX_PLAYERS = 30;
const WINNING_SCORE = 1000;
const POINTS_PER_CORRECT = 1;

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

let players = [];
let currentWord = '';
let wordTimer = null;
const typingUsers = new Set();

// ======== دوال مساعدة ========
function chooseNewWord() {
  const idx = Math.floor(Math.random() * words.length);
  currentWord = words[idx];
  io.emit('newWord', currentWord);
}

function updatePlayersList() {
  players.sort((a, b) => b.score - a.score);
  io.emit('updatePlayers', players.map(p => ({
    id: p.id,
    name: p.name,
    score: p.score,
    color: specialNamesColors[p.name] || p.color || null
  })));
}

function sendSystemMessage(message) {
  io.emit('chatMessage', { system: true, message });
}

// ======== اتصال اللاعبين ========
io.on('connection', socket => {
  if (players.length >= MAX_PLAYERS) {
    socket.emit('chatMessage', { system: true, message: 'عذراً، عدد اللاعبين وصل للحد الأقصى.' });
    socket.disconnect(true);
    return;
  }

  const newPlayer = {
    id: socket.id,
    name: `لاعب${Math.floor(Math.random() * 1000)}`,
    score: 0,
    wins: 0,
    canAnswer: true,
    color: '#00e5ff'
  };
  players.push(newPlayer);

  socket.emit('welcome', { id: socket.id });
  sendSystemMessage(`${newPlayer.name} دخل اللعبة.`);
  updatePlayersList();

  if (!currentWord) chooseNewWord();
  else {
    socket.emit('newWord', currentWord);
    socket.emit('updateScore', newPlayer.score);
  }

  // ==========================================
  //    نظام استوديو نزار المطور (الرسم المشترك)
  // ==========================================

  // 1 & 2. استقبال بيانات الرسم وتوزيعها (بخاخ، ريشة، ممحاة)
  socket.on('draw-data', (data) => {
    socket.broadcast.emit('draw-remote', data);
  });

  // 3 & 4. مسح اللوحة وتغيير الخلفية فوراً عند الجميع
  socket.on('clear-board-all', (data) => {
    // نرسل الـ data كاملة لأنها تحتوي على اللون المختار
    io.emit('clear-board-remote', data);
  });

  // 5. التراجع (Undo) وتزامن الصور من المعرض
  socket.on('load-gallery-all', (imgData) => {
    socket.broadcast.emit('load-remote', imgData);
  });

  // ميزة 6 "الوضع المنفرد" تُدار في المتصفح تلقائياً
  // ==========================================

  socket.on('setName', data => {
    if (!data || typeof data.name !== 'string') return;
    const player = players.find(p => p.id === socket.id);
    if (!player) return;

    const oldName = player.name;
    player.name = data.name.trim().substring(0, 20);

    if (specialNamesColors[player.name]) player.color = specialNamesColors[player.name];
    else if (data.color && /^#([0-9A-F]{3}){1,2}$/i.test(data.color)) player.color = data.color;
    else player.color = '#00e5ff';

    updatePlayersList();
    sendSystemMessage(`${oldName} غير اسمه إلى ${player.name}`);

    if (player.name === "كول") {
      socket.emit('chatMessage', { system: true, message: "🌸 أهلاً كول! نورتِ اللعبة، وجودك يضيف للمكان جمال 🤍" });
    }
  });

  socket.on('sendMessage', msg => {
    const player = players.find(p => p.id === socket.id);
    if (!player) return;
    const message = msg.trim();
    if (!message) return;

    io.emit('chatMessage', { name: player.name, message, system: false, color: player.color });
  });

  socket.on('typing', () => {
    const player = players.find(p => p.id === socket.id);
    if (!player) return;
    typingUsers.add(player.name);
    io.emit('typing', [...typingUsers]);
  });

  socket.on('stopTyping', () => {
    const player = players.find(p => p.id === socket.id);
    if (!player) return;
    typingUsers.delete(player.name);
    io.emit('typing', [...typingUsers]);
  });

  socket.on('submitAnswer', data => {
    const player = players.find(p => p.id === socket.id);
    if (!player || !data || typeof data.answer !== 'string') return;
    if (!player.canAnswer) return;

    const answer = data.answer.trim();
    const timeUsed = parseFloat(data.timeUsed) || 0;

    if (answer === currentWord) {
      player.score += POINTS_PER_CORRECT;
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
      socket.emit('chatMessage', { system: true, message: '❌ إجابة خاطئة، حاول مرة أخرى!' });
      player.canAnswer = true;
      socket.emit('wrongAnswer');
    }
  });

  socket.on('kickPlayer', targetId => {
    if (players.length > 0 && socket.id === players[0].id) {
      const index = players.findIndex(p => p.id === targetId);
      if (index !== -1) {
        const kicked = players.splice(index, 1)[0];
        io.to(kicked.id).emit('kicked');
        io.emit('chatMessage', { system: true, message: `${kicked.name} تم طرده من اللعبة.` });
        updatePlayersList();
        io.sockets.sockets.get(kicked.id)?.disconnect(true);
      }
    }
  });

  socket.on('disconnect', () => {
    const player = players.find(p => p.id === socket.id);
    if (player && player.name) typingUsers.delete(player.name);
    io.emit('typing', [...typingUsers]);

    const index = players.findIndex(p => p.id === socket.id);
    if (index !== -1) {
      const left = players.splice(index, 1)[0];
      sendSystemMessage(`${left.name} خرج من اللعبة.`);
      updatePlayersList();
      if (players.length === 0) {
        currentWord = '';
        if (wordTimer) { clearTimeout(wordTimer); wordTimer = null; }
      }
    }
  });
});

app.get("/ping", (req, res) => res.status(200).send("alive"));

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
                                
/* ==========================================================================
   🛡️ سيرفر لعبة الكلمات السريعة - Node.js & Socket.io (Backend Core)
   إدارة كاملة للأدمن، الغرف، مؤقتات عقوبات اللاعبين، وحظر IP الحقيقي
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

// إعدادات البيئة
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456'; // بكلمة المرور الخاصة بك

// خدمة الملفات الثابتة (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================================================
// 📊 حالة النظام والذاكرة العشوائية (In-Memory Data Structures)
// ==========================================================================

// قائمة اللاعبين النشطين
// الشكل: { id, name, score, ip, isVip, muted, frozen, blinded, autoReentry }
const players = new Map();

// جلسات الأدمن المصرح لهم (Socket IDs)
const authenticatedAdmins = new Set();

// قائمة حظر الـ IP والمؤقتات
// الشكل: { ip, bannedUntil, autoReentry }
const bannedIPs = new Map();

// قائمة طرد اللاعبين مؤقتاً
// الشكل: { ip, kickedUntil, autoReentry }
const kickedIPs = new Map();

// حالة الروم العامة
const roomState = {
  isLocked: false,
  isMutedAll: false,
  isFrozenAll: false,
  isDoubleRound: false,
  isSuddenDeath: false,
  currentWord: '',
  nextCustomWord: '',
  tickerText: 'مرحباً بكم في لعبة الكلمات السريعة!',
  tickerVisible: true
};

// مؤقتات العقوبات لفك الخظر/الكتم/التجميد تلقائياً عند انتهاء الوقت
const playerTimers = new Map();

// ==========================================================================
// 🛠️ وظائف مساعدة (Helper Functions)
// ==========================================================================

// جلب عنوان الـ IP الحقيقي للاعب
function getClientIP(socket) {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return socket.handshake.address || socket.request.connection.remoteAddress;
}

// تجهيز قائمة اللاعبين لإرسالها للأدمن
function getFormattedPlayersList() {
  const list = [];
  players.forEach((player, id) => {
    list.push({
      id: id,
      name: player.name,
      score: player.score,
      isVip: player.isVip,
      muted: player.muted,
      frozen: player.frozen,
      blinded: player.blinded
    });
  });
  return list;
}

// إشعار جميع الأدمن بالحالة الحالية
function broadcastToAdmins(eventName, data) {
  authenticatedAdmins.forEach((adminSocketId) => {
    io.to(adminSocketId).emit(eventName, data);
  });
}

// إلغاء مؤقت سابق للاعب إن وجد
function clearPlayerTimer(playerId, type) {
  const key = `${playerId}:${type}`;
  if (playerTimers.has(key)) {
    clearTimeout(playerTimers.get(key));
    playerTimers.delete(key);
  }
}

// ==========================================================================
// 🔌 الاتصالات المباشرة وشبكة Socket.io
// ==========================================================================

io.on('connection', (socket) => {
  const clientIP = getClientIP(socket);

  // 1. التحقق من حظر الـ IP قبل انضمام اللاعب
  if (bannedIPs.has(clientIP)) {
    const banInfo = bannedIPs.get(clientIP);
    if (Date.now() < banInfo.bannedUntil) {
      socket.emit('admin:notify', { type: 'error', message: 'أنت محظور من دخول هذه اللعبة!' });
      socket.disconnect(true);
      return;
    } else {
      bannedIPs.delete(clientIP); // انتهت مدة الحظر
    }
  }

  // 2. التحقق من الطرد المؤقت
  if (kickedIPs.has(clientIP)) {
    const kickInfo = kickedIPs.get(clientIP);
    if (Date.now() < kickInfo.kickedUntil) {
      socket.emit('admin:notify', { type: 'error', message: 'تم طردك مؤقتاً، يرجى الانتظار لحين انتهاء العقوبة.' });
      socket.disconnect(true);
      return;
    } else {
      kickedIPs.delete(clientIP); // انتهت مدة الطرد
    }
  }

  // 3. التحقق من قفل الروم
  if (roomState.isLocked) {
    socket.emit('admin:notify', { type: 'error', message: 'الروم مغلقة حالياً بواسطة الأدمن.' });
    socket.disconnect(true);
    return;
  }

  // إضافة اللاعب الافتراضي
  players.set(socket.id, {
    id: socket.id,
    name: `لاعب_${socket.id.substring(0, 4)}`,
    score: 0,
    ip: clientIP,
    isVip: false,
    muted: roomState.isMutedAll,
    frozen: roomState.isFrozenAll,
    blinded: false
  });

  // إرسال معلومات الشريط الإخباري للاعب الجديد
  socket.emit('ticker:updated', {
    text: roomState.tickerText,
    visible: roomState.tickerVisible
  });

  // إعلام الأدمن بتحديث قائمة اللاعبين
  broadcastToAdmins('admin:players_updated', getFormattedPlayersList());

  // ==========================================================================
  // 🔐 1. تسجيل دخول وتحقق الأدمن
  // ==========================================================================

  socket.on('admin:authenticate', (data, callback) => {
    if (data && data.password === ADMIN_PASSWORD) {
      authenticatedAdmins.add(socket.id);
      if (typeof callback === 'function') callback({ success: true });
      socket.emit('admin:players_updated', getFormattedPlayersList());
    } else {
      if (typeof callback === 'function') callback({ success: false });
    }
  });

  socket.on('admin:get_players', () => {
    if (authenticatedAdmins.has(socket.id)) {
      socket.emit('admin:players_updated', getFormattedPlayersList());
    }
  });

  // ==========================================================================
  // 👤 2. عقوبات وإجراءات اللاعبين الفردية مع المؤقتات
  // ==========================================================================

  // [1] باند IP
  socket.on('admin:player:ban', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const { playerId, duration, autoReentry } = data;
    const target = players.get(playerId);

    if (target) {
      const banDurationMs = (duration || 5) * 60 * 1000;
      const bannedUntil = Date.now() + banDurationMs;

      bannedIPs.set(target.ip, { bannedUntil, autoReentry });

      const targetSocket = io.sockets.sockets.get(playerId);
      if (targetSocket) {
        targetSocket.emit('admin:notify', { type: 'error', message: `تم حظرك لمدة ${duration} دقيقة.` });
        targetSocket.disconnect(true);
      }

      players.delete(playerId);
      broadcastToAdmins('admin:players_updated', getFormattedPlayersList());

      // مؤقت السيرفر لفك الحظر تلقائياً بعد انتهاء الدقائق
      if (autoReentry) {
        setTimeout(() => {
          bannedIPs.delete(target.ip);
        }, banDurationMs);
      }
    }
  });

  // [2] طرد مؤقت
  socket.on('admin:player:kick', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const { playerId, duration, autoReentry } = data;
    const target = players.get(playerId);

    if (target) {
      const kickDurationMs = (duration || 5) * 60 * 1000;
      kickedIPs.set(target.ip, { kickedUntil: Date.now() + kickDurationMs, autoReentry });

      const targetSocket = io.sockets.sockets.get(playerId);
      if (targetSocket) {
        targetSocket.emit('admin:notify', { type: 'error', message: 'تم طردك من الغرفة.' });
        targetSocket.disconnect(true);
      }

      players.delete(playerId);
      broadcastToAdmins('admin:players_updated', getFormattedPlayersList());

      if (autoReentry) {
        setTimeout(() => {
          kickedIPs.delete(target.ip);
        }, kickDurationMs);
      }
    }
  });

  // [3] كتم الشات
  socket.on('admin:player:toggle_mute', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const { playerId, duration } = data;
    const target = players.get(playerId);

    if (target) {
      target.muted = !target.muted;
      clearPlayerTimer(playerId, 'mute');

      if (target.muted && duration > 0) {
        const timer = setTimeout(() => {
          if (players.has(playerId)) {
            players.get(playerId).muted = false;
            broadcastToAdmins('admin:players_updated', getFormattedPlayersList());
          }
        }, duration * 60 * 1000);
        playerTimers.set(`${playerId}:mute`, timer);
      }

      broadcastToAdmins('admin:players_updated', getFormattedPlayersList());
    }
  });

  // [4] تجميد اللاعب
  socket.on('admin:player:toggle_freeze', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const { playerId, duration } = data;
    const target = players.get(playerId);

    if (target) {
      target.frozen = !target.frozen;
      clearPlayerTimer(playerId, 'freeze');

      if (target.frozen && duration > 0) {
        const timer = setTimeout(() => {
          if (players.has(playerId)) {
            players.get(playerId).frozen = false;
            broadcastToAdmins('admin:players_updated', getFormattedPlayersList());
          }
        }, duration * 60 * 1000);
        playerTimers.set(`${playerId}:freeze`, timer);
      }

      broadcastToAdmins('admin:players_updated', getFormattedPlayersList());
    }
  });

  // [5] الشاشة العمياء
  socket.on('admin:player:toggle_blind', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const { playerId, duration } = data;
    const target = players.get(playerId);

    if (target) {
      target.blinded = !target.blinded;
      io.to(playerId).emit('admin:effect:blind', { active: target.blinded });
      clearPlayerTimer(playerId, 'blind');

      if (target.blinded && duration > 0) {
        const timer = setTimeout(() => {
          if (players.has(playerId)) {
            players.get(playerId).blinded = false;
            io.to(playerId).emit('admin:effect:blind', { active: false });
            broadcastToAdmins('admin:players_updated', getFormattedPlayersList());
          }
        }, duration * 60 * 1000);
        playerTimers.set(`${playerId}:blind`, timer);
      }

      broadcastToAdmins('admin:players_updated', getFormattedPlayersList());
    }
  });

  // [6] منح / سحب VIP
  socket.on('admin:player:toggle_vip', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const target = players.get(data.playerId);
    if (target) {
      target.isVip = !target.isVip;
      broadcastToAdmins('admin:players_updated', getFormattedPlayersList());
    }
  });

  // [7] إعادة تسمية اللاعب
  socket.on('admin:player:rename', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const target = players.get(data.playerId);
    if (target && data.newName) {
      target.name = data.newName;
      broadcastToAdmins('admin:players_updated', getFormattedPlayersList());
    }
  });

  // [8] تعديل النقاط
  socket.on('admin:player:adjust_score', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const target = players.get(data.playerId);
    if (target && !isNaN(data.points)) {
      target.score += parseInt(data.points);
      broadcastToAdmins('admin:players_updated', getFormattedPlayersList());
    }
  });

  // [9] همس خاص
  socket.on('admin:player:whisper', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    io.to(data.playerId).emit('admin:notify', { type: 'whisper', message: data.message });
  });

  // ==========================================================================
  // 🎯 3. الإجراءات والتحكم الجماعي بالروم
  // ==========================================================================

  socket.on('admin:room:skip_word', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    io.emit('game:word_skipped');
  });

  socket.on('admin:room:toggle_double_round', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.isDoubleRound = !roomState.isDoubleRound;
    io.emit('game:double_round_status', { active: roomState.isDoubleRound });
  });

  socket.on('admin:room:trigger_sudden_death', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.isSuddenDeath = true;
    io.emit('game:sudden_death_started');
  });

  socket.on('admin:room:toggle_freeze_all', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.isFrozenAll = !roomState.isFrozenAll;
    players.forEach(p => p.frozen = roomState.isFrozenAll);
    broadcastToAdmins('admin:players_updated', getFormattedPlayersList());
  });

  socket.on('admin:room:toggle_mute_all', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.isMutedAll = !roomState.isMutedAll;
    players.forEach(p => p.muted = roomState.isMutedAll);
    broadcastToAdmins('admin:players_updated', getFormattedPlayersList());
  });

  socket.on('admin:room:toggle_lock', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.isLocked = !roomState.isLocked;
  });

  socket.on('admin:room:reset_scores', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    players.forEach(p => p.score = 0);
    broadcastToAdmins('admin:players_updated', getFormattedPlayersList());
  });

  socket.on('admin:room:kick_all', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    players.forEach((p, pId) => {
      if (!authenticatedAdmins.has(pId)) {
        const s = io.sockets.sockets.get(pId);
        if (s) s.disconnect(true);
      }
    });
    players.clear();
    broadcastToAdmins('admin:players_updated', getFormattedPlayersList());
  });

  // ==========================================================================
  // 📢 4. الإعلانات، الشريط الإخباري والكلمات المخصصة
  // ==========================================================================

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

  socket.on('admin:room:set_custom_word', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.nextCustomWord = data.word;
  });

  // ==========================================================================
  // 🚪 5. الانفصال وتنظيف الذاكرة
  // ==========================================================================

  socket.on('disconnect', () => {
    authenticatedAdmins.delete(socket.id);
    players.delete(socket.id);

    // تنظيف مؤقتات اللاعب عند الخروج
    clearPlayerTimer(socket.id, 'mute');
    clearPlayerTimer(socket.id, 'freeze');
    clearPlayerTimer(socket.id, 'blind');

    broadcastToAdmins('admin:players_updated', getFormattedPlayersList());
  });
});

// تشغيل السيرفر
server.listen(PORT, () => {
  console.log(`🚀 السيرفر يعمل بنجاح على المنفذ: ${PORT}`);
});
