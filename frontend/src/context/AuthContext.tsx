import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import {
  getCurrentUser,
} from "../services/authApi";

import type {
  User,
} from "../services/authApi";

// =====================================================
// AUTH CONTEXT
// =====================================================

interface AuthContextType {
  token: string | null;

  user: User | null;

  loading: boolean;

  isAuthenticated: boolean;

  login: (
    token: string,
    user: User
  ) => void;

  logout: () => void;

  updateUser: (
    user: User
  ) => void;

  updateToken: (
    token: string
  ) => void;
}

// =====================================================
// STORAGE KEYS
// =====================================================

const TOKEN_KEY = "token";

const USER_KEY = "user";

// =====================================================
// CONTEXT
// =====================================================

const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined
  );

// =====================================================
// PROVIDER
// =====================================================

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [token, setToken] =
    useState<string | null>(null);

  const [user, setUser] =
    useState<User | null>(null);

  const [loading, setLoading] =
    useState(true);

  // ===================================================
  // RESTORE SESSION
  // ===================================================

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const savedToken =
          localStorage.getItem(TOKEN_KEY);

        const savedUser =
          localStorage.getItem(USER_KEY);

        // -----------------------------------------------
        // No token = no authenticated session
        // -----------------------------------------------

        if (!savedToken) {
          return;
        }

        // -----------------------------------------------
        // Restore token immediately
        // -----------------------------------------------

        if (mounted) {
          setToken(savedToken);
        }

        // -----------------------------------------------
        // Try restoring saved user
        // -----------------------------------------------

        if (savedUser) {
          try {
            const parsedUser =
              JSON.parse(savedUser);

            if (
              parsedUser &&
              typeof parsedUser === "object" &&
              typeof parsedUser.id === "number" &&
              typeof parsedUser.full_name === "string" &&
              typeof parsedUser.role === "string"
            ) {
              if (mounted) {
                setUser(parsedUser as User);
              }

              return;
            }
          } catch {
            // Invalid stored user.
            // Fall through to /auth/me.
          }
        }

        // -----------------------------------------------
        // USER NOT AVAILABLE IN STORAGE
        //
        // Recover authenticated user from backend.
        // -----------------------------------------------

        const currentUser =
          await getCurrentUser();

        if (!mounted) {
          return;
        }

        if (
          currentUser &&
          typeof currentUser.id === "number" &&
          typeof currentUser.full_name === "string" &&
          typeof currentUser.role === "string"
        ) {
          setUser(currentUser);

          localStorage.setItem(
            USER_KEY,
            JSON.stringify(currentUser)
          );
        } else {
          throw new Error(
            "Invalid current user response."
          );
        }
      } catch (error) {
        console.error(
          "Failed to restore authentication session:",
          error
        );

        if (mounted) {
          localStorage.removeItem(
            TOKEN_KEY
          );

          localStorage.removeItem(
            USER_KEY
          );

          setToken(null);

          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  // ===================================================
  // LOGIN
  // ===================================================

  const login = (
    accessToken: string,
    authenticatedUser: User
  ) => {
    localStorage.setItem(
      TOKEN_KEY,
      accessToken
    );

    localStorage.setItem(
      USER_KEY,
      JSON.stringify(authenticatedUser)
    );

    setToken(accessToken);

    setUser(authenticatedUser);
  };

  // ===================================================
  // LOGOUT
  // ===================================================

  const logout = () => {
    localStorage.removeItem(
      TOKEN_KEY
    );

    localStorage.removeItem(
      USER_KEY
    );

    setToken(null);

    setUser(null);
  };

  // ===================================================
  // UPDATE USER
  // ===================================================

  const updateUser = (
    updatedUser: User
  ) => {
    localStorage.setItem(
      USER_KEY,
      JSON.stringify(updatedUser)
    );

    setUser(updatedUser);
  };

  // ===================================================
  // UPDATE TOKEN
  // ===================================================

  const updateToken = (
    newToken: string
  ) => {
    localStorage.setItem(
      TOKEN_KEY,
      newToken
    );

    setToken(newToken);
  };

  // ===================================================
  // AUTHENTICATION STATE
  // ===================================================

  const isAuthenticated =
    Boolean(
      token &&
      user
    );

  // ===================================================
  // CONTEXT VALUE
  // ===================================================

  const value = useMemo(
    () => ({
      token,

      user,

      loading,

      isAuthenticated,

      login,

      logout,

      updateUser,

      updateToken,
    }),
    [
      token,
      user,
      loading,
      isAuthenticated,
    ]
  );

  // ===================================================
  // PROVIDER
  // ===================================================

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

// =====================================================
// AUTH HOOK
// =====================================================

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}