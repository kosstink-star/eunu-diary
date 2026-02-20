document.addEventListener('DOMContentLoaded', () => {
    console.log('육아 다이어리 앱 로드 완료');

    // --- State & Storage ---
    let records = JSON.parse(localStorage.getItem('babyRecords')) || [];

    // --- Selectors ---
    const timeline = document.getElementById('timeline');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalBody = document.getElementById('modal-body');
    const modalTitle = document.getElementById('modal-title');
    const closeBtn = document.getElementById('close-modal');
    const addBtn = document.querySelector('.add-btn');

    // --- Core Functions ---

    function saveRecords() {
        localStorage.setItem('babyRecords', JSON.stringify(records));
    }

    function addRecord(type, content, timestamp = new Date().getTime()) {
        records.push({ type, content, timestamp });
        saveRecords();
        render();
    }

    function getTimeString(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    function getTimeAgo(timestamp) {
        const diffMs = new Date().getTime() - timestamp;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return "방금 전";
        if (diffMins < 60) return `${diffMins}분 전`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}시간 전`;

        return `${Math.floor(diffHours / 24)}일 전`;
    }

    function render() {
        // 1. Sort records (latest first)
        const sortedRecords = [...records].sort((a, b) => b.timestamp - a.timestamp);

        // 2. Render Timeline
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

        // 3. Update Dashboard Stats
        updateCardStats();
    }

    function updateCardStats() {
        const types = {
            'feed': '식사',
            'sleep': '수면',
            'diaper': '기저귀'
        };

        Object.keys(types).forEach(type => {
            const card = document.getElementById(`btn-${type}`);
            if (!card) return;

            const lastRecord = [...records].filter(r => r.type === type).sort((a, b) => b.timestamp - a.timestamp)[0];
            const statValue = card.querySelector('.stat-value');

            if (lastRecord) {
                statValue.innerText = getTimeAgo(lastRecord.timestamp);
            } else {
                statValue.innerText = '기록 없음';
            }
        });
    }

    // --- Modal Logic ---

    function openModal(type) {
        modalOverlay.style.display = 'flex';
        let content = '';

        switch (type) {
            case 'feed':
                modalTitle.innerText = '식사 기록';
                content = `
                    <div class="form-group">
                        <label>종류</label>
                        <select id="input-sub-type">
                            <option value="분유">분유</option>
                            <option value="모유">모유</option>
                            <option value="이유식">이유식</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>양 (ml / g)</label>
                        <input type="number" id="input-amount" placeholder="예: 120" value="120">
                    </div>
                    <button class="submit-btn" id="submit-record">저장하기</button>
                `;
                break;
            case 'sleep':
                modalTitle.innerText = '수면 기록';
                content = `
                    <div class="form-group">
                        <label>상태</label>
                        <select id="input-sub-type">
                            <option value="낮잠 시작">낮잠 시작</option>
                            <option value="밤잠 시작">밤잠 시작</option>
                            <option value="기상">기상</option>
                        </select>
                    </div>
                    <button class="submit-btn" id="submit-record">저장하기</button>
                `;
                break;
            case 'diaper':
                modalTitle.innerText = '기저귀 교체';
                content = `
                    <div class="form-group">
                        <label>상태</label>
                        <select id="input-sub-type">
                            <option value="소변">소변</option>
                            <option value="대변">대변</option>
                            <option value="모두">소변 + 대변</option>
                            <option value="보송보송">단순 교체</option>
                        </select>
                    </div>
                    <button class="submit-btn" id="submit-record">저장하기</button>
                `;
                break;
            default:
                modalTitle.innerText = '알림';
                content = '<p>준비 중인 기능입니다.</p>';
        }

        modalBody.innerHTML = content;

        // Attach submit event
        const submitBtn = document.getElementById('submit-record');
        if (submitBtn) {
            submitBtn.onclick = () => {
                let recordText = '';
                if (type === 'feed') {
                    const subType = document.getElementById('input-sub-type').value;
                    const amount = document.getElementById('input-amount').value;
                    recordText = `${subType} ${amount}ml 수유 완료`;
                } else if (type === 'sleep' || type === 'diaper') {
                    const subType = document.getElementById('input-sub-type').value;
                    recordText = type === 'sleep' ? `수면: ${subType}` : `기저귀 교체: ${subType}`;
                }

                if (recordText) {
                    addRecord(type, recordText);
                    closeModal();
                }
            };
        }
    }

    function closeModal() {
        modalOverlay.style.display = 'none';
        modalBody.innerHTML = '';
    }

    // --- Event Listeners ---

    document.getElementById('btn-feed').onclick = () => openModal('feed');
    document.getElementById('btn-sleep').onclick = () => openModal('sleep');
    document.getElementById('btn-diaper').onclick = () => openModal('diaper');
    document.getElementById('btn-photo').onclick = () => alert('사진 기능은 곧 업데이트될 예정입니다!');

    addBtn.onclick = () => openModal('feed'); // 기본값으로 식사 열기

    closeBtn.onclick = closeModal;
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) closeModal();
    };

    // --- Init ---
    render();

    // 매 분마다 시간 경과 업데이트
    setInterval(updateCardStats, 60000);
});
