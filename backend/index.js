import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

// Inicializa o cliente do Supabase usando as chaves do .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 1. Rota de Teste de Conexão
app.get("/teste-banco", async (req, res) => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    res.json({
      status: "Sucesso!",
      mensagem: "Conectado ao Supabase com sucesso!",
    });
  } catch (erro) {
    res.status(500).json({ status: "Erro na conexão", detalhe: erro.message });
  }
});

// 2. Rota para Listar Todos os Alunos
app.get("/alunos", async (req, res) => {
  try {
    const { data, error } = await supabase.from("hack_base").select("*");

    if (error) throw error;
    res.json(data);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// 3. Rota de Ranking (Gera Insights para o Front-end)
// Retorna os top 10 alunos com mais pontos acumulados
app.get("/dashboard/ranking", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("hack_base")
      .select("ID_ALUNO, Nome, PONTOS ACUMULADOS, NOME CURSO")
      .order("PONTOS ACUMULADOS", { ascending: false })
      .limit(10);

    if (error) throw error;
    res.json(data);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
