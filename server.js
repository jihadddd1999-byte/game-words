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
   ⚙️ محرك سيرفر الأدمن والحفظ الدائم (Admin Server Controller)
   ========================================================================== */

const fs = require('fs');
const path = require('path');

// 🔑 كلمة السر للتحقق من صلاحيات الأدمن
const ADMIN_PASSWORD_SERVERSIDE = "20018151070792005932";

// 📁 مسار ملف الحفظ التلقائي على السيرفر
const SETTINGS_FILE_PATH = path.join(__dirname, 'admin-settings.json');

// 1️⃣ الحالة العامة للإعدادات القابلة للحفظ
let adminData = {
  winScore: 100,
  pointSystem: 'speed', // 'speed', 'fixed', 'draw'
  isRoomLocked: false,
  isGlobalMute: false,
  tickerText: "أهلاً بكم في لعبة الكلمات السريعة!",
  isTickerVisible: true,
  modes: {
    reverseWord: false,
    blurMode: false,
    missingLetter: false,
    reverseInput: false
  },
  bannedIPs: [] // قائمة عناوين الـ IP المحظورة دائماً
};

// 2️⃣ قائمة بحالات اللاعبين الميدانية (كتم، منع رسم، عمياء، VIP)
let activePlayerStates = new Map(); // socketId -> { isMuted, isDrawLocked, isBlind, isVip, tempName }

// 3️⃣ دوال قراءة وحفظ البيانات من وإلى ملف JSON
function loadAdminSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const rawData = fs.readFileSync(SETTINGS_FILE_PATH, 'utf8');
      adminData = { ...adminData, ...JSON.parse(rawData) };
      console.log('✅ [Admin] تم تحميل إعدادات الأدمن والحظر المحفوظة.');
    }
  } catch (err) {
    console.error('❌ [Admin] خطأ في قراءة ملف admin-settings.json:', err);
  }
}

function saveAdminSettings() {
  try {
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(adminData, null, 2), 'utf8');
  } catch (err) {
    console.error('❌ [Admin] خطأ في حفظ الإعدادات على القرص:', err);
  }
}

// قراءة الإعدادات فور تشغيل السيرفر
loadAdminSettings();

// 4️⃣ فحص حظر الـ IP والقفل العام قبل إتمام اتصال اللاعب باللعبة
io.use((socket, next) => {
  const clientIP = socket.handshake.address;

  // فحص الحظر الدائم
  if (adminData.bannedIPs.includes(clientIP)) {
    return next(new Error("banned"));
  }

  // فحص قفل الروم أمام الانضمام الجديد
  if (adminData.isRoomLocked) {
    return next(new Error("room_locked"));
  }

  next();
});

// 5️⃣ دالة مساعدة لضمان حماية أوامر الأدمن
function verifyAdmin(pass) {
  return pass === ADMIN_PASSWORD_SERVERSIDE;
}

// 6️⃣ الاستماع لأحداث الأدمن عند الاتصال بالـ Socket
io.on('connection', (socket) => {
  const clientIP = socket.handshake.address;

  // تهيئة كائن حالة اللاعب
  activePlayerStates.set(socket.id, {
    isMuted: false,
    isDrawLocked: false,
    isBlind: false,
    isVip: false,
    ip: clientIP
  });

  // 📊 طلب تحديث بيانات اللوحة من الأدمن
  socket.on('admin_get_stats', (data) => {
    if (!verifyAdmin(data.adminPassword)) return;

    const allSockets = Array.from(io.sockets.sockets.values());
    const playersList = allSockets.map(s => {
      const state = activePlayerStates.get(s.id) || {};
      return {
        socketId: s.id,
        name: s.username || state.tempName || "لاعب جديد",
        score: s.score || 0,
        isVip: state.isVip || false,
        ip: s.handshake.address
      };
    });

    const bannedListFormatted = adminData.bannedIPs.map(ip => ({ ip, name: `IP (${ip})` }));

    socket.emit('admin_stats_response', {
      onlineCount: io.engine.clientsCount || playersList.length,
      avgSpeed: 2.5, // قيمة تقريبية للمتوسط
      totalAnswers: global.totalAnswersCounter || 0,
      activePlayer: global.currentDrawerName || "لا يوجد",
      players: playersList,
      bannedList: bannedListFormatted,
      settings: adminData
    });
  });

  // ❌ / ⏳ / 🔇 / 🔒 إجراءات التحكم الفردي باللاعبين
  socket.on('admin_player_action', (data) => {
    if (!verifyAdmin(data.adminPassword)) return;

    const targetSocket = io.sockets.sockets.get(data.targetSocketId);
    const playerState = activePlayerStates.get(data.targetSocketId) || {};

    switch (data.actionType) {
      case 'ban': // حظر دائم بالـ IP
        if (targetSocket) {
          const targetIP = targetSocket.handshake.address;
          if (!adminData.bannedIPs.includes(targetIP)) {
            adminData.bannedIPs.push(targetIP);
            saveAdminSettings(); // 👈 حفظ دائم في الملف
          }
          targetSocket.emit('kicked_event', { reason: 'تم حظرك بشكل دائم من قبل الأدمن.' });
          targetSocket.disconnect(true);
        }
        break;

      case 'tempban': // طرد فقط (Kick)
        if (targetSocket) {
          targetSocket.emit('kicked_event', { reason: 'تم طردك من الروم بواسطة الأدمن.' });
          targetSocket.disconnect(true);
        }
        break;

      case 'mute': // كتم الشات عن اللاعب
        playerState.isMuted = !playerState.isMuted;
        activePlayerStates.set(data.targetSocketId, playerState);
        if (targetSocket) {
          targetSocket.emit('system_message', {
            text: playerState.isMuted ? "🔇 تم كتم الشات عنك بواسطة الأدمن." : "🔊 تم إلغاء الكتم عنك."
          });
        }
        break;

      case 'drawlock': // منع من الرسم
        playerState.isDrawLocked = !playerState.isDrawLocked;
        activePlayerStates.set(data.targetSocketId, playerState);
        if (targetSocket) {
          targetSocket.emit('system_message', {
            text: playerState.isDrawLocked ? "🔒 تم منعك من الرسم." : "🔓 تم السماح لك بالرسم مجدداً."
          });
        }
        break;

      case 'blind': // وضع الشاشة العمياء
        playerState.isBlind = !playerState.isBlind;
        activePlayerStates.set(data.targetSocketId, playerState);
        if (targetSocket) {
          targetSocket.emit('toggle_blind_mode', { enabled: playerState.isBlind });
        }
        break;

      case 'vip': // منح شارة VIP
        playerState.isVip = !playerState.isVip;
        activePlayerStates.set(data.targetSocketId, playerState);
        io.emit('update_players_list');
        break;

      case 'warn': // إرسال تحذير
        if (targetSocket) {
          targetSocket.emit('receive_broadcast', { message: "⚠️ تحذير رسمي من الأدمن: يُرجى الالتزام بالقوانين!" });
        }
        break;

      case 'reset_score': // تصفير النقاط
        if (targetSocket) {
          targetSocket.score = 0;
          io.emit('update_players_list');
        }
        break;
    }
  });

  // ✖️ إلغاء حظر الـ IP
  socket.on('admin_unban_player', (data) => {
    if (!verifyAdmin(data.adminPassword)) return;

    adminData.bannedIPs = adminData.bannedIPs.filter(ip => ip !== data.ip);
    saveAdminSettings(); // 👈 حفظ وتحديث الملف فوراً
  });

  // ✏️ تغيير اسم لاعب
  socket.on('admin_change_player_name', (data) => {
    if (!verifyAdmin(data.adminPassword)) return;

    const targetSocket = io.sockets.sockets.get(data.targetSocketId);
    if (targetSocket && data.newName) {
      targetSocket.username = data.newName;
      io.emit('update_players_list');
    }
  });

  // ➕ / ➖ تعديل نقاط لاعب
  socket.on('admin_adjust_player_points', (data) => {
    if (!verifyAdmin(data.adminPassword)) return;

    const targetSocket = io.sockets.sockets.get(data.targetSocketId);
    if (targetSocket) {
      targetSocket.score = (targetSocket.score || 0) + (data.pointsDelta || 0);
      io.emit('update_players_list');
    }
  });

  // 🤫 همس خاص للاعب
  socket.on('admin_whisper_player', (data) => {
    if (!verifyAdmin(data.adminPassword)) return;

    const targetSocket = io.sockets.sockets.get(data.targetSocketId);
    if (targetSocket && data.whisperMessage) {
      targetSocket.emit('receive_whisper', {
        sender: '👑 الأدمن (همس خاص)',
        message: data.whisperMessage
      });
    }
  });

  // ⏩ تخطي الكلمة الحالية
  socket.on('admin_skip_word', (data) => {
    if (!verifyAdmin(data.adminPassword)) return;
    if (typeof global.nextRound === 'function') {
      global.nextRound();
    } else {
      io.emit('word_skipped', { message: "تم تخطي الكلمة الحالية من قبل الأدمن." });
    }
  });

  // ✖️2 جولة مضاعفة
  socket.on('admin_double_round', (data) => {
    if (!verifyAdmin(data.adminPassword)) return;
    io.emit('system_message', { text: "⚡ جولة نقاط مضاعفة X2 مفعلة الآن!" });
  });

  // 💀 الموت المفاجئ
  socket.on('admin_sudden_death', (data) => {
    if (!verifyAdmin(data.adminPassword)) return;
    io.emit('start_sudden_death', { duration: data.duration || 30 });
  });

  // 🧊 تجميد الجميع
  socket.on('admin_freeze_all', (data) => {
    if (!verifyAdmin(data.adminPassword)) return;
    io.emit('toggle_freeze_all', { duration: data.duration });
  });

  // 🔇 كتم الشات عن الجميع
  socket.on('admin_mute_all', (data) => {
    if (!verifyAdmin(data.adminPassword)) return;

    adminData.isGlobalMute = !adminData.isGlobalMute;
    saveAdminSettings(); // 👈 حفظ دائم
    io.emit('chat_mute_status', { isMuted: adminData.isGlobalMute });
  });

  // 🔒 قفل الروم
  socket.on('admin_toggle_lock_room', (data) => {
    if (!verifyAdmin(data.adminPassword)) return;

    adminData.isRoomLocked = !adminData.isRoomLocked;
    saveAdminSettings(); // 👈 حفظ دائم
  });

  // 🧹 clean room (طرد الجميع)
  socket.on('admin_clean_room', (data) => {
    if (!verifyAdmin(data.adminPassword)) return;

    const allSockets = Array.from(io.sockets.sockets.values());
    allSockets.forEach(s => {
      if (s.id !== socket.id) { // عدم طرد الأدمن نفسه
        s.emit('kicked_event', { reason: 'تم إخلاء الروم بواسطة الأدمن.' });
        s.disconnect(true);
      }
    });
  });

  // ✍️ كلمة مخصصة
  socket.on('admin_set_custom_word', (data) => {
    if (!verifyAdmin(data.adminPassword)) return;
    if (data.word) {
      global.currentWord = data.word;
      io.emit('system_message', { text: `🎯 الأدمن قام بتعيين كلمة جديدة للRound الحالي!` });
    }
  });

  // 🎯 هدف الفوز
  socket.on('admin_set_win_score', (data) => {
    if (!verifyAdmin(data.adminPassword)) return;

    adminData.winScore = data.winScore;
    saveAdminSettings(); // 👈 حفظ دائم
    io.emit('update_win_score', { winScore: adminData.winScore });
  });

  // 📢 إعلان الشاشات العام
  socket.on('admin_send_broadcast', (data) => {
    if (!verifyAdmin(data.adminPassword)) return;
    if (data.message) {
      io.emit('receive_broadcast', { message: data.message });
    }
  });

  // 📢 الشريط الإخباري
  socket.on('admin_set_ticker_text', (data) => {
    if (!verifyAdmin(data.adminPassword)) return;

    adminData.tickerText = data.text;
    saveAdminSettings(); // 👈 حفظ دائم
    io.emit('update_ticker', { text: adminData.tickerText, visible: adminData.isTickerVisible });
  });

  socket.on('admin_toggle_ticker', (data) => {
    if (!verifyAdmin(data.adminPassword)) return;

    adminData.isTickerVisible = !adminData.isTickerVisible;
    saveAdminSettings(); // 👈 حفظ دائم
    io.emit('update_ticker', { text: adminData.tickerText, visible: adminData.isTickerVisible });
  });

  // 🔄 الأوضاع المتقدمة (Checkboxes)
  const modeEvents = [
    { event: 'admin_toggle_reverse_word', key: 'reverseWord' },
    { event: 'admin_toggle_blur_mode', key: 'blurMode' },
    { event: 'admin_toggle_missing_letter', key: 'missingLetter' },
    { event: 'admin_toggle_reverse_input', key: 'reverseInput' }
  ];

  modeEvents.forEach(m => {
    socket.on(m.event, (data) => {
      if (!verifyAdmin(data.adminPassword)) return;

      adminData.modes[m.key] = data.enabled;
      saveAdminSettings(); // 👈 حفظ دائم
      io.emit('update_game_modes', { modes: adminData.modes });
    });
  });

  // تنظيف حالة اللاعب عند المغادرة
  socket.on('disconnect', () => {
    activePlayerStates.delete(socket.id);
  });
});
