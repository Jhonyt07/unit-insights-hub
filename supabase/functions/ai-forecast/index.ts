const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { summary } = await req.json();
    if (!summary) throw new Error("Missing summary");

    const prompt = `Você é analista sênior de S&OP de uma cooperativa de agronegócio (Copagril).
Receba o resumo abaixo (em toneladas/unidades) sobre faturamento e projeção mensal de rações e farelos:

${JSON.stringify(summary, null, 2)}

Produza uma análise EM PORTUGUÊS, organizada em 4 seções concisas usando markdown:

## 📊 Diagnóstico
Como está a acurácia da projeção? Há tendência de alta/queda? Qual filial e qual SKU se destacam?

## 🔮 Previsão (próximos 3 meses)
Com base na sazonalidade e tendência observada, estime a faixa esperada de volume total.

## ⚠️ Riscos & Variáveis de Mercado
Cite 2-3 variáveis externas relevantes ao setor de rações no Brasil que podem impactar a previsão (ex: preço do milho/soja, sazonalidade da pecuária, clima).

## ✅ Recomendações Prescritivas
Dê 3 recomendações ACIONÁVEIS para o time comercial e de S&OP.

Seja direto, evite jargão acadêmico, use números do resumo.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de requisições. Tente novamente em alguns segundos." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no Lovable Cloud." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`AI gateway error ${resp.status}: ${txt}`);
    }

    const data = await resp.json();
    const insight = data?.choices?.[0]?.message?.content ?? "Não foi possível gerar análise.";

    return new Response(JSON.stringify({ insight }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});