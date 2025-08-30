#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    # Create a new image with a red background
    img = Image.new('RGB', (size, size), color='#ff6b6b')
    draw = ImageDraw.Draw(img)
    
    # Add a white circle in the center
    margin = size // 4
    draw.ellipse([margin, margin, size - margin, size - margin], fill='white')
    
    # Add "SL" text in the center
    try:
        font_size = size // 3
        font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", font_size)
    except:
        font = ImageFont.load_default()
    
    text = "SL"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) // 2
    y = (size - text_height) // 2
    
    draw.text((x, y), text, fill='#ee5a24', font=font)
    
    # Save the icon
    img.save(filename, 'PNG')
    print(f"Created {filename}")

if __name__ == "__main__":
    # Create icons in different sizes
    create_icon(16, "icon16.png")
    create_icon(48, "icon48.png")
    create_icon(128, "icon128.png")
    print("All icons created successfully!")
