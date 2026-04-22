import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFiliais, useMesesHabilitados } from "@/hooks/useAppData";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ShieldCheck, ShieldX, Settings, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { fmtMonth } from "@/lib/format";

type Profile = { id: string; email: string; full_name: string | null; status: "pending" | "approved" | "rejected"; created_at: string };
type RoleType = "admin" | "editor" | "leitor";

const AdminUsuarios = () => {
  const qc = useQueryClient();
  const { data: filiais = [] } = useFiliais();
  const { data: meses = [] } = useMesesHabilitados();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Profile | null>(null);
  const [editFiliais, setEditFiliais] = useState<Set<number>>(new Set());
  const [editRole, setEditRole] = useState<RoleType>("leitor");

  const { data: profiles = [], isLoading } = useQuery<Profile[]>({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => (await supabase.from("user_roles").select("user_id, role")).data ?? [],
  });

  const { data: userFiliais = [] } = useQuery({
    queryKey: ["all-user-filiais"],
    queryFn: async () => (await supabase.from("user_filiais").select("user_id, filial_id")).data ?? [],
  });

  const rolesByUser = useMemo(() => {
    const m = new Map<string, RoleType[]>();
    for (const r of roles) {
      const arr = m.get(r.user_id) ?? [];
      arr.push(r.role as RoleType);
      m.set(r.user_id, arr);
    }
    return m;
  }, [roles]);

  const filiaisByUser = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const r of userFiliais) {
      const arr = m.get(r.user_id) ?? [];
      arr.push(r.filial_id);
      m.set(r.user_id, arr);
    }
    return m;
  }, [userFiliais]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return profiles.filter((p) => p.email.toLowerCase().includes(q) || (p.full_name ?? "").toLowerCase().includes(q));
  }, [profiles, search]);

  const openEdit = (p: Profile) => {
    setEditing(p);
    setEditFiliais(new Set(filiaisByUser.get(p.id) ?? []));
    const userRoles = rolesByUser.get(p.id) ?? ["leitor"];
    setEditRole(userRoles.includes("admin") ? "admin" : userRoles.includes("editor") ? "editor" : "leitor");
  };

  const setStatus = async (id: string, status: "approved" | "rejected" | "pending") => {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    qc.invalidateQueries({ queryKey: ["admin-profiles"] });
  };

  const saveAccess = async () => {
    if (!editing) return;
    // Update role: delete existing roles, insert new one
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", editing.id);
    if (delErr) return toast.error(delErr.message);
    const { error: roleErr } = await supabase.from("user_roles").insert({ user_id: editing.id, role: editRole });
    if (roleErr) return toast.error(roleErr.message);
    // Update filiais
    const { error: delFErr } = await supabase.from("user_filiais").delete().eq("user_id", editing.id);
    if (delFErr) return toast.error(delFErr.message);
    if (editFiliais.size > 0) {
      const { error } = await supabase.from("user_filiais").insert(
        Array.from(editFiliais).map((fid) => ({ user_id: editing.id, filial_id: fid }))
      );
      if (error) return toast.error(error.message);
    }
    toast.success("Acessos salvos!");
    qc.invalidateQueries({ queryKey: ["all-roles"] });
    qc.invalidateQueries({ queryKey: ["all-user-filiais"] });
    setEditing(null);
  };

  const toggleMes = async (mes: string, currentlyEnabled: boolean) => {
    const { error } = await supabase.from("meses_habilitados").upsert(
      { mes, habilitado: !currentlyEnabled },
      { onConflict: "mes" }
    );
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["meses_habilitados"] });
  };

  const statusBadge = (s: Profile["status"]) => {
    const map = {
      pending: { label: "Pendente", variant: "secondary" as const, cls: "bg-warning/15 text-warning border-warning/30" },
      approved: { label: "Aprovado", variant: "secondary" as const, cls: "bg-success/15 text-success border-success/30" },
      rejected: { label: "Rejeitado", variant: "secondary" as const, cls: "bg-destructive/15 text-destructive border-destructive/30" },
    };
    return <Badge variant="outline" className={map[s].cls}>{map[s].label}</Badge>;
  };

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Administração" description="Gerencie usuários, papéis, acessos por filial e meses habilitados para edição." />

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="meses">Meses Habilitados</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="p-4 mb-4">
            <Input placeholder="Buscar por nome ou e-mail" value={search} onChange={(e) => setSearch(e.target.value)} />
          </Card>
          <Card className="overflow-hidden shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2">Nome / E-mail</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Papel</th>
                  <th className="text-left px-4 py-2">Filiais</th>
                  <th className="text-right px-4 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const r = rolesByUser.get(p.id) ?? [];
                  const fl = filiaisByUser.get(p.id) ?? [];
                  const role = r.includes("admin") ? "Admin" : r.includes("editor") ? "Editor" : "Leitor";
                  return (
                    <tr key={p.id} className="border-b border-border hover:bg-accent/20">
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.full_name ?? "-"}</div>
                        <div className="text-xs text-muted-foreground">{p.email}</div>
                      </td>
                      <td className="px-4 py-3">{statusBadge(p.status)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{role}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{fl.length} filial(is)</Badge>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        {p.status !== "approved" && (
                          <Button size="sm" variant="outline" className="bg-success/10 text-success border-success/30 hover:bg-success/20" onClick={() => setStatus(p.id, "approved")}>
                            <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Aprovar
                          </Button>
                        )}
                        {p.status !== "rejected" && (
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => setStatus(p.id, "rejected")}>
                            <ShieldX className="h-3.5 w-3.5 mr-1" /> Rejeitar
                          </Button>
                        )}
                        <Button size="sm" variant="default" onClick={() => openEdit(p)}>
                          <Settings className="h-3.5 w-3.5 mr-1" /> Acesso
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="meses">
          <Card className="p-6 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <CalendarRange className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Habilitar meses para edição de projeção</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Marque os meses que os usuários poderão preencher na tela Overview. O próximo mês desabilitado vira a coluna editável.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {meses.map((m) => (
                <label key={m.mes} className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-smooth ${m.habilitado ? "border-success bg-success/5" : "border-border bg-muted/30"}`}>
                  <Checkbox checked={m.habilitado} onCheckedChange={() => toggleMes(m.mes, m.habilitado)} />
                  <span className="font-medium">{fmtMonth(m.mes)}</span>
                </label>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit drawer */}
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Configurar acesso</SheetTitle>
            <SheetDescription>{editing?.full_name} • {editing?.email}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div>
              <label className="text-sm font-medium">Papel</label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as RoleType)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="leitor">Leitor — somente visualizar</SelectItem>
                  <SelectItem value="editor">Editor — pode preencher projeção</SelectItem>
                  <SelectItem value="admin">Admin — controle total</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Filiais permitidas ({editFiliais.size})</label>
                <div className="space-x-2">
                  <Button size="sm" variant="outline" onClick={() => setEditFiliais(new Set(filiais.map((f) => f.id)))}>Todas</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditFiliais(new Set())}>Limpar</Button>
                </div>
              </div>
              <div className="border rounded-lg max-h-96 overflow-y-auto">
                {filiais.map((f) => (
                  <label key={f.id} className="flex items-center gap-2 px-3 py-2 hover:bg-accent/20 cursor-pointer border-b last:border-0">
                    <Checkbox checked={editFiliais.has(f.id)} onCheckedChange={(v) => {
                      const next = new Set(editFiliais);
                      if (v) next.add(f.id); else next.delete(f.id);
                      setEditFiliais(next);
                    }} />
                    <span className="text-sm">{f.nome}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={saveAccess}>Salvar acessos</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminUsuarios;