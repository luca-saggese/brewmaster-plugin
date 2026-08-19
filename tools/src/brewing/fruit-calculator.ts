/**
 * Fruit calculator — estimate fruit dosage for fruit beers.
 *
 * Computes a recommended dosage range (not an exact quantity) based on
 * fruit aromatic potency, fruit form, addition method, beer style, and
 * other fruits already present. Also estimates the theoretical alcohol
 * potential of the added fruit sugars and the water contributed by the
 * actual product.
 *
 * Important caveats: the intensity scale and aromatic factors are sensory
 * heuristics, not calibrated instruments. Actual extraction yield depends
 * on contact time, temperature, bag/loose fruit, and ripeness.
 */

import { z } from 'zod';

import type { BuiltinTool, ToolExecution } from '../shim/tool-contract';
import { registerTool } from '../shim/tool-registry';

// ── Fruit database ───────────────────────────────────────────────────────────

export interface FruitInfo {
    id: string;
    name: string;
    aliases: string[];
    factor: number;
    /** g sugar per 100 g fresh fruit. */
    sugarPercent: number;
    /** g water per 100 g fresh fruit. */
    waterPercent: number;
    /** Approximate °Brix of the fresh fruit (soluble solids, >= sugarPercent). */
    typicalBrix: number;
    ph: number;
    notes: string;
}

const FRUITS: FruitInfo[] = [
    { id: 'strawberry', name: 'Fragola', aliases: ['fragole', 'strawberry'], factor: 1.00, sugarPercent: 5, waterPercent: 91, typicalBrix: 8, ph: 3.5, notes: 'Riferimento. Aroma riconoscibile dai 50 g/L.' },
    { id: 'raspberry', name: 'Lampone', aliases: ['lamponi', 'raspberry'], factor: 0.70, sugarPercent: 4, waterPercent: 87, typicalBrix: 8, ph: 3.3, notes: 'Molto aromatico. Acidità elevata.' },
    { id: 'blackberry', name: 'Mora', aliases: ['more', 'blackberry'], factor: 0.80, sugarPercent: 5, waterPercent: 88, typicalBrix: 10, ph: 3.4, notes: 'Buona persistenza. Semi fastidiosi.' },
    { id: 'blueberry', name: 'Mirtillo', aliases: ['mirtilli', 'blueberry'], factor: 1.20, sugarPercent: 10, waterPercent: 84, typicalBrix: 14, ph: 3.3, notes: 'Meno aromatico del previsto.' },
    { id: 'cranberry', name: 'Mirtillo rosso', aliases: ['cranberry', 'mirtilli rossi'], factor: 0.90, sugarPercent: 4, waterPercent: 87, typicalBrix: 8, ph: 2.5, notes: 'Molto acido. Attenzione pH.' },
    { id: 'redcurrant', name: 'Ribes rosso', aliases: ['ribes', 'redcurrant'], factor: 0.60, sugarPercent: 7, waterPercent: 82, typicalBrix: 10, ph: 2.7, notes: 'Molto aromatico. Ottimo in sour.' },
    { id: 'blackcurrant', name: 'Ribes nero', aliases: ['cassis', 'blackcurrant'], factor: 0.50, sugarPercent: 6, waterPercent: 82, typicalBrix: 12, ph: 2.8, notes: 'Fortissimo. 30 g/L bastano.' },
    { id: 'gooseberry', name: 'Uva spina', aliases: ['gooseberry'], factor: 0.80, sugarPercent: 5, waterPercent: 88, typicalBrix: 8, ph: 3.0, notes: 'Buona acidità.' },
    { id: 'sour_cherry', name: 'Amarena / visciola', aliases: ['amarene', 'visciola', 'sour cherry'], factor: 0.75, sugarPercent: 8, waterPercent: 82, typicalBrix: 14, ph: 3.3, notes: 'Classica italiana.' },
    { id: 'elderberry', name: 'Sambuco', aliases: ['elderberry'], factor: 0.60, sugarPercent: 7, waterPercent: 80, typicalBrix: 11, ph: 3.8, notes: 'Solo succo, no semi (cianuro).' },
    // Stone fruits
    { id: 'cherry', name: 'Ciliegia', aliases: ['ciliegie', 'cherry'], factor: 0.90, sugarPercent: 12, waterPercent: 82, typicalBrix: 16, ph: 3.7, notes: 'Marasche più intense.' },
    { id: 'peach', name: 'Pesca', aliases: ['pesche', 'peach'], factor: 1.00, sugarPercent: 9, waterPercent: 89, typicalBrix: 12, ph: 3.8, notes: 'Aroma delicato.' },
    { id: 'apricot', name: 'Albicocca', aliases: ['albicocche', 'apricot'], factor: 1.00, sugarPercent: 9, waterPercent: 86, typicalBrix: 12, ph: 3.7, notes: 'Varietà tardive più aromatiche.' },
    { id: 'plum', name: 'Prugna', aliases: ['prugne', 'susine', 'plum'], factor: 1.00, sugarPercent: 10, waterPercent: 87, typicalBrix: 14, ph: 3.5, notes: 'Varietà rosse miglior colore.' },
    { id: 'damson', name: 'Susina selvatica', aliases: ['damson'], factor: 0.80, sugarPercent: 8, waterPercent: 80, typicalBrix: 12, ph: 3.0, notes: 'Più acida della prugna comune.' },
    // Tropical
    { id: 'mango', name: 'Mango', aliases: [], factor: 0.80, sugarPercent: 14, waterPercent: 83, typicalBrix: 17, ph: 4.0, notes: 'Perfetto in IPA. Usare mango maturo.' },
    { id: 'pineapple', name: 'Ananas', aliases: [], factor: 0.80, sugarPercent: 10, waterPercent: 86, typicalBrix: 13, ph: 3.5, notes: 'Enzima bromelina: degrada proteine.' },
    { id: 'passionfruit', name: 'Frutto della passione', aliases: ['passion fruit', 'maracuja', 'maracujá'], factor: 0.60, sugarPercent: 11, waterPercent: 73, typicalBrix: 15, ph: 3.0, notes: 'Molto aromatico. Acidità marcata.' },
    { id: 'guava', name: 'Guava', aliases: [], factor: 0.80, sugarPercent: 9, waterPercent: 81, typicalBrix: 12, ph: 3.8, notes: 'Aroma tropicale distintivo.' },
    { id: 'papaya', name: 'Papaya', aliases: [], factor: 1.00, sugarPercent: 8, waterPercent: 88, typicalBrix: 10, ph: 5.0, notes: 'Enzima papaina. pH alto.' },
    { id: 'coconut', name: 'Cocco', aliases: [], factor: 1.20, sugarPercent: 3, waterPercent: 47, typicalBrix: 5, ph: 6.0, notes: 'Tostato non zuccherato. Grasso = schiuma.' },
    { id: 'lychee', name: 'Lychee', aliases: ['litchi'], factor: 0.90, sugarPercent: 15, waterPercent: 82, typicalBrix: 18, ph: 4.5, notes: 'Floreale delicato.' },
    // Citrus
    { id: 'orange', name: 'Arancia', aliases: ['arance', 'orange', 'arancia dolce'], factor: 0.90, sugarPercent: 9, waterPercent: 87, typicalBrix: 12, ph: 3.6, notes: 'Succo + scorza. Navel, Valencia. Meno intensa della rossa.' },
    { id: 'mandarin', name: 'Mandarino', aliases: ['mandarini', 'mandarin', 'tangerine', 'clementina'], factor: 0.80, sugarPercent: 10, waterPercent: 85, typicalBrix: 13, ph: 3.7, notes: 'Più aromatico dell\'arancia. Ottimo in wit e saison.' },
    { id: 'blood_orange', name: 'Arancia rossa', aliases: ['tarocco', 'blood orange'], factor: 0.80, sugarPercent: 9, waterPercent: 87, typicalBrix: 12, ph: 3.5, notes: 'Succo + scorza. Wit e sour.' },
    { id: 'grapefruit', name: 'Pompelmo rosa', aliases: ['pompelmo', 'grapefruit'], factor: 0.70, sugarPercent: 6, waterPercent: 90, typicalBrix: 10, ph: 3.2, notes: 'Amareggiante. Interagisce farmaci.' },
    { id: 'lemon_lime', name: 'Limone / lime', aliases: ['limone', 'lime', 'limoni'], factor: 0.50, sugarPercent: 2, waterPercent: 89, typicalBrix: 8, ph: 2.2, notes: 'Succo + scorza. ACIDO.' },
    { id: 'pear', name: 'Pera', aliases: ['pere', 'pear'], factor: 1.10, sugarPercent: 10, waterPercent: 84, typicalBrix: 13, ph: 4.0, notes: 'Delicata. Williams.' },
    { id: 'apple', name: 'Mela', aliases: ['mele', 'apple'], factor: 1.10, sugarPercent: 10, waterPercent: 85, typicalBrix: 13, ph: 3.5, notes: 'Granny Smith, Pink Lady.' },
    { id: 'banana', name: 'Banana', aliases: ['banane'], factor: 0.80, sugarPercent: 12, waterPercent: 75, typicalBrix: 20, ph: 5.0, notes: 'Corpo e torbidità.' },
    // Melons
    { id: 'melon', name: 'Melone', aliases: [], factor: 1.30, sugarPercent: 8, waterPercent: 90, typicalBrix: 10, ph: 5.5, notes: 'Molto delicato. pH alto.' },
    { id: 'watermelon', name: 'Anguria', aliases: ['anguria', 'watermelon', 'cocomero'], factor: 1.50, sugarPercent: 6, waterPercent: 91, typicalBrix: 8, ph: 5.3, notes: 'Acquosissima. Diluisce molto.' },
    { id: 'cucumber', name: 'Cetriolo', aliases: ['cetrioli', 'cucumber'], factor: 1.50, sugarPercent: 2, waterPercent: 95, typicalBrix: 4, ph: 5.5, notes: 'Buccia per aroma, polpa per volume.' },
    { id: 'pumpkin', name: 'Zucca', aliases: ['pumpkin'], factor: 1.30, sugarPercent: 3, waterPercent: 92, typicalBrix: 8, ph: 5.5, notes: 'Cuocere prima.' },
    // Other
    { id: 'fig', name: 'Fico', aliases: ['fichi', 'fig'], factor: 0.90, sugarPercent: 16, waterPercent: 79, typicalBrix: 20, ph: 5.0, notes: 'Molto zuccherino.' },
    { id: 'date', name: 'Dattero', aliases: ['datteri', 'date'], factor: 0.70, sugarPercent: 63, waterPercent: 21, typicalBrix: 70, ph: 5.5, notes: 'Pastorizzare 30 min a 70°C.' },
    { id: 'grape_must', name: 'Uva (mosto)', aliases: ["mosto d'uva", 'grape must', 'uva'], factor: 1.00, sugarPercent: 16, waterPercent: 81, typicalBrix: 20, ph: 3.3, notes: 'Contributo alcolico significativo.' },
];

// ── Intensity ────────────────────────────────────────────────────────────────

const INTENSITIES = [
    { label: 'Accenno', minGL: 20, maxGL: 50, midGL: 35 },
    { label: 'Leggero', minGL: 50, maxGL: 100, midGL: 75 },
    { label: 'Medio', minGL: 100, maxGL: 200, midGL: 150 },
    { label: 'Intenso', minGL: 200, maxGL: 400, midGL: 300 },
    { label: 'Estremo', minGL: 400, maxGL: 800, midGL: 600 },
];

// ── Forms ────────────────────────────────────────────────────────────────────

const FORMS = {
    fresh: { label: 'Fresco / congelato / surgelato' },
    puree: { label: 'Purea sterile (es. Boiron)' },
    juice: { label: 'Succo 100%' },
    concentrate: { label: 'Concentrato (65°Brix)' },
    lyophilized: { label: 'Liofilizzato in polvere' },
    dried: { label: 'Essiccato / disidratato' },
};

// ── Methods ──────────────────────────────────────────────────────────────────

const METHODS_T = {
    secondary: { label: 'In fermentatore (post-fermentazione)', efficiency: 1.0 },
    whirlpool: { label: 'Whirlpool a caldo (80-95°C)', efficiency: 0.70 },
    end_boil: { label: 'Fine bollitura (ultimi 5 min)', efficiency: 0.50 },
    mash: { label: 'In mash', efficiency: 0.30 },
    tincture: { label: 'Tintura alcolica post-fermento', efficiency: 1.0 },
    keg: { label: 'In fusto / serving tank', efficiency: 1.0 },
};

const METHODS: Record<string, { label: string; efficiency: number }> = METHODS_T;

// ── Style adjustments ────────────────────────────────────────────────────────

const STYLE_ADJ: Record<string, { factor: number }> = {
    sour: { factor: 0.85 },
    ipa: { factor: 1.15 },
    stout: { factor: 1.30 },
    wheat: { factor: 1.00 },
    blonde: { factor: 0.95 },
    saison: { factor: 1.05 },
    belgian: { factor: 1.10 },
    lager: { factor: 1.00 },
    neipa: { factor: 1.10 },
    other: { factor: 1.00 },
};

// ── Type aliases (after the objects they refer to) ───────────────────────────

type FruitForm = keyof typeof FORMS;
type AdditionMethod = keyof typeof METHODS_T;
type BeerStyle = keyof typeof STYLE_ADJ;

// ── Input schema ─────────────────────────────────────────────────────────────

const FRUIT_PARAMS_SCHEMA = z.object({
    name: z.string().trim().min(1).describe('Nome del frutto.'),
    factor: z.number().positive().describe('Fattore aromatico (es. 1.00 = fragola, 0.50 = ribes nero, 1.50 = anguria). Più basso = più aromatico.'),
    sugarPercent: z.number().min(0).max(100).describe('g zuccheri per 100 g di frutto fresco.'),
    waterPercent: z.number().min(0).max(100).describe('g acqua per 100 g di frutto fresco.'),
    typicalBrix: z.number().min(0).max(100).describe('°Brix approssimativo del frutto fresco.'),
    ph: z.number().min(0).max(14).describe('pH del frutto fresco.'),
    notes: z.string().default(''),
});

export type FruitParams = z.infer<typeof FRUIT_PARAMS_SCHEMA>;

export const FruitCalculatorInputSchema = z.object({
    fruit_name: z.string().trim().min(1).describe('Nome del frutto principale in italiano.'),
    /** Parametri per un frutto non presente nel database integrato. Se fornito, sovrascrive la ricerca nel database. */
    fruit_params: FRUIT_PARAMS_SCHEMA.optional().describe('Parametri del frutto (fattore aromatico, zuccheri, acqua, °Brix, pH). Obbligatorio solo se il frutto non è presente nel database.'),
    batch_size_liters: z.number().positive().describe("Volume attuale della birra dopo gli altri frutti e prima del frutto principale (L)."),
    intensity: z.enum(['accenno', 'leggero', 'medio', 'intenso', 'estremo']).default('leggero'),
    fruit_form: z.enum(['fresh', 'puree', 'juice', 'concentrate', 'lyophilized', 'dried']).default('fresh'),
    addition_method: z.enum(['secondary', 'whirlpool', 'end_boil', 'mash', 'tincture', 'keg']).default('secondary'),
    beer_style: z.enum(['sour', 'ipa', 'stout', 'wheat', 'blonde', 'saison', 'belgian', 'lager', 'neipa', 'other']).default('other'),
    initial_abv: z.number().min(0).max(20).optional().describe('ABV della birra DOPO gli altri frutti e PRIMA del frutto principale (opzionale).'),
    /** Tincture-specific params — only meaningful when addition_method === 'tincture'. */
    tincture_alcohol_abv: z.number().min(0.4).max(0.96).default(0.95).describe('Alcool per tintura (frazione, es. 0.95).'),
    tincture_ml_per_g: z.number().positive().default(1.3).describe('mL alcool per g di liofilizzato.'),
    /** Other fruits, each with its own name, fresh-equivalent kg, and addition method. */
    other_fruits: z.array(z.object({
        fruit_name: z.string().trim().min(1),
        fresh_equivalent_kg: z.number().positive(),
        addition_method: z.enum(['secondary', 'whirlpool', 'end_boil', 'mash', 'keg']).default('secondary'),
        /** Parametri per un frutto non nel database. Se fornito, sovrascrive la ricerca. */
        fruit_params: FRUIT_PARAMS_SCHEMA.optional(),
    })).default([]).describe('Altri frutti già presenti, ciascuno con nome, kg freschi eq. e metodo di aggiunta.'),
    show_details: z.boolean().default(true),
}).superRefine((input, ctx) => {
    // Tincture only works with dried/lyophilized substrates
    if (input.addition_method === 'tincture' && !['lyophilized', 'dried'].includes(input.fruit_form)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['fruit_form'],
            message: 'Per la tintura seleziona liofilizzato o essiccato.',
        });
    }
});

export type FruitCalculatorInput = z.infer<typeof FruitCalculatorInputSchema>;

// ── Matching ─────────────────────────────────────────────────────────────────

function normalizeName(value: string): string {
    return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
}

/** Return all exact matches sorted by specificity. */
function findAllMatches(raw: string): FruitInfo[] {
    const query = normalizeName(raw);
    const exactMatches = FRUITS.filter(f => f.id === query || normalizeName(f.name) === query || f.aliases.some(a => normalizeName(a) === query));
    if (exactMatches.length > 0) return exactMatches;
    const candidates = FRUITS.filter(f => normalizeName(f.name).includes(query) || f.aliases.some(a => normalizeName(a).includes(query)));
    return candidates.sort((a, b) => Math.abs(a.name.length - raw.length) - Math.abs(b.name.length - raw.length));
}

function findFruit(raw: string): FruitInfo | undefined {
    const matches = findAllMatches(raw);
    if (matches.length === 0) return undefined;
    if (matches.length === 1) return matches[0];
    // Ambiguous: return the best match but note ambiguity
    return matches[0];
}

// ── Mass conversion ──────────────────────────────────────────────────────────

function isFormApplicable(fruit: FruitInfo, form: FruitForm): boolean {
    return !(form === 'concentrate' && fruit.typicalBrix >= 65);
}

/**
 * Convert fresh-equivalent kg to actual product mass.
 * Throws if the *requested* form is not applicable.
 */
function toProductKg(freshKg: number, fruit: FruitInfo, formKey: FruitForm): number {
    if (formKey === 'concentrate' && fruit.typicalBrix >= 65) {
        throw new Error(
            `Il concentrato 65 °Brix non è applicabile a ${fruit.name}: il prodotto di partenza è già circa ${fruit.typicalBrix} °Brix.`,
        );
    }
    switch (formKey) {
        case 'fresh':
        case 'puree':
        case 'juice':
            return freshKg;
        case 'concentrate': {
            const brix = fruit.typicalBrix;
            if (brix <= 0) return freshKg;
            return freshKg * (brix / 65);
        }
        case 'lyophilized': {
            const solidsFresh = (100 - fruit.waterPercent) / 100;
            if (solidsFresh <= 0) return freshKg * 0.1;
            return freshKg * solidsFresh / 0.96;
        }
        case 'dried': {
            const solidsFresh = (100 - fruit.waterPercent) / 100;
            if (solidsFresh <= 0) return freshKg * 0.25;
            return freshKg * solidsFresh / 0.85;
        }
        default:
            return freshKg;
    }
}

// ── Water & sugar from fresh-equivalent (not product mass) ───────────────────

/** Sugar in grams derived from the fresh-equivalent mass. Format conversion preserves sugar. */
function freshEquivalentSugarGrams(freshKg: number, fruit: FruitInfo): number {
    return freshKg * 1000 * (fruit.sugarPercent / 100);
}

/** Water contributed by the ACTUAL product (kg). */
function productWaterKg(productKg: number, fruit: FruitInfo, formKey: FruitForm): number {
    switch (formKey) {
        case 'fresh':
        case 'puree':
        case 'juice':
            return productKg * (fruit.waterPercent / 100);
        case 'concentrate':
            return productKg * 0.35;
        case 'lyophilized':
            return productKg * 0.04;
        case 'dried':
            return productKg * 0.15;
        default:
            return 0;
    }
}

// ── Compute ──────────────────────────────────────────────────────────────────

interface CalcResult {
    fruit: FruitInfo;
    intensityLabel: string;
    rangeMinGL: number;
    rangeMaxGL: number;
    midFreshGL: number;
    midFreshKg: number;
    midProductKg: number;
    otherReduction: number;
    sugarGrams: number;
    waterLiters: number;
    form: FruitForm;
    methodEfficiency: number;
    styleFactor: number;
    initialAbv: number | undefined;
    tinctureAlcoholAbv: number;
    tinctureMlPerG: number;
    otherFruits: FruitCalculatorInput['other_fruits'];
    /** Ambiguous matches for the main fruit (more than 1 candidate). */
    ambiguousMatches: string[];
}

/** Build a FruitInfo from user-supplied fruit_params. */
function fruitInfoFromParams(name: string, params: FruitParams): FruitInfo {
    return {
        id: normalizeName(name),
        name,
        aliases: [],
        factor: params.factor,
        sugarPercent: params.sugarPercent,
        waterPercent: params.waterPercent,
        typicalBrix: params.typicalBrix,
        ph: params.ph,
        notes: params.notes,
    };
}

/** Resolve a fruit by name, falling back to fruit_params when the name is not in the database. */
function resolveFruit(raw: string, params?: FruitParams): { fruit: FruitInfo; ambiguousMatches: string[]; fromParams: boolean } {
    const matches = findAllMatches(raw);
    if (matches.length > 0) {
        const fruit = matches[0]!;
        const ambiguousMatches = matches.length > 1 ? matches.slice(1).map(f => f.name) : [];
        return { fruit, ambiguousMatches, fromParams: false };
    }
    if (params) {
        return { fruit: fruitInfoFromParams(raw, params), ambiguousMatches: [], fromParams: true };
    }
    throw new Error(`Frutto "${raw}" non trovato nel database. Fornisci fruit_params con i dati del frutto (fattore aromatico, zuccheri, acqua, °Brix, pH).`);
}

function compute(input: FruitCalculatorInput): CalcResult {
    const { fruit, ambiguousMatches } = resolveFruit(input.fruit_name, input.fruit_params);

    const intensity = INTENSITIES.find(i => i.label.toLowerCase() === input.intensity)!;
    const method = METHODS[input.addition_method as AdditionMethod]!;
    const style = STYLE_ADJ[input.beer_style as BeerStyle]!;

    // Reference-scale midpoint for main fruit (before other fruits)
    const rawMidMainGL = intensity.midGL * fruit.factor * style.factor / method.efficiency;

    // Compute sensory contribution of other fruits
    let totalOtherReferenceGL = 0;
    for (const other of (input.other_fruits ?? [])) {
        const { fruit: otherFruit } = resolveFruit(other.fruit_name, other.fruit_params);
        const otherMethod = METHODS[other.addition_method as AdditionMethod]!;
        const otherGL = (other.fresh_equivalent_kg * 1000) / input.batch_size_liters;
        totalOtherReferenceGL += otherGL * otherMethod.efficiency / otherFruit.factor / style.factor;
    }

    const remainingMinReferenceGL = Math.max(
        0,
        intensity.minGL - totalOtherReferenceGL
    );

    const remainingMaxReferenceGL = Math.max(
        0,
        intensity.maxGL - totalOtherReferenceGL
    );

    const finalMin =
        remainingMinReferenceGL *
        fruit.factor *
        style.factor /
        method.efficiency;

    const finalMax =
        remainingMaxReferenceGL *
        fruit.factor *
        style.factor /
        method.efficiency;

    const finalMid = (finalMin + finalMax) / 2;

    // otherReduction: same-scale comparison (main fruit g/L before vs after other fruits)
    const otherReduction = rawMidMainGL > 0
        ? Math.min(1, Math.max(0, 1 - finalMid / rawMidMainGL))
        : 0;

    const midFreshKg = (finalMid * input.batch_size_liters) / 1000;
    const midProductKg = toProductKg(midFreshKg, fruit, input.fruit_form as FruitForm);
    const sugarGrams = freshEquivalentSugarGrams(midFreshKg, fruit);
    const waterLiters = productWaterKg(midProductKg, fruit, input.fruit_form as FruitForm);

    return {
        fruit, intensityLabel: intensity.label,
        rangeMinGL: finalMin, rangeMaxGL: finalMax,
        midFreshGL: finalMid, midFreshKg, midProductKg,
        otherReduction, sugarGrams, waterLiters,
        form: input.fruit_form as FruitForm,
        methodEfficiency: method.efficiency, styleFactor: style.factor,
        initialAbv: input.initial_abv,
        tinctureAlcoholAbv: input.tincture_alcohol_abv,
        tinctureMlPerG: input.tincture_ml_per_g,
        otherFruits: input.other_fruits ?? [],
        ambiguousMatches,
    };
}

// ── Formatting ───────────────────────────────────────────────────────────────

function formatResults(input: FruitCalculatorInput): string {
    const lines: string[] = [];
    lines.push(`# 🍓 Fruit Calculator: ${input.fruit_name} in ${input.batch_size_liters}L`);
    lines.push('');

    let calc: CalcResult;
    try {
        calc = compute(input);
    } catch (e) {
        if (e instanceof Error && e.message.includes('non trovato nel database')) {
            lines.push(`⚠️ **"${input.fruit_name}" non trovato nel database.**`);
            lines.push('');
            lines.push('🔍 **Cerca online** i valori nutrizionali del frutto (zuccheri g/100g, acqua g/100g, pH) e stima il **fattore aromatico** (1.00 = fragola, <1 = più aromatico, >1 = meno aromatico). Poi riempi `fruit_params` e riprova la chiamata.');
            lines.push('');
            lines.push('Frutti già disponibili nel database:');
            for (const f of FRUITS) lines.push(`- ${f.name} (×${f.factor.toFixed(2)})`);
            return lines.join('\n');
        }
        lines.push(`❌ **Errore:** ${e instanceof Error ? e.message : String(e)}`);
        return lines.join('\n');
    }
    const formLabel = FORMS[calc.form].label;
    const methodLabel = METHODS[input.addition_method as AdditionMethod]!.label;

    // ── Parameters ──
    lines.push('## 📊 Parametri');
    lines.push('');
    lines.push('| Parametro | Valore |');
    lines.push('|---|---|');
    if (input.fruit_params && !FRUITS.some(f => normalizeName(f.name) === normalizeName(input.fruit_name) || f.aliases.some(a => normalizeName(a) === normalizeName(input.fruit_name)))) {
        lines.push(`| Frutto | **${calc.fruit.name}** *(parametri personalizzati)* |`);
    } else {
        lines.push(`| Frutto | **${calc.fruit.name}** |`);
    }
    lines.push(`| Fattore aromatico | ×${calc.fruit.factor.toFixed(2)} |`);
    lines.push(`| Zuccheri | ${calc.fruit.sugarPercent} g/100g |`);
    lines.push(`| Acqua | ${calc.fruit.waterPercent} g/100g |`);
    lines.push(`| °Brix | ${calc.fruit.typicalBrix} |`);
    lines.push(`| Intensità | **${calc.intensityLabel}** |`);
    lines.push(`| Formato | ${formLabel} |`);
    lines.push(`| Metodo | ${methodLabel} (~${(calc.methodEfficiency * 100).toFixed(0)}% efficienza) |`);
    if (input.beer_style !== 'other') lines.push(`| Stile | ${input.beer_style} (×${calc.styleFactor.toFixed(2)}) |`);

if ((calc.otherFruits ?? []).length > 0) {
    lines.push(`| Altri frutti | ${(calc.otherFruits ?? []).length} frutto/i → riduzione ~${(calc.otherReduction * 100).toFixed(0)}% sul principale |`);
    }

    if (calc.ambiguousMatches.length > 0) {
        lines.push(`| ⚠️ Ambiguità | Trovati anche: ${calc.ambiguousMatches.join(', ')}. Se intendevi uno di questi, specifica il nome esatto. |`);
    }

    lines.push('');

    // ── Dosage range ──
    lines.push('## 🎯 Intervallo di dosaggio consigliato');
    lines.push('');
    lines.push(`Per **${input.batch_size_liters}L** (volume prima della frutta):`);
    lines.push('');
    const minKg = toProductKg((calc.rangeMinGL * input.batch_size_liters) / 1000, calc.fruit, calc.form);
    const maxKg = toProductKg((calc.rangeMaxGL * input.batch_size_liters) / 1000, calc.fruit, calc.form);
    lines.push('| Formato | Min | Consigliato | Max |');
    lines.push('|---|---|---|---|');
    lines.push(`| **${formLabel}** | **${minKg.toFixed(2)} kg** | **${calc.midProductKg.toFixed(2)} kg** | **${maxKg.toFixed(2)} kg** |`);
    lines.push(`| Fresco equivalente | ${(calc.rangeMinGL * input.batch_size_liters / 1000).toFixed(2)} kg | ${calc.midFreshKg.toFixed(2)} kg | ${(calc.rangeMaxGL * input.batch_size_liters / 1000).toFixed(2)} kg |`);
    lines.push(`| g/L fresco eq. | ${calc.rangeMinGL.toFixed(0)} | ${calc.midFreshGL.toFixed(0)} | ${calc.rangeMaxGL.toFixed(0)} |`);
    lines.push('');
    lines.push("> ⚠️ Intervallo indicativo basato su euristiche sensoriali. Regola nelle cotte successive.");
    lines.push('');

    // ── Alternative forms ──
    lines.push('## 🔄 In altri formati');
    lines.push('');
    lines.push('| Formato | Quantità consigliata |');
    lines.push('|---|---|');
    for (const [key, fi] of Object.entries(FORMS)) {
        const form = key as FruitForm;
        if (form === calc.form) continue;
        if (!isFormApplicable(calc.fruit, form)) {
            lines.push(`| ${fi.label} | N/D — frutto già a ${calc.fruit.typicalBrix} °Brix |`);
            continue;
        }
        const qty = toProductKg(calc.midFreshKg, calc.fruit, form);
        lines.push(`| ${fi.label} | ${qty.toFixed(2)} kg |`);
    }
    lines.push('');

    // Tincture recipe: only if addition_method is 'tincture'
    if (input.addition_method === 'tincture') {
        const substrateKg = calc.midProductKg;
        if (substrateKg > 0.001) {
            const substrateG = Math.round(substrateKg * 1000);
            const alcMl = Math.round(substrateG * calc.tinctureMlPerG);
            const alcPct = calc.tinctureAlcoholAbv * 100;
            const substrateLabel = input.fruit_form === 'lyophilized' ? 'Liofilizzato' : 'Essiccato';
            lines.push('## 🧪 Ricetta tintura alcolica');
            lines.push('');
            lines.push(`- ${substrateLabel} ${calc.fruit.name}: **${substrateG} g**`);
            lines.push(`- Alcool ${alcPct.toFixed(0)}°: **${alcMl} mL** (7-14gg al buio, filtrare)`);
            lines.push('');
        }
    }

    // ── ABV & dilution impact ──
    if (input.show_details) {
        const sugarG = calc.sugarGrams;

        // Recovery fractions: vary by form and method
        function sugarRecoveryFor(fm: FruitForm, am: AdditionMethod): number {
            if (fm === 'juice' || fm === 'concentrate') return 0.98;
            if (am === 'tincture') return 0.90;
            return 0.85;
        }
        function waterRecoveryFor(fm: FruitForm): number {
            if (fm === 'juice' || fm === 'concentrate') return 0.98;
            if (fm === 'puree') return 0.90;
            if (fm === 'lyophilized' || fm === 'dried') return 0.0;
            return 0.75;
        }
        function estimatedProductDensityKgL(fm: FruitForm): number {
            if (fm === 'concentrate') return 1.32;
            if (fm === 'juice') return 1 + calc.fruit.typicalBrix * 0.004;
            if (fm === 'puree') return 1.05;
            return 1.0;
        }
        function transferredProductVolumeL(productKg: number, waterKg: number, fm: FruitForm): number {
            if (fm === 'juice' || fm === 'concentrate' || fm === 'puree') {
                return productKg / estimatedProductDensityKgL(fm) * waterRecoveryFor(fm);
            }
            return waterKg * waterRecoveryFor(fm);
        }

        const mainRecovery = sugarRecoveryFor(calc.form, input.addition_method as AdditionMethod);
        const fermentableFraction = 0.95;
        const fermentationYieldFraction = 0.95;

        // Fruit ethanol from main fruit only (others already accounted in initial_abv)
        const fruitEthanolL = sugarG * mainRecovery * fermentableFraction * fermentationYieldFraction * 0.51 / 789;

        // Tincture ethanol
        let tinctureEthanolL = 0;
        let tinctureVolumeL = 0;
        if (input.addition_method === 'tincture') {
            const substrateKg = calc.midProductKg;
            const substrateG = substrateKg * 1000;
            const alcMl = substrateG * calc.tinctureMlPerG;
            const tinctureRecoveryFraction = 0.85;
            tinctureVolumeL = alcMl / 1000 * tinctureRecoveryFraction;
            tinctureEthanolL = alcMl / 1000 * tinctureRecoveryFraction * calc.tinctureAlcoholAbv;
        }

        // Initial beer ethanol: ABV after other fruits, before main fruit
        const hasInitialAbv = calc.initialAbv !== undefined;
        const initialEthanolL = hasInitialAbv ? input.batch_size_liters * (calc.initialAbv! / 100) : 0;

        // Volume added: depends on form (juice/concentrate/puree use product volume, others use water)
        const transferredVolumeL = transferredProductVolumeL(calc.midProductKg, calc.waterLiters, calc.form);

        const finalVolumeL = input.batch_size_liters + transferredVolumeL + tinctureVolumeL;
        const totalEthanolL = initialEthanolL + fruitEthanolL + tinctureEthanolL;
        const finalAbv = finalVolumeL > 0 ? (totalEthanolL / finalVolumeL) * 100 : 0;
        const abvDelta = hasInitialAbv ? finalAbv - calc.initialAbv! : undefined;

        lines.push('## 📈 Impatto sulla birra');
        lines.push('');
        lines.push('| Parametro | Valore |');
        lines.push('|---|---|');
        lines.push(`| Zuccheri aggiunti (frutto principale) | ~${sugarG.toFixed(0)} g`);
        lines.push(`| Potenziale alcolico (recupero zuccheri ~${(mainRecovery * 100).toFixed(0)}%) | ~+${(fruitEthanolL / finalVolumeL * 100).toFixed(1)}% ABV (solo frutto principale)`);
        if (tinctureVolumeL > 0) {
            lines.push(`| Alcool tintura | ${(tinctureVolumeL * 1000).toFixed(0)} mL al ${(calc.tinctureAlcoholAbv * 100).toFixed(0)}% → ~+${(tinctureEthanolL / finalVolumeL * 100).toFixed(1)}% ABV`);
        }
        if (hasInitialAbv) {
            lines.push(`| ABV dopo altri frutti (prima del frutto principale) | ${calc.initialAbv!.toFixed(1)}%`);
            lines.push(`| ABV finale stimato | **${finalAbv.toFixed(1)}%** (${abvDelta! >= 0 ? '+' : ''}${abvDelta!.toFixed(1)}%)`);
        }
        if (calc.waterLiters > 0.05) {
            lines.push(`| Volume aggiunto dal prodotto | ~${calc.waterLiters.toFixed(1)} L teorico → ~${transferredVolumeL.toFixed(1)} L stimato nella birra (recupero ~${(waterRecoveryFor(calc.form) * 100).toFixed(0)}%)`);
        } else {
            lines.push('| Acqua dal prodotto | Trascurabile');
        }
        lines.push(`| pH del frutto | ~${calc.fruit.ph}`);
        if (calc.fruit.ph < 3.2) lines.push('| ⚠️ pH | Molto acido. Misurare pH dopo aggiunta.');
        if (calc.fruit.ph > 4.5) lines.push("| ⚠️ pH | > 4.5. RISCHIO CONTAMINAZIONE. Pastorizzare sempre.");
        lines.push('');
        lines.push("> **Nota:** L'ABV finale è una stima. Il volume effettivo dipende dalle perdite di birra nella polpa e dal recupero degli zuccheri. L'acqua indicata è quella contenuta nel prodotto, non necessariamente quella trasferita nella birra confezionata.");
        lines.push('');
    }

    // ── Processing notes ──
    if (input.show_details) {
        lines.push('## 🔧 Note di processo');
        lines.push('');
        if (calc.fruit.ph > 4.5) lines.push("- ⚠️ Pastorizzare 70°C × 30 min prima dell'aggiunta.");
        if (['Lampone', 'Mora', 'Fragola'].includes(calc.fruit.name)) lines.push('- Rimuovere semi dopo 5-7gg (astringenza).');
        if (['Mela', 'Pera', 'Prugna', 'Ribes rosso', 'Ribes nero', 'Mirtillo'].includes(calc.fruit.name)) lines.push('- Aggiungere pectinasi 2-3 g/hL.');
        if (input.fruit_form === 'lyophilized') lines.push("- Reidratare in acqua tiepida. La liofilizzazione NON garantisce sterilità.");
        if (input.fruit_form === 'fresh') lines.push('- Surgelare/scongelare. Pastorizzare 70°C × 15 min o metabisolfito.');
        if (input.fruit_form === 'juice') lines.push('- Verificare Brix e zuccheri dichiarati del succo. La resa aromatica può differire dal fresco.');
        lines.push('- Usare hop bag per contenere la polpa.');
        lines.push('- Aspettare FG stabile dopo aggiunta prima di imbottigliare.');
        lines.push('');
    }

    // ── Full intensity table ──
    lines.push('## 📋 Tabella per tutte le intensità');
    lines.push('');
    lines.push(`| Intensità | g/L fresco eq. | ${formLabel} |`);
    lines.push('|---|---|---|');
    for (const int of INTENSITIES) {
        // Subtract other fruits contribution (same reference-scale logic as compute)
        let otherContrib = 0;
        for (const other of (calc.otherFruits ?? [])) {
            try {
                const { fruit: of } = resolveFruit(other.fruit_name, other.fruit_params);
                const om = METHODS[other.addition_method as AdditionMethod]!;
                const ogl = (other.fresh_equivalent_kg * 1000) / input.batch_size_liters;
                otherContrib += ogl * om.efficiency / of.factor / calc.styleFactor;
            } catch { /* skip unknown fruits in the table */ }
        }
        const remainingMinRef = Math.max(0, int.minGL - otherContrib);
        const remainingMaxRef = Math.max(0, int.maxGL - otherContrib);
        const remainingMidRef = (remainingMinRef + remainingMaxRef) / 2;
        const mid = remainingMidRef * calc.fruit.factor * calc.styleFactor / calc.methodEfficiency;
        const kg = toProductKg((mid * input.batch_size_liters) / 1000, calc.fruit, calc.form);
        lines.push(`| ${int.label} | ${mid.toFixed(0)} | **${kg.toFixed(2)} kg** |`);
    }
    lines.push('');
    lines.push('---');
    lines.push('*Le intensità e i fattori aromatici sono euristiche sensoriali. Parti dal valore consigliato e regola nelle cotte successive.*');

    return lines.join('\n');
}

// ── Tool ─────────────────────────────────────────────────────────────────────

const FRUIT_CALCULATOR_PARAMETERS: Record<string, unknown> = {
    type: 'object',
    properties: {
        fruit_name: { type: 'string', description: 'Nome del frutto principale in italiano. Es: "Lampone", "Mango", "Fragola", "Frutto della passione". Se il frutto non è nel database, cercalo online e passa i dati tramite fruit_params.' },
        fruit_params: {
            type: 'object',
            description: '⚠️ OBBLIGATORIO se il frutto non è nel database. Cerca online i valori nutrizionali (zuccheri, acqua, pH, °Brix) e stima il fattore aromatico, poi compila questo oggetto e riprova la chiamata.',
            properties: {
                name: { type: 'string', minLength: 1, description: 'Nome del frutto.' },
                factor: { type: 'number', exclusiveMinimum: 0, description: 'Fattore aromatico (es. 1.00 = fragola, 0.50 = ribes nero, 1.50 = anguria). Più basso = più aromatico. Stima in base all\'intensità aromatica del frutto rispetto alla fragola.' },
                sugarPercent: { type: 'number', minimum: 0, maximum: 100, description: 'g zuccheri per 100 g di frutto fresco. Cerca il valore nutrizionale online.' },
                waterPercent: { type: 'number', minimum: 0, maximum: 100, description: 'g acqua per 100 g di frutto fresco. Cerca il valore nutrizionale online.' },
                typicalBrix: { type: 'number', minimum: 0, maximum: 100, description: '°Brix approssimativo del frutto fresco (soluble solids). Tipicamente ~zuccheri% + 3-5 per altri solidi solubili.' },
                ph: { type: 'number', minimum: 0, maximum: 14, description: 'pH del frutto fresco. Cerca online.' },
                notes: { type: 'string', default: '' },
            },
            required: ['name', 'factor', 'sugarPercent', 'waterPercent', 'typicalBrix', 'ph'],
            additionalProperties: false,
        },
        batch_size_liters: { type: 'number', exclusiveMinimum: 0, description: "Volume attuale della birra dopo gli altri frutti e prima del frutto principale (L)." },
        intensity: { type: 'string', enum: ['accenno', 'leggero', 'medio', 'intenso', 'estremo'], default: 'leggero' },
        fruit_form: { type: 'string', enum: ['fresh', 'puree', 'juice', 'concentrate', 'lyophilized', 'dried'], default: 'fresh' },
        addition_method: { type: 'string', enum: ['secondary', 'whirlpool', 'end_boil', 'mash', 'tincture', 'keg'], default: 'secondary' },
        beer_style: { type: 'string', enum: ['sour', 'ipa', 'stout', 'wheat', 'blonde', 'saison', 'belgian', 'lager', 'neipa', 'other'], default: 'other' },
        initial_abv: { type: 'number', minimum: 0, maximum: 20, description: 'ABV della birra DOPO gli altri frutti, PRIMA del frutto principale (opzionale).' },
        tincture_alcohol_abv: { type: 'number', minimum: 0.4, maximum: 0.96, default: 0.95, description: 'Titolo alcool per tintura (es. 0.95 per 95°).' },
        tincture_ml_per_g: { type: 'number', exclusiveMinimum: 0, default: 1.3, description: 'mL alcool per g di substrato secco.' },
        other_fruits: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    fruit_name: { type: 'string', minLength: 1 },
                    fresh_equivalent_kg: { type: 'number', exclusiveMinimum: 0 },
                    addition_method: { type: 'string', enum: ['secondary', 'whirlpool', 'end_boil', 'mash', 'keg'], default: 'secondary' },
                    fruit_params: {
                        type: 'object',
                        description: '⚠️ Obbligatorio se il frutto non è nel database. Cerca online e compila.',
                        properties: {
                            name: { type: 'string', minLength: 1 },
                            factor: { type: 'number', exclusiveMinimum: 0 },
                            sugarPercent: { type: 'number', minimum: 0, maximum: 100 },
                            waterPercent: { type: 'number', minimum: 0, maximum: 100 },
                            typicalBrix: { type: 'number', minimum: 0, maximum: 100 },
                            ph: { type: 'number', minimum: 0, maximum: 14 },
                            notes: { type: 'string', default: '' },
                        },
                        required: ['name', 'factor', 'sugarPercent', 'waterPercent', 'typicalBrix', 'ph'],
                        additionalProperties: false,
                    },
                },
                required: ['fruit_name', 'fresh_equivalent_kg'],
                additionalProperties: false,
            },
            default: [],
        },
        show_details: { type: 'boolean', default: true },
    },
    required: ['fruit_name', 'batch_size_liters'],
    additionalProperties: false,
};

export class FruitCalculatorTool implements BuiltinTool<FruitCalculatorInput> {
    readonly name = 'fruit_calculator' as const;
    readonly description = [
        'Stima il dosaggio di frutta per fruit beers (intervallo, non quantità esatta). Conversione tra formati specifica per frutto. Supporta più frutti con potenza aromatica individuale, ABV iniziale per stima ABV finale, e tintura con parametri propri.',
        '',
        '⚠️ ISTRUZIONE IMPORTANTE: se il frutto richiesto dall\'utente NON è presente nel database interno (riceverai un errore "non trovato nel database"), DEVI cercare online i valori nutrizionali del frutto (zuccheri g/100g, acqua g/100g, pH) e stimare il fattore aromatico rispetto alla fragola (1.00), poi RIPROVARE la chiamata passando i dati trovati nel campo fruit_params. Non arrenderti al primo errore: cerca e riprova.',
    ].join('\n');
    readonly parameters = FRUIT_CALCULATOR_PARAMETERS;

    resolveExecution(rawArgs: FruitCalculatorInput): ToolExecution {
        const parsed = FruitCalculatorInputSchema.parse(rawArgs);
        const args = parsed as FruitCalculatorInput;
        return {
            description: `Fruit calc: ${args.fruit_name} @ ${args.intensity}`,
            approvalRule: this.name,
            execute: () => {
                try { return Promise.resolve({ output: formatResults(args) }); }
                catch (e) { return Promise.resolve({ isError: true, output: e instanceof Error ? e.message : String(e) }); }
            },
        };
    }
}

registerTool(FruitCalculatorTool);
