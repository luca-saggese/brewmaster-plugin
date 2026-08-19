/**
 * Water profile calculator — adjust mineral additions for any beer style.
 */

import { z } from 'zod';

import type { BuiltinTool, ExecutableToolResult, ToolExecution } from '../shim/tool-contract';
import { registerTool } from '../shim/tool-registry';
import { toInputJsonSchema } from '../shim/input-schema';

// ── Salt contributions: mg/L per g/L of salt added ──────────────────────
// Dihydrate forms: CaSO₄·2H₂O, CaCl₂·2H₂O, MgSO₄·7H₂O
const SALT = {
  gypsum:  { ca: 232.8, mg: 0, na: 0, cl: 0, so4: 557.9, hco3: 0, label: 'Gesso (CaSO₄·2H₂O)' },
  cacl2:   { ca: 272.6, mg: 0, na: 0, cl: 482.3, so4: 0, hco3: 0, label: 'CaCl₂·2H₂O' },
  epsom:   { ca: 0, mg: 98.6, na: 0, cl: 0, so4: 389.8, hco3: 0, label: 'Epsom (MgSO₄·7H₂O)' },
  nahco3:  { ca: 0, mg: 0, na: 273.7, cl: 0, so4: 0, hco3: 726.3, label: 'NaHCO₃' },
} as const;

export const WaterProfileCalculatorInputSchema = z.object({
  source_water: z.object({
    ca: z.number(), mg: z.number(), na: z.number(), cl: z.number(), so4: z.number(), hco3: z.number(),
  }),
  target_profile: z.enum([
    'pilsner', 'helles', 'dortmunder', 'vienna', 'marzen', 'bock', 'doppelbock',
    'dunkel', 'schwarzbier', 'kolsch', 'altbier', 'weissbier', 'dunkelweizen',
    'berliner_weisse', 'gose', 'lambic', 'saison', 'belgian_pale', 'belgian_dubbel',
    'belgian_tripel', 'belgian_golden_strong', 'belgian_dark_strong', 'witbier',
    'biere_de_garde', 'british_pale', 'british_ipa', 'british_stout', 'porter', 'mild',
    'bitter', 'esb', 'barleywine', 'old_ale', 'scotch_ale', 'american_pale',
    'american_ipa', 'double_ipa', 'american_stout', 'imperial_stout', 'neipa',
    'cream_ale', 'blonde_ale', 'california_common', 'american_lager', 'light_lager',
    'premium_lager', 'amber_lager', 'dark_lager', 'baltic_porter', 'rauchbier',
    'roggenbier', 'dampfbier', 'fruit_beer', 'spice_beer', 'wood_aged', 'sour_ale',
    'brett_beer', 'mixed_fermentation', 'kveik_ale', 'brut_ipa', 'session_ipa',
    'wheat_ipa', 'black_ipa', 'red_ipa', 'white_ipa', 'belgian_ipa', 'new_england_ipa',
    'milk_stout', 'oatmeal_stout', 'dry_stout', 'foreign_extra_stout', 'american_porter',
    'brown_ale', 'amber_ale', 'red_ale', 'irish_red', 'scottish_light', 'scottish_heavy',
    'scottish_export', 'wee_heavy', 'english_ipa', 'strong_bitter', 'brown_porter',
    'robust_porter', 'imperial_stout_ris', 'flanders_red', 'flanders_brown',
    'oud_bruin', 'lambic_gueuze', 'lambic_kriek', 'lambic_framboise',
  ]),
  batch_size_liters: z.number().optional()
    .describe('IGNORATO — usa mash_water_liters e/o sparge_water_liters. Questo campo è conservato per compatibilità ma non viene usato nei calcoli.'),
  mash_water_liters: z.number().positive().optional()
    .describe('Volume acqua di ammostamento in litri. Se omesso, calcolato automaticamente da grain_kg + mash_ratio_l_per_kg + dead_space_l.'),
  sparge_water_liters: z.number().nonnegative().optional()
    .describe('Volume acqua di sparge in litri. Se omesso, calcolato automaticamente da pre_boil_target_l + grain_kg × grain_absorption_l_per_kg − mash_water_liters.'),
  grain_kg: z.number().positive().optional()
    .describe('Peso totale dei grani in kg. Necessario per il calcolo automatico dei volumi di mash e sparge.'),
  mash_ratio_l_per_kg: z.number().positive().optional()
    .describe('Rapporto acqua/malto in L/kg. Default: 3.0.'),
  dead_space_l: z.number().nonnegative().optional()
    .describe('Spazio morto sotto/intorno al cestello in litri (es. BrewZilla Gen 3.1.1: ~6.5 L, Gen 4: ~5–6 L). Default: 6.5.'),
  grain_absorption_l_per_kg: z.number().positive().optional()
    .describe('Assorbimento delle trebbie in L/kg. Default: 0.9 (range tipico 0.8–0.95 per sistemi single-vessel).'),
  pre_boil_target_l: z.number().positive().optional()
    .describe('Volume pre-boil target in litri. Se omesso, calcolato da fermenter_target_l + boil_off_l_per_hour × boil_duration_h + trub_loss_l.'),
  fermenter_target_l: z.number().positive().optional()
    .describe('Volume target nel fermentatore in litri (es. 20–23 L). Usato per calcolare automaticamente il pre-boil.'),
  boil_off_l_per_hour: z.number().nonnegative().optional()
    .describe('Tasso di evaporazione in L/h. Default: 3.0. Misuralo sul tuo impianto.'),
  boil_duration_h: z.number().positive().optional()
    .describe('Durata bollitura in ore. Default: 1.0.'),
  trub_loss_l: z.number().nonnegative().optional()
    .describe('Perdite di trub e trasferimento in litri. Default: 2.0.'),
  target_ph: z.number().optional(),
});

export type WaterProfileCalculatorInput = z.infer<typeof WaterProfileCalculatorInputSchema>;

interface WaterTarget { ca: number; mg: number; na: number; cl: number; so4: number; hco3: number; desc: string }

const WATER: Record<string, WaterTarget> = {
  pilsner: { ca: 10, mg: 2, na: 2, cl: 5, so4: 5, hco3: 15, desc: 'Pilsen — very soft' },
  helles: { ca: 50, mg: 10, na: 5, cl: 60, so4: 15, hco3: 50, desc: 'Munich Helles' },
  dortmunder: { ca: 250, mg: 25, na: 70, cl: 100, so4: 300, hco3: 550, desc: 'Dortmund' },
  vienna: { ca: 200, mg: 60, na: 8, cl: 12, so4: 125, hco3: 120, desc: 'Vienna' },
  marzen: { ca: 150, mg: 40, na: 10, cl: 60, so4: 80, hco3: 200, desc: 'Märzen' },
  bock: { ca: 100, mg: 30, na: 15, cl: 80, so4: 40, hco3: 250, desc: 'Bock' },
  doppelbock: { ca: 80, mg: 25, na: 10, cl: 70, so4: 30, hco3: 200, desc: 'Doppelbock' },
  dunkel: { ca: 120, mg: 35, na: 12, cl: 90, so4: 50, hco3: 300, desc: 'Dunkel' },
  schwarzbier: { ca: 100, mg: 30, na: 10, cl: 70, so4: 40, hco3: 250, desc: 'Schwarzbier' },
  kolsch: { ca: 80, mg: 15, na: 20, cl: 60, so4: 40, hco3: 150, desc: 'Kölsch' },
  altbier: { ca: 150, mg: 30, na: 25, cl: 80, so4: 100, hco3: 200, desc: 'Altbier' },
  weissbier: { ca: 50, mg: 15, na: 10, cl: 40, so4: 20, hco3: 100, desc: 'Weissbier' },
  dunkelweizen: { ca: 60, mg: 20, na: 12, cl: 50, so4: 25, hco3: 150, desc: 'Dunkelweizen' },
  berliner_weisse: { ca: 50, mg: 10, na: 10, cl: 40, so4: 20, hco3: 100, desc: 'Berliner Weisse' },
  gose: { ca: 80, mg: 20, na: 50, cl: 100, so4: 40, hco3: 150, desc: 'Gose' },
  lambic: { ca: 60, mg: 15, na: 20, cl: 60, so4: 30, hco3: 200, desc: 'Lambic' },
  saison: { ca: 100, mg: 20, na: 15, cl: 50, so4: 80, hco3: 100, desc: 'Saison' },
  belgian_pale: { ca: 80, mg: 20, na: 15, cl: 60, so4: 50, hco3: 150, desc: 'Belgian Pale' },
  belgian_dubbel: { ca: 60, mg: 20, na: 15, cl: 70, so4: 30, hco3: 200, desc: 'Belgian Dubbel' },
  belgian_tripel: { ca: 80, mg: 25, na: 15, cl: 60, so4: 40, hco3: 150, desc: 'Belgian Tripel' },
  belgian_golden_strong: { ca: 70, mg: 20, na: 12, cl: 55, so4: 35, hco3: 120, desc: 'Belgian Golden Strong' },
  belgian_dark_strong: { ca: 60, mg: 20, na: 15, cl: 65, so4: 30, hco3: 200, desc: 'Belgian Dark Strong' },
  witbier: { ca: 50, mg: 15, na: 10, cl: 40, so4: 20, hco3: 100, desc: 'Witbier' },
  biere_de_garde: { ca: 100, mg: 25, na: 15, cl: 60, so4: 50, hco3: 150, desc: 'Bière de Garde' },
  british_pale: { ca: 100, mg: 20, na: 15, cl: 60, so4: 80, hco3: 100, desc: 'British Pale Ale' },
  british_ipa: { ca: 150, mg: 25, na: 20, cl: 60, so4: 200, hco3: 100, desc: 'British IPA' },
  british_stout: { ca: 100, mg: 25, na: 30, cl: 80, so4: 40, hco3: 250, desc: 'British Stout' },
  porter: { ca: 100, mg: 25, na: 25, cl: 80, so4: 50, hco3: 200, desc: 'Porter' },
  mild: { ca: 80, mg: 20, na: 20, cl: 70, so4: 40, hco3: 200, desc: 'Mild' },
  bitter: { ca: 100, mg: 20, na: 15, cl: 60, so4: 80, hco3: 100, desc: 'Bitter' },
  esb: { ca: 120, mg: 25, na: 20, cl: 70, so4: 100, hco3: 150, desc: 'ESB' },
  barleywine: { ca: 80, mg: 25, na: 20, cl: 70, so4: 50, hco3: 200, desc: 'Barleywine' },
  old_ale: { ca: 80, mg: 25, na: 25, cl: 75, so4: 45, hco3: 250, desc: 'Old Ale' },
  scotch_ale: { ca: 60, mg: 20, na: 15, cl: 60, so4: 30, hco3: 200, desc: 'Scotch Ale' },
  american_pale: { ca: 100, mg: 20, na: 15, cl: 60, so4: 100, hco3: 100, desc: 'American Pale Ale' },
  american_ipa: { ca: 120, mg: 25, na: 20, cl: 60, so4: 200, hco3: 100, desc: 'American IPA' },
  double_ipa: { ca: 150, mg: 30, na: 20, cl: 70, so4: 250, hco3: 100, desc: 'Double IPA' },
  american_stout: { ca: 100, mg: 25, na: 30, cl: 80, so4: 50, hco3: 250, desc: 'American Stout' },
  imperial_stout: { ca: 100, mg: 30, na: 35, cl: 90, so4: 60, hco3: 300, desc: 'Imperial Stout' },
  neipa: { ca: 100, mg: 20, na: 30, cl: 150, so4: 50, hco3: 150, desc: 'NEIPA — high chloride' },
  cream_ale: { ca: 50, mg: 10, na: 10, cl: 40, so4: 20, hco3: 100, desc: 'Cream Ale' },
  blonde_ale: { ca: 60, mg: 15, na: 12, cl: 50, so4: 30, hco3: 100, desc: 'Blonde Ale' },
  california_common: { ca: 100, mg: 20, na: 20, cl: 60, so4: 80, hco3: 150, desc: 'California Common' },
  american_lager: { ca: 30, mg: 8, na: 10, cl: 30, so4: 15, hco3: 50, desc: 'American Lager' },
  light_lager: { ca: 20, mg: 5, na: 8, cl: 20, so4: 10, hco3: 30, desc: 'Light Lager' },
  premium_lager: { ca: 40, mg: 10, na: 10, cl: 35, so4: 20, hco3: 60, desc: 'Premium Lager' },
  amber_lager: { ca: 80, mg: 20, na: 15, cl: 60, so4: 40, hco3: 150, desc: 'Amber Lager' },
  dark_lager: { ca: 100, mg: 25, na: 20, cl: 70, so4: 50, hco3: 200, desc: 'Dark Lager' },
  baltic_porter: { ca: 100, mg: 30, na: 25, cl: 80, so4: 60, hco3: 250, desc: 'Baltic Porter' },
  rauchbier: { ca: 100, mg: 25, na: 20, cl: 70, so4: 50, hco3: 200, desc: 'Rauchbier' },
  roggenbier: { ca: 80, mg: 20, na: 15, cl: 60, so4: 30, hco3: 150, desc: 'Roggenbier' },
  dampfbier: { ca: 60, mg: 15, na: 12, cl: 50, so4: 25, hco3: 100, desc: 'Dampfbier' },
  sour_ale: { ca: 60, mg: 15, na: 20, cl: 60, so4: 30, hco3: 100, desc: 'Sour Ale' },
  brett_beer: { ca: 70, mg: 18, na: 15, cl: 55, so4: 40, hco3: 120, desc: 'Brett Beer' },
  mixed_fermentation: { ca: 60, mg: 15, na: 20, cl: 60, so4: 30, hco3: 100, desc: 'Mixed Fermentation' },
  kveik_ale: { ca: 80, mg: 20, na: 15, cl: 60, so4: 40, hco3: 100, desc: 'Kveik Ale' },
  brut_ipa: { ca: 100, mg: 25, na: 15, cl: 50, so4: 150, hco3: 50, desc: 'Brut IPA' },
  session_ipa: { ca: 80, mg: 20, na: 15, cl: 60, so4: 100, hco3: 100, desc: 'Session IPA' },
  wheat_ipa: { ca: 80, mg: 20, na: 15, cl: 60, so4: 80, hco3: 100, desc: 'Wheat IPA' },
  black_ipa: { ca: 100, mg: 25, na: 25, cl: 70, so4: 100, hco3: 150, desc: 'Black IPA' },
  red_ipa: { ca: 100, mg: 25, na: 20, cl: 70, so4: 100, hco3: 150, desc: 'Red IPA' },
  white_ipa: { ca: 70, mg: 18, na: 15, cl: 60, so4: 60, hco3: 100, desc: 'White IPA' },
  belgian_ipa: { ca: 90, mg: 22, na: 18, cl: 60, so4: 80, hco3: 100, desc: 'Belgian IPA' },
  new_england_ipa: { ca: 100, mg: 20, na: 30, cl: 150, so4: 50, hco3: 150, desc: 'NEIPA' },
  milk_stout: { ca: 80, mg: 20, na: 25, cl: 70, so4: 40, hco3: 200, desc: 'Milk Stout' },
  oatmeal_stout: { ca: 80, mg: 20, na: 25, cl: 70, so4: 40, hco3: 200, desc: 'Oatmeal Stout' },
  dry_stout: { ca: 100, mg: 25, na: 30, cl: 80, so4: 50, hco3: 250, desc: 'Dry Stout' },
  foreign_extra_stout: { ca: 100, mg: 25, na: 30, cl: 80, so4: 50, hco3: 250, desc: 'Foreign Extra Stout' },
  american_porter: { ca: 100, mg: 25, na: 25, cl: 80, so4: 50, hco3: 200, desc: 'American Porter' },
  brown_ale: { ca: 80, mg: 20, na: 20, cl: 70, so4: 50, hco3: 150, desc: 'Brown Ale' },
  amber_ale: { ca: 80, mg: 20, na: 20, cl: 70, so4: 60, hco3: 150, desc: 'Amber Ale' },
  red_ale: { ca: 80, mg: 20, na: 20, cl: 70, so4: 60, hco3: 150, desc: 'Red Ale' },
  irish_red: { ca: 80, mg: 20, na: 20, cl: 70, so4: 50, hco3: 150, desc: 'Irish Red' },
  scottish_light: { ca: 60, mg: 15, na: 15, cl: 60, so4: 30, hco3: 150, desc: 'Scottish Light' },
  scottish_heavy: { ca: 70, mg: 18, na: 15, cl: 65, so4: 35, hco3: 180, desc: 'Scottish Heavy' },
  scottish_export: { ca: 80, mg: 20, na: 15, cl: 70, so4: 40, hco3: 200, desc: 'Scottish Export' },
  wee_heavy: { ca: 80, mg: 25, na: 20, cl: 70, so4: 40, hco3: 250, desc: 'Wee Heavy' },
  english_ipa: { ca: 120, mg: 25, na: 20, cl: 60, so4: 150, hco3: 100, desc: 'English IPA' },
  strong_bitter: { ca: 120, mg: 22, na: 18, cl: 65, so4: 100, hco3: 120, desc: 'Strong Bitter' },
  brown_porter: { ca: 80, mg: 20, na: 20, cl: 70, so4: 40, hco3: 180, desc: 'Brown Porter' },
  robust_porter: { ca: 100, mg: 22, na: 22, cl: 75, so4: 50, hco3: 200, desc: 'Robust Porter' },
  imperial_stout_ris: { ca: 100, mg: 30, na: 35, cl: 90, so4: 60, hco3: 300, desc: 'Imperial Stout RIS' },
  flanders_red: { ca: 60, mg: 15, na: 20, cl: 60, so4: 30, hco3: 100, desc: 'Flanders Red' },
  flanders_brown: { ca: 60, mg: 15, na: 20, cl: 60, so4: 30, hco3: 100, desc: 'Flanders Brown' },
  oud_bruin: { ca: 60, mg: 15, na: 20, cl: 60, so4: 30, hco3: 100, desc: 'Oud Bruin' },
  lambic_gueuze: { ca: 60, mg: 15, na: 20, cl: 60, so4: 30, hco3: 200, desc: 'Gueuze' },
  lambic_kriek: { ca: 60, mg: 15, na: 20, cl: 60, so4: 30, hco3: 200, desc: 'Kriek' },
  lambic_framboise: { ca: 60, mg: 15, na: 20, cl: 60, so4: 30, hco3: 200, desc: 'Framboise' },
};

export class WaterProfileCalculatorTool implements BuiltinTool<WaterProfileCalculatorInput> {
  readonly name = 'water_profile_calculator' as const;
  readonly description =
    'Calculate water mineral additions (gypsum, CaCl2, Epsom, baking soda, lactic acid) to hit a target water profile for any beer style. Uses a multi-variable solver that accounts for cross-ion contributions. ' +
    'Can auto-calculate mash & sparge water volumes from grain bill, dead space, absorption, and pre-boil/fermenter targets (BrewZilla-style). ' +
    'Pass grain_kg + fermenter_target_l for full auto mode, or mash_water_liters + sparge_water_liters for manual mode.';
  readonly parameters: Record<string, unknown> = toInputJsonSchema(WaterProfileCalculatorInputSchema);

  resolveExecution(args: WaterProfileCalculatorInput): ToolExecution {
    return {
      description: `Water profile: ${args.target_profile}`,
      approvalRule: this.name,
      execute: () => this.execute(args),
    };
  }

  private execute(args: WaterProfileCalculatorInput): Promise<ExecutableToolResult> {
    try {
      const t = WATER[args.target_profile];
      if (!t) return Promise.resolve({ isError: true, output: `Unknown: "${args.target_profile}"` });
      const s = args.source_water;

      // ── Water volume ──────────────────────────────────────────────────
      // Defaults for auto-calculation
      const MASH_RATIO = args.mash_ratio_l_per_kg ?? 3.0;
      const DEAD_SPACE = args.dead_space_l ?? 6.5;
      const ABSORPTION = args.grain_absorption_l_per_kg ?? 0.9;
      const BOIL_OFF = args.boil_off_l_per_hour ?? 3.0;
      const BOIL_HOURS = args.boil_duration_h ?? 1.0;
      const TRUB_LOSS = args.trub_loss_l ?? 2.0;

      // Resolve pre-boil target: explicit > computed from fermenter > fallback
      let preBoilTarget = args.pre_boil_target_l;
      if (preBoilTarget == null && args.fermenter_target_l != null) {
        preBoilTarget = args.fermenter_target_l + BOIL_OFF * BOIL_HOURS + TRUB_LOSS;
      }

      // Resolve mash & sparge volumes
      let mashVol = args.mash_water_liters;
      let spargeVol = args.sparge_water_liters;

      if (args.grain_kg != null && args.grain_kg > 0) {
        // Auto-calculate mash water if not explicitly provided
        if (mashVol == null) {
          mashVol = args.grain_kg * MASH_RATIO + DEAD_SPACE;
        }
        // Auto-calculate sparge water if not explicitly provided and we have pre-boil
        if (spargeVol == null && preBoilTarget != null) {
          const absorptionLoss = args.grain_kg * ABSORPTION;
          spargeVol = preBoilTarget + absorptionLoss - mashVol;
          if (spargeVol < 0) spargeVol = 0;
        }
      }

      // Fallback: if still no mash, use 0
      if (mashVol == null) mashVol = 0;
      if (spargeVol == null) spargeVol = 0;

      const totalVol = mashVol + spargeVol;
      if (totalVol <= 0) {
        return Promise.resolve({
          isError: true,
          output: 'Specificare mash_water_liters e/o sparge_water_liters, oppure grain_kg + fermenter_target_l per il calcolo automatico.',
        });
      }

      // ── Multi-variable solver ─────────────────────────────────────────
      // We solve for g/L of each salt, then scale by totalVol.
      //   final = source + Σ(salt_g_l × SALT[salt])
      // Minimise sum-of-squared errors with sensible bounds.
      //
      // Bounds (g/L of each salt):
      const MAX_GYPSUM = 3;   // ~700 mg/L Ca, ~1670 mg/L SO₄ — way above any sane target
      const MAX_CACL2 = 3;
      const MAX_EPSOM = 2;
      const MAX_NAHCO3 = 2;

      let best: { gypsum: number; cacl2: number; epsom: number; nahco3: number; error: number } | null = null;

      // Coarse grid search, then refine around the best candidate.
      for (let pass = 0; pass < 2; pass++) {
        const steps = pass === 0 ? 20 : 5;
        const b = best!;
        const gRange: number = pass === 0 ? MAX_GYPSUM : Math.min(b.gypsum + 0.3, MAX_GYPSUM);
        const gMin: number = pass === 0 ? 0 : Math.max(b.gypsum - 0.3, 0);
        const cRange: number = pass === 0 ? MAX_CACL2 : Math.min(b.cacl2 + 0.3, MAX_CACL2);
        const cMin: number = pass === 0 ? 0 : Math.max(b.cacl2 - 0.3, 0);
        const eRange: number = pass === 0 ? MAX_EPSOM : Math.min(b.epsom + 0.3, MAX_EPSOM);
        const eMin: number = pass === 0 ? 0 : Math.max(b.epsom - 0.3, 0);
        const nRange: number = pass === 0 ? MAX_NAHCO3 : Math.min(b.nahco3 + 0.3, MAX_NAHCO3);
        const nMin: number = pass === 0 ? 0 : Math.max(b.nahco3 - 0.3, 0);

        for (let gi = 0; gi <= steps; gi++) {
          const gypsum = gMin + (gRange - gMin) * gi / steps;
          for (let ci = 0; ci <= steps; ci++) {
            const cacl2 = cMin + (cRange - cMin) * ci / steps;
            for (let ei = 0; ei <= steps; ei++) {
              const epsom = eMin + (eRange - eMin) * ei / steps;
              for (let ni = 0; ni <= steps; ni++) {
                const nahco3 = nMin + (nRange - nMin) * ni / steps;

                const finalCa = s.ca + gypsum * SALT.gypsum.ca + cacl2 * SALT.cacl2.ca;
                const finalMg = s.mg + epsom * SALT.epsom.mg;
                const finalNa = s.na + nahco3 * SALT.nahco3.na;
                const finalCl = s.cl + cacl2 * SALT.cacl2.cl;
                const finalSo4 = s.so4 + gypsum * SALT.gypsum.so4 + epsom * SALT.epsom.so4;
                const finalHco3 = s.hco3 + nahco3 * SALT.nahco3.hco3;

                // Penalty: squared relative error per ion
                const errCa = t.ca > 0 ? ((finalCa - t.ca) / t.ca) ** 2 : (finalCa ** 2);
                const errMg = t.mg > 0 ? ((finalMg - t.mg) / t.mg) ** 2 : (finalMg ** 2);
                const errNa = t.na > 0 ? ((finalNa - t.na) / t.na) ** 2 : (finalNa ** 2);
                const errCl = t.cl > 0 ? ((finalCl - t.cl) / t.cl) ** 2 : (finalCl ** 2);
                const errSo4 = t.so4 > 0 ? ((finalSo4 - t.so4) / t.so4) ** 2 : (finalSo4 ** 2);
                const errHco3 = t.hco3 > 0 ? ((finalHco3 - t.hco3) / t.hco3) ** 2 : (finalHco3 ** 2);

                // Penalty for overshooting sensible ranges
                const overCa = finalCa > 200 ? (finalCa - 200) * 0.1 : 0;
                const overMg = finalMg > 30 ? (finalMg - 30) * 0.1 : 0;
                const overNa = finalNa > 150 ? (finalNa - 150) * 0.1 : 0;
                const overCl = finalCl > 300 ? (finalCl - 300) * 0.1 : 0;
                const overSo4 = finalSo4 > 400 ? (finalSo4 - 400) * 0.1 : 0;

                const error = errCa + errMg + errNa + errCl + errSo4 + errHco3 + overCa + overMg + overNa + overCl + overSo4;

                if (best === null || error < best.error) {
                  best = { gypsum, cacl2, epsom, nahco3, error };
                }
              }
            }
          }
        }
      }

      if (!best) {
        return Promise.resolve({ isError: true, output: 'Impossibile trovare una combinazione di sali valida.' });
      }

      // ── Compute final profile ─────────────────────────────────────────
      const g = best.gypsum;
      const cc = best.cacl2;
      const e = best.epsom;
      const n = best.nahco3;

      const finalCa = s.ca + g * SALT.gypsum.ca + cc * SALT.cacl2.ca;
      const finalMg = s.mg + e * SALT.epsom.mg;
      const finalNa = s.na + n * SALT.nahco3.na;
      const finalCl = s.cl + cc * SALT.cacl2.cl;
      const finalSo4 = s.so4 + g * SALT.gypsum.so4 + e * SALT.epsom.so4;
      const finalHco3 = s.hco3 + n * SALT.nahco3.hco3;

      // ── Lactic acid for HCO₃ reduction ────────────────────────────────
      // 88% lactic acid: ~11.75 mmol/mL, HCO₃ MW = 61.016 g/mol
      // mL needed = (hco3Reduction_mg_L × totalVol_L) / (61.016 × 11.75)
      //           = hco3Reduction_mg_L × totalVol_L × 0.001394
      const hco3Reduction = s.hco3 - t.hco3; // positive = need to reduce
      let acidMl = 0;
      if (hco3Reduction > 50) {
        acidMl = hco3Reduction * totalVol * 0.001394;
      }

      // ── Build output ──────────────────────────────────────────────────
      const lines: string[] = [
        `Profilo acqua per **${args.target_profile}** (${t.desc})`,
        '',
        `Volume acqua totale: ${totalVol.toFixed(1)} L (mash ${mashVol.toFixed(1)} L, sparge ${spargeVol.toFixed(1)} L)`,
      ];

      // ── Volume breakdown (if auto-calculated) ─────────────────────────
      if (args.grain_kg != null && args.grain_kg > 0) {
        const pctMash = totalVol > 0 ? (mashVol / totalVol * 100) : 0;
        const pctSparge = totalVol > 0 ? (spargeVol / totalVol * 100) : 0;
        lines.push(
          '',
          'Dettaglio calcolo volumi:',
          `  • Grani: ${args.grain_kg} kg`,
          `  • Rapporto mash: ${MASH_RATIO} L/kg → ${(args.grain_kg * MASH_RATIO).toFixed(1)} L`,
          `  • Spazio morto (dead space): ${DEAD_SPACE} L`,
          `  • Mash = ${(args.grain_kg * MASH_RATIO).toFixed(1)} + ${DEAD_SPACE} = ${mashVol.toFixed(1)} L`,
        );
        if (preBoilTarget != null) {
          const absorptionLoss = args.grain_kg * ABSORPTION;
          lines.push(
            `  • Pre-boil target: ${preBoilTarget.toFixed(1)} L`,
            `  • Assorbimento trebbie: ${args.grain_kg} × ${ABSORPTION} = ${absorptionLoss.toFixed(1)} L`,
            `  • Sparge = ${preBoilTarget.toFixed(1)} + ${absorptionLoss.toFixed(1)} − ${mashVol.toFixed(1)} = ${spargeVol.toFixed(1)} L`,
          );
        }
        if (args.fermenter_target_l != null) {
          lines.push(
            `  • Fermentatore target: ${args.fermenter_target_l} L`,
            `  • Evaporazione: ${BOIL_OFF} L/h × ${BOIL_HOURS} h = ${(BOIL_OFF * BOIL_HOURS).toFixed(1)} L`,
            `  • Perdite trub/trasferimento: ${TRUB_LOSS} L`,
            `  • Pre-boil = ${args.fermenter_target_l} + ${(BOIL_OFF * BOIL_HOURS).toFixed(1)} + ${TRUB_LOSS} = ${preBoilTarget!.toFixed(1)} L`,
          );
        }
        lines.push(
          '',
          `Ripartizione: mash ${pctMash.toFixed(0)}% / sparge ${pctSparge.toFixed(0)}%`,
        );
      }

      lines.push(
        '',
        'Acqua sorgente → target → risultato:',
        `  Ca:   ${s.ca} → ${t.ca} → ${finalCa.toFixed(1)} mg/L`,
        `  Mg:   ${s.mg} → ${t.mg} → ${finalMg.toFixed(1)} mg/L`,
        `  Na:   ${s.na} → ${t.na} → ${finalNa.toFixed(1)} mg/L`,
        `  Cl:   ${s.cl} → ${t.cl} → ${finalCl.toFixed(1)} mg/L`,
        `  SO₄:  ${s.so4} → ${t.so4} → ${finalSo4.toFixed(1)} mg/L`,
        `  HCO₃: ${s.hco3} → ${t.hco3} → ${finalHco3.toFixed(1)} mg/L`,
        '',
        'Aggiunte consigliate (acqua totale):',
      );

      const adds: string[] = [];
      const gypsumG = g * totalVol;
      const cacl2G = cc * totalVol;
      const epsomG = e * totalVol;
      const nahco3G = n * totalVol;

      if (gypsumG > 0.05) adds.push(`  • ${SALT.gypsum.label}: ~${gypsumG.toFixed(1)} g`);
      if (cacl2G > 0.05) adds.push(`  • ${SALT.cacl2.label}: ~${cacl2G.toFixed(1)} g`);
      if (epsomG > 0.05) adds.push(`  • ${SALT.epsom.label}: ~${epsomG.toFixed(1)} g`);
      if (nahco3G > 0.05) adds.push(`  • ${SALT.nahco3.label}: ~${nahco3G.toFixed(1)} g`);
      if (acidMl > 0.5) adds.push(`  • Acido lattico 88%: ~${acidMl.toFixed(1)} ml (nel mash)`);

      if (adds.length === 0) adds.push('  • Nessuna aggiunta necessaria.');
      lines.push(...adds);

      // ── Warnings for residual deviations ──────────────────────────────
      const warnings: string[] = [];
      const so4Dev = finalSo4 - t.so4;
      if (Math.abs(so4Dev) > 10) {
        warnings.push(`  ⚠ SO₄ devia di ${so4Dev > 0 ? '+' : ''}${so4Dev.toFixed(0)} mg/L dal target (compromesso con Ca/Mg).`);
      }
      const naDev = finalNa - t.na;
      if (Math.abs(naDev) > 10) {
        warnings.push(`  ⚠ Na devia di ${naDev > 0 ? '+' : ''}${naDev.toFixed(0)} mg/L dal target (legato a HCO₃).`);
      }
      if (acidMl > 0.5) {
        warnings.push('  ⚠ L\'acido lattico è una stima. Il pH reale dipende da alcalinità, grist e pH target.');
      }
      if (warnings.length > 0) {
        lines.push('', 'Note:', ...warnings);
      }

      return Promise.resolve({ output: lines.join('\n') });
    } catch (e) {
      return Promise.resolve({ isError: true, output: e instanceof Error ? e.message : String(e) });
    }
  }
}

registerTool(WaterProfileCalculatorTool);
