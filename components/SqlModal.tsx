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
          <h3 className="text-xl font-semibold text-white">Atualização do Banco de Dados Necessária</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-zinc-400 mb-4">
            Para que o sistema de <strong>Agendamento</strong> funcione, você precisa atualizar seu banco de dados.
            Copie o código abaixo e execute no Editor SQL do Supabase.
          </p>
          
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-200">
             <strong>Nota:</strong> Este script cria a tabela "appointments" se ela não existir. É seguro rodar mesmo se você já configurou o básico.
          </div>

          <div className="relative group">
            <div className="absolute top-4 right-4">
              <button 
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-md text-xs font-medium transition"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copiado' : 'Copiar SQL'}
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
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};