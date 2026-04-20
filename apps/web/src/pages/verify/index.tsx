import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Award } from 'lucide-react';

const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function verifyCredential(code: string) {
  const res = await fetch(`${VITE_API_URL}/v1/public/verify/${code}`);
  if (!res.ok) throw new Error("Failed to verify");
  return res.json();
}

export default function VerifyPage() {
  const { code } = useParams<{ code: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['verify', code],
    queryFn: () => verifyCredential(code!),
    enabled: !!code,
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-800">Verifying credential on blockchain...</div>;
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-lg w-full text-center">
           <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
           <h2 className="text-2xl font-bold text-gray-900">Verification Failed</h2>
           <p className="text-gray-500 mt-2">The credential code is invalid or does not exist.</p>
        </div>
      </div>
    );
  }

  const { valid, credential } = data;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Status Header */}
        <div className={`p-6 rounded-xl shadow-sm text-center ${valid ? 'bg-green-50' : 'bg-red-50'}`}>
           {valid ? (
             <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
           ) : (
             <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
           )}
           <h1 className={`text-3xl font-extrabold tracking-tight ${valid ? 'text-green-900' : 'text-red-900'}`}>
             {valid ? 'Credential Verified' : 'Invalid / Revoked'}
           </h1>
           <p className="mt-2 text-lg text-gray-600">
             {valid ? 'This credential has a permanent, tamper-proof record on the Polygon blockchain.' : 'This credential is no longer valid.'}
           </p>
        </div>

        {/* Credential Details */}
        <div className="bg-white px-8 py-10 shadow-sm rounded-xl border border-gray-100">
           <div className="flex items-center space-x-3 mb-8 pb-8 border-b border-gray-100">
              <Award className="w-10 h-10 text-indigo-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">{credential.institutionName}</h2>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Issuing Institution</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                 <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">Recipient</p>
                 <p className="text-xl font-semibold text-gray-900">{credential.recipientName}</p>
              </div>
              <div>
                 <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">Credential Type</p>
                 <p className="text-xl font-semibold text-gray-900">{credential.credentialType}</p>
              </div>
              <div className="md:col-span-2">
                 <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">Achievement</p>
                 <p className="text-2xl font-bold text-indigo-900">{credential.achievement}</p>
              </div>
              <div>
                 <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">Issued Date</p>
                 <p className="text-md font-medium text-gray-900">
                    {new Date(credential.issuedAt).toLocaleDateString()}
                 </p>
              </div>
              {credential.expiresAt && (
                <div>
                   <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">Expires Date</p>
                   <p className="text-md font-medium text-gray-900">
                      {new Date(credential.expiresAt).toLocaleDateString()}
                   </p>
                </div>
              )}
           </div>
        </div>

        {/* On-Chain Proof */}
        {valid && credential.contractAddress && (
          <div className="bg-white p-6 shadow-sm rounded-xl border border-gray-100 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Blockchain Proof</h3>
            <div className="flex flex-col space-y-3">
               <div className="flex justify-between items-center text-sm">
                 <span className="text-gray-500">Contract Address</span>
                 <span className="font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded">{credential.contractAddress}</span>
               </div>
               {credential.tokenId && (
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-500">Token ID</span>
                   <span className="font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded">{credential.tokenId}</span>
                 </div>
               )}
               {credential.chainExplorerUrl && (
                 <a href={credential.chainExplorerUrl} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:text-indigo-800 text-center uppercase tracking-wider font-semibold py-2">
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
