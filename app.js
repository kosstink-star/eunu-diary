document.addEventListener('DOMContentLoaded', () => {
    console.log('육아 다이어리 앱 v3.5 (Health, Bath & Photos) 로드 완료');

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

    function addRecord(type, content, timestamp = new Date().getTime(), imageData = null) {
        records.push({ type, content, timestamp, imageData });
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
        if (document.getElementById('home-baby-name')) {
            document.getElementById('home-baby-name').innerText = profile.name;
            document.getElementById('home-baby-days').innerText = `태어난 지 ${calculateDays(profile.birthdate)}일째`;
            document.getElementById('daily-tip').innerText = `오늘의 팁: ${tips[new Date().getDate() % tips.length]}`;
        }

        if (currentView === 'home') renderHome();
        else if (currentView === 'graph') renderGraph();
        else if (currentView === 'calendar') renderCalendar();
        else if (currentView === 'settings') renderSettings();
    }

    function renderHome() {
        const timeline = document.getElementById('timeline');
        const sortedRecords = [...records].sort((a, b) => b.timestamp - a.timestamp).slice(0, 30);
        timeline.innerHTML = '';
        sortedRecords.forEach(record => {
            const item = document.createElement('div');
            item.className = 'diary-item';

            let imgHtml = record.imageData ? `<img src="${record.imageData}" class="timeline-img">` : '';

            item.innerHTML = `
                <span class="time">${getTimeString(record.timestamp)}</span>
                <div class="content">
                    <div>${record.content}</div>
                    ${imgHtml}
                </div>
            `;
            timeline.appendChild(item);
        });

        ['feed', 'sleep', 'diaper', 'photo', 'health', 'bath'].forEach(type => {
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

    // --- Graph & Calendar (Keep same as v3.1) ---
    function renderGraph() {
        const ctx = document.getElementById('growthChart')?.getContext('2d');
        if (!ctx) return;
        const sortedGrowth = [...growthData].sort((a, b) => a.timestamp - b.timestamp);
        if (sortedGrowth.length > 0) {
            const latest = sortedGrowth[sortedGrowth.length - 1];
            document.getElementById('last-height').innerText = `${latest.height} cm`;
            document.getElementById('last-weight').innerText = `${latest.weight} kg`;
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
            }
        });
    }

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
            const hasRecord = records.some(r => new Date(r.timestamp).toLocaleDateString() === new Date(year, month, d).toLocaleDateString());
            html += `<div class="calendar-day ${hasRecord ? 'has-record' : ''}" data-date="${year}-${month + 1}-${d}">${d}</div>`;
        }
        html += '</div>';
        container.innerHTML = html;
        document.getElementById('cal-prev').onclick = () => { calendarDate.setMonth(month - 1); renderCalendar(); };
        document.getElementById('cal-next').onclick = () => { calendarDate.setMonth(month + 1); renderCalendar(); };
        document.querySelectorAll('.calendar-day').forEach(el => el.onclick = () => showDayDetails(el.dataset.date));
    }

    function showDayDetails(dateStr) {
        const dayTimeline = document.getElementById('day-timeline');
        const [y, m, d] = dateStr.split('-');
        const targetDate = new Date(y, m - 1, d).toLocaleDateString();
        const dayRecords = records.filter(r => new Date(r.timestamp).toLocaleDateString() === targetDate);
        document.getElementById('selected-date-label').innerText = `${y}년 ${m}월 ${d}일 기록`;
        dayTimeline.innerHTML = dayRecords.length ? '' : '<p>기록이 없습니다.</p>';
        dayRecords.forEach(r => {
            const item = document.createElement('div');
            item.className = 'diary-item';
            item.innerHTML = `<span class="time">${getTimeString(r.timestamp)}</span><div class="content">${r.content}</div>`;
            dayTimeline.appendChild(item);
        });
    }

    // --- Modal Implementation ---
    function openModal(type) {
        modalOverlay.style.display = 'flex';
        let content = '';
        let currentImageData = null;

        switch (type) {
            case 'feed':
                modalTitle.innerText = '식사 기록 🍼';
                content = `<div class="form-group"><label>종류</label><select id="in-sub"><option value="식사">식사</option><option value="간식">간식</option></select></div><div class="form-group"><label>양 (ml/g)</label><input type="number" id="in-amt" value="120"></div>`;
                break;
            case 'sleep':
                modalTitle.innerText = '수면 기록 💤';
                content = `<div class="form-group"><label>상태</label><select id="in-sub"><option value="낮잠 시작">낮잠 시작</option><option value="밤잠 시작">밤잠 시작</option><option value="기상">기상</option></select></div>`;
                break;
            case 'diaper':
                modalTitle.innerText = '기저귀 교체 🧷';
                content = `<div class="form-group"><label>상태</label><select id="in-sub"><option value="소변">소변</option><option value="대변">대변</option><option value="모두">소변 + 대변</option></select></div>`;
                break;
            case 'bath':
                modalTitle.innerText = '목욕 기록 �';
                content = `<div class="form-group"><label>종류</label><select id="in-sub"><option value="통목욕">통목욕</option><option value="간단 세안">간단 세안</option><option value="머리 감기">머리 감기</option></select></div>`;
                break;
            case 'health':
                modalTitle.innerText = '건강 기록 🏥';
                content = `
                    <div class="form-group"><label>체온 (℃)</label><input type="number" step="0.1" id="in-temp" placeholder="36.5"></div>
                    <div class="form-group"><label>항목</label>
                        <select id="in-sub">
                            <option value="체온 측정">체온 측정</option>
                            <option value="투약">투약 (약 먹임)</option>
                            <option value="병원">병원 방문</option>
                            <option value="기타">기타 건강사항</option>
                        </select>
                    </div>
                    <div class="form-group"><label>메모</label><input type="text" id="in-memo" placeholder="병원 이름이나 증상 등"></div>
                `;
                break;
            case 'photo':
                modalTitle.innerText = '사진첩 추가 📸';
                content = `
                    <div class="img-preview-container" id="img-preview-box">
                        <i class="fas fa-plus"></i>
                        <input type="file" id="in-file" accept="image/*" style="display:none">
                    </div>
                    <div class="form-group"><label>사진 설명</label><input type="text" id="in-desc" placeholder="오늘의 추억을 적어보세요"></div>
                `;
                break;
            case 'growth':
                modalTitle.innerText = '성장 기록 📈';
                content = `<div class="form-group"><label>키 (cm)</label><input type="number" step="0.1" id="in-h"></div><div class="form-group"><label>몸무게 (kg)</label><input type="number" step="0.1" id="in-w"></div>`;
                break;
            case 'profile':
                modalTitle.innerText = '프로필 수정 ✏️';
                content = `<div class="form-group"><label>이름</label><input type="text" id="in-name" value="${profile.name}"></div><div class="form-group"><label>생일</label><input type="date" id="in-birth" value="${profile.birthdate}"></div>`;
                break;
        }

        modalBody.innerHTML = content + `<button class="submit-btn" id="save-btn">저장하기</button>`;

        // Special logic for Photo Upload
        if (type === 'photo') {
            const previewBox = document.getElementById('img-preview-box');
            const fileIn = document.getElementById('in-file');
            previewBox.onclick = () => fileIn.click();
            fileIn.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (re) => {
                        currentImageData = re.target.result;
                        previewBox.innerHTML = `<img src="${currentImageData}">`;
                    };
                    reader.readAsDataURL(file);
                }
            };
        }

        document.getElementById('save-btn').onclick = () => {
            if (type === 'feed') addRecord('feed', `🍼 ${document.getElementById('in-sub').value} ${document.getElementById('in-amt').value}ml 완료`);
            else if (type === 'sleep') addRecord('sleep', `💤 수면: ${document.getElementById('in-sub').value}`);
            else if (type === 'diaper') addRecord('diaper', `🧷 기저귀: ${document.getElementById('in-sub').value}`);
            else if (type === 'bath') addRecord('bath', `� 목욕: ${document.getElementById('in-sub').value}`);
            else if (type === 'health') {
                const temp = document.getElementById('in-temp').value;
                const sub = document.getElementById('in-sub').value;
                const memo = document.getElementById('in-memo').value;
                addRecord('health', `🏥 [${sub}] ${temp ? temp + '℃' : ''} ${memo}`);
            }
            else if (type === 'photo') {
                const desc = document.getElementById('in-desc').value;
                if (currentImageData) addRecord('photo', `📸 ${desc}`, new Date().getTime(), currentImageData);
            }
            else if (type === 'growth') {
                growthData.push({ height: document.getElementById('in-h').value, weight: document.getElementById('in-w').value, timestamp: new Date().getTime() });
                saveAll(); renderGraph();
            }
            else if (type === 'profile') {
                profile.name = document.getElementById('in-name').value;
                profile.birthdate = document.getElementById('in-birth').value;
                saveAll(); render();
            }
            closeModal();
        };
    }

    function closeModal() { modalOverlay.style.display = 'none'; }
    closeBtn.onclick = closeModal;
    modalOverlay.onclick = (e) => { if (e.target === modalOverlay) closeModal(); };

    // --- Init ---
    ['feed', 'sleep', 'diaper', 'photo', 'health', 'bath'].forEach(id => {
        document.getElementById(`btn-${id}`).onclick = () => openModal(id);
    });
    const addGrowth = document.getElementById('btn-add-growth');
    if (addGrowth) addGrowth.onclick = () => openModal('growth');
    document.querySelector('.add-btn').onclick = () => openModal('feed');

    function renderSettings() {
        document.getElementById('set-profile').onclick = () => openModal('profile');
        document.getElementById('set-export').onclick = () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ records, growthData, profile }));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "eunu_diary_backup.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click(); downloadAnchorNode.remove();
        };
        document.getElementById('set-reset').onclick = () => {
            if (confirm('정말로 모든 기록을 삭제하시겠습니까?')) { records = []; growthData = []; saveAll(); render(); }
        };
    }

    switchView('home');
});
