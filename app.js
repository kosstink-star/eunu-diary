document.addEventListener('DOMContentLoaded', () => {
    console.log('육아 다이어리 앱 v2 로드 완료');

    // --- State & Storage ---
    let records = JSON.parse(localStorage.getItem('babyRecords')) || [];
    let growthData = JSON.parse(localStorage.getItem('babyGrowth')) || [];
    let profile = JSON.parse(localStorage.getItem('babyProfile')) || { name: '우리은우' };

    let currentView = 'home';
    let chart = null;

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

    function addRecord(type, content, timestamp = new Date().getTime()) {
        records.push({ type, content, timestamp });
        saveAll();
        render();
    }

    function getTimeString(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    function getTimeAgo(timestamp) {
        if (!timestamp) return "기록 없음";
        const diffMs = new Date().getTime() - timestamp;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return "방금 전";
        if (diffMins < 60) return `${diffMins}분 전`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}시간 전`;
        return `${Math.floor(diffHours / 24)}일 전`;
    }

    // --- Navigation ---
    function switchView(viewName) {
        Object.keys(views).forEach(key => {
            views[key].style.display = (key === viewName) ? 'block' : 'none';
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
        appTitle.innerText = `${profile.name}의 성장일기 ✨`;

        if (currentView === 'home') {
            renderHome();
        } else if (currentView === 'graph') {
            renderGraph();
        } else if (currentView === 'calendar') {
            renderCalendar();
        } else if (currentView === 'settings') {
            renderSettings();
        }
    }

    function renderHome() {
        const timeline = document.getElementById('timeline');
        const sortedRecords = [...records].sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);
        timeline.innerHTML = '';
        sortedRecords.forEach(record => {
            const item = document.createElement('div');
            item.className = 'diary-item';
            item.innerHTML = `
                <span class="time">${getTimeString(record.timestamp)}</span>
                <div class="content">${record.content}</div>
            `;
            timeline.appendChild(item);
        });

        const types = { 'feed': '식사', 'sleep': '수면', 'diaper': '기저귀', 'photo': '사진첩' };
        Object.keys(types).forEach(type => {
            const card = document.getElementById(`btn-${type}`);
            const statValue = card.querySelector('.stat-value');
            if (type === 'photo') {
                const count = records.filter(r => r.type === 'photo').length;
                statValue.innerText = `${count}장의 사진`;
            } else {
                const last = records.filter(r => r.type === type).sort((a, b) => b.timestamp - a.timestamp)[0];
                statValue.innerText = getTimeAgo(last?.timestamp);
            }
        });
    }

    // --- Graph Logic ---
    function renderGraph() {
        const ctx = document.getElementById('growthChart').getContext('2d');
        const lastH = document.getElementById('last-height');
        const lastW = document.getElementById('last-weight');

        const sortedGrowth = [...growthData].sort((a, b) => a.timestamp - b.timestamp);

        if (sortedGrowth.length > 0) {
            const latest = sortedGrowth[sortedGrowth.length - 1];
            lastH.innerText = `${latest.height} cm`;
            lastW.innerText = `${latest.weight} kg`;
        }

        if (chart) chart.destroy();

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedGrowth.map(d => new Date(d.timestamp).toLocaleDateString()),
                datasets: [
                    {
                        label: '키 (cm)',
                        data: sortedGrowth.map(d => d.height),
                        borderColor: '#ff9a8b',
                        tension: 0.3,
                        yAxisID: 'y'
                    },
                    {
                        label: '몸무게 (kg)',
                        data: sortedGrowth.map(d => d.weight),
                        borderColor: '#ff6b6b',
                        tension: 0.3,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: { type: 'linear', position: 'left' },
                    y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false } }
                }
            }
        });
    }

    // --- Calendar Logic ---
    let calendarDate = new Date();
    function renderCalendar() {
        const container = document.getElementById('calendar-container');
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();

        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();

        let html = `
            <div class="calendar-header">
                <span id="cal-prev" style="cursor:pointer">&lt;</span>
                <span>${year}년 ${month + 1}월</span>
                <span id="cal-next" style="cursor:pointer">&gt;</span>
            </div>
            <div class="calendar-grid">
                <div class="calendar-day-header">일</div><div class="calendar-day-header">월</div>
                <div class="calendar-day-header">화</div><div class="calendar-day-header">수</div>
                <div class="calendar-day-header">목</div><div class="calendar-day-header">금</div>
                <div class="calendar-day-header">토</div>
        `;

        for (let i = 0; i < firstDay; i++) html += '<div></div>';

        for (let d = 1; d <= lastDate; d++) {
            const dateStr = `${year}-${month + 1}-${d}`;
            const hasRecord = records.some(r => new Date(r.timestamp).toLocaleDateString() === new Date(year, month, d).toLocaleDateString());
            const isToday = new Date().toLocaleDateString() === new Date(year, month, d).toLocaleDateString();
            html += `<div class="calendar-day ${isToday ? 'today' : ''} ${hasRecord ? 'has-record' : ''}" data-date="${dateStr}">${d}</div>`;
        }

        html += '</div>';
        container.innerHTML = html;

        document.getElementById('cal-prev').onclick = () => { calendarDate.setMonth(month - 1); renderCalendar(); };
        document.getElementById('cal-next').onclick = () => { calendarDate.setMonth(month + 1); renderCalendar(); };

        document.querySelectorAll('.calendar-day').forEach(el => {
            el.onclick = () => {
                document.querySelectorAll('.calendar-day').forEach(e => e.classList.remove('active'));
                el.classList.add('active');
                showDayDetails(el.dataset.date);
            };
        });
    }

    function showDayDetails(dateStr) {
        const [y, m, d] = dateStr.split('-');
        const targetDate = new Date(y, m - 1, d).toLocaleDateString();
        const dayRecords = records.filter(r => new Date(r.timestamp).toLocaleDateString() === targetDate);

        document.getElementById('selected-date-label').innerText = `${y}년 ${m}월 ${d}일 기록`;
        const dayTimeline = document.getElementById('day-timeline');
        dayTimeline.innerHTML = dayRecords.length ? '' : '<p style="font-size:0.8rem; color:#aaa">기록이 없습니다.</p>';

        dayRecords.sort((a, b) => b.timestamp - a.timestamp).forEach(r => {
            const item = document.createElement('div');
            item.className = 'diary-item';
            item.innerHTML = `<span class="time">${getTimeString(r.timestamp)}</span><div class="content">${r.content}</div>`;
            dayTimeline.appendChild(item);
        });
    }

    // --- Modal Logic ---
    function openModal(type) {
        modalOverlay.style.display = 'flex';
        let content = '';
        switch (type) {
            case 'feed':
                modalTitle.innerText = '식사 기록';
                content = `<div class="form-group"><label>종류</label><select id="input-sub-type"><option value="식사">식사</option><option value="간식">간식</option></select></div>
                           <div class="form-group"><label>양 (ml/g)</label><input type="number" id="input-amount" value="120"></div>
                           <button class="submit-btn" id="save-btn">저장하기</button>`;
                break;
            case 'growth':
                modalTitle.innerText = '성장 기록';
                content = `<div class="form-group"><label>키 (cm)</label><input type="number" step="0.1" id="input-height" placeholder="예: 75.5"></div>
                           <div class="form-group"><label>몸무게 (kg)</label><input type="number" step="0.1" id="input-weight" placeholder="예: 9.2"></div>
                           <button class="submit-btn" id="save-btn">저장하기</button>`;
                break;
            case 'profile':
                modalTitle.innerText = '프로필 수정';
                content = `<div class="form-group"><label>아이 이름</label><input type="text" id="input-name" value="${profile.name}"></div>
                           <button class="submit-btn" id="save-btn">수정완료</button>`;
                break;
            case 'photo':
                modalTitle.innerText = '사진 기록';
                content = `<div class="form-group"><label>사진 설명</label><input type="text" id="input-photo-desc" placeholder="예: 오늘 처음 걸은 날!"></div>
                           <p style="font-size:0.8rem; color:#888; margin-bottom:15px">※ 실제 사진 업로드 기능은 브라우저 보안 및 용량 제한으로 인해 설명 기록으로 대체됩니다.</p>
                           <button class="submit-btn" id="save-btn">저장하기</button>`;
                break;
            case 'sleep':
                modalTitle.innerText = '수면 기록';
                content = `<div class="form-group"><label>상태</label><select id="input-sub-type"><option value="낮잠 시작">낮잠 시작</option><option value="밤잠 시작">밤잠 시작</option><option value="기상">기상</option></select></div>
                           <button class="submit-btn" id="save-btn">저장하기</button>`;
                break;
            case 'diaper':
                modalTitle.innerText = '기저귀 교체';
                content = `<div class="form-group"><label>상태</label><select id="input-sub-type"><option value="소변">소변</option><option value="대변">대변</option><option value="모두">소변 + 대변</option></select></div>
                           <button class="submit-btn" id="save-btn">저장하기</button>`;
                break;
        }
        modalBody.innerHTML = content;

        document.getElementById('save-btn').onclick = () => {
            if (type === 'feed') {
                const sub = document.getElementById('input-sub-type').value;
                const amt = document.getElementById('input-amount').value;
                addRecord('feed', `${sub} ${amt}ml 완료`);
            } else if (type === 'growth') {
                const h = document.getElementById('input-height').value;
                const w = document.getElementById('input-weight').value;
                if (h && w) {
                    growthData.push({ height: h, weight: w, timestamp: new Date().getTime() });
                    saveAll();
                    renderGraph();
                }
            } else if (type === 'profile') {
                profile.name = document.getElementById('input-name').value;
                saveAll();
                render();
            } else if (type === 'photo') {
                const desc = document.getElementById('input-photo-desc').value;
                addRecord('photo', `📸 사진: ${desc}`);
            } else if (type === 'sleep' || type === 'diaper') {
                const sub = document.getElementById('input-sub-type').value;
                addRecord(type, `${type === 'sleep' ? '수면' : '기저귀'}: ${sub}`);
            }
            closeModal();
        };
    }

    function closeModal() { modalOverlay.style.display = 'none'; }
    closeBtn.onclick = closeModal;

    // --- Settings Logic ---
    function renderSettings() {
        document.getElementById('set-profile').onclick = () => openModal('profile');
        document.getElementById('set-export').onclick = () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ records, growthData, profile }));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "baby_diary_backup.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        };
        document.getElementById('set-reset').onclick = () => {
            if (confirm('정말로 모든 기록을 삭제하시겠습니까? 복구할 수 없습니다.')) {
                records = []; growthData = []; saveAll(); render();
            }
        };
    }

    // --- Init Listeners ---
    document.getElementById('btn-feed').onclick = () => openModal('feed');
    document.getElementById('btn-sleep').onclick = () => openModal('sleep');
    document.getElementById('btn-diaper').onclick = () => openModal('diaper');
    document.getElementById('btn-photo').onclick = () => openModal('photo');
    document.getElementById('btn-add-growth').onclick = () => openModal('growth');
    document.querySelector('.add-btn').onclick = () => openModal('feed');

    render();
});
