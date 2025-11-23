# StudyVoice AI 🎤

An AI-powered learning platform that helps students master concepts through voice interaction and personalized feedback.

## Features

- **📄 Multi-format File Upload**: Support for PDFs, images (PNG, JPG), and text files
- **🎤 Voice Recognition**: Practice explaining concepts out loud using browser speech recognition
- **🤖 AI-Powered Evaluation**: Get instant feedback on your understanding using Claude AI
- **📊 Progress Tracking**: Visual mastery levels that only increase (never decrease)
- **👤 User Authentication**: Secure registration and login system
- **💾 Data Persistence**: Your topics and progress are saved per user account

## Tech Stack

### Frontend
- **React 18** with Vite
- **Tailwind CSS** + custom CSS for styling
- **Web Speech API** for voice recognition
- **Responsive design** for mobile and desktop

### Backend
- **Node.js** with Express
- **JWT** authentication
- **bcryptjs** for password hashing
- **In-memory storage** (Maps for users and topics)

### AI Integration
- **Claude API** (Anthropic) for text processing and evaluation
- **PDF.js** for PDF text extraction
- **Claude Vision** for image text extraction

## Getting Started

### Prerequisites
- Node.js 18+ 
- Claude API key from Anthropic

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd anthropic-uci-hackathon
   ```

2. **Install dependencies**
   ```bash
   # Frontend dependencies
   npm install
   
   # Server dependencies
   cd server
   npm install
   ```

3. **Environment Setup**
   Create `.env.local` in the root directory:
   ```env
   VITE_CLAUDE_API_KEY=your_claude_api_key_here
   ```

4. **Start the application**
   ```bash
   # Terminal 1: Start the server
   cd server
   npm start
   
   # Terminal 2: Start the frontend
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:####`

## How It Works

1. **Register/Login**: Create an account or sign in
2. **Upload Study Material**: Upload PDFs, images, or text files
3. **AI Topic Extraction**: Claude AI automatically extracts 3-5 key topics
4. **Practice Sessions**: Select a topic and explain it using voice input
5. **Get Feedback**: Receive detailed AI evaluation and improvement suggestions
6. **Track Progress**: Watch your mastery levels improve over time

## Project Structure

```
anthropic-uci-hackathon/
├── src/
│   ├── components/
│   │   └── Auth.jsx           # Login/Register component
│   ├── pages/
│   │   ├── HomePage.jsx       # Main app functionality
│   │   └── LandingPage.jsx    # Marketing homepage
│   ├── VoiceInput.jsx         # Voice recognition component
│   ├── Progress.jsx           # Progress bar component
│   ├── App.jsx               # Main app component
│   └── App.css               # All styling
├── server/
│   ├── index.js              # Express server with auth & AI proxy
│   └── package.json          # Server dependencies
└── package.json              # Frontend dependencies
```

## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login

### Data Management
- `GET /api/topics` - Get user's topics (authenticated)
- `POST /api/topics` - Save user's topics (authenticated)

### AI Processing
- `POST /api/claude` - Proxy to Claude API
- `POST /api/parse-pdf` - PDF text extraction

## Browser Compatibility

- **Voice Recognition**: Chrome, Edge, Safari (requires microphone permission)
- **File Upload**: All modern browsers
- **Responsive Design**: Mobile and desktop optimized

## Data Storage

Currently uses **in-memory storage** for development:
- User accounts and topics stored in server memory
- Data persists during server session
- **Note**: Data is lost when server restarts

For production, consider migrating to:
- PostgreSQL or MongoDB for persistent storage
- Redis for session management
- Cloud storage for file uploads

## Contributing

This project was built for the Anthropic UCI Hackathon. Feel free to fork and extend!

## License

MIT License - feel free to use this project as a starting point for your own AI-powered learning applications.

---