import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

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

    let unsubscribeDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = undefined;
      }
      
      if (authUser) {
        let isFirstFetch = true;
        
        unsubscribeDoc = onSnapshot(doc(db, 'users', authUser.uid), async (userDoc) => {
          if (userDoc.exists()) {
            setProfile(userDoc.data());
          } else if (isFirstFetch) {
            // Provision initial profile
            const isFirstAdmin = authUser.uid === superAdminUid || authUser.email === 'aptecar87@gmail.com';
            const newProfile = {
              uid: authUser.uid,
              name: authUser.displayName || authUser.email?.split('@')[0] || 'Користувач',
              email: authUser.email,
              role: isFirstAdmin ? 'Admin' : 'Mentor',
              status: 'active',
              permissions: {
                isAdmin: isFirstAdmin,
                isFinanceResponsible: false,
                isScheduleManager: false
              },
              createdAt: new Date().toISOString()
            };
            
            try {
              await setDoc(doc(db, 'users', authUser.uid), newProfile);
              // Optimistically set profile to avoid flashing
              setProfile(newProfile);
            } catch (err) {
              console.error("Auth initialization error:", err);
            }
          }
          isFirstFetch = false;
        }, (error) => {
          console.error("Error fetching profile via onSnapshot:", error);
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
      }
      unsubscribeAuth();
    };
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
