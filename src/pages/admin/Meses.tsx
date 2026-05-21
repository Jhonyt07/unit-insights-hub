import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMesesHabilitados } from "@/hooks/useAppData";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { fmtMonth } from "@/lib/format";

const AdminMeses = () => {
  const qc = useQueryClient();
  const { data: meses = [] } = useMesesHabilitados();

  const toggleMes = async (mes: string, currentlyEnabled: boolean) => {
    const { error } = await supabase
      .from("meses_habilitados")
      .update({ habilitado: !currentlyEnabled })
      .eq("mes", mes);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["meses_habilitados"] });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Meses habilitados"
        description="Controle quais meses podem ser preenchidos na tela Overview."
      />
      <Card className="p-6 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <CalendarRange className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Habilitar meses para edição de projeção</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Marque os meses que os usuários poderão preencher. O próximo mês desabilitado vira a coluna editável.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {meses.map((m) => (
            <label
              key={m.mes}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-smooth ${
                m.habilitado ? "border-success bg-success/5" : "border-border bg-muted/30"
              }`}
            >
              <Checkbox checked={m.habilitado} onCheckedChange={() => toggleMes(m.mes, m.habilitado)} />
              <span className="font-medium">{m.mes}</span>
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default AdminMeses;
