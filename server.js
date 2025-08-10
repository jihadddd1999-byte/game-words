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
  "قمر","نهر","جبل","مطر","نوم","لولو","حرام ايرين يموت قهر","صديق","سعادة","ليل",
  "نهار","بيت","سفينة","صندوق","مفتاح","حديقة","شارع","طاولة","كرسي","باب",
  "نافذة","صورة","لوحة","موسيقى","قلم رصاص","مطبخ","مروحة","ساعة","قطار","مستشفى",
  "مطار","ملعب","بحيرة","نبات","غابة","صحراء","صخرة","سماء","نجمة","بركان",
  "ثلج","رياح","غيمة","صوت","رائحة","لون","طعم","بطيخ","شعور","ذاكرة",
  "حلم","ذكريات","كتاب","مكتبة","مكتوب","لغة","كهرباء","ضوء","ايرين عمك","ظل",
  "كول","سلامييي","برد","حار","رمل","صابون","زيت","سكر","ملح","فلفل",
  "طبيب","مهندس","معلم","طالب","عالم","فنان","موسيقي","كاتب","مصور","مزارع",
  "طبيب اسنان","ممرضة","شرطي","جندي","طيار","بحار","رجل اعمال","طالب جامعي","مدير","عامل",
  "حداد","نجار","ميكانيكي","مبرمج","محامي","قاضي","سياسي","رئيس","وزير","رجل دين",
  "باحث","محقق","طبيب بيطري","صيدلي","مهندس معماري","مصمم","مخرج","ممثل","مغني","راقص",
  "لاعب كرة","عداء","سباح","طيار","سائق","حارس","مزارع","صياد","بائع","عامل بناء",
  "مصلح سيارات","موسيقي","رسام","كاتب","مزارع","صيدلي","مهندس شبكات","مطور ويب","مصمم جرافيك","محلل بيانات"
];

// أسماء بألوان نيوني خاصة (مطابقة مع العميل)
const specialNamesColors = {
  "جهاد": "#00ffe7",    // نيوني أزرق سماوي
  "زيزو": "#ff3366",    // نيوني أحمر وردي
  "أسامة": "#cc33ff",   // نيوني بنفسجي
  "مصطفى": "#33ff99",  // نيوني أخضر فاتح
  "حلا": "#ff33cc",     // نيوني وردي قوي
  "نور": "#ffff33",     // نيوني أصفر
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

// تحديث قائمة اللاعبين وإرسالها للكل مع اسم + لون
function updatePlayersList() {
  players.sort((a, b) => b.score - a.score);
  io.emit('updatePlayers', players.map(p => ({
    id: p.id,
    name: p.name,
    score: p.score,
    color: specialNamesColors[p.name] || p.color || null
  })));
}

// إرسال رسالة نظامية للشات
function sendSystemMessage(message) {
  io.emit('chatMessage', { system: true, message });
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
    color: '#00e5ff' // لون افتراضي أزرق سماوي
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

  // استقبال تعيين الاسم واللون من العميل (العميل يرسل كائن {name, color})
  socket.on('setName', data => {
    if (!data || typeof data.name !== 'string') return;

    const player = players.find(p => p.id === socket.id);
    if (player) {
      const oldName = player.name;
      player.name = data.name.trim().substring(0, 20);

      // لون اللاعب يأتي من العميل، إلا إذا الاسم خاص ونفرض لوننا
      if (specialNamesColors[player.name]) {
        player.color = specialNamesColors[player.name];
      } else if (data.color && /^#([0-9A-F]{3}){1,2}$/i.test(data.color)) {
        player.color = data.color;
      } else {
        player.color = '#00e5ff'; // افتراضي لو لم يرسل اللون أو غير صحيح
      }

      updatePlayersList();
      sendSystemMessage(`${oldName} غير اسمه إلى ${player.name}`);
    }
  });

  // استقبال رسالة شات من لاعب وإرسالها للكل مع اسم + لون
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
      color: player.color || (specialNamesColors[player.name] || null)
    });
  });

  // استقبال الإجابة
  socket.on('submitAnswer', data => {
    const player = players.find(p => p.id === socket.id);
    if (!player) return;
    if (!data || typeof data.answer !== 'string') return;

    if (!player.canAnswer) {
      // يمنع الإجابة المتكررة بدون إعادة تفعيل
      return;
    }

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

      player.canAnswer = false; // يمنع الإجابة المتكررة حتى كلمة جديدة

      if (player.score >= WINNING_SCORE) {
        player.wins++;
        io.emit('playerWon', { name: player.name, wins: player.wins });
        // إعادة تعيين النقاط للجميع بعد الفوز
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
      player.canAnswer = true; // السماح بالإجابة مرة أخرى فور الخطأ
      socket.emit('wrongAnswer');
    }
  });

  // صلاحية طرد لاعب (الأدمن هو أول لاعب متصل)
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

  // إزالة لاعب عند انفصاله
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
