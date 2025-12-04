import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  login as apiLogin,
  register as apiRegister,
  getProfile as apiGetProfile,
  User as ApiUser,
  RegisterRequest,
} from '@/api/auth';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

type User = ApiUser;

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  registerUser: (payload: RegisterRequest) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshProfile: () => Promise<User | null>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user && !!tokens;

  const persistAuth = (authTokens: AuthTokens, profile: User) => {
    localStorage.setItem('authTokens', JSON.stringify(authTokens));
    localStorage.setItem('user', JSON.stringify(profile));
  };

  const clearPersistedAuth = () => {
    localStorage.removeItem('authTokens');
    localStorage.removeItem('user');
  };

  const handleAuthSuccess = (authResponse: { accessToken: string; refreshToken: string; user: User }) => {
    const authTokens: AuthTokens = {
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken,
    };
    setTokens(authTokens);
    setUser(authResponse.user);
    persistAuth(authTokens, authResponse.user);
  };

  const refreshProfile = useCallback(async (): Promise<User | null> => {
    if (!tokens?.accessToken) return null;
    const profile = await apiGetProfile(tokens.accessToken);
    if (profile) {
      setUser(profile);
      localStorage.setItem('user', JSON.stringify(profile));
    }
    return profile;
  }, [tokens?.accessToken]);

  // Carregar dados do localStorage na inicialização
  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const storedTokens = localStorage.getItem('authTokens');
        const storedUser = localStorage.getItem('user');

        if (storedTokens) {
          const parsedTokens: AuthTokens = JSON.parse(storedTokens);
          setTokens(parsedTokens);

          if (storedUser) {
            setUser(JSON.parse(storedUser));
          } else {
            const profile = await apiGetProfile(parsedTokens.accessToken);
            if (profile) {
              setUser(profile);
              localStorage.setItem('user', JSON.stringify(profile));
            }
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados de autenticação:', error);
        clearPersistedAuth();
      } finally {
        setLoading(false);
      }
    };

    loadAuthData();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const authResponse = await apiLogin(email, password);
      if (!authResponse) return false;
      handleAuthSuccess(authResponse);
      return true;
    } catch (error) {
      console.error('Erro no login:', error);
      return false;
    }
  };

  const registerUser = async (payload: RegisterRequest): Promise<boolean> => {
    try {
      const authResponse = await apiRegister(payload);
      if (!authResponse) return false;
      handleAuthSuccess(authResponse);
      return true;
    } catch (error) {
      console.error('Erro no registro:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setTokens(null);
    clearPersistedAuth();
  };

  const updateUser = (userData: Partial<User>) => {
    setUser((prevUser) => {
      const updatedUser = { ...(prevUser ?? {}), ...userData } as User;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  const value: AuthContextType = {
    user,
    tokens,
    isAuthenticated,
    login,
    registerUser,
    logout,
    updateUser,
    refreshProfile,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
