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
  const [dragOver, setDragOver] = useState(false);
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
                        onClick={() => handleDownload(doc)}
                        className="btn btn-primary"
                        style={{ padding: '10px 16px', fontSize: '13px' }}
                      >
                        ⬇️ Download
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
    </div>
  );
}
