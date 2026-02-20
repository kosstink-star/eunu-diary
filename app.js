document.addEventListener('DOMContentLoaded', () => {
    console.log('우리은우 성장일기 v6.0 (Date Navigation & Fixes) 로드 완료');

    // --- State & Storage ---
    let records = JSON.parse(localStorage.getItem('babyRecords')) || [];
    let growthData = JSON.parse(localStorage.getItem('babyGrowth')) || [];
    let profile = JSON.parse(localStorage.getItem('babyProfile')) || {
        name: '우리은우',
        birthdate: new Date().toISOString().split('T')[0]
    };

    let currentView = 'home';
    let chart = null;
    let selectedDate = new Date(); // Current selected date for viewing

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
        records.push({ id, type, title, description, timestamp: Number(timestamp), imageData, ...extra });
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

    const getDayString = (date) => {
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const day = days[date.getDay()];
        const isToday = new Date().toLocaleDateString() === date.toLocaleDateString();
        return `${m}월 ${d}일 (${isToday ? '오늘' : day})`;
    };

    // --- Navigation ---
    const switchView = (viewName) => {
        Object.keys(views).forEach(key => { if (views[key]) views[key].style.display = (key === viewName) ? 'block' : 'none'; });
        navItems.forEach(item => item.classList.toggle('active', item.dataset.view === viewName));
        currentView = viewName;
        render();
    };

    navItems.forEach(item => item.onclick = () => switchView(item.dataset.view));

    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.onclick = () => switchView('home');
    }

    // Date Navigation Logic
    const prevDateBtn = document.querySelector('.date-nav .fa-chevron-left');
    const nextDateBtn = document.querySelector('.date-nav .fa-chevron-right');

    if (prevDateBtn) {
        prevDateBtn.onclick = () => {
            selectedDate.setDate(selectedDate.getDate() - 1);
            render();
        };
    }
    if (nextDateBtn) {
        nextDateBtn.onclick = () => {
            selectedDate.setDate(selectedDate.getDate() + 1);
            render();
        };
    }

    // --- Render Logic ---
    function render() {
        if (currentView === 'home') renderHome();
        else if (currentView === 'graph') renderGraph();
        else if (currentView === 'calendar') renderCalendar();
        else if (currentView === 'settings') renderSettings();
    }

    function renderHome() {
        // Update header with baby name
        const headerTitle = document.querySelector('header h1');
        if (headerTitle) headerTitle.innerText = `${profile.name} 육아 기록`;

        const dateText = document.getElementById('current-date-text');
        if (dateText) dateText.innerText = getDayString(selectedDate);

        const timeline = document.getElementById('timeline');
        const targetDateStr = selectedDate.toLocaleDateString();

        // Filter records for the selected date
        const filtered = records.filter(r => new Date(r.timestamp).toLocaleDateString() === targetDateStr);
        const sorted = [...filtered].sort((a, b) => b.timestamp - a.timestamp);

        timeline.innerHTML = sorted.length ? '' : '<p style="text-align:center; padding:50px; color:#ccc;">기록이 없습니다.</p>';

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

        // Update Stats for the selected date
        const feedTotal = filtered.filter(r => r.type === 'feed').reduce((acc, curr) => acc + (parseInt(curr.description) || 0), 0);
        const diaperCount = filtered.filter(r => r.type === 'diaper').length;

        let sleepMinutes = 0;
        filtered.filter(r => r.type === 'sleep' && r.durationMinutes).forEach(r => sleepMinutes += r.durationMinutes);
        const sleepH = Math.floor(sleepMinutes / 60);
        const sleepM = sleepMinutes % 60;

        const bathMinutes = filtered.filter(r => r.type === 'bath').length; // Just count for now or implement duration
        const healthCount = filtered.filter(r => r.type === 'health').length;
        const photoCount = filtered.filter(r => r.type === 'photo').length;

        document.querySelector('#btn-feed .stat-val-small').innerText = `${feedTotal}ml`;
        document.querySelector('#btn-diaper .stat-val-small').innerText = `${diaperCount}회`;
        document.querySelector('#btn-sleep .stat-val-small').innerText = `${sleepH}시간 ${sleepM}분`;
        document.querySelector('#btn-bath .stat-val-small').innerText = `${bathMinutes}회`;
        document.querySelector('#btn-health .stat-val-small').innerText = `${healthCount}개`;
        document.querySelector('#btn-photo .stat-val-small').innerText = `${photoCount}개`;
    }

    window.confirmDelete = (id) => deleteRecord(id);

    // --- Modal Logic ---
    function openModal(type) {
        modalOverlay.style.display = 'flex';
        let content = '';
        let currentImg = null;
        let selectedSub = '';

        // Modal should default to the selectedDate's time
        const now = new Date();
        const displayTime = new Date(selectedDate);
        displayTime.setHours(now.getHours());
        displayTime.setMinutes(now.getMinutes());

        const dateStr = `${selectedDate.getFullYear()}.${String(selectedDate.getMonth() + 1).padStart(2, '0')}.${String(selectedDate.getDate()).padStart(2, '0')}`;

        const timePickerHtml = `
            <div class="time-picker-grid" style="margin-bottom:20px;">
                <div class="time-picker-box" style="width:100%"><span class="label-label">시간 선택</span><div class="time-inputs"><input type="number" id="base-h" value="${displayTime.getHours()}"><span>시</span><input type="number" id="base-m" value="${displayTime.getMinutes()}"><span>분</span></div></div>
            </div>
        `;

        switch (type) {
            case 'feed':
                modalTitle.innerText = '식사 기록 🍼';
                content = `
                    <div class="modal-header-row"><h3>식사 기록</h3><div class="delete-icon" onclick="document.getElementById('modal-overlay').style.display='none'"><i class="fas fa-times"></i></div></div>
                    <div class="modal-date-picker"><i class="far fa-calendar-alt"></i> ${dateStr}</div>
                    ${timePickerHtml}
                    <div class="selection-grid">
                        <div class="selection-item active" data-val="meal"><div class="circle"><i class="fas fa-utensils"></i></div><label>이유식</label></div>
                        <div class="selection-item" data-val="snack"><div class="circle"><i class="fas fa-cookie"></i></div><label>간식</label></div>
                    </div>
                    <div class="amount-box">섭취량 <strong id="val-amt-display">200</strong> ml</div>
                    <div class="form-group" style="padding:10px 0;"><input type="number" id="in-amt" value="200" style="text-align:center;"></div>
                    <div class="note-container">
                        <textarea id="in-notes" placeholder="기록을 남겨주세요"></textarea>
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
                    <div class="modal-header-row"><h3>배변 기록</h3><div class="delete-icon" onclick="document.getElementById('modal-overlay').style.display='none'"><i class="fas fa-times"></i></div></div>
                    <div class="modal-date-picker"><i class="far fa-calendar-alt"></i> ${dateStr}</div>
                    ${timePickerHtml}
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
                    <div class="modal-header-row"><h3>수면 기록</h3><div class="delete-icon" onclick="document.getElementById('modal-overlay').style.display='none'"><i class="fas fa-times"></i></div></div>
                    <div class="modal-date-picker"><i class="far fa-calendar-alt"></i> ${dateStr}</div>
                    <div class="centered-icon-box"><div class="circle"><i class="fas fa-moon"></i></div><label>수면</label></div>
                    <div class="time-picker-grid">
                        <div class="time-picker-box"><span class="label-label">시작</span><div class="time-inputs"><input type="number" id="h1" value="16"><span>시</span><input type="number" id="m1" value="24"><span>분</span></div></div>
                        <div class="time-picker-box"><span class="label-label">종료</span><div class="time-inputs"><input type="number" id="h2" value="${displayTime.getHours()}"><span>시</span><input type="number" id="m2" value="${displayTime.getMinutes()}"><span>분</span></div></div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-cancel" onclick="document.getElementById('modal-overlay').style.display='none'">취소</button>
                        <button class="btn btn-save" id="save-btn">저장</button>
                    </div>
                `;
                selectedSub = '수면';
                break;
            case 'photo':
                modalTitle.innerText = '하루일기 ✍️';
                content = `
                    <div class="modal-header-row"><h3>하루일기</h3><div class="delete-icon" onclick="document.getElementById('modal-overlay').style.display='none'"><i class="fas fa-times"></i></div></div>
                    <div class="modal-date-picker"><i class="far fa-calendar-alt"></i> ${dateStr}</div>
                    ${timePickerHtml}
                    <div class="form-group" id="img-box" style="border:1px dashed #ccc; height:150px; display:flex; justify-content:center; align-items:center; border-radius:15px; cursor:pointer;"><i class="fas fa-camera"></i><input type="file" id="in-file" style="display:none" accept="image/*"></div>
                    <div class="note-container">
                        <textarea id="in-notes" placeholder="오늘의 소중한 추억을 남겨주세요"></textarea>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-cancel" onclick="document.getElementById('modal-overlay').style.display='none'">취소</button>
                        <button class="btn btn-save" id="save-btn">저장</button>
                    </div>
                `;
                selectedSub = '하루일기';
                break;
            case 'bath':
                modalTitle.innerText = '목욕 기록 🛁';
                content = `
                    <div class="modal-header-row"><h3>목욕 기록</h3><div class="delete-icon" onclick="document.getElementById('modal-overlay').style.display='none'"><i class="fas fa-times"></i></div></div>
                    <div class="modal-date-picker"><i class="far fa-calendar-alt"></i> ${dateStr}</div>
                    ${timePickerHtml}
                    <div class="selection-grid">
                        <div class="selection-item active" data-val="full"><div class="circle"><i class="fas fa-bath"></i></div><label>통목욕</label></div>
                        <div class="selection-item" data-val="quick"><div class="circle"><i class="fas fa-shower"></i></div><label>간단세안</label></div>
                    </div>
                    <div class="note-container">
                       <textarea id="in-notes" placeholder="목욕 중 특이사항이 있었나요?"></textarea>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-cancel" onclick="document.getElementById('modal-overlay').style.display='none'">취소</button>
                        <button class="btn btn-save" id="save-btn" style="background:#f9fbe7; color:#afb42b;">저장</button>
                    </div>
                `;
                selectedSub = '통목욕';
                break;
            case 'health':
                modalTitle.innerText = '건강 기록 🏥';
                content = `
                    <div class="modal-header-row"><h3>건강 기록</h3><div class="delete-icon" onclick="document.getElementById('modal-overlay').style.display='none'"><i class="fas fa-times"></i></div></div>
                    <div class="modal-date-picker"><i class="far fa-calendar-alt"></i> ${dateStr}</div>
                    ${timePickerHtml}
                    <div class="form-group"><input type="text" id="in-title-custom" placeholder="제목 (병원 방문, 투약 등)" style="text-align:center; padding:15px; border-radius:15px; border:1px solid #eee; width:100%;"></div>
                    <div class="note-container">
                       <textarea id="in-notes" placeholder="체온, 처방 내용 등을 기록하세요"></textarea>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-cancel" onclick="document.getElementById('modal-overlay').style.display='none'">취소</button>
                        <button class="btn btn-save" id="save-btn" style="background:#e1f5fe; color:#0288d1;">저장</button>
                    </div>
                `;
                selectedSub = '건강';
                break;
        }

        modalBody.innerHTML = content;

        // Interactions
        const inAmt = document.getElementById('in-amt');
        const valAmtDisplay = document.getElementById('val-amt-display');
        if (inAmt && valAmtDisplay) inAmt.oninput = (e) => valAmtDisplay.innerText = e.target.value;

        document.querySelectorAll('.selection-item').forEach(item => {
            item.onclick = () => {
                document.querySelectorAll('.selection-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                selectedSub = item.querySelector('label').innerText;
            };
        });

        if (type === 'photo') {
            const box = document.getElementById('img-box'), fin = document.getElementById('in-file');
            if (box) box.onclick = () => fin.click();
            if (fin) fin.onchange = (e) => {
                const f = e.target.files[0];
                if (f) {
                    const r = new FileReader();
                    r.onload = (re) => {
                        currentImg = re.target.result;
                        box.innerHTML = `<img src="${currentImg}" style="height:100%; border-radius:15px;">`;
                    };
                    r.readAsDataURL(f);
                }
            };
        }

        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.onclick = () => {
                const selH = Number(document.getElementById('base-h')?.value || displayTime.getHours());
                const selM = Number(document.getElementById('base-m')?.value || displayTime.getMinutes());
                const targetTimestamp = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), selH, selM).getTime();

                const notes = document.getElementById('in-notes')?.value || "";

                if (type === 'feed') {
                    const amt = document.getElementById('in-amt').value;
                    addRecord('feed', selectedSub, `${amt}ml`, targetTimestamp, null, { notes });
                } else if (type === 'diaper') {
                    addRecord('diaper', selectedSub, '1회', targetTimestamp, null, { notes });
                } else if (type === 'sleep') {
                    const h1 = Number(document.getElementById('h1').value), m1 = Number(document.getElementById('m1').value);
                    const h2 = Number(document.getElementById('h2').value), m2 = Number(document.getElementById('m2').value);
                    const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
                    const dur = `${Math.floor(diff / 60)}시간 ${diff % 60}분`;
                    const startTime = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), h2, m2).getTime();
                    addRecord('sleep', '수면', dur, startTime, null, { duration: dur, durationMinutes: diff, notes });
                } else if (type === 'photo') {
                    addRecord('photo', '하루일기', '📖 오늘의 일기', targetTimestamp, currentImg, { notes });
                } else if (type === 'bath') {
                    addRecord('bath', selectedSub, '', targetTimestamp, null, { notes });
                } else if (type === 'health') {
                    const customTitle = document.getElementById('in-title-custom').value || "건강 기록";
                    addRecord('health', customTitle, '', targetTimestamp, null, { notes });
                }
                modalOverlay.style.display = 'none';
            };
        }
    }

    modalOverlay.onclick = (e) => { if (e.target === modalOverlay) modalOverlay.style.display = 'none'; };

    // --- Growth & Calendar ---
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

    function renderCalendar() {
        const container = document.getElementById('calendar-container');
        if (!container) return;
        const year = selectedDate.getFullYear(), month = selectedDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay(), lastDate = new Date(year, month + 1, 0).getDate();

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
            const isSelected = selectedDate.toLocaleDateString() === dateKey;

            html += `<div style="padding:10px; border-radius:12px; font-size:0.9rem; position:relative; background:${isSelected ? '#ff9a8b' : (hasRecord ? '#fff9e6' : '#f9f9f9')}; color:${isSelected ? 'white' : 'inherit'}; cursor:pointer;" onclick="window.selectDate(${year},${month},${d})">
                ${d}
                ${hasRecord ? `<div style="position:absolute; bottom:4px; left:50%; transform:translateX(-50%); width:4px; height:4px; background:${isSelected ? 'white' : '#ffa000'}; border-radius:50%;"></div>` : ''}
            </div>`;
        }
        container.innerHTML = html + '</div></div>';

        document.getElementById('cal-prev').onclick = () => { selectedDate.setMonth(selectedDate.getMonth() - 1); renderCalendar(); };
        document.getElementById('cal-next').onclick = () => { selectedDate.setMonth(selectedDate.getMonth() + 1); renderCalendar(); };
    }

    window.selectDate = (y, m, d) => {
        selectedDate = new Date(y, m, d);
        switchView('home');
    };

    function renderSettings() {
        const setProfile = document.getElementById('set-profile');
        if (setProfile) {
            setProfile.onclick = () => {
                const name = prompt('아이 이름을 입력하세요', profile.name);
                if (name) { profile.name = name; saveAll(); render(); }
            };
        }
        const resetBtn = document.getElementById('set-reset');
        if (resetBtn) {
            resetBtn.onclick = () => { if (confirm('모든 기록을 삭제하시겠습니까?')) { records = []; growthData = []; saveAll(); render(); } };
        }
        const exportBtn = document.getElementById('set-export');
        if (exportBtn) {
            exportBtn.onclick = () => {
                const blob = new Blob([JSON.stringify({ records, growthData, profile })], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'baby_diary.json'; a.click();
            };
        }
    }

    // --- Init ---
    ['feed', 'diaper', 'sleep', 'bath', 'health', 'photo'].forEach(type => {
        const btn = document.getElementById(`btn-${type}`);
        if (btn) btn.onclick = () => openModal(type);
    });

    const addBtn = document.querySelector('.add-btn');
    if (addBtn) addBtn.onclick = () => openModal('feed');

    const growthBtn = document.getElementById('btn-add-growth');
    if (growthBtn) {
        growthBtn.onclick = () => {
            const h = prompt('키(cm)', '');
            const w = prompt('몸무게(kg)', '');
            if (h && w) {
                growthData.push({ height: parseFloat(h), weight: parseFloat(w), timestamp: new Date().getTime() });
                saveAll();
                renderGraph();
            }
        };
    }

    switchView('home');
});
