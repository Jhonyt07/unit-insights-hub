import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Table2,
  Receipt,
  TrendingUp,
  Download,
  Users,
  Upload,
  LogOut,
  Menu,
  ChevronLeft,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/overview", label: "Overview", icon: Table2 },
  { to: "/faturado", label: "Faturado", icon: Receipt },
  { to: "/projecao", label: "Projeção", icon: TrendingUp },
  { to: "/exportacao", label: "Exportação", icon: Download },
];

const adminItems = [
  { to: "/admin/usuarios", label: "Usuários", icon: Users },
  { to: "/admin/upload", label: "Upload Excel", icon: Upload },
];

export const AppLayout = () => {
  const { user, signOut, isAdmin, roles } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const sidebarWidth = collapsed ? "w-16" : "w-60";
  const primaryRole = roles.includes("admin") ? "Admin" : roles.includes("editor") ? "Editor" : "Leitor";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={`hidden md:flex flex-col ${sidebarWidth} bg-sidebar border-r border-sidebar-border transition-all duration-300`}
      >
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
          {collapsed ? (
            <Logo size={32} showText={false} />
          ) : (
            <Logo size={36} />
          )}
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-smooth ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className={`mt-4 mb-1 px-3 text-[10px] uppercase tracking-wider text-muted-foreground ${collapsed ? "hidden" : ""}`}>
                Administração
              </div>
              {adminItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-smooth ${
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              ))}
            </>
          )}
        </nav>
        <div className="p-2 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => setCollapsed((c) => !c)}
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
            {!collapsed && <span className="ml-2">Recolher</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)}>
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border" onClick={(e) => e.stopPropagation()}>
            <div className="h-16 flex items-center px-4 border-b border-sidebar-border"><Logo size={36} /></div>
            <nav className="p-2 space-y-1">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} end={to === "/"} onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}>
                  <Icon className="h-4 w-4" /><span>{label}</span>
                </NavLink>
              ))}
              {isAdmin && adminItems.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}>
                  <Icon className="h-4 w-4" /><span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="md:hidden"><Logo size={32} showText={false} /></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium leading-tight">{user?.email}</div>
              <Badge variant="secondary" className="text-[10px] mt-0.5">{primaryRole}</Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};