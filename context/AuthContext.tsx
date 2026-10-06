import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile,
  User 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Transaction } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  register: (email: string, pass: string, name: string) => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  syncWithFirestore: (localTransactions: Transaction[]) => Promise<{ syncedCount: number; fetchedTransactions: Transaction[] }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const register = async (email: string, pass: string, name: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const newUser = userCredential.user;
    if (name) {
      await updateProfile(newUser, { displayName: name });
    }
    const now = Date.now();
    await setDoc(doc(db, 'users', newUser.uid), {
      userId: newUser.uid,
      email: newUser.email || email,
      displayName: name || 'Finanzprofi',
      createdAt: now,
      updatedAt: now
    });
    setUser({ ...newUser, displayName: name } as User);
  };

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const syncWithFirestore = async (localTransactions: Transaction[]): Promise<{ syncedCount: number; fetchedTransactions: Transaction[] }> => {
    if (!user) {
      throw new Error('Nicht angemeldet. Bitte einloggen, um Daten zu synchronisieren.');
    }
    const uid = user.uid;
    const now = Date.now();

    // Ensure user doc exists
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) {
      await setDoc(userDocRef, {
        userId: uid,
        email: user.email || '',
        displayName: user.displayName || 'Finanzprofi',
        createdAt: now,
        updatedAt: now
      });
    }

    // 1. Fetch existing transactions from Firestore
    const txColRef = collection(db, 'users', uid, 'transactions');
    const querySnapshot = await getDocs(txColRef);
    const firestoreTxMap = new Map<string, Transaction>();
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      firestoreTxMap.set(data.id, {
        id: data.id,
        type: data.type,
        amount: data.amount,
        description: data.description || '',
        date: data.date,
        categoryId: data.categoryId,
        goalId: data.goalId,
        tags: data.tags,
        liabilityId: data.liabilityId
      });
    });

    // 2. Upload any local transactions not yet in Firestore
    const batch = writeBatch(db);
    let newUploadCount = 0;

    for (const tx of localTransactions) {
      if (!firestoreTxMap.has(tx.id)) {
        const docRef = doc(db, 'users', uid, 'transactions', tx.id);
        batch.set(docRef, {
          id: tx.id,
          userId: uid,
          type: tx.type,
          amount: Number(tx.amount) || 0,
          description: String(tx.description || '').slice(0, 1000),
          date: String(tx.date || '').slice(0, 50),
          categoryId: tx.categoryId || null,
          goalId: tx.goalId || null,
          tags: Array.isArray(tx.tags) ? tx.tags.slice(0, 20) : [],
          liabilityId: tx.liabilityId || null,
          createdAt: now,
          updatedAt: now
        });
        newUploadCount++;
        firestoreTxMap.set(tx.id, tx);
      }
    }

    if (newUploadCount > 0) {
      await batch.commit();
    }

    const allTransactions = Array.from(firestoreTxMap.values());
    return { syncedCount: newUploadCount, fetchedTransactions: allTransactions };
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, syncWithFirestore }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
