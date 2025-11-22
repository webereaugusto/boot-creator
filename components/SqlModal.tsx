import React from 'react';
import { X, Copy, Check } from 'lucide-react';
import { SQL_SETUP_SCRIPT } from '../supabaseClient';

interface SqlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SqlModal: React.FC<SqlModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(SQL_SETUP_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-surface border border-zinc-800 rounded-xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h3 className="text-xl font-semibold text-white">Database Setup Required</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-zinc-400 mb-4">
            To use this application, you need to create the required tables in your Supabase project. 
            Copy the SQL below and run it in the <span className="text-white font-medium">SQL Editor</span> of your Supabase dashboard.
          </p>

          <div className="relative group">
            <div className="absolute top-4 right-4">
              <button 
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-md text-xs font-medium transition"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy SQL'}
              </button>
            </div>
            <pre className="bg-black/50 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300 overflow-x-auto font-mono leading-relaxed">
              {SQL_SETUP_SCRIPT}
            </pre>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-800 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-zinc-100 text-zinc-900 hover:bg-white font-medium rounded-lg transition"
          >
            I have run the script
          </button>
        </div>
      </div>
    </div>
  );
};