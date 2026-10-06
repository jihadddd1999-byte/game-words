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

/* ==========================================================================
   🎮 سيرفر الألعاب المتنوعة (الشطرنج حالياً)
   - مباريات ضد الكمبيوتر أو ضد لاعبين من الروم (بدعوة)
   - مشاهدون، وشات خاص باللاعبين الاثنين فقط
   - السيرفر هو اللي بيتحقق من كل حركة (ما حدا يقدر يغش)
   ========================================================================== */
'use strict';

const path = require('path');
const fs = require('fs');

// محرك الشطرنج: بندوّر عليه بمجلد public (المكان الصحيح) أو بجانب السيرفر
const ENGINE_CANDIDATES = [path.join(__dirname, 'public', 'chess-engine.js'), path.join(__dirname, 'chess-engine.js')];
const ENGINE_PATH = ENGINE_CANDIDATES.find(p => fs.existsSync(p));
if (!ENGINE_PATH) {
  throw new Error('ملف chess-engine.js غير موجود. ضعه داخل مجلد public (بجانب game.js).');
}
const Chess = require(ENGINE_PATH);

// ---------- محرك إكس أو (مدمج هنا، ما في ملف إضافي) ----------
const Xo = (() => {
/* ==========================================================================
   ✕◯ محرك لعبة إكس أو: القواعد + الذكاء الاصطناعي (5 مستويات)
   اللاعب الأول (slot 0) = X ويبدأ، والثاني (slot 1) = O
   ========================================================================== */

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

function winLine(b) {
  for (const l of LINES) {
    if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return l;
  }
  return null;
}

class XoGame {
  constructor() {
    this.board = new Array(9).fill('');
    this.turn = 0;          // 0 = X, 1 = O
    this.count = 0;
    this.lastMove = null;
    this.line = null;
  }
  mark(turn) { return turn === 0 ? 'X' : 'O'; }
  // يرجع null إذا الحركة غير صالحة
  play(cell) {
    if (!Number.isInteger(cell) || cell < 0 || cell > 8 || this.board[cell]) return null;
    this.board[cell] = this.mark(this.turn);
    this.count++;
    this.lastMove = cell;
    this.line = winLine(this.board);
    if (this.line) return { over: true, result: this.turn === 0 ? '1-0' : '0-1', reason: 'line' };
    if (this.count === 9) return { over: true, result: '1/2-1/2', reason: 'full' };
    this.turn = 1 - this.turn;
    return { over: false };
  }
}

const empties = (b) => { const o = []; for (let i = 0; i < 9; i++) if (!b[i]) o.push(i); return o; };
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// خانة تكمل ثلاثة لهذا اللاعب (للفوز أو للحجب)
function findWin(b, mark) {
  for (const l of LINES) {
    const cells = l.map(i => b[i]);
    if (cells.filter(c => c === mark).length === 2 && cells.includes('')) return l[cells.indexOf('')];
  }
  return -1;
}

// منطق بسيط: فوز، حجب، وسط، زاوية، أي خانة
function smartMove(b, mark) {
  const opp = mark === 'X' ? 'O' : 'X';
  let m = findWin(b, mark); if (m >= 0) return m;
  m = findWin(b, opp); if (m >= 0) return m;
  if (!b[4]) return 4;
  const corners = [0, 2, 6, 8].filter(i => !b[i]);
  if (corners.length) return pick(corners);
  return pick(empties(b));
}

// لعب مثالي: ما بيخسر أبداً
function minimax(b, turnMark, me, depth) {
  const line = winLine(b);
  if (line) return b[line[0]] === me ? 10 - depth : depth - 10;
  const free = empties(b);
  if (!free.length) return 0;
  const opp = me === 'X' ? 'O' : 'X';
  let best = turnMark === me ? -Infinity : Infinity;
  for (const i of free) {
    b[i] = turnMark;
    const sc = minimax(b, turnMark === 'X' ? 'O' : 'X', me, depth + 1);
    b[i] = '';
    best = turnMark === me ? Math.max(best, sc) : Math.min(best, sc);
  }
  return best;
}
function perfectMove(b, mark) {
  const free = empties(b);
  if (free.length === 9) return pick([0, 2, 4, 6, 8]);
  let best = -Infinity, bestCells = [];
  for (const i of free) {
    b[i] = mark;
    const sc = minimax(b, mark === 'X' ? 'O' : 'X', mark, 1);
    b[i] = '';
    if (sc > best) { best = sc; bestCells = [i]; } else if (sc === best) bestCells.push(i);
  }
  return pick(bestCells);
}

// level: 1 مبتدئ ... 5 خبير
function bestMove(board, mark, level) {
  const b = board.slice();
  const free = empties(b);
  if (!free.length) return -1;
  const r = Math.random();
  switch (level) {
    case 1: return pick(free);
    case 2: return r < 0.45 ? smartMove(b, mark) : pick(free);
    case 3: return r < 0.15 ? pick(free) : smartMove(b, mark);
    case 4: return r < 0.12 ? pick(free) : perfectMove(b, mark);
    default: return perfectMove(b, mark);
  }
}

return { XoGame, bestMove, winLine, LINES };

})();
const GAMES = ['chess', 'xo'];

const createGamesHub = function ({ io, players, effMuted, effFrozen, cleanText }) {
  const sessions = new Map();
  const invites = new Map();
  let seq = 0;

  const RESUME_MS = 90 * 1000;          // مهلة العودة بعد رفرش أو انقطاع
  const INVITE_MS = 60 * 1000;          // مدة صلاحية الدعوة
  const FINISHED_KEEP_MS = 10 * 60 * 1000;
  const MAX_SESSIONS = 30;

  const room = (id) => 'gm:' + id;
  const sockOf = (id) => (id ? io.sockets.sockets.get(id) : null);
  const err = (socket, id, message) => socket.emit('games:error', { id: id || null, message });

  function slotIndexOf(s, socketId) {
    return s.slots.findIndex(sl => sl.id && sl.id === socketId);
  }
  const turnIdxOf = (s) => (s.game === 'xo' ? s.g.turn : (s.g.pos.turn === 1 ? 0 : 1));
  const movesOf = (s) => (s.game === 'xo' ? s.g.count : s.g.sanList.length);
  function isBusy(socketId) {
    for (const s of sessions.values()) {
      if (s.status === 'active' && slotIndexOf(s, socketId) >= 0) return true;
    }
    return false;
  }

  // ---------- تلخيص المباريات الجارية ----------
  function slotInfo(sl) {
    const p = sl.id ? players.get(sl.id) : null;
    if (p) sl.name = p.name;
    return { name: sl.name, ai: !!sl.ai, level: sl.level || 0 };
  }
  function liveSummary() {
    const list = [];
    const busy = [];
    sessions.forEach((s) => {
      if (s.status !== 'active') return;
      list.push({
        id: s.id, game: s.game, mode: s.mode,
        white: slotInfo(s.slots[0]), black: slotInfo(s.slots[1]),
        moves: movesOf(s), spectators: s.spectators.size
      });
      s.slots.forEach(sl => { if (sl.id) busy.push(sl.id); });
    });
    return { sessions: list, busy };
  }
  let liveTimer = null;
  function scheduleLive() {
    if (liveTimer) return;
    liveTimer = setTimeout(() => {
      liveTimer = null;
      io.to('game').emit('games:live', liveSummary());
    }, 150);
  }

  // ---------- حالة المباراة ----------
  function serialize(s) {
    const base = {
      id: s.id, game: s.game, mode: s.mode, status: s.status, result: s.result, reason: s.reason,
      slots: s.slots.map(sl => {
        const info = slotInfo(sl);
        return { id: sl.id, name: info.name, ai: info.ai, level: info.level, online: !!sl.ai || !!sl.id };
      }),
      hostSlot: s.hostSlot, drawOffer: s.drawOffer, spectators: s.spectators.size
    };
    if (s.game === 'xo') {
      return Object.assign(base, {
        board: s.g.board.slice(), turn: s.g.turn === 0 ? 'x' : 'o', line: s.g.line,
        lastMove: s.g.lastMove, moves: s.g.count
      });
    }
    return Object.assign(base, {
      fen: s.g.fen(), turn: s.g.pos.turn === 1 ? 'w' : 'b',
      moves: s.g.sanList.slice(), lastMove: s.g.lastMove,
      check: s.g.pos.inCheck(), captured: s.g.captured, rep2: s.g.rep2()
    });
  }
  function broadcast(s) {
    io.to(room(s.id)).emit('games:state', serialize(s));
    scheduleLive();
  }

  function finish(s, result, reason) {
    if (s.status !== 'active') return;
    s.status = 'finished';
    s.result = result;
    s.reason = reason;
    s.finishedAt = Date.now();
    s.drawOffer = null;
    broadcast(s);
  }

  function removeSession(s) {
    clearTimeout(s.aiTimer);
    io.to(room(s.id)).emit('games:closed', { id: s.id });
    const ids = [];
    s.slots.forEach(sl => { if (sl.id) ids.push(sl.id); });
    s.spectators.forEach(id => ids.push(id));
    ids.forEach(id => { const k = sockOf(id); if (k) k.leave(room(s.id)); });
    sessions.delete(s.id);
    scheduleLive();
  }

  function createSession({ game, mode, slots, hostSlot }) {
    const id = 'g' + (++seq) + Math.random().toString(36).slice(2, 6);
    const s = {
      id, game, mode, status: 'active', result: null, reason: '',
      slots, hostSlot, g: game === 'xo' ? new Xo.XoGame() : new Chess.Game(), aiTimer: null, spectators: new Set(),
      drawOffer: null, chat: [], createdAt: Date.now(), finishedAt: 0
    };
    sessions.set(id, s);
    slots.forEach(sl => { const k = sockOf(sl.id); if (k) k.join(room(id)); });
    return s;
  }

  function humanSlot(socketId) {
    const p = players.get(socketId);
    return { token: p.tokenHash, id: socketId, name: p.name, ai: false, level: 0, offlineAt: null, left: false };
  }

  function startAi(socket, level, color, game) {
    if (sessions.size >= MAX_SESSIONS) return err(socket, null, 'عدد المباريات وصل للحد الأقصى، حاول بعد شوي.');
    const humanWhite = color === 'random' ? Math.random() < 0.5 : color !== 'black';
    const human = humanSlot(socket.id);
    const ai = { token: null, id: null, name: 'الكمبيوتر', ai: true, level, offlineAt: null, left: false };
    const s = createSession({
      game, mode: 'ai', slots: humanWhite ? [human, ai] : [ai, human], hostSlot: humanWhite ? 0 : 1
    });
    io.to(room(s.id)).emit('games:started', { id: s.id });
    broadcast(s);
    kickAi(s);
    return s;
  }

  function startPvp(inviterId, inviteeId, pref, game) {
    const white = pref === 'random' ? Math.random() < 0.5 : pref !== 'black';
    const a = humanSlot(inviterId), b = humanSlot(inviteeId);
    const s = createSession({ game, mode: 'pvp', slots: white ? [a, b] : [b, a], hostSlot: -1 });
    io.to(room(s.id)).emit('games:started', { id: s.id });
    broadcast(s);
    return s;
  }

  // ---------- الدعوات ----------
  function dropInvite(inv, status) {
    clearTimeout(inv.timer);
    invites.delete(inv.id);
    if (status) {
      const a = sockOf(inv.from), b = sockOf(inv.to);
      if (a) a.emit('games:invite_result', { id: inv.id, status });
      if (b) b.emit('games:invite_result', { id: inv.id, status });
    }
  }
  function cancelInvitesOf(socketId) {
    [...invites.values()].forEach(inv => {
      if (inv.from === socketId || inv.to === socketId) dropInvite(inv, 'cancelled');
    });
  }
  function sendInvite(socket, targetId, pref, game) {
    const me = players.get(socket.id), target = players.get(targetId);
    if (!me || !target || target.id === me.id || target.isHiddenFromRoom) return err(socket, null, 'اللاعب غير متاح.');
    if (isBusy(me.id)) return err(socket, null, 'أنت داخل مباراة جارية.');
    if (isBusy(target.id)) return err(socket, null, `${target.name} داخل مباراة جارية.`);
    if (sessions.size >= MAX_SESSIONS) return err(socket, null, 'عدد المباريات وصل للحد الأقصى، حاول بعد شوي.');
    [...invites.values()].forEach(inv => { if (inv.from === me.id) dropInvite(inv, 'cancelled'); });

    const id = 'i' + (++seq) + Math.random().toString(36).slice(2, 6);
    const inv = { id, from: me.id, to: target.id, game: GAMES.includes(game) ? game : 'chess', pref: ['white', 'black', 'random'].includes(pref) ? pref : 'random' };
    inv.timer = setTimeout(() => dropInvite(inv, 'expired'), INVITE_MS);
    invites.set(id, inv);
    io.to(target.id).emit('games:invite', { id, game: inv.game, from: { id: me.id, name: me.name }, pref: inv.pref });
    socket.emit('games:invite_sent', { id, to: { id: target.id, name: target.name } });
  }

  // ---------- تنفيذ الحركات ----------
  function applyMove(s, socket, data) {
    if (s.game === 'xo') {
      const r = s.g.play(typeof data.cell === 'number' ? data.cell : parseInt(data.cell, 10));
      if (!r) {
        err(socket, s.id, 'هذه الخانة غير متاحة.');
        socket.emit('games:state', serialize(s));
        return;
      }
      if (r.over) finish(s, r.result, r.reason);
      else { broadcast(s); kickAi(s); }
      return;
    }
    const r = s.g.move(data.from, data.to, data.promo);
    if (!r) {
      err(socket, s.id, 'حركة غير قانونية.');
      socket.emit('games:state', serialize(s)); // مزامنة اللوحة عند اللاعب
      return;
    }
    s.drawOffer = null;
    const st = s.g.status();
    if (st.over) finish(s, st.result, st.reason);
    else broadcast(s);
  }

  // حركة الكمبيوتر في إكس أو (بسيطة، فالسيرفر بيحسبها بنفسه)
  function kickAi(s) {
    if (s.game !== 'xo' || s.mode !== 'ai' || s.status !== 'active' || s.aiTimer) return;
    if (!s.slots[s.g.turn].ai) return;
    s.aiTimer = setTimeout(() => {
      s.aiTimer = null;
      if (!sessions.has(s.id) || s.status !== 'active') return;
      const slot = s.slots[s.g.turn];
      if (!slot.ai) return;
      const cell = Xo.bestMove(s.g.board, s.g.mark(s.g.turn), slot.level || 3);
      const r = s.g.play(cell);
      if (!r) return;
      if (r.over) finish(s, r.result, r.reason);
      else { broadcast(s); kickAi(s); }
    }, 750);
  }

  function forfeit(s, idx) {
    if (s.status !== 'active') return;
    if (s.mode === 'ai') { removeSession(s); return; }
    finish(s, idx === 0 ? '0-1' : '1-0', 'abandon');
  }

  function detach(s, idx) {
    const sl = s.slots[idx];
    const k = sockOf(sl.id);
    if (k) k.leave(room(s.id));
    sl.id = null;
    sl.left = true;
    const anyHuman = s.slots.some(x => !x.ai && !x.left);
    if (!anyHuman) removeSession(s);
    else broadcast(s);
  }

  // ======================================================================
  // 🔌 تسجيل أحداث الاتصال
  // ======================================================================
  function attachSocket(socket) {
    const me = () => players.get(socket.id);
    const get = (data) => (data && typeof data.id === 'string' ? sessions.get(data.id) : null);

    socket.on('games:live_request', () => {
      if (!me()) return;
      socket.emit('games:live', liveSummary());
    });

    socket.on('games:create_ai', (data) => {
      if (!me() || !data) return;
      if (!GAMES.includes(data.game)) return err(socket, null, 'هذه اللعبة غير متاحة بعد.');
      if (isBusy(socket.id)) return err(socket, null, 'أنت داخل مباراة جارية.');
      const level = Math.min(5, Math.max(1, parseInt(data.level) || 3));
      const color = ['white', 'black', 'random'].includes(data.color) ? data.color : 'white';
      startAi(socket, level, color, data.game);
    });

    socket.on('games:invite', (data) => {
      if (!me() || !data || !GAMES.includes(data.game)) return;
      sendInvite(socket, data.to, data.color, data.game);
    });

    socket.on('games:invite_cancel', (data) => {
      const inv = data && invites.get(data.id);
      if (inv && inv.from === socket.id) dropInvite(inv, 'cancelled');
    });

    socket.on('games:invite_reply', (data) => {
      const inv = data && invites.get(data.id);
      if (!inv || inv.to !== socket.id || !me()) return;
      if (!data.accept) {
        const a = sockOf(inv.from);
        const nm = me().name;
        dropInvite(inv, null);
        if (a) a.emit('games:invite_result', { id: inv.id, status: 'declined', by: nm });
        return;
      }
      if (!players.get(inv.from) || isBusy(inv.from) || isBusy(inv.to)) {
        dropInvite(inv, 'cancelled');
        return err(socket, null, 'ما عاد ممكن تبدأ هذه المباراة.');
      }
      const pref = inv.pref;
      const game = inv.game;
      const from = inv.from, to = inv.to;
      dropInvite(inv, null);
      const a = sockOf(from);
      if (a) a.emit('games:invite_result', { id: inv.id, status: 'accepted' });
      startPvp(from, to, pref, game);
    });

    socket.on('games:move', (data) => {
      const s = get(data);
      if (!s || s.status !== 'active' || !me()) return;
      const idx = slotIndexOf(s, socket.id);
      if (idx < 0) return;
      if (idx !== turnIdxOf(s)) return err(socket, s.id, 'مش دورك الآن.');
      applyMove(s, socket, data);
    });

    // حركة الكمبيوتر: بيحسبها جهاز اللاعب (عشان ما نثقل السيرفر) والسيرفر بيتحقق منها
    socket.on('games:ai_move', (data) => {
      const s = get(data);
      if (!s || s.game !== 'chess' || s.status !== 'active' || s.mode !== 'ai' || !me()) return;
      if (s.slots[s.hostSlot].id !== socket.id) return;
      if (!s.slots[turnIdxOf(s)].ai) return;
      applyMove(s, socket, data);
    });

    socket.on('games:resign', (data) => {
      const s = get(data);
      if (!s || s.status !== 'active') return;
      const idx = slotIndexOf(s, socket.id);
      if (idx < 0) return;
      finish(s, idx === 0 ? '0-1' : '1-0', 'resign');
    });

    socket.on('games:draw_offer', (data) => {
      const s = get(data);
      if (!s || s.game !== 'chess' || s.status !== 'active' || s.mode !== 'pvp') return;
      const idx = slotIndexOf(s, socket.id);
      if (idx < 0 || s.drawOffer !== null) return;
      s.drawOffer = idx;
      broadcast(s);
    });

    socket.on('games:draw_reply', (data) => {
      const s = get(data);
      if (!s || s.status !== 'active' || s.mode !== 'pvp' || s.drawOffer === null) return;
      const idx = slotIndexOf(s, socket.id);
      if (idx < 0 || idx === s.drawOffer) return;
      if (data.accept) finish(s, '1/2-1/2', 'agreement');
      else { s.drawOffer = null; broadcast(s); }
    });

    // الشات: فقط بين اللاعبين الاثنين (المشاهدون ما بيشوفوه ولا بيوصلهم)
    socket.on('games:chat', (data) => {
      const s = get(data);
      const p = me();
      if (!s || !p || s.mode !== 'pvp') return;
      const idx = slotIndexOf(s, socket.id);
      if (idx < 0) return;
      if (effFrozen(p)) return;
      if (effMuted(p)) return err(socket, s.id, 'أنت ممنوع من الكتابة.');
      const text = cleanText(data.text, 300);
      if (!text) return;
      const msg = { from: idx, name: p.name, text, ts: Date.now() };
      s.chat.push(msg);
      if (s.chat.length > 100) s.chat.shift();
      s.slots.forEach(sl => { if (sl.id) io.to(sl.id).emit('games:chat', { id: s.id, msg }); });
    });

    socket.on('games:spectate', (data) => {
      const s = get(data);
      if (!s || !me()) return;
      const idx = slotIndexOf(s, socket.id);
      if (idx >= 0) { socket.emit('games:state', serialize(s)); return; }
      if (isBusy(socket.id)) return err(socket, s.id, 'أنت داخل مباراة جارية.');
      if (s.status === 'finished' && Date.now() - s.finishedAt > FINISHED_KEEP_MS) return;
      s.spectators.add(socket.id);
      socket.join(room(s.id));
      socket.emit('games:state', serialize(s));
      broadcast(s);
    });

    socket.on('games:leave', (data) => {
      const s = get(data);
      if (!s) return;
      if (s.spectators.has(socket.id)) {
        s.spectators.delete(socket.id);
        socket.leave(room(s.id));
        broadcast(s);
        return;
      }
      const idx = slotIndexOf(s, socket.id);
      if (idx < 0) return;
      if (s.mode === 'ai') { removeSession(s); return; }
      if (s.status === 'active') finish(s, idx === 0 ? '0-1' : '1-0', 'resign');
      detach(s, idx);
    });

    socket.on('games:rematch', (data) => {
      const s = get(data);
      if (!s || s.status !== 'finished' || !me()) return;
      const idx = slotIndexOf(s, socket.id);
      if (idx < 0 || isBusy(socket.id)) return;
      if (s.mode === 'ai') {
        const level = s.slots[s.hostSlot === 0 ? 1 : 0].level || 3;
        const wasWhite = s.hostSlot === 0;
        const game = s.game;
        removeSession(s);
        startAi(socket, level, wasWhite ? 'black' : 'white', game);
        return;
      }
      const other = s.slots[idx === 0 ? 1 : 0];
      if (!other.id) return err(socket, s.id, 'الخصم غير متواجد.');
      sendInvite(socket, other.id, idx === 0 ? 'black' : 'white', s.game);
    });
  }

  // ---------- دخول/خروج اللاعب ----------
  // بعد الرفرش: بيرجع اللاعب لمباراته إذا كانت لسا مستمرة
  function onJoin(socket, player) {
    socket.emit('games:live', liveSummary());
    sessions.forEach((s) => {
      s.slots.forEach((sl, idx) => {
        if (sl.ai || sl.left || sl.token !== player.tokenHash) return;
        if (s.status === 'finished' && Date.now() - s.finishedAt > FINISHED_KEEP_MS) return;
        sl.id = socket.id;
        sl.offlineAt = null;
        sl.name = player.name;
        socket.join(room(s.id));
        socket.emit('games:resume', { state: serialize(s), chat: s.mode === 'pvp' ? s.chat : [] });
        broadcast(s);
        kickAi(s);
      });
    });
  }

  function onLeave(socketId, immediate) {
    cancelInvitesOf(socketId);
    sessions.forEach((s) => {
      if (s.spectators.delete(socketId)) broadcast(s);
      const idx = slotIndexOf(s, socketId);
      if (idx < 0) return;
      const sl = s.slots[idx];
      sl.id = null;
      sl.offlineAt = Date.now();
      if (immediate) forfeit(s, idx);
      else broadcast(s);
    });
  }

  // تنظيف دوري: انتهاء مهلة العودة، وحذف المباريات المنتهية القديمة
  setInterval(() => {
    const now = Date.now();
    [...sessions.values()].forEach((s) => {
      if (s.status === 'active') {
        s.slots.forEach((sl, idx) => {
          if (!sl.ai && !sl.left && !sl.id && sl.offlineAt && now - sl.offlineAt > RESUME_MS) forfeit(s, idx);
        });
      } else if (s.finishedAt && now - s.finishedAt > FINISHED_KEEP_MS) {
        removeSession(s);
      }
    });
  }, 5000).unref();

  return { attachSocket, onJoin, onLeave };
};

module.exports = createGamesHub;
module.exports.enginePath = ENGINE_PATH;
