const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const MAX_PLAYERS = 30;
const WINNING_SCORE = 100;
const POINTS_PER_CORRECT = 10;

const words = [
  "تفاحة","برمجة","مكتبة","حاسوب","شجرة","سماء","زهرة","ماء","كرة","كتاب",
  "قلم","نافذة","بحر","مدرسة","مدينة","سيارة","هاتف","طائرة","قهوة","شمس",
  "قمر","نهر","جبل","مطر","نوم","سلامييي","ايرين عمك","صديق","سعادة","ليل",
  "نهار","بيت","سفينة","صندوق","مفتاح","حديقة","شارع","طاولة","كرسي","باب",
  "نافذة","صورة","لوحة","موسيقى","قلم رصاص","مطبخ","مروحة","ساعة","قطار","مستشفى",
  "مطار","ملعب","بحيرة","نبات","غابة","صحراء","صخرة","سماء","نجمة","بركان",
  "ثلج","رياح","غيمة","يا معرق خفف","رائحة","لون","طعم","كول","شعور","ذاكرة",
  "حرام ايرين يموت","ذكريات","كتاب","مكتبة","مكتوب","لغة","كهرباء","ضوء","ظل","ظل",
  "بطيخ","لولو","برد","حار","رمل","صابون","زيت","سكر","ملح","فلفل",
  "طبيب","مهندس","معلم","طالب","عالم","فنان","موسيقي","كاتب","مصور","مزارع",
  "طبيب اسنان","ممرضة","شرطي","جندي","طيار","بحار","رجل اعمال","طالب جامعي","مدير","عامل",
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

let players = [];
let currentWord = '';
let wordTimer = null;

const STATS_FILE = path.join(__dirname, 'stats.json');

let statsData = {};

// تحميل بيانات الإحصائيات من الملف عند بدء السيرفر
function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      const data = fs.readFileSync(STATS_FILE, 'utf8');
      statsData = JSON.parse(data);
      console.log('تم تحميل بيانات الإحصائيات من الملف.');
    } else {
      statsData = {};
      console.log('ملف الإحصائيات غير موجود، تم إنشاء بيانات جديدة.');
    }
  } catch (err) {
    console.error('خطأ في تحميل بيانات الإحصائيات:', err);
    statsData = {};
  }
}

// حفظ بيانات الإحصائيات في الملف
function saveStats() {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(statsData, null, 2), 'utf8');
    //console.log('تم حفظ بيانات الإحصائيات بنجاح.');
  } catch (err) {
    console.error('خطأ في حفظ بيانات الإحصائيات:', err);
  }
}

// تحديث بيانات اللاعب في الإحصائيات وحفظها
function updatePlayerStats(player) {
  if (!player.name) return;
  if (!statsData[player.name]) {
    statsData[player.name] = {
      wins: 0,
      bestTime: null,
    };
  }
  // تحديث عدد مرات الفوز
  statsData[player.name].wins = player.wins;

  // تحديث أفضل وقت إذا كان أفضل
  if (player.bestTime !== null) {
    if (
      statsData[player.name].bestTime === null ||
      player.bestTime < statsData[player.name].bestTime
    ) {
      statsData[player.name].bestTime = player.bestTime;
    }
  }
  saveStats();
}

// اختيار كلمة جديدة عشوائية
function chooseNewWord() {
  const idx = Math.floor(Math.random() * words.length);
  currentWord = words[idx];
  io.emit('newWord', currentWord);
}

// تحديث قائمة اللاعبين مع إرسال اللون الخاص إن وجد
function updatePlayersList() {
  players.sort((a, b) => b.score - a.score);
  io.emit('updatePlayers', players.map(p => ({
    id: p.id,
    name: p.name,
    score: p.score,
    color: specialNamesColors[p.name] || null
  })));
}

// إرسال رسالة نظامية للشات
function sendSystemMessage(message) {
  io.emit('chatMessage', { system: true, message });
}

loadStats();

io.on('connection', socket => {
  if (players.length >= MAX_PLAYERS) {
    socket.emit('chatMessage', { system: true, message: 'عذراً، عدد اللاعبين وصل للحد الأقصى.' });
    socket.disconnect(true);
    return;
  }

  // إذا الاسم محفوظ سابقًا في الإحصائيات، نستخدمه
  let savedName = null;

  const newPlayer = {
    id: socket.id,
    name: null,
    score: 0,
    wins: 0,
    bestTime: null,
    canAnswer: true,
  };

  // عند انضمام اللاعب، نستخدم اسماً عشوائياً مؤقتاً، ثم نرسل له ليغيره أو يعيده
  newPlayer.name = `لاعب${Math.floor(Math.random() * 1000)}`;

  // إذا الاسم موجود في إحصائيات مخزنة، نعيد استخدامه (نبحث باسم عشوائي غير مثالي - يمكن تحسينه لاحقًا)
  // هنا نرسل للاعب ليختار اسم، أو المستخدم سيختار الاسم لاحقًا في اللعبة
  // لذا هذا الجزء يبقى للاسم الافتراضي فقط

  // لكن عند تعيين الاسم من العميل (socket.on('setName')) نعيد تحميل الإحصائيات الخاصة به

  players.push(newPlayer);

  socket.emit('welcome', { id: socket.id });
  sendSystemMessage(`${newPlayer.name} دخل اللعبة.`);
  updatePlayersList();

  if (!currentWord) {
    chooseNewWord();
  } else {
    socket.emit('newWord', currentWord);
    socket.emit('updateScore', newPlayer.score);
  }

  socket.on('setName', name => {
    if (!name || typeof name !== 'string' || name.trim() === '') return;
    const player = players.find(p => p.id === socket.id);
    if (player) {
      const oldName = player.name;
      player.name = name.trim().substring(0, 20);

      // استرجاع الإحصائيات إذا موجودة لهذا الاسم
      if (statsData[player.name]) {
        player.wins = statsData[player.name].wins || 0;
        player.bestTime = statsData[player.name].bestTime || null;
      } else {
        player.wins = 0;
        player.bestTime = null;
      }

      updatePlayersList();
      sendSystemMessage(`${oldName} غير اسمه إلى ${player.name}`);
    }
  });

  socket.on('sendMessage', msg => {
    const player = players.find(p => p.id === socket.id);
    if (!player) return;

    if (msg.trim() === 'إيرين') {
      socket.emit('chatMessage', { system: true, message: 'تم تفعيل تأثير إيرين على اسمك!' });
      return;
    }

    io.emit('chatMessage', {
      name: player.name,
      message: msg,
      system: false,
      color: specialNamesColors[player.name] || null,
    });
  });

  socket.on('submitAnswer', data => {
    const player = players.find(p => p.id === socket.id);
    if (!player) return;
    if (!data || typeof data.answer !== 'string') return;

    if (!player.canAnswer) {
      return;
    }

    const answer = data.answer.trim();
    const timeUsed = parseFloat(data.timeUsed) || 0;

    if (answer === currentWord) {
      player.score += POINTS_PER_CORRECT;

      if (player.bestTime === null || timeUsed < player.bestTime) {
        player.bestTime = timeUsed;
      }

      socket.emit('updateScore', player.score);
      io.emit('chatMessage', {
        system: true,
        message: `✅ ${player.name} أجاب بشكل صحيح في ${timeUsed.toFixed(2)} ثانية!`
      });
      socket.emit('correctAnswer', { timeUsed });
      updatePlayersList();

      player.canAnswer = false;

      if (player.score >= WINNING_SCORE) {
        player.wins++;
        updatePlayerStats(player); // حفظ بيانات الفوز والوقت

        io.emit('playerWon', { name: player.name, wins: player.wins });

        // إعادة تعيين النقاط لجميع اللاعبين عند الفوز
        players.forEach(p => {
          p.score = 0;
          p.canAnswer = true;
        });
        updatePlayersList();
      }

      if (wordTimer) clearTimeout(wordTimer);
      wordTimer = setTimeout(() => {
        chooseNewWord();
        players.forEach(p => p.canAnswer = true);
      }, 2000);

      updatePlayerStats(player); // حفظ بيانات كل مرة يتم فيها الإجابة الصحيحة (تحديث أفضل وقت)
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
        const kickedPlayer = players.splice(index, 1)[0];
        io.to(kickedPlayer.id).emit('kicked');
        io.emit('chatMessage', { system: true, message: `${kickedPlayer.name} تم طرده من اللعبة.` });
        updatePlayersList();
        io.sockets.sockets.get(kickedPlayer.id)?.disconnect(true);
      }
    }
  });

  socket.on('requestStats', () => {
    // نرسل بيانات الإحصائيات المجمعة لجميع اللاعبين (من statsData)
    const statsArray = Object.keys(statsData).map(name => ({
      name,
      wins: statsData[name].wins || 0,
      bestTime: statsData[name].bestTime,
      score: players.find(p => p.name === name)?.score || 0,
    }));

    socket.emit('statsData', statsArray);
  });

  socket.on('disconnect', () => {
    const index = players.findIndex(p
