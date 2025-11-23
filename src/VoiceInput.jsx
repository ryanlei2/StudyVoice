"use client"

import { useState, useRef } from "react"

const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY

export default function VoiceInput({ onSubmit, loading }) {
  const [transcript, setTranscript] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const recognitionRef = useRef(null)
  const fileInputRef = useRef(null)

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.')
      return
    }

    try {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = ""
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " "
          }
        }
        
        if (finalTranscript) {
          setTranscript((prev) => prev + finalTranscript)
        }
      }

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
        if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please allow microphone access and try again.')
        } else if (event.error === 'no-speech') {
          alert('No speech detected. Please try speaking again.')
        }
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current.start()
      setIsListening(true)
    } catch (error) {
      console.error('Failed to start speech recognition:', error)
      alert('Failed to start speech recognition. Please check your microphone permissions.')
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  // Handle file upload (audio, PDF, images, text)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setIsProcessing(true)
    const fileType = file.type

    try {
      // Handle text files
      if (fileType === "text/plain") {
        const text = await file.text()
        setTranscript((prev) => prev + text)
        setIsProcessing(false)
        return
      }

      // Handle images (PNG, JPG, etc.)
      if (fileType.startsWith("image/")) {
        const base64 = await fileToBase64(file)
        const text = await extractTextFromImage(base64, fileType)
        setTranscript((prev) => prev + text)
        setIsProcessing(false)
        return
      }

      // Handle PDFs
      if (fileType === "application/pdf") {
        const base64 = await fileToBase64(file)
        const text = await extractTextFromPDF(base64)
        setTranscript((prev) => prev + text)
        setIsProcessing(false)
        return
      }

      alert("Unsupported file type. Please use: .txt, .pdf, or images.")
      setIsProcessing(false)
    } catch (error) {
      console.error("File processing error:", error)
      alert("Error processing file. Please try again.")
      setIsProcessing(false)
    }
  }

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result.split(",")[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Extract text from images using Claude Vision
  const extractTextFromImage = async (base64Data, mediaType) => {
    const response = await fetch("/api/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: "text",
                text: "Extract all text from this image. Return ONLY the extracted text, nothing else.",
              },
            ],
          },
        ],
      }),
    })

    const data = await response.json()
    return data.content[0].text
  }

  // Extract text from PDFs using Claude
  const extractTextFromPDF = async (base64Data) => {
    const response = await fetch("/api/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64Data,
                },
              },
              {
                type: "text",
                text: "Extract all text from this PDF. Return ONLY the extracted text, nothing else.",
              },
            ],
          },
        ],
      }),
    })

    const data = await response.json()
    return data.content[0].text
  }

  const handleSubmit = () => {
    if (transcript.trim()) {
      onSubmit(transcript)
      setTranscript("")
    }
  }

  const handleClear = () => {
    setTranscript("")
  }

  return (
    <div className="space-y-4">
      {/* Transcript Display */}
      <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 min-h-[150px] max-h-[300px] overflow-y-auto">
        <p className="text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wider">Your Explanation:</p>
        <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
          {transcript || (
            <span className="text-slate-500 italic">
              Click the microphone to start speaking, or upload reference material...
            </span>
          )}
        </p>
      </div>

      {/* Main Controls */}
      <div className="flex gap-3 items-center">
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
          className="flex-1 voice-btn bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 disabled:opacity-50 text-white transition-colors flex items-center justify-center gap-2"
        >
          📎 {isProcessing ? "Processing..." : "Upload"}
        </button>

        {!isListening ? (
          <button
            onClick={startListening}
            disabled={isProcessing || loading}
            className="flex-1 voice-btn bg-red-600 hover:bg-red-500 disabled:bg-slate-600 disabled:opacity-50 text-white"
          >
            🎤 Speak
          </button>
        ) : (
          <button
            onClick={stopListening}
            className="flex-1 voice-btn bg-yellow-500 hover:bg-yellow-400 text-slate-900"
          >
            ⏸️ Stop
          </button>
        )}

        <button
          onClick={handleSubmit}
          disabled={!transcript.trim() || loading || isProcessing || isListening}
          className="flex-1 submit-btn bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:opacity-50 text-white transition-all flex items-center justify-center gap-2"
        >
          {loading ? "⏳ Evaluating..." : "✓ Submit"}
        </button>
      </div>

      {/* Clear Button */}
      {transcript && (
        <button
          onClick={handleClear}
          disabled={loading || isProcessing}
          className="w-full clear-btn bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 transition-colors flex items-center justify-center gap-2"
        >
          🗑️ Clear Text
        </button>
      )}
    </div>
  )
}
