const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function analyzeDecision(payload: unknown) {
  const response = await fetch(`${API}/api/decisions/analyze`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
  return data;
}
