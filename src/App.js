import React, { useState, useRef } from 'react';
import { Mic, Upload, Volume2, AlertCircle } from 'lucide-react';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const mediaRecorder = useRef(null);
  console.log(analysis, "analysis");

  const startRecording = async () => {
    try {
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

  function audioBufferToWav(audioBuffer) {
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
  }

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  const analyzeAudio = async () => {
    if (!audioBlob) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');

    try {
      const response = await fetch('http://localhost:8000/analyze/', {
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8 animate-gradient bg-[size:400%_400%]">
      <div className="relative max-w-2xl mx-auto">
        <div className="absolute -top-10 -left-10 w-20 h-20 bg-yellow-300 rounded-full opacity-50 animate-float"></div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-300 rounded-full opacity-50 animate-float" style={{ animationDelay: '2s' }}></div>
        
        <div className="relative bg-white border-4 border-black rounded-lg shadow-brutal transform hover:shadow-brutal-2 hover:-translate-y-1 transition-all p-8">
          <div className="relative mb-8">
            <h1 className="text-5xl font-black text-black flex items-center justify-center gap-3 py-4">
              <Volume2 className="w-12 h-12 text-blue-600 animate-wiggle" />
              <span className="relative">
                <span className="bg-blue-400 px-6 py-3 border-2 border-black inline-block transform hover:translate-x-1 hover:-translate-y-1 transition-transform">
                  Voice Analyzer
                </span>
                <span className="absolute top-0 left-0 bg-red-400 px-6 py-3 border-2 border-black inline-block opacity-20 transform translate-x-1 -translate-y-1">
                  Voice Analyzer
                </span>
              </span>
            </h1>
          </div>

          <div className="space-y-8">
            <div className="flex justify-center">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-6 rounded-lg border-4 border-black transform active:translate-y-1 transition-transform
                  ${isRecording 
                    ? 'bg-red-400 hover:bg-red-500' 
                    : 'bg-blue-400 hover:bg-blue-500'
                  } shadow-brutal`}
              >
                <Mic className={`w-8 h-8 text-black ${isRecording ? 'animate-pulse' : ''}`} />
              </button>
            </div>

            {audioBlob && (
              <div className="space-y-4 animate-slide-in">
                <div className="p-4 bg-pink-200 border-2 border-black rounded-lg">
                  <audio controls className="w-full">
                    <source src={URL.createObjectURL(audioBlob)} type="audio/wav" />
                  </audio>
                </div>

                <button
                  onClick={analyzeAudio}
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-green-400 text-black font-bold rounded-lg 
                    border-4 border-black shadow-brutal transform hover:shadow-brutal-2 
                    hover:-translate-y-1 transition-all disabled:opacity-50 
                    disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Upload className="w-6 h-6" />
                  {isLoading ? 'Analyzing...' : 'Analyze Audio'}
                </button>
              </div>
            )}

            {analysis && (
              <div className="space-y-4 animate-slide-in">
                <div className="bg-white border-4 border-black rounded-lg p-6 shadow-brutal">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className={`w-6 h-6 mt-1 ${
                      analysis.quality_assessment === 'Good' ? 'text-green-500' : 'text-yellow-500'
                    }`} />
                    <div>
                      <h3 className="font-bold text-lg">Quality Assessment</h3>
                      <p className={`text-lg ${
                        analysis.quality_assessment === 'Good' ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {analysis.quality_assessment}
                        {analysis.noise_level && ` (Noise Level: ${analysis.noise_level.toFixed(3)})`}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-blue-100 border-2 border-black p-4 rounded-lg">
                      <h3 className="font-bold mb-2">Transcription</h3>
                      <p className="text-gray-800">{analysis.transcription}</p>
                    </div>

                    <div className="bg-green-100 border-2 border-black p-4 rounded-lg">
                      <h3 className="font-bold mb-2">Noise Detection</h3>
                      <p className="text-gray-800">
                        {analysis.is_noisy ? '🔊 Noisy' : '🎯 Clean'}
                      </p>
                    </div>
                  </div>
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