import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSkus } from "@/hooks/useAppData";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { toast } from "sonner";

type Unidade = "SC" | "TN";
type SkuRow = { codigo: string; descricao: string; ativo: boolean; unidade: Unidade };

const AdminSkus = () => {
  const qc = useQueryClient();
  const { data: skus = [] } = useSkus();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SkuRow | null>(null);
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [unidade, setUnidade] = useState<Unidade>("SC");
  const [ativo, setAtivo] = useState(true);

  const reset = () => {
    setEditing(null);
    setCodigo("");
    setDescricao("");
    setUnidade("SC");
    setAtivo(true);
  };

  const startEdit = (s: any) => {
    setEditing(s);
    setCodigo(s.codigo);
    setDescricao(s.descricao);
    setUnidade((s.unidade as Unidade) ?? "SC");
    setAtivo(s.ativo);
    setOpen(true);
  };

  const save = async () => {
    const code = codigo.trim();
    const desc = descricao.trim();
    if (!code || !desc) return toast.error("Preencha código e descrição.");

    if (editing) {
      const { error } = await supabase
        .from("skus")
        .update({ descricao: desc, ativo, unidade } as any)
        .eq("codigo", editing.codigo);
      if (error) return toast.error(error.message);
      toast.success("SKU atualizado");
    } else {
      const { error } = await supabase
        .from("skus")
        .insert({ codigo: code, descricao: desc, ativo, unidade } as any);
      if (error) return toast.error(error.message);
      toast.success("SKU criado");
    }
    qc.invalidateQueries({ queryKey: ["skus"] });
    setOpen(false);
    reset();
  };

  const remove = async (code: string) => {
    if (!confirm(`Excluir SKU ${code}? Todos os dados vinculados também serão removidos.`)) return;
    const { error } = await supabase.from("skus").delete().eq("codigo", code);
    if (error) return toast.error(error.message);
    toast.success("SKU excluído");
    qc.invalidateQueries({ queryKey: ["skus"] });
    qc.invalidateQueries({ queryKey: ["overview"] });
    qc.invalidateQueries({ queryKey: ["dash-proj"] });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="SKUs" description="Cadastre manualmente os SKUs. SCs aceitam projeção apenas em múltiplos de 1,5." />
      <Card className="p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">{skus.length} SKUs cadastrados</h3>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Novo SKU</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Editar SKU" : "Novo SKU"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código</Label>
                  <Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} disabled={!!editing} placeholder="Ex.: 12345" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição do produto" />
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <RadioGroup value={unidade} onValueChange={(v) => setUnidade(v as Unidade)} className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="SC" /> <span>SC (Saca)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="TN" /> <span>TN (Tonelada)</span>
                    </label>
                  </RadioGroup>
                  {unidade === "SC" && (
                    <p className="text-xs text-muted-foreground">
                      Projeções deste SKU serão arredondadas para múltiplos de <strong>1,5</strong> (1,5 / 3 / 4,5 / 6 ...).
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="ativo" checked={ativo} onCheckedChange={setAtivo} />
                  <Label htmlFor="ativo">Ativo</Label>
                </div>
                {codigo && descricao && (
                  <p className="text-xs text-muted-foreground">
                    Rótulo: <span className="font-mono">{codigo} - {descricao}</span>
                  </p>
                )}
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
              <TableHead className="w-32">Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-24">Unidade</TableHead>
              <TableHead className="w-20">Ativo</TableHead>
              <TableHead className="w-32 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {skus.map((s: any) => (
              <TableRow key={s.codigo}>
                <TableCell className="font-mono">{s.codigo}</TableCell>
                <TableCell>{s.descricao}</TableCell>
                <TableCell>
                  <Badge variant={s.unidade === "SC" ? "default" : "secondary"}>{s.unidade ?? "SC"}</Badge>
                </TableCell>
                <TableCell>{s.ativo ? "Sim" : "Não"}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => startEdit(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(s.codigo)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {skus.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum SKU cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AdminSkus;
