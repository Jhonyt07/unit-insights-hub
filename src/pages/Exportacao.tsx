import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFiliais, useMesesHabilitados } from "@/hooks/useAppData";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fmtMonth, fmtNumber, monthsBetween } from "@/lib/format";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const Exportacao = () => {
  const { isAdmin, filiais: userFiliais } = useAuth();
  const { data: filiais = [] } = useFiliais();
  const { data: meses = [] } = useMesesHabilitados();
  const visible = useMemo(() => filiais.filter((f) => isAdmin || userFiliais.includes(f.id)), [filiais, isAdmin, userFiliais]);
  const allMonths = useMemo(() => monthsBetween("2025-01-01", "2026-05-01"), []);
  const [mesSel, setMesSel] = useState<string>(allMonths[0]);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["export", mesSel, visible.map((v) => v.id).join(",")],
    enabled: visible.length > 0 && !!mesSel,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dados_overview")
        .select("sku_codigo, filial_id, mes, valor, skus(codigo, descricao)")
        .in("filial_id", visible.map((v) => v.id))
        .eq("mes", mesSel);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(() => {
    return (data ?? [])
      .filter((r) => Number(r.valor) !== 0)
      .map((r: any) => ({
        Filial: r.filial_id,
        "SKU Vigente": `${r.skus?.codigo} - ${r.skus?.descricao}`,
        Mês: r.mes,
        "Qtd. Proj.": Number(r.valor),
      }))
      .sort((a, b) => a.Filial - b.Filial || a["SKU Vigente"].localeCompare(b["SKU Vigente"]));
  }, [data]);

  const exportXlsx = () => {
    setExporting(true);
    try {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Exportação");
      XLSX.writeFile(wb, `copagril-projecao-${mesSel}.xlsx`);
      toast.success("Excel gerado!");
    } catch (e: any) {
      toast.error("Erro ao exportar: " + e.message);
    } finally {
      setExporting(false);
    }
  };

  const exportCsv = () => {
    const header = "Filial;SKU Vigente;Mês;Qtd. Proj.\n";
    const body = rows.map((r) => `${r.Filial};${r["SKU Vigente"]};${r.Mês};${r["Qtd. Proj."]}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `copagril-projecao-${mesSel}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV gerado!");
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Exportação de Base" description="Selecione o mês de projeção e exporte para Excel/CSV." />
      <Card className="p-4 mb-4 shadow-card">
        <div className="flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1 max-w-xs">
            <label className="text-xs font-medium text-muted-foreground">Mês de Projeção</label>
            <Select value={mesSel} onValueChange={setMesSel}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {allMonths.map((m) => <SelectItem key={m} value={m}>{fmtMonth(m)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={exportXlsx} disabled={exporting || rows.length === 0} className="bg-success hover:bg-success/90">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Excel
          </Button>
          <Button onClick={exportCsv} variant="outline" disabled={rows.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
          <Badge variant="outline">{rows.length} linhas</Badge>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Card className="overflow-hidden shadow-card">
          <div className="overflow-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="bg-primary text-primary-foreground sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">Filial</th>
                  <th className="text-left px-3 py-2">SKU Vigente</th>
                  <th className="text-left px-3 py-2">Mês</th>
                  <th className="text-right px-3 py-2">Qtd. Proj.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={`border-b border-border ${i % 2 === 0 ? "bg-background" : "bg-muted/30"}`}>
                    <td className="px-3 py-1.5 font-mono">{r.Filial}</td>
                    <td className="px-3 py-1.5 text-xs">{r["SKU Vigente"]}</td>
                    <td className="px-3 py-1.5">{r.Mês}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtNumber(r["Qtd. Proj."], 2)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-12 text-muted-foreground">Sem dados para esse mês.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Exportacao;