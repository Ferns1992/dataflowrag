import { useState } from 'react';
import { ragAPI } from '../services/api';

export default function RagSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [answer, setAnswer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'search' | 'ask'>('search');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setAnswer(null);
    try {
      const response = await ragAPI.search(query);
      setResults(response.data.results);
    } catch (err) {
      console.error('Search failed:', err);
      alert('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    try {
      const response = await ragAPI.ask(query);
      setAnswer(response.data);
    } catch (err) {
      console.error('Ask failed:', err);
      alert('Failed to get answer');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'search') {
      handleSearch();
    } else {
      handleAsk();
    }
  };

  return (
    <div className="container">
      <h1 style={{ marginBottom: '20px' }}>RAG Search</h1>

      <div className="card">
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={() => setMode('search')}
            className={`btn ${mode === 'search' ? 'btn-primary' : ''}`}
            style={{ background: mode === 'search' ? '#007bff' : '#e9ecef' }}
          >
            Semantic Search
          </button>
          <button
            onClick={() => setMode('ask')}
            className={`btn ${mode === 'ask' ? 'btn-primary' : ''}`}
            style={{ background: mode === 'ask' ? '#007bff' : '#e9ecef' }}
          >
            Ask Questions
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              className="input"
              placeholder={mode === 'search' ? 'Search documents...' : 'Ask a question about your documents...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Processing...' : mode === 'search' ? 'Search' : 'Ask'}
            </button>
          </div>
        </form>
      </div>

      {loading && <div className="loading">Processing...</div>}

      {answer && (
        <div className="card">
          <h2 style={{ marginBottom: '15px' }}>Answer</h2>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{answer.answer}</div>
          
          {answer.sources && answer.sources.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ marginBottom: '10px' }}>Sources</h3>
              {answer.sources.map((source: any, i: number) => (
                <div key={i} style={{ padding: '10px', background: '#f8f9fa', borderRadius: '4px', marginBottom: '5px' }}>
                  <strong>{source.document_name}</strong> (Score: {(source.score * 100).toFixed(1)}%)
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {results.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: '15px' }}>Search Results</h2>
          {results.map((result, i) => (
            <div key={i} style={{ padding: '15px', borderBottom: '1px solid #ddd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <strong>{result.document_name}</strong>
                <span style={{ color: '#666' }}>Score: {(result.score * 100).toFixed(1)}%</span>
              </div>
              <p style={{ color: '#444' }}>{result.content}...</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
