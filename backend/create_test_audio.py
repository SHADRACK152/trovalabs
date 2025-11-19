from pydub.generators import Sine
from pydub import AudioSegment

seg = Sine(440).to_audio_segment(duration=1500)
seg = seg - 10
seg.export('test_audio.webm', format='webm')
print('Created test_audio.webm')
