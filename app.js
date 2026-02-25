document.addEventListener('DOMContentLoaded', () => {
    console.log('우리은우 성장일기 v2.0 로드 완료');

    // --- Firebase ---
    firebase.initializeApp({ databaseURL: "https://eunu-diary-default-rtdb.firebaseio.com" });
    const db = firebase.database();

    // --- IndexedDB ---
    const DB_NAME = 'EunuDiaryDB', DB_VERSION = 1;
    const STORES = ['records', 'growthData', 'profile', 'sync'];
    const dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = e => { const d = e.target.result; STORES.forEach(s => { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s); }); };
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
    const dbOp = async (type, store, key = null, val = null) => {
        const d = await dbPromise;
        return new Promise((resolve, reject) => {
            const tx = d.transaction(store, type === 'read' ? 'readonly' : 'readwrite');
            const s = tx.objectStore(store);
            let r;
            if (type === 'read') r = key ? s.get(key) : s.getAll();
            else if (type === 'write') r = s.put(val, key);
            else if (type === 'clear') r = s.clear();
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => reject(r.error);
        });
    };

    // --- State ---
    let records = [], growthData = [], capsules = [], familyId = null, syncEnabled = false;
    let profile = { name: '우리은우', birthdate: '2026-02-15', birthTime: '10:30', bloodType: 'A형', birthWeight: '3.2', birthHeight: '50' };
    let currentView = 'home', chartH = null, chartW = null, selectedDate = new Date();
    let lastSyncTime = parseInt(localStorage.getItem('lastSyncTime')) || 0;

    // =============================================
    // 🌙 다크 모드
    // =============================================
    const darkBtn = document.getElementById('dark-mode-btn');
    const applyDark = (on) => {
        document.body.classList.toggle('dark-mode', on);
        darkBtn.innerHTML = on ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    };
    let isDark = localStorage.getItem('darkMode') === 'true';
    applyDark(isDark);
    darkBtn.onclick = () => { isDark = !isDark; applyDark(isDark); localStorage.setItem('darkMode', isDark); };

    // =============================================
    // 🎉 토스트 알림
    // =============================================
    window.showToast = (msg, type = 'success', duration = 3000) => {
        const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
        const tc = document.getElementById('toast-container');
        if (!tc) return;
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.innerHTML = `<i class="fas ${icons[type] || icons.success}"></i> ${msg}`;
        tc.appendChild(t);
        setTimeout(() => { t.classList.add('hide'); setTimeout(() => t.remove(), 350); }, duration);
    };

    // =============================================
    // 🔍 검색 기능
    // =============================================
    const searchBtn = document.getElementById('search-btn');
    const searchWrapper = document.getElementById('search-bar-wrapper');
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    let searchMode = false, searchQuery = '';

    searchBtn.onclick = () => {
        searchMode = !searchMode;
        searchWrapper.style.display = searchMode ? 'block' : 'none';
        if (searchMode) { searchInput.focus(); }
        else { searchQuery = ''; searchInput.value = ''; render(); }
    };
    searchInput.oninput = () => { searchQuery = searchInput.value.trim().toLowerCase(); render(); };
    searchClear.onclick = () => { searchQuery = ''; searchInput.value = ''; render(); };

    // =============================================
    // 📊 D+Day 팝업
    // =============================================
    const dDayEl = document.getElementById('d-day-text');
    const statsOverlay = document.getElementById('stats-popup-overlay');
    const statsClose = document.getElementById('stats-popup-close');

    dDayEl.onclick = () => {
        if (!profile.birthdate) return;
        const birth = new Date(profile.birthdate);
        const today = new Date();
        const totalDays = Math.floor((new Date(today.setHours(0, 0, 0, 0)) - new Date(birth.setHours(0, 0, 0, 0))) / 86400000) + 1;
        const months = Math.floor(totalDays / 30);
        const weeks = Math.floor(totalDays / 7);
        const totalRecords = records.length;
        const feedTotal = records.filter(r => r.type === 'feed').reduce((a, c) => a + (parseInt(c.description) || 0), 0);
        const sleepTotal = records.filter(r => r.type === 'sleep').reduce((a, c) => a + (c.dm || 0), 0);
        const diaperTotal = records.filter(r => r.type === 'diaper').length;
        const lastGrowth = growthData.length ? growthData[growthData.length - 1] : null;

        document.getElementById('stats-popup-content').innerHTML = `
            <div class="stats-popup-hero">
                <span class="baby-emoji">👶</span>
                <h2>D+${totalDays}</h2>
                <p>${profile.name}와 함께한 ${months}개월 ${totalDays % 30}일</p>
            </div>
            <div class="stats-grid">
                <div class="stats-grid-item">
                    <div class="label">📅 함께한 날</div>
                    <div class="value">${totalDays}<small>일</small></div>
                </div>
                <div class="stats-grid-item">
                    <div class="label">🗓 개월 수</div>
                    <div class="value">${months}<small>개월</small></div>
                </div>
                <div class="stats-grid-item">
                    <div class="label">📝 총 기록</div>
                    <div class="value">${totalRecords}<small>개</small></div>
                </div>
                <div class="stats-grid-item">
                    <div class="label">💤 총 수면</div>
                    <div class="value">${Math.floor(sleepTotal / 60)}<small>시간</small></div>
                </div>
                <div class="stats-grid-item">
                    <div class="label">🍼 총 식사량</div>
                    <div class="value">${feedTotal}<small>ml</small></div>
                </div>
                <div class="stats-grid-item">
                    <div class="label">🩺 배변 횟수</div>
                    <div class="value">${diaperTotal}<small>회</small></div>
                </div>
                ${lastGrowth ? `
                <div class="stats-grid-item">
                    <div class="label">📏 최근 키</div>
                    <div class="value">${lastGrowth.height}<small>cm</small></div>
                </div>
                <div class="stats-grid-item">
                    <div class="label">⚖️ 최근 몸무게</div>
                    <div class="value">${lastGrowth.weight}<small>kg</small></div>
                </div>` : ''}
            </div>`;
        statsOverlay.style.display = 'flex';
    };
    statsClose.onclick = () => statsOverlay.style.display = 'none';
    statsOverlay.onclick = e => { if (e.target === statsOverlay) statsOverlay.style.display = 'none'; };

    // --- Data Load & Sync ---
    const mergeRecords = (local, remote) => {
        const map = new Map();
        local.forEach(r => { if (r && r.id) map.set(r.id, r); });
        remote.forEach(r => { if (r && r.id && (!map.has(r.id) || r.timestamp > (map.get(r.id).timestamp || 0))) map.set(r.id, r); });
        return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
    };

    const saveAll = async (syncToCloud = true) => {
        try {
            await dbOp('write', 'records', 'all', records);
            await dbOp('write', 'growthData', 'all', growthData);
            await dbOp('write', 'profile', 'data', profile);
            await dbOp('write', 'capsules', 'all', capsules);
            await dbOp('write', 'sync', 'familyId', familyId || '');
        } catch (e) { console.error('로컬 저장 실패:', e); }

        if (syncEnabled && familyId && syncToCloud) {
            const status = document.getElementById('sync-status');
            const now = Date.now();
            lastSyncTime = now;
            localStorage.setItem('lastSyncTime', now);
            db.ref(`families/${familyId}`).set({ records, growthData, profile, capsules, lastUpdated: now })
                .then(() => { if (status) status.innerText = `가족 ID: ${familyId} (동기화 완료)`; })
                .catch((e) => {
                    console.error('클라우드 동기화 실패:', e);
                    if (status) status.innerText = `가족 ID: ${familyId} (연결 오류)`;
                });
        }
    };

    const setupSync = (fid) => {
        if (!fid) return;
        familyId = fid; syncEnabled = true;
        const status = document.getElementById('sync-status');
        if (status) status.innerText = `가족 ID: ${fid} (연결 중...)`;

        // 연결 상태 감시 (Firebase 전용 레퍼런스)
        db.ref('.info/connected').on('value', snap => {
            if (snap.val() === false && status) {
                // 실제로 연결이 끊겼을 때만 표시
                status.innerText = `가족 ID: ${fid} (오프라인/연결 끊김)`;
                status.style.color = '#f44336';
            } else if (snap.val() === true && status) {
                // 다시 연결되었을 때 (초기 연결 포함)
                if (status.innerText.includes('오프라인')) {
                    status.innerText = `가족 ID: ${fid} (연결 복구됨)`;
                    status.style.color = '#43a047';
                    // 잠시 후 '동기화 완료'로 변경
                    setTimeout(() => { if (status) status.innerText = `가족 ID: ${fid} (동기화 완료)`; }, 2000);
                }
            }
        });

        // 타임아웃 처리 (5초)
        const timeout = setTimeout(() => {
            if (status && status.innerText.includes('연결 중')) {
                status.innerText = `가족 ID: ${fid} (응답 대기 중...)`;
                status.style.color = '#ff9800';
            }
        }, 5000);

        db.ref(`families/${fid}`).once('value').then(async snap => {
            clearTimeout(timeout);
            const data = snap.val();
            if (data) {
                records = mergeRecords(records, data.records || []);
                capsules = mergeRecords(capsules, data.capsules || []);
                if ((data.lastUpdated || 0) > lastSyncTime) {
                    growthData = data.growthData || growthData;
                    profile = data.profile || profile;
                    lastSyncTime = data.lastUpdated;
                    localStorage.setItem('lastSyncTime', lastSyncTime);
                }
                await saveAll(false); // 로컬에만 저장 (루프 방지)
                render(); updateHeader();
            } else {
                // 데이터가 없는 경우 (새 가족 ID) 현재 데이터 전송
                await saveAll(true);
            }

            if (status) {
                status.innerText = `가족 ID: ${fid} (동기화 완료)`;
                status.style.color = '#43a047';
            }

            // 실시간 리스너 설정
            db.ref(`families/${fid}`).on('value', async liveSnap => {
                const live = liveSnap.val();
                if (!live || live.lastUpdated <= lastSyncTime) return;

                console.log('실시간 업데이트 수신:', live.lastUpdated);
                records = mergeRecords(records, live.records || []);
                capsules = mergeRecords(capsules, live.capsules || []);
                growthData = live.growthData || growthData;
                profile = live.profile || profile;
                lastSyncTime = live.lastUpdated;
                localStorage.setItem('lastSyncTime', lastSyncTime);

                await dbOp('write', 'records', 'all', records);
                await dbOp('write', 'growthData', 'all', growthData);
                await dbOp('write', 'profile', 'data', profile);
                await dbOp('write', 'capsules', 'all', capsules);

                render(); updateHeader();
                if (status) {
                    status.innerText = `가족 ID: ${fid} (방금 업데이트됨)`;
                    status.style.color = '#43a047';
                }
                window.showToast('가족 구성원이 새 기록을 추가했어요! 👨‍👩‍👧‍👦', 'info');
            });
        }).catch(err => {
            clearTimeout(timeout);
            console.error('동기화 오류:', err);
            if (status) {
                status.innerText = `가족 ID: ${fid} (연결 실패: ${err.code || '오류'})`;
                status.style.color = '#f44336';
            }
            window.showToast('데이터 동기화에 실패했습니다.', 'error');
        });
    };

    const loadAll = async () => {
        const old = localStorage.getItem('babyRecords');
        if (old && !localStorage.getItem('migratedToIDB')) {
            const or = JSON.parse(old) || [], og = JSON.parse(localStorage.getItem('babyGrowth')) || [], op = JSON.parse(localStorage.getItem('babyProfile')), ofid = localStorage.getItem('familyId');
            if (or.length) await dbOp('write', 'records', 'all', or);
            if (og.length) await dbOp('write', 'growthData', 'all', og);
            if (op) await dbOp('write', 'profile', 'data', op);
            if (ofid) await dbOp('write', 'sync', 'familyId', ofid);
            localStorage.setItem('migratedToIDB', 'true');
        }
        records = await dbOp('read', 'records', 'all') || [];
        growthData = await dbOp('read', 'growthData', 'all') || [];
        const sp = await dbOp('read', 'profile', 'data'); if (sp) profile = sp;
        familyId = await dbOp('read', 'sync', 'familyId') || null;
        syncEnabled = !!familyId;
        if (syncEnabled) setupSync(familyId);
        capsules = await dbOp('read', 'capsules', 'all') || [];
        updateHeader(); render();
    };
    // loadAll() was here - moved to end

    const selectors = {
        modalOverlay: document.getElementById('modal-overlay'), modalBody: document.getElementById('modal-body'),
        dtPickerOverlay: document.getElementById('dt-picker-overlay'), wheelContainer: document.getElementById('wheel-container'),
        navItems: document.querySelectorAll('.nav-item'), home: document.getElementById('view-home'),
        graph: document.getElementById('view-graph'), calendar: document.getElementById('view-calendar'),
        settings: document.getElementById('view-settings'), gallery: document.getElementById('view-gallery'),
        capsules: document.getElementById('view-capsules'),
        dDayText: document.getElementById('d-day-text'), backBtn: document.getElementById('header-back-btn')
    };

    const getTimeStr = ts => new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const getFullDtStr = ts => { const d = new Date(ts), days = ['일', '월', '화', '수', '목', '금', '토']; return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]}) ${getTimeStr(ts)}`; };
    const calculateDDay = () => { if (!profile.birthdate) return 'D+??'; const b = new Date(new Date(profile.birthdate).setHours(0, 0, 0, 0)), t = new Date(new Date().setHours(0, 0, 0, 0)); return `D+${Math.floor((t - b) / 86400000) + 1}`; };

    const updateHeader = () => {
        if (selectors.dDayText) selectors.dDayText.innerText = calculateDDay();
        const title = document.querySelector('header h1');
        if (title) title.innerText = `${profile.name} 육아 기록`;
        // 뒤로가기 버튼은 타임캡슐 뷰(설정의 하위 뷰)에서만 표시되도록 수정
        if (selectors.backBtn) selectors.backBtn.style.display = (currentView === 'capsules' ? 'block' : 'none');
    };

    const switchView = (vn) => {
        Object.keys(selectors).forEach(k => { const el = selectors[k]; if (el && el.tagName === 'MAIN') el.style.display = (k === vn) ? 'block' : 'none'; });
        selectors.navItems.forEach(i => i.classList.toggle('active', i.dataset.view === vn));
        currentView = vn; updateHeader(); render();
    };

    selectors.navItems.forEach(i => i.onclick = () => switchView(i.dataset.view));
    if (selectors.backBtn) selectors.backBtn.onclick = () => {
        if (currentView === 'capsules') switchView('settings');
        else switchView('home');
    };
    document.getElementById('prev-date').onclick = () => { selectedDate.setDate(selectedDate.getDate() - 1); render(); };
    document.getElementById('next-date').onclick = () => { selectedDate.setDate(selectedDate.getDate() + 1); render(); };

    // --- Universal Wheel Picker ---
    function openUniversalPicker(options, callback) {
        selectors.dtPickerOverlay.style.display = 'flex';
        selectors.wheelContainer.innerHTML = '';
        const state = {};
        options.wheels.forEach((w, idx) => {
            const col = document.createElement('div'); col.className = 'wheel-col';
            const sc = document.createElement('div'); sc.className = 'wheel-scroller';
            for (let i = w.min; i <= w.max; i += (w.step || 1)) {
                const item = document.createElement('div'); item.className = 'wheel-item';
                item.innerText = w.format ? w.format(i) : String(i).padStart(2, '0');
                sc.appendChild(item);
            }
            col.appendChild(sc); selectors.wheelContainer.appendChild(col);
            if (idx < options.wheels.length - 1 && options.separator) {
                const sep = document.createElement('span'); sep.className = 'wheel-separator'; sep.innerText = options.separator;
                selectors.wheelContainer.appendChild(sep);
            }
            state[idx] = w.init || w.min;
            setTimeout(() => { col.scrollTo({ top: Math.floor((state[idx] - w.min) / (w.step || 1)) * 44, behavior: 'auto' }); }, 50);
            col.onscroll = () => {
                const ci = Math.round(col.scrollTop / 44), val = w.min + (ci * (w.step || 1));
                if (val > w.max) return; state[idx] = val;
                sc.querySelectorAll('.wheel-item').forEach((it, i) => it.classList.toggle('selected', i === ci));
            };
        });
        document.getElementById('dt-cancel').onclick = () => selectors.dtPickerOverlay.style.display = 'none';
        document.getElementById('dt-done').onclick = () => { const vals = Object.values(state); callback(vals.length > 1 ? vals : vals[0]); selectors.dtPickerOverlay.style.display = 'none'; };
    }

    // =============================================
    // 🏠 Render
    // =============================================
    function render() {
        if (currentView === 'home') renderHome();
        else if (currentView === 'gallery') renderGallery();
        else if (currentView === 'graph') renderGraph();
        else if (currentView === 'calendar') renderCalendar();
        else if (currentView === 'settings') renderSettings();
        else if (currentView === 'capsules') renderCapsules();
    }

    function renderHome() {
        const dtTxt = document.getElementById('current-date-text');
        if (dtTxt) {
            const days = ['일', '월', '화', '수', '목', '금', '토'], isToday = new Date().toLocaleDateString() === selectedDate.toLocaleDateString();
            dtTxt.innerText = `${String(selectedDate.getMonth() + 1).padStart(2, '0')}월 ${String(selectedDate.getDate()).padStart(2, '0')}일 (${isToday ? '오늘' : days[selectedDate.getDay()]})`;
        }
        const timeline = document.getElementById('timeline');
        const ds = selectedDate.toLocaleDateString();
        let f = records.filter(r => new Date(r.timestamp).toLocaleDateString() === ds);
        if (searchQuery) f = records.filter(r => (r.title + r.description + r.notes + r.type).toLowerCase().includes(searchQuery));
        const sorted = [...f].sort((a, b) => b.timestamp - a.timestamp);

        if (sorted.length === 0) {
            const msg = searchQuery ? `"${searchQuery}" 검색 결과가 없어요.` : '아직 오늘의 기록이 없어요.';
            const sub = searchQuery ? '다른 검색어를 사용해보세요.' : '아래 + 버튼을 눌러<br>첫 기록을 남겨보세요!';
            timeline.innerHTML = `<div class="empty-state"><span class="empty-emoji">${searchQuery ? '🔍' : '📝'}</span><div class="empty-title">${msg}</div><div class="empty-sub">${sub}</div></div>`;
        } else {
            timeline.innerHTML = '';
            sorted.forEach(r => {
                const el = document.createElement('div'); el.className = `diary-item type-${r.type}`;
                el.innerHTML = `<div class="item-time">${getTimeStr(r.timestamp)}</div>
                    <div class="item-dot"></div>
                    <div class="item-content" onclick="window.editRec('${r.id}')">
                        <div class="item-main">
                            <div class="item-header-row"><h4>${r.title}</h4><div class="item-sub">${r.description || ''}</div></div>
                            ${r.notes ? `<div class="item-notes">${r.notes}</div>` : ''}
                            ${r.imageData ? `<img src="${r.imageData}" style="width:100%; border-radius:18px; margin-top:12px; display:block;">` : ''}
                        </div>
                    </div>`;
                timeline.appendChild(el);
            });
        }

        const feedML = f.filter(r => r.type === 'feed' && r.title === '분유').reduce((a, c) => a + (parseInt(c.description) || 0), 0);
        const feedG = f.filter(r => r.type === 'feed' && r.title !== '분유').reduce((a, c) => a + (parseInt(c.description) || 0), 0);
        const sleepSum = f.filter(r => r.type === 'sleep').reduce((a, c) => a + (c.dm || 0), 0);

        let feedStr = '';
        if (feedML > 0 && feedG > 0) feedStr = `${feedML}ml / ${feedG}g`;
        else if (feedML > 0) feedStr = `${feedML}ml`;
        else if (feedG > 0) feedStr = `${feedG}g`;
        else feedStr = '0ml';

        document.querySelector('#btn-feed .stat-val-small').innerText = feedStr;
        document.querySelector('#btn-diaper .stat-val-small').innerText = `${f.filter(r => r.type === 'diaper').length}회`;
        document.querySelector('#btn-sleep .stat-val-small').innerText = `${Math.floor(sleepSum / 60)}시간 ${sleepSum % 60}분`;
        document.querySelector('#btn-bath .stat-val-small').innerText = `${f.filter(r => r.type === 'bath').length}회`;
        const healthEl = document.querySelector('#btn-health .stat-val-small');
        const photoEl = document.querySelector('#btn-photo .stat-val-small');
        if (healthEl) healthEl.innerText = `${f.filter(r => r.type === 'health').length}회`;
        if (photoEl) photoEl.innerText = `${records.filter(r => r.type === 'photo' && r.imageData).length}개`;
    }

    window.editRec = (id) => { const r = records.find(x => x.id === id); if (r) window.openModal(r.type, id); };

    // =============================================
    // 📷 Gallery
    // =============================================
    function renderGallery() {
        const grid = document.getElementById('gallery-grid'); if (!grid) return;
        const photos = records.filter(r => r.imageData).sort((a, b) => b.timestamp - a.timestamp);
        if (!photos.length) {
            grid.innerHTML = `<div class="gallery-empty"><span class="empty-emoji">📷</span><div class="empty-title">사진이 없어요</div><div class="empty-sub">일기를 기록할 때 사진을 추가해보세요!</div></div>`;
            return;
        }
        grid.innerHTML = '';
        photos.forEach(r => {
            const item = document.createElement('div'); item.className = 'gallery-item'; item.onclick = () => window.editRec(r.id);
            const d = new Date(r.timestamp);
            item.innerHTML = `<img src="${r.imageData}" loading="lazy"><div class="item-badge">${d.getMonth() + 1}/${d.getDate()}</div>`;
            grid.appendChild(item);
        });
    }

    // =============================================
    // 📊 Growth Graph (Chart.js)
    // =============================================
    function renderGraph() {
        const sorted = [...growthData].sort((a, b) => a.timestamp - b.timestamp);
        const emptyState = document.getElementById('graph-empty-state');
        const wrapperH = document.getElementById('chart-wrapper-height');
        const wrapperW = document.getElementById('chart-wrapper-weight');
        const summaryCards = document.getElementById('growth-summary-cards');

        if (!sorted.length) {
            emptyState.style.display = 'block'; wrapperH.style.display = 'none'; wrapperW.style.display = 'none'; summaryCards.innerHTML = ''; return;
        }
        emptyState.style.display = 'none'; wrapperH.style.display = 'block'; wrapperW.style.display = 'block';

        const last = sorted[sorted.length - 1];
        const first = sorted[0];
        const diffDays = Math.floor((last.timestamp - first.timestamp) / 86400000);
        const heightGain = (last.height - first.height).toFixed(1);
        const weightGain = (last.weight - first.weight).toFixed(2);
        summaryCards.innerHTML = `
            <div class="growth-summary-card"><div class="gsc-label">📏 현재 키</div><div class="gsc-value">${last.height}<small>cm</small></div></div>
            <div class="growth-summary-card"><div class="gsc-label">⚖️ 현재 몸무게</div><div class="gsc-value">${last.weight}<small>kg</small></div></div>
            <div class="growth-summary-card"><div class="gsc-label">📈 키 성장</div><div class="gsc-value">+${heightGain}<small>cm</small></div></div>
            <div class="growth-summary-card"><div class="gsc-label">📈 몸무게 증가</div><div class="gsc-value">+${weightGain}<small>kg</small></div></div>`;

        const labels = sorted.map(x => { const d = new Date(x.timestamp); return `${d.getMonth() + 1}/${d.getDate()}`; });
        const chartColor = isDark ? '#f0f0f0' : '#333';
        const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
        const commonOpts = { responsive: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.parsed.y}` } } }, scales: { x: { ticks: { color: chartColor, font: { weight: '700', size: 11 } }, grid: { color: gridColor } }, y: { ticks: { color: chartColor, font: { weight: '700', size: 11 } }, grid: { color: gridColor } } } };

        const ctxH = document.getElementById('growthChartHeight')?.getContext('2d');
        if (ctxH) {
            if (chartH) chartH.destroy();
            chartH = new Chart(ctxH, { type: 'line', data: { labels, datasets: [{ data: sorted.map(x => x.height), borderColor: '#ff9a8b', backgroundColor: 'rgba(255,154,139,0.12)', fill: true, tension: 0.4, pointBackgroundColor: '#ff9a8b', pointRadius: 5, pointHoverRadius: 7 }] }, options: commonOpts });
        }
        const ctxW = document.getElementById('growthChartWeight')?.getContext('2d');
        if (ctxW) {
            if (chartW) chartW.destroy();
            chartW = new Chart(ctxW, { type: 'line', data: { labels, datasets: [{ data: sorted.map(x => x.weight), borderColor: '#1e88e5', backgroundColor: 'rgba(30,136,229,0.08)', fill: true, tension: 0.4, pointBackgroundColor: '#1e88e5', pointRadius: 5, pointHoverRadius: 7 }] }, options: commonOpts });
        }
    }

    // =============================================
    // 📅 Calendar (기록 도트 포함)
    // =============================================
    function renderCalendar() {
        const c = document.getElementById('inline-calendar'); if (!c) return;
        const y = selectedDate.getFullYear(), m = selectedDate.getMonth();
        const fd = new Date(y, m, 1).getDay(), ld = new Date(y, m + 1, 0).getDate();
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const todayStr = new Date().toLocaleDateString();

        let h = `<div class="cal-header"><button class="cal-nav-btn" id="cp"><i class="fas fa-chevron-left"></i></button><h3>${y}년 ${m + 1}월</h3><button class="cal-nav-btn" id="cn"><i class="fas fa-chevron-right"></i></button></div>`;
        h += `<div class="cal-grid">`;
        days.forEach(d => { h += `<div class="cal-day-label">${d}</div>`; });
        for (let i = 0; i < fd; i++) h += `<div style="background:transparent;"></div>`;
        for (let d = 1; d <= ld; d++) {
            const dk = new Date(y, m, d).toLocaleDateString();
            const active = selectedDate.toLocaleDateString() === dk;
            const isToday = dk === todayStr;
            const hasRec = records.some(r => new Date(r.timestamp).toLocaleDateString() === dk);
            h += `<div onclick="window.sd(${y},${m},${d})" class="cal-day${active ? ' active' : ''}${isToday && !active ? ' today' : ''}">${d}${hasRec ? '<span class="has-dot"></span>' : ''}</div>`;
        }
        h += `</div>`;
        c.innerHTML = h;
        document.getElementById('cp').onclick = () => { selectedDate.setMonth(m - 1); renderCalendar(); };
        document.getElementById('cn').onclick = () => { selectedDate.setMonth(m + 1); renderCalendar(); };
    }
    window.sd = (y, m, d) => { selectedDate = new Date(y, m, d); switchView('home'); };

    // =============================================
    // ⚙️ Settings
    // =============================================
    function renderSettings() {
        const fill = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        fill('sum-time', profile.birthTime || '-');
        fill('sum-blood', profile.bloodType || '-');
        fill('sum-weight', profile.birthWeight ? `${profile.birthWeight}kg` : '-');
        fill('sum-height', profile.birthHeight ? `${profile.birthHeight}cm` : '-');

        const si = document.querySelector('.storage-info-text');
        if (si) {
            const bytes = (JSON.stringify(records).length + JSON.stringify(growthData).length + JSON.stringify(profile).length) * 2;
            const mb = (bytes / 1024 / 1024).toFixed(2);
            si.innerText = `사용 중: ${mb}MB / 약 500MB (${((mb / 500) * 100).toFixed(2)}%)`;
            si.style.color = '#43a047';
        }

        document.getElementById('set-sync').onclick = () => {
            const fid = prompt('가족 공유 ID를 입력해 주세요. (같은 ID를 쓰면 데이터가 공유됩니다)', familyId || '');
            if (fid) { setupSync(fid); showToast('가족 공유가 설정되었어요! 💑', 'success'); }
        };

        const btnCapsule = document.getElementById('btn-capsule-link');
        if (btnCapsule) btnCapsule.onclick = () => switchView('capsules');

        // 👤 프로필 편집 - 예쁜 모달
        document.getElementById('set-profile').onclick = () => openProfileModal();

        document.getElementById('set-backup').onclick = () => {
            const data = { records, growthData, profile, capsules, exportDate: new Date().toISOString() };
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
            a.download = `eunu_diary_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            showToast('백업 파일이 저장되었어요! 📂', 'success');
        };

        const restoreInput = document.getElementById('restore-file-input');
        document.getElementById('set-restore').onclick = () => restoreInput.click();
        restoreInput.onchange = e => {
            const file = e.target.files[0]; if (!file) return;
            const r = new FileReader();
            r.onload = async ev => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (!confirm(`백업 날짜: ${data.exportDate?.split('T')[0] || '알 수 없음'}\n기록 복원을 시작할까요?\n현재 데이터와 병합됩니다.`)) return;
                    records = mergeRecords(records, data.records || []);
                    capsules = mergeRecords(capsules, data.capsules || []);
                    if (data.growthData?.length) growthData = [...growthData, ...data.growthData].filter((v, i, a) => a.findIndex(x => x.timestamp === v.timestamp) === i);
                    if (data.profile) profile = { ...profile, ...data.profile };
                    await saveAll(); render(); updateHeader();
                    showToast('데이터가 성공적으로 복원되었어요! ✅', 'success');
                } catch (err) { showToast('파일 형식이 올바르지 않아요.', 'error'); }
            };
            r.readAsText(file); restoreInput.value = '';
        };

        document.getElementById('set-reset').onclick = () => {
            if (confirm('모든 데이터를 삭제할까요? 되돌릴 수 없습니다.')) {
                records = []; growthData = []; capsules = []; saveAll(); render(); updateHeader();
                showToast('모든 기록이 삭제되었어요.', 'warning');
            }
        };
    }

    window.renderCapsules = () => {
        const main = selectors.capsules;
        // 디자인 일관성을 위해 h2와 btn-premium 적용, content-inner로 감싸기
        let html = `<div class="view-header">
            <h2>미래로 보내는 타임캡슐</h2>
            <button class="btn-premium" onclick="openCapsuleModal()">
                <i class="fas fa-plus"></i> 기록하기
            </button>
        </div>
        <div class="content-inner">
            <div class="capsule-intro">
                아기에게 전하고 싶은 현재의 마음을 기록해보세요.<br>설정한 날짜가 되기 전까지는 열어볼 수 없습니다. ✨
            </div>
            <div class="capsule-list">`;

        if (capsules.length === 0) {
            html += `<div class="empty-state" style="margin-top:40px;"><i class="fas fa-lock" style="font-size:3rem;color:#eee;margin-bottom:15px;"></i><p>아직 저장된 타임캡슐이 없습니다.</p></div>`;
        } else {
            const now = Date.now();
            [...capsules].sort((a, b) => b.createdDate - a.createdDate).forEach(c => {
                const isUnlocked = now >= c.unlockDate;
                const dday = Math.ceil((c.unlockDate - now) / 86400000);
                html += `
                <div class="capsule-card ${isUnlocked ? 'unlocked' : 'locked'}" onclick="${isUnlocked ? `viewCapsule('${c.id}')` : `showToast('아직 열어볼 수 없습니다. D-${dday}일 남았어요!', 'info')`}">
                    <div class="capsule-status">
                        <i class="fas ${isUnlocked ? 'fa-lock-open' : 'fa-lock'}"></i>
                        <span>${isUnlocked ? '개봉됨' : `D-${dday}`}</span>
                    </div>
                    <div class="capsule-info">
                        <strong>${isUnlocked ? (c.message.length > 20 ? c.message.substring(0, 20) + '...' : c.message) : '비밀 메시지가 숨겨져 있습니다'}</strong>
                        <small>${new Date(c.createdDate).toLocaleDateString()} 작성</small>
                    </div>
                </div>`;
            });
        }

        html += `</div></div>`;
        main.innerHTML = html;
        window.scrollTo(0, 0);
    };

    window.openCapsuleModal = () => {
        selectors.modalOverlay.style.display = 'flex';
        let selImg = null, unlockDate = Date.now() + (365 * 86400000); // 기본 1년 뒤
        selectors.modalBody.innerHTML = `
            <div class="modal-header-row"><h3>타임캡슐 작성</h3><i class="fas fa-times close-icon" onclick="window.closeModal()"></i></div>
            <div id="cap-img-b" class="capsule-modal-preview"><i class="fas fa-camera"></i><input type="file" id="cap-fi" style="display:none" accept="image/*"></div>
            <div class="profile-field"><label>언제 열어볼까요? (개봉 날짜)</label><input id="cap-unlock" type="date" value="${new Date(unlockDate).toISOString().split('T')[0]}"></div>
            <div class="note-container" style="margin-top:20px;min-height:150px;"><textarea id="cap-msg" placeholder="미래의 아기에게 남길 메시지를 적어주세요..."></textarea></div>
            <div class="modal-footer"><button class="btn btn-cancel" onclick="window.closeModal()">취소</button><button class="btn btn-save" id="save-capsule">캡슐 봉인하기</button></div>`;

        const im = document.getElementById('cap-img-b'), fi = document.getElementById('cap-fi');
        im.onclick = () => fi.click();
        fi.onchange = e => {
            const f = e.target.files[0]; if (!f) return;
            im.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            const r = new FileReader();
            r.onload = ev => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'), MAX = 800; let w = img.width, h = img.height; if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); selImg = c.toDataURL('image/jpeg', 0.82); im.innerHTML = `<img src="${selImg}">`; }; img.src = ev.target.result; };
            r.readAsDataURL(f);
        };

        document.getElementById('save-capsule').onclick = async () => {
            const msg = document.getElementById('cap-msg').value;
            const unlockVal = document.getElementById('cap-unlock').value;
            if (!msg) { window.showToast('메시지를 입력해주세요.', 'error'); return; }
            if (!unlockVal) { window.showToast('개봉 날짜를 선택해주세요.', 'error'); return; }
            const unlock = new Date(unlockVal + 'T00:00:00').getTime();
            capsules.push({ id: 'cap_' + Date.now(), message: msg, imageData: selImg, unlockDate: unlock, createdDate: Date.now() });
            await saveAll(); renderCapsules(); window.closeModal();
            window.showToast('타임캡슐이 안전하게 봉인되었어요! 🔒', 'success');
        };
    };

    window.viewCapsule = (id) => {
        const c = capsules.find(x => x.id === id);
        if (!c) return;
        selectors.modalOverlay.style.display = 'flex';
        selectors.modalBody.innerHTML = `
            <div class="modal-header-row"><h3>타임캡슐 개봉</h3><i class="fas fa-times close-icon" onclick="window.closeModal()"></i></div>
            ${c.imageData ? `<div class="capsule-modal-preview" style="border:none;"><img src="${c.imageData}"></div>` : ''}
            <div class="note-container" style="background:transparent;border:none;padding:0;min-height:auto;"><p style="white-space:pre-wrap;line-height:1.6;font-size:1.1rem;color:var(--text-main);">${c.message}</p></div>
            <div style="margin-top:20px;font-size:0.85rem;color:var(--text-sub);text-align:right;">작성일: ${new Date(c.createdDate).toLocaleDateString()}</div>
            <div class="modal-footer"><button class="btn btn-cancel" onclick="delCapsule('${id}')">캡슐 삭제</button><button class="btn btn-save" onclick="window.closeModal()">닫기</button></div>`;
    };

    window.delCapsule = async (id) => {
        if (confirm('이 타임캡슐을 영구 폐기할까요?')) {
            capsules = capsules.filter(x => x.id !== id);
            await saveAll(); renderCapsules(); window.closeModal();
            showToast('타임캡슐이 삭제되었어요.', 'warning');
        }
    };

    // 👤 프로필 모달 (예쁜 폼 UI)
    function openProfileModal() {
        selectors.modalOverlay.style.display = 'flex';
        selectors.modalBody.innerHTML = `
            <div class="modal-header-row"><h3>프로필 편집</h3><i class="fas fa-times close-icon" onclick="window.closeModal()"></i></div>
            <div class="profile-form">
                <div class="profile-field"><label>아이 이름</label><input id="pf-name" type="text" value="${profile.name || ''}"></div>
                <div class="profile-field"><label>태어난 날짜</label><input id="pf-birth" type="date" value="${profile.birthdate || ''}"></div>
                <div class="profile-field"><label>태어난 시간 (예: 14:30)</label><input id="pf-time" type="time" value="${profile.birthTime || ''}"></div>
                <div class="profile-field"><label>혈액형</label><input id="pf-blood" type="text" placeholder="예: A형, B형, O형, AB형" value="${profile.bloodType || ''}"></div>
                <div class="profile-field"><label>출생 체중 (kg)</label><input id="pf-weight" type="number" step="0.01" value="${profile.birthWeight || ''}"></div>
                <div class="profile-field"><label>출생 키 (cm)</label><input id="pf-height" type="number" step="0.1" value="${profile.birthHeight || ''}"></div>
            </div>
            <div class="modal-footer"><button class="btn btn-cancel" onclick="window.closeModal()">취소</button><button class="btn btn-save" id="save-profile">저장</button></div>`;
        document.getElementById('save-profile').onclick = () => {
            profile.name = document.getElementById('pf-name').value || profile.name;
            profile.birthdate = document.getElementById('pf-birth').value || profile.birthdate;
            profile.birthTime = document.getElementById('pf-time').value || profile.birthTime;
            profile.bloodType = document.getElementById('pf-blood').value || profile.bloodType;
            profile.birthWeight = document.getElementById('pf-weight').value || profile.birthWeight;
            profile.birthHeight = document.getElementById('pf-height').value || profile.birthHeight;
            saveAll(); updateHeader(); render(); window.closeModal();
            showToast('프로필이 저장되었어요! 👶', 'success');
        };
    }

    // =============================================
    // 📋 Record Modal
    // =============================================
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

        const refreshDtLabel = () => { const el = document.getElementById('modal-dt-disp'); if (el) el.innerHTML = `<i class="far fa-calendar-alt"></i> ${getFullDtStr(curDt.getTime())} <i class="fas fa-chevron-down"></i>`; };
        const updateSleepDisp = () => {
            const sEl = document.getElementById('sleep-start-disp'), eEl = document.getElementById('sleep-end-disp'), diffEl = document.getElementById('v-sleep-diff');
            if (sEl) sEl.innerText = getTimeStr(sleepStart); if (eEl) eEl.innerText = getTimeStr(sleepEnd);
            let dm = sleepEnd - sleepStart; if (dm < 0) dm += 86400000; dm = Math.floor(dm / 60000);
            if (diffEl) diffEl.innerText = `${Math.floor(dm / 60)}시간 ${dm % 60}분`;
        };
        const updateValDisp = () => {
            const el = document.getElementById('v-val-main'), lbl = document.querySelector('#v-val-trigger span');
            if (!el || !lbl) return;
            if (type === 'health') { if (selTitle === '투약') { lbl.innerText = '투약 용량'; el.innerHTML = `${valAmount}<small>ml</small>`; } else { lbl.innerText = '현재 측정값'; el.innerHTML = `${valAmount}.${valDecimal}<small>°C</small>`; } }
            else if (type === 'feed') {
                const unit = selTitle === '분유' ? 'ml' : 'g';
                el.innerHTML = `${valAmount}<small>${unit}</small>`;
            }
        };

        const typeLabel = { feed: '식사', diaper: '배변', sleep: '수면', bath: '목욕', health: '건강', photo: '일기' };
        const hdr = `<div class="modal-header-row"><h3>${typeLabel[type] || '추가하기'}</h3><i class="fas fa-times close-icon" onclick="window.closeModal()"></i></div><div class="modal-date-picker" id="modal-dt-disp" ${type === 'quick' ? 'style="display:none"' : ''}></div>`;

        if (type === 'quick') {
            html = `<div class="modal-header-row"><h3>기록 추가</h3><i class="fas fa-times close-icon" onclick="window.closeModal()"></i></div>
            <div class="quick-add-grid">
                <div class="quick-add-item" onclick="window.openModal('feed')"><div class="circle" style="background:#fff8e1;color:#ffa000;"><i class="fas fa-pizza-slice"></i></div><label>식사</label></div>
                <div class="quick-add-item" onclick="window.openModal('diaper')"><div class="circle" style="background:#efebe9;color:#8d6e63;"><i class="fas fa-baby"></i></div><label>배변</label></div>
                <div class="quick-add-item" onclick="window.openModal('sleep')"><div class="circle" style="background:#e0f7fa;color:#00acc1;"><i class="fas fa-moon"></i></div><label>수면</label></div>
                <div class="quick-add-item" onclick="window.openModal('bath')"><div class="circle" style="background:#f9fbe7;color:#afb42b;"><i class="fas fa-bath"></i></div><label>목욕</label></div>
                <div class="quick-add-item" onclick="window.openModal('health')"><div class="circle" style="background:#e1f5fe;color:#0288d1;"><i class="fas fa-thermometer-half"></i></div><label>건강</label></div>
                <div class="quick-add-item" onclick="window.openModal('photo')"><div class="circle" style="background:#f3e5f5;color:#8e24aa;"><i class="fas fa-camera-retro"></i></div><label>일기</label></div>
            </div>`;
        } else {
            switch (type) {
                case 'feed':
                    selTitle = rec ? rec.title : '분유';
                    valAmount = rec ? parseInt(rec.description) : 120;
                    html = `${hdr}<div class="selection-grid">
                        <div class="selection-item ${selTitle === '분유' ? 'active' : ''}" data-val="f3"><div class="circle"><i class="fas fa-baby-carriage"></i></div><label>분유</label></div>
                        <div class="selection-item ${selTitle === '식사' ? 'active' : ''}" data-val="f1"><div class="circle"><i class="fas fa-utensils"></i></div><label>식사</label></div>
                        <div class="selection-item ${selTitle === '간식' ? 'active' : ''}" data-val="f2"><div class="circle"><i class="fas fa-cookie"></i></div><label>간식</label></div>
                    </div><div class="trigger-box" id="v-val-trigger"><span>섭취량</span><strong id="v-val-main">${valAmount}<small>ml</small></strong></div>
                    <div class="note-container"><textarea id="v-nt" placeholder="메모를 입력하세요">${rec ? rec.notes || '' : ''}</textarea></div>`; break;
                case 'diaper':
                    selTitle = rec ? rec.title : '소변';
                    html = `${hdr}<div class="selection-grid">
                        <div class="selection-item ${selTitle === '소변' ? 'active' : ''}" data-val="d1"><div class="circle"><i class="fas fa-tint"></i></div><label>소변</label></div>
                        <div class="selection-item ${selTitle === '대변' ? 'active' : ''}" data-val="d2"><div class="circle"><i class="fas fa-poop"></i></div><label>대변</label></div>
                    </div><div class="note-container" style="margin-top:20px;"><textarea id="v-nt" placeholder="기록할 내용이 있나요?">${rec ? rec.notes || '' : ''}</textarea></div>`; break;
                case 'health':
                    selTitle = rec ? rec.title : '체온';
                    html = `${hdr}<div class="selection-grid">
                        <div class="selection-item ${selTitle === '체온' ? 'active' : ''}" data-val="h1"><div class="circle"><i class="fas fa-thermometer-half"></i></div><label>체온</label></div>
                        <div class="selection-item ${selTitle === '투약' ? 'active' : ''}" data-val="h2"><div class="circle"><i class="fas fa-pills"></i></div><label>투약</label></div>
                    </div><div class="trigger-box" id="v-val-trigger"><span>현재 측정값</span><strong id="v-val-main">36.5<small>°C</small></strong></div>
                    <div class="note-container"><textarea id="v-nt" placeholder="증상 등을 입력하세요">${rec ? rec.notes || '' : ''}</textarea></div>`; break;
                case 'sleep':
                    html = `${hdr}<div class="trigger-box" style="background:#f0fafe;border-color:#e1f5fe;"><span>총 수면시간</span><strong id="v-sleep-diff" style="color:#00acc1;">?시간 ?분</strong></div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px;">
                        <div class="trigger-box" id="sleep-start-trigger" style="padding:20px;margin-bottom:0;"><span>시작 시간</span><strong style="font-size:1.5rem;" id="sleep-start-disp">${getTimeStr(sleepStart)}</strong></div>
                        <div class="trigger-box" id="sleep-end-trigger" style="padding:20px;margin-bottom:0;"><span>종료 시간</span><strong style="font-size:1.5rem;" id="sleep-end-disp">${getTimeStr(sleepEnd)}</strong></div>
                    </div><div class="note-container"><textarea id="v-nt" placeholder="메모...">${rec ? rec.notes || '' : ''}</textarea></div>`;
                    selTitle = '수면'; break;
                case 'bath':
                    selTitle = '목욕';
                    html = `${hdr}<div class="selection-grid"><div class="selection-item active"><div class="circle"><i class="fas fa-bath"></i></div><label>목욕</label></div></div>
                    <div class="note-container"><textarea id="v-nt" placeholder="메모">${rec ? rec.notes || '' : ''}</textarea></div>`; break;
                case 'photo':
                    selImg = rec ? rec.imageData : null;
                    html = `${hdr}<div id="img-b" style="width:100%;height:190px;background:var(--input-bg);border:2px dashed var(--border);border-radius:22px;display:flex;justify-content:center;align-items:center;overflow:hidden;cursor:pointer;">${selImg ? `<img src="${selImg}" style="height:100%;">` : '<i class="fas fa-camera" style="font-size:3rem;color:#ccc;"></i>'}<input type="file" id="fi-i" style="display:none" accept="image/*"></div>
                    <div class="note-container" style="margin-top:22px;"><textarea id="v-nt" placeholder="오늘의 일기...">${rec ? rec.notes || '' : ''}</textarea></div>`;
                    selTitle = '하루일기'; break;
            }
        }

        const footer = `<div class="modal-footer">${rid ? `<button class="btn btn-cancel" onclick="window.delMod('${rid}')">기록삭제</button>` : ''}<button class="btn btn-save" id="save-final">${rid ? '수정완료' : '기록저장'}</button></div>`;
        selectors.modalBody.innerHTML = html + footer;
        refreshDtLabel();
        if (type === 'sleep') updateSleepDisp();
        if (type === 'feed' || type === 'health') updateValDisp();

        document.getElementById('modal-dt-disp').onclick = () => openUniversalPicker({ wheels: [{ min: 0, max: 23, init: curDt.getHours() }, { min: 0, max: 59, init: curDt.getMinutes() }], separator: ':' }, res => { curDt.setHours(res[0], res[1]); refreshDtLabel(); });
        if (type === 'feed') document.getElementById('v-val-trigger').onclick = () => {
            const unit = selTitle === '분유' ? 'ml' : 'g';
            openUniversalPicker({ wheels: [{ min: 0, max: 500, step: 5, init: valAmount, format: v => `${v} ${unit}` }] }, res => { valAmount = res; updateValDisp(); });
        };
        if (type === 'health') document.getElementById('v-val-trigger').onclick = () => {
            if (selTitle === '투약') openUniversalPicker({ wheels: [{ min: 1, max: 50, init: valAmount, format: v => `${v} ml` }] }, res => { valAmount = res; updateValDisp(); });
            else openUniversalPicker({ wheels: [{ min: 34, max: 42, init: valAmount }, { min: 0, max: 9, init: valDecimal, format: v => `.${v}` }], separator: '' }, res => { valAmount = res[0]; valDecimal = res[1]; updateValDisp(); });
        };
        if (type === 'sleep') {
            document.getElementById('sleep-start-trigger').onclick = () => openUniversalPicker({ wheels: [{ min: 0, max: 23, init: sleepStart.getHours() }, { min: 0, max: 59, init: sleepStart.getMinutes() }], separator: ':' }, res => { sleepStart.setHours(res[0], res[1]); updateSleepDisp(); });
            document.getElementById('sleep-end-trigger').onclick = () => openUniversalPicker({ wheels: [{ min: 0, max: 23, init: sleepEnd.getHours() }, { min: 0, max: 59, init: sleepEnd.getMinutes() }], separator: ':' }, res => { sleepEnd.setHours(res[0], res[1]); updateSleepDisp(); });
        }
        document.querySelectorAll('.selection-item').forEach(i => i.onclick = () => {
            document.querySelectorAll('.selection-item').forEach(x => x.classList.remove('active')); i.classList.add('active'); selTitle = i.querySelector('label').innerText;
            if (type === 'health') { if (selTitle === '투약' && valAmount > 50) valAmount = 5; else if (selTitle === '체온' && valAmount < 30) valAmount = 36; updateValDisp(); }
            if (type === 'feed') updateValDisp();
        });
        const im = document.getElementById('img-b'), fi = document.getElementById('fi-i');
        if (im) im.onclick = () => fi.click();
        if (fi) fi.onchange = e => {
            const f = e.target.files[0]; if (!f) return;
            im.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:3rem;color:var(--primary);"></i>';
            const r = new FileReader();
            r.onload = ev => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'), MAX = 640; let w = img.width, h = img.height; if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); selImg = c.toDataURL('image/jpeg', 0.75); im.innerHTML = `<img src="${selImg}" style="height:100%;">`; }; img.src = ev.target.result; };
            r.readAsDataURL(f);
        };

        document.getElementById('save-final').onclick = async () => {
            const btn = document.getElementById('save-final'); btn.disabled = true; btn.innerText = '저장 중...';
            try {
                const res = { type, title: selTitle, timestamp: curDt.getTime(), notes: document.getElementById('v-nt')?.value || '', imageData: selImg };
                if (type === 'feed') {
                    const unit = selTitle === '분유' ? 'ml' : 'g';
                    res.description = `${valAmount}${unit}`;
                }
                else if (type === 'health') res.description = selTitle === '투약' ? `${valAmount}ml` : `${valAmount}.${valDecimal}°C`;
                else if (type === 'sleep') {
                    let dm = sleepEnd - sleepStart; let ae = new Date(sleepEnd);
                    if (dm < 0) { dm += 86400000; ae = new Date(sleepEnd.getTime() + 86400000); }
                    dm = Math.floor(dm / 60000); res.description = `${Math.floor(dm / 60)}시간 ${dm % 60}분`; res.dm = dm; res.timestamp = ae.getTime();
                }
                else if (type === 'diaper') res.description = '기저귀 교체';
                else res.description = '기록 완료';

                if (rid) { const ix = records.findIndex(x => x.id === rid); records[ix] = { ...records[ix], ...res }; }
                else { records.push({ id: 'rec_' + Math.random().toString(36).substr(2, 9), ...res }); }
                await saveAll(); render(); updateHeader(); window.closeModal();
                showToast(rid ? '기록이 수정되었어요! ✏️' : '기록이 저장되었어요! 🎉', 'success');
            } catch (err) { console.error(err); showToast('저장 중 오류가 발생했어요.', 'error'); btn.disabled = false; btn.innerText = rid ? '수정완료' : '기록저장'; }
        };
    };

    window.closeModal = () => selectors.modalOverlay.style.display = 'none';
    window.delMod = async (rid) => {
        if (confirm('이 기록을 삭제하시겠습니까?')) {
            records = records.filter(r => r.id !== rid);
            await saveAll(); render(); updateHeader(); window.closeModal();
            showToast('기록이 삭제되었어요.', 'warning');
        }
    };
    selectors.modalOverlay.onclick = e => { if (e.target === selectors.modalOverlay) window.closeModal(); };

    // =============================================
    // 📏 Growth Modal
    // =============================================
    window.openGrowthModal = () => {
        selectors.modalOverlay.style.display = 'flex';
        let hVal = 50, wVal = 3.5;
        const last = growthData.length ? growthData[growthData.length - 1] : null;
        if (last) { hVal = last.height; wVal = last.weight; }
        selectors.modalBody.innerHTML = `
            <div class="modal-header-row"><h3>성장 기록 추가</h3><i class="fas fa-times close-icon" onclick="window.closeModal()"></i></div>
            <div class="trigger-box" id="v-height-trigger"><span>현재 키</span><strong id="v-height-main">${hVal.toFixed(1)}<small>cm</small></strong></div>
            <div class="trigger-box" id="v-weight-trigger"><span>현재 몸무게</span><strong id="v-weight-main">${wVal.toFixed(2)}<small>kg</small></strong></div>
            <div class="modal-footer"><button class="btn btn-cancel" onclick="window.closeModal()">취소</button><button class="btn btn-save" id="save-growth">성장 기록 저장</button></div>`;
        const upd = () => { document.getElementById('v-height-main').innerHTML = `${hVal.toFixed(1)}<small>cm</small>`; document.getElementById('v-weight-main').innerHTML = `${wVal.toFixed(2)}<small>kg</small>`; };
        document.getElementById('v-height-trigger').onclick = () => openUniversalPicker({ wheels: [{ min: 30, max: 120, init: Math.floor(hVal) }, { min: 0, max: 9, init: Math.round((hVal % 1) * 10), format: v => `.${v}` }], separator: '' }, res => { hVal = res[0] + (res[1] / 10); upd(); });
        document.getElementById('v-weight-trigger').onclick = () => openUniversalPicker({ wheels: [{ min: 2, max: 30, init: Math.floor(wVal) }, { min: 0, max: 95, step: 5, init: Math.round((wVal % 1) * 100), format: v => `.${String(v).padStart(2, '0')}` }], separator: '' }, res => { wVal = res[0] + (res[1] / 100); upd(); });
        document.getElementById('save-growth').onclick = async () => { growthData.push({ timestamp: Date.now(), height: hVal, weight: wVal }); await saveAll(); render(); window.closeModal(); showToast('성장 기록이 저장되었어요! 📏', 'success'); };
    };

    // Event bindings (stat cards, add btn)
    ['feed', 'diaper', 'sleep', 'bath', 'health', 'photo'].forEach(t => { const b = document.getElementById(`btn-${t}`); if (b) b.onclick = () => window.openModal(t); });
    document.getElementById('global-add-btn').onclick = () => window.openModal('quick');
    bc.onclick = () => switchView('capsules');

    // Final Initialization
    (async () => {
        try {
            await loadAll();
            switchView('home');
            console.log('초기 데이터 로드 및 홈 화면 렌더링 완료');
        } catch (e) {
            console.error('초기 로드 중 치명적 오류:', e);
            showToast('앱 초기화 중 문제가 발생했습니다.', 'error');
        }
    })();
});
