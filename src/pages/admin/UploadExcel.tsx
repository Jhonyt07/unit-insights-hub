import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const UploadExcel = () => {
  const [type, setType] = useState<"overview" | "faturado">("overview");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const parseMonth = (lbl: string): string | null => {
    const s = String(lbl).toLowerCase().replace(/\./g, "").trim();
    const m = s.match(/([a-zçã]+)\s*-\s*(\d{4})/);
    if (!m) return null;
    const map: Record<string, number> = { jan:1,fev:2,mar:3,abr:4,mai:5,jun:6,jul:7,ago:8,set:9,out:10,nov:11,dez:12 };
    const mn = map[m[1].slice(0,3)];
    if (!mn) return null;
    return `${m[2]}-${String(mn).padStart(2,"0")}-01`;
  };

  const handleUpload = async () => {
    if (!file) return toast.error("Selecione um arquivo");
    setBusy(true);
    setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as any[][];
      if (aoa.length < 3) throw new Error("Planilha vazia");

      const header = aoa[0];
      // For overview: cols 2..17 are months, col0=sku, col1=filial
      // For faturado: cols 3..30 are months, col0=sku, col1=filial, col2=cliente
      const monthsStartCol = type === "overview" ? 2 : 3;
      const monthCols: { idx: number; mes: string }[] = [];
      for (let i = monthsStartCol; i < header.length; i++) {
        const d = parseMonth(header[i] ?? "");
        if (d) monthCols.push({ idx: i, mes: d });
      }

      const skus = new Map<string, { descricao: string; full_label: string }>();
      const filiais = new Map<number, string>();
      const dataRows: any[] = [];

      let currentSku: string | null = null;
      let currentFilial: number | null = null;
      for (let r = 2; r < aoa.length; r++) {
        const row = aoa[r];
        if (!row) continue;
        const skuLabel = String(row[0] ?? "").trim();
        if (skuLabel && skuLabel !== "Totais" && skuLabel.toLowerCase() !== "nan") {
          const sm = skuLabel.match(/^([\d.]+)\s*-\s*(.+)/);
          if (sm) {
            currentSku = sm[1].trim();
            skus.set(currentSku, { descricao: sm[2].trim(), full_label: skuLabel });
          }
        }
        const filialLabel = String(row[1] ?? "").trim();
        if (filialLabel && filialLabel !== "Totais" && filialLabel.toLowerCase() !== "nan") {
          const fm = filialLabel.match(/^(\d+)\s*-\s*(.+)/);
          if (fm) { currentFilial = Number(fm[1]); filiais.set(currentFilial, filialLabel); }
        }
        if (!currentSku || !currentFilial) continue;
        const cliente = type === "faturado" ? (String(row[2] ?? "").trim() === "Totais" || !row[2] ? null : String(row[2]).trim()) : null;
        if (type === "faturado" && cliente !== null) continue; // só totais
        for (const { idx, mes } of monthCols) {
          const v = row[idx];
          if (v === null || v === undefined || v === "" || v === "-") continue;
          const num = parseFloat(String(v).replace(",", "."));
          if (isNaN(num)) continue;
          dataRows.push({ sku_codigo: currentSku, filial_id: currentFilial, mes, valor: num, ...(type === "faturado" ? { cliente_nome: null } : {}) });
        }
      }

      // Upsert SKUs and filiais first
      if (skus.size) {
        await supabase.from("skus").upsert(Array.from(skus.entries()).map(([codigo, v]) => ({ codigo, ...v })));
      }
      if (filiais.size) {
        await supabase.from("filiais").upsert(Array.from(filiais.entries()).map(([id, nome]) => ({ id, nome })));
      }

      // Insert in batches
      const BATCH = 500;
      let inserted = 0;
      for (let i = 0; i < dataRows.length; i += BATCH) {
        const slice = dataRows.slice(i, i + BATCH);
        if (type === "overview") {
          const { error } = await supabase.from("dados_overview").upsert(slice, { onConflict: "sku_codigo,filial_id,mes" });
          if (error) throw error;
        } else {
          const { error } = await supabase.from("faturado").insert(slice);
          if (error) throw error;
        }
        inserted += slice.length;
      }

      setResult(`✅ ${inserted} linhas importadas em "${type}". ${skus.size} SKUs e ${filiais.size} filiais atualizadas.`);
      toast.success(`Importação concluída: ${inserted} linhas`);
    } catch (e: any) {
      toast.error("Erro: " + (e.message ?? "desconhecido"));
      setResult("❌ " + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Upload de Excel" description="Atualize a base de Overview ou Faturado a partir de um arquivo Excel." />
      <Card className="p-6 max-w-2xl shadow-card space-y-4">
        <div>
          <Label>Tipo de planilha</Label>
          <div className="flex gap-2 mt-2">
            {(["overview", "faturado"] as const).map((t) => (
              <Button key={t} variant={type === t ? "default" : "outline"} onClick={() => setType(t)}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> {t === "overview" ? "Overview" : "Faturado"}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="file">Arquivo (.xlsx)</Label>
          <Input id="file" type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1" />
        </div>
        <Button onClick={handleUpload} disabled={busy || !file}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          Importar
        </Button>
        {result && <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap">{result}</div>}
        <div className="text-xs text-muted-foreground border-t pt-3">
          <strong>Overview:</strong> mesclará SKU+Filial+Mês — sobrescreve duplicatas.<br />
          <strong>Faturado:</strong> insere novas linhas (apenas linhas de "Totais" por filial).
        </div>
      </Card>
    </div>
  );
};

export default UploadExcel;