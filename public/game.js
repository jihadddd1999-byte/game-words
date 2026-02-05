const socket = io();

// ===== Keep server alive (Render fix) =====
setInterval(() => {
    fetch("/ping").catch(() => {});
}, 4 * 60 * 1000); // كل 4 دقائق

// --- عناصر DOM ---
const wordDisplay = document.getElementById('current-word');
const inputAnswer = document.getElementById('input-answer');
const pointsDisplay = document.getElementById('points-display');
const answerTimeDisplay = document.getElementById('answer-time');

const btnChat = document.getElementById('btn-chat');
const chatContainer = document.getElementById('chat-container');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const btnCloseChat = document.getElementById('btn-close-chat');

const btnChangeName = document.getElementById('btn-change-name');
const changeNameDialog = document.getElementById('change-name-dialog');
const changeNameForm = document.getElementById('change-name-form');
const inputName = document.getElementById('input-name');
const cancelNameBtn = document.getElementById('cancel-name');
const inputColor = document.getElementById('input-color');

const btnInstructions = document.getElementById('btn-instructions');
const instructionsDialog = document.getElementById('instructions-dialog');
const closeInstructionsBtn = document.getElementById('close-instructions');

const btnZizo = document.getElementById('btn-zizo');

const playersList = document.getElementById('players-list');

// --- المتغيرات الأساسية ---
let playerId = null;
let currentWord = '';
let startTime = 0;
let myScore = 0;
let playerName = localStorage.getItem('playerName') || `لاعب${Math.floor(Math.random() * 1000)}`;
let playerColor = localStorage.getItem('playerColor') || '#00e5ff';
let canAnswer = true;

// ألوان خاصة لأسماء محددة
const specialNameColors = {
    "جهاد": "#00ffe7",
    "ز": "#ff3366",
    "أسامة": "#cc33ff",
    "مصطفى": "#33ff99",
    "حلا": "#ff33cc",
    "نور": "#ffff33",
    "كول": "#33ccff"
};

// --- دوال مساعدة ---
let isUserAtBottom = true;
function scrollChatToBottom() {
    if (isUserAtBottom) chatMessages.scrollTop = chatMessages.scrollHeight;
}

function colorizeName(name, color = null) {
    if (name === "كول") return `<span class="kol-wrapper"><span class="kol-name">كول</span></span>`;
    if (!color) color = specialNameColors[name] || '#00e5ff';
    return `<span style="color: ${color}; font-weight: 700;">${name}</span>`;
}

function highlightSpecialWords(text) {
    const specialWords = {
        'زيزو': { color: '#ff3366', shake: true },
        'جهاد': { color: '#00ffe7', shake: false },
        'حلا': { color: '#ff33cc', shake: false },
        'كول': { color: '#33ccff', shake: false },
        'مصطفى': { color: '#33ff99', shake: false },
    };
    let result = text;
    Object.keys(specialWords).forEach(word => {
        const { color, shake } = specialWords[word];
        const shakeClass = shake ? ' shake' : '';
        const regex = new RegExp(`\\b${word}\\b`, 'gu');
        result = result.replace(regex, `<span class="special-word${shakeClass}" style="color:${color}">${word}</span>`);
    });
    return result;
}

function addChatMessage({ name, message, system = false, color = null, time = '' }) {
    const div = document.createElement('div');
    div.classList.add('chat-message');

    if (!time) {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        time = `${hours}:${minutes}`;
    }

    if (system) {
        div.classList.add('chat-system-message');
        div.textContent = message;
    } else {
        const nameSpan = document.createElement('span');
        nameSpan.classList.add('chat-name');
        nameSpan.innerHTML = colorizeName(name, color);

        const messageSpan = document.createElement('span');
        messageSpan.classList.add('chat-text');
        messageSpan.innerHTML = highlightSpecialWords(message);

        div.appendChild(nameSpan);
        div.appendChild(document.createTextNode(' : '));
        div.appendChild(messageSpan);
    }

    const timeSpan = document.createElement('span');
    timeSpan.textContent = `[${time}]`;
    timeSpan.style.fontSize = '10px';
    timeSpan.style.color = '#888';
    div.appendChild(timeSpan);

    chatMessages.appendChild(div);
    scrollChatToBottom();

    if (!chatContainer.classList.contains('open') && !system) {
        btnChat.classList.add('notify');
        playNotificationSound();
    }
}

// تشغيل صوت تنبيه
function playNotificationSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        oscillator.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}
}

// تحديث قائمة اللاعبين
function updatePlayersList(players) {
    playersList.innerHTML = '';
    players.forEach((p, i) => {
        const li = document.createElement('li');
        li.dataset.id = p.id;
        let color = i === 0 ? 'red' : i === 1 ? 'green' : i === 2 ? 'orange' : '#00d1ff';
        li.style.color = color;
        li.innerHTML = `${i + 1}. ${colorizeName(p.name, p.color)} - ${p.score} نقطة`;
        playersList.appendChild(li);
    });
}

// --- جاري الكتابة + إرسال الرسائل ---
const typingMessages = {};
chatInput.addEventListener('input', () => {
    if (chatInput.value.trim() !== '') socket.emit('typing');
    else socket.emit('stopTyping');
});

socket.on('typing', typingNames => {
    Object.values(typingMessages).forEach(div => div.remove());
    typingNames.forEach(name => {
        if (!typingMessages[name]) {
            const div = document.createElement('div');
            div.classList.add('chat-message', 'chat-typing');
            div.textContent = `${name} يكتب...`;
            chatMessages.appendChild(div);
            scrollChatToBottom();
            typingMessages[name] = div;
        }
    });
    Object.keys(typingMessages).forEach(name => {
        if (!typingNames.includes(name)) {
            typingMessages[name].remove();
            delete typingMessages[name];
        }
    });
});

chatForm.addEventListener('submit', e => {
    e.preventDefault();
    const msg = chatInput.value.trim();
    if (!msg) return;

    socket.emit('sendMessage', msg);

    const player = playerName;
    if (typingMessages[player]) {
        typingMessages[player].remove();
        delete typingMessages[player];
    }

    chatInput.value = '';
    socket.emit('stopTyping');
});

// --- badge للرسائل الجديدة ---
let newMessageCount = 0;
function showNewMessageBadge(count) {
    let badge = document.getElementById('newMessageBadge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'newMessageBadge';
        badge.style.position = 'absolute';
        badge.style.bottom = '80px';
        badge.style.right = '20px';
        badge.style.backgroundColor = '#ff3b30';
        badge.style.color = '#fff';
        badge.style.padding = '6px 12px';
        badge.style.borderRadius = '12px';
        badge.style.cursor = 'pointer';
        badge.style.zIndex = '1000';
        badge.style.fontWeight = '700';
        badge.addEventListener('click', () => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
            newMessageCount = 0;
            hideNewMessageBadge();
        });
        document.body.appendChild(badge);
    }
    badge.textContent = `↓ ${count} رسالة جديدة`;
    badge.style.display = 'block';
}

function hideNewMessageBadge() {
    const badge = document.getElementById('newMessageBadge');
    if (badge) badge.style.display = 'none';
}

const originalAddChatMessage = addChatMessage;
addChatMessage = function(data) {
    originalAddChatMessage(data);

    const atBottom = chatMessages.scrollTop + chatMessages.clientHeight >= chatMessages.scrollHeight - 10;
    if (atBottom) {
        newMessageCount = 0;
        hideNewMessageBadge();
    } else {
        newMessageCount++;
        showNewMessageBadge(newMessageCount);
    }
};

chatMessages.addEventListener('scroll', () => {
    const threshold = 10;
    const position = chatMessages.scrollTop + chatMessages.clientHeight;
    const height = chatMessages.scrollHeight;
    isUserAtBottom = position >= height - threshold;
});

// --- أحداث اللعبة الأساسية ---
inputAnswer.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        if (!canAnswer) return;
        const answer = inputAnswer.value.trim();
        if (!answer) return;

        canAnswer = false;
        const timeUsed = ((Date.now() - startTime) / 1000).toFixed(2);
        socket.emit('submitAnswer', { answer, timeUsed });
        inputAnswer.value = '';
    }
});

socket.on('newWord', word => {
    currentWord = word;
    wordDisplay.textContent = word;
    startTime = Date.now();
    answerTimeDisplay.textContent = '';
    canAnswer = true;
});

socket.on('updateScore', score => {
    myScore = score;
    pointsDisplay.textContent = `النقاط: ${myScore}`;
});

socket.on('updatePlayers', players => {
    updatePlayersList(players);
});

socket.on('chatMessage', data => {
    addChatMessage({
        name: data.system ? '' : data.name,
        message: data.message,
        system: data.system,
        color: data.color || null,
        time: data.time || ''
    });
});

socket.on('playerWon', data => {
    alert(`🎉 مبروك ${data.name} لقد فزت باللعبة!`);
});

socket.on('kicked', () => {
    alert('تم طردك من اللعبة بواسطة الأدمن.');
    window.location.reload();
});

socket.on('welcome', data => {
    playerId = data.id;
    socket.emit('setName', { name: playerName, color: playerColor });
});

socket.on('correctAnswer', data => {
    answerTimeDisplay.textContent = `أجبت في: ${data.timeUsed} ثانية`;
    canAnswer = false;
    setTimeout(() => {
        answerTimeDisplay.textContent = '';
        canAnswer = true;
    }, 2000);
});

socket.on('wrongAnswer', () => {
    canAnswer = true;
});

socket.on('enableAnswer', () => {
    canAnswer = true;
});
