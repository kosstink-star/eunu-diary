from PIL import Image, ImageDraw, ImageFont

def create_icon(size):
    # 연한 파스텔 블루 배경 생성
    img = Image.new('RGB', (size, size), color='#E0F7FA')
    d = ImageDraw.Draw(img)
    
    # 텍스트(이모지)를 그릴 준비
    # 윈도우 기본 폰트인 'seguiemj.ttf' (이모지 폰트) 사용 시도
    try:
        font = ImageFont.truetype("seguiemj.ttf", int(size * 0.6))
    except OSError:
        # 폰트 로드 실패 시 기본 폰트로 대체 (텍스트만)
        try:
            font = ImageFont.truetype("arial.ttf", int(size * 0.5))
        except:
            font = ImageFont.load_default()
            
    # 청룡 이모지 또는 대체 텍스트
    text = "🐲"
    
    # 텍스트 크기 측정 및 중앙 정렬
    try:
        left, top, right, bottom = d.textbbox((0, 0), text, font=font)
        text_width = right - left
        text_height = bottom - top
    except AttributeError:
         # 구버전 Pillow 호환
        text_width, text_height = d.textsize(text, font=font)
        
    position = ((size - text_width) / 2, (size - text_height) / 2)
    
    # 이모지 그리기 (색상은 검정이 아니라 이모지 고유 색상 사용 위해 embedded color 기능 사용해야 하지만
    # PIL 기본 Draw로는 흑백 렌더링이 될 수 있음. 따라서 심플하게 짙은 파랑 텍스트로 그리기)
    d.text(position, text, fill="#006064", font=font)
    
    img.save(f'icon-{size}.png')
    print(f'Created icon-{size}.png')

create_icon(192)
create_icon(512)
