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
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8 text-center">🎤 StudyVoice AI</h1>

      {/* Upload Section */}
      {topics.length === 0 && (
        <div className="max-w-md mx-auto bg-gray-800 p-8 rounded-lg">
          <h2 className="text-xl mb-4">Upload Study Material</h2>
          <p className="text-sm text-gray-400 mb-4">
            Supports: PDF, Images (PNG, JPG), or Text files
          </p>
          <input 
            type="file" 
            accept=".txt,.pdf,.png,.jpg,.jpeg,.gif,.webp"
            onChange={handleUpload}
            className="w-full p-2 bg-gray-700 rounded cursor-pointer"
          />
          {loading && (
            <div className="mt-4">
              <p className="text-blue-400 animate-pulse">Processing file...</p>
              <p className="text-sm text-gray-400 mt-2">This may take a moment for PDFs and images</p>
            </div>
          )}
        </div>
      )}

      {/* Topics Grid */}
      {topics.length > 0 && !currentTopic && (
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl">Select a Topic to Study:</h2>
            <button
              onClick={() => {
                setTopics([]);
                localStorage.removeItem('topics');
              }}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm"
            >
              Upload New File
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topics.map((topic, idx) => (
              <div 
                key={idx}
                onClick={() => setCurrentTopic(topic)}
                className="bg-gray-800 p-6 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
              >
                <h3 className="text-lg font-bold mb-2">{topic.name}</h3>
                <p className="text-sm text-gray-400 mb-3">{topic.description}</p>
                <Progress score={topic.mastery} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Study Session */}
      {currentTopic && (
        <div className="max-w-2xl mx-auto bg-gray-800 p-8 rounded-lg">
          <button 
            onClick={() => setCurrentTopic(null)}
            className="mb-4 text-blue-400 hover:text-blue-300"
          >
            ← Back to Topics
          </button>
          
          <h2 className="text-2xl mb-4">{currentTopic.name}</h2>
          <p className="mb-6 text-gray-400">{currentTopic.description}</p>
          
          <VoiceInput onSubmit={handleEvaluation} loading={loading} />
        </div>
      )}
    </div>
  );
}