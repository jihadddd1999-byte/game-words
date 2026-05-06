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

  // ======== تغيير الاسم (تم تصحيح القوس هنا) ========
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
  });

  // ======== الشات و الرسائل ========
  socket.on('sendMessage', msg => {
    const player = players.find(p => p.id === socket.id);
    if (!player) return;
    const message = msg.trim();
    if (!message) return;
    io.emit('chatMessage', { name: player.name, message, system: false, color: player.color });
  });

  // ======== جاري الكتابة ========
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

  // ======== إرسال الإجابة ========
  socket.on('submitAnswer', data => {
    const player = players.find(p => p.id === socket.id);
    if (!player || !data || typeof data.answer !== 'string') return;
    if (!player.canAnswer) return;
    if (data.answer.trim() === currentWord) {
      player.score += POINTS_PER_CORRECT;
      socket.emit('updateScore', player.score);
      io.emit('chatMessage', { system: true, message: `✅ ${player.name} أجاب بشكل صحيح!` });
      updatePlayersList();
      player.canAnswer = false;
      if (wordTimer) clearTimeout(wordTimer);
      wordTimer = setTimeout(() => { chooseNewWord(); players.forEach(p => p.canAnswer = true); }, 2000);
    }
  });

  // ======== نظام لوحة الرسم (تمت الإضافة هنا) ========
  socket.on('artStream', (data) => socket.broadcast.emit('artStream', data));
  socket.on('syncFullCanvas', (imgData) => io.emit('loadFullCanvas', imgData));
  socket.on('clearArt', () => io.emit('clearArt'));
  socket.on('canvasBgChange', (color) => socket.broadcast.emit('updateCanvasBg', color));

  // ======== قطع الاتصال ========
  socket.on('disconnect', () => {
    const index = players.findIndex(p => p.id === socket.id);
    if (index !== -1) {
      const left = players.splice(index, 1)[0];
      typingUsers.delete(left.name);
      io.emit('typing', [...typingUsers]);
      sendSystemMessage(`${left.name} خرج من اللعبة.`);
      updatePlayersList();
    }
  });
});

// ======== Render Keep Alive ========
app.get("/ping", (req, res) => res.status(200).send("alive"));

// ======== تشغيل السيرفر ========
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
      
