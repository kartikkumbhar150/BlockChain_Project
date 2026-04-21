import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, Credential } from '@/lib/api';
import { Plus, Search, ExternalLink, Copy } from 'lucide-react';

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    MINTED: 'badge-success',
    PENDING: 'badge-warning',
    MINTING: 'badge-info',
    FAILED: 'badge-error',
    REVOKED: 'badge-error',
  };
  return <span className={map[status] || 'badge-info'}>{status}</span>;
};

export default function CredentialsListPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['credentials', { page, search, status: statusFilter }],
    queryFn: () =>
      api.credentials.list({
        page: String(page),
        limit: '20',
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      }),
  });

  const filters = ['', 'PENDING', 'MINTING', 'MINTED', 'FAILED', 'REVOKED'];

  const copyVerifyUrl = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/verify/${code}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Credentials</h1>
          <p className="text-gray-500 mt-1">Manage all issued credentials</p>
        </div>
        <Link to="/credentials/issue" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Issue Credential
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, email, or achievement..."
              className="input-field pl-10"
            />
          </div>
          <div className="flex gap-1">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => { setStatusFilter(f); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === f
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f || 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Recipient</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Achievement</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Issued</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading...</td></tr>
              ) : !data?.data?.length ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">No credentials found</td></tr>
              ) : (
                data.data.map((c: Credential) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-gray-900 text-sm">{c.recipientName}</div>
                      <div className="text-gray-500 text-xs">{c.recipientEmail}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">{c.credentialType}</td>
                    <td className="p-4 text-sm text-gray-900 font-medium max-w-[200px] truncate">{c.achievement}</td>
                    <td className="p-4">{statusBadge(c.status)}</td>
                    <td className="p-4 text-sm text-gray-500">{new Date(c.issuedAt).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyVerifyUrl(c.verificationCode)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                          title="Copy verify URL"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {c.txHash && (
                          <a
                            href={`https://amoy.polygonscan.com/tx/${c.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                            title="View on Polygonscan"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > 20 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of {data.total}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm">Previous</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= data.total} className="btn-secondary text-sm">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
