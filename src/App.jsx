import { useState } from 'react';
import VoiceInput from './VoiceInput';
import Progress from './Progress';

const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY;

export default function App() {
  const [topics, setTopics] = useState([]);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [loading, setLoading] = useState(false);

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

  // Extract text from PDF using Claude
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
              text: 'Extract all text from this PDF document. Return ONLY the extracted text, nothing else.'
            }
          ]
        }]
      })
    });

    const data = await response.json();
    return data.content[0].text;
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

  // Upload file and extract topics
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const fileType = file.type;
    let extractedText = '';

    try {
      // Handle text files
      if (fileType === 'text/plain') {
        extractedText = await file.text();
      }
      // Handle PDFs
      else if (fileType === 'application/pdf') {
        const base64 = await fileToBase64(file);
        extractedText = await extractTextFromPDF(base64);
      }
      // Handle images
      else if (fileType.startsWith('image/')) {
        const base64 = await fileToBase64(file);
        extractedText = await extractTextFromImage(base64, fileType);
      }
      else {
        alert('Unsupported file type. Please upload .txt, .pdf, or image files.');
        setLoading(false);
        return;
      }

      // Call Claude to extract topics from the text
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
            content: `Extract 3-5 key topics from this text. Return ONLY a JSON array like: 
            [{"name": "Topic 1", "description": "brief description"}, {"name": "Topic 2", "description": "brief description"}]
            
            Text: ${extractedText.slice(0, 10000)}`
          }]
        })
      });

      const data = await response.json();
      
      // Parse JSON response - handle potential markdown code blocks
      let jsonText = data.content[0].text;
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const extractedTopics = JSON.parse(jsonText);
      
      // Add mastery scores and store full text with each topic
      const topicsWithScores = extractedTopics.map(t => ({ 
        ...t, 
        mastery: 0,
        fullText: extractedText // Store for context during evaluation
      }));
      
      setTopics(topicsWithScores);
      localStorage.setItem('topics', JSON.stringify(topicsWithScores));
      setLoading(false);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please try again.');
      setLoading(false);
    }
  };

  // Evaluate spoken explanation
  const handleEvaluation = async (transcript) => {
    setLoading(true);

    try {
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
            content: `You are a Socratic tutor evaluating a student's understanding of "${currentTopic.name}".

CONTEXT FROM STUDY MATERIAL:
${currentTopic.fullText ? currentTopic.fullText.slice(0, 3000) : currentTopic.description}

TOPIC: ${currentTopic.name}
DESCRIPTION: ${currentTopic.description}

STUDENT'S EXPLANATION:
"${transcript}"

Evaluate their understanding and return JSON in this exact format:
{
  "score": 0-100,
  "feedback": "Detailed feedback on what they got right and wrong",
  "followup": "If score > 85: challenging question. If 60-85: clarifying question. If < 60: hint and ask to re-explain"
}

Be encouraging but honest. Point out misconceptions and missing concepts.`
          }]
        })
      });

      const data = await response.json();
      
      // Parse JSON response - handle potential markdown code blocks
      let jsonText = data.content[0].text;
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const evaluation = JSON.parse(jsonText);

      // Update mastery score
      const updatedTopics = topics.map(t => 
        t.name === currentTopic.name 
          ? { ...t, mastery: evaluation.score }
          : t
      );
      setTopics(updatedTopics);
      localStorage.setItem('topics', JSON.stringify(updatedTopics));
      
      setLoading(false);
      alert(`Score: ${evaluation.score}/100\n\n${evaluation.feedback}\n\n${evaluation.followup}`);
    } catch (error) {
      console.error('Evaluation error:', error);
      alert('Error evaluating response. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="w-full max-w-6xl">
          {/* Upload Section */}
          {topics.length === 0 && (
            <div className="max-w-lg mx-auto" style={{textAlign: 'center'}}>
            <div className="bg-white border border-gray-300 p-8 rounded-2xl shadow-lg" style={{margin: '0 auto'}}>
              <div className="text-center mb-6" style={{textAlign: 'center'}}>
                <h2 className="text-4xl font-semibold mb-2 text-gray-900" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>Upload Study Material</h2>
                <p className="text-xl text-gray-600" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>
                  Supports PDF, Images (PNG, JPG), or Text files
                </p>
              </div>
              
              <div className="relative" style={{textAlign: 'center'}}>
                <input 
                  type="file" 
                  accept=".txt,.pdf,.png,.jpg,.jpeg,.gif,.webp"
                  onChange={handleUpload}
                  className="w-full p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-gray-100 transition-all duration-300"
                />
              </div>
              
              {loading && (
                <div className="mt-6 text-center" style={{textAlign: 'center'}}>
                  <div className="inline-flex items-center px-4 py-2 bg-blue-100 rounded-full">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-blue-600 font-medium text-lg">Processing file...</span>
                  </div>
                  <p className="text-lg text-gray-500 mt-3">This may take a moment for PDFs and images</p>
                </div>
              )}
            </div>
            </div>
          )}

          {/* Topics Grid */}
          {topics.length > 0 && !currentTopic && (
            <div className="w-full">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-blue-600" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>
                  Select a Topic to Study
                </h2>
                <p className="text-gray-600 mt-1" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>Click on any topic to start your voice-based learning session</p>
              </div>
              <button
                onClick={() => {
                  setTopics([]);
                  localStorage.removeItem('topics');
                }}
                className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg text-white"
                style={{background: 'linear-gradient(45deg, #ef4444, #ec4899)'}}
              >
                📁 Upload New File
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topics.map((topic, idx) => (
                <div 
                  key={idx}
                  onClick={() => setCurrentTopic(topic)}
                  className="group bg-white border border-gray-300 p-6 rounded-2xl cursor-pointer hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
                      {topic.name}
                    </h3>
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-gray-300 mb-4 text-sm leading-relaxed">{topic.description}</p>
                  <Progress score={topic.mastery} />
                </div>
              ))}
            </div>
            </div>
          )}

          {/* Study Session */}
          {currentTopic && (
            <div className="max-w-3xl mx-auto">
            <div className="bg-white border border-gray-300 p-8 rounded-2xl shadow-lg">
              <button 
                onClick={() => setCurrentTopic(null)}
                className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6 transition-colors group"
              >
                <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Topics
              </button>
              
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold mb-2 text-blue-600" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>
                  {currentTopic.name}
                </h2>
                <p className="text-gray-600 leading-relaxed max-w-2xl mx-auto" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>
                  {currentTopic.description}
                </p>
              </div>
              
              <VoiceInput onSubmit={handleEvaluation} loading={loading} />
            </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}