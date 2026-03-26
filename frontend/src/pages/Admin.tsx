import { useEffect, useState } from 'react';
import { adminAPI, authAPI } from '../services/api';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface Document {
  id: number;
  filename: string;
  original_filename: string;
  owner_id: number;
  owner_name: string;
  file_size: number;
  is_public: boolean;
  created_at: string;
}

interface DocAccess {
  user_id: number;
  username: string;
  email: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
}

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [docAccess, setDocAccess] = useState<DocAccess[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'documents'>('users');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'viewer' });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await adminAPI.listUsers();
      setUsers(response.data);
      setAllUsers(response.data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await adminAPI.listDocuments();
      setDocuments(response.data);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  const loadDocAccess = async (docId: number) => {
    try {
      const response = await adminAPI.getDocumentAccess(docId);
      setDocAccess(response.data.access_list);
    } catch (err) {
      console.error('Failed to load access:', err);
    }
  };

  const handleSelectDocument = async (doc: Document) => {
    setSelectedDoc(doc);
    await loadDocAccess(doc.id);
  };

  const handleAddAccess = async (userId: number) => {
    if (!selectedDoc) return;
    try {
      await adminAPI.grantDocumentAccess(selectedDoc.id, {
        user_id: userId,
        can_read: true,
        can_write: false,
        can_delete: false,
      });
      await loadDocAccess(selectedDoc.id);
    } catch (err) {
      console.error('Failed to add access:', err);
    }
  };

  const handleRemoveAccess = async (userId: number) => {
    if (!selectedDoc) return;
    try {
      await adminAPI.removeDocumentAccess(selectedDoc.id, userId);
      await loadDocAccess(selectedDoc.id);
    } catch (err) {
      console.error('Failed to remove access:', err);
    }
  };

  const handleTogglePublic = async (doc: Document) => {
    try {
      await adminAPI.toggleDocumentPublic(doc.id, !doc.is_public);
      setDocuments(documents.map(d => d.id === doc.id ? { ...d, is_public: !d.is_public } : d));
      if (selectedDoc?.id === doc.id) {
        setSelectedDoc({ ...selectedDoc, is_public: !selectedDoc.is_public });
      }
    } catch (err) {
      console.error('Failed to toggle public:', err);
    }
  };

  const handleTabChange = async (tab: 'users' | 'documents') => {
    setActiveTab(tab);
    if (tab === 'documents') {
      await loadDocuments();
      setSelectedDoc(null);
      setDocAccess([]);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await adminAPI.updateUserRole(userId, newRole);
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error('Failed to update role:', err);
      alert('Failed to update role');
    }
  };

  const handleToggleActive = async (userId: number, currentStatus: boolean) => {
    try {
      await adminAPI.updateUserRole(userId, users.find(u => u.id === userId)?.role || 'viewer');
      await adminAPI.toggleActive(userId, !currentStatus);
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await adminAPI.deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('Failed to delete user');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authAPI.register(newUser);
      setShowCreateModal(false);
      setNewUser({ username: '', email: '', password: '', role: 'viewer' });
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create user');
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>⚙️ Administration</h1>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
        <button
          className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => handleTabChange('users')}
        >
          👥 User Management
        </button>
        <button
          className={`btn ${activeTab === 'documents' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => handleTabChange('documents')}
        >
          📄 Document Access
        </button>
      </div>

      {activeTab === 'users' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              + Add User
            </button>
          </div>

          {loading ? (
            <div className="loading"><span className="pulse">Loading users...</span></div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '50%', 
                            background: 'var(--accent-gradient)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 700
                          }}>
                            {user.username[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{user.username}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="input"
                          style={{ width: '140px', padding: '8px 12px' }}
                        >
                          <option value="viewer">👁️ Viewer</option>
                          <option value="editor">✏️ Editor</option>
                          <option value="admin">👑 Admin</option>
                        </select>
                      </td>
                      <td>
                        <span className={`badge ${user.is_active ? 'badge-success' : 'badge-warning'}`}>
                          {user.is_active ? '✓ Active' : '○ Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn btn-ghost"
                            style={{ padding: '8px 12px', fontSize: '12px' }}
                            onClick={() => handleToggleActive(user.id, user.is_active)}
                          >
                            {user.is_active ? '🔒 Disable' : '🔓 Enable'}
                          </button>
                          <button 
                            className="btn btn-danger"
                            style={{ padding: '8px 12px', fontSize: '12px' }}
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === 'documents' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedDoc ? '1fr 1fr' : '1fr', gap: '24px' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
              All Documents ({documents.length})
            </div>
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleSelectDocument(doc)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: selectedDoc?.id === doc.id ? 'var(--bg-hover)' : 'transparent',
                  }}
                >
                  <div style={{ fontWeight: 500, marginBottom: '4px' }}>{doc.original_filename}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Owner: {doc.owner_name} • {doc.is_public ? '🌐 Public' : '🔒 Private'}
                  </div>
                </div>
              ))}
              {documents.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No documents found
                </div>
              )}
            </div>
          </div>

          {selectedDoc && (
            <div className="card">
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: 0, marginBottom: '8px' }}>{selectedDoc.original_filename}</h3>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Owner: {selectedDoc.owner_name}
                </div>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span>🌐 Public:</span>
                  <button
                    className={`btn btn-sm ${selectedDoc.is_public ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => handleTogglePublic(selectedDoc)}
                  >
                    {selectedDoc.is_public ? 'Yes' : 'No'}
                  </button>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <h4 style={{ margin: 0, marginBottom: '12px' }}>Users with Access</h4>
                <div style={{ marginBottom: '16px' }}>
                  <select
                    className="input"
                    id="add-user-select"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddAccess(Number(e.target.value));
                        e.target.value = '';
                      }
                    }}
                    style={{ width: '100%' }}
                  >
                    <option value="">Select user to add...</option>
                    {allUsers
                      .filter(u => u.id !== selectedDoc.owner_id && !docAccess.find(a => a.user_id === u.id))
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                      ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {docAccess.map((access) => (
                    <div
                      key={access.user_id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '8px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>{access.username}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{access.email}</div>
                      </div>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemoveAccess(access.user_id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {docAccess.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '16px' }}>
                      No users have individual access. Make document public to share with everyone.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', margin: '20px' }}>
            <h2 style={{ marginBottom: '24px' }}>Create New User</h2>
            <form onSubmit={handleCreateUser}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Username</label>
                <input
                  type="text"
                  className="input"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  required
                  placeholder="Enter username"
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Email</label>
                <input
                  type="email"
                  className="input"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                  placeholder="user@example.com"
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Password</label>
                <input
                  type="password"
                  className="input"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  placeholder="Enter password"
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Role</label>
                <select
                  className="input"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
