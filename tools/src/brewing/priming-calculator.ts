/**
 * Priming calculator — compute sugar dosage for natural carbonation.
 */

import { z } from 'zod';

import type { BuiltinTool, ExecutableToolResult, ToolExecution } from '../shim/tool-contract';
import { registerTool } from '../shim/tool-registry';
import { toInputJsonSchema } from '../shim/input-schema';

export const PrimingCalculatorInputSchema = z.object({
  packaging_volume_l: z.number().positive().optional().describe('Liters actually destined for packaging.'),
  batch_size_liters: z.number().positive().optional().describe('Deprecated alias for packaging_volume_l; never a recipe batch fallback.'),
  max_fermentation_temperature_c: z.number().min(0).max(45).optional().describe('Reference fermentation temperature for residual CO2 estimation.'),
  beer_temperature_at_packaging_c: z.number().min(0).max(45).optional().describe('Informational packaging temperature; not used for automatic residual CO2 estimation.'),
  residual_co2_volumes: z.number().min(0).max(6).optional().describe('Explicit measured or estimated residual CO2 override.'),
  fermentation_pressurized: z.boolean().default(false),
  co2_residual_method: z.enum(['temperature_estimate', 'explicit']).default('temperature_estimate'),
  target_co2_volumes: z.number().optional().describe('Target CO2 volumes.'),
  beer_style: z.string().optional().describe('Beer style for default carbonation.'),
  sugar_type: z.enum(['sucrose', 'dextrose', 'dme', 'honey', 'maple_syrup']).default('sucrose'),
  packaging: z.enum(['bottle_priming', 'keg_natural', 'bottle', 'keg']).default('bottle_priming'),
  fermentable_coefficient_g_per_l_per_volume: z.number().min(1).max(15).optional()
    .describe('Effective fermentable yield in g/L/vol CO2; overrides the reference coefficient.'),
  fermentable_yield_g_per_l_per_volume: z.number().min(1).max(15).optional()
    .describe('Alias for fermentable_coefficient_g_per_l_per_volume.'),
}).superRefine((data, ctx) => {
  if (data.packaging_volume_l !== undefined && data.batch_size_liters !== undefined
    && data.packaging_volume_l !== data.batch_size_liters) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['batch_size_liters'], message: 'Deprecated batch_size_liters conflicts with packaging_volume_l.' });
  }
  if (data.packaging_volume_l === undefined && data.batch_size_liters === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['packaging_volume_l'], message: 'packaging_volume_l is required; batch_size_liters is only a deprecated alias.' });
  }
  if (data.target_co2_volumes === undefined && data.beer_style === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_co2_volumes'], message: 'Provide target_co2_volumes or a recognized beer_style.' });
  }
  if (data.target_co2_volumes !== undefined && (data.target_co2_volumes <= 0 || data.target_co2_volumes > 6)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_co2_volumes'], message: 'target_co2_volumes must be greater than zero and no more than 6.' });
  }
  if (data.fermentable_coefficient_g_per_l_per_volume !== undefined
    && data.fermentable_yield_g_per_l_per_volume !== undefined
    && data.fermentable_coefficient_g_per_l_per_volume !== data.fermentable_yield_g_per_l_per_volume) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fermentable_yield_g_per_l_per_volume'], message: 'The two fermentable coefficient fields conflict.' });
  }
  if (data.co2_residual_method === 'explicit' && data.residual_co2_volumes === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['residual_co2_volumes'], message: 'Explicit residual CO2 requires residual_co2_volumes.' });
  }
  if (data.fermentation_pressurized && (data.co2_residual_method !== 'explicit' || data.residual_co2_volumes === undefined)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['co2_residual_method'], message: 'Pressurized fermentation requires explicit residual CO2.' });
  }
  if (data.co2_residual_method === 'temperature_estimate' && data.max_fermentation_temperature_c === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['max_fermentation_temperature_c'], message: 'Temperature estimate requires max_fermentation_temperature_c.' });
  }
});

export type PrimingCalculatorInput = z.infer<typeof PrimingCalculatorInputSchema>;

const CARB: Record<string, number> = {
  'british_ale': 1.8, 'mild': 1.8, 'bitter': 1.8, 'esb': 2.0, 'porter': 2.0,
  'stout': 2.0, 'brown_ale': 2.2, 'scotch_ale': 2.2, 'barleywine': 2.2,
  'english_ipa': 2.2, 'american_pale': 2.4, 'american_ipa': 2.4, 'double_ipa': 2.4,
  'session_ipa': 2.4, 'amber_ale': 2.4, 'red_ale': 2.4, 'blonde_ale': 2.4,
  'cream_ale': 2.4, 'american_lager': 2.5, 'light_lager': 2.5, 'pilsner': 2.4,
  'helles': 2.4, 'vienna': 2.4, 'marzen': 2.4, 'bock': 2.4, 'dunkel': 2.4,
  'schwarzbier': 2.4, 'kolsch': 2.4, 'altbier': 2.4, 'weissbier': 3.0,
  'dunkelweizen': 3.0, 'weizenbock': 3.0, 'berliner_weisse': 3.0, 'gose': 3.0,
  'lambic': 3.0, 'saison': 3.0, 'belgian_pale': 2.4, 'belgian_dubbel': 2.6,
  'belgian_tripel': 2.8, 'belgian_golden_strong': 2.8, 'belgian_dark_strong': 2.6,
  'witbier': 2.6, 'neipa': 2.4, 'kveik_ale': 2.4, 'sour_ale': 2.6,
  'brett_beer': 2.6, 'mixed_fermentation': 2.6, 'doppelbock': 2.4,
};

// Reference model coefficients: grams of fermentable product per liter per volume of CO2.
// They are not laboratory guarantees; effective product-specific yields may override them.
const FERMENTABLES: Record<string, { coefficient: number; name: string; uncertainty: string }> = {
  sucrose: { coefficient: 4.00, name: 'Saccarosio', uncertainty: 'low' },
  // Monohydrate reference; anhydrous dextrose is intentionally not treated as equivalent.
  dextrose: { coefficient: 4.40, name: 'Destrosio monoidrato', uncertainty: 'medium' },
  dme: { coefficient: 5.90, name: 'DME', uncertainty: 'medium' },
  honey: { coefficient: 5.40, name: 'Miele', uncertainty: 'high' },
  maple_syrup: { coefficient: 5.20, name: 'Sciroppo d\'acero', uncertainty: 'high' },
};

function calculateResidualCo2(tempC: number): number {
  const tempF = tempC * 9 / 5 + 32;
  const residual = 3.0378 - 0.050062 * tempF + 0.00026555 * tempF ** 2;
  return Math.max(0, residual);
}

export class PrimingCalculatorTool implements BuiltinTool<PrimingCalculatorInput> {
  readonly name = 'priming_calculator' as const;
  readonly description =
    'Calculate natural carbonation priming for bottle_priming or keg_natural using the actual packaging volume. ' +
    'Forced carbonation is not calculated; residual CO2 estimates and fermentable assumptions are reported as structured JSON.';
  readonly parameters: Record<string, unknown> = toInputJsonSchema(PrimingCalculatorInputSchema);

  resolveExecution(args: PrimingCalculatorInput): ToolExecution {
    const parsed = PrimingCalculatorInputSchema.safeParse(args);
    return {
      description: `Priming calculation (${args.packaging ?? 'unknown'})`,
      approvalRule: this.name,
      execute: () => parsed.success
        ? this.execute(parsed.data)
        : Promise.resolve(this.errorResult('INPUT_INVALID', parsed.error.issues.map(issue => issue.message).join('; '))),
    };
  }

  private execute(args: PrimingCalculatorInput): Promise<ExecutableToolResult> {
    try {
      const packagingVolume = args.packaging_volume_l ?? args.batch_size_liters;
      if (packagingVolume === undefined) return Promise.resolve(this.errorResult('PACKAGING_VOLUME_REQUIRED', 'packaging_volume_l is required.'));

      const target = args.target_co2_volumes ?? (args.beer_style ? CARB[args.beer_style] : undefined);
      if (target === undefined) return Promise.resolve(this.errorResult('TARGET_CO2_REQUIRED', 'Provide target_co2_volumes or a recognized beer_style; no silent default is applied.'));
      if (target <= 0 || target > 6) return Promise.resolve(this.errorResult('TARGET_CO2_INVALID', 'target_co2_volumes must be greater than zero and no more than 6.'));

      const residual = args.co2_residual_method === 'explicit'
        ? args.residual_co2_volumes
        : args.fermentation_pressurized
          ? undefined
          : args.max_fermentation_temperature_c === undefined
            ? undefined
            : calculateResidualCo2(args.max_fermentation_temperature_c);
      if (residual === undefined) return Promise.resolve(this.errorResult('RESIDUAL_CO2_REQUIRED', 'Residual CO2 must be supplied explicitly for this input.'));

      const co2ToAdd = Math.max(0, target - residual);
      const sugar = FERMENTABLES[args.sugar_type ?? 'sucrose'];
      const coefficient = args.fermentable_coefficient_g_per_l_per_volume
        ?? args.fermentable_yield_g_per_l_per_volume
        ?? sugar.coefficient;
      if (!Number.isFinite(coefficient) || coefficient <= 0) return Promise.resolve(this.errorResult('FERMENTABLE_COEFFICIENT_INVALID', 'The fermentable coefficient must be positive.'));
      if (coefficient < 1 || coefficient > 15) return Promise.resolve(this.errorResult('FERMENTABLE_COEFFICIENT_IMPLAUSIBLE', 'The fermentable coefficient is outside the plausible range 1-15 g/L/vol.'));

      const gramsPerLiter = co2ToAdd * coefficient;
      const totalGrams = gramsPerLiter * packagingVolume;
      const warnings: PrimingWarning[] = [
        { code: 'RESIDUAL_CO2_ESTIMATE', message: args.co2_residual_method === 'temperature_estimate' ? 'Residual CO2 is an empirical estimate, not a measurement.' : 'Residual CO2 is supplied as an explicit user value.' },
        { code: 'FG_STABILITY_REQUIRED', message: 'Priming assumes stable FG and no unaccounted residual fermentables or further fermentation.' },
      ];
      if (sugar.uncertainty !== 'low' && args.fermentable_coefficient_g_per_l_per_volume === undefined && args.fermentable_yield_g_per_l_per_volume === undefined) {
        warnings.push({ code: 'FERMENTABLE_YIELD_UNCERTAIN', message: `${sugar.name} composition and effective fermentability are variable; specify an effective coefficient for better accuracy.` });
      }
      if (args.beer_style && args.target_co2_volumes === undefined && CARB[args.beer_style] === undefined) {
        warnings.push({ code: 'STYLE_CO2_UNKNOWN', message: `No carbonation target is defined for style "${args.beer_style}".` });
      }
      if (target > 3.5) warnings.push({ code: 'PACKAGING_CARBONATION_HIGH', message: 'Target carbonation is high for normal homebrew packaging; container rating and stable FG remain independent safety conditions.' });
      if (co2ToAdd === 0) warnings.push({ code: 'TARGET_NOT_ABOVE_RESIDUAL', message: 'Target is not above residual CO2; zero priming cannot reduce existing carbonation.' });

      const summary = co2ToAdd === 0
        ? `CO2 residua ${residual.toFixed(2)} vol >= target ${target.toFixed(2)} vol: nessuno zucchero necessario.`
        : `Priming: ${totalGrams.toFixed(1)} g di ${sugar.name} (${gramsPerLiter.toFixed(1)} g/L) per ${packagingVolume.toFixed(1)} L.`;
      return Promise.resolve(this.successResult(args, {
        packaging_volume_l: packagingVolume,
        packaging: normalizePackaging(args.packaging),
        fermentable_type: args.sugar_type,
        fermentable_name: sugar.name,
        target_co2_volumes: target,
        residual_co2_volumes: residual,
        co2_to_produce_volumes: co2ToAdd,
        total_fermentable_g: totalGrams,
        dosage_g_per_l: gramsPerLiter,
        method: args.co2_residual_method,
        fermentable_coefficient_g_per_l_per_volume: coefficient,
        beer_temperature_at_packaging_c: args.beer_temperature_at_packaging_c ?? null,
        assumptions: [
          'Packaging volume is the actual volume destined for packaging.',
          'The calculation assumes stable FG and no unaccounted fermentation.',
          args.co2_residual_method === 'temperature_estimate' ? 'Residual CO2 uses maximum fermentation temperature, not packaging temperature.' : 'Residual CO2 uses the explicit override.',
        ],
      }, warnings, summary));
    } catch (e) {
      return Promise.resolve(this.errorResult('PRIMING_CALCULATION_ERROR', e instanceof Error ? e.message : String(e)));
    }
  }

  private successResult(args: PrimingCalculatorInput, result: Record<string, unknown>, warnings: PrimingWarning[], summary: string): ExecutableToolResult {
    return {
      output: JSON.stringify({
        schema_version: '1.0', calculation: 'priming', status: 'ok',
        inputs: {
          packaging_volume_l: args.packaging_volume_l ?? args.batch_size_liters,
          target_co2_volumes: args.target_co2_volumes ?? null,
          beer_style: args.beer_style ?? null,
          sugar_type: args.sugar_type,
          packaging: normalizePackaging(args.packaging),
          co2_residual_method: args.co2_residual_method,
          fermentation_pressurized: args.fermentation_pressurized,
          max_fermentation_temperature_c: args.max_fermentation_temperature_c ?? null,
          beer_temperature_at_packaging_c: args.beer_temperature_at_packaging_c ?? null,
        },
        result, derived: {}, warnings, errors: [], display: { summary },
      }),
    };
  }

  private errorResult(code: string, message: string): ExecutableToolResult {
    return {
      isError: true,
      output: JSON.stringify({ schema_version: '1.0', calculation: 'priming', status: 'error', inputs: {}, result: null, derived: {}, warnings: [], errors: [{ code, message }], display: { summary: message } }),
    };
  }
}

interface PrimingWarning { code: string; message: string; }

function normalizePackaging(packaging: PrimingCalculatorInput['packaging']): 'bottle_priming' | 'keg_natural' {
  return packaging === 'keg' || packaging === 'keg_natural' ? 'keg_natural' : 'bottle_priming';
}

registerTool(PrimingCalculatorTool);
