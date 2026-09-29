/* ==========================================================================
   🛡️ سيرفر لعبة الكلمات السريعة - النسخة المحدثة والمعدلة بالكامل
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
const pendingJoinRequests = new Map(); 
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
  pointsPerAnswer: 10,
  currentWord: '',
  nextCustomWord: '',
  tickerText: 'مرحباً بكم في لعبة الكلمات السريعة!',
  tickerSpeed: 15,
  tickerVisible: true
};

// ==========================================================================
// 🛠️ الدوال المساعدة
// ==========================================================================

function getClientIP(socket) {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return socket.handshake.address || (socket.request && socket.request.connection ? socket.request.connection.remoteAddress : '');
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
  io.emit('game:new_word', { word: roomState.currentWord, isDouble: roomState.isDoubleRound });
}

function getFormattedPlayersList(forAdmin = false) {
  const list = [];
  players.forEach((p) => {
    // حل مشكلة ظهور اليوزر التلقائي: لا يظهر اللاعب في القائمة للجميع إلا إذا قام بإدخال اسم صريح
    if (!p.isNamed) return; 
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
      wins: p.wins || 0,
      isVip: !!p.isVip,
      muted: !!p.muted,
      frozen: !!p.frozen,
      blinded: !!p.blinded,
      canDraw: p.canDraw !== undefined ? p.canDraw : true,
      isAdmin: !!p.isAdmin,
      isSuperAdmin: p.id === superAdminSocketId,
      hideAdminBadge: !!p.hideAdminBadge,
      isHiddenFromRoom: !!p.isHiddenFromRoom,
      color: specialNamesColors[p.name] || p.color || '#00e5ff'
    });
  });
  return list.sort((a, b) => b.score - a.score);
}

function updatePlayersList() {
  const publicList = getFormattedPlayersList(false);
  io.emit('updatePlayers', publicList);
  io.emit('playersList', publicList);

  authenticatedAdmins.forEach(adminId => {
    io.to(adminId).emit('admin:players_updated', getFormattedPlayersList(true));
  });
}

function sendSystemMessage(message) {
  io.emit('chatMessage', { system: true, message });
}

function logToAudit(message, sender = 'النظام', target = 'الكل') {
  authenticatedAdmins.forEach(adminId => {
    io.to(adminId).emit('admin:notify', {
      type: 'audit',
      message: `[${sender} ➔ ${target}]: ${message}`
    });
  });
  if (superAdminSocketId) {
    io.to(superAdminSocketId).emit('admin:audit_log', {
      timestamp: new Date().toLocaleTimeString('ar-EG'),
      from: sender,
      to: target,
      message
    });
  }
}

function broadcastPunishmentLists() {
  const banned = Array.from(bannedIPs.entries()).map(([ip, val]) => ({ ip, ...val }));
  const kicked = Array.from(kickedIPs.entries()).map(([ip, val]) => ({ ip, ...val }));

  authenticatedAdmins.forEach(adminId => {
    io.to(adminId).emit('admin:punishment_lists', { banned, kicked });
  });
}

// ==========================================================================
// 🔌 الاتصال عبر Socket.io
// ==========================================================================

io.on('connection', (socket) => {
  const clientIP = getClientIP(socket);
  const now = Date.now();

  // 1. فحص الباند
  if (bannedIPs.has(clientIP)) {
    const banData = bannedIPs.get(clientIP);
    if (banData.bannedUntil === 'PERMANENT' || now < banData.bannedUntil) {
      socket.emit('accessDenied', { reason: 'banned', message: `أنت محظور من اللعبة. السبب: ${banData.reason || 'بدون سبب'}` });
      socket.disconnect(true);
      return;
    } else {
      bannedIPs.delete(clientIP);
    }
  }

  // 2. فحص الطرد ونظام الاستئذان
  if (kickedIPs.has(clientIP)) {
    const kickData = kickedIPs.get(clientIP);
    if (kickData.kickedUntil === 'PERMANENT' || now < kickData.kickedUntil) {
      socket.emit('accessDenied', { 
        reason: 'kicked', 
        message: `تم طردك من الروم. السبب: ${kickData.reason || 'بدون سبب'}`,
        canRequestPermission: true
      });
      
      socket.on('requestJoinPermission', (data) => {
        const requestId = `req_kick_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        pendingJoinRequests.set(requestId, { socketId: socket.id, ip: clientIP, name: data.name || 'لاعب مطرود' });
        
        if (superAdminSocketId) {
          io.to(superAdminSocketId).emit('admin:join_request', {
            requestId,
            ip: clientIP,
            name: data.name || 'لاعب مطرود',
            type: 'kicked'
          });
        }
      });
      return;
    } else {
      kickedIPs.delete(clientIP);
    }
  }

  // 3. فحص قفل الغرفة
  if (roomState.isLocked) {
    socket.emit('accessDenied', { 
      reason: 'room_locked', 
      message: 'الغرفة مغلقة حالياً بقرار من الأدمن.',
      canRequestPermission: true
    });

    socket.on('requestJoinPermission', (data) => {
      const requestId = `req_lock_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      pendingJoinRequests.set(requestId, { socketId: socket.id, ip: clientIP, name: data.name || 'زائر' });

      if (superAdminSocketId) {
        io.to(superAdminSocketId).emit('admin:join_request', {
          requestId,
          ip: clientIP,
          name: data.name || 'زائر',
          type: 'room_locked'
        });
      }
    });
    return;
  }

  if (players.size >= MAX_PLAYERS) {
    socket.emit('accessDenied', { reason: 'full', message: 'الغرفة مكتملة العدد حالياً.' });
    socket.disconnect(true);
    return;
  }

  // لاعب جديد (isNamed: false لمنع ظهوره تلقائياً في قائمة المتصدرين)
  const newPlayer = {
    id: socket.id,
    ip: clientIP,
    name: '',
    isNamed: false,
    score: 0,
    wins: 0,
    canAnswer: true,
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
  socket.emit('ticker:updated', { text: roomState.tickerText, speed: roomState.tickerSpeed, visible: roomState.tickerVisible });
  socket.emit('roomState:sync', roomState);

  if (!roomState.currentWord) chooseNewWord();
  else {
    socket.emit('newWord', roomState.currentWord);
    socket.emit('updateScore', newPlayer.score);
  }

  // ==========================================
  // 🔐 إدارة الأدمن والتشفير والأدمن الأساسي
  // ==========================================
  socket.on('admin:authenticate', (data, callback) => {
    if (data && data.password === ADMIN_PASSWORD) {
      const player = players.get(socket.id);
      if (player) player.isAdmin = true;

      authenticatedAdmins.add(socket.id);

      // تعيين الأدمن الأساسي الأول
      let isFirstSuper = false;
      if (!superAdminSocketId) {
        superAdminSocketId = socket.id;
        isFirstSuper = true;
        sendSystemMessage(`👑 ترحيب خاص بالأدمن الأساسي (${player ? player.name : 'الأدمن'})!`);
      }

      socket.emit('admin:set_super', { isSuper: socket.id === superAdminSocketId });

      if (typeof callback === 'function') callback({ success: true, isSuper: socket.id === superAdminSocketId });
      updatePlayersList();
      broadcastPunishmentLists();
      
      logToAudit('تسجيل دخول بصلاحيات الأدمن', player ? player.name : 'أدمن');
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
  // 💬 الشات وتسمية اللاعبين
  // ==========================================
  socket.on('setName', (data) => {
    if (!data || typeof data.name !== 'string') return;
    const player = players.get(socket.id);
    if (!player) return;

    const oldName = player.name;
    player.name = data.name.trim().substring(0, 20);
    player.isNamed = true; // الآن يتم إظهاره في قائمة اللاعبين المتصدرين

    if (specialNamesColors[player.name]) {
      player.color = specialNamesColors[player.name];
    } else if (data.color && /^#([0-9A-F]{3}){1,2}$/i.test(data.color)) {
      player.color = data.color;
    } else {
      player.color = '#00e5ff';
    }

    updatePlayersList();
    if (oldName) {
      sendSystemMessage(`${oldName} غير اسمه إلى ${player.name}`);
      logToAudit(`تغيير الاسم من ${oldName} إلى ${player.name}`, player.name);
    } else {
      sendSystemMessage(`${player.name} دخل اللعبة.`);
    }
  });

  socket.on('typing', () => {
    const player = players.get(socket.id);
    if (!player || !player.isNamed) return;
    typingUsers.add(player.name);
    io.emit('typing', [...typingUsers]);
  });

  socket.on('stopTyping', () => {
    const player = players.get(socket.id);
    if (!player || !player.isNamed) return;
    typingUsers.delete(player.name);
    io.emit('typing', [...typingUsers]);
  });

  socket.on('sendMessage', (msg) => {
    const player = players.get(socket.id);
    if (!player || player.frozen) return;

    // استثناء الأدمن الأساسي من الكتم العام
    const isSuperAdmin = socket.id === superAdminSocketId;
    if (roomState.isMutedAll && !isSuperAdmin) return;
    if (player.muted && !isSuperAdmin) return;

    const message = typeof msg === 'string' ? msg.trim() : '';
    if (!message) return;

    let displayName = player.name;
    if (player.isAdmin && !player.hideAdminBadge) {
      displayName = `[الأدمن] ${player.name}`;
    }

    io.emit('chatMessage', { name: displayName, message, system: false, color: player.color });
  });

  // ==========================================
  // 🤫 نظام الهمس المباشر والرد
  // ==========================================
  socket.on('admin:player:whisper', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const sender = players.get(socket.id);
    const target = players.get(data.playerId);

    if (target) {
      io.to(data.playerId).emit('whisper:received', {
        fromId: socket.id,
        fromName: sender ? sender.name : 'الأدمن',
        message: data.message
      });
      
      logToAudit(`همس إلى [${target.name}]: "${data.message}"`, sender ? sender.name : 'الأدمن', target.name);
    }
  });

  socket.on('player:whisper:reply', (data) => {
    const sender = players.get(socket.id);
    const target = players.get(data.targetId);

    if (sender && target) {
      io.to(data.targetId).emit('whisper:received', {
        fromId: socket.id,
        fromName: sender.name,
        message: data.message
      });

      logToAudit(`رد همس إلى [${target.name}]: "${data.message}"`, sender.name, target.name);
    }
  });

  // ==========================================
  // 🎮 نظام الإجابات واللعبة
  // ==========================================
  socket.on('submitAnswer', (data) => {
    const player = players.get(socket.id);
    if (!player || !data || typeof data.answer !== 'string' || !player.canAnswer || player.frozen) return;

    const answer = data.answer.trim();
    const timeUsed = parseFloat(data.timeUsed) || 0;

    if (answer === roomState.currentWord) {
      const basePoints = roomState.pointsPerAnswer || 10;
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
        player.wins = (player.wins || 0) + 1;
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
  // 👤 العقوبات الفردية (الطرد والمنع مع السبب)
  // ==========================================
  socket.on('admin:player:kick', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const { playerId, isPermanent, durationMinutes, reason } = data;
    const target = players.get(playerId);
    const admin = players.get(socket.id);
    const mins = durationMinutes || 5;

    if (target) {
      const kickedUntil = isPermanent ? 'PERMANENT' : Date.now() + mins * 60 * 1000;
      const kickReason = reason || 'بدون سبب محدد';
      
      kickedIPs.set(target.ip, { kickedUntil, reason: kickReason, name: target.name });

      sendSystemMessage(`🚪 تم طرد اللاعب (${target.name}) من قبل الأدمن. السبب: ${kickReason}`);
      logToAudit(`طرد اللاعب [${target.name}] - السبب: ${kickReason}`, admin ? admin.name : 'الأدمن', target.name);

      const targetSocket = io.sockets.sockets.get(playerId);
      if (targetSocket) {
        targetSocket.emit('accessDenied', {
          reason: 'kicked',
          message: `تم طردك من الروم. السبب: ${kickReason}`,
          canRequestPermission: true
        });
        targetSocket.disconnect(true);
      }
      players.delete(playerId);
      updatePlayersList();
      broadcastPunishmentLists();
    }
  });

  socket.on('admin:player:ban', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const { playerId, isPermanent, durationMinutes, reason } = data;
    const target = players.get(playerId);
    const admin = players.get(socket.id);
    const mins = durationMinutes || 5;

    if (target) {
      const bannedUntil = isPermanent ? 'PERMANENT' : Date.now() + mins * 60 * 1000;
      const banReason = reason || 'بدون سبب محدد';

      bannedIPs.set(target.ip, { bannedUntil, reason: banReason, name: target.name });

      sendSystemMessage(`🔨 تم حظر اللاعب (${target.name}) نهائياً/مؤقتاً. السبب: ${banReason}`);
      logToAudit(`حظر اللاعب [${target.name}] - السبب: ${banReason}`, admin ? admin.name : 'الأدمن', target.name);

      const targetSocket = io.sockets.sockets.get(playerId);
      if (targetSocket) {
        targetSocket.emit('accessDenied', {
          reason: 'banned',
          message: `أنت محظور من دخول اللعبة. السبب: ${banReason}`
        });
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
    logToAudit(`إلغاء طرد الـ IP: ${ip}`);
  });

  socket.on('admin:unban_ip', (ip) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    bannedIPs.delete(ip);
    broadcastPunishmentLists();
    logToAudit(`إلغاء حظر الـ IP: ${ip}`);
  });

  // ==========================================
  // ⚡ العقوبات المباشرة (كتم، تجميد، عمياء، VIP)
  // ==========================================
  socket.on('admin:player:toggle_mute', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const target = players.get(data.playerId);
    if (target) {
      target.muted = data.state !== undefined ? data.state : !target.muted;
      io.to(data.playerId).emit('admin:effect:mute', { active: target.muted });
      updatePlayersList();
      logToAudit(`${target.muted ? 'كتم' : 'إلغاء كتم'} اللاعب`, 'الأدمن', target.name);
    }
  });

  socket.on('admin:player:toggle_freeze', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const target = players.get(data.playerId);
    if (target) {
      target.frozen = data.state !== undefined ? data.state : !target.frozen;
      io.to(data.playerId).emit('admin:effect:freeze', { active: target.frozen });
      updatePlayersList();
      logToAudit(`${target.frozen ? 'تجميد' : 'إلغاء تجميد'} اللاعب`, 'الأدمن', target.name);
    }
  });

  socket.on('admin:player:toggle_blind', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const target = players.get(data.playerId);
    if (target) {
      target.blinded = data.state !== undefined ? data.state : !target.blinded;
      io.to(data.playerId).emit('admin:effect:blind', { active: target.blinded });
      updatePlayersList();
      logToAudit(`${target.blinded ? 'تفعيل الوضع العمياء على' : 'إلغاء الوضع العمياء عن'} اللاعب`, 'الأدمن', target.name);
    }
  });

  socket.on('admin:player:toggle_vip', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const target = players.get(data.playerId);
    if (target) {
      target.isVip = data.state !== undefined ? data.state : !target.isVip;
      updatePlayersList();
      logToAudit(`${target.isVip ? 'منح شارة VIP لـ' : 'سحب شارة VIP من'} اللاعب`, 'الأدمن', target.name);
    }
  });

  // ==========================================
  // ⚙️ التحكم بالروم والأحداث العامة
  // ==========================================
  socket.on('admin:room:toggle_mute_all', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.isMutedAll = !roomState.isMutedAll;
    io.emit('roomState:sync', roomState);
    sendSystemMessage(roomState.isMutedAll ? '🔒 تم كتم الشات العام عن الجميع.' : '🔓 تم فتح الشات العام للجميع.');
    logToAudit(`${roomState.isMutedAll ? 'تفعيل' : 'إلغاء'} كتم الجميع`);
  });

  socket.on('admin:room:toggle_freeze_all', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.isFrozenAll = !roomState.isFrozenAll;
    players.forEach((p, pId) => {
      if (pId !== superAdminSocketId) {
        p.frozen = roomState.isFrozenAll;
        io.to(pId).emit('admin:effect:freeze', { active: p.frozen });
      }
    });
    updatePlayersList();
    sendSystemMessage(roomState.isFrozenAll ? '❄️ تم تجميد جميع اللاعبين.' : '🔥 تم إلغاء تجميد الجميع.');
    logToAudit(`${roomState.isFrozenAll ? 'تفعيل' : 'إلغاء'} تجميد الجميع`);
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
    sendSystemMessage('💀 بدأ طور الموت المفاجئ الآن!');
    logToAudit('تفعيل طور الموت المفاجئ');
  });

  socket.on('admin:room:toggle_lock', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.isLocked = !roomState.isLocked;
    io.emit('roomState:sync', roomState);
    sendSystemMessage(roomState.isLocked ? '🔒 تم قفل الغرفة.' : '🔓 تم فتح الغرفة لدخول الجميع.');
    logToAudit(`${roomState.isLocked ? 'قفل' : 'فتح'} الغرفة`);
  });

  socket.on('admin:handle_join_request', (data) => {
    if (socket.id !== superAdminSocketId) return; // الأدمن الأساسي فقط يوافق
    const { requestId, approve } = data;
    const reqInfo = pendingJoinRequests.get(requestId);

    if (reqInfo) {
      if (approve) {
        // فك الطرد المؤقت إذا كان مطروداً وافق عليه الأدمن
        kickedIPs.delete(reqInfo.ip);
        io.to(reqInfo.socketId).emit('joinPermissionApproved');
      } else {
        io.to(reqInfo.socketId).emit('accessDenied', {
          reason: 'rejected',
          message: 'تم رفض طلب انضمامك من قبل الأدمن الأساسي.'
        });
      }
      pendingJoinRequests.delete(requestId);
    }
  });

  // ==========================================
  // 📰 التحكم بالشريط الإخباري المتحرك
  // ==========================================
  socket.on('admin:ticker:update', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    if (data.text !== undefined) roomState.tickerText = data.text;
    if (data.speed !== undefined) roomState.tickerSpeed = parseInt(data.speed) || 15;
    if (data.visible !== undefined) roomState.tickerVisible = !!data.visible;

    io.emit('ticker:updated', {
      text: roomState.tickerText,
      speed: roomState.tickerSpeed,
      visible: roomState.tickerVisible
    });
    logToAudit('تحديث بيانات الشريط الإخباري');
  });

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

  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    if (player) {
      if (player.isNamed) {
        typingUsers.delete(player.name);
        io.emit('typing', [...typingUsers]);
        sendSystemMessage(`${player.name} خرج من اللعبة.`);
      }
      players.delete(socket.id);
    }

    if (superAdminSocketId === socket.id) {
      superAdminSocketId = null;
      sendSystemMessage('⚠️ شغر منصب الأدمن الأساسي.');
    }
    authenticatedAdmins.delete(socket.id);
    updatePlayersList();
  });
});

app.get('/ping', (req, res) => res.status(200).send('alive'));

server.listen(PORT, () => console.log(`🚀 Server running successfully on port: ${PORT}`));
