import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    recommendation: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 100 },
    why: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 },
    risks: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 },
    whatCouldChangeIt: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 },
    nextQuestions: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 }
  },
  required: ['summary', 'recommendation', 'confidence', 'why', 'risks', 'whatCouldChangeIt', 'nextQuestions']
};

export async function explainDecision(input: any, analysis: any) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required for the AI explanation stage.');

  const prompt = `You are the explanation layer of DecisionForge, a decision-analysis system.
Reason only from the supplied decision and computed ML/simulation evidence. Never invent facts, scores, options, or probabilities.
Simulation probabilities are model estimates, not guarantees. Focus on trade-offs, uncertainty, and the assumptions that matter.

Decision:
${JSON.stringify(input, null, 2)}

Computed analysis:
${JSON.stringify(analysis, null, 2)}`;

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-6-luna',
    instructions: 'You are a rigorous decision analyst. Use only supplied evidence and return the requested JSON structure.',
    input: prompt,
    text: { format: { type: 'json_schema', name: 'decision_explanation', strict: true, schema } }
  });

  if (!response.output_text) throw new Error('AI model returned no explanation.');
  return JSON.parse(response.output_text);
}
