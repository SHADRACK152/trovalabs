# 📚 Audiobook Feature - Lumino AI

Transform your novels and stories into high-quality audiobooks with AI-powered narration!

## 🌟 Features

### Upload & Convert
- **Multiple Format Support**: PDF, TXT, EPUB, DOCX
- **Automatic Chapter Detection**: Smart text parsing and chapter splitting
- **Batch Processing**: Convert entire books at once

### AI Narration
- **Natural Voices**: Multiple high-quality AI voices
- **Voice Selection**: Choose from various voice styles and accents
- **Consistent Quality**: Professional narration throughout

### Playback & Management
- **Chapter Navigation**: Skip between chapters easily
- **Progress Tracking**: Resume where you left off
- **Download Chapters**: Save individual chapters for offline listening
- **Share Audiobooks**: Share your creations with friends

### Offline Support
- **Download Capability**: Save chapters for offline playback
- **Local Storage**: All audiobooks stored securely
- **No Streaming Required**: Listen anytime, anywhere

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

Required packages for audiobook features:
- `PyPDF2` - PDF text extraction
- `ebooklib` - EPUB support
- `beautifulsoup4` - HTML parsing
- `python-docx` - DOCX support

### 2. Start the Backend

```bash
cd backend
python main.py
```

The audiobook endpoints will be available at `http://localhost:8000`

### 3. Access the Feature

Navigate to the Audiobooks section in the frontend:
```
http://localhost:5173/audiobooks
```

## 📖 How to Use

### Uploading a Book

1. **Go to Audiobooks Page**: Click "Upload New" tab
2. **Choose Your File**: Drag & drop or browse for your file
   - Supported formats: PDF, TXT, EPUB, DOCX
   - Maximum size: 50MB
3. **Add Details** (optional):
   - Book title
   - Author name
   - Preferred voice
4. **Upload**: Click "Create Audiobook"
5. **Processing**: The system will:
   - Extract text from your file
   - Split into chapters
   - Generate audio for each chapter

### Listening to Audiobooks

1. **Browse Library**: View all your audiobooks
2. **Select Book**: Click on any completed audiobook
3. **Player Controls**:
   - Play/Pause
   - Skip chapters
   - Adjust volume
   - View chapter list
4. **Download**: Save chapters for offline listening
5. **Share**: Share audiobooks with friends

## 🎯 API Endpoints

### Upload Audiobook
```http
POST /audiobook/upload
Content-Type: multipart/form-data

Parameters:
- file: File (required)
- title: string (optional)
- author: string (optional)
- voice: string (default: "lisa")
```

### Start Processing
```http
POST /audiobook/{audiobook_id}/process
```

### Get Audiobook Details
```http
GET /audiobook/{audiobook_id}
```

### Get User Library
```http
GET /audiobook/library
```

### Get Chapter Audio
```http
GET /audiobook/{audiobook_id}/chapter/{chapter_number}
```

### Delete Audiobook
```http
DELETE /audiobook/{audiobook_id}
```

## 🎤 Available Voices

### Female Voices
- **Lisa** - Natural, expressive (Azure Neural)
- **Jenny** - Friendly, warm (Azure Neural)
- **Aria** - Professional, clear (Azure Neural)
- **Emma** - British, clear (Google)
- **Mary** - American, natural (Google)
- **Sarah** - Australian, friendly (Google)

### Male Voices
- **Guy** - Energetic, modern (Azure Neural)
- **Tony** - Professional, news (Azure Neural)
- **John** - British, professional (Google)
- **David** - American, deep (Google)

## 📁 File Formats

### Supported Formats

#### PDF (.pdf)
- Text-based PDFs work best
- Scanned PDFs may have limited support
- Preserves basic formatting

#### Plain Text (.txt)
- Simple and reliable
- Best for plain novels
- UTF-8 encoding recommended

#### EPUB (.epub)
- Full ebook support
- Preserves chapter structure
- Handles metadata

#### Microsoft Word (.docx, .doc)
- Full document support
- Preserves formatting
- Chapter markers detected

## ⚙️ Configuration

### Chapter Detection

The system automatically detects chapters using:
- "Chapter X" markers
- "PART X" markers
- All-caps headings
- Paragraph breaks

Default settings:
- Max characters per chapter: 5000
- Minimum chapter length: 100 characters

### Voice Settings

Configure in your upload:
```javascript
{
  "voice": "lisa",  // Voice name
  "speed": 1.0,     // Speech speed (0.5-2.0)
  "tone": "neutral" // neutral, calm, energetic
}
```

## 🔧 Advanced Features

### Custom Chapter Splitting

For better control, format your document with clear chapter markers:
```
Chapter 1: Introduction
[Your text here]

Chapter 2: The Journey Begins
[Your text here]
```

### Batch Processing

Upload multiple books and process them in parallel (coming soon).

### Voice Cloning

Use your own voice for narration (requires ElevenLabs API key).

## 📊 Processing Status

Audiobooks go through these states:

1. **Pending** - Uploaded, waiting to process
2. **Processing** - Converting text to audio
3. **Completed** - Ready to listen
4. **Failed** - Error occurred (check logs)

## 🐛 Troubleshooting

### Upload Fails
- Check file size (max 50MB)
- Verify file format is supported
- Ensure file is not corrupted

### Processing Stuck
- Check backend logs for errors
- Restart processing from the library
- Verify TTS service is running

### No Audio Output
- Check browser audio permissions
- Verify chapter was processed successfully
- Try downloading the chapter

### Poor Audio Quality
- Try a different voice
- Check original text quality
- Verify text extraction was successful

## 💡 Tips & Best Practices

### For Best Results

1. **Clean Text**: Remove headers, footers, page numbers
2. **Clear Chapters**: Use consistent chapter markers
3. **Format**: Well-formatted documents work best
4. **Length**: Split very long books into volumes
5. **Voice**: Test different voices for your content

### Performance

- Processing time: ~1 minute per 1000 words
- Larger books take longer to process
- Can process multiple books simultaneously

## 🔒 Privacy & Security

- All audiobooks are private to your account
- Files are stored securely on the server
- Audio files are encrypted
- No data is shared with third parties

## 📈 Limitations

### Free Tier
- File size: 50MB maximum
- Processing: 5 books per day
- Storage: 1GB total

### File Compatibility
- Scanned PDFs require OCR (not included)
- Image-heavy documents may have issues
- Complex formatting may be simplified

## 🚀 Future Enhancements

Coming soon:
- [ ] Multiple language support
- [ ] Voice cloning with personal voice
- [ ] Background music and sound effects
- [ ] Emotion-based narration
- [ ] Collaborative audiobooks
- [ ] Public audiobook sharing
- [ ] Mobile app with offline sync
- [ ] Speed adjustment during playback
- [ ] Bookmarks and notes
- [ ] Sleep timer

## 🤝 Contributing

Have ideas for improving the audiobook feature? We'd love to hear them!

## 📄 License

Part of Lumino AI - All rights reserved

## 🆘 Support

Need help? 
- Check the troubleshooting section above
- Contact support: support@lumino-ai.com
- Join our Discord community

---

**Enjoy your audiobooks! 🎧📚**
