import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFiliais, useMesesHabilitados, useSkus } from "@/hooks/useAppData";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fmtNumber } from "@/lib/format";
import { Loader2, Search, Pencil, Lock } from "lucide-react";
import { toast } from "sonner";

const MES_ORDER = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

// Snap to nearest multiple of 1.5 for SC unit
const snapSC = (n: number) => Math.max(0, Math.round(n / 1.5) * 1.5);

const Overview = () => {
  const { isEditor, filiais: userFiliais, isAdmin } = useAuth();
  const { data: filiais = [] } = useFiliais();
  const { data: meses = [] } = useMesesHabilitados();
  const { data: skus = [] } = useSkus();
  const queryClient = useQueryClient();

  const visibleFiliais = useMemo(
    () => filiais.filter((f) => isAdmin || userFiliais.includes(f.id)),
    [filiais, isAdmin, userFiliais]
  );

  const [filialSel, setFilialSel] = useState<number | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (visibleFiliais.length && filialSel !== "all" && !visibleFiliais.find((f) => f.id === filialSel)) {
      setFilialSel("all");
    }
  }, [visibleFiliais, filialSel]);

  // Months that exist in meses_habilitados, in calendar order
  const monthsCols = useMemo(() => {
    const set = new Set(meses.map((m) => m.mes));
    return MES_ORDER.filter((m) => set.has(m));
  }, [meses]);

  // Last enabled month is the most-recent enabled (highest index)
  const projectionMonth = useMemo(() => {
    const enabledIdx = meses
      .filter((m) => m.habilitado)
      .map((m) => MES_ORDER.indexOf(m.mes))
      .filter((i) => i >= 0)
      .sort((a, b) => a - b);
    if (!enabledIdx.length) return null;
    const lastIdx = enabledIdx[enabledIdx.length - 1];
    // next month (any month after) — find next existing in meses table
    for (let i = lastIdx + 1; i < MES_ORDER.length; i++) {
      if (meses.find((m) => m.mes === MES_ORDER[i] && !m.habilitado)) return MES_ORDER[i];
    }
    return null;
  }, [meses]);

  const filialFilter = filialSel === "all" ? visibleFiliais.map((f) => f.id) : [filialSel];
  const dataQuery = useQuery({
    queryKey: ["overview", filialFilter.join(",")],
    enabled: filialFilter.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dados_overview")
        .select("sku_codigo, filial_id, mes, valor")
        .in("filial_id", filialFilter);
      if (error) throw error;
      return data ?? [];
    },
  });

  const pivot = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const r of dataQuery.data ?? []) {
      if (!m.has(r.sku_codigo)) m.set(r.sku_codigo, new Map());
      m.get(r.sku_codigo)!.set(r.mes, (m.get(r.sku_codigo)!.get(r.mes) ?? 0) + Number(r.valor));
    }
    return m;
  }, [dataQuery.data]);

  // Show ALL active SKUs (so newly created ones appear immediately)
  const skusToShow = useMemo(() => {
    const list = skus.filter((s: any) => s.ativo !== false);
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(
      (s: any) => s.codigo.toLowerCase().includes(q) || s.descricao.toLowerCase().includes(q)
    );
  }, [skus, search]);

  const totalsByMonth = useMemo(() => {
    const t = new Map<string, number>();
    for (const [, inner] of pivot) for (const [m, v] of inner) t.set(m, (t.get(m) ?? 0) + v);
    return t;
  }, [pivot]);

  const handleEdit = async (sku: any, mes: string, raw: string) => {
    let valor = parseFloat(raw.replace(",", ".")) || 0;
    if (sku.unidade === "SC") valor = snapSC(valor);

    if (filialSel === "all") {
      toast.error("Selecione uma filial específica para editar.");
      return;
    }
    const filial_id = filialSel as number;
    const { error } = await supabase
      .from("dados_overview")
      .upsert(
        { sku_codigo: sku.codigo, filial_id, mes, valor, updated_by: (await supabase.auth.getUser()).data.user?.id },
        { onConflict: "sku_codigo,filial_id,mes" }
      );
    if (error) return toast.error("Erro ao salvar: " + error.message);
    toast.success(`Salvo: ${sku.codigo} • ${mes} = ${fmtNumber(valor, 2)} ${sku.unidade}`);
    queryClient.invalidateQueries({ queryKey: ["overview"] });
    queryClient.invalidateQueries({ queryKey: ["dash-proj"] });
    queryClient.invalidateQueries({ queryKey: ["projecao"] });
  };

  if (dataQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Overview"
        description="Análise mensal de Rações & Farelos. As colunas em destaque podem ser editadas."
      />

      <Card className="p-4 mb-4 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground">Filial</label>
            <Select value={String(filialSel)} onValueChange={(v) => setFilialSel(v === "all" ? "all" : Number(v))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as minhas filiais ({visibleFiliais.length})</SelectItem>
                {visibleFiliais.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground">Buscar SKU</label>
            <div className="relative mt-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Código ou descrição"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="text-xs text-muted-foreground self-end pb-2">
            <Badge variant="outline" className="mr-2">{skusToShow.length} SKUs</Badge>
            {projectionMonth && filialSel !== "all" && isEditor && (
              <Badge className="bg-editable text-editable-foreground border-editable-border">
                <Pencil className="mr-1 h-3 w-3" /> Editando: {projectionMonth}
              </Badge>
            )}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden shadow-card">
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-20">
              <tr className="bg-primary text-primary-foreground">
                <th className="text-left px-3 py-2 sticky left-0 bg-primary z-30 min-w-[280px]">SKU</th>
                <th className="px-2 py-2 text-center min-w-[56px]">Un.</th>
                {monthsCols.map((m) => (
                  <th key={m} className="px-2 py-2 text-right min-w-[80px] font-medium">{m}</th>
                ))}
                {projectionMonth && (
                  <th className="px-2 py-2 text-right min-w-[110px] bg-secondary text-secondary-foreground border-l-2 border-secondary">
                    Proj. {projectionMonth}
                  </th>
                )}
              </tr>
              <tr className="bg-primary/90 text-primary-foreground text-[11px]">
                <th className="text-left px-3 py-1.5 sticky left-0 bg-primary/90 z-30 font-semibold">Totais</th>
                <th />
                {monthsCols.map((m) => (
                  <td key={m} className="px-2 py-1.5 text-right font-semibold tabular-nums">
                    {fmtNumber(totalsByMonth.get(m) ?? 0, 0)}
                  </td>
                ))}
                {projectionMonth && (
                  <td className="px-2 py-1.5 text-right font-semibold tabular-nums bg-secondary/30">
                    {fmtNumber(totalsByMonth.get(projectionMonth) ?? 0, 0)}
                  </td>
                )}
              </tr>
            </thead>
            <tbody>
              {skusToShow.map((sku: any, i) => {
                const inner = pivot.get(sku.codigo);
                const isSC = (sku.unidade ?? "SC") === "SC";
                return (
                  <tr key={sku.codigo} className={`border-b border-border ${i % 2 === 0 ? "bg-background" : "bg-muted/30"} hover:bg-accent/20`}>
                    <td className="px-3 py-1.5 sticky left-0 bg-inherit z-10 font-medium">
                      <div className="text-primary">{sku.codigo}</div>
                      <div className="text-[10px] text-muted-foreground line-clamp-1">{sku.descricao}</div>
                    </td>
                    <td className="text-center">
                      <Badge variant={isSC ? "default" : "secondary"} className="text-[10px]">{sku.unidade ?? "SC"}</Badge>
                    </td>
                    {monthsCols.map((m) => (
                      <td key={m} className="px-2 py-1 text-right tabular-nums text-foreground/85">
                        {fmtNumber(inner?.get(m), 2)}
                      </td>
                    ))}
                    {projectionMonth && (
                      <td className={`px-1 py-0.5 text-right tabular-nums border-l-2 border-secondary/50 ${isEditor && filialSel !== "all" ? "table-cell-editable" : "bg-muted/50"}`}>
                        {isEditor && filialSel !== "all" ? (
                          <EditableCell
                            isSC={isSC}
                            initial={inner?.get(projectionMonth) ?? 0}
                            onSave={(v) => handleEdit(sku, projectionMonth, v)}
                          />
                        ) : (
                          <div className="px-2 py-1 flex items-center justify-end gap-1 text-muted-foreground">
                            <Lock className="h-3 w-3" />
                            {fmtNumber(inner?.get(projectionMonth), 2)}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {skusToShow.length === 0 && (
                <tr>
                  <td colSpan={monthsCols.length + 3} className="text-center py-12 text-muted-foreground">
                    Nenhum SKU cadastrado. Vá para Administração → SKUs para criar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground mt-3">
        💡 Selecione uma filial específica para editar a projeção do próximo mês.
        SKUs em <strong>SC</strong> são arredondados para múltiplos de 1,5.
        {!isEditor && " Você está como Leitor — peça permissão de edição ao admin."}
      </p>
    </div>
  );
};

const EditableCell = ({ initial, onSave, isSC }: { initial: number; onSave: (v: string) => void; isSC: boolean }) => {
  const [val, setVal] = useState(initial ? String(initial) : "");
  useEffect(() => { setVal(initial ? String(initial) : ""); }, [initial]);
  const handleBlur = () => {
    const parsed = parseFloat(val.replace(",", ".") || "0");
    if (parsed !== initial) onSave(val || "0");
  };
  return (
    <input
      type="text"
      inputMode="decimal"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      placeholder={isSC ? "múltiplo de 1,5" : "0"}
      className="w-full bg-transparent text-right px-2 py-1 outline-none focus:ring-1 focus:ring-editable-border rounded font-medium"
    />
  );
};

export default Overview;
