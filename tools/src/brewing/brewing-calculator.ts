/**
 * Brewing calculator — complete brewing math engine.
 *
 * Single coherent volume chain (packaged → fermenter → cold post-boil →
 * hot post-boil → pre-boil → mash/sparge) plus ABV, attenuation, efficiency,
 * strike water, pitching rate, gravity correction, dilution, and boil-off.
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

// ─── Schema ──────────────────────────────────────────────────────────────────

export const BrewingCalculatorInputSchema = z.object({
  calculation: z.enum([
    'abv', 'attenuation', 'efficiency',
    'strike_water', 'mash_water_volume', 'sparge_water_volume', 'total_water_volume',
    'pre_boil_volume', 'post_boil_volume',
    'pitching_rate', 'gravity_correction', 'dilution', 'boil_off',
  ]),

  og: z.number().min(0.990).max(1.300).optional(),
  fg: z.number().min(0.990).max(1.200).optional(),

  batch_size_liters: z.number().positive().max(200).optional()
    .describe('Target packaged beer volume in liters.'),

  grain_bill_kg: z.array(z.object({ malt: z.string().min(1), kg: z.number().positive() })).optional(),
  grain_bill: z.array(z.object({ malt: z.string().min(1), kg: z.number().positive() })).optional(),

  measured_gravity: z.number().min(0.990).max(1.300).optional(),

  mash_temp_c: z.number().min(35).max(80).optional(),
  grain_temp_c: z.number().min(-10).max(45).optional(),
  mash_thickness_l_per_kg: z.number().min(1.5).max(10).optional(),
  mash_deadspace_liters: z.number().min(0).max(30).optional()
    .describe('Volume under the basket/false bottom in liters (default 0).'),
  mash_loss_liters: z.number().min(0).max(20).optional()
    .describe('Non-recoverable mash loss in liters (default 0).'),
  grain_absorption_l_per_kg: z.number().min(0.3).max(1.5).optional()
    .describe('Grain absorption in L/kg (default 0.8).'),

  sparge_water_volume: z.number().nonnegative().max(200).optional()
    .describe('User-provided sparge water volume in liters. When given, ' +
      'it overrides the calculated sparge volume for total_water_volume.'),

  boil_duration_minutes: z.number().min(0).max(300).optional(),
  boil_off_rate_l_per_h: z.number().min(0).max(20).optional(),

  trub_loss_liters: z.number().min(0).max(30).optional()
    .describe('Trub/kettle loss in liters (default 1.5).'),
  fermenter_loss_liters: z.number().min(0).max(30).optional()
    .describe('Fermenter-to-package loss in liters (default 0.5).'),
  wort_shrinkage_percent: z.number().min(0).max(10).optional()
    .describe('Wort shrinkage from hot to cold (default 4%).'),

  beer_type: z.enum(['ale', 'lager', 'hybrid']).optional(),
  cells_per_ml_p_required: z.number().min(0.1).max(5).optional(),
  yeast_viability_percent: z.number().gt(0).max(100).optional(),
  volume_liters: z.number().optional(),
  current_gravity: z.number().optional(),
  target_gravity: z.number().optional(),
});

export type BrewingCalculatorInput = z.infer<typeof BrewingCalculatorInputSchema>;

// ─── Water/volume parameters (single source of defaults) ─────────────────────

interface WaterParams {
  packagedLiters: number;
  grainKg: number;
  mashThickness: number;
  mashDeadspace: number;
  mashLoss: number;
  grainAbsorption: number;
  boilMinutes: number;
  boilOffRate: number;
  trubLoss: number;
  fermenterLoss: number;
  shrinkageFraction: number;
}

// ─── Tool implementation ─────────────────────────────────────────────────────

export class BrewingCalculatorTool implements BuiltinTool<BrewingCalculatorInput> {
  readonly name = 'brewing_calculator' as const;
  readonly description =
    'Calculate brewing parameters: ABV, attenuation, efficiency, strike water, mash/sparge/total water, pre/post-boil volumes, pitching rates, gravity corrections, dilution, and boil-off. ' +
    'For total_water_volume you can optionally pass sparge_water_volume (in liters) to override the calculated sparge volume.';
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
      switch (args.calculation) {
        case 'abv': return Promise.resolve(this.calcAbv(args));
        case 'attenuation': return Promise.resolve(this.calcAttenuation(args));
        case 'efficiency': return Promise.resolve(this.calcEfficiency(args));
        case 'strike_water': return Promise.resolve(this.calcStrikeWater(args));
        case 'mash_water_volume': return Promise.resolve(this.calcMashWaterVolume(args));
        case 'sparge_water_volume': return Promise.resolve(this.calcSpargeWaterVolume(args));
        case 'total_water_volume': return Promise.resolve(this.calcTotalWaterVolume(args));
        case 'pre_boil_volume': return Promise.resolve(this.calcPreBoilVolume(args));
        case 'post_boil_volume': return Promise.resolve(this.calcPostBoilVolume(args));
        case 'pitching_rate': return Promise.resolve(this.calcPitchingRate(args));
        case 'gravity_correction': return Promise.resolve(this.calcGravityCorrection(args));
        case 'dilution': return Promise.resolve(this.calcDilution(args));
        case 'boil_off': return Promise.resolve(this.calcBoilOff(args));
      }
    } catch (error) {
      return Promise.resolve({ isError: true, output: error instanceof Error ? error.message : String(error) });
    }
  }

  // ─── Water parameters ─────────────────────────────────────────────────────

  private waterParameters(args: BrewingCalculatorInput): WaterParams {
    return {
      packagedLiters: args.batch_size_liters ?? 0,
      grainKg: this.sumKg(args.grain_bill_kg ?? args.grain_bill),
      mashThickness: args.mash_thickness_l_per_kg ?? 3.0,
      mashDeadspace: args.mash_deadspace_liters ?? 0,
      mashLoss: args.mash_loss_liters ?? 0,
      grainAbsorption: args.grain_absorption_l_per_kg ?? 0.8,
      boilMinutes: args.boil_duration_minutes ?? 60,
      boilOffRate: args.boil_off_rate_l_per_h ?? 3.0,
      trubLoss: args.trub_loss_liters ?? 1.5,
      fermenterLoss: args.fermenter_loss_liters ?? 0.5,
      shrinkageFraction: (args.wort_shrinkage_percent ?? 4) / 100,
    };
  }

  // ─── Volume helpers (single coherent chain) ───────────────────────────────

  private boilOffL(args: BrewingCalculatorInput): number {
    const p = this.waterParameters(args);
    return p.boilOffRate * p.boilMinutes / 60;
  }

  private fermenterTargetL(args: BrewingCalculatorInput): number {
    const p = this.waterParameters(args);
    return p.packagedLiters + p.fermenterLoss;
  }

  private coldPostBoilL(args: BrewingCalculatorInput): number {
    const p = this.waterParameters(args);
    return this.fermenterTargetL(args) + p.trubLoss;
  }

  private hotPostBoilL(args: BrewingCalculatorInput): number {
    const p = this.waterParameters(args);
    return this.coldPostBoilL(args) / (1 - p.shrinkageFraction);
  }

  private preBoilL(args: BrewingCalculatorInput): number {
    return this.hotPostBoilL(args) + this.boilOffL(args);
  }

  private mashWaterL(args: BrewingCalculatorInput): number {
    const p = this.waterParameters(args);
    if (p.grainKg <= 0) return 0;
    return p.grainKg * p.mashThickness + p.mashDeadspace;
  }

  private firstRunningsL(args: BrewingCalculatorInput): number {
    const p = this.waterParameters(args);
    const mw = this.mashWaterL(args);
    return Math.max(0, mw - p.grainKg * p.grainAbsorption - p.mashLoss);
  }

  private spargeWaterL(args: BrewingCalculatorInput): number {
    if (args.sparge_water_volume !== undefined) {
      return args.sparge_water_volume;
    }
    return Math.max(0, this.preBoilL(args) - this.firstRunningsL(args));
  }

  private totalWaterL(args: BrewingCalculatorInput): number {
    return this.mashWaterL(args) + this.spargeWaterL(args);
  }

  // ─── ABV ──────────────────────────────────────────────────────────────────

  private calcAbv(args: BrewingCalculatorInput): ExecutableToolResult {
    const og = this.req(args.og, 'og');
    const fg = this.req(args.fg, 'fg');
    if (og <= fg) return { isError: true, output: 'OG must be greater than FG.' };
    return { output: `ABV = (OG ${og.toFixed(3)} − FG ${fg.toFixed(3)}) × 131.25 = **${((og - fg) * 131.25).toFixed(2)}% vol**` };
  }

  // ─── Attenuation ──────────────────────────────────────────────────────────

  private calcAttenuation(args: BrewingCalculatorInput): ExecutableToolResult {
    const og = this.req(args.og, 'og');
    const fg = this.req(args.fg, 'fg');
    if (og <= fg) return { isError: true, output: 'OG must be greater than FG.' };
    return { output: `Attenuazione apparente = **${(((og - fg) / (og - 1.0)) * 100).toFixed(1)}%**` };
  }

  // ─── Efficiency ───────────────────────────────────────────────────────────

  private calcEfficiency(args: BrewingCalculatorInput): ExecutableToolResult {
    const batchLiters = this.req(args.batch_size_liters, 'batch_size_liters');
    const measuredGrav = this.req(args.measured_gravity, 'measured_gravity');
    const grainBill = this.req(args.grain_bill_kg ?? args.grain_bill, 'grain_bill');
    let theoreticalPtL = 0;
    for (const { malt, kg } of grainBill) {
      const key = malt.toLowerCase();
      const pot = MALT_POTENTIAL[key] ?? MALT_POTENTIAL[key + ' malt'] ?? this.lookupPotential(key);
      if (pot === undefined) return { isError: true, output: `Potenziale sconosciuto per "${malt}".` };
      theoreticalPtL += kg * pot;
    }
    const measuredPtL = (measuredGrav - 1) * 1000 * batchLiters;
    const efficiency = (measuredPtL / theoreticalPtL) * 100;
    return {
      output: [
        `Efficienza = **${efficiency.toFixed(1)}%**`,
        `  Punti teorici: ${theoreticalPtL.toFixed(0)} punti·L`,
        `  Punti misurati: ${measuredPtL.toFixed(0)} punti·L`,
      ].join('\n'),
    };
  }

  // ─── Strike Water ─────────────────────────────────────────────────────────

  private calcStrikeWater(args: BrewingCalculatorInput): ExecutableToolResult {
    const mashTemp = this.req(args.mash_temp_c, 'mash_temp_c');
    const grainTemp = this.req(args.grain_temp_c, 'grain_temp_c');
    const thickness = args.mash_thickness_l_per_kg ?? 3.0;
    const strikeTemp = mashTemp + (0.41 / thickness) * (mashTemp - grainTemp);
    return {
      output: `Temperatura strike water = **${strikeTemp.toFixed(1)}°C** (${thickness} L/kg, mash target ${mashTemp}°C, grani ${grainTemp}°C)`,
    };
  }

  // ─── Mash Water Volume ────────────────────────────────────────────────────

  private calcMashWaterVolume(args: BrewingCalculatorInput): ExecutableToolResult {
    const p = this.waterParameters(args);
    if (p.grainKg <= 0) return { isError: true, output: 'grain_bill required.' };
    const grainWater = p.grainKg * p.mashThickness;
    const totalMash = grainWater + p.mashDeadspace;
    return {
      output: [
        `Acqua nel letto di trebbie: **${grainWater.toFixed(1)} L** (${p.mashThickness} L/kg × ${p.grainKg.toFixed(2)} kg)`,
        p.mashDeadspace > 0 ? `Spazio sotto cestello: +${p.mashDeadspace.toFixed(1)} L` : '',
        `Acqua totale da caricare per il mash: **${totalMash.toFixed(1)} L**`,
      ].filter(Boolean).join('\n'),
    };
  }

  // ─── Sparge Water Volume ──────────────────────────────────────────────────

  private calcSpargeWaterVolume(args: BrewingCalculatorInput): ExecutableToolResult {
    const p = this.waterParameters(args);
    if (p.grainKg <= 0) return { isError: true, output: 'grain_bill required.' };
    const mw = this.mashWaterL(args);
    const fr = this.firstRunningsL(args);
    const sparge = this.spargeWaterL(args);
    const preBoil = this.preBoilL(args);

    if (args.sparge_water_volume !== undefined) {
      return {
        output: [
          `Acqua di sparge = **${sparge.toFixed(1)} L** (fornita dall'utente)`,
          `  Acqua di mash: ${mw.toFixed(1)} L`,
          `  Primi mosti: ${fr.toFixed(1)} L`,
          `  Pre-boil risultante: ${(mw + sparge - p.grainKg * p.grainAbsorption - p.mashLoss).toFixed(1)} L`,
        ].join('\n'),
      };
    }

    return {
      output: [
        `Acqua di sparge = **${sparge.toFixed(1)} L**`,
        `  Acqua di mash: ${mw.toFixed(1)} L`,
        `  Assorbimento grani: ${(p.grainKg * p.grainAbsorption).toFixed(1)} L (${p.grainAbsorption} L/kg)`,
        `  Primi mosti: ${fr.toFixed(1)} L`,
        `  Pre-boil richiesto: ${preBoil.toFixed(1)} L`,
      ].join('\n'),
    };
  }

  // ─── Total Water Volume ───────────────────────────────────────────────────

  private calcTotalWaterVolume(args: BrewingCalculatorInput): ExecutableToolResult {
    const p = this.waterParameters(args);
    const mash = this.mashWaterL(args);
    const sparge = this.spargeWaterL(args);
    const preBoil = this.preBoilL(args);
    const absorbed = p.grainKg * p.grainAbsorption;

    if (args.sparge_water_volume !== undefined) {
      return {
        output: [
          `Acqua di mash: ${mash.toFixed(1)} L`,
          `Acqua di sparge: ${sparge.toFixed(1)} L (fornita dall'utente)`,
          `Acqua totale di processo: **${(mash + sparge).toFixed(1)} L**`,
          `  (Pre-boil calcolato: ${preBoil.toFixed(1)} L + assorbimento: ${absorbed.toFixed(1)} L)`,
        ].join('\n'),
      };
    }

    return {
      output: [
        `Acqua di mash: ${mash.toFixed(1)} L`,
        `Acqua di sparge: ${sparge.toFixed(1)} L`,
        `Acqua totale di processo: **${(mash + sparge).toFixed(1)} L**`,
        `  (Pre-boil: ${preBoil.toFixed(1)} L + assorbimento: ${absorbed.toFixed(1)} L)`,
      ].join('\n'),
    };
  }

  // ─── Pre-boil Volume ──────────────────────────────────────────────────────

  private calcPreBoilVolume(args: BrewingCalculatorInput): ExecutableToolResult {
    const p = this.waterParameters(args);
    const hot = this.hotPostBoilL(args);
    const boilOff = this.boilOffL(args);
    const preBoil = this.preBoilL(args);
    return {
      output: [
        `Post-boil caldo: ${hot.toFixed(1)} L`,
        `Evaporazione: ${boilOff.toFixed(1)} L (${p.boilOffRate} L/h × ${p.boilMinutes} min)`,
        `Volume pre-boil: **${preBoil.toFixed(1)} L**`,
      ].join('\n'),
    };
  }

  // ─── Post-boil Volume ─────────────────────────────────────────────────────

  private calcPostBoilVolume(args: BrewingCalculatorInput): ExecutableToolResult {
    const p = this.waterParameters(args);
    const ferm = this.fermenterTargetL(args);
    const cold = this.coldPostBoilL(args);
    const hot = this.hotPostBoilL(args);
    return {
      output: [
        `Volume confezionato target: ${p.packagedLiters.toFixed(1)} L`,
        `Richiesto nel fermentatore: ${ferm.toFixed(1)} L (+${p.fermenterLoss} L)`,
        `Post-boil freddo nel kettle: ${cold.toFixed(1)} L (+${p.trubLoss} L)`,
        `Post-boil caldo: **${hot.toFixed(1)} L** (contrazione ${(p.shrinkageFraction * 100).toFixed(1)}%)`,
      ].join('\n'),
    };
  }

  // ─── Pitching Rate ────────────────────────────────────────────────────────

  private calcPitchingRate(args: BrewingCalculatorInput): ExecutableToolResult {
    const batchLiters = this.req(args.batch_size_liters, 'batch_size_liters');
    const og = this.req(args.og, 'og');
    const beerType = args.beer_type ?? 'ale';
    const cells = args.cells_per_ml_p_required ?? DEFAULT_RATES[beerType] ?? 0.75;
    const plato = this.toPlato(og);
    const viability = args.yeast_viability_percent ?? 95;
    const requiredBillions = batchLiters * plato * cells;
    const pitchBillions = requiredBillions / (viability / 100);
    return {
      output: [
        `Pitching rate: ${cells.toFixed(2)} M cellule/mL/°P (${beerType})`,
        `Mosto: ${batchLiters.toFixed(1)} L a ${plato.toFixed(1)}°P`,
        `Cellule vitali: **${requiredBillions.toFixed(0)} miliardi**`,
        `Cella nominali viabilità ${viability}%: **${pitchBillions.toFixed(0)} miliardi**`,
      ].join('\n'),
    };
  }

  // ─── Gravity Correction (OG adjustment with sugar) ────────────────────────

  private calcGravityCorrection(args: BrewingCalculatorInput): ExecutableToolResult {
    const current = this.req(args.current_gravity, 'current_gravity');
    const target = this.req(args.target_gravity, 'target_gravity');
    const volume = this.req(args.volume_liters, 'volume_liters');
    if (target <= current) return { isError: true, output: 'Target gravity must be > current gravity.' };
    const missingPtL = ((target - current) * 1000) * volume;
    const sugarGrams = (missingPtL / SUCROSE_YIELD) * 1000;
    return {
      output: [
        `Correzione OG: aggiungi **${sugarGrams.toFixed(0)} g** di saccarosio`,
        `  Da ${current.toFixed(3)} a ${target.toFixed(3)} — ${volume.toFixed(1)} L`,
        `  Punti mancanti: ${missingPtL.toFixed(0)} punti·L`,
      ].join('\n'),
    };
  }

  // ─── Dilution ─────────────────────────────────────────────────────────────

  private calcDilution(args: BrewingCalculatorInput): ExecutableToolResult {
    const volume = this.req(args.volume_liters, 'volume_liters');
    const curr = this.req(args.current_gravity, 'current_gravity');
    const target = this.req(args.target_gravity, 'target_gravity');
    if (curr <= target) return { isError: true, output: 'Current gravity must be > target.' };
    const dilution = volume * ((curr - 1) / (target - 1) - 1);
    return { output: `Aggiungi **${dilution.toFixed(1)} L** di acqua per diluire da ${curr.toFixed(3)} a ${target.toFixed(3)} (volume finale: ${(volume + dilution).toFixed(1)} L)` };
  }

  // ─── Boil Off ─────────────────────────────────────────────────────────────

  private calcBoilOff(args: BrewingCalculatorInput): ExecutableToolResult {
    const p = this.waterParameters(args);
    const evaporated = this.boilOffL(args);
    const preBoil = this.preBoilL(args);
    const percent = preBoil > 0 ? evaporated / preBoil * 100 : 0;
    return {
      output: [
        `Evaporazione: **${evaporated.toFixed(1)} L** (${percent.toFixed(1)}%)`,
        `  Tasso: ${p.boilOffRate} L/h, durata: ${p.boilMinutes} min`,
        `  Pre-boil: ${preBoil.toFixed(1)} L → post-boil caldo: ${(preBoil - evaporated).toFixed(1)} L`,
      ].join('\n'),
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

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
