document.addEventListener('DOMContentLoaded', () => {
    console.log('우리은우 성장일기 v5.0 (MamiTalk Full UI & Logic) 로드 완료');

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

    const addRecord = (type, title, description, timestamp = new Date().getTime(), imageData = null, extra = {}) => {
        const id = 'rec_' + Math.random().toString(36).substr(2, 9);
        records.push({ id, type, title, description, timestamp, imageData, ...extra });
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

            let displayDesc = r.description;
            if (r.type === 'sleep' && r.duration) {
                displayDesc = `${r.duration} 수면`;
            }

            item.innerHTML = `
                <div class="item-time">${getTimeString(r.timestamp)}</div>
                <div class="item-dot"></div>
                <div class="item-content">
                    <div class="item-main">
                        <h4>${r.title}</h4>
                        <div class="item-sub">${displayDesc || ''}</div>
                        ${r.notes ? `<div class="item-notes"><i class="far fa-file-alt"></i> ${r.notes}</div>` : ''}
                        ${r.imageData ? `<img src="${r.imageData}" style="width:100%; border-radius:10px; margin-top:10px;">` : ''}
                    </div>
                    <div class="item-arrow" onclick="window.confirmDelete('${r.id}')">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            `;
            timeline.appendChild(item);
        });

        // Update Stats
        const todayStr = new Date().toLocaleDateString();
        const todayRecs = records.filter(r => new Date(r.timestamp).toLocaleDateString() === todayStr);

        const feedTotal = todayRecs.filter(r => r.type === 'feed').reduce((acc, curr) => acc + (parseInt(curr.description) || 0), 0);
        const diaperCount = todayRecs.filter(r => r.type === 'diaper').length;

        let sleepMinutes = 0;
        todayRecs.filter(r => r.type === 'sleep' && r.durationMinutes).forEach(r => sleepMinutes += r.durationMinutes);
        const sleepH = Math.floor(sleepMinutes / 60);
        const sleepM = sleepMinutes % 60;

        document.querySelector('#btn-feed .stat-val-small').innerText = `${feedTotal}ml`;
        document.querySelector('#btn-diaper .stat-val-small').innerText = `${diaperCount}회`;
        document.querySelector('#btn-sleep .stat-val-small').innerText = `${sleepH}시간 ${sleepM}분`;
    }

    window.confirmDelete = (id) => deleteRecord(id);

    function openModal(type) {
        modalOverlay.style.display = 'flex';
        let content = '';
        let currentImg = null;
        let selectedSub = '';

        const now = new Date();
        const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} 금 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        switch (type) {
            case 'feed':
                modalTitle.innerText = '식사 기록 🍼';
                content = `
                    <div class="modal-header-row"><h3>식사 기록</h3><i class="fas fa-trash-alt delete-icon"></i></div>
                    <div class="modal-date-picker"><i class="far fa-calendar-alt"></i> ${dateStr} <i class="fas fa-chevron-down"></i></div>
                    <div class="selection-grid">
                        <div class="selection-item active" data-val="meal"><div class="circle"><i class="fas fa-utensils"></i></div><label>이유식</label></div>
                        <div class="selection-item" data-val="snack"><div class="circle"><i class="fas fa-cookie"></i></div><label>간식</label></div>
                    </div>
                    <div class="amount-box">섭취량 <strong id="val-amt">200</strong> ml</div>
                    <div class="note-container">
                        <textarea id="in-notes" placeholder="기록을 남겨주세요"></textarea>
                        <div class="char-counter">0/1000</div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-cancel" onclick="document.getElementById('modal-overlay').style.display='none'">취소</button>
                        <button class="btn btn-save" id="save-btn">저장</button>
                    </div>
                `;
                selectedSub = '이유식';
                break;
            case 'diaper':
                modalTitle.innerText = '배변 기록 🧷';
                content = `
                    <div class="modal-header-row"><h3>배변 기록</h3><i class="fas fa-trash-alt delete-icon"></i></div>
                    <div class="modal-date-picker"><i class="far fa-calendar-alt"></i> ${dateStr} <i class="fas fa-chevron-down"></i></div>
                    <div class="selection-grid">
                        <div class="selection-item" data-val="pee"><div class="circle"><i class="fas fa-tint"></i></div><label>소변</label></div>
                        <div class="selection-item active" data-val="poo"><div class="circle"><i class="fas fa-poop"></i></div><label>대변</label></div>
                        <div class="selection-item" data-val="both"><div class="circle"><i class="fas fa-check-double"></i></div><label>둘다</label></div>
                    </div>
                    <div class="note-container">
                        <textarea id="in-notes" placeholder="기록을 남겨주세요"></textarea>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-cancel" onclick="document.getElementById('modal-overlay').style.display='none'">취소</button>
                        <button class="btn btn-save" id="save-btn" style="background:#efebe9; color:#8d6e63;">저장</button>
                    </div>
                `;
                selectedSub = '대변';
                break;
            case 'sleep':
                modalTitle.innerText = '수면 기록 💤';
                content = `
                    <div class="modal-header-row"><h3>수면 기록</h3><i class="fas fa-trash-alt delete-icon"></i></div>
                    <div class="modal-date-picker"><i class="far fa-calendar-alt"></i> ${dateStr} <i class="fas fa-chevron-down"></i></div>
                    <div class="centered-icon-box"><div class="circle"><i class="fas fa-moon"></i></div><label>수면</label></div>
                    <div class="time-picker-grid">
                        <div class="time-picker-box"><span class="label-label">시작</span><div class="time-inputs"><input type="number" id="h1" value="16"><span>시</span><input type="number" id="m1" value="24"><span>분</span></div></div>
                        <div class="time-picker-box"><span class="label-label">종류</span><div class="time-inputs"><input type="number" id="h2" value="17"><span>시</span><input type="number" id="m2" value="12"><span>분</span></div></div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-cancel" onclick="document.getElementById('modal-overlay').style.display='none'">취소</button>
                        <button class="btn btn-save" id="save-btn">저장</button>
                    </div>
                `;
                selectedSub = '수면';
                break;
            case 'health':
            case 'photo':
            case 'growth':
                // Keeping simple for now as per image wasn't provided for these
                modalTitle.innerText = '기록 추가';
                content = `<div class="form-group"><label>내용</label><input type="text" id="in-title" placeholder="입력..."></div><div class="form-group"><label>메모</label><textarea id="in-desc"></textarea></div><div class="modal-footer"><button class="btn btn-save" id="save-btn">저장</button></div>`;
                break;
        }

        modalBody.innerHTML = content;

        // Interaction logic for types
        if (type === 'feed' || type === 'diaper') {
            document.querySelectorAll('.selection-item').forEach(item => {
                item.onclick = () => {
                    document.querySelectorAll('.selection-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    selectedSub = item.querySelector('label').innerText;
                };
            });
        }

        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.onclick = () => {
                if (type === 'feed') {
                    const notes = document.getElementById('in-notes').value;
                    addRecord('feed', selectedSub, '200ml', new Date().getTime(), null, { notes });
                } else if (type === 'diaper') {
                    const notes = document.getElementById('in-notes').value;
                    addRecord('diaper', selectedSub, '1회', new Date().getTime(), null, { notes });
                } else if (type === 'sleep') {
                    const h1 = parseInt(document.getElementById('h1').value), m1 = parseInt(document.getElementById('m1').value);
                    const h2 = parseInt(document.getElementById('h2').value), m2 = parseInt(document.getElementById('m2').value);
                    const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
                    const dur = `${Math.floor(diff / 60)}시간 ${diff % 60}분`;
                    addRecord('sleep', '수면', dur, new Date().getTime(), null, { duration: dur, durationMinutes: diff });
                } else {
                    const title = document.getElementById('in-title')?.value || '기록';
                    const desc = document.getElementById('in-desc')?.value || '';
                    addRecord(type, title, desc);
                }
                modalOverlay.style.display = 'none';
            };
        }
    }

    modalOverlay.onclick = (e) => { if (e.target === modalOverlay) modalOverlay.style.display = 'none'; };

    // --- Growing & Calendar Logic ---
    function renderGraph() {
        const ctx = document.getElementById('growthChart')?.getContext('2d');
        if (!ctx) return;

        const sorted = [...growthData].sort((a, b) => a.timestamp - b.timestamp);

        if (chart) chart.destroy();
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sorted.map(d => new Date(d.timestamp).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })),
                datasets: [
                    { label: '키 (cm)', data: sorted.map(d => d.height), borderColor: '#ffa000', backgroundColor: 'rgba(255,160,0,0.1)', tension: 0.4, fill: true },
                    { label: '몸무게 (kg)', data: sorted.map(d => d.weight), borderColor: '#00acc1', backgroundColor: 'rgba(0,172,193,0.1)', tension: 0.4, fill: true }
                ]
            },
            options: { responsive: true, plugins: { legend: { position: 'top' } } }
        });
    }

    let currentCalDate = new Date();
    function renderCalendar() {
        const container = document.getElementById('calendar-container');
        if (!container) return;

        const year = currentCalDate.getFullYear();
        const month = currentCalDate.getMonth();

        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();

        let html = `
            <div class="calendar-wrapper" style="padding:20px;">
                <div class="cal-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <i class="fas fa-chevron-left" id="cal-prev"></i>
                    <h3 style="font-weight:700;">${year}년 ${month + 1}월</h3>
                    <i class="fas fa-chevron-right" id="cal-next"></i>
                </div>
                <div class="cal-grid" style="display:grid; grid-template-columns:repeat(7, 1fr); gap:10px; text-align:center;">
                    ${['일', '월', '화', '수', '목', '금', '토'].map(d => `<div style="font-size:0.8rem; color:#888;">${d}</div>`).join('')}
        `;

        for (let i = 0; i < firstDay; i++) html += '<div></div>';
        for (let d = 1; d <= lastDate; d++) {
            const dateKey = new Date(year, month, d).toLocaleDateString();
            const hasRecord = records.some(r => new Date(r.timestamp).toLocaleDateString() === dateKey);
            html += `
                <div style="padding:10px; border-radius:12px; font-size:0.9rem; position:relative; background:${hasRecord ? '#fff9e6' : '#f9f9f9'}; cursor:pointer;" onclick="alert('${month + 1}월 ${d}일 기록 확인')">
                    ${d}
                    ${hasRecord ? '<div style="position:absolute; bottom:4px; left:50%; transform:translateX(-50%); width:4px; height:4px; background:#ffa000; border-radius:50%;"></div>' : ''}
                </div>
            `;
        }

        container.innerHTML = html + '</div></div>';

        document.getElementById('cal-prev').onclick = () => { currentCalDate.setMonth(month - 1); renderCalendar(); };
        document.getElementById('cal-next').onclick = () => { currentCalDate.setMonth(month + 1); renderCalendar(); };
    }

    function renderSettings() {
        const setProfile = document.getElementById('set-profile');
        if (setProfile) setProfile.onclick = () => {
            const name = prompt('아이 이름을 입력하세요', profile.name);
            if (name) { profile.name = name; saveAll(); render(); }
        };
        const resetBtn = document.getElementById('set-reset');
        if (resetBtn) resetBtn.onclick = () => { if (confirm('모든 기록을 삭제하시겠습니까?')) { records = []; growthData = []; saveAll(); render(); } };

        const exportBtn = document.getElementById('set-export');
        if (exportBtn) exportBtn.onclick = () => {
            const blob = new Blob([JSON.stringify({ records, growthData, profile })], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'baby_diary_export.json'; a.click();
        };
    }

    // --- Init ---
    ['feed', 'diaper', 'sleep', 'bath', 'health', 'photo'].forEach(type => {
        const btn = document.getElementById(`btn-${type}`);
        if (btn) btn.onclick = () => openModal(type);
    });

    const addBtn = document.querySelector('.add-btn');
    if (addBtn) addBtn.onclick = () => openModal('feed');

    const growthBtn = document.getElementById('btn-add-growth');
    if (growthBtn) growthBtn.onclick = () => {
        const h = prompt('키(cm)를 입력하세요');
        const w = prompt('몸무게(kg)를 입력하세요');
        if (h && w) { growthData.push({ height: parseFloat(h), weight: parseFloat(w), timestamp: new Date().getTime() }); saveAll(); renderGraph(); }
    };

    switchView('home');
});
