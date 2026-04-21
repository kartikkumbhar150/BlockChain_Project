const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(body.error || body.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Auth ────────────────────────────────────────────────
export interface RegisterBody {
  name: string;
  email: string;
  password: string;
  institutionName: string;
  domain: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

// ── Credentials ─────────────────────────────────────────
export interface IssueBody {
  recipientEmail: string;
  recipientName: string;
  recipientWallet?: string;
  credentialType: string;
  achievement: string;
  description?: string;
  expiresAt?: string;
  sendEmail?: boolean;
}

export interface Credential {
  id: string;
  recipientName: string;
  recipientEmail: string;
  credentialType: string;
  achievement: string;
  status: string;
  verificationCode: string;
  txHash: string | null;
  issuedAt: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface StatsOverview {
  total: number;
  issuedThisMonth: number;
  verificationsToday: number;
  statusCounts: { status: string; _count: number }[];
}

// ── API Client ──────────────────────────────────────────
export const api = {
  auth: {
    register: (body: RegisterBody) =>
      request<{ institutionId: string; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    login: (body: LoginBody) =>
      request<{ token: string; institution: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    me: () => request<any>('/auth/me'),
    listApiKeys: () => request<any[]>('/auth/api-keys'),
    createApiKey: (body: { label: string; scopes: string[] }) =>
      request<{ keyId: string; key: string }>('/auth/api-keys', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    deleteApiKey: (keyId: string) =>
      request<void>(`/auth/api-keys/${keyId}`, { method: 'DELETE' }),
  },

  credentials: {
    issue: (body: IssueBody) =>
      request<{ credentialId: string; status: string; verifyUrl: string }>(
        '/v1/credentials/issue-dashboard',
        { method: 'POST', body: JSON.stringify(body) }
      ),
    list: (params: Record<string, string> = {}) =>
      request<PaginatedResponse<Credential>>(
        `/v1/credentials?${new URLSearchParams(params)}`
      ),
    get: (id: string) => request<Credential>(`/v1/credentials/${id}`),
    revoke: (id: string, reason: string) =>
      request<void>(`/v1/credentials/${id}/revoke`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    stats: () => request<StatsOverview>('/v1/credentials/stats/overview'),
  },

  verify: {
    check: (code: string) =>
      request<{ valid: boolean; credential: any }>(`/v1/public/verify/${code}`),
  },

  institutions: {
    me: () => request<any>('/v1/institutions/me'),
    update: (body: Record<string, any>) =>
      request<any>('/v1/institutions/me', { method: 'PUT', body: JSON.stringify(body) }),
    usage: () => request<any>('/v1/institutions/me/usage'),
  },
};
