import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "editor" | "leitor";
export type UserStatus = "pending" | "approved" | "rejected";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  status: UserStatus | null;
  roles: AppRole[];
  filiais: number[];
  isAdmin: boolean;
  isEditor: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [filiais, setFiliais] = useState<number[]>([]);

  const loadProfile = async (uid: string) => {
    const [{ data: profile }, { data: rolesData }, { data: filiaisData }] = await Promise.all([
      supabase.from("profiles").select("status").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("user_filiais").select("filial_id").eq("user_id", uid),
    ]);
    setStatus((profile?.status as UserStatus) ?? null);
    setRoles((rolesData ?? []).map((r) => r.role as AppRole));
    setFiliais((filiaisData ?? []).map((f) => f.filial_id));
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  useEffect(() => {
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // defer to avoid deadlock
        setTimeout(() => loadProfile(sess.user.id), 0);
      } else {
        setStatus(null);
        setRoles([]);
        setFiliais([]);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) loadProfile(sess.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setStatus(null);
    setRoles([]);
    setFiliais([]);
  };

  const isAdmin = roles.includes("admin");
  const isEditor = isAdmin || roles.includes("editor");

  return (
    <AuthContext.Provider
      value={{ user, session, loading, status, roles, filiais, isAdmin, isEditor, refreshProfile, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};