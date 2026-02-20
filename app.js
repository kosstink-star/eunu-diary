document.addEventListener('DOMContentLoaded', () => {
    console.log('육아 다이어리 앱 로드 완료');

    // 간단한 버튼 클릭 이벤트 예시
    const cards = document.querySelectorAll('.stat-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const label = card.querySelector('.stat-label').innerText;
            alert(`${label} 기능을 준비 중입니다!`);
        });
    });

    // 타임라인 추가 함수 (나중에 사용)
    function addTimelineItem(time, text) {
        const timeline = document.getElementById('timeline');
        const item = document.createElement('div');
        item.className = 'diary-item';
        item.innerHTML = `
            <span class="time">${time}</span>
            <div class="content">${text}</div>
        `;
        timeline.prepend(item);
    }
});
