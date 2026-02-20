document.addEventListener('DOMContentLoaded', () => {
    console.log('우리은우 성장일기 v14.0 (Real-time Family Sync) 로드 완료');

    // --- Firebase Configuration (Public Sandbox for Demo) ---
    // Note: In a real app, these should be hidden/secured.
    const firebaseConfig = {
        databaseURL: "https://eunu-diary-default-rtdb.firebaseio.com"
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    let familyId = localStorage.getItem('familyId') || null;
    let syncEnabled = !!familyId;

    // --- State & Storage ---
    let records = JSON.parse(localStorage.getItem('babyRecords')) || [];
    let growthData = JSON.parse(localStorage.getItem('babyGrowth')) || [];
    let profile = JSON.parse(localStorage.getItem('babyProfile')) || {
        name: '우리은우',
        birthdate: '2026-02-15',
        birthTime: '10:30',
        bloodType: 'A형',
        birthWeight: '3.2',
        birthHeight: '50'
    };
    let currentView = 'home', chart = null, selectedDate = new Date();

    const selectors = {
        modalOverlay: document.getElementById('modal-overlay'),
        modalBody: document.getElementById('modal-body'),
        dtPickerOverlay: document.getElementById('dt-picker-overlay'),
        wheelContainer: document.getElementById('wheel-container'),
        navItems: document.querySelectorAll('.nav-item'),
        home: document.getElementById('view-home'),
        graph: document.getElementById('view-graph'),
        calendar: document.getElementById('view-calendar'),
        settings: document.getElementById('view-settings'),
        dDayText: document.getElementById('d-day-text'),
        backBtn: document.getElementById('header-back-btn')
    };

    const saveAll = (syncToCloud = true) => {
        localStorage.setItem('babyRecords', JSON.stringify(records));
        localStorage.setItem('babyGrowth', JSON.stringify(growthData));
        localStorage.setItem('babyProfile', JSON.stringify(profile));

        if (syncEnabled && familyId && syncToCloud) {
            db.ref(`families/${familyId}`).set({
                records,
                growthData,
                profile,
                lastUpdated: Date.now()
            });
        }
    };

    const setupSync = (fid) => {
        if (!fid) return;
        familyId = fid;
        localStorage.setItem('familyId', fid);
        syncEnabled = true;

        db.ref(`families/${fid}`).on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                records = data.records || [];
                growthData = data.growthData || [];
                profile = data.profile || profile;
                saveAll(false); // Update local only
                render();
                updateHeader();
                const status = document.getElementById('sync-status');
                if (status) status.innerText = `가족 ID: ${fid} (동기화 중)`;
            }
        });
    };

    if (syncEnabled) setupSync(familyId);

    const getTimeStr = (ts) => new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const getFullDtStr = (ts) => {
        const d = new Date(ts);
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]}) ${getTimeStr(ts)}`;
    };

    const calculateDDay = () => {
        if (!profile.birthdate) return 'D+??';
        const birthMid = new Date(new Date(profile.birthdate).setHours(0, 0, 0, 0));
        const todayMid = new Date(new Date().setHours(0, 0, 0, 0));
        return `D+${Math.floor((todayMid - birthMid) / 86400000) + 1}`;
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

    // --- Universal Wheel Picker Engine ---
    function openUniversalPicker(options, callback) {
        selectors.dtPickerOverlay.style.display = 'flex';
        selectors.wheelContainer.innerHTML = '';
        const state = {};

        options.wheels.forEach((w, idx) => {
            const col = document.createElement('div');
            col.className = 'wheel-col';
            const scroller = document.createElement('div');
            scroller.className = 'wheel-scroller';

            for (let i = w.min; i <= w.max; i += (w.step || 1)) {
                const item = document.createElement('div');
                item.className = 'wheel-item';
                item.innerText = w.format ? w.format(i) : String(i).padStart(2, '0');
                scroller.appendChild(item);
            }
            col.appendChild(scroller);
            selectors.wheelContainer.appendChild(col);
            if (idx < options.wheels.length - 1 && options.separator) {
                const sep = document.createElement('span');
                sep.className = 'wheel-separator';
                sep.innerText = options.separator;
                selectors.wheelContainer.appendChild(sep);
            }

            state[idx] = w.init || w.min;
            setTimeout(() => {
                const initialIdx = Math.floor((state[idx] - w.min) / (w.step || 1));
                col.scrollTo({ top: initialIdx * 44, behavior: 'auto' });
            }, 50);

            col.onscroll = () => {
                const curIdx = Math.round(col.scrollTop / 44);
                const val = w.min + (curIdx * (w.step || 1));
                if (val > w.max) return;
                state[idx] = val;
                scroller.querySelectorAll('.wheel-item').forEach((it, i) => it.classList.toggle('selected', i === curIdx));
            };
        });

        document.getElementById('dt-cancel').onclick = () => selectors.dtPickerOverlay.style.display = 'none';
        document.getElementById('dt-done').onclick = () => {
            const vals = Object.values(state);
            callback(vals.length > 1 ? vals : vals[0]);
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
        if (dtTxt) {
            const days = ['일', '월', '화', '수', '목', '금', '토'];
            const isToday = new Date().toLocaleDateString() === selectedDate.toLocaleDateString();
            dtTxt.innerText = `${String(selectedDate.getMonth() + 1).padStart(2, '0')}월 ${String(selectedDate.getDate()).padStart(2, '0')}일 (${isToday ? '오늘' : days[selectedDate.getDay()]})`;
        }

        const timeline = document.getElementById('timeline');
        const ds = selectedDate.toLocaleDateString();
        const f = records.filter(r => new Date(r.timestamp).toLocaleDateString() === ds);
        const sorted = [...f].sort((a, b) => b.timestamp - a.timestamp);

        timeline.innerHTML = sorted.length ? '' : '<p style="text-align:center; padding:100px 20px; color:#ddd; font-weight:900; font-size:1.1rem;">기록이 없습니다.</p>';
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
                </div>
            `;
            timeline.appendChild(el);
        });

        const feedSum = f.filter(r => r.type === 'feed').reduce((a, c) => a + (parseInt(c.description) || 0), 0);
        const sleepSum = f.filter(r => r.type === 'sleep').reduce((a, c) => a + (c.dm || 0), 0);
        const diaperCnt = f.filter(r => r.type === 'diaper').length;
        document.querySelector('#btn-feed .stat-val-small').innerText = `${feedSum}g`;
        document.querySelector('#btn-diaper .stat-val-small').innerText = `${diaperCnt}회`;
        document.querySelector('#btn-sleep .stat-val-small').innerText = `${Math.floor(sleepSum / 60)}시간 ${sleepSum % 60}분`;
        document.querySelector('#btn-bath .stat-val-small').innerText = `${f.filter(r => r.type === 'bath').length}회`;
    }

    window.editRec = (id) => { const r = records.find(x => x.id === id); if (r) window.openModal(r.type, id); };

    // --- Modal System ---
    window.openModal = (type, rid = null) => {
        selectors.modalOverlay.style.display = 'flex';
        let html = '', selImg = null, selTitle = '';
        const rec = rid ? records.find(x => x.id === rid) : null;
        let curDt = rec ? new Date(rec.timestamp) : new Date(selectedDate);
        if (!rec) { const n = new Date(); curDt.setHours(n.getHours(), n.getMinutes()); }

        let sleepStart = rec && rec.dm ? new Date(rec.timestamp - (rec.dm * 60000)) : new Date(curDt.getTime() - 3600000);
        let sleepEnd = rec && rec.dm ? new Date(rec.timestamp) : new Date(curDt.getTime());
        let valAmount = rec ? parseInt(rec.description) : (type === 'feed' ? 120 : 36);
        let valDecimal = rec && type === 'health' ? parseInt(rec.description.split('.')[1]) || 0 : 5;

        const refreshDtLabel = () => {
            const el = document.getElementById('modal-dt-disp');
            if (el) el.innerHTML = `<i class="far fa-calendar-alt"></i> ${getFullDtStr(curDt.getTime())} <i class="fas fa-chevron-down"></i>`;
        };

        const updateSleepDisp = () => {
            const sEl = document.getElementById('sleep-start-disp'), eEl = document.getElementById('sleep-end-disp');
            const diffEl = document.getElementById('v-sleep-diff');
            if (sEl) sEl.innerText = getTimeStr(sleepStart.getTime());
            if (eEl) eEl.innerText = getTimeStr(sleepEnd.getTime());
            let diffMs = sleepEnd - sleepStart;
            if (diffMs < 0) diffMs += 86400000; // Next day fix
            const dm = Math.floor(diffMs / 60000);
            if (diffEl) diffEl.innerText = `${Math.floor(dm / 60)}시간 ${dm % 60}분`;
        };

        const updateValDisp = () => {
            const el = document.getElementById('v-val-main');
            const lbl = document.querySelector('#v-val-trigger span');
            if (!el || !lbl) return;
            if (type === 'health') {
                if (selTitle === '투약') {
                    lbl.innerText = '투약 용량';
                    el.innerHTML = `${valAmount}<small>ml</small>`;
                } else {
                    lbl.innerText = '현재 측정값';
                    el.innerHTML = `${valAmount}.${valDecimal}<small>°C</small>`;
                }
            }
            else if (type === 'feed') el.innerHTML = `${valAmount}<small>g</small>`;
        };

        const headerHtml = `<div class="modal-header-row"><h3>${type === 'feed' ? '식사' : type === 'diaper' ? '배변' : type === 'sleep' ? '수면' : type === 'bath' ? '목욕' : type === 'health' ? '건강' : type === 'photo' ? '일기' : '추가하기'}</h3><i class="fas fa-times close-icon" onclick="window.closeModal()"></i></div>
        <div class="modal-date-picker" id="modal-dt-disp" ${type === 'quick' ? 'style="display:none"' : ''}></div>`;

        if (type === 'quick') {
            html = `<div class="modal-header-row"><h3>추가하기</h3><i class="fas fa-times close-icon" onclick="window.closeModal()"></i></div>
            <div class="quick-add-grid">
                <div class="quick-add-item" onclick="window.openModal('feed')"><div class="circle" style="background:#fff8e1; color:#ffa000;"><i class="fas fa-pizza-slice"></i></div><label>식사</label></div>
                <div class="quick-add-item" onclick="window.openModal('diaper')"><div class="circle" style="background:#efebe9; color:#8d6e63;"><i class="fas fa-baby"></i></div><label>배변</label></div>
                <div class="quick-add-item" onclick="window.openModal('sleep')"><div class="circle" style="background:#e0f7fa; color:#00acc1;"><i class="fas fa-moon"></i></div><label>수면</label></div>
                <div class="quick-add-item" onclick="window.openModal('bath')"><div class="circle" style="background:#f9fbe7; color:#afb42b;"><i class="fas fa-bath"></i></div><label>목욕</label></div>
                <div class="quick-add-item" onclick="window.openModal('health')"><div class="circle" style="background:#e1f5fe; color:#0288d1;"><i class="fas fa-thermometer-half"></i></div><label>건강</label></div>
                <div class="quick-add-item" onclick="window.openModal('photo')"><div class="circle" style="background:#f3e5f5; color:#8e24aa;"><i class="fas fa-camera-retro"></i></div><label>일기</label></div>
            </div>`;
        } else {
            switch (type) {
                case 'feed':
                    selTitle = rec ? rec.title : '식사';
                    html = `${headerHtml}<div class="selection-grid">
                        <div class="selection-item ${selTitle === '식사' ? 'active' : ''}" data-val="f1"><div class="circle"><i class="fas fa-utensils"></i></div><label>식사</label></div>
                        <div class="selection-item ${selTitle === '간식' ? 'active' : ''}" data-val="f2"><div class="circle"><i class="fas fa-cookie"></i></div><label>간식</label></div>
                    </div><div class="trigger-box" id="v-val-trigger"><span>기록된 섭취량</span><strong id="v-val-main">120<small>g</small></strong></div><div class="note-container"><textarea id="v-nt" placeholder="메모를 입력하세요">${rec ? rec.notes || '' : ''}</textarea></div>`;
                    break;
                case 'diaper':
                    selTitle = rec ? rec.title : '소변';
                    html = `${headerHtml}<div class="selection-grid">
                        <div class="selection-item ${selTitle === '소변' ? 'active' : ''}" data-val="d1"><div class="circle"><i class="fas fa-tint"></i></div><label>소변</label></div>
                        <div class="selection-item ${selTitle === '대변' ? 'active' : ''}" data-val="d2"><div class="circle"><i class="fas fa-poop"></i></div><label>대변</label></div>
                    </div><div class="note-container" style="margin-top:20px;"><textarea id="v-nt" placeholder="기록할 내용이 있나요?">${rec ? rec.notes || '' : ''}</textarea></div>`;
                    break;
                case 'health':
                    selTitle = rec ? rec.title : '체온';
                    html = `${headerHtml}<div class="selection-grid">
                        <div class="selection-item ${selTitle === '체온' ? 'active' : ''}" data-val="h1"><div class="circle"><i class="fas fa-thermometer-half"></i></div><label>체온</label></div>
                        <div class="selection-item ${selTitle === '투약' ? 'active' : ''}" data-val="h2"><div class="circle"><i class="fas fa-pills"></i></div><label>투약</label></div>
                    </div><div class="trigger-box" id="v-val-trigger"><span>현재 측정값</span><strong id="v-val-main">36.5<small>°C</small></strong></div><div class="note-container"><textarea id="v-nt" placeholder="증상 등을 입력하세요">${rec ? rec.notes || '' : ''}</textarea></div>`;
                    break;
                case 'sleep':
                    html = `${headerHtml}<div class="trigger-box" style="background:#f0fafe; border-color:#e1f5fe;"><span>총 수면시간</span><strong id="v-sleep-diff" style="color:#00acc1;">?시간 ?분</strong></div><div class="time-picker-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:25px;">
                        <div class="trigger-box" id="sleep-start-trigger" style="padding:20px; margin-bottom:0;"><span>시작 시간</span><strong style="font-size:1.6rem;" id="sleep-start-disp">${getTimeStr(sleepStart)}</strong></div>
                        <div class="trigger-box" id="sleep-end-trigger" style="padding:20px; margin-bottom:0;"><span>종료 시간</span><strong style="font-size:1.6rem;" id="sleep-end-disp">${getTimeStr(sleepEnd)}</strong></div>
                    </div><div class="note-container"><textarea id="v-nt" placeholder="메모...">${rec ? rec.notes || '' : ''}</textarea></div>`;
                    selTitle = '수면';
                    break;
                case 'bath':
                    selTitle = '목욕';
                    html = `${headerHtml}<div class="selection-grid"><div class="selection-item active"><div class="circle"><i class="fas fa-bath"></i></div><label>목욕</label></div></div><div class="note-container"><textarea id="v-nt" placeholder="메모">${rec ? rec.notes || '' : ''}</textarea></div>`;
                    break;
                case 'photo':
                    selImg = rec ? rec.imageData : null;
                    html = `${headerHtml}<div id="img-b" style="width:100%; height:200px; background:#f5f5f5; border:2px dashed #e0e0e0; border-radius:24px; display:flex; justify-content:center; align-items:center; overflow:hidden; cursor:pointer;">${selImg ? `<img src="${selImg}" style="height:100%;">` : '<i class="fas fa-camera" style="font-size:3rem; color:#ccc;"></i>'}<input type="file" id="fi-i" style="display:none" accept="image/*"></div><div class="note-container" style="margin-top:25px;"><textarea id="v-nt" placeholder="오늘의 일기...">${rec ? rec.notes || '' : ''}</textarea></div>`;
                    selTitle = '하루일기';
                    break;
            }
        }

        const footer = `<div class="modal-footer">${rid ? `<button class="btn btn-cancel" style="background:#fffafa; color:#ff5252; border:1px solid #ffeaea;" onclick="window.delMod('${rid}')">기록삭제</button>` : ''}<button class="btn btn-save" id="save-final">${rid ? '수정완료' : '기록저장'}</button></div>`;
        selectors.modalBody.innerHTML = html + footer;

        refreshDtLabel();
        if (type === 'sleep') updateSleepDisp();
        if (type === 'feed' || type === 'health') updateValDisp();

        // --- Event Listeners with Universal Wheel ---
        document.getElementById('modal-dt-disp').onclick = () => openUniversalPicker({
            wheels: [
                { min: 0, max: 23, init: curDt.getHours() },
                { min: 0, max: 59, init: curDt.getMinutes() }
            ], separator: ':'
        }, (res) => { curDt.setHours(res[0], res[1]); refreshDtLabel(); });

        if (type === 'feed') {
            document.getElementById('v-val-trigger').onclick = () => openUniversalPicker({
                wheels: [{ min: 0, max: 500, step: 5, init: valAmount, format: (v) => `${v} g` }]
            }, (res) => { valAmount = res; updateValDisp(); });
        }
        if (type === 'health') {
            document.getElementById('v-val-trigger').onclick = () => {
                if (selTitle === '투약') {
                    openUniversalPicker({
                        wheels: [{ min: 1, max: 50, init: valAmount, format: (v) => `${v} ml` }]
                    }, (res) => { valAmount = res; updateValDisp(); });
                } else {
                    openUniversalPicker({
                        wheels: [
                            { min: 34, max: 42, init: valAmount, format: (v) => `${v}` },
                            { min: 0, max: 9, init: valDecimal, format: (v) => `.${v}` }
                        ], separator: ''
                    }, (res) => { valAmount = res[0]; valDecimal = res[1]; updateValDisp(); });
                }
            };
        }
        if (type === 'sleep') {
            document.getElementById('sleep-start-trigger').onclick = () => openUniversalPicker({
                wheels: [{ min: 0, max: 23, init: sleepStart.getHours() }, { min: 0, max: 59, init: sleepStart.getMinutes() }], separator: ':'
            }, (res) => { sleepStart.setHours(res[0], res[1]); updateSleepDisp(); });
            document.getElementById('sleep-end-trigger').onclick = () => openUniversalPicker({
                wheels: [{ min: 0, max: 23, init: sleepEnd.getHours() }, { min: 0, max: 59, init: sleepEnd.getMinutes() }], separator: ':'
            }, (res) => { sleepEnd.setHours(res[0], res[1]); updateSleepDisp(); });
        }

        document.querySelectorAll('.selection-item').forEach(i => i.onclick = () => {
            document.querySelectorAll('.selection-item').forEach(x => x.classList.remove('active'));
            i.classList.add('active'); selTitle = i.querySelector('label').innerText;
            if (type === 'health') {
                if (selTitle === '투약' && valAmount > 50) valAmount = 5;
                else if (selTitle === '체온' && valAmount < 30) valAmount = 36;
                updateValDisp();
            }
        });

        const im = document.getElementById('img-b'), fi = document.getElementById('fi-i');
        if (im) im.onclick = () => fi.click();
        if (fi) fi.onchange = (e) => {
            const f = e.target.files[0];
            if (f) { const r = new FileReader(); r.onload = (ev) => { selImg = ev.target.result; im.innerHTML = `<img src="${selImg}" style="height:100%;">`; }; r.readAsDataURL(f); }
        };

        document.getElementById('save-final').onclick = () => {
            const res = { type, title: selTitle, timestamp: curDt.getTime(), notes: document.getElementById('v-nt')?.value || "", imageData: selImg };
            if (type === 'feed') res.description = `${valAmount}g`;
            else if (type === 'health') res.description = selTitle === '투약' ? `${valAmount}ml` : `${valAmount}.${valDecimal}°C`;
            else if (type === 'sleep') {
                let diffMs = sleepEnd - sleepStart;
                if (diffMs < 0) diffMs += 86400000;
                const dm = Math.floor(diffMs / 60000);
                res.description = `${Math.floor(dm / 60)}시간 ${dm % 60}분`;
                res.dm = dm;
                res.timestamp = sleepEnd.getTime();
            }
            else if (type === 'diaper') res.description = '기저귀 교체';
            else res.description = '기록 완료';

            if (rid) { const ix = records.findIndex(x => x.id === rid); records[ix] = { ...records[ix], ...res }; }
            else { const id = 'rec_' + Math.random().toString(36).substr(2, 9); records.push({ id, ...res }); }
            saveAll(); render(); updateHeader(); window.closeModal();
        };
    };

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
        const sTime = document.getElementById('sum-time');
        const sBlood = document.getElementById('sum-blood');
        const sWeight = document.getElementById('sum-weight');
        const sHeight = document.getElementById('sum-height');

        if (sTime) sTime.innerText = profile.birthTime || '-';
        if (sBlood) sBlood.innerText = profile.bloodType || '-';
        if (sWeight) sWeight.innerText = profile.birthWeight ? `${profile.birthWeight}kg` : '-';
        if (sHeight) sHeight.innerText = profile.birthHeight ? `${profile.birthHeight}cm` : '-';

        document.getElementById('set-sync').onclick = () => {
            const fid = prompt('가족 공유 ID를 입력해 주세요. (같은 ID를 쓰면 데이터가 공유됩니다)', familyId || '');
            if (fid) setupSync(fid);
        };

        document.getElementById('set-profile').onclick = () => {
            const n = prompt('아이 이름을 입력해주세요', profile.name);
            const b = prompt('태어난 날짜를 입력해주세요 (예: 2026-02-15)', profile.birthdate);
            const t = prompt('태어난 시간을 입력해주세요 (예: 14:30)', profile.birthTime || '00:00');
            const bt = prompt('혈액형을 입력해주세요 (예: A형, B형...)', profile.bloodType || '알 수 없음');
            const bw = prompt('태어날 때 몸무게(kg)를 입력해주세요', profile.birthWeight || '');
            const bh = prompt('태어날 때 키(cm)를 입력해주세요', profile.birthHeight || '');

            if (n !== null) profile.name = n;
            if (b !== null) profile.birthdate = b;
            if (t !== null) profile.birthTime = t;
            if (bt !== null) profile.bloodType = bt;
            if (bw !== null) profile.birthWeight = bw;
            if (bh !== null) profile.birthHeight = bh;

            saveAll(); updateHeader(); render();
        };
        document.getElementById('set-backup').onclick = () => {
            const data = { records, growthData, profile, exportDate: new Date().toISOString() };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `eunu_diary_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert('데이터가 성공적으로 저장되었습니다!');
        };
        document.getElementById('set-reset').onclick = () => { if (confirm('모든 데이터를 삭제할까요? 되돌릴 수 없습니다.')) { records = []; growthData = []; saveAll(); render(); updateHeader(); } };
    }

    // --- Growth Modal Logic ---
    window.openGrowthModal = () => {
        selectors.modalOverlay.style.display = 'flex';
        let hVal = 50, wVal = 3.5;
        const html = `<div class="modal-header-row"><h3>성장 기록 추가</h3><i class="fas fa-times close-icon" onclick="window.closeModal()"></i></div>
        <div class="trigger-box" id="v-height-trigger"><span>현재 키</span><strong id="v-height-main">50.0<small>cm</small></strong></div>
        <div class="trigger-box" id="v-weight-trigger"><span>현재 몸무게</span><strong id="v-weight-main">3.50<small>kg</small></strong></div>
        <div class="modal-footer"><button class="btn btn-save" id="save-growth">성장 기록 저장</button></div>`;
        selectors.modalBody.innerHTML = html;

        const updateGDisp = () => {
            document.getElementById('v-height-main').innerHTML = `${hVal.toFixed(1)}<small>cm</small>`;
            document.getElementById('v-weight-main').innerHTML = `${wVal.toFixed(2)}<small>kg</small>`;
        };

        document.getElementById('v-height-trigger').onclick = () => openUniversalPicker({
            wheels: [
                { min: 30, max: 120, init: Math.floor(hVal) },
                { min: 0, max: 9, init: Math.round((hVal % 1) * 10), format: (v) => `.${v}` }
            ], separator: ''
        }, (res) => { hVal = res[0] + (res[1] / 10); updateGDisp(); });

        document.getElementById('v-weight-trigger').onclick = () => openUniversalPicker({
            wheels: [
                { min: 2, max: 30, init: Math.floor(wVal) },
                { min: 0, max: 95, step: 5, init: Math.round((wVal % 1) * 100), format: (v) => `.${String(v).padStart(2, '0')}` }
            ], separator: ''
        }, (res) => { wVal = res[0] + (res[1] / 100); updateGDisp(); });

        document.getElementById('save-growth').onclick = () => {
            growthData.push({ timestamp: new Date().getTime(), height: hVal, weight: wVal });
            saveAll(); render(); window.closeModal();
        };
    };

    ['feed', 'diaper', 'sleep', 'bath', 'health', 'photo'].forEach(t => { const b = document.getElementById(`btn-${t}`); if (b) b.onclick = () => window.openModal(t); });
    document.getElementById('global-add-btn').onclick = () => window.openModal('quick');
    const growthBtn = document.getElementById('btn-add-growth');
    if (growthBtn) growthBtn.onclick = () => window.openGrowthModal();

    switchView('home');
});
