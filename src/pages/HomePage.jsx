import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import VoiceInput from "../VoiceInput"
import Progress from "../Progress"
import Auth from "../components/Auth"

const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY

const HomePage = forwardRef(({ onUserChange, user: parentUser }, ref) => {
  const [user, setUser] = useState(null)
  const [topics, setTopics] = useState([])
  const [currentTopic, setCurrentTopic] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (parentUser) {
      setUser(parentUser)
      loadTopics(parentUser.token)
    } else {
      setUser(null)
      setTopics([])
      setCurrentTopic(null)
    }
  }, [parentUser])

  useImperativeHandle(ref, () => ({
    goToTopics: () => {
      setCurrentTopic(null)
    }
  }), [])

  const handleLogin = (token, email) => {
    const userData = { token, email }
    setUser(userData)
    onUserChange?.(userData)
    loadTopics(token)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userEmail')
    setUser(null)
    setTopics([])
    onUserChange?.(null)
  }

  const loadTopics = async (token) => {
    try {
      const response = await fetch('http://localhost:3001/api/topics', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setTopics(data.topics)
      }
    } catch (error) {
      console.error('Failed to load topics:', error)
    }
  }

  const saveTopics = async (newTopics) => {
    if (!user) return
    try {
      await fetch('http://localhost:3001/api/topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ topics: newTopics })
      })
    } catch (error) {
      console.error('Failed to save topics:', error)
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

  // Extract text from PDF using pdf-parse
  const extractTextFromPDF = async (base64Data) => {
    const response = await fetch("http://localhost:3001/api/parse-pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64Data }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`PDF parsing error: ${errorData.error || "Unknown error"}`)
    }

    const data = await response.json()
    return data.text
  }

  // Extract text from images using Claude Vision
  const extractTextFromImage = async (base64Data, mediaType) => {
    const response = await fetch("http://localhost:3001/api/claude", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
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

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`API Error: ${errorData.error?.message || "Unknown error"}`)
    }

    const data = await response.json()
    return data.content[0].text
  }

  // Upload file and extract topics
  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!CLAUDE_API_KEY) {
      alert("API Key not found! Please add VITE_CLAUDE_API_KEY to your .env file")
      return
    }

    setLoading(true)
    setError(null)
    const fileType = file.type
    let extractedText = ""

    try {
      if (fileType === "text/plain") {
        extractedText = await file.text()
      } else if (fileType === "application/pdf") {
        const base64 = await fileToBase64(file)
        extractedText = await extractTextFromPDF(base64)
      } else if (fileType.startsWith("image/")) {
        const base64 = await fileToBase64(file)
        extractedText = await extractTextFromImage(base64, fileType)
      } else {
        throw new Error(`Unsupported file type: ${fileType}`)
      }

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error("No text could be extracted from the file")
      }

      const response = await fetch("http://localhost:3001/api/claude", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 2048,
          messages: [
            {
              role: "user",
              content: `You must respond with ONLY valid JSON. Extract exactly 5 key topics from this text and return them as a JSON array. If the text has fewer distinct topics, create subtopics or related concepts to reach 5 topics.

Format: [{"name": "Topic Name", "description": "Brief description"}]

Do not include any other text, explanations, or markdown formatting. Only return the JSON array with exactly 5 topics.

Text: ${extractedText.slice(0, 10000)}`,
            },
          ],
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`API Error: ${errorData.error?.message || "Unknown error"}`)
      }

      const data = await response.json()
      let jsonText = data.content[0].text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim()

      console.log("Raw Claude response:", jsonText)
      
      // Try to find JSON in the response
      let jsonMatch = jsonText.match(/\[.*\]/s)
      if (jsonMatch) {
        jsonText = jsonMatch[0]
      }
      
      const extractedTopics = JSON.parse(jsonText)
      const topicsWithScores = extractedTopics.map((t) => ({
        ...t,
        mastery: 0,
        fullText: extractedText,
      }))

      setTopics(topicsWithScores)
      saveTopics(topicsWithScores)
      setLoading(false)
      setError(null)
    } catch (error) {
      setError(error.message)
      setLoading(false)
      alert(`Error: ${error.message}`)
    }
  }

  // Evaluate spoken explanation
  const handleEvaluation = async (transcript) => {
    if (!CLAUDE_API_KEY) {
      alert("API Key not found! Please add VITE_CLAUDE_API_KEY to your .env file")
      return
    }

    setLoading(true)

    try {
      const cleanTranscript = transcript.replace(/"/g, '\"').replace(/\n/g, ' ')
      
      const response = await fetch("http://localhost:3001/api/claude", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 2048,
          messages: [
            {
              role: "user",
              content: `You are a Socratic tutor evaluating a student's understanding of "${currentTopic.name}".

CONTEXT FROM STUDY MATERIAL:
${currentTopic.fullText ? currentTopic.fullText.slice(0, 3000) : currentTopic.description}

TOPIC: ${currentTopic.name}
DESCRIPTION: ${currentTopic.description}

STUDENT'S EXPLANATION:
"${cleanTranscript}"

Evaluate their understanding and return JSON in this exact format:
{
  "score": 0-100,
  "feedback": "Detailed feedback on what they got right and wrong",
  "followup": "If score > 85: challenging question. If 60-85: clarifying question. If < 60: hint and ask to re-explain"
}

Be encouraging but honest. Point out misconceptions and missing concepts.`,
            },
          ],
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`API Error: ${errorData.error?.message || "Unknown error"}`)
      }

      const data = await response.json()
      let jsonText = data.content[0].text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim()

      const evaluation = JSON.parse(jsonText)
      const updatedTopics = topics.map((t) => 
        t.name === currentTopic.name 
          ? { ...t, mastery: Math.max(t.mastery, evaluation.score) } 
          : t
      )
      setTopics(updatedTopics)
      saveTopics(updatedTopics)

      setLoading(false)
      alert(`Score: ${evaluation.score}/100\n\n${evaluation.feedback}\n\n${evaluation.followup}`)
    } catch (error) {
      alert(`Error: ${error.message}`)
      setLoading(false)
    }
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />
  }

  return (
    <>
      {/* Upload Section */}
      {topics.length === 0 && (
        <div className="upload-container">
          <div className="w-full max-w-md">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold mb-3">Upload Study Material</h2>
              <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                Supports PDF, Images (PNG, JPG), or Text files. Upload your materials and start learning with AI-powered
                evaluation.
              </p>

              <div className="mb-6 p-4 bg-slate-700/50 border border-slate-600 rounded-lg">
                <p className="text-xs font-medium text-slate-300 flex items-center gap-2">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${CLAUDE_API_KEY ? "bg-green-400" : "bg-red-400"}`}
                  />
                  API Key: {CLAUDE_API_KEY ? "✓ Connected" : "✗ Missing"}
                </p>
                {!CLAUDE_API_KEY && (
                  <p className="text-xs text-red-400 mt-2 leading-relaxed">
                    Add VITE_CLAUDE_API_KEY to your .env file and restart the server
                  </p>
                )}
              </div>

              <input
                type="file"
                accept=".txt,.pdf,.png,.jpg,.jpeg,.gif,.webp"
                onChange={handleUpload}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-300 cursor-pointer hover:bg-slate-600 hover:border-slate-500 transition-colors file:hidden"
              />

              <p className="text-xs text-slate-400 mt-3 text-center">Choose a file or drag and drop</p>

              {loading && (
                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-300 text-sm font-medium animate-pulse flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    Processing file...
                  </p>
                  <p className="text-xs text-slate-400 mt-2">This may take a moment for PDFs and images</p>
                </div>
              )}

              {error && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-300 text-sm">❌ {error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Topics Grid */}
      {topics.length > 0 && !currentTopic && (
        <div className="topics-section">
          <div className="topics-header">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="topics-title">Your Study Topics</h2>
                <p className="topics-subtitle">Select a topic to begin your learning session</p>
              </div>
              <button
                onClick={() => {
                  setTopics([])
                  setError(null)
                  saveTopics([])
                }}
                className="upload-new-btn"
              >
                Upload New File
              </button>
            </div>
          </div>
          <div className="topics-grid">
            {topics.map((topic, idx) => (
              <div
                key={idx}
                onClick={() => setCurrentTopic(topic)}
                className="topic-card"
              >
                <h3 className="topic-card-title">{topic.name}</h3>
                <p className="topic-card-description">{topic.description}</p>
                <Progress score={topic.mastery} />
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Study Session */}
        {currentTopic && (
          <div className="study-session">
            <button
              onClick={() => setCurrentTopic(null)}
              className="back-button"
            >
              ← Back to Topics
            </button>

            <div className="study-card">
              <div className="study-header">
                <h2 className="study-title">{currentTopic.name}</h2>
                <p className="study-description">{currentTopic.description}</p>
              </div>

              <VoiceInput onSubmit={handleEvaluation} loading={loading} />
            </div>
          </div>
        )}
      </main>
    </>
  )
})

export default HomePage