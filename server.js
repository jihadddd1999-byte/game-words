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

const persisted = { ownerHash: null, ownerName: '', allowed: {}, stealthMode: 0 };

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

function loadPersisted() {
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (raw.ownerHash) persisted.ownerHash = raw.ownerHash;
    persisted.ownerName = raw.ownerName || '';
    persisted.allowed = raw.allowed || {};
    persisted.stealthMode = raw.stealthMode || 0;
    if (raw.ticker) {
      if (typeof raw.ticker.text === 'string') roomState.tickerText = raw.ticker.text;
      roomState.tickerVisible = !!raw.ticker.visible;
      if (raw.ticker.speed) roomState.tickerSpeed = raw.ticker.speed;
    }
    (raw.bans || []).forEach(b => { if (b && b.id) bans.set(b.id, b); });
    (raw.kicks || []).forEach(k => { if (k && k.tokenHash) kicks.set(k.tokenHash, k); });
  } catch (e) { /* أول تشغيل */ }
}

let saveTimer = null;
function savePersisted() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(STATE_FILE, JSON.stringify({
        ownerHash: persisted.ownerHash,
        ownerName: persisted.ownerName,
        allowed: persisted.allowed,
        stealthMode: persisted.stealthMode,
        ticker: { text: roomState.tickerText, visible: roomState.tickerVisible, speed: roomState.tickerSpeed },
        bans: [...bans.values()],
        kicks: [...kicks.values()]
      }));
    } catch (e) {
      console.error('تعذر حفظ البيانات:', e.message);
    }
  }, 400);
}

loadPersisted();

// ==========================================================================
// 🛠️ الدوال المساعدة
// ==========================================================================

function getClientIP(socket) {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return socket.handshake.address || socket.request.connection.remoteAddress;
}

const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex').slice(0, 32);
const isOwnerHash = (h) => !!persisted.ownerHash && h === persisted.ownerHash;
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
function syncRoomState() { emitAll('roomState:sync', publicState()); }
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
  if (ownerSockets.has(p.id)) { persisted.ownerName = p.name; savePersisted(); }
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
    if (b.tokenHash === tokenHash || (b.ip && b.ip === ip)) return b;
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
  if (ownerSockets.has(target.id)) return false;
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
  if (isOwnerHash(h)) return { ok: true };

  const ban = findBan(ident.ip, h);
  if (ban) return { ok: false, type: 'banned', reason: ban.reason || '' };

  const kick = findKick(h);
  if (kick) return { ok: false, type: 'kicked', reason: kick.reason || '', canRequest: !kick.requestDenied, denied: !!kick.requestDenied };

  if (persisted.ownerHash && !ownerPresent() && !persisted.allowed[h]) {
    return { ok: false, type: 'owner_absent' };
  }

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
    case 'owner_absent':
      out.title = '🛡️ لا يمكن الدخول الآن';
      out.message = 'الأدمن الأساسي غير متواجد حالياً، لا يمكن الدخول إلى الغرفة في الوقت الحالي.';
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

  const owner = isOwnerHash(player.tokenHash);
  if (owner) {
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

  if (owner) {
    socket.emit('admin:session', { isOwner: true, stealthMode: player.stealthMode });
    sendAdminBootstrap(socket, true);
    socket.emit('chatMessage', { system: true, message: `👑 مرحباً بالأدمن الأساسي ${player.name}!` });
  }

  updatePlayersList();
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
  socket.emit('admin:session', { isOwner: !!owner, stealthMode: p.stealthMode || 0 });
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

io.on('connection', (socket) => {
  const clientIP = getClientIP(socket);
  const isAdmin = () => authenticatedAdmins.has(socket.id);
  const isOwner = () => ownerSockets.has(socket.id);

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
    const ident = {
      tokenHash: hashToken(token),
      ip: clientIP,
      name: cleanName(data.name, 20),
      color: validColor(data.color)
    };
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
    if (!data || data.password !== ADMIN_PASSWORD) return reply({ success: false });

    if (isAdmin()) return reply({ success: true, isOwner: isOwner() });

    // أول شخص يكتب كلمة المرور الصحيحة يصير الأدمن الأساسي للأبد
    if (!persisted.ownerHash) {
      persisted.ownerHash = player.tokenHash;
      persisted.ownerName = player.name;
      savePersisted();
      grantAdmin(socket, true);
      return reply({ success: true, isOwner: true });
    }

    // الأدمن الأساسي نفسه (من جهاز مختلف أو بعد مسح الكاش لكن بنفس التوكن)
    if (player.tokenHash === persisted.ownerHash) {
      grantAdmin(socket, true);
      return reply({ success: true, isOwner: true });
    }

    // أي لاعب آخر: لازم موافقة الأدمن الأساسي
    if (!ownerPresent()) return reply({ success: false, reason: 'owner_absent' });
    if (pendingAdminApprovals.has(socket.id)) return reply({ success: true, pending: true });

    pendingAdminApprovals.set(socket.id, { name: player.name });
    emitToOwners('admin:approval_request', { requestId: socket.id, name: player.name });
    reply({ success: true, pending: true });
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
    updatePlayersList();
  });

  socket.on('admin:owner:allow_entry', (data) => {
    if (!isOwner() || !data) return;
    const t = players.get(data.playerId);
    if (!t) return;
    if (data.allow) persisted.allowed[t.tokenHash] = { name: t.name };
    else delete persisted.allowed[t.tokenHash];
    savePersisted();
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

server.listen(PORT, () => console.log(`🚀 Server running successfully on port: ${PORT}`));
