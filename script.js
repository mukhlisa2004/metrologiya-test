// Firebase sozlamalari
const firebaseConfig = {
    apiKey: "AIzaSyDJpXA9mnax_DVAT5gIRQNrAFHswvaWQB4",
    authDomain: "metrologiya-test.firebaseapp.com",
    databaseURL: "https://metrologiya-test-default-rtdb.firebaseio.com",
    projectId: "metrologiya-test",
    storageBucket: "metrologiya-test.firebasestorage.app",
    messagingSenderId: "1031544181425",
    appId: "1:1031544181425:web:666928e75954dcb733c890"
};

// Firebase-ni ishga tushirish
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let allQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let timerInterval; // Taymer uchun global o'zgaruvchi

// Sahifa yuklanganda test holatini tekshirish
window.addEventListener('load', () => {
    if (localStorage.getItem('testDone') === 'true') {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.innerHTML = `
                <div style="text-align:center; padding: 20px;">
                    <h3 style="color: #e74c3c;">Siz allaqachon test topshirgansiz!</h3>
                    <p>Qayta topshirishga ruxsat berilmaydi.</p>
                </div>
            `;
        }
    }
});

// Admin panelni tekshirish
if(window.location.search.includes('admin=true')) {
    const adminPanel = document.getElementById('admin-panel');
    if(adminPanel) {
        adminPanel.classList.remove('hidden');
        showResultsInTable(); 
    }
}

// Savollarni aralashtirish
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function startTest() {
    const name = document.getElementById('userName').value;
    const group = document.getElementById('userGroup').value;
    
    if(!name || !group) return alert("Ism va guruhni kiriting!");

    // ANTI-CHEAT
    window.onblur = function() {
        if (!document.getElementById('test-section').classList.contains('hidden')) {
            alert("DIQQAT! Siz test sahifasidan chiqdingiz. Qoidalarni buzganingiz uchun test yakunlandi!");
            finishTest();
        }
    };

    database.ref('/').once('value', (snapshot) => {
        const data = snapshot.val();
        if(data) {
            let filteredQuestions = [];
            
            Object.keys(data).forEach(key => {
                const item = data[key];
                if(key !== 'results' && item && (item.text || item.question)) {
                    filteredQuestions.push(item);
                }
            });

            if(filteredQuestions.length > 0) {
                // 1. Avval barcha savollarni aralashtiramiz
                let shuffled = shuffle(filteredQuestions);
                
                // 2. Aralashgan savollardan faqat dastlabki 20 tasini kesib olamiz
                allQuestions = shuffled.slice(0, 20); 

                document.getElementById('login-form').classList.add('hidden');
                document.getElementById('test-section').classList.remove('hidden');
                
                currentQuestionIndex = 0; // Indexni nollaymiz
                score = 0; // Ballni nollaymiz
                
                displayQuestion();
                runTimer(40); 
            } else {
                alert("Bazada savollar topilmadi!");
            }
        }
    });
}
// Taymer
function runTimer(minutes) {
    let seconds = minutes * 60;
    const timerDisplay = document.getElementById('timer');

    timerInterval = setInterval(() => {
        let m = Math.floor(seconds / 60);
        let s = seconds % 60;
        
        if (timerDisplay) {
            timerDisplay.innerText = `Vaqt: ${m}:${s < 10 ? '0'+s : s}`;
        }

        if (seconds <= 0) {
            clearInterval(timerInterval);
            alert("Vaqtingiz tugadi!");
            finishTest();
        }
        seconds--;
    }, 1000);
}

// Savolni ekranga chiqarish (JSON dagi tuzilishga moslandi)
function displayQuestion() {
    const q = allQuestions[currentQuestionIndex];
    
    // Savol matnini aniqlash (ham 'question', ham 'text' maydonini tekshiramiz)
    const questionText = q.question || q.text;
    document.getElementById('question-text').innerText = `${currentQuestionIndex + 1}. ${questionText}`;
    
    // Javoblarni yig'ish
    let options = [];
    options.push(q.correct); // To'g'ri javob doim bor

    // Xato javoblarni tekshirish (wrongs massivi yoki w1, w2, w3)
    if (q.wrongs && Array.isArray(q.wrongs)) {
        options.push(...q.wrongs);
    } else {
        if (q.w1) options.push(q.w1);
        if (q.w2) options.push(q.w2);
        if (q.w3) options.push(q.w3);
    }
    
    // Javoblarni aralashtirish
    options = shuffle(options.filter(opt => opt)); // Bo'sh javoblarni olib tashlaymiz
    
    const container = document.getElementById('options-container');
    container.innerHTML = '';

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.innerText = opt;
        btn.className = "test-option-btn"; 
        btn.onclick = () => {
            if(opt === q.correct) score++;
            nextQuestion();
        };
        container.appendChild(btn);
    });
}

function nextQuestion() {
    currentQuestionIndex++;
    if(currentQuestionIndex < allQuestions.length) {
        displayQuestion();
    } else {
        finishTest();
    }
}

// Testni yakunlash va bazaga yozish
function finishTest() {
    clearInterval(timerInterval);
    const name = document.getElementById('userName').value;
    const group = document.getElementById('userGroup').value;

    database.ref('results').push({
        student: name,
        group: group,
        score: score,
        total: allQuestions.length,
        date: new Date().toLocaleString()
    });

    localStorage.setItem('testDone', 'true');

    document.getElementById('test-section').innerHTML = `
        <div style="text-align:center; padding: 30px;">
            <h2 style="color: #2c3e50;">Test yakunlandi!</h2>
            <p style="font-size: 22px;">${name}, natijangiz: <br>
               <span style="font-weight: bold; color: #27ae60; font-size: 32px;">${score} / ${allQuestions.length}</span>
            </p>
            <p style="color: #7f8c8d; margin-top: 20px;">Ma'lumotlaringiz bazaga saqlandi.</p>
        </div>
    `;
}

// Admin panelda natijalarni ko'rsatish
function showResultsInTable() {
    const container = document.getElementById('results-table-container');
    if(!container) return;

    database.ref('results').on('value', (snapshot) => {
        const data = snapshot.val();
        if(!data) return container.innerHTML = "<p>Hozircha natija yo'q.</p>";

        const grouped = {};
        for(let key in data) {
            const res = data[key];
            if(!grouped[res.group]) grouped[res.group] = [];
            grouped[res.group].push(res);
        }

        let html = "<h3>Talabalar natijalari</h3>";
        for(let gName in grouped) {
            html += `
                <h4 style="background:#007bff; color:white; padding:10px; border-radius:5px;">${gName} guruhi</h4>
                <table border="1" style="width:100%; border-collapse: collapse; margin-bottom: 20px;">
                    <tr style="background:#f8f9fa;">
                        <th>Ism</th>
                        <th>To'g'ri/Umumiy</th>
                        <th>Ball (x0.5)</th>
                        <th>Sana</th>
                    </tr>`;
            
            grouped[gName].forEach(r => {
                let totalBall = (r.score * 0.5).toFixed(1); 
                html += `
                    <tr>
                        <td style="padding:10px;">${r.student}</td>
                        <td style="padding:10px; text-align:center;">${r.score} / ${r.total}</td>
                        <td style="padding:10px; text-align:center; font-weight:bold; color: #2ecc71;">${totalBall} ball</td>
                        <td style="padding:10px; font-size:12px;">${r.date}</td>
                    </tr>`;
            });
            html += "</table>";
        }
        container.innerHTML = html;
    });
}

// Admindan savol qo'shish qismi ham bazaning joriy tuzilishiga moslandi
function addQuestion() {
    const q = document.getElementById('newQ').value;
    const c = document.getElementById('correctA').value;
    const w1 = document.getElementById('wrong1').value;
    const w2 = document.getElementById('wrong2').value;
    const w3 = document.getElementById('wrong3').value;

    if(q && c && w1) {
        database.ref('/').push({
            question: q,
            correct: c,
            wrongs: [w1, w2, w3]
        }).then(() => {
            alert("Savol qo'shildi!");
            document.querySelectorAll('#admin-panel input').forEach(i => i.value = '');
        });
    } else {
        alert("Ma'lumotlarni to'liq kiriting!");
    }
}