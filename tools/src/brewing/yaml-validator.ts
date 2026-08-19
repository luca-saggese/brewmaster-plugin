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

export const YamlValidatorInputSchema = z.object({
  input_file: z.string().describe('Path to the recipe YAML file.'),
});

export type YamlValidatorInput = z.infer<typeof YamlValidatorInputSchema>;

// ============================================================================
// COMPLETE BJCP 2021 STYLE DATABASE
// ============================================================================
// Sources: BJCP Style Guidelines 2021 edition.
// Fields: og_min, og_max, fg_min, fg_max, abv_min, abv_max, ibu_min, ibu_max,
//         ebc_min, ebc_max.  All gravities in SG, ABV in %, IBU as-is, EBC as-is.

interface BjcpStyle {
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

function findStyle(q: string): BjcpStyle | undefined {
  if (BJCP[q]) return BJCP[q];
  const lq = q.toLowerCase();
  // Exact code match first, then name substring match
  for (const s of Object.values(BJCP)) {
    if (s.name.toLowerCase().includes(lq)) return s;
    // Also try matching just the code part (e.g., "IPA" → 21A)
    if (s.code.toLowerCase() === lq) return s;
  }
  return undefined;
}

function findAllStyles(query: string): BjcpStyle[] {
  const lq = query.toLowerCase();
  return Object.values(BJCP).filter(
    s => s.name.toLowerCase().includes(lq) || s.code.toLowerCase().includes(lq),
  );
}

// ============================================================================
// YAML → structured recipe mapping
// ============================================================================

interface ParsedRecipe {
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
  impianto?: string;
  descrizione?: string;
  note?: string;
  spezie?: { nome: string; grammi: number; uso: string; tempo_min?: number; note?: string }[];
  zuccheri?: { tipo: string; grammi: number; note?: string }[];
  rawYaml: string;
}

const VALID_HOP_USES = new Set(['boil', 'whirlpool', 'dry_hop', 'first_wort', 'mash', 'hopback', 'dip_hop', 'hop_stand']);

function parseYamlRecipe(filePath: string): ParsedRecipe {
  if (!existsSync(filePath)) {
    throw new Error(`File non trovato: ${filePath}`);
  }

  const raw = readFileSync(filePath, 'utf-8');
  const data = yaml.load(raw) as unknown;
  if (typeof data !== 'object' || data === null) {
    throw new Error('Il file YAML non contiene un oggetto valido.');
  }

  const d = data as Record<string, unknown>;
  const params = (d['parametri'] ?? {}) as Record<string, unknown>;

  // Required fields
  const recipe_name = String(d['nome'] ?? '');
  const beer_style = String(d['stile'] ?? '');
  const batch_size_liters = Number(params['batch_size_litri']);
  const og = Number(params['og']);
  const fg = Number(params['fg']);
  const ibu = Number(params['ibu']);

  // Optional params
  const ebc = params['ebc'] != null ? Number(params['ebc']) : undefined;
  const abv_percent = params['abv_percent'] != null ? Number(params['abv_percent']) : undefined;
  const efficiency_percent = params['efficienza_percent'] != null ? Number(params['efficienza_percent']) : undefined;
  const boil_time_minutes = params['bollitura_min'] != null ? Number(params['bollitura_min']) : undefined;

  // Volumes
  const pre_boil_volume_liters = params['pre_boil_litri'] != null ? Number(params['pre_boil_litri']) : undefined;
  const post_boil_volume_liters = params['post_boil_litri'] != null ? Number(params['post_boil_litri']) : undefined;
  const fermentation_volume_liters = params['fermentatore_litri'] != null ? Number(params['fermentatore_litri']) : undefined;
  const packaging_volume_liters = params['confezionamento_litri'] != null ? Number(params['confezionamento_litri']) : undefined;

  // Equipment
  const impianto = typeof params['impianto'] === 'string' ? params['impianto'] : undefined;

  // Carbonation
  const carbonation_volumes = params['carbonazione_vol'] != null ? Number(params['carbonazione_vol']) : undefined;
  const carbonation_method = typeof params['carbonazione_metodo'] === 'string' ? params['carbonazione_metodo'] : undefined;
  const priming_sugar_gl = params['priming_gl'] != null ? Number(params['priming_gl']) : undefined;

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
    ca: Number(acqua['ca'] ?? 0),
    mg: Number(acqua['mg'] ?? 0),
    na: Number(acqua['na'] ?? 0),
    cl: Number(acqua['cl'] ?? 0),
    so4: Number(acqua['so4'] ?? 0),
    hco3: Number(acqua['hco3'] ?? 0),
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

  // Validate required fields
  const missing: string[] = [];
  if (!recipe_name) missing.push('nome');
  if (!beer_style) missing.push('stile');
  if (isNaN(batch_size_liters) || batch_size_liters <= 0) missing.push('parametri.batch_size_litri');
  if (isNaN(og) || og <= 0) missing.push('parametri.og');
  if (isNaN(fg) || fg <= 0) missing.push('parametri.fg');
  if (isNaN(ibu) || ibu < 0) missing.push('parametri.ibu');

  if (missing.length > 0) {
    throw new Error(`Campi obbligatori mancanti o non validi: ${missing.join(', ')}`);
  }

  return {
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
    impianto,
    descrizione,
    note,
    spezie,
    zuccheri,
    rawYaml: raw,
  };
}

// ============================================================================
// DETERMINISTIC VALIDATION
// ============================================================================

interface ValidationResult {
  issues: string[];
  warnings: string[];
  abv: number;
  ibuRatio: number;
  specPct: number;
  totalGrainKg: number;
  totalHopGrams: number;
  dryHopGrams: number;
  buGu: number;
  styleName?: string;
  styleCode?: string;
  styleMatch: boolean;
  styleDeviations: string[];
  volumeIssues: string[];
  carbonationIssues: string[];
}

function validateRecipe(r: ParsedRecipe): ValidationResult {
  const style = findStyle(r.beer_style);
  const issues: string[] = [];
  const warnings: string[] = [];
  const styleDeviations: string[] = [];
  const volumeIssues: string[] = [];
  const carbonationIssues: string[] = [];

  const abv = (r.og - r.fg) * 131.25;
  const totalGrainKg = r.grain_bill.reduce((s, g) => s + g.kg, 0);
  const totalHopGrams = r.hop_schedule.reduce((s, h) => s + h.grams, 0);
  const dryHopGrams = r.hop_schedule.filter(h => h.use === 'dry_hop').reduce((s, h) => s + h.grams, 0);

  // ── BJCP style checks ──
  if (style) {
    if (r.og < style.og_min) styleDeviations.push(`OG ${r.og.toFixed(3)} < min ${style.og_min.toFixed(3)}`);
    if (r.og > style.og_max) styleDeviations.push(`OG ${r.og.toFixed(3)} > max ${style.og_max.toFixed(3)}`);
    if (r.fg < style.fg_min) styleDeviations.push(`FG ${r.fg.toFixed(3)} < min ${style.fg_min.toFixed(3)}`);
    if (r.fg > style.fg_max) styleDeviations.push(`FG ${r.fg.toFixed(3)} > max ${style.fg_max.toFixed(3)}`);
    if (r.ibu < style.ibu_min) styleDeviations.push(`IBU ${r.ibu} < min ${style.ibu_min}`);
    if (r.ibu > style.ibu_max) styleDeviations.push(`IBU ${r.ibu} > max ${style.ibu_max}`);
    if (abv < style.abv_min) styleDeviations.push(`ABV ${abv.toFixed(1)}% < min ${style.abv_min}%`);
    if (abv > style.abv_max) styleDeviations.push(`ABV ${abv.toFixed(1)}% > max ${style.abv_max}%`);
    if (r.ebc !== undefined && (r.ebc < style.ebc_min || r.ebc > style.ebc_max))
      styleDeviations.push(`EBC ${r.ebc} fuori range (${style.ebc_min}–${style.ebc_max})`);
  }

  // ── Critical issues (from style deviations) ──
  if (style) {
    if (r.og < style.og_min || r.og > style.og_max)
      issues.push(`OG ${r.og.toFixed(3)} fuori range (${style.og_min.toFixed(3)}–${style.og_max.toFixed(3)})`);
    if (r.ibu < style.ibu_min || r.ibu > style.ibu_max)
      issues.push(`IBU ${r.ibu} fuori range (${style.ibu_min}–${style.ibu_max})`);
    if (abv < style.abv_min || abv > style.abv_max)
      issues.push(`ABV ${abv.toFixed(1)}% fuori range (${style.abv_min}–${style.abv_max}%)`);
    if (r.fg < style.fg_min || r.fg > style.fg_max)
      warnings.push(`FG ${r.fg.toFixed(3)} fuori range (${style.fg_min.toFixed(3)}–${style.fg_max.toFixed(3)})`);
    if (r.ebc !== undefined && (r.ebc < style.ebc_min || r.ebc > style.ebc_max))
      warnings.push(`EBC ${r.ebc} fuori range (${style.ebc_min}–${style.ebc_max})`);
  }

  // ── IBU/OG balance ──
  const ibuRatio = r.ibu / ((r.og - 1) * 1000);
  const buGu = r.og > 1 ? r.ibu / ((r.og - 1) * 1000) : 0;
  if (ibuRatio < 0.2) issues.push('Rapporto IBU/OG molto basso (<0.2) — sbilanciata verso il malto.');
  else if (ibuRatio > 1.5) issues.push('Rapporto IBU/OG molto alto (>1.5) — amaro eccessivo.');
  else if (ibuRatio > 1.0) warnings.push('Rapporto IBU/OG alto — verifica lo stile.');

  // ── Grain bill analysis ──
  let specPct = 0, basePct = 0;
  for (const g of r.grain_bill) {
    const pct = g.percent ?? (g.kg / totalGrainKg) * 100;
    const n = g.malt.toLowerCase();
    if (
      n.includes('pilsner') || n.includes('pale') || n.includes('maris otter') ||
      n.includes('munich') || n.includes('vienna') || n.includes('wheat') ||
      n.includes('base') || n.includes('pils')
    ) basePct += pct;
    if (
      n.includes('crystal') || n.includes('caramel') || n.includes('chocolate') ||
      n.includes('black') || n.includes('roast') || n.includes('special') ||
      n.includes('cara') || n.includes('melanoidin') || n.includes('aromatic') ||
      n.includes('biscuit')
    ) specPct += pct;
    if (
      pct > 20 && !n.includes('base') && !n.includes('pilsner') &&
      !n.includes('pale') && !n.includes('pils')
    )
      warnings.push(`Malto "${g.malt}" al ${pct.toFixed(0)}% — percentuale alta.`);
  }
  if (specPct > 25) issues.push(`Malti speciali al ${specPct.toFixed(0)}% — rischio dolcezza/astringenza.`);
  else if (specPct > 15) warnings.push(`Malti speciali al ${specPct.toFixed(0)}%.`);
  if (basePct < 60 && totalGrainKg > 0) warnings.push(`Malto base al ${basePct.toFixed(0)}% — basso.`);

  // ── Dry hop check ──
  if (dryHopGrams > 20 * r.batch_size_liters)
    warnings.push(`Dry hop molto alto (${dryHopGrams}g in ${r.batch_size_liters}L) — rischio astringenza/ossidazione.`);

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
  if (r.priming_sugar_gl !== undefined && r.carbonation_volumes !== undefined) {
    // Rough check: ~4 g/L sucrose = 1 vol CO₂ at 20°C
    const expectedPriming = (r.carbonation_volumes - 0.85) * 4 * r.batch_size_liters;
    if (Math.abs(r.priming_sugar_gl * r.batch_size_liters - expectedPriming) > expectedPriming * 0.4)
      carbonationIssues.push(`Dosaggio priming (${r.priming_sugar_gl} g/L) incoerente con carbonazione target (${r.carbonation_volumes} vol).`);
  }

  // ── ABV consistency ──
  if (r.abv_percent !== undefined && Math.abs(r.abv_percent - abv) > 0.5)
    warnings.push(`ABV dichiarato (${r.abv_percent}%) ≠ calcolato (${abv.toFixed(1)}%) — differenza >0.5%.`);

  // ── Efficiency sanity ──
  if (r.efficiency_percent !== undefined) {
    if (r.efficiency_percent > 100) warnings.push('Efficienza >100% — impossibile senza errori di misura.');
    else if (r.efficiency_percent < 50) warnings.push('Efficienza <50% — molto bassa, verificare la macinatura e il mash.');
    else if (r.efficiency_percent > 85) warnings.push('Efficienza >85% — molto alta per homebrewing standard.');
  }

  // ── Grain weight vs OG sanity ──
  if (totalGrainKg > 0 && r.batch_size_liters > 0) {
    // Approximate: points = (kg * extract_potential * efficiency) / liters
    // For 80% efficiency, typical base malt yields ~300 pts/kg/L
    const expectedMaxOG = 1 + (totalGrainKg * 0.080) / r.batch_size_liters;
    if (r.og > expectedMaxOG * 1.05)
      warnings.push(`OG (${r.og.toFixed(3)}) troppo alto per ${totalGrainKg.toFixed(1)}kg di grani in ${r.batch_size_liters}L (max stimato ~${expectedMaxOG.toFixed(3)}).`);
  }

  return {
    issues, warnings, abv, ibuRatio, specPct,
    totalGrainKg, totalHopGrams, dryHopGrams, buGu,
    styleName: style?.name,
    styleCode: style?.code,
    styleMatch: styleDeviations.length === 0,
    styleDeviations,
    volumeIssues,
    carbonationIssues,
  };
}

// ============================================================================
// TOOL
// ============================================================================

export class YamlValidatorTool implements BuiltinTool<YamlValidatorInput> {
  readonly name = 'yaml_validator' as const;
  readonly description =
    'Validate a beer recipe YAML file against BJCP style guidelines. Reads the YAML and runs ALL deterministic checks: OG, FG, ABV, IBU, EBC, grain bill composition, hop schedule, mash temperature, water profile, volume consistency, carbonation, efficiency sanity, and more. Use this FIRST when validating a recipe. Then use recipe_validator with the structured data for LLM qualitative review.';
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
      const valid = v.issues.length === 0;

      const report = [
        `**Validazione ricetta: ${recipe.recipe_name}**`,
        `File: ${args.input_file}`,
        style
          ? `Stile: ${style.code} — ${style.name} (Cat. ${style.category})`
          : allMatches.length > 0
            ? `Stile "${recipe.beer_style}" non trovato esattamente. Stili simili: ${allMatches.map(s => `${s.code} ${s.name}`).join(', ')}`
            : `Stile "${recipe.beer_style}" non trovato nel database BJCP.`,
        '',
        '── Parametri calcolati ──',
        `ABV: ${v.abv.toFixed(1)}% | IBU/OG: ${v.ibuRatio.toFixed(2)} | BU/GU: ${v.buGu.toFixed(2)}`,
        `Malti speciali: ${v.specPct.toFixed(1)}% | Grani: ${v.totalGrainKg.toFixed(2)}kg | Luppolo: ${v.totalHopGrams}g (dry: ${v.dryHopGrams}g)`,
        style ? `Stile BJCP: ${v.styleMatch ? '✅ IN STYLE' : '❌ FUORI STILE'}` : '',
        '',
        valid ? '✅ Valida — nessun errore critico.' : '❌ Errori critici:',
        ...v.issues.map(i => `  ❌ ${i}`),
        ...(v.warnings.length ? ['', '⚠️ Avvisi:', ...v.warnings.map(w => `  ⚠️ ${w}`)] : []),
        ...(v.volumeIssues.length ? ['', '📐 Problemi volumi:', ...v.volumeIssues.map(iv => `  📐 ${iv}`)] : []),
        ...(v.carbonationIssues.length ? ['', '🫧 Problemi carbonazione:', ...v.carbonationIssues.map(ic => `  🫧 ${ic}`)] : []),
        '',
        '💡 Usa recipe_validator con i dati strutturati per la revisione qualitativa LLM.',
      ].join('\n');

      return Promise.resolve({ output: report });
    } catch (e) {
      return Promise.resolve({
        isError: true,
        output: e instanceof Error ? e.message : String(e),
      });
    }
  }
}

registerTool(YamlValidatorTool);
