import { createContext, useContext, useMemo, useState } from 'react';
import { demoUsers, makeId, readStorage, STORAGE_KEYS, writeStorage } from '../lib/catalog.js';

const AuthContext = createContext(null);

function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

function getSavedUsers() {
  const saved = readStorage(STORAGE_KEYS.users, null);
  if (!saved?.length) {
    writeStorage(STORAGE_KEYS.users, demoUsers);
    return demoUsers;
  }
  return saved;
}

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(getSavedUsers);
  const [sessionUser, setSessionUser] = useState(() => readStorage(STORAGE_KEYS.session, null));

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

  async function signIn({ email, password }) {
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

    const alreadyExists = users.some((user) => user.email.toLowerCase() === email.trim().toLowerCase());
    if (alreadyExists) throw new Error('This email already has an Ajiomart account.');

    const nextUser = {
      id: makeId('user'),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      role: 'customer',
    };

    persistUsers([...users, nextUser]);
    persistSession(nextUser);
    return sanitizeUser(nextUser);
  }

  async function signOut() {
    persistSession(null);
  }

  async function deleteAccount() {
    if (!sessionUser) throw new Error('Sign in again before deleting your account.');
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
      signIn,
      signUp,
      signOut,
      deleteAccount,
    }),
    [sessionUser, users],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
