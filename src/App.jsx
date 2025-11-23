import { useState } from 'react';
import VoiceInput from './VoiceInput';
import Progress from './Progress';

const CLAUDE_API_KEY = 'YOUR_ANTHROPIC_KEY'; // Get from console.anthropic.com

export default function App() {
  const [topics, setTopics] = useState([]);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [loading, setLoading] = useState(false);

  // Upload PDF and extract topics
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result; // For simplicity, just use text files

      // Call Claude to extract topics
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: `Extract 3-5 key topics from this text. Return ONLY a JSON array like: 
            [{"name": "Topic 1", "description": "..."}, {"name": "Topic 2", "description": "..."}]
            
            Text: ${text.slice(0, 5000)}`
          }]
        })
      });

      const data = await response.json();
      const extractedTopics = JSON.parse(data.content[0].text);
      
      // Add mastery scores
      const topicsWithScores = extractedTopics.map(t => ({ ...t, mastery: 0 }));
      setTopics(topicsWithScores);
      localStorage.setItem('topics', JSON.stringify(topicsWithScores));
      setLoading(false);
    };

    reader.readAsText(file);
  };

  // Evaluate spoken explanation
  const handleEvaluation = async (transcript) => {
    setLoading(true);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Student is explaining "${currentTopic.name}". Evaluate their understanding.

Student's explanation: "${transcript}"

Return JSON: {"score": 0-100, "feedback": "your feedback", "followup": "next question or 'MASTERED' if score > 85"}`
        }]
      })
    });

    const data = await response.json();
    const evaluation = JSON.parse(data.content[0].text);

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
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8 text-center">🎤 StudyVoice AI</h1>

      {/* Upload Section */}
      {topics.length === 0 && (
        <div className="max-w-md mx-auto bg-gray-800 p-8 rounded-lg">
          <h2 className="text-xl mb-4">Upload Study Material (.txt file)</h2>
          <input 
            type="file" 
            accept=".txt"
            onChange={handleUpload}
            className="w-full p-2 bg-gray-700 rounded"
          />
          {loading && <p className="mt-4 text-blue-400">Extracting topics...</p>}
        </div>
      )}

      {/* Topics Grid */}
      {topics.length > 0 && !currentTopic && (
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl mb-4">Select a Topic to Study:</h2>
          <div className="grid grid-cols-2 gap-4">
            {topics.map((topic, idx) => (
              <div 
                key={idx}
                onClick={() => setCurrentTopic(topic)}
                className="bg-gray-800 p-6 rounded-lg cursor-pointer hover:bg-gray-700"
              >
                <h3 className="text-lg font-bold mb-2">{topic.name}</h3>
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
            className="mb-4 text-blue-400"
          >
            ← Back
          </button>
          
          <h2 className="text-2xl mb-4">{currentTopic.name}</h2>
          <p className="mb-6 text-gray-400">{currentTopic.description}</p>
          
          <VoiceInput onSubmit={handleEvaluation} loading={loading} />
        </div>
      )}
    </div>
  );
}