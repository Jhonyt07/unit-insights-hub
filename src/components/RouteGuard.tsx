import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";

const FullscreenLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-hero">
    <Logo size={64} showText={false} />
    <div className="h-1.5 w-32 bg-primary-foreground/20 rounded-full overflow-hidden">
      <div className="h-full bg-secondary animate-pulse rounded-full" style={{ width: "60%" }} />
    </div>
  </div>
);

export const RequireAuth = ({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) => {
  const { user, loading, status, isAdmin } = useAuth();
  if (loading) return <FullscreenLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (status !== "approved") return <Navigate to="/pending" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};