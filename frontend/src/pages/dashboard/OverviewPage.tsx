import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Award, Eye, TrendingUp, Wallet } from 'lucide-react';

export default function OverviewPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: api.credentials.stats,
  });

  const statCards = [
    { label: 'Total Issued', value: stats?.total ?? '—', icon: Award, color: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'This Month', value: stats?.issuedThisMonth ?? '—', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Verifications Today', value: stats?.verificationsToday ?? '—', icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Minted On-Chain', value: stats?.statusCounts?.find((s: any) => s.status === 'MINTED')?._count ?? '—', icon: Wallet, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your credential platform</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {isLoading ? <span className="animate-pulse">...</span> : value}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${bg}`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Status Distribution */}
      {stats?.statusCounts && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Credential Status Distribution</h2>
          <div className="flex flex-wrap gap-3">
            {stats.statusCounts.map((s: any) => {
              const colors: Record<string, string> = {
                MINTED: 'badge-success',
                PENDING: 'badge-warning',
                MINTING: 'badge-info',
                FAILED: 'badge-error',
                REVOKED: 'badge-error',
              };
              return (
                <span key={s.status} className={`${colors[s.status] || 'badge-info'} text-sm px-4 py-2`}>
                  {s.status}: {s._count}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
