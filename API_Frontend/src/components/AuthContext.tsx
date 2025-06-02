import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { api } from './common/http-common';
import axios from 'axios';

export interface User {
  id?: number;
  username: string;
  email: string;
  avatarurl?: string | null;
  roles: string;
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
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('atoken');
  });
  const [user, setUserState] = useState<User | null>(null);

  const setUser = (userData: User | null) => {
    setUserState(userData);
  };

  const logout = () => {
    localStorage.removeItem('atoken');
    setIsAuthenticated(false);
    setUser(null);
  };

  useEffect(() => {
    const token = localStorage.getItem('atoken');
    if (token && isAuthenticated && !user) {
      axios.get<VerifyAuthResponse>(`${api.uri}/auth/verify`, {
        headers: { 'Authorization': `Basic ${token}` }
      })
      .then(response => {
        if (response.data && response.data.user) {
          setUser(response.data.user);
        } else {
          logout();
        }
      })
      .catch(() => {
        logout();
      });
    } else if (!isAuthenticated && user) {
        setUser(null);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    console.log('Authentication state changed:', isAuthenticated);
    console.log('User context state:', user);
  }, [isAuthenticated, user]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated, user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}; 