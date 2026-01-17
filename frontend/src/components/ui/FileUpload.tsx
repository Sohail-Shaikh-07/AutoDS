import React, { useRef, useState } from 'react';
import { Upload, FileText, X, CheckCircle2 } from 'lucide-react';
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
      console.error('Upload failed', error);
      alert('Failed to upload file. Please try again.');
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 border-b bg-white">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".csv,.xlsx,.xls,.json"
      />
      
      {!file ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-brand-500 hover:text-brand-600 transition-all"
        >
          <Upload size={20} />
          <span className="font-medium">{isUploading ? 'Uploading...' : 'Upload Dataset (CSV, Excel)'}</span>
        </button>
      ) : (
        <div className="flex items-center justify-between bg-brand-50 p-3 rounded-xl border border-brand-100">
          <div className="flex items-center gap-3">
            <div className="bg-brand-500 p-2 rounded-lg text-white">
              <FileText size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 truncate max-w-[200px]">{file.name}</p>
              <p className="text-xs text-brand-600">Successfully loaded into 'df'</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-500" />
            <button 
              onClick={() => setFile(null)}
              className="p-1 hover:bg-brand-100 rounded-full text-slate-400"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
