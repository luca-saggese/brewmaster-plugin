/**
 * YAML recipe validator — reads a beer recipe YAML, validates it against
 * BJCP style guidelines with deterministic checks, then produces an LLM
 * review prompt with full context for deep qualitative analysis.
 */

import { z } from 'zod';
import { readFileSync, existsSync } from 'node:fs';
import * as yaml from 'js-yaml';

import type { BuiltinTool, ToolExecution, ExecutableToolResult } from '../shim/tool-contract';
import { registerTool } from '../shim/tool-registry';
import { toInputJsonSchema } from '../shim/input-schema';

export const CalculatorReferenceSchema = z.object({
  tool: z.string(),
  calculation: z.string().optional(),
  ok: z.boolean().optional(),
  status: z.string().optional(),
  result: z.record(z.string(), z.unknown()).nullable().optional(),
  errors: z.array(z.unknown()).optional(),
}).passthrough();
export type CalculatorReference = z.infer<typeof CalculatorReferenceSchema>;
const CalculatorReferencesSchema = z.union([CalculatorReferenceSchema, z.array(CalculatorReferenceSchema)]);
type CalculatorReferenceInput = CalculatorReference | CalculatorReference[];

export const YamlValidatorInputSchema = z.object({
  input_file: z.string().describe('Percorso del file YAML della ricetta.'),
  calculator_results: z.object({
    water: CalculatorReferencesSchema.optional(),
    brewing: CalculatorReferencesSchema.optional(),
    ibu: CalculatorReferencesSchema.optional(),
    priming: CalculatorReferencesSchema.optional(),
  }).optional().describe('Risultati JSON dei calculator già eseguiti.'),
});

export type YamlValidatorInput = z.infer<typeof YamlValidatorInputSchema>;

// ============================================================================
// COMPLETE BJCP 2021 STYLE DATABASE
// ============================================================================
// Sources: BJCP Style Guidelines 2021 edition.
// Fields: og_min, og_max, fg_min, fg_max, abv_min, abv_max, ibu_min, ibu_max,
//         ebc_min, ebc_max.  All gravities in SG, ABV in %, IBU as-is, EBC as-is.

export interface BjcpStyle {
  code: string; category: string; name: string;
  og_min: number; og_max: number; fg_min: number; fg_max: number;
  abv_min: number; abv_max: number; ibu_min: number; ibu_max: number;
  ebc_min: number; ebc_max: number;
}

const BJCP: Record<string, BjcpStyle> = {
  // ── Category 1: Standard American Beer ──
  '1A': { code: '1A', category: '1', name: 'American Light Lager', og_min: 1.028, og_max: 1.040, fg_min: 0.998, fg_max: 1.008, abv_min: 2.8, abv_max: 4.2, ibu_min: 8, ibu_max: 12, ebc_min: 4, ebc_max: 6 },
  '1B': { code: '1B', category: '1', name: 'American Lager', og_min: 1.040, og_max: 1.050, fg_min: 1.004, fg_max: 1.010, abv_min: 4.2, abv_max: 5.3, ibu_min: 8, ibu_max: 18, ebc_min: 4, ebc_max: 8 },
  '1C': { code: '1C', category: '1', name: 'Cream Ale', og_min: 1.042, og_max: 1.055, fg_min: 1.006, fg_max: 1.012, abv_min: 4.2, abv_max: 5.6, ibu_min: 8, ibu_max: 20, ebc_min: 4, ebc_max: 10 },
  '1D': { code: '1D', category: '1', name: 'American Wheat Beer', og_min: 1.040, og_max: 1.055, fg_min: 1.008, fg_max: 1.013, abv_min: 4.0, abv_max: 5.5, ibu_min: 15, ibu_max: 30, ebc_min: 6, ebc_max: 12 },
  // ── Category 2: International Lager ──
  '2A': { code: '2A', category: '2', name: 'International Pale Lager', og_min: 1.042, og_max: 1.050, fg_min: 1.008, fg_max: 1.012, abv_min: 4.6, abv_max: 6.0, ibu_min: 18, ibu_max: 25, ebc_min: 4, ebc_max: 10 },
  '2B': { code: '2B', category: '2', name: 'International Amber Lager', og_min: 1.042, og_max: 1.055, fg_min: 1.008, fg_max: 1.014, abv_min: 4.6, abv_max: 6.0, ibu_min: 8, ibu_max: 25, ebc_min: 14, ebc_max: 34 },
  '2C': { code: '2C', category: '2', name: 'International Dark Lager', og_min: 1.044, og_max: 1.056, fg_min: 1.008, fg_max: 1.012, abv_min: 4.5, abv_max: 6.0, ibu_min: 8, ibu_max: 20, ebc_min: 28, ebc_max: 50 },
  // ── Category 3: Czech Lager ──
  '3A': { code: '3A', category: '3', name: 'Czech Pale Lager', og_min: 1.028, og_max: 1.044, fg_min: 1.008, fg_max: 1.014, abv_min: 3.0, abv_max: 4.0, ibu_min: 20, ibu_max: 35, ebc_min: 6, ebc_max: 14 },
  '3B': { code: '3B', category: '3', name: 'Czech Premium Pale Lager', og_min: 1.044, og_max: 1.060, fg_min: 1.013, fg_max: 1.017, abv_min: 4.2, abv_max: 5.8, ibu_min: 30, ibu_max: 45, ebc_min: 6, ebc_max: 14 },
  '3C': { code: '3C', category: '3', name: 'Czech Amber Lager', og_min: 1.044, og_max: 1.060, fg_min: 1.013, fg_max: 1.017, abv_min: 4.4, abv_max: 5.8, ibu_min: 20, ibu_max: 35, ebc_min: 20, ebc_max: 40 },
  '3D': { code: '3D', category: '3', name: 'Czech Dark Lager', og_min: 1.044, og_max: 1.056, fg_min: 1.013, fg_max: 1.017, abv_min: 4.4, abv_max: 5.8, ibu_min: 18, ibu_max: 34, ebc_min: 34, ebc_max: 70 },
  // ── Category 4: Pale Malty European Lager ──
  '4A': { code: '4A', category: '4', name: 'Munich Helles', og_min: 1.044, og_max: 1.048, fg_min: 1.006, fg_max: 1.012, abv_min: 4.7, abv_max: 5.4, ibu_min: 16, ibu_max: 22, ebc_min: 6, ebc_max: 10 },
  '4B': { code: '4B', category: '4', name: 'Festbier', og_min: 1.054, og_max: 1.058, fg_min: 1.010, fg_max: 1.014, abv_min: 5.8, abv_max: 6.3, ibu_min: 18, ibu_max: 25, ebc_min: 8, ebc_max: 14 },
  '4C': { code: '4C', category: '4', name: 'Helles Bock', og_min: 1.064, og_max: 1.072, fg_min: 1.011, fg_max: 1.018, abv_min: 6.3, abv_max: 7.4, ibu_min: 23, ibu_max: 35, ebc_min: 12, ebc_max: 20 },
  // ── Category 5: Pale Bitter European Beer ──
  '5A': { code: '5A', category: '5', name: 'German Leichtbier', og_min: 1.026, og_max: 1.034, fg_min: 1.006, fg_max: 1.010, abv_min: 2.4, abv_max: 3.6, ibu_min: 15, ibu_max: 28, ebc_min: 4, ebc_max: 8 },
  '5B': { code: '5B', category: '5', name: 'Kölsch', og_min: 1.044, og_max: 1.050, fg_min: 1.007, fg_max: 1.011, abv_min: 4.4, abv_max: 5.2, ibu_min: 18, ibu_max: 30, ebc_min: 7, ebc_max: 10 },
  '5C': { code: '5C', category: '5', name: 'German Helles Exportbier', og_min: 1.048, og_max: 1.056, fg_min: 1.010, fg_max: 1.015, abv_min: 4.8, abv_max: 6.0, ibu_min: 20, ibu_max: 30, ebc_min: 8, ebc_max: 12 },
  '5D': { code: '5D', category: '5', name: 'German Pils', og_min: 1.044, og_max: 1.050, fg_min: 1.008, fg_max: 1.013, abv_min: 4.4, abv_max: 5.2, ibu_min: 22, ibu_max: 40, ebc_min: 4, ebc_max: 8 },
  // ── Category 6: Amber Malty European Lager ──
  '6A': { code: '6A', category: '6', name: 'Märzen', og_min: 1.054, og_max: 1.060, fg_min: 1.010, fg_max: 1.014, abv_min: 5.8, abv_max: 6.3, ibu_min: 18, ibu_max: 24, ebc_min: 16, ebc_max: 30 },
  '6B': { code: '6B', category: '6', name: 'Rauchbier', og_min: 1.050, og_max: 1.057, fg_min: 1.012, fg_max: 1.016, abv_min: 4.8, abv_max: 6.0, ibu_min: 20, ibu_max: 30, ebc_min: 24, ebc_max: 44 },
  '6C': { code: '6C', category: '6', name: 'Dunkels Bock', og_min: 1.064, og_max: 1.072, fg_min: 1.013, fg_max: 1.019, abv_min: 6.3, abv_max: 7.2, ibu_min: 20, ibu_max: 27, ebc_min: 28, ebc_max: 44 },
  // ── Category 7: Amber Bitter European Beer ──
  '7A': { code: '7A', category: '7', name: 'Vienna Lager', og_min: 1.048, og_max: 1.055, fg_min: 1.010, fg_max: 1.014, abv_min: 4.7, abv_max: 5.5, ibu_min: 18, ibu_max: 30, ebc_min: 18, ebc_max: 30 },
  '7B': { code: '7B', category: '7', name: 'Altbier', og_min: 1.044, og_max: 1.052, fg_min: 1.008, fg_max: 1.014, abv_min: 4.3, abv_max: 5.5, ibu_min: 25, ibu_max: 50, ebc_min: 22, ebc_max: 34 },
  // '7C': historical style — Kellerbier moved to 7C in some editions
  '7C': { code: '7C', category: '7', name: 'Kellerbier', og_min: 1.045, og_max: 1.051, fg_min: 1.008, fg_max: 1.013, abv_min: 4.7, abv_max: 5.4, ibu_min: 20, ibu_max: 35, ebc_min: 6, ebc_max: 20 },
  // ── Category 8: Dark European Lager ──
  '8A': { code: '8A', category: '8', name: 'Munich Dunkel', og_min: 1.048, og_max: 1.056, fg_min: 1.010, fg_max: 1.016, abv_min: 4.5, abv_max: 5.6, ibu_min: 18, ibu_max: 28, ebc_min: 28, ebc_max: 46 },
  '8B': { code: '8B', category: '8', name: 'Schwarzbier', og_min: 1.046, og_max: 1.052, fg_min: 1.010, fg_max: 1.016, abv_min: 4.4, abv_max: 5.4, ibu_min: 22, ibu_max: 30, ebc_min: 34, ebc_max: 62 },
  // ── Category 9: Strong European Beer ──
  '9A': { code: '9A', category: '9', name: 'Doppelbock', og_min: 1.072, og_max: 1.112, fg_min: 1.016, fg_max: 1.024, abv_min: 7.0, abv_max: 10.0, ibu_min: 16, ibu_max: 26, ebc_min: 24, ebc_max: 45 },
  '9B': { code: '9B', category: '9', name: 'Eisbock', og_min: 1.078, og_max: 1.120, fg_min: 1.020, fg_max: 1.035, abv_min: 9.0, abv_max: 14.0, ibu_min: 25, ibu_max: 35, ebc_min: 36, ebc_max: 68 },
  '9C': { code: '9C', category: '9', name: 'Baltic Porter', og_min: 1.060, og_max: 1.090, fg_min: 1.016, fg_max: 1.024, abv_min: 6.5, abv_max: 9.5, ibu_min: 20, ibu_max: 40, ebc_min: 34, ebc_max: 60 },
  // ── Category 10: German Wheat Beer ──
  '10A': { code: '10A', category: '10', name: 'Weissbier', og_min: 1.044, og_max: 1.052, fg_min: 1.010, fg_max: 1.014, abv_min: 4.3, abv_max: 5.6, ibu_min: 8, ibu_max: 15, ebc_min: 4, ebc_max: 14 },
  '10B': { code: '10B', category: '10', name: 'Dunkles Weissbier', og_min: 1.044, og_max: 1.056, fg_min: 1.010, fg_max: 1.014, abv_min: 4.3, abv_max: 5.6, ibu_min: 10, ibu_max: 18, ebc_min: 28, ebc_max: 46 },
  '10C': { code: '10C', category: '10', name: 'Weizenbock', og_min: 1.064, og_max: 1.090, fg_min: 1.015, fg_max: 1.022, abv_min: 6.5, abv_max: 9.0, ibu_min: 15, ibu_max: 30, ebc_min: 12, ebc_max: 44 },
  // ── Category 11: British Bitter ──
  '11A': { code: '11A', category: '11', name: 'Ordinary Bitter', og_min: 1.030, og_max: 1.039, fg_min: 1.007, fg_max: 1.011, abv_min: 3.2, abv_max: 3.8, ibu_min: 25, ibu_max: 35, ebc_min: 16, ebc_max: 28 },
  '11B': { code: '11B', category: '11', name: 'Best Bitter', og_min: 1.040, og_max: 1.048, fg_min: 1.008, fg_max: 1.012, abv_min: 3.8, abv_max: 4.6, ibu_min: 25, ibu_max: 40, ebc_min: 16, ebc_max: 28 },
  '11C': { code: '11C', category: '11', name: 'Strong Bitter', og_min: 1.048, og_max: 1.060, fg_min: 1.010, fg_max: 1.016, abv_min: 4.6, abv_max: 6.2, ibu_min: 30, ibu_max: 50, ebc_min: 18, ebc_max: 40 },
  // ── Category 12: Pale Commonwealth Beer ──
  '12A': { code: '12A', category: '12', name: 'British Golden Ale', og_min: 1.038, og_max: 1.053, fg_min: 1.006, fg_max: 1.012, abv_min: 3.8, abv_max: 5.0, ibu_min: 20, ibu_max: 45, ebc_min: 4, ebc_max: 12 },
  '12B': { code: '12B', category: '12', name: 'Australian Sparkling Ale', og_min: 1.038, og_max: 1.050, fg_min: 1.004, fg_max: 1.006, abv_min: 4.5, abv_max: 6.0, ibu_min: 20, ibu_max: 35, ebc_min: 4, ebc_max: 14 },
  '12C': { code: '12C', category: '12', name: 'English IPA', og_min: 1.050, og_max: 1.075, fg_min: 1.010, fg_max: 1.018, abv_min: 5.0, abv_max: 7.5, ibu_min: 40, ibu_max: 60, ebc_min: 12, ebc_max: 30 },
  // ── Category 13: Brown British Beer ──
  '13A': { code: '13A', category: '13', name: 'Dark Mild', og_min: 1.030, og_max: 1.038, fg_min: 1.008, fg_max: 1.013, abv_min: 3.0, abv_max: 3.8, ibu_min: 10, ibu_max: 25, ebc_min: 24, ebc_max: 44 },
  '13B': { code: '13B', category: '13', name: 'British Brown Ale', og_min: 1.040, og_max: 1.052, fg_min: 1.008, fg_max: 1.013, abv_min: 4.2, abv_max: 5.9, ibu_min: 20, ibu_max: 30, ebc_min: 24, ebc_max: 44 },
  '13C': { code: '13C', category: '13', name: 'English Porter', og_min: 1.040, og_max: 1.052, fg_min: 1.008, fg_max: 1.014, abv_min: 4.0, abv_max: 5.4, ibu_min: 18, ibu_max: 35, ebc_min: 40, ebc_max: 60 },
  // ── Category 14: Scottish Ale ──
  '14A': { code: '14A', category: '14', name: 'Scottish Light', og_min: 1.030, og_max: 1.035, fg_min: 1.010, fg_max: 1.013, abv_min: 2.5, abv_max: 3.2, ibu_min: 10, ibu_max: 20, ebc_min: 30, ebc_max: 50 },
  '14B': { code: '14B', category: '14', name: 'Scottish Heavy', og_min: 1.035, og_max: 1.040, fg_min: 1.010, fg_max: 1.015, abv_min: 3.2, abv_max: 3.9, ibu_min: 10, ibu_max: 20, ebc_min: 24, ebc_max: 40 },
  '14C': { code: '14C', category: '14', name: 'Scottish Export', og_min: 1.040, og_max: 1.060, fg_min: 1.010, fg_max: 1.016, abv_min: 3.9, abv_max: 6.0, ibu_min: 15, ibu_max: 30, ebc_min: 24, ebc_max: 40 },
  // ── Category 15: Irish Beer ──
  '15A': { code: '15A', category: '15', name: 'Irish Red Ale', og_min: 1.036, og_max: 1.046, fg_min: 1.010, fg_max: 1.014, abv_min: 3.8, abv_max: 5.0, ibu_min: 18, ibu_max: 28, ebc_min: 18, ebc_max: 36 },
  '15B': { code: '15B', category: '15', name: 'Irish Stout', og_min: 1.036, og_max: 1.044, fg_min: 1.007, fg_max: 1.011, abv_min: 4.0, abv_max: 4.5, ibu_min: 25, ibu_max: 45, ebc_min: 50, ebc_max: 80 },
  '15C': { code: '15C', category: '15', name: 'Irish Extra Stout', og_min: 1.052, og_max: 1.062, fg_min: 1.010, fg_max: 1.014, abv_min: 5.5, abv_max: 6.5, ibu_min: 35, ibu_max: 50, ebc_min: 60, ebc_max: 80 },
  // ── Category 16: Dark British Beer ──
  '16A': { code: '16A', category: '16', name: 'Sweet Stout', og_min: 1.044, og_max: 1.060, fg_min: 1.012, fg_max: 1.024, abv_min: 4.0, abv_max: 6.0, ibu_min: 20, ibu_max: 40, ebc_min: 60, ebc_max: 100 },
  '16B': { code: '16B', category: '16', name: 'Oatmeal Stout', og_min: 1.045, og_max: 1.065, fg_min: 1.010, fg_max: 1.018, abv_min: 4.2, abv_max: 5.9, ibu_min: 25, ibu_max: 40, ebc_min: 40, ebc_max: 80 },
  '16C': { code: '16C', category: '16', name: 'Tropical Stout', og_min: 1.056, og_max: 1.075, fg_min: 1.010, fg_max: 1.018, abv_min: 5.5, abv_max: 8.0, ibu_min: 30, ibu_max: 50, ebc_min: 60, ebc_max: 100 },
  '16D': { code: '16D', category: '16', name: 'Foreign Extra Stout', og_min: 1.056, og_max: 1.075, fg_min: 1.010, fg_max: 1.018, abv_min: 6.3, abv_max: 8.0, ibu_min: 50, ibu_max: 70, ebc_min: 60, ebc_max: 100 },
  // ── Category 17: Strong British Ale ──
  '17A': { code: '17A', category: '17', name: 'British Strong Ale', og_min: 1.055, og_max: 1.080, fg_min: 1.015, fg_max: 1.022, abv_min: 5.5, abv_max: 8.0, ibu_min: 30, ibu_max: 60, ebc_min: 16, ebc_max: 44 },
  '17B': { code: '17B', category: '17', name: 'Old Ale', og_min: 1.055, og_max: 1.088, fg_min: 1.015, fg_max: 1.022, abv_min: 5.5, abv_max: 9.0, ibu_min: 30, ibu_max: 60, ebc_min: 24, ebc_max: 44 },
  '17C': { code: '17C', category: '17', name: 'Wee Heavy', og_min: 1.070, og_max: 1.130, fg_min: 1.018, fg_max: 1.040, abv_min: 6.5, abv_max: 10.0, ibu_min: 17, ibu_max: 35, ebc_min: 28, ebc_max: 60 },
  '17D': { code: '17D', category: '17', name: 'English Barley Wine', og_min: 1.080, og_max: 1.120, fg_min: 1.018, fg_max: 1.030, abv_min: 8.0, abv_max: 12.0, ibu_min: 35, ibu_max: 70, ebc_min: 20, ebc_max: 44 },
  // ── Category 18: Pale American Ale ──
  '18A': { code: '18A', category: '18', name: 'Blonde Ale', og_min: 1.038, og_max: 1.054, fg_min: 1.008, fg_max: 1.013, abv_min: 3.8, abv_max: 5.5, ibu_min: 15, ibu_max: 28, ebc_min: 6, ebc_max: 14 },
  '18B': { code: '18B', category: '18', name: 'American Pale Ale', og_min: 1.045, og_max: 1.060, fg_min: 1.010, fg_max: 1.015, abv_min: 4.5, abv_max: 6.2, ibu_min: 30, ibu_max: 50, ebc_min: 10, ebc_max: 20 },
  // ── Category 19: Amber and Brown American Beer ──
  '19A': { code: '19A', category: '19', name: 'American Amber Ale', og_min: 1.045, og_max: 1.060, fg_min: 1.010, fg_max: 1.015, abv_min: 4.5, abv_max: 6.2, ibu_min: 25, ibu_max: 40, ebc_min: 20, ebc_max: 34 },
  '19B': { code: '19B', category: '19', name: 'California Common', og_min: 1.048, og_max: 1.054, fg_min: 1.011, fg_max: 1.014, abv_min: 4.5, abv_max: 5.5, ibu_min: 30, ibu_max: 45, ebc_min: 20, ebc_max: 28 },
  '19C': { code: '19C', category: '19', name: 'American Brown Ale', og_min: 1.045, og_max: 1.060, fg_min: 1.010, fg_max: 1.016, abv_min: 4.3, abv_max: 6.2, ibu_min: 20, ibu_max: 30, ebc_min: 36, ebc_max: 60 },
  // ── Category 20: American Porter and Stout ──
  '20A': { code: '20A', category: '20', name: 'American Porter', og_min: 1.050, og_max: 1.070, fg_min: 1.012, fg_max: 1.018, abv_min: 4.8, abv_max: 6.5, ibu_min: 25, ibu_max: 50, ebc_min: 40, ebc_max: 80 },
  '20B': { code: '20B', category: '20', name: 'American Stout', og_min: 1.050, og_max: 1.075, fg_min: 1.010, fg_max: 1.022, abv_min: 5.0, abv_max: 7.0, ibu_min: 35, ibu_max: 75, ebc_min: 60, ebc_max: 100 },
  '20C': { code: '20C', category: '20', name: 'Imperial Stout', og_min: 1.075, og_max: 1.115, fg_min: 1.018, fg_max: 1.030, abv_min: 8.0, abv_max: 12.0, ibu_min: 50, ibu_max: 90, ebc_min: 60, ebc_max: 100 },
  // ── Category 21: IPA ──
  '21A': { code: '21A', category: '21', name: 'American IPA', og_min: 1.056, og_max: 1.070, fg_min: 1.008, fg_max: 1.014, abv_min: 5.5, abv_max: 7.5, ibu_min: 40, ibu_max: 70, ebc_min: 12, ebc_max: 28 },
  '21B': { code: '21B', category: '21', name: 'Specialty IPA', og_min: 1.050, og_max: 1.085, fg_min: 1.008, fg_max: 1.020, abv_min: 5.0, abv_max: 9.0, ibu_min: 25, ibu_max: 100, ebc_min: 6, ebc_max: 80 },
  '21B1': { code: '21B1', category: '21', name: 'New England IPA', og_min: 1.060, og_max: 1.085, fg_min: 1.010, fg_max: 1.020, abv_min: 6.0, abv_max: 9.0, ibu_min: 25, ibu_max: 60, ebc_min: 6, ebc_max: 16 },
  '21C': { code: '21C', category: '21', name: 'Hazy IPA', og_min: 1.060, og_max: 1.085, fg_min: 1.010, fg_max: 1.020, abv_min: 6.0, abv_max: 9.0, ibu_min: 25, ibu_max: 60, ebc_min: 6, ebc_max: 16 },
  // ── Category 22: Strong American Ale ──
  '22A': { code: '22A', category: '22', name: 'Double IPA', og_min: 1.065, og_max: 1.085, fg_min: 1.010, fg_max: 1.020, abv_min: 7.5, abv_max: 10.0, ibu_min: 60, ibu_max: 120, ebc_min: 12, ebc_max: 30 },
  '22B': { code: '22B', category: '22', name: 'American Strong Ale', og_min: 1.062, og_max: 1.090, fg_min: 1.014, fg_max: 1.024, abv_min: 6.3, abv_max: 10.0, ibu_min: 50, ibu_max: 100, ebc_min: 14, ebc_max: 44 },
  '22C': { code: '22C', category: '22', name: 'American Barleywine', og_min: 1.080, og_max: 1.120, fg_min: 1.016, fg_max: 1.030, abv_min: 8.0, abv_max: 12.0, ibu_min: 50, ibu_max: 100, ebc_min: 20, ebc_max: 40 },
  '22D': { code: '22D', category: '22', name: 'Wheatwine', og_min: 1.080, og_max: 1.120, fg_min: 1.016, fg_max: 1.030, abv_min: 8.0, abv_max: 12.0, ibu_min: 30, ibu_max: 60, ebc_min: 16, ebc_max: 30 },
  // ── Category 23: European Sour Ale ──
  '23A': { code: '23A', category: '23', name: 'Berliner Weisse', og_min: 1.028, og_max: 1.032, fg_min: 1.003, fg_max: 1.006, abv_min: 2.8, abv_max: 3.8, ibu_min: 3, ibu_max: 8, ebc_min: 4, ebc_max: 6 },
  '23B': { code: '23B', category: '23', name: 'Flanders Red Ale', og_min: 1.048, og_max: 1.057, fg_min: 1.002, fg_max: 1.012, abv_min: 4.6, abv_max: 6.5, ibu_min: 10, ibu_max: 25, ebc_min: 20, ebc_max: 34 },
  '23C': { code: '23C', category: '23', name: 'Oud Bruin', og_min: 1.040, og_max: 1.074, fg_min: 1.008, fg_max: 1.012, abv_min: 4.0, abv_max: 8.0, ibu_min: 20, ibu_max: 25, ebc_min: 30, ebc_max: 44 },
  '23D': { code: '23D', category: '23', name: 'Lambic', og_min: 1.040, og_max: 1.054, fg_min: 1.001, fg_max: 1.010, abv_min: 5.0, abv_max: 6.5, ibu_min: 0, ibu_max: 10, ebc_min: 6, ebc_max: 26 },
  '23E': { code: '23E', category: '23', name: 'Gueuze', og_min: 1.040, og_max: 1.060, fg_min: 1.000, fg_max: 1.006, abv_min: 5.0, abv_max: 8.0, ibu_min: 0, ibu_max: 10, ebc_min: 6, ebc_max: 26 },
  '23F': { code: '23F', category: '23', name: 'Fruit Lambic', og_min: 1.040, og_max: 1.060, fg_min: 1.000, fg_max: 1.010, abv_min: 5.0, abv_max: 7.0, ibu_min: 0, ibu_max: 10, ebc_min: 6, ebc_max: 26 },
  '23G': { code: '23G', category: '23', name: 'Gose', og_min: 1.036, og_max: 1.056, fg_min: 1.006, fg_max: 1.010, abv_min: 4.2, abv_max: 4.8, ibu_min: 5, ibu_max: 12, ebc_min: 6, ebc_max: 12 },
  // ── Category 24: Belgian Ale ──
  '24A': { code: '24A', category: '24', name: 'Witbier', og_min: 1.044, og_max: 1.052, fg_min: 1.008, fg_max: 1.012, abv_min: 4.5, abv_max: 5.5, ibu_min: 10, ibu_max: 20, ebc_min: 4, ebc_max: 8 },
  '24B': { code: '24B', category: '24', name: 'Belgian Pale Ale', og_min: 1.048, og_max: 1.054, fg_min: 1.010, fg_max: 1.014, abv_min: 4.8, abv_max: 5.5, ibu_min: 20, ibu_max: 30, ebc_min: 16, ebc_max: 28 },
  '24C': { code: '24C', category: '24', name: 'Bière de Garde', og_min: 1.060, og_max: 1.080, fg_min: 1.008, fg_max: 1.016, abv_min: 6.0, abv_max: 8.5, ibu_min: 18, ibu_max: 28, ebc_min: 12, ebc_max: 38 },
  // ── Category 25: Strong Belgian Ale ──
  '25A': { code: '25A', category: '25', name: 'Belgian Blond Ale', og_min: 1.062, og_max: 1.075, fg_min: 1.008, fg_max: 1.018, abv_min: 6.0, abv_max: 7.5, ibu_min: 15, ibu_max: 30, ebc_min: 8, ebc_max: 14 },
  '25B': { code: '25B', category: '25', name: 'Saison', og_min: 1.048, og_max: 1.065, fg_min: 1.002, fg_max: 1.008, abv_min: 5.0, abv_max: 7.0, ibu_min: 20, ibu_max: 35, ebc_min: 10, ebc_max: 20 },
  '25C': { code: '25C', category: '25', name: 'Belgian Golden Strong Ale', og_min: 1.070, og_max: 1.095, fg_min: 1.005, fg_max: 1.016, abv_min: 7.5, abv_max: 10.5, ibu_min: 22, ibu_max: 35, ebc_min: 6, ebc_max: 10 },
  // ── Category 26: Trappist Ale ──
  '26A': { code: '26A', category: '26', name: 'Trappist Single', og_min: 1.044, og_max: 1.054, fg_min: 1.004, fg_max: 1.010, abv_min: 4.8, abv_max: 6.0, ibu_min: 25, ibu_max: 45, ebc_min: 6, ebc_max: 10 },
  '26B': { code: '26B', category: '26', name: 'Belgian Dubbel', og_min: 1.062, og_max: 1.075, fg_min: 1.008, fg_max: 1.018, abv_min: 6.0, abv_max: 7.6, ibu_min: 15, ibu_max: 25, ebc_min: 20, ebc_max: 34 },
  '26C': { code: '26C', category: '26', name: 'Belgian Tripel', og_min: 1.075, og_max: 1.085, fg_min: 1.008, fg_max: 1.014, abv_min: 7.5, abv_max: 9.5, ibu_min: 20, ibu_max: 40, ebc_min: 8, ebc_max: 14 },
  '26D': { code: '26D', category: '26', name: 'Belgian Dark Strong Ale', og_min: 1.075, og_max: 1.110, fg_min: 1.010, fg_max: 1.024, abv_min: 8.0, abv_max: 12.0, ibu_min: 20, ibu_max: 35, ebc_min: 24, ebc_max: 45 },
  // ── Category 27: Historical Beer ──
  '27A': { code: '27A', category: '27', name: 'Grodziskie', og_min: 1.028, og_max: 1.032, fg_min: 1.006, fg_max: 1.012, abv_min: 2.5, abv_max: 3.3, ibu_min: 20, ibu_max: 35, ebc_min: 6, ebc_max: 12 },
  '27B': { code: '27B', category: '27', name: 'Lichtenhainer', og_min: 1.032, og_max: 1.040, fg_min: 1.004, fg_max: 1.008, abv_min: 3.5, abv_max: 4.7, ibu_min: 5, ibu_max: 12, ebc_min: 6, ebc_max: 12 },
  '27C': { code: '27C', category: '27', name: 'Roggenbier', og_min: 1.046, og_max: 1.056, fg_min: 1.010, fg_max: 1.014, abv_min: 4.5, abv_max: 6.0, ibu_min: 10, ibu_max: 20, ebc_min: 24, ebc_max: 40 },
  '27D': { code: '27D', category: '27', name: 'Sahti', og_min: 1.076, og_max: 1.120, fg_min: 1.016, fg_max: 1.040, abv_min: 7.0, abv_max: 11.0, ibu_min: 0, ibu_max: 15, ebc_min: 8, ebc_max: 44 },
  '27E': { code: '27E', category: '27', name: 'Kentucky Common', og_min: 1.044, og_max: 1.055, fg_min: 1.010, fg_max: 1.018, abv_min: 4.0, abv_max: 5.5, ibu_min: 15, ibu_max: 30, ebc_min: 22, ebc_max: 50 },
  '27F': { code: '27F', category: '27', name: 'Pre-Prohibition Lager', og_min: 1.044, og_max: 1.060, fg_min: 1.010, fg_max: 1.015, abv_min: 4.5, abv_max: 6.0, ibu_min: 25, ibu_max: 40, ebc_min: 6, ebc_max: 12 },
  '27G': { code: '27G', category: '27', name: 'Pre-Prohibition Porter', og_min: 1.046, og_max: 1.060, fg_min: 1.010, fg_max: 1.016, abv_min: 4.5, abv_max: 6.0, ibu_min: 20, ibu_max: 30, ebc_min: 40, ebc_max: 80 },
  '27H': { code: '27H', category: '27', name: 'London Brown Ale', og_min: 1.033, og_max: 1.038, fg_min: 1.012, fg_max: 1.015, abv_min: 2.8, abv_max: 3.6, ibu_min: 15, ibu_max: 20, ebc_min: 44, ebc_max: 70 },
  // ── Category 28: American Wild Ale ──
  '28A': { code: '28A', category: '28', name: 'Brett Beer', og_min: 1.030, og_max: 1.080, fg_min: 1.000, fg_max: 1.012, abv_min: 3.0, abv_max: 9.0, ibu_min: 0, ibu_max: 50, ebc_min: 4, ebc_max: 40 },
  '28B': { code: '28B', category: '28', name: 'Mixed Fermentation Sour Beer', og_min: 1.030, og_max: 1.080, fg_min: 1.000, fg_max: 1.012, abv_min: 3.0, abv_max: 9.0, ibu_min: 0, ibu_max: 30, ebc_min: 4, ebc_max: 40 },
  '28C': { code: '28C', category: '28', name: 'Wild Specialty Beer', og_min: 1.030, og_max: 1.080, fg_min: 1.000, fg_max: 1.012, abv_min: 3.0, abv_max: 9.0, ibu_min: 0, ibu_max: 30, ebc_min: 4, ebc_max: 40 },
  '28D': { code: '28D', category: '28', name: 'Straight Sour Beer', og_min: 1.030, og_max: 1.050, fg_min: 1.000, fg_max: 1.012, abv_min: 3.0, abv_max: 5.0, ibu_min: 0, ibu_max: 15, ebc_min: 4, ebc_max: 16 },
  // ── Category 29: Fruit Beer ──
  '29A': { code: '29A', category: '29', name: 'Fruit Beer', og_min: 1.030, og_max: 1.110, fg_min: 1.001, fg_max: 1.024, abv_min: 2.5, abv_max: 12.0, ibu_min: 5, ibu_max: 70, ebc_min: 4, ebc_max: 100 },
  '29B': { code: '29B', category: '29', name: 'Fruit and Spice Beer', og_min: 1.030, og_max: 1.110, fg_min: 1.001, fg_max: 1.024, abv_min: 2.5, abv_max: 12.0, ibu_min: 5, ibu_max: 70, ebc_min: 4, ebc_max: 100 },
  '29C': { code: '29C', category: '29', name: 'Specialty Fruit Beer', og_min: 1.030, og_max: 1.110, fg_min: 1.001, fg_max: 1.024, abv_min: 2.5, abv_max: 12.0, ibu_min: 5, ibu_max: 70, ebc_min: 4, ebc_max: 100 },
  '29D': { code: '29D', category: '29', name: 'Grape Ale', og_min: 1.040, og_max: 1.110, fg_min: 1.004, fg_max: 1.030, abv_min: 4.5, abv_max: 12.0, ibu_min: 5, ibu_max: 50, ebc_min: 4, ebc_max: 100 },
  // ── Category 30: Spiced Beer ──
  '30A': { code: '30A', category: '30', name: 'Spice, Herb or Vegetable Beer', og_min: 1.030, og_max: 1.110, fg_min: 1.001, fg_max: 1.024, abv_min: 2.5, abv_max: 12.0, ibu_min: 5, ibu_max: 70, ebc_min: 4, ebc_max: 100 },
  '30B': { code: '30B', category: '30', name: 'Autumn Seasonal Beer', og_min: 1.030, og_max: 1.110, fg_min: 1.001, fg_max: 1.024, abv_min: 2.5, abv_max: 12.0, ibu_min: 5, ibu_max: 70, ebc_min: 4, ebc_max: 100 },
  '30C': { code: '30C', category: '30', name: 'Winter Seasonal Beer', og_min: 1.030, og_max: 1.110, fg_min: 1.001, fg_max: 1.024, abv_min: 2.5, abv_max: 12.0, ibu_min: 5, ibu_max: 70, ebc_min: 4, ebc_max: 100 },
  // ── Category 31: Alternative Fermentables Beer ──
  '31A': { code: '31A', category: '31', name: 'Alternative Grain Beer', og_min: 1.030, og_max: 1.110, fg_min: 1.001, fg_max: 1.024, abv_min: 2.5, abv_max: 12.0, ibu_min: 5, ibu_max: 70, ebc_min: 4, ebc_max: 100 },
  '31B': { code: '31B', category: '31', name: 'Alternative Sugar Beer', og_min: 1.030, og_max: 1.110, fg_min: 1.001, fg_max: 1.024, abv_min: 2.5, abv_max: 12.0, ibu_min: 5, ibu_max: 70, ebc_min: 4, ebc_max: 100 },
  // ── Category 32: Smoked Beer ──
  '32A': { code: '32A', category: '32', name: 'Classic Style Smoked Beer', og_min: 1.030, og_max: 1.110, fg_min: 1.004, fg_max: 1.024, abv_min: 2.5, abv_max: 12.0, ibu_min: 5, ibu_max: 70, ebc_min: 4, ebc_max: 100 },
  '32B': { code: '32B', category: '32', name: 'Specialty Smoked Beer', og_min: 1.030, og_max: 1.110, fg_min: 1.004, fg_max: 1.024, abv_min: 2.5, abv_max: 12.0, ibu_min: 5, ibu_max: 70, ebc_min: 4, ebc_max: 100 },
  // ── Category 33: Wood Beer ──
  '33A': { code: '33A', category: '33', name: 'Wood-Aged Beer', og_min: 1.030, og_max: 1.110, fg_min: 1.004, fg_max: 1.024, abv_min: 2.5, abv_max: 12.0, ibu_min: 5, ibu_max: 70, ebc_min: 4, ebc_max: 100 },
  '33B': { code: '33B', category: '33', name: 'Specialty Wood-Aged Beer', og_min: 1.030, og_max: 1.110, fg_min: 1.004, fg_max: 1.024, abv_min: 2.5, abv_max: 12.0, ibu_min: 5, ibu_max: 70, ebc_min: 4, ebc_max: 100 },
  // ── Category 34: Specialty Beer ──
  '34A': { code: '34A', category: '34', name: 'Commercial Specialty Beer', og_min: 1.030, og_max: 1.110, fg_min: 1.001, fg_max: 1.024, abv_min: 2.5, abv_max: 12.0, ibu_min: 5, ibu_max: 70, ebc_min: 4, ebc_max: 100 },
  '34B': { code: '34B', category: '34', name: 'Mixed-Style Beer', og_min: 1.030, og_max: 1.110, fg_min: 1.001, fg_max: 1.024, abv_min: 2.5, abv_max: 12.0, ibu_min: 5, ibu_max: 70, ebc_min: 4, ebc_max: 100 },
  '34C': { code: '34C', category: '34', name: 'Experimental Beer', og_min: 1.030, og_max: 1.110, fg_min: 1.001, fg_max: 1.024, abv_min: 2.5, abv_max: 12.0, ibu_min: 0, ibu_max: 100, ebc_min: 0, ebc_max: 100 },
};

export function findStyle(q: string): BjcpStyle | undefined {
  if (BJCP[q]) return BJCP[q];
  const lq = q.toLowerCase();
  // Exact code match first, then name substring match
  for (const s of Object.values(BJCP)) {
    if (s.name.toLowerCase().includes(lq)) return s;
    // Also try matching just the code part (e.g., "IPA" → 21A)
    if (s.code.toLowerCase() === lq) return s;
  }
  // Try extracting a BJCP code from a prefixed label like "BJCP 25C — Saison"
  const codeMatch = q.match(/\bBJCP\s+([0-9]+[A-Za-z]?)\b/i);
  if (codeMatch) {
    const code = codeMatch[1].toUpperCase();
    if (BJCP[code]) return BJCP[code];
  }
  // Try matching the first token that looks like a BJCP code (e.g. "25C")
  const bareCode = q.match(/\b([0-9]{1,2}[A-Z][0-9]?)\b/i);
  if (bareCode) {
    const code = bareCode[1].toUpperCase();
    if (BJCP[code]) return BJCP[code];
  }
  return undefined;
}

function findAllStyles(query: string): BjcpStyle[] {
  const lq = query.toLowerCase();
  const matches = Object.values(BJCP).filter(
    s => s.name.toLowerCase().includes(lq) || s.code.toLowerCase().includes(lq),
  );
  if (matches.length > 0) return matches;
  // Fall back to the extracted BJCP code if present
  const m = query.match(/\bBJ\s+([0-9A-Z]+)\b/i) ?? query.match(/\b([0-9]{1,2}[A-Z][0-9]?)\b/i);
  if (m) {
    const code = m[1].toUpperCase();
    const s = BJCP[code];
    if (s) return [s];
  }
  return [];
}

// ============================================================================
// YAML → structured recipe mapping
// ============================================================================

export interface ParsedRecipe {
  schema_version?: string;
  recipe_name: string;
  beer_style: string;
  batch_size_liters: number;
  og: number;
  fg: number;
  ibu: number;
  ebc?: number;
  abv_percent?: number;
  efficiency_percent?: number;
  grain_bill: { malt: string; kg: number; percent?: number; ebc?: number; note?: string }[];
  hop_schedule: { variety: string; grams: number; time_minutes: number; use: string; aa_percent?: number; ibu_contrib?: number; note?: string }[];
  yeast: { strain: string; attenuation_percent?: number; lab?: string; temperature_c_min?: number; temperature_c_max?: number };
  mash_temp_c?: number;
  mash_steps?: { temperature_c: number; time_minutes: number; note?: string }[];
  fermentation_temp_c?: number;
  water_profile?: { ca: number; mg: number; na: number; cl: number; so4: number; hco3: number };
  boil_time_minutes?: number;
  pre_boil_volume_liters?: number;
  post_boil_volume_liters?: number;
  fermentation_volume_liters?: number;
  packaging_volume_liters?: number;
  carbonation_volumes?: number;
  carbonation_method?: string;
  priming_sugar_gl?: number;
  priming_total_grams?: number;
  impianto?: string;
  descrizione?: string;
  note?: string;
  spezie?: { nome: string; grammi: number; uso: string; tempo_min?: number; note?: string }[];
  zuccheri?: { tipo: string; grammi: number; note?: string }[];
  aggiunte_speciali?: FruitAddition[];
  // ── Dati di quotazione (brewday) ──
  mash_water_liters?: number;
  sparge_water_liters?: number;
  total_water_liters?: number;
  mash_salts?: { gypsum_g?: number; cacl2_g?: number; epsom_g?: number; nahco3_g?: number; lactic_acid_ml?: number };
  sparge_salts?: { gypsum_g?: number; cacl2_g?: number; epsom_g?: number; nahco3_g?: number; lactic_acid_ml?: number };
  mash_in_temp_c?: number;
  whirlpool_temp_c?: number;
  pre_boil_og?: number;
  post_boil_og?: number;
  primary_days?: number;
  conditioning_days?: number;
  fermentation_steps?: {
    phase?: string;
    start_day?: number;
    end_day?: number;
    temperature_c?: number;
    temperature_min_c?: number;
    temperature_max_c?: number;
    duration_days?: number;
    note?: string;
  }[];
  serving_temp_c?: number;
  bottle_type?: string;
  rawYaml: string;
}

export interface FruitAddition {
  ingrediente: string;
  quantita_kg: number;
  forma: string;
  stadio: string;
  giorni_contatto?: string;
  preparazione?: string;
  note?: string;
  equivalente_fresco_kg?: number;
  equivalente_fresco_g_l?: number;
  dose_min_kg?: number;
  dose_max_kg?: number;
  zuccheri_stimati_g?: number;
  acqua_stimata_l?: number;
  intensita_calcolata?: string;
}

const VALID_HOP_USES = new Set(['boil', 'whirlpool', 'dry_hop', 'first_wort', 'mash', 'hopback', 'dip_hop', 'hop_stand']);
// ── Helper di lettura tolleranti alle varianti dei nomi di campo ──
// Molte ricette usano nomi di campo diversi (es. `mash.acqua_strike_litri`
// vs `acqua.mash_litri`, `bollitura.durata_min` vs `parametri.bollitura_min`).
// Questi helper cercano il primo valore non nullo tra più chiavi alternative.

function pickNum(obj: Record<string, unknown> | undefined, keys: string[]): number | undefined {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (v != null && !Number.isNaN(Number(v))) return Number(v);
  }
  return undefined;
}

function pickStr(obj: Record<string, unknown> | undefined, keys: string[]): string | undefined {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim() !== '') return v;
  }
  return undefined;
}

function pickBool(obj: Record<string, unknown> | undefined, keys: string[]): boolean | undefined {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'boolean') return v;
  }
  return undefined;
}

const RECIPE_SCHEMA = yaml.load(readFileSync(new URL('./recipe-schema.yaml', import.meta.url), 'utf-8')) as {
  validator: {
    accepted_top_level_fields: string[];
    required_string_fields: string[];
    required_numeric_parameters: Record<string, 'positive' | 'non_negative'>;
    numeric_parameter_fields: string[];
    list_fields: string[];
    salt_sections: string[];
    salt_fields: string[];
    fermentation_step_fields: { string_fields: string[]; non_negative_number_fields: string[] };
    special_additions: {
      required_string_fields: string[];
      required_positive_number_fields: string[];
      optional_number_fields: string[];
      optional_string_fields: string[];
    };
  };
};
const YAML_TOP_LEVEL_KEYS = new Set(RECIPE_SCHEMA.validator.accepted_top_level_fields);
const YAML_VALIDATOR_SCHEMA = RECIPE_SCHEMA.validator;

function collectSchemaIssues(data: Record<string, unknown>): Array<{ path: string; message: string }> {
  const issues: Array<{ path: string; message: string }> = [];
  for (const key of Object.keys(data)) {
    if (!YAML_TOP_LEVEL_KEYS.has(key)) {
      issues.push({ path: key, message: `Campo non riconosciuto. Campi validi: ${[...YAML_TOP_LEVEL_KEYS].join(', ')}.` });
    }
  }
  for (const key of YAML_VALIDATOR_SCHEMA.required_string_fields) {
    if (data[key] !== undefined && typeof data[key] !== 'string') {
      issues.push({ path: key, message: 'Il valore deve essere una stringa.' });
    }
  }
  const params = data['parametri'];
  if (params !== undefined && (typeof params !== 'object' || params === null || Array.isArray(params))) {
    issues.push({ path: 'parametri', message: 'Il valore deve essere un oggetto.' });
  } else if (params && typeof params === 'object' && !Array.isArray(params)) {
    const parameterRecord = params as Record<string, unknown>;
    for (const key of YAML_VALIDATOR_SCHEMA.numeric_parameter_fields) {
      if (key in parameterRecord && (typeof parameterRecord[key] !== 'number' || !Number.isFinite(parameterRecord[key]))) {
        issues.push({ path: `parametri.${key}`, message: 'Il valore deve essere un numero finito.' });
      }
    }
  }
  for (const section of YAML_VALIDATOR_SCHEMA.list_fields) {
    const value = data[section];
    if (value !== undefined && !Array.isArray(value)) {
      issues.push({ path: section, message: 'Il valore deve essere una lista.' });
    }
  }
  for (const section of YAML_VALIDATOR_SCHEMA.salt_sections) {
    const value = data[section];
    if (value === undefined) continue;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      issues.push({ path: section, message: 'Il valore deve essere un oggetto.' });
      continue;
    }
    const salts = value as Record<string, unknown>;
    for (const field of YAML_VALIDATOR_SCHEMA.salt_fields) {
      if (field in salts && (typeof salts[field] !== 'number' || !Number.isFinite(salts[field]) || (salts[field] as number) < 0)) {
        issues.push({ path: `${section}.${field}`, message: 'La quantità deve essere un numero finito non negativo.' });
      }
    }
  }
  const fermentation = data['fermentazione'];
  if (fermentation !== undefined && (typeof fermentation !== 'object' || fermentation === null || Array.isArray(fermentation))) {
    issues.push({ path: 'fermentazione', message: 'Il valore deve essere un oggetto.' });
  } else if (fermentation && typeof fermentation === 'object' && !Array.isArray(fermentation)) {
    const steps = (fermentation as Record<string, unknown>)['steps'];
    if (steps !== undefined && !Array.isArray(steps)) {
      issues.push({ path: 'fermentazione.steps', message: 'Il valore deve essere una lista.' });
    } else if (Array.isArray(steps)) {
      steps.forEach((value, index) => {
        const path = `fermentazione.steps[${index}]`;
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          issues.push({ path, message: 'Ogni fase di fermentazione deve essere un oggetto.' });
          return;
        }
        const step = value as Record<string, unknown>;
        for (const field of YAML_VALIDATOR_SCHEMA.fermentation_step_fields.string_fields) {
          if (field in step && typeof step[field] !== 'string') {
            issues.push({ path: `${path}.${field}`, message: 'Il campo deve essere una stringa.' });
          }
        }
        for (const field of YAML_VALIDATOR_SCHEMA.fermentation_step_fields.non_negative_number_fields) {
          if (field in step && (typeof step[field] !== 'number' || !Number.isFinite(step[field]) || (step[field] as number) < 0)) {
            issues.push({ path: `${path}.${field}`, message: 'Il campo deve essere un numero finito non negativo.' });
          }
        }
        const hasSingleTemperature = typeof step['temperatura_c'] === 'number';
        const hasTemperatureRange = typeof step['temperatura_min_c'] === 'number' && typeof step['temperatura_max_c'] === 'number';
        if (!hasSingleTemperature && !hasTemperatureRange) {
          issues.push({ path, message: 'Specificare temperatura_c oppure temperatura_min_c e temperatura_max_c.' });
        }
        if (typeof step['giorno_inizio'] === 'number' && typeof step['giorno_fine'] === 'number' && step['giorno_fine'] < step['giorno_inizio']) {
          issues.push({ path: `${path}.giorno_fine`, message: 'Il giorno finale non può precedere il giorno iniziale.' });
        }
        if (typeof step['temperatura_min_c'] === 'number' && typeof step['temperatura_max_c'] === 'number' && step['temperatura_max_c'] < step['temperatura_min_c']) {
          issues.push({ path: `${path}.temperatura_max_c`, message: 'La temperatura massima non può essere inferiore alla minima.' });
        }
      });
    }
  }
  const specialAdditions = data['aggiunte_speciali'];
  if (Array.isArray(specialAdditions)) {
    specialAdditions.forEach((value, index) => {
      const path = `aggiunte_speciali[${index}]`;
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        issues.push({ path, message: 'Ogni aggiunta speciale deve essere un oggetto.' });
        return;
      }
      const addition = value as Record<string, unknown>;
      for (const key of YAML_VALIDATOR_SCHEMA.special_additions.required_string_fields) {
        if (typeof addition[key] !== 'string' || !(addition[key] as string).trim()) {
          issues.push({ path: `${path}.${key}`, message: 'Il campo deve essere una stringa non vuota.' });
        }
      }
      for (const key of YAML_VALIDATOR_SCHEMA.special_additions.required_positive_number_fields) {
        if (typeof addition[key] !== 'number' || !Number.isFinite(addition[key]) || (addition[key] as number) <= 0) {
          issues.push({ path: `${path}.${key}`, message: 'Il campo deve essere un numero positivo.' });
        }
      }
      for (const key of YAML_VALIDATOR_SCHEMA.special_additions.optional_number_fields) {
        if (key in addition && (typeof addition[key] !== 'number' || !Number.isFinite(addition[key]))) {
          issues.push({ path: `${path}.${key}`, message: 'Il campo deve essere un numero finito.' });
        }
      }
      for (const key of YAML_VALIDATOR_SCHEMA.special_additions.optional_string_fields) {
        if (key in addition && typeof addition[key] !== 'string') {
          issues.push({ path: `${path}.${key}`, message: 'Il campo deve essere una stringa.' });
        }
      }
    });
  }
  return issues;
}

export function parseYamlRecipe(filePath: string): ParsedRecipe {
  if (!existsSync(filePath)) {
    throw new Error(`File non trovato: ${filePath}`);
  }

  const raw = readFileSync(filePath, 'utf-8');
  const data = yaml.load(raw) as unknown;
  if (typeof data !== 'object' || data === null) {
    throw new Error('Il file YAML non contiene un oggetto valido.');
  }

  const d = data as Record<string, unknown>;
  const schemaIssues = collectSchemaIssues(d);
  const schemaVersion = d['schema_version'];
  if (schemaVersion !== undefined && typeof schemaVersion !== 'string') {
    schemaIssues.push({ path: 'schema_version', message: 'La versione dello schema deve essere una stringa.' });
  }
  if (schemaIssues.length > 0) {
    throw new Error(`Schema YAML non valido: ${schemaIssues.map(issue => `${issue.path}: ${issue.message}`).join('; ')}`);
  }
  const params = (d['parametri'] ?? {}) as Record<string, unknown>;

  // Required fields
  const recipe_name = typeof d['nome'] === 'string' ? d['nome'].trim() : '';
  const beer_style = typeof d['stile'] === 'string' ? d['stile'].trim() : '';
  const batch_size_liters = Number(params['batch_size_litri']);
  const og = Number(params['og']);
  const fg = Number(params['fg']);
  const ibu = Number(params['ibu']);

  // Optional params
  const ebc = params['ebc'] != null ? Number(params['ebc']) : undefined;
  const abv_percent = params['abv_percent'] != null ? Number(params['abv_percent']) : undefined;
  const efficiency_percent = params['efficienza_percent'] != null ? Number(params['efficienza_percent']) : undefined;

  // Bollitura: la durata può essere in `parametri.bollitura_min` o in `bollitura.durata_min`
  const bollitura = (d['bollitura'] ?? d['bolliura']) as Record<string, unknown> | undefined;
  const boil_time_minutes = pickNum(params, ['bollitura_min', 'duracion_bollitura_min'])
    ?? pickNum(bollitura, ['durata_min', 'duration_min', 'duracion_min']);

  // Volumes
  const pre_boil_volume_liters = pickNum(params, ['pre_boil_litri', 'pre_boil_volumen_litri'])
    ?? pickNum(bollitura, ['volume_pre_boil_litri', 'pre_boil_litri', 'volumen_pre_boil_litri']);
  const post_boil_volume_liters = pickNum(params, ['post_boil_litri', 'post_boil_volumen_litri'])
    ?? pickNum(bollitura, ['volume_post_boil_litri', 'post_boil_litri', 'volumen_post_boil_litri']);
  const fermentation_volume_liters = pickNum(params, ['fermentatore_litri', 'volume_fermentatore', 'fermentador_litri']);
  const packaging_volume_liters = pickNum(params, ['confezionamento_litri', 'confezionamiento_litri', 'envasado_litri', 'embotellado_litri']);

  // Equipment
  const impianto = typeof params['impianto'] === 'string' ? params['impianto'] : undefined;

  // Carbonazione: in `parametri` o nella sezione `carbonazione`
  const carbonazione = (d['carbonazione'] ?? d['carbonatacion']) as Record<string, unknown> | undefined;
  const carbonation_volumes = pickNum(params, ['carbonazione_vol', 'co2_volumi'])
    ?? pickNum(carbonazione, ['co2_volumi', 'co2_vol', 'volumen_co2', 'vol_co2']);
  const carbonation_method = pickStr(params, ['carbonazione_metodo', 'metodo_carbonatacion'])
    ?? pickStr(carbonazione, ['metodo', 'metodo_carbonatacion']);
  const priming_sugar_gl = pickNum(params, ['priming_gl', 'priming_g_l'])
    ?? pickNum(carbonazione, ['zucchero_g_per_litro', 'azucar_g_por_litro', 'priming_gl']);
  const priming_total_grams = pickNum(params, ['priming_totale_g', 'priming_total_g', 'zucchero_priming_totale_g'])
    ?? pickNum(carbonazione, ['priming_totale_g', 'priming_total_g', 'zucchero_totale_g', 'zucchero_grammi']);

  // Grist → grain_bill
  const grist = Array.isArray(d['grist']) ? d['grist'] as Array<Record<string, unknown>> : [];
  const grain_bill = grist.map(g => ({
    malt: String(g['malto'] ?? ''),
    kg: Number(g['kg'] ?? 0),
    percent: g['percent'] != null ? Number(g['percent']) : undefined,
    ebc: g['ebc'] != null ? Number(g['ebc']) : undefined,
    note: typeof g['note'] === 'string' ? g['note'] : undefined,
  }));

  // Luppolatura → hop_schedule
  const luppolatura = Array.isArray(d['luppolatura'])
    ? d['luppolatura'] as Array<Record<string, unknown>> : [];
  const hop_schedule = luppolatura.map(h => ({
    variety: String(h['varieta'] ?? ''),
    grams: Number(h['grammi'] ?? 0),
    time_minutes: Number(h['tempo_min'] ?? 0),
    use: String(h['uso'] ?? 'boil'),
    aa_percent: h['aa_percent'] != null ? Number(h['aa_percent']) : undefined,
    ibu_contrib: h['ibu_stimati'] != null ? Number(h['ibu_stimati']) : undefined,
    note: typeof h['note'] === 'string' ? h['note'] : undefined,
  }));

  // Yeast
  const lievito = (d['lievito'] ?? {}) as Record<string, unknown>;
  const yeast = {
    strain: String(lievito['ceppo'] ?? ''),
    attenuation_percent: lievito['attenuazione_percent'] != null
      ? Number(lievito['attenuazione_percent']) : undefined,
    lab: typeof lievito['laboratorio'] === 'string' ? lievito['laboratorio'] : undefined,
    temperature_c_min: lievito['temp_min_c'] != null ? Number(lievito['temp_min_c']) : undefined,
    temperature_c_max: lievito['temp_max_c'] != null ? Number(lievito['temp_max_c']) : undefined,
  };

  // Mash
  const mash = (d['mash'] ?? {}) as Record<string, unknown>;
  const mash_temp_c = mash['temperatura_c'] != null
    ? Number(mash['temperatura_c']) : undefined;
  const mash_steps = Array.isArray(mash['steps']) ? (mash['steps'] as Array<Record<string, unknown>>).map(s => ({
    temperature_c: Number(s['temperatura_c'] ?? 0),
    time_minutes: Number(s['tempo_min'] ?? 0),
    note: typeof s['note'] === 'string' ? s['note'] : undefined,
  })) : undefined;

  // Fermentation
  const ferm = (d['fermentazione'] ?? {}) as Record<string, unknown>;
  const fermentation_temp_c = ferm['temperatura_c'] != null
    ? Number(ferm['temperatura_c']) : undefined;

  // Water profile
  const acqua = d['acqua'] as Record<string, unknown> | undefined;
  const water_profile = acqua ? {
    ca: Number(pickNum(acqua, ['ca', 'ca_mg_l']) ?? 0),
    mg: Number(pickNum(acqua, ['mg', 'mg_mg_l']) ?? 0),
    na: Number(pickNum(acqua, ['na', 'na_mg_l']) ?? 0),
    cl: Number(pickNum(acqua, ['cl', 'cl_mg_l']) ?? 0),
    so4: Number(pickNum(acqua, ['so4', 'so4_mg_l']) ?? 0),
    hco3: Number(pickNum(acqua, ['hco3', 'hco3_mg_l']) ?? 0),
  } : undefined;

  // Description / notes
  const descrizione = typeof d['descrizione'] === 'string' ? d['descrizione'] : undefined;
  const note = typeof d['note'] === 'string' ? d['note'] : undefined;

  // Spices
  const spezie = Array.isArray(d['spezie']) ? (d['spezie'] as Array<Record<string, unknown>>).map(s => ({
    nome: String(s['nome'] ?? ''),
    grammi: Number(s['grammi'] ?? 0),
    uso: String(s['uso'] ?? 'boil'),
    tempo_min: s['tempo_min'] != null ? Number(s['tempo_min']) : undefined,
    note: typeof s['note'] === 'string' ? s['note'] : undefined,
  })) : undefined;

  // Sugars
  const zuccheri = Array.isArray(d['zuccheri']) ? (d['zuccheri'] as Array<Record<string, unknown>>).map(z => ({
    tipo: String(z['tipo'] ?? ''),
    grammi: Number(z['grammi'] ?? 0),
    note: typeof z['note'] === 'string' ? z['note'] : undefined,
  })) : undefined;

  const aggiunte_speciali = Array.isArray(d['aggiunte_speciali']) ? d['aggiunte_speciali'].map(item => {
    const addition = item as Record<string, unknown>;
    return {
      ingrediente: String(addition['ingrediente'] ?? ''),
      quantita_kg: Number(addition['quantita_kg']),
      forma: String(addition['forma'] ?? ''),
      stadio: String(addition['stadio'] ?? ''),
      giorni_contatto: typeof addition['giorni_contatto'] === 'string' ? addition['giorni_contatto'] : undefined,
      preparazione: typeof addition['preparazione'] === 'string' ? addition['preparazione'] : undefined,
      note: typeof addition['note'] === 'string' ? addition['note'] : undefined,
      equivalente_fresco_kg: typeof addition['equivalente_fresco_kg'] === 'number' ? addition['equivalente_fresco_kg'] : undefined,
      equivalente_fresco_g_l: typeof addition['equivalente_fresco_g_l'] === 'number' ? addition['equivalente_fresco_g_l'] : undefined,
      dose_min_kg: typeof addition['dose_min_kg'] === 'number' ? addition['dose_min_kg'] : undefined,
      dose_max_kg: typeof addition['dose_max_kg'] === 'number' ? addition['dose_max_kg'] : undefined,
      zuccheri_stimati_g: typeof addition['zuccheri_stimati_g'] === 'number' ? addition['zuccheri_stimati_g'] : undefined,
      acqua_stimata_l: typeof addition['acqua_stimata_l'] === 'number' ? addition['acqua_stimata_l'] : undefined,
      intensita_calcolata: typeof addition['intensita_calcolata'] === 'string' ? addition['intensita_calcolata'] : undefined,
    };
  }) : undefined;

  // ── Dati di quotazione (brewday) ──
  // Acqua: sezione `acqua` con mash/sparge/total, oppure `mash.acqua_strike_litri`
  const agua = (d['agua'] ?? d['acqua']) as Record<string, unknown> | undefined;
  const mash_water_liters = pickNum(agua, ['mash_litri', 'mash_agua_litri', 'strike_litri'])
    ?? pickNum(mash, ['acqua_strike_litri', 'strike_litri', 'agua_strike_litri']);
  const sparge_water_liters = pickNum(agua, ['sparge_litri', 'sparge_agua_litri'])
    ?? pickNum(d['sparge'] as Record<string, unknown> | undefined, ['sparge_litri', 'volumen_litri', 'litri']);
  const total_water_liters = pickNum(agua, ['total_litri', 'total_agua_litri', 'agua_total_litri']);

  // Sali del mash e acido lattico: sezione "sales"/"mash_salts", oppure dentro ad `acqua`
  const saltValues = (sales: Record<string, unknown> | undefined) => sales ? ({
    gypsum_g: pickNum(sales, ['gesso_g', 'gypsum_g', 'gesso']),
    cacl2_g: pickNum(sales, ['cacl2_g', 'cacl2']),
    epsom_g: pickNum(sales, ['epsom_g', 'epsom']),
    nahco3_g: pickNum(sales, ['nahco3_g', 'nahco3']),
    lactic_acid_ml: pickNum(sales, ['acido_lactico_ml', 'lactic_acid_ml', 'acido_lactico']),
  }) : undefined;
  const mash_salts = saltValues((d['mash_salts'] ?? d['sales']) as Record<string, unknown> | undefined);
  const sparge_salts = saltValues(d['sparge_salts'] as Record<string, unknown> | undefined);

  // Mash-in: sezione "mash" con varianti
  const mashInTemp = pickNum(mash, ['temperatura_in_c', 'mash_in_c', 'temperatura_strike_c', 'strike_c']);
  const whirlpool_temp_c = pickNum(bollitura, ['whirlpool_temperatura_c', 'whirlpool_temp_c', 'hop_stand_temperatura_c']);

  // Gravità pre/post-boil: sezione "bollitura"
  const pre_boil_og = pickNum(bollitura, ['og_pre_boil', 'gravedad_pre_boil', 'pre_boil_og'])
    ?? pickNum(params, ['og_pre_boil', 'pre_boil_og']);
  const post_boil_og = pickNum(bollitura, ['og_post_boil', 'gravedad_post_boil', 'post_boil_og'])
    ?? pickNum(params, ['og_post_boil', 'post_boil_og']);

  // Fermentazione: giorni primaria e maturazione
  const primary_days = pickNum(ferm, ['primaria_giorni', 'primaria_dias', 'dias_primaria']);
  const conditioning_days = pickNum(ferm, ['madurazione_giorni', 'maduracion_dias', 'dias_maduracion']);
  const fermentation_steps = Array.isArray(ferm['steps']) ? (ferm['steps'] as Array<Record<string, unknown>>)
    .map(step => ({
      phase: pickStr(step, ['fase', 'phase']),
      start_day: pickNum(step, ['giorno_inizio', 'start_day']),
      end_day: pickNum(step, ['giorno_fine', 'end_day']),
      temperature_c: pickNum(step, ['temperatura_c', 'temperature_c']),
      temperature_min_c: pickNum(step, ['temperatura_min_c', 'temperature_min_c']),
      temperature_max_c: pickNum(step, ['temperatura_max_c', 'temperature_max_c']),
      duration_days: step['giorni'] != null || step['duration_days'] != null ? Number(step['giorni'] ?? step['duration_days']) : undefined,
      note: typeof step['note'] === 'string' ? step['note'] : undefined,
    }))
    .filter(step => step.temperature_c !== undefined || (step.temperature_min_c !== undefined && step.temperature_max_c !== undefined)) : undefined;

  // Carbonatazione: temperatura di servizio e tipo di bottiglia
  const serving_temp_c = pickNum(carbonazione, ['temperatura_servizio_c', 'temperatura_servicio_c', 'servicio_c']);
  const bottle_type = pickStr(carbonazione, ['tipo_botella', 'tipo_botella', 'botella']);

  // Validate required fields
  const missing: string[] = [];
  for (const key of YAML_VALIDATOR_SCHEMA.required_string_fields) {
    if (typeof d[key] !== 'string' || !(d[key] as string).trim()) missing.push(key);
  }
  for (const [key, constraint] of Object.entries(YAML_VALIDATOR_SCHEMA.required_numeric_parameters)) {
    const value = Number(params[key]);
    const invalid = !Number.isFinite(value) || (constraint === 'positive' ? value <= 0 : value < 0);
    if (invalid) missing.push(`parametri.${key}`);
  }

  if (missing.length > 0) {
    throw new Error(`Campi obbligatori mancanti o non validi: ${missing.join(', ')}`);
  }

  return {
    schema_version: typeof schemaVersion === 'string' ? schemaVersion : undefined,
    recipe_name, beer_style, batch_size_liters, og, fg, ibu,
    ebc: isNaN(ebc as number) ? undefined : ebc,
    abv_percent: isNaN(abv_percent as number) ? undefined : abv_percent,
    efficiency_percent: isNaN(efficiency_percent as number) ? undefined : efficiency_percent,
    grain_bill, hop_schedule, yeast,
    mash_temp_c: isNaN(mash_temp_c as number) ? undefined : mash_temp_c,
    mash_steps,
    fermentation_temp_c: isNaN(fermentation_temp_c as number) ? undefined : fermentation_temp_c,
    water_profile,
    boil_time_minutes: isNaN(boil_time_minutes as number) ? undefined : boil_time_minutes,
    pre_boil_volume_liters: isNaN(pre_boil_volume_liters as number) ? undefined : pre_boil_volume_liters,
    post_boil_volume_liters: isNaN(post_boil_volume_liters as number) ? undefined : post_boil_volume_liters,
    fermentation_volume_liters: isNaN(fermentation_volume_liters as number) ? undefined : fermentation_volume_liters,
    packaging_volume_liters: isNaN(packaging_volume_liters as number) ? undefined : packaging_volume_liters,
    carbonation_volumes: isNaN(carbonation_volumes as number) ? undefined : carbonation_volumes,
    carbonation_method,
    priming_sugar_gl: isNaN(priming_sugar_gl as number) ? undefined : priming_sugar_gl,
    priming_total_grams: isNaN(priming_total_grams as number) ? undefined : priming_total_grams,
    impianto,
    descrizione,
    note,
    spezie,
    zuccheri,
    aggiunte_speciali,
    mash_water_liters: isNaN(mash_water_liters as number) ? undefined : mash_water_liters,
    sparge_water_liters: isNaN(sparge_water_liters as number) ? undefined : sparge_water_liters,
    total_water_liters: isNaN(total_water_liters as number) ? undefined : total_water_liters,
    mash_salts,
    sparge_salts,
    mash_in_temp_c: isNaN(mashInTemp as number) ? undefined : mashInTemp,
    whirlpool_temp_c: isNaN(whirlpool_temp_c as number) ? undefined : whirlpool_temp_c,
    pre_boil_og: isNaN(pre_boil_og as number) ? undefined : pre_boil_og,
    post_boil_og: isNaN(post_boil_og as number) ? undefined : post_boil_og,
    primary_days: isNaN(primary_days as number) ? undefined : primary_days,
    conditioning_days: isNaN(conditioning_days as number) ? undefined : conditioning_days,
    fermentation_steps,
    serving_temp_c: isNaN(serving_temp_c as number) ? undefined : serving_temp_c,
    bottle_type,
    rawYaml: raw,
  };
}

// ============================================================================
// DETERMINISTIC VALIDATION
// ============================================================================

interface ValidationResult {
  issues: string[];
  warnings: string[];
  styleName?: string;
  styleCode?: string;
  styleMatch: boolean;
  styleDeviations: string[];
  volumeIssues: string[];
  carbonationIssues: string[];
}

export function validateRecipe(r: ParsedRecipe): ValidationResult {
  const style = findStyle(r.beer_style);
  const issues: string[] = [];
  const warnings: string[] = [];
  const styleDeviations: string[] = [];
  const volumeIssues: string[] = [];
  const carbonationIssues: string[] = [];

  // ── BJCP style checks ──
  if (style) {
    if (r.og < style.og_min) styleDeviations.push(`OG ${r.og.toFixed(3)} < min ${style.og_min.toFixed(3)}`);
    if (r.og > style.og_max) styleDeviations.push(`OG ${r.og.toFixed(3)} > max ${style.og_max.toFixed(3)}`);
    if (r.fg < style.fg_min) styleDeviations.push(`FG ${r.fg.toFixed(3)} < min ${style.fg_min.toFixed(3)}`);
    if (r.fg > style.fg_max) styleDeviations.push(`FG ${r.fg.toFixed(3)} > max ${style.fg_max.toFixed(3)}`);
    if (r.ibu < style.ibu_min) styleDeviations.push(`IBU ${r.ibu} < min ${style.ibu_min}`);
    if (r.ibu > style.ibu_max) styleDeviations.push(`IBU ${r.ibu} > max ${style.ibu_max}`);
    if (r.abv_percent !== undefined && r.abv_percent < style.abv_min) styleDeviations.push(`ABV ${r.abv_percent.toFixed(1)}% < min ${style.abv_min}%`);
    if (r.abv_percent !== undefined && r.abv_percent > style.abv_max) styleDeviations.push(`ABV ${r.abv_percent.toFixed(1)}% > max ${style.abv_max}%`);
    if (r.ebc !== undefined && (r.ebc < style.ebc_min || r.ebc > style.ebc_max))
      styleDeviations.push(`EBC ${r.ebc} fuori range (${style.ebc_min}–${style.ebc_max})`);
  }

  // BJCP deviations are stylistic findings, not deterministic recipe errors.
  if (style) {
    for (const deviation of styleDeviations) warnings.push(`Deviazione BJCP: ${deviation}`);
  }

  // ── Hop schedule sanity ──
  const hopUses = new Set(r.hop_schedule.map(h => h.use));
  for (const u of hopUses) {
    if (!VALID_HOP_USES.has(u)) warnings.push(`Uso luppolo sconosciuto: "${u}".`);
  }
  const boilHops = r.hop_schedule.filter(h => h.use === 'boil');
  const hasBittering = boilHops.some(h => h.time_minutes >= 45);
  if (boilHops.length > 0 && !hasBittering && r.ibu > 10)
    warnings.push('Nessun luppolo in boil ≥45 min — gli IBU potrebbero provenire solo da whirlpool/hop stand.');

  // Check AA% presence for boil hops
  const boilHopsWithoutAA = boilHops.filter(h => h.aa_percent === undefined && h.ibu_contrib === undefined);
  if (boilHopsWithoutAA.length > 0 && boilHops.length > 0)
    warnings.push(`${boilHopsWithoutAA.length} luppoli in boil senza AA% — impossibile verificare il calcolo IBU.`);

  // ── Mash temp ──
  if (r.mash_temp_c !== undefined) {
    if (r.mash_temp_c < 60) issues.push('Temperatura mash <60°C — enzimi inattivi.');
    else if (r.mash_temp_c < 63) warnings.push('Temperatura mash <63°C — corpo molto secco, possibile scarsa conversione.');
    else if (r.mash_temp_c > 72) warnings.push('Temperatura mash >72°C — corpo pieno, possibile scarsa fermentabilità.');
  }

  // ── Water profile ──
  if (r.water_profile) {
    const w = r.water_profile;
    const so4cl = w.cl > 0 ? w.so4 / w.cl : 0;
    if (so4cl > 4) warnings.push(`Rapporto SO₄/Cl = ${so4cl.toFixed(1)} — profilo molto amaro (bitter).`);
    else if (so4cl < 0.5 && w.ca > 0) warnings.push(`Rapporto SO₄/Cl = ${so4cl.toFixed(1)} — profilo morbido (malty).`);
    if (w.hco3 > 250) warnings.push(`Bicarbonati alti (${w.hco3} ppm) — adatto solo a birre scure.`);
    if (w.ca < 50) warnings.push('Calcio basso (<50 ppm) — può influire sulla salute del lievito e sulla flocculazione.');
    if (w.ca > 150) warnings.push('Calcio alto (>150 ppm) — può causare precipitazioni di ossalato.');
    const cationSum = (w.ca / 20.04) + (w.mg / 12.15) + (w.na / 23);
    const anionSum = (w.cl / 35.45) + (w.so4 / 48.03) + (w.hco3 / 61);
    if (Math.abs(cationSum - anionSum) > 0.5)
      warnings.push(`Bilancio ionico non neutro (diff ${Math.abs(cationSum - anionSum).toFixed(2)} meq/L) — il profilo acqua potrebbe non essere realistico.`);
  }

  // ── Volume consistency ──
  if (r.pre_boil_volume_liters !== undefined && r.post_boil_volume_liters !== undefined) {
    if (r.pre_boil_volume_liters <= r.post_boil_volume_liters)
      volumeIssues.push(`Pre-boil (${r.pre_boil_volume_liters}L) ≤ post-boil (${r.post_boil_volume_liters}L) — l'evaporazione è negativa o assente.`);
  }
  if (r.post_boil_volume_liters !== undefined && r.fermentation_volume_liters !== undefined) {
    if (r.post_boil_volume_liters < r.fermentation_volume_liters)
      volumeIssues.push(`Post-boil (${r.post_boil_volume_liters}L) < fermentatore (${r.fermentation_volume_liters}L) — volume aumentato senza spiegazione.`);
  }
  if (r.fermentation_volume_liters !== undefined && r.packaging_volume_liters !== undefined) {
    if (r.packaging_volume_liters > r.fermentation_volume_liters)
      volumeIssues.push(`Confezionamento (${r.packaging_volume_liters}L) > fermentatore (${r.fermentation_volume_liters}L).`);
  }
  // Check batch_size vs volumes
  if (r.batch_size_liters > 0) {
    if (r.fermentation_volume_liters !== undefined && Math.abs(r.fermentation_volume_liters - r.batch_size_liters) > r.batch_size_liters * 0.3)
      volumeIssues.push(`Volume fermentatore (${r.fermentation_volume_liters}L) ≠ batch size (${r.batch_size_liters}L) — differenza >30%.`);
    if (r.packaging_volume_liters !== undefined && Math.abs(r.packaging_volume_liters - r.batch_size_liters) > r.batch_size_liters * 0.2)
      volumeIssues.push(`Volume confezionamento (${r.packaging_volume_liters}L) ≠ batch size (${r.batch_size_liters}L) — differenza >20%.`);
  }

  // ── Carbonation checks ──
  if (r.carbonation_volumes !== undefined) {
    if (r.carbonation_volumes < 1.2) carbonationIssues.push(`Carbonazione molto bassa (${r.carbonation_volumes} vol) — birra quasi piatta.`);
    else if (r.carbonation_volumes > 4.0) carbonationIssues.push(`Carbonazione molto alta (${r.carbonation_volumes} vol) — rischio bottiglia esplosiva senza bottiglie adeguate.`);
  }
  // ── Completezza dei dati di quotazione (brewday) ──
  const brewdayMissing: string[] = [];
  if (r.mash_water_liters === undefined) brewdayMissing.push('acqua di ammostamento (acqua.mash_litri)');
  if (r.total_water_liters === undefined) brewdayMissing.push('acqua totale (acqua.total_litri)');
  if (r.mash_in_temp_c === undefined) brewdayMissing.push('temperatura di mash-in (mash.temperatura_in_c)');
  if (r.pre_boil_og === undefined) brewdayMissing.push('gravità pre-boil (bollitura.og_pre_boil)');
  if (r.post_boil_og === undefined) brewdayMissing.push('gravità post-boil (bollitura.og_post_boil)');
  if (r.boil_time_minutes === undefined) brewdayMissing.push('durata della bollitura (parametri.bollitura_min)');
  if (r.fermentation_temp_c === undefined) brewdayMissing.push('temperatura di fermentazione (fermentazione.temperatura_c)');
  if (r.primary_days === undefined) brewdayMissing.push('giorni di fermentazione primaria (fermentazione.primaria_giorni)');
  if (r.carbonation_volumes === undefined) brewdayMissing.push('carbonatazione (carbonazione.co2_volumi)');
  if (r.packaging_volume_liters === undefined) brewdayMissing.push('volume di confezionamento (parametri.confezionamento_litri)');
  const kegPackaging = r.carbonation_method?.toLowerCase().includes('keg') || r.carbonation_method?.toLowerCase().includes('fusto');
  if (!kegPackaging && r.bottle_type === undefined) brewdayMissing.push('tipo di bottiglia (carbonazione.tipo_botella)');

  if (brewdayMissing.length > 0)
    issues.push(`Dati di quotazione incompleti — mancano: ${brewdayMissing.join(', ')}`);

  // Coerenza dei volumi d'acqua
  if (r.mash_water_liters !== undefined && r.sparge_water_liters !== undefined && r.total_water_liters !== undefined) {
    const sum = r.mash_water_liters + r.sparge_water_liters;
    if (Math.abs(sum - r.total_water_liters) > 1)
      volumeIssues.push(`Acqua totale (${r.total_water_liters}L) ≠ mash (${r.mash_water_liters}L) + sparge (${r.sparge_water_liters}L) = ${sum.toFixed(1)}L`);
  }

  // Coerenza delle gravità pre/post-boil
  if (r.pre_boil_og !== undefined && r.post_boil_og !== undefined && r.post_boil_og < r.pre_boil_og)
    volumeIssues.push(`OG post-boil (${r.post_boil_og.toFixed(3)}) < OG pre-boil (${r.pre_boil_og.toFixed(3)}) — la bollitura non può ridurre la gravità.`);

  // ── Efficiency sanity ──
  if (r.efficiency_percent !== undefined) {
    if (r.efficiency_percent > 100) warnings.push('Efficienza >100% — impossibile senza errori di misura.');
    else if (r.efficiency_percent < 50) warnings.push('Efficienza <50% — molto bassa, verificare la macinatura e il mash.');
    else if (r.efficiency_percent > 85) warnings.push('Efficienza >85% — molto alta per homebrewing standard.');
  }

  return {
    issues, warnings,
    styleName: style?.name,
    styleCode: style?.code,
    styleMatch: styleDeviations.length === 0,
    styleDeviations,
    volumeIssues,
    carbonationIssues,
  };
}

export type ValidationSeverity = 'error' | 'warning' | 'info';
export type ValidationCheckStatus = 'passed' | 'failed' | 'not_verified' | 'not_applicable';

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  path: string;
  declared?: unknown;
  expected?: unknown;
  message: string;
  source: string;
}

export interface ValidationCheck {
  id: string;
  status: ValidationCheckStatus;
  message: string;
  source: string;
}

export interface YamlValidationReport {
  schema_version: string;
  recipe_id: string;
  validation_status: 'valid' | 'invalid' | 'incomplete';
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
  checks: ValidationCheck[];
  normalized_recipe: ParsedRecipe;
  calculator_references: YamlValidatorInput['calculator_results'] | null;
  summary: string;
}

function issueFromMessage(code: string, path: string, message: string, source = 'yaml_validator'): ValidationIssue {
  return { code, severity: 'error', path, message, source };
}

function referenceList(reference: CalculatorReferenceInput | undefined): CalculatorReference[] {
  return reference === undefined ? [] : Array.isArray(reference) ? reference : [reference];
}

function referenceForCalculation(reference: CalculatorReferenceInput | undefined, calculation: string): CalculatorReference | undefined {
  return referenceList(reference).find(item => item.calculation === calculation);
}

function referenceStatus(reference: CalculatorReferenceInput | undefined): 'passed' | 'failed' | 'not_verified' {
  const references = referenceList(reference);
  if (references.length === 0) return 'not_verified';
  if (references.some(item => item.ok === false || item.status?.toLowerCase() === 'error')) return 'failed';
  if (references.some(item => item.ok === true || item.status?.toLowerCase() === 'ok' || item.status?.toLowerCase() === 'warning')) return 'passed';
  return 'not_verified';
}

function calculationStatus(reference: CalculatorReference | undefined): 'passed' | 'failed' | 'not_verified' {
  if (!reference) return 'not_verified';
  const status = reference.status?.toLowerCase();
  if (reference.ok === false || status === 'error') return 'failed';
  if (reference.ok === true || status === 'ok' || status === 'warning') return 'passed';
  return 'not_verified';
}

function calculatorValue(reference: CalculatorReference | undefined, key: string): unknown {
  const result = reference?.result;
  return result && typeof result === 'object' ? result[key] : undefined;
}

function compareCalculatorValues(
  errors: ValidationIssue[],
  checks: ValidationCheck[],
  recipe: ParsedRecipe,
  references: YamlValidatorInput['calculator_results'] | undefined,
): void {
  const comparisons: Array<{ calculator: keyof NonNullable<YamlValidatorInput['calculator_results']>; calculation: string; key: string; path: string; declared: number | undefined; code: string; tolerance: number }> = [
    { calculator: 'brewing', calculation: 'estimated_og', key: 'estimated_og', path: 'parametri.og', declared: recipe.og, code: 'BREWING_OG_MISMATCH', tolerance: 0.001 },
    { calculator: 'brewing', calculation: 'estimated_fg', key: 'fg', path: 'parametri.fg', declared: recipe.fg, code: 'BREWING_FG_MISMATCH', tolerance: 0.001 },
    { calculator: 'brewing', calculation: 'abv', key: 'abv_percent', path: 'parametri.abv_percent', declared: recipe.abv_percent, code: 'BREWING_ABV_MISMATCH', tolerance: 0.1 },
    { calculator: 'ibu', calculation: 'ibu', key: 'total_ibu', path: 'parametri.ibu', declared: recipe.ibu, code: 'IBU_TOTAL_MISMATCH', tolerance: 1 },
    { calculator: 'priming', calculation: 'priming', key: 'packaging_volume_l', path: 'parametri.confezionamento_litri', declared: recipe.packaging_volume_liters, code: 'PRIMING_VOLUME_MISMATCH', tolerance: 0.1 },
    { calculator: 'priming', calculation: 'priming', key: 'dosage_g_per_l', path: 'carbonazione.priming_gl', declared: recipe.priming_sugar_gl, code: 'PRIMING_DOSAGE_MISMATCH', tolerance: 0.1 },
    { calculator: 'priming', calculation: 'priming', key: 'total_fermentable_g', path: 'parametri.priming_totale_g', declared: recipe.priming_total_grams, code: 'PRIMING_TOTAL_MISMATCH', tolerance: 0.1 },
    { calculator: 'priming', calculation: 'priming', key: 'target_co2_volumes', path: 'carbonazione.co2_volumi', declared: recipe.carbonation_volumes, code: 'PRIMING_TARGET_MISMATCH', tolerance: 0.05 },
  ];
  for (const comparison of comparisons) {
    if (comparison.declared === undefined) continue;
    const reference = referenceForCalculation(references?.[comparison.calculator], comparison.calculation);
    const status = calculationStatus(reference);
    if (status === 'not_verified') {
      checks.push({ id: comparison.code, status, message: `Risultato ${comparison.calculation} non fornito dal calculator.`, source: `${comparison.calculator}_calculator` });
      continue;
    }
    if (status === 'failed') {
      checks.push({ id: comparison.code, status, message: `Il calculator ${comparison.calculation} ha restituito un errore.`, source: `${comparison.calculator}_calculator` });
      continue;
    }
    const expected = calculatorValue(reference, comparison.key);
    if (typeof expected !== 'number') {
      checks.push({ id: comparison.code, status: 'not_verified', message: `Il risultato ${comparison.calculation} non contiene ${comparison.key}.`, source: `${comparison.calculator}_calculator` });
      continue;
    }
    const passed = Math.abs(comparison.declared - expected) <= comparison.tolerance;
    checks.push({ id: comparison.code, status: passed ? 'passed' : 'failed', message: passed ? 'Valore dichiarato coerente con il calculator.' : 'Valore dichiarato diverso dal calculator.', source: `${comparison.calculator}_calculator` });
    if (!passed) errors.push({ code: comparison.code, severity: 'error', path: comparison.path, declared: comparison.declared, expected, message: 'Il valore dichiarato non coincide con il risultato strutturato del calculator.', source: `${comparison.calculator}_calculator` });
  }
  const estimatedFg = referenceForCalculation(references?.brewing, 'estimated_fg');
  if (recipe.abv_percent !== undefined && calculationStatus(estimatedFg) === 'passed' && calculatorValue(estimatedFg, 'abv_percent') !== undefined) {
    const abvComparison = comparisons.find(comparison => comparison.code === 'BREWING_ABV_MISMATCH');
    if (abvComparison && !referenceForCalculation(references?.brewing, 'abv')) {
      const expected = calculatorValue(estimatedFg, 'abv_percent');
      if (typeof expected === 'number') {
        const passed = Math.abs(recipe.abv_percent - expected) <= abvComparison.tolerance;
        const existing = checks.find(check => check.id === abvComparison.code);
        if (existing) existing.status = passed ? 'passed' : 'failed';
        if (!passed) errors.push({ code: abvComparison.code, severity: 'error', path: abvComparison.path, declared: recipe.abv_percent, expected, message: 'Il valore dichiarato non coincide con il risultato strutturato del calculator.', source: 'brewing_calculator' });
      }
    }
  }
}

export function buildValidationReport(
  recipe: ParsedRecipe,
  validation: ValidationResult,
  calculatorResults?: YamlValidatorInput['calculator_results'],
): YamlValidationReport {
  const errors: ValidationIssue[] = validation.issues.map((message, index) =>
    issueFromMessage(index === 0 ? 'RECIPE_DATA_INVALID' : 'RECIPE_CONSISTENCY_ERROR', 'recipe', message));
  for (const message of validation.volumeIssues) {
    errors.push(issueFromMessage('WATER_VOLUME_MISMATCH', 'acqua', message, 'yaml_validator'));
  }
  for (const message of validation.carbonationIssues) {
    errors.push(issueFromMessage('CARBONATION_MISMATCH', 'carbonazione', message, 'yaml_validator'));
  }
  const warnings: ValidationIssue[] = validation.warnings.map(message => ({
    code: message.startsWith('Deviazione BJCP:') ? 'BJCP_DEVIATION' : 'RECIPE_REVIEW_WARNING',
    severity: 'warning', path: 'recipe', message, source: 'yaml_validator',
  }));
  const checks: ValidationCheck[] = [
    { id: 'yaml_schema', status: 'passed', message: 'Parsing YAML e controlli strutturali completati.', source: 'yaml_validator' },
    { id: 'recipe_consistency', status: errors.length > 0 ? 'failed' : 'passed', message: errors.length > 0 ? 'Sono presenti errori deterministici.' : 'Valori dichiarati coerenti.', source: 'yaml_validator' },
    { id: 'water_calculator', status: referenceStatus(calculatorResults?.water), message: calculatorResults?.water ? 'Risultato Water Calculator ricevuto.' : 'Risultato Water Calculator non fornito.', source: 'water_profile_calculator' },
    { id: 'brewing_calculator', status: referenceStatus(calculatorResults?.brewing), message: calculatorResults?.brewing ? 'Risultato Brewing Calculator ricevuto.' : 'Risultato Brewing Calculator non fornito.', source: 'brewing_calculator' },
    { id: 'ibu_calculator', status: referenceStatus(calculatorResults?.ibu), message: calculatorResults?.ibu ? 'Risultato IBU Calculator ricevuto.' : 'Risultato IBU Calculator non fornito.', source: 'ibu_calculator' },
    { id: 'priming_calculator', status: referenceStatus(calculatorResults?.priming), message: calculatorResults?.priming ? 'Risultato Priming Calculator ricevuto.' : 'Risultato Priming Calculator non fornito.', source: 'priming_calculator' },
  ];
  for (const [name, reference] of Object.entries(calculatorResults ?? {})) {
    if (reference && referenceStatus(reference) === 'failed') {
      errors.push(issueFromMessage('CALCULATOR_ERROR', `calculator_references.${name}`, `Il calculator ${name} ha restituito un errore; i controlli dipendenti non sono verificati.`, name));
    }
  }
  compareCalculatorValues(errors, checks, recipe, calculatorResults);
  const validationStatus = errors.length > 0 ? 'invalid' : checks.some(check => check.status === 'not_verified') ? 'incomplete' : 'valid';
  return {
    schema_version: recipe.schema_version ?? '1.0',
    recipe_id: recipe.recipe_name,
    validation_status: validationStatus,
    errors,
    warnings,
    info: [],
    checks,
    normalized_recipe: recipe,
    calculator_references: calculatorResults ?? null,
    summary: validationStatus === 'valid'
      ? 'Ricetta strutturalmente valida; la conformità BJCP resta una valutazione separata.'
      : validationStatus === 'incomplete'
        ? 'Ricetta strutturalmente valida ma con controlli calculator non verificati.'
        : `Ricetta non valida: ${errors.length} errore/i deterministico/i.`,
  };
}

export function validateYamlFile(inputPath: string, calculatorResults?: YamlValidatorInput['calculator_results']): YamlValidationReport {
  const recipe = parseYamlRecipe(inputPath);
  return buildValidationReport(recipe, validateRecipe(recipe), calculatorResults);
}

// ============================================================================
// TOOL
// ============================================================================

export class YamlValidatorTool implements BuiltinTool<YamlValidatorInput> {
  readonly name = 'yaml_validator' as const;
  readonly description =
    'Valida deterministicamente una ricetta YAML e restituisce un report JSON con ricetta normalizzata, errori, warning, controlli e riferimenti ai calculator.';
  readonly parameters: Record<string, unknown> = toInputJsonSchema(YamlValidatorInputSchema);

  resolveExecution(args: YamlValidatorInput): ToolExecution {
    return {
      description: `Validate YAML recipe: ${args.input_file}`,
      approvalRule: this.name,
      execute: () => this.execute(args),
    };
  }

  private execute(args: YamlValidatorInput): Promise<ExecutableToolResult> {
    try {
      const recipe = parseYamlRecipe(args.input_file);
      const v = validateRecipe(recipe);
      const style = findStyle(recipe.beer_style);
      const allMatches = findAllStyles(recipe.beer_style);
      const report = buildValidationReport(recipe, v, args.calculator_results);
      if (!style && allMatches.length > 0) {
        report.warnings.push({ code: 'BJCP_STYLE_AMBIGUOUS', severity: 'warning', path: 'stile', message: `Stile non riconosciuto esattamente; candidati: ${allMatches.map(s => `${s.code} ${s.name}`).join(', ')}.`, source: 'bjcp_database' });
      }
      return Promise.resolve({ output: JSON.stringify(report, null, 2) });
    } catch (e) {
      return Promise.resolve({
        isError: true,
        output: e instanceof Error ? e.message : String(e),
      });
    }
  }
}

registerTool(YamlValidatorTool);
