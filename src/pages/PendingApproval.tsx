import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { Clock, RefreshCw, LogOut } from "lucide-react";

const PendingApproval = () => {
  const { signOut, refreshProfile, status, user } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="max-w-md w-full shadow-elegant animate-fade-in">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3"><Logo size={56} showText={false} /></div>
          <CardTitle className="text-2xl">
            {status === "rejected" ? "Acesso negado" : "Aguardando aprovação"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${status === "rejected" ? "bg-destructive/10" : "bg-warning/15"}`}>
            <Clock className={`h-8 w-8 ${status === "rejected" ? "text-destructive" : "text-warning"}`} />
          </div>
          <p className="text-sm text-muted-foreground">
            {status === "rejected"
              ? "Seu cadastro foi rejeitado. Entre em contato com o administrador."
              : "Sua conta foi criada com sucesso. Um administrador precisa aprovar seu acesso e liberar as filiais que você poderá visualizar."}
          </p>
          <p className="text-xs text-muted-foreground">Conta: {user?.email}</p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={refreshProfile}>
              <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
            </Button>
            <Button variant="ghost" className="flex-1" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingApproval;