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
    assertIncludes(validRes.output, 'Validazione ricetta', 'valid recipe report header');
    assertIncludes(validRes.output, '18B', 'valid recipe style code');
    assertIncludes(validRes.output, '✅ Valida', 'valid recipe should be marked valid');

    // 2. Out-of-style recipe → critical issues reported
    const oosPath = join(dir, 'out-of-style.yaml');
    writeFileSync(oosPath, OUT_OF_STYLE_RECIPE, 'utf-8');
    const oosRes = await tool.resolveExecution({ input_file: oosPath }).execute({
      turnId: 2,
      toolCallId: 'test-2',
      signal: new AbortController().signal,
    });
    assert(!oosRes.isError, `out-of-style recipe should not error, got: ${oosRes.output}`);
    assertIncludes(oosRes.output, '❌ Errori critici', 'out-of-style should list critical errors');
    assertIncludes(oosRes.output, 'OG 1.070', 'out-of-style should flag high OG');
    assertIncludes(oosRes.output, 'IBU 15', 'out-of-style should flag low IBU');

    // 3. Missing file → error result
    const missingRes = await tool.resolveExecution({ input_file: join(dir, 'nope.yaml') }).execute({
      turnId: 3,
      toolCallId: 'test-3',
      signal: new AbortController().signal,
    });
    assert(missingRes.isError, 'missing file should return isError');
    assertIncludes(missingRes.output, 'non trovato', 'missing file error message');

    // 4. Invalid YAML → error result
    const badPath = join(dir, 'invalid.yaml');
    writeFileSync(badPath, INVALID_YAML, 'utf-8');
    const badRes = await tool.resolveExecution({ input_file: badPath }).execute({
      turnId: 4,
      toolCallId: 'test-4',
      signal: new AbortController().signal,
    });
    assert(badRes.isError, 'invalid YAML should return isError');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  summary();
}

void main();