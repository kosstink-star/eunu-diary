document.addEventListener('DOMContentLoaded', () => {
    console.log('우리은우 성장일기 v9.5 (Final UX Polish) 로드 완료');

    // --- State & Storage ---
    let records = JSON.parse(localStorage.getItem('babyRecords')) || [];
    let growthData = JSON.parse(localStorage.getItem('babyGrowth')) || [];
    let profile = JSON.parse(localStorage.getItem('babyProfile')) || { name: '우리은우' };
    let currentView = 'home', chart = null, selectedDate = new Date();

    const selectors = {
        modalOverlay: document.getElementById('modal-overlay'),
        modalBody: document.getElementById('modal-body'),
        contextMenuOverlay: document.getElementById('context-menu-overlay'),
        dtPickerOverlay: document.getElementById('dt-picker-overlay'),
        navItems: document.querySelectorAll('.nav-item'),
        home: document.getElementById('view-home'),
        graph: document.getElementById('view-graph'),
        calendar: document.getElementById('view-calendar'),
        settings: document.getElementById('view-settings')
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

    const switchView = (vn) => {
        Object.keys(selectors).forEach(k => { if (selectors[k]?.tagName === 'MAIN') selectors[k].style.display = (k === vn) ? 'block' : 'none'; });
        selectors.navItems.forEach(i => i.classList.toggle('active', i.dataset.view === vn));
        currentView = vn; render();
    };

    selectors.navItems.forEach(i => i.onclick = () => switchView(i.dataset.view));
    document.querySelector('.date-nav .fa-chevron-left').onclick = () => { selectedDate.setDate(selectedDate.getDate() - 1); render(); };
    document.querySelector('.date-nav .fa-chevron-right').onclick = () => { selectedDate.setDate(selectedDate.getDate() + 1); render(); };
    if (document.querySelector('.back-btn')) document.querySelector('.back-btn').onclick = () => switchView('home');

    // --- Long Press Logic ---
    let lpTimer, lpId = null, isLpActive = false;
    function handleStart(id) {
        handleEnd();
        lpTimer = setTimeout(() => {
            lpId = id; isLpActive = true;
            selectors.contextMenuOverlay.style.display = 'flex';
        }, 700);
    }
    function handleEnd() { clearTimeout(lpTimer); }
    window.addEventListener('scroll', handleEnd, true);
    selectors.contextMenuOverlay.onclick = (e) => { if (e.target === selectors.contextMenuOverlay) selectors.contextMenuOverlay.style.display = 'none'; };
    document.getElementById('ctx-edit').onclick = () => { selectors.contextMenuOverlay.style.display = 'none'; window.editRec(lpId); };
    document.getElementById('ctx-delete').onclick = () => { selectors.contextMenuOverlay.style.display = 'none'; delRec(lpId); };

    function delRec(id) {
        if (confirm('이 기록을 삭제하시겠습니까?')) {
            records = records.filter(r => r.id !== id);
            saveAll(); render();
            selectors.modalOverlay.style.display = 'none';
        }
    }

    // --- Native Time Picker ---
    function openPicker(dt, cb) {
        selectors.dtPickerOverlay.style.display = 'flex';
        const hIn = document.getElementById('dt-h'), mIn = document.getElementById('dt-m');
        hIn.value = dt.getHours(); mIn.value = dt.getMinutes();
        document.getElementById('dt-cancel').onclick = () => selectors.dtPickerOverlay.style.display = 'none';
        document.getElementById('dt-done').onclick = () => {
            cb(parseInt(hIn.value), parseInt(mIn.value));
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
        const title = document.querySelector('header h1');
        if (title) title.innerText = `${profile.name} 육아 기록`;
        const dtTxt = document.getElementById('current-date-text');
        if (dtTxt) dtTxt.innerText = getDayStr(selectedDate);

        const timeline = document.getElementById('timeline');
        const ds = selectedDate.toLocaleDateString();
        const f = records.filter(r => new Date(r.timestamp).toLocaleDateString() === ds);
        const sorted = [...f].sort((a, b) => b.timestamp - a.timestamp);

        timeline.innerHTML = sorted.length ? '' : '<p style="text-align:center; padding:80px; color:#ddd; font-weight:700;">기록이 없습니다.</p>';
        sorted.forEach(r => {
            const el = document.createElement('div');
            el.className = `diary-item type-${r.type}`;
            el.innerHTML = `
                <div class="item-time">${getTimeStr(r.timestamp)}</div>
                <div class="item-dot"></div>
                <div class="item-content">
                    <div class="item-main">
                        <h4>${r.title}</h4>
                        <div class="item-sub">${r.description || ''}</div>
                        ${r.notes ? `<div class="item-notes">${r.notes}</div>` : ''}
                        ${r.imageData ? `<img src="${r.imageData}" style="width:100%; border-radius:12px; margin-top:10px;">` : ''}
                    </div>
                    <div class="item-arrow" onclick="window.editRec('${r.id}')"><i class="fas fa-chevron-right"></i></div>
                </div>
            `;
            el.onmousedown = () => handleStart(r.id);
            el.onmouseup = handleEnd;
            el.onmousemove = handleEnd;
            el.ontouchstart = () => handleStart(r.id);
            el.ontouchend = handleEnd;
            el.ontouchmove = handleEnd;
            timeline.appendChild(el);
        });

        // Update Stats
        const feedSum = f.filter(r => r.type === 'feed').reduce((a, c) => a + (parseInt(c.description) || 0), 0);
        const sleepSum = f.filter(r => r.type === 'sleep').reduce((a, c) => a + (c.dm || 0), 0);
        document.querySelector('#btn-feed .stat-val-small').innerText = `${feedSum}ml`;
        document.querySelector('#btn-diaper .stat-val-small').innerText = `${f.filter(r => r.type === 'diaper').length}회`;
        document.querySelector('#btn-sleep .stat-val-small').innerText = `${Math.floor(sleepSum / 60)}시간 ${sleepSum % 60}분`;
        document.querySelector('#btn-bath .stat-val-small').innerText = `${f.filter(r => r.type === 'bath').length}회`;
        document.querySelector('#btn-health .stat-val-small').innerText = `${f.filter(r => r.type === 'health').length}개`;
        document.querySelector('#btn-photo .stat-val-small').innerText = `${f.filter(r => r.type === 'photo').length}개`;
    }

    window.editRec = (id) => { const r = records.find(x => x.id === id); if (r) openModal(r.type, id); };

    // --- Modal Implementation ---
    function openModal(type, rid = null) {
        selectors.modalOverlay.style.display = 'flex';
        let html = '';
        let selImg = null, selTitle = '';
        const rec = rid ? records.find(x => x.id === rid) : null;
        const curDt = rec ? new Date(rec.timestamp) : new Date(selectedDate);
        if (!rec) { const n = new Date(); curDt.setHours(n.getHours()); curDt.setMinutes(n.getMinutes()); }

        const refreshDt = () => {
            const ds = getDayStr(curDt).replace(/오늘|일|월|화|수|목|금|토|\(|\)/g, (m) => m === '(' ? '' : m === ')' ? '' : ''); // Simplified
            const disp = `${curDt.getFullYear()}.${String(curDt.getMonth() + 1).padStart(2, '0')}.${String(curDt.getDate()).padStart(2, '0')} 금 ${getTimeStr(curDt.getTime())}`;
            const el = document.getElementById('modal-dt-disp');
            if (el) el.innerHTML = `<i class="far fa-calendar-alt"></i> ${disp} <i class="fas fa-chevron-down"></i>`;
        };

        const top = `<div class="modal-header-row"><h3>${type === 'feed' ? '식사' : type === 'diaper' ? '배변' : type === 'sleep' ? '수면' : type === 'bath' ? '목욕' : type === 'health' ? '건강' : '일기'} 기록</h3>${rid ? `<i class="fas fa-trash-alt delete-icon" onclick="window.delMod('${rid}')"></i>` : `<i class="fas fa-times delete-icon" onclick="closeModal()"></i>`}</div><div class="modal-date-picker" id="modal-dt-disp"></div>`;

        switch (type) {
            case 'feed':
                selTitle = rec ? rec.title : '이유식';
                html = `${top}<div class="selection-grid">
                    <div class="selection-item ${selTitle === '이유식' ? 'active' : ''}" data-val="f1"><div class="circle" style="background:#fff8e1; color:#ffa000;"><i class="fas fa-utensils"></i></div><label>이유식</label></div>
                    <div class="selection-item ${selTitle === '간식' ? 'active' : ''}" data-val="f2"><div class="circle" style="background:#e0f2f1; color:#00897b;"><i class="fas fa-cookie"></i></div><label>간식</label></div>
                </div><div class="amount-box">섭취량 <strong id="v-disp">${rec ? parseInt(rec.description) : '200'}</strong> ml</div><input type="number" id="v-in" value="${rec ? parseInt(rec.description) : '200'}" style="width:100%; padding:15px; border-radius:15px; border:1px solid #eee; text-align:center; margin-bottom:20px;"><div class="note-container"><textarea id="v-nt" placeholder="메모를 남겨주세요">${rec ? rec.notes || '' : ''}</textarea></div>`;
                break;
            case 'diaper':
                selTitle = rec ? rec.title : '대변';
                html = `${top}<div class="selection-grid">
                    <div class="selection-item ${selTitle === '소변' ? 'active' : ''}" data-val="d1"><div class="circle" style="background:#f1f8e9; color:#7cb342;"><i class="fas fa-tint"></i></div><label>소변</label></div>
                    <div class="selection-item ${selTitle === '대변' ? 'active' : ''}" data-val="d2"><div class="circle" style="background:#efebe9; color:#8d6e63;"><i class="fas fa-poop"></i></div><label>대변</label></div>
                    <div class="selection-item ${selTitle === '둘다' ? 'active' : ''}" data-val="d3"><div class="circle" style="background:#f5f5f5; color:#666;"><i class="fas fa-check-double"></i></div><label>둘다</label></div>
                </div><div class="note-container"><textarea id="v-nt" placeholder="기록을 남겨주세요">${rec ? rec.notes || '' : ''}</textarea></div>`;
                break;
            case 'health':
                selTitle = rec ? rec.title : '체온';
                html = `${top}<div class="selection-grid">
                    <div class="selection-item ${selTitle === '체온' ? 'active' : ''}" data-val="h1"><div class="circle" style="background:#e0f7fa; color:#00acc1;"><i class="fas fa-thermometer-half"></i></div><label>체온</label></div>
                    <div class="selection-item ${selTitle === '투약' ? 'active' : ''}" data-val="h2"><div class="circle" style="background:#fce4ec; color:#f06292;"><i class="fas fa-pills"></i></div><label>투약</label></div>
                    <div class="selection-item ${selTitle === '병원' ? 'active' : ''}" data-val="h3"><div class="circle" style="background:#e0f2f1; color:#4db6ac;"><i class="fas fa-hospital"></i></div><label>병원</label></div>
                    <div class="selection-item ${selTitle === '기타' ? 'active' : ''}" data-val="h4"><div class="circle" style="background:#f5f5f5; color:#999;"><i class="fas fa-clipboard-list"></i></div><label>기타</label></div>
                </div><div class="amount-box">측정값 <strong id="v-disp">${rec ? rec.description : '36.5'}</strong> <span id="v-unit">°C</span></div><input type="text" id="v-in" value="${rec ? rec.description : '36.5'}" style="width:100%; padding:15px; border-radius:15px; border:1px solid #eee; text-align:center; margin-bottom:20px;"><div class="note-container"><textarea id="v-nt" placeholder="증상 등을 입력하세요">${rec ? rec.notes || '' : ''}</textarea></div>`;
                break;
            case 'sleep':
                html = `${top}<div class="centered-icon-box"><div class="circle" style="width:80px; height:80px; border-radius:50%; background:#e0f7fa; color:#00acc1; display:flex; justify-content:center; align-items:center; font-size:2rem; border:2px solid #b2ebf2;"><i class="fas fa-moon"></i></div><label style="font-weight:800; color:#00acc1; margin-top:10px;">수면</label></div><div class="time-picker-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px;"><div class="time-picker-box" style="background:#f9f9f9; padding:15px; border-radius:15px; text-align:center;"><span style="font-size:0.8rem; color:#888;">시작</span><div style="font-size:1.4rem; font-weight:700;"><input type="number" id="sh" value="16" style="width:35px; border:none; background:transparent; font-weight:700; font-size:1.4rem;">:<input type="number" id="sm" value="20" style="width:35px; border:none; background:transparent; font-weight:700; font-size:1.4rem;"></div></div><div class="time-picker-box" style="background:#f9f9f9; padding:15px; border-radius:15px; text-align:center;"><span style="font-size:0.8rem; color:#888;">종료</span><div style="font-size:1.4rem; font-weight:700;"><input type="number" id="eh" value="${curDt.getHours()}" style="width:35px; border:none; background:transparent; font-weight:700; font-size:1.4rem;">:<input type="number" id="em" value="${curDt.getMinutes()}" style="width:35px; border:none; background:transparent; font-weight:700; font-size:1.4rem;"></div></div></div>`;
                selTitle = '수면';
                break;
            case 'photo':
                selImg = rec ? rec.imageData : null;
                html = `${top}<div id="img-b" style="width:100%; height:180px; background:#f9f9f9; border:1px dashed #ddd; border-radius:15px; display:flex; justify-content:center; align-items:center; overflow:hidden;">${selImg ? `<img src="${selImg}" style="height:100%;">` : '<i class="fas fa-camera" style="font-size:2rem; color:#ccc;"></i>'}<input type="file" id="fi-i" style="display:none" accept="image/*"></div><div class="note-container" style="margin-top:20px;"><textarea id="v-nt" placeholder="오늘의 일기...">${rec ? rec.notes || '' : ''}</textarea></div>`;
                selTitle = '하루일기';
                break;
            case 'bath':
                selTitle = rec ? rec.title : '통목욕';
                html = `${top}<div class="selection-grid">
                    <div class="selection-item ${selTitle === '통목욕' ? 'active' : ''}" data-val="b1"><div class="circle" style="background:#f9fbe7; color:#afb42b;"><i class="fas fa-bath"></i></div><label>통목욕</label></div>
                    <div class="selection-item ${selTitle === '간단세안' ? 'active' : ''}" data-val="b2"><div class="circle" style="background:#f5f5f5; color:#999;"><i class="fas fa-shower"></i></div><label>간단세안</label></div>
                </div><div class="note-container"><textarea id="v-nt" placeholder="메모">${rec ? rec.notes || '' : ''}</textarea></div>`;
                break;
        }

        selectors.modalBody.innerHTML = html + `<div class="modal-footer" style="margin-top:20px; display:flex; gap:10px;"><button class="btn btn-cancel" onclick="closeModal()">취소</button><button class="btn btn-save" id="save-final">${rid ? '수정' : '저장'}</button></div>`;
        refreshDt();

        document.getElementById('modal-dt-disp').onclick = () => openPicker(curDt, (h, m) => { curDt.setHours(h); curDt.setMinutes(m); refreshDt(); });
        document.querySelectorAll('.selection-item').forEach(i => i.onclick = () => {
            document.querySelectorAll('.selection-item').forEach(x => x.classList.remove('active'));
            i.classList.add('active'); selTitle = i.querySelector('label').innerText;
            const u = document.getElementById('v-unit'); if (u) u.innerText = (selTitle === '체온') ? '°C' : (selTitle === '투약' ? '회' : '');
        });
        const iv = document.getElementById('v-in'), vd = document.getElementById('v-disp'); if (iv && vd) iv.oninput = (e) => vd.innerText = e.target.value;
        const im = document.getElementById('img-b'), fi = document.getElementById('fi-i'); if (im) im.onclick = () => fi.click();
        if (fi) fi.onchange = (e) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = (ev) => { selImg = ev.target.result; im.innerHTML = `<img src="${selImg}" style="height:100%;">`; }; r.readAsDataURL(f); } };

        document.getElementById('save-final').onclick = () => {
            const nt = document.getElementById('v-nt')?.value || "";
            const res = { type, title: selTitle, timestamp: curDt.getTime(), notes: nt, imageData: selImg };
            if (type === 'feed') res.description = `${document.getElementById('v-in').value}ml`;
            else if (type === 'diaper') res.description = '1회';
            else if (type === 'sleep') {
                const sh = Number(document.getElementById('sh').value), sm = Number(document.getElementById('sm').value);
                const eh = Number(document.getElementById('eh').value), em = Number(document.getElementById('em').value);
                const dm = (eh * 60 + em) - (sh * 60 + sm);
                res.description = `${Math.floor(dm / 60)}시간 ${dm % 60}분`;
                res.dm = dm; res.timestamp = new Date(curDt.getFullYear(), curDt.getMonth(), curDt.getDate(), eh, em).getTime();
            } else if (type === 'health') res.description = document.getElementById('v-in').value;
            else if (type === 'photo') res.description = '📖 하루일기';

            if (rid) { const ix = records.findIndex(x => x.id === rid); records[ix] = { ...records[ix], ...res }; }
            else { const id = 'rec_' + Math.random().toString(36).substr(2, 9); records.push({ id, ...res }); }
            saveAll(); render(); closeModal();
        };
    }

    window.closeModal = () => selectors.modalOverlay.style.display = 'none';
    window.delMod = (id) => delRec(id);
    selectors.modalOverlay.onclick = (e) => { if (e.target === selectors.modalOverlay) closeModal(); };

    // --- Others ---
    function renderGraph() {
        const ctx = document.getElementById('growthChart')?.getContext('2d'); if (!ctx) return;
        const s = [...growthData].sort((a, b) => a.timestamp - b.timestamp); if (chart) chart.destroy();
        chart = new Chart(ctx, { type: 'line', data: { labels: s.map(x => new Date(x.timestamp).toLocaleDateString()), datasets: [{ label: '키(cm)', data: s.map(x => x.height), borderColor: '#ffa000' }, { label: '무게(kg)', data: s.map(x => x.weight), borderColor: '#00acc1' }] } });
    }
    function renderCalendar() {
        const c = document.getElementById('calendar-container'); if (!c) return;
        const y = selectedDate.getFullYear(), m = selectedDate.getMonth(), fd = new Date(y, m, 1).getDay(), ld = new Date(y, m + 1, 0).getDate();
        let h = `<div style="padding:20px;"><div style="display:flex; justify-content:space-between; margin-bottom:20px;"><i class="fas fa-chevron-left" id="cp"></i><h3>${y}년 ${m + 1}월</h3><i class="fas fa-chevron-right" id="cn"></i></div><div style="display:grid; grid-template-columns:repeat(7,1fr); gap:5px; text-align:center;">${['일', '월', '화', '수', '목', '금', '토'].map(x => `<div style="font-size:0.8rem; color:#888;">${x}</div>`).join('')}`;
        for (let i = 0; i < fd; i++) h += '<div></div>';
        for (let d = 1; d <= ld; d++) { const dk = new Date(y, m, d).toLocaleDateString(), active = selectedDate.toLocaleDateString() === dk; h += `<div onclick="window.sd(${y},${m},${d})" style="padding:10px; border-radius:10px; background:${active ? 'var(--primary-color)' : '#f9f9f9'}; color:${active ? 'white' : '#333'};">${d}</div>`; }
        c.innerHTML = h + '</div></div>';
        document.getElementById('cp').onclick = () => { selectedDate.setMonth(m - 1); renderCalendar(); };
        document.getElementById('cn').onclick = () => { selectedDate.setMonth(m + 1); renderCalendar(); };
    }
    window.sd = (y, m, d) => { selectedDate = new Date(y, m, d); switchView('home'); };
    function renderSettings() {
        document.getElementById('set-profile').onclick = () => { const n = prompt('이름', profile.name); if (n) { profile.name = n; saveAll(); render(); } };
        document.getElementById('set-reset').onclick = () => { if (confirm('모든 데이터를 삭제하시겠습니까?')) { records = []; growthData = []; saveAll(); render(); } };
    }

    ['feed', 'diaper', 'sleep', 'bath', 'health', 'photo'].forEach(t => { const b = document.getElementById(`btn-${t}`); if (b) b.onclick = () => openModal(t); });
    document.querySelector('.add-btn').onclick = () => openModal('feed');
    const gb = document.getElementById('btn-add-growth'); if (gb) gb.onclick = () => { const h = prompt('키'), w = prompt('무게'); if (h && w) { growthData.push({ height: h, weight: w, timestamp: new Date().getTime() }); saveAll(); renderGraph(); } };
    switchView('home');
});
