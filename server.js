/* ==========================================================================
   🛡️ سيرفر لعبة الكلمات السريعة - النسخة الكاملة الشاملة والمنقحة
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

const specialNamesColors = {
  "جهاد": "#00ffe7",
  "زيزو": "#ff3366",
  "أسامة": "#cc33ff",
  "مصطفى": "#33ff99",
  "حلا": "#ff33cc",
  "نور": "#ffff33"
};

const players = new Map();             
const authenticatedAdmins = new Set();  
let superAdminSocketId = null;         

const bannedIPs = new Map();           
const kickedIPs = new Map();           
const allowedMuteBypass = new Set();   
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
  pointsPerAnswer: 1,
  currentWord: '',
  nextCustomWord: '',
  tickerText: 'مرحباً بكم في لعبة الكلمات السريعة!',
  tickerVisible: true,
  notifyPointChanges: true
};

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
      canChatWhenMuted: allowedMuteBypass.has(p.id),
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

function broadcastPunishmentLists() {
  const bannedArray = Array.from(bannedIPs.entries()).map(([ip, val]) => ({ ip, ...val }));
  const kickedArray = Array.from(kickedIPs.entries()).map(([ip, val]) => ({ ip, ...val }));
  authenticatedAdmins.forEach(adminId => {
    io.to(adminId).emit('admin:punishment_lists', { banned: bannedArray, kicked: kickedArray });
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

io.on('connection', (socket) => {
  const clientIP = getClientIP(socket);

  if (bannedIPs.has(clientIP)) {
    const banData = bannedIPs.get(clientIP);
    if (banData.bannedUntil === 'PERMANENT' || Date.now() < banData.bannedUntil) {
      socket.emit('accessDenied', { reason: 'banned', message: 'أنت محظور من دخول اللعبة.' });
      socket.disconnect(true);
      return;
    } else bannedIPs.delete(clientIP);
  }

  if (kickedIPs.has(clientIP)) {
    const kickData = kickedIPs.get(clientIP);
    if (kickData.kickedUntil === 'PERMANENT' || Date.now() < kickData.kickedUntil) {
      socket.emit('accessDenied', { reason: 'kicked', message: 'أنت مطرود حالياً من الروم.' });
      socket.disconnect(true);
      return;
    } else kickedIPs.delete(clientIP);
  }

  if (roomState.isLocked) {
    socket.emit('accessDenied', { reason: 'locked', message: 'الأدمن أغلق الروم. يمكنك طلب إذن بالدخول.' });
    
    socket.on('requestJoinPermission', (data) => {
      const requestId = socket.id;
      const playerName = data && data.name ? data.name.trim() : `زائر_${socket.id.substring(0, 4)}`;
      pendingJoinRequests.set(requestId, { socket, name: playerName, ip: clientIP });
      
      authenticatedAdmins.forEach(adminId => {
        io.to(adminId).emit('admin:join_request', { requestId, name: playerName, ip: clientIP });
      });
    });
    return;
  }

  // إنشاء بيانات لاعب بدون اسم افتراضي لتجنب اليوزرات المزدوجة
  const newPlayer = {
    id: socket.id,
    name: '',
    score: 0,
    wins: 0,
    canAnswer: true,
    ip: clientIP,
    isVip: false,
    muted: false,
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
  else {
    socket.emit('newWord', roomState.currentWord);
    socket.emit('updateScore', newPlayer.score);
  }

  socket.on('draw-data', (data) => {
    const player = players.get(socket.id);
    if (player && player.canDraw) socket.broadcast.emit('draw-remote', data);
  });

  socket.on('clear-board-all', (data) => {
    const player = players.get(socket.id);
    if (player && player.canDraw) io.emit('clear-board-remote', data);
  });

  socket.on('load-gallery-all', (imgData) => {
    const player = players.get(socket.id);
    if (player && player.canDraw) socket.broadcast.emit('load-remote', imgData);
  });

  // تعيين الاسم وتحديث القائمة بدون إنشاء يوزر شبح إضافي
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
    } else player.color = '#00e5ff';

    updatePlayersList();
    if (oldName) {
      sendSystemMessage(`${oldName} غير اسمه إلى ${player.name}`);
    }
  });

  socket.on('typing', () => {
    const player = players.get(socket.id);
    if (!player || !player.name) return;
    typingUsers.add(player.name);
    io.emit('typing', [...typingUsers]);
  });

  socket.on('stopTyping', () => {
    const player = players.get(socket.id);
    if (!player || !player.name) return;
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
      io.emit('chatMessage', { system: true, message: `✅ ${player.name || 'لاعب'} أجاب بشكل صحيح في ${timeUsed} ثانية!` });
      socket.emit('correctAnswer', { timeUsed });
      updatePlayersList();

      if (roomState.pointsMode === 'first_only') player.canAnswer = false;

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

  socket.on('admin:authenticate', (data, callback) => {
    if (data && data.password === ADMIN_PASSWORD) {
      const player = players.get(socket.id);
      if (player) player.isAdmin = true;

      authenticatedAdmins.add(socket.id);

      if (!superAdminSocketId) {
        superAdminSocketId = socket.id;
        socket.emit('admin:set_super', { isSuper: true });
      } else socket.emit('admin:set_super', { isSuper: superAdminSocketId === socket.id });

      if (typeof callback === 'function') callback({ success: true });
      updatePlayersList();
      broadcastPunishmentLists();
      socket.emit('roomState:sync', roomState);
    } else if (typeof callback === 'function') callback({ success: false });
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

  socket.on('admin:handle_join_request', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const { requestId, approve } = data;
    const req = pendingJoinRequests.get(requestId);
    if (req) {
      if (approve) {
        req.socket.emit('joinPermissionResponse', { approved: true });
      } else {
        req.socket.emit('joinPermissionResponse', { approved: false, message: 'تم رفض طلب دخولك إلى الغرفة.' });
      }
      pendingJoinRequests.delete(requestId);
    }
  });

  socket.on('admin:player:ban', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const { playerId, isPermanent, durationMinutes } = data;
    const target = players.get(playerId);

    if (target) {
      const bannedUntil = isPermanent ? 'PERMANENT' : Date.now() + (durationMinutes || 5) * 60 * 1000;
      bannedIPs.set(target.ip, { bannedUntil, name: target.name });

      const targetSocket = io.sockets.sockets.get(playerId);
      if (targetSocket) {
        targetSocket.emit('accessDenied', { reason: 'banned', message: 'تم حظرك من اللعبة.' });
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

  socket.on('admin:player:kick', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const { playerId, isPermanent, durationMinutes } = data;
    const target = players.get(playerId);

    if (target) {
      const kickedUntil = isPermanent ? 'PERMANENT' : Date.now() + (durationMinutes || 5) * 60 * 1000;
      kickedIPs.set(target.ip, { kickedUntil, name: target.name });

      const targetSocket = io.sockets.sockets.get(playerId);
      if (targetSocket) {
        targetSocket.emit('accessDenied', { reason: 'kicked', message: 'تم طردك من الروم.' });
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

  socket.on('admin:player:toggle_state', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const { playerId, key } = data;
    const target = players.get(playerId);

    if (target && key in target) {
      target[key] = !target[key];
      if (key === 'blinded') io.to(playerId).emit('admin:effect:blind', { active: target.blinded });
      updatePlayersList();
    }
  });

  socket.on('admin:player:rename', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const target = players.get(data.playerId);
    if (target && data.newName) {
      const oldName = target.name;
      target.name = data.newName.trim();
      sendSystemMessage(`📢 الأدمن غير اسم (${oldName}) إلى (${target.name})`);
      updatePlayersList();
    }
  });

  socket.on('admin:player:adjust_score', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const target = players.get(data.playerId);
    if (target && !isNaN(data.points)) {
      const oldPoints = target.score;
      target.score += parseInt(data.points);
      
      if (roomState.notifyPointChanges) {
        sendSystemMessage(`📢 الأدمن غير نقاط (${target.name}) من (${oldPoints}) إلى (${target.score})`);
      }
      
      io.to(target.id).emit('updateScore', target.score);
      updatePlayersList();
    }
  });

  // نظام الهمس المباشر والخاص
  socket.on('admin:player:whisper', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    const sender = players.get(socket.id);
    const target = players.get(data.playerId);

    if (target) {
      io.to(data.playerId).emit('whisperReceived', {
        from: sender && sender.name ? sender.name : 'الأدمن',
        message: data.message
      });
      socket.emit('chatMessage', { system: true, message: `💬 تم إرسال الهمس إلى (${target.name}) بنجاح.` });
      logToAudit(data.message, sender ? sender.name : 'الأدمن', target.name);
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

  socket.on('admin:room:toggle_mute_all', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.isMutedAll = !roomState.isMutedAll;
    
    if (roomState.isMutedAll) sendSystemMessage('📢 الأدمن أغلق الشات ليلقي كلمة.');
    else sendSystemMessage('📢 الأدمن فتح الشات للجميع.');
    
    io.emit('roomState:sync', roomState);
  });

  socket.on('admin:room:allow_mute_bypass', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    if (data.allow) allowedMuteBypass.add(data.playerId);
    else allowedMuteBypass.delete(data.playerId);
    updatePlayersList();
  });

  socket.on('admin:room:toggle_double_round', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.isDoubleRound = !roomState.isDoubleRound;
    io.emit('roomState:sync', roomState);
  });

  socket.on('admin:room:toggle_lock', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.isLocked = !roomState.isLocked;
    io.emit('roomState:sync', roomState);
  });

  socket.on('admin:room:toggle_notify_points', () => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.notifyPointChanges = !roomState.notifyPointChanges;
    io.emit('roomState:sync', roomState);
  });

  socket.on('admin:ticker:update', (data) => {
    if (!authenticatedAdmins.has(socket.id)) return;
    roomState.tickerText = data.text;
    roomState.tickerVisible = data.visible;
    io.emit('ticker:updated', { text: roomState.tickerText, visible: roomState.tickerVisible });
  });

  socket.on('sendMessage', (msg) => {
    const player = players.get(socket.id);
    if (!player || player.frozen) return;

    if (roomState.isMutedAll && !player.isAdmin && !allowedMuteBypass.has(socket.id)) return;
    if (player.muted) return;

    const message = msg.trim();
    if (!message) return;

    let displayName = player.name || 'لاعب';
    if (player.isAdmin && !player.hideAdminBadge) {
      displayName = `[الأدمن] ${displayName}`;
    }

    io.emit('chatMessage', { name: displayName, message, system: false, color: player.color });
  });

  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    if (player) {
      if (player.name) {
        typingUsers.delete(player.name);
        io.emit('typing', [...typingUsers]);
        sendSystemMessage(`${player.name} خرج من اللعبة.`);
      }
      players.delete(socket.id);
    }

    if (superAdminSocketId === socket.id) superAdminSocketId = null;
    authenticatedAdmins.delete(socket.id);
    allowedMuteBypass.delete(socket.id);
    pendingJoinRequests.delete(socket.id);
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

app.get('/ping', (req, res) => res.status(200).send('alive'));

server.listen(PORT, () => console.log(`🚀 Server running on port: ${PORT}`));
