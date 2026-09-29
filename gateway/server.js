/**
 * NovaMind API Gateway & Microservice Dispatcher
 * Built with Node.js + Express.js
 * 
 * Role in Dual-Engine Architecture:
 * 1. Unified API Gateway entrypoint on Port 5000.
 * 2. Reverse proxies API requests to Python FastAPI AI Swarm (Port 8000).
 * 3. Aggregates microservice health telemetry (FastAPI + Gemini AI + Gateway).
 * 4. Serves production React 19 + TypeScript + Tailwind SPA.
 */

import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server environment variables securely from .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Process-level crash prevention
process.on('uncaughtException', (err) => {
  console.error('[Gateway Uncaught Exception]', err.message);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Gateway Unhandled Rejection]', reason);
});

const app = express();
const PORT = process.env.GATEWAY_PORT || 5000;
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000';

// Initialize Official Google Gen AI SDK
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn('⚠️ [Gateway Security] GEMINI_API_KEY is not defined in server environment variables.');
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Multi-model resilience cascade: target gemini-3.5-flash with automatic flash fallback
const FLASH_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemma-4-26b-a4b-it',
  'gemma-4-31b-it',
];

// Enable CORS for all clients
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request Logger Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[Gateway] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Gateway Status & Health Dashboard
app.get('/api/gateway/status', async (req, res) => {
  let fastApiHealthy = false;
  let fastApiData = null;

  try {
    const response = await fetch(`${FASTAPI_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    if (response.ok) {
      fastApiHealthy = true;
      fastApiData = await response.json();
    }
  } catch (err) {
    fastApiHealthy = false;
  }

  res.json({
    gateway: {
      engine: 'Node.js + Express.js',
      status: 'operational',
      port: PORT,
      uptime_seconds: Math.floor(process.uptime()),
      memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
    ai_swarm_engine: {
      engine: 'Python 3.12 + FastAPI',
      url: FASTAPI_URL,
      status: fastApiHealthy ? 'operational' : 'unreachable',
      telemetry: fastApiData,
      gemini_model: 'gemini-3.8-flash',
      active_agents: 50
    },
    architecture: {
      type: 'Dual-Engine Microservices Architecture',
      layer_1: 'React 19 + TypeScript + Tailwind CSS Frontend',
      layer_2: 'Node.js Express API Gateway (Port 5000)',
      layer_3: 'Python FastAPI AI Swarm & Blueprint Structuring Engine (Port 8000)',
      layer_4: 'Google Gemini 3.8 Flash Multi-Agent Neural Mesh'
    }
  });
});

// =========================================================================
// NOVA AI MENTOR ENDPOINT (Live Google Gen AI SDK Integration)
// =========================================================================
app.post(['/api/assistant/chat', '/api/nova'], express.json(), async (req, res) => {
  const userMessage = (req.body?.message || req.body?.prompt || '').trim();
  const contextIdeaId = req.body?.context_idea_id;
  const history = req.body?.history || [];

  if (!userMessage) {
    return res.status(400).json({
      error: 'Message cannot be empty.',
      reply: 'Please provide a question or topic so I can help develop your idea!'
    });
  }

  // Retrieve optional idea context if context_idea_id is provided
  let ideaContextNote = '';
  if (contextIdeaId) {
    try {
      const ideaResp = await fetch(`${FASTAPI_URL}/api/ideas/${contextIdeaId}`, {
        signal: AbortSignal.timeout(2000),
      });
      if (ideaResp.ok) {
        const ideaData = await ideaResp.json();
        ideaContextNote = `\n\n[Active Idea Context: Title: "${ideaData.title}", Category: "${ideaData.category}", Raw Concept: "${ideaData.raw_content}"]`;
      }
    } catch (e) {
      // Continue without idea context if backend lookup times out
    }
  }

  const systemInstruction = `You are Nova, an elite AI Innovation Mentor, Technical Architect, and Startup Strategist on the NovaMind platform. Your mission is to help innovators turn raw napkin thoughts and concepts into structured, executable blueprints. Guide users with technical architecture recommendations, 4-week roadmaps, risk mitigations, monetization advice, and high-impact collaborator profiles. Be insightful, articulate, concise, and structured with markdown headings or bullets where helpful.${ideaContextNote}`;

  // Build conversational turns including history
  const contents = [];
  if (Array.isArray(history) && history.length > 0) {
    for (const turn of history) {
      const text = (turn.text || '').trim();
      if (!text || turn.id === 'welcome' || text.startsWith('👋 Hi!')) continue;
      contents.push({
        role: turn.sender === 'user' ? 'user' : 'model',
        parts: [{ text }],
      });
    }
  }

  // Append current user message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  let replyText = null;
  let modelUsed = null;
  let lastError = null;

  // Try target models in priority order
  for (const model of FLASH_MODELS) {
    try {
      const isGemini = model.startsWith('gemini');
      let reqContents = contents;
      let reqConfig = { temperature: 0.7 };

      if (isGemini) {
        reqConfig.systemInstruction = systemInstruction;
      } else {
        // Prepend system persona instructions to conversation for models without native systemInstruction parameter
        reqContents = contents.map((c, idx) => {
          if (idx === 0 && c.role === 'user') {
            return {
              role: 'user',
              parts: [{ text: `[System Persona Instructions: ${systemInstruction}]\n\n${c.parts[0].text}` }],
            };
          }
          return c;
        });
      }

      const response = await ai.models.generateContent({
        model,
        contents: reqContents,
        config: isGemini ? reqConfig : undefined,
      });

      if (response && response.text) {
        replyText = response.text.trim();
        modelUsed = model;
        break;
      }
    } catch (err) {
      console.warn(`[Nova Gemini SDK] Model '${model}' attempt failed: ${err.message}. Trying next fallback candidate...`);
      lastError = err;
    }
  }

  if (replyText) {
    return res.json({
      reply: replyText,
      model_used: modelUsed,
      context_used: Boolean(ideaContextNote),
      status: 'success',
    });
  }

  return res.status(502).json({
    error: 'Gemini API call failed across all candidate models.',
    detail: lastError ? lastError.message : 'Unknown error',
    reply: "I'm temporarily having trouble reaching the Gemini neural engine due to high demand. Please try asking again in a few moments!",
  });
});

// Proxy API requests to Python FastAPI AI Engine without stripping '/api'
app.use(createProxyMiddleware({
  pathFilter: ['/api/**', '/ws/**'],
  target: FASTAPI_URL,
  changeOrigin: true,
  ws: true,
  on: {
    proxyReq: (proxyReq, req) => {
      proxyReq.setHeader('X-Forwarded-By', 'NovaMind-Express-Gateway');
    },
    error: (err, req, res) => {
      console.error(`[Gateway Proxy Error] ${err.message}`);
      if (!res.headersSent) {
        res.status(502).json({
          error: 'Bad Gateway: Python AI Swarm Engine is currently offline or starting up.',
          fastapi_target: FASTAPI_URL,
          detail: err.message
        });
      }
    }
  }
}));

// Serve Built React SPA from frontend/dist
const distPath = path.resolve(__dirname, '../frontend/dist');
app.use(express.static(distPath));

// Fallback to React index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start Express Gateway Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 NOVAMIND NODE.JS EXPRESS API GATEWAY RUNNING`);
  console.log(`📡 Gateway URL:     http://localhost:${PORT}`);
  console.log(`🔗 FastAPI Target:   ${FASTAPI_URL}`);
  console.log(`💻 React App UI:    http://localhost:${PORT}`);
  console.log(`📊 Health Endpoint: http://localhost:${PORT}/api/gateway/status`);
  console.log(`=======================================================`);
});
