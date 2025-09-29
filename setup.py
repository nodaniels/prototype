#!/usr/bin/env python3
"""
Installation and setup script for Building Navigation Prototype
"""
import subprocess
import sys
import os

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        print(f"Current version: {sys.version}")
        return False
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    return True

def install_dependencies():
    """Install required Python packages"""
    packages = ['PyMuPDF', 'Pillow']
    
    print("📦 Installing Python dependencies...")
    
    for package in packages:
        try:
            print(f"Installing {package}...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])
            print(f"✅ {package} installed successfully")
        except subprocess.CalledProcessError:
            print(f"❌ Failed to install {package}")
            return False
    
    return True

def check_pdf_files():
    """Check if PDF files exist"""
    base_path = os.path.dirname(os.path.dirname(__file__))
    pdf_path = os.path.join(base_path, "assets", "bygninger", "porcelaenshaven")
    
    expected_files = [
        "stueetage_kl_9_cbs_porcelanshaven_21.pdf",
        "porcelaenshaven_1._sal_pdf_1 (1).pdf",
        "121128-02_2_sal_kl_9_cbs_porcelaenshaven.pdf"
    ]
    
    print("📄 Checking PDF files...")
    
    if not os.path.exists(pdf_path):
        print(f"❌ PDF directory not found: {pdf_path}")
        return False
    
    missing_files = []
    for filename in expected_files:
        full_path = os.path.join(pdf_path, filename)
        if os.path.exists(full_path):
            print(f"✅ Found: {filename}")
        else:
            print(f"❌ Missing: {filename}")
            missing_files.append(filename)
    
    if missing_files:
        print(f"❌ {len(missing_files)} PDF files are missing")
        return False
    
    print("✅ All PDF files found")
    return True

def main():
    """Main setup function"""
    print("🏗️ Building Navigation Prototype Setup")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        return False
    
    # Install dependencies
    if not install_dependencies():
        return False
    
    # Check PDF files
    if not check_pdf_files():
        print("\n⚠️ Warning: Some PDF files are missing.")
        print("The app may not work correctly without all PDF files.")
    
    print("\n🎉 Setup completed successfully!")
    print("\nTo run the app:")
    print("python main.py")
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)
