const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function runMlAnalysis(payload: unknown) {
  const response = await fetch(`${ML_SERVICE_URL}/analyze`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ML service failed (${response.status}): ${body}`);
  }

  return response.json();
}
