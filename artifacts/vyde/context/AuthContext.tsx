import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  name: string;
  email: string;
  initials: string;
  avatarColor: string;
}

interface AuthContextType {
  isSignedIn: boolean;
  user: User | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const MOCK_USER: User = {
  name: 'Alex Rivera',
  email: 'alex.rivera@gmail.com',
  initials: 'AR',
  avatarColor: '#E84A27',
};

const AUTH_KEY = 'vyde_auth_v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(AUTH_KEY).then(val => {
      if (val === 'signed_in') setIsSignedIn(true);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  const signIn = async () => {
    await AsyncStorage.setItem(AUTH_KEY, 'signed_in');
    setIsSignedIn(true);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
    setIsSignedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isSignedIn, user: isSignedIn ? MOCK_USER : null, signIn, signOut, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
