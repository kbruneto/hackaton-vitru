/**
 * CAMADA DE ACESSO AOS DADOS
 *
 * O "banco" e o database.json carregado em memoria. Nada e escrito em disco:
 * as simulacoes mexem so na copia em memoria, e POST /api/reset devolve tudo
 * ao estado original. Isso deixa a demo repetivel quantas vezes voce quiser e
 * torna impossivel corromper os dados de seed.
 *
 * Trocar por Postgres/SQLite depois significa reescrever SO este arquivo —
 * o resto do projeto conversa apenas com as funcoes exportadas aqui.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const aquiDir = dirname(fileURLToPath(import.meta.url));
const CAMINHO_SEED = join(aquiDir, 'database.json');

const seed = JSON.parse(readFileSync(CAMINHO_SEED, 'utf8'));

/** Copia profunda; structuredClone e nativo no Node 17+. */
const clonar = (valor) =>
  typeof structuredClone === 'function'
    ? structuredClone(valor)
    : JSON.parse(JSON.stringify(valor));

let estado = clonar(seed);

export function listarAlunos() {
  return estado.students;
}

/** Busca por id, sem diferenciar maiusculas de minusculas. */
export function buscarAluno(id) {
  if (!id) return null;
  const alvo = String(id).trim().toUpperCase();
  return estado.students.find((a) => String(a.id).toUpperCase() === alvo) ?? null;
}

export function buscarMapa(aluno, mapaId) {
  if (!aluno || !mapaId) return null;
  const alvo = String(mapaId).trim().toUpperCase();
  return aluno.mapas.find((m) => String(m.id).toUpperCase() === alvo) ?? null;
}

/** Devolve o banco ao estado de seed. */
export function resetar() {
  estado = clonar(seed);
  return estado.students.length;
}
