from gtts import gTTS
from pydub import AudioSegment

text = "Hello world. This is a test for speech recognition. Please transcribe this sentence."
tts = gTTS(text=text, lang='en')
mp3_path = 'speech_test.mp3'
webm_path = 'speech_test.webm'
tts.save(mp3_path)
# Convert mp3 to webm using pydub
segment = AudioSegment.from_mp3(mp3_path)
segment.export(webm_path, format='webm')
print('Created speech_test.webm')
