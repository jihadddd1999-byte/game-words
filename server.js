/* ==========================================================================
   🛡️ سيرفر لعبة الكلمات السريعة - النسخة الكاملة والمشاملة بدون حذف
   كلمة السر: 20018151070792005932
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

  (raw.ownerHashes || []).forEach(h => ownerHashes.add(h));
  if (raw.ownerHash) ownerHashes.add(raw.ownerHash); // صيغة الحفظ القديمة
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

// زر لوحة الأدمن بيظهر فقط: للأدمن الأساسي، للأدمنية، للـ VIP، وللمسموح لهم. (وأول مرة قبل ما يتحدد أدمن أساسي)
function canSeePanel(p) {
  if (p.isAdmin || p.ownerIdent || p.ownerIpMatch || p.isVip || persisted.allowed[p.tokenHash]) return true;
  return ownerHashes.size === 0 && !ownerIpsConfigured();
}
function emitAdminButton(p) { io.to(p.id).emit('admin:button', { visible: canSeePanel(p) }); }
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
const effFrozen = (p) => p.frozen || (roomState.isFrozenAll && !p.isAdmin);

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

function getFormattedPlayersList(forAdmin = false) {
  const list = [];
  players.forEach((p) => {
    if (!forAdmin && p.isHiddenFromRoom) return;

    let displayName = p.name;
    if (p.isAdmin && !p.hideAdminBadge) {
      displayName = `[الأدمن] ${p.name}`;
    }

    const item = {
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
      isAdmin: forAdmin ? p.isAdmin : (p.isAdmin && !p.hideAdminBadge),
      color: specialNamesColors[p.name] || p.color || '#00e5ff'
    };
    if (forAdmin) {
      item.hideAdminBadge = p.hideAdminBadge;
      item.isHiddenFromRoom = p.isHiddenFromRoom;
      item.isOwner = ownerSockets.has(p.id);
      item.allowedAbsent = !!persisted.allowed[p.tokenHash];
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
  // الأدمن الأساسي (بجهازه أو بعنوان الـ IP تاعه) محمي من أي أمر
  if (ownerSockets.has(target.id) || target.ownerIdent || target.ownerIpMatch) return false;
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
    sendSystemMessage(`👑 الأدمن وضع (${p.name}) كـ VIP، يستطيع اللاعب الآن الدخول للأدمن بشرط موافقة الأدمن.`);
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
    } else if (validOwnerProof(tokenHash, data.proof)) {
      // السيرفر نسي بس بصمتك صحيحة: بنرجّعك أدمن أساسي
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
    player.canAnswer = false;
    socket.emit('correctAnswer', { timeUsed });

    if (sudden) {
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
    const addedPoints = roomState.isDoubleRound ? basePoints * 2 : basePoints;

    player.score += addedPoints;
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

    // مين مسموح له يجرب أصلاً: الأدمن الأساسي، الـ VIP، المسموح لهم، (وأول مرة قبل ما يتحدد أدمن أساسي)
    const openClaim = ownerHashes.size === 0 && !ownerIpsConfigured();
    const mayTry = openClaim || player.ownerIdent || player.ownerIpMatch || player.isVip || !!persisted.allowed[player.tokenHash];
    if (!mayTry) return reply({ success: false, reason: 'not_allowed' });
    if (!data || data.password !== ADMIN_PASSWORD) return reply({ success: false });

    // الأدمن الأساسي: جهازه معروف، أو من عنوان IP تاعه، أو أول مرة
    if (player.ownerIdent || player.ownerIpMatch || openClaim) {
      becomeOwner(socket, player);
      return reply({ success: true, isOwner: true });
    }

    // لاعب ثاني (VIP): لازم موافقة الأدمن الأساسي إذا موجود
    if (ownerPresent()) {
      if (pendingAdminApprovals.has(socket.id)) return reply({ success: true, pending: true });
      pendingAdminApprovals.set(socket.id, { name: player.name });
      emitToOwners('admin:approval_request', { requestId: socket.id, name: player.name });
      return reply({ success: true, pending: true });
    }

    // الأدمن الأساسي غايب: ما بدخل اللوحة إلا إذا هو مسمّحله من قبل
    if (persisted.allowed[player.tokenHash]) {
      grantAdmin(socket, false);
      return reply({ success: true, isOwner: false });
    }
    return reply({ success: false, reason: 'owner_absent' });
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
    if (!isAdmin() || !data) return;
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
  // 💬 الشات العادي
  // ==========================================
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

    let displayName = player.name;
    if (player.isAdmin && !player.hideAdminBadge) {
      displayName = `[الأدمن] ${player.name}`;
    }

    emitAll('chatMessage', { name: displayName, message, system: false, color: player.color });
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
