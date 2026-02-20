document.addEventListener('DOMContentLoaded', () => {
    console.log('우리은우 성장일기 v4.5 (MamiTalk Redesign) 로드 완료');

    // --- State & Storage ---
    let records = JSON.parse(localStorage.getItem('babyRecords')) || [];
    let growthData = JSON.parse(localStorage.getItem('babyGrowth')) || [];
    let profile = JSON.parse(localStorage.getItem('babyProfile')) || {
        name: '우리은우',
        birthdate: new Date().toISOString().split('T')[0]
    };

    let currentView = 'home';
    let chart = null;

    // --- Selectors ---
    const modalOverlay = document.getElementById('modal-overlay');
    const modalBody = document.getElementById('modal-body');
    const modalTitle = document.getElementById('modal-title');
    const navItems = document.querySelectorAll('.nav-item');
    const views = {
        home: document.getElementById('view-home'),
        graph: document.getElementById('view-graph'),
        calendar: document.getElementById('view-calendar'),
        settings: document.getElementById('view-settings')
    };

    // --- Core Functions ---
    const saveAll = () => {
        localStorage.setItem('babyRecords', JSON.stringify(records));
        localStorage.setItem('babyGrowth', JSON.stringify(growthData));
        localStorage.setItem('babyProfile', JSON.stringify(profile));
    };

    const addRecord = (type, title, description, timestamp = new Date().getTime(), imageData = null) => {
        const id = 'rec_' + Math.random().toString(36).substr(2, 9);
        records.push({ id, type, title, description, timestamp, imageData });
        saveAll();
        render();
    };

    const deleteRecord = (id) => {
        if (confirm('이 기록을 삭제하시겠습니까?')) {
            records = records.filter(r => r.id !== id);
            saveAll();
            render();
        }
    };

    const getTimeString = (timestamp) => new Date(timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

    // --- Navigation ---
    const switchView = (viewName) => {
        Object.keys(views).forEach(key => { if (views[key]) views[key].style.display = (key === viewName) ? 'block' : 'none'; });
        navItems.forEach(item => item.classList.toggle('active', item.dataset.view === viewName));
        currentView = viewName;
        render();
    };

    navItems.forEach(item => item.onclick = () => switchView(item.dataset.view));

    // --- Render Logic ---
    function render() {
        const dateText = document.getElementById('current-date-text');
        if (dateText) {
            const today = new Date();
            dateText.innerText = `${String(today.getMonth() + 1).padStart(2, '0')}월 ${String(today.getDate()).padStart(2, '0')}일 (오늘)`;
        }

        if (currentView === 'home') renderHome();
        else if (currentView === 'graph') renderGraph();
        else if (currentView === 'calendar') renderCalendar();
        else if (currentView === 'settings') renderSettings();
    }

    function renderHome() {
        const timeline = document.getElementById('timeline');
        const sorted = [...records].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
        timeline.innerHTML = '';

        sorted.forEach(r => {
            const item = document.createElement('div');
            item.className = `diary-item type-${r.type}`;
            item.innerHTML = `
                <div class="item-time">${getTimeString(r.timestamp)}</div>
                <div class="item-dot"></div>
                <div class="item-content">
                    <div class="item-main">
                        <h4>${r.title}</h4>
                        <div class="item-sub">${r.description || ''}</div>
                        ${r.imageData ? `<img src="${r.imageData}" style="width:100%; border-radius:10px; margin-top:10px;">` : ''}
                    </div>
                    <div class="item-arrow" onclick="window.confirmDelete('${r.id}')">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            `;
            timeline.appendChild(item);
        });

        // Update Stats in cards
        const feedTotal = records.filter(r => r.type === 'feed').reduce((acc, curr) => acc + (parseInt(curr.description) || 0), 0);
        const diaperCount = records.filter(r => r.type === 'diaper').length;

        document.querySelector('#btn-feed .stat-val-small').innerText = `${feedTotal}ml`;
        document.querySelector('#btn-diaper .stat-val-small').innerText = `${diaperCount}회`;
        document.querySelector('#btn-photo .stat-val-small').innerText = `${records.filter(r => r.type === 'photo').length}개`;
    }

    window.confirmDelete = (id) => deleteRecord(id);

    function openModal(type) {
        modalOverlay.style.display = 'flex';
        let content = '';
        let currentImg = null;

        switch (type) {
            case 'feed':
                modalTitle.innerText = '식사 기록 🍼';
                content = `
                    <div class="form-group"><label>종류</label><select id="in-title"><option value="이유식">이유식</option><option value="분유">분유</option><option value="모유">모유</option><option value="간식">간식</option></select></div>
                    <div class="form-group"><label>양 (ml)</label><input type="number" id="in-desc" value="120"></div>
                `;
                break;
            case 'diaper':
                modalTitle.innerText = '기저귀 기록 🧷';
                content = `<div class="form-group"><label>상태</label><select id="in-title"><option value="소변">소변</option><option value="대변">대변</option><option value="모두">소변+대변</option></select></div><input type="hidden" id="in-desc" value="1회">`;
                break;
            case 'sleep':
                modalTitle.innerText = '수면 기록 💤';
                content = `<div class="form-group"><label>상태</label><select id="in-title"><option value="수면">수면 시작</option><option value="기상">기상</option></select></div><div class="form-group"><label>메모</label><input type="text" id="in-desc" placeholder="예: 48분"></div>`;
                break;
            case 'bath':
                modalTitle.innerText = '목욕 기록 🛁';
                content = `<div class="form-group"><label>종류</label><input type="text" id="in-title" value="목욕"></div><div class="form-group"><label>메모</label><input type="text" id="in-desc" placeholder="예: 15분"></div>`;
                break;
            case 'health':
                modalTitle.innerText = '건강 기록 🏥';
                content = `<div class="form-group"><label>항목</label><input type="text" id="in-title" placeholder="예: 병원 방문"></div><div class="form-group"><label>상세내용</label><input type="text" id="in-desc" placeholder="예: 체온 36.5도"></div>`;
                break;
            case 'photo':
                modalTitle.innerText = '하루일기 ✍️';
                content = `
                    <div class="form-group" id="img-box" style="border:1px dashed #ccc; height:150px; display:flex; justify-content:center; align-items:center; border-radius:15px; cursor:pointer;"><i class="fas fa-camera"></i><input type="file" id="in-file" style="display:none" accept="image/*"></div>
                    <div class="form-group"><textarea id="in-desc" style="width:100%; height:100px; border-radius:12px; border:1px solid #eee; padding:10px;" placeholder="오늘의 일기"></textarea></div>
                    <input type="hidden" id="in-title" value="하루일기">
                `;
                break;
        }

        modalBody.innerHTML = content;

        if (type === 'photo') {
            const box = document.getElementById('img-box'), fin = document.getElementById('in-file');
            box.onclick = () => fin.click();
            fin.onchange = (e) => {
                const f = e.target.files[0];
                if (f) {
                    const r = new FileReader(); r.onload = (re) => { currentImg = re.target.result; box.innerHTML = `<img src="${currentImg}" style="height:100%; border-radius:15px;">`; }; r.readAsDataURL(f);
                }
            };
        }

        document.getElementById('save-btn').onclick = () => {
            const title = document.getElementById('in-title').value;
            const desc = document.getElementById('in-desc').value;
            addRecord(type, title, type === 'feed' ? `${desc}ml` : desc, new Date().getTime(), currentImg);
            modalOverlay.style.display = 'none';
        }
    }

    modalOverlay.onclick = (e) => { if (e.target === modalOverlay) modalOverlay.style.display = 'none'; };

    // --- Init ---
    ['feed', 'diaper', 'sleep', 'bath', 'health', 'photo'].forEach(type => {
        document.getElementById(`btn-${type}`).onclick = () => openModal(type);
    });
    document.querySelector('.add-btn').onclick = () => openModal('feed');

    function renderGraph() {
        const ctx = document.getElementById('growthChart')?.getContext('2d');
        if (!ctx) return;
        if (chart) chart.destroy();
        chart = new Chart(ctx, { type: 'line', data: { labels: [], datasets: [] } });
    }

    function renderCalendar() {
        const container = document.getElementById('calendar-container');
        if (container) container.innerHTML = '<p style="padding:20px; color:#aaa;">달력 기능 준비 중...</p>';
    }

    function renderSettings() {
        document.getElementById('set-profile').onclick = () => alert('프로필 수정 준비 중');
        document.getElementById('set-reset').onclick = () => { if (confirm('모든 기록을 삭제하시겠습니까?')) { records = []; growthData = []; saveAll(); render(); } };
    }

    switchView('home');
});
