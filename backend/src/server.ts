import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import decisions from './routes/decisions.js';

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '2mb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'decisionforge-api' }));
app.use('/api/decisions', decisions);

app.listen(port, () => console.log(`DecisionForge API listening on :${port}`));
