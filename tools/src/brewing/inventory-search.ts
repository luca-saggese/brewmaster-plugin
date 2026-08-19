/**
 * Inventory search — search a virtual inventory of malts, hops, and yeasts.
 */

import { z } from 'zod';

import type { BuiltinTool, ToolExecution } from '../shim/tool-contract';
import { registerTool } from '../shim/tool-registry';
import { toInputJsonSchema } from '../shim/input-schema';

export const InventorySearchInputSchema = z.object({
  query: z.string().describe('Search query.'),
  category: z.enum(['malt', 'hop', 'yeast', 'all']).default('all'),
  include_unavailable: z.boolean().default(false),
});

export type InventorySearchInput = z.infer<typeof InventorySearchInputSchema>;

interface InventoryItem {
  name: string;
  category: 'malt' | 'hop' | 'yeast';
  available: boolean;
  specs: Record<string, string>;
  substitutes?: string[];
}

const INVENTORY: InventoryItem[] = [
  // Base Malts
  { name: 'Pilsner Malt (Weyermann)', category: 'malt', available: true, specs: { type: 'Base', ebc: '3-4', origin: 'Germany', usage: 'Up to 100%' }, substitutes: ['Pale Ale Malt', 'Vienna Malt'] },
  { name: 'Pale Ale Malt (Crisp)', category: 'malt', available: true, specs: { type: 'Base', ebc: '5-7', origin: 'UK', usage: 'Up to 100%' }, substitutes: ['Maris Otter', 'Pilsner Malt'] },
  { name: 'Maris Otter (Crisp)', category: 'malt', available: true, specs: { type: 'Base', ebc: '4-6', origin: 'UK', usage: 'Up to 100%' }, substitutes: ['Pale Ale Malt', 'Golden Promise'] },
  { name: 'Vienna Malt (Weyermann)', category: 'malt', available: true, specs: { type: 'Base', ebc: '6-9', origin: 'Germany', usage: 'Up to 100%' }, substitutes: ['Munich Light', 'Pale Ale Malt'] },
  { name: 'Munich Malt Light (Weyermann)', category: 'malt', available: true, specs: { type: 'Base', ebc: '15-25', origin: 'Germany', usage: 'Up to 100%' }, substitutes: ['Vienna Malt', 'Munich Dark'] },
  { name: 'Wheat Malt (Weyermann)', category: 'malt', available: true, specs: { type: 'Base', ebc: '3-5', origin: 'Germany', usage: 'Up to 70%' }, substitutes: ['Pale Wheat Malt', 'Flaked Wheat'] },
  { name: 'Rye Malt (Weyermann)', category: 'malt', available: true, specs: { type: 'Base', ebc: '4-10', origin: 'Germany', usage: 'Up to 60%' }, substitutes: ['Flaked Rye', 'Wheat Malt'] },
  // Crystal/Caramel
  { name: 'CaraPils (Weyermann)', category: 'malt', available: true, specs: { type: 'Crystal', ebc: '3-5', origin: 'Germany', usage: 'Up to 10%' }, substitutes: ['Dextrin Malt', 'Flaked Barley'] },
  { name: 'CaraHell (Weyermann)', category: 'malt', available: true, specs: { type: 'Crystal', ebc: '20-30', origin: 'Germany', usage: 'Up to 15%' }, substitutes: ['Crystal 10L', 'CaraAmber'] },
  { name: 'CaraAmber (Weyermann)', category: 'malt', available: true, specs: { type: 'Crystal', ebc: '60-80', origin: 'Germany', usage: 'Up to 15%' }, substitutes: ['Crystal 30L', 'CaraRed'] },
  { name: 'CaraMunich I (Weyermann)', category: 'malt', available: true, specs: { type: 'Crystal', ebc: '80-100', origin: 'Germany', usage: 'Up to 15%' }, substitutes: ['Crystal 60L', 'CaraMunich II'] },
  { name: 'Crystal 60L (Briess)', category: 'malt', available: true, specs: { type: 'Crystal', ebc: '120', origin: 'USA', usage: 'Up to 10%' }, substitutes: ['CaraMunich I', 'Crystal 80L'] },
  { name: 'Crystal 120L (Briess)', category: 'malt', available: true, specs: { type: 'Crystal', ebc: '240', origin: 'USA', usage: 'Up to 5%' }, substitutes: ['CaraMunich III', 'Special B'] },
  { name: 'Special B (Dingemans)', category: 'malt', available: true, specs: { type: 'Crystal', ebc: '280-350', origin: 'Belgium', usage: 'Up to 5%' }, substitutes: ['Crystal 120L', 'Chocolate Malt'] },
  // Roasted
  { name: 'Chocolate Malt (Crisp)', category: 'malt', available: true, specs: { type: 'Roasted', ebc: '900-1100', origin: 'UK', usage: 'Up to 10%' }, substitutes: ['Pale Chocolate', 'Black Patent'] },
  { name: 'Black Patent Malt (Crisp)', category: 'malt', available: true, specs: { type: 'Roasted', ebc: '1300-1500', origin: 'UK', usage: 'Up to 5%' }, substitutes: ['Roasted Barley', 'Chocolate Malt'] },
  { name: 'Roasted Barley (Briess)', category: 'malt', available: true, specs: { type: 'Roasted', ebc: '600-800', origin: 'USA', usage: 'Up to 5%' }, substitutes: ['Black Patent', 'Chocolate Malt'] },
  { name: 'Carafa Special I (Weyermann)', category: 'malt', available: true, specs: { type: 'Roasted', ebc: '800-1000', origin: 'Germany', usage: 'Up to 5%' }, substitutes: ['Chocolate Malt', 'Black Patent'] },
  // Flaked
  { name: 'Flaked Barley', category: 'malt', available: true, specs: { type: 'Adjunct', ebc: '3', origin: 'Various', usage: 'Up to 20%' }, substitutes: ['Flaked Oats', 'Flaked Wheat'] },
  { name: 'Flaked Oats', category: 'malt', available: true, specs: { type: 'Adjunct', ebc: '2', origin: 'Various', usage: 'Up to 30%' }, substitutes: ['Oat Malt', 'Flaked Barley'] },
  { name: 'Flaked Wheat', category: 'malt', available: true, specs: { type: 'Adjunct', ebc: '2', origin: 'Various', usage: 'Up to 40%' }, substitutes: ['Wheat Malt', 'Flaked Barley'] },
  { name: 'Acidulated Malt (Weyermann)', category: 'malt', available: true, specs: { type: 'Specialty', ebc: '3-6', origin: 'Germany', usage: 'Up to 10%' }, substitutes: ['Lactic Acid', 'Phosphoric Acid'] },
  { name: 'Smoked Malt (Weyermann)', category: 'malt', available: true, specs: { type: 'Specialty', ebc: '4-8', origin: 'Germany', usage: 'Up to 100%' }, substitutes: ['Rauchmalz', 'Peated Malt'] },
  // Hops
  { name: 'Citra (USA)', category: 'hop', available: true, specs: { type: 'Aroma', aa: '11-13%', origin: 'USA', characteristics: 'Tropical, citrus, grapefruit' }, substitutes: ['Mosaic', 'Galaxy'] },
  { name: 'Mosaic (USA)', category: 'hop', available: true, specs: { type: 'Aroma', aa: '11-14%', origin: 'USA', characteristics: 'Blueberry, tropical, earthy' }, substitutes: ['Citra', 'Simcoe'] },
  { name: 'Simcoe (USA)', category: 'hop', available: true, specs: { type: 'Dual', aa: '12-14%', origin: 'USA', characteristics: 'Pine, citrus, passionfruit' }, substitutes: ['Citra', 'Chinook'] },
  { name: 'Cascade (USA)', category: 'hop', available: true, specs: { type: 'Aroma', aa: '5-7%', origin: 'USA', characteristics: 'Grapefruit, floral, spicy' }, substitutes: ['Centennial', 'Amarillo'] },
  { name: 'Centennial (USA)', category: 'hop', available: true, specs: { type: 'Dual', aa: '9-11%', origin: 'USA', characteristics: 'Floral, citrus, pine' }, substitutes: ['Cascade', 'Chinook'] },
  { name: 'Chinook (USA)', category: 'hop', available: true, specs: { type: 'Dual', aa: '12-14%', origin: 'USA', characteristics: 'Pine, spice, grapefruit' }, substitutes: ['Simcoe', 'Columbus'] },
  { name: 'Magnum (Germany)', category: 'hop', available: true, specs: { type: 'Bittering', aa: '12-14%', origin: 'Germany', characteristics: 'Clean, smooth bittering' }, substitutes: ['Warrior', 'Herkules'] },
  { name: 'Hallertau Mittelfrüh (Germany)', category: 'hop', available: true, specs: { type: 'Aroma', aa: '3-5%', origin: 'Germany', characteristics: 'Floral, spicy, noble' }, substitutes: ['Hallertau Hersbrucker', 'Saaz'] },
  { name: 'Saaz (Czech)', category: 'hop', available: true, specs: { type: 'Aroma', aa: '3-4%', origin: 'Czech Republic', characteristics: 'Spicy, earthy, noble' }, substitutes: ['Tettnang', 'Hallertau'] },
  { name: 'Fuggles (UK)', category: 'hop', available: true, specs: { type: 'Aroma', aa: '4-5%', origin: 'UK', characteristics: 'Earthy, woody, mild' }, substitutes: ['East Kent Goldings', 'Willamette'] },
  { name: 'East Kent Goldings (UK)', category: 'hop', available: true, specs: { type: 'Aroma', aa: '5-6%', origin: 'UK', characteristics: 'Floral, honey, earthy' }, substitutes: ['Fuggles', 'Willamette'] },
  { name: 'Amarillo (USA)', category: 'hop', available: true, specs: { type: 'Aroma', aa: '8-10%', origin: 'USA', characteristics: 'Orange, floral, citrus' }, substitutes: ['Cascade', 'Centennial'] },
  { name: 'Galaxy (Australia)', category: 'hop', available: false, specs: { type: 'Aroma', aa: '13-15%', origin: 'Australia', characteristics: 'Passionfruit, peach, citrus' }, substitutes: ['Citra', 'Mosaic'] },
  { name: 'El Dorado (USA)', category: 'hop', available: true, specs: { type: 'Aroma', aa: '14-16%', origin: 'USA', characteristics: 'Tropical, watermelon, stone fruit' }, substitutes: ['Citra', 'Mosaic'] },
  { name: 'Strata (USA)', category: 'hop', available: true, specs: { type: 'Aroma', aa: '11-13%', origin: 'USA', characteristics: 'Passionfruit, grapefruit, dank' }, substitutes: ['Citra', 'Mosaic'] },
  // Yeast
  { name: 'SafAle US-05', category: 'yeast', available: true, specs: { type: 'Ale', form: 'Dry', attenuation: '78-82%', temp_range: '15-24°C', flocculation: 'Medium' }, substitutes: ['WLP001', 'Wyeast 1056'] },
  { name: 'SafAle S-04', category: 'yeast', available: true, specs: { type: 'Ale', form: 'Dry', attenuation: '72-76%', temp_range: '15-24°C', flocculation: 'High' }, substitutes: ['WLP002', 'Wyeast 1098'] },
  { name: 'SafLager W-34/70', category: 'yeast', available: true, specs: { type: 'Lager', form: 'Dry', attenuation: '80-84%', temp_range: '9-15°C', flocculation: 'High' }, substitutes: ['WLP830', 'Wyeast 2124'] },
  { name: 'SafBrew WB-06', category: 'yeast', available: true, specs: { type: 'Wheat', form: 'Dry', attenuation: '86-90%', temp_range: '15-24°C', flocculation: 'Low' }, substitutes: ['WLP300', 'Wyeast 3068'] },
  { name: 'SafBrew T-58', category: 'yeast', available: true, specs: { type: 'Specialty', form: 'Dry', attenuation: '72-78%', temp_range: '15-24°C', flocculation: 'Medium' }, substitutes: ['WLP500', 'Wyeast 1214'] },
  { name: 'SafBrew BE-256', category: 'yeast', available: true, specs: { type: 'Abbey', form: 'Dry', attenuation: '78-82%', temp_range: '15-24°C', flocculation: 'Medium' }, substitutes: ['WLP530', 'Wyeast 1762'] },
  { name: 'WLP001 California Ale', category: 'yeast', available: true, specs: { type: 'Ale', form: 'Liquid', attenuation: '73-80%', temp_range: '18-22°C', flocculation: 'Medium' }, substitutes: ['US-05', 'Wyeast 1056'] },
  { name: 'WLP002 English Ale', category: 'yeast', available: true, specs: { type: 'Ale', form: 'Liquid', attenuation: '63-70%', temp_range: '18-21°C', flocculation: 'Very High' }, substitutes: ['S-04', 'Wyeast 1098'] },
  { name: 'WLP004 Irish Ale', category: 'yeast', available: true, specs: { type: 'Ale', form: 'Liquid', attenuation: '69-74%', temp_range: '18-21°C', flocculation: 'Medium' }, substitutes: ['Wyeast 1084', 'S-04'] },
  { name: 'WLP300 Hefeweizen Ale', category: 'yeast', available: true, specs: { type: 'Wheat', form: 'Liquid', attenuation: '73-77%', temp_range: '18-24°C', flocculation: 'Low' }, substitutes: ['WB-06', 'WLP041'] },
  { name: 'WLP400 Belgian Wit Ale', category: 'yeast', available: true, specs: { type: 'Wheat', form: 'Liquid', attenuation: '74-78%', temp_range: '18-22°C', flocculation: 'Low' }, substitutes: ['WB-06', 'WLP300'] },
  { name: 'WLP500 Trappist Ale', category: 'yeast', available: true, specs: { type: 'Abbey', form: 'Liquid', attenuation: '75-80%', temp_range: '18-24°C', flocculation: 'Medium' }, substitutes: ['BE-256', 'Wyeast 1214'] },
  { name: 'WLP565 Belgian Saison I', category: 'yeast', available: true, specs: { type: 'Saison', form: 'Liquid', attenuation: '65-75%', temp_range: '20-25°C', flocculation: 'Low' }, substitutes: ['Wyeast 3711', 'WLP566'] },
  { name: 'WLP800 Pilsner Lager', category: 'yeast', available: true, specs: { type: 'Lager', form: 'Liquid', attenuation: '72-78%', temp_range: '10-14°C', flocculation: 'Medium-High' }, substitutes: ['W-34/70', 'WLP830'] },
  { name: 'WLP830 German Lager', category: 'yeast', available: true, specs: { type: 'Lager', form: 'Liquid', attenuation: '74-79%', temp_range: '10-14°C', flocculation: 'Medium' }, substitutes: ['W-34/70', 'WLP800'] },
  { name: 'Kveik Voss', category: 'yeast', available: true, specs: { type: 'Kveik', form: 'Dry', attenuation: '75-82%', temp_range: '20-40°C', flocculation: 'Medium' }, substitutes: ['Kveik Hornindal', 'Kveik Lutra'] },
  { name: 'Kveik Hornindal', category: 'yeast', available: true, specs: { type: 'Kveik', form: 'Dry', attenuation: '75-82%', temp_range: '20-40°C', flocculation: 'High' }, substitutes: ['Kveik Voss', 'Kveik Lutra'] },
  { name: 'Kveik Lutra', category: 'yeast', available: true, specs: { type: 'Kveik', form: 'Dry', attenuation: '75-82%', temp_range: '20-40°C', flocculation: 'Medium' }, substitutes: ['Kveik Voss', 'Kveik Hornindal'] },
  { name: 'Lallemand WildBrew Philly Sour', category: 'yeast', available: true, specs: { type: 'Sour', form: 'Dry', attenuation: '75-85%', temp_range: '20-30°C', flocculation: 'High' }, substitutes: ['WLP677', 'Omega Lactobacillus Blend'] },
  { name: 'Wyeast 1056 American Ale', category: 'yeast', available: true, specs: { type: 'Ale', form: 'Liquid', attenuation: '73-77%', temp_range: '15-22°C', flocculation: 'Medium' }, substitutes: ['US-05', 'WLP001'] },
  { name: 'Wyeast 3068 Weihenstephan Weizen', category: 'yeast', available: true, specs: { type: 'Wheat', form: 'Liquid', attenuation: '73-77%', temp_range: '18-24°C', flocculation: 'Low' }, substitutes: ['WLP300', 'WB-06'] },
  { name: 'Wyeast 3711 French Saison', category: 'yeast', available: true, specs: { type: 'Saison', form: 'Liquid', attenuation: '77-83%', temp_range: '18-25°C', flocculation: 'Low' }, substitutes: ['WLP565', 'WLP566'] },
  { name: 'WLP677 Lactobacillus', category: 'yeast', available: true, specs: { type: 'Sour', form: 'Liquid', attenuation: 'N/A', temp_range: '20-40°C', flocculation: 'N/A' }, substitutes: ['Wyeast 5335', 'Omega Lacto Blend'] },
  { name: 'WLP650 Brettanomyces Bruxellensis', category: 'yeast', available: true, specs: { type: 'Wild', form: 'Liquid', attenuation: 'N/A', temp_range: '18-25°C', flocculation: 'N/A' }, substitutes: ['Wyeast 5112', 'Omega Brett Blend'] },
];

export class InventorySearchTool implements BuiltinTool<InventorySearchInput> {
  readonly name = 'inventory_search' as const;
  readonly description =
    'Search a virtual inventory of brewing ingredients (malts, hops, yeasts). Filter by category, check availability, find substitutes, and get technical specifications.';
  readonly parameters: Record<string, unknown> = toInputJsonSchema(InventorySearchInputSchema);

  resolveExecution(args: InventorySearchInput): ToolExecution {
    return {
      description: `Inventory search: ${args.query}`,
      approvalRule: this.name,
      execute: () => this.execute(args),
    };
  }

  private execute(args: InventorySearchInput): Promise<ExecutableToolResult> {
    try {
      const q = args.query.toLowerCase();
      const cat = args.category ?? 'all';
      const results = INVENTORY.filter(item => {
        if (cat !== 'all' && item.category !== cat) return false;
        if (!args.include_unavailable && !item.available) return false;
        return item.name.toLowerCase().includes(q) ||
          Object.values(item.specs).some(v => v.toLowerCase().includes(q)) ||
          item.substitutes?.some(s => s.toLowerCase().includes(q));
      });
      if (results.length === 0) return Promise.resolve({ output: `Nessun risultato per "${args.query}".` });

      const lines = [`**${results.length} risultato/i per "${args.query}"**`, ''];
      for (const item of results.slice(0, 20)) {
        const status = item.available ? '✅ Disponibile' : '❌ Non disponibile';
        lines.push(`**${item.name}** (${item.category}) — ${status}`);
        for (const [k, v] of Object.entries(item.specs)) lines.push(`  ${k}: ${v}`);
        if (item.substitutes?.length) lines.push(`  Sostituti: ${item.substitutes.join(', ')}`);
        lines.push('');
      }
      if (results.length > 20) lines.push(`... e altri ${results.length - 20} risultati.`);
      return Promise.resolve({ output: lines.join('\n') });
    } catch (e) {
      return Promise.resolve({ isError: true, output: e instanceof Error ? e.message : String(e) });
    }
  }
}

registerTool(InventorySearchTool);
