
-- Enum de unidade
DO $$ BEGIN
  CREATE TYPE public.sku_unidade AS ENUM ('SC', 'TN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Adicionar coluna unidade em skus
ALTER TABLE public.skus
  ADD COLUMN IF NOT EXISTS unidade public.sku_unidade NOT NULL DEFAULT 'SC';

-- Remover tabelas não usadas
DROP TABLE IF EXISTS public.faturado CASCADE;
DROP TABLE IF EXISTS public.indicadores_mes CASCADE;

-- Garantir triggers de updated_at
DROP TRIGGER IF EXISTS trg_skus_updated_at ON public.skus;
CREATE TRIGGER trg_skus_updated_at
  BEFORE UPDATE ON public.skus
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_filiais_updated_at ON public.filiais;
CREATE TRIGGER trg_filiais_updated_at
  BEFORE UPDATE ON public.filiais
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_dados_overview_updated_at ON public.dados_overview;
CREATE TRIGGER trg_dados_overview_updated_at
  BEFORE UPDATE ON public.dados_overview
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Unique constraint para upsert funcionar corretamente em dados_overview
DO $$ BEGIN
  ALTER TABLE public.dados_overview
    ADD CONSTRAINT dados_overview_sku_filial_mes_unique UNIQUE (sku_codigo, filial_id, mes);
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;
