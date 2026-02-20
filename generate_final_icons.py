from PIL import Image, ImageOps

def create_pwa_icons(source_path, background_color='#fff5f7'):
    try:
        # Load the source image
        img = Image.open(source_path)
        
        # Determine the square size (use the larger dimension)
        size = max(img.size)
        
        # Create a new background with the requested 연분홍 (light pink)
        # We use RGBA to ensure we can handle any transparency if needed
        final_img = Image.new('RGB', (size, size), color=background_color)
        
        # Center the original image on the pink background
        offset = ((size - img.width) // 2, (size - img.height) // 2)
        final_img.paste(img, offset)
        
        # Save as 192x192 and 512x512 as required by manifest.json
        icon_192 = final_img.resize((192, 192), Image.Resampling.LANCZOS)
        icon_192.save('icon-192.png')
        
        icon_512 = final_img.resize((512, 512), Image.Resampling.LANCZOS)
        icon_512.save('icon-512.png')
        
        print("Icons created successfully: icon-192.png, icon-512.png")
        
    except Exception as e:
        print(f"Error creating icons: {e}")

if __name__ == "__main__":
    import os
    # Use the specific file provided by the user
    source = '캡처.PNG'
    if os.path.exists(source):
        create_pwa_icons(source)
    else:
        print(f"Source file {source} not found.")
