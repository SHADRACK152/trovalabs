@echo off
echo ========================================
echo  Lumino AI - Audiobook Feature Setup
echo ========================================
echo.

echo Installing audiobook dependencies...
echo.

cd backend

echo Installing Python packages...
pip install PyPDF2==3.0.1
pip install ebooklib==0.18
pip install beautifulsoup4==4.12.2
pip install python-docx==1.1.0
pip install gtts==2.5.1

echo.
echo ========================================
echo  Installation Complete!
echo ========================================
echo.
echo Audiobook feature is now ready to use.
echo.
echo Supported formats:
echo  - PDF (text-based)
echo  - TXT (plain text)
echo  - EPUB (ebooks)
echo  - DOCX (Word documents)
echo.
echo To start using:
echo  1. Start the backend: python main.py
echo  2. Go to http://localhost:5173/audiobooks
echo  3. Upload your first book!
echo.
echo For more info, see AUDIOBOOK_FEATURE.md
echo.
pause
