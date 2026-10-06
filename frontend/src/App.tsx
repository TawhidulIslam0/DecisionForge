import { useMemo, useState } from 'react';
import { ArrowRight, BrainCircuit, Check, ChevronDown, LoaderCircle, Plus, Sparkles, Target, Trash2, TriangleAlert } from 'lucide-react';
import { analyzeDecision } from './lib/api';

type Criterion = { id: string; name: string; description: string; weight: number };
type Option = { id: string; name: string; description: string; evidence: Record<string, { score: number; uncertainty: number }> };

type Result = any;

const uid = () => Math.random().toString(36).slice(2, 9);
const starterCriteria: Criterion[] = [
  { id: uid(), name: 'Financial impact', description: 'How strongly this option affects money, cost, or earning potential.', weight: 30 },
  { id: uid(), name: 'Long-term upside', description: 'Potential to improve the situation over the next few years.', weight: 25 },
  { id: uid(), name: 'Risk', description: 'How exposed the option is to downside or uncertainty.', weight: 20 },
  { id: uid(), name: 'Quality of life', description: 'Impact on time, stress, flexibility, and everyday life.', weight: 25 }
];

function App() {
  const [title, setTitle] = useState('A decision I need to make');
  const [question, setQuestion] = useState('Which option gives me the strongest overall outcome?');
  const [context, setContext] = useState('Describe the situation, constraints, what matters, and anything that makes this decision uncertain.');
  const [criteria, setCriteria] = useState<Criterion[]>(starterCriteria);
  const [options, setOptions] = useState<Option[]>([
    { id: uid(), name: 'Option A', description: '', evidence: {} },
    { id: uid(), name: 'Option B', description: '', evidence: {} }
  ]);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'build' | 'results'>('build');

  const totalWeight = useMemo(() => criteria.reduce((s, c) => s + Number(c.weight || 0), 0), [criteria]);

  function updateOption(optionId: string, patch: Partial<Option>) {
    setOptions(prev => prev.map(o => o.id === optionId ? { ...o, ...patch } : o));
  }

  function updateEvidence(optionId: string, criterionId: string, patch: Partial<{score:number; uncertainty:number}>) {
    setOptions(prev => prev.map(o => o.id === optionId ? { ...o, evidence: { ...o.evidence, [criterionId]: { score: o.evidence[criterionId]?.score ?? 50, uncertainty: o.evidence[criterionId]?.uncertainty ?? 10, ...patch } } } : o));
  }

  function addCriterion() {
    const id = uid();
    setCriteria(c => [...c, { id, name: 'New criterion', description: 'What does this criterion measure?', weight: 10 }]);
  }

  function addOption() {
    setOptions(o => [...o, { id: uid(), name: `Option ${String.fromCharCode(65 + o.length)}`, description: '', evidence: {} }]);
  }

  async function run() {
    setError('');
    if (Math.abs(totalWeight - 100) > 0.01) { setError(`Your criterion weights total ${totalWeight}. Make them equal exactly 100.`); return; }
    if (context.length < 10) { setError('Give the AI enough context to understand the decision.'); return; }
    setLoading(true);
    try {
      const prepared = options.map(o => ({ ...o, evidence: Object.fromEntries(criteria.map(c => [c.id, o.evidence[c.id] ?? { score: 50, uncertainty: 10 }])) }));
      const data = await analyzeDecision({ title, question, context, criteria, options: prepared });
      setResult(data); setTab('results');
    } catch (e: any) { setError(e.message || 'Analysis failed.'); }
    finally { setLoading(false); }
  }

  return <div className="app">
    <header className="topbar">
      <div className="brand"><div className="brandmark"><BrainCircuit size={22}/></div><div><strong>DecisionForge</strong><span>AI decision intelligence</span></div></div>
      <div className="topstatus"><span className="live-dot"/> REAL ANALYSIS <span className="divider"/> ML + MONTE CARLO</div>
    </header>

    <main>
      <section className="hero">
        <div className="eyebrow"><Sparkles size={15}/> EVIDENCE OVER VIBES</div>
        <h1>Make difficult decisions<br/><em>less opaque.</em></h1>
        <p>Turn a real-world choice into a transparent model. DecisionForge uses your evidence, a pretrained language model, uncertainty simulation, and sensitivity analysis to show what actually drives the outcome.</p>
        <div className="tabs"><button className={tab === 'build' ? 'active' : ''} onClick={() => setTab('build')}>01 Build decision</button><button className={tab === 'results' ? 'active' : ''} disabled={!result} onClick={() => setTab('results')}>02 Analysis {result && <Check size={14}/>}</button></div>
      </section>

      {tab === 'build' ? <>
        <section className="panel">
          <div className="section-head"><div><span className="section-number">01</span><h2>Frame the decision</h2></div><span className="hint">Be specific. Context changes the model.</span></div>
          <div className="grid two">
            <label>Decision title<input value={title} onChange={e => setTitle(e.target.value)} /></label>
            <label>Decision question<input value={question} onChange={e => setQuestion(e.target.value)} /></label>
          </div>
          <label>Context<textarea value={context} onChange={e => setContext(e.target.value)} rows={5}/></label>
        </section>

        <section className="panel">
          <div className="section-head"><div><span className="section-number">02</span><h2>Define what matters</h2></div><div className={totalWeight === 100 ? 'weight good' : 'weight'}>{totalWeight}% weighted</div></div>
          <p className="muted">Weights express importance, not certainty. Your total must equal 100%.</p>
          <div className="criteria">
            {criteria.map((c, i) => <div className="criterion" key={c.id}>
              <div className="criterion-index">{String(i + 1).padStart(2,'0')}</div>
              <input className="plain" value={c.name} onChange={e => setCriteria(cs => cs.map(x => x.id === c.id ? {...x, name:e.target.value} : x))}/>
              <input className="description" value={c.description} onChange={e => setCriteria(cs => cs.map(x => x.id === c.id ? {...x, description:e.target.value} : x))}/>
              <div className="weight-input"><input type="number" min="0" max="100" value={c.weight} onChange={e => setCriteria(cs => cs.map(x => x.id === c.id ? {...x, weight:Number(e.target.value)} : x))}/><span>%</span></div>
              {criteria.length > 2 && <button className="icon danger" onClick={() => setCriteria(cs => cs.filter(x => x.id !== c.id))}><Trash2 size={15}/></button>}
            </div>)}
          </div>
          <button className="secondary" onClick={addCriterion}><Plus size={16}/> Add criterion</button>
        </section>

        <section className="panel">
          <div className="section-head"><div><span className="section-number">03</span><h2>Enter the options</h2></div><span className="hint">Score what you know. Add uncertainty where you don't.</span></div>
          <div className="option-list">
            {options.map((o, oi) => <div className="option-card" key={o.id}>
              <div className="option-top"><div className="option-letter">{String.fromCharCode(65 + oi)}</div><div className="option-fields"><input value={o.name} onChange={e => updateOption(o.id, {name:e.target.value})} /><input value={o.description} placeholder="Describe the option and its relevant evidence..." onChange={e => updateOption(o.id, {description:e.target.value})}/></div>{options.length > 2 && <button className="icon danger" onClick={() => setOptions(os => os.filter(x => x.id !== o.id))}><Trash2 size={15}/></button>}</div>
              <div className="evidence-head"><span>Criterion</span><span>Score <small>0–100</small></span><span>Uncertainty <small>±</small></span></div>
              {criteria.map(c => { const ev = o.evidence[c.id] ?? {score:50, uncertainty:10}; return <div className="evidence-row" key={c.id}><div><strong>{c.name}</strong><small>{c.description}</small></div><input type="number" min="0" max="100" value={ev.score} onChange={e => updateEvidence(o.id,c.id,{score:Number(e.target.value)})}/><input type="number" min="0" max="50" value={ev.uncertainty} onChange={e => updateEvidence(o.id,c.id,{uncertainty:Number(e.target.value)})}/></div>})}
            </div>)}
          </div>
          <button className="secondary" onClick={addOption}><Plus size={16}/> Add another option</button>
        </section>

        {error && <div className="error"><TriangleAlert size={18}/><span>{error}</span></div>}
        <button className="run" onClick={run} disabled={loading}>{loading ? <><LoaderCircle className="spin" size={20}/> Running ML analysis + simulations...</> : <>Analyze this decision <ArrowRight size={20}/></>}</button>
      </> : <Results result={result} onBack={() => setTab('build')}/>} 
    </main>
    <footer><span>DecisionForge</span><span>Transparent inputs · real ML · probabilistic outputs</span></footer>
  </div>
}

function Results({result, onBack}:{result:Result;onBack:()=>void}) {
  const winner = result?.ranking?.[0];
  return <section className="results">
    <div className="result-hero"><div><div className="eyebrow"><Target size={15}/> ANALYSIS COMPLETE</div><h2>The model currently favors <em>{winner?.option}</em>.</h2><p>This is a probabilistic model estimate, not a guarantee. The useful part is understanding <strong>why</strong> and what could change it.</p></div><div className="score-ring"><strong>{winner?.winProbability}%</strong><span>win probability</span></div></div>
    <div className="result-grid">
      <div className="result-card wide"><h3>Outcome distribution</h3><p className="muted">Expected utility and the range observed across 12,000 simulated futures.</p>{result.ranking.map((r:any)=><div className="rank-row" key={r.optionId}><div className="rank-name"><span>{r.rank}</span><strong>{r.option}</strong></div><div className="bar"><i style={{width:`${Math.max(3,r.winProbability)}%`}}/></div><div className="rank-number">{r.winProbability}%</div><div className="range">{r.p10} — {r.p90}</div></div>)}</div>
      <div className="result-card"><h3>AI readout</h3><div className="confidence">{result.explanation?.confidence}% <span>confidence</span></div><p>{result.explanation?.summary}</p><div className="mini-title">Recommendation</div><p>{result.explanation?.recommendation}</p></div>
      <div className="result-card"><h3>Why it leads</h3><ul>{result.explanation?.why?.map((x:string)=><li key={x}>{x}</li>)}</ul></div>
      <div className="result-card"><h3>What could break it</h3><ul className="risk">{result.explanation?.risks?.map((x:string)=><li key={x}>{x}</li>)}</ul></div>
      <div className="result-card wide"><h3>Sensitivity analysis</h3><p className="muted">These criteria can change the winner when their importance shifts. They are the assumptions worth investigating first.</p>{result.sensitivity.map((s:any)=><div className="sensitivity" key={s.criterion}><div><strong>{s.criterion}</strong><span>Current weight {s.currentWeight}%</span></div><div className={s.canChangeWinner ? 'sensitive yes':'sensitive'}>{s.canChangeWinner ? 'Decision-sensitive':'Stable'}</div><div className="potential">{s.potentialWinners.join(' · ')}</div></div>)}</div>
      <div className="result-card"><h3>Next questions</h3><ul>{result.explanation?.nextQuestions?.map((x:string)=><li key={x}>{x}</li>)}</ul></div>
    </div>
    <button className="secondary back" onClick={onBack}><ChevronDown size={16} style={{transform:'rotate(90deg)'}}/> Change assumptions</button>
  </section>
}

export default App;
