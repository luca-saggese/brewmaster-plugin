/**
 * Inventory manager tool — persistent stock management for brewing raw materials.
 *
 * Manages a persistent inventory of brewing ingredients (malts, hops, yeasts,
 * spices, adjuncts, water salts, etc.) stored in
 * `~/.kimi-code/brewing/inventory.json`.
 *
 * Each item tracks: name, category, quantity (with unit), purchase date, cost,
 * supplier, best-before / expiry date, lot, storage notes, and free notes.
 *
 * Supported operations:
 *   - add      : add a new item (or restock an existing one)
 *   - remove   : remove an item entirely
 *   - adjust   : add/subtract quantity to/from an existing item
 *   - list     : list items, optionally filtered by category / expiring / low stock
 *   - search   : search by name or notes
 *   - stats    : summary of stock value, expiring items, low stock
 *
 * This helps when elaborating a recipe: the agent can see what is already on
 * hand, what needs to be bought, and what is about to expire.
 */

import { z } from 'zod';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';

import type { BuiltinTool, ToolExecution, ExecutableToolResult } from '../shim/tool-contract';
import { registerTool } from '../shim/tool-registry';
import { toInputJsonSchema } from '../shim/input-schema';

// ── Types ────────────────────────────────────────────────────────────────────

export const INVENTORY_CATEGORIES = [
  'malt',
  'hop',
  'yeast',
  'spice',
  'adjunct',
  'water_salt',
  'sugar',
  'other',
] as const;
export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export interface InventoryItem {
  id: string;                 // stable unique id
  name: string;               // display name
  category: InventoryCategory;
  quantity: number;           // current quantity
  unit: string;               // kg, g, pcs, packets, L, etc.
  purchaseDate?: string;      // ISO date (YYYY-MM-DD)
  cost?: number;              // unit cost in EUR (per unit)
  supplier?: string;
  bestBefore?: string;        // ISO date (YYYY-MM-DD) — expiry
  lot?: string;               // batch / lot number
  storage?: string;           // storage notes (e.g. "frigo", "buio", "freezer")
  notes?: string;             // free text
  createdAt: string;          // ISO timestamp
  updatedAt: string;          // ISO timestamp
}

interface InventoryFile {
  version: 1;
  items: InventoryItem[];
}

// ── Storage ──────────────────────────────────────────────────────────────────

function resolveKimiHome(): string {
  return join(homedir(), '.kimi-code');
}

function inventoryPath(): string {
  return join(resolveKimiHome(), 'brewing', 'inventory.json');
}

function ensureDir(): void {
  const dir = dirname(inventoryPath());
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function loadItems(): InventoryItem[] {
  const path = inventoryPath();
  if (!existsSync(path)) return [];
  try {
    const raw = readFileSync(path, 'utf-8');
    const parsed = JSON.parse(raw) as InventoryFile;
    if (parsed.version === 1 && Array.isArray(parsed.items)) {
      return parsed.items;
    }
    return [];
  } catch {
    return [];
  }
}

function saveItems(items: InventoryItem[]): void {
  ensureDir();
  const file: InventoryFile = { version: 1, items };
  writeFileSync(inventoryPath(), JSON.stringify(file, null, 2), 'utf-8');
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function findItem(items: InventoryItem[], name: string): InventoryItem | undefined {
  const target = normalizeName(name);
  return items.find((i) => normalizeName(i.name) === target);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(dateIso: string): number {
  const target = new Date(`${dateIso}T00:00:00`).getTime();
  const now = new Date(`${todayIso()}T00:00:00`).getTime();
  return Math.round((target - now) / 86_400_000);
}

function formatQty(item: InventoryItem): string {
  return `${item.quantity} ${item.unit}`;
}

function formatCost(item: InventoryItem): string {
  if (item.cost === undefined) return '—';
  return `€${item.cost.toFixed(2)}/${item.unit}`;
}

function expiryLabel(item: InventoryItem): string {
  if (!item.bestBefore) return '';
  const d = daysUntil(item.bestBefore);
  if (d < 0) return ` ⚠️ SCADUTO da ${-d}g`;
  if (d === 0) return ' ⚠️ SCADE OGGI';
  if (d <= 30) return ` ⏳ scade tra ${d}g`;
  return '';
}

function itemToLine(item: InventoryItem): string {
  const parts = [
    `**${item.name}** [${item.category}] — ${formatQty(item)}`,
  ];
  if (item.cost !== undefined) parts.push(`Costo: ${formatCost(item)}`);
  if (item.purchaseDate) parts.push(`Acquisto: ${item.purchaseDate}`);
  if (item.supplier) parts.push(`Fornitore: ${item.supplier}`);
  if (item.bestBefore) parts.push(`Scadenza: ${item.bestBefore}${expiryLabel(item)}`);
  if (item.lot) parts.push(`Lotto: ${item.lot}`);
  if (item.storage) parts.push(`Conservazione: ${item.storage}`);
  if (item.notes) parts.push(`Note: ${item.notes}`);
  return parts.join(' | ');
}

// ── Tool ─────────────────────────────────────────────────────────────────────

export const InventoryManagerInputSchema = z.object({
  operation: z.enum(['add', 'remove', 'adjust', 'list', 'search', 'stats']).describe(
    'Operazione da eseguire: add (aggiungi/riapprovvigiona), remove (elimina), adjust (aggiungi/sottrai quantità), list (elenca), search (cerca), stats (riepilogo).',
  ),
  name: z.string().optional().describe('Nome dell\'ingrediente (es. "Pilsner Malt Weyermann", "Citra"). Obbligatorio per add/remove/adjust/search.'),
  category: z.enum(INVENTORY_CATEGORIES).optional().describe('Tipologia merce: malt, hop, yeast, spice, adjunct, water_salt, sugar, other.'),
  quantity: z.number().optional().describe('Quantità. Per add: quantità iniziale o da aggiungere. Per adjust: delta (positivo aggiunge, negativo sottrae).'),
  unit: z.string().optional().describe('Unità di misura (kg, g, pcs, packets, L, ml...). Default "kg" per malti/adjunct, "g" per luppoli/spezie, "pcs" per lieviti.'),
  purchaseDate: z.string().optional().describe('Data di acquisto in formato YYYY-MM-DD.'),
  cost: z.number().optional().describe('Costo unitario in EUR (per unità).'),
  supplier: z.string().optional().describe('Fornitore / negozio.'),
  bestBefore: z.string().optional().describe('Data di scadenza in formato YYYY-MM-DD.'),
  lot: z.string().optional().describe('Numero di lotto / partita.'),
  storage: z.string().optional().describe('Note di conservazione (frigo, buio, freezer...).'),
  notes: z.string().optional().describe('Note libere.'),
  expiringWithinDays: z.number().optional().describe('Per list: mostra solo gli articoli che scadono entro questo numero di giorni.'),
  lowStockBelow: z.number().optional().describe('Per list: mostra solo gli articoli con quantità inferiore a questo valore.'),
  includeExpired: z.boolean().default(false).describe('Per list: include anche gli articoli scaduti. Default false.'),
});

export type InventoryManagerInput = z.infer<typeof InventoryManagerInputSchema>;

export class InventoryManagerTool implements BuiltinTool<InventoryManagerInput> {
  readonly name = 'inventory_manager' as const;
  readonly description =
    'Gestisci l\'inventario persistente delle materie prime brassicole (malti, luppoli, lieviti, spezie, adjunct, sali acqua, zuccheri). Aggiungi/rimuovi/regola quantità, elenca, cerca e ottieni riepiloghi di scorte, valore e scadenze. I dati sono salvati in ~/.kimi-code/brewing/inventory.json.';
  readonly parameters: Record<string, unknown> = toInputJsonSchema(InventoryManagerInputSchema);

  resolveExecution(args: InventoryManagerInput): ToolExecution {
    return {
      description: `Inventory ${args.operation}${args.name ? `: ${args.name}` : ''}`,
      approvalRule: this.name,
      execute: () => this.execute(args),
    };
  }

  private execute(args: InventoryManagerInput): Promise<ExecutableToolResult> {
    try {
      switch (args.operation) {
        case 'add': return Promise.resolve(this.add(args));
        case 'remove': return Promise.resolve(this.remove(args));
        case 'adjust': return Promise.resolve(this.adjust(args));
        case 'list': return Promise.resolve(this.list(args));
        case 'search': return Promise.resolve(this.search(args));
        case 'stats': return Promise.resolve(this.stats());
      }
    } catch (e) {
      return Promise.resolve({ isError: true, output: e instanceof Error ? e.message : String(e) });
    }
  }

  // ── add ────────────────────────────────────────────────────────────────────

  private add(args: InventoryManagerInput): ExecutableToolResult {
    const name = args.name?.trim();
    if (!name) return { isError: true, output: 'Specifica un nome per l\'articolo (campo "name").' };

    const items = loadItems();
    const existing = findItem(items, name);

    if (existing) {
      // Restock: add quantity and refresh metadata
      const delta = args.quantity ?? 0;
      existing.quantity += delta;
      if (args.category) existing.category = args.category;
      if (args.unit) existing.unit = args.unit;
      if (args.purchaseDate) existing.purchaseDate = args.purchaseDate;
      if (args.cost !== undefined) existing.cost = args.cost;
      if (args.supplier) existing.supplier = args.supplier;
      if (args.bestBefore) existing.bestBefore = args.bestBefore;
      if (args.lot) existing.lot = args.lot;
      if (args.storage) existing.storage = args.storage;
      if (args.notes) existing.notes = args.notes;
      existing.updatedAt = new Date().toISOString();
      saveItems(items);
      return {
        output: `Riapprovvigionato **${existing.name}**: ora ${formatQty(existing)} (aggiunti ${delta} ${existing.unit}).\n${itemToLine(existing)}`,
      };
    }

    const category = args.category ?? inferCategory(name);
    const unit = args.unit ?? defaultUnit(category);
    const now = new Date().toISOString();
    const item: InventoryItem = {
      id: makeId(),
      name,
      category,
      quantity: args.quantity ?? 0,
      unit,
      purchaseDate: args.purchaseDate,
      cost: args.cost,
      supplier: args.supplier,
      bestBefore: args.bestBefore,
      lot: args.lot,
      storage: args.storage,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    };
    items.push(item);
    saveItems(items);
    return {
      output: `Aggiunto **${item.name}** [${item.category}] — ${formatQty(item)}.\n${itemToLine(item)}`,
    };
  }

  // ── remove ─────────────────────────────────────────────────────────────────

  private remove(args: InventoryManagerInput): ExecutableToolResult {
    const name = args.name?.trim();
    if (!name) return { isError: true, output: 'Specifica il nome dell\'articolo da rimuovere (campo "name").' };

    const items = loadItems();
    const idx = items.findIndex((i) => normalizeName(i.name) === normalizeName(name));
    if (idx < 0) return { isError: true, output: `Nessun articolo trovato con nome "${name}".` };

    const [removed] = items.splice(idx, 1);
    saveItems(items);
    return { output: `Rimosso **${removed.name}** [${removed.category}] dall'inventario.` };
  }

  // ── adjust ─────────────────────────────────────────────────────────────────

  private adjust(args: InventoryManagerInput): ExecutableToolResult {
    const name = args.name?.trim();
    if (!name) return { isError: true, output: 'Specifica il nome dell\'articolo da regolare (campo "name").' };
    if (args.quantity === undefined) return { isError: true, output: 'Specifica il delta di quantità (campo "quantity", positivo per aggiungere, negativo per sottrarre).' };

    const items = loadItems();
    const item = findItem(items, name);
    if (!item) return { isError: true, output: `Nessun articolo trovato con nome "${name}".` };

    item.quantity += args.quantity;
    if (item.quantity < 0) item.quantity = 0;
    item.updatedAt = new Date().toISOString();
    saveItems(items);

    const direction = args.quantity >= 0 ? 'aggiunti' : 'sottratti';
    const status = item.quantity === 0 ? ' ⚠️ ESAURITO' : '';
    return {
      output: `Regolato **${item.name}**: ${direction} ${Math.abs(args.quantity)} ${item.unit} → ora ${formatQty(item)}${status}.\n${itemToLine(item)}`,
    };
  }

  // ── list ───────────────────────────────────────────────────────────────────

  private list(args: InventoryManagerInput): ExecutableToolResult {
    let items = loadItems();
    if (items.length === 0) return { output: 'Inventario vuoto. Usa l\'operazione "add" per aggiungere materie prime.' };

    if (args.category) items = items.filter((i) => i.category === args.category);
    if (args.expiringWithinDays !== undefined) {
      items = items.filter((i) => i.bestBefore && daysUntil(i.bestBefore) <= args.expiringWithinDays!);
    }
    if (args.lowStockBelow !== undefined) {
      items = items.filter((i) => i.quantity < args.lowStockBelow!);
    }
    if (!args.includeExpired) {
      items = items.filter((i) => !i.bestBefore || daysUntil(i.bestBefore) >= 0);
    }

    if (items.length === 0) return { output: 'Nessun articolo corrisponde ai filtri specificati.' };

    const sorted = [...items].sort((a, b) => {
      const cat = a.category.localeCompare(b.category);
      return cat !== 0 ? cat : a.name.localeCompare(b.name);
    });

    const lines = [`**${sorted.length} articolo/i in inventario**`, ''];
    let currentCat = '';
    for (const item of sorted) {
      if (item.category !== currentCat) {
        currentCat = item.category;
        lines.push(`### ${currentCat}`);
      }
      lines.push(`- ${itemToLine(item)}`);
    }
    return { output: lines.join('\n') };
  }

  // ── search ─────────────────────────────────────────────────────────────────

  private search(args: InventoryManagerInput): ExecutableToolResult {
    const q = (args.name ?? '').trim().toLowerCase();
    if (!q) return { isError: true, output: 'Specifica un termine di ricerca (campo "name").' };

    const items = loadItems().filter((i) =>
      i.name.toLowerCase().includes(q) ||
      (i.notes ?? '').toLowerCase().includes(q) ||
      (i.supplier ?? '').toLowerCase().includes(q) ||
      (i.lot ?? '').toLowerCase().includes(q),
    );

    if (items.length === 0) return { output: `Nessun articolo trovato per "${q}".` };
    const lines = [`**${items.length} risultato/i per "${q}"**`, ''];
    for (const item of items) lines.push(`- ${itemToLine(item)}`);
    return { output: lines.join('\n') };
  }

  // ── stats ──────────────────────────────────────────────────────────────────

  private stats(): ExecutableToolResult {
    const items = loadItems();
    if (items.length === 0) return { output: 'Inventario vuoto. Usa l\'operazione "add" per aggiungere materie prime.' };

    const totalValue = items.reduce((sum, i) => sum + (i.cost !== undefined ? i.cost * i.quantity : 0), 0);
    const expiring = items
      .filter((i) => i.bestBefore && daysUntil(i.bestBefore) <= 30)
      .sort((a, b) => (a.bestBefore! < b.bestBefore! ? -1 : 1));
    const expired = items.filter((i) => i.bestBefore && daysUntil(i.bestBefore) < 0);
    const lowStock = items.filter((i) => i.quantity === 0);
    const outOfStock = items.filter((i) => i.quantity <= 0);

    const byCategory: Record<string, number> = {};
    for (const i of items) byCategory[i.category] = (byCategory[i.category] ?? 0) + 1;

    const lines = [
      `**Riepilogo inventario**`,
      '',
      `- Articoli totali: ${items.length}`,
      `- Valore stimato: €${totalValue.toFixed(2)}`,
      `- Esauriti (qty 0): ${outOfStock.length}`,
      '',
      'Per categoria:',
      ...Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, n]) => `  - ${cat}: ${n}`),
    ];

    if (expired.length > 0) {
      lines.push('', `**Scaduti (${expired.length}):**`);
      for (const i of expired) lines.push(`  - ${i.name} — scaduto da ${-daysUntil(i.bestBefore!)}g`);
    }
    if (expiring.length > 0) {
      lines.push('', `**In scadenza entro 30 giorni (${expiring.length}):**`);
      for (const i of expiring) lines.push(`  - ${i.name} — ${i.bestBefore}${expiryLabel(i)}`);
    }
    if (outOfStock.length > 0) {
      lines.push('', `**Da riacquistare (${outOfStock.length}):**`);
      for (const i of outOfStock) lines.push(`  - ${i.name} [${i.category}]`);
    }

    return { output: lines.join('\n') };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function inferCategory(name: string): InventoryCategory {
  const n = name.toLowerCase();
  if (/\b(hop|luppolo|luppoli)\b/.test(n) || /(citra|mosaic|simcoe|cascade|saaz|hallertau|chinook|centennial|amarillo|galaxy|magnum|fuggles|goldings|willamette|columbus|warrior|strata|el dorado|tettnang|hersbrucker|nelson|motueka|azacca|idaho|bru-1|talus|sabro|vic secret|enigma|phoenix|northdown|target|challenger|brewers gold|perle|spalt|tradition|liberty|crystal|mt hood|sterling|santiam|glacier|summit|bravo|zeus|apollo|equinox|jarrylo|cashmere|lemon drop|mandarina|huell melon|polaris|comet|cluster|nugget|willamette)\b/.test(n)) {
    return 'hop';
  }
  if (/\b(yeast|lievito|lieviti|safale|safbrew|saflager|wlp|wyeast|omega|lallemand|fermentis|mangrove|kveik|us-05|s-04|w-34)\b/.test(n)) {
    return 'yeast';
  }
  if (/\b(spice|spezia|spezie|corriandolo|buccia|arancia|vaniglia|cannella|noce moscata|zenzero|pepe|chiodi|cardamomo|anice|finocchio|lavanda|rosmarino|timo|salvia|hibiscus|ibisco|ciliegia|frutto|frutta)\b/.test(n)) {
    return 'spice';
  }
  if (/\b(salt|sale|calcio|magnesio|sodio|cloruro|solfato|bicarbonato|gypsum|epsom|calcium|magnesium|acqua|water)\b/.test(n)) {
    return 'water_salt';
  }
  if (/\b(sugar|zucchero|destrosio|saccarosio|miele|melassa|sciroppo|glucosio|fruttosio|lattosio|brown sugar|turbinado|demerara|belgian candi|candi)\b/.test(n)) {
    return 'sugar';
  }
  if (/\b(adjunct|fiocchi|flaked|riso|mais|avena|orzo|grano|farro|segale|rye|wheat|oats|rice|corn|barley|triticale|sorgo|miglio|quinoa)\b/.test(n)) {
    return 'adjunct';
  }
  return 'malt';
}

function defaultUnit(category: InventoryCategory): string {
  switch (category) {
    case 'hop':
    case 'spice':
    case 'water_salt':
      return 'g';
    case 'yeast':
      return 'pcs';
    case 'sugar':
      return 'kg';
    default:
      return 'kg';
  }
}

registerTool(InventoryManagerTool);
