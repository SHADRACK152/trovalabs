# 📚 Audiobook Feature - Quick Start Guide

## ✅ What We Built

A complete audiobook creation and playback system that lets you:
- Upload novels/stories in multiple formats (PDF, TXT, EPUB, DOCX)
- Automatically convert them to audiobooks with AI narration
- Listen online or download for offline playback
- Share audiobooks with friends

## 🚀 Installation

### 1. Install Dependencies

```bash
# Run the setup script
setup-audiobook.bat
```

Or manually:
```bash
cd backend
pip install PyPDF2 ebooklib beautifulsoup4 python-docx gtts
```

### 2. Test the Feature

```bash
# Run the test script
python test_audiobook.py
```

### 3. Start the Application

```bash
# Start backend
cd backend
python main.py

# Start frontend (in new terminal)
cd frontend
npm run dev
```

## 🎯 How to Use

### Creating Your First Audiobook

1. **Navigate to Audiobooks**
   - Open http://localhost:5173
   - Login to your account
   - Click on "Audiobooks" or navigate to `/audiobooks`

2. **Upload a Book**
   - Click "Upload New" tab
   - Drag & drop your file or click to browse
   - Supported: PDF, TXT, EPUB, DOCX (max 50MB)

3. **Add Details** (Optional)
   - Enter book title
   - Enter author name
   - Choose a voice (Lisa, Jenny, Guy, etc.)

4. **Create Audiobook**
   - Click "Create Audiobook"
   - Processing will start automatically
   - You'll see a progress indicator

5. **Listen**
   - Once complete, click "Listen" on the book card
   - Use the player controls:
     - ▶️ Play/Pause
     - ⏮️ Previous chapter
     - ⏭️ Next chapter
     - 🔊 Volume control
     - 📋 Chapter list
     - 💾 Download chapters

## 🎤 Available Voices

### Female Voices
- **Lisa** - Natural, expressive
- **Jenny** - Friendly, warm
- **Aria** - Professional, clear
- **Emma** - British, clear
- **Mary** - American, natural
- **Sarah** - Australian, friendly

### Male Voices
- **Guy** - Energetic, modern
- **Tony** - Professional, news
- **John** - British, professional
- **David** - American, deep

## 📁 Sample Files to Test

Create a test file `sample-story.txt`:

```
Chapter 1: The Beginning

Once upon a time, in a digital realm far away, there existed an AI
named Lumino. Lumino had a special gift - the ability to bring stories
to life through the power of voice.

Chapter 2: The Discovery

One day, a user discovered Lumino's audiobook feature. They uploaded
their favorite novel, and within moments, Lumino transformed the text
into beautiful, natural-sounding speech.

Chapter 3: The Journey

From that day forward, the user could listen to any book, anytime,
anywhere. The world of literature opened up in a whole new way.

The End.
```

Upload this file to test the feature!

## 🔧 Troubleshooting

### "API.get is not a function" Error
✅ **FIXED** - Updated import statements in audiobook components

### TTS Redirect Error (302)
✅ **FIXED** - Added fallback to Google TTS when TTSFree API fails

### Upload Fails
- Check file size (max 50MB)
- Verify format (PDF, TXT, EPUB, DOCX)
- Check backend logs for errors

### No Audio Playback
- Check browser console for errors
- Verify chapter was processed
- Try downloading the chapter

### Processing Stuck
- Check backend terminal for errors
- Restart the backend
- Try uploading a smaller file

## 📋 API Endpoints

All endpoints require authentication (Bearer token).

```
POST   /audiobook/upload              # Upload new book
POST   /audiobook/{id}/process        # Start processing
GET    /audiobook/{id}                # Get book details
GET    /audiobook/library             # Get all books
GET    /audiobook/{id}/chapter/{num}  # Get chapter audio
DELETE /audiobook/{id}                # Delete book
```

## 🎨 Frontend Components

### AudiobookPage.jsx
Main page with tab navigation (Library/Upload)

### AudiobookUploader.jsx
File upload interface with drag & drop

### AudiobookLibrary.jsx
Grid view of all user's audiobooks

### AudiobookPlayer.jsx
Full-featured audio player with controls

## 🗂️ Backend Structure

### audiobook.py
Service for text extraction, chapter splitting, and audio generation

### main.py
API endpoints for audiobook operations

## 💾 File Storage

```
audiobooks/
  ├── uploads/          # Original uploaded files
  ├── audio/            # Generated MP3 chapters
  └── metadata/         # JSON metadata for each book
```

## 🎯 Next Steps

1. **Test with Different Files**
   - Try PDF, TXT, EPUB, DOCX
   - Test with different book lengths
   - Try different voices

2. **Customize**
   - Adjust chapter splitting logic
   - Add more voice options
   - Implement bookmarks

3. **Share**
   - Use the share button in player
   - Download chapters to share offline

## 📚 Additional Resources

- Full documentation: `AUDIOBOOK_FEATURE.md`
- Test script: `test_audiobook.py`
- Setup script: `setup-audiobook.bat`

## 🎉 Success!

You now have a fully functional audiobook creation system! Upload your first book and start listening! 🎧

---

**Need help?** Check the main README or open an issue.
