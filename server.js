// server.js (محدّث مع حفظ إحصائيات، ألوان اللاعبين، أنماط، تصويت، keep-alive)
// حفظ البيانات في data.json

const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const DATA_FILE = path.join(__dirname, 'data.json');
const MAX_PLAYERS = 30;
const WINNING_SCORE = 100;
const POINTS_PER_CORRECT = 10;

// --- بيانات ثابتة (كلمات + ألوان خاصة) ---
const words = [
  "تفاحة","برمجة","مكتبة","حاسوب","شجرة","سماء","زهرة","ماء","كرة","كتاب",
  "قلم","نافذة","بحر","مدرسة","مدينة","سيارة","هاتف","طائرة","قهوة","شمس",
  "قمر","نهر","جبل","مطر","نوم","أمل","حب","صديق","سعادة","ليل",
  "نهار","بيت","سفينة","صندوق","مفتاح","حديقة","شارع","طاولة","كرسي","باب",
  "نافذة","صورة","لوحة","موسيقى","قلم رصاص","مطبخ","مروحة","ساعة","قطار","مستشفى",
  "مطار","ملعب","بحيرة","نبات","غابة","صحراء","صخرة","سماء","نجمة","بركان",
  "ثلج","رياح","غيمة","صوت","رائحة","لون","طعم","لمس","شعور","ذاكرة",
  "حلم","ذكريات","كتاب","مكتبة","مكتوب","لغة","كهرباء","ضوء","ظل","ظل",
  "حرارة","برودة","برد","حار","رمل","صابون","زيت","سكر","ملح","فلفل",
  "طبيب","مهندس","معلم","طالب","عالم","فنان","موسيقي","كاتب","مصور","مزارع",
  "طبيب أسنان","ممرضة","شرطي","جندي","طيار","بحار","رجل أعمال","طالب جامعي","مدير","عامل",
  "حداد","نجار","ميكانيكي","مبرمج","محامي","قاضي","سياسي","رئيس","وزير","رجل دين",
  "باحث","محقق","طبيب بيطري","صيدلي","مهندس معماري","مصمم","مخرج","ممثل","مغني","راقص",
  "لاعب كرة","عداء","سباح","طيار","سائق","حارس","مزارع","صياد","بائع","عامل بناء",
  "مصلح سيارات","موسيقي","رسام","كاتب","مزارع","صيدلي","مهندس شبكات","مطور ويب","مصمم جرافيك","محلل بيانات"
];

const specialNamesColors = {
  "جهاد": "#00ffe7",
  "زيزو": "#ff3366",
  "أسامة": "#cc33ff",
  "مصطفى": "#33ff99",
  "حلا": "#ff33cc",
  "نور": "#ffff33",
  "كول": "#33ccff"
};

// --- حالة السيرفر وقوائم ---
let players = []; // { id, name, score, wins, canAnswer, color, submittedWords? }
let currentWord = '';
let wordTimer = null;

// نمط اللعب الحالي وإدارة التصويت
let currentMode = 'missing'; // 'missing' | 'reversed' | 'flash' | 'playerlist'
let votes = {}; // vote => count
let voteTimeout = null;
const VOTE_DURATION_MS = 20 * 1000; // مدة التصويت 20 ثانية

// بيانات مُخزنة (إحصائيات + ألوان)
let persistentData = {
  stats: {},   // name => { bestTime, totalPoints, wins }
  colors: {},  // name => color
  // يمكنك إضافة مفاتيح أخرى هنا إذا رغبت
};

// --- وظائف قراءة/كتابة بيانات مستمرة ---
function loadPersistentData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      persistentData = JSON.parse(raw);
      if (!persistentData.stats) persistentData.stats = {};
      if (!persistentData.colors) persistentData.colors = {};
    } else {
      savePersistentData();
    }
  } catch (err) {
    console.error('Error loading persistent data:', err);
    persistentData = { stats: {}, colors: {} };
  }
}

function savePersistentData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(persistentData, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving persistent data:', err);
  }
}

// اقرأ البيانات عند التشغيل
loadPersistentData();

// --- أدوات مساعدة ---
function chooseRandomIndex(arr) {
  return Math.floor(Math.random() * arr.length);
}

function chooseNewWordForMode(mode) {
  // يرجع الكلمة المناسبة حسب النمط (الكلمة المرسلة للعميل قد تكون معدلة حسب النمط)
  const raw = words[chooseRandomIndex(words)];
  if (mode === 'reversed') {
    return raw.split('').reverse().join('');
  }
  if (mode === 'missing') {
    // إخفاء عدد من الحروف بشكل عشوائي (استبدالها بـ _)
    const letters = raw.split('');
    const hideCount = Math.max(1, Math.floor(letters.length * 0.35));
    let indices = Array.from(letters.keys());
    // اختر hideCount مؤشرات عشوائية
    for (let i = 0; i < hideCount; i++) {
      const j = Math.floor(Math.random() * indices.length);
      const idx = indices.splice(j,1)[0];
      letters[idx] = '_';
    }
    return letters.join('');
  }
  // flash: نرسل الكلمة الحقيقية لكن مع حدث خاص للإخفاء من العميل بعد وقت قصير
  // playerlist: handled separately in playerWords pool
  return raw;
}

function broadcastNewWord() {
  if (currentMode === 'playerlist') {
    // إذا كان هذا الوضع، نبني pool من كلمات اللاعبين الذين سجلوا كلماتهم
    const pool = [];
    players.forEach(p => {
      if (p.submittedWords && p.submittedWords.length) {
        p.submittedWords.forEach(w => pool.push(w));
      }
    });
    if (pool.length === 0) {
      // fallback إلى قائمة الكلمات العامة
      currentWord = words[chooseRandomIndex(words)];
    } else {
      currentWord = pool[chooseRandomIndex(pool)];
    }
  } else {
    // نمط آخر
    currentWord = words[chooseRandomIndex(words)];
  }

  // أرسل النسخة المعدلة حسب الوضع (بعض الأوضاع تعرض الشكل المعدل فقط)
  if (currentMode === 'reversed') {
    io.emit('newWord', currentWord.split('').reverse().join('')); // clients see reversed
  } else if (currentMode === 'missing') {
    // أرسل النسخة المعدلة (معشر من الحروف مخفية)
    const letters = currentWord.split('');
    const hideCount = Math.max(1, Math.floor(letters.length * 0.35));
    let indices = Array.from(letters.keys());
    for (let i = 0; i < hideCount; i++) {
      const j = Math.floor(Math.random() * indices.length);
      const idx = indices.splice(j,1)[0];
      letters[idx] = '_';
    }
    io.emit('newWord', letters.join(''));
  } else if (currentMode === 'flash') {
    // للـ flash نرسل الحدث مع مدة عرض قصيرة (العميل يتعامل معها ويخفي الكلمة)
    io.emit('newWord', currentWord);
    io.emit('flashWord', { duration: 1500 }); // client should hide بعد المدة
  } else {
    io.emit('newWord', currentWord);
  }
}

// إرسال قائمة اللاعبين مع اللون المُخزن إن وُجد
function updatePlayersListBroadcast() {
  players.sort((a, b) => b.score - a.score);
  const payload = players.map(p => ({
    id: p.id,
    name: p.name,
    score: p.score,
    color: (p.color || specialNamesColors[p.name] || persistentData.colors[p.name] || null)
  }));
  io.emit('updatePlayers', payload);
}

// سجل رسالة نظامية للشات
function broadcastSystemMessage(message) {
  io.emit('chatMessage', { system: true, message });
}

// إرسال حدث answerLog (عرض إجابة اللاعب والوقت تحت خانة الإجابات)
function broadcastAnswerLog(name, timeUsed) {
  // نرسل حدث مخصص لعملاء لعرضه في سجل الإجابات
  io.emit('answerLog', { name, timeUsed });
  // للحفاظ على التوافق مع العملاء القديمة نرسل أيضاً رسالة نظامية قابلة للتحليل
  io.emit('chatMessage', { system: true, message: `✅ ${name} أجاب بشكل صحيح في ${timeUsed} ثانية!` });
}

// --- التصويت على النمط ---
function startVoteRound() {
  votes = { missing: 0, reversed: 0, flash: 0, playerlist: 0 };
  io.emit('voteStarted', { duration: VOTE_DURATION_MS / 1000 });
  if (voteTimeout) clearTimeout(voteTimeout);
  voteTimeout = setTimeout(finishVoteRound, VOTE_DURATION_MS);
}

function finishVoteRound() {
  // حساب الفائز
  let winner = 'missing';
  let max = -1;
  Object.keys(votes).forEach(k => {
    if (votes[k] > max) { max = votes[k]; winner = k; }
  });
  currentMode = winner;
  io.emit('modeChanged', { mode: currentMode });
  // إعادة اختيار كلمة فورية بحسب النمط الجديد
  if (wordTimer) clearTimeout(wordTimer);
  broadcastNewWord();
  // أعد تفعيل الإجابة لكل اللاعبين
  players.forEach(p => p.canAnswer = true);
  updatePlayersListBroadcast();
  votes = {};
  voteTimeout = null;
}

// --- حفظ/تحديث إحصائيات في persistentData.stats ---
function ensurePlayerStats(name) {
  if (!name) return;
  if (!persistentData.stats[name]) {
    persistentData.stats[name] = { bestTime: null, totalPoints: 0, wins: 0 };
  }
}

// --- بدء الكلمة الأولى لو لم تكن موجودة ---
if (!currentWord) {
  // نختار كلمة بعد تهيئة السيرفر
  currentWord = words[chooseRandomIndex(words)];
  io.emit('newWord', currentWord);
}

// --- Keep-alive لمنع "سليب" conn/browser sleep (الخادم يرسل ping) ---
setInterval(() => {
  io.emit('keepAlive', { ts: Date.now() });
}, 20000); // كل 20 ثانية

// --- حدث الاتصال لـ Socket.io ---
io.on('connection', socket => {
  // رفض إذا اكتمل العدد
  if (players.length >= MAX_PLAYERS) {
    socket.emit('chatMessage', { system: true, message: 'عذراً، عدد اللاعبين وصل للحد الأقصى.' });
    socket.disconnect(true);
    return;
  }

  // إنشاء لاعب جديد
  const newPlayer = {
    id: socket.id,
    name: `لاعب${Math.floor(Math.random() * 1000)}`,
    score: 0,
    wins: 0,
    canAnswer: true,
    color: null,
    submittedWords: [] // للوضع playerlist
  };
  players.push(newPlayer);

  // إرسال ترحيب وبيانات
  socket.emit('welcome', { id: socket.id, mode: currentMode });
  broadcastSystemMessage(`${newPlayer.name} دخل اللعبة.`);
  updatePlayersListBroadcast();

  // أرسل الكلمة الحالية بصيغة النمط الحالي (حتى اللاعب المنضم يراه كما الباقين)
  broadcastNewWord();

  // حدث تعيين/تغيير الاسم
  socket.on('setName', name => {
    if (!name || typeof name !== 'string') return;
    const player = players.find(p => p.id === socket.id);
    if (!player) return;
    const oldName = player.name;
    player.name = name.trim().substring(0, 20);
    // إذا لدينا لون محفوظ لهذا الاسم في persistentData.colors نطبقه
    if (persistentData.colors[player.name]) player.color = persistentData.colors[player.name];
    updatePlayersListBroadcast();
    broadcastSystemMessage(`${oldName} غير اسمه إلى ${player.name}`);
    // تهيئة إحصائية إن لم تكن موجودة
    ensurePlayerStats(player.name);
    savePersistentData();
  });

  // حدث تعيين لون الاسم من العميل
  socket.on('setColor', color => {
    const player = players.find(p => p.id === socket.id);
    if (!player) return;
    if (!color || typeof color !== 'string') return;
    player.color = color;
    // خزّن لون هذا الاسم في البيانات المستمرة
    if (player.name) {
      persistentData.colors[player.name] = color;
      savePersistentData();
    }
    updatePlayersListBroadcast();
  });

  // حدث ارسال رسالة شات
  socket.on('sendMessage', msg => {
    const player = players.find(p => p.id === socket.id);
    if (!player) return;
    if (typeof msg !== 'string') return;
    const trimmed = msg.trim();
    if (!trimmed) return;

    // أمر خاص
    if (trimmed === 'إيرين') {
      socket.emit('chatMessage', { system: true, message: 'تم تفعيل تأثير إيرين على اسمك!' });
      return;
    }

    io.emit('chatMessage', {
      name: player.name,
      message: trimmed,
      system: false,
      color: player.color || specialNamesColors[player.name] || null
    });
  });

  // حدث استلام كلمات اللاعب للوضع playerlist (كل لاعب يرسل 5 كلمات)
  socket.on('submitPlayerWords', (wordsList) => {
    const player = players.find(p => p.id === socket.id);
    if (!player) return;
    if (!Array.isArray(wordsList)) return;
    player.submittedWords = wordsList.slice(0,5).map(w=> String(w).trim()).filter(Boolean);
    // نخبر الجميع أنّ هذا اللاعب أضاف كلماته
    broadcastSystemMessage(`${player.name} أضاف كلمات الجولة.`);
  });

  // التصويت لاختيار النمط
  socket.on('voteMode', mode => {
    if (!['missing','reversed','flash','playerlist'].includes(mode)) return;
    votes[mode] = (votes[mode] || 0) + 1;
    io.emit('voteUpdate', votes);
  });

  // حدث إرسال إجابة
  socket.on('submitAnswer', data => {
    const player = players.find(p => p.id === socket.id);
    if (!player) return;
    if (!data || typeof data.answer !== 'string') return;

    if (!player.canAnswer) {
      // منع إجابة مكررة
      socket.emit('wrongAnswer');
      return;
    }

    const answer = data.answer.trim();
    const timeUsed = parseFloat(data.timeUsed) || 0;

    // لاحظ: currentWord يجب أن تُمثل الكلمة "الحقيقية" (غير معروضة أحياناً كـ missing/reversed)
    // لذلك نعتبر أن server يحتفظ بكلمة حقيقية في currentWordRaw؛ لكن للحفاظ على بساطة الكود الحالي،
    // سنقارن الإجابة مع currentWord أو مع النسخة الأصلية الأفضل: سنخزن الكلمة الحقيقية عند الإرسال.
    // لتبسيط الأمور نفترض currentWordReal = last true (في broadcastNewWord نضع currentWord كالحقيقية).
    // هنا نستخدم currentWord (الحقيقية).
    if (answer === currentWord) {
      player.score += POINTS_PER_CORRECT;
      // تحديث إحصائيات مستمرة
      ensurePlayerStats(player.name);
      if (timeUsed && !isNaN(timeUsed)) {
        const s = persistentData.stats[player.name];
        if (!s.bestTime || timeUsed < s.bestTime) s.bestTime = parseFloat(timeUsed);
      }
      persistentData.stats[player.name].totalPoints = (persistentData.stats[player.name].totalPoints || 0) + POINTS_PER_CORRECT;
      savePersistentData();

      // إرسال تحديث للاعب
      socket.emit('updateScore', player.score);

      // بدلاً من وضع رسالة نظامية في الشات فقط، نرسل حدث مخصص لسجل الإجابات
      broadcastAnswerLog(player.name, timeUsed);

      // أيضًا نرسل حدث correctAnswer للاعب لتظهر له رسالة فورية
      socket.emit('correctAnswer', { timeUsed });

      updatePlayersListBroadcast();

      player.canAnswer = false;

      if (player.score >= WINNING_SCORE) {
        player.wins = (player.wins || 0) + 1;
        persistentData.stats[player.name].wins = (persistentData.stats[player.name].wins || 0) + 1;
        savePersistentData();
        io.emit('playerWon', { name: player.name, wins: player.wins });
        // Reset points for everyone (كما في سلوكك السابق)
        players.forEach(p => { p.score = 0; p.canAnswer = true; });
        updatePlayersListBroadcast();
      }

      // اختيار كلمة جديدة بعد 2 ثانية
      if (wordTimer) clearTimeout(wordTimer);
      wordTimer = setTimeout(() => {
        broadcastNewWord();
        players.forEach(p => p.canAnswer = true);
      }, 2000);

    } else {
      // إجابة خاطئة: أرسل حدث خطأ للاعب وأرسل رسالة نظامية بسيطة (أو لا)
      socket.emit('wrongAnswer');
      socket.emit('chatMessage', { system: true, message: '❌ إجابة خاطئة، حاول مرة أخرى!' });
      player.canAnswer = true; // السماح بمحاولة ثانية
    }
  });

  // طلب تحديث اللاعبين (عميل يطلب تحديث)
  socket.on('requestPlayersUpdate', () => {
    updatePlayersListBroadcast();
  });

  // طرد لاعب (كما في الكود القديم)
  socket.on('kickPlayer', targetId => {
    if (players.length > 0 && socket.id === players[0].id) {
      const index = players.findIndex(p => p.id === targetId);
      if (index !== -1) {
        const kickedPlayer = players.splice(index, 1)[0];
        io.to(kickedPlayer.id).emit('kicked');
        io.emit('chatMessage', { system: true, message: `${kickedPlayer.name} تم طرده من اللعبة.` });
        updatePlayersListBroadcast();
        io.sockets.sockets.get(kickedPlayer.id)?.disconnect(true);
      }
    }
  });

  // دعم حفظ كلمات كل لاعب (submitPlayerWords) بالفعل مضاف أعلاه

  // حدث قطع الاتصال
  socket.on('disconnect', () => {
    const idx = players.findIndex(p => p.id === socket.id);
    if (idx !== -1) {
      const left = players.splice(idx,1)[0];
      broadcastSystemMessage(`${left.name} خرج من اللعبة.`);
      updatePlayersListBroadcast();

      if (players.length === 0) {
        currentWord = '';
        if (wordTimer) { clearTimeout(wordTimer); wordTimer = null; }
      }
    }
  });
});

// بدء جولة تصويت تلقائية كل فترة (اختياري) - نتركه غير مفعل تلقائياً، يمكن تفعيله عبر endpoint أو حدث
// لبدء جولة تصويت من السيرفر يمكنك الاستدعاء startVoteRound();

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
