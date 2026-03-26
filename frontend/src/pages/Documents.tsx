import { useEffect, useState, useRef } from 'react';
import { documentsAPI, adminAPI, authAPI } from '../services/api';

interface Document {
  id: number;
  original_filename: string;
  file_size: number;
  file_extension: string;
  mime_type: string;
  ocr_completed: boolean;
  vectorized: boolean;
  is_public: boolean;
  created_at: string;
  owner_id?: number;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface DocAccess {
  user_id: number;
  username: string;
  email: string;
}

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [sharingDoc, setSharingDoc] = useState<Document | null>(null);
  const [docAccess, setDocAccess] = useState<DocAccess[]>([]);

  useEffect(() => {
    loadDocuments();
    loadUsers();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await documentsAPI.list({ limit: 100 });
      setDocuments(response.data);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await adminAPI.listUsers();
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to load users:', err);
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

  const handleShare = async (doc: Document) => {
    setSharingDoc(doc);
    await loadDocAccess(doc.id);
  };

  const handleAddAccess = async (userId: number) => {
    if (!sharingDoc) return;
    try {
      await adminAPI.grantDocumentAccess(sharingDoc.id, {
        user_id: userId,
        can_read: true,
        can_write: false,
        can_delete: false,
      });
      await loadDocAccess(sharingDoc.id);
    } catch (err) {
      console.error('Failed to add access:', err);
    }
  };

  const handleRemoveAccess = async (userId: number) => {
    if (!sharingDoc) return;
    try {
      await adminAPI.removeDocumentAccess(sharingDoc.id, userId);
      await loadDocAccess(sharingDoc.id);
    } catch (err) {
      console.error('Failed to remove access:', err);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('run_ocr', 'true');
        await documentsAPI.upload(formData);
      }
      await loadDocuments();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this document?')) return;
    try {
      await documentsAPI.delete(id);
      setDocuments(documents.filter(d => d.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Delete failed');
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      await documentsAPI.download(doc.id, doc.original_filename);
    } catch (err: any) {
      console.error('Download failed:', err);
      alert(err.message || 'Download failed');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const filteredDocs = documents.filter(d =>
    d.original_filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h1>Documents</h1>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="input"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '260px' }}
          />
          <button 
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : '+ Upload'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => handleUpload(e.target.files)}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <div 
        className="upload-zone"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{ 
          borderColor: dragOver ? 'var(--accent)' : undefined,
          background: dragOver ? 'rgba(102, 126, 234, 0.1)' : undefined
        }}
      >
        <div className="upload-zone-icon floating">📁</div>
        <p style={{ fontSize: '18px', fontWeight: 600 }}>Drop files here or click to upload</p>
        <p>Supports PDF, Images, Word, Excel, PowerPoint, and more</p>
      </div>

      {loading ? (
        <div className="loading">
          <span className="pulse">Loading documents...</span>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📭</div>
          <p style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>
            No documents yet. Upload your first file!
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Size</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '24px' }}>
                        {doc.file_extension.includes('pdf') ? '📕' :
                         doc.file_extension.includes('doc') ? '📘' :
                         doc.file_extension.includes('xls') ? '📗' :
                         doc.file_extension.includes('img') ? '🖼️' : '📄'}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{doc.original_filename}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {doc.file_extension} • {new Date(doc.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{formatFileSize(doc.file_size)}</td>
                  <td>
                    <span className={`badge ${doc.ocr_completed ? 'badge-success' : 'badge-warning'}`}>
                      {doc.ocr_completed ? '✓ Ready' : '○ Processing'}
                    </span>
                    {doc.vectorized && (
                      <span className="badge badge-purple" style={{ marginLeft: '8px' }}>
                        ✓ Indexed
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleShare(doc)}
                        className="btn btn-ghost"
                        style={{ padding: '10px 16px', fontSize: '13px' }}
                      >
                        🔗 Share
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="btn btn-primary"
                        style={{ padding: '10px 16px', fontSize: '13px' }}
                      >
                        ⬇️
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="btn btn-danger"
                        style={{ padding: '10px 16px', fontSize: '13px' }}
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

      {sharingDoc && (
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
          <div className="card" style={{ width: '100%', maxWidth: '500px', margin: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Share: {sharingDoc.original_filename}</h2>
              <button onClick={() => setSharingDoc(null)} className="btn btn-ghost">✕</button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Add user</label>
              <select
                className="input"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddAccess(Number(e.target.value));
                    e.target.value = '';
                  }
                }}
                style={{ width: '100%' }}
              >
                <option value="">Select user...</option>
                {users
                  .filter(u => u.id !== sharingDoc.owner_id && !docAccess.find(a => a.user_id === u.id))
                  .map(u => (
                    <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                  ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Users with access</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
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
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                    No users have access yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
