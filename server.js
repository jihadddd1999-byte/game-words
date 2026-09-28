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

  // ==========================================
  // 🔐 أوامر الأدمن
  // ==========================================
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

  socket.on('admin:player:ban', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const { playerId, duration, autoReentry } = data;
    const target = players.get(playerId);

    if (target) {
      const banDurationMs = (duration || 5) * 60 * 1000;
      bannedIPs.set(target.ip, { bannedUntil: Date.now() + banDurationMs, autoReentry });

      const targetSocket = io.sockets.sockets.get(playerId);
      if (targetSocket) {
        targetSocket.emit('chatMessage', { system: true, message: `تم حظرك لمدة ${duration} دقيقة.` });
        targetSocket.disconnect(true);
      }

      players.delete(playerId);
      updatePlayersList();

      if (autoReentry) {
        setTimeout(() => bannedIPs.delete(target.ip), banDurationMs);
      }
    }
  });

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
            updatePlayersList();
          }
        }, duration * 60 * 1000);
        playerTimers.set(`${playerId}:mute`, timer);
      }
      updatePlayersList();
    }
  });

  socket.on('admin:room:skip_word', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    chooseNewWord();
  });

  socket.on('admin:room:set_custom_word', (data) => {
    if (!authenticatedAdmins.has(socket.id) || !data || !data.word) return;
    roomState.nextCustomWord = data.word.trim();
  });

  socket.on('admin:ticker:update_text', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.tickerText = data.text;
    io.emit('ticker:updated', { text: roomState.tickerText, visible: roomState.tickerVisible });
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

    authenticatedAdmins.delete(socket.id);
    clearPlayerTimer(socket.id, 'mute');
    clearPlayerTimer(socket.id, 'freeze');
    clearPlayerTimer(socket.id, 'blind');

    updatePlayersList();

    if (players.size === 0) {
      currentWord = '';
      if (wordTimer) {
        clearTimeout(wordTimer);
        wordTimer = null;
      }
    }
  });
});

app.get('/ping', (req, res) => res.status(200).send('alive'));

server.listen(PORT, () => console.log(`🚀 הסيرفر يعمل بنجاح على المنفذ: ${PORT}`));
