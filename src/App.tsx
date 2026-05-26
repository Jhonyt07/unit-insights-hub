import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/RouteGuard";
import { AppLayout } from "@/components/AppLayout";
import AuthPage from "./pages/Auth";
import PendingApproval from "./pages/PendingApproval";
import Dashboard from "./pages/Dashboard";
import Overview from "./pages/Overview";
import Projecao from "./pages/Projecao";
import AdminMeses from "./pages/admin/Meses";
import AdminSkus from "./pages/admin/Skus";
import AdminFiliais from "./pages/admin/Filiais";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/pending" element={<PendingApproval />} />
            <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/overview" element={<Overview />} />
              <Route path="/projecao" element={<Projecao />} />
            </Route>
            <Route element={<RequireAuth adminOnly><AppLayout /></RequireAuth>}>
              <Route path="/admin/meses" element={<AdminMeses />} />
              <Route path="/admin/skus" element={<AdminSkus />} />
              <Route path="/admin/filiais" element={<AdminFiliais />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
