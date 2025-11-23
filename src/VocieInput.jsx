import { useState, useRef } from 'react';

export default function VoiceInput({ onSubmit, loading }) {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onresult = (event) => {
      let finalTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      setTranscript(prev => prev + finalTranscript);
    };

    recognitionRef.current.start();
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleSubmit = () => {
    if (transcript.trim()) {
      onSubmit(transcript);
      setTranscript('');
    }
  };

  return (
    <div>
      <div className="bg-gray-700 p-4 rounded mb-4 min-h-[150px]">
        <p className="text-sm text-gray-400 mb-2">Your Explanation:</p>
        <p>{transcript || 'Click the microphone to start speaking...'}</p>
      </div>

      <div className="flex gap-4">
        {!isListening ? (
          <button 
            onClick={startListening}
            className="flex-1 bg-red-600 hover:bg-red-700 p-4 rounded-lg text-xl"
          >
            🎤 Start Speaking
          </button>
        ) : (
          <button 
            onClick={stopListening}
            className="flex-1 bg-yellow-600 hover:bg-yellow-700 p-4 rounded-lg text-xl"
          >
            ⏸️ Stop Recording
          </button>
        )}

        <button 
          onClick={handleSubmit}
          disabled={!transcript || loading}
          className="flex-1 bg-green-600 hover:bg-green-700 p-4 rounded-lg text-xl disabled:opacity-50"
        >
          {loading ? 'Evaluating...' : '✅ Submit'}
        </button>
      </div>
    </div>
  );
}