import React, { useState, useRef, useEffect } from 'react';
import { Mic, Upload, Volume2, AlertCircle } from 'lucide-react';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [textToRead, setTextToRead] = useState('');
  const mediaRecorder = useRef(null);

  const staticTexts = [
    "Hi the address is 2345 newyork.",
    "The verification number is 67890.",
    "Please say the following: I am floting under the water like 1900 titanic",
    "Hi my name is naruto i have 3790 money.",
    "Speak this number: 12235 clearly.",
    "The digits you need for your password are 44556.",
    "Say cheeese 7353 cheese.",
    "The mall is good it is loctaed on 1484 street.",
    "Hi i am good my birthday is in 2074 days",
    "Your lucky numbers are 1820 .",
    "The payment amount is 5500 dollars",
    "The package tracking number is 55567.",
    "The flight number is 7834 departing tomorrow.",
    "Please give me 4567 for the deposit.",
    "My friend's phone number is 6825.",
    "The competition number is 2134.",
    "I will arrive at 1234 Pine Road."
  ];

  useEffect(() => {
    // Randomly select a text from the staticTexts array
    const randomText = staticTexts[Math.floor(Math.random() * staticTexts.length)];
    setTextToRead(randomText);

    // Fetch the text to read from the API when the component mounts
    // const fetchTextToRead = async () => {
    //   try {
    //     const response = await fetch('https://your-domain.com/api/get-text');
    //     const data = await response.json();
    //     setTextToRead(data.text);
    //   } catch (error) {
    //     console.error('Error fetching text to read:', error);
    //   }
    // };

    // fetchTextToRead();
  }, []);

  const startRecording = async () => {
    try {
      if (typeof window === 'undefined' || !window.navigator) {
        throw new Error('Recording is not supported in this environment');
      }

      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        throw new Error('Microphone access requires HTTPS');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.current.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        const webmBlob = new Blob(chunks, { type: 'audio/webm' });
        const wavBlob = await convertToWav(webmBlob);
        setAudioBlob(wavBlob);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert(err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const convertToWav = async (webmBlob) => {
    const audioContext = new AudioContext();
    const arrayBuffer = await webmBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const wavBuffer = audioBufferToWav(audioBuffer);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  };

  const audioBufferToWav = (audioBuffer) => {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const data = audioBuffer.getChannelData(0);
    const samples = new Int16Array(data.length);

    for (let i = 0; i < data.length; i++) {
      const s = Math.max(-1, Math.min(1, data[i]));
      samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    const wavBuffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(wavBuffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    const offset = 44;
    for (let i = 0; i < samples.length; i++) {
      view.setInt16(offset + i * 2, samples[i], true);
    }

    return wavBuffer;
  };

  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const analyzeAudio = async () => {
    if (!audioBlob) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');
    formData.append('text', textToRead);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/analyze/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.error) {
        console.error('Analysis error:', result.error);
        return;
      }
      setAnalysis(result);
    } catch (err) {
      console.error('Error analyzing audio:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl w-full mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center justify-center gap-3">
            <Volume2 className="w-8 h-8 text-indigo-600" />
            Speech Analysis App
          </h1>

          <div className="space-y-6">
            <div className="text-lg text-gray-700 mb-4">
              <p>Please read the following text:</p>
              <p className="font-semibold">{textToRead}</p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-4 rounded-full ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                } text-white transition-colors`}
              >
                <Mic className={`w-6 h-6 ${isRecording ? 'animate-pulse' : ''}`} />
              </button>
            </div>

            {audioBlob && (
              <div className="space-y-4">
                <audio controls className="w-full">
                  <source src={URL.createObjectURL(audioBlob)} type="audio/wav" />
                </audio>

                <button
                  onClick={analyzeAudio}
                  disabled={isLoading}
                  className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  {isLoading ? 'Analyzing...' : 'Analyze Audio'}
                </button>
              </div>
            )}

            {analysis && (
              <div className="mt-6 space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-3 justify-center">
                  <AlertCircle className={`w-5 h-5 mt-1 ${
                    analysis.quality_assessment === 'Good' ? 'text-green-500' : 'text-red-500'
                  }`} />
                  <div>
                    <h3 className="font-semibold text-gray-800">Quality Assessment</h3>
                    <p className={`text-sm ${
                      analysis.quality_assessment === 'Good' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {analysis.quality_assessment}
                      {analysis.noise_level && ` (Noise Level: ${analysis.noise_level.toFixed(3)})`}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Transcription</h3>
                  <p className="text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                    {analysis.transcription}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Noisy</h3>
                  <p className="text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                    {analysis.is_noisy ? 'Yes' : 'No'}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Result</h3>
                  <p className="text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                    {analysis.result}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;