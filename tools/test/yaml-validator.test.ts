/**
 * Test suite for the `yaml_validator` tool (yaml-validator.ts).
 *
 * Validates a recipe YAML file passed as an argument, exercising:
 *   - a valid recipe (existing BJCP style, all required fields present)
 *   - a recipe with out-of-style parameters (should produce issues)
 *   - a missing file (should return an error result)
 *   - an invalid YAML file (should return an error result)
 *
 * Run with: `tsx test/yaml-validator.test.ts` (or `node --experimental-strip-types`)
 *
 * You can also pass a real recipe file as a CLI argument to validate it:
 *   `tsx test/yaml-validator.test.ts /path/to/recipe.yaml`
 */

import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { YamlValidatorTool } from '../src/brewing/yaml-validator.ts';

// ── Minimal assertion helpers (no external test framework needed) ──
let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, msg: string): void {
  if (cond) {
    passed++;
  } else {
    failed++;
    failures.push(msg);
  }
}

function assertIncludes(haystack: string, needle: string, msg: string): void {
  assert(haystack.includes(needle), `${msg} — expected to include "${needle}" but got:\n${haystack}`);
}

function assertNotIncludes(haystack: string, needle: string, msg: string): void {
  assert(!haystack.includes(needle), `${msg} — expected NOT to include "${needle}" but got:\n${haystack}`);
}

function summary(): void {
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  ✗ ${f}`);
    process.exitCode = 1;
  }
}

// ── Fixtures ──
const VALID_RECIPE = `nome: "Test Pale Ale"
stile: "American Pale Ale"
codice_bjcp: "18B"
parametri:
  batch_size_litri: 20
  og: 1.052
  fg: 1.012
  abv_percent: 5.2
  ibu: 40
  ebc: 14
  efficienza_percent: 75
  bollitura_min: 60
  volume_fermentatore: 20
  confezionamento_litri: 19
grist:
  - malto: "Pale Ale"
    kg: 4.5
    percent: 90
  - malto: "Crystal 40L"
    kg: 0.5
    percent: 10
aggiunte_speciali:
  - ingrediente: "Uva fragolino (Isabella)"
    quantita_kg: 4
    forma: "fresca intera, pigiata"
    stadio: "primario, a fine fermentazione primaria"
    giorni_contatto: "7-10"
    preparazione: "Congelare, scongelare e pigiare."
    note: "Attendere FG stabile dopo l'aggiunta."
luppolatura:
  - varieta: "Cascade"
    grammi: 40
    tempo_min: 60
    uso: boil
    aa_percent: 6
  - varieta: "Cascade"
    grammi: 30
    tempo_min: 10
    uso: boil
    aa_percent: 6
lievito:
  ceppo: "US-05"
  attenuazione_percent: 75
mash:
  temperatura_c: 66
  temperatura_in_c: 66
fermentazione:
  temperatura_c: 19
  primaria_giorni: 14
bollitura:
  og_pre_boil: 1.038
  og_post_boil: 1.052
agua:
  mash_litri: 24
  sparge_litri: 16
  total_litri: 40
  ca_mg_l: 60
  mg_mg_l: 5
  na_mg_l: 10
  cl_mg_l: 50
  so4_mg_l: 100
  hco3_mg_l: 100
sales:
  gesso_g: 2.0
  cacl2_g: 3.0
carbonazione:
  co2_volumi: 2.5
  tipo_botella: "long neck"
  priming_totale_g: 47.5
`;

// Out-of-style: OG too high for 18B (max 1.060), IBU too low (min 30), ABV too high (max 6.2)
const OUT_OF_STYLE_RECIPE = `nome: "Test IPA Fuori Stile"
stile: "American Pale Ale"
codice_bjcp: "18B"
parametri:
  batch_size_litri: 20
  og: 1.070
  fg: 1.020
  abv_percent: 6.6
  ibu: 15
  ebc: 14
  efficienza_percent: 75
grist:
  - malto: "Pale Ale"
    kg: 5.0
    percent: 100
luppolatura:
  - varieta: "Cascade"
    grammi: 20
    tempo_min: 60
    uso: boil
    aa_percent: 6
lievito:
  ceppo: "US-05"
mash:
  temperatura_c: 66
`;

const INVALID_YAML = `nome: "Broken"
parametri:
  og: [unclosed
`;

const UNKNOWN_FIELD_RECIPE = `nome: "Test"
stile: "American Pale Ale"
campo_errato: true
`;

// ── Test runner ──
async function main(): Promise<void> {
  const tool = new YamlValidatorTool();

  // If a real file path is passed as a CLI argument, validate it directly.
  const targetFile = process.argv[2];
  if (targetFile) {
    if (!existsSync(targetFile)) {
      console.error(`File non trovato: ${targetFile}`);
      process.exitCode = 1;
      return;
    }
    const res = await tool.resolveExecution({ input_file: targetFile }).execute({
      turnId: 0,
      toolCallId: 'cli',
      signal: new AbortController().signal,
    });
    console.log(res.output);
    if (res.isError) process.exitCode = 1;
    return;
  }

  const dir = mkdtempSync(join(tmpdir(), 'yaml-validator-test-'));

  try {
    // 1. Valid recipe → success result, no critical issues
    const validPath = join(dir, 'valid.yaml');
    writeFileSync(validPath, VALID_RECIPE, 'utf-8');
    const validExec = tool.resolveExecution({ input_file: validPath });
    const validRes = await validExec.execute({
      turnId: 1,
      toolCallId: 'test-1',
      signal: new AbortController().signal,
    });
    assert(!validRes.isError, `Valid recipe should not error, got: ${validRes.output}`);
    const validReport = JSON.parse(validRes.output) as { validation_status: string; normalized_recipe: { recipe_name: string; aggiunte_speciali?: Array<{ ingrediente: string; quantita_kg: number; giorni_contatto?: string }> }; checks: Array<{ id: string; status: string }> };
    assert(validReport.validation_status === 'incomplete', 'recipe without calculator results should be marked incomplete');
    assert(validReport.normalized_recipe.recipe_name === 'Test Pale Ale', 'normalized recipe should be returned');
    assert(validReport.normalized_recipe.aggiunte_speciali?.[0]?.ingrediente === 'Uva fragolino (Isabella)', 'normalized recipe should preserve special fruit addition');
    assert(validReport.normalized_recipe.aggiunte_speciali?.[0]?.quantita_kg === 4, 'normalized fruit addition should preserve quantity');
    assert(validReport.normalized_recipe.aggiunte_speciali?.[0]?.giorni_contatto === '7-10', 'normalized fruit addition should preserve contact range');
    assert(validReport.checks.every(check => check.status === 'passed' || check.status === 'not_verified'), 'checks should expose structured statuses');
    assert(validReport.checks.some(check => check.id === 'BREWING_FG_MISMATCH' && check.status === 'not_verified'), 'missing brewing result should leave FG not verified');

    // 2. Distinct Brewing Calculator payloads are matched by calculation.
    const calculatorResults = {
      water: { calculation: 'water_profile', ok: true, status: 'ok', result: {} },
      brewing: [
        { calculation: 'estimated_og', ok: true, status: 'ok', result: { estimated_og: 1.052 } },
        { calculation: 'estimated_fg', ok: true, status: 'ok', result: { fg: 1.012, abv_percent: 5.25 } },
        { calculation: 'abv', ok: true, status: 'ok', result: { abv_percent: 5.25 } },
      ],
      ibu: { calculation: 'ibu', ok: true, status: 'ok', result: { total_ibu: 40 } },
      priming: { calculation: 'priming', ok: true, status: 'ok', result: { packaging_volume_l: 19, total_fermentable_g: 47.5, target_co2_volumes: 2.5 } },
    };
    const calculatedRes = await tool.resolveExecution({ input_file: validPath, calculator_results: calculatorResults }).execute({
      turnId: 5,
      toolCallId: 'test-calculators',
      signal: new AbortController().signal,
    });
    const calculatedReport = JSON.parse(calculatedRes.output) as { validation_status: string; errors: Array<{ code: string }>; checks: Array<{ id: string; status: string }> };
    assert(calculatedReport.validation_status === 'valid', 'complete calculator results should produce valid status');
    assert(calculatedReport.errors.length === 0, 'matching calculator results should not create errors');
    assert(calculatedReport.checks.find(check => check.id === 'BREWING_FG_MISMATCH')?.status === 'passed', 'FG should compare against result.fg from estimated_fg');
    assert(calculatedReport.checks.find(check => check.id === 'BREWING_ABV_MISMATCH')?.status === 'passed', 'ABV should compare against abv calculator payload');

    // 3. A mismatching estimated FG is reported against the declared FG.
    const wrongFgResults = { ...calculatorResults, brewing: [...calculatorResults.brewing.slice(0, 1), { calculation: 'estimated_fg', ok: true, status: 'ok', result: { fg: 1.020, abv_percent: 4.2 } }, calculatorResults.brewing[2]] };
    const wrongFgRes = await tool.resolveExecution({ input_file: validPath, calculator_results: wrongFgResults }).execute({
      turnId: 6,
      toolCallId: 'test-wrong-fg',
      signal: new AbortController().signal,
    });
    const wrongFgReport = JSON.parse(wrongFgRes.output) as { validation_status: string; errors: Array<{ code: string; expected?: number }> };
    assert(wrongFgReport.validation_status === 'invalid', 'mismatching estimated FG should invalidate the report');
    assert(wrongFgReport.errors.some(error => error.code === 'BREWING_FG_MISMATCH' && error.expected === 1.02), 'FG mismatch should expose calculator result.fg');

    // 4. Out-of-style recipe → critical issues reported
    const oosPath = join(dir, 'out-of-style.yaml');
    writeFileSync(oosPath, OUT_OF_STYLE_RECIPE, 'utf-8');
    const oosRes = await tool.resolveExecution({ input_file: oosPath }).execute({
      turnId: 7,
      toolCallId: 'test-2',
      signal: new AbortController().signal,
    });
    assert(!oosRes.isError, `out-of-style recipe should not error, got: ${oosRes.output}`);
    const oosReport = JSON.parse(oosRes.output) as { validation_status: string; errors: unknown[]; warnings: Array<{ code: string; message: string }> };
    assert(oosReport.validation_status === 'invalid', 'incomplete recipe should remain invalid');
    assert(!oosReport.errors.some(error => JSON.stringify(error).includes('OG 1.070')), 'style deviation should not be classified as a deterministic error');
    assert(oosReport.warnings.some(w => w.code === 'BJCP_DEVIATION' && w.message.includes('OG 1.070')), 'out-of-style OG should be a BJCP warning');
    assert(oosReport.warnings.some(w => w.code === 'BJCP_DEVIATION' && w.message.includes('IBU 15')), 'out-of-style IBU should be a BJCP warning');

    // 3. Missing file → error result
    const missingRes = await tool.resolveExecution({ input_file: join(dir, 'nope.yaml') }).execute({
      turnId: 8,
      toolCallId: 'test-3',
      signal: new AbortController().signal,
    });
    assert(missingRes.isError, 'missing file should return isError');
    assertIncludes(missingRes.output, 'non trovato', 'missing file error message');

    // 4. Invalid YAML → error result
    const badPath = join(dir, 'invalid.yaml');
    writeFileSync(badPath, INVALID_YAML, 'utf-8');
    const badRes = await tool.resolveExecution({ input_file: badPath }).execute({
      turnId: 9,
      toolCallId: 'test-4',
      signal: new AbortController().signal,
    });
    assert(badRes.isError, 'invalid YAML should return isError');

    // 5. Unknown top-level fields include the complete list of accepted fields.
    const unknownFieldPath = join(dir, 'unknown-field.yaml');
    writeFileSync(unknownFieldPath, UNKNOWN_FIELD_RECIPE, 'utf-8');
    const unknownFieldRes = await tool.resolveExecution({ input_file: unknownFieldPath }).execute({
      turnId: 10,
      toolCallId: 'test-unknown-field',
      signal: new AbortController().signal,
    });
    assert(unknownFieldRes.isError, 'unknown top-level field should return isError');
    assertIncludes(
      unknownFieldRes.output,
      'Campo non riconosciuto. Campi validi: schema_version, nome, stile, codice_bjcp, descrizione, note, parametri, grist, luppolatura, aggiunte_speciali, lievito, mash, fermentazione, bollitura, acqua, agua, sparge, sales, mash_salts, sparge_salts, carbonazione, spezie, zuccheri, confezionamento, obiettivi_sensoriali, vincoli_produzione, fonte, note_critiche, alternative.',
      'unknown field error should include all accepted top-level fields',
    );

    const invalidFruitPath = join(dir, 'invalid-fruit.yaml');
    writeFileSync(invalidFruitPath, `nome: "Test frutta invalida"\nstile: "American Pale Ale"\nparametri:\n  batch_size_litri: 20\n  og: 1.052\n  fg: 1.012\n  ibu: 40\naggiunte_speciali:\n  - ingrediente: "Uva"\n    quantita_kg: 0\n    forma: "fresca"\n    stadio: "secondario"\n`, 'utf-8');
    const invalidFruitRes = await tool.resolveExecution({ input_file: invalidFruitPath }).execute({
      turnId: 11,
      toolCallId: 'test-invalid-fruit',
      signal: new AbortController().signal,
    });
    assert(invalidFruitRes.isError, 'special fruit addition with zero quantity should be rejected');
    assertIncludes(invalidFruitRes.output, 'aggiunte_speciali[0].quantita_kg', 'invalid fruit quantity should identify its field path');

    const invalidSaltPath = join(dir, 'invalid-salt.yaml');
    writeFileSync(invalidSaltPath, `nome: "Test sale invalido"\nstile: "American Pale Ale"\nparametri:\n  batch_size_litri: 20\n  og: 1.052\n  fg: 1.012\n  ibu: 40\nmash_salts:\n  gypsum_g: -1\n`, 'utf-8');
    const invalidSaltRes = await tool.resolveExecution({ input_file: invalidSaltPath }).execute({
      turnId: 12,
      toolCallId: 'test-invalid-salt',
      signal: new AbortController().signal,
    });
    assert(invalidSaltRes.isError, 'negative mineral salt amount should be rejected');
    assertIncludes(invalidSaltRes.output, 'mash_salts.gypsum_g', 'invalid salt amount should identify its YAML field path');

    const fermentationStepsPath = join(dir, 'fermentation-steps.yaml');
    writeFileSync(fermentationStepsPath, `${VALID_RECIPE.replace('temperatura_c: 19\n  primaria_giorni: 14', 'temperatura_c: 19\n  primaria_giorni: 14\n  steps:\n    - fase: "Avvio"\n      giorno_inizio: 0\n      giorno_fine: 4\n      temperatura_c: 18\n    - fase: "Rampa libera"\n      giorno_inizio: 4\n      giorno_fine: 7\n      temperatura_min_c: 21\n      temperatura_max_c: 23')}`, 'utf-8');
    const fermentationStepsRes = await tool.resolveExecution({ input_file: fermentationStepsPath }).execute({
      turnId: 13,
      toolCallId: 'test-fermentation-steps',
      signal: new AbortController().signal,
    });
    const fermentationStepsReport = JSON.parse(fermentationStepsRes.output) as { normalized_recipe: { fermentation_steps?: Array<{ phase?: string; start_day?: number; temperature_min_c?: number }> } };
    assert(fermentationStepsReport.normalized_recipe.fermentation_steps?.[1]?.phase === 'Rampa libera', 'validator should preserve fermentation phase names');
    assert(fermentationStepsReport.normalized_recipe.fermentation_steps?.[1]?.start_day === 4, 'validator should preserve fermentation day ranges');
    assert(fermentationStepsReport.normalized_recipe.fermentation_steps?.[1]?.temperature_min_c === 21, 'validator should preserve fermentation temperature ranges');

    const invalidFermentationStepsPath = join(dir, 'invalid-fermentation-steps.yaml');
    writeFileSync(invalidFermentationStepsPath, `${VALID_RECIPE.replace('temperatura_c: 19\n  primaria_giorni: 14', 'temperatura_c: 19\n  steps:\n    - fase: "Intervallo non valido"\n      giorno_inizio: 5\n      giorno_fine: 3\n      temperatura_min_c: 24\n      temperatura_max_c: 20')}`, 'utf-8');
    const invalidFermentationStepsRes = await tool.resolveExecution({ input_file: invalidFermentationStepsPath }).execute({
      turnId: 14,
      toolCallId: 'test-invalid-fermentation-steps',
      signal: new AbortController().signal,
    });
    assert(invalidFermentationStepsRes.isError, 'validator should reject reversed day and temperature ranges');
    assertIncludes(invalidFermentationStepsRes.output, 'giorno_fine', 'invalid fermentation day range should identify its field');
    assertIncludes(invalidFermentationStepsRes.output, 'temperatura_max_c', 'invalid fermentation temperature range should identify its field');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  summary();
}

void main();