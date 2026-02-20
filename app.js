document.addEventListener('DOMContentLoaded', () => {
    console.log('우리은우 성장일기 v3.9 (Record Management) 로드 완료');

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
    const closeBtn = document.getElementById('close-modal');
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

    const addRecord = (type, content, timestamp = new Date().getTime(), imageData = null) => {
        const id = 'rec_' + Math.random().toString(36).substr(2, 9);
        records.push({ id, type, content, timestamp, imageData });
        saveAll();
        render();
    };

    const updateRecord = (id, newContent) => {
        const idx = records.findIndex(r => r.id === id);
        if (idx !== -1) {
            records[idx].content = newContent;
            saveAll();
            render();
        }
    };

    const deleteRecord = (id) => {
        if (confirm('이 기록을 삭제하시겠습니까?')) {
            records = records.filter(r => r.id !== id);
            saveAll();
            render();
        }
    };

    const calculateDays = (birthdate) => {
        const diff = new Date().getTime() - new Date(birthdate).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    };

    const getTimeString = (timestamp) => new Date(timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

    const getTimeAgo = (timestamp) => {
        if (!timestamp) return "기록 없음";
        const mins = Math.floor((new Date().getTime() - timestamp) / 60000);
        if (mins < 1) return "방금 전";
        if (mins < 60) return `${mins}분 전`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}시간 전`;
        return `${Math.floor(hours / 24)}일 전`;
    };

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
        const nameEl = document.getElementById('home-baby-name');
        const daysEl = document.getElementById('home-baby-days');
        if (nameEl) nameEl.innerText = profile.name;
        if (daysEl) daysEl.innerText = `태어난 지 ${calculateDays(profile.birthdate)}일째`;

        if (currentView === 'home') renderHome();
        else if (currentView === 'graph') renderGraph();
        else if (currentView === 'calendar') renderCalendar();
        else if (currentView === 'settings') renderSettings();
    }

    const typeIcons = {
        feed: 'fa-baby-bottle',
        sleep: 'fa-moon',
        diaper: 'fa-poop',
        photo: 'fa-book-open',
        health: 'fa-medkit',
        bath: 'fa-bath'
    };

    function renderHome() {
        const timeline = document.getElementById('timeline');
        const sorted = [...records].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
        timeline.innerHTML = '';
        sorted.forEach(r => {
            const item = document.createElement('div');
            item.className = `diary-item type-${r.type}`;
            const iconClass = typeIcons[r.type] || 'fa-check-circle';

            // Generate unique ID if missing
            if (!r.id) r.id = 'rec_' + Math.random().toString(36).substr(2, 9);

            item.innerHTML = `
                <span class="time">${getTimeString(r.timestamp)}</span>
                <div class="content">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <i class="fas ${iconClass}" style="color:var(--primary-color); font-size:0.8rem"></i>
                        <span>${r.content}</span>
                    </div>
                    ${r.imageData ? `<img src="${r.imageData}" class="timeline-img">` : ''}
                    <div class="item-actions">
                        <button class="action-btn edit" data-id="${r.id}"><i class="fas fa-edit"></i> 수정</button>
                        <button class="action-btn delete" data-id="${r.id}"><i class="fas fa-trash-alt"></i> 삭제</button>
                    </div>
                </div>
            `;
            timeline.appendChild(item);
        });

        // Add event listeners for edit/delete
        document.querySelectorAll('.action-btn.edit').forEach(btn => {
            btn.onclick = () => openModal('edit', btn.dataset.id);
        });
        document.querySelectorAll('.action-btn.delete').forEach(btn => {
            btn.onclick = () => deleteRecord(btn.dataset.id);
        });

        Object.keys(typeIcons).forEach(type => {
            const card = document.getElementById(`btn-${type}`);
            if (card) {
                const stat = card.querySelector('.stat-value');
                if (type === 'photo') stat.innerText = `${records.filter(r => r.type === 'photo').length}개의 일기`;
                else {
                    const last = records.filter(r => r.type === type).sort((a, b) => b.timestamp - a.timestamp)[0];
                    stat.innerText = last ? getTimeAgo(last.timestamp) : '기록 없음';
                }
            }
        });
    }

    function renderGraph() {
        const ctx = document.getElementById('growthChart')?.getContext('2d');
        if (!ctx) return;
        const sorted = [...growthData].sort((a, b) => a.timestamp - b.timestamp);
        if (sorted.length > 0) {
            const last = sorted[sorted.length - 1];
            document.getElementById('last-height').innerText = `${last.height} cm`;
            document.getElementById('last-weight').innerText = `${last.weight} kg`;
        }
        if (chart) chart.destroy();
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sorted.map(d => new Date(d.timestamp).toLocaleDateString()),
                datasets: [
                    { label: '키 (cm)', data: sorted.map(d => d.height), borderColor: '#ff9a8b', tension: 0.3, yAxisID: 'y' },
                    { label: '몸무게 (kg)', data: sorted.map(d => d.weight), borderColor: '#ff6b6b', tension: 0.3, yAxisID: 'y1' }
                ]
            }
        });
    }

    let calDate = new Date();
    function renderCalendar() {
        const container = document.getElementById('calendar-container');
        if (!container) return;
        const y = calDate.getFullYear(), m = calDate.getMonth();
        const first = new Date(y, m, 1).getDay(), last = new Date(y, m + 1, 0).getDate();
        let html = `<div class="calendar-header"><span id="cal-prev">&lt;</span><span>${y}년 ${m + 1}월</span><span id="cal-next">&gt;</span></div><div class="calendar-grid">`;
        ['일', '월', '화', '수', '목', '금', '토'].forEach(d => html += `<div class="calendar-day-header">${d}</div>`);
        for (let i = 0; i < first; i++) html += '<div></div>';
        for (let d = 1; d <= last; d++) {
            const has = records.some(r => new Date(r.timestamp).toLocaleDateString() === new Date(y, m, d).toLocaleDateString());
            html += `<div class="calendar-day ${has ? 'has-record' : ''}" data-date="${y}-${m + 1}-${d}">${d}</div>`;
        }
        container.innerHTML = html + '</div>';
        document.getElementById('cal-prev').onclick = () => { calDate.setMonth(m - 1); renderCalendar(); };
        document.getElementById('cal-next').onclick = () => { calDate.setMonth(m + 1); renderCalendar(); };
        document.querySelectorAll('.calendar-day').forEach(el => el.onclick = () => showDay(el.dataset.date));
    }

    function showDay(dateStr) {
        const [y, m, d] = dateStr.split('-');
        const target = new Date(y, m - 1, d).toLocaleDateString();
        const dayRecs = records.filter(r => new Date(r.timestamp).toLocaleDateString() === target);
        document.getElementById('selected-date-label').innerText = `${y}년 ${m}월 ${d}일 기록`;
        const dayTimeline = document.getElementById('day-timeline');
        dayTimeline.innerHTML = dayRecs.length ? '' : '<p>기록이 없습니다.</p>';
        dayRecs.sort((a, b) => b.timestamp - a.timestamp).forEach(r => {
            const item = document.createElement('div');
            item.className = 'diary-item';
            item.innerHTML = `<span class="time">${getTimeString(r.timestamp)}</span><div class="content"><span>${r.content}</span></div>`;
            dayTimeline.appendChild(item);
        });
    }

    function renderSettings() {
        document.getElementById('set-profile').onclick = () => openModal('profile');
        document.getElementById('set-export').onclick = () => {
            const blob = new Blob([JSON.stringify({ records, growthData, profile })], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'baby_diary_backup.json'; a.click();
        };
        document.getElementById('set-reset').onclick = () => { if (confirm('모든 기록을 삭제하시겠습니까?')) { records = []; growthData = []; saveAll(); render(); } };
    }

    function openModal(type, targetId = null) {
        modalOverlay.style.display = 'flex';
        let content = '';
        let currentImg = null;

        switch (type) {
            case 'edit':
                const rec = records.find(r => r.id === targetId);
                modalTitle.innerText = '기록 수정 ✏️';
                content = `<div class="form-group"><label>내용 수정</label><textarea id="edit-content" style="width:100%; height:80px; border-radius:12px; border:1px solid #eee; padding:10px;">${rec.content}</textarea></div>`;
                break;
            case 'feed':
                modalTitle.innerText = '식사 기록 🍼';
                content = `<div class="form-group"><label>종류</label><select id="in-sub"><option value="식사">식사</option><option value="간식">간식</option><option value="분유">분유</option><option value="모유">모유</option></select></div><div class="form-group"><label>양 (ml/g)</label><input type="number" id="in-amt" value="120"></div>`;
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
                modalTitle.innerText = '목욕 기록 🛁';
                content = `<div class="form-group"><label>종류</label><select id="in-sub"><option value="통목욕">통목욕</option><option value="간단 세안">간단 세안</option><option value="머리 감기">머리 감기</option></select></div>`;
                break;
            case 'health':
                modalTitle.innerText = '건강 기록 🏥';
                content = `<div class="form-group"><label>체온 (℃)</label><input type="number" step="0.1" id="in-temp" placeholder="36.5"></div><div class="form-group"><label>항목</label><select id="in-sub"><option value="체온 측정">체온 측정</option><option value="투약">투약</option><option value="병원">병원 방문</option><option value="기타">기타</option></select></div><div class="form-group"><label>메모</label><input type="text" id="in-memo"></div>`;
                break;
            case 'photo':
                modalTitle.innerText = '하루일기 쓰기 ✍️';
                content = `<div class="img-preview-container" id="img-box"><div class="img-preview-box-inner"><i class="fas fa-camera"></i><span>사진 선택</span></div><input type="file" id="in-file" accept="image/*" style="display:none"></div><div class="form-group"><textarea id="in-desc" style="width:100%; height:100px; border-radius:12px; border:1px solid #eee; padding:10px;" placeholder="오늘의 추억"></textarea></div>`;
                break;
            case 'growth':
                modalTitle.innerText = '성장 기록 📈';
                content = `<div class="form-group"><label>키 (cm)</label><input type="number" step="0.1" id="in-h"></div><div class="form-group"><label>몸무게 (kg)</label><input type="number" step="0.1" id="in-w"></div>`;
                break;
            case 'profile':
                modalTitle.innerText = '아이 정보 수정 ✏️';
                content = `<div class="form-group"><label>이름</label><input type="text" id="in-name" value="${profile.name}"></div><div class="form-group"><label>생일</label><input type="date" id="in-birth" value="${profile.birthdate}"></div>`;
                break;
        }

        modalBody.innerHTML = content + `<button class="submit-btn" id="save-btn">저장하기</button>`;

        if (type === 'photo') {
            const box = document.getElementById('img-box'), fin = document.getElementById('in-file');
            box.onclick = () => fin.click();
            fin.onchange = (e) => {
                const f = e.target.files[0];
                if (f) {
                    const r = new FileReader(); r.onload = (re) => { currentImg = re.target.result; box.innerHTML = `<img src="${currentImg}">`; }; r.readAsDataURL(f);
                }
            };
        }

        document.getElementById('save-btn').onclick = () => {
            if (type === 'edit') updateRecord(targetId, document.getElementById('edit-content').value);
            else if (type === 'feed') addRecord('feed', `🍼 ${document.getElementById('in-sub').value} ${document.getElementById('in-amt').value}ml 완료`);
            else if (type === 'sleep') addRecord('sleep', `💤 수면: ${document.getElementById('in-sub').value}`);
            else if (type === 'diaper') addRecord('diaper', `🧷 기저귀: ${document.getElementById('in-sub').value}`);
            else if (type === 'bath') addRecord('bath', `🛁 목욕: ${document.getElementById('in-sub').value}`);
            else if (type === 'health') {
                const t = document.getElementById('in-temp').value, s = document.getElementById('in-sub').value, m = document.getElementById('in-memo').value;
                addRecord('health', `🏥 [${s}] ${t ? t + '℃' : ''} ${m}`);
            }
            else if (type === 'photo') addRecord('photo', `📖 ${document.getElementById('in-desc').value || '오늘의 일기'}`, new Date().getTime(), currentImg);
            else if (type === 'growth') { growthData.push({ height: document.getElementById('in-h').value, weight: document.getElementById('in-w').value, timestamp: new Date().getTime() }); saveAll(); renderGraph(); }
            else if (type === 'profile') { profile.name = document.getElementById('in-name').value; profile.birthdate = document.getElementById('in-birth').value; saveAll(); render(); }
            closeModal();
        };
    }

    const closeModal = () => modalOverlay.style.display = 'none';
    closeBtn.onclick = closeModal;
    modalOverlay.onclick = (e) => { if (e.target === modalOverlay) closeModal(); };

    // --- Init All Buttons ---
    Object.keys(typeIcons).forEach(id => {
        const btn = document.getElementById(`btn-${id}`);
        if (btn) btn.onclick = () => openModal(id);
    });
    const addGrowth = document.getElementById('btn-add-growth');
    if (addGrowth) addGrowth.onclick = () => openModal('growth');
    const plusBtn = document.querySelector('.add-btn');
    if (plusBtn) plusBtn.onclick = () => openModal('feed');

    switchView('home');
});
