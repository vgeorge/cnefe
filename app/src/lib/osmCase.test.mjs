import { toOsmCase } from "./osmCase.js";

const cases = [
  ["RUA PROFESSOR FLORENTINO MENEZES", "Rua Professor Florentino Menezes"],
  ["AVENIDA COELHO E CAMPOS", "Avenida Coelho e Campos"],
  ["RUA 13 DE MAIO", "Rua 13 de Maio"],
  ["RUA XV DE NOVEMBRO", "Rua XV de Novembro"],
  ["RUA SANTA ROSA", "Rua Santa Rosa"],
  ["TRAVESSA DA PAZ", "Travessa da Paz"],
  ["RUA DOS ANDRADAS", "Rua dos Andradas"],
  ["AVENIDA IVO DO PRADO", "Avenida Ivo do Prado"],
  ["  RUA   SANTA   ROSA  ", "Rua Santa Rosa"],
  ["AVENIDA SÃO JOÃO", "Avenida São João"],
  ["RUA D. PEDRO II", "Rua D. Pedro II"],
  ["DE", "De"],
  ["", ""],
];

let failures = 0;

for (const [input, expected] of cases) {
  const actual = toOsmCase(input);
  const ok = actual === expected;
  if (!ok) failures++;
  const status = ok ? "PASS" : "FAIL";
  console.log(`${status}: ${JSON.stringify(input)} -> ${JSON.stringify(actual)}` +
    (ok ? "" : ` (expected ${JSON.stringify(expected)})`));
}

if (failures > 0) {
  console.log(`\n${failures} case(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${cases.length} cases passed.`);
