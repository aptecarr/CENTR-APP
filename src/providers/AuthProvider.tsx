import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isStaff: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // SET_SUPERADMIN_UID_HERE: Add logic to automatically assign Admin role if UID matches
    const superAdminUid = ''; // Placeholder for manual setup

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      if (authUser) {
        try {
          const userDocRef = doc(db, 'users', authUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setProfile(userDoc.data());
          } else {
            // Provision initial profile
            const isFirstAdmin = authUser.uid === superAdminUid || authUser.email === 'aptecar87@gmail.com';
            const newProfile = {
              uid: authUser.uid,
              name: authUser.displayName || authUser.email?.split('@')[0] || 'Користувач',
              email: authUser.email,
              role: isFirstAdmin ? 'Admin' : 'Mentor',
              status: 'active',
              createdAt: new Date().toISOString()
            };
            
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error("Auth initialization error:", error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const isStaff = profile?.role === 'Admin' || profile?.role === 'Senior Mentor' || profile?.role === 'Mentor' || profile?.role === 'Співробітник' || profile?.role === 'Staff';

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logout, isStaff }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
