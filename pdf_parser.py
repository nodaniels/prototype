"""
PDF Parser for Building Navigation
Extracts text and coordinates from PDF files
"""

import fitz  # PyMuPDF
import os
from typing import List, Dict, Tuple, Optional
import re

class PDFParser:
    def __init__(self, pdf_path: str):
        self.pdf_path = pdf_path
        self.doc = None
        self.rooms = []
        self.entrances = []
        
    def load_pdf(self) -> bool:
        """Load PDF document"""
        try:
            self.doc = fitz.open(self.pdf_path)
            return True
        except Exception as e:
            print(f"Error loading PDF {self.pdf_path}: {e}")
            return False
    
    def is_room_text(self, text: str, font_size: float = 0, normalized_font_size: float = 0) -> bool:
        """Check if text looks like a room identifier"""
        if not text or len(text) < 1:
            return False
            
        # Check specific font sizes for different floors:
        # Stueetage & 1. sal: 3.4 ± 0.1 (raw font size)
        # 2. sal: 49.2 ± 0.1 (raw font size)
        
        is_valid_font_size = False
        
        # Check for normal room font size (3.3-3.5 range for most floors)
        if 3.2 <= font_size <= 3.6:
            is_valid_font_size = True
        # Check for 2. sal Porcelænshaven font size (49.2 ± 0.2)  
        elif 49.0 <= font_size <= 49.4:
            is_valid_font_size = True
            
        if not is_valid_font_size:
            return False
            
        # Skip area measurements and metadata
        if re.match(r'^\d+\.\d+m2$', text, re.IGNORECASE):
            return False
        if re.match(r'^(Area|Type|Room \d+\.\d+m2):', text, re.IGNORECASE):
            return False
        if re.match(r'^\d+\.\d+$', text) and len(text) > 6:
            return False
        if re.match(r'^(width|height|scale|rotation|metadata|properties)$', text, re.IGNORECASE):
            return False
        
        # Accept room formats - more permissive patterns
        if re.match(r'^[A-Z0-9]{1,4}[-._][A-Z0-9]{1,4}', text, re.IGNORECASE):
            return True  # Format like "PH-D1", "A-01"
        if re.match(r'^\d{2}_\d{2}$', text):
            return True  # Format like "01_02"
        if re.match(r'^[A-Z]\.\d\.\d{2}$', text, re.IGNORECASE):
            return True  # Format like "A.1.01"
        if re.match(r'^PH-D\d+\.?\d*_?\d*$', text, re.IGNORECASE):
            return True  # Format like "PH-D1.11_01"
        if re.match(r'^[A-Z]{1,2}\d{2,4}$', text, re.IGNORECASE):
            return True  # Format like "A101", "AB123"
        if re.match(r'^\d{2,4}[A-Z]?$', text, re.IGNORECASE):
            return True  # Format like "101", "202A"
        if re.match(r'^[A-Z0-9]{2,8}$', text, re.IGNORECASE):
            return True  # Short alphanumeric codes
        
        # Be more inclusive - accept most alphanumeric combinations that could be room numbers
        if re.match(r'^[A-Z0-9.-_]{2,10}$', text, re.IGNORECASE):
            # But exclude obvious non-rooms
            if not re.match(r'^[\d.]+$', text):  # Not just numbers and dots
                return True
            
        return False
    
    def is_entrance_text(self, text: str) -> bool:
        """Check if text indicates an entrance"""
        return 'indgang' in text.lower()
    
    def extract_text_with_coordinates(self) -> Tuple[List[Dict], List[Dict]]:
        """Extract room and entrance data with coordinates"""
        if not self.doc:
            return [], []
            
        rooms = []
        entrances = []
        
        try:
            # Get first page
            page = self.doc[0]
            page_rect = page.rect
            
            # Calculate normalization factor based on page size
            # Reference: assume 595x842 points (A4) = scale factor 1.0
            reference_size = 595 * 842
            actual_size = page_rect.width * page_rect.height
            size_scale_factor = (actual_size / reference_size) ** 0.5
            
            print(f"PDF size: {page_rect.width:.0f}x{page_rect.height:.0f}, scale factor: {size_scale_factor:.2f}")
            
            # Get text blocks with positioning
            text_dict = page.get_text("dict")
            
            for block in text_dict["blocks"]:
                if "lines" not in block:
                    continue
                    
                for line in block["lines"]:
                    for span in line["spans"]:
                        text = span["text"].strip()
                        if not text:
                            continue
                            
                        # Get font size and position
                        font_size = span["size"]
                        bbox = span["bbox"]  # (x0, y0, x1, y1)
                        
                        # Normalize font size based on page scale
                        normalized_font_size = font_size / size_scale_factor
                        
                        # Calculate center position
                        x = (bbox[0] + bbox[2]) / 2
                        y = (bbox[1] + bbox[3]) / 2
                        
                        # Normalize coordinates (0-1 range)
                        norm_x = x / page_rect.width
                        norm_y = y / page_rect.height
                        
                        # Check if it's an entrance FIRST (before room check)
                        if self.is_entrance_text(text):
                            entrances.append({
                                'text': text,
                                'x': norm_x,
                                'y': norm_y,
                                'font_size': font_size,
                                'normalized_font_size': normalized_font_size
                            })
                        # Check if it's a room (but not if it's already an entrance)
                        elif self.is_room_text(text, font_size, normalized_font_size):
                            rooms.append({
                                'id': text.upper(),  # Normalize to uppercase
                                'text': text,
                                'x': norm_x,
                                'y': norm_y,
                                'font_size': font_size,
                                'normalized_font_size': normalized_font_size
                            })
            
            print(f"Extracted from {os.path.basename(self.pdf_path)}: {len(rooms)} rooms, {len(entrances)} entrances")
            
        except Exception as e:
            print(f"Error extracting text from {self.pdf_path}: {e}")
            
        return rooms, entrances
    
    def get_pdf_dimensions(self) -> Tuple[float, float]:
        """Get PDF page dimensions"""
        if not self.doc:
            return 0, 0
            
        page = self.doc[0]
        rect = page.rect
        return rect.width, rect.height
    
    def render_pdf_as_image(self, scale: float = 1.0):
        """Render PDF page as PIL Image with size limits"""
        if not self.doc:
            print("Error: No PDF document loaded")
            return None
            
        try:
            page = self.doc[0]
            page_rect = page.rect
            
            # Calculate appropriate scale to avoid huge images
            # Target max dimension: 2000 pixels
            max_dimension = 2000
            width_scale = max_dimension / page_rect.width
            height_scale = max_dimension / page_rect.height
            safe_scale = min(width_scale, height_scale, scale)
            
            print(f"PDF dimensions: {page_rect.width}x{page_rect.height}")
            print(f"Using scale: {safe_scale:.2f} (requested: {scale})")
            
            mat = fitz.Matrix(safe_scale, safe_scale)
            pix = page.get_pixmap(matrix=mat)
            
            # Convert to PIL Image with size check
            from PIL import Image
            import io
            
            # Check pixmap size before conversion
            pix_size = pix.width * pix.height
            max_pixels = 100_000_000  # 100M pixels max
            
            if pix_size > max_pixels:
                print(f"Warning: Image too large ({pix_size} pixels), reducing scale")
                # Reduce scale further
                reduction_factor = (max_pixels / pix_size) ** 0.5
                safe_scale *= reduction_factor
                mat = fitz.Matrix(safe_scale, safe_scale)
                pix = page.get_pixmap(matrix=mat)
            
            # Convert to PNG bytes
            img_data = pix.tobytes("png")
            image = Image.open(io.BytesIO(img_data))
            print(f"Successfully rendered PDF as {image.size[0]}x{image.size[1]} image")
            return image
            
        except Exception as e:
            print(f"Error rendering PDF as image: {e}")
            return None
    
    def close(self):
        """Close PDF document"""
        if self.doc:
            self.doc.close()
            self.doc = None


class BuildingManager:
    """Manages multiple buildings with PDF files for different floors"""
    
    def __init__(self, buildings_base_path: str):
        self.buildings_base_path = buildings_base_path
        self.available_buildings = []
        self.current_building = None
        self.floors = {}
        self.all_rooms = {}  # floor_name -> rooms
        self.all_entrances = {}  # floor_name -> entrances
    def get_available_buildings(self):
        """Scan for available buildings in the bygninger folder"""
        if not os.path.exists(self.buildings_base_path):
            print(f"Error: Buildings path {self.buildings_base_path} does not exist")
            return []
            
        buildings = []
        try:
            for item in os.listdir(self.buildings_base_path):
                item_path = os.path.join(self.buildings_base_path, item)
                if os.path.isdir(item_path):
                    # Check if directory contains PDF files
                    pdf_files = [f for f in os.listdir(item_path) if f.endswith('.pdf')]
                    if pdf_files:
                        buildings.append(item)
        except Exception as e:
            print(f"Error scanning buildings: {e}")
            
        self.available_buildings = buildings
        return buildings
    
    def load_building_floors(self, building_name: str):
        """Load all PDF files from the specified building folder"""
        building_path = os.path.join(self.buildings_base_path, building_name)
        
        if not os.path.exists(building_path):
            print(f"Error: Building path {building_path} does not exist")
            return False
            
        # Clear previous data
        self.floors.clear()
        self.all_rooms.clear() 
        self.all_entrances.clear()
        
        # Get all PDF files in the building directory
        try:
            pdf_files = [f for f in os.listdir(building_path) if f.endswith('.pdf')]
            pdf_files.sort()  # Sort alphabetically
            
            print(f"Loading building: {building_name}")
            
            for filename in pdf_files:
                pdf_path = os.path.join(building_path, filename)
                
                # Use filename (without .pdf) as floor name
                floor_name = os.path.splitext(filename)[0]
                
                print(f"Loading floor: {floor_name}")
                parser = PDFParser(pdf_path)
                
                if parser.load_pdf():
                    rooms, entrances = parser.extract_text_with_coordinates()
                    
                    self.floors[floor_name] = parser
                    self.all_rooms[floor_name] = rooms
                    self.all_entrances[floor_name] = entrances
                    
                    print(f"  -> {len(rooms)} rooms, {len(entrances)} entrances")
                else:
                    print(f"  -> Failed to load PDF")
                    
        except Exception as e:
            print(f"Error loading building {building_name}: {e}")
            return False
        
        self.current_building = building_name
        return len(self.floors) > 0
    
    def search_room(self, room_query: str) -> Optional[Dict]:
        """Search for a room across all floors (case insensitive, exact match)"""
        room_query = room_query.upper().strip()
        
        for floor_name, rooms in self.all_rooms.items():
            for room in rooms:
                if room['id'] == room_query:
                    return {
                        'room': room,
                        'floor': floor_name,
                        'parser': self.floors[floor_name]
                    }
        
        return None
    
    def get_nearest_entrance(self, room_x: float, room_y: float) -> Optional[Dict]:
        """Find nearest entrance (prefer ground floor if available)"""
        # Try to find ground floor entrances first
        ground_floor_candidates = []
        for floor_name in self.all_entrances.keys():
            if any(keyword in floor_name.lower() for keyword in ['stue', 'ground', '0']):
                ground_floor_candidates.append(floor_name)
        
        # If no obvious ground floor, use first floor with entrances
        target_floors = ground_floor_candidates if ground_floor_candidates else list(self.all_entrances.keys())
        
        all_entrances = []
        for floor_name in target_floors:
            if self.all_entrances[floor_name]:
                all_entrances.extend(self.all_entrances[floor_name])
        
        if not all_entrances:
            return None
            
        # Find closest entrance using Euclidean distance
        min_distance = float('inf')
        nearest_entrance = None
        
        for entrance in all_entrances:
            distance = ((entrance['x'] - room_x) ** 2 + (entrance['y'] - room_y) ** 2) ** 0.5
            if distance < min_distance:
                min_distance = distance
                nearest_entrance = entrance
                
        return nearest_entrance
    
    def close_all(self):
        """Close all PDF documents"""
        for parser in self.floors.values():
            parser.close()
