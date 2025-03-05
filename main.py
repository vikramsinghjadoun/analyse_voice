from fastapi import FastAPI, File, UploadFile, Form
from pydub import AudioSegment
import whisper
import tempfile
import numpy as np
import re
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = whisper.load_model("base")

def convert_to_wav(file: UploadFile):
    audio = AudioSegment.from_file(file.file)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_wav:
        audio.export(temp_wav.name, format="wav")
        return temp_wav.name

def analyze_noise(audio_path: str):
    audio = AudioSegment.from_wav(audio_path)
    samples = np.array(audio.get_array_of_samples())
    rms = np.sqrt(np.mean(samples**2))
    max_rms = np.sqrt(np.mean((np.iinfo(samples.dtype).max)**2))
    noise_level = rms / max_rms
    return noise_level

def extract_numbers(text: str):
    return re.findall(r'\d+', text)

@app.post("/analyze")
async def analyze_audio(file: UploadFile = File(...), text: str = Form(...)):
    wav_path = convert_to_wav(file)
    result = model.transcribe(wav_path)
    transcription = result["text"]
    noise_level = analyze_noise(wav_path)
    is_noisy = noise_level > 0.5  

    if is_noisy:
        return {
            "transcription": transcription,
            "noise_level": float(noise_level),  
            "is_noisy": bool(is_noisy),  
            "quality_assessment": "Noisy",
            "result": "Audio is noisy. Please go to a quieter environment and record again."
        }

    expected_numbers = extract_numbers(text)
    transcribed_numbers = extract_numbers(transcription)

    if expected_numbers != transcribed_numbers:
        return {
            "transcription": transcription,
            "noise_level": float(noise_level),  
            "is_noisy": bool(is_noisy),  
            "quality_assessment": "Good",
            "result": "voice liveness failed."
        }

    return {
        "transcription": transcription,
        "noise_level": float(noise_level),  
        "is_noisy": bool(is_noisy),  
        "quality_assessment": "Good",
        "result": "You are cleared. No noise detected. You pass."
    }