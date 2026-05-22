
-- 1) MESES_HABILITADOS: unique mes + RLS (seed pulado, já tem 12 linhas)
ALTER TABLE public.meses_habilitados DROP CONSTRAINT IF EXISTS meses_habilitados_mes_key;
ALTER TABLE public.meses_habilitados ADD CONSTRAINT meses_habilitados_mes_key UNIQUE (mes);

ALTER TABLE public.meses_habilitados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Approved users read meses" ON public.meses_habilitados;
DROP POLICY IF EXISTS "Admins manage meses" ON public.meses_habilitados;
CREATE POLICY "Approved users read meses" ON public.meses_habilitados
  FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "Admins manage meses" ON public.meses_habilitados
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) FILIAIS
ALTER TABLE public.filiais ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
DROP TRIGGER IF EXISTS touch_filiais_updated_at ON public.filiais;
CREATE TRIGGER touch_filiais_updated_at BEFORE UPDATE ON public.filiais
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) SKUS
ALTER TABLE public.skus DROP COLUMN IF EXISTS full_label;
ALTER TABLE public.skus ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
ALTER TABLE public.skus ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.skus ADD COLUMN full_label text GENERATED ALWAYS AS (codigo || ' - ' || descricao) STORED;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='skus_pkey') THEN
    ALTER TABLE public.skus ADD CONSTRAINT skus_pkey PRIMARY KEY (codigo);
  END IF;
END $$;

DROP TRIGGER IF EXISTS touch_skus_updated_at ON public.skus;
CREATE TRIGGER touch_skus_updated_at BEFORE UPDATE ON public.skus
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4) DADOS_OVERVIEW recriado
DROP TABLE IF EXISTS public.dados_overview CASCADE;
CREATE TABLE public.dados_overview (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_codigo text NOT NULL REFERENCES public.skus(codigo) ON DELETE CASCADE,
  filial_id integer NOT NULL REFERENCES public.filiais(id) ON DELETE CASCADE,
  mes text NOT NULL REFERENCES public.meses_habilitados(mes),
  valor numeric NOT NULL DEFAULT 0,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sku_codigo, filial_id, mes)
);
CREATE INDEX idx_dados_overview_filial ON public.dados_overview(filial_id);
CREATE INDEX idx_dados_overview_mes ON public.dados_overview(mes);
CREATE TRIGGER touch_dados_overview_updated_at BEFORE UPDATE ON public.dados_overview
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.dados_overview ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage dados_overview" ON public.dados_overview
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Editors insert dados_overview" ON public.dados_overview
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'editor') AND public.user_has_filial(auth.uid(), filial_id));
CREATE POLICY "Editors update dados_overview" ON public.dados_overview
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'editor') AND public.user_has_filial(auth.uid(), filial_id))
  WITH CHECK (public.has_role(auth.uid(),'editor') AND public.user_has_filial(auth.uid(), filial_id));
CREATE POLICY "Read dados_overview by filial" ON public.dados_overview
  FOR SELECT TO authenticated
  USING (public.is_approved(auth.uid()) AND public.user_has_filial(auth.uid(), filial_id));

-- 5) FATURADO mes -> text
ALTER TABLE public.faturado ALTER COLUMN mes TYPE text USING to_char(mes, 'TMMonth');
ALTER TABLE public.faturado ADD CONSTRAINT faturado_mes_fkey FOREIGN KEY (mes) REFERENCES public.meses_habilitados(mes);
ALTER TABLE public.faturado ADD CONSTRAINT faturado_sku_fkey FOREIGN KEY (sku_codigo) REFERENCES public.skus(codigo) ON DELETE CASCADE;
ALTER TABLE public.faturado ADD CONSTRAINT faturado_filial_fkey FOREIGN KEY (filial_id) REFERENCES public.filiais(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_faturado_filial ON public.faturado(filial_id);
CREATE INDEX IF NOT EXISTS idx_faturado_mes ON public.faturado(mes);

-- 6) INDICADORES_MES mes -> text
ALTER TABLE public.indicadores_mes ALTER COLUMN mes TYPE text USING to_char(mes, 'TMMonth');
ALTER TABLE public.indicadores_mes ADD CONSTRAINT indicadores_mes_mes_fkey FOREIGN KEY (mes) REFERENCES public.meses_habilitados(mes);
ALTER TABLE public.indicadores_mes ADD CONSTRAINT indicadores_mes_sku_fkey FOREIGN KEY (sku_codigo) REFERENCES public.skus(codigo) ON DELETE CASCADE;
ALTER TABLE public.indicadores_mes ADD CONSTRAINT indicadores_mes_filial_fkey FOREIGN KEY (filial_id) REFERENCES public.filiais(id) ON DELETE CASCADE;
ALTER TABLE public.indicadores_mes ADD CONSTRAINT indicadores_mes_unique UNIQUE (sku_codigo, filial_id, mes);
