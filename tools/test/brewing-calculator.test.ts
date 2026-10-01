import { BrewingCalculatorInputSchema, BrewingCalculatorTool } from '../src/brewing/brewing-calculator.ts';

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

function includes(output: string, text: string, message: string): void {
  assert(output.includes(text), `${message}: expected "${text}" in:\n${output}`);
}

function approx(actual: number, expected: number, tolerance: number, message: string): void {
  assert(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected} ± ${tolerance}, got ${actual}`);
}

function numberAfter(output: string, pattern: RegExp, message: string): number {
  const match = output.match(pattern);
  assert(match?.[1] != null, `${message}: numeric value not found in:\n${output}`);
  return Number(match?.[1] ?? Number.NaN);
}

function structured(output: string, message: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(output) as Record<string, unknown>;
    assert(parsed.tool === 'brewing_calculator', `${message}: missing tool envelope`);
    assert(typeof parsed.calculation === 'string', `${message}: missing calculation`);
    assert(typeof parsed.ok === 'boolean', `${message}: missing ok status`);
    assert(parsed.result !== undefined, `${message}: missing result field`);
    return parsed;
  } catch {
    assert(false, `${message}: output is not JSON:\n${output}`);
    return {};
  }
}

async function run(): Promise<void> {
  const tool = new BrewingCalculatorTool();
  const execute = async (input: Parameters<typeof tool.resolveExecution>[0]) =>
    tool.resolveExecution(input).execute({
      turnId: 1,
      toolCallId: 'brewing-test',
      signal: new AbortController().signal,
    });

  const baseVolumes = {
    mash_l: 17,
    sparge_l: 12,
    total_water_l: 29,
    pre_boil_l: 25,
    post_boil_l: 22,
    fermenter_l: 20,
    packaged_l: 19,
    volume_reference: 'hot' as const,
  };
  const grainBill = [{ malt: 'Pilsner malt', kg: 5 }];

  const abv = await execute({ calculation: 'abv', og: 1.050, fg: 1.010 });
  assert(!abv.isError, 'ABV works without water_volumes');
  includes(abv.output, '5.250%', 'ABV result');

  const regressionAbv = await execute({ calculation: 'abv', og: 1.050, fg: 1.014 });
  const abvJson = structured(regressionAbv.output, 'ABV structured result');
  approx(Number((abvJson.result as Record<string, unknown>).abv_percent), 4.725, 0.0005, 'ABV exposes numeric result');
  approx(numberAfter(regressionAbv.output, /\*\*([0-9.]+)% vol/, 'ABV regression'), 4.725, 0.0005, 'ABV regression');

  const attenuation = await execute({ calculation: 'attenuation', og: 1.050, fg: 1.010 });
  assert(!attenuation.isError, 'attenuation works without water_volumes');

  const regressionAttenuation = await execute({ calculation: 'attenuation', og: 1.050, fg: 1.014 });
  approx(numberAfter(regressionAttenuation.output, /\*\*([0-9.]+)%\*/, 'attenuation regression'), 72, 0.05, 'attenuation regression');

  const missingVolumes = await execute({
    calculation: 'mash_efficiency',
    pre_boil_gravity: 1.040,
    grain_bill_kg: grainBill,
  });
  assert(missingVolumes.isError === true, 'volume-dependent calculation fails without water_volumes');
  includes(missingVolumes.output, 'water_profile_calculator', 'missing-volume guidance');

  const missingStrikeVolume = await execute({
    calculation: 'strike_water',
    mash_temp_c: 66,
    grain_temp_c: 20,
    grain_bill_kg: grainBill,
  });
  assert(missingStrikeVolume.isError === true, 'strike temperature requires mash volume');
  includes(missingStrikeVolume.output, 'water_profile_calculator', 'strike missing-volume guidance');

  const strike = await execute({
    calculation: 'strike_water',
    mash_temp_c: 66,
    grain_temp_c: 20,
    grain_bill_kg: grainBill,
    water_volumes: baseVolumes,
  });
  assert(!strike.isError, 'strike temperature uses resolved mash volume');
  includes(strike.output, '17.00 L mash', 'strike temperature uses resolved mash volume');

  const mashEfficiency = await execute({
    calculation: 'mash_efficiency',
    pre_boil_gravity: 1.040,
    grain_bill_kg: grainBill,
    water_volumes: baseVolumes,
  });
  assert(!mashEfficiency.isError, 'mash efficiency succeeds with resolved volumes');
  includes(mashEfficiency.output, '65.1%', 'mash efficiency uses pre-boil volume');

  const brewhouseEfficiency = await execute({
    calculation: 'brewhouse_efficiency',
    og: 1.050,
    grain_bill_kg: grainBill,
    water_volumes: baseVolumes,
  });
  assert(!brewhouseEfficiency.isError, 'brewhouse efficiency succeeds with resolved volumes');
  includes(brewhouseEfficiency.output, '20.0 L', 'brewhouse efficiency uses fermenter volume');

  const pitching = await execute({
    calculation: 'pitching_rate',
    og: 1.050,
    batch_size_liters: 30,
    grain_bill_kg: grainBill,
    water_volumes: baseVolumes,
  });
  assert(!pitching.isError, 'pitching rate succeeds with resolved volumes');
  includes(pitching.output, 'Mosto: 20.0 L', 'pitching rate uses fermenter volume');
  assert(!pitching.output.includes('Mosto: 30.0 L'), 'pitching rate does not use batch_size_liters as fallback');

  const estimatedOg = await execute({
    calculation: 'estimated_og',
    brewhouse_efficiency_percent: 65,
    grain_bill_kg: grainBill,
    water_volumes: baseVolumes,
  });
  includes(estimatedOg.output, '1.050', 'estimated OG uses fermenter volume');

  const estimatedPreBoil = await execute({
    calculation: 'estimated_pre_boil_gravity',
    mash_efficiency_percent: 65,
    grain_bill_kg: grainBill,
    water_volumes: baseVolumes,
  });
  includes(estimatedPreBoil.output, '1.040', 'estimated pre-boil gravity uses pre-boil volume');

  const estimatedFg = await execute({ calculation: 'estimated_fg', og: 1.050, attenuation_percent: 80 });
  includes(estimatedFg.output, '1.010', 'estimated FG uses attenuation');

  const regressionFg = await execute({ calculation: 'estimated_fg', og: 1.050, attenuation_percent: 78 });
  approx(numberAfter(regressionFg.output, /FG stimata = \*\*([0-9.]+)\*\*/, 'estimated FG regression'), 1.011, 0.0005, 'estimated FG regression');

  const attenuationZero = await execute({ calculation: 'estimated_fg', og: 1.050, attenuation_percent: 0 });
  assert(!attenuationZero.isError, 'zero attenuation is a valid estimate');
  includes(attenuationZero.output, '1.050', 'zero attenuation keeps OG as FG');

  const referenceGrain = [{ malt: 'Pale Ale', kg: 2, potential_pt_l_per_kg: 307 }];
  const referenceVolumes = {
    mash_l: 8,
    sparge_l: 6,
    total_water_l: 14,
    pre_boil_l: 12,
    post_boil_l: 10,
    fermenter_l: 10,
    packaged_l: 9,
    volume_reference: 'hot' as const,
  };
  const mashReference = await execute({
    calculation: 'efficiency',
    efficiency_type: 'mash',
    grain_bill: referenceGrain,
    measured_gravity: 1.040,
    water_volumes: referenceVolumes,
  });
  includes(mashReference.output, '78.18%', 'reference mash efficiency');
  includes(mashReference.output, '12.0 L', 'mash efficiency uses pre-boil volume');

  const brewhouseReference = await execute({
    calculation: 'efficiency',
    efficiency_type: 'brewhouse',
    grain_bill: referenceGrain,
    measured_gravity: 1.045,
    water_volumes: referenceVolumes,
  });
  includes(brewhouseReference.output, '73.29%', 'reference brewhouse efficiency');
  includes(brewhouseReference.output, '10.0 L', 'brewhouse efficiency uses fermenter volume');

  const packagedChanged = await execute({
    calculation: 'efficiency',
    efficiency_type: 'brewhouse',
    grain_bill: referenceGrain,
    measured_gravity: 1.045,
    water_volumes: { ...referenceVolumes, packaged_l: 1 },
  });
  assert(packagedChanged.output === brewhouseReference.output, 'packaged volume does not affect efficiency');

  const unknownMalt = await execute({
    calculation: 'efficiency',
    efficiency_type: 'mash',
    grain_bill: [{ malt: 'Commercial Blend X', kg: 2 }],
    measured_gravity: 1.040,
    water_volumes: referenceVolumes,
  });
  assert(unknownMalt.isError === true, 'unknown commercial blend requires explicit potential');
  includes(unknownMalt.output, 'potential_pt_l_per_kg', 'explicit potential guidance');

  const withAddedFermentable = await execute({
    calculation: 'efficiency',
    efficiency_type: 'brewhouse',
    grain_bill: referenceGrain,
    measured_gravity: 1.050,
    additional_fermentables: [{ name: 'Estratto aggiunto', kg: 0.1, potential_pt_l_per_kg: 384 }],
    water_volumes: referenceVolumes,
  });
  includes(withAddedFermentable.output, '38 punti·L', 'post-mash fermentable is reported separately');

  const oldHydraulicOperation = BrewingCalculatorInputSchema.safeParse({ calculation: 'mash_water_volume' });
  assert(!oldHydraulicOperation.success, 'old hydraulic operations are absent from the public enum');

  const invalidWaterVolume = BrewingCalculatorInputSchema.safeParse({
    calculation: 'mash_efficiency',
    water_volumes: { ...baseVolumes, pre_boil_l: -1 },
  });
  assert(!invalidWaterVolume.success, 'water_volumes rejects negative values');

  const invalidEfficiency = BrewingCalculatorInputSchema.safeParse({
    calculation: 'estimated_og',
    mash_efficiency_percent: 101,
  });
  assert(!invalidEfficiency.success, 'efficiency above 100 percent is rejected');

  const gravityBalanceInput = await execute({
    calculation: 'estimated_og',
    pre_boil_gravity: 1.0405,
    water_volumes: { ...baseVolumes, pre_boil_l: 15.8, post_boil_l: 12.8 },
  });
  approx(numberAfter(gravityBalanceInput.output, /\*\*([0-9.]+)\*\*/, 'points-litre OG prediction'), 1.050, 0.0005, 'points-litre OG prediction');
  assert(!gravityBalanceInput.output.includes('trub'), 'points-litre prediction does not subtract trub twice');

  const gravityBalance = await execute({
    calculation: 'gravity_balance',
    initial_volume_l: 12,
    initial_gravity: 1.040,
    final_volume_l: 10,
    final_gravity: 1.048,
  });
  includes(gravityBalance.output, '480.00 punti·L', 'gravity balance initial extract');
  includes(gravityBalance.output, '480.00 punti·L', 'gravity balance final extract');

  const boilCorrection = await execute({
    calculation: 'boil_correction',
    measured_pre_boil_l: 15,
    measured_pre_boil_gravity: 1.040,
    target_og: 1.050,
    target_post_boil_l: 12,
    boil_off_l_per_hour: 3,
  });
  assert(!boilCorrection.isError, 'boil correction succeeds with measured values');
  includes(boilCorrection.output, '600.00 punti·L', 'boil correction reports initial extract');
  includes(boilCorrection.output, '1.050', 'boil correction reports target OG');
  includes(boilCorrection.output, 'Nessuna correzione degli estratti necessaria', 'boil correction reports no extract correction');
  includes(boilCorrection.output, '60 minuti', 'boil correction reports 60 minutes');

  const boilMissingInput = await execute({ calculation: 'boil_correction', measured_pre_boil_l: 15 });
  assert(boilMissingInput.isError === true, 'boil correction rejects missing volume and gravity inputs');
  const boilInvalidGravity = await execute({
    calculation: 'boil_correction', measured_pre_boil_l: 15, measured_pre_boil_gravity: 1,
    target_post_boil_l: 12, target_og: 1.050,
  });
  assert(boilInvalidGravity.isError === true, 'boil correction rejects invalid gravity');
  const boilIncompatibleVolume = await execute({
    calculation: 'boil_correction', measured_pre_boil_l: 15, measured_pre_boil_gravity: 1.040,
    target_post_boil_l: 16, target_og: 1.050,
  });
  assert(boilIncompatibleVolume.isError === true, 'boil correction rejects post-boil volume above pre-boil volume');

  const strikeRegression = await execute({
    calculation: 'strike_water', mash_temp_c: 67, grain_temp_c: 20,
    grain_bill_kg: [{ malt: 'Pilsner malt', kg: 2.5 }],
    water_volumes: { ...baseVolumes, mash_l: 13.5 },
  });
  approx(numberAfter(strikeRegression.output, /\*\*([0-9.]+)°C/, 'strike regression'), 70.6, 0.05, 'strike regression');

  const pitchingRegression = await execute({
    calculation: 'pitching_rate', og: 1.050, cells_per_ml_p_required: 0.75,
    batch_size_liters: 99, water_volumes: { ...baseVolumes, fermenter_l: 10 },
  });
  approx(numberAfter(pitchingRegression.output, /Fabbisogno di cellule vitali: \*\*([0-9.]+) miliardi/, 'pitching regression'), 92.9, 0.6, 'pitching regression');
  assert(!pitchingRegression.output.includes('Mosto: 99.0 L'), 'pitching rate ignores packaged volume fallback');

  const dilutionRegression = await execute({ calculation: 'dilution', volume_liters: 10, current_gravity: 1.060, target_gravity: 1.050 });
  includes(dilutionRegression.output, '2.00 L', 'dilution regression water');
  includes(dilutionRegression.output, '12.00 L', 'dilution regression final volume');

  const sucroseCorrection = await execute({
    calculation: 'gravity_correction', volume_liters: 10, current_gravity: 1.040,
    target_gravity: 1.050, fermentable_type: 'custom', fermentable_potential_pt_l_per_kg: 384,
  });
  approx(numberAfter(sucroseCorrection.output, /\*\*([0-9.]+) kg\*\*/, 'sucrose correction'), 0.2604, 0.0005, 'sucrose correction');
  includes(sucroseCorrection.output, 'approssimata', 'sucrose correction approximation label');

  const unknownPotential = await execute({
    calculation: 'gravity_correction', volume_liters: 10, current_gravity: 1.040,
    target_gravity: 1.050, fermentable_type: 'custom',
  });
  assert(unknownPotential.isError === true, 'unknown fermentable potential is rejected');

  const invalidAbvEqual = await execute({ calculation: 'abv', og: 1.050, fg: 1.050 });
  assert(invalidAbvEqual.isError === true, 'ABV rejects OG equal to FG');
  const invalidAbvOrder = await execute({ calculation: 'abv', og: 1.040, fg: 1.050 });
  assert(invalidAbvOrder.isError === true, 'ABV rejects OG below FG');
  structured(invalidAbvOrder.output, 'ABV error structured result');

  const tempCorrection = await execute({
    calculation: 'gravity_temperature_correction',
    measured_gravity: 1.050,
    sample_temperature_c: 20,
    hydrometer_calibration_temperature_c: 20,
    gravity_temperature_method: 'none',
  });
  assert(!tempCorrection.isError, 'temperature correction supports explicit no-correction mode');
  includes(tempCorrection.output, 'nessuna correzione', 'temperature correction warning');

  const missingCalibrationTemperature = await execute({
    calculation: 'gravity_temperature_correction',
    measured_gravity: 1.050,
    sample_temperature_c: 65,
    gravity_temperature_method: 'manual',
    manual_gravity_correction_sg: 0.001,
  });
  assert(missingCalibrationTemperature.isError === true, 'temperature correction requires calibration temperature');

  const pitchingDataMissing = await execute({
    calculation: 'pitching_rate',
    og: 1.050,
    water_volumes: baseVolumes,
    yeast_form: 'slurry',
  });
  includes(pitchingDataMissing.output, 'non verificata', 'pitching rate does not invent slurry data');

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    for (const failure of failures) console.error(`  ${failure}`);
    process.exitCode = 1;
  }
}

void run();
