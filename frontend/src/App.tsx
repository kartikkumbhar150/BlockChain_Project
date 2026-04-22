import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import OverviewPage from './pages/dashboard/OverviewPage';
import CredentialsListPage from './pages/credentials/CredentialsListPage';
import IssueCredentialPage from './pages/credentials/IssueCredentialPage';
import VerifyPage from './pages/verify/VerifyPage';


const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/verify/:code" element={<VerifyPage />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />

          {/* Protected dashboard routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<OverviewPage />} />
            <Route path="credentials" element={<CredentialsListPage />} />
            <Route path="credentials/issue" element={<IssueCredentialPage />} />
            <Route path="analytics" element={<div className="text-gray-500">Analytics — Coming soon</div>} />
            <Route path="api-keys" element={<div className="text-gray-500">API Keys — Coming soon</div>} />
            <Route path="settings" element={<div className="text-gray-500">Settings — Coming soon</div>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
