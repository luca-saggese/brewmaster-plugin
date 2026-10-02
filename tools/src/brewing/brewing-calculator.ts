/**
 * Brewing calculator — brewing math from already-resolved process volumes.
 */

import { z } from 'zod';

import type { BuiltinTool, ExecutableToolResult, ToolExecution } from '../shim/tool-contract';
import { registerTool } from '../shim/tool-registry';
import { toInputJsonSchema } from '../shim/input-schema';

// ─── Constants ───────────────────────────────────────────────────────────────

const MALT_POTENTIAL: Record<string, number> = {
  'pilsner malt': 307, 'maris otter': 300, 'pale ale malt': 307,
  'munich malt': 290, 'vienna malt': 300, 'wheat malt': 315,
  'crystal malt 60l': 270, 'crystal malt 120l': 260,
  'chocolate malt': 230, 'black patent': 220, 'roasted barley': 210,
  'flaked oats': 275, 'flaked wheat': 300, 'flaked barley': 285,
  'fiocchi d\'orzo': 285, 'fiocchi d\'avena': 275, 'fiocchi di frumento': 300,
  'corn (flaked)': 320, 'rice (flaked)': 320,
  // Specialty / crystal malts
  'caramunich': 285, 'caramunich malt': 285,
  'caramel 300': 250, 'caramel 300 malt': 250,
  'carafa special iii': 220, 'carafa special iii malt': 220,
  'carafa speciale iii': 220,
  'carapils': 280, 'carapils malt': 280,
  'caravienne': 285, 'caravienne malt': 285,
  'carared': 275, 'carared malt': 275,
  'carahell': 290, 'carahell malt': 290,
};

const DEFAULT_RATES: Record<string, number> = { ale: 0.75, hybrid: 1.0, lager: 1.5 };
const SUCROSE_YIELD = 384;

const MISSING_WATER_VOLUMES =
  'Mancano i volumi necessari per questo calcolo. Eseguire prima water_profile_calculator e passare i risultati tramite water_volumes.';

// This points·litre model is a practical approximation, not a mass balance.
function sgToPoints(sg: number): number { return (sg - 1) * 1000; }
function pointsToSg(points: number): number { return 1 + points / 1000; }
function sgToPlato(sg: number): number {
  return -616.868 + 1111.14 * sg - 630.272 * sg * sg + 135.997 * sg * sg * sg;
}
function calculateExtractPoints(gravity: number, volume: number): number {
  return sgToPoints(gravity) * volume;
}
function calculateGravityFromExtract(extractPoints: number, volume: number): number {
  if (volume <= 0) throw new Error('Il volume deve essere maggiore di zero.');
  return pointsToSg(extractPoints / volume);
}

const FERMENTABLE_POTENTIALS: Record<string, number> = {
  sucrose: 384,
  dextrose: 370,
  dme: 370,
  lme: 300,
};

// ─── Schema ──────────────────────────────────────────────────────────────────

export const BrewingCalculatorInputSchema = z.object({
  calculation: z.enum([
    'abv', 'attenuation', 'efficiency', 'mash_efficiency', 'brewhouse_efficiency',
    'estimated_og', 'estimated_pre_boil_gravity', 'estimated_fg',
    'strike_water', 'pitching_rate', 'gravity_correction', 'dilution',
    'gravity_balance', 'boil_correction', 'gravity_temperature_correction', 'fermentation_schedule',
  ]),

  fermentation_steps: z.array(z.object({
    phase: z.string().trim().min(1),
    start_day: z.number().nonnegative(),
    end_day: z.number().nonnegative(),
    temperature_c: z.number().min(-5).max(60).optional(),
    temperature_min_c: z.number().min(-5).max(60).optional(),
    temperature_max_c: z.number().min(-5).max(60).optional(),
    note: z.string().optional(),
  })).optional().describe('Fasi fermentative esplicite. Questo calcolo le valida e ordina senza stimare tempi o temperature.'),

  og: z.number().min(0.990).max(1.300).optional(),
  fg: z.number().min(0.990).max(1.200).optional(),

  batch_size_liters: z.number().positive().max(200).optional()
    .describe('Legacy/general liquid volume. It is never used as an implicit process-volume fallback.'),

  water_volumes: z.object({
    mash_l: z.number().nonnegative().describe('Mash water volume, in the declared volume_reference.'),
    sparge_l: z.number().nonnegative().describe('Sparge water volume, in the declared volume_reference.'),
    total_water_l: z.number().nonnegative().describe('Total process water already resolved by the Water Calculator.'),
    pre_boil_l: z.number().nonnegative().describe('Wort volume immediately before boiling, in the declared volume_reference.'),
    post_boil_l: z.number().nonnegative().describe('Wort volume immediately after boiling, in the declared volume_reference.'),
    fermenter_l: z.number().nonnegative().describe('Expected wort volume transferred to the fermenter, in the declared volume_reference.'),
    packaged_l: z.number().nonnegative().optional().describe('Expected packaged beer volume, if available.'),
    volume_reference: z.enum(['hot', 'cold']).describe('Temperature reference shared by every volume in this object; no conversion is performed.'),
  }).optional().describe('Volumes already resolved by water_profile_calculator. Brewing Calculator never reconstructs missing values.'),

  grain_bill_kg: z.array(z.object({
    malt: z.string().min(1),
    kg: z.number().positive(),
    potential_pt_l_per_kg: z.number().positive().optional(),
  })).optional(),
  grain_bill: z.array(z.object({
    malt: z.string().min(1),
    kg: z.number().positive(),
    potential_pt_l_per_kg: z.number().positive().optional(),
  })).optional(),

  efficiency_type: z.enum(['mash', 'brewhouse']).optional()
    .describe('Efficiency model: mash uses pre-boil volume; brewhouse uses fermenter volume.'),
  additional_fermentables: z.array(z.object({
    name: z.string().min(1),
    kg: z.number().positive(),
    potential_pt_l_per_kg: z.number().positive(),
  })).optional().describe('Fermentables added after mash. Counted separately only for brewhouse efficiency.'),

  measured_gravity: z.number().min(0.990).max(1.300).optional(),

  mash_temp_c: z.number().min(35).max(80).optional(),
  grain_temp_c: z.number().min(-10).max(45).optional(),
  strike_mode: z.enum(['theoretical', 'calibrated']).optional(),
  strike_temperature_correction_c: z.number().min(-20).max(20).optional()
    .describe('Empirical additive correction for the installed system; no default is applied.'),
  pre_boil_gravity: z.number().min(0.990).max(1.300).optional(),
  mash_efficiency_percent: z.number().positive().max(100).optional()
    .describe('Efficienza mash percentuale. Default: 75% quando non specificata.'),
  brewhouse_efficiency_percent: z.number().positive().max(100).optional(),
  attenuation_percent: z.number().nonnegative().max(100).optional(),

  beer_type: z.enum(['ale', 'lager', 'hybrid']).optional(),
  cells_per_ml_p_required: z.number().min(0.1).max(5).optional(),
  pitching_rate_million_ml_p: z.number().positive().max(5).optional(),
  yeast_form: z.enum(['dry', 'liquid', 'slurry']).optional(),
  yeast_cell_count_billions_per_unit: z.number().positive().optional(),
  yeast_units_available: z.number().positive().optional(),
  yeast_concentration_billions_per_ml: z.number().positive().optional(),
  slurry_volume_ml: z.number().positive().optional(),
  yeast_viability_percent: z.number().gt(0).max(100).optional(),
  volume_liters: z.number().optional(),
  current_gravity: z.number().optional(),
  target_gravity: z.number().optional(),
  fermentable_type: z.enum(['sucrose', 'dextrose', 'dme', 'lme', 'custom']).optional(),
  fermentable_potential_pt_l_per_kg: z.number().positive().optional(),
  process_stage: z.enum(['pre_boil', 'post_boil', 'fermenter', 'packaging']).optional(),
  initial_volume_l: z.number().positive().optional(),
  initial_gravity: z.number().min(0.990).max(1.300).optional(),
  final_volume_l: z.number().positive().optional(),
  final_gravity: z.number().min(0.990).max(1.300).optional(),
  extract_added_pt_l: z.number().nonnegative().optional(),
  extract_removed_pt_l: z.number().nonnegative().optional(),
  measured_pre_boil_l: z.number().positive().optional(),
  measured_pre_boil_gravity: z.number().min(0.990).max(1.300).optional(),
  target_og: z.number().min(0.990).max(1.300).optional(),
  target_post_boil_l: z.number().positive().optional(),
  boil_off_l_per_hour: z.number().positive().optional(),
  max_boil_duration_h: z.number().positive().optional(),
  correction_fermentable_type: z.enum(['sucrose', 'dextrose', 'dme', 'lme', 'custom']).optional(),
  correction_fermentable_potential_pt_l_per_kg: z.number().positive().optional(),
  sample_temperature_c: z.number().min(-20).max(120).optional(),
  hydrometer_calibration_temperature_c: z.number().min(-20).max(120).optional(),
  gravity_temperature_method: z.enum(['none', 'manual']).optional(),
  manual_gravity_correction_sg: z.number().optional(),
}).superRefine((data, ctx) => {
  if (data.calculation !== 'fermentation_schedule') return;
  if (!data.fermentation_steps?.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fermentation_steps'], message: 'Specificare almeno una fase fermentativa.' });
    return;
  }
  data.fermentation_steps.forEach((step, index) => {
    if (step.end_day < step.start_day) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fermentation_steps', index, 'end_day'], message: 'end_day non può precedere start_day.' });
    const singleTemperature = step.temperature_c !== undefined;
    const temperatureRange = step.temperature_min_c !== undefined && step.temperature_max_c !== undefined;
    if (!singleTemperature && !temperatureRange) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fermentation_steps', index], message: 'Specificare temperature_c oppure temperature_min_c e temperature_max_c.' });
    if (step.temperature_min_c !== undefined && step.temperature_max_c !== undefined && step.temperature_max_c < step.temperature_min_c) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fermentation_steps', index, 'temperature_max_c'], message: 'temperature_max_c non può essere inferiore a temperature_min_c.' });
    }
  });
});

export type BrewingCalculatorInput = z.infer<typeof BrewingCalculatorInputSchema>;

type StructuredValue = string | number | boolean | null | StructuredValue[] | { [key: string]: StructuredValue };

// ─── Tool implementation ─────────────────────────────────────────────────────

export class BrewingCalculatorTool implements BuiltinTool<BrewingCalculatorInput> {
  readonly name = 'brewing_calculator' as const;
  readonly description =
    'Calculate brewing parameters from resolved process volumes: ABV, attenuation, mash and brewhouse efficiency, estimated gravities, strike temperature, pitching rates, gravity corrections, dilution, gravity balance, and boil corrections. ' +
    'Water volumes must be supplied through water_volumes from water_profile_calculator; this tool does not calculate or rebalance them.';
  readonly parameters: Record<string, unknown> = toInputJsonSchema(BrewingCalculatorInputSchema);

  resolveExecution(args: BrewingCalculatorInput): ToolExecution {
    return {
      description: `Brewing calculation: ${args.calculation}`,
      approvalRule: this.name,
      execute: () => this.execute(args),
    };
  }

  private execute(args: BrewingCalculatorInput): Promise<ExecutableToolResult> {
    try {
      let result: ExecutableToolResult;
      switch (args.calculation) {
        case 'abv': result = this.calcAbv(args); break;
        case 'attenuation': result = this.calcAttenuation(args); break;
        case 'efficiency': result = this.calcEfficiency(args); break;
        case 'mash_efficiency': result = this.calcMashEfficiency(args); break;
        case 'brewhouse_efficiency': result = this.calcBrewhouseEfficiency(args); break;
        case 'estimated_og': result = this.calcEstimatedOg(args); break;
        case 'estimated_pre_boil_gravity': result = this.calcEstimatedPreBoilGravity(args); break;
        case 'estimated_fg': result = this.calcEstimatedFg(args); break;
        case 'strike_water': result = this.calcStrikeWater(args); break;
        case 'pitching_rate': result = this.calcPitchingRate(args); break;
        case 'gravity_correction': result = this.calcGravityCorrection(args); break;
        case 'dilution': result = this.calcDilution(args); break;
        case 'gravity_balance': result = this.calcGravityBalance(args); break;
        case 'boil_correction': result = this.calcBoilCorrection(args); break;
        case 'gravity_temperature_correction': result = this.calcGravityTemperatureCorrection(args); break;
        case 'fermentation_schedule': result = this.calcFermentationSchedule(args); break;
      }
      return Promise.resolve(this.asStructuredResult(args.calculation, result));
    } catch (error) {
      return Promise.resolve(this.structuredError(args.calculation, error instanceof Error ? error.message : String(error)));
    }
  }

  private asStructuredResult(calculation: BrewingCalculatorInput['calculation'], result: ExecutableToolResult): ExecutableToolResult {
    let parsed: unknown;
    try { parsed = JSON.parse(result.output); } catch { parsed = undefined; }
    if (parsed !== undefined && typeof parsed === 'object' && parsed !== null) return result;
    const payload = {
      tool: 'brewing_calculator',
      calculation,
      ok: result.isError !== true,
      result: result.isError === true ? null : { message: result.output },
      summary: result.output,
      errors: result.isError === true ? [result.output] : [],
    } satisfies { tool: string; calculation: string; ok: boolean; result: StructuredValue | null; summary: string; errors: string[] };
    return { isError: result.isError === true ? true : undefined, output: JSON.stringify(payload) };
  }

  private structuredError(calculation: BrewingCalculatorInput['calculation'], message: string): ExecutableToolResult {
    return {
      isError: true,
      output: JSON.stringify({ tool: 'brewing_calculator', calculation, ok: false, result: null, summary: message, errors: [message] }),
    };
  }

  private structuredSuccess(
    calculation: BrewingCalculatorInput['calculation'],
    result: Record<string, StructuredValue>,
    summary: string,
    warnings: string[] = [],
  ): ExecutableToolResult {
    return {
      output: JSON.stringify({
        tool: 'brewing_calculator', calculation, ok: true, result, summary,
        warnings, errors: [],
      }),
    };
  }

  // ─── ABV ──────────────────────────────────────────────────────────────────

  private calcAbv(args: BrewingCalculatorInput): ExecutableToolResult {
    const og = this.req(args.og, 'og');
    const fg = this.req(args.fg, 'fg');
    if (!Number.isFinite(og) || !Number.isFinite(fg) || og <= 1 || fg < 0.990 || og <= fg) {
      return { isError: true, output: 'Valori non fisici: per una birra fermentata servono OG > FG, OG > 1.000 e densità finite.' };
    }
    const abv = (og - fg) * 131.25;
    const summary = `ABV (formula semplificata) = (OG ${og.toFixed(3)} − FG ${fg.toFixed(3)}) × 131.25 = **${abv.toFixed(3)}% vol**`;
    return this.structuredSuccess('abv', { og, fg, abv_percent: abv, formula: 'abv = (og - fg) × 131.25' }, summary);
  }

  // ─── Attenuation ──────────────────────────────────────────────────────────

  private calcAttenuation(args: BrewingCalculatorInput): ExecutableToolResult {
    const og = this.req(args.og, 'og');
    const fg = this.req(args.fg, 'fg');
    if (!Number.isFinite(og) || !Number.isFinite(fg) || og <= fg || og <= 1 || fg < 0.990) {
      return { isError: true, output: 'Valori non fisici: servono OG > FG e OG > 1.000.' };
    }
    const attenuation = (og - fg) / (og - 1.0) * 100;
    const summary = `Attenuazione apparente (formula semplificata) = [(${og.toFixed(3)} − ${fg.toFixed(3)}) / (${og.toFixed(3)} − 1.000)] × 100 = **${attenuation.toFixed(1)}%**`;
    return this.structuredSuccess('attenuation', { og, fg, attenuation_percent: attenuation, formula: 'attenuation = (og - fg) / (og - 1) × 100' }, summary);
  }

  private calcEfficiency(args: BrewingCalculatorInput): ExecutableToolResult {
    const efficiencyType = this.req(args.efficiency_type, 'efficiency_type');
    const measuredGravity = this.req(args.measured_gravity, 'measured_gravity');
    const volumeField = efficiencyType === 'mash' ? 'pre_boil_l' : 'fermenter_l';
    const volume = this.requireWaterVolume(args, volumeField);
    const grainBill = this.req(args.grain_bill_kg ?? args.grain_bill, 'grain_bill');
    let theoreticalGrainPtL = 0;

    for (const ingredient of grainBill) {
      const key = ingredient.malt.toLowerCase().trim();
      const potential = ingredient.potential_pt_l_per_kg
        ?? MALT_POTENTIAL[key]
        ?? MALT_POTENTIAL[key + ' malt'];
      if (potential === undefined) {
        return {
          isError: true,
          output: `Potenziale mancante per "${ingredient.malt}". Specificare potential_pt_l_per_kg; non è possibile classificare automaticamente miscele commerciali o malti non riconosciuti.`,
        };
      }
      theoreticalGrainPtL += ingredient.kg * potential;
    }

    const measuredPtL = (measuredGravity - 1) * 1000 * volume;
    const additionalPtL = efficiencyType === 'brewhouse'
      ? (args.additional_fermentables ?? []).reduce(
        (total, fermentable) => total + fermentable.kg * fermentable.potential_pt_l_per_kg,
        0,
      )
      : 0;
    const gristMeasuredPtL = measuredPtL - additionalPtL;
    const efficiency = (gristMeasuredPtL / theoreticalGrainPtL) * 100;

    const summary = [
        `Tipo di efficienza: **${efficiencyType}**`,
        `Volume utilizzato: **${volume.toFixed(1)} L** (${volumeField})`,
        `Densità utilizzata: **${measuredGravity.toFixed(3)}**`,
        `Potenziale teorico del grist: **${theoreticalGrainPtL.toFixed(0)} punti·L**`,
        `Punti·litro effettivamente ottenuti: **${measuredPtL.toFixed(0)} punti·L**`,
        efficiencyType === 'brewhouse'
          ? `  Estratto da aggiunte post-mash: ${additionalPtL.toFixed(0)} punti·L; estratto attribuito al grist: ${gristMeasuredPtL.toFixed(0)} punti·L`
          : '  Aggiunte fermentabili successive al mash escluse dal calcolo mash.',
        `Efficienza calcolata: **${efficiency.toFixed(2)}%**`,
      ].join('\n');
    return this.structuredSuccess('efficiency', {
      efficiency_type: efficiencyType, volume_l: volume, measured_gravity: measuredGravity,
      theoretical_grist_pt_l: theoreticalGrainPtL, measured_pt_l: measuredPtL,
      additional_fermentables_pt_l: additionalPtL, grist_measured_pt_l: gristMeasuredPtL,
      efficiency_percent: efficiency,
    }, summary);
  }

  // ─── Efficiency and estimated gravities ──────────────────────────────────

  private calcMashEfficiency(args: BrewingCalculatorInput): ExecutableToolResult {
    const preBoilGravity = this.req(args.pre_boil_gravity ?? args.measured_gravity, 'pre_boil_gravity');
    const preBoilVolume = this.requireWaterVolume(args, 'pre_boil_l');
    return this.efficiencyResult('Efficienza mash', preBoilGravity, preBoilVolume, args);
  }

  private calcBrewhouseEfficiency(args: BrewingCalculatorInput): ExecutableToolResult {
    const og = this.req(args.og, 'og');
    const fermenterVolume = this.requireWaterVolume(args, 'fermenter_l');
    return this.efficiencyResult('Efficienza brewhouse', og, fermenterVolume, args);
  }

  private efficiencyResult(label: string, gravity: number, volume: number, args: BrewingCalculatorInput): ExecutableToolResult {
    const theoreticalPtL = this.theoreticalPoints(args);
    const measuredPtL = (gravity - 1) * 1000 * volume;
    const efficiency = (measuredPtL / theoreticalPtL) * 100;
    const summary = [
        `${label} = **${efficiency.toFixed(1)}%**`,
        `  Densità: ${gravity.toFixed(3)}; volume: ${volume.toFixed(1)} L`,
        `  Punti teorici: ${theoreticalPtL.toFixed(0)} punti·L`,
        `  Punti misurati: ${measuredPtL.toFixed(0)} punti·L`,
      ].join('\n');
    const calculation = label === 'Efficienza mash' ? 'mash_efficiency' : 'brewhouse_efficiency';
    return this.structuredSuccess(calculation, {
      efficiency_percent: efficiency, measured_gravity: gravity, volume_l: volume,
      theoretical_pt_l: theoreticalPtL, measured_pt_l: measuredPtL,
    }, summary);
  }

  private calcEstimatedOg(args: BrewingCalculatorInput): ExecutableToolResult {
    const postBoilVolume = this.requireWaterVolume(args, 'post_boil_l');
    const preBoilGravity = args.pre_boil_gravity ?? args.measured_pre_boil_gravity;
    if (preBoilGravity !== undefined) {
      const preBoilVolume = this.requireWaterVolume(args, 'pre_boil_l');
      const preBoilExtract = calculateExtractPoints(preBoilGravity, preBoilVolume);
      const added = (args.additional_fermentables ?? []).reduce(
        (total, fermentable) => total + fermentable.kg * fermentable.potential_pt_l_per_kg,
        0,
      );
      const gravity = calculateGravityFromExtract(preBoilExtract + added, postBoilVolume);
      const summary = [
          `OG prevista da densità pre-boil (non misurazione reale): **${gravity.toFixed(3)}**`,
          `  Volume utilizzato: ${postBoilVolume.toFixed(2)} L post-boil; pre-boil ${preBoilVolume.toFixed(2)} L a ${preBoilGravity.toFixed(3)}`,
          `  Punti·litro pre-boil: ${preBoilExtract.toFixed(2)}; aggiunte successive: ${added.toFixed(2)} punti·L`,
        ].join('\n');
      return this.structuredSuccess('estimated_og', {
        estimated_og: gravity, pre_boil_gravity: preBoilGravity, pre_boil_volume_l: preBoilVolume,
        post_boil_volume_l: postBoilVolume, pre_boil_extract_pt_l: preBoilExtract,
        additional_fermentables_pt_l: added, model: 'points_litre',
      }, summary);
    }

    const volumeMode = args.brewhouse_efficiency_percent !== undefined ? 'brewhouse' : 'mash';
    const efficiency = volumeMode === 'brewhouse'
      ? this.req(args.brewhouse_efficiency_percent, 'brewhouse_efficiency_percent')
      : args.mash_efficiency_percent ?? 75;
    const volume = volumeMode === 'brewhouse'
      ? this.requireWaterVolume(args, 'fermenter_l')
      : this.requireWaterVolume(args, 'post_boil_l');
    const theoretical = this.theoreticalPoints(args);
    const added = (args.additional_fermentables ?? []).reduce(
      (total, fermentable) => total + fermentable.kg * fermentable.potential_pt_l_per_kg,
      0,
    );
    const extract = theoretical * efficiency / 100 + added;
    const gravity = calculateGravityFromExtract(extract, volume);
    const summary = [
        `OG prevista da grist ed efficienza (non misurazione reale): **${gravity.toFixed(3)}**`,
        `  Metodo: ${volumeMode}; efficienza utilizzata: ${efficiency.toFixed(2)}%`,
        `  Volume utilizzato: ${volume.toFixed(2)} L; potenziale teorico grist: ${theoretical.toFixed(2)} punti·L`,
        `  Aggiunte fermentabili: ${added.toFixed(2)} punti·L`,
      ].join('\n');
    return this.structuredSuccess('estimated_og', {
      estimated_og: gravity, volume_l: volume, efficiency_type: volumeMode,
      efficiency_percent: efficiency, theoretical_grist_pt_l: theoretical,
      additional_fermentables_pt_l: added, model: 'points_litre',
    }, summary);
  }

  private calcEstimatedPreBoilGravity(args: BrewingCalculatorInput): ExecutableToolResult {
    const efficiency = args.mash_efficiency_percent ?? 75;
    const volume = this.requireWaterVolume(args, 'pre_boil_l');
    const theoretical = this.theoreticalPoints(args);
    const added = (args.additional_fermentables ?? []).reduce(
      (total, fermentable) => total + fermentable.kg * fermentable.potential_pt_l_per_kg,
      0,
    );
    const extract = theoretical * efficiency / 100 + added;
    const gravity = calculateGravityFromExtract(extract, volume);
    const summary = [
        `Densità pre-boil stimata (modello punti·litro) = **${gravity.toFixed(3)}**`,
        `  Potenziale teorico grist: ${theoretical.toFixed(2)} punti·L`,
        `  Efficienza mash utilizzata: ${efficiency.toFixed(2)}%`,
        `  Punti·litro previsti: ${extract.toFixed(2)}; volume pre-boil: ${volume.toFixed(2)} L`,
      ].join('\n');
    return this.structuredSuccess('estimated_pre_boil_gravity', {
      estimated_pre_boil_gravity: gravity, volume_l: volume,
      mash_efficiency_percent: efficiency, theoretical_grist_pt_l: theoretical,
      predicted_extract_pt_l: extract, model: 'points_litre',
    }, summary);
  }

  private calcEstimatedFg(args: BrewingCalculatorInput): ExecutableToolResult {
    const og = this.req(args.og, 'og');
    const attenuation = this.req(args.attenuation_percent, 'attenuation_percent');
    if (og <= 1 || attenuation < 0 || attenuation > 100) {
      return { isError: true, output: 'OG o attenuazione non fisica.' };
    }
    const fg = 1 + (og - 1) * (1 - attenuation / 100);
    const abv = (og - fg) * 131.25;
    const summary = `FG stimata = **${fg.toFixed(3)}** (OG ${og.toFixed(3)}, attenuazione prevista ${attenuation.toFixed(1)}%; ABV teorico ${abv.toFixed(2)}%)`;
    return this.structuredSuccess('estimated_fg', { og, attenuation_percent: attenuation, fg, abv_percent: abv }, summary);
  }

  // ─── Strike Water ─────────────────────────────────────────────────────────

  private calcStrikeWater(args: BrewingCalculatorInput): ExecutableToolResult {
    const mashTemp = this.req(args.mash_temp_c, 'mash_temp_c');
    const grainTemp = this.req(args.grain_temp_c, 'grain_temp_c');
    const mashVolume = this.requireWaterVolume(args, 'mash_l');
    const grainKg = this.sumKg(this.req(args.grain_bill_kg ?? args.grain_bill, 'grain_bill'));
    if (grainKg <= 0) return { isError: true, output: 'grain_bill required.' };
    const correction = args.strike_mode === 'calibrated'
      ? this.req(args.strike_temperature_correction_c, 'strike_temperature_correction_c')
      : args.strike_temperature_correction_c ?? 0;
    const strikeTemp = mashTemp + (0.41 * grainKg / mashVolume) * (mashTemp - grainTemp) + correction;
    const summary = `Temperatura strike water = **${strikeTemp.toFixed(1)}°C** (modello ${args.strike_mode ?? 'theoretical'}, ${mashVolume.toFixed(2)} L mash, ${grainKg.toFixed(2)} kg grani, correzione ${correction >= 0 ? '+' : ''}${correction.toFixed(1)}°C)`;
    return this.structuredSuccess('strike_water', {
      strike_temperature_c: strikeTemp, mash_temperature_c: mashTemp, grain_temperature_c: grainTemp,
      mash_volume_l: mashVolume, grain_kg: grainKg, correction_c: correction,
      model: args.strike_mode ?? 'theoretical',
    }, summary);
  }

  // ─── Pitching Rate ────────────────────────────────────────────────────────

  private calcPitchingRate(args: BrewingCalculatorInput): ExecutableToolResult {
    const batchLiters = this.requireWaterVolume(args, 'fermenter_l');
    const og = this.req(args.og, 'og');
    if (og <= 1 || !Number.isFinite(og)) return { isError: true, output: 'OG non fisica per il pitching rate.' };
    const beerType = args.beer_type ?? 'ale';
    const cells = args.pitching_rate_million_ml_p ?? args.cells_per_ml_p_required ?? DEFAULT_RATES[beerType] ?? 0.75;
    const plato = sgToPlato(og);
    const viability = args.yeast_viability_percent;
    const requiredBillions = batchLiters * plato * cells;
    const yeastForm = args.yeast_form;
    const details: string[] = [];
    if (yeastForm === 'slurry') {
      if (args.yeast_concentration_billions_per_ml == null || viability == null) {
        details.push('Quantità di slurry non verificata: servono concentrazione cellulare e vitalità.');
      } else {
        const requiredMl = requiredBillions / (args.yeast_concentration_billions_per_ml * viability / 100);
        details.push(`Slurry necessario: **${requiredMl.toFixed(1)} ml** (${args.yeast_concentration_billions_per_ml} miliardi/ml, vitalità ${viability}%)`);
        if (args.slurry_volume_ml != null) details.push(`Slurry disponibile: ${args.slurry_volume_ml.toFixed(1)} ml`);
      }
    } else if ((yeastForm === 'dry' || yeastForm === 'liquid')
      && args.yeast_cell_count_billions_per_unit != null
      && args.yeast_units_available != null
      && viability != null) {
      const available = args.yeast_cell_count_billions_per_unit * args.yeast_units_available * viability / 100;
      details.push(`Cellule vitali disponibili dichiarate: **${available.toFixed(0)} miliardi**`);
      details.push(available >= requiredBillions ? 'Quantità dichiarata sufficiente.' : 'Quantità dichiarata insufficiente.');
    } else {
      details.push('Quantità di lievito disponibile non verificata: servono forma, contenuto cellulare, unità e vitalità.');
    }
    const summary = [
        `Pitching rate: ${cells.toFixed(2)} M cellule/mL/°P (${beerType})`,
        `Mosto: ${batchLiters.toFixed(1)} L a ${plato.toFixed(1)}°P`,
        `Fabbisogno di cellule vitali: **${requiredBillions.toFixed(0)} miliardi**`,
        yeastForm ? `Forma lievito: ${yeastForm}` : 'Forma lievito: non specificata',
        ...details,
      ].join('\n');
    return this.structuredSuccess('pitching_rate', {
      volume_l: batchLiters, og, plato, pitching_rate_million_ml_p: cells,
      required_cells_billions: requiredBillions, yeast_form: yeastForm ?? null,
      details,
    }, summary);
  }

  // ─── Gravity Correction (OG adjustment with sugar) ────────────────────────

  private calcGravityCorrection(args: BrewingCalculatorInput): ExecutableToolResult {
    const current = this.req(args.current_gravity, 'current_gravity');
    const target = this.req(args.target_gravity, 'target_gravity');
    const volume = this.req(args.volume_liters, 'volume_liters');
    if (volume <= 0 || current <= 0 || target <= 0 || target <= current) {
      return { isError: true, output: 'Servono volume positivo e densità target maggiore della densità corrente.' };
    }
    const type = args.fermentable_type ?? 'sucrose';
    const potential = args.fermentable_potential_pt_l_per_kg
      ?? (type === 'custom' ? undefined : FERMENTABLE_POTENTIALS[type]);
    if (potential == null) return { isError: true, output: 'Specificare fermentable_potential_pt_l_per_kg per un fermentabile custom.' };
    const missingPtL = calculateExtractPoints(target, volume) - calculateExtractPoints(current, volume);
    const ingredientKg = missingPtL / potential;
    const summary = [
        `Correzione densità teorica approssimata: aggiungi **${ingredientKg.toFixed(3)} kg** di ${type}`,
        `  Da ${current.toFixed(3)} a ${target.toFixed(3)} — ${volume.toFixed(1)} L`,
        `  Punti·litro mancanti: ${missingPtL.toFixed(2)}; potenziale utilizzato: ${potential.toFixed(2)} punti·L/kg`,
        args.process_stage === 'pre_boil' ? '  Nota: densità pre-boil; verificare la concentrazione prevista alla fine della bollitura.' : '  Nota: quantità teorica; valutare impatto su corpo e fermentabilità.',
      ].join('\n');
    return this.structuredSuccess('gravity_correction', {
      current_gravity: current, target_gravity: target, volume_l: volume,
      fermentable_type: type, potential_pt_l_per_kg: potential, missing_extract_pt_l: missingPtL,
      fermentable_kg: ingredientKg, approximate: true, process_stage: args.process_stage ?? null,
    }, summary);
  }

  // ─── Dilution ─────────────────────────────────────────────────────────────

  private calcDilution(args: BrewingCalculatorInput): ExecutableToolResult {
    const volume = this.req(args.volume_liters, 'volume_liters');
    const curr = this.req(args.current_gravity, 'current_gravity');
    const target = this.req(args.target_gravity, 'target_gravity');
    if (volume <= 0 || curr <= 1 || target <= 1 || curr <= target) {
      return { isError: true, output: 'Servono volume positivo, densità sopra 1.000 e densità corrente maggiore del target.' };
    }
    const dilution = volume * ((curr - 1) / (target - 1) - 1);
    if (!Number.isFinite(dilution) || dilution < 0) return { isError: true, output: 'Diluizione indeterminata per i valori forniti.' };
    const finalVolume = volume + dilution;
    const summary = `Diluizione (${args.process_stage ?? 'fase non specificata'}): aggiungi **${dilution.toFixed(2)} L** di acqua idonea per diluire da ${curr.toFixed(3)} a ${target.toFixed(3)} (volume finale: ${finalVolume.toFixed(2)} L)`;
    return this.structuredSuccess('dilution', {
      current_gravity: curr, target_gravity: target, volume_l: volume,
      water_to_add_l: dilution, final_volume_l: finalVolume, process_stage: args.process_stage ?? null,
    }, summary);
  }

  private calcGravityBalance(args: BrewingCalculatorInput): ExecutableToolResult {
    const initialVolume = this.req(args.initial_volume_l, 'initial_volume_l');
    const initialGravity = this.req(args.initial_gravity, 'initial_gravity');
    const finalVolume = this.req(args.final_volume_l, 'final_volume_l');
    const finalGravity = this.req(args.final_gravity, 'final_gravity');
    const initialPoints = calculateExtractPoints(initialGravity, initialVolume);
    const finalPoints = calculateExtractPoints(finalGravity, finalVolume);
    const added = args.extract_added_pt_l ?? 0;
    const removed = args.extract_removed_pt_l ?? 0;
    const difference = finalPoints - initialPoints - added + removed;
    const percent = initialPoints !== 0 ? difference / initialPoints * 100 : 0;
    const summary = [
        'Bilancio punti·litro (approssimazione pratica, non bilancio di massa):',
        `  Iniziale: ${initialPoints.toFixed(2)} punti·L (${initialGravity.toFixed(3)} × ${initialVolume.toFixed(2)} L)`,
        `  Finale: ${finalPoints.toFixed(2)} punti·L (${finalGravity.toFixed(3)} × ${finalVolume.toFixed(2)} L)`,
        `  Aggiunti: ${added.toFixed(2)}; rimossi: ${removed.toFixed(2)} punti·L`,
        `  Differenza non spiegata: ${difference.toFixed(2)} punti·L (${percent.toFixed(2)}%)`,
        Math.abs(percent) > 5 ? '  ⚠ Verificare temperatura, omogeneità e precisione delle misurazioni.' : '  Scostamento entro la soglia pratica del 5%.',
      ].join('\n');
    return this.structuredSuccess('gravity_balance', {
      initial_volume_l: initialVolume, initial_gravity: initialGravity, initial_extract_pt_l: initialPoints,
      final_volume_l: finalVolume, final_gravity: finalGravity, final_extract_pt_l: finalPoints,
      extract_added_pt_l: added, extract_removed_pt_l: removed,
      unexplained_difference_pt_l: difference, unexplained_difference_percent: percent,
      approximation: 'points_litre',
    }, summary, Math.abs(percent) > 5 ? ['Verificare temperatura, omogeneità e precisione delle misurazioni.'] : []);
  }

  private calcBoilCorrection(args: BrewingCalculatorInput): ExecutableToolResult {
    const preVolume = this.req(args.measured_pre_boil_l, 'measured_pre_boil_l');
    const preGravity = this.req(args.measured_pre_boil_gravity, 'measured_pre_boil_gravity');
    const targetOg = this.req(args.target_og, 'target_og');
    const targetVolume = this.req(args.target_post_boil_l, 'target_post_boil_l');
    if (preGravity <= 1 || targetOg <= 1) return { isError: true, output: 'Le densità pre-boil e target devono essere maggiori di 1.000.' };
    if (targetVolume > preVolume) return { isError: true, output: 'Il volume post-boil target non può essere maggiore del volume pre-boil misurato.' };
    const availableExtract = calculateExtractPoints(preGravity, preVolume);
    const projectedGravity = calculateGravityFromExtract(availableExtract, targetVolume);
    const targetExtract = calculateExtractPoints(targetOg, targetVolume);
    const volumeForTarget = targetExtract > 0 ? availableExtract / sgToPoints(targetOg) : 0;
    const rate = args.boil_off_l_per_hour;
    const boilHours = rate == null || volumeForTarget >= preVolume ? undefined : (preVolume - volumeForTarget) / rate;
    const fermentableType = args.correction_fermentable_type ?? 'sucrose';
    const potential = args.correction_fermentable_potential_pt_l_per_kg
      ?? (fermentableType === 'custom' ? undefined : FERMENTABLE_POTENTIALS[fermentableType]);
    const neededKg = targetExtract > availableExtract && potential != null
      ? (targetExtract - availableExtract) / potential
      : 0;
    const correctionLine = targetExtract > availableExtract
      ? potential == null
        ? `Fermentabile necessario: specificare il potenziale di ${fermentableType}.`
        : `Fermentabile necessario per mantenere volume e OG: **${neededKg.toFixed(3)} kg** di ${fermentableType}`
      : 'Nessuna correzione degli estratti necessaria.';
    const durationWarning = boilHours != null && args.max_boil_duration_h != null && boilHours > args.max_boil_duration_h
      ? ' ⚠ Il tempo supera il limite massimo dichiarato.'
      : '';
    const summary = [
        `Estratto disponibile: ${availableExtract.toFixed(2)} punti·L`,
        `SG prevista a ${targetVolume.toFixed(2)} L senza aggiunte: **${projectedGravity.toFixed(3)}**`,
        `Volume necessario per OG ${targetOg.toFixed(3)} senza aggiunte: **${volumeForTarget.toFixed(2)} L**`,
        boilHours == null
          ? 'Tempo di bollitura aggiuntivo: non determinabile senza evaporazione oraria o il target richiede diluizione.'
          : `Tempo teorico per concentrare: **${(boilHours * 60).toFixed(0)} minuti (${boilHours.toFixed(2)} h)**${durationWarning}`,
        correctionLine,
        'Alternative: proseguire la bollitura, diluire o aggiungere fermentabili; non sono equivalenti per corpo, colore, luppolatura ed esposizione termica.',
      ].join('\n');
    return this.structuredSuccess('boil_correction', {
      measured_pre_boil_l: preVolume, measured_pre_boil_gravity: preGravity,
      available_extract_pt_l: availableExtract, target_post_boil_l: targetVolume,
      projected_gravity: projectedGravity, target_og: targetOg,
      target_volume_for_og_l: volumeForTarget, boil_duration_h: boilHours ?? null,
      boil_duration_minutes: boilHours == null ? null : boilHours * 60,
      fermentable_type: fermentableType, fermentable_kg: neededKg,
      extract_correction_needed: targetExtract > availableExtract,
    }, summary, durationWarning ? [durationWarning.trim()] : []);
  }

  private calcGravityTemperatureCorrection(args: BrewingCalculatorInput): ExecutableToolResult {
    const sg = this.req(args.measured_gravity, 'measured_gravity');
    const sampleTemperature = this.req(args.sample_temperature_c, 'sample_temperature_c');
    const calibrationTemperature = this.req(args.hydrometer_calibration_temperature_c, 'hydrometer_calibration_temperature_c');
    const method = this.req(args.gravity_temperature_method, 'gravity_temperature_method');
    if (method === 'none') {
      const summary = `SG rilevata: **${sg.toFixed(3)}**; nessuna correzione applicata. Raffreddare il campione prima della misura per ridurre l'incertezza.`;
      return this.structuredSuccess('gravity_temperature_correction', {
        measured_gravity: sg, sample_temperature_c: sampleTemperature,
        calibration_temperature_c: calibrationTemperature, method, corrected_gravity: sg,
        correction_sg: 0,
      }, summary, ['Raffreddare il campione prima della misura.']);
    }
    const correction = this.req(args.manual_gravity_correction_sg, 'manual_gravity_correction_sg');
    const corrected = sg + correction;
    const summary = `SG corretta con offset manuale: **${corrected.toFixed(3)}** (lettura ${sg.toFixed(3)}, campione ${sampleTemperature.toFixed(1)}°C, calibrazione ${calibrationTemperature.toFixed(1)}°C). Non è una conversione SG/°Plato; usare un modello verificato o raffreddare il campione.`;
    return this.structuredSuccess('gravity_temperature_correction', {
      measured_gravity: sg, sample_temperature_c: sampleTemperature,
      calibration_temperature_c: calibrationTemperature, method, correction_sg: correction,
      corrected_gravity: corrected,
    }, summary, ['Offset manuale: non è una conversione automatica SG/°Plato.']);
  }

  private calcFermentationSchedule(args: BrewingCalculatorInput): ExecutableToolResult {
    const steps = this.req(args.fermentation_steps, 'fermentation_steps')
      .map(step => ({ ...step }))
      .sort((a, b) => a.start_day - b.start_day || a.end_day - b.end_day);
    const schedule = steps.map(step => ({
      phase: step.phase,
      start_day: step.start_day,
      end_day: step.end_day,
      duration_days: step.end_day - step.start_day,
      temperature_c: step.temperature_c ?? null,
      temperature_min_c: step.temperature_min_c ?? null,
      temperature_max_c: step.temperature_max_c ?? null,
      note: step.note ?? null,
    }));
    const startDay = Math.min(...steps.map(step => step.start_day));
    const endDay = Math.max(...steps.map(step => step.end_day));
    const summary = `Pianificazione fermentativa: ${schedule.length} fasi dichiarate, giorni ${startDay}-${endDay} (${endDay - startDay} giorni di intervallo). Temperature mantenute come specificate; nessuna fase è stata stimata.`;
    return this.structuredSuccess('fermentation_schedule', {
      steps: schedule,
      phase_count: schedule.length,
      start_day: startDay,
      end_day: endDay,
      schedule_span_days: endDay - startDay,
    }, summary);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private requireWaterVolumes(args: BrewingCalculatorInput): NonNullable<BrewingCalculatorInput['water_volumes']> {
    if (args.water_volumes == null) throw new Error(MISSING_WATER_VOLUMES);
    return args.water_volumes;
  }

  private requireWaterVolume(
    args: BrewingCalculatorInput,
    field: keyof NonNullable<BrewingCalculatorInput['water_volumes']>,
  ): number {
    const volumes = this.requireWaterVolumes(args);
    const value = volumes[field];
    if (typeof value !== 'number' || value <= 0) {
      throw new Error(`Il volume water_volumes.${field} deve essere maggiore di zero per questo calcolo.`);
    }
    return value;
  }

  private theoreticalPoints(args: BrewingCalculatorInput): number {
    const grainBill = this.req(args.grain_bill_kg ?? args.grain_bill, 'grain_bill');
    let theoreticalPtL = 0;
    for (const { malt, kg } of grainBill) {
      const key = malt.toLowerCase();
      const potential = MALT_POTENTIAL[key] ?? MALT_POTENTIAL[key + ' malt'] ?? this.lookupPotential(key);
      if (potential === undefined) throw new Error(`Potenziale sconosciuto per "${malt}".`);
      theoreticalPtL += kg * potential;
    }
    if (theoreticalPtL <= 0) throw new Error('grain_bill required.');
    return theoreticalPtL;
  }

  private sumKg(bill: BrewingCalculatorInput['grain_bill_kg'] | BrewingCalculatorInput['grain_bill']): number {
    if (!bill) return 0;
    let t = 0;
    for (const g of bill) t += g.kg;
    return t;
  }

  /** Fuzzy match a malt name against known potentials. */
  private lookupPotential(name: string): number | undefined {
    // Strip common suffixes, try partial matches
    const n = name.toLowerCase().replace(/ malt$/, '').replace(/^-/, '');
    for (const [key, val] of Object.entries(MALT_POTENTIAL)) {
      const k = key.replace(/ malt$/, '');
      if (k === n || key.includes(n) || n.includes(k)) return val;
    }
    return undefined;
  }

  private req<T>(v: T | undefined, name: string): T {
    if (v == null) throw new Error(`Missing: ${name}`);
    return v;
  }

  private toPlato(sg: number): number {
    return -616.868 + 1111.14 * sg - 630.272 * sg * sg + 135.997 * sg * sg * sg;
  }
}

registerTool(BrewingCalculatorTool);
