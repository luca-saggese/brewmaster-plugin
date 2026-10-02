import { FruitCalculatorTool } from '../src/brewing/fruit-calculator.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) passed++;
  else {
    failed++;
    console.error(`FAIL: ${message}`);
  }
}

async function main(): Promise<void> {
  const tool = new FruitCalculatorTool();
  const execution = tool.resolveExecution({
    fruit_name: 'Uva',
    batch_size_liters: 18,
    intensity: 'intenso',
    fruit_form: 'fresh',
    addition_method: 'secondary',
    beer_style: 'saison',
    tincture_alcohol_abv: 0.95,
    tincture_ml_per_g: 1.3,
    other_fruits: [],
    show_details: true,
  });
  const response = await execution.execute({
    turnId: 1,
    toolCallId: 'fruit-json-test',
    signal: new AbortController().signal,
  });
  const parsed = JSON.parse(response.output) as {
    tool: string;
    calculation: string;
    status: string;
    result: {
      aggiunte_speciali: Array<{
        ingrediente: string;
        quantita_kg: number;
        forma: string;
        stadio: string;
        dose_min_kg: number;
        dose_max_kg: number;
        zuccheri_stimati_g: number;
      }>;
    };
    display: { report: string };
  };
  const addition = parsed.result.aggiunte_speciali[0];

  assert(!response.isError, 'known fruit should return a successful result');
  assert(parsed.tool === 'fruit_calculator' && parsed.calculation === 'fruit_dosage', 'JSON should identify tool and calculation');
  assert(parsed.status === 'ok', 'successful JSON result should have status ok');
  assert(addition?.ingrediente === 'Uva (mosto)', 'result should return the resolved fruit name');
  assert(typeof addition?.quantita_kg === 'number' && addition.quantita_kg > 0, 'result should expose a positive recommended amount');
  assert(addition?.forma === 'fresh' && addition.stadio === 'secondary', 'result should use the YAML-compatible form and stage fields');
  assert(addition?.dose_min_kg <= addition?.quantita_kg && addition?.quantita_kg <= addition?.dose_max_kg, 'recommended amount should be inside the returned range');
  assert(typeof addition?.zuccheri_stimati_g === 'number', 'result should include estimated fruit sugars');
  assert(parsed.display.report.includes('Intervallo di dosaggio consigliato'), 'JSON should retain the human-readable report');

  const badExecution = tool.resolveExecution({
    fruit_name: 'Frutto inesistente',
    batch_size_liters: 18,
    intensity: 'leggero',
    fruit_form: 'fresh',
    addition_method: 'secondary',
    beer_style: 'other',
    tincture_alcohol_abv: 0.95,
    tincture_ml_per_g: 1.3,
    other_fruits: [],
    show_details: true,
  });
  const badResponse = await badExecution.execute({
    turnId: 2,
    toolCallId: 'fruit-json-error-test',
    signal: new AbortController().signal,
  });
  const badParsed = JSON.parse(badResponse.output) as { status: string; errors: string[] };
  assert(badResponse.isError === true && badParsed.status === 'error', 'unknown fruit should return a structured JSON error');
  assert(badParsed.errors.some(error => error.includes('non trovato nel database')), 'JSON error should explain the unknown fruit');

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

void main();