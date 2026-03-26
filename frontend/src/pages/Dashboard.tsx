import { useEffect, useState } from 'react';
import { documentsAPI } from '../services/api';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface DashboardProps {
  user: User;
  onThemeToggle?: () => void;
  theme?: string;
}

export default function Dashboard({ user }: DashboardProps) {
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
      <h1>Welcome back, {user.username}!</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📄</div>
          <h3>Total Documents</h3>
          <p>{loading ? '...' : stats.total}</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <h3>OCR Processed</h3>
          <p>{loading ? '...' : stats.processed}</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔍</div>
          <h3>Indexed</h3>
          <p>{loading ? '...' : stats.vectorized}</p>
        </div>
      </div>

      <div className="card">
        <h2>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <a href="/documents" className="btn btn-primary">
            📤 Upload Documents
          </a>
          <a href="/rag" className="btn btn-primary">
            🔍 Search Documents
          </a>
        </div>
      </div>

      <div className="card" style={{ marginTop: '24px' }}>
        <h2>Account Info</h2>
        <div style={{ display: 'grid', gap: '12px' }}>
          <p><strong>Username:</strong> {user.username}</p>
          <p><strong>Email:</strong> {user.email || 'Not set'}</p>
          <p><strong>Role:</strong> <span className="badge badge-purple">{user.role}</span></p>
        </div>
      </div>
    </div>
  );
}
