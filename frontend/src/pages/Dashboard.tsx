import { useEffect, useState } from 'react';
import { documentsAPI } from '../services/api';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

export default function Dashboard({ user }: { user: User }) {
  const [stats, setStats] = useState({ total: 0, processed: 0, vectorized: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await documentsAPI.list({ limit: 1000 });
      const docs = response.data;
      setStats({
        total: docs.length,
        processed: docs.filter((d: any) => d.ocr_completed).length,
        vectorized: docs.filter((d: any) => d.vectorized).length,
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1 style={{ marginBottom: '30px' }}>Welcome, {user.username}!</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
        <div className="card">
          <h3>Total Documents</h3>
          <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#007bff' }}>
            {loading ? '...' : stats.total}
          </p>
        </div>
        <div className="card">
          <h3>OCR Processed</h3>
          <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#28a745' }}>
            {loading ? '...' : stats.processed}
          </p>
        </div>
        <div className="card">
          <h3>Vectorized</h3>
          <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#6610f2' }}>
            {loading ? '...' : stats.vectorized}
          </p>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '20px' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '15px' }}>
          <a href="/documents" className="btn btn-primary">Upload Documents</a>
          <a href="/rag" className="btn btn-primary">Search Documents</a>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h2 style={{ marginBottom: '15px' }}>Account Information</h2>
        <p><strong>Username:</strong> {user.username}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {user.role}</p>
      </div>
    </div>
  );
}
