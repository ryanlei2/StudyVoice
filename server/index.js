import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

dotenv.config({ path: '../.env.local' });

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// In-memory storage
const users = new Map();
const userTopics = new Map();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.sendStatus(401);
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// PDF parsing endpoint
app.post('/api/parse-pdf', async (req, res) => {
  try {
    const { base64Data } = req.body;
    const pdfBuffer = Buffer.from(base64Data, 'base64');
    const pdfUint8Array = new Uint8Array(pdfBuffer);
    
    const loadingTask = pdfjsLib.getDocument({ data: pdfUint8Array });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    res.json({ text: fullText });
  } catch (error) {
    console.error('PDF parsing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint for Claude API
app.post('/api/claude', async (req, res) => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.VITE_CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Auth routes
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (users.has(email)) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    users.set(email, { email, password: hashedPassword });
    userTopics.set(email, []);
    
    const token = jwt.sign({ email }, JWT_SECRET);
    res.json({ token, email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = users.get(email);
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ email }, JWT_SECRET);
    res.json({ token, email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save topics
app.post('/api/topics', authenticateToken, (req, res) => {
  try {
    const { topics } = req.body;
    userTopics.set(req.user.email, topics);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get topics
app.get('/api/topics', authenticateToken, (req, res) => {
  try {
    const topics = userTopics.get(req.user.email) || [];
    res.json({ topics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
});