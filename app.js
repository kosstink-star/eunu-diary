document.addEventListener('DOMContentLoaded', () => {
    console.log('우리은우 성장일기 v8.0 (Health/Edit/NativePicker) 로드 완료');

    // --- State & Storage ---
    let records = JSON.parse(localStorage.getItem('babyRecords')) || [];
    let growthData = JSON.parse(localStorage.getItem('babyGrowth')) || [];
    let profile = JSON.parse(localStorage.getItem('babyProfile')) || {
        name: '우리은우',
        birthdate: new Date().toISOString().split('T')[0]
    };

    let currentView = 'home';
    let chart = null;
    let selectedDate = new Date();

    // --- Selectors ---
    const modalOverlay = document.getElementById('modal-overlay');
    const modalBody = document.getElementById('modal-body');
    const modalTitle = document.getElementById('modal-title');
    const contextMenuOverlay = document.getElementById('context-menu-overlay');
    const dtPickerOverlay = document.getElementById('dt-picker-overlay');
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
            modalOverlay.style.display = 'none';
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

    // --- Navigation & Date Logic ---
    const switchView = (viewName) => {
        Object.keys(views).forEach(key => { if (views[key]) views[key].style.display = (key === viewName) ? 'block' : 'none'; });
        navItems.forEach(item => item.classList.toggle('active', item.dataset.view === viewName));
        currentView = viewName;
        render();
    };

    navItems.forEach(item => item.onclick = () => switchView(item.dataset.view));
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) backBtn.onclick = () => switchView('home');

    const prevDateBtn = document.querySelector('.date-nav .fa-chevron-left');
    const nextDateBtn = document.querySelector('.date-nav .fa-chevron-right');
    if (prevDateBtn) prevDateBtn.onclick = () => { selectedDate.setDate(selectedDate.getDate() - 1); render(); };
    if (nextDateBtn) nextDateBtn.onclick = () => { selectedDate.setDate(selectedDate.getDate() + 1); render(); };

    // --- Time Picker Logic ---
    let activeTimeTarget = null;
    function openTimePicker(initialH, initialM, callback) {
        dtPickerOverlay.style.display = 'flex';
        document.getElementById('dt-h').value = initialH;
        document.getElementById('dt-m').value = initialM;
        document.getElementById('dt-done').onclick = () => {
            const h = document.getElementById('dt-h').value;
            const m = document.getElementById('dt-m').value;
            callback(h, m);
            dtPickerOverlay.style.display = 'none';
        };
    }

    // --- Long Press Logic ---
    let longPressTimer;
    let longPressedId = null;
    function handleTouchStart(id) { longPressTimer = setTimeout(() => showContextMenu(id), 600); }
    function handleTouchEnd() { clearTimeout(longPressTimer); }
    function showContextMenu(id) { longPressedId = id; contextMenuOverlay.style.display = 'flex'; }
    contextMenuOverlay.onclick = (e) => { if (e.target === contextMenuOverlay) contextMenuOverlay.style.display = 'none'; };
    document.getElementById('ctx-edit').onclick = () => { contextMenuOverlay.style.display = 'none'; window.editRecord(longPressedId); };
    document.getElementById('ctx-delete').onclick = () => { contextMenuOverlay.style.display = 'none'; deleteRecord(longPressedId); };

    // --- Render Logic ---
    function render() {
        if (currentView === 'home') renderHome();
        else if (currentView === 'graph') renderGraph();
        else if (currentView === 'calendar') renderCalendar();
        else if (currentView === 'settings') renderSettings();
    }

    function renderHome() {
        const headerTitle = document.querySelector('header h1');
        if (headerTitle) headerTitle.innerText = `${profile.name} 육아 기록`;
        const dateText = document.getElementById('current-date-text');
        if (dateText) dateText.innerText = getDayString(selectedDate);

        const timeline = document.getElementById('timeline');
        const targetDateStr = selectedDate.toLocaleDateString();
        const filtered = records.filter(r => new Date(r.timestamp).toLocaleDateString() === targetDateStr);
        const sorted = [...filtered].sort((a, b) => b.timestamp - a.timestamp);

        timeline.innerHTML = sorted.length ? '' : '<p style="text-align:center; padding:50px; color:#ccc;">기록이 없습니다.</p>';

        sorted.forEach(r => {
            const item = document.createElement('div');
            item.className = `diary-item type-${r.type}`;
            let displayDesc = r.description;
            if (r.type === 'sleep' && r.duration) displayDesc = `${r.duration} 수면`;

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
                    <div class="item-arrow" onclick="window.editRecord('${r.id}')">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            `;
            item.onmousedown = () => handleTouchStart(r.id);
            item.onmouseup = handleTouchEnd;
            item.ontouchstart = () => handleTouchStart(r.id);
            item.ontouchend = handleTouchEnd;
            timeline.appendChild(item);
        });

        // Update Stats
        const feedTotal = filtered.filter(r => r.type === 'feed').reduce((acc, curr) => acc + (parseInt(curr.description) || 0), 0);
        const diaperCount = filtered.filter(r => r.type === 'diaper').length;
        let sleepMinutes = 0;
        filtered.filter(r => r.type === 'sleep' && r.durationMinutes).forEach(r => sleepMinutes += r.durationMinutes);
        const sleepH = Math.floor(sleepMinutes / 60), sleepM = sleepMinutes % 60;

        document.querySelector('#btn-feed .stat-val-small').innerText = `${feedTotal}ml`;
        document.querySelector('#btn-diaper .stat-val-small').innerText = `${diaperCount}회`;
        document.querySelector('#btn-sleep .stat-val-small').innerText = `${sleepH}시간 ${sleepM}분`;
        document.querySelector('#btn-bath .stat-val-small').innerText = `${filtered.filter(r => r.type === 'bath').length}회`;
        document.querySelector('#btn-health .stat-val-small').innerText = `${filtered.filter(r => r.type === 'health').length}개`;
        document.querySelector('#btn-photo .stat-val-small').innerText = `${filtered.filter(r => r.type === 'photo').length}개`;
    }

    window.editRecord = (id) => { const rec = records.find(r => r.id === id); if (rec) openModal(rec.type, id); };

    // --- Modal Logic ---
    function openModal(type, recordId = null) {
        modalOverlay.style.display = 'flex';
        let content = '';
        let currentImg = null;
        let selectedSub = '';
        const rec = recordId ? records.find(r => r.id === recordId) : null;
        const now = new Date();
        const recordTime = rec ? new Date(rec.timestamp) : new Date(selectedDate);
        if (!rec) { recordTime.setHours(now.getHours()); recordTime.setMinutes(now.getMinutes()); }

        const dateStr = `${recordTime.getFullYear()}.${String(recordTime.getMonth() + 1).padStart(2, '0')}.${String(recordTime.getDate()).padStart(2, '0')} 금 ${String(recordTime.getHours()).padStart(2, '0')}:${String(recordTime.getMinutes()).padStart(2, '0')}`;
        const deleteHtml = recordId ? `<div class="delete-icon" onclick="window.deleteRecordModal('${recordId}')"><i class="fas fa-trash-alt"></i></div>` : `<div class="delete-icon" onclick="document.getElementById('modal-overlay').style.display='none'"><i class="fas fa-times"></i></div>`;

        switch (type) {
            case 'feed':
                modalTitle.innerText = '식사 기록 🍼';
                selectedSub = rec ? rec.title : '이유식';
                content = `
                    <div class="modal-header-row"><h3>식사 기록</h3>${deleteHtml}</div>
                    <div class="modal-date-picker" id="modal-time-trigger"><i class="far fa-calendar-alt"></i> ${dateStr} <i class="fas fa-chevron-down"></i></div>
                    <div class="selection-grid">
                        <div class="selection-item ${selectedSub === '이유식' ? 'active' : ''}" data-val="meal"><div class="circle"><i class="fas fa-utensils"></i></div><label>이유식</label></div>
                        <div class="selection-item ${selectedSub === '간식' ? 'active' : ''}" data-val="snack"><div class="circle"><i class="fas fa-cookie"></i></div><label>간식</label></div>
                    </div>
                    <div class="amount-box">섭취량 <strong id="val-amt-display">${rec ? parseInt(rec.description) : '200'}</strong> ml</div>
                    <div class="form-group" style="padding:10px 0;"><input type="number" id="in-amt" value="${rec ? parseInt(rec.description) : '200'}" style="text-align:center;"></div>
                    <div class="note-container">
                        <textarea id="in-notes" placeholder="기본기록 (예: 저녁 : 애호박계란밥...)">${rec ? rec.notes || '' : ''}</textarea>
                    </div>
                `;
                break;
            case 'diaper':
                modalTitle.innerText = '배변 기록 🧷';
                selectedSub = rec ? rec.title : '대변';
                content = `
                    <div class="modal-header-row"><h3>배변 기록</h3>${deleteHtml}</div>
                    <div class="modal-date-picker" id="modal-time-trigger"><i class="far fa-calendar-alt"></i> ${dateStr} <i class="fas fa-chevron-down"></i></div>
                    <div class="selection-grid">
                        <div class="selection-item ${selectedSub === '소변' ? 'active' : ''}" data-val="pee"><div class="circle"><i class="fas fa-tint"></i></div><label>소변</label></div>
                        <div class="selection-item ${selectedSub === '대변' ? 'active' : ''}" data-val="poo"><div class="circle"><i class="fas fa-poop"></i></div><label>대변</label></div>
                        <div class="selection-item ${selectedSub === '둘다' ? 'active' : ''}" data-val="both"><div class="circle"><i class="fas fa-check-double"></i></div><label>둘다</label></div>
                    </div>
                    <div class="note-container"><textarea id="in-notes" placeholder="기록을 남겨주세요">${rec ? rec.notes || '' : ''}</textarea></div>
                `;
                break;
            case 'sleep':
                modalTitle.innerText = '수면 기록 💤';
                content = `
                    <div class="modal-header-row"><h3>수면 기록</h3>${deleteHtml}</div>
                    <div class="modal-date-picker" id="modal-time-trigger"><i class="far fa-calendar-alt"></i> ${dateStr} <i class="fas fa-chevron-down"></i></div>
                    <div class="centered-icon-box"><div class="circle"><i class="fas fa-moon"></i></div><label>수면</label></div>
                    <div class="time-picker-grid">
                        <div class="time-picker-box"><span class="label-label">시작</span><div class="time-inputs"><input type="number" id="h1" value="16"><span>시</span><input type="number" id="m1" value="24"><span>분</span></div></div>
                        <div class="time-picker-box"><span class="label-label">종료</span><div class="time-inputs"><input type="number" id="h2" value="${recordTime.getHours()}"><span>시</span><input type="number" id="m2" value="${recordTime.getMinutes()}"><span>분</span></div></div>
                    </div>
                `;
                selectedSub = '수면';
                break;
            case 'health':
                modalTitle.innerText = '건강 기록 🏥';
                selectedSub = rec ? rec.title : '체온';
                content = `
                    <div class="modal-header-row"><h3>건강 기록</h3>${deleteHtml}</div>
                    <div class="modal-date-picker" id="modal-time-trigger"><i class="far fa-calendar-alt"></i> ${dateStr} <i class="fas fa-chevron-down"></i></div>
                    <div class="selection-grid">
                        <div class="selection-item ${selectedSub === '체온' ? 'active' : ''}" data-val="temp"><div class="circle"><i class="fas fa-thermometer-half"></i></div><label>체온</label></div>
                        <div class="selection-item ${selectedSub === '투약' ? 'active' : ''}" data-val="meds"><div class="circle"><i class="fas fa-pills"></i></div><label>투약</label></div>
                        <div class="selection-item ${selectedSub === '병원' ? 'active' : ''}" data-val="hospital"><div class="circle"><i class="fas fa-hospital"></i></div><label>병원</label></div>
                        <div class="selection-item ${selectedSub === '기타' ? 'active' : ''}" data-val="health_etc"><div class="circle"><i class="fas fa-clipboard-list"></i></div><label>기타</label></div>
                    </div>
                    <div class="amount-box" id="health-val-box">측정값 <strong id="health-val-display">${rec ? rec.description || '36.5' : '36.5'}</strong> <span id="health-unit">°C</span></div>
                    <div class="form-group" style="padding:10px 0;"><input type="text" id="in-health-val" value="${rec ? rec.description : '36.5'}" style="text-align:center;"></div>
                    <div class="note-container"><textarea id="in-notes" placeholder="기록을 남겨주세요">${rec ? rec.notes || '' : ''}</textarea></div>
                `;
                break;
            case 'bath':
                modalTitle.innerText = '목욕 기록 🛁';
                selectedSub = rec ? rec.title : '통목욕';
                content = `
                    <div class="modal-header-row"><h3>목욕 기록</h3>${deleteHtml}</div>
                    <div class="modal-date-picker" id="modal-time-trigger"><i class="far fa-calendar-alt"></i> ${dateStr} <i class="fas fa-chevron-down"></i></div>
                    <div class="selection-grid">
                        <div class="selection-item ${selectedSub === '통목욕' ? 'active' : ''}" data-val="full"><div class="circle"><i class="fas fa-bath"></i></div><label>통목욕</label></div>
                        <div class="selection-item ${selectedSub === '간단세안' ? 'active' : ''}" data-val="quick"><div class="circle"><i class="fas fa-shower"></i></div><label>간단세안</label></div>
                    </div>
                    <div class="note-container"><textarea id="in-notes" placeholder="메모를 남겨주세요">${rec ? rec.notes || '' : ''}</textarea></div>
                `;
                break;
            case 'photo':
                modalTitle.innerText = '하루일기 ✍️';
                currentImg = rec ? rec.imageData : null;
                content = `
                    <div class="modal-header-row"><h3>하루일기</h3>${deleteHtml}</div>
                    <div class="modal-date-picker" id="modal-time-trigger"><i class="far fa-calendar-alt"></i> ${dateStr} <i class="fas fa-chevron-down"></i></div>
                    <div class="form-group" id="img-box" style="border:1px dashed #ccc; height:150px; display:flex; justify-content:center; align-items:center; border-radius:15px; cursor:pointer;">
                        ${currentImg ? `<img src="${currentImg}" style="height:100%; border-radius:15px;">` : '<i class="fas fa-camera"></i>'}
                        <input type="file" id="in-file" style="display:none" accept="image/*">
                    </div>
                    <div class="note-container"><textarea id="in-notes" placeholder="기록을 남겨주세요">${rec ? rec.notes || '' : ''}</textarea></div>
                `;
                break;
        }

        modalBody.innerHTML = content + `<div class="modal-footer"><button class="btn btn-cancel" onclick="document.getElementById('modal-overlay').style.display='none'">취소</button><button class="btn btn-save" id="save-btn">${recordId ? '수정' : '저장'}</button></div>`;

        // Interactions
        const timeTrigger = document.getElementById('modal-time-trigger');
        if (timeTrigger) {
            timeTrigger.onclick = () => {
                openTimePicker(recordTime.getHours(), recordTime.getMinutes(), (h, m) => {
                    recordTime.setHours(h); recordTime.setMinutes(m);
                    timeTrigger.innerHTML = `<i class="far fa-calendar-alt"></i> ${recordTime.getFullYear()}.${String(recordTime.getMonth() + 1).padStart(2, '0')}.${String(recordTime.getDate()).padStart(2, '0')} 금 ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} <i class="fas fa-chevron-down"></i>`;
                });
            };
        }

        if (type === 'health') {
            const inH = document.getElementById('in-health-val'), dispH = document.getElementById('health-val-display'), unitH = document.getElementById('health-unit');
            inH.oninput = (e) => dispH.innerText = e.target.value;
            document.querySelectorAll('.selection-item').forEach(item => {
                item.onclick = () => {
                    document.querySelectorAll('.selection-item').forEach(i => i.classList.remove('active')); item.classList.add('active');
                    selectedSub = item.querySelector('label').innerText;
                    unitH.innerText = (selectedSub === '체온') ? '°C' : (selectedSub === '투약' ? '회' : '');
                };
            });
        } else {
            document.querySelectorAll('.selection-item').forEach(item => {
                item.onclick = () => {
                    document.querySelectorAll('.selection-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active'); selectedSub = item.querySelector('label').innerText;
                };
            });
        }

        const inAmt = document.getElementById('in-amt'), valAmtDisp = document.getElementById('val-amt-display');
        if (inAmt && valAmtDisp) inAmt.oninput = (e) => valAmtDisp.innerText = e.target.value;

        const imgBox = document.getElementById('img-box'), fin = document.getElementById('in-file');
        if (imgBox) imgBox.onclick = () => fin.click();
        if (fin) fin.onchange = (e) => {
            const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = (re) => { currentImg = re.target.result; imgBox.innerHTML = `<img src="${currentImg}" style="height:100%; border-radius:15px;">`; }; r.readAsDataURL(f); }
        };

        document.getElementById('save-btn').onclick = () => {
            const notes = document.getElementById('in-notes')?.value || "";
            const data = { type, title: selectedSub, timestamp: recordTime.getTime(), notes, imageData: currentImg };
            if (type === 'feed') data.description = `${document.getElementById('in-amt').value}ml`;
            else if (type === 'diaper') data.description = '1회';
            else if (type === 'sleep') {
                const h1 = Number(document.getElementById('h1').value), m1 = Number(document.getElementById('m1').value), h2 = Number(document.getElementById('h2').value), m2 = Number(document.getElementById('m2').value);
                const diff = (h2 * 60 + m2) - (h1 * 60 + m1); data.description = `${Math.floor(diff / 60)}시간 ${diff % 60}분`;
                data.timestamp = new Date(recordTime.getFullYear(), recordTime.getMonth(), recordTime.getDate(), h2, m2).getTime();
                data.duration = data.description; data.durationMinutes = diff;
            } else if (type === 'health') { data.title = selectedSub; data.description = document.getElementById('in-health-val').value; }
            else if (type === 'photo') data.description = '📖 오늘의 일기';

            if (recordId) { const idx = records.findIndex(r => r.id === recordId); records[idx] = { ...records[idx], ...data }; }
            else { addRecord(data.type, data.title, data.description, data.timestamp, data.imageData, { notes: data.notes, duration: data.duration, durationMinutes: data.durationMinutes }); }
            saveAll(); render(); modalOverlay.style.display = 'none';
        };
    }

    window.deleteRecordModal = (id) => deleteRecord(id);
    modalOverlay.onclick = (e) => { if (e.target === modalOverlay) modalOverlay.style.display = 'none'; };

    // --- Growth & Calendar ---
    function renderGraph() {
        const ctx = document.getElementById('growthChart')?.getContext('2d'); if (!ctx) return;
        const sorted = [...growthData].sort((a, b) => a.timestamp - b.timestamp); if (chart) chart.destroy();
        chart = new Chart(ctx, { type: 'line', data: { labels: sorted.map(d => new Date(d.timestamp).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })), datasets: [{ label: '키 (cm)', data: sorted.map(d => d.height), borderColor: '#ffa000', backgroundColor: 'rgba(255,160,0,0.1)', tension: 0.4, fill: true }, { label: '몸무게 (kg)', data: sorted.map(d => d.weight), borderColor: '#00acc1', backgroundColor: 'rgba(0,172,193,0.1)', tension: 0.4, fill: true }] }, options: { responsive: true, plugins: { legend: { position: 'top' } } } });
    }
    function renderCalendar() {
        const container = document.getElementById('calendar-container'); if (!container) return;
        const year = selectedDate.getFullYear(), month = selectedDate.getMonth(), firstDay = new Date(year, month, 1).getDay(), lastDate = new Date(year, month + 1, 0).getDate();
        let html = `<div class="calendar-wrapper" style="padding:20px;"><div class="cal-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;"><i class="fas fa-chevron-left" id="cal-prev"></i><h3 style="font-weight:700;">${year}년 ${month + 1}월</h3><i class="fas fa-chevron-right" id="cal-next"></i></div><div class="cal-grid" style="display:grid; grid-template-columns:repeat(7, 1fr); gap:10px; text-align:center;">${['일', '월', '화', '수', '목', '금', '토'].map(d => `<div style="font-size:0.8rem; color:#888;">${d}</div>`).join('')}`;
        for (let i = 0; i < firstDay; i++) html += '<div></div>';
        for (let d = 1; d <= lastDate; d++) {
            const dateKey = new Date(year, month, d).toLocaleDateString(), hasRec = records.some(r => new Date(r.timestamp).toLocaleDateString() === dateKey), isSel = selectedDate.toLocaleDateString() === dateKey;
            html += `<div style="padding:10px; border-radius:12px; font-size:0.9rem; position:relative; background:${isSel ? '#ff9a8b' : (hasRec ? '#fff9e6' : '#f9f9f9')}; color:${isSel ? 'white' : 'inherit'}; cursor:pointer;" onclick="window.selectDate(${year},${month},${d})">${d}${hasRec ? `<div style="position:absolute; bottom:4px; left:50%; transform:translateX(-50%); width:4px; height:4px; background:${isSel ? 'white' : '#ffa000'}; border-radius:50%;"></div>` : ''}</div>`;
        }
        container.innerHTML = html + '</div></div>';
        document.getElementById('cal-prev').onclick = () => { selectedDate.setMonth(selectedDate.getMonth() - 1); renderCalendar(); };
        document.getElementById('cal-next').onclick = () => { selectedDate.setMonth(selectedDate.getMonth() + 1); renderCalendar(); };
    }
    window.selectDate = (y, m, d) => { selectedDate = new Date(y, m, d); switchView('home'); };
    function renderSettings() {
        document.getElementById('set-profile').onclick = () => { const name = prompt('아이 이름', profile.name); if (name) { profile.name = name; saveAll(); render(); } };
        document.getElementById('set-reset').onclick = () => { if (confirm('기록 삭제?')) { records = []; growthData = []; saveAll(); render(); } };
        document.getElementById('set-export').onclick = () => { const blob = new Blob([JSON.stringify({ records, growthData, profile })], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'baby_diary.json'; a.click(); };
    }

    ['feed', 'diaper', 'sleep', 'bath', 'health', 'photo'].forEach(type => { const btn = document.getElementById(`btn-${type}`); if (btn) btn.onclick = () => openModal(type); });
    const addBtn = document.querySelector('.add-btn'); if (addBtn) addBtn.onclick = () => openModal('feed');
    const growthBtn = document.getElementById('btn-add-growth'); if (growthBtn) growthBtn.onclick = () => { const h = prompt('키(cm)', ''), w = prompt('몸무게(kg)', ''); if (h && w) { growthData.push({ height: parseFloat(h), weight: parseFloat(w), timestamp: new Date().getTime() }); saveAll(); renderGraph(); } };
    switchView('home');
});
