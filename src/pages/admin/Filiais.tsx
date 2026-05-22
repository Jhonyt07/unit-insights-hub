import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFiliais } from "@/hooks/useAppData";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";

type FilialRow = { id: number; nome: string; ativo: boolean };

const AdminFiliais = () => {
  const qc = useQueryClient();
  const { data: filiais = [] } = useFiliais();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FilialRow | null>(null);
  const [id, setId] = useState<string>("");
  const [nome, setNome] = useState("");
  const [ativo, setAtivo] = useState(true);

  const reset = () => {
    setEditing(null);
    setId("");
    setNome("");
    setAtivo(true);
  };

  const startEdit = (f: FilialRow) => {
    setEditing(f);
    setId(String(f.id));
    setNome(f.nome);
    setAtivo(f.ativo);
    setOpen(true);
  };

  const save = async () => {
    const idNum = Number(id);
    const nm = nome.trim();
    if (!Number.isInteger(idNum) || idNum <= 0) return toast.error("ID inválido.");
    if (!nm) return toast.error("Informe o nome.");

    if (editing) {
      const { error } = await supabase
        .from("filiais")
        .update({ nome: nm, ativo })
        .eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Filial atualizada");
    } else {
      const { error } = await supabase.from("filiais").insert({ id: idNum, nome: nm, ativo });
      if (error) return toast.error(error.message);
      toast.success("Filial criada");
    }
    qc.invalidateQueries({ queryKey: ["filiais"] });
    setOpen(false);
    reset();
  };

  const remove = async (fid: number) => {
    if (!confirm(`Excluir filial ${fid}? Todos os dados vinculados também serão removidos.`)) return;
    const { error } = await supabase.from("filiais").delete().eq("id", fid);
    if (error) return toast.error(error.message);
    toast.success("Filial excluída");
    qc.invalidateQueries({ queryKey: ["filiais"] });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Filiais"
        description="Cadastre manualmente as filiais usadas nos lançamentos."
      />
      <Card className="p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">{filiais.length} filiais cadastradas</h3>
          </div>
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) reset();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" /> Nova Filial
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Filial" : "Nova Filial"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="id">ID</Label>
                  <Input
                    id="id"
                    type="number"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    disabled={!!editing}
                    placeholder="Ex.: 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome da filial"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="ativo" checked={ativo} onCheckedChange={setAtivo} />
                  <Label htmlFor="ativo">Ativa</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={save}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">ID</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="w-24">Ativa</TableHead>
              <TableHead className="w-32 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filiais.map((f: any) => (
              <TableRow key={f.id}>
                <TableCell className="font-mono">{f.id}</TableCell>
                <TableCell>{f.nome}</TableCell>
                <TableCell>{f.ativo ? "Sim" : "Não"}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => startEdit(f)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(f.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filiais.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhuma filial cadastrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AdminFiliais;
