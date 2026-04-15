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
let timerInterval;

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
                let shuffled = shuffle(filteredQuestions);
                allQuestions = shuffled.slice(0, 20); 
                document.getElementById('login-form').classList.add('hidden');
                document.getElementById('test-section').classList.remove('hidden');
                currentQuestionIndex = 0;
                score = 0;
                displayQuestion();
                runTimer(40); 
            } else {
                alert("Bazada savollar topilmadi!");
            }
        }
    });
}

function runTimer(minutes) {
    let seconds = minutes * 60;
    const timerDisplay = document.getElementById('timer');
    timerInterval = setInterval(() => {
        let m = Math.floor(seconds / 60);
        let s = seconds % 60;
        if (timerDisplay) timerDisplay.innerText = `Vaqt: ${m}:${s < 10 ? '0'+s : s}`;
        if (seconds <= 0) {
            clearInterval(timerInterval);
            alert("Vaqtingiz tugadi!");
            finishTest();
        }
        seconds--;
    }, 1000);
}

function displayQuestion() {
    const q = allQuestions[currentQuestionIndex];
    const questionText = q.question || q.text;
    document.getElementById('question-text').innerText = `${currentQuestionIndex + 1}. ${questionText}`;
    
    let options = [];
    options.push(q.correct);
    if (q.wrongs && Array.isArray(q.wrongs)) {
        options.push(...q.wrongs);
    } else {
        if (q.w1) options.push(q.w1);
        if (q.w2) options.push(q.w2);
        if (q.w3) options.push(q.w3);
    }
    
    options = shuffle(options.filter(opt => opt));
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

async function finishTest() {
    clearInterval(timerInterval);
    const name = document.getElementById('userName').value;
    const group = document.getElementById('userGroup').value;
    const date = new Date().toLocaleString();
    
    // 1. Qurilma nomini aniqlash (Kompyuter yoki Telefon modeli)
    let deviceModel = "Noma'lum qurilma";
    const ua = navigator.userAgent;

    if (/android/i.test(ua)) {
        const androidMatch = ua.match(/Android.*;\s([^;]+)\sBuild/);
        deviceModel = androidMatch ? androidMatch[1] : "Android";
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
        deviceModel = /iPhone/i.test(ua) ? "iPhone" : "iPad";
    } else if (/Windows/i.test(ua)) {
        // Windows versiyasini aniqlash
        const winMatch = ua.match(/Windows NT ([\d.]+)/);
        deviceModel = winMatch ? `Windows PC (v${winMatch[1]})` : "Windows PC";
    } else if (/Macintosh/i.test(ua)) {
        deviceModel = "MacBook / iMac";
    }

    // 2. IP manzilni aniqlash (Tashqi API orqali)
    let userIp = "Aniqlanmadi";
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        userIp = data.ip;
    } catch (error) {
        console.error("IP aniqlashda xato:", error);
    }

    // 3. Ma'lumotlarni bazaga yuborish
    const resultData = {
        student: name,
        group: group,
        score: score,
        total: allQuestions.length,
        date: date,
        device: deviceModel,
        ip: userIp // IP manzil qo'shildi
    };

    database.ref('results').push(resultData).then(() => {
        localStorage.setItem('testDone', 'true');
        document.getElementById('test-section').classList.add('hidden');
        const loginForm = document.getElementById('login-form');
        loginForm.classList.remove('hidden');
        loginForm.innerHTML = `
            <div style="text-align:center; padding: 20px;">
                <h2 style="color: #2ecc71;">Test yakunlandi!</h2>
                <p><b>Talaba:</b> ${name}</p>
                <p><b>To'g'ri:</b> ${score} / ${allQuestions.length}</p>
                <p><b>Qurilma:</b> ${deviceModel}</p>
                <p><b>IP:</b> ${userIp}</p>
                <p style="color: #666; margin-top:10px;">Natijalar saqlandi.</p>
            </div>
        `;
    }).catch(e => alert("Xato: " + e.message));
}

function showResultsInTable() {
    const container = document.getElementById('results-table-container');
    if (!container) return;

    database.ref('results').on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            container.innerHTML = "<p style='text-align:center;'>Natijalar yo'q.</p>";
            return;
        }

        const groups = {};
        Object.values(data).forEach(res => {
            if (!groups[res.group]) groups[res.group] = [];
            groups[res.group].push(res);
        });

        let html = "";
        for (const groupName in groups) {
            // Ism bo'yicha alfavit tartibida saralash
            groups[groupName].sort((a, b) => a.student.localeCompare(b.student));

            html += `
                <div class="group-section" style="margin-bottom: 30px;">
                    <h4 style="background: #3498db; color: white; padding: 12px; margin-bottom: 0; border-radius: 8px 8px 0 0;">
                        Guruh: ${groupName}
                    </h4>
                    <table border="1" style="width: 100%; border-collapse: collapse; text-align: center; font-size: 13px;">
                        <thead style="background: #f8f9fa;">
                            <tr>
                                <th style="padding: 10px; border: 1px solid #ddd;">F.I.SH</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">To'g'ri</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">Ball (x0.5)</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">Qurilma</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">IP Manzil</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">Sana</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            groups[groupName].forEach(r => {
                const calcBall = (r.score * 0.5).toFixed(1);
                
                // 1. Qurilma nomini qisqartirish (Uzun UserAgent o'rniga modelni ajratib olish)
                let dName = "Noma'lum";
                if (r.device) {
                    const ua = r.device;
                    if (ua.includes("Android")) {
                        // "Android 13; K" kabi yozuvlardan modelni ajratishga urinish
                        const match = ua.match(/Android\s[^;]+;\s([^;)]+)/);
                        dName = match ? match[1] : "Android";
                    } else if (ua.includes("iPhone")) {
                        dName = "iPhone";
                    } else if (ua.includes("Windows")) {
                        dName = "Windows PC";
                    } else if (ua.includes("Macintosh")) {
                        dName = "MacBook";
                    } else {
                        dName = "Mobil / PC";
                    }
                }

                // 2. IP manzilni tekshirish
                const ipAddress = r.ip ? r.ip : "---";

                html += `
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: left;">${r.student}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${r.score} / ${r.total}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #2980b9;">${calcBall}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; font-size: 11px; color: #e67e22;" title="${r.device}">${dName}</td> 
                        <td style="padding: 10px; border: 1px solid #ddd; font-size: 11px; color: #7f8c8d;">${ipAddress}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; font-size: 11px;">${r.date}</td>
                    </tr>
                `;
            });
            html += `</tbody></table></div>`;
        }
        container.innerHTML = html;
    });
}



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

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('admin') === 'true') {
    const adminPanel = document.getElementById('admin-panel');
    const loginForm = document.getElementById('login-form');
    if(adminPanel) adminPanel.classList.remove('hidden');
    if(loginForm) loginForm.classList.add('hidden');
    showResultsInTable();
}


function getDeviceModel() {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) {
        // Android qurilmalarda model nomi odatda qavs ichida bo'ladi
        const match = ua.match(/Android.*;\s([^;]+)\sBuild/);
        if (match) return match[1];
        return "Android qurilma";
    }
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
        return "iOS qurilma"; // iOS xavfsizlik sababli model nomini (masalan, iPhone 13) yashiradi
    }
    if (/Windows/i.test(ua)) return "Windows PC";
    if (/Macintosh/i.test(ua)) return "MacBook";
    return "Noma'lum qurilma";
}