"""
iPhone-style Building Navigation App
Main GUI application with mobile-like interface
"""

import tkinter as tk
from tkinter import ttk, messagebox
from PIL import Image, ImageTk, ImageDraw
import os
import sys

# Add the prototype directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from pdf_parser import BuildingManager

class BuildingNavigationApp:
    def __init__(self, root):
        self.root = root
        self.setup_window()
        self.setup_styles()
        
        # Initialize building manager
        buildings_path = os.path.join(os.path.dirname(__file__), "bygninger")
        self.building_manager = BuildingManager(buildings_path)
        
        # GUI variables
        self.current_floor_image = None
        self.current_result = None
        self.scale_factor = 1.0
        self.current_screen = "building_selection"  # "building_selection" or "room_search"
        
        # Create GUI
        self.create_gui()
        
        # Load available buildings
        self.load_available_buildings()
    
    def setup_window(self):
        """Configure main window in iPhone-like format"""
        self.root.title("Building Navigation")
        self.root.geometry("375x812")  # iPhone 13 Pro dimensions
        self.root.configure(bg='#f8f9fa')
        self.root.resizable(False, False)
        
        # Center window on screen
        self.center_window()
    
    def center_window(self):
        """Center the window on screen"""
        self.root.update_idletasks()
        width = self.root.winfo_width()
        height = self.root.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        self.root.geometry(f'{width}x{height}+{x}+{y}')
    
    def setup_styles(self):
        """Configure modern iOS-like styles"""
        style = ttk.Style()
        style.theme_use('clam')
        
        # Configure button style
        style.configure('Search.TButton',
                       background='#007AFF',
                       foreground='white',
                       borderwidth=0,
                       focuscolor='none',
                       font=('SF Pro Display', 16, 'bold'))
        
        style.map('Search.TButton',
                 background=[('active', '#0056CC')])
    
    def create_gui(self):
        """Create the main GUI interface"""
        # Header
        self.header_frame = tk.Frame(self.root, bg='#f8f9fa', height=100)
        self.header_frame.pack(fill=tk.X, padx=20, pady=(40, 20))
        self.header_frame.pack_propagate(False)
        
        self.title_label = tk.Label(self.header_frame, 
                              text="Building Navigation",
                              font=('SF Pro Display', 24, 'bold'),
                              bg='#f8f9fa',
                              fg='#1c1c1e')
        self.title_label.pack(expand=True)
        
        self.subtitle_label = tk.Label(self.header_frame,
                                 text="Vælg bygning",
                                 font=('SF Pro Display', 16),
                                 bg='#f8f9fa', 
                                 fg='#8e8e93')
        self.subtitle_label.pack()
        
        # Main content frame (will switch between building selection and room search)
        self.main_frame = tk.Frame(self.root, bg='#f8f9fa')
        self.main_frame.pack(fill=tk.BOTH, expand=True, padx=20)
        
        # Building selection frame
        self.building_frame = tk.Frame(self.main_frame, bg='#f8f9fa')
        
        # Search frame (initially hidden)
        self.search_frame = tk.Frame(self.main_frame, bg='#f8f9fa')
        
        self.create_building_selection()
        self.create_search_interface()
        
        # Result info frame
        self.info_frame = tk.Frame(self.root, bg='#f8f9fa')
        self.info_frame.pack(fill=tk.X, padx=20, pady=20)
        
        self.info_label = tk.Label(self.info_frame,
                                  text="",
                                  font=('SF Pro Display', 14),
                                  bg='#f8f9fa',
                                  fg='#8e8e93',
                                  wraplength=300,
                                  justify=tk.CENTER)
        self.info_label.pack()
        
        # Image display frame
        self.image_frame = tk.Frame(self.root, bg='white', relief=tk.FLAT, bd=1)
        self.image_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=(0, 40))
        
        self.image_label = tk.Label(self.image_frame, bg='white')
        self.image_label.pack(expand=True)
        
        # Loading label (initially hidden)
        self.loading_label = tk.Label(self.root,
                                     text="Loading...",
                                     font=('SF Pro Display', 16),
                                     bg='#f8f9fa',
                                     fg='#8e8e93')
    
    def create_building_selection(self):
        """Create building selection interface"""
        building_label = tk.Label(self.building_frame,
                                 text="Vælg bygning",
                                 font=('SF Pro Display', 18, 'bold'),
                                 bg='#f8f9fa',
                                 fg='#1c1c1e')
        building_label.pack(anchor=tk.W, pady=(20, 20))
        
        # Building buttons container
        self.buildings_container = tk.Frame(self.building_frame, bg='#f8f9fa')
        self.buildings_container.pack(fill=tk.X, pady=10)
    
    def create_search_interface(self):
        """Create room search interface"""
        # Back button
        back_btn = ttk.Button(self.search_frame,
                             text="← Tilbage til bygninger",
                             command=self.show_building_selection)
        back_btn.pack(anchor=tk.W, pady=(0, 20))
        
        search_label = tk.Label(self.search_frame,
                               text="Søg efter lokale",
                               font=('SF Pro Display', 18, 'bold'),
                               bg='#f8f9fa',
                               fg='#1c1c1e')
        search_label.pack(anchor=tk.W, pady=(0, 10))
        
        # Search input with iOS style
        self.search_var = tk.StringVar()
        search_entry = tk.Entry(self.search_frame,
                               textvariable=self.search_var,
                               font=('SF Pro Display', 16),
                               bg='white',
                               fg='#1c1c1e',
                               relief=tk.FLAT,
                               bd=0,
                               highlightthickness=1,
                               highlightcolor='#007AFF',
                               highlightbackground='#d1d1d6')
        search_entry.pack(fill=tk.X, pady=(0, 15), ipady=12)
        search_entry.bind('<Return>', lambda e: self.search_room())
        
        # Search button
        search_btn = ttk.Button(self.search_frame,
                               text="Søg",
                               style='Search.TButton',
                               command=self.search_room)
        search_btn.pack(fill=tk.X, ipady=8)
    
    def load_available_buildings(self):
        """Load list of available buildings"""
        self.loading_label.pack(pady=20)
        self.root.update()
        
        try:
            buildings = self.building_manager.get_available_buildings()
            if buildings:
                self.show_building_selection()
                self.populate_building_buttons(buildings)
            else:
                self.info_label.config(text="No buildings found in bygninger folder")
        except Exception as e:
            self.info_label.config(text=f"Error loading buildings: {str(e)}")
        finally:
            self.loading_label.pack_forget()
    
    def populate_building_buttons(self, buildings):
        """Create buttons for each available building"""
        # Clear existing buttons
        for widget in self.buildings_container.winfo_children():
            widget.destroy()
            
        for building in buildings:
            btn = ttk.Button(self.buildings_container,
                            text=building.title(),
                            style='Search.TButton',
                            command=lambda b=building: self.select_building(b))
            btn.pack(fill=tk.X, pady=5, ipady=8)
    
    def select_building(self, building_name):
        """Select and load a specific building"""
        self.loading_label.config(text=f"Loading {building_name}...")
        self.loading_label.pack(pady=20)
        self.root.update()
        
        try:
            success = self.building_manager.load_building_floors(building_name)
            if success:
                self.subtitle_label.config(text=building_name.title())
                self.show_search_interface()
                self.info_label.config(text="Ready to search! Enter a room number above.")
            else:
                self.info_label.config(text=f"Error loading {building_name}. Check PDF files.")
        except Exception as e:
            self.info_label.config(text=f"Error: {str(e)}")
        finally:
            self.loading_label.pack_forget()
    
    def show_building_selection(self):
        """Show building selection screen"""
        self.current_screen = "building_selection"
        self.search_frame.pack_forget()
        self.building_frame.pack(fill=tk.BOTH, expand=True)
        self.subtitle_label.config(text="Vælg bygning")
        
    def show_search_interface(self):
        """Show room search screen"""
        self.current_screen = "room_search"
        self.building_frame.pack_forget()
        self.search_frame.pack(fill=tk.BOTH, expand=True)
    
    def search_room(self):
        """Search for a room and display results"""
        query = self.search_var.get().strip()
        if not query:
            messagebox.showwarning("Input Error", "Please enter a room number")
            return
        
        # Show loading
        self.info_label.config(text="Searching...")
        self.root.update()
        
        try:
            # Search for room
            result = self.building_manager.search_room(query)
            
            if not result:
                self.info_label.config(text=f'Room "{query}" not found')
                self.image_label.config(image='')
                self.current_floor_image = None
                return
            
            # Get room and floor info
            room = result['room']
            floor_name = result['floor']
            parser = result['parser']
            
            # Find nearest entrance
            nearest_entrance = self.building_manager.get_nearest_entrance(room['x'], room['y'])
            
            # Update info
            entrance_text = ""
            if nearest_entrance:
                entrance_text = " • Orange prik viser nærmeste indgang"
            
            self.info_label.config(text=f'Found "{room["id"]}" on {floor_name}{entrance_text}')
            
            # Render PDF with markers
            self.render_pdf_with_markers(parser, room, nearest_entrance)
            
            self.current_result = result
            
        except Exception as e:
            self.info_label.config(text=f"Error searching: {str(e)}")
            print(f"Search error: {e}")
    
    def render_pdf_with_markers(self, parser, room, entrance=None):
        """Render PDF page with room and entrance markers"""
        try:
            print(f"Rendering PDF with room at ({room['x']:.3f}, {room['y']:.3f})")
            if entrance:
                print(f"  and entrance at ({entrance['x']:.3f}, {entrance['y']:.3f})")
                
            # Render PDF as image with safe scaling
            pdf_image = parser.render_pdf_as_image(scale=1.5)
            if not pdf_image:
                self.info_label.config(text="Error rendering PDF")
                print("Failed to render PDF as image")
                return
            
            # Get image dimensions
            img_width, img_height = pdf_image.size
            
            # Calculate scale to fit in display area (maintaining aspect ratio)
            display_width = 335  # iPhone width minus padding
            display_height = 400  # Available height for image
            
            scale_x = display_width / img_width
            scale_y = display_height / img_height
            self.scale_factor = min(scale_x, scale_y)
            
            # Resize image
            new_width = int(img_width * self.scale_factor)
            new_height = int(img_height * self.scale_factor)
            pdf_image = pdf_image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Create drawing context
            draw = ImageDraw.Draw(pdf_image)
            
            # Draw room marker (green circle)
            room_x = room['x'] * new_width
            room_y = room['y'] * new_height
            marker_size = 8
            
            draw.ellipse([room_x - marker_size, room_y - marker_size,
                         room_x + marker_size, room_y + marker_size],
                        fill='#4CAF50', outline='#2E7D32', width=2)
            
            # Draw entrance marker (orange circle)
            if entrance:
                entrance_x = entrance['x'] * new_width
                entrance_y = entrance['y'] * new_height
                
                draw.ellipse([entrance_x - marker_size, entrance_y - marker_size,
                             entrance_x + marker_size, entrance_y + marker_size],
                            fill='#FF9800', outline='#F57C00', width=2)
            
            # Convert to PhotoImage for tkinter
            self.current_floor_image = ImageTk.PhotoImage(pdf_image)
            self.image_label.config(image=self.current_floor_image)
            
        except Exception as e:
            self.info_label.config(text=f"Error rendering image: {str(e)}")
            print(f"Render error: {e}")
    
    def on_closing(self):
        """Clean up when closing app"""
        try:
            self.building_manager.close_all()
        except:
            pass
        self.root.destroy()


def main():
    """Main application entry point"""
    root = tk.Tk()
    
    try:
        app = BuildingNavigationApp(root)
        root.protocol("WM_DELETE_WINDOW", app.on_closing)
        root.mainloop()
    except ImportError as e:
        messagebox.showerror("Missing Dependencies", 
                           f"Required Python packages are missing:\n{str(e)}\n\n"
                           "Please install requirements:\n"
                           "pip install PyMuPDF Pillow")
    except Exception as e:
        messagebox.showerror("Application Error", f"An error occurred:\n{str(e)}")


if __name__ == "__main__":
    main()
