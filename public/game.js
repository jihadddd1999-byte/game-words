const socket = io();

const MAX_NEW_MESSAGES_NOTIFICATION = 99;

const currentWordElem = document.getElementById('current-word');
const inputAnswer = document.getElementById('input-answer');
const pointsDisplay = document.getElementById('points-display');
const answerTimeContainer = document.getElementById('answer-time');
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
const instructionsDialog = document.getElementById('instructions-dialog');
const btnInstructions = document.getElementById('btn-instructions');
const btnZizo = document.getElementById('btn-zizo');
const playersList = document.getElementById('players-list');

// حاوية عرض معلومات آخر إجابة صحيحة (اسم اللاعب والوقت)
const answerInfoContainer = document.createElement('div');
answerInfoContainer.id = 'answer-info-container';
answerInfoContainer.style.marginTop = '10px';
answerInfoContainer.style.color = '#00e5ff';
answerInfoContainer.style.fontWeight = '800';
answerInfoContainer.style.fontSize = '1.3rem';
answerInfoContainer.style.textAlign = 'center';
answerInfoContainer.textContent = '';
document.querySelector('.game-section').appendChild(answerInfoContainer);

let playerId = null;
let players = [];
let newMessagesCount = 0;

// تحديث إشعار الرسائل الجديدة على زر الشات
function updateNewMessagesNotification() {
  if (newMessagesCount > 0) {
    btnChat.dataset.newMessages = newMessagesCount > MAX_NEW_MESSAGES_NOTIFICATION ? `${MAX_NEW_MESSAGES_NOTIFICATION}+` : newMessagesCount;
  } else {
    delete btnChat.dataset.newMessages;
  }
}

// فتح الشات بالكامل وإعادة تعيين عداد الرسائل الجديدة
function openChat() {
  chatContainer.classList.add('open');
  btnChat.setAttribute('aria-expanded', 'true');
  newMessagesCount = 0;
  updateNewMessagesNotification();
  chatInput.focus();
  scrollChatToBottom();
}

// إغلاق الشات
function closeChat() {
  chatContainer.classList.remove('open');
  btnChat.setAttribute('aria-expanded', 'false');
  chatInput.value = '';
}

// تمرير الشات لأسفل تلقائياً
function scrollChatToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// تنقية النص للظهور في HTML (لتفادي الثغرات)
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function (m) {
    return ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m];
  });
}

// عرض رسالة في الشات مع تنسيق خاص للكلمات الملونة والمهتزة
function addChatMessage(data) {
  const msgElem = document.createElement('div');
  msgElem.classList.add('chat-message');
  
  if (data.system) {
    msgElem.classList.add('chat-system-message');
    msgElem.textContent = data.message;
  } else {
    const nameSpan = document.createElement('span');
    nameSpan.classList.add('chat-name');
    nameSpan.textContent = data.name + ':';
    if (data.color) {
      nameSpan.style.color = data.color;
    }
    // إضافة حدث فتح مودال ملف اللاعب عند الضغط على الاسم
    nameSpan.style.cursor = 'pointer';
    nameSpan.addEventListener('click', () => {
      openPlayerProfileModal(data.name);
    });

    msgElem.appendChild(nameSpan);

    // معالجة النص للبحث عن الكلمات الخاصة وعرضها بلون واهتزاز
    let messageText = escapeHTML(data.message);
    // الكلمات الخاصة للمثال: "زيزو", "جهاد", "مصطفى" ... تظهر ملونة وتهتز
    const specialWords = {
      "زيزو": "#ff3366",
      "جهاد": "#00ffe7",
      "مصطفى": "#33ff99",
      "أسامة": "#cc33ff",
      "حلا": "#ff33cc",
      "نور": "#ffff33",
      "كول": "#33ccff"
    };

    // استبدال الكلمات الخاصة بعناصر span ملونة وتهتز
    Object.entries(specialWords).forEach(([word, color]) => {
      const re = new RegExp(`\\b${word}\\b`, 'g');
      messageText = messageText.replace(re, `<span class="special-word shake" style="color:${color}">${word}</span>`);
    });

    const messageSpan = document.createElement('span');
    messageSpan.innerHTML = ' ' + messageText;
    msgElem.appendChild(messageSpan);
  }
  
  chatMessages.appendChild(msgElem);
  scrollChatToBottom();
  
  // إذا الشات غير مفتوح، زد عداد الرسائل الجديدة
  if (!chatContainer.classList.contains('open')) {
    newMessagesCount++;
    updateNewMessagesNotification();
  }
}

// فتح مودال ملف اللاعب (سرعة الإجابة، النقاط الكلية، الفوزات)
function openPlayerProfileModal(playerName) {
  const player = players.find(p => p.name === playerName);
  if (!player) return;

  // إنشاء المودال إذا لم يكن موجود
  let modal = document.getElementById('player-profile-modal');
  if (!modal) {
    modal = document.createElement('dialog');
    modal.id = 'player-profile-modal';
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'player-profile-title');
    modal.style.padding = '20px 25px';
    modal.style.borderRadius = '16px';
    modal.style.background = 'linear-gradient(145deg, #003366, #0059b3)';
    modal.style.color = '#aaffff';
    modal.style.boxShadow = '0 0 25px #00cfffcc, inset 0 0 40px #0099ccaa';
    modal.style.fontWeight = '700';
    modal.style.width = '90%';
    modal.style.maxWidth = '400px';
    modal.style.userSelect = 'none';

    modal.innerHTML = `
      <h3 id="player-profile-title">معلومات اللاعب</h3>
      <div id="player-profile-content"></div>
      <button id="close-player-profile" type="button">إغلاق</button>
    `;

    document.body.appendChild(modal);

    // زر إغلاق المودال
    modal.querySelector('#close-player-profile').addEventListener('click', () => {
      modal.close();
    });
  }

  const contentDiv = modal.querySelector('#player-profile-content');
  contentDiv.innerHTML = `
    <p>الاسم: <strong>${escapeHTML(player.name)}</strong></p>
    <p>أسرع وقت للإجابة: <strong>${player.bestTime !== undefined ? player.bestTime.toFixed(2) + ' ثانية' : 'لا يوجد'}</strong></p>
    <p>النقاط الكلية: <strong>${player.score}</strong></p>
    <p>عدد الفوزات: <strong>${player.wins}</strong></p>
  `;

  modal.showModal();
}

// إظهار كلمة جديدة
socket.on('newWord', word => {
  currentWordElem.textContent = word;
  inputAnswer.value = '';
  answerTimeContainer.textContent = '';
  answerInfoContainer.textContent = '';
  inputAnswer.disabled = false;
  inputAnswer.focus();
});

// تحديث قائمة اللاعبين (محتوىها من السيرفر)
socket.on('updatePlayers', updatedPlayers => {
  players = updatedPlayers;
  playersList.innerHTML = '';
  updatedPlayers.forEach(p => {
    const li = document.createElement('li');
    li.textContent = p.name + ' - ' + p.score + ' نقطة';
    if (p.color) {
      li.style.color = p.color;
    }
    li.style.cursor = 'pointer';
    // فتح مودال ملف اللاعب عند الضغط على الاسم في قائمة المتصدرين
    li.addEventListener('click', () => {
      openPlayerProfileModal(p.name);
    });
    playersList.appendChild(li);
  });
});

// تحديث النقاط الخاصة باللاعب الحالي
socket.on('updateScore', score => {
  pointsDisplay.textContent = `النقاط: ${score}`;
});

// استقبال رسائل الشات
socket.on('chatMessage', data => {
  addChatMessage(data);
});

// إظهار رسالة الإجابة الصحيحة (بدون عرض الثواني بالـشات، تظهر تحت خانة الإجابات)
socket.on('correctAnswer', data => {
  answerInfoContainer.textContent = `✅ تم الإجابة بشكل صحيح بواسطة لاعب في ${data.timeUsed.toFixed(2)} ثانية`;
});

// استقبال حالة الإجابة الخاطئة
socket.on('wrongAnswer', () => {
  // يمكن وضع تأثير أو تنبيه إذا أردت
});

// رسالة ترحيبية
socket.on('welcome', data => {
  playerId = data.id;
});

// رسالة طرد اللاعب
socket.on('kicked', () => {
  alert('تم طردك من اللعبة.');
  location.reload();
});

// إعلان فوز لاعب
socket.on('playerWon', data => {
  alert(`🎉 اللاعب ${data.name} فاز باللعبة! عدد الفوزات: ${data.wins}`);
});

// إرسال رسالة الشات
chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const msg = chatInput.value.trim();
  if (msg.length === 0) return;
  socket.emit('sendMessage', msg);
  chatInput.value = '';
});

// فتح الشات عند الضغط على زر الشات (يصبح فول سكرين)
btnChat.addEventListener('click', () => {
  if (chatContainer.classList.contains('open')) {
    closeChat();
  } else {
    openChat();
  }
});

// إغلاق الشات بزر الإغلاق
btnCloseChat.addEventListener('click', closeChat);

// إرسال الإجابة عند الضغط على Enter في حقل الإجابة
inputAnswer.addEventListener('keydown', e => {
  if (e.key === 'Enter' && inputAnswer.value.trim() !== '') {
    const answer = inputAnswer.value.trim();
    const timeUsed = performance.now() / 1000; // زمن مؤقت (يمكن تعديله لاحقاً)
    socket.emit('submitAnswer', { answer, timeUsed });
    inputAnswer.value = '';
  }
});

// تغيير الاسم (فتح المودال)
btnChangeName.addEventListener('click', () => {
  inputName.value = '';
  changeNameDialog.showModal();
});

// إغلاق مودال التعليمات
document.getElementById('close-instructions').addEventListener('click', () => {
  instructionsDialog.close();
});

// فتح مودال التعليمات
btnInstructions.addEventListener('click', () => {
  instructionsDialog.showModal();
});

// زر لعبة زيزو (فتح رابط خارجي)
btnZizo.addEventListener('click', () => {
  window.open('https://sp-p2.onrender.com', '_blank');
});

// إرسال اسم جديد عند تقديم نموذج تغيير الاسم
changeNameForm.addEventListener('submit', e => {
  e.preventDefault();
  const newName = inputName.value.trim();
  if (newName.length === 0) return;
  socket.emit('setName', newName);
  changeNameDialog.close();
});

// إغلاق مودال تغيير الاسم عند الضغط على إلغاء
document.getElementById('cancel-name').addEventListener('click', () => {
  changeNameDialog.close();
});

// عند فتح الشات، إعادة تعيين عداد الرسائل الجديدة
chatContainer.addEventListener('transitionend', () => {
  if (chatContainer.classList.contains('open')) {
    newMessagesCount = 0;
    updateNewMessagesNotification();
  }
});
