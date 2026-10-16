import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { makeId, readStorage, STORAGE_KEYS, writeStorage } from '../lib/catalog.js';
import { hasSupabaseConfig, supabase } from '../lib/supabase.js';

const AuthContext = createContext(null);

function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

function normalizeIndianPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  const tenDigitPhone = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;

  if (!/^[6-9]\d{9}$/.test(tenDigitPhone)) {
    throw new Error('Enter a valid 10 digit Indian mobile number.');
  }

  return `+91${tenDigitPhone}`;
}

function profileToUser(authUser, profile) {
  if (!authUser) return null;

  return {
    id: authUser.id,
    name: profile?.name || authUser.user_metadata?.name || '',
    email: profile?.email || authUser.email || '',
    phone: profile?.phone || authUser.phone || authUser.user_metadata?.phone || '',
    role: profile?.role || 'customer',
  };
}

function getSavedUsers() {
  const saved = readStorage(STORAGE_KEYS.users, []);
  const legacyDemoAccounts = new Set(['admin-demo', 'customer-demo']);
  const legacyDemoEmails = new Set(['admin@ajiomart.com', 'customer@ajiomart.com']);
  const filtered = saved.filter(
    (account) => !legacyDemoAccounts.has(account.id) && !legacyDemoEmails.has(account.email?.toLowerCase()),
  );

  if (filtered.length !== saved.length) writeStorage(STORAGE_KEYS.users, filtered);
  return filtered;
}

function getSavedSession() {
  const session = readStorage(STORAGE_KEYS.session, null);
  if (session?.id === 'admin-demo' || session?.id === 'customer-demo') {
    window.localStorage.removeItem(STORAGE_KEYS.session);
    return null;
  }
  return session;
}

async function fetchProfile(userId) {
  if (!supabase || !userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function fetchVisibleProfiles() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, phone, role, created_at')
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(() => (hasSupabaseConfig ? [] : getSavedUsers()));
  const [sessionUser, setSessionUser] = useState(() =>
    hasSupabaseConfig ? null : getSavedSession(),
  );
  const [loading, setLoading] = useState(hasSupabaseConfig);

  useEffect(() => {
    if (!supabase) return undefined;

    let mounted = true;

    async function loadSupabaseSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (!session?.user) {
          setSessionUser(null);
          setUsers([]);
          return;
        }

        const profile = await fetchProfile(session.user.id);
        if (!mounted) return;

        setSessionUser(profileToUser(session.user, profile));
        setUsers(await fetchVisibleProfiles());
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSupabaseSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(async () => {
        if (!mounted) return;

        if (!session?.user) {
          setSessionUser(null);
          setUsers([]);
          setLoading(false);
          return;
        }

        try {
          const profile = await fetchProfile(session.user.id);
          if (!mounted) return;
          setSessionUser(profileToUser(session.user, profile));
          setUsers(await fetchVisibleProfiles());
        } finally {
          if (mounted) setLoading(false);
        }
      }, 0);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  function persistUsers(nextUsers) {
    setUsers(nextUsers);
    writeStorage(STORAGE_KEYS.users, nextUsers);
  }

  function persistSession(user) {
    const safeUser = sanitizeUser(user);
    setSessionUser(safeUser);
    if (safeUser) writeStorage(STORAGE_KEYS.session, safeUser);
    else window.localStorage.removeItem(STORAGE_KEYS.session);
  }

  async function refreshSessionUser(authUser) {
    const profile = await fetchProfile(authUser.id);
    const nextUser = profileToUser(authUser, profile);
    setSessionUser(nextUser);
    setUsers(await fetchVisibleProfiles());
    return nextUser;
  }

  async function signIn({ email, password }) {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Supabase did not return a user session.');
      return refreshSessionUser(data.user);
    }

    const match = users.find(
      (user) => user.email.toLowerCase() === email.trim().toLowerCase() && user.password === password,
    );

    if (!match) throw new Error('Check your email and password, then try again.');
    persistSession(match);
    return sanitizeUser(match);
  }

  async function signUp({ name, email, phone, password }) {
    if (!name.trim()) throw new Error('Name is required.');
    if (!email.trim()) throw new Error('Email is required.');
    if (password.length < 6) throw new Error('Use at least 6 characters for the password.');
    const normalizedPhone = normalizeIndianPhone(phone);

    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            name: name.trim(),
            phone: normalizedPhone,
          },
        },
      });

      if (error) throw error;
      if (data.user && data.session) return refreshSessionUser(data.user);
      return data.user;
    }

    const alreadyExists = users.some((user) => user.email.toLowerCase() === email.trim().toLowerCase());
    if (alreadyExists) throw new Error('This email already has an Ajiomart account.');

    const nextUser = {
      id: makeId('user'),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: normalizedPhone,
      password,
      role: 'customer',
    };

    persistUsers([...users, nextUser]);
    persistSession(nextUser);
    return sanitizeUser(nextUser);
  }

  async function signOut() {
    if (supabase) {
      setSessionUser(null);
      setUsers([]);
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      return;
    }

    persistSession(null);
  }

  async function deleteAccount() {
    if (!sessionUser) throw new Error('Sign in again before deleting your account.');

    if (supabase) {
      await signOut();
      return {
        message:
          'You have been signed out. Supabase account deletion requires a server-side admin function before it can be permanent.',
      };
    }

    const nextUsers = users.filter((user) => user.id !== sessionUser.id);
    persistUsers(nextUsers);
    persistSession(null);
    return { message: 'Your Ajiomart account has been deleted on this device.' };
  }

  const value = useMemo(
    () => ({
      user: sessionUser,
      users: users.map(sanitizeUser),
      isAdmin: sessionUser?.role === 'admin',
      loading,
      usingSupabase: hasSupabaseConfig,
      signIn,
      signUp,
      signOut,
      deleteAccount,
    }),
    [sessionUser, users, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
