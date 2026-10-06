import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppState, useAppDispatch } from '../../context/AppContext';
import { Lock, Mail, User as UserIcon, LogOut, LogIn, UserPlus, RefreshCw, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { user, loading, login, register, logout, syncWithFirestore } = useAuth();
  const { transactions } = useAppState();
  const dispatch = useAppDispatch();

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      if (isRegistering) {
        if (!email || !password || !name) {
          throw new Error('Bitte fülle alle Pflichtfelder aus.');
        }
        if (password.length < 6) {
          throw new Error('Das Passwort muss mindestens 6 Zeichen lang sein.');
        }
        await register(email, password, name);
        setSuccessMsg('Erfolgreich registriert! Dein Konto ist jetzt mit der Cloud verbunden.');
      } else {
        if (!email || !password) {
          throw new Error('Bitte fülle E-Mail und Passwort aus.');
        }
        await login(email, password);
        setSuccessMsg('Erfolgreich angemeldet!');
      }
    } catch (err: any) {
      console.error('Auth error', err);
      let msg = 'Ein Fehler ist aufgetreten.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'Diese E-Mail-Adresse wird bereits verwendet.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        msg = 'E-Mail oder Passwort sind falsch.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Die E-Mail-Adresse ist ungültig.';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const { syncedCount, fetchedTransactions } = await syncWithFirestore(transactions);
      // Update local state with merged transactions from Firestore
      if (fetchedTransactions.length > 0) {
        dispatch({
          type: 'IMPORT_DATA',
          payload: {
            transactions: fetchedTransactions
          }
        });
      }
      setSuccessMsg(`Synchronisation erfolgreich! ${syncedCount} neue Belege in die Firestore-Datenbank geladen.`);
    } catch (err: any) {
      console.error('Sync error', err);
      setError(err.message || 'Fehler bei der Synchronisation mit Firestore.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setSuccessMsg('Abgemeldet.');
    } catch (err: any) {
      setError(err.message || 'Fehler beim Abmelden');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Lade Firebase Authentication...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {user ? (
        /* Logged in state */
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
              <ShieldCheck size={32} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Cloud & Datenbank verbunden</div>
              <h3 className="text-lg font-bold">{user.displayName || 'Finanzprofi'}</h3>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-secondary/30 border border-border/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">Lokale Belege & Transaktionen</span>
              <span className="text-xs font-mono font-bold bg-primary/10 px-2 py-0.5 rounded-md text-primary">{transactions.length} Belege</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Mit dem Firestore-Cloud-Speicher werden deine Belege, Ausgaben und Kategorien sicher verschlüsselt und geräteübergreifend synchronisiert.
            </p>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all shadow-lg disabled:opacity-50"
            >
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Synchronisiere mit Firestore...' : 'Mit Firestore Datenbank synchronisieren'}
            </button>
          </div>

          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-3">
              <CheckCircle size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-3">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={handleLogout}
              className="w-full py-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 border border-rose-500/20"
            >
              <LogOut size={16} />
              Abmelden
            </button>
          </div>
        </div>
      ) : (
        /* Not logged in (Login or Register form) */
        <div className="space-y-6">
          <div className="flex rounded-2xl bg-secondary/40 p-1.5 border border-border/10">
            <button
              type="button"
              onClick={() => { setIsRegistering(false); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${!isRegistering ? 'bg-background text-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LogIn size={14} />
              Anmelden
            </button>
            <button
              type="button"
              onClick={() => { setIsRegistering(true); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${isRegistering ? 'bg-background text-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <UserPlus size={14} />
              Registrieren
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Name / Anzeigename</label>
                <div className="relative">
                  <UserIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="z.B. Max Mustermann"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-secondary/50 border border-border/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">E-Mail-Adresse</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@beispiel.de"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-secondary/50 border border-border/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Passwort (min. 6 Zeichen)</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-secondary/50 border border-border/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
                <CheckCircle size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>{isRegistering ? 'Registriere Konto...' : 'Melde an...'}</span>
                </>
              ) : (
                <>
                  {isRegistering ? <UserPlus size={16} /> : <LogIn size={16} />}
                  <span>{isRegistering ? 'Jetzt kostenlos registrieren' : 'Anmelden'}</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
export default AuthModal;
