import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import RagSearch from './pages/RagSearch';
import Admin from './pages/Admin';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <BrowserRouter>
      <div className="app">
        {user && (
          <nav className="nav">
            <a href="/" className="nav-brand">DataFlowRAG</a>
            <div className="nav-links">
              <a href="/" className="nav-link">Dashboard</a>
              <a href="/documents" className="nav-link">Documents</a>
              <a href="/rag" className="nav-link">RAG Search</a>
              {user.role === 'admin' && <a href="/admin" className="nav-link">Admin</a>}
              <button onClick={handleLogout} className="btn btn-primary" style={{marginLeft: '20px'}}>Logout</button>
            </div>
          </nav>
        )}
        <Routes>
          <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
          <Route path="/" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
          <Route path="/documents" element={user ? <Documents /> : <Navigate to="/login" />} />
          <Route path="/rag" element={user ? <RagSearch /> : <Navigate to="/login" />} />
          <Route path="/admin" element={user && user.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
