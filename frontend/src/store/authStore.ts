import { create } from 'zustand';

interface AuthState {
  token: string | null;
  institution: { id: string; name: string; domain: string; plan: string } | null;
  setAuth: (token: string, institution: AuthState['institution']) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  institution: JSON.parse(localStorage.getItem('institution') || 'null'),

  setAuth: (token, institution) => {
    localStorage.setItem('token', token);
    localStorage.setItem('institution', JSON.stringify(institution));
    set({ token, institution });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('institution');
    set({ token: null, institution: null });
  },

  isAuthenticated: () => !!get().token,
}));
