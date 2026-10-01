/**
 * IBU calculator — compute IBU with Tinseth or Rager models.
 * Supports multiple hop additions and a 100+ hop alpha-acid database.
 * Whirlpool IBU is an empirical temperature-based estimate.
 */

import { z } from 'zod';

import type { BuiltinTool, ExecutableToolResult, ToolExecution } from '../shim/tool-contract';
import { registerTool } from '../shim/tool-registry';
import { toInputJsonSchema } from '../shim/input-schema';

export const IbuCalculatorInputSchema = z.object({
  model: z.enum(['tinseth', 'rager']).default('tinseth'),

  ibu_volume_liters: z
    .number()
    .positive()
    .describe('Cold wort volume in the fermenter used as the IBU reference volume, in liters.'),

  volume_reference: z.literal('cold_fermenter').default('cold_fermenter')
    .describe('The IBU reference volume is explicitly the cold wort volume in the fermenter.'),

  boil_gravity: z
    .number()
    .min(1)
    .max(1.300)
    .describe('Average boil gravity, e.g. 1.040.'),

  original_gravity: z
    .number()
    .min(1)
    .max(1.300)
    .optional()
    .describe('Original gravity used only for the BU:GU ratio, e.g. 1.050.'),

  boil_duration_minutes: z
    .number()
    .int()
    .positive()
    .default(60),

  first_wort_utilization_factor: z
    .number()
    .min(0)
    .max(2)
    .default(1.10)
    .describe('Configurable declared convention for First Wort Hopping; no hidden increase is applied.'),

  estimate_whirlpool_ibu: z
    .boolean()
    .default(true)
    .describe('When false, whirlpool additions are reported but their theoretical IBU contribution is zero.'),

  hops: z.array(
    z.object({
      id: z.string().min(1).describe('Stable recipe identifier for this hop addition.'),
      variety: z.string().min(1),

      alpha_acids_percent: z
        .number()
        .min(0)
        .max(30)
        .optional()
        .describe(
          'Alpha acid percentage of the hop. ' +
          'If omitted, the calculator uses an internal database average.'
        ),

      grams: z
        .number()
        .nonnegative(),

      time_minutes: z
        .number()
        .nonnegative()
        .describe(
          'For boil additions: minutes remaining in the boil. ' +
          'For whirlpool additions: duration of the hop stand.'
        ),

      form: z
        .enum(['pellet', 'whole', 'plug'])
        .default('pellet'),

      use: z
        .enum(['boil', 'whirlpool', 'dry_hop', 'first_wort', 'mash', 'flameout', 'post_boil'])
        .default('boil'),

      whirlpool_temperature_c: z
        .number()
        .min(60)
        .max(100)
        .optional(),
    })
  ),
}).superRefine((data, ctx) => {
  data.hops.forEach((hop, index) => {
    if (hop.use === 'boil' && hop.time_minutes < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['hops', index, 'time_minutes'], message: 'Boil contact time cannot be negative.' });
    }

    if (
      (hop.use === 'boil' || hop.use === 'first_wort') &&
      hop.time_minutes > data.boil_duration_minutes
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hops', index, 'time_minutes'],
        message:
          'Boil hop time cannot exceed the total boil duration.',
      });
    }

    if (
      (hop.use === 'whirlpool' || hop.use === 'flameout') &&
      hop.whirlpool_temperature_c === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hops', index, 'whirlpool_temperature_c'],
        message:
          'Whirlpool/flameout temperature is required for post-boil additions.',
      });
    }

    if ((hop.use === 'whirlpool' || hop.use === 'flameout' || hop.use === 'post_boil') && hop.time_minutes <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['hops', index, 'time_minutes'], message: 'Post-boil contact time must be greater than zero.' });
    }
  });

  const ids = data.hops.map(hop => hop.id);
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['hops'], message: 'Every hop addition id must be unique.' });
  }
});

export type IbuCalculatorInput = z.infer<typeof IbuCalculatorInputSchema>;

type HopAddition = IbuCalculatorInput['hops'][number];

interface IbuWarning {
  code: string;
  message: string;
  addition_id?: string;
}

interface IbuAdditionResult {
  id: string;
  variety: string;
  grams: number;
  alpha_acids_percent: number;
  alpha_acids_source: string;
  form: HopAddition['form'];
  use: HopAddition['use'];
  contact_time_minutes: number;
  temperature_c: number | null;
  ibu: number;
  model: string;
  assumptions: string[];
}

interface HopCalculation {
  ibu: number;
  model: string;
  assumptions: string[];
}

const HOP_AA: Record<string, number> = {
  'admiral': 14, 'amarillo': 9, 'apollo': 18.5, 'aramis': 8, 'archer': 5,
  'aurora': 8, 'azacca': 15, 'bobek': 5, 'bramling cross': 6, 'bravo': 15,
  'brewer\'s gold': 9, 'bullion': 8, 'calypso': 13, 'cascade': 5.5,
  'cashmere': 8, 'celeia': 5, 'centennial': 10, 'challenger': 7,
  'chinook': 13, 'citra': 12, 'cluster': 7.5, 'columbus': 15, 'comet': 10,
  'crystal': 3.5, 'dana': 10, 'denali': 15, 'dr. rudi': 11,
  'east kent goldings': 5, 'ekuanot': 15, 'el dorado': 15, 'ella': 14.5,
  'enigma': 16.5, 'eureka': 18, 'falconer\'s flight': 11, 'first gold': 7.5,
  'fuggles': 4.5, 'galaxy': 14, 'galena': 13, 'glacier': 5.5,
  'goldings': 5, 'green bullet': 12, 'hallertau': 4.5,
  'hallertau blanka': 11, 'hallertau hersbrucker': 4,
  'hallertau mittelfruh': 4.5, 'hallertau taurus': 15, 'helga': 6.5,
  'herald': 12, 'herkules': 16, 'hersbrucker': 3.5, 'horizon': 12,
  'hbc 586': 11, 'huell melon': 6.5, 'hull melon': 6.5, 'idaho 7': 13,
  'jarrylo': 15, 'jester': 8, 'kazbek': 5.5, 'kohatu': 6.5,
  'lemondrop': 6, 'liberty': 4, 'loral': 11.5, 'lotus': 14, 'lublin': 4,
  'magnum': 13, 'mandarina bavaria': 9, 'mandarina': 9, 'marynka': 9,
  'medusa': 5.5, 'meridian': 6, 'merkur': 13, 'millennium': 15.5,
  'monroe': 7.5, 'mosaic': 12.5, 'motueka': 7, 'mt. hood': 6,
  'nelson sauvin': 12.5, 'newport': 15, 'northern brewer': 9, 'northdown': 8,
  'nugget': 13, 'olympic': 12, 'omega': 10, 'opal': 6, 'pacific gem': 15,
  'pacific jade': 13, 'pacifica': 5.5, 'pahto': 18, 'palisade': 8,
  'pekko': 8.5, 'perle': 8, 'pilgrim': 10, 'pioneer': 9, 'polaris': 20,
  'premiant': 9, 'pride of ringwood': 9, 'progress': 6, 'rakau': 11,
  'riwaka': 5.5, 'saaz': 4, 'sabro': 14, 'santiam': 6, 'saphir': 3.5,
  'select': 5, 'serebrianka': 3.5, 'simcoe': 13, 'smaragd': 5,
  'sorachi ace': 12, 'southern cross': 12, 'sovereign': 5, 'spalt': 4.5,
  'sterling': 7.5, 'sticklebract': 13, 'strata': 12, 'styrian aurora': 8,
  'styrian bobek': 5, 'styrian celeia': 5, 'styrian dragon': 10,
  'styrian goldings': 5, 'styrian wolf': 13, 'sultana': 13.5,
  'summit': 17.5, 'super alpha': 13, 'super pride': 14, 'sylva': 6,
  'taiheke': 7, 'target': 11, 'tettnang': 4.5, 'tomahawk': 17,
  'topaz': 16.5, 'tradition': 6, 'triple pearl': 10.5, 'triskel': 8,
  'vanguard': 5.5, 'vic secret': 17, 'victoria': 13, 'waimea': 16,
  'wai-iti': 3, 'wakatu': 7.5, 'warrior': 16, 'whitbread golding': 6,
  'willamette': 5.5, 'yakima chief': 10, 'zeus': 16, 'zythos': 11,
};

const AVAILABLE_HOP_LIST = Object.keys(HOP_AA).sort().join(', ');

export class IbuCalculatorTool implements BuiltinTool<IbuCalculatorInput> {
  readonly name = 'ibu_calculator' as const;

  readonly description =
    'Calculate theoretical bitterness using Tinseth or Rager from an explicit cold-fermenter IBU volume. ' +
    'Supports boil, first-wort, whirlpool, dry-hop and mash-hop additions without reconstructing process volumes.';

  readonly parameters: Record<string, unknown> = toInputJsonSchema(IbuCalculatorInputSchema);

  resolveExecution(rawArgs: IbuCalculatorInput): ToolExecution {
    const args = IbuCalculatorInputSchema.parse(rawArgs);
    return {
      description: `IBU calculation (${args.model})`,
      approvalRule: this.name,
      execute: () => this.execute(args),
    };
  }

  private execute(
    args: IbuCalculatorInput
  ): Promise<ExecutableToolResult> {
    try {
      const model = args.model ?? 'tinseth';
      let totalIbu = 0;
      let boilIbu = 0;
      let firstWortIbu = 0;
      let whirlpoolIbu = 0;
      const warnings: IbuWarning[] = [];
      const additions: IbuAdditionResult[] = [];

      for (const hop of args.hops) {
        const normalizedVariety = hop.variety
          .trim()
          .toLowerCase();

        const databaseAa = HOP_AA[normalizedVariety];

        const aa =
          hop.alpha_acids_percent ??
          databaseAa;

        if (aa === undefined) {
          return Promise.resolve(this.errorResult('ibu', 'HOP_AA_UNKNOWN',
            `Unknown hop: "${hop.variety}". Provide alpha_acids_percent explicitly.`, { addition_id: hop.id }));
        }

        const aaSource =
          hop.alpha_acids_percent === undefined
            ? 'database average'
            : 'user supplied';

        const calculation = this.calculateHopIbu(model, hop, aa, args);
        const ibu = calculation.ibu;

        totalIbu += ibu;
        if (hop.use === 'boil') boilIbu += ibu;
        if (hop.use === 'first_wort') firstWortIbu += ibu;
        if (hop.use === 'whirlpool' && args.estimate_whirlpool_ibu) whirlpoolIbu += ibu;

        if (
          hop.alpha_acids_percent === undefined
        ) {
          warnings.push(
            { code: 'HOP_AA_ESTIMATED', addition_id: hop.id, message: `${hop.variety}: AA% estimated from the internal database (${aa.toFixed(1)}%). Use the package value for better accuracy.` }
          );
        }

        if (hop.use === 'dry_hop') {
          warnings.push(
            { code: 'DRY_HOP_NOT_ISOMERIZED', addition_id: hop.id, message: `${hop.variety}: dry hopping contributes 0 theoretical IBU; it may still affect measured and perceived bitterness through other compounds.` }
          );
        }

        if (hop.use === 'mash') {
          warnings.push(
            { code: 'MASH_HOP_NOT_ISOMERIZED', addition_id: hop.id, message: `${hop.variety}: mash hopping contributes 0 theoretical IBU in this model.` }
          );
        }

        additions.push({
          id: hop.id,
          variety: hop.variety,
          grams: hop.grams,
          alpha_acids_percent: aa,
          alpha_acids_source: aaSource,
          form: hop.form,
          use: hop.use,
          contact_time_minutes: hop.use === 'first_wort' ? args.boil_duration_minutes : hop.time_minutes,
          temperature_c: hop.whirlpool_temperature_c ?? null,
          ibu,
          model: calculation.model,
          assumptions: calculation.assumptions,
        });
      }

      const bu = args.original_gravity === undefined ? null : totalIbu / ((args.original_gravity - 1) * 1000);
      const summary = `IBU totali (${model}): ${totalIbu.toFixed(1)}; boil ${boilIbu.toFixed(1)}, first wort ${firstWortIbu.toFixed(1)}, whirlpool ${whirlpoolIbu.toFixed(1)}${bu === null ? '' : `; BU:GU ${bu.toFixed(2)}`}`;
      return Promise.resolve(this.successResult(args, {
        total_ibu: totalIbu,
        boil_ibu: boilIbu,
        first_wort_ibu: firstWortIbu,
        whirlpool_ibu_estimated: whirlpoolIbu,
        bu: bu === null || !Number.isFinite(bu) ? null : bu,
        additions,
        model,
        assumptions: {
          volume_reference: 'cold_fermenter',
          first_wort_factor: args.first_wort_utilization_factor,
          whirlpool_model: 'empirical_temperature_duration',
          dry_hop_model: 'zero_isomerized_ibu',
        },
      }, warnings, summary));
    } catch (error) {
      return Promise.resolve(this.errorResult('ibu', 'IBU_CALCULATION_ERROR', error instanceof Error ? error.message : String(error)));
    }
  }

  private successResult(
    args: IbuCalculatorInput,
    result: Record<string, unknown>,
    warnings: IbuWarning[],
    summary: string,
  ): ExecutableToolResult {
    return {
      output: JSON.stringify({
        schema_version: '1.0',
        calculation: 'ibu',
        status: 'ok',
        inputs: {
          model: args.model,
          ibu_volume_liters: args.ibu_volume_liters,
          volume_reference: args.volume_reference,
          boil_gravity: args.boil_gravity,
          original_gravity: args.original_gravity ?? null,
          boil_duration_minutes: args.boil_duration_minutes,
          first_wort_utilization_factor: args.first_wort_utilization_factor,
          estimate_whirlpool_ibu: args.estimate_whirlpool_ibu,
          hops: args.hops,
        },
        result,
        derived: { total_additions: args.hops.length },
        warnings,
        errors: [],
        display: { summary },
      }),
    };
  }

  private errorResult(
    calculation: string,
    code: string,
    message: string,
    details: Record<string, unknown> = {},
  ): ExecutableToolResult {
    return {
      isError: true,
      output: JSON.stringify({
        schema_version: '1.0', calculation, status: 'error', inputs: {}, result: null,
        derived: {}, warnings: [], errors: [{ code, message, ...details }], display: { summary: message },
      }),
    };
  }

  private calculateHopIbu(
    model: 'tinseth' | 'rager',
    hop: HopAddition,
    aaPercent: number,
    args: IbuCalculatorInput
  ): HopCalculation {
    if (
      hop.grams === 0 ||
      aaPercent === 0
    ) {
      return { ibu: 0, model, assumptions: ['Zero grams or zero AA% produces zero IBU.'] };
    }

    switch (hop.use) {
      case 'boil':
        return { ibu: this.calculateBoilIbu(
          model,
          hop.grams,
          aaPercent,
          hop.time_minutes,
          args.boil_gravity,
          args.ibu_volume_liters,
          hop.form
        ), model, assumptions: ['Boil utilization model.', 'Volume is the explicit cold-fermenter IBU reference volume.'] };

      case 'first_wort': {
        const baseIbu = this.calculateBoilIbu(
          model,
          hop.grams,
          aaPercent,
          args.boil_duration_minutes,
          args.boil_gravity,
          args.ibu_volume_liters,
          hop.form
        );

        /*
         * Conventional approximation:
         * FWH is treated as a full-boil addition with a 10% increase.
         */
        return {
          ibu: baseIbu * args.first_wort_utilization_factor,
          model: 'first_wort_convention',
          assumptions: [`Full-boil ${model} result multiplied by configured factor ${args.first_wort_utilization_factor.toFixed(2)}.`],
        };
      }

      case 'whirlpool': {
        if (!args.estimate_whirlpool_ibu) {
          return { ibu: 0, model: 'whirlpool_excluded', assumptions: ['Whirlpool theoretical contribution explicitly disabled by the user.'] };
        }
        return {
          ibu: this.calculateWhirlpoolIbu(hop, aaPercent, args.boil_gravity, args.ibu_volume_liters),
          model: 'whirlpool_empirical',
          assumptions: ['Empirical temperature-duration model; not Tinseth at zero minutes and not an analytical measurement.'],
        };
      }

      case 'dry_hop':
        return { ibu: 0, model: 'dry_hop_zero_isomerized_ibu', assumptions: ['Classical boil isomerization contribution is zero.'] };

      case 'mash':
        return { ibu: 0, model: 'mash_hop_zero_ibu', assumptions: ['No validated isomerization model is applied to mash hopping.'] };

      case 'flameout':
      case 'post_boil':
        return { ibu: 0, model: 'post_boil_zero_ibu', assumptions: ['Post-boil addition is distinguished from whirlpool and is not assigned theoretical IBU.'] };

      default:
        return { ibu: 0, model: 'none', assumptions: ['Unsupported addition stage.'] };
    }
  }

  private calculateBoilIbu(
    model: 'tinseth' | 'rager',
    grams: number,
    aaPercent: number,
    timeMinutes: number,
    gravity: number,
    volumeLiters: number,
    form: HopAddition['form']
  ): number {
    const formFactor =
      this.getHopFormFactor(form);

    if (model === 'rager') {
      const utilization =
        this.ragerUtilization(timeMinutes) *
        formFactor;

      const gravityAdjustment =
        this.ragerGravityAdjustment(gravity);

      return (
        grams *
        aaPercent *
        utilization *
        10
      ) / (
        volumeLiters *
        (1 + gravityAdjustment)
      );
    }

    const utilization =
      this.tinsethUtilization(
        timeMinutes,
        gravity
      ) * formFactor;

    return (
      grams *
      aaPercent *
      utilization *
      10
    ) / volumeLiters;
  }

  private calculateWhirlpoolIbu(
    hop: HopAddition,
    aaPercent: number,
    gravity: number,
    volumeLiters: number,
  ): number {
    const temperature =
      hop.whirlpool_temperature_c;

    if (temperature === undefined) {
      return 0;
    }

    const temperatureFactor =
      this.whirlpoolTemperatureFactor(
        temperature
      );

    if (temperatureFactor <= 0) {
      return 0;
    }

    // Empirical estimate: temperature and contact time are explicit inputs.
    // It is intentionally separate from Tinseth/Rager and is not analytical.
    const contactFactor = 1 - Math.exp(-hop.time_minutes / 20);
    const gravityUnits = (gravity - 1) * 1000;
    const gravityFactor = Math.max(0.50, 1 - Math.max(0, gravityUnits - 50) * 0.0065);
    const formFactor = this.getHopFormFactor(hop.form);
    return (hop.grams * aaPercent * 10 / volumeLiters)
      * 0.25 * temperatureFactor * contactFactor * gravityFactor * formFactor;
  }

  private tinsethUtilization(
    timeMinutes: number,
    gravity: number
  ): number {
    const gravityFactor =
      1.65 *
      Math.pow(
        0.000125,
        gravity - 1
      );

    const timeFactor =
      (
        1 -
        Math.exp(
          -0.04 * timeMinutes
        )
      ) / 4.15;

    return gravityFactor * timeFactor;
  }

  private ragerUtilization(
    timeMinutes: number
  ): number {
    return (
      18.11 +
      13.86 *
      Math.tanh(
        (timeMinutes - 31.32) /
        18.27
      )
    ) / 100;
  }

  /**
   * Rager gravity adjustment factor for the IBU denominator.
   *
   * When boil gravity exceeds 1.050, utilisation drops linearly.
   * The factor is `0.00065 × (gravityUnits - 50)` and is used as:
   *
   *   IBU = (grams × AA% × utilisation × 10) / (volume × (1 + adjustment))
   */
  private ragerGravityAdjustment(
    gravity: number
  ): number {
    const gravityUnits = (gravity - 1) * 1000;

    if (gravityUnits <= 50) {
      return 0;
    }

    return (
      0.00065 *
      (gravityUnits - 50)
    );
  }

  /**
   * Hop-form efficiency factor used as a multiplier on utilisation.
   *
   *   - pellet: × 1.10 (empirical convention)
   *   - plug:   × 1.05
   *   - whole:  × 1.00 (baseline)
   */
  private getHopFormFactor(
    form: HopAddition['form']
  ): number {
    switch (form) {
      case 'pellet':
        return 1.10;
      case 'plug':
        return 1.05;
      case 'whole':
      default:
        return 1;
    }
  }

  /**
   * Empirical temperature factor for whirlpool hop additions.
   *
   * Based on the observation that isomerisation continues at whirlpool
   * temperatures but at reduced rates. Values are deliberately conservative.
   */
  private whirlpoolTemperatureFactor(
    temperatureC: number
  ): number {
    if (temperatureC >= 95) {
      return 0.50;
    }

    if (temperatureC >= 90) {
      return 0.35;
    }

    if (temperatureC >= 85) {
      return 0.20;
    }

    if (temperatureC >= 80) {
      return 0.10;
    }

    if (temperatureC >= 75) {
      return 0.05;
    }

    return 0;
  }
}

registerTool(IbuCalculatorTool);
