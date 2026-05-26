import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFiliais } from "@/hooks/useAppData";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fmtNumber } from "@/lib/format";
import { TrendingUp, Package, Sparkles, Loader2, Building2 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line } from "recharts";
import { Button } from "@/components/ui/button";

const MES_ORDER = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const Dashboard = () => {
  const { isAdmin, filiais: userFiliais } = useAuth();
  const { data: filiais = [] } = useFiliais();
  const visibleFiliais = useMemo(
    () => filiais.filter((f) => isAdmin || userFiliais.includes(f.id)),
    [filiais, isAdmin, userFiliais]
  );
  const [filialSel, setFilialSel] = useState<number | "all">("all");
  const filialIds = filialSel === "all" ? visibleFiliais.map((f) => f.id) : [filialSel];

  const { data: projecao = [], isLoading } = useQuery({
    queryKey: ["dash-proj", filialIds.join(",")],
    enabled: filialIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dados_overview")
        .select("sku_codigo,filial_id,mes,valor")
        .in("filial_id", filialIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: skusData = [] } = useQuery({
    queryKey: ["skus"],
    queryFn: async () => (await supabase.from("skus").select("*")).data ?? [],
  });
  const skuMap = useMemo(() => new Map(skusData.map((s) => [s.codigo, s])), [skusData]);
  const filMap = useMemo(() => new Map(filiais.map((f) => [f.id, f.nome])), [filiais]);

  const projByMonth = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of projecao) m.set(r.mes, (m.get(r.mes) ?? 0) + Number(r.valor));
    return m;
  }, [projecao]);

  const totalProj = Array.from(projByMonth.values()).reduce((a, b) => a + b, 0);
  const mesesAtivos = projByMonth.size;
  const skusAtivos = useMemo(() => new Set(projecao.map((r) => r.sku_codigo)).size, [projecao]);

  const topSkus = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of projecao) m.set(r.sku_codigo, (m.get(r.sku_codigo) ?? 0) + Number(r.valor));
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([codigo, total]) => ({
        codigo,
        total,
        nome: skuMap.get(codigo)?.descricao?.slice(0, 30) ?? codigo,
      }));
  }, [projecao, skuMap]);

  const topFiliais = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of projecao) m.set(r.filial_id, (m.get(r.filial_id) ?? 0) + Number(r.valor));
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, total]) => ({
        id,
        nome: (filMap.get(id) ?? `${id}`).replace(/^\d+\s*-\s*/, ""),
        total,
      }));
  }, [projecao, filMap]);

  const tsData = useMemo(
    () =>
      MES_ORDER.filter((m) => projByMonth.has(m)).map((m) => ({
        mes: m.slice(0, 3),
        Projeção: Math.round(projByMonth.get(m) ?? 0),
      })),
    [projByMonth]
  );

  // AI insights
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const requestInsight = async () => {
    setAiLoading(true);
    setAiInsight(null);
    try {
      const summary = {
        filial: filialSel === "all" ? "todas" : filMap.get(filialSel as number),
        meses: tsData,
        top_skus: topSkus.slice(0, 5),
        top_filiais: topFiliais.slice(0, 5),
      };
      const { data, error } = await supabase.functions.invoke("ai-forecast", { body: { summary } });
      if (error) throw error;
      setAiInsight(data?.insight ?? "Sem dados suficientes.");
    } catch (e: any) {
      setAiInsight("⚠️ Não foi possível gerar a análise. " + (e.message ?? ""));
    } finally {
      setAiLoading(false);
    }
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Dashboard"
        description="Indicadores consolidados das projeções."
        actions={
          <Select value={String(filialSel)} onValueChange={(v) => setFilialSel(v === "all" ? "all" : Number(v))}>
            <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as minhas filiais</SelectItem>
              {visibleFiliais.map((f) => <SelectItem key={f.id} value={String(f.id)}>{f.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard title="Total Projetado" value={fmtNumber(totalProj, 0)} icon={<TrendingUp className="h-5 w-5" />} hint="Soma de todas as projeções" accent="primary" />
        <KpiCard title="SKUs com Projeção" value={String(skusAtivos)} icon={<Package className="h-5 w-5" />} hint="Itens com volume previsto" accent="info" />
        <KpiCard title="Meses com Dados" value={String(mesesAtivos)} icon={<Building2 className="h-5 w-5" />} hint="Períodos cobertos" accent="success" />
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Projeção mês a mês</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={tsData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Projeção" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Top SKUs Projetados</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={topSkus} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="nome" type="category" tick={{ fontSize: 10 }} width={140} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Top Filiais Projetadas</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={topFiliais} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="nome" type="category" tick={{ fontSize: 10 }} width={140} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="total" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-elegant border-primary/20 bg-gradient-to-br from-card to-accent/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-secondary" />
            Análise Preditiva (IA)
            <Badge variant="outline" className="ml-auto text-[10px]">Powered by Lovable AI</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Receba recomendações com base nas projeções atuais.
          </p>
          <Button onClick={requestInsight} disabled={aiLoading}>
            {aiLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando...</> : <><Sparkles className="mr-2 h-4 w-4" /> Gerar Análise</>}
          </Button>
          {aiInsight && (
            <div className="prose prose-sm max-w-none p-4 bg-card rounded-lg border border-border whitespace-pre-wrap text-sm">
              {aiInsight}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const KpiCard = ({ title, value, icon, hint, accent }: { title: string; value: string; icon: React.ReactNode; hint?: string; accent: "primary" | "info" | "success" | "destructive" }) => {
  const accentClass = {
    primary: "bg-primary/10 text-primary",
    info: "bg-info/10 text-info",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
  }[accent];
  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
            {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
          </div>
          <div className={`p-2 rounded-lg ${accentClass}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Dashboard;
