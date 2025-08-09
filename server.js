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
  "قمر","نهر","جبل","مطر","نوم","بطيخ","حب","صديق","سعادة","ليل",
  "نهار","بيت","سفينة","صندوق","مفتاح","حديقة","شارع","طاولة","كرسي","باب",
  "نافذة","صورة","لوحة","موسيقى","قلم رصاص","مطبخ","مروحة","ساعة","قطار","مستشفى",
  "مطار","ملعب","بحيرة","نبات","غابة","صحراء","صخرة","سماء","نجمة","بركان",
  "ثلج","رياح","غيمة","صوت","رائحة","لون","طعم","لمس","شعور","ذاكرة",
  "حلم","ذكريات","كتاب","مكتبة","مكتوب","لغة","كهرباء","ضوء","ظل","ظل",
  "سلامييي","لولو","برد","حار","رمل","صابون","زيت","سكر","ملح","فلفل",
  "طبيب","مهندس","معلم","طالب","عالم","فنان","موسيقي","كاتب","مصور","مزارع",
  "طبيب اسنان","ممرضة","شرطي","جندي","طيار","بحار","رجل اعمال","طالب جامعي","مدير","عامل",
  "حداد","نجار","ميكانيكي","مبرمج","محامي","قاضي","سياسي","رئيس","وزير","رجل دين",
  "باحث","محقق","طبيب بيطري","صيدلي","مهندس معماري","مصمم","مخرج","ممثل","مغني","راقص",
  "لاعب كرة","عداء","سباح","طيار","سائق","حارس","مزارع","صياد","بائع","عامل بناء",
  "مصلح سيارات","موسيقي","رسام","كاتب","مزارع","صيدلي","مهندس شبكات","مطور ويب","مصمم جرافيك","محلل بيانات"
];

const specialNamesColors = {
  "جهاد": "#00ffe7",    // نيوني أزرق سماوي
  "زيزو": "#ff3366",    // نيوني أحمر وردي
  "أسامة": "#cc33ff",   // نيوني بنفسجي
  "مصطفى": "#33ff99",  // نيوني أخضر فاتح
  "حلا": "#ff33cc",     // نيوني وردي قوي
  "نور": "#ffff33",     // نيوني أصفر
  "كول": "#33ccff"      // نيوني أزرق فاتح
};

let players = [];
let currentWord = '';
let wordTimer = null;

// اختيار كلمة جديدة عشوائية
function chooseNewWord() {
  const idx = Math.floor(Math.random() * words.length);
  currentWord = words[idx];
  io.emit('newWord', currentWord);
}

// إضافة توقيت للرسائل النظامية
function getTimeString() {
  return new Date().toLocaleTimeString('ar-EG', { hour12: false });
}

// تحديث قائمة اللاعبين مع إرسال اللون الخاص إن وجد وعدد مرات الفوز
function updatePlayersList() {
  players.sort((a, b) => b.score - a.score);
  io.emit('updatePlayers', players.map(p => ({
    id: p.id,
    name: p.name,
    score: p.score,
    wins: p.wins,
    color: specialNamesColors[p.name] || null
  })));
}

// إرسال رسالة نظامية للشات مع توقيت
function sendSystemMessage(message) {
  const time = getTimeString();
  io.emit('chatMessage', { system: true, message: `[${time}] ${message}` });
}

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
  };
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

    if (!player.canAnswer) return;

    const answer = data.answer.trim();
    const timeUsed = parseFloat(data.timeUsed) || 0;

    if (answer === currentWord) {
      player.score += POINTS_PER_CORRECT;
      socket.emit('updateScore', player.score);
      io.emit('chatMessage', {
        system: true,
        message: `✅ ${player.name} أجاب بشكل صحيح في ${timeUsed} ثانية!`
      });
      socket.emit('correctAnswer', { timeUsed });
      updatePlayersList();

      player.canAnswer = false;

      if (player.score >= WINNING_SCORE) {
        player.wins++;
        io.emit('playerWon', { name: player.name, wins: player.wins });
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

  socket.on('disconnect', () => {
    const index = players.findIndex(p => p.id === socket.id);
    if (index !== -1) {
      const leftPlayer = players.splice(index, 1)[0];
      sendSystemMessage(`${leftPlayer.name} خرج من اللعبة.`);
      updatePlayersList();

      if (players.length === 0) {
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
