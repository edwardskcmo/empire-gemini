import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

const FileUpload = ({ onUploadComplete }) => {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const onDrop = useCallback(async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setUploading(true);
        setError(null);
        setSuccess(false);

        const formData = new FormData();
        formData.append('document', file);
        formData.append('type', file.type === 'application/pdf' ? 'PDF' : 'Text');

        try {
            const response = await fetch('http://localhost:3001/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            setSuccess(true);
            if (onUploadComplete) onUploadComplete(data);

            // Reset success state after 3 seconds
            setTimeout(() => setSuccess(false), 3000);

        } catch (err) {
            console.error("Upload error:", err);
            setError("Failed to process document. Please try again.");
        } finally {
            setUploading(false);
        }
    }, [onUploadComplete]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'text/plain': ['.txt', '.md'],
            'application/json': ['.json']
        },
        multiple: false
    });

    return (
        <div className="w-full">
            <div
                {...getRootProps()}
                className={`
          relative overflow-hidden rounded-xl border-2 border-dashed p-8 transition-all cursor-pointer text-center
          ${isDragActive ? 'border-blue-400 bg-blue-500/10' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}
          ${uploading ? 'pointer-events-none opacity-50' : ''}
        `}
            >
                <input {...getInputProps()} />

                <div className="flex flex-col items-center gap-3 relative z-10">
                    {uploading ? (
                        <>
                            <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                            <p className="text-sm font-medium text-blue-300">Analyzing document structure...</p>
                        </>
                    ) : success ? (
                        <>
                            <CheckCircle className="w-10 h-10 text-green-400" />
                            <p className="text-sm font-medium text-green-300">Document indexed successfully!</p>
                        </>
                    ) : error ? (
                        <>
                            <AlertCircle className="w-10 h-10 text-red-400" />
                            <p className="text-sm font-medium text-red-300">{error}</p>
                        </>
                    ) : (
                        <>
                            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-2">
                                <Upload className="w-6 h-6 text-blue-400" />
                            </div>
                            <h4 className="font-semibold text-lg">Drop your data here</h4>
                            <p className="text-sm text-gray-400 max-w-xs mx-auto">
                                Upload PDFs, Text, or Markdown files to expand Empire AI's knowledge base.
                            </p>
                        </>
                    )}
                </div>

                {/* Background Gradient Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
            </div>
        </div>
    );
};

export default FileUpload;
