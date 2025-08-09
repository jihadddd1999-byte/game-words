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

const DATA_FILE = path.join(__dirname, 'playerData.json');

// الكلمات المستخدمة في اللعبة
const words = [
  "تفاحة","برمجة","مكتبة","حاسوب","شجرة","سماء","زهرة","ماء","كرة","كتاب",
  "قلم","نافذة","بحر","مدرسة","مدينة","سيارة","هاتف","طائرة","قهوة","شمس",
  "قمر","نهر","جبل","مطر","نوم","بطيخ","حب","صديق","سلامييي","ليل",
  "نهار","بيت","سفينة","صندوق","مفتاح","حديقة","شارع","طاولة","كرسي","باب",
  "نافذة","صورة","لوحة","موسيقى","قلم رصاص","مطبخ","مروحة","ساعة","قطار","مستشفى",
  "مطار","ملعب","بحيرة","نبات","غابة","صحراء","صخرة","سماء","نجمة","بركان",
  "ثلج","رياح","غيمة","صوت","لولو","لون","طعم","لمس","شعور","ذاكرة",
  "حلم","ذكريات","كتاب","مكتبة","مكتوب","لغة","كهرباء","ضوء","ظل",
  "برد","حار","رمل","صابون","زيت","سكر","ملح","فلفل",
  "طبيب","مهندس","معلم","طالب","عالم","فنان","موسيقي","كاتب","مصور","مزارع",
  "طبيب اسنان","ممرضة","شرطي","جندي","طيار","بحار","رجل اعمال","طالب جامعي","مدير","عامل",
  "حداد","نجار","ميكانيكي","مبرمج","محامي","قاضي","سياسي","رئيس","وزير","رجل دين",
  "باحث","محقق","طبيب بيطري","صيدلي","مهندس معماري","مصمم","مخرج","ممثل","مغني","راقص",
  "لاعب كرة","عداء","سباح","طيار","سائق","حارس","مزارع","صياد","بائع","عامل بناء",
  "مصلح سيارات","موسيقي","رسام","كاتب","مزارع","صيدلي","حرام ايرين يموت","مطور ويب","ايرين عمك","محلل بيانات"
];

// ألوان خاصة لبعض الأسماء
const specialNamesColors = {
  "جهاد": "#00ffe7",
  "زيزو": "#ff3366",
  "أسامة": "#cc33ff",
  "مصطفى": "#33ff99",
  "حلا": "#ff33cc",
  "نور": "#ffff33",
  "كول": "#33ccff"
};

// تحميل بيانات اللاعبين من ملف JSON
let savedPlayersData = {};
try {
  const rawData = fs.readFileSync(DATA_FILE, 'utf8');
  savedPlayersData = JSON.parse(rawData);
} catch {
  savedPlayersData = {};
}

// حفظ بيانات اللاعبين في ملف JSON
function savePlayersDataToFile() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(savedPlayersData, null, 2));
}

const players = new Map(); // مفتاح: socket.id، قيمة: بيانات اللاعب

let currentWord = '';
let wordTimer = null;

function chooseNewWord() {
  const idx = Math.floor(Math.random() * words.length);
  currentWord = words[idx];
  io.emit('newWord', currentWord);
}

function updatePlayersList() {
  const sortedPlayers = Array.from(players.values())
    .sort((a, b) => b.score - a.score)
    .map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      color: specialNamesColors[p.name] || null,
    }));

  io.emit('updatePlayers', sortedPlayers);
  updateTopPlayers();
}

function updateTopPlayers() {
  // تحويل بيانات اللاعبين المحفوظة إلى مصفوفة وفرزها
  const arr = Object.entries(savedPlayersData).map(([name, data]) => ({
    name,
    totalScore: data.totalScore || 0,
    wins: data.wins || 0
  }));

  arr.sort((a, b) => b.totalScore - a.totalScore);

  const top5 = arr.slice(0, 5);

  io.emit('updateTopPlayers', top5);
}

function sendSystemMessage(message) {
  io.emit('chatMessage', { system: true, message });
}

io.on('connection', socket => {
  if (players.size >= MAX_PLAYERS) {
    socket.emit('chatMessage', { system: true, message: 'عذراً، عدد اللاعبين وصل للحد الأقصى.' });
    socket.disconnect(true);
    return;
  }

  // انشاء بيانات لاعب جديدة أو استرجاعها حسب الاسم لاحقاً
  let player = {
    id: socket.id,
    name: `لاعب${Math.floor(Math.random() * 1000)}`,
    score: 0,
    totalScore: 0,
    wins: 0,
    bestTime: Number.POSITIVE_INFINITY,
    canAnswer: true,
  };
  players.set(socket.id, player);

  // ارسال ترحيب مع معرف اللاعب
  socket.emit('welcome', { id: socket.id });

  // ارسال الكلمة الحالية
  if (!currentWord) {
    chooseNewWord();
  } else {
    socket.emit('newWord', currentWord);
  }

  // ارسال النقاط الحالية
  socket.emit('updateScore', player.score);

  updatePlayersList();

  sendSystemMessage(`${player.name} دخل اللعبة.`);

  socket.on('setName', newName => {
    if (!newName || typeof newName !== 'string' || newName.trim() === '') return;

    newName = newName.trim().substring(0, 20);

    // اذا الاسم موجود في بيانات الحفظ، استرجع النقاط والفوزات
    if (savedPlayersData[newName]) {
      player.score = savedPlayersData[newName].score || 0;
      player.totalScore = savedPlayersData[newName].totalScore || 0;
      player.wins = savedPlayersData[newName].wins || 0;
      player.bestTime = savedPlayersData[newName].bestTime || Number.POSITIVE_INFINITY;
    } else {
      // اسم جديد، نبدأ من الصفر
      player.score = 0;
      player.totalScore = 0;
      player.wins = 0;
      player.bestTime = Number.POSITIVE_INFINITY;
    }

    const oldName = player.name;
    player.name = newName;

    // حفظ بيانات اللاعب في ملف
    savedPlayersData[newName] = {
      score: player.score,
      totalScore: player.totalScore,
      wins: player.wins,
      bestTime: player.bestTime,
    };
    savePlayersDataToFile();

    socket.emit('updateScore', player.score);

    updatePlayersList();
    sendSystemMessage(`${oldName} غير اسمه إلى ${newName}`);
  });

  socket.on('sendMessage', msg => {
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
    if (!player) return;
    if (!data || typeof data.answer !== 'string') return;
    if (!player.canAnswer) return;

    const answer = data.answer.trim();
    const timeUsed = parseFloat(data.timeUsed) || 0;

    if (answer === currentWord) {
      player.score += POINTS_PER_CORRECT;
      player.totalScore += POINTS_PER_CORRECT;
      if (timeUsed < player.bestTime) player.bestTime = timeUsed;

      socket.emit('updateScore', player.score);

      // إرسال الوقت واسم اللاعب لجميع اللاعبين تحت خانة الإجابة
      io.emit('showAnswerTime', { name: player.name, time: timeUsed });

      updatePlayersList();

      player.canAnswer = false;

      // تحديث البيانات في ملف التخزين
      savedPlayersData[player.name] = {
        score: player.score,
        totalScore: player.totalScore,
        wins: player.wins,
        bestTime: player.bestTime,
      };
      savePlayersDataToFile();

      if (player.score >= WINNING_SCORE) {
        player.wins++;
        sendSystemMessage(`🏆 ${player.name} فاز باللعبة! عدد مرات الفوز: ${player.wins}`);

        io.emit('playerWon', { name: player.name, wins: player.wins });

        // إعادة تعيين النقاط لكل اللاعبين مع السماح بالإجابة
        players.forEach(pl => {
          pl.score = 0;
          pl.canAnswer = true;
        });
        updatePlayersList();

        // تحديث بيانات الفوز في ملف
        savedPlayersData[player.name].wins = player.wins;
        savedPlayersData[player.name].score = 0;
        savePlayersDataToFile();
      }

      if (wordTimer) clearTimeout(wordTimer);
      wordTimer = setTimeout(() => {
        chooseNewWord();
        players.forEach(pl => pl.canAnswer = true);
      }, 2000);

    } else {
      player.canAnswer = true;
      socket.emit('wrongAnswer');
    }
  });

  socket.on('requestPlayerInfo', playerId => {
    const p = players.get(playerId);
    if (p) {
      socket.emit('playerInfoData', {
        name: p.name,
        totalScore: p.totalScore,
        wins: p.wins,
        bestTime: p.bestTime === Number.POSITIVE_INFINITY ? 0 : p.bestTime,
      });
    }
  });

  // طرد لاعب (صلاحية للأدمن فقط)
  socket.on('kickPlayer', targetId => {
    if (players.size > 0 && socket.id === Array.from(players.keys())[0]) {
      if (players.has(targetId)) {
        const kickedPlayer = players.get(targetId);
        io.to(kickedPlayer.id).emit('kicked');
        io.emit('chatMessage', { system: true, message: `${kickedPlayer.name} تم طرده من اللعبة.` });
        players.delete(targetId);
        updatePlayersList();
        io.sockets.sockets.get(kickedPlayer.id)?.disconnect(true);
      }
    }
  });

  socket.on('disconnect', () => {
    if (!player) return;
    sendSystemMessage(`${player.name} خرج من اللعبة.`);
    players.delete(socket.id);
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

// بدء تشغيل السيرفر
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
