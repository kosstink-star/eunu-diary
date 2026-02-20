document.addEventListener('DOMContentLoaded', () => {
    console.log('육아 다이어리 앱 v3.1 (Bug Fix & Full Features) 로드 완료');

    // --- State & Storage ---
    let records = JSON.parse(localStorage.getItem('babyRecords')) || [];
    let growthData = JSON.parse(localStorage.getItem('babyGrowth')) || [];
    let profile = JSON.parse(localStorage.getItem('babyProfile')) || {
        name: '우리은우',
        birthdate: new Date().toISOString().split('T')[0]
    };

    let currentView = 'home';
    let chart = null;

    // --- Daily Tips ---
    const tips = [
        "아이와 눈을 맞추며 자주 말을 걸어주세요! 👶",
        "수유 후에는 꼭 트림을 시켜주세요. 🍼",
        "방 안의 온도는 22~24도, 습도는 50%가 적당해요. 🌡️",
        "작은 소리에도 반응하며 교감하는 시간을 가져보세요.",
        "엄마 아빠의 사랑이 아이에게 가장 큰 영양분입니다. ❤️",
        "아이의 기저귀는 자주 확인해서 쾌적하게 해주세요. 🧷",
        "충분한 휴식은 건강한 육아의 시작입니다!"
    ];

    // --- Selectors ---
    const appTitle = document.querySelector('header h1');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalBody = document.getElementById('modal-body');
    const modalTitle = document.getElementById('modal-title');
    const closeBtn = document.getElementById('close-modal');

    const navItems = document.querySelectorAll('.nav-item');
    const views = {
        home: document.getElementById('view-home'),
        graph: document.getElementById('view-graph'),
        calendar: document.getElementById('view-calendar'),
        settings: document.getElementById('view-settings')
    };

    // --- Core Functions ---
    function saveAll() {
        localStorage.setItem('babyRecords', JSON.stringify(records));
        localStorage.setItem('babyGrowth', JSON.stringify(growthData));
        localStorage.setItem('babyProfile', JSON.stringify(profile));
    }

    function addRecord(type, content, timestamp = new Date().getTime()) {
        records.push({ type, content, timestamp });
        saveAll();
        render();
    }

    function calculateDays(birthdate) {
        const birth = new Date(birthdate);
        const now = new Date();
        const diff = now.getTime() - birth.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    }

    function getTimeString(timestamp) {
        return new Date(timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    function getTimeAgo(timestamp) {
        if (!timestamp) return "기록 없음";
        const diffMins = Math.floor((new Date().getTime() - timestamp) / 60000);
        if (diffMins < 1) return "방금 전";
        if (diffMins < 60) return `${diffMins}분 전`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}시간 전`;
        return `${Math.floor(diffHours / 24)}일 전`;
    }

    // --- Navigation ---
    function switchView(viewName) {
        Object.keys(views).forEach(key => {
            if (views[key]) views[key].style.display = (key === viewName) ? 'block' : 'none';
        });
        navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });
        currentView = viewName;
        render();
    }

    navItems.forEach(item => {
        item.onclick = () => switchView(item.dataset.view);
    });

    // --- Render Logic ---
    function render() {
        // Update Home Profile Card (Always visible on home)
        const nameEl = document.getElementById('home-baby-name');
        const daysEl = document.getElementById('home-baby-days');
        const tipEl = document.getElementById('daily-tip');

        if (nameEl) nameEl.innerText = profile.name;
        if (daysEl) daysEl.innerText = `태어난 지 ${calculateDays(profile.birthdate)}일째`;
        if (tipEl) tipEl.innerText = `오늘의 팁: ${tips[new Date().getDate() % tips.length]}`;

        if (currentView === 'home') renderHome();
        else if (currentView === 'graph') renderGraph();
        else if (currentView === 'calendar') renderCalendar();
        else if (currentView === 'settings') renderSettings();
    }

    function renderHome() {
        const timeline = document.getElementById('timeline');
        const sortedRecords = [...records].sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);
        timeline.innerHTML = '';
        sortedRecords.forEach(record => {
            const item = document.createElement('div');
            item.className = 'diary-item';
            item.innerHTML = `
                <span class="time">${getTimeString(record.timestamp)}</span>
                <div class="content">${record.content}</div>
            `;
            timeline.appendChild(item);
        });

        ['feed', 'sleep', 'diaper', 'photo'].forEach(type => {
            const card = document.getElementById(`btn-${type}`);
            if (!card) return;
            const statValue = card.querySelector('.stat-value');
            if (type === 'photo') {
                statValue.innerText = `${records.filter(r => r.type === 'photo').length}장의 사진`;
            } else {
                const last = records.filter(r => r.type === type).sort((a, b) => b.timestamp - a.timestamp)[0];
                statValue.innerText = last ? getTimeAgo(last.timestamp) : '기록 없음';
            }
        });
    }

    // --- Graph View ---
    function renderGraph() {
        const ctx = document.getElementById('growthChart')?.getContext('2d');
        if (!ctx) return;

        const lastH = document.getElementById('last-height');
        const lastW = document.getElementById('last-weight');
        const sortedGrowth = [...growthData].sort((a, b) => a.timestamp - b.timestamp);

        if (sortedGrowth.length > 0) {
            const latest = sortedGrowth[sortedGrowth.length - 1];
            lastH.innerText = `${latest.height} cm`;
            lastW.innerText = `${latest.weight} kg`;
        }

        if (chart) chart.destroy();
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedGrowth.map(d => new Date(d.timestamp).toLocaleDateString()),
                datasets: [
                    { label: '키 (cm)', data: sortedGrowth.map(d => d.height), borderColor: '#ff9a8b', tension: 0.3, yAxisID: 'y' },
                    { label: '몸무게 (kg)', data: sortedGrowth.map(d => d.weight), borderColor: '#ff6b6b', tension: 0.3, yAxisID: 'y1' }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: { type: 'linear', position: 'left' },
                    y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false } }
                }
            }
        });
    }

    // --- Calendar View ---
    let calendarDate = new Date();
    function renderCalendar() {
        const container = document.getElementById('calendar-container');
        if (!container) return;
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();

        let html = `<div class="calendar-header"><span id="cal-prev" style="cursor:pointer">&lt;</span><span>${year}년 ${month + 1}월</span><span id="cal-next" style="cursor:pointer">&gt;</span></div><div class="calendar-grid">`;
        ['일', '월', '화', '수', '목', '금', '토'].forEach(d => html += `<div class="calendar-day-header">${d}</div>`);
        for (let i = 0; i < firstDay; i++) html += '<div></div>';
        for (let d = 1; d <= lastDate; d++) {
            const dateStr = `${year}-${month + 1}-${d}`;
            const isToday = new Date().toLocaleDateString() === new Date(year, month, d).toLocaleDateString();
            const hasRecord = records.some(r => new Date(r.timestamp).toLocaleDateString() === new Date(year, month, d).toLocaleDateString());
            html += `<div class="calendar-day ${isToday ? 'today' : ''} ${hasRecord ? 'has-record' : ''}" data-date="${dateStr}">${d}</div>`;
        }
        html += '</div>';
        container.innerHTML = html;

        document.getElementById('cal-prev').onclick = () => { calendarDate.setMonth(month - 1); renderCalendar(); };
        document.getElementById('cal-next').onclick = () => { calendarDate.setMonth(month + 1); renderCalendar(); };
        document.querySelectorAll('.calendar-day').forEach(el => {
            el.onclick = () => {
                document.querySelectorAll('.calendar-day').forEach(e => e.classList.remove('active'));
                el.classList.add('active');
                showDayDetails(el.dataset.date);
            };
        });
    }

    function showDayDetails(dateStr) {
        const [y, m, d] = dateStr.split('-');
        const targetDate = new Date(y, m - 1, d).toLocaleDateString();
        const dayRecords = records.filter(r => new Date(r.timestamp).toLocaleDateString() === targetDate);
        document.getElementById('selected-date-label').innerText = `${y}년 ${m}월 ${d}일 기록`;
        const dayTimeline = document.getElementById('day-timeline');
        dayTimeline.innerHTML = dayRecords.length ? '' : '<p style="font-size:0.8rem; color:#aaa">기록이 없습니다.</p>';
        dayRecords.sort((a, b) => b.timestamp - a.timestamp).forEach(r => {
            const item = document.createElement('div');
            item.className = 'diary-item';
            item.innerHTML = `<span class="time">${getTimeString(r.timestamp)}</span><div class="content">${r.content}</div>`;
            dayTimeline.appendChild(item);
        });
    }

    // --- Settings View ---
    function renderSettings() {
        const profileBtn = document.getElementById('set-profile');
        const exportBtn = document.getElementById('set-export');
        const resetBtn = document.getElementById('set-reset');

        if (profileBtn) profileBtn.onclick = () => openModal('profile');
        if (exportBtn) exportBtn.onclick = () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ records, growthData, profile }));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "eunu_diary_backup.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        };
        if (resetBtn) resetBtn.onclick = () => {
            if (confirm('정말로 모든 기록을 삭제하시겠습니까? 복구할 수 없습니다.')) {
                records = []; growthData = []; saveAll(); render();
            }
        };
    }

    // --- Modal Logic ---
    function openModal(type) {
        modalOverlay.style.display = 'flex';
        let content = '';
        switch (type) {
            case 'feed':
                modalTitle.innerText = '식사 기록 🍼';
                content = `<div class="form-group"><label>종류</label><select id="input-sub-type"><option value="식사">식사</option><option value="간식">간식</option></select></div><div class="form-group"><label>양 (ml/g)</label><input type="number" id="input-amount" value="120"></div><button class="submit-btn" id="save-btn">기록하기</button>`;
                break;
            case 'sleep':
                modalTitle.innerText = '수면 기록 💤';
                content = `<div class="form-group"><label>상태</label><select id="input-sub-type"><option value="낮잠 시작">낮잠 시작</option><option value="밤잠 시작">밤잠 시작</option><option value="기상">기상</option></select></div><button class="submit-btn" id="save-btn">저장하기</button>`;
                break;
            case 'diaper':
                modalTitle.innerText = '기저귀 교체 🧷';
                content = `<div class="form-group"><label>상태</label><select id="input-sub-type"><option value="소변">소변</option><option value="대변">대변</option><option value="모두">소변 + 대변</option></select></div><button class="submit-btn" id="save-btn">저장하기</button>`;
                break;
            case 'photo':
                modalTitle.innerText = '사진첩 기록 📸';
                content = `<div class="form-group"><label>설명</label><input type="text" id="input-desc" placeholder="오늘의 추억을 적어보세요"></div><button class="submit-btn" id="save-btn">저장하기</button>`;
                break;
            case 'growth':
                modalTitle.innerText = '성장 기록 📈';
                content = `<div class="form-group"><label>키 (cm)</label><input type="number" step="0.1" id="input-height" placeholder="예: 75.5"></div><div class="form-group"><label>몸무게 (kg)</label><input type="number" step="0.1" id="input-weight" placeholder="예: 9.2"></div><button class="submit-btn" id="save-btn">저장하기</button>`;
                break;
            case 'profile':
                modalTitle.innerText = '아이 정보 수정 ✏️';
                content = `<div class="form-group"><label>이름</label><input type="text" id="input-name" value="${profile.name}"></div><div class="form-group"><label>생일</label><input type="date" id="input-birth" value="${profile.birthdate}"></div><button class="submit-btn" id="save-btn">변경 완료</button>`;
                break;
        }
        modalBody.innerHTML = content;

        document.getElementById('save-btn').onclick = () => {
            if (type === 'feed') {
                const sub = document.getElementById('input-sub-type').value;
                const amt = document.getElementById('input-amount').value;
                addRecord('feed', `🍼 ${sub} ${amt}ml 완료`);
            } else if (type === 'sleep') {
                const sub = document.getElementById('input-sub-type').value;
                addRecord('sleep', `💤 수면: ${sub}`);
            } else if (type === 'diaper') {
                const sub = document.getElementById('input-sub-type').value;
                addRecord('diaper', `🧷 기저귀: ${sub}`);
            } else if (type === 'photo') {
                const desc = document.getElementById('input-desc').value;
                if (desc) addRecord('photo', `📸 사진: ${desc}`);
            } else if (type === 'growth') {
                const h = document.getElementById('input-height').value;
                const w = document.getElementById('input-weight').value;
                if (h && w) {
                    growthData.push({ height: h, weight: w, timestamp: new Date().getTime() });
                    saveAll();
                    renderGraph();
                }
            } else if (type === 'profile') {
                profile.name = document.getElementById('input-name').value;
                profile.birthdate = document.getElementById('input-birth').value;
                saveAll();
                render();
            }
            closeModal();
        };
    }

    function closeModal() { modalOverlay.style.display = 'none'; }
    closeBtn.onclick = closeModal;
    modalOverlay.onclick = (e) => { if (e.target === modalOverlay) closeModal(); };

    // --- Init Listeners ---
    document.getElementById('btn-feed').onclick = () => openModal('feed');
    document.getElementById('btn-sleep').onclick = () => openModal('sleep');
    document.getElementById('btn-diaper').onclick = () => openModal('diaper');
    document.getElementById('btn-photo').onclick = () => openModal('photo');
    const addGrowthBtn = document.getElementById('btn-add-growth');
    if (addGrowthBtn) addGrowthBtn.onclick = () => openModal('growth');
    document.querySelector('.add-btn').onclick = () => openModal('feed');

    // --- Start ---
    switchView('home');
});
