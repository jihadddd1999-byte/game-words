/* ==========================================================================
   🛡️ سيرفر لعبة الكلمات السريعة - النسخة الكاملة والمشاملة بدون حذف
   كلمة السر: Code Geass@2001815107
   ========================================================================== */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Code Geass@2001815107';
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

// ألوان الأسماء الخاصة
const specialNamesColors = {
  "جهاد": "#00ffe7",
  "زيزو": "#ff3366",
  "أسامة": "#cc33ff",
  "مصطفى": "#33ff99",
  "حلا": "#ff33cc",
  "نور": "#ffff33"
};

// ==========================================================================
// 💾 حفظ بيانات الأدمن الأساسي والعقوبات على القرص (تبقى بعد إعادة تشغيل السيرفر)
// ==========================================================================

const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

const persisted = { allowed: {}, stealthMode: 0 };
const ownerHashes = new Set();   // أجهزة الأدمن الأساسي (توكن الجهاز)
// عناوين IP الخاصة بك: من متغير البيئة OWNER_IP (افصل بينها بفاصلة) + اللي يتعلمها السيرفر لما تدخل
const envOwnerIps = new Set((process.env.OWNER_IP || '').split(',').map(x => normalizeIp(x)).filter(Boolean));
let learnedOwnerIps = [];

// ==========================================================================
// 📊 الذاكرة والحالة العامة
// ==========================================================================

const players = new Map();                 // اللاعبون داخل اللعبة
const authenticatedAdmins = new Set();     // كل الأدمنية (الأساسي + الموافق عليهم)
const ownerSockets = new Set();            // اتصالات الأدمن الأساسي
const allowedMuteBypass = new Set();
const typingUsers = new Set();

const gated = new Map();                   // اتصالات ممنوعة من الدخول (مطرود/محظور/غرفة مغلقة...)
const pendingAdminApprovals = new Map();   // طلبات دخول اللوحة بانتظار موافقة الأدمن الأساسي
const whisperLinks = new Set();            // من يحق له الرد على الهمس
const savedFlags = new Map();              // عقوبات اللاعب (كتم/تجميد/عمياء/VIP) تبقى لو عمل رفرش
const lockPass = new Set();                // مسموح لهم بالدخول والغرفة مقفولة
const lockDenied = new Set();              // رُفض طلبهم والغرفة مقفولة
const bans = new Map();                    // الحظر
const kicks = new Map();                   // الطرد
const auditLog = [];                       // سجل الهمس (للأدمن الأساسي فقط)
const nameByKey = new Map();               // آخر اسم لكل لاعب (لتحديث السجل تلقائياً)
let auditSeq = 0;

let wordTimer = null;
let roundScorers = [];
let wordAt = Date.now();                   // وقت ظهور الكلمة الحالية (لحساب سرعة الإجابة بالسيرفر)
let sudden = null;

const roomState = {
  isLocked: false,
  isMutedAll: false,
  isFrozenAll: false,
  isDoubleRound: false,
  isSuddenDeath: false,
  suddenDeathTimer: 30,
  suddenDeathRequiredAnswers: 1,
  winningScore: 1000,
  maxScorers: 1,                           // كم لاعب ياخذ نقاط على نفس الكلمة (0 = الجميع)
  pointsPerAnswer: 1,
  currentWord: '',
  nextCustomWord: '',
  tickerText: 'مرحباً بكم في لعبة الكلمات السريعة!',
  tickerVisible: true,
  tickerSpeed: 40
};

// ⚡ تأثير الرعد (لاسم REDO للأدمن الأساسي): الإعدادات بيتحكم فيها الأدمن الأساسي فقط
const thunder = { screen: true, sound: true, interval: 30 };   // رعد على الشاشات / الصوت / كل كم ثانية (تقريباً)
const thunderHidden = new Set();                                // لاعبين الرعد ما بظهرلهم (tokenHash)
let thunderTimer = null;

// ==========================================================================
// 🌟 نظام التقدّم: مستويات وخبرة (XP) + عملات + شارات وألقاب + تحدي يومي + عجلة حظ
// كل شي محفوظ لكل لاعب حسب جهازه (tokenHash) وبينحفظ مع باقي حالة السيرفر
// ==========================================================================
const progress = new Map();           // tokenHash -> بيانات التقدّم
const MAX_LEVEL = 100;
const xpToNext = (L) => 60 + 22 * L + L * L;          // الخبرة المطلوبة للانتقال من مستوى L إلى L+1
const TZ_OFFSET = 3 * 3600e3;                          // توقيت الأردن (UTC+3): اليوم الجديد بيبدأ منتصف الليل عنده
const dayNum = () => Math.floor((Date.now() + TZ_OFFSET) / 86400e3);
const msToReset = () => 86400e3 - ((Date.now() + TZ_OFFSET) % 86400e3);

// الألقاب والتأثيرات بتنفتح بالمستوى (اللاعب بيختار اللي بدو ياه من "ملفي")
const TITLES = [
  { id: 't1',   n: 'مبتدئ',            lv: 1 },
  { id: 't5',   n: 'متحمّس',           lv: 5 },
  { id: 't10',  n: 'سريع',             lv: 10 },
  { id: 't15',  n: 'محترف',            lv: 15 },
  { id: 't20',  n: 'نجم',              lv: 20 },
  { id: 't30',  n: 'أسطورة',           lv: 30 },
  { id: 't40',  n: 'ملك الكلمات',      lv: 40 },
  { id: 't50',  n: 'إمبراطور',         lv: 50 },
  { id: 't75',  n: 'خالد',             lv: 75 },
  { id: 't100', n: 'الأسطورة الأبدية', lv: 100 }
];
const GLOWS = [
  { id: 'g_green',   n: 'توهج أخضر',   lv: 8 },
  { id: 'g_blue',    n: 'توهج أزرق',   lv: 15 },
  { id: 'g_purple',  n: 'توهج بنفسجي', lv: 22 },
  { id: 'g_gold',    n: 'توهج ذهبي',   lv: 30 },
  { id: 'g_fire',    n: 'لهب',         lv: 40 },
  { id: 'g_ice',     n: 'جليد',        lv: 50 },
  { id: 'g_rainbow', n: 'قوس قزح',     lv: 65 },
  { id: 'g_diamond', n: 'ماسي',        lv: 85 }
];
// الشارات (من الأبسط للأندر): بتنمنح تلقائياً عند الإنجاز
const BADGES = [
  { id: 'first_blood', e: '🎯', n: 'البداية',      d: 'أول إجابة صحيحة' },
  { id: 'spin1',       e: '🎡', n: 'محظوظ',        d: 'لفّ عجلة الحظ لأول مرة' },
  { id: 'dc1',         e: '🧩', n: 'متحدّي',       d: 'أنجز أول تحدي يومي' },
  { id: 'st3',         e: '🔥', n: 'ملتهب',        d: 'سلسلة 3 أيام متتالية' },
  { id: 'fast1',       e: '⚡', n: 'برق',          d: 'جاوب بأقل من 1.5 ثانية' },
  { id: 'win1',        e: '🏆', n: 'بطل',          d: 'افز بأول جولة' },
  { id: 'ans100',      e: '💯', n: 'مئوية',        d: '100 إجابة صحيحة' },
  { id: 'dc7',         e: '🛡️', n: 'مثابر',        d: 'أنجز 7 تحديات يومية' },
  { id: 'st7',         e: '🌋', n: 'بركان',        d: 'سلسلة 7 أيام متتالية' },
  { id: 'lv25',        e: '🔱', n: 'فارس',         d: 'وصلت للمستوى 25' },
  { id: 'win10',       e: '👑', n: 'ملك الجولات',  d: 'افز بـ 10 جولات' },
  { id: 'ans1000',     e: '🏅', n: 'ألفية',        d: '1000 إجابة صحيحة' },
  { id: 'dc30',        e: '🎖️', n: 'محارب',        d: 'أنجز 30 تحدي يومي' },
  { id: 'st30',        e: '☄️', n: 'نيزك',         d: 'سلسلة 30 يوم متتالي' },
  { id: 'lv50',        e: '🏵️', n: 'ملكي',         d: 'وصلت للمستوى 50' },
  { id: 'jackpot',     e: '🌟', n: 'نجم الحظ',     d: 'ربحت الجائزة الكبرى بعجلة الحظ' }
];
// فكرة تحدي جديدة كل يوم (بتدور بالترتيب، وكل دورة بتتغير الأرقام)
const CHALLENGES = [
  { id: 'hunter',    icon: '🎯', title: 'صيّاد الكلمات',   ev: 'ans',    targets: [15, 20, 25], xp: 120, coins: 25, desc: (t) => `جاوب ${t} كلمة صحيحة` },
  { id: 'rocket',    icon: '🚀', title: 'الصاروخ',          ev: 'fast3',  targets: [4, 5, 6],    xp: 150, coins: 30, desc: (t) => `جاوب ${t} كلمات كل وحدة بأقل من 3 ثواني` },
  { id: 'lightning', icon: '⚡', title: 'البرق الخاطف',     ev: 'fast15', targets: [1],          xp: 100, coins: 20, desc: () => 'جاوب كلمة وحدة بأقل من ثانية ونص' },
  { id: 'champion',  icon: '🏆', title: 'المنتصر',          ev: 'win',    targets: [1],          xp: 200, coins: 40, desc: () => 'افز بجولة كاملة (وصّل لنقاط الفوز)' },
  { id: 'clean',     icon: '🔗', title: 'بدون أخطاء',       ev: 'run',    targets: [6, 8, 10],   xp: 140, coins: 30, desc: (t) => `جاوب ${t} كلمات ورا بعض بدون ولا غلطة` },
  { id: 'first',     icon: '🥇', title: 'الأول دائماً',     ev: 'first',  targets: [3, 4, 5],    xp: 160, coins: 35, desc: (t) => `كن أول واحد يجاوب ${t} مرات` },
  { id: 'giant',     icon: '📏', title: 'عملاق الحروف',     ev: 'long',   targets: [3, 4, 5],    xp: 130, coins: 28, desc: (t) => `جاوب ${t} كلمات طويلة (5 حروف أو أكثر)` },
  { id: 'points',    icon: '💎', title: 'جامع النقاط',      ev: 'pts',    targets: [20, 30, 40], xp: 130, coins: 28, desc: (t) => `اجمع ${t} نقطة` },
  { id: 'social',    icon: '💬', title: 'اجتماعي',          ev: 'chat',   targets: [8, 10, 12],  xp: 90,  coins: 20, desc: (t) => `ابعت ${t} رسالة بالشات` },
  { id: 'patient',   icon: '⏳', title: 'الصبور',           ev: 'stay',   targets: [15, 20, 30], xp: 110, coins: 22, desc: (t) => `ابقَ باللعبة ${t} دقيقة` }
];
// عجلة الحظ (لفّة مجانية باليوم): الجائزة بيحددها السيرفر
const WHEEL = [
  { t: '10',     i: '🪙', n: '10 عملات',  coins: 10,  w: 26 },
  { t: '60 XP',  i: '✨', n: '60 خبرة',   xp: 60,     w: 20 },
  { t: '20',     i: '🪙', n: '20 عملة',   coins: 20,  w: 18 },
  { t: '150 XP', i: '✨', n: '150 خبرة',  xp: 150,    w: 12 },
  { t: '40',     i: '🪙', n: '40 عملة',   coins: 40,  w: 10 },
  { t: '100',    i: '🪙', n: '100 عملة',  coins: 100, w: 6 },
  { t: '400 XP', i: '⚡', n: '400 خبرة',  xp: 400,    w: 4 },
  { t: '300+',   i: '🌟', n: 'الجائزة الكبرى: 300 عملة + شارة نجم الحظ', coins: 300, badge: 'jackpot', w: 1 }
];
const WHEEL_TOTAL = WHEEL.reduce((a, x) => a + x.w, 0);
const STREAK_REWARDS = { 3: { coins: 20 }, 7: { coins: 50, xp: 100 }, 14: { coins: 100, xp: 250 }, 30: { coins: 300, xp: 600 } };

// ==========================================================================
// 🛍️ المتجر + مسار المستويات: العناصر والأسعار والجوائز (كلها بيحددها السيرفر)
// ==========================================================================
const SHOP = [];
// I(id, cat, اسم, سعر, {lv: مستوى مطلوب, tr: بيجي هدية من المسار عند هذا المستوى (مش للبيع), e: إيموجي, v: لون, d: وصف, max, use})
function I(id, cat, n, price, o) { SHOP.push(Object.assign({ id, cat, n, p: price }, o || {})); }
// ألوان الأسماء
[['red', 'أحمر', '#f87171'], ['orange', 'برتقالي', '#fb923c'], ['yellow', 'أصفر', '#facc15'], ['lime', 'ليموني', '#a3e635'], ['mint', 'نعناعي', '#34d399'],
 ['sky', 'سماوي', '#38bdf8'], ['violet', 'بنفسجي', '#a78bfa'], ['pink', 'وردي', '#f472b6']].forEach(c => I('nc_' + c[0], 'nc', c[1], 150, { v: c[2] }));
I('nc_rose', 'nc', 'ورد جوري', 200, { v: '#fb7185' });
I('nc_white', 'nc', 'أبيض ثلجي', 200, { v: '#f8fafc' });
I('nc_ember', 'nc', 'جمري', 0, { v: '#ff7849', tr: 10 });
I('nc_gold', 'nc', 'ذهبي ملكي', 0, { v: '#ffd700', tr: 20 });
I('nc_cyber', 'nc', 'سايبر', 0, { v: '#00ffd5', tr: 40 });
// تأثيرات الأسماء (متحركة)
I('s_shadow', 'gl', 'ظل أسود', 500);
I('s_neon', 'gl', 'نيون', 700);
I('s_sakura', 'gl', 'ساكورا', 700);
I('s_ocean', 'gl', 'محيط', 800);
I('s_lava', 'gl', 'حمم', 900);
I('s_aurora', 'gl', 'شفق', 1000, { lv: 8 });
I('s_glitch', 'gl', 'عطل رقمي', 1100, { lv: 10 });
I('s_electric', 'gl', 'كهرباء', 1200, { lv: 12 });
I('s_gold', 'gl', 'ذهب لامع', 1400, { lv: 15 });
I('s_galaxy', 'gl', 'مجرّة', 1800, { lv: 20 });
I('s_eternal', 'gl', 'خلود', 0, { tr: 100 });
// إطارات المستوى (الرقم الصغير جنب الاسم)
I('cf_flame', 'cf', 'لهب', 400);
I('cf_ice', 'cf', 'جليد', 400);
I('cf_neon', 'cf', 'نيون', 700, { lv: 8 });
I('cf_royal', 'cf', 'ملكي', 600, { lv: 10 });
I('cf_rainbow', 'cf', 'قوس قزح', 1000, { lv: 20 });
I('cf_bronze', 'cf', 'برونزي', 0, { tr: 5 });
I('cf_silver', 'cf', 'فضي', 0, { tr: 15 });
I('cf_gold', 'cf', 'ذهبي', 0, { tr: 30 });
I('cf_diamond', 'cf', 'ماسي', 0, { tr: 60 });
I('cf_legend', 'cf', 'أسطوري', 0, { tr: 100 });
// ألقاب
I('ts_hunter', 'ti', 'القنّاص', 450);
I('ts_flash', 'ti', 'الفلاش', 450);
I('ts_shadow', 'ti', 'ظل الكلمات', 500);
I('ts_wizard', 'ti', 'ساحر الحروف', 600);
I('ts_king', 'ti', 'الملك', 900, { lv: 15 });
I('ts_rich', 'ti', 'ثري', 1200, { lv: 10 });
I('ts_elite', 'ti', 'نخبة', 1800, { lv: 25 });
I('ts_myth', 'ti', 'أسطورة المتجر', 3500, { lv: 40 });
// شارات
[['diamond', '💎', 'ألماس', 300], ['rocket', '🚀', 'صاروخ', 250], ['eagle', '🦅', 'نسر', 400], ['rainbow', '🌈', 'قوس قزح', 500], ['clover', '🍀', 'حظ', 300],
 ['brain', '🧠', 'عبقري', 400], ['mask', '🎭', 'قناع', 350], ['ufo', '🛸', 'فضائي', 600], ['moon', '🌙', 'قمر', 300], ['wolf', '🐺', 'ذئب', 450], ['orb', '🔮', 'كرة سحرية', 700]]
  .forEach(b => I('bs_' + b[0], 'bd', b[2], b[3], { e: b[1] }));
I('bs_dragon', 'bd', 'تنين', 800, { e: '🐉', lv: 15 });
// خلفيات الملف الشخصي
I('pf_sunset', 'pf', 'غروب', 300);
I('pf_ocean', 'pf', 'محيط', 300);
I('pf_forest', 'pf', 'غابة', 300);
I('pf_night', 'pf', 'ليل', 400);
I('pf_gold', 'pf', 'ذهب', 800, { lv: 10 });
I('pf_aurora', 'pf', 'شفق', 900, { lv: 15 });
I('pf_dawn', 'pf', 'فجر', 0, { tr: 12 });
I('pf_royal', 'pf', 'ملكي', 0, { tr: 35 });
I('pf_cosmos', 'pf', 'كون', 0, { tr: 70 });
// لون الرسالة بالشات
I('cc_gold', 'cc', 'ذهبي', 200);
I('cc_cyan', 'cc', 'سماوي', 200);
I('cc_pink', 'cc', 'وردي', 200);
I('cc_green', 'cc', 'أخضر', 200);
I('cc_rainbow', 'cc', 'قوس قزح متحرك', 600, { lv: 8 });
I('cc_ember', 'cc', 'جمري', 0, { tr: 18 });
I('cc_royal', 'cc', 'ملكي', 0, { tr: 45 });
// أدوات للاستخدام
I('boost_xp', 'use', 'مضاعف الخبرة', 120, { e: '✨', d: 'خبرة ×2 لمدة 30 دقيقة', max: 9, use: 1 });
I('boost_coin', 'use', 'مضاعف العملات', 120, { e: '🪙', d: 'عملات ×2 لمدة 30 دقيقة', max: 9, use: 1 });
I('shield', 'use', 'درع السلسلة', 200, { e: '🛡️', d: 'بينقذ سلسلتك لو فاتك يوم', max: 3, use: 1 });
I('ticket', 'use', 'تذكرة عجلة', 100, { e: '🎟️', d: 'لفّة إضافية بعجلة الحظ', max: 9, use: 1 });
I('box', 'use', 'صندوق غامض', 150, { e: '🎁', d: 'جائزة عشوائية وممكن تطلع نادرة', max: 20, use: 1 });
I('xpbook', 'use', 'كتاب الخبرة', 180, { e: '📚', d: '+250 خبرة فوراً', max: 20, use: 1 });
I('dbl', 'use', 'نقاط مضاعفة', 80, { e: '⚡', d: 'إجابتك الصحيحة الجاية بنقطتين', max: 9, use: 1 });
I('ice', 'use', 'تجميد خصم', 120, { e: '❄️', d: 'جمّد لاعب 4 ثواني وما يقدر يجاوب', max: 9, lv: 5, use: 1 });
const SHOP_BY = new Map(SHOP.map(x => [x.id, x]));
const isConsumable = (it) => it.cat === 'use';
const BUYABLE = SHOP.filter(x => x.p > 0 && !x.tr && x.cat !== 'use');
const DEAL_PCT = 30;
function dealOf(dn) {                                  // عرض اليوم: غرض بخصم (نفسه للكل)
  const it = BUYABLE[(dn * 7 + 3) % BUYABLE.length];
  return { id: it.id, price: Math.max(1, Math.round(it.p * (100 - DEAL_PCT) / 100)), pct: DEAL_PCT };
}
function priceOf(it) { const d = dealOf(dayNum()); return it.id === d.id ? d.price : it.p; }

// مسار المستويات: كل مستوى بيعطي عملات، ومستويات معيّنة بتعطي أدوات وعناصر حصرية
const TRACK = { 2: { ticket: 1 }, 3: { box: 1 }, 4: { dbl: 2 }, 6: { shield: 1 }, 7: { box: 1 }, 9: { boost_xp: 1 }, 11: { ticket: 1 }, 13: { box: 1 }, 14: { boost_coin: 1 },
  16: { dbl: 3 }, 17: { ice: 2 }, 19: { shield: 1 }, 21: { box: 2 }, 22: { boost_xp: 1 }, 24: { ticket: 2 }, 26: { box: 1 }, 27: { ice: 2 }, 28: { shield: 1 }, 31: { box: 2 },
  33: { boost_coin: 1 }, 36: { dbl: 5 }, 38: { box: 2 }, 41: { shield: 2 }, 44: { boost_xp: 2 }, 47: { box: 3 }, 52: { ticket: 3 }, 55: { box: 3 }, 58: { boost_coin: 2 },
  62: { shield: 2 }, 66: { box: 3 }, 72: { boost_xp: 3 }, 77: { box: 4 }, 83: { ticket: 4 }, 88: { box: 4 }, 93: { shield: 3 }, 96: { box: 5 }, 100: { box: 10 } };
const levelCoins = (L) => (L <= 1 ? 0 : 5 + (L % 10 === 0 ? 50 : 0) + (L === 100 ? 1000 : 0));
function trackOf(L) {
  return {
    lv: L, c: levelCoins(L), x: TRACK[L] || null,
    it: SHOP.filter(x => x.tr === L).map(x => x.id),
    ti: TITLES.filter(t => !t.shop && t.lv === L).map(t => t.id),
    gl: GLOWS.filter(g => !g.shop && g.lv === L).map(g => g.id)
  };
}

// عناصر المتجر بتنضاف لقوائم الألقاب والتأثيرات والشارات (عشان نفس نظام الاختيار والعرض يشتغل)
SHOP.forEach(it => {
  if (it.cat === 'ti') TITLES.push({ id: it.id, n: it.n, lv: 0, shop: true });
  if (it.cat === 'gl') GLOWS.push({ id: it.id, n: it.n, lv: 0, shop: true });
  if (it.cat === 'bd') BADGES.push({ id: it.id, e: it.e, n: it.n, d: 'شارة من المتجر', shop: true });
});
BADGES.push(
  { id: 'shop1',  e: '🛍️', n: 'متسوّق',       d: 'اشترِ أول غرض من المتجر' },
  { id: 'spend2k', e: '💸', n: 'زبون ذهبي',    d: 'اصرف 2000 عملة بالمتجر' },
  { id: 'lv75',   e: '🐲', n: 'خالد',          d: 'وصلت للمستوى 75' },
  { id: 'lv100',  e: '💠', n: 'الأسطورة',      d: 'وصلت للمستوى 100' },
  { id: 'box10',  e: '📦', n: 'فتّاح الصناديق', d: 'افتح 10 صناديق غامضة' }
);

function newProg() {
  return { xp: 0, lv: 1, coins: 0, streak: 0, bs: 0, ld: -1, b: {}, eq: {}, wd: -1, run: 0, pm: 0, lc: 0, d: null,
           s: { a: 0, w: 0, f: 0, dc: 0, sp: 0, wr: 0, bt: 0, bx: 0 },
           own: {}, inv: {}, bxp: 0, bco: 0, da: 0, spent: 0, js: Date.now(), ice: 0, ls: Date.now() };
}
function sanitizeProg(raw) {
  const pr = newProg();
  if (!raw || typeof raw !== 'object') return pr;
  ['xp', 'coins', 'streak', 'bs', 'ld', 'wd', 'run', 'pm', 'ls', 'bxp', 'bco', 'da', 'spent', 'js', 'ice'].forEach(k => { if (Number.isFinite(raw[k])) pr[k] = raw[k]; });
  if (raw.b && typeof raw.b === 'object') Object.keys(raw.b).forEach(k => { if (BADGES.some(x => x.id === k)) pr.b[k] = raw.b[k] || 1; });
  if (raw.own && typeof raw.own === 'object') Object.keys(raw.own).forEach(k => { const it = SHOP_BY.get(k); if (it && !isConsumable(it)) pr.own[k] = raw.own[k] || 1; });
  if (raw.inv && typeof raw.inv === 'object') Object.keys(raw.inv).forEach(k => { const it = SHOP_BY.get(k); const n = Math.floor(Number(raw.inv[k])); if (it && isConsumable(it) && n > 0) pr.inv[k] = Math.min(n, 99); });
  if (raw.eq && typeof raw.eq === 'object') {
    ['ti', 'gl', 'nc', 'cf', 'pf', 'cc'].forEach(k => { if (typeof raw.eq[k] === 'string') pr.eq[k] = raw.eq[k]; });
    if (Array.isArray(raw.eq.bd)) pr.eq.bd = raw.eq.bd.filter(x => typeof x === 'string').slice(0, 3);
  }
  if (raw.s && typeof raw.s === 'object') Object.keys(pr.s).forEach(k => { if (Number.isFinite(raw.s[k])) pr.s[k] = raw.s[k]; });
  if (raw.d && typeof raw.d === 'object' && Number.isFinite(raw.d.day)) {
    pr.d = { day: raw.d.day, id: String(raw.d.id), tg: Number(raw.d.tg) || 1, p: Number(raw.d.p) || 0, done: !!raw.d.done };
  }
  pr.lv = levelInfo(pr.xp).lv;
  return pr;
}
const xpForLevel = (L) => { let t = 0; for (let i = 1; i < L && i < MAX_LEVEL; i++) t += xpToNext(i); return t; };

function levelInfo(xp) {
  let L = 1, rest = Math.max(0, xp);
  while (L < MAX_LEVEL && rest >= xpToNext(L)) { rest -= xpToNext(L); L++; }
  return { lv: L, cur: L >= MAX_LEVEL ? 0 : rest, need: L >= MAX_LEVEL ? 0 : xpToNext(L) };
}
function getProg(p) {
  let pr = progress.get(p.tokenHash);
  if (!pr) { pr = newProg(); progress.set(p.tokenHash, pr); progressDirty(); }
  pr.ls = Date.now();
  return pr;
}
let progSaveTimer = null;
function progressDirty() {            // بنحفظ كل شوي مش مع كل إجابة (عشان ما نثقّل التخزين)
  if (progSaveTimer) return;
  progSaveTimer = setTimeout(() => { progSaveTimer = null; savePersisted(); }, 20000);
}
function emitToToken(tokenHash, ev, payload) {
  players.forEach(pl => { if (pl.tokenHash === tokenHash) io.to(pl.id).emit(ev, payload); });
}

function rollDay(pr) {
  const dn = dayNum();
  if (pr.d && pr.d.day === dn) return;
  const ch = CHALLENGES[dn % CHALLENGES.length];
  const cycle = Math.floor(dn / CHALLENGES.length);
  pr.d = { day: dn, id: ch.id, tg: ch.targets[cycle % ch.targets.length], p: 0, done: false };
  pr.run = 0; pr.pm = 0;
}
const chOf = (pr) => CHALLENGES.find(c => c.id === pr.d.id) || CHALLENGES[0];
function streakNow(pr) {
  if (pr.ld < 0) return 0;
  const gap = dayNum() - pr.ld;
  if (gap <= 1) return pr.streak;
  if (gap <= 4 && pr.streak > 0 && (pr.inv.shield || 0) >= gap - 1) return pr.streak;       // الدرع بينقذ السلسلة
  return 0;
}

// متاح للاعب؟ (ألقاب/تأثيرات المستوى بتنفتح بالمستوى، وعناصر المتجر والمسار بالامتلاك)
const hasTitle = (pr, t) => !!t && (t.shop ? !!pr.own[t.id] : pr.lv >= t.lv);
const hasGlow = (pr, g) => !!g && (g.shop ? !!pr.own[g.id] : pr.lv >= g.lv);
function unlockedTitles(pr) { return TITLES.filter(t => hasTitle(pr, t)); }
function shownTitle(pr) {
  const ti = pr.eq.ti;
  if (ti === '') return null;
  if (ti) { const t = TITLES.find(x => x.id === ti); return hasTitle(pr, t) ? t.id : null; }
  const auto = TITLES.filter(t => !t.shop && pr.lv >= t.lv && t.lv >= 10).pop();       // اللقب التلقائي من مستوى 10
  return auto ? auto.id : null;
}
function shownGlow(pr) {
  const g = GLOWS.find(x => x.id === pr.eq.gl);
  return hasGlow(pr, g) ? g.id : null;
}
function shownBadges(pr) {
  if (Array.isArray(pr.eq.bd)) return pr.eq.bd.filter(id => pr.b[id]).slice(0, 3);
  return BADGES.filter(b => pr.b[b.id] && !b.shop).slice(-2).map(b => b.id);      // تلقائي: أندر شارتين
}
function shownItem(pr, slot, cat) {                   // لون الاسم/إطار/لون الشات: لازم يكون مملوك
  const id = pr.eq[slot];
  const it = id && SHOP_BY.get(id);
  return it && it.cat === cat && pr.own[id] ? id : null;
}
// الشي اللي بيتشاف جنب الاسم عند الكل
function metaOf(p) {
  const pr = progress.get(p.tokenHash);
  if (!pr) return null;
  return { lv: pr.lv, ti: shownTitle(pr), gl: shownGlow(pr), bd: shownBadges(pr),
           nc: shownItem(pr, 'nc', 'nc'), cf: shownItem(pr, 'cf', 'cf'), cc: shownItem(pr, 'cc', 'cc') };
}

function grantBadge(p, pr, id) {
  if (pr.b[id]) return;
  pr.b[id] = Date.now();
  const b = BADGES.find(x => x.id === id);
  emitToToken(p.tokenHash, 'progress:badge', { id });
  if (b) emitToToken(p.tokenHash, 'progress:toast', { t: `${b.e} شارة جديدة: «${b.n}»` });
  updatePlayersList();
}
const boostOn = (pr, k) => (k === 'xp' ? pr.bxp : pr.bco) > Date.now();
function addCoins(pr, n, raw) {
  if (!(n > 0)) return;
  pr.coins += Math.floor(n) * (!raw && boostOn(pr, 'coin') ? 2 : 1);
}
function invAdd(pr, id, n) {
  const it = SHOP_BY.get(id);
  if (!it || !isConsumable(it)) return 0;
  const before = pr.inv[id] || 0;
  pr.inv[id] = Math.min(99, before + n);
  return pr.inv[id] - before;
}
// بيعطي اللاعب غرض (عنصر دائم أو أداة)، وبيرجّع وصف نصي
function giveItem(pr, id, qty) {
  const it = SHOP_BY.get(id);
  if (!it) return null;
  if (isConsumable(it)) { invAdd(pr, id, qty || 1); return `${it.e} ${it.n}${qty > 1 ? ' ×' + qty : ''}`; }
  pr.own[id] = pr.own[id] || Date.now();
  return `${it.n}`;
}
function addXp(p, pr, n, raw) {
  if (!(n > 0)) return;
  const before = pr.lv;
  pr.xp += Math.floor(n) * (!raw && boostOn(pr, 'xp') ? 2 : 1);
  const info = levelInfo(pr.xp);
  pr.lv = info.lv;
  if (info.lv > before) {
    const ups = [];
    let reward = 0;
    for (let L = before + 1; L <= info.lv; L++) {
      const t = trackOf(L);
      reward += t.c;
      TITLES.forEach(x => { if (!x.shop && x.lv === L) ups.push('لقب «' + x.n + '»'); });
      GLOWS.forEach(x => { if (!x.shop && x.lv === L) ups.push('تأثير «' + x.n + '»'); });
      t.it.forEach(id => { const d = giveItem(pr, id, 1); const it = SHOP_BY.get(id); if (d) ups.push(({ nc: 'لون اسم', gl: 'تأثير اسم', cf: 'إطار مستوى', pf: 'خلفية ملف', cc: 'لون شات' }[it.cat] || 'غرض') + ' «' + d + '»'); });
      if (t.x) Object.keys(t.x).forEach(id => { const d = giveItem(pr, id, t.x[id]); if (d) ups.push(d); });
    }
    addCoins(pr, reward, true);
    emitToToken(p.tokenHash, 'progress:levelup', { lv: info.lv, ups, coins: reward });
    if (info.lv >= 25) grantBadge(p, pr, 'lv25');
    if (info.lv >= 50) grantBadge(p, pr, 'lv50');
    if (info.lv >= 75) grantBadge(p, pr, 'lv75');
    if (info.lv >= 100) grantBadge(p, pr, 'lv100');
    updatePlayersList();
  }
}

function dailyEvent(p, pr, ev, n = 1, absolute = false) {
  rollDay(pr);
  const ch = chOf(pr);
  if (ch.ev !== ev || pr.d.done) return;
  pr.d.p = absolute ? Math.max(pr.d.p, n) : pr.d.p + n;
  if (pr.d.p < pr.d.tg) return;
  pr.d.p = pr.d.tg;
  pr.d.done = true;
  pr.s.dc++;
  addCoins(pr, ch.coins);
  addXp(p, pr, ch.xp);
  emitToToken(p.tokenHash, 'progress:toast', { t: `🎯 أنجزت التحدي اليومي! +${ch.xp} خبرة +${ch.coins} 🪙`, big: true });
  grantBadge(p, pr, 'dc1');
  if (pr.s.dc >= 7) grantBadge(p, pr, 'dc7');
  if (pr.s.dc >= 30) grantBadge(p, pr, 'dc30');
}

function touchStreak(p, pr) {
  const dn = dayNum();
  if (pr.ld === dn) return;
  const gap = pr.ld < 0 ? 99 : dn - pr.ld;
  if (gap === 1) pr.streak += 1;
  else if (gap >= 2 && gap <= 4 && pr.streak > 0 && (pr.inv.shield || 0) >= gap - 1) {     // الدرع بيغطّي الأيام الفايتة
    pr.inv.shield -= gap - 1;
    if (pr.inv.shield <= 0) delete pr.inv.shield;
    pr.streak += 1;
    emitToToken(p.tokenHash, 'progress:toast', { t: '🛡️ الدرع أنقذ سلسلتك!', big: true });
  } else pr.streak = 1;
  pr.ld = dn;
  pr.bs = Math.max(pr.bs, pr.streak);
  const key = pr.streak % 30 === 0 ? 30 : pr.streak;
  const r = STREAK_REWARDS[key];
  if (r) {
    addCoins(pr, r.coins, true);
    addXp(p, pr, r.xp || 0, true);
    emitToToken(p.tokenHash, 'progress:toast', { t: `🔥 سلسلة ${pr.streak} أيام! +${r.coins} 🪙${r.xp ? ' +' + r.xp + ' خبرة' : ''}`, big: true });
  }
  if (pr.streak >= 3) grantBadge(p, pr, 'st3');
  if (pr.streak >= 7) grantBadge(p, pr, 'st7');
  if (pr.streak >= 30) grantBadge(p, pr, 'st30');
}

// ---- أحداث اللعب ----
function onCorrect(p, info) {
  const pr = getProg(p);
  rollDay(pr);
  touchStreak(p, pr);
  const secs = info.secs;
  pr.s.a++;
  pr.run++;
  if (!pr.s.bt || secs * 1000 < pr.s.bt) pr.s.bt = Math.max(100, Math.round(secs * 1000));
  if (secs <= 3) pr.s.f++;
  addXp(p, pr, 10 + (secs <= 2 ? 6 : secs <= 4 ? 3 : 0));
  addCoins(pr, 1 + (secs <= 3 ? 1 : 0));
  dailyEvent(p, pr, 'ans');
  if (secs <= 3) dailyEvent(p, pr, 'fast3');
  if (secs <= 1.5) dailyEvent(p, pr, 'fast15');
  if (info.first) dailyEvent(p, pr, 'first');
  if (info.len >= 5) dailyEvent(p, pr, 'long');
  if (info.pts > 0) dailyEvent(p, pr, 'pts', info.pts);
  dailyEvent(p, pr, 'run', pr.run, true);
  grantBadge(p, pr, 'first_blood');
  if (secs <= 1.5) grantBadge(p, pr, 'fast1');
  if (pr.s.a >= 100) grantBadge(p, pr, 'ans100');
  if (pr.s.a >= 1000) grantBadge(p, pr, 'ans1000');
  progressDirty();
  pushProgress(p.tokenHash);
}
function onWrong(p) {
  const pr = getProg(p);
  pr.run = 0;
  pr.s.wr = (pr.s.wr || 0) + 1;
}
function onWin(p) {
  const pr = getProg(p);
  rollDay(pr);
  pr.s.w++;
  addXp(p, pr, 60);
  addCoins(pr, 10);
  dailyEvent(p, pr, 'win');
  grantBadge(p, pr, 'win1');
  if (pr.s.w >= 10) grantBadge(p, pr, 'win10');
  progressDirty();
  pushProgress(p.tokenHash);
}
function onChat(p, text) {
  const pr = getProg(p);
  const now = Date.now();
  if (String(text).trim().length < 3 || now - pr.lc < 3000) return;   // ما بنعدّ الرسائل السريعة جداً
  pr.lc = now;
  rollDay(pr);
  dailyEvent(p, pr, 'chat');
  progressDirty();
}

// ---- الحالة اللي بتنبعت للاعب نفسه ----
function nextUnlock(pr) {
  const out = [];
  for (let L = pr.lv + 1; L <= MAX_LEVEL && out.length === 0; L++) {
    const t = trackOf(L);
    TITLES.forEach(x => { if (!x.shop && x.lv === L) out.push({ lv: L, n: 'لقب «' + x.n + '»' }); });
    GLOWS.forEach(x => { if (!x.shop && x.lv === L) out.push({ lv: L, n: 'تأثير «' + x.n + '»' }); });
    t.it.forEach(id => out.push({ lv: L, n: SHOP_BY.get(id).n }));
  }
  return out[0] || null;
}
function stateOf(p) {
  const pr = getProg(p);
  rollDay(pr);
  const L = levelInfo(pr.xp);
  const ch = chOf(pr);
  const now = Date.now();
  const dl = dealOf(dayNum());
  return {
    lv: L.lv, cur: L.cur, need: L.need, xp: pr.xp, coins: pr.coins,
    streak: streakNow(pr), best: pr.bs, doneToday: pr.ld === dayNum(),
    s: pr.s, js: pr.js, spent: pr.spent,
    daily: { id: ch.id, icon: ch.icon, title: ch.title, desc: ch.desc(pr.d.tg), tg: pr.d.tg, p: pr.d.p, done: pr.d.done, xp: ch.xp, coins: ch.coins, reset: msToReset() },
    wheel: { can: pr.wd !== dayNum() || (pr.inv.ticket || 0) > 0, free: pr.wd !== dayNum(), tickets: pr.inv.ticket || 0, reset: msToReset() },
    eq: { ti: pr.eq.ti === undefined ? null : pr.eq.ti, gl: shownGlow(pr), bd: Array.isArray(pr.eq.bd) ? pr.eq.bd : null,
          nc: shownItem(pr, 'nc', 'nc'), cf: shownItem(pr, 'cf', 'cf'), pf: shownItem(pr, 'pf', 'pf'), cc: shownItem(pr, 'cc', 'cc') },
    shown: { ti: shownTitle(pr), bd: shownBadges(pr) },
    badges: Object.keys(pr.b),
    own: Object.keys(pr.own),
    inv: pr.inv,
    boost: { xp: Math.max(0, pr.bxp - now), coin: Math.max(0, pr.bco - now) },
    dbl: pr.da || 0,
    deal: { id: dl.id, price: dl.price, pct: dl.pct },
    next: nextUnlock(pr)
  };
}
const progPushTimers = new Map();
function pushProgress(tokenHash) {           // بنجمّع الدفعات القريبة بدفعة وحدة
  if (progPushTimers.has(tokenHash)) return;
  progPushTimers.set(tokenHash, setTimeout(() => {
    progPushTimers.delete(tokenHash);
    const p = [...players.values()].find(x => x.tokenHash === tokenHash);
    if (p) emitToToken(tokenHash, 'progress:state', stateOf(p));
  }, 150));
}
function catalogPayload() {
  return {
    titles: TITLES, glows: GLOWS, badges: BADGES,
    wheel: WHEEL.map(w => ({ t: w.t, i: w.i })),
    maxLevel: MAX_LEVEL,
    streak: Object.keys(STREAK_REWARDS).map(k => ({ d: +k, coins: STREAK_REWARDS[k].coins, xp: STREAK_REWARDS[k].xp || 0 })),
    shop: SHOP,
    track: Array.from({ length: MAX_LEVEL }, (_, i) => trackOf(i + 1))
  };
}
// بيانات الملف العام للاعب (اللي بيشوفها الباقي)
function publicProfile(t) {
  const pr = getProg(t);
  const L = levelInfo(pr.xp);
  return {
    id: t.id, name: t.name, color: specialNamesColors[t.name] || t.color || '#00e5ff',
    meta: metaOf(t), lv: L.lv, cur: L.cur, need: L.need, streak: streakNow(pr), best: pr.bs, s: pr.s, js: pr.js,
    badges: Object.keys(pr.b), pf: shownItem(pr, 'pf', 'pf'), fx: fxOf(t), score: t.score, wins: t.wins
  };
}
function pickWheel() {
  let r = crypto.randomInt(WHEEL_TOTAL);
  for (let i = 0; i < WHEEL.length; i++) { r -= WHEEL[i].w; if (r < 0) return i; }
  return 0;
}
// كل 30 ثانية: وقت التواجد باللعبة (لتحدي «الصبور»)
function presenceTick() {
  const seen = new Set();
  players.forEach(p => {
    if (seen.has(p.tokenHash)) return;
    seen.add(p.tokenHash);
    const pr = getProg(p);
    rollDay(pr);
    pr.pm += 0.5;
    if (chOf(pr).ev === 'stay' && !pr.d.done) {
      dailyEvent(p, pr, 'stay', Math.floor(pr.pm), true);
      if (Math.floor(pr.pm) !== Math.floor(pr.pm - 0.5)) pushProgress(p.tokenHash);
    }
  });
}

// ---- التخزين: ملف محلي + (اختياري) Upstash Redis عشان البيانات تبقى حتى لو Render سكّر وفتح من جديد ----
const REMOTE_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const REMOTE_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const REMOTE_KEY = 'wordgame:state';
const remoteEnabled = !!(REMOTE_URL && REMOTE_TOKEN && typeof fetch === 'function');
let remoteWritable = remoteEnabled;

async function remoteCommand(cmd) {
  const res = await fetch(REMOTE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REMOTE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  if (!res.ok) throw new Error(`remote status ${res.status}`);
  return res.json();
}

async function readStored() {
  if (remoteEnabled) {
    for (let i = 0; i < 3; i++) {
      try {
        const j = await remoteCommand(['GET', REMOTE_KEY]);
        remoteWritable = true;
        if (j && j.result) return JSON.parse(j.result);
        break; // ما في حفظ سابق
      } catch (e) {
        console.error('تعذر قراءة التخزين البعيد:', e.message);
        remoteWritable = false; // ما نكتب فوق بيانات قديمة لو القراءة فشلت
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (e) { return null; }
}

function snapshotFlags() {
  const now = Date.now();
  const out = {};
  const put = (hash, f) => {
    const keep = { muted: !!f.muted, frozen: !!f.frozen, blinded: !!f.blinded, isVip: !!f.isVip, until: f.until || {} };
    ['muted', 'frozen', 'blinded'].forEach(k => {
      if (keep[k] && keep.until[k] && now >= keep.until[k]) keep[k] = false;
    });
    if (keep.muted || keep.frozen || keep.blinded || keep.isVip) out[hash] = keep;
  };
  savedFlags.forEach((v, k) => put(k, v));
  players.forEach(p => { delete out[p.tokenHash]; put(p.tokenHash, p); });
  return out;
}

function snapshotProgress() {
  const out = {};
  const cutoff = Date.now() - 150 * 86400e3;           // اللي ما دخل من 150 يوم بنشيله عشان الملف ما يكبر
  progress.forEach((pr, k) => { if (pr.ls >= cutoff) out[k] = pr; });
  return out;
}

function buildSnapshot() {
  return {
    ownerHashes: [...ownerHashes],
    ownerIps: learnedOwnerIps,
    allowed: persisted.allowed,
    stealthMode: persisted.stealthMode,
    room: {
      isLocked: roomState.isLocked,
      isMutedAll: roomState.isMutedAll,
      isFrozenAll: roomState.isFrozenAll,
      isDoubleRound: roomState.isDoubleRound,
      winningScore: roomState.winningScore,
      maxScorers: roomState.maxScorers,
      pointsPerAnswer: roomState.pointsPerAnswer
    },
    ticker: { text: roomState.tickerText, visible: roomState.tickerVisible, speed: roomState.tickerSpeed },
    thunder: Object.assign({}, thunder),
    thunderHidden: [...thunderHidden],
    progress: snapshotProgress(),
    lockPass: [...lockPass],
    lockDenied: [...lockDenied],
    flags: snapshotFlags(),
    bans: [...bans.values()],
    kicks: [...kicks.values()]
  };
}

async function writeStored() {
  const text = JSON.stringify(buildSnapshot());
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, text);
  } catch (e) { /* بعض الاستضافات ما بتسمح بالكتابة، عادي */ }
  if (remoteWritable) {
    try { await remoteCommand(['SET', REMOTE_KEY, text]); }
    catch (e) { console.error('تعذر حفظ التخزين البعيد:', e.message); }
  }
}

let saveTimer = null;
function savePersisted() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { writeStored(); }, 400);
}
async function flushPersisted() {
  clearTimeout(saveTimer);
  await Promise.race([writeStored(), new Promise(r => setTimeout(r, 4000))]);
}

async function loadPersisted() {
  const raw = await readStored();
  if (!raw) return;

  // الأدمن الأساسي واحد فقط (أول واحد تسجّل): لو كان محفوظ أكثر من جهاز نحتفظ بالأول فقط
  const savedOwners = [...(raw.ownerHashes || [])];
  if (raw.ownerHash) savedOwners.push(raw.ownerHash); // صيغة الحفظ القديمة
  if (savedOwners.length > 0) ownerHashes.add(savedOwners[0]);
  learnedOwnerIps = Array.isArray(raw.ownerIps) ? raw.ownerIps.slice(-3) : [];
  persisted.allowed = raw.allowed || {};
  persisted.stealthMode = raw.stealthMode || 0;

  const r = raw.room || {};
  ['isLocked', 'isMutedAll', 'isFrozenAll', 'isDoubleRound'].forEach(k => { if (typeof r[k] === 'boolean') roomState[k] = r[k]; });
  ['winningScore', 'maxScorers', 'pointsPerAnswer'].forEach(k => { if (Number.isFinite(r[k])) roomState[k] = r[k]; });

  if (raw.ticker) {
    if (typeof raw.ticker.text === 'string') roomState.tickerText = raw.ticker.text;
    roomState.tickerVisible = !!raw.ticker.visible;
    if (raw.ticker.speed) roomState.tickerSpeed = raw.ticker.speed;
  }

  if (raw.thunder) {
    if (typeof raw.thunder.screen === 'boolean') thunder.screen = raw.thunder.screen;
    if (typeof raw.thunder.sound === 'boolean') thunder.sound = raw.thunder.sound;
    if (Number.isFinite(raw.thunder.interval)) thunder.interval = Math.min(Math.max(raw.thunder.interval, 10), 600);
  }
  (raw.thunderHidden || []).forEach(h => thunderHidden.add(h));
  Object.keys(raw.progress || {}).forEach(k => progress.set(k, sanitizeProg(raw.progress[k])));

  (raw.lockPass || []).forEach(h => lockPass.add(h));
  (raw.lockDenied || []).forEach(h => lockDenied.add(h));
  Object.keys(raw.flags || {}).forEach(k => savedFlags.set(k, raw.flags[k]));
  (raw.bans || []).forEach(b => { if (b && b.id) bans.set(b.id, b); });
  (raw.kicks || []).forEach(k => { if (k && k.tokenHash) kicks.set(k.tokenHash, k); });
}

// ==========================================================================
// 🛠️ الدوال المساعدة
// ==========================================================================

function getClientIP(socket) {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return socket.handshake.address || socket.request.connection.remoteAddress;
}

const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex').slice(0, 32);
function normalizeIp(ip) { return String(ip || '').replace(/^::ffff:/i, '').trim(); }
const isOwnerIp = (ip) => !!ip && (envOwnerIps.has(ip) || learnedOwnerIps.includes(ip));
const ownerIpsConfigured = () => envOwnerIps.size > 0 || learnedOwnerIps.length > 0;

// بصمة الأدمن الأساسي: بتنحفظ بمتصفحك وبتتحقق منها حتى لو السيرفر نسي كل شي (Render سكّر)
function makeOwnerProof(hash) {
  return crypto.createHmac('sha256', ADMIN_PASSWORD).update('owner:' + hash).digest('hex');
}
function validOwnerProof(hash, proof) {
  if (typeof proof !== 'string' || proof.length !== 64) return false;
  try { return crypto.timingSafeEqual(Buffer.from(proof, 'hex'), Buffer.from(makeOwnerProof(hash), 'hex')); }
  catch (e) { return false; }
}
function learnOwnerIp(ip) {
  if (!ip || envOwnerIps.has(ip) || learnedOwnerIps.includes(ip)) return;
  learnedOwnerIps.push(ip);
  if (learnedOwnerIps.length > 3) learnedOwnerIps.shift();
  savePersisted();
}

// زر لوحة الأدمن بيظهر لكل اللاعبين: الـ VIP بيدخل بدون كلمة سر، وأي حدا ثاني لازم يكتب كلمة السر ويوافق عليه الأدمن الأساسي
function canSeePanel(p) {
  return true;
}
function emitAdminButton(p) { io.to(p.id).emit('admin:button', { visible: canSeePanel(p), vip: !!p.isVip }); }
function refreshAdminButtons() { players.forEach(emitAdminButton); }
const ownerPresent = () => ownerSockets.size > 0;
const linkKey = (a, b) => [a, b].sort().join('|');

// تنظيف النصوص (يمنع حقن HTML في الأسماء)
function cleanName(str, max) {
  return String(str == null ? '' : str).replace(/[<>]/g, '').trim().substring(0, max);
}
function cleanText(str, max) {
  return String(str == null ? '' : str).replace(/[<>]/g, '').trim().substring(0, max);
}
function escapeChat(str) {
  return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function parseMinutes(v) {
  const n = Math.floor(Number(v));
  return n > 0 ? Math.min(n, 60 * 24 * 30) : 0;
}
function validColor(c) {
  return (typeof c === 'string' && /^#([0-9A-F]{3}){1,2}$/i.test(c)) ? c : null;
}

function emitAll(event, payload) { io.to('game').emit(event, payload); }
function emitToOwners(event, payload) { ownerSockets.forEach(id => io.to(id).emit(event, payload)); }
function emitToAdmins(event, payload) { authenticatedAdmins.forEach(id => io.to(id).emit(event, payload)); }

const effMuted = (p) => p.muted || (roomState.isMutedAll && !p.isAdmin && !allowedMuteBypass.has(p.id));
const effFrozen = (p) => p.frozen || (roomState.isFrozenAll && !p.isAdmin) || (p.iceUntil || 0) > Date.now();

function publicState() {
  return {
    isLocked: roomState.isLocked,
    isMutedAll: roomState.isMutedAll,
    isFrozenAll: roomState.isFrozenAll,
    isDoubleRound: roomState.isDoubleRound,
    isSuddenDeath: roomState.isSuddenDeath,
    winningScore: roomState.winningScore,
    maxScorers: roomState.maxScorers,
    pointsPerAnswer: roomState.pointsPerAnswer
  };
}
function syncRoomState() { emitAll('roomState:sync', publicState()); savePersisted(); }
function tickerPayload() {
  return { text: roomState.tickerText, visible: roomState.tickerVisible, speed: roomState.tickerSpeed };
}

function pushStatus(p) {
  io.to(p.id).emit('player:status', {
    muted: effMuted(p),
    frozen: effFrozen(p),
    blinded: !!p.blinded,
    globalMute: roomState.isMutedAll && !p.isAdmin
  });
}

function sendSystemMessage(message) {
  emitAll('chatMessage', { system: true, message });
}

function syncScores() {
  players.forEach(p => io.to(p.id).emit('updateScore', p.score));
}

// الشارة بجانب الاسم: الأدمن الأساسي "[الأدمن]" (وبقدر يخفيها)، وأي أدمن ثاني "[ادمن ثانوي]" وما بقدر يخفيها
function adminLabel(p) {
  if (!p.isAdmin) return null;
  if (ownerSockets.has(p.id)) return p.hideAdminBadge ? null : '[الأدمن]';
  return '[ادمن ثانوي]';
}

// تأثير الاسم الخاص: اسم REDO بيطلعله تأثير الرعد فقط إذا كان صاحبه الأدمن الأساسي (السيرفر هو اللي بيقرر مش اللاعب)
function fxOf(p) {
  return (ownerSockets.has(p.id) && /^redo$/i.test(String(p.name).trim())) ? 'redo' : null;
}

// الرعد بيجي طول ما REDO موجود وظاهر بالغرفة (لو مخفي ما بنبعت رعد عشان ما ينكشف)
function redoActive() {
  for (const p of players.values()) if (fxOf(p) && !p.isHiddenFromRoom) return true;
  return false;
}

// ضربة رعد: بتوصل لكل اللاعبين ما عدا اللي الأدمن الأساسي أخفاها عنهم
function sendThunder() {
  players.forEach(p => {
    if (thunderHidden.has(p.tokenHash)) return;
    io.to(p.id).emit('fx:strike', {
      screen: thunder.screen,
      volume: thunder.sound ? (thunder.screen ? 1 : 0.35) : 0
    });
  });
}

function scheduleThunder() {
  clearTimeout(thunderTimer);
  const base = Math.max(10, thunder.interval) * 1000;
  thunderTimer = setTimeout(() => {
    if (redoActive()) sendThunder();
    scheduleThunder();
  }, base * (0.6 + Math.random() * 0.8));
}

function getFormattedPlayersList(forAdmin = false) {
  const list = [];
  players.forEach((p) => {
    if (!forAdmin && p.isHiddenFromRoom) return;

    const label = adminLabel(p);
    let displayName = p.name;
    if (label) {
      displayName = `${label} ${p.name}`;
    }

    const item = {
      id: p.id,
      name: displayName,
      rawName: p.name,
      fx: fxOf(p),
      meta: metaOf(p),
      score: p.score,
      wins: p.wins,
      isVip: p.isVip,
      muted: p.muted,
      frozen: p.frozen,
      blinded: p.blinded,
      canDraw: p.canDraw,
      isAdmin: forAdmin ? p.isAdmin : !!label,
      color: specialNamesColors[p.name] || p.color || '#00e5ff'
    };
    if (forAdmin) {
      item.hideAdminBadge = p.hideAdminBadge;
      item.isHiddenFromRoom = p.isHiddenFromRoom;
      item.isOwner = ownerSockets.has(p.id);
      item.allowedAbsent = !!persisted.allowed[p.tokenHash];
      item.thunderHidden = thunderHidden.has(p.tokenHash);
    }
    list.push(item);
  });
  return list.sort((a, b) => b.score - a.score);
}

function updatePlayersList() {
  emitAll('updatePlayers', getFormattedPlayersList(false));
  const adminList = getFormattedPlayersList(true);
  authenticatedAdmins.forEach(id => io.to(id).emit('admin:players_updated', adminList));
}

// ---------- سجل المراقبة (الهمس) ----------
function renderAuditEntry(e) {
  return {
    id: e.id,
    ts: e.ts,
    from: nameByKey.get(e.fromKey) || e.fromName,
    to: nameByKey.get(e.toKey) || e.toName,
    message: e.message
  };
}
function logWhisper(fromP, toP, message) {
  const entry = {
    id: ++auditSeq,
    ts: Date.now(),
    fromKey: fromP.tokenHash,
    toKey: toP.tokenHash,
    fromName: fromP.name,
    toName: toP.name,
    message
  };
  auditLog.push(entry);
  if (auditLog.length > 300) auditLog.shift();
  emitToOwners('admin:audit_log', renderAuditEntry(entry));
}
function syncAudit() {
  emitToOwners('admin:audit_sync', auditLog.map(renderAuditEntry));
}
function noteName(p) {
  nameByKey.set(p.tokenHash, p.name);
  if (persisted.allowed[p.tokenHash]) { persisted.allowed[p.tokenHash].name = p.name; savePersisted(); }
}

// ---------- العقوبات ----------
function sanctionsPayload() {
  const now = Date.now();
  return {
    bans: [...bans.values()].map(b => ({
      id: b.id, name: b.name, reason: b.reason || '', remaining: b.until ? Math.max(0, b.until - now) : null
    })),
    kicks: [...kicks.values()].map(k => ({
      id: k.tokenHash, name: k.name, reason: k.reason || '', requestDenied: !!k.requestDenied,
      remaining: k.until ? Math.max(0, k.until - now) : null
    }))
  };
}
function emitSanctions() { emitToAdmins('admin:sanctions_updated', sanctionsPayload()); }

function allowedPayload() {
  return Object.keys(persisted.allowed).map(key => ({ key, name: persisted.allowed[key].name }));
}

function findBan(ip, tokenHash) {
  const now = Date.now();
  for (const [id, b] of bans) {
    if (b.until && now >= b.until) { bans.delete(id); continue; }
    if (b.tokenHash === tokenHash || (b.ip && b.ip === ip && !isOwnerIp(ip))) return b;
  }
  return null;
}
function findKick(tokenHash) {
  const k = kicks.get(tokenHash);
  if (k && k.until && Date.now() >= k.until) { kicks.delete(tokenHash); return null; }
  return k || null;
}

function canTarget(actorId, target) {
  if (!target) return false;
  // الأدمن الأساسي (بجهازه) محمي من أي أمر
  if (ownerSockets.has(target.id) || target.ownerIdent) return false;
  if (target.isAdmin && !ownerSockets.has(actorId)) return false;
  return true;
}

// ---------- أعلام اللاعب (كتم / تجميد / عمياء / VIP) ----------
const FLAG_NOTICES = {
  muted: ['🔇 قام الأدمن بكتمك، لا يمكنك الكتابة في الشات.', '🔊 تم فك الكتم عنك.'],
  frozen: ['🧊 قام الأدمن بتجميدك.', '🔥 تم فك التجميد عنك.'],
  blinded: [null, null]
};

function setFlag(p, key, value, minutes) {
  p[key] = !!value;
  p.until[key] = (value && minutes > 0) ? Date.now() + minutes * 60000 : null;
  pushStatus(p);
  savePersisted();
  const n = FLAG_NOTICES[key];
  if (n) {
    const msg = n[value ? 0 : 1];
    if (msg) io.to(p.id).emit('chatMessage', { system: true, message: msg });
  }
  updatePlayersList();
}

function setVip(p, value) {
  p.isVip = !!value;
  if (p.isVip) {
    sendSystemMessage(`👑 الأدمن وضع (${p.name}) كـ VIP، يستطيع اللاعب الآن الدخول للوحة الأدمن بدون كلمة سر كأدمن ثانوي.`);
  } else {
    sendSystemMessage(`👑 الأدمن أزال صفة VIP عن (${p.name}).`);
  }
  emitAdminButton(p);
  savePersisted();
  updatePlayersList();
}

function saveFlags(p) {
  if (p.muted || p.frozen || p.blinded || p.isVip) {
    savedFlags.set(p.tokenHash, {
      muted: p.muted, frozen: p.frozen, blinded: p.blinded, isVip: p.isVip, until: Object.assign({}, p.until)
    });
  } else {
    savedFlags.delete(p.tokenHash);
  }
  savePersisted();
}
function restoreFlags(p) {
  const s = savedFlags.get(p.tokenHash);
  if (!s) return;
  const now = Date.now();
  ['muted', 'frozen', 'blinded'].forEach(k => {
    if (s[k] && !(s.until[k] && now >= s.until[k])) { p[k] = true; p.until[k] = s.until[k] || null; }
  });
  p.isVip = !!s.isVip;
}

function applyStealth(p, mode) {
  mode = [0, 1, 2].includes(mode) ? mode : 0;
  p.stealthMode = mode;
  p.hideAdminBadge = mode >= 1;
  p.isHiddenFromRoom = mode === 2;
}

// ==========================================================================
// 🚪 بوابة الدخول (مطرود / محظور / الغرفة مغلقة / الأدمن الأساسي غائب)
// ==========================================================================

function evaluateEntry(ident) {
  const h = ident.tokenHash;
  if (ident.ownerIdent) return { ok: true };

  const ban = findBan(ident.ip, h);
  if (ban) return { ok: false, type: 'banned', reason: ban.reason || '' };

  const kick = findKick(h);
  if (kick) return { ok: false, type: 'kicked', reason: kick.reason || '', canRequest: !kick.requestDenied, denied: !!kick.requestDenied };

  if (roomState.isLocked && !lockPass.has(h)) {
    return { ok: false, type: 'locked', canRequest: !lockDenied.has(h), denied: lockDenied.has(h) };
  }

  if (players.size >= MAX_PLAYERS) return { ok: false, type: 'full' };

  return { ok: true };
}

function buildGate(ev, g, note) {
  const out = {
    type: ev.type, title: '', message: '', reason: '', status: '', note: note || '',
    canRequest: !!ev.canRequest && !g.requested
  };
  switch (ev.type) {
    case 'kicked':
      out.title = '🚫 تم طردك من قبل الأدمن';
      out.message = ev.denied
        ? 'رفض الأدمن طلبك. أنت مطرود من قبل الأدمن حتى يفك الطرد عنك.'
        : 'قام الأدمن بطردك من اللعبة.';
      out.reason = `السبب: ${ev.reason || 'الأدمن يتحفظ بالسبب'}`;
      break;
    case 'banned':
      out.title = '⛔ أنت محظور من اللعبة';
      out.message = 'تم حظرك من دخول اللعبة من قبل الأدمن.';
      if (ev.reason) out.reason = `السبب: ${ev.reason}`;
      break;
    case 'locked':
      out.title = '🔒 الغرفة مغلقة';
      out.message = ev.denied
        ? 'رفض الأدمن طلبك. يمكنك الدخول عندما يفتح الأدمن الغرفة.'
        : 'الغرفة مغلقة حالياً من قبل الأدمن. يمكنك طلب الإذن للدخول.';
      break;
    case 'full':
      out.title = '👥 الغرفة مكتملة';
      out.message = 'الغرفة مكتملة العدد، حاول مرة أخرى لاحقاً.';
      break;
    default:
      out.title = 'لا يمكن الدخول';
  }
  if (g.requested) out.status = 'تم إرسال طلبك للأدمن، بانتظار الرد...';
  return out;
}

function gateSocket(socket, ident, ev, note) {
  const g = gated.get(socket.id) || { ident, requested: false };
  g.ev = ev;
  gated.set(socket.id, g);
  socket.emit('gate:blocked', buildGate(ev, g, note));
}

function admitGated(id, note) {
  const sock = io.sockets.sockets.get(id);
  const g = gated.get(id);
  gated.delete(id);
  if (g && g.requested) emitToOwners('admin:request_cancelled', { requestId: id });
  if (!sock || !g) return;
  sock.emit('gate:approved', { note: note || '' });
  joinGame(sock, g.ident);
}

function reevaluateGated() {
  [...gated.keys()].forEach((id) => {
    const sock = io.sockets.sockets.get(id);
    const g = gated.get(id);
    if (!sock || !g) { gated.delete(id); return; }
    const ev = evaluateEntry(g.ident);
    if (ev.ok) admitGated(id, '');
    else if (ev.type !== g.ev.type || !!ev.canRequest !== !!g.ev.canRequest) gateSocket(sock, g.ident, ev);
  });
}

function attemptEnter(socket, ident) {
  const ev = evaluateEntry(ident);
  if (ev.ok) joinGame(socket, ident);
  else gateSocket(socket, ident, ev);
}

// ==========================================================================
// 🎮 الدخول للعبة، الكلمات، الجولات، الموت المفاجئ
// ==========================================================================

function chooseNewWord() {
  if (roomState.nextCustomWord) {
    roomState.currentWord = roomState.nextCustomWord;
    roomState.nextCustomWord = '';
  } else {
    const idx = Math.floor(Math.random() * words.length);
    roomState.currentWord = words[idx];
  }
  roundScorers = [];
  wordAt = Date.now();
  players.forEach(p => { p.canAnswer = true; });
  emitAll('newWord', roomState.currentWord);
}

function scheduleNextWord(delay) {
  if (wordTimer) return;
  wordTimer = setTimeout(() => {
    wordTimer = null;
    chooseNewWord();
  }, delay);
}

function declareWinner(player) {
  player.wins++;
  onWin(player);
  emitAll('playerWon', { name: player.name, wins: player.wins });
  players.forEach(p => { p.score = 0; p.canAnswer = true; });
  syncScores();
  updatePlayersList();
}

function startSuddenDeath(timer, required) {
  if (players.size === 0) return;
  roomState.isSuddenDeath = true;
  roomState.suddenDeathTimer = timer;
  roomState.suddenDeathRequiredAnswers = required;
  sudden = {
    required,
    counts: new Map(),
    timer: setTimeout(() => endSuddenDeath(null, false), timer * 1000)
  };
  emitAll('game:sudden_death_started', { timer, required, remaining: timer });
  sendSystemMessage(`💀 بدأ الموت المفاجئ! أول لاعب يجيب ${required} إجابة صحيحة خلال ${timer} ثانية يفوز.`);
  if (wordTimer) { clearTimeout(wordTimer); wordTimer = null; }
  chooseNewWord();
  syncRoomState();
}

function endSuddenDeath(winner, cancelled) {
  if (!sudden) return;
  clearTimeout(sudden.timer);
  const s = sudden;
  sudden = null;
  roomState.isSuddenDeath = false;

  let result = winner;
  if (!result && !cancelled) {
    let best = null;
    s.counts.forEach((rec, id) => {
      const p = players.get(id);
      if (!p) return;
      if (!best || rec.n > best.rec.n || (rec.n === best.rec.n && rec.at < best.rec.at)) best = { p, rec };
    });
    result = best ? best.p : null;
  }

  emitAll('game:sudden_death_ended', { winner: result ? result.name : null, cancelled: !!cancelled });
  if (cancelled) sendSystemMessage('💀 تم إلغاء الموت المفاجئ.');
  else if (result) {
    sendSystemMessage(`💀 انتهى الموت المفاجئ! الفائز: ${result.name}`);
    declareWinner(result);
  } else {
    sendSystemMessage('💀 انتهى الموت المفاجئ بدون فائز.');
  }
  syncRoomState();
}

function joinGame(socket, ident) {
  const name = ident.name || `لاعب_${socket.id.substring(0, 4)}`;
  const player = {
    id: socket.id,
    tokenHash: ident.tokenHash,
    name,
    score: 0,
    wins: 0,
    canAnswer: true,
    ip: ident.ip,
    isVip: false,
    muted: false,
    frozen: false,
    blinded: false,
    canDraw: true,
    isAdmin: false,
    hideAdminBadge: false,
    isHiddenFromRoom: false,
    stealthMode: 0,
    until: { muted: null, frozen: null, blinded: null },
    color: specialNamesColors[name] || ident.color || '#00e5ff'
  };
  restoreFlags(player);
  player.ownerIdent = !!ident.ownerIdent;
  player.ownerIpMatch = isOwnerIp(player.ip);

  const owner = player.ownerIdent;
  if (owner) {
    learnOwnerIp(player.ip);
    player.isAdmin = true;
    authenticatedAdmins.add(socket.id);
    ownerSockets.add(socket.id);
    applyStealth(player, persisted.stealthMode);
  }

  players.set(socket.id, player);
  socket.join('game');
  nameByKey.set(player.tokenHash, player.name);

  socket.emit('welcome', { id: socket.id });
  socket.emit('ticker:updated', tickerPayload());
  socket.emit('roomState:sync', publicState());
  if (!player.isHiddenFromRoom) sendSystemMessage(`${player.name} دخل اللعبة.`);
  if (player.name === 'كول') {
    socket.emit('chatMessage', { system: true, message: '🌸 أهلاً كول! نورتِ اللعبة 🤍' });
  }

  if (!roomState.currentWord) chooseNewWord();
  else socket.emit('newWord', roomState.currentWord);
  socket.emit('updateScore', player.score);
  pushStatus(player);
  emitAdminButton(player);
  socket.emit('progress:catalog', catalogPayload());
  getProg(player);
  pushProgress(player.tokenHash);
  updatePlayersList();

  if (owner) {
    socket.emit('admin:owner_proof', { proof: makeOwnerProof(player.tokenHash) });
    socket.emit('admin:session', { isOwner: true, stealthMode: player.stealthMode, ip: player.ip });
    sendAdminBootstrap(socket, true);
    socket.emit('chatMessage', { system: true, message: `👑 مرحباً بالأدمن الأساسي ${player.name}!` });
  }

  updatePlayersList();
  gamesHub.onJoin(socket, player);
  if (owner) reevaluateGated();
}

function removePlayer(p, announce) {
  saveFlags(p);
  typingUsers.delete(p.name);
  emitAll('typing', [...typingUsers]);
  if (announce && !p.isHiddenFromRoom) sendSystemMessage(`${p.name} خرج من اللعبة.`);
  players.delete(p.id);
  authenticatedAdmins.delete(p.id);
  ownerSockets.delete(p.id);
  allowedMuteBypass.delete(p.id);
  gamesHub.onLeave(p.id, announce === false);
}

function sendAdminBootstrap(socket, owner) {
  socket.emit('admin:players_updated', getFormattedPlayersList(true));
  socket.emit('admin:sanctions_updated', sanctionsPayload());
  if (owner) {
    socket.emit('admin:allowed_updated', allowedPayload());
    socket.emit('admin:thunder_state', Object.assign({}, thunder));
    socket.emit('admin:audit_sync', auditLog.map(renderAuditEntry));
    const approvals = [];
    const entries = [];
    pendingAdminApprovals.forEach((v, id) => approvals.push({ requestId: id, name: v.name }));
    gated.forEach((g, id) => {
      if (g.requested) entries.push({ requestId: id, name: g.ident.name || 'لاعب', kind: g.ev.type, reason: g.ev.reason || '' });
    });
    socket.emit('admin:pending_requests', { approvals, entries });
  }
}

function becomeOwner(socket, player) {
  player.ownerIdent = true;
  ownerHashes.add(player.tokenHash);
  learnOwnerIp(player.ip);
  savePersisted();
  socket.emit('admin:owner_proof', { proof: makeOwnerProof(player.tokenHash) });
  grantAdmin(socket, true);
  refreshAdminButtons();
}

function grantAdmin(socket, owner) {
  const p = players.get(socket.id);
  if (!p) return;
  p.isAdmin = true;
  authenticatedAdmins.add(socket.id);
  if (owner) {
    ownerSockets.add(socket.id);
    applyStealth(p, persisted.stealthMode);
  } else {
    applyStealth(p, 0); // الأدمن الثانوي دايماً ظاهر وما بقدر يخفي حاله
  }
  pushStatus(p);
  emitAdminButton(p);
  socket.emit('admin:session', { isOwner: !!owner, stealthMode: p.stealthMode || 0, ip: p.ip });
  sendAdminBootstrap(socket, !!owner);
  if (owner) {
    socket.emit('chatMessage', { system: true, message: `👑 مرحباً بالأدمن الأساسي ${p.name}!` });
    reevaluateGated();
  }
  updatePlayersList();
}

// انتهاء مدة الكتم/التجميد/العمياء/الطرد/الحظر تلقائياً
setInterval(() => {
  const now = Date.now();
  players.forEach(p => {
    ['muted', 'frozen', 'blinded'].forEach(k => {
      if (p[k] && p.until[k] && now >= p.until[k]) setFlag(p, k, false, 0);
    });
  });
  let changed = false;
  bans.forEach((b, id) => { if (b.until && now >= b.until) { bans.delete(id); changed = true; } });
  kicks.forEach((k, id) => { if (k.until && now >= k.until) { kicks.delete(id); changed = true; } });
  if (changed) { savePersisted(); emitSanctions(); reevaluateGated(); }
}, 2000);

// ==========================================================================
// 🔌 الاتصال عبر Socket.io
// ==========================================================================

// 🎮 الألعاب المتنوعة (شطرنج وإكس أو) في ملف مستقل: games-server.js
let gamesHub;
try {
  const createGamesHub = require('./games-server');
  gamesHub = createGamesHub({ io, players, effMuted, effFrozen, cleanText });

  // لو chess-engine.js موجود بجانب السيرفر (مش داخل public) بنقدّمه للمتصفح بنفس الاسم
  if (createGamesHub.enginePath && !createGamesHub.enginePath.includes(path.join(__dirname, 'public'))) {
    app.get('/chess-engine.js', (req, res) => res.sendFile(createGamesHub.enginePath));
  }
} catch (e) {
  // لو ملف ناقص: اللعبة الأساسية بتضل شغالة، واللاعب بيشوف رسالة واضحة بدل ما يضيع
  console.error('⚠️ الألعاب المتنوعة معطّلة:', e.message);
  const reason = e.message;
  gamesHub = {
    attachSocket(socket) {
      ['games:live_request', 'games:create_ai', 'games:invite'].forEach(ev => {
        socket.on(ev, () => socket.emit('games:error', { id: null, message: 'الألعاب غير مفعّلة على السيرفر: ' + reason }));
      });
    },
    onJoin() {}, onLeave() {}
  };
}

io.on('connection', (socket) => {
  const clientIP = normalizeIp(getClientIP(socket));
  const isAdmin = () => authenticatedAdmins.has(socket.id);
  const isOwner = () => ownerSockets.has(socket.id);
  gamesHub.attachSocket(socket);

  // ==========================================
  // 🪪 التعريف: اللاعب يرسل هويته (اسمه + توكن جهازه) وبعدها بيتقرر دخوله
  // ==========================================
  socket.on('identify', (data) => {
    if (socket.data && socket.data.identified) return;
    socket.data = socket.data || {};
    socket.data.identified = true;

    data = data || {};
    const token = (typeof data.token === 'string' && data.token.length >= 16 && data.token.length <= 200)
      ? data.token : socket.id;
    const tokenHash = hashToken(token);
    const ident = {
      tokenHash,
      ip: clientIP,
      name: cleanName(data.name, 20),
      color: validColor(data.color),
      ownerIdent: false
    };
    if (ownerHashes.has(tokenHash)) {
      ident.ownerIdent = true;
    } else if (ownerHashes.size === 0 && validOwnerProof(tokenHash, data.proof)) {
      // السيرفر نسي (ما في أدمن أساسي مسجّل) بس بصمتك صحيحة: بنرجّعك أدمن أساسي
      ident.ownerIdent = true;
      ownerHashes.add(tokenHash);
      savePersisted();
    }
    attemptEnter(socket, ident);
  });

  // طلب الإذن بالدخول (للمطرود أو عند قفل الغرفة)
  socket.on('gate:request_access', () => {
    const g = gated.get(socket.id);
    if (!g || g.requested) return;
    if (g.ev.type !== 'kicked' && g.ev.type !== 'locked') return;
    if (!g.ev.canRequest) return;
    if (!ownerPresent()) {
      socket.emit('gate:blocked', buildGate(g.ev, g, 'الأدمن الأساسي غير متواجد حالياً، حاول لاحقاً.'));
      return;
    }
    g.requested = true;
    emitToOwners('admin:entry_request', {
      requestId: socket.id, name: g.ident.name || 'لاعب', kind: g.ev.type, reason: g.ev.reason || ''
    });
    socket.emit('gate:blocked', buildGate(g.ev, g));
  });

  // ==========================================
  // 🎨 استوديو الرسم
  // ==========================================
  socket.on('draw-data', (data) => {
    const player = players.get(socket.id);
    if (player && player.canDraw) {
      socket.to('game').emit('draw-remote', data);
    }
  });

  socket.on('clear-board-all', (data) => {
    const player = players.get(socket.id);
    if (player && player.canDraw) {
      emitAll('clear-board-remote', data);
    }
  });

  socket.on('load-gallery-all', (imgData) => {
    const player = players.get(socket.id);
    if (player && player.canDraw) {
      socket.to('game').emit('load-remote', imgData);
    }
  });

  // ==========================================
  // 💬 الشات وإعدادات الاسم
  // ==========================================
  socket.on('setName', (data) => {
    if (!data || typeof data.name !== 'string') return;
    const player = players.get(socket.id);
    if (!player) return;

    const newName = cleanName(data.name, 20);
    if (!newName) return;

    const oldName = player.name;
    player.name = newName;

    if (specialNamesColors[player.name]) {
      player.color = specialNamesColors[player.name];
    } else if (validColor(data.color)) {
      player.color = data.color;
    } else {
      player.color = '#00e5ff';
    }

    noteName(player);
    updatePlayersList();
    syncAudit();
    if (!player.isHiddenFromRoom) sendSystemMessage(`${oldName} غير اسمه إلى ${player.name}`);

    if (player.name === "كول") {
      socket.emit('chatMessage', { system: true, message: "🌸 أهلاً كول! نورتِ اللعبة 🤍" });
    }
  });

  socket.on('typing', () => {
    const player = players.get(socket.id);
    if (!player) return;
    typingUsers.add(player.name);
    emitAll('typing', [...typingUsers]);
  });

  socket.on('stopTyping', () => {
    const player = players.get(socket.id);
    if (!player) return;
    typingUsers.delete(player.name);
    emitAll('typing', [...typingUsers]);
  });

  socket.on('submitAnswer', (data) => {
    const player = players.get(socket.id);
    if (!player || !data || typeof data.answer !== 'string') return;
    if (effFrozen(player) || player.blinded || !player.canAnswer) return;

    const answer = data.answer.trim();
    const timeUsed = parseFloat(data.timeUsed) || 0;

    if (answer !== roomState.currentWord) {
      socket.emit('chatMessage', { system: true, message: '❌ إجابة خاطئة!' });
      onWrong(player);
      player.canAnswer = true;
      socket.emit('wrongAnswer');
      return;
    }

    // إجابة صحيحة: كم لاعب مسموح ياخذ نقاط على هذه الكلمة؟
    const max = sudden ? 1 : roomState.maxScorers;
    if (max > 0 && roundScorers.length >= max) {
      socket.emit('chatMessage', { system: true, message: '⏱️ سبقك لاعب آخر بالإجابة!' });
      socket.emit('enableAnswer');
      return;
    }

    roundScorers.push(socket.id);
    const answerInfo = { secs: Math.max(0.2, (Date.now() - wordAt) / 1000), len: answer.length, first: roundScorers.length === 1, pts: 0 };
    player.canAnswer = false;
    socket.emit('correctAnswer', { timeUsed });

    if (sudden) {
      onCorrect(player, answerInfo);
      const rec = sudden.counts.get(player.id) || { n: 0, at: 0 };
      rec.n++;
      rec.at = Date.now();
      sudden.counts.set(player.id, rec);
      emitAll('chatMessage', { system: true, message: `💀 ${player.name} أجاب بشكل صحيح (${rec.n}/${sudden.required})` });
      if (rec.n >= sudden.required) endSuddenDeath(player, false);
      else scheduleNextWord(600);
      return;
    }

    const basePoints = roomState.pointsPerAnswer || 1;
    let addedPoints = roomState.isDoubleRound ? basePoints * 2 : basePoints;
    const prDbl = getProg(player);
    if ((prDbl.da || 0) > 0) {                       // أداة «نقاط مضاعفة» من المتجر
      prDbl.da -= 1;
      addedPoints *= 2;
      socket.emit('progress:toast', { t: '⚡ نقاط مضاعفة!' });
    }

    player.score += addedPoints;
    answerInfo.pts = addedPoints;
    onCorrect(player, answerInfo);
    socket.emit('updateScore', player.score);
    emitAll('chatMessage', { system: true, message: `✅ ${player.name} أجاب بشكل صحيح في ${timeUsed} ثانية!` });
    updatePlayersList();

    if (player.score >= roomState.winningScore) declareWinner(player);

    scheduleNextWord(2000);
  });

  // ==========================================
  // 🔐 1. مصادقة الأدمن (الأول = الأساسي للأبد، الباقي بموافقته)
  // ==========================================
  socket.on('admin:authenticate', (data, callback) => {
    const reply = (obj) => { if (typeof callback === 'function') callback(obj); };
    const player = players.get(socket.id);
    if (!player) return reply({ success: false, reason: 'not_joined' });
    if (isAdmin()) return reply({ success: true, isOwner: isOwner() });

    const passwordOk = !!data && typeof data.password === 'string' && data.password === ADMIN_PASSWORD;

    // الأدمن الأساسي (جهازه معروف): يدخل دايماً بدون كلمة سر
    if (player.ownerIdent) {
      becomeOwner(socket, player);
      return reply({ success: true, isOwner: true });
    }

    // أول مرة وما في أدمن أساسي مسجّل: أول واحد بكتب كلمة السر الصحيحة بصير الأدمن الأساسي للأبد
    if (ownerHashes.size === 0) {
      if (!passwordOk) return reply({ success: false });
      becomeOwner(socket, player);
      return reply({ success: true, isOwner: true });
    }

    // من هون وطالع: أي حدا غير الأدمن الأساسي بدخل كأدمن ثانوي
    if (ownerPresent()) {
      // الـ VIP بيدخل بدون كلمة سر وبدون موافقة
      if (player.isVip) {
        grantAdmin(socket, false);
        return reply({ success: true, isOwner: false });
      }
      // غير الـ VIP: لازم كلمة السر + موافقة الأدمن الأساسي
      if (!passwordOk) return reply({ success: false });
      if (pendingAdminApprovals.has(socket.id)) return reply({ success: true, pending: true });
      pendingAdminApprovals.set(socket.id, { name: player.name });
      emitToOwners('admin:approval_request', { requestId: socket.id, name: player.name });
      return reply({ success: true, pending: true });
    }

    // الأدمن الأساسي غايب: ما بدخل اللوحة إلا إذا هو مسمّحله من قبل
    if (!persisted.allowed[player.tokenHash]) return reply({ success: false, reason: 'owner_absent' });
    if (player.isVip || passwordOk) {
      grantAdmin(socket, false);
      return reply({ success: true, isOwner: false });
    }
    return reply({ success: false });
  });

  socket.on('admin:approval_response', (data) => {
    if (!isOwner() || !data) return;
    const id = data.requestId;
    if (!pendingAdminApprovals.has(id)) return;
    pendingAdminApprovals.delete(id);
    emitToOwners('admin:request_cancelled', { requestId: id });

    const targetSocket = io.sockets.sockets.get(id);
    const note = cleanText(data.message, 200);
    if (!targetSocket || !players.has(id)) return;

    if (data.approve) {
      grantAdmin(targetSocket, false);
      targetSocket.emit('admin:approval_result', { approved: true, message: note });
    } else {
      targetSocket.emit('admin:approval_result', {
        approved: false,
        message: 'رفض الأدمن دخولك إلى اللوحة' + (note ? `: ${note}` : '')
      });
    }
  });

  socket.on('admin:revoke_admin', (data) => {
    if (!isOwner() || !data) return;
    const t = players.get(data.playerId);
    if (!t || !t.isAdmin || ownerSockets.has(t.id)) return;
    t.isAdmin = false;
    authenticatedAdmins.delete(t.id);
    applyStealth(t, 0);
    io.to(t.id).emit('admin:revoked', {});
    pushStatus(t);
    emitAdminButton(t);
    updatePlayersList();
  });

  socket.on('admin:owner:allow_entry', (data) => {
    if (!isOwner() || !data) return;
    const t = players.get(data.playerId);
    if (!t) return;
    if (data.allow) persisted.allowed[t.tokenHash] = { name: t.name };
    else delete persisted.allowed[t.tokenHash];
    savePersisted();
    emitAdminButton(t);
    emitToOwners('admin:allowed_updated', allowedPayload());
    updatePlayersList();
    reevaluateGated();
  });

  socket.on('admin:owner:remove_allowed', (data) => {
    if (!isOwner() || !data) return;
    delete persisted.allowed[data.key];
    savePersisted();
    emitToOwners('admin:allowed_updated', allowedPayload());
    updatePlayersList();
  });

  // الأدمن يرد على طلب دخول (مطرود أو غرفة مغلقة)
  socket.on('admin:entry_response', (data) => {
    if (!isOwner() || !data) return;
    const id = data.requestId;
    const g = gated.get(id);
    if (!g || !g.requested) return;
    const note = cleanText(data.message, 200);
    const sock = io.sockets.sockets.get(id);

    emitToOwners('admin:request_cancelled', { requestId: id });
    g.requested = false;
    savePersisted();

    if (data.approve) {
      if (g.ev.type === 'kicked') {
        kicks.delete(g.ident.tokenHash);
        savePersisted();
        emitSanctions();
      } else if (g.ev.type === 'locked') {
        lockPass.add(g.ident.tokenHash);
      }
      admitGated(id, note);
    } else {
      if (g.ev.type === 'kicked') {
        const k = kicks.get(g.ident.tokenHash);
        if (k) { k.requestDenied = true; savePersisted(); emitSanctions(); }
      } else if (g.ev.type === 'locked') {
        lockDenied.add(g.ident.tokenHash);
      }
      if (sock) gateSocket(sock, g.ident, evaluateEntry(g.ident), note ? `رسالة الأدمن: ${note}` : '');
    }
  });

  socket.on('admin:get_players', () => {
    if (!isAdmin()) return;
    socket.emit('admin:players_updated', getFormattedPlayersList(true));
    socket.emit('admin:sanctions_updated', sanctionsPayload());
  });

  socket.on('admin:set_stealth', (data) => {
    if (!isOwner() || !data) return; // الاختفاء للأدمن الأساسي فقط
    const p = players.get(socket.id);
    if (!p) return;
    applyStealth(p, parseInt(data.mode));
    if (isOwner()) { persisted.stealthMode = p.stealthMode; savePersisted(); }
    socket.emit('admin:stealth_state', { mode: p.stealthMode });
    updatePlayersList();
  });

  // ==========================================
  // 👤 2. العقوبات وإدارة اللاعبين
  // ==========================================

  socket.on('admin:player:ban', (data) => {
    if (!isAdmin() || !data) return;
    const target = players.get(data.playerId);
    if (!canTarget(socket.id, target)) return;

    const minutes = parseMinutes(data.durationMinutes);
    const until = (minutes > 0 && data.autoReentry !== false) ? Date.now() + minutes * 60000 : null;
    const reason = cleanText(data.reason, 200);

    bans.set(target.tokenHash, {
      id: target.tokenHash, tokenHash: target.tokenHash, name: target.name, ip: target.ip, until, reason
    });
    savePersisted();

    const targetSocket = io.sockets.sockets.get(target.id);
    const ident = { tokenHash: target.tokenHash, ip: target.ip, name: target.name, color: target.color };
    removePlayer(target, false);
    if (targetSocket) {
      targetSocket.leave('game');
      gateSocket(targetSocket, ident, evaluateEntry(ident));
    }
    updatePlayersList();
    emitSanctions();
  });

  socket.on('admin:player:kick', (data) => {
    if (!isAdmin() || !data) return;
    const target = players.get(data.playerId);
    if (!canTarget(socket.id, target)) return;

    const minutes = parseMinutes(data.durationMinutes);
    const until = (minutes > 0 && data.autoReentry !== false) ? Date.now() + minutes * 60000 : null;
    const reason = cleanText(data.reason, 200);

    kicks.set(target.tokenHash, {
      tokenHash: target.tokenHash, name: target.name, ip: target.ip, until, reason, requestDenied: false
    });
    savePersisted();

    const targetSocket = io.sockets.sockets.get(target.id);
    const ident = { tokenHash: target.tokenHash, ip: target.ip, name: target.name, color: target.color };
    removePlayer(target, false);
    if (targetSocket) {
      targetSocket.leave('game');
      gateSocket(targetSocket, ident, evaluateEntry(ident));
    }
    sendSystemMessage(`🚫 الأدمن طرد (${target.name}) والسبب هو: ${reason || 'الأدمن يتحفظ بالسبب'}`);
    updatePlayersList();
    emitSanctions();
  });

  // فك الطرد أو الحظر في أي وقت (حتى لو في مؤقت)
  socket.on('admin:sanction:lift', (data) => {
    if (!isAdmin() || !data) return;
    if (data.type === 'ban') bans.delete(data.id);
    else if (data.type === 'kick') kicks.delete(data.id);
    else return;
    savePersisted();
    emitSanctions();
    reevaluateGated();
  });

  // كتم / تجميد / عمياء / VIP (تشغيل وإلغاء بنفس الزر)
  socket.on('admin:player:set_flag', (data) => {
    if (!isAdmin() || !data) return;
    const target = players.get(data.playerId);
    if (!canTarget(socket.id, target)) return;

    if (data.key === 'isVip') {
      if (!isOwner()) return; // الـ VIP بيفعّله الأدمن الأساسي فقط
      setVip(target, data.value === undefined ? !target.isVip : !!data.value);
      return;
    }
    if (!['muted', 'frozen', 'blinded'].includes(data.key)) return;
    const value = data.value === undefined ? !target[data.key] : !!data.value;
    setFlag(target, data.key, value, parseMinutes(data.durationMinutes));
  });

  socket.on('admin:player:rename', (data) => {
    if (!isAdmin() || !data) return;
    const target = players.get(data.playerId);
    const newName = cleanName(data.newName, 20);
    if (target && newName && canTarget(socket.id, target)) {
      const oldName = target.name;
      target.name = newName;
      noteName(target);
      sendSystemMessage(`📢 أدمن اللعبة غير اسم (${oldName}) إلى (${target.name})`);
      updatePlayersList();
      syncAudit();
    }
  });

  socket.on('admin:player:adjust_score', (data) => {
    if (!isAdmin() || !data) return;
    const target = players.get(data.playerId);
    const pts = parseInt(data.points);
    if (!target || isNaN(pts) || pts === 0) return;
    target.score += pts;
    io.to(target.id).emit('updateScore', target.score);
    updatePlayersList();
    if (data.announce) {
      sendSystemMessage(pts > 0
        ? `⭐ الأدمن زاد ${pts} نقطة لـ (${target.name})`
        : `➖ الأدمن خصم ${Math.abs(pts)} نقطة من (${target.name})`);
    }
  });

  socket.on('admin:player:warn', (data) => {
    if (!isAdmin() || !data) return;
    io.to(data.playerId).emit('admin:warn_effect', { message: cleanText(data.message, 300) || 'تحذير من الأدمن!' });
  });

  // الهمس: يوصل للاعب برسالة النظام، وبقدر يرد، والسجل بيوصل للأدمن الأساسي فقط
  socket.on('admin:player:whisper', (data) => {
    if (!isAdmin() || !data) return;
    const sender = players.get(socket.id);
    const target = players.get(data.playerId);
    const message = cleanText(data.message, 500);
    if (!sender || !target || !message || target.id === sender.id) return;

    whisperLinks.add(linkKey(sender.id, target.id));
    io.to(target.id).emit('admin:whisper_received', { message, from: sender.name, fromId: sender.id });
    logWhisper(sender, target, message);
  });

  socket.on('whisper:reply', (data) => {
    const sender = players.get(socket.id);
    if (!sender || !data) return;
    const target = players.get(data.toId);
    const message = cleanText(data.message, 500);
    if (!target || !message || !whisperLinks.has(linkKey(sender.id, target.id))) return;

    io.to(target.id).emit('admin:whisper_received', { message, from: sender.name, fromId: sender.id, isReply: true });
    logWhisper(sender, target, message);
  });

  // ==========================================
  // 🎯 3. التحكم بالجولات والروم
  // ==========================================
  socket.on('admin:room:skip_word', () => {
    if (!isAdmin()) return;
    if (wordTimer) { clearTimeout(wordTimer); wordTimer = null; }
    chooseNewWord();
  });

  socket.on('admin:room:set_custom_word', (data) => {
    if (!isAdmin() || !data || !data.word) return;
    roomState.nextCustomWord = cleanText(data.word, 60);
  });

  socket.on('admin:room:toggle_mute_all', () => {
    if (!isAdmin()) return;
    roomState.isMutedAll = !roomState.isMutedAll;
    sendSystemMessage(roomState.isMutedAll
      ? '🔇 الأدمن هو الوحيد الذي يستطيع الكتابة الآن.'
      : '🔊 يحق للجميع التحدث الآن.');
    syncRoomState();
    players.forEach(p => pushStatus(p));
  });

  socket.on('admin:room:toggle_freeze_all', () => {
    if (!isAdmin()) return;
    roomState.isFrozenAll = !roomState.isFrozenAll;
    syncRoomState();
    players.forEach(p => {
      pushStatus(p);
      if (!p.isAdmin) {
        io.to(p.id).emit('chatMessage', {
          system: true,
          message: roomState.isFrozenAll ? '🧊 قام الأدمن بتجميد الجميع.' : '🔥 تم فك التجميد عن الجميع.'
        });
      }
    });
  });

  socket.on('admin:room:allow_mute_bypass', (data) => {
    if (!isAdmin() || !data) return;
    if (data.allow) allowedMuteBypass.add(data.playerId);
    else allowedMuteBypass.delete(data.playerId);
    const p = players.get(data.playerId);
    if (p) pushStatus(p);
  });

  socket.on('admin:room:toggle_double_round', () => {
    if (!isAdmin()) return;
    roomState.isDoubleRound = !roomState.isDoubleRound;
    syncRoomState();
  });

  socket.on('admin:room:trigger_sudden_death', (data) => {
    if (!isAdmin()) return;
    data = data || {};
    if (sudden || data.cancel) { endSuddenDeath(null, true); return; }
    const timer = Math.min(Math.max(parseInt(data.timer) || 30, 5), 600);
    const required = Math.min(Math.max(parseInt(data.requiredAnswers) || 1, 1), 50);
    startSuddenDeath(timer, required);
  });

  socket.on('admin:room:update_settings', (data) => {
    if (!isAdmin() || !data) return;
    const w = parseInt(data.winningScore);
    if (w >= 1) roomState.winningScore = Math.min(w, 1000000);
    const pts = parseInt(data.pointsPerAnswer);
    if (pts >= 1) roomState.pointsPerAnswer = Math.min(pts, 100000);
    const m = parseInt(data.maxScorers);
    if (m >= 0) roomState.maxScorers = Math.min(m, 100);
    syncRoomState();
  });

  socket.on('admin:room:reset_scores', () => {
    if (!isAdmin()) return;
    players.forEach(p => { p.score = 0; });
    syncScores();
    updatePlayersList();
  });

  socket.on('admin:room:toggle_lock', () => {
    if (!isAdmin()) return;
    roomState.isLocked = !roomState.isLocked;
    lockPass.clear();
    lockDenied.clear();
    if (roomState.isLocked) players.forEach(p => lockPass.add(p.tokenHash));
    syncRoomState();
    if (!roomState.isLocked) reevaluateGated();
  });

  socket.on('admin:room:kick_all', () => {
    if (!isAdmin()) return;
    sendSystemMessage('🧹 قام الأدمن بتفريغ الغرفة.');
    [...players.values()].forEach(p => {
      if (p.isAdmin) return;
      const s = io.sockets.sockets.get(p.id);
      if (s) { s.emit('kicked'); s.disconnect(true); }
    });
  });

  socket.on('admin:broadcast:send', (data) => {
    if (!isAdmin() || !data) return;
    emitAll('broadcast:received', { message: cleanText(data.message, 500) });
  });

  socket.on('admin:ticker:update', (data) => {
    if (!isAdmin() || !data) return;
    if (typeof data.text === 'string') roomState.tickerText = cleanText(data.text, 300);
    roomState.tickerVisible = !!data.visible;
    const sp = parseInt(data.speed);
    if (sp >= 5) roomState.tickerSpeed = Math.min(sp, 300);
    savePersisted();
    emitAll('ticker:updated', tickerPayload());
  });

  // ==========================================
  // ⚡ تأثير الرعد (للأدمن الأساسي فقط)
  // ==========================================
  socket.on('admin:thunder:update', (data) => {
    if (!isOwner() || !data) return;
    if (typeof data.screen === 'boolean') thunder.screen = data.screen;
    if (typeof data.sound === 'boolean') thunder.sound = data.sound;
    const iv = parseInt(data.interval);
    if (iv >= 10) thunder.interval = Math.min(iv, 600);
    savePersisted();
    emitToOwners('admin:thunder_state', Object.assign({}, thunder));
    scheduleThunder();
  });

  socket.on('admin:thunder:strike', () => {
    if (!isOwner()) return;
    sendThunder();
  });

  socket.on('admin:thunder:hide_for', (data) => {
    if (!isOwner() || !data) return;
    const t = players.get(data.playerId);
    if (!t) return;
    if (data.hide) thunderHidden.add(t.tokenHash);
    else thunderHidden.delete(t.tokenHash);
    savePersisted();
    updatePlayersList();
  });

  // ==========================================
  // 💬 الشات العادي
  // ==========================================
  // ==========================================
  // 🌟 التقدّم: الحالة، اختيار اللقب/التأثير/الشارات، عجلة الحظ
  // ==========================================
  socket.on('progress:get', () => {
    const player = players.get(socket.id);
    if (player) socket.emit('progress:state', stateOf(player));
  });

  socket.on('profile:equip', (data) => {
    const player = players.get(socket.id);
    if (!player || !data || typeof data !== 'object') return;
    const pr = getProg(player);
    if (typeof data.ti === 'string') {
      const t = TITLES.find(x => x.id === data.ti);
      if (data.ti === '' || hasTitle(pr, t)) pr.eq.ti = data.ti;
    }
    if (typeof data.gl === 'string') {
      const g = GLOWS.find(x => x.id === data.gl);
      if (data.gl === '' || hasGlow(pr, g)) pr.eq.gl = data.gl;
    }
    ['nc', 'cf', 'pf', 'cc'].forEach(k => {
      if (typeof data[k] !== 'string') return;
      if (data[k] === '') { pr.eq[k] = ''; return; }
      const it = SHOP_BY.get(data[k]);
      if (it && it.cat === k && pr.own[it.id]) pr.eq[k] = it.id;
    });
    if (Array.isArray(data.bd)) {
      pr.eq.bd = [...new Set(data.bd.filter(id => typeof id === 'string' && pr.b[id]))].slice(0, 3);
    }
    savePersisted();
    pushProgress(player.tokenHash);
    updatePlayersList();
  });

  socket.on('wheel:spin', (_d, cb) => {
    const reply = (o) => { if (typeof cb === 'function') cb(o); };
    const player = players.get(socket.id);
    if (!player) return reply({ ok: false });
    const pr = getProg(player);
    const dn = dayNum();
    if (pr.wd === dn) {
      if ((pr.inv.ticket || 0) <= 0) return reply({ ok: false, reason: 'used' });
      pr.inv.ticket -= 1;                                   // لفّة إضافية بتذكرة
      if (pr.inv.ticket <= 0) delete pr.inv.ticket;
    } else pr.wd = dn;
    const index = pickWheel();
    const z = WHEEL[index];
    pr.s.sp++;
    if (z.coins) addCoins(pr, z.coins, true);
    if (z.xp) addXp(player, pr, z.xp, true);
    grantBadge(player, pr, 'spin1');
    if (z.badge) grantBadge(player, pr, z.badge);
    savePersisted();
    reply({ ok: true, index, prize: { t: z.t, i: z.i, n: z.n, coins: z.coins || 0, xp: z.xp || 0 } });
    pushProgress(player.tokenHash);
  });

  // ---- المتجر ----
  const EQUIP_SLOT = { ti: 'ti', gl: 'gl', nc: 'nc', cf: 'cf', pf: 'pf', cc: 'cc' };
  socket.on('store:buy', (data, cb) => {
    const reply = (o) => { if (typeof cb === 'function') cb(o); };
    const player = players.get(socket.id);
    if (!player || !data) return reply({ ok: false, reason: 'none' });
    const it = SHOP_BY.get(String(data.id));
    if (!it) return reply({ ok: false, reason: 'none' });
    const pr = getProg(player);
    if (it.tr || !(it.p > 0)) return reply({ ok: false, reason: 'nobuy' });
    if (it.lv && pr.lv < it.lv) return reply({ ok: false, reason: 'level', lv: it.lv });
    const cons = isConsumable(it);
    const qty = cons ? Math.max(1, Math.min(Math.floor(Number(data.qty)) || 1, 10)) : 1;
    if (!cons && pr.own[it.id]) return reply({ ok: false, reason: 'owned' });
    if (cons && (pr.inv[it.id] || 0) + qty > it.max) return reply({ ok: false, reason: 'max' });
    const price = priceOf(it) * qty;
    if (pr.coins < price) return reply({ ok: false, reason: 'coins', need: price });
    pr.coins -= price;
    pr.spent += price;
    giveItem(pr, it.id, qty);
    if (!cons && EQUIP_SLOT[it.cat]) pr.eq[EQUIP_SLOT[it.cat]] = it.id;       // بيتلبّس مباشرة وبتغيّره من «ملفي»
    grantBadge(player, pr, 'shop1');
    if (pr.spent >= 2000) grantBadge(player, pr, 'spend2k');
    savePersisted();
    pushProgress(player.tokenHash);
    updatePlayersList();
    reply({ ok: true, id: it.id, price, coins: pr.coins });
  });

  const BOX = [
    { w: 30, c: 40 }, { w: 25, c: 80 }, { w: 15, c: 150 }, { w: 6, c: 300 }, { w: 2, c: 600 },
    { w: 12, xp: 100 }, { w: 6, xp: 300 },
    { w: 8, inv: 'ticket' }, { w: 6, inv: 'shield' }, { w: 5, inv: 'boost_xp' }, { w: 5, inv: 'boost_coin' }, { w: 6, inv: 'dbl' }, { w: 3, inv: 'ice' },
    { w: 6, cos: 1 }
  ];
  const BOX_TOTAL = BOX.reduce((a, x) => a + x.w, 0);
  function openBox(player, pr) {
    let r = crypto.randomInt(BOX_TOTAL), z = BOX[0];
    for (const x of BOX) { r -= x.w; if (r < 0) { z = x; break; } }
    if (z.cos) {
      const pool = BUYABLE.filter(x => !pr.own[x.id] && (!x.lv || x.lv <= pr.lv) && x.p <= 900);
      if (pool.length) { const it = pool[crypto.randomInt(pool.length)]; giveItem(pr, it.id, 1); return { t: `🌟 غرض نادر: ${it.n}`, id: it.id }; }
      z = { c: 100 };
    }
    if (z.c) { addCoins(pr, z.c, true); return { t: `🪙 ${z.c} عملة` }; }
    if (z.xp) { addXp(player, pr, z.xp, true); return { t: `✨ ${z.xp} خبرة` }; }
    const it = SHOP_BY.get(z.inv);
    invAdd(pr, z.inv, 1);
    return { t: `${it.e} ${it.n}` };
  }

  socket.on('store:use', (data, cb) => {
    const reply = (o) => { if (typeof cb === 'function') cb(o); };
    const player = players.get(socket.id);
    if (!player || !data) return reply({ ok: false });
    const it = SHOP_BY.get(String(data.id));
    if (!it || !isConsumable(it)) return reply({ ok: false, reason: 'none' });
    const pr = getProg(player);
    if ((pr.inv[it.id] || 0) <= 0) return reply({ ok: false, reason: 'empty' });
    const take = () => { pr.inv[it.id] -= 1; if (pr.inv[it.id] <= 0) delete pr.inv[it.id]; };
    const now = Date.now();
    let out = { ok: true, id: it.id };
    if (it.id === 'boost_xp' || it.id === 'boost_coin') {
      const k = it.id === 'boost_xp' ? 'bxp' : 'bco';
      pr[k] = Math.max(pr[k], now) + 30 * 60e3;
      take();
      out.t = it.id === 'boost_xp' ? '✨ مضاعف الخبرة شغّال 30 دقيقة' : '🪙 مضاعف العملات شغّال 30 دقيقة';
    } else if (it.id === 'xpbook') {
      take();
      addXp(player, pr, 250, true);
      out.t = '📚 +250 خبرة';
    } else if (it.id === 'dbl') {
      if ((pr.da || 0) >= 5) return reply({ ok: false, reason: 'max' });
      take();
      pr.da = (pr.da || 0) + 1;
      out.t = '⚡ إجابتك الصحيحة الجاية بنقطتين';
    } else if (it.id === 'box') {
      take();
      pr.s.bx = (pr.s.bx || 0) + 1;
      const got = openBox(player, pr);
      out.t = '🎁 ' + got.t;
      out.prize = got;
      if (pr.s.bx >= 10) grantBadge(player, pr, 'box10');
    } else if (it.id === 'ice') {
      const tgt = players.get(String(data.target));
      if (!tgt || tgt.id === player.id || tgt.tokenHash === player.tokenHash) return reply({ ok: false, reason: 'target' });
      if (tgt.isAdmin || tgt.isHiddenFromRoom) return reply({ ok: false, reason: 'immune' });
      if ((tgt.iceUntil || 0) > now) return reply({ ok: false, reason: 'already' });
      if (now - (player.iceAt || 0) < 8000) return reply({ ok: false, reason: 'cooldown' });
      take();
      player.iceAt = now;
      tgt.iceUntil = now + 4000;
      pushStatus(tgt);
      setTimeout(() => { if (players.get(tgt.id) === tgt) pushStatus(tgt); }, 4100);
      emitAll('chatMessage', { system: true, message: `❄️ ${player.name} جمّد ${tgt.name} لمدة 4 ثواني!` });
      out.t = `❄️ جمّدت ${tgt.name}`;
    } else {
      return reply({ ok: false, reason: 'auto' });            // الدرع والتذكرة بيشتغلوا لحالهم
    }
    savePersisted();
    pushProgress(player.tokenHash);
    updatePlayersList();
    reply(out);
  });

  socket.on('profile:view', (data, cb) => {
    const reply = (o) => { if (typeof cb === 'function') cb(o); };
    const me = players.get(socket.id);
    const t = me && data && players.get(String(data.playerId));
    if (!t || (t.isHiddenFromRoom && !ownerSockets.has(socket.id))) return reply({ ok: false });
    reply({ ok: true, p: publicProfile(t) });
  });

  // ---- تحكم الأدمن الأساسي بالإحصائيات والسلاسل (الثانوي ما بقدر) ----
  const adminProgView = (t) => {
    const pr = getProg(t);
    return { id: t.id, name: t.name, lv: pr.lv, xp: pr.xp, coins: pr.coins, streak: streakNow(pr), bs: pr.bs, s: pr.s, score: t.score, wins: t.wins,
             spent: pr.spent, badges: Object.keys(pr.b), own: Object.keys(pr.own), inv: pr.inv };
  };
  const progTarget = (data) => (isOwner() && data ? players.get(String(data.playerId)) : null);
  const progDone = (t, pr) => { savePersisted(); pushProgress(t.tokenHash); updatePlayersList(); };
  const clampN = (v, lo, hi) => { v = Math.floor(Number(v)); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null; };
  const setStreak = (t, pr, n) => {
    pr.streak = n; pr.ld = n > 0 ? dayNum() : -1; pr.bs = Math.max(pr.bs, n);
    if (n >= 3) grantBadge(t, pr, 'st3');
    if (n >= 7) grantBadge(t, pr, 'st7');
    if (n >= 30) grantBadge(t, pr, 'st30');
  };

  socket.on('admin:prog:get', (data, cb) => {
    const reply = (o) => { if (typeof cb === 'function') cb(o); };
    const t = progTarget(data);
    if (!t) return reply({ ok: false });
    reply({ ok: true, d: adminProgView(t) });
  });

  socket.on('admin:prog:set', (data, cb) => {
    const reply = (o) => { if (typeof cb === 'function') cb(o); };
    const t = progTarget(data);
    if (!t || !data.set || typeof data.set !== 'object') return reply({ ok: false });
    const pr = getProg(t), f = data.set;
    let v;
    if ((v = clampN(f.lv, 1, MAX_LEVEL)) !== null) pr.xp = xpForLevel(v);
    else if ((v = clampN(f.xp, 0, 5e6)) !== null) pr.xp = v;
    pr.lv = levelInfo(pr.xp).lv;
    if ((v = clampN(f.coins, 0, 1e9)) !== null) pr.coins = v;
    if ((v = clampN(f.streak, 0, 3650)) !== null) setStreak(t, pr, v);
    if ((v = clampN(f.bs, 0, 3650)) !== null) pr.bs = v;
    [['a', 1e9], ['w', 1e9], ['f', 1e9], ['dc', 1e6], ['sp', 1e6], ['wr', 1e9], ['bt', 99999]].forEach(([k, hi]) => {
      if ((v = clampN(f[k], 0, hi)) !== null) pr.s[k] = v;
    });
    if ((v = clampN(f.score, 0, 1e6)) !== null) { t.score = v; io.to(t.id).emit('updateScore', t.score); }
    if ((v = clampN(f.wins, 0, 1e6)) !== null) t.wins = v;
    progDone(t, pr);
    reply({ ok: true, d: adminProgView(t) });
  });

  socket.on('admin:prog:streak', (data, cb) => {
    const reply = (o) => { if (typeof cb === 'function') cb(o); };
    const t = progTarget(data);
    if (!t) return reply({ ok: false });
    const pr = getProg(t);
    const cur = streakNow(pr);
    let n = null;
    if (data.set !== undefined) n = clampN(data.set, 0, 3650);
    else if (data.add !== undefined) { const a = clampN(data.add, -3650, 3650); if (a !== null) n = Math.min(3650, Math.max(0, cur + a)); }
    if (n === null) return reply({ ok: false });
    setStreak(t, pr, n);
    progDone(t, pr);
    reply({ ok: true, d: adminProgView(t) });
  });

  socket.on('admin:prog:grant', (data, cb) => {
    const reply = (o) => { if (typeof cb === 'function') cb(o); };
    const t = progTarget(data);
    if (!t) return reply({ ok: false });
    const pr = getProg(t), id = String(data.id), give = data.give !== false;
    if (data.kind === 'badge') {
      if (!BADGES.some(b => b.id === id)) return reply({ ok: false });
      if (give) grantBadge(t, pr, id);
      else { delete pr.b[id]; if (Array.isArray(pr.eq.bd)) pr.eq.bd = pr.eq.bd.filter(x => x !== id); }
    } else if (data.kind === 'item') {
      const it = SHOP_BY.get(id);
      if (!it) return reply({ ok: false });
      const qty = clampN(data.qty, 1, 99) || 1;
      if (isConsumable(it)) {
        if (give) invAdd(pr, id, qty);
        else { pr.inv[id] = Math.max(0, (pr.inv[id] || 0) - qty); if (!pr.inv[id]) delete pr.inv[id]; }
      } else if (give) pr.own[id] = pr.own[id] || Date.now();
      else { delete pr.own[id]; Object.keys(pr.eq).forEach(k => { if (pr.eq[k] === id) pr.eq[k] = ''; }); }
    } else return reply({ ok: false });
    progDone(t, pr);
    reply({ ok: true, d: adminProgView(t) });
  });

  socket.on('admin:prog:reset', (data, cb) => {
    const reply = (o) => { if (typeof cb === 'function') cb(o); };
    const t = progTarget(data);
    if (!t) return reply({ ok: false });
    progress.set(t.tokenHash, newProg());
    const pr = getProg(t);
    progDone(t, pr);
    reply({ ok: true, d: adminProgView(t) });
  });

  socket.on('sendMessage', (msg) => {
    const player = players.get(socket.id);
    if (!player || typeof msg !== 'string') return;
    if (effFrozen(player)) return;

    if (effMuted(player)) {
      socket.emit('chatMessage', {
        system: true,
        message: (roomState.isMutedAll && !player.muted)
          ? '🔇 الشات مقفل حالياً، الأدمن فقط يستطيع الكتابة.'
          : '🔇 أنت ممنوع من الكتابة في الشات.'
      });
      return;
    }

    const message = escapeChat(msg.trim().substring(0, 10000));
    if (!message) return;

    const label = adminLabel(player);
    let displayName = player.name;
    if (label) {
      displayName = `${label} ${player.name}`;
    }

    emitAll('chatMessage', { name: displayName, message, system: false, color: player.color, fx: fxOf(player), rawName: player.name, meta: metaOf(player) });
    onChat(player, message);
  });

  // ==========================================
  // 🚪 الانفصال
  // ==========================================
  socket.on('disconnect', () => {
    const g = gated.get(socket.id);
    if (g) {
      gated.delete(socket.id);
      if (g.requested) emitToOwners('admin:request_cancelled', { requestId: socket.id });
    }
    if (pendingAdminApprovals.delete(socket.id)) {
      emitToOwners('admin:request_cancelled', { requestId: socket.id });
    }
    whisperLinks.forEach(k => { if (k.split('|').includes(socket.id)) whisperLinks.delete(k); });

    const player = players.get(socket.id);
    if (player) removePlayer(player, true);

    authenticatedAdmins.delete(socket.id);
    ownerSockets.delete(socket.id);
    allowedMuteBypass.delete(socket.id);
    updatePlayersList();

    if (players.size === 0) {
      if (sudden) endSuddenDeath(null, true);
      roomState.currentWord = '';
      if (wordTimer) {
        clearTimeout(wordTimer);
        wordTimer = null;
      }
    }

    reevaluateGated();
  });
});

app.get('/ping', (req, res) => res.status(200).send('alive'));

// يعرضلك عنوان الـ IP تاعك (افتح /my-ip من جهازك وحطه بمتغير OWNER_IP في Render)
app.get('/my-ip', (req, res) => {
  const fwd = req.headers['x-forwarded-for'];
  const ip = normalizeIp(fwd ? fwd.split(',')[0].trim() : req.socket.remoteAddress);
  res.type('text/plain').send(`عنوان IP تاعك: ${ip}`);
});

async function start() {
  await loadPersisted();
  scheduleThunder();
  setInterval(presenceTick, 30000);
  server.listen(PORT, () => console.log(`🚀 Server running successfully on port: ${PORT}`));
}
start();

// لما Render يسكّر السيرفر بنحفظ كل شي قبل ما يطفي
async function shutdown() {
  try { await flushPersisted(); } catch (e) {}
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
