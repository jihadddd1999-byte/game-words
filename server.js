const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

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
  "قمر","نهر","جبل","مطر","نوم","بطيخ","حب","صديق","سلامييي","ليل",
  "نهار","بيت","سفينة","صندوق","مفتاح","حديقة","شارع","طاولة","كرسي","باب",
  "نافذة","صورة","لوحة","موسيقى","قلم رصاص","مطبخ","مروحة","ساعة","قطار","مستشفى",
  "مطار","ملعب","بحيرة","نبات","غابة","صحراء","صخرة","سماء","نجمة","بركان",
  "ثلج","رياح","غيمة","صوت","لولو","لون","طعم","لمس","شعور","ذاكرة",
  "حلم","ذكريات","كتاب","مكتبة","مكتوب","لغة","كهرباء","ضوء","ظل","ظل",
  "ايرين عمك","حرام ايرين يموت","برد","حار","رمل","صابون","زيت","سكر","ملح","فلفل",
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

const players = new Map();

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

  // إنشاء لاعب جديد مع بيانات افتراضية
  const player = {
    id: socket.id,
    name: `لاعب${players.size + 1}`,
    score: 0,
    totalScore: 0,
    wins: 0,
    bestTime: Number.POSITIVE_INFINITY,
    canAnswer: true,
    color: null,
  };
  players.set(socket.id, player);

  socket.emit('welcome', { id: socket.id });
  sendSystemMessage(`${player.name} دخل اللعبة.`);
  updatePlayersList();

  if (!currentWord) {
    chooseNewWord();
  } else {
    socket.emit('newWord', currentWord);
    socket.emit('updateScore', player.score);
  }

  socket.on('setName', name => {
    if (!name || typeof name !== 'string' || name.trim() === '') return;
    const p = players.get(socket.id);
    if (p) {
      const oldName = p.name;
      p.name = name.trim().substring(0, 20);
      updatePlayersList();
      sendSystemMessage(`${oldName} غير اسمه إلى ${p.name}`);

      // إرسال بيانات اللاعب بعد التحديث
      socket.emit('updatePlayerData', {
        name: p.name,
        score: p.score,
        wins: p.wins,
        fastestTime: p.bestTime === Number.POSITIVE_INFINITY ? 0 : p.bestTime,
      });
    }
  });

  socket.on('sendMessage', msg => {
    const p = players.get(socket.id);
    if (!p) return;

    if (msg.trim() === 'إيرين') {
      socket.emit('chatMessage', { system: true, message: 'تم تفعيل تأثير إيرين على اسمك!' });
      return;
    }

    io.emit('chatMessage', {
      name: p.name,
      message: msg,
      system: false,
      color: specialNamesColors[p.name] || null,
    });
  });

  socket.on('submitAnswer', data => {
    const p = players.get(socket.id);
    if (!p) return;
    if (!data || typeof data.answer !== 'string') return;

    if (!p.canAnswer) {
      return;
    }

    const answer = data.answer.trim();
    const timeUsed = parseFloat(data.timeUsed) || 0;

    if (answer === currentWord) {
      p.score += POINTS_PER_CORRECT;
      p.totalScore += POINTS_PER_CORRECT;
      if (timeUsed < p.bestTime) p.bestTime = timeUsed;

      socket.emit('updateScore', p.score);

      // إرسال بيانات اللاعب بعد التحديث
      socket.emit('updatePlayerData', {
        name: p.name,
        score: p.score,
        wins: p.wins,
        fastestTime: p.bestTime,
      });

      io.emit('showAnswerTime', { name: p.name, time: timeUsed });
      io.emit('clearAnswerTime');

      updatePlayersList();

      p.canAnswer = false;

      if (p.score >= WINNING_SCORE) {
        p.wins++;
        io.emit('playerWon', { name: p.name, wins: p.wins });

        // إعادة تعيين النقاط والإجابات لكل اللاعبين
        players.forEach(pl => {
          pl.score = 0;
          pl.canAnswer = true;
        });
        updatePlayersList();
      }

      if (wordTimer) clearTimeout(wordTimer);
      wordTimer = setTimeout(() => {
        chooseNewWord();
        players.forEach(pl => pl.canAnswer = true);
      }, 2000);

    } else {
      p.canAnswer = true;
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

  socket.on('kickPlayer', targetId => {
    // صلاحية الطرد لأول لاعب متصل (أدمن)
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
    const p = players.get(socket.id);
    if (p) {
      sendSystemMessage(`${p.name} خرج من اللعبة.`);
      players.delete(socket.id);
      updatePlayersList();

      if (players.size === 0) {
        currentWord = '';
        if (wordTimer) {
          clearTimeout(wordTimer);
          wordTimer = null;
        }
      }
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
