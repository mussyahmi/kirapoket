"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  deleteUser,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { deleteAllUserData, updateUserProfile } from "@/lib/firestore";
import { Timestamp } from "firebase/firestore";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteUserAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (firebaseUser) {
        updateUserProfile(firebaseUser.uid, { lastLogin: Timestamp.now() });
      }
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const deleteUserAccount = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Not authenticated");
    await deleteAllUserData(currentUser.uid);
    await deleteUser(currentUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut, deleteUserAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
