/**
 * Recipe validator — produces a complete LLM review prompt for a beer recipe
 * against BJCP style guidelines.
 *
 * Use this tool AFTER running yaml_validator on the YAML file. The yaml_validator
 * covers all deterministic checks; recipe_validator takes the structured recipe
 * data (passed directly as JSON) and builds a comprehensive LLM review prompt
 * with BJCP data, recipe summary, and the expected output JSON schema.
 */

import { z } from 'zod';

import type { BuiltinTool, ExecutableToolResult, ToolExecution } from '../shim/tool-contract';
import { registerTool } from '../shim/tool-registry';
import { toInputJsonSchema } from '../shim/input-schema';

export const RecipeValidatorInputSchema = z.object({
  recipe_name: z.string(),
  beer_style: z.string().describe('BJCP style code or name.'),
  batch_size_liters: z.number(),
  og: z.number(),
  fg: z.number(),
  ibu: z.number(),
  ebc: z.number().optional(),
  abv_percent: z.number().optional(),
  efficiency_percent: z.number().optional(),
  grain_bill: z.array(z.object({ malt: z.string(), kg: z.number(), percent: z.number().optional(), ebc: z.number().optional(), note: z.string().optional() })),
  hop_schedule: z.array(z.object({ variety: z.string(), grams: z.number(), time_minutes: z.number(), use: z.enum(['boil', 'whirlpool', 'dry_hop', 'first_wort', 'mash', 'hopback', 'dip_hop', 'hop_stand']), aa_percent: z.number().optional(), ibu_contrib: z.number().optional(), note: z.string().optional() })),
  yeast: z.object({ strain: z.string(), attenuation_percent: z.number().optional(), lab: z.string().optional() }),
  mash_temp_c: z.number().optional(),
  mash_steps: z.array(z.object({ temperature_c: z.number(), time_minutes: z.number(), note: z.string().optional() })).optional(),
  fermentation_temp_c: z.number().optional(),
  water_profile: z.object({ ca: z.number(), mg: z.number(), na: z.number(), cl: z.number(), so4: z.number(), hco3: z.number() }).optional(),
  boil_time_minutes: z.number().optional(),
  pre_boil_volume_liters: z.number().optional(),
  post_boil_volume_liters: z.number().optional(),
  fermentation_volume_liters: z.number().optional(),
  packaging_volume_liters: z.number().optional(),
  carbonation_volumes: z.number().optional(),
  carbonation_method: z.string().optional(),
  priming_sugar_gl: z.number().optional(),
  impianto: z.string().optional(),
  descrizione: z.string().optional(),
  note: z.string().optional(),
});

export type RecipeValidatorInput = z.infer<typeof RecipeValidatorInputSchema>;

interface BjcpStyle { code: string; name: string; category: string; og_min: number; og_max: number; fg_min: number; fg_max: number; abv_min: number; abv_max: number; ibu_min: number; ibu_max: number; ebc_min: number; ebc_max: number }

const BJCP: Record<string, BjcpStyle> = {
  '1A': { code: '1A', category: '1', name: 'American Light Lager', og_min: 1.028, og_max: 1.040, fg_min: 0.998, fg_max: 1.008, abv_min: 2.8, abv_max: 4.2, ibu_min: 8, ibu_max: 12, ebc_min: 4, ebc_max: 6 },
  '1B': { code: '1B', category: '1', name: 'American Lager', og_min: 1.040, og_max: 1.050, fg_min: 1.004, fg_max: 1.010, abv_min: 4.2, abv_max: 5.3, ibu_min: 8, ibu_max: 18, ebc_min: 4, ebc_max: 8 },
  '1C': { code: '1C', category: '1', name: 'Cream Ale', og_min: 1.042, og_max: 1.055, fg_min: 1.006, fg_max: 1.012, abv_min: 4.2, abv_max: 5.6, ibu_min: 8, ibu_max: 20, ebc_min: 4, ebc_max: 10 },
  '1D': { code: '1D', category: '1', name: 'American Wheat Beer', og_min: 1.040, og_max: 1.055, fg_min: 1.008, fg_max: 1.013, abv_min: 4.0, abv_max: 5.5, ibu_min: 15, ibu_max: 30, ebc_min: 6, ebc_max: 12 },
  '2A': { code: '2A', category: '2', name: 'International Pale Lager', og_min: 1.042, og_max: 1.050, fg_min: 1.008, fg_max: 1.012, abv_min: 4.6, abv_max: 6.0, ibu_min: 18, ibu_max: 25, ebc_min: 4, ebc_max: 10 },
  '2B': { code: '2B', category: '2', name: 'International Amber Lager', og_min: 1.042, og_max: 1.055, fg_min: 1.008, fg_max: 1.014, abv_min: 4.6, abv_max: 6.0, ibu_min: 8, ibu_max: 25, ebc_min: 14, ebc_max: 34 },
  '2C': { code: '2C', category: '2', name: 'International Dark Lager', og_min: 1.044, og_max: 1.056, fg_min: 1.008, fg_max: 1.012, abv_min: 4.5, abv_max: 6.0, ibu_min: 8, ibu_max: 20, ebc_min: 28, ebc_max: 50 },
  '3A': { code: '3A', category: '3', name: 'Czech Pale Lager', og_min: 1.028, og_max: 1.044, fg_min: 1.008, fg_max: 1.014, abv_min: 3.0, abv_max: 4.0, ibu_min: 20, ibu_max: 35, ebc_min: 6, ebc_max: 14 },
  '3B': { code: '3B', category: '3', name: 'Czech Premium Pale Lager', og_min: 1.044, og_max: 1.060, fg_min: 1.013, fg_max: 1.017, abv_min: 4.2, abv_max: 5.8, ibu_min: 30, ibu_max: 45, ebc_min: 6, ebc_max: 14 },
  '3C': { code: '3C', category: '3', name: 'Czech Amber Lager', og_min: 1.044, og_max: 1.060, fg_min: 1.013, fg_max: 1.017, abv_min: 4.4, abv_max: 5.8, ibu_min: 20, ibu_max: 35, ebc_min: 20, ebc_max: 40 },
  '3D': { code: '3D', category: '3', name: 'Czech Dark Lager', og_min: 1.044, og_max: 1.056, fg_min: 1.013, fg_max: 1.017, abv_min: 4.4, abv_max: 5.8, ibu_min: 18, ibu_max: 34, ebc_min: 34, ebc_max: 70 },
  '4A': { code: '4A', category: '4', name: 'Munich Helles', og_min: 1.044, og_max: 1.048, fg_min: 1.006, fg_max: 1.012, abv_min: 4.7, abv_max: 5.4, ibu_min: 16, ibu_max: 22, ebc_min: 6, ebc_max: 10 },
  '4B': { code: '4B', category: '4', name: 'Festbier', og_min: 1.054, og_max: 1.058, fg_min: 1.010, fg_max: 1.014, abv_min: 5.8, abv_max: 6.3, ibu_min: 18, ibu_max: 25, ebc_min: 8, ebc_max: 14 },
  '4C': { code: '4C', category: '4', name: 'Helles Bock', og_min: 1.064, og_max: 1.072, fg_min: 1.011, fg_max: 1.018, abv_min: 6.3, abv_max: 7.4, ibu_min: 23, ibu_max: 35, ebc_min: 12, ebc_max: 20 },
  '5A': { code: '5A', category: '5', name: 'German Leichtbier', og_min: 1.026, og_max: 1.034, fg_min: 1.006, fg_max: 1.010, abv_min: 2.4, abv_max: 3.6, ibu_min: 15, ibu_max: 28, ebc_min: 4, ebc_max: 8 },
  '5B': { code: '5B', category: '5', name: 'Kölsch', og_min: 1.044, og_max: 1.050, fg_min: 1.007, fg_max: 1.011, abv_min: 4.4, abv_max: 5.2, ibu_min: 18, ibu_max: 30, ebc_min: 7, ebc_max: 10 },
  '5C': { code: '5C', category: '5', name: 'German Helles Exportbier', og_min: 1.048, og_max: 1.056, fg_min: 1.010, fg_max: 1.015, abv_min: 4.8, abv_max: 6.0, ibu_min: 20, ibu_max: 30, ebc_min: 8, ebc_max: 12 },
  '5D': { code: '5D', category: '5', name: 'German Pils', og_min: 1.044, og_max: 1.050, fg_min: 1.008, fg_max: 1.013, abv_min: 4.4, abv_max: 5.2, ibu_min: 22, ibu_max: 40, ebc_min: 4, ebc_max: 8 },
  '6A': { code: '6A', category: '6', name: 'Märzen', og_min: 1.054, og_max: 1.060, fg_min: 1.010, fg_max: 1.014, abv_min: 5.8, abv_max: 6.3, ibu_min: 18, ibu_max: 24, ebc_min: 16, ebc_max: 30 },
  '6B': { code: '6B', category: '6', name: 'Rauchbier', og_min: 1.050, og_max: 1.057, fg_min: 1.012, fg_max: 1.016, abv_min: 4.8, abv_max: 6.0, ibu_min: 20, ibu_max: 30, ebc_min: 24, ebc_max: 44 },
  '6C': { code: '6C', category: '6', name: 'Dunkels Bock', og_min: 1.064, og_max: 1.072, fg_min: 1.013, fg_max: 1.019, abv_min: 6.3, abv_max: 7.2, ibu_min: 20, ibu_max: 27, ebc_min: 28, ebc_max: 44 },
  '7A': { code: '7A', category: '7', name: 'Vienna Lager', og_min: 1.048, og_max: 1.055, fg_min: 1.010, fg_max: 1.014, abv_min: 4.7, abv_max: 5.5, ibu_min: 18, ibu_max: 30, ebc_min: 18, ebc_max: 30 },
  '7B': { code: '7B', category: '7', name: 'Altbier', og_min: 1.044, og_max: 1.052, fg_min: 1.008, fg_max: 1.014, abv_min: 4.3, abv_max: 5.5, ibu_min: 25, ibu_max: 50, ebc_min: 22, ebc_max: 34 },
  '7C': { code: '7C', category: '7', name: 'Kellerbier', og_min: 1.045, og_max: 1.051, fg_min: 1.008, fg_max: 1.013, abv_min: 4.7, abv_max: 5.4, ibu_min: 20, ibu_max: 35, ebc_min: 6, ebc_max: 20 },
  '8A': { code: '8A', category: '8', name: 'Munich Dunkel', og_min: 1.048, og_max: 1.056, fg_min: 1.010, fg_max: 1.016, abv_min: 4.5, abv_max: 5.6, ibu_min: 18, ibu_max: 28, ebc_min: 28, ebc_max: 46 },
  '8B': { code: '8B', category: '8', name: 'Schwarzbier', og_min: 1.046, og_max: 1.052, fg_min: 1.010, fg_max: 1.016, abv_min: 4.4, abv_max: 5.4, ibu_min: 22, ibu_max: 30, ebc_min: 34, ebc_max: 62 },
  '9A': { code: '9A', category: '9', name: 'Doppelbock', og_min: 1.072, og_max: 1.112, fg_min: 1.016, fg_max: 1.024, abv_min: 7.0, abv_max: 10.0, ibu_min: 16, ibu_max: 26, ebc_min: 24, ebc_max: 45 },
  '9B': { code: '9B', category: '9', name: 'Eisbock', og_min: 1.078, og_max: 1.120, fg_min: 1.020, fg_max: 1.035, abv_min: 9.0, abv_max: 14.0, ibu_min: 25, ibu_max: 35, ebc_min: 36, ebc_max: 68 },
  '9C': { code: '9C', category: '9', name: 'Baltic Porter', og_min: 1.060, og_max: 1.090, fg_min: 1.016, fg_max: 1.024, abv_min: 6.5, abv_max: 9.5, ibu_min: 20, ibu_max: 40, ebc_min: 34, ebc_max: 60 },
  '10A': { code: '10A', category: '10', name: 'Weissbier', og_min: 1.044, og_max: 1.052, fg_min: 1.010, fg_max: 1.014, abv_min: 4.3, abv_max: 5.6, ibu_min: 8, ibu_max: 15, ebc_min: 4, ebc_max: 14 },
  '10B': { code: '10B', category: '10', name: 'Dunkles Weissbier', og_min: 1.044, og_max: 1.056, fg_min: 1.010, fg_max: 1.014, abv_min: 4.3, abv_max: 5.6, ibu_min: 10, ibu_max: 18, ebc_min: 28, ebc_max: 46 },
  '10C': { code: '10C', category: '10', name: 'Weizenbock', og_min: 1.064, og_max: 1.090, fg_min: 1.015, fg_max: 1.022, abv_min: 6.5, abv_max: 9.0, ibu_min: 15, ibu_max: 30, ebc_min: 12, ebc_max: 44 },
  '11A': { code: '11A', category: '11', name: 'Ordinary Bitter', og_min: 1.030, og_max: 1.039, fg_min: 1.007, fg_max: 1.011, abv_min: 3.2, abv_max: 3.8, ibu_min: 25, ibu_max: 35, ebc_min: 16, ebc_max: 28 },
  '11B': { code: '11B', category: '11', name: 'Best Bitter', og_min: 1.040, og_max: 1.048, fg_min: 1.008, fg_max: 1.012, abv_min: 3.8, abv_max: 4.6, ibu_min: 25, ibu_max: 40, ebc_min: 16, ebc_max: 28 },
  '11C': { code: '11C', category: '11', name: 'Strong Bitter', og_min: 1.048, og_max: 1.060, fg_min: 1.010, fg_max: 1.016, abv_min: 4.6, abv_max: 6.2, ibu_min: 30, ibu_max: 50, ebc_min: 18, ebc_max: 40 },
  '12A': { code: '12A', category: '12', name: 'British Golden Ale', og_min: 1.038, og_max: 1.053, fg_min: 1.006, fg_max: 1.012, abv_min: 3.8, abv_max: 5.0, ibu_min: 20, ibu_max: 45, ebc_min: 4, ebc_max: 12 },
  '12B': { code: '12B', category: '12', name: 'Australian Sparkling Ale', og_min: 1.038, og_max: 1.050, fg_min: 1.004, fg_max: 1.006, abv_min: 4.5, abv_max: 6.0, ibu_min: 20, ibu_max: 35, ebc_min: 4, ebc_max: 14 },
  '12C': { code: '12C', category: '12', name: 'English IPA', og_min: 1.050, og_max: 1.075, fg_min: 1.010, fg_max: 1.018, abv_min: 5.0, abv_max: 7.5, ibu_min: 40, ibu_max: 60, ebc_min: 12, ebc_max: 30 },
  '13A': { code: '13A', category: '13', name: 'Dark Mild', og_min: 1.030, og_max: 1.038, fg_min: 1.008, fg_max: 1.013, abv_min: 3.0, abv_max: 3.8, ibu_min: 10, ibu_max: 25, ebc_min: 24, ebc_max: 44 },
  '13B': { code: '13B', category: '13', name: 'British Brown Ale', og_min: 1.040, og_max: 1.052, fg_min: 1.008, fg_max: 1.013, abv_min: 4.2, abv_max: 5.9, ibu_min: 20, ibu_max: 30, ebc_min: 24, ebc_max: 44 },
  '13C': { code: '13C', category: '13', name: 'English Porter', og_min: 1.040, og_max: 1.052, fg_min: 1.008, fg_max: 1.014, abv_min: 4.0, abv_max: 5.4, ibu_min: 18, ibu_max: 35, ebc_min: 40, ebc_max: 60 },
  '14A': { code: '14A', category: '14', name: 'Scottish Light', og_min: 1.030, og_max: 1.035, fg_min: 1.010, fg_max: 1.013, abv_min: 2.5, abv_max: 3.2, ibu_min: 10, ibu_max: 20, ebc_min: 30, ebc_max: 50 },
  '14B': { code: '14B', category: '14', name: 'Scottish Heavy', og_min: 1.035, og_max: 1.040, fg_min: 1.010, fg_max: 1.015, abv_min: 3.2, abv_max: 3.9, ibu_min: 10, ibu_max: 20, ebc_min: 24, ebc_max: 40 },
  '14C': { code: '14C', category: '14', name: 'Scottish Export', og_min: 1.040, og_max: 1.060, fg_min: 1.010, fg_max: 1.016, abv_min: 3.9, abv_max: 6.0, ibu_min: 15, ibu_max: 30, ebc_min: 24, ebc_max: 40 },
  '15A': { code: '15A', category: '15', name: 'Irish Red Ale', og_min: 1.036, og_max: 1.046, fg_min: 1.010, fg_max: 1.014, abv_min: 3.8, abv_max: 5.0, ibu_min: 18, ibu_max: 28, ebc_min: 18, ebc_max: 36 },
  '15B': { code: '15B', category: '15', name: 'Irish Stout', og_min: 1.036, og_max: 1.044, fg_min: 1.007, fg_max: 1.011, abv_min: 4.0, abv_max: 4.5, ibu_min: 25, ibu_max: 45, ebc_min: 50, ebc_max: 80 },
  '15C': { code: '15C', category: '15', name: 'Irish Extra Stout', og_min: 1.052, og_max: 1.062, fg_min: 1.010, fg_max: 1.014, abv_min: 5.5, abv_max: 6.5, ibu_min: 35, ibu_max: 50, ebc_min: 60, ebc_max: 80 },
  '16A': { code: '16A', category: '16', name: 'Sweet Stout', og_min: 1.044, og_max: 1.060, fg_min: 1.012, fg_max: 1.024, abv_min: 4.0, abv_max: 6.0, ibu_min: 20, ibu_max: 40, ebc_min: 60, ebc_max: 100 },
  '16B': { code: '16B', category: '16', name: 'Oatmeal Stout', og_min: 1.045, og_max: 1.065, fg_min: 1.010, fg_max: 1.018, abv_min: 4.2, abv_max: 5.9, ibu_min: 25, ibu_max: 40, ebc_min: 40, ebc_max: 80 },
  '16C': { code: '16C', category: '16', name: 'Tropical Stout', og_min: 1.056, og_max: 1.075, fg_min: 1.010, fg_max: 1.018, abv_min: 5.5, abv_max: 8.0, ibu_min: 30, ibu_max: 50, ebc_min: 60, ebc_max: 100 },
  '16D': { code: '16D', category: '16', name: 'Foreign Extra Stout', og_min: 1.056, og_max: 1.075, fg_min: 1.010, fg_max: 1.018, abv_min: 6.3, abv_max: 8.0, ibu_min: 50, ibu_max: 70, ebc_min: 60, ebc_max: 100 },
  '17A': { code: '17A', category: '17', name: 'British Strong Ale', og_min: 1.055, og_max: 1.080, fg_min: 1.015, fg_max: 1.022, abv_min: 5.5, abv_max: 8.0, ibu_min: 30, ibu_max: 60, ebc_min: 16, ebc_max: 44 },
  '17B': { code: '17B', category: '17', name: 'Old Ale', og_min: 1.055, og_max: 1.088, fg_min: 1.015, fg_max: 1.022, abv_min: 5.5, abv_max: 9.0, ibu_min: 30, ibu_max: 60, ebc_min: 24, ebc_max: 44 },
  '17C': { code: '17C', category: '17', name: 'Wee Heavy', og_min: 1.070, og_max: 1.130, fg_min: 1.018, fg_max: 1.040, abv_min: 6.5, abv_max: 10.0, ibu_min: 17, ibu_max: 35, ebc_min: 28, ebc_max: 60 },
  '17D': { code: '17D', category: '17', name: 'English Barley Wine', og_min: 1.080, og_max: 1.120, fg_min: 1.018, fg_max: 1.030, abv_min: 8.0, abv_max: 12.0, ibu_min: 35, ibu_max: 70, ebc_min: 20, ebc_max: 44 },
  '18A': { code: '18A', category: '18', name: 'Blonde Ale', og_min: 1.038, og_max: 1.054, fg_min: 1.008, fg_max: 1.013, abv_min: 3.8, abv_max: 5.5, ibu_min: 15, ibu_max: 28, ebc_min: 6, ebc_max: 14 },
  '18B': { code: '18B', category: '18', name: 'American Pale Ale', og_min: 1.045, og_max: 1.060, fg_min: 1.010, fg_max: 1.015, abv_min: 4.5, abv_max: 6.2, ibu_min: 30, ibu_max: 50, ebc_min: 10, ebc_max: 20 },
  '19A': { code: '19A', category: '19', name: 'American Amber Ale', og_min: 1.045, og_max: 1.060, fg_min: 1.010, fg_max: 1.015, abv_min: 4.5, abv_max: 6.2, ibu_min: 25, ibu_max: 40, ebc_min: 20, ebc_max: 34 },
  '19B': { code: '19B', category: '19', name: 'California Common', og_min: 1.048, og_max: 1.054, fg_min: 1.011, fg_max: 1.014, abv_min: 4.5, abv_max: 5.5, ibu_min: 30, ibu_max: 45, ebc_min: 20, ebc_max: 28 },
  '19C': { code: '19C', category: '19', name: 'American Brown Ale', og_min: 1.045, og_max: 1.060, fg_min: 1.010, fg_max: 1.016, abv_min: 4.3, abv_max: 6.2, ibu_min: 20, ibu_max: 30, ebc_min: 36, ebc_max: 60 },
  '20A': { code: '20A', category: '20', name: 'American Porter', og_min: 1.050, og_max: 1.070, fg_min: 1.012, fg_max: 1.018, abv_min: 4.8, abv_max: 6.5, ibu_min: 25, ibu_max: 50, ebc_min: 40, ebc_max: 80 },
  '20B': { code: '20B', category: '20', name: 'American Stout', og_min: 1.050, og_max: 1.075, fg_min: 1.010, fg_max: 1.022, abv_min: 5.0, abv_max: 7.0, ibu_min: 35, ibu_max: 75, ebc_min: 60, ebc_max: 100 },
  '20C': { code: '20C', category: '20', name: 'Imperial Stout', og_min: 1.075, og_max: 1.115, fg_min: 1.018, fg_max: 1.030, abv_min: 8.0, abv_max: 12.0, ibu_min: 50, ibu_max: 90, ebc_min: 60, ebc_max: 100 },
  '21A': { code: '21A', category: '21', name: 'American IPA', og_min: 1.056, og_max: 1.070, fg_min: 1.008, fg_max: 1.014, abv_min: 5.5, abv_max: 7.5, ibu_min: 40, ibu_max: 70, ebc_min: 12, ebc_max: 28 },
  '21B': { code: '21B', category: '21', name: 'Specialty IPA', og_min: 1.050, og_max: 1.085, fg_min: 1.008, fg_max: 1.020, abv_min: 5.0, abv_max: 9.0, ibu_min: 25, ibu_max: 100, ebc_min: 6, ebc_max: 80 },
  '21B1': { code: '21B1', category: '21', name: 'New England IPA', og_min: 1.060, og_max: 1.085, fg_min: 1.010, fg_max: 1.020, abv_min: 6.0, abv_max: 9.0, ibu_min: 25, ibu_max: 60, ebc_min: 6, ebc_max: 16 },
  '21C': { code: '21C', category: '21', name: 'Hazy IPA', og_min: 1.060, og_max: 1.085, fg_min: 1.010, fg_max: 1.020, abv_min: 6.0, abv_max: 9.0, ibu_min: 25, ibu_max: 60, ebc_min: 6, ebc_max: 16 },
  '22A': { code: '22A', category: '22', name: 'Double IPA', og_min: 1.065, og_max: 1.085, fg_min: 1.010, fg_max: 1.020, abv_min: 7.5, abv_max: 10.0, ibu_min: 60, ibu_max: 120, ebc_min: 12, ebc_max: 30 },
  '22B': { code: '22B', category: '22', name: 'American Strong Ale', og_min: 1.062, og_max: 1.090, fg_min: 1.014, fg_max: 1.024, abv_min: 6.3, abv_max: 10.0, ibu_min: 50, ibu_max: 100, ebc_min: 14, ebc_max: 44 },
  '22C': { code: '22C', category: '22', name: 'American Barleywine', og_min: 1.080, og_max: 1.120, fg_min: 1.016, fg_max: 1.030, abv_min: 8.0, abv_max: 12.0, ibu_min: 50, ibu_max: 100, ebc_min: 20, ebc_max: 40 },
  '22D': { code: '22D', category: '22', name: 'Wheatwine', og_min: 1.080, og_max: 1.120, fg_min: 1.016, fg_max: 1.030, abv_min: 8.0, abv_max: 12.0, ibu_min: 30, ibu_max: 60, ebc_min: 16, ebc_max: 30 },
  '23A': { code: '23A', category: '23', name: 'Berliner Weisse', og_min: 1.028, og_max: 1.032, fg_min: 1.003, fg_max: 1.006, abv_min: 2.8, abv_max: 3.8, ibu_min: 3, ibu_max: 8, ebc_min: 4, ebc_max: 6 },
  '23B': { code: '23B', category: '23', name: 'Flanders Red Ale', og_min: 1.048, og_max: 1.057, fg_min: 1.002, fg_max: 1.012, abv_min: 4.6, abv_max: 6.5, ibu_min: 10, ibu_max: 25, ebc_min: 20, ebc_max: 34 },
  '23C': { code: '23C', category: '23', name: 'Oud Bruin', og_min: 1.040, og_max: 1.074, fg_min: 1.008, fg_max: 1.012, abv_min: 4.0, abv_max: 8.0, ibu_min: 20, ibu_max: 25, ebc_min: 30, ebc_max: 44 },
  '23D': { code: '23D', category: '23', name: 'Lambic', og_min: 1.040, og_max: 1.054, fg_min: 1.001, fg_max: 1.010, abv_min: 5.0, abv_max: 6.5, ibu_min: 0, ibu_max: 10, ebc_min: 6, ebc_max: 26 },
  '23E': { code: '23E', category: '23', name: 'Gueuze', og_min: 1.040, og_max: 1.060, fg_min: 1.000, fg_max: 1.006, abv_min: 5.0, abv_max: 8.0, ibu_min: 0, ibu_max: 10, ebc_min: 6, ebc_max: 26 },
  '23F': { code: '23F', category: '23', name: 'Fruit Lambic', og_min: 1.040, og_max: 1.060, fg_min: 1.000, fg_max: 1.010, abv_min: 5.0, abv_max: 7.0, ibu_min: 0, ibu_max: 10, ebc_min: 6, ebc_max: 26 },
  '23G': { code: '23G', category: '23', name: 'Gose', og_min: 1.036, og_max: 1.056, fg_min: 1.006, fg_max: 1.010, abv_min: 4.2, abv_max: 4.8, ibu_min: 5, ibu_max: 12, ebc_min: 6, ebc_max: 12 },
  '24A': { code: '24A', category: '24', name: 'Witbier', og_min: 1.044, og_max: 1.052, fg_min: 1.008, fg_max: 1.012, abv_min: 4.5, abv_max: 5.5, ibu_min: 10, ibu_max: 20, ebc_min: 4, ebc_max: 8 },
  '24B': { code: '24B', category: '24', name: 'Belgian Pale Ale', og_min: 1.048, og_max: 1.054, fg_min: 1.010, fg_max: 1.014, abv_min: 4.8, abv_max: 5.5, ibu_min: 20, ibu_max: 30, ebc_min: 16, ebc_max: 28 },
  '24C': { code: '24C', category: '24', name: 'Bière de Garde', og_min: 1.060, og_max: 1.080, fg_min: 1.008, fg_max: 1.016, abv_min: 6.0, abv_max: 8.5, ibu_min: 18, ibu_max: 28, ebc_min: 12, ebc_max: 38 },
  '25A': { code: '25A', category: '25', name: 'Belgian Blond Ale', og_min: 1.062, og_max: 1.075, fg_min: 1.008, fg_max: 1.018, abv_min: 6.0, abv_max: 7.5, ibu_min: 15, ibu_max: 30, ebc_min: 8, ebc_max: 14 },
  '25B': { code: '25B', category: '25', name: 'Saison', og_min: 1.048, og_max: 1.065, fg_min: 1.002, fg_max: 1.008, abv_min: 5.0, abv_max: 7.0, ibu_min: 20, ibu_max: 35, ebc_min: 10, ebc_max: 20 },
  '25C': { code: '25C', category: '25', name: 'Belgian Golden Strong Ale', og_min: 1.070, og_max: 1.095, fg_min: 1.005, fg_max: 1.016, abv_min: 7.5, abv_max: 10.5, ibu_min: 22, ibu_max: 35, ebc_min: 6, ebc_max: 10 },
  '26A': { code: '26A', category: '26', name: 'Trappist Single', og_min: 1.044, og_max: 1.054, fg_min: 1.004, fg_max: 1.010, abv_min: 4.8, abv_max: 6.0, ibu_min: 25, ibu_max: 45, ebc_min: 6, ebc_max: 10 },
  '26B': { code: '26B', category: '26', name: 'Belgian Dubbel', og_min: 1.062, og_max: 1.075, fg_min: 1.008, fg_max: 1.018, abv_min: 6.0, abv_max: 7.6, ibu_min: 15, ibu_max: 25, ebc_min: 20, ebc_max: 34 },
  '26C': { code: '26C', category: '26', name: 'Belgian Tripel', og_min: 1.075, og_max: 1.085, fg_min: 1.008, fg_max: 1.014, abv_min: 7.5, abv_max: 9.5, ibu_min: 20, ibu_max: 40, ebc_min: 8, ebc_max: 14 },
  '26D': { code: '26D', category: '26', name: 'Belgian Dark Strong Ale', og_min: 1.075, og_max: 1.110, fg_min: 1.010, fg_max: 1.024, abv_min: 8.0, abv_max: 12.0, ibu_min: 20, ibu_max: 35, ebc_min: 24, ebc_max: 45 },
  '27A': { code: '27A', category: '27', name: 'Grodziskie', og_min: 1.028, og_max: 1.032, fg_min: 1.006, fg_max: 1.012, abv_min: 2.5, abv_max: 3.3, ibu_min: 20, ibu_max: 35, ebc_min: 6, ebc_max: 12 },
  '27B': { code: '27B', category: '27', name: 'Lichtenhainer', og_min: 1.032, og_max: 1.040, fg_min: 1.004, fg_max: 1.008, abv_min: 3.5, abv_max: 4.7, ibu_min: 5, ibu_max: 12, ebc_min: 6, ebc_max: 12 },
  '27C': { code: '27C', category: '27', name: 'Roggenbier', og_min: 1.046, og_max: 1.056, fg_min: 1.010, fg_max: 1.014, abv_min: 4.5, abv_max: 6.0, ibu_min: 10, ibu_max: 20, ebc_min: 24, ebc_max: 40 },
  '28A': { code: '28A', category: '28', name: 'Brett Beer', og_min: 1.030, og_max: 1.080, fg_min: 1.000, fg_max: 1.012, abv_min: 3.0, abv_max: 9.0, ibu_min: 0, ibu_max: 50, ebc_min: 4, ebc_max: 40 },
  '29A': { code: '29A', category: '29', name: 'Fruit Beer', og_min: 1.030, og_max: 1.110, fg_min: 1.001, fg_max: 1.024, abv_min: 2.5, abv_max: 12.0, ibu_min: 5, ibu_max: 70, ebc_min: 4, ebc_max: 100 },
  '30A': { code: '30A', category: '30', name: 'Spice, Herb or Vegetable Beer', og_min: 1.030, og_max: 1.110, fg_min: 1.001, fg_max: 1.024, abv_min: 2.5, abv_max: 12.0, ibu_min: 5, ibu_max: 70, ebc_min: 4, ebc_max: 100 },
  '31A': { code: '31A', category: '31', name: 'Alternative Grain Beer', og_min: 1.030, og_max: 1.110, fg_min: 1.001, fg_max: 1.024, abv_min: 2.5, abv_max: 12.0, ibu_min: 5, ibu_max: 70, ebc_min: 4, ebc_max: 100 },
  '32A': { code: '32A', category: '32', name: 'Classic Style Smoked Beer', og_min: 1.030, og_max: 1.110, fg_min: 1.004, fg_max: 1.024, abv_min: 2.5, abv_max: 12.0, ibu_min: 5, ibu_max: 70, ebc_min: 4, ebc_max: 100 },
  '33A': { code: '33A', category: '33', name: 'Wood-Aged Beer', og_min: 1.030, og_max: 1.110, fg_min: 1.004, fg_max: 1.024, abv_min: 2.5, abv_max: 12.0, ibu_min: 5, ibu_max: 70, ebc_min: 4, ebc_max: 100 },
  '34C': { code: '34C', category: '34', name: 'Experimental Beer', og_min: 1.030, og_max: 1.110, fg_min: 1.001, fg_max: 1.024, abv_min: 2.5, abv_max: 12.0, ibu_min: 0, ibu_max: 100, ebc_min: 0, ebc_max: 100 },
};

function findStyle(q: string): BjcpStyle | undefined {
  if (BJCP[q]) return BJCP[q];
  const lq = q.toLowerCase();
  for (const s of Object.values(BJCP)) if (s.name.toLowerCase().includes(lq)) return s;
  return undefined;
}

// ── Deterministic quick-check for the prompt ──

function quickCheck(r: RecipeValidatorInput, style: BjcpStyle | undefined) {
  const issues: string[] = [];
  const warnings: string[] = [];
  const abv = (r.og - r.fg) * 131.25;

  if (style) {
    if (r.og < style.og_min || r.og > style.og_max) issues.push(`OG ${r.og.toFixed(3)} fuori range (${style.og_min.toFixed(3)}–${style.og_max.toFixed(3)})`);
    if (r.ibu < style.ibu_min || r.ibu > style.ibu_max) issues.push(`IBU ${r.ibu} fuori range (${style.ibu_min}–${style.ibu_max})`);
    if (abv < style.abv_min || abv > style.abv_max) issues.push(`ABV ${abv.toFixed(1)}% fuori range (${style.abv_min}–${style.abv_max}%)`);
    if (r.fg < style.fg_min || r.fg > style.fg_max) warnings.push(`FG ${r.fg.toFixed(3)} fuori range (${style.fg_min.toFixed(3)}–${style.fg_max.toFixed(3)})`);
    if (r.ebc !== undefined && (r.ebc < style.ebc_min || r.ebc > style.ebc_max)) warnings.push(`EBC ${r.ebc} fuori range (${style.ebc_min}–${style.ebc_max})`);
  }

  const ibuRatio = r.ibu / ((r.og - 1) * 1000);
  if (ibuRatio < 0.2) issues.push('Rapporto IBU/OG molto basso (<0.2)');
  else if (ibuRatio > 1.5) issues.push('Rapporto IBU/OG molto alto (>1.5)');

  const totalKg = r.grain_bill.reduce((s, g) => s + g.kg, 0);
  let specPct = 0;
  for (const g of r.grain_bill) {
    const pct = g.percent ?? (totalKg > 0 ? (g.kg / totalKg) * 100 : 0);
    const n = g.malt.toLowerCase();
    if (n.includes('crystal') || n.includes('caramel') || n.includes('chocolate') || n.includes('black') || n.includes('roast') || n.includes('special') || n.includes('cara')) specPct += pct;
  }
  if (specPct > 25) issues.push(`Malti speciali al ${specPct.toFixed(0)}%`);

  return { issues, warnings, abv, ibuRatio, specPct };
}

// ── LLM review prompt builder ──

function buildLlmReviewPrompt(r: RecipeValidatorInput): string {
  const style = findStyle(r.beer_style);
  const { issues, warnings, abv, ibuRatio, specPct } = quickCheck(r, style);

  const recipeSummary = [
    `Ricetta: ${r.recipe_name}`,
    `Stile: ${r.beer_style}${style ? ` (${style.code} — ${style.name}, Cat. ${style.category})` : ''}`,
    `Batch: ${r.batch_size_liters}L | OG: ${r.og.toFixed(3)} | FG: ${r.fg.toFixed(3)} | IBU: ${r.ibu} | ABV: ${abv.toFixed(1)}%`,
    r.ebc !== undefined ? `EBC: ${r.ebc}` : null,
    r.impianto ? `Impianto: ${r.impianto}` : null,
    r.efficiency_percent !== undefined ? `Efficienza: ${r.efficiency_percent}%` : null,
    '',
    '── Grist ──',
    ...r.grain_bill.map(g => `  ${g.malt}: ${g.kg}kg${g.percent !== undefined ? ` (${g.percent}%)` : ''}${g.ebc !== undefined ? ` [EBC ${g.ebc}]` : ''}${g.note ? ` — ${g.note}` : ''}`),
    '',
    '── Luppolatura ──',
    ...r.hop_schedule.map(h => `  ${h.variety}: ${h.grams}g @ ${h.time_minutes}min (${h.use})${h.aa_percent !== undefined ? ` AA ${h.aa_percent}%` : ''}${h.ibu_contrib !== undefined ? ` [${h.ibu_contrib} IBU]` : ''}${h.note ? ` — ${h.note}` : ''}`),
    '',
    `── Lievito ──`,
    `  ${r.yeast.strain}${r.yeast.lab ? ` (${r.yeast.lab})` : ''}${r.yeast.attenuation_percent !== undefined ? ` att. ${r.yeast.attenuation_percent}%` : ''}`,
    r.fermentation_temp_c !== undefined ? `  Temperatura: ${r.fermentation_temp_c}°C` : null,
    '',
    r.mash_temp_c !== undefined || (r.mash_steps && r.mash_steps.length > 0) ? '── Mash ──' : null,
    r.mash_temp_c !== undefined ? `  Single infusion: ${r.mash_temp_c}°C` : null,
    ...(r.mash_steps ?? []).map(s => `  Step: ${s.temperature_c}°C × ${s.time_minutes}min${s.note ? ` (${s.note})` : ''}`),
    '',
    r.water_profile ? '── Acqua ──' : null,
    r.water_profile ? `  Ca:${r.water_profile.ca} Mg:${r.water_profile.mg} Na:${r.water_profile.na} Cl:${r.water_profile.cl} SO₄:${r.water_profile.so4} HCO₃:${r.water_profile.hco3}` : null,
    '',
    r.carbonation_volumes !== undefined ? `Carbonazione: ${r.carbonation_volumes} vol${r.carbonation_method ? ` (${r.carbonation_method})` : ''}${r.priming_sugar_gl !== undefined ? ` — ${r.priming_sugar_gl} g/L priming` : ''}` : null,
    r.boil_time_minutes !== undefined ? `Bollitura: ${r.boil_time_minutes} min` : null,
    r.pre_boil_volume_liters !== undefined || r.post_boil_volume_liters !== undefined ? `Volumi: pre-boil ${r.pre_boil_volume_liters ?? '?'}L, post-boil ${r.post_boil_volume_liters ?? '?'}L, fermentatore ${r.fermentation_volume_liters ?? '?'}L, confezionamento ${r.packaging_volume_liters ?? '?'}L` : null,
    '',
    r.descrizione ? `Descrizione: ${r.descrizione}` : null,
    r.note ? `Note: ${r.note}` : null,
  ].filter(x => x !== null).join('\n');

  const quickReport = [
    `=== QUICK-CHECK DETERMINISTICO ===`,
    `ABV calcolato: ${abv.toFixed(1)}%`,
    `IBU/OG ratio: ${ibuRatio.toFixed(2)}`,
    `Malti speciali: ${specPct.toFixed(1)}%`,
    style ? `Stile BJCP: ${issues.length === 0 ? '✅ OK' : '❌ ' + issues.length + ' problemi'}` : 'Stile BJCP: non trovato',
    ...issues.map(i => `  ❌ ${i}`),
    ...warnings.map(w => `  ⚠️ ${w}`),
  ].join('\n');

  return [
    `Sei un revisore brassicolo senior specializzato in homebrewing all grain e`,
    `impianti all-in-one.`,
    ``,
    `Devi revisionare criticamente una ricetta di birra. Non devi assecondare la`,
    `ricetta né riscriverla subito. Devi trovare errori, contraddizioni, rischi e`,
    `scelte subottimali.`,
    ``,
    `Riceverai:`,
    ``,
    `1. la ricetta strutturata;`,
    `2. un quick-check deterministico;`,
    `3. eventuali dati BJCP;`,
    `4. dati ufficiali degli ingredienti e del lievito, quando disponibili.`,
    ``,
    `Valuta separatamente:`,
    ``,
    `- validità matematica;`,
    `- coerenza dei volumi;`,
    `- compatibilità con l'impianto;`,
    `- mash e filtrabilità;`,
    `- grist;`,
    `- luppolatura;`,
    `- lievito e fermentazione;`,
    `- acqua;`,
    `- carbonazione e sicurezza;`,
    `- conformità stilistica;`,
    `- plausibilità sensoriale;`,
    `- chiarezza e riproducibilità della procedura;`,
    `- attendibilità delle affermazioni storiche o tecniche.`,
    ``,
    `Regole:`,
    ``,
    `- Non considerare corretta una scelta solo perché è comune.`,
    `- Non inventare dati mancanti.`,
    `- Distingui tra errore critico, warning e scelta opzionale.`,
    `- Distingui validità tecnica da conformità BJCP.`,
    `- Se una ricetta è creativa, non penalizzarla automaticamente: verifica però`,
    `  che sia classificata correttamente.`,
    `- Non ripetere i soli errori già riportati dal quick-check deterministico:`,
    `  spiegane l'impatto pratico.`,
    `- Segnala contraddizioni tra campi strutturati e testo descrittivo.`,
    `- Contesta affermazioni assolute non supportate.`,
    `- Proponi correzioni minime prima di ridisegnare l'intera ricetta.`,
    `- Ogni correzione deve indicare cosa cambia e perché.`,
    ``,
    `Restituisci esclusivamente JSON conforme allo schema richiesto.`,
    ``,
    `=== RICETTA ===`,
    recipeSummary,
    ``,
    `=== DATI BJCP ===`,
    style ? `${style.code} — ${style.name} (Cat. ${style.category}): OG ${style.og_min.toFixed(3)}-${style.og_max.toFixed(3)}, FG ${style.fg_min.toFixed(3)}-${style.fg_max.toFixed(3)}, ABV ${style.abv_min}-${style.abv_max}%, IBU ${style.ibu_min}-${style.ibu_max}, EBC ${style.ebc_min}-${style.ebc_max}` : 'Stile non trovato nel database BJCP.',
    ``,
    quickReport,
  ].join('\n');
}

const OUTPUT_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    overall_status: { type: 'string', enum: ['valid', 'needs_revision', 'invalid'], description: 'Giudizio complessivo' },
    technical_validity: { type: 'string', enum: ['valid', 'questionable', 'invalid'], description: 'Validità tecnica/matematica' },
    style_conformity: { type: 'string', enum: ['in_style', 'borderline', 'out_of_style', 'creative'], description: 'Conformità BJCP' },
    confidence: { type: 'number', minimum: 0, maximum: 1, description: 'Confidenza del revisore (0-1)' },
    critical_issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Codice errore (es. MASH_PLAN_CONTRADICTION)' },
          area: { type: 'string', description: 'Area: mash, grist, hops, yeast, water, volumes, carbonation, style, procedure, safety' },
          finding: { type: 'string', description: 'Descrizione del problema' },
          impact: { type: 'string', description: 'Impatto pratico' },
          recommended_change: { type: 'string', description: 'Correzione proposta' },
        },
        required: ['code', 'area', 'finding', 'impact', 'recommended_change'],
      },
    },
    warnings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          area: { type: 'string' },
          finding: { type: 'string' },
          suggestion: { type: 'string' },
        },
        required: ['code', 'area', 'finding', 'suggestion'],
      },
    },
    sensory_assessment: {
      type: 'object',
      properties: {
        expected_balance: { type: 'string', description: 'Bilanciamento atteso' },
        main_risk: { type: 'string', description: 'Rischio sensoriale principale' },
        coherence: { type: 'string', enum: ['excellent', 'good', 'questionable', 'contradictory'] },
      },
      required: ['expected_balance', 'main_risk', 'coherence'],
    },
    style_assessment: {
      type: 'object',
      properties: {
        declared_style: { type: 'string' },
        classification: { type: 'string', enum: ['in_style', 'borderline', 'out_of_style', 'creative'] },
        deviations: { type: 'array', items: { type: 'string' } },
      },
      required: ['declared_style', 'classification', 'deviations'],
    },
    recommended_actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          priority: { type: 'integer', minimum: 1 },
          action: { type: 'string' },
          detail: { type: 'string' },
        },
        required: ['priority', 'action'],
      },
    },
  },
  required: ['overall_status', 'technical_validity', 'style_conformity', 'confidence', 'critical_issues', 'warnings', 'sensory_assessment', 'style_assessment', 'recommended_actions'],
};

// ── Tool ──

export class RecipeValidatorTool implements BuiltinTool<RecipeValidatorInput> {
  readonly name = 'recipe_validator' as const;
  readonly description =
    'Produces a complete LLM review prompt for deep qualitative analysis of a beer recipe. Pass the structured recipe data (as returned by yaml_validator or built manually) to get: recipe summary, BJCP style data, quick deterministic check, the LLM review prompt, and the expected JSON output schema. Use AFTER yaml_validator for deterministic validation.';
  readonly parameters: Record<string, unknown> = toInputJsonSchema(RecipeValidatorInputSchema);

  resolveExecution(args: RecipeValidatorInput): ToolExecution {
    return {
      description: `Build LLM review prompt: ${args.recipe_name}`,
      approvalRule: this.name,
      execute: () => this.execute(args),
    };
  }

  private execute(args: RecipeValidatorInput): Promise<ExecutableToolResult> {
    try {
      const style = findStyle(args.beer_style);
      const llmPrompt = buildLlmReviewPrompt(args);

      const fullOutput = [
        `**Revisione LLM per: ${args.recipe_name}**`,
        style ? `Stile: ${style.code} — ${style.name} (Cat. ${style.category})` : `Stile "${args.beer_style}" non trovato nel database BJCP.`,
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '📋 LLM REVIEW PROMPT (da inoltrare al modello)',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        llmPrompt,
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '📐 OUTPUT SCHEMA (JSON atteso)',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        '```json',
        JSON.stringify(OUTPUT_SCHEMA, null, 2),
        '```',
      ].join('\n');

      return Promise.resolve({ output: fullOutput });
    } catch (e) {
      return Promise.resolve({ isError: true, output: e instanceof Error ? e.message : String(e) });
    }
  }
}

registerTool(RecipeValidatorTool);
