const fs = require('fs');
const { createCanvas } = require('canvas');

// 캔버스 크기 설정 (512x512)
const width = 512;
const height = 512;
const canvas = createCanvas(width, height);
const context = canvas.getContext('2d');

// 배경 채우기 (연한 파스텔 블루)
context.fillStyle = '#E0F7FA'; // Soft blue
context.fillRect(0, 0, width, height);

// 텍스트 설정 (청룡 이모지)
context.font = '300px serif';
context.textAlign = 'center';
context.textBaseline = 'middle';

// 이모지 그리기
context.fillText('🐉', width / 2, height / 2);

// 파일 저장 (192, 512 두 가지 버전 생성)
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('icon-512.png', buffer);

// 192x192 리사이즈 (간단하게 같은 이미지 사용하거나 별도 생성 가능하지만, 여기서는 동일하게 생성)
const canvasSmall = createCanvas(192, 192);
const contextSmall = canvasSmall.getContext('2d');
contextSmall.fillStyle = '#E0F7FA';
contextSmall.fillRect(0, 0, 192, 192);
contextSmall.font = '100px serif';
contextSmall.textAlign = 'center';
contextSmall.textBaseline = 'middle';
contextSmall.fillText('🐉', 192 / 2, 192 / 2);

fs.writeFileSync('icon-192.png', canvasSmall.toBuffer('image/png'));
