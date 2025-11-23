import { useState, useRef } from 'react';

const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY;

export default function VoiceInput({ onSubmit, loading }) {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

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

  // Handle file upload (audio, PDF, images, text)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    const fileType = file.type;

    try {
      // Handle text files
      if (fileType === 'text/plain') {
        const text = await file.text();
        setTranscript(prev => prev + text);
        setIsProcessing(false);
        return;
      }

      // Handle images (PNG, JPG, etc.)
      if (fileType.startsWith('image/')) {
        const base64 = await fileToBase64(file);
        const text = await extractTextFromImage(base64, fileType);
        setTranscript(prev => prev + text);
        setIsProcessing(false);
        return;
      }

      // Handle PDFs
      if (fileType === 'application/pdf') {
        const base64 = await fileToBase64(file);
        const text = await extractTextFromPDF(base64);
        setTranscript(prev => prev + text);
        setIsProcessing(false);
        return;
      }

      alert('Unsupported file type. Please use: .txt, .pdf, or images.');
      setIsProcessing(false);
    } catch (error) {
      console.error('File processing error:', error);
      alert('Error processing file. Please try again.');
      setIsProcessing(false);
    }
  };

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Extract text from images using Claude Vision
  const extractTextFromImage = async (base64Data, mediaType) => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data
              }
            },
            {
              type: 'text',
              text: 'Extract all text from this image. Return ONLY the extracted text, nothing else.'
            }
          ]
        }]
      })
    });

    const data = await response.json();
    return data.content[0].text;
  };

  // Extract text from PDFs using Claude
  const extractTextFromPDF = async (base64Data) => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Data
              }
            },
            {
              type: 'text',
              text: 'Extract all text from this PDF. Return ONLY the extracted text, nothing else.'
            }
          ]
        }]
      })
    });

    const data = await response.json();
    return data.content[0].text;
  };

  const handleSubmit = () => {
    if (transcript.trim()) {
      onSubmit(transcript);
      setTranscript('');
    }
  };

  const handleClear = () => {
    setTranscript('');
  };

  return (
    <div className="w-full max-w-2xl space-y-6" style={{margin: '0 auto', textAlign: 'center'}}>
      {/* Transcript Display */}
      <div className="bg-gray-50 border border-gray-300 p-6 rounded-xl min-h-[200px] max-h-[400px] overflow-y-auto">
        <div className="flex items-center mb-3">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
          <p className="text-lg font-medium text-gray-700">Your Explanation</p>
        </div>
        <div className="text-gray-900 leading-relaxed text-lg">
          {transcript ? (
            <p className="whitespace-pre-wrap">{transcript}</p>
          ) : (
            <p className="text-gray-500 italic text-lg">
              Click the microphone to start speaking, or upload additional reference material...
            </p>
          )}
        </div>
      </div>

      {/* File Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.pdf,.png,.jpg,.jpeg,.gif,.webp"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing || loading}
          className="w-full bg-purple-600 hover:bg-purple-700 p-4 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none shadow-lg text-white"
          style={{background: 'linear-gradient(45deg, #8b5cf6, #ec4899)'}}
        >
          {isProcessing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              📄 Processing File...
            </div>
          ) : (
            '📎 Add Reference Material (PDF, Image, Text)'
          )}
        </button>
      </div>

      {/* Voice Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {!isListening ? (
          <button
            onClick={startListening}
            disabled={isProcessing || loading}
            className="bg-red-600 hover:bg-red-700 p-4 rounded-xl text-xl font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none shadow-lg flex items-center justify-center text-white"
            style={{background: 'linear-gradient(45deg, #ef4444, #dc2626)'}}
          >
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Start Speaking
          </button>
        ) : (
          <button
            onClick={stopListening}
            className="bg-yellow-600 hover:bg-yellow-700 p-4 rounded-xl text-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center animate-pulse text-white"
            style={{background: 'linear-gradient(45deg, #eab308, #f97316)'}}
          >
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Stop Recording
          </button>
        )}

        <button
          onClick={handleSubmit}
          disabled={!transcript || loading || isProcessing}
          className="bg-green-600 hover:bg-green-700 p-4 rounded-xl text-xl font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none shadow-lg flex items-center justify-center text-white"
          style={{background: 'linear-gradient(45deg, #22c55e, #10b981)'}}
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              Evaluating...
            </div>
          ) : (
            <>
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Submit
            </>
          )}
        </button>
      </div>

      {/* Clear Button */}
      {transcript && (
        <button
          onClick={handleClear}
          disabled={loading || isProcessing}
          className="w-full bg-gray-200 hover:bg-gray-300 border border-gray-300 p-3 rounded-xl text-lg font-medium transition-all duration-300 disabled:opacity-50 flex items-center justify-center text-gray-900"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear Text
        </button>
      )}
    </div>
  );
}