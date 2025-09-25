#!/usr/bin/env python3
"""
Simple script to create Chrome extension icons in different sizes
"""

from PIL import Image, ImageDraw
import os

def create_icon(size, filename):
    # Create a new image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Background gradient colors (similar to the app theme)
    bg_color = (102, 126, 234)  # #667eea
    
    # Draw rounded rectangle background
    margin = size // 8
    draw.rounded_rectangle(
        [margin, margin, size-margin, size-margin],
        radius=size // 6,
        fill=bg_color
    )
    
    # Draw subscription tracking icon (grid with X)
    line_width = max(1, size // 16)
    grid_margin = size // 4
    center = size // 2
    
    # Draw grid lines
    draw.rectangle([center - line_width//2, grid_margin, center + line_width//2, size - grid_margin], fill='white')
    draw.rectangle([grid_margin, center - line_width//2, size - grid_margin, center + line_width//2], fill='white')
    
    # Draw X mark in top-right quadrant
    x_size = size // 8
    x_center_x = center + size // 8
    x_center_y = center - size // 8
    
    # X lines
    draw.line([x_center_x - x_size, x_center_y - x_size, x_center_x + x_size, x_center_y + x_size], fill='white', width=line_width)
    draw.line([x_center_x - x_size, x_center_y + x_size, x_center_x + x_size, x_center_y - x_size], fill='white', width=line_width)
    
    # Save the image
    img.save(filename, 'PNG')
    print(f"Created {filename} ({size}x{size})")

def main():
    # Create icons in required sizes for Chrome extension
    sizes = [16, 32, 48, 128]
    
    for size in sizes:
        filename = f"icon{size}.png"
        create_icon(size, filename)
    
    print("All icons created successfully!")

if __name__ == "__main__":
    main()