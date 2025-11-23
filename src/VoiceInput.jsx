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
    <div>
      <div className="bg-gray-700 p-4 rounded mb-4 min-h-[150px] max-h-[300px] overflow-y-auto">
        <p className="text-sm text-gray-400 mb-2">Your Explanation:</p>
        <p className="whitespace-pre-wrap">
          {transcript || 'Click the microphone to start speaking, or upload additional reference material...'}
        </p>
      </div>

      {/* File Upload Button */}
      <div className="mb-4">
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
          className="w-full bg-purple-600 hover:bg-purple-700 p-3 rounded-lg disabled:opacity-50"
        >
          {isProcessing ? '📄 Processing File...' : '📎 Add Reference Material (PDF, Image, Text)'}
        </button>
      </div>

      <div className="flex gap-4">
        {!isListening ? (
          <button
            onClick={startListening}
            disabled={isProcessing || loading}
            className="flex-1 bg-red-600 hover:bg-red-700 p-4 rounded-lg text-xl disabled:opacity-50"
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
          disabled={!transcript || loading || isProcessing}
          className="flex-1 bg-green-600 hover:bg-green-700 p-4 rounded-lg text-xl disabled:opacity-50"
        >
          {loading ? 'Evaluating...' : '✅ Submit'}
        </button>
      </div>

      {transcript && (
        <button
          onClick={handleClear}
          disabled={loading || isProcessing}
          className="w-full mt-2 bg-gray-600 hover:bg-gray-500 p-2 rounded-lg text-sm disabled:opacity-50"
        >
          🗑️ Clear Text
        </button>
      )}
    </div>
  );
}