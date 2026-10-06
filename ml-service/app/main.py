import os
from typing import Dict, List, Any
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

MODEL_NAME = os.getenv("MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
model = SentenceTransformer(MODEL_NAME)
app = FastAPI(title="DecisionForge ML Service", version="1.0.0")

class Evidence(BaseModel):
    score: float = Field(ge=0, le=100)
    uncertainty: float = Field(ge=0, le=50)

class Criterion(BaseModel):
    id: str
    name: str
    description: str = ""
    weight: float = Field(ge=0, le=100)

class Option(BaseModel):
    id: str
    name: str
    description: str = ""
    evidence: Dict[str, Evidence]

class Decision(BaseModel):
    title: str
    question: str
    context: str
    criteria: List[Criterion]
    options: List[Option]


def cosine_matrix(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    a = a / np.maximum(np.linalg.norm(a, axis=1, keepdims=True), 1e-9)
    b = b / np.maximum(np.linalg.norm(b, axis=1, keepdims=True), 1e-9)
    return a @ b.T


def analyze(decision: Decision) -> Dict[str, Any]:
    weights = np.array([c.weight for c in decision.criteria], dtype=float)
    weights = weights / weights.sum()

    context_text = f"{decision.question}. {decision.context}"
    criterion_texts = [f"{c.name}: {c.description}" for c in decision.criteria]
    option_texts = [f"{o.name}: {o.description}" for o in decision.options]

    context_embedding = model.encode([context_text], normalize_embeddings=True)
    criterion_embeddings = model.encode(criterion_texts, normalize_embeddings=True)
    option_embeddings = model.encode(option_texts, normalize_embeddings=True)

    criterion_relevance = ((criterion_embeddings @ context_embedding[0]) + 1) / 2
    semantic_alignment = cosine_matrix(option_embeddings, criterion_embeddings)
    semantic_alignment = (semantic_alignment + 1) / 2

    base = np.zeros((len(decision.options), len(decision.criteria)))
    uncertainty = np.zeros_like(base)
    for i, option in enumerate(decision.options):
        for j, criterion in enumerate(decision.criteria):
            ev = option.evidence[criterion.id]
            base[i, j] = ev.score / 100.0
            uncertainty[i, j] = ev.uncertainty / 100.0

    # Semantic evidence is a modest modifier rather than a replacement for the user's data.
    adjusted = np.clip(base * (0.72 + 0.28 * semantic_alignment), 0, 1)
    deterministic = adjusted @ weights

    rng = np.random.default_rng(42)
    trials = 12000
    samples = np.empty((trials, len(decision.options)))
    for t in range(trials):
        sampled = rng.normal(loc=adjusted, scale=np.maximum(uncertainty * 0.35, 0.015))
        sampled = np.clip(sampled, 0, 1)
        samples[t] = sampled @ weights

    winners = np.argmax(samples, axis=1)
    win_prob = np.bincount(winners, minlength=len(decision.options)) / trials
    expected = samples.mean(axis=0)
    p10 = np.quantile(samples, 0.10, axis=0)
    p90 = np.quantile(samples, 0.90, axis=0)

    ranked = np.argsort(-expected)
    ranking = []
    for rank, idx in enumerate(ranked, 1):
        ranking.append({
            "optionId": decision.options[idx].id,
            "option": decision.options[idx].name,
            "rank": int(rank),
            "expectedUtility": round(float(expected[idx] * 100), 2),
            "deterministicScore": round(float(deterministic[idx] * 100), 2),
            "winProbability": round(float(win_prob[idx] * 100), 2),
            "p10": round(float(p10[idx] * 100), 2),
            "p90": round(float(p90[idx] * 100), 2),
        })

    # One-at-a-time weight sensitivity: identify criteria where changing priority
    # can change the top-ranked option.
    sensitivity = []
    for j, criterion in enumerate(decision.criteria):
        changes = []
        for target in np.linspace(0.05, 0.65, 13):
            remaining = 1 - target
            other_weights = weights.copy()
            other_sum = other_weights.sum() - other_weights[j]
            if other_sum <= 0:
                continue
            other_weights *= remaining / other_sum
            other_weights[j] = target
            winner = int(np.argmax(adjusted @ other_weights))
            changes.append(winner)
        unique = sorted(set(changes))
        sensitivity.append({
            "criterion": criterion.name,
            "currentWeight": round(float(weights[j] * 100), 2),
            "numberOfPotentialWinners": len(unique),
            "canChangeWinner": len(unique) > 1,
            "potentialWinners": [decision.options[x].name for x in unique]
        })

    semantic = []
    for i, option in enumerate(decision.options):
        semantic.append({
            "option": option.name,
            "criterionAlignment": [
                {"criterion": decision.criteria[j].name, "alignment": round(float(semantic_alignment[i, j] * 100), 2)}
                for j in range(len(decision.criteria))
            ]
        })

    return {
        "method": {
            "embeddingModel": MODEL_NAME,
            "simulationTrials": trials,
            "seed": 42,
            "semanticWeightModifier": "28% maximum modifier to user-provided evidence"
        },
        "criterionRelevance": [
            {"criterion": c.name, "relevance": round(float(criterion_relevance[i] * 100), 2)}
            for i, c in enumerate(decision.criteria)
        ],
        "ranking": ranking,
        "sensitivity": sensitivity,
        "semanticAlignment": semantic,
        "notes": [
            "Scores are based on the evidence supplied by the user.",
            "Uncertainty is sampled with a truncated normal distribution.",
            "Win probability is the fraction of simulations in which an option has the highest utility.",
            "Semantic alignment is an ML-derived signal and should not be treated as factual verification."
        ]
    }

@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}

@app.post("/analyze")
def run(decision: Decision):
    try:
        return analyze(decision)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
