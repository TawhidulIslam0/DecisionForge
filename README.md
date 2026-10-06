# DecisionForge

DecisionForge is a full-stack AI decision-analysis platform for real-world choices. It does not return a canned recommendation. Instead, it converts a user's decision into explicit criteria, scores the supplied options, runs Monte Carlo scenarios through a Python ML service, performs sensitivity analysis, and uses an LLM to explain the resulting evidence.

## Architecture

- **Frontend:** React + TypeScript + Vite
- **API:** Node.js + Express + Prisma + PostgreSQL
- **AI orchestration:** OpenAI API from the Node backend
- **ML service:** Python + FastAPI + sentence-transformers + NumPy/Pandas
- **Simulation:** Monte Carlo outcome modeling with uncertainty and sensitivity analysis
- **Infrastructure:** Docker Compose

## AI 

1. The Python service loads a real pretrained `sentence-transformers/all-MiniLM-L6-v2` model.
2. It computes semantic alignment between the decision context, criteria, and option evidence.
3. It combines semantic evidence with normalized user-provided scores and uncertainty.
4. It runs thousands of Monte Carlo trials to estimate win probabilities and expected utility.
5. It perturbs criteria weights to identify which priorities can change the decision.
6. The backend sends the computed evidence—not a fake placeholder—to OpenAI for the final natural-language analysis.


## Requirements

- Node.js 20+
- Python 3.11+
- Docker Desktop (recommended) or PostgreSQL 16
- OpenAI API key

## Quick start with Docker

1. Copy environment files:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp ml-service/.env.example ml-service/.env
```

2. Put your OpenAI key in `backend/.env`. The Compose stack reads the backend environment file directly.

3. Start everything:

```bash
docker compose up --build
```

4. Open `http://localhost:5173`.

On Windows, you can also run `start-docker.bat`.

The API is available at `http://localhost:4000` and the ML service at `http://localhost:8000`.

## Local development

### PostgreSQL

Create a database named `decisionforge`, then set `DATABASE_URL` in `backend/.env`.

### Backend

```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run dev
```

### ML service

```bash
cd ml-service
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The first ML request downloads the pretrained sentence-transformer model from Hugging Face.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Using DecisionForge

Create a decision such as:

> "Should I accept a new job offer, stay at my current company, or pursue another offer?"

Then enter the actual options and criteria. Each option can include a 0–100 score and uncertainty range for every criterion. DecisionForge will:

- calculate semantic evidence alignment;
- normalize the option evidence;
- simulate thousands of possible outcomes;
- estimate the probability each option wins;
- identify fragile assumptions;
- generate an AI explanation with strengths, risks, and what information would most improve confidence.

## API

- `POST /api/decisions/analyze` — analyze a decision
- `GET /api/decisions` — list saved analyses
- `GET /api/decisions/:id` — retrieve one analysis
- `GET /api/health` — health check
- `POST /ml/analyze` — Python ML analysis endpoint

## Important

The application requires an OpenAI API key for the explanation stage. The Python ML analysis remains independently useful and is not replaced by an LLM response.

## Windows note

If you are using Git Bash/PowerShell, the Docker path is the simplest setup. Do not commit `.env` files or API keys. The supplied `.gitignore` excludes them.

## Validation note

The repository source was checked for JSON validity and Python syntax before packaging. Full dependency installation/build execution may require network access to npm/PyPI/Hugging Face.
