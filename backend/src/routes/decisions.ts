import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { runMlAnalysis } from '../services/ml.js';
import { explainDecision } from '../services/ai.js';

const router = Router();
const prisma = new PrismaClient();

const criterionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().default(''),
  weight: z.number().min(0).max(100)
});

const optionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().default(''),
  evidence: z.record(z.string(), z.object({
    score: z.number().min(0).max(100),
    uncertainty: z.number().min(0).max(50)
  }))
});

const decisionSchema = z.object({
  title: z.string().min(2),
  question: z.string().min(5),
  context: z.string().min(10),
  criteria: z.array(criterionSchema).min(2).max(10),
  options: z.array(optionSchema).min(2).max(8)
});

router.post('/analyze', async (req, res) => {
  try {
    const input = decisionSchema.parse(req.body);
    const totalWeight = input.criteria.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight <= 0) return res.status(400).json({ error: 'At least one criterion must have a positive weight.' });

    for (const option of input.options) {
      for (const criterion of input.criteria) {
        if (!option.evidence[criterion.id]) {
          return res.status(400).json({ error: `Missing evidence for ${option.name} → ${criterion.name}.` });
        }
      }
    }

    const ml = await runMlAnalysis(input);
    const explanation = await explainDecision(input, ml);
    const result = { ...ml, explanation };

    const saved = await prisma.decision.create({
      data: { title: input.title, question: input.question, input, result }
    });

    res.json({ id: saved.id, ...result });
  } catch (error: any) {
    console.error(error);
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
    res.status(500).json({ error: error.message || 'Analysis failed.' });
  }
});

router.get('/', async (_req, res) => {
  const decisions = await prisma.decision.findMany({ orderBy: { createdAt: 'desc' }, take: 30 });
  res.json(decisions.map(d => ({ id: d.id, title: d.title, question: d.question, createdAt: d.createdAt })));
});

router.get('/:id', async (req, res) => {
  const decision = await prisma.decision.findUnique({ where: { id: req.params.id } });
  if (!decision) return res.status(404).json({ error: 'Decision not found.' });
  res.json({ id: decision.id, title: decision.title, question: decision.question, input: decision.input, result: decision.result, createdAt: decision.createdAt });
});

export default router;
