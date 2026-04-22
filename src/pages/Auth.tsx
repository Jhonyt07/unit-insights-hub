import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Nome muito curto").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});

const signInSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

const AuthPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [signUp, setSignUp] = useState({ fullName: "", email: "", password: "" });
  const [signIn, setSignIn] = useState({ email: "", password: "" });

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse(signUp);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: { full_name: parsed.data.fullName },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
      toast.success("Cadastro criado! Verifique seu e-mail para confirmar a conta.");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar conta");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse(signIn);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error) throw error;
      toast.success("Bem-vindo!");
      navigate("/", { replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao entrar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-6 text-primary-foreground">
          <div className="inline-flex items-center justify-center mb-4 bg-card/95 backdrop-blur rounded-2xl p-4 shadow-glow">
            <Logo size={64} showText={false} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Plataforma Copagril</h1>
          <p className="text-sm opacity-90 mt-1">Projeção de Rações & Farelos</p>
        </div>

        <Card className="shadow-elegant">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Acesse sua conta</CardTitle>
            <CardDescription>Entre ou crie um cadastro para continuar</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="si-email">E-mail</Label>
                    <Input id="si-email" type="email" autoComplete="email" required
                      value={signIn.email}
                      onChange={(e) => setSignIn((s) => ({ ...s, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="si-pass">Senha</Label>
                    <Input id="si-pass" type="password" autoComplete="current-password" required
                      value={signIn.password}
                      onChange={(e) => setSignIn((s) => ({ ...s, password: e.target.value }))}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="su-name">Nome completo</Label>
                    <Input id="su-name" required value={signUp.fullName}
                      onChange={(e) => setSignUp((s) => ({ ...s, fullName: e.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="su-email">E-mail</Label>
                    <Input id="su-email" type="email" autoComplete="email" required
                      value={signUp.email}
                      onChange={(e) => setSignUp((s) => ({ ...s, email: e.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="su-pass">Senha</Label>
                    <Input id="su-pass" type="password" autoComplete="new-password" required
                      value={signUp.password}
                      onChange={(e) => setSignUp((s) => ({ ...s, password: e.target.value }))} />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar conta
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Após confirmar o e-mail e fazer login, sua conta ficará pendente até o admin liberar.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;