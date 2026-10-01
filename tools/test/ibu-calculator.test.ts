import { IbuCalculatorInputSchema, IbuCalculatorTool } from '../src/brewing/ibu-calculator.ts';

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

interface IbuOutput {
  schema_version: string;
  calculation: string;
  status: string;
  inputs: Record<string, unknown>;
  result: {
    total_ibu: number;
    boil_ibu: number;
    first_wort_ibu: number;
    whirlpool_ibu_estimated: number;
    bu: number | null;
    additions: Array<Record<string, unknown>>;
  };
  warnings: Array<Record<string, unknown>>;
  errors: Array<Record<string, unknown>>;
  display: { summary: string };
}

function parseOutput(output: string, message: string): IbuOutput {
  try {
    const parsed = JSON.parse(output) as IbuOutput;
    assert(parsed.schema_version === '1.0', `${message}: schema_version`);
    assert(parsed.calculation === 'ibu', `${message}: calculation`);
    assert(parsed.status === 'ok', `${message}: status`);
    assert(Array.isArray(parsed.result.additions), `${message}: additions`);
    assert(Array.isArray(parsed.warnings), `${message}: warnings`);
    return parsed;
  } catch {
    assert(false, `${message}: output is not valid JSON: ${output}`);
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const tool = new IbuCalculatorTool();
  const execute = async (input: Parameters<typeof tool.resolveExecution>[0]) =>
    tool.resolveExecution(input).execute({
      turnId: 1,
      toolCallId: 'ibu-test',
      signal: new AbortController().signal,
    });

  const base = {
    ibu_volume_liters: 20,
    volume_reference: 'cold_fermenter' as const,
    boil_gravity: 1.050,
    original_gravity: 1.050,
    boil_duration_minutes: 60,
    hops: [
      { id: 'bitter-60', variety: 'Cascade', alpha_acids_percent: 6, grams: 30, time_minutes: 60, form: 'pellet' as const, use: 'boil' as const },
      { id: 'fwh-01', variety: 'Saaz', alpha_acids_percent: 4, grams: 20, time_minutes: 0, form: 'whole' as const, use: 'first_wort' as const },
      { id: 'wp-01', variety: 'Citra', alpha_acids_percent: 10, grams: 50, time_minutes: 20, form: 'pellet' as const, use: 'whirlpool' as const, whirlpool_temperature_c: 85 },
      { id: 'dry-01', variety: 'Mosaic', alpha_acids_percent: 12, grams: 40, time_minutes: 3 * 24 * 60, form: 'pellet' as const, use: 'dry_hop' as const },
      { id: 'mash-01', variety: 'Saaz', alpha_acids_percent: 4, grams: 15, time_minutes: 60, form: 'whole' as const, use: 'mash' as const },
    ],
  };

  const tinseth = await execute({ ...base, model: 'tinseth' });
  assert(!tinseth.isError, 'Tinseth succeeds');
  const tinsethJson = parseOutput(tinseth.output, 'Tinseth');
  assert(tinsethJson.result.additions.length === 5, 'all hop additions are returned separately');
  assert(tinsethJson.result.additions.every(addition => typeof addition.id === 'string'), 'every addition has a stable id');
  assert(tinsethJson.result.additions.some(addition => addition.model === 'whirlpool_empirical'), 'whirlpool uses its separate empirical model');
  assert(tinsethJson.result.additions.find(addition => addition.id === 'dry-01')?.ibu === 0, 'dry hop has zero theoretical IBU');
  assert(tinsethJson.result.additions.find(addition => addition.id === 'dry-01')?.model === 'dry_hop_zero_isomerized_ibu', 'dry hop model is explicit');
  const tinsethSum = tinsethJson.result.additions.reduce((sum, addition) => sum + Number(addition.ibu), 0);
  approx(tinsethSum, tinsethJson.result.total_ibu, 0.000001, 'addition IBU sum equals total');
  approx(tinsethJson.result.bu ?? Number.NaN, tinsethJson.result.total_ibu / 50, 0.000001, 'BU uses supplied OG');

  const rager = await execute({ ...base, model: 'rager' });
  assert(!rager.isError, 'Rager succeeds');
  const ragerJson = parseOutput(rager.output, 'Rager');
  assert(ragerJson.result.total_ibu !== tinsethJson.result.total_ibu, 'Tinseth and Rager are independent models');

  const zeroMinute = await execute({
    ...base,
    model: 'tinseth',
    hops: [{ ...base.hops[0], id: 'zero-minute', time_minutes: 0 }],
  });
  const zeroJson = parseOutput(zeroMinute.output, 'zero minute');
  assert(zeroJson.result.additions[0].ibu === 0, 'Tinseth zero-minute boil addition is zero');

  const explicitAa = await execute({
    ...base,
    hops: [{ ...base.hops[0], id: 'explicit-aa', variety: 'Cascade', alpha_acids_percent: 7 }],
  });
  const explicitAaJson = parseOutput(explicitAa.output, 'explicit AA');
  const explicitAddition = explicitAaJson.result.additions[0];
  assert(explicitAddition.alpha_acids_percent === 7, 'user AA percentage takes precedence over database');
  assert(explicitAddition.alpha_acids_source === 'user supplied', 'user AA source is reported');
  assert(!explicitAaJson.warnings.some(warning => warning.code === 'HOP_AA_ESTIMATED'), 'explicit AA does not emit estimated warning');

  const databaseAa = await execute({
    ...base,
    hops: [{ ...base.hops[0], id: 'database-aa', alpha_acids_percent: undefined }],
  });
  const databaseAaJson = parseOutput(databaseAa.output, 'database AA');
  assert(databaseAaJson.warnings.some(warning => warning.code === 'HOP_AA_ESTIMATED'), 'database AA emits HOP_AA_ESTIMATED');

  const noWhirlpool = await execute({
    ...base,
    estimate_whirlpool_ibu: false,
    hops: [base.hops[2]],
  });
  const noWhirlpoolJson = parseOutput(noWhirlpool.output, 'excluded whirlpool');
  assert(noWhirlpoolJson.result.whirlpool_ibu_estimated === 0, 'whirlpool can be excluded explicitly');
  assert(noWhirlpoolJson.result.additions[0].model === 'whirlpool_excluded', 'whirlpool exclusion is explicit');

  const noHydraulicFallback = IbuCalculatorInputSchema.safeParse({
    model: 'tinseth', boil_gravity: 1.050, hops: [],
  });
  assert(!noHydraulicFallback.success, 'IBU requires an explicit reference volume');
  const oldBatchSizeOnly = IbuCalculatorInputSchema.safeParse({
    model: 'tinseth', batch_size_liters: 20, boil_gravity: 1.050, hops: [],
  });
  assert(!oldBatchSizeOnly.success, 'batch_size_liters is not an implicit IBU volume');

  const invalidBoilTime = IbuCalculatorInputSchema.safeParse({
    ...base, hops: [{ ...base.hops[0], time_minutes: 61 }],
  });
  assert(!invalidBoilTime.success, 'boil time cannot exceed total boil duration');
  const missingWhirlpoolTemperature = IbuCalculatorInputSchema.safeParse({
    ...base, hops: [{ ...base.hops[2], whirlpool_temperature_c: undefined }],
  });
  assert(!missingWhirlpoolTemperature.success, 'whirlpool requires temperature');
  const invalidAa = IbuCalculatorInputSchema.safeParse({
    ...base, hops: [{ ...base.hops[0], alpha_acids_percent: 31 }],
  });
  assert(!invalidAa.success, 'AA percentage above the valid range is rejected');
  const duplicateIds = IbuCalculatorInputSchema.safeParse({
    ...base, hops: [{ ...base.hops[0], id: 'same' }, { ...base.hops[1], id: 'same' }],
  });
  assert(!duplicateIds.success, 'addition IDs must be unique');

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    for (const failure of failures) console.error(`  ${failure}`);
    process.exitCode = 1;
  }
}

void main();
