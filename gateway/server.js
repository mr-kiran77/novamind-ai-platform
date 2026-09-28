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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.GATEWAY_PORT || 5000;
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000';

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

// Create Proxy to Python FastAPI AI Engine
const apiProxy = createProxyMiddleware({
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
});

// Route only /api/* and /ws/* through the proxy (preserving full path)
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
    return apiProxy(req, res, next);
  }
  next();
});

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
