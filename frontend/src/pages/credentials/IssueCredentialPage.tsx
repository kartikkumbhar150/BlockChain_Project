import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function IssueCredentialPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<{ credentialId: string; verifyUrl: string } | null>(null);

  const [form, setForm] = useState({
    recipientName: '',
    recipientEmail: '',
    recipientWallet: '',
    credentialType: 'Certificate',
    achievement: '',
    description: '',
  });

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const mutation = useMutation({
    mutationFn: api.credentials.issue,
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      recipientName: form.recipientName,
      recipientEmail: form.recipientEmail,
      recipientWallet: form.recipientWallet || undefined,
      credentialType: form.credentialType,
      achievement: form.achievement,
      description: form.description || undefined,
    });
  };

  if (result) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <div className="card p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Credential Issued!</h2>
          <p className="text-gray-500 mb-6">The credential is being minted on the blockchain.</p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-xs text-gray-500 mb-1">Verification URL</p>
            <p className="text-sm font-mono text-brand-600 break-all">{result.verifyUrl}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/credentials')} className="btn-secondary">View All</button>
            <button onClick={() => { setResult(null); setForm({ recipientName: '', recipientEmail: '', recipientWallet: '', credentialType: 'Certificate', achievement: '', description: '' }); }} className="btn-primary">Issue Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Issue Credential</h1>
        <p className="text-gray-500 mt-1">Create a new blockchain-backed credential</p>
      </div>

      <div className="card p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {mutation.isError && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200">
              {(mutation.error as Error).message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Recipient Name *</label>
              <input type="text" value={form.recipientName} onChange={update('recipientName')} className="input-field" placeholder="Alice Chen" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Recipient Email *</label>
              <input type="email" value={form.recipientEmail} onChange={update('recipientEmail')} className="input-field" placeholder="alice@example.com" required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Credential Type *</label>
              <select value={form.credentialType} onChange={update('credentialType')} className="input-field">
                <option>Certificate</option>
                <option>Degree</option>
                <option>License</option>
                <option>Badge</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Wallet Address (optional)</label>
              <input type="text" value={form.recipientWallet} onChange={update('recipientWallet')} className="input-field" placeholder="0x..." />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Achievement *</label>
            <input type="text" value={form.achievement} onChange={update('achievement')} className="input-field" placeholder="Full-Stack Web Development" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea value={form.description} onChange={update('description')} className="input-field min-h-[100px] resize-y" placeholder="Optional details about this achievement..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate('/credentials')} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex items-center gap-2">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Issue Credential
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
