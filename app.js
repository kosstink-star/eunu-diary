document.addEventListener('DOMContentLoaded', () => {
    console.log('우리은우 성장일기 v13.2 (Original Functionality Restore) 로드 완료');

    // --- State & Storage ---
    let records = JSON.parse(localStorage.getItem('babyRecords')) || [];
    let growthData = JSON.parse(localStorage.getItem('babyGrowth')) || [];
    let profile = JSON.parse(localStorage.getItem('babyProfile')) || {
        name: '우리은우',
        birthdate: '2026-02-15'
    };
    let currentView = 'home', chart = null, selectedDate = new Date();

    const selectors = {
        modalOverlay: document.getElementById('modal-overlay'),
        modalBody: document.getElementById('modal-body'),
        dtPickerOverlay: document.getElementById('dt-picker-overlay'),
        navItems: document.querySelectorAll('.nav-item'),
        home: document.getElementById('view-home'),
        graph: document.getElementById('view-graph'),
        calendar: document.getElementById('view-calendar'),
        settings: document.getElementById('view-settings'),
        dDayText: document.getElementById('d-day-text'),
        backBtn: document.getElementById('header-back-btn')
    };

    const saveAll = () => {
        localStorage.setItem('babyRecords', JSON.stringify(records));
        localStorage.setItem('babyGrowth', JSON.stringify(growthData));
        localStorage.setItem('babyProfile', JSON.stringify(profile));
    };

    const getTimeStr = (ts) => new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const getDayStr = (d) => {
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const isToday = new Date().toLocaleDateString() === d.toLocaleDateString();
        return `${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일 (${isToday ? '오늘' : days[d.getDay()]})`;
    };

    const calculateDDay = () => {
        if (!profile.birthdate) return 'D+??';
        const birth = new Date(profile.birthdate);
        const today = new Date();
        const birthMid = new Date(birth.getFullYear(), birth.getMonth(), birth.getDate());
        const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const diffDays = Math.floor((todayMid - birthMid) / (1000 * 60 * 60 * 24)) + 1;
        return `D+${diffDays}`;
    };

    const updateHeader = () => {
        if (selectors.dDayText) selectors.dDayText.innerText = calculateDDay();
        const title = document.querySelector('header h1');
        if (title) title.innerText = `${profile.name} 육아 기록`;
        if (selectors.backBtn) selectors.backBtn.style.display = (currentView === 'home' ? 'none' : 'block');
    };

    const switchView = (vn) => {
        Object.keys(selectors).forEach(k => {
            const el = selectors[k];
            if (el && el.tagName === 'MAIN') el.style.display = (k === vn) ? 'block' : 'none';
        });
        selectors.navItems.forEach(i => i.classList.toggle('active', i.dataset.view === vn));
        currentView = vn;
        updateHeader();
        render();
    };

    selectors.navItems.forEach(i => i.onclick = () => switchView(i.dataset.view));
    if (selectors.backBtn) selectors.backBtn.onclick = () => switchView('home');

    document.getElementById('prev-date').onclick = () => { selectedDate.setDate(selectedDate.getDate() - 1); render(); };
    document.getElementById('next-date').onclick = () => { selectedDate.setDate(selectedDate.getDate() + 1); render(); };

    // --- Wheel Picker Fix ---
    const initWheel = (type, max) => {
        const scroller = document.getElementById(`scroller-${type}`);
        if (!scroller) return;
        scroller.innerHTML = '';
        for (let i = 0; i <= max; i++) {
            const el = document.createElement('div');
            el.className = 'wheel-item';
            el.innerText = String(i).padStart(2, '0');
            scroller.appendChild(el);
        }

        const col = scroller.parentElement;
        col.onscroll = () => {
            const idx = Math.round(col.scrollTop / 40);
            const items = scroller.querySelectorAll('.wheel-item');
            items.forEach((it, i) => it.classList.toggle('selected', i === idx));
            document.getElementById(`dt-${type}`).value = idx;
        };
    };

    initWheel('h', 23);
    initWheel('m', 59);

    function openPicker(dt, cb) {
        selectors.dtPickerOverlay.style.display = 'flex';
        const h = dt.getHours(), m = dt.getMinutes();
        const hCol = document.getElementById('wheel-h'), mCol = document.getElementById('wheel-m');

        document.getElementById('dt-h').value = h;
        document.getElementById('dt-m').value = m;

        setTimeout(() => {
            hCol.scrollTo({ top: h * 40, behavior: 'auto' });
            mCol.scrollTo({ top: m * 40, behavior: 'auto' });
        }, 100);

        document.getElementById('dt-cancel').onclick = () => selectors.dtPickerOverlay.style.display = 'none';
        document.getElementById('dt-done').onclick = () => {
            const finalH = parseInt(document.getElementById('dt-h').value);
            const finalM = parseInt(document.getElementById('dt-m').value);
            cb(finalH, finalM);
            selectors.dtPickerOverlay.style.display = 'none';
        };
    }

    // --- Rendering ---
    function render() {
        if (currentView === 'home') renderHome();
        else if (currentView === 'graph') renderGraph();
        else if (currentView === 'calendar') renderCalendar();
        else if (currentView === 'settings') renderSettings();
    }

    function renderHome() {
        const dtTxt = document.getElementById('current-date-text');
        if (dtTxt) dtTxt.innerText = getDayStr(selectedDate);

        const timeline = document.getElementById('timeline');
        const ds = selectedDate.toLocaleDateString();
        const f = records.filter(r => new Date(r.timestamp).toLocaleDateString() === ds);
        const sorted = [...f].sort((a, b) => b.timestamp - a.timestamp);

        timeline.innerHTML = sorted.length ? '' : '<p style="text-align:center; padding:100px 20px; color:#ddd; font-weight:900; font-size:1.1rem; line-height:1.6;">새로운 기록을<br>남겨보세요.</p>';
        sorted.forEach(r => {
            const el = document.createElement('div');
            el.className = `diary-item type-${r.type}`;
            el.innerHTML = `
                <div class="item-time">${getTimeStr(r.timestamp)}</div>
                <div class="item-dot"></div>
                <div class="item-content" onclick="window.editRec('${r.id}')">
                    <div class="item-main">
                        <h4>${r.title}</h4>
                        <div class="item-sub">${r.description || ''}</div>
                        ${r.notes ? `<div class="item-notes">${r.notes}</div>` : ''}
                        ${r.imageData ? `<img src="${r.imageData}" style="width:100%; border-radius:18px; margin-top:14px;">` : ''}
                    </div>
                    <div class="item-arrow"><i class="fas fa-chevron-right"></i></div>
                </div>
            `;
            timeline.appendChild(el);
        });

        const feedSum = f.filter(r => r.type === 'feed').reduce((a, c) => a + (parseInt(c.description) || 0), 0);
        const sleepSum = f.filter(r => r.type === 'sleep').reduce((a, c) => a + (c.dm || 0), 0);
        document.querySelector('#btn-feed .stat-val-small').innerText = `${feedSum}ml`;
        document.querySelector('#btn-diaper .stat-val-small').innerText = `${f.filter(r => r.type === 'diaper').length}회`;
        document.querySelector('#btn-sleep .stat-val-small').innerText = `${Math.floor(sleepSum / 60)}시간 ${sleepSum % 60}분`;
        document.querySelector('#btn-bath .stat-val-small').innerText = `${f.filter(r => r.type === 'bath').length}회`;
        document.querySelector('#btn-health .stat-val-small').innerText = `${f.filter(r => r.type === 'health').length}개`;
        document.querySelector('#btn-photo .stat-val-small').innerText = `${f.filter(r => r.type === 'photo').length}개`;
    }

    window.editRec = (id) => {
        const r = records.find(x => x.id === id);
        if (r) window.openModal(r.type, id);
    };

    window.openModal = (type, rid = null) => {
        selectors.modalOverlay.style.display = 'flex';
        let html = '';
        let selImg = null, selTitle = '';
        const rec = rid ? records.find(x => x.id === rid) : null;
        const curDt = rec ? new Date(rec.timestamp) : new Date(selectedDate);
        if (!rec) { const n = new Date(); curDt.setHours(n.getHours()); curDt.setMinutes(n.getMinutes()); }

        let sleepStart = new Date(curDt.getTime() - (60 * 60 * 1000));
        let sleepEnd = new Date(curDt.getTime());

        const refreshDt = () => {
            const days = ['일', '월', '화', '수', '목', '금', '토'];
            const dispStr = `${curDt.getFullYear()}년 ${curDt.getMonth() + 1}월 ${curDt.getDate()}일 (${days[curDt.getDay()]}) ${getTimeStr(curDt.getTime())}`;
            const el = document.getElementById('modal-dt-disp');
            if (el) el.innerHTML = `<i class="far fa-calendar-alt"></i> ${dispStr} <i class="fas fa-chevron-down"></i>`;
        };

        const updateSleepTimeDisp = () => {
            const sEl = document.getElementById('sleep-start-disp'), eEl = document.getElementById('sleep-end-disp');
            if (sEl) sEl.innerText = getTimeStr(sleepStart.getTime());
            if (eEl) eEl.innerText = getTimeStr(sleepEnd.getTime());
            const diff = Math.floor((sleepEnd - sleepStart) / (60 * 1000));
            const diffEl = document.getElementById('v-sleep-diff');
            if (diffEl) diffEl.innerText = `${Math.floor(diff / 60)}시간 ${diff % 60}분`;
        };

        const top = `<div class="modal-header-row"><h3 style="font-size:1.4rem; font-weight:900;">${type === 'feed' ? '식사' : type === 'diaper' ? '배변' : type === 'sleep' ? '수면' : type === 'bath' ? '목욕' : type === 'health' ? '건강' : type === 'photo' ? '일기' : '기록하기'}</h3><i class="fas fa-times" style="font-size:1.4rem; color:#ccc; cursor:pointer;" onclick="window.closeModal()"></i></div>
        <div class="modal-date-picker" id="modal-dt-disp" ${type === 'quick' ? 'style="display:none"' : ''}></div>`;

        if (type === 'quick') {
            html = `<div class="modal-header-row"><h3 style="font-size:1.4rem; font-weight:900;">추가하기</h3><i class="fas fa-times" style="font-size:1.4rem; color:#ccc; cursor:pointer;" onclick="window.closeModal()"></i></div>
            <div class="quick-add-grid">
                <div class="quick-add-item" onclick="window.openModal('feed')"><div class="circle" style="background:#fff8e1; color:#ffa000;"><i class="fas fa-pizza-slice"></i></div><label>식사</label></div>
                <div class="quick-add-item" onclick="window.openModal('diaper')"><div class="circle" style="background:#efebe9; color:#8d6e63;"><i class="fas fa-baby"></i></div><label>배변</label></div>
                <div class="quick-add-item" onclick="window.openModal('sleep')"><div class="circle" style="background:#e0f7fa; color:#00acc1;"><i class="fas fa-moon"></i></div><label>수면</label></div>
                <div class="quick-add-item" onclick="window.openModal('bath')"><div class="circle" style="background:#f9fbe7; color:#afb42b;"><i class="fas fa-bath"></i></div><label>목욕</label></div>
                <div class="quick-add-item" onclick="window.openModal('health')"><div class="circle" style="background:#e1f5fe; color:#0288d1;"><i class="fas fa-thermometer-half"></i></div><label>건강</label></div>
                <div class="quick-add-item" onclick="window.openModal('photo')"><div class="circle" style="background:#f3e5f5; color:#8e24aa;"><i class="fas fa-camera-retro"></i></div><label>일기</label></div>
            </div>`;
            selectors.modalBody.innerHTML = html;
            return;
        }

        switch (type) {
            case 'feed':
                selTitle = rec ? rec.title : '모유';
                html = `${top}<div class="selection-grid">
                    <div class="selection-item ${selTitle === '모유' ? 'active' : ''}" data-val="f1"><div class="circle"><i class="fas fa-utensils"></i></div><label>모유</label></div>
                    <div class="selection-item ${selTitle === '분유' ? 'active' : ''}" data-val="f2"><div class="circle"><i class="fas fa-baby-bottle"></i></div><label>분유</label></div>
                    <div class="selection-item ${selTitle === '이유식' ? 'active' : ''}" data-val="f3"><div class="circle"><i class="fas fa-cookie"></i></div><label>이유식</label></div>
                </div><div class="amount-box">섭취량 <strong id="v-disp">${rec ? parseInt(rec.description) : '120'}</strong> ml</div><input type="number" id="v-in" value="${rec ? parseInt(rec.description) : '120'}" style="width:100%; padding:20px; border-radius:18px; border:1px solid #f0f0f0; background:#f9f9f9; text-align:center; font-size:1.4rem; font-weight:900; margin-bottom:20px; outline:none;"><div class="note-container"><textarea id="v-nt" placeholder="메모를 입력하세요">${rec ? rec.notes || '' : ''}</textarea></div>`;
                break;
            case 'diaper':
                selTitle = rec ? rec.title : '소변';
                html = `${top}<div class="selection-grid">
                    <div class="selection-item ${selTitle === '소변' ? 'active' : ''}" data-val="d1"><div class="circle"><i class="fas fa-tint"></i></div><label>소변</label></div>
                    <div class="selection-item ${selTitle === '대변' ? 'active' : ''}" data-val="d2"><div class="circle"><i class="fas fa-poop"></i></div><label>대변</label></div>
                    <div class="selection-item ${selTitle === '둘다' ? 'active' : ''}" data-val="d3"><div class="circle"><i class="fas fa-check-double"></i></div><label>둘다</label></div>
                </div><div class="note-container"><textarea id="v-nt" placeholder="기록할 내용이 있나요?">${rec ? rec.notes || '' : ''}</textarea></div>`;
                break;
            case 'health':
                selTitle = rec ? rec.title : '체온';
                html = `${top}<div class="selection-grid">
                    <div class="selection-item ${selTitle === '체온' ? 'active' : ''}" data-val="h1"><div class="circle"><i class="fas fa-thermometer-half"></i></div><label>체온</label></div>
                    <div class="selection-item ${selTitle === '투약' ? 'active' : ''}" data-val="h2"><div class="circle"><i class="fas fa-pills"></i></div><label>투약</label></div>
                </div><div class="amount-box">측정값 <strong id="v-disp">${rec ? rec.description : '36.5'}</strong> <span id="v-unit">°C</span></div><input type="text" id="v-in" value="${rec ? rec.description : '36.5'}" style="width:100%; padding:20px; border-radius:18px; border:1px solid #f0f0f0; background:#f9f9f9; text-align:center; font-size:1.4rem; font-weight:900; margin-bottom:20px; outline:none;"><div class="note-container"><textarea id="v-nt" placeholder="메모를 입력하세요">${rec ? rec.notes || '' : ''}</textarea></div>`;
                break;
            case 'sleep':
                if (rec && rec.dm) { sleepEnd = new Date(rec.timestamp); sleepStart = new Date(rec.timestamp - (rec.dm * 60 * 1000)); }
                html = `${top}
                <div class="amount-box" style="background:#f0fafe; border-color:#e1f5fe; margin-top:20px;">총 수면시간 <strong id="v-sleep-diff" style="color:#00acc1;">?시간 ?분</strong></div>
                <div class="time-picker-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px;">
                    <div class="time-picker-box" id="sleep-start-trigger" style="background:#fff; padding:20px; border-radius:18px; text-align:center; cursor:pointer; border:1px solid #f0f0f0; box-shadow:0 6px 15px rgba(0,0,0,0.03);">
                        <span style="font-size:0.9rem; color:#999; font-weight:850;">시작 시간</span>
                        <div style="font-size:1.6rem; font-weight:950; margin-top:10px;" id="sleep-start-disp">${getTimeStr(sleepStart.getTime())}</div>
                    </div>
                    <div class="time-picker-box" id="sleep-end-trigger" style="background:#fff; padding:20px; border-radius:18px; text-align:center; cursor:pointer; border:1px solid #f0f0f0; box-shadow:0 6px 15px rgba(0,0,0,0.03);">
                        <span style="font-size:0.9rem; color:#999; font-weight:850;">종료 시간</span>
                        <div style="font-size:1.6rem; font-weight:950; margin-top:10px;" id="sleep-end-disp">${getTimeStr(sleepEnd.getTime())}</div>
                    </div>
                </div>
                <div class="note-container"><textarea id="v-nt" placeholder="수면 중 특이사항이 있었나요?">${rec ? rec.notes || '' : ''}</textarea></div>`;
                selTitle = '수면';
                break;
            case 'photo':
                selImg = rec ? rec.imageData : null;
                html = `${top}<div id="img-b" style="width:100%; height:200px; background:#f5f5f5; border:2px dashed #e0e0e0; border-radius:24px; display:flex; justify-content:center; align-items:center; overflow:hidden; cursor:pointer;">${selImg ? `<img src="${selImg}" style="height:100%;">` : '<i class="fas fa-camera" style="font-size:3rem; color:#ccc;"></i>'}<input type="file" id="fi-i" style="display:none" accept="image/*"></div><div class="note-container" style="margin-top:25px;"><textarea id="v-nt" placeholder="오늘의 특별한 일은?">${rec ? rec.notes || '' : ''}</textarea></div>`;
                selTitle = '하루일기';
                break;
            case 'bath':
                selTitle = rec ? rec.title : '목욕';
                html = `${top}<div class="selection-grid">
                    <div class="selection-item active" data-val="b1"><div class="circle"><i class="fas fa-bath"></i></div><label>목욕</label></div>
                </div><div class="note-container"><textarea id="v-nt" placeholder="목욕 메모">${rec ? rec.notes || '' : ''}</textarea></div>`;
                break;
        }

        const footer = `<div class="modal-footer" style="margin-top:20px;">${rid ? `<button class="btn btn-cancel" style="background:#ffebee; color:#e53935;" onclick="window.delMod('${rid}')">삭제하기</button>` : ''}<button class="btn btn-save" id="save-final">${rid ? '수정완료' : '기록저장'}</button></div>`;
        selectors.modalBody.innerHTML = html + footer;

        refreshDt();
        if (type === 'sleep') updateSleepTimeDisp();

        document.getElementById('modal-dt-disp').onclick = () => openPicker(curDt, (h, m) => { curDt.setHours(h); curDt.setMinutes(m); refreshDt(); });

        if (type === 'sleep') {
            document.getElementById('sleep-start-trigger').onclick = () => openPicker(sleepStart, (h, m) => { sleepStart.setHours(h); sleepStart.setMinutes(m); updateSleepTimeDisp(); });
            document.getElementById('sleep-end-trigger').onclick = () => openPicker(sleepEnd, (h, m) => { sleepEnd.setHours(h); sleepEnd.setMinutes(m); updateSleepTimeDisp(); });
        }

        document.querySelectorAll('.selection-item').forEach(i => i.onclick = () => { document.querySelectorAll('.selection-item').forEach(x => x.classList.remove('active')); i.classList.add('active'); selTitle = i.querySelector('label').innerText; });
        const iv = document.getElementById('v-in'), vd = document.getElementById('v-disp'); if (iv && vd) iv.oninput = (e) => vd.innerText = e.target.value;
        const im = document.getElementById('img-b'), fi = document.getElementById('fi-i'); if (im) im.onclick = () => fi.click();
        if (fi) fi.onchange = (e) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = (ev) => { selImg = ev.target.result; im.innerHTML = `<img src="${selImg}" style="height:100%;">`; }; r.readAsDataURL(f); } };

        document.getElementById('save-final').onclick = () => {
            const nt = document.getElementById('v-nt')?.value || "";
            const res = { type, title: selTitle, timestamp: curDt.getTime(), notes: nt, imageData: selImg };
            if (type === 'feed') res.description = `${document.getElementById('v-in').value || '120'}ml`;
            else if (type === 'diaper') res.description = '기저귀 교체';
            else if (type === 'sleep') { const dm = Math.floor((sleepEnd - sleepStart) / (60 * 1000)); res.description = `${Math.floor(dm / 60)}시간 ${dm % 60}분`; res.dm = dm; res.timestamp = sleepEnd.getTime(); }
            else if (type === 'health') res.description = document.getElementById('v-in').value || '36.5';
            else if (type === 'photo') res.description = '📖 하루일기';
            else res.description = '기록 완료';

            if (rid) { const ix = records.findIndex(x => x.id === rid); records[ix] = { ...records[ix], ...res }; }
            else { const id = 'rec_' + Math.random().toString(36).substr(2, 9); records.push({ id, ...res }); }
            saveAll(); render(); updateHeader(); window.closeModal();
        };
    }

    window.closeModal = () => selectors.modalOverlay.style.display = 'none';
    window.delMod = (rid) => { if (confirm('이 기록을 삭제하시겠습니까?')) { records = records.filter(r => r.id !== rid); saveAll(); render(); updateHeader(); window.closeModal(); } };
    selectors.modalOverlay.onclick = (e) => { if (e.target === selectors.modalOverlay) window.closeModal(); };

    function renderGraph() {
        const ctx = document.getElementById('growthChart')?.getContext('2d'); if (!ctx) return;
        const s = [...growthData].sort((a, b) => a.timestamp - b.timestamp); if (chart) chart.destroy();
        chart = new Chart(ctx, { type: 'line', data: { labels: s.map(x => new Date(x.timestamp).toLocaleDateString()), datasets: [{ label: '키(cm)', data: s.map(x => x.height), borderColor: '#ff9a8b', backgroundColor: 'rgba(255,154,139,0.1)', fill: true, tension: 0.4 }, { label: '몸무게(kg)', data: s.map(x => x.weight), borderColor: '#1e88e5', backgroundColor: 'rgba(30,136,229,0.05)', fill: true, tension: 0.4 }] } });
    }

    function renderCalendar() {
        const c = document.getElementById('calendar-container'); if (!c) return;
        const y = selectedDate.getFullYear(), m = selectedDate.getMonth(), fd = new Date(y, m, 1).getDay(), ld = new Date(y, m + 1, 0).getDate();
        let h = `<div style="padding:25px;"><div style="display:flex; justify-content:space-between; margin-bottom:25px; align-items:center;"><i class="fas fa-chevron-left" id="cp" style="padding:15px; cursor:pointer;"></i><h3 style="font-weight:900; font-size:1.3rem;">${y}년 ${m + 1}월</h3><i class="fas fa-chevron-right" id="cn" style="padding:15px; cursor:pointer;"></i></div><div style="display:grid; grid-template-columns:repeat(7,1fr); gap:10px; text-align:center;">${['일', '월', '화', '수', '목', '금', '토'].map(x => `<div style="font-size:0.75rem; color:#bbb; font-weight:800;">${x}</div>`).join('')}`;
        for (let i = 0; i < fd; i++) h += '<div></div>';
        for (let d = 1; d <= ld; d++) { const dk = new Date(y, m, d).toLocaleDateString(), active = selectedDate.toLocaleDateString() === dk; h += `<div onclick="window.sd(${y},${m},${d})" style="padding:15px 0; border-radius:18px; font-weight:800; cursor:pointer; background:${active ? 'var(--primary-gradient)' : '#f8f9fa'}; color:${active ? 'white' : '#1a1a1a'}; ${active ? 'box-shadow:0 8px 15px var(--accent-glow)' : ''}">${d}</div>`; }
        c.innerHTML = h + '</div></div>';
        document.getElementById('cp').onclick = () => { selectedDate.setMonth(m - 1); renderCalendar(); };
        document.getElementById('cn').onclick = () => { selectedDate.setMonth(m + 1); renderCalendar(); };
    }

    window.sd = (y, m, d) => { selectedDate = new Date(y, m, d); switchView('home'); };

    function renderSettings() {
        document.getElementById('set-profile').onclick = () => {
            const n = prompt('아이 이름을 입력해주세요', profile.name);
            const b = prompt('태어난 날짜를 입력해주세요 (예: 2026-02-15)', profile.birthdate);
            if (n) profile.name = n; if (b) profile.birthdate = b; saveAll(); updateHeader(); render();
        };
        document.getElementById('set-reset').onclick = () => { if (confirm('모든 데이터를 삭제할까요? 되돌릴 수 없습니다.')) { records = []; growthData = []; saveAll(); render(); updateHeader(); } };
    }

    ['feed', 'diaper', 'sleep', 'bath', 'health', 'photo'].forEach(t => { const b = document.getElementById(`btn-${t}`); if (b) b.onclick = () => window.openModal(t); });
    document.getElementById('global-add-btn').onclick = () => window.openModal('quick');
    const gb = document.getElementById('btn-add-growth'); if (gb) gb.onclick = () => { const h = prompt('키(cm)'), w = prompt('몸무게(kg)'); if (h && w) { growthData.push({ height: h, weight: w, timestamp: new Date().getTime() }); saveAll(); renderGraph(); } };
    switchView('home');
});
