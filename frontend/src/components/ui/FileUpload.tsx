import React, { useRef, useState } from 'react';
import { Upload, FileText, X, CheckCircle2, CloudUpload } from 'lucide-react';
import { apiClient } from '../../api/client';

interface FileUploadProps {
  onUploadSuccess: (data: any) => void;
  sessionId: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess, sessionId }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('session_id', sessionId);

    try {
      const response = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploadSuccess(response.data);
    } catch (error) {
      alert('Upload failed. Check logs.');
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".csv,.xlsx,.xls,.json" />
      
      {!file ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:border-blue-500 hover:text-white transition-all shadow-lg"
        >
          <CloudUpload size={16} className="text-blue-500" />
          <span>{isUploading ? 'Ingesting...' : 'Import Data'}</span>
        </button>
      ) : (
        <div className="flex items-center gap-3 bg-blue-950/20 px-4 py-2 rounded-xl border border-blue-500/30">
          <FileText size={14} className="text-blue-400" />
          <span className="text-[11px] font-bold text-blue-200 truncate max-w-[100px]">{file.name}</span>
          <CheckCircle2 size={14} className="text-emerald-500" />
          <button onClick={() => setFile(null)} className="text-slate-500 hover:text-white"><X size={14} /></button>
        </div>
      )}
    </div>
  );
};