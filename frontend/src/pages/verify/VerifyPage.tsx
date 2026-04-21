import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CheckCircle2, XCircle, Award, ExternalLink, Shield, Clock } from 'lucide-react';

export default function VerifyPage() {
  const { code } = useParams<{ code: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['verify', code],
    queryFn: () => api.verify.check(code!),
    enabled: !!code,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Verifying credential on blockchain...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
        <div className="card p-10 max-w-lg w-full text-center">
          <XCircle className="w-20 h-20 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Verification Failed</h2>
          <p className="text-gray-500 mt-3">The credential code is invalid or does not exist.</p>
        </div>
      </div>
    );
  }

  const { valid, credential } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      {/* Header Bar */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="flex items-center gap-2 justify-center text-gray-400">
          <Shield className="w-5 h-5" />
          <span className="text-sm font-medium">TamperProof Verification</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Status Hero */}
        <div className={`card p-8 text-center ${valid ? 'ring-2 ring-green-200' : 'ring-2 ring-red-200'}`}>
          {valid ? (
            <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4 drop-shadow-sm" />
          ) : (
            <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4 drop-shadow-sm" />
          )}
          <h1 className={`text-3xl font-extrabold ${valid ? 'text-green-900' : 'text-red-900'}`}>
            {valid ? 'Credential Verified ✓' : 'Invalid / Revoked'}
          </h1>
          <p className="mt-2 text-gray-600 max-w-md mx-auto">
            {valid
              ? 'This credential has a permanent, tamper-proof record on the Polygon blockchain.'
              : 'This credential is no longer valid.'}
          </p>
        </div>

        {/* Details */}
        <div className="card p-8">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
            <div className="p-2.5 bg-brand-50 rounded-xl">
              <Award className="w-7 h-7 text-brand-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{credential.institutionName}</h2>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Issuing Institution</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Recipient</p>
              <p className="text-lg font-semibold text-gray-900">{credential.recipientName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Credential Type</p>
              <p className="text-lg font-semibold text-gray-900">{credential.credentialType}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Achievement</p>
              <p className="text-2xl font-bold text-brand-900">{credential.achievement}</p>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">Issued</p>
                <p className="text-sm font-medium text-gray-900">{new Date(credential.issuedAt).toLocaleDateString()}</p>
              </div>
            </div>
            {credential.expiresAt && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Expires</p>
                  <p className="text-sm font-medium text-gray-900">{new Date(credential.expiresAt).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* On-Chain Proof */}
        {valid && credential.contractAddress && (
          <div className="card p-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Blockchain Proof</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Contract</span>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">{credential.contractAddress}</code>
              </div>
              {credential.tokenId && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Token ID</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">{credential.tokenId}</code>
                </div>
              )}
              {credential.chainExplorerUrl && (
                <a
                  href={credential.chainExplorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-semibold py-2 mt-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Polygonscan
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
