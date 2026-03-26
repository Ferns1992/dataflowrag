import { useEffect, useState, useRef } from 'react';
import { documentsAPI } from '../services/api';

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
}

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
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

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await documentsAPI.delete(id);
      setDocuments(documents.filter(d => d.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Delete failed');
    }
  };

  const handleIngest = async (id: number) => {
    try {
      await documentsAPI.ingest(id);
      alert('Document indexed successfully');
      loadDocuments();
    } catch (err) {
      console.error('Ingest failed:', err);
      alert('Ingest failed');
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h1>Documents</h1>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="input"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '250px' }}
          />
          <label className="btn btn-primary" style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {uploading ? 'Uploading...' : '+ Upload'}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleUpload}
              style={{ display: 'none' }}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading documents...</div>
      ) : filteredDocs.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#666' }}>
            No documents found. Upload your first document!
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Filename</th>
                <th>Size</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc) => (
                <tr key={doc.id}>
                  <td style={{ fontWeight: 500 }}>{doc.original_filename}</td>
                  <td>{formatFileSize(doc.file_size)}</td>
                  <td>
                    <span className="badge" style={{ background: '#667eea20', color: '#667eea' }}>
                      {doc.file_extension}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${doc.ocr_completed ? 'badge-success' : 'badge-warning'}`}>
                      {doc.ocr_completed ? '✓ OCR Done' : '○ Processing'}
                    </span>
                    {doc.vectorized && (
                      <span className="badge badge-success" style={{ marginLeft: '5px' }}>
                        ✓ Indexed
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a
                        href={documentsAPI.download(doc.id)}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                      >
                        Download
                      </a>
                      {!doc.vectorized && doc.ocr_completed && (
                        <button
                          onClick={() => handleIngest(doc.id)}
                          className="btn btn-primary"
                          style={{ padding: '8px 16px', fontSize: '13px' }}
                        >
                          Index
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="btn btn-danger"
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
