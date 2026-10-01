import { PrimingCalculatorInputSchema, PrimingCalculatorTool } from '../src/brewing/priming-calculator.ts';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string): void {
  if (condition) passed++;
  else {
    failed++;
    failures.push(message);
  }
}

function approx(actual: number, expected: number, tolerance: number, message: string): void {
  assert(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected} ± ${tolerance}, got ${actual}`);
}

interface PrimingOutput {
  schema_version: string;
  calculation: string;
  status: string;
  result: Record<string, unknown>;
  warnings: Array<{ code: string; message: string }>;
  errors: Array<{ code: string; message: string }>;
  display: { summary: string };
}

function parseOutput(output: string, message: string): PrimingOutput {
  try {
    const parsed = JSON.parse(output) as PrimingOutput;
    assert(parsed.schema_version === '1.0', `${message}: schema version`);
    assert(parsed.calculation === 'priming', `${message}: calculation`);
    assert(parsed.status === 'ok', `${message}: status`);
    assert(parsed.result !== null, `${message}: result`);
    assert(Array.isArray(parsed.warnings), `${message}: warnings`);
    assert(Array.isArray(parsed.errors), `${message}: errors`);
    return parsed;
  } catch {
    assert(false, `${message}: output is not JSON: ${output}`);
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const tool = new PrimingCalculatorTool();
  const execute = async (input: Parameters<typeof tool.resolveExecution>[0]) =>
    tool.resolveExecution(input).execute({
      turnId: 1,
      toolCallId: 'priming-test',
      signal: new AbortController().signal,
    });

  const base = {
    packaging_volume_l: 20,
    max_fermentation_temperature_c: 20,
    beer_temperature_at_packaging_c: 10,
    target_co2_volumes: 2.4,
    sugar_type: 'sucrose' as const,
    packaging: 'bottle_priming' as const,
  };

  const bottle = await execute(base);
  assert(!bottle.isError, 'bottle priming succeeds');
  const bottleJson = parseOutput(bottle.output, 'bottle priming');
  assert(bottleJson.result.packaging_volume_l === 20, 'packaging volume is explicit');
  assert(bottleJson.result.packaging === 'bottle_priming', 'bottle mode is explicit');
  assert(bottleJson.result.fermentable_type === 'sucrose', 'fermentable type is reported');
  assert(bottleJson.result.method === 'temperature_estimate', 'temperature estimate method is reported');
  assert(bottleJson.warnings.some(warning => warning.code === 'RESIDUAL_CO2_ESTIMATE'), 'residual estimate warning is structured');
  assert(bottleJson.warnings.some(warning => warning.code === 'FG_STABILITY_REQUIRED'), 'FG stability warning is structured');
  assert(bottleJson.result.beer_temperature_at_packaging_c === 10, 'packaging temperature is informational');

  const packagingTemperatureChanged = await execute({ ...base, beer_temperature_at_packaging_c: 25 });
  const packagingTemperatureJson = parseOutput(packagingTemperatureChanged.output, 'packaging temperature');
  approx(Number(packagingTemperatureJson.result.residual_co2_volumes), Number(bottleJson.result.residual_co2_volumes), 0.000001, 'packaging temperature does not drive residual CO2 estimate');
  approx(Number(packagingTemperatureJson.result.total_fermentable_g), Number(bottleJson.result.total_fermentable_g), 0.000001, 'packaging temperature does not change dosage');

  const explicit = await execute({
    packaging_volume_l: 10,
    residual_co2_volumes: 0.8,
    co2_residual_method: 'explicit',
    target_co2_volumes: 2.8,
    sugar_type: 'dextrose',
    packaging: 'keg_natural',
  });
  assert(!explicit.isError, 'explicit residual CO2 succeeds without fermentation temperature');
  const explicitJson = parseOutput(explicit.output, 'explicit residual');
  assert(explicitJson.result.packaging === 'keg_natural', 'natural keg mode is explicit');
  assert(explicitJson.result.residual_co2_volumes === 0.8, 'explicit residual value is used');
  assert(explicitJson.result.method === 'explicit', 'explicit residual method is reported');
  approx(Number(explicitJson.result.co2_to_produce_volumes), 2, 0.000001, 'CO2 to produce uses explicit residual');
  approx(Number(explicitJson.result.total_fermentable_g), 88, 0.000001, 'dextrose monohydrate coefficient is used');

  const pressurizedMissing = PrimingCalculatorInputSchema.safeParse({
    ...base, fermentation_pressurized: true,
  });
  assert(!pressurizedMissing.success, 'pressurized fermentation requires explicit residual CO2');
  const pressurized = await execute({
    packaging_volume_l: 10, target_co2_volumes: 2.4, fermentation_pressurized: true,
    co2_residual_method: 'explicit', residual_co2_volumes: 1.2,
  });
  assert(!pressurized.isError, 'pressurized fermentation accepts explicit residual CO2');

  const targetFromStyle = await execute({
    packaging_volume_l: 20, max_fermentation_temperature_c: 20, beer_style: 'weissbier',
  });
  const styleJson = parseOutput(targetFromStyle.output, 'style target');
  assert(styleJson.result.target_co2_volumes === 3, 'recognized style supplies target CO2');

  const missingTarget = PrimingCalculatorInputSchema.safeParse({
    packaging_volume_l: 20, max_fermentation_temperature_c: 20,
  });
  assert(!missingTarget.success, 'missing target and style are rejected');
  const invalidResult = await execute({ packaging_volume_l: 20, max_fermentation_temperature_c: 20 });
  assert(invalidResult.isError === true, 'invalid input returns a structured error result');
  const invalidJson = JSON.parse(invalidResult.output) as { status: string; errors: Array<{ code: string }> };
  assert(invalidJson.status === 'error' && invalidJson.errors[0]?.code === 'INPUT_INVALID', 'invalid input error uses the standard envelope');
  const unknownStyle = await execute({
    packaging_volume_l: 20, max_fermentation_temperature_c: 20, beer_style: 'unknown-style',
  });
  assert(unknownStyle.isError === true, 'unknown style does not silently fall back to 2.4 volumes');

  const noSugar = await execute({
    packaging_volume_l: 20, max_fermentation_temperature_c: 20, target_co2_volumes: 0.5,
  });
  assert(!noSugar.isError, 'target below residual is a valid no-priming result');
  const noSugarJson = parseOutput(noSugar.output, 'no sugar');
  assert(noSugarJson.result.total_fermentable_g === 0, 'target below residual requires zero sugar');
  assert(noSugarJson.warnings.some(warning => warning.code === 'TARGET_NOT_ABOVE_RESIDUAL'), 'no-sugar condition is reported');

  const honey = await execute({
    packaging_volume_l: 10, max_fermentation_temperature_c: 20, target_co2_volumes: 2.4,
    sugar_type: 'honey', fermentable_coefficient_g_per_l_per_volume: 6,
  });
  const honeyJson = parseOutput(honey.output, 'custom honey coefficient');
  approx(Number(honeyJson.result.fermentable_coefficient_g_per_l_per_volume), 6, 0.000001, 'custom fermentable coefficient is used');
  assert(!honeyJson.warnings.some(warning => warning.code === 'FERMENTABLE_YIELD_UNCERTAIN'), 'custom coefficient suppresses yield uncertainty warning');

  const legacyAlias = await execute({
    batch_size_liters: 5, max_fermentation_temperature_c: 20, target_co2_volumes: 2.4,
  });
  const legacyJson = parseOutput(legacyAlias.output, 'legacy volume alias');
  assert(legacyJson.result.packaging_volume_l === 5, 'legacy volume alias remains supported');

  assert(!PrimingCalculatorInputSchema.safeParse({ ...base, packaging_volume_l: 20, batch_size_liters: 19 }).success, 'conflicting volume alias is rejected');
  assert(!PrimingCalculatorInputSchema.safeParse({ ...base, packaging_volume_l: 0 }).success, 'non-positive packaging volume is rejected');
  assert(!PrimingCalculatorInputSchema.safeParse({ ...base, max_fermentation_temperature_c: 50 }).success, 'invalid reference temperature is rejected');
  assert(!PrimingCalculatorInputSchema.safeParse({ ...base, fermentable_coefficient_g_per_l_per_volume: 20 }).success, 'implausible coefficient is rejected');
  assert(!PrimingCalculatorInputSchema.safeParse({ ...base, co2_residual_method: 'explicit', residual_co2_volumes: undefined }).success, 'explicit method requires residual CO2');
  assert(!PrimingCalculatorInputSchema.safeParse({ ...base, packaging: 'keg' }).success === false, 'legacy keg alias remains parseable');

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    for (const failure of failures) console.error(`  ${failure}`);
    process.exitCode = 1;
  }
}

void main();
