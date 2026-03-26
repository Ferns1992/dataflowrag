import { useState } from 'react';
import { ragAPI } from '../services/api';

export default function RagSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [answer, setAnswer] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setAnswer(null);
    try {
      const response = await ragAPI.search(query);
      setResults(response.data.results || []);
    } catch (err) {
      console.error('Search failed:', err);
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
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <div className="container">
      <h1>🔍 Search Documents</h1>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="search-bar">
            <input
              type="text"
              className="input"
              placeholder="Search for anything in your documents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>
              {loading ? <span className="pulse">Searching...</span> : '🔍 Search'}
            </button>
            <button type="button" onClick={handleAsk} className="btn btn-ghost" disabled={loading}>
              Ask Question
            </button>
          </div>
        </form>
      </div>

      {loading && (
        <div className="loading">
          <span className="pulse">Searching documents...</span>
        </div>
      )}

      {answer && (
        <div className="card">
          <h2>📝 Answer</h2>
          <div style={{ 
            whiteSpace: 'pre-wrap', 
            lineHeight: '1.8',
            padding: '20px',
            background: 'var(--bg-primary)',
            borderRadius: '12px',
            marginTop: '16px'
          }}>
            {answer.answer}
          </div>
          
          {answer.sources?.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h3>📚 Sources</h3>
              {answer.sources.map((source: any, i: number) => (
                <div key={i} className="card" style={{ padding: '16px', marginTop: '12px' }}>
                  <strong>{source.document_name}</strong>
                  <span style={{ marginLeft: '12px', color: 'var(--text-secondary)' }}>
                    Score: {(source.score * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {results.length > 0 && (
        <div className="card">
          <h2>📋 Results ({results.length})</h2>
          {results.map((result, i) => (
            <div key={i} className="card" style={{ padding: '20px', marginTop: i > 0 ? '12px' : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <strong style={{ fontSize: '16px' }}>{result.document_name}</strong>
                <span className="badge badge-success">
                  {(result.score * 100).toFixed(0)}% match
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                {result.content}...
              </p>
            </div>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && !answer && (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>💡</div>
          <p style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>
            Search your documents to find relevant content
          </p>
        </div>
      )}
    </div>
  );
}
