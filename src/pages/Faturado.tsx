import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFiliais } from "@/hooks/useAppData";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fmtMonth, fmtNumber, monthsBetween } from "@/lib/format";
import { Loader2, Search } from "lucide-react";

const RANGE: [string, string] = ["2024-01-01", "2026-04-01"];

const Faturado = () => {
  const { isAdmin, filiais: userFiliais } = useAuth();
  const { data: filiais = [] } = useFiliais();
  const visibleFiliais = useMemo(
    () => filiais.filter((f) => isAdmin || userFiliais.includes(f.id)),
    [filiais, isAdmin, userFiliais]
  );

  const [filialSel, setFilialSel] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const months = useMemo(() => monthsBetween(RANGE[0], RANGE[1]), []);
  const filialFilter = filialSel === "all" ? visibleFiliais.map((f) => f.id) : [filialSel];

  const { data, isLoading } = useQuery({
    queryKey: ["faturado", filialFilter.join(",")],
    enabled: filialFilter.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faturado")
        .select("sku_codigo, filial_id, mes, valor")
        .is("cliente_nome", null)
        .in("filial_id", filialFilter);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: skusData = [] } = useQuery({
    queryKey: ["skus"],
    queryFn: async () => {
      const { data, error } = await supabase.from("skus").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const pivot = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const r of data ?? []) {
      if (!m.has(r.sku_codigo)) m.set(r.sku_codigo, new Map());
      const inner = m.get(r.sku_codigo)!;
      const mes = (r.mes as string).slice(0, 10);
      inner.set(mes, (inner.get(mes) ?? 0) + Number(r.valor));
    }
    return m;
  }, [data]);

  const skuMap = useMemo(() => new Map(skusData.map((s) => [s.codigo, s])), [skusData]);

  const rows = useMemo(() => {
    let list = Array.from(pivot.keys()).map((c) => ({ codigo: c, sku: skuMap.get(c) }));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.codigo.toLowerCase().includes(q) || (r.sku?.descricao ?? "").toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [pivot, skuMap, search]);

  const totals = useMemo(() => {
    const t = new Map<string, number>();
    for (const [, inner] of pivot) for (const [m, v] of inner) t.set(m, (t.get(m) ?? 0) + v);
    return t;
  }, [pivot]);

  if (isLoading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Faturado" description="Histórico mensal real de faturamento por SKU. Visualização por filiais permitidas." />
      <Card className="p-4 mb-4 shadow-card">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground">Filial</label>
            <Select value={String(filialSel)} onValueChange={(v) => setFilialSel(v === "all" ? "all" : Number(v))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as minhas filiais</SelectItem>
                {visibleFiliais.map((f) => <SelectItem key={f.id} value={String(f.id)}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground">Buscar SKU</label>
            <div className="relative mt-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Código ou descrição" />
            </div>
          </div>
          <Badge variant="outline" className="self-end">{rows.length} SKUs</Badge>
        </div>
      </Card>

      <Card className="overflow-hidden shadow-card">
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-20">
              <tr className="bg-primary text-primary-foreground">
                <th className="text-left px-3 py-2 sticky left-0 bg-primary z-30 min-w-[280px]">SKU</th>
                {months.map((m) => <th key={m} className="px-2 py-2 text-right min-w-[80px]">{fmtMonth(m)}</th>)}
              </tr>
              <tr className="bg-primary/90 text-primary-foreground text-[11px]">
                <th className="text-left px-3 py-1.5 sticky left-0 bg-primary/90 z-30">Totais</th>
                {months.map((m) => <td key={m} className="px-2 py-1.5 text-right font-semibold tabular-nums">{fmtNumber(totals.get(m) ?? 0, 0)}</td>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const inner = pivot.get(r.codigo);
                return (
                  <tr key={r.codigo} className={`border-b border-border ${i % 2 === 0 ? "bg-background" : "bg-muted/30"} hover:bg-accent/20`}>
                    <td className="px-3 py-1.5 sticky left-0 bg-inherit z-10">
                      <div className="font-medium text-primary">{r.codigo}</div>
                      <div className="text-[10px] text-muted-foreground line-clamp-1">{r.sku?.descricao ?? "-"}</div>
                    </td>
                    {months.map((m) => <td key={m} className="px-2 py-1 text-right tabular-nums">{fmtNumber(inner?.get(m), 2)}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Faturado;