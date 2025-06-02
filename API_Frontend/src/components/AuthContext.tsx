import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { api } from './common/http-common';
import axios from 'axios';

export interface User {
  id: number;
  username: string;
  email: string;
  firstname?: string | null;
  lastname?: string | null;
  about?: string | null;
  avatarurl?: string | null;
  roles?: string;
  favourite_hotels?: number[];
}

interface VerifyAuthResponse {
  message: string;
  user: User;
}

interface AuthContextType {
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  isVerifying: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem('atoken'));
  const [user, setUserState] = useState<User | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(true);

  const setUser = (userData: User | null) => {
    setUserState(userData);
  };

  const logout = () => {
    localStorage.removeItem('atoken');
    setIsAuthenticated(false);
    setUser(null);
    setIsVerifying(false);
  };

  useEffect(() => {
    const token = localStorage.getItem('atoken');
    if (token) {
      setIsVerifying(true);
      axios.get<VerifyAuthResponse>(`${api.uri}/auth/verify`, {
        headers: { 'Authorization': `Basic ${token}` }
      })
      .then(response => {
        if (response.data && response.data.user) {
          setUser(response.data.user);
          setIsAuthenticated(true);
        } else {
          logout();
        }
        setIsVerifying(false);
      })
      .catch(() => {
        logout();
        setIsVerifying(false);
      });
    } else {
      setIsAuthenticated(false);
      setUser(null);
      setIsVerifying(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated && user) {
        setUser(null);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    console.log('[AuthProvider] State Change: isVerifying:', isVerifying, 'isAuthenticated:', isAuthenticated, 'User:', user ? user.username : null);
  }, [isVerifying, isAuthenticated, user]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated, user, setUser, logout, isVerifying }}>
      {children}
    </AuthContext.Provider>
  );
}; 