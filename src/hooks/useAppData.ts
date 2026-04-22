import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useFiliais = () =>
  useQuery({
    queryKey: ["filiais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("filiais").select("*").order("id");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSkus = () =>
  useQuery({
    queryKey: ["skus"],
    queryFn: async () => {
      const { data, error } = await supabase.from("skus").select("*").order("codigo");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useMesesHabilitados = () =>
  useQuery({
    queryKey: ["meses_habilitados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meses_habilitados")
        .select("*")
        .order("mes");
      if (error) throw error;
      return data ?? [];
    },
  });