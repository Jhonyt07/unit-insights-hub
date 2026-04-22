
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'leitor');
CREATE TYPE public.user_status AS ENUM ('pending', 'approved', 'rejected');

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  status public.user_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- USER ROLES (separate table to avoid privilege escalation)
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- ============================================================
-- FILIAIS
-- ============================================================
CREATE TABLE public.filiais (
  id INT PRIMARY KEY,                -- código numérico (ex 1, 2, 13, 18)
  nome TEXT NOT NULL,                -- ex "1 - UNIDADE RONDON"
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- USER -> FILIAIS (acesso por filial)
-- ============================================================
CREATE TABLE public.user_filiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filial_id INT NOT NULL REFERENCES public.filiais(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, filial_id)
);

-- ============================================================
-- SKUs (rações e farelos)
-- ============================================================
CREATE TABLE public.skus (
  codigo TEXT PRIMARY KEY,           -- ex "36007.0004"
  descricao TEXT NOT NULL,           -- ex "RACAO INICIAL FRANGOS..."
  full_label TEXT NOT NULL,          -- ex "36007.0004-RACAO INICIAL..."
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- DADOS OVERVIEW: SKU x Filial x Mês -> valor projetado
-- (esta é a tabela editável - "Projeção Mês")
-- Cada linha representa o valor de projeção de um SKU em uma filial num mês.
-- ============================================================
CREATE TABLE public.dados_overview (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_codigo TEXT NOT NULL REFERENCES public.skus(codigo) ON DELETE CASCADE,
  filial_id INT NOT NULL REFERENCES public.filiais(id) ON DELETE CASCADE,
  mes DATE NOT NULL,                 -- primeiro dia do mês
  valor NUMERIC(14,4) NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sku_codigo, filial_id, mes)
);

CREATE INDEX idx_dados_overview_filial_mes ON public.dados_overview (filial_id, mes);
CREATE INDEX idx_dados_overview_sku ON public.dados_overview (sku_codigo);

-- ============================================================
-- FATURADO: histórico real (tela 3)
-- ============================================================
CREATE TABLE public.faturado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_codigo TEXT NOT NULL REFERENCES public.skus(codigo) ON DELETE CASCADE,
  filial_id INT NOT NULL REFERENCES public.filiais(id) ON DELETE CASCADE,
  cliente_nome TEXT,                 -- pode ser null para totais por filial
  mes DATE NOT NULL,
  valor NUMERIC(14,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_faturado_filial_mes ON public.faturado (filial_id, mes);
CREATE INDEX idx_faturado_sku ON public.faturado (sku_codigo);

-- ============================================================
-- MESES HABILITADOS para edição (controlado pelo admin)
-- Admin habilita os meses em que os usuários podem inserir/editar projeção.
-- ============================================================
CREATE TABLE public.meses_habilitados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes DATE NOT NULL UNIQUE,
  habilitado BOOLEAN NOT NULL DEFAULT true,
  habilitado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDICADORES MENSAIS auxiliares (Projetado/Produzido/Expedir/Estoque do mês corrente)
-- Vem das colunas de "Projetado Abr", "Produzido Abr" etc do excel
-- ============================================================
CREATE TABLE public.indicadores_mes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_codigo TEXT NOT NULL REFERENCES public.skus(codigo) ON DELETE CASCADE,
  filial_id INT NOT NULL REFERENCES public.filiais(id) ON DELETE CASCADE,
  mes DATE NOT NULL,
  projetado NUMERIC(14,4),
  produzido NUMERIC(14,4),
  a_expedir NUMERIC(14,4),
  estoque_atual NUMERIC(14,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sku_codigo, filial_id, mes)
);

-- ============================================================
-- SECURITY DEFINER FUNCTIONS (avoid RLS recursion)
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_filial(_user_id UUID, _filial_id INT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_filiais
    WHERE user_id = _user_id AND filial_id = _filial_id
  ) OR public.has_role(_user_id, 'admin');
$$;

-- ============================================================
-- TRIGGER: criar profile + auto-aprovar primeiro usuário como admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    CASE WHEN user_count = 0 THEN 'approved'::public.user_status ELSE 'pending'::public.user_status END
  );

  -- Primeiro usuário vira admin automaticamente (semente)
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'leitor');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_dados_overview_updated BEFORE UPDATE ON public.dados_overview
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- ENABLE RLS
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_filiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dados_overview ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meses_habilitados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicadores_mes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS: profiles
-- ============================================================
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update profiles" ON public.profiles
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile name" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- RLS: user_roles
-- ============================================================
CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS: filiais (todos aprovados podem ler; admin gerencia)
-- ============================================================
CREATE POLICY "Approved users read filiais" ON public.filiais
FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));

CREATE POLICY "Admins manage filiais" ON public.filiais
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS: user_filiais
-- ============================================================
CREATE POLICY "Users see own filiais" ON public.user_filiais
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins see all user_filiais" ON public.user_filiais
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage user_filiais" ON public.user_filiais
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS: skus (todos aprovados leem; admin gerencia)
-- ============================================================
CREATE POLICY "Approved users read skus" ON public.skus
FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));

CREATE POLICY "Admins manage skus" ON public.skus
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS: dados_overview - leitura por filial permitida; edição por editor/admin
-- ============================================================
CREATE POLICY "Read overview by filial access" ON public.dados_overview
FOR SELECT TO authenticated
USING (public.is_approved(auth.uid()) AND public.user_has_filial(auth.uid(), filial_id));

CREATE POLICY "Editors and admins update overview" ON public.dados_overview
FOR UPDATE TO authenticated
USING (
  public.user_has_filial(auth.uid(), filial_id)
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
)
WITH CHECK (
  public.user_has_filial(auth.uid(), filial_id)
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
);

CREATE POLICY "Editors and admins insert overview" ON public.dados_overview
FOR INSERT TO authenticated
WITH CHECK (
  public.user_has_filial(auth.uid(), filial_id)
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
);

CREATE POLICY "Admins delete overview" ON public.dados_overview
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS: faturado (somente leitura por usuário com acesso à filial)
-- ============================================================
CREATE POLICY "Read faturado by filial access" ON public.faturado
FOR SELECT TO authenticated
USING (public.is_approved(auth.uid()) AND public.user_has_filial(auth.uid(), filial_id));

CREATE POLICY "Admins manage faturado" ON public.faturado
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS: meses_habilitados (todos aprovados leem; admin gerencia)
-- ============================================================
CREATE POLICY "Approved read meses" ON public.meses_habilitados
FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));

CREATE POLICY "Admins manage meses" ON public.meses_habilitados
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS: indicadores_mes
-- ============================================================
CREATE POLICY "Read indicadores by filial" ON public.indicadores_mes
FOR SELECT TO authenticated
USING (public.is_approved(auth.uid()) AND public.user_has_filial(auth.uid(), filial_id));

CREATE POLICY "Admins manage indicadores" ON public.indicadores_mes
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
