/**
 * Tincture calculator — plan alcoholic tinctures for brewing.
 *
 * Computes the solvent recipe (alcohol 95° + water → target ABV), the
 * ingredient-to-solvent ratio, extraction time, preparation and filtration
 * steps, a bench-trial dosing protocol, and an estimated batch dose with
 * alcohol contribution. Also flags safety concerns for risky botanicals.
 *
 * Covers: hops, woods, seed spices, bark/root spices, fresh herbs, dried
 * herbs/flowers, citrus peels, chili, coffee, cocoa, vanilla, and fruit.
 *
 * ⚠️ A tincture is NOT a replacement for dry hopping. It is a corrective,
 * experimental, or blending tool. The bench trial is MANDATORY — the tool
 * will not compute a batch dose without test-sample parameters.
 *
 * Important caveats: extraction kinetics vary enormously with cultivar, lot,
 * particle size, roast level, and storage age. The preset ratios are
 * starting points, not guarantees. Always bench-trial before dosing a batch.
 */

import { z } from 'zod';

import type { BuiltinTool, ToolExecution } from '../shim/tool-contract';
import { registerTool } from '../shim/tool-registry';
import { toInputJsonSchema } from '../shim/input-schema';

// ── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES = [
    'hop',
    'wood',
    'seed_spice',
    'bark_root',
    'fresh_herb',
    'dried_herb',
    'citrus_peel',
    'chili',
    'coffee',
    'cacao',
    'vanilla',
    'fruit',
    'other',
] as const;

type Category = (typeof CATEGORIES)[number];

// ── Ingredient states ────────────────────────────────────────────────────────

const INGREDIENT_STATES = [
    'fresh',
    'dried',
    'pellet',
    'whole',
    'ground',
    'crushed',
    'chips',
    'cubes',
] as const;

type IngredientState = (typeof INGREDIENT_STATES)[number];

// ── Category-state compatibility ─────────────────────────────────────────────

const ALLOWED_STATES: Record<Category, readonly IngredientState[]> = {
    hop: ['pellet', 'whole'],
    wood: ['chips', 'cubes'],
    seed_spice: ['whole', 'crushed', 'ground'],
    bark_root: ['whole', 'crushed', 'ground'],
    fresh_herb: ['fresh'],
    dried_herb: ['dried', 'crushed'],
    citrus_peel: ['fresh', 'dried'],
    chili: ['fresh', 'dried', 'crushed'],
    coffee: ['whole', 'ground'],
    cacao: ['whole', 'crushed'],
    vanilla: ['whole'],
    fruit: ['fresh', 'dried'],
    other: [...INGREDIENT_STATES],
} as const;

// ── Preset database ──────────────────────────────────────────────────────────

interface StatePreset {
    /** g ingredient per mL solvent. */
    ratio: number;
    /** Min extraction time in days. */
    minDays: number;
    /** Max extraction time in days. */
    maxDays: number;
    /** Extraction temp in °C. */
    tempC: number;
}

interface CategoryPreset {
    /** Default target ABV range [min, max]. */
    abvRange: [number, number];
    /** Default recommended target ABV. */
    abvRecommended: number;
    /** State-specific presets (falls back to 'default' key). */
    states: Record<string, StatePreset>;
    /** Human-readable time range description. */
    timeRange: string;
    /** Human-readable temp range description. */
    tempRange: string;
    /** Any special notes for the category. */
    notes: string;
    /** Whether the ingredient contains fermentable sugars. */
    hasFermentables: boolean;
    /** Human-readable category label in Italian. */
    label: string;
}

function resolveState(preset: CategoryPreset, state: IngredientState): StatePreset {
    if (preset.states[state]) return preset.states[state]!;
    return preset.states['default']!;
}

const CATEGORY_PRESETS: Record<string, CategoryPreset> = {
    hop: {
        abvRange: [45, 55], abvRecommended: 50,
        states: {
            pellet: { ratio: 1 / 10, minDays: 0.5, maxDays: 2, tempC: 10 },
            whole: { ratio: 1 / 12, minDays: 0.5, maxDays: 2, tempC: 10 },
            default: { ratio: 1 / 10, minDays: 0.5, maxDays: 2, tempC: 10 },
        },
        timeRange: '12–48 ore', tempRange: '4–15 °C',
        notes: 'Usare pellet o coni freschi. Minima esposizione all\'aria. Questo preset è un\'euristica sperimentale — NON sostituisce il dry hopping.',
        hasFermentables: false, label: 'Luppolo',
    },
    hop_cold_short: {
        abvRange: [60, 70], abvRecommended: 65,
        states: {
            pellet: { ratio: 1 / 10, minDays: 0.17, maxDays: 0.5, tempC: 4 },
            whole: { ratio: 1 / 12, minDays: 0.17, maxDays: 0.5, tempC: 4 },
            default: { ratio: 1 / 10, minDays: 0.17, maxDays: 0.5, tempC: 4 },
        },
        timeRange: '4–12 ore', tempRange: '0–8 °C',
        notes: 'Tecnica sperimentale a contatto breve, pensata per limitare l\'estrazione prolungata di materiale vegetale. Non garantisce minore estrazione di resine, polifenoli o sostanze amare.',
        hasFermentables: false, label: 'Luppolo (estrazione breve/fredda)',
    },
    wood: {
        abvRange: [45, 65], abvRecommended: 55,
        states: {
            chips: { ratio: 1 / 7, minDays: 3, maxDays: 14, tempC: 18 },
            cubes: { ratio: 1 / 5, minDays: 14, maxDays: 42, tempC: 18 },
            default: { ratio: 1 / 7, minDays: 3, maxDays: 14, tempC: 18 },
        },
        timeRange: '3–42 giorni (chips: 3–14, cubes: 14–42)', tempRange: '15–22 °C',
        notes: 'Solo legno certificato alimentare. Mai legno da falegnameria. 40-50%: più tannino/legnosità. 55-65%: più vanillina/oak lactones.',
        hasFermentables: false, label: 'Legno',
    },
    seed_spice: {
        abvRange: [45, 60], abvRecommended: 50,
        states: {
            crushed: { ratio: 1 / 10, minDays: 0.5, maxDays: 7, tempC: 18 },
            whole: { ratio: 1 / 8, minDays: 1, maxDays: 10, tempC: 18 },
            ground: { ratio: 1 / 15, minDays: 0.25, maxDays: 2, tempC: 18 },
            default: { ratio: 1 / 10, minDays: 0.5, maxDays: 7, tempC: 18 },
        },
        timeRange: '12 ore – 7 giorni', tempRange: '15–22 °C',
        notes: 'Schiacciare grossolanamente, NON polverizzare. L\'aumento estremo della superficie estrae note resinose/medicinali.',
        hasFermentables: false, label: 'Spezie-seme',
    },
    bark_root: {
        abvRange: [50, 70], abvRecommended: 60,
        states: {
            crushed: { ratio: 1 / 10, minDays: 3, maxDays: 21, tempC: 18 },
            whole: { ratio: 1 / 8, minDays: 5, maxDays: 30, tempC: 18 },
            default: { ratio: 1 / 10, minDays: 3, maxDays: 21, tempC: 18 },
        },
        timeRange: '3–21 giorni', tempRange: '15–22 °C',
        notes: 'Cannella di Ceylon preferita alla cassia (più delicata). Genziana: 2-5g, dosare a gocce. Liquirizia: aumenta dolcezza percepita.',
        hasFermentables: false, label: 'Corteccia/radice',
    },
    fresh_herb: {
        abvRange: [55, 70], abvRecommended: 65,
        states: {
            fresh: { ratio: 1 / 3, minDays: 0.17, maxDays: 2, tempC: 10 },
            default: { ratio: 1 / 3, minDays: 0.17, maxDays: 2, tempC: 10 },
        },
        timeRange: '4–48 ore', tempRange: '4–15 °C',
        notes: 'Le erbe fresche contengono molta acqua → gradazione effettiva inferiore. Rosmarino/salvia: controllare dopo 4–6 ore.',
        hasFermentables: false, label: 'Erbe fresche',
    },
    dried_herb: {
        abvRange: [35, 55], abvRecommended: 45,
        states: {
            dried: { ratio: 1 / 15, minDays: 0.25, maxDays: 7, tempC: 18 },
            crushed: { ratio: 1 / 20, minDays: 0.17, maxDays: 2, tempC: 18 },
            default: { ratio: 1 / 15, minDays: 0.25, maxDays: 7, tempC: 18 },
        },
        timeRange: '6 ore – 7 giorni (fiori delicati: 6–48 ore)', tempRange: '15–22 °C',
        notes: 'Lavanda: estremamente facile da sovradosare (può ricordare sapone). Ibisco: usare 25-40% ABV per colore e acidità.',
        hasFermentables: false, label: 'Erbe essiccate / fiori',
    },
    citrus_peel: {
        abvRange: [60, 75], abvRecommended: 70,
        states: {
            fresh: { ratio: 1 / 5, minDays: 0.5, maxDays: 7, tempC: 18 },
            dried: { ratio: 1 / 12, minDays: 0.5, maxDays: 7, tempC: 18 },
            default: { ratio: 1 / 6, minDays: 0.5, maxDays: 7, tempC: 18 },
        },
        timeRange: '12 ore – 7 giorni', tempRange: '15–22 °C',
        notes: 'Solo scorze NON trattate, senza cere. Ridurre al minimo l\'albedo (amaro, pectina). Preparare agrumi diversi separatamente.',
        hasFermentables: false, label: 'Scorze agrumi',
    },
    chili: {
        abvRange: [60, 75], abvRecommended: 70,
        states: {
            dried: { ratio: 1 / 20, minDays: 0.25, maxDays: 7, tempC: 18 },
            fresh: { ratio: 1 / 10, minDays: 0.25, maxDays: 7, tempC: 18 },
            default: { ratio: 1 / 20, minDays: 0.25, maxDays: 7, tempC: 18 },
        },
        timeRange: '6 ore – 7 giorni', tempRange: '15–22 °C',
        notes: 'Usare guanti. Capsaicina molto solubile in etanolo. NON assaggiare la tintura pura. Dose iniziale: 1 goccia in 100 mL.',
        hasFermentables: false, label: 'Peperoncino',
    },
    coffee: {
        abvRange: [20, 40], abvRecommended: 30,
        states: {
            ground: { ratio: 1 / 7, minDays: 0.5, maxDays: 2, tempC: 10 },
            whole: { ratio: 1 / 4, minDays: 1, maxDays: 3, tempC: 10 },
            default: { ratio: 1 / 7, minDays: 0.5, maxDays: 2, tempC: 10 },
        },
        timeRange: '12–48 ore', tempRange: '4–15 °C',
        notes: 'Macinatura GROSSOLANA (french press), mai fine (espresso). Il cold brew con sola acqua dà spesso risultati migliori, ma la tintura idroalcolica ha più stabilità.',
        hasFermentables: false, label: 'Caffè',
    },
    cacao: {
        abvRange: [45, 60], abvRecommended: 50,
        states: {
            whole: { ratio: 1 / 4, minDays: 5, maxDays: 21, tempC: 18 },
            crushed: { ratio: 1 / 4, minDays: 3, maxDays: 14, tempC: 18 },
            default: { ratio: 1 / 4, minDays: 5, maxDays: 21, tempC: 18 },
        },
        timeRange: '5–21 giorni', tempRange: '15–22 °C',
        notes: 'I nibs contengono grassi: la tintura può diventare torbida/oleosa. Filtrare, raffreddare 24-48h, rimuovere strato grasso, rifiltrare su carta.',
        hasFermentables: false, label: 'Cacao',
    },
    vanilla: {
        abvRange: [40, 60], abvRecommended: 50,
        states: {
            whole: { ratio: 0.04, minDays: 14, maxDays: 60, tempC: 18 },
            default: { ratio: 0.04, minDays: 14, maxDays: 60, tempC: 18 },
        },
        timeRange: '14–60 giorni', tempRange: '15–22 °C',
        notes: 'Aprire longitudinalmente, raschiare semi, inserire semi + baccello. Il rapporto è calcolato in grammi: ~3g di baccello ogni 75 mL (1:25 g/mL). Per 1 baccello intero (~2-4g), il solvente calcolato sarà circa 50-100 mL.',
        hasFermentables: false, label: 'Vaniglia',
    },
    fruit: {
        abvRange: [60, 75], abvRecommended: 70,
        states: {
            fresh: { ratio: 1 / 1.5, minDays: 3, maxDays: 14, tempC: 18 },
            dried: { ratio: 1 / 4, minDays: 3, maxDays: 14, tempC: 18 },
            default: { ratio: 1 / 1.5, minDays: 3, maxDays: 14, tempC: 18 },
        },
        timeRange: '3–14 giorni', tempRange: '15–22 °C',
        notes: 'La frutta contiene molta acqua e zuccheri fermentabili. Per molte birre è meglio purea asettica o succo. La tintura ha senso per scorze, frutti di bosco aromatici, ciliegie essiccate, bucce.',
        hasFermentables: true, label: 'Frutta',
    },
    other: {
        abvRange: [40, 60], abvRecommended: 50,
        states: { default: { ratio: 1 / 10, minDays: 3, maxDays: 14, tempC: 18 } },
        timeRange: '3–14 giorni', tempRange: '15–22 °C',
        notes: 'Categoria generica. Verificare sempre la sicurezza alimentare. Una concentrazione alcolica può estrarre composti pericolosi.',
        hasFermentables: false, label: 'Altro',
    },
};

// ── Safety matching (exact alias lookup) ─────────────────────────────────────

interface SafetyEntry {
    id: string;
    aliases: string[];
    warnings: string[];
}

const SAFETY_DB: SafetyEntry[] = [
    { id: 'calamo', aliases: ['calamo', 'calamus', 'calamo aromatico', 'acorus calamus', 'sweet flag'], warnings: ['🚫 Il calamo aromatico contiene β-asarone, potenzialmente cancerogeno. Vietato in UE e USA. NON USARE.'] },
    { id: 'genziana', aliases: ['genziana', 'gentian', 'gentiana', 'gentiana lutea'], warnings: ['⚠️ Estremamente amara. Usare massimo 2-5g. Dosare a gocce.'] },
    { id: 'salvia', aliases: ['salvia', 'sage', 'salvia officinalis'], warnings: ['⚠️ Può diventare canforata/medicinale rapidamente. Controllare dopo 4-6 ore.'] },
    { id: 'rosmarino', aliases: ['rosmarino', 'rosemary', 'rosmarinus officinalis'], warnings: ['⚠️ Può diventare canforato/medicinale rapidamente. Controllare dopo 4-6 ore.'] },
    { id: 'lavanda', aliases: ['lavanda', 'lavender', 'lavandula', 'lavandula angustifolia'], warnings: ['⚠️ Facile sovradosare (sapone/deodorante). Rapporto 1:15-1:25.'] },
    { id: 'peperoncino', aliases: ['peperoncino', 'chili', 'chilli', 'chile', 'habanero', 'jalapeño', 'jalapeno', 'cayenna', 'cayenne', 'calabrese'], warnings: ['⚠️ NON assaggiare la tintura pura. Usare guanti. Capsaicina molto solubile in etanolo.'] },
    { id: 'sambuco', aliases: ['sambuco', 'elderberry', 'sambucus', 'elder', 'sambuco nero'], warnings: ['🚫 NON usare bacche/semi crudi (cianuro). Solo fiori o bacche cotte.'] },
    { id: 'assenzio', aliases: ['assenzio', 'wormwood', 'artemisia absinthium', 'artemisia'], warnings: ['🚫 Contiene tujone, regolamentato. Verificare limiti legali prima dell\'uso.'] },
    { id: 'noce_moscata', aliases: ['noce moscata', 'nutmeg', 'myristica fragrans'], warnings: ['⚠️ Contiene miristicina. >5g può causare effetti tossici. Mantenere dosi molto basse.'] },
    { id: 'fava_tonka', aliases: ['fava tonka', 'tonka bean', 'tonka', 'dipteryx odorata'], warnings: ['🚫 Contiene cumarina. Vietata in USA come ingrediente alimentare. Limitata in UE.'] },
    { id: 'ginepro', aliases: ['ginepro', 'juniper', 'juniperus communis'], warnings: ['⚠️ Oli essenziali irritanti in grandi quantità. Schiacciare leggermente, non polverizzare.'] },
];

function normalizeForMatch(text: string): string {
    return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
}

function getSafetyWarnings(ingredient: string, category: Category): string[] {
    const query = normalizeForMatch(ingredient);
    const warnings: string[] = [];
    for (const entry of SAFETY_DB) {
        for (const alias of entry.aliases) {
            if (normalizeForMatch(alias) === query) {
                warnings.push(...entry.warnings);
                break;
            }
        }
    }
    if (category === 'wood') warnings.push('⚠️ Solo legno certificato alimentare. Mai legno da falegnameria.');
    if (category === 'citrus_peel') warnings.push('⚠️ Solo scorze non trattate, senza cere. Ridurre albedo al minimo.');
    return [...new Set(warnings)];
}

// ── Alcohol dilution ─────────────────────────────────────────────────────────

/**
 * Compute the volume of 95° alcohol and water needed to produce `targetVolumeMl`
 * of solvent at `targetAbvPercent`.
 *
 * V_source = (ABV_target / ABV_source) × V_target
 * Water then fills to target volume.
 *
 * Note: water–ethanol volumes are not perfectly additive; this is an
 * approximation. Best practice: pour alcohol first, add water, then top up
 * to final volume.
 */
function computeDilution(
    sourceAbvPercent: number,
    targetAbvPercent: number,
    targetVolumeMl: number,
): { alcoholMl: number; waterMl: number } {
    const alcoholMl = (targetAbvPercent / sourceAbvPercent) * targetVolumeMl;
    const waterMl = targetVolumeMl - alcoholMl;
    return {
        alcoholMl: Math.round(alcoholMl * 10) / 10,
        waterMl: Math.round(waterMl * 10) / 10,
    };
}

// ── Compute solvent volume from ratio ────────────────────────────────────────

function solventVolumeFromRatio(ingredientWeightG: number, ratio: number): number {
    // ratio is g ingredient per mL solvent, e.g. 1/10 = 0.1
    // solvent_ml = ingredient_g / ratio
    if (ratio <= 0) return 0;
    return Math.round(ingredientWeightG / ratio);
}

// ── Input schema ─────────────────────────────────────────────────────────────

const PlanInputSchema = z.object({
    mode: z.literal('plan').default('plan'),
    ingredient: z.string().trim().min(1).describe('Nome dell\'ingrediente (es. "Luppolo Citra", "Quercia francese", "Coriandolo").'),
    category: z.enum(CATEGORIES).describe('Categoria dell\'ingrediente. Determina i preset di estrazione.'),
    ingredient_weight_g: z.number().positive().describe('Peso dell\'ingrediente in grammi.'),
    ingredient_state: z.enum(INGREDIENT_STATES).describe('Stato fisico dell\'ingrediente.'),
    source_abv_percent: z.number().min(1).max(100).default(95).describe('Gradazione dell\'alcol di partenza (95° in Italia).'),
    target_abv_percent: z.number().min(1).max(100).optional().describe('Gradazione target della tintura. Se omesso, usa il preset della categoria.'),
    solvent_volume_ml: z.number().positive().optional().describe('Volume di solvente in mL. Se omesso, calcolato dal rapporto ingrediente/solvente.'),
    extraction_time_days: z.number().positive().optional().describe('Tempo di estrazione in giorni. Se omesso, usa il preset.'),
    extraction_temp_c: z.number().min(0).max(40).optional().describe('Temperatura di estrazione in °C. Se omesso, usa il preset.'),
    hop_variant: z.enum(['standard', 'cold_short']).optional().describe('Per luppolo: "standard" o "cold_short".'),
    ingredient_water_percent: z.number().min(0).max(100).optional().describe('Contenuto d\'acqua dell\'ingrediente (g/100g).'),
    ingredient_sugar_percent: z.number().min(0).max(100).optional().describe('Zuccheri nell\'ingrediente (g/100g).'),
    food_safe_confirmed: z.boolean().optional().describe('OBBLIGATORIO per categoria "other".'),
    custom_ratio: z.number().positive().optional().describe('Rapporto personalizzato g/mL. NON usare insieme a solvent_volume_ml.'),
    show_details: z.boolean().default(true).describe('Mostra la guida completa.'),
}).superRefine((input, ctx) => {
    if (input.target_abv_percent !== undefined && input.target_abv_percent > input.source_abv_percent) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_abv_percent'], message: `La gradazione target (${input.target_abv_percent}%) non può superare quella di partenza (${input.source_abv_percent}%).` });
    }
    if (input.category === 'other' && !input.food_safe_confirmed) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['food_safe_confirmed'], message: 'Categoria "other" richiede food_safe_confirmed: true.' });
    }
    if (!ALLOWED_STATES[input.category].includes(input.ingredient_state)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ingredient_state'], message: `Lo stato "${input.ingredient_state}" non è compatibile con "${input.category}". Stati validi: ${ALLOWED_STATES[input.category].join(', ')}.` });
    }
    if (input.custom_ratio !== undefined && input.solvent_volume_ml !== undefined) {
        const expectedMl = input.ingredient_weight_g / input.custom_ratio;
        const deviation = Math.abs(expectedMl - input.solvent_volume_ml) / expectedMl;
        if (deviation > 0.05) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['solvent_volume_ml'], message: `solvent_volume_ml (${input.solvent_volume_ml} mL) e custom_ratio incoerenti: il rapporto richiederebbe ~${Math.round(expectedMl)} mL.` });
        }
    }
});

const DoseInputSchema = z.object({
    mode: z.literal('dose'),
    ingredient: z.string().trim().min(1).describe('Nome dell\'ingrediente.'),
    category: z.enum(CATEGORIES).describe('Categoria.'),
    beer_volume_l: z.number().positive().describe('Volume EFFETTIVO della birra nel fermentatore/keg (L).'),
    test_sample_ml: z.number().positive().describe('Volume campione per bench trial (es. 100 mL).'),
    test_dose_ml: z.number().positive().describe('Dose scelta nel campione (mL).'),
    recovered_tincture_volume_ml: z.number().positive().optional().describe('Volume di tintura realmente recuperato dopo filtrazione (mL).'),
    tincture_abv_percent: z.number().min(0).max(100).optional().describe('ABV reale o stimata della tintura (se omesso, default 50%).'),
    ingredient_sugar_percent: z.number().min(0).max(100).optional().describe('Zuccheri nell\'ingrediente (g/100g). Per avviso fermentabili.'),
    show_details: z.boolean().default(true),
});

export const TinctureCalculatorInputSchema = z.discriminatedUnion('mode', [
    PlanInputSchema,
    DoseInputSchema,
]);

export type TinctureCalculatorInput = z.infer<typeof TinctureCalculatorInputSchema>;

// ── Output type ──────────────────────────────────────────────────────────────

export interface TincturePlan {
    mode: 'plan' | 'dose';
    ingredient: string;
    category: Category;
    categoryLabel: string;
    /** For plan: target ABV. For dose: explicit or default. */
    tinctureAbvPercent: number;
    alcohol95Ml: number;
    waterMl: number;
    solventVolumeMl: number;
    ingredientWeightG: number;
    ingredientToSolventRatio: string;
    extractionTime: string;
    extractionTempC: number;
    extractionMinHours: number;
    extractionMaxHours: number;
    preparation: string[];
    agitation: string;
    filtration: string[];
    benchTrial: {
        doseLowMlPer100ml: number;
        doseMidMlPer100ml: number;
        doseHighMlPer100ml: number;
        samples: { sample: string; doseMlPer100: number; doseMlActual: number }[];
        sampleMl: number;
    };
    estimatedBatchDoseMl: number | null;
    alcoholContributionAbv: number | null;
    hasFermentables: boolean;
    recoveredMl: number | null;
    recoveryFraction: number | null;
    recoveryIsMeasured: boolean;
    warnings: string[];
}

// ── Compute ──────────────────────────────────────────────────────────────────

function planTincture(input: z.infer<typeof PlanInputSchema>): TincturePlan {
    const presetKey = input.category === 'hop' && input.hop_variant === 'cold_short'
        ? 'hop_cold_short'
        : input.category;

    const preset = CATEGORY_PRESETS[presetKey] ?? CATEGORY_PRESETS['other'];
    if (!preset) throw new Error(`Categoria "${presetKey}" non trovata.`);

    const targetAbv = input.target_abv_percent ?? preset.abvRecommended;
    const statePreset = resolveState(preset, input.ingredient_state);
    const ratio = input.custom_ratio ?? statePreset.ratio;
    const solventMl = input.solvent_volume_ml ?? solventVolumeFromRatio(input.ingredient_weight_g, ratio);
    const { alcoholMl, waterMl } = computeDilution(input.source_abv_percent, targetAbv, solventMl);

    // Effective ABV
    let effectiveAbvPercent: number | null = null;
    if (input.ingredient_water_percent !== undefined && input.ingredient_water_percent > 0) {
        const waterMl2 = input.ingredient_weight_g * (input.ingredient_water_percent / 100);
        const tv = solventMl + waterMl2;
        effectiveAbvPercent = tv > 0 ? Math.round((alcoholMl * (input.source_abv_percent / 100) / tv) * 100 * 100) / 100 : null;
    }

    // Extraction time
    const extractionDays = input.extraction_time_days;
    const minHours = extractionDays ? extractionDays * 24 : statePreset.minDays * 24;
    const maxHours = extractionDays ? extractionDays * 24 : statePreset.maxDays * 24;
    const extractionTime = extractionDays
        ? (extractionDays < 1 ? `${Math.round(extractionDays * 24)} ore`
            : extractionDays < 14 ? `${extractionDays} giorni`
                : `${extractionDays} giorni (${Math.round(extractionDays / 7)} settimane)`)
        : preset.timeRange;

    const tempC = input.extraction_temp_c ?? statePreset.tempC;
    const actualRatio = input.ingredient_weight_g / solventMl;
    const ratioLabel = `1:${Math.round(1 / actualRatio)} (${input.ingredient_weight_g}g / ${solventMl}mL → ${(actualRatio * 100).toFixed(1)} g/100mL)`;

    // Preparation
    const preparation: string[] = [`Pesare ${input.ingredient_weight_g}g di ${input.ingredient} (${preset.label}).`];
    switch (input.ingredient_state) {
        case 'fresh': preparation.push('Lavare solo se necessario, asciugare perfettamente.', 'Eliminare parti danneggiate.'); break;
        case 'dried': preparation.push('NON polverizzare: schiacciare o spezzare solo quanto necessario.'); break;
        case 'pellet': preparation.push('Non macinare ulteriormente i pellet.'); break;
        case 'whole': preparation.push('Spezzare o schiacciare leggermente per aumentare la superficie.'); break;
        case 'ground': preparation.push('Usare macinatura grossolana. Evitare polveri fini.'); break;
        case 'crushed': preparation.push('Schiacciatura grossolana — sufficiente per superficie senza polveri.'); break;
        case 'chips': preparation.push('Non serve ulteriore preparazione.'); break;
        case 'cubes': preparation.push('Non serve ulteriore preparazione. I cubes estraggono più lentamente dei chips.'); break;
    }
    switch (input.category) {
        case 'vanilla': preparation.push('Aprire longitudinalmente, raschiare semi, inserire semi + baccello.'); break;
        case 'citrus_peel': preparation.push('Rimuovere l\'albedo bianco. Usare solo la scorza colorata.'); break;
        case 'chili': preparation.push('⚠️ Guanti. Rimuovere parte della placenta. Preparare varietà separate.'); break;
        case 'coffee': preparation.push('Macinatura GROSSOLANA (french press). Mai fine (espresso).'); break;
        case 'cacao': preparation.push('Se non tostati, tostare i nibs (150°C × 10 min).'); break;
        case 'fresh_herb': preparation.push('Non triturare finemente. Foglie intere o spezzate.'); break;
    }
    preparation.push(
        `Preparare solvente: ${alcoholMl} mL alcol ${input.source_abv_percent}° + ${waterMl} mL acqua → ${solventMl} mL al ${targetAbv}%.`,
        'Versare PRIMA l\'alcol, POI l\'acqua (volumi non additivi).',
        'Usare ESCLUSIVAMENTE alcol alimentare non denaturato e acqua demineralizzata.',
        'Inserire ingrediente e solvente in VETRO sanificato. Chiudere ermeticamente.',
        `Conservare al buio a ${tempC}°C circa.`,
    );

    const agitation = input.category === 'hop'
        ? 'Agitazione MINIMA (rischio ossidazione). Una volta al giorno, delicatamente.'
        : 'Agitare delicatamente una volta al giorno.';

    const filtration: string[] = [
        'Filtrare grossolanamente con colino fine a maglia inox.',
        'Lasciare sedimentare 12–48 ore in frigorifero.',
    ];
    if (input.category === 'cacao') filtration.push('Rimuovere strato grasso superficiale dopo raffreddamento.');
    filtration.push('Filtrare con carta (filtro da caffè) o membrana fine.');
    filtration.push('Conservare in bottiglia di vetro scuro, ben chiusa, al fresco e al buio.');

    // Bench trial
    let doseLow = 0.02, doseMid = 0.10, doseHigh = 0.30;
    switch (input.category) {
        case 'chili': doseLow = 0.005; doseMid = 0.02; doseHigh = 0.05; break;
        case 'hop': doseLow = 0.05; doseMid = 0.20; doseHigh = 0.40; break;
        case 'wood': doseLow = 0.10; doseMid = 0.50; doseHigh = 1.00; break;
        case 'vanilla': doseLow = 0.10; doseMid = 0.30; doseHigh = 0.50; break;
        case 'seed_spice': case 'bark_root': doseLow = 0.02; doseMid = 0.10; doseHigh = 0.30; break;
        case 'citrus_peel': doseLow = 0.02; doseMid = 0.15; doseHigh = 0.30; break;
        case 'coffee': doseLow = 0.05; doseMid = 0.15; doseHigh = 0.30; break;
        case 'cacao': doseLow = 0.10; doseMid = 0.50; doseHigh = 1.00; break;
        case 'fresh_herb': case 'dried_herb': doseLow = 0.05; doseMid = 0.20; doseHigh = 0.50; break;
        case 'fruit': doseLow = 0.10; doseMid = 0.50; doseHigh = 1.00; break;
        default: doseLow = 0.05; doseMid = 0.15; doseHigh = 0.40;
    }
    const sampleMl = 100;
    const scaleDose = (mlPer100: number) => Math.round(mlPer100 * sampleMl / 100 * 1000) / 1000;

    // Recovery
    const defaultRecFrac =
        input.category === 'hop' && input.ingredient_state === 'pellet' ? 0.55
        : input.category === 'coffee' && input.ingredient_state === 'ground' ? 0.50
        : input.category === 'cacao' ? 0.60
        : input.category === 'fresh_herb' ? 0.50
        : input.category === 'fruit' && input.ingredient_state === 'fresh' ? 0.55
        : 0.75;

    // Warnings
    const warnings = getSafetyWarnings(input.ingredient, input.category);
    if (input.target_abv_percent !== undefined && (targetAbv < preset.abvRange[0] || targetAbv > preset.abvRange[1])) {
        warnings.push(`⚠️ ABV target ${targetAbv}% fuori dal preset (${preset.abvRange[0]}–${preset.abvRange[1]}%).`);
    }
    if (extractionDays !== undefined && (extractionDays < statePreset.minDays || extractionDays > statePreset.maxDays)) {
        warnings.push(`⚠️ Tempo (${extractionDays}gg) fuori dal range ${input.category}/${input.ingredient_state} (${statePreset.minDays}–${statePreset.maxDays}gg).`);
    }
    if (input.extraction_temp_c !== undefined && input.extraction_temp_c !== statePreset.tempC) {
        warnings.push(`⚠️ Temperatura (${input.extraction_temp_c}°C) diversa dal preset (${statePreset.tempC}°C).`);
    }
    if (effectiveAbvPercent !== null && effectiveAbvPercent < 20) {
        warnings.push(`⚠️ ABV stimata tintura ~${effectiveAbvPercent}%. Sotto 20% rischio contaminazione.`);
    }
    if (input.ingredient_sugar_percent && input.ingredient_sugar_percent > 5) {
        warnings.push(`⚠️ ~${input.ingredient_sugar_percent}% zuccheri → possibile rifermentazione.`);
    }
    if (targetAbv > 80) warnings.push('⚠️ ABV > 80%: estrazione molto aggressiva.');
    if (input.category === 'hop') warnings.push('⚠️ Tintura luppolo NON sostituisce dry hopping.');
    if (extractionDays && extractionDays > 14 && ['seed_spice', 'fresh_herb', 'citrus_peel', 'chili'].includes(input.category)) {
        warnings.push('⚠️ Estrazione >14gg: rischio tannino, amaro, note medicinali.');
    }
    if (input.category === 'other' && !input.food_safe_confirmed) {
        warnings.push('🚫 Categoria "other" senza food_safe_confirmed.');
    }

    return {
        mode: 'plan',
        ingredient: input.ingredient,
        category: input.category,
        categoryLabel: preset.label,
        tinctureAbvPercent: effectiveAbvPercent ?? targetAbv,
        alcohol95Ml: alcoholMl, waterMl, solventVolumeMl: solventMl,
        ingredientWeightG: input.ingredient_weight_g,
        ingredientToSolventRatio: ratioLabel,
        extractionTime, extractionTempC: tempC,
        extractionMinHours: minHours, extractionMaxHours: maxHours,
        preparation, agitation, filtration,
        benchTrial: {
            doseLowMlPer100ml: doseLow, doseMidMlPer100ml: doseMid, doseHighMlPer100ml: doseHigh,
            samples: [
                { sample: 'A — Controllo', doseMlPer100: 0, doseMlActual: 0 },
                { sample: 'B — Minima', doseMlPer100: doseLow, doseMlActual: scaleDose(doseLow) },
                { sample: 'C — Bassa', doseMlPer100: doseMid, doseMlActual: scaleDose(doseMid) },
                { sample: 'D — Media', doseMlPer100: doseHigh, doseMlActual: scaleDose(doseHigh) },
                { sample: 'E — Alta', doseMlPer100: doseHigh * 2, doseMlActual: scaleDose(doseHigh * 2) },
            ],
            sampleMl,
        },
        estimatedBatchDoseMl: null, alcoholContributionAbv: null,
        hasFermentables: preset.hasFermentables || (input.ingredient_sugar_percent ?? 0) > 5,
        recoveredMl: Math.round(solventMl * defaultRecFrac),
        recoveryFraction: defaultRecFrac, recoveryIsMeasured: false,
        warnings,
    };
}

function doseTincture(input: z.infer<typeof DoseInputSchema>): TincturePlan {
    const preset = CATEGORY_PRESETS[input.category] ?? CATEGORY_PRESETS['other'];
    const tinctureAbv = input.tincture_abv_percent ?? 50;
    const sampleMl = input.test_sample_ml;
    const batchVolumeMl = input.beer_volume_l * 1000;
    const estimatedBatchDoseMl = Math.round((input.test_dose_ml * batchVolumeMl) / sampleMl * 100) / 100;
    const beerMl = input.beer_volume_l * 1000;
    const alcoholContributionAbv = Math.round(((estimatedBatchDoseMl * (tinctureAbv / 100)) / (beerMl + estimatedBatchDoseMl)) * 100 * 100) / 100;

    const recoveryIsMeasured = input.recovered_tincture_volume_ml !== undefined;
    const recoveredMl = input.recovered_tincture_volume_ml ?? null;
    // In dose mode we don't know the initial solvent volume, so recovery fraction is unavailable.
    const recoveryFraction = null;

    const warnings = getSafetyWarnings(input.ingredient, input.category);
    if (input.ingredient_sugar_percent && input.ingredient_sugar_percent > 5) {
        warnings.push(`⚠️ ~${input.ingredient_sugar_percent}% zuccheri → possibile rifermentazione.`);
    }
    if (input.category === 'hop') warnings.push('⚠️ Tintura luppolo NON sostituisce dry hopping.');
    if (alcoholContributionAbv > 0.5) {
        warnings.push(`⚠️ Contributo alcolico significativo: +${alcoholContributionAbv}% ABV.`);
    }

    // doseMlActual = actual dose in the sample, doseMlPer100 = scaled to 100 mL
    const doseMlActual = input.test_dose_ml;
    const doseMlPer100 = Math.round((input.test_dose_ml * 100 / sampleMl) * 1000) / 1000;

    return {
        mode: 'dose',
        ingredient: input.ingredient,
        category: input.category,
        categoryLabel: preset?.label ?? 'Sconosciuta',
        tinctureAbvPercent: tinctureAbv,
        alcohol95Ml: 0, waterMl: 0, solventVolumeMl: 0,
        ingredientWeightG: 0, ingredientToSolventRatio: 'N/D',
        extractionTime: 'N/D', extractionTempC: 0,
        extractionMinHours: 0, extractionMaxHours: 0,
        preparation: [], agitation: '', filtration: [],
        benchTrial: {
            doseLowMlPer100ml: 0, doseMidMlPer100ml: 0, doseHighMlPer100ml: 0,
            samples: [
                { sample: 'A — Controllo', doseMlPer100: 0, doseMlActual: 0 },
                { sample: 'B — Scelta', doseMlPer100, doseMlActual },
            ],
            sampleMl,
        },
        estimatedBatchDoseMl, alcoholContributionAbv,
        hasFermentables: (input.ingredient_sugar_percent ?? 0) > 5,
        recoveredMl, recoveryFraction, recoveryIsMeasured,
        warnings,
    };
}

function compute(input: TinctureCalculatorInput): TincturePlan {
    return input.mode === 'plan' ? planTincture(input) : doseTincture(input);
}

// ── Formatting ───────────────────────────────────────────────────────────────

function formatResults(input: TinctureCalculatorInput): string {
    const lines: string[] = [];
    const plan = compute(input);

    const stateLabel: Record<string, string> = {
        fresh: 'Fresco', dried: 'Essiccato', pellet: 'Pellet',
        whole: 'Intero', ground: 'Macinato', crushed: 'Schiacciato',
        chips: 'Chips', cubes: 'Cubetti',
    };

    if (plan.mode === 'dose') {
        lines.push(`# 🧪 Tintura Alcolica: ${plan.ingredient} — DOSE BATCH`);
        lines.push('');
    } else {
        lines.push(`# 🧪 Tintura Alcolica: ${plan.ingredient}`);
        lines.push('');
    }

    // ── Warnings first ──
    if (plan.warnings.length > 0) {
        lines.push('## ⚠️ Avvertenze');
        lines.push('');
        for (const w of plan.warnings) lines.push(`- ${w}`);
        lines.push('');
    }

    if (plan.mode === 'plan') {
        // ── Overview ──
        lines.push('## 📊 Parametri della tintura');
        lines.push('');
        lines.push('| Parametro | Valore |');
        lines.push('|---|---|');
        lines.push(`| Ingrediente | **${plan.ingredient}** |`);
        lines.push(`| Categoria | ${plan.categoryLabel} |`);
        const istate = (input as z.infer<typeof PlanInputSchema>).ingredient_state;
        lines.push(`| Stato | ${stateLabel[istate] ?? istate} |`);
        lines.push(`| Peso ingrediente | **${plan.ingredientWeightG} g** |`);
        lines.push(`| ABV target | **${plan.tinctureAbvPercent}%** |`);
        lines.push(`| Volume solvente | **${plan.solventVolumeMl} mL** |`);
        lines.push(`| Rapporto | ${plan.ingredientToSolventRatio} |`);
        lines.push(`| Tempo estrazione | ${plan.extractionTime} |`);
        lines.push(`| Temperatura | ${plan.extractionTempC} °C |`);
        lines.push('');

        // ── Solvent recipe ──
        const pin = input as z.infer<typeof PlanInputSchema>;
        lines.push('## 🧫 Ricetta del solvente');
        lines.push('');
        lines.push(`Per ottenere **${plan.solventVolumeMl} mL** al **${plan.tinctureAbvPercent}%** partendo da alcol a **${pin.source_abv_percent}°**:`);
        lines.push('');
        lines.push('| Componente | Quantità |');
        lines.push('|---|---|');
        lines.push(`| Alcol ${pin.source_abv_percent}° | **${plan.alcohol95Ml} mL** |`);
        lines.push(`| Acqua demineralizzata | **${plan.waterMl} mL** |`);
        lines.push(`| Volume finale | **${plan.solventVolumeMl} mL** |`);
        lines.push('');
        lines.push('> Versare PRIMA l\'alcol, POI l\'acqua, quindi portare a volume. I volumi acqua–etanolo non sono perfettamente additivi.');
        if (pin.ingredient_water_percent && pin.ingredient_water_percent > 0) {
            lines.push(`> ⚠️ ABV stimata della tintura dopo l'ingrediente: **~${plan.tinctureAbvPercent}%** (diluizione da acqua dell'ingrediente — stima semplificata, non sostituisce una misura alcolometrica).`);
        }
        lines.push('');

        // ── Preparation ──
        lines.push('## 🔧 Preparazione');
        lines.push('');
        for (let i = 0; i < plan.preparation.length; i++) lines.push(`${i + 1}. ${plan.preparation[i]!}`);
        lines.push('');

        // ── Agitation ──
        lines.push('## 🔄 Agitazione');
        lines.push('');
        lines.push(plan.agitation);
        lines.push('');

        // ── Filtration ──
        lines.push('## 🫗 Filtrazione');
        lines.push('');
        for (let i = 0; i < plan.filtration.length; i++) lines.push(`${i + 1}. ${plan.filtration[i]!}`);
        lines.push('');

        // ── Bench trial ──
        lines.push('## 🧪 Bench Trial (OBBLIGATORIO)');
        lines.push('');
        lines.push('Preparare 5 campioni da **100 mL** di birra finita:');
        lines.push('');
        lines.push('| Campione | Dose (mL/campione) |');
        lines.push('|---|---|');
        for (const s of plan.benchTrial.samples) {
            lines.push(`| ${s.sample} | ${s.doseMlActual > 0 ? s.doseMlActual.toFixed(3) : '0'} |`);
        }
        lines.push('');
        lines.push('Mescolare, attendere 10–30 minuti, assaggiare alla temperatura di servizio.');
        lines.push('- Per legno: attendere almeno 15–30 min nel campione prima di giudicare.');
        if (plan.category === 'chili') {
            lines.push('- Per peperoncino: iniziare da 1 goccia. Dosi <0.05 mL richiedono micropipetta o diluizione seriale (1:10).');
        }
        lines.push('');

        // Recovery info
        if (plan.recoveryIsMeasured) {
            lines.push(`*Volume recuperato misurato: **${plan.recoveredMl} mL** (${Math.round((plan.recoveryFraction ?? 0) * 100)}% del solvente).*`);
        } else {
            lines.push(`*Volume recuperato stimato: ~**${plan.recoveredMl} mL** (${Math.round((plan.recoveryFraction ?? 0) * 100)}% del solvente). Misurare il volume effettivo e usare mode:"dose" con recovered_tincture_volume_ml.*`);
        }
        lines.push('');

        // Category notes
        if ((input as z.infer<typeof PlanInputSchema>).show_details) {
            lines.push('## 📝 Note specifiche');
            lines.push('');
            const presetKey = plan.category === 'hop' && (input as z.infer<typeof PlanInputSchema>).hop_variant === 'cold_short' ? 'hop_cold_short' : plan.category;
            lines.push(CATEGORY_PRESETS[presetKey]?.notes ?? CATEGORY_PRESETS['other']!.notes);
            lines.push('');
        }
    }

    // ── Dose section (both modes) ──
    if (plan.estimatedBatchDoseMl !== null && plan.alcoholContributionAbv !== null) {
        lines.push('## 📐 Dose per il batch');
        lines.push('');
        const doseIn = input as z.infer<typeof DoseInputSchema>;
        lines.push(`Dose campione: **${doseIn.test_dose_ml} mL** in **${doseIn.test_sample_ml} mL** →`);
        lines.push('');
        lines.push('| Parametro | Valore |');
        lines.push('|---|---|');
        lines.push(`| Volume birra (effettivo) | **${doseIn.beer_volume_l} L** |`);
        lines.push(`| ABV tintura | **${plan.tinctureAbvPercent}%** |`);
        lines.push(`| Dose batch calcolata | **${plan.estimatedBatchDoseMl} mL** |`);
        lines.push(`| Dose consigliata (75%) | **${Math.round(plan.estimatedBatchDoseMl * 0.75 * 100) / 100} mL** |`);
        lines.push(`| Contributo ABV | **+${plan.alcoholContributionAbv}%** |`);
        lines.push('');

        if (plan.alcoholContributionAbv > 0.5) {
            lines.push(`> ⚠️ Contributo alcolico significativo (+${plan.alcoholContributionAbv}% ABV).`);
        }
        if (plan.hasFermentables) {
            lines.push('> ⚠️ Zuccheri fermentabili. Aggiungere solo a birra stabilizzata o in keg freddo.');
        }

        lines.push('');
        lines.push('**Procedura:**');
        lines.push(`1. Aggiungere il 75% (~${Math.round(plan.estimatedBatchDoseMl * 0.75 * 100) / 100} mL).`);
        lines.push('2. Miscelare delicatamente. In keg: closed transfer. In bottiglia: al bottling bucket con priming.');
        lines.push('3. Assaggiare dopo 12–24 ore.');
        lines.push('4. Correggere con la parte restante SOLO SE necessaria.');
        lines.push('');
    }

    // ── Safety checklist ──
    lines.push('## 🛡️ Checklist di sicurezza');
    lines.push('');
    lines.push('- [ ] Alcol alimentare NON denaturato');
    lines.push('- [ ] Acqua demineralizzata, osmotizzata o bollita e raffreddata');
    lines.push('- [ ] Contenitore in VETRO sanificato');
    lines.push('- [ ] Tappo resistente all\'alcol');
    lines.push('- [ ] Conservazione al BUIO');
    lines.push('- [ ] Ingrediente certificato per uso alimentare');
    lines.push('- [ ] NESSUNA fiamma, fornello o piastra vicino all\'alcol concentrato');
    lines.push('- [ ] Bench trial completato PRIMA di dosare il batch');
    lines.push('');

    return lines.join('\n');
}

// ── Tool ─────────────────────────────────────────────────────────────────────

export class TinctureCalculatorTool implements BuiltinTool<TinctureCalculatorInput> {
    readonly name = 'tincture_calculator' as const;
    readonly description = [
        'Pianifica una tintura alcolica per birra: calcola la ricetta del solvente (alcol 95° + acqua → ABV target), proporzioni, tempo e temperatura di estrazione, procedura di preparazione e filtrazione, protocollo di bench trial, dose per il batch e contributo alcolico.',
        '',
        '⚠️ REGOLE FONDAMENTALI:',
        '- Il bench trial è OBBLIGATORIO prima di dosare il batch. Fornisci sempre test_sample_ml e test_dose_ml.',
        '- Una tintura di luppolo NON sostituisce il dry hopping: è uno strumento correttivo/sperimentale.',
        '- Usare SOLO alcol alimentare non denaturato, acqua demineralizzata, contenitori in vetro.',
        '- Mai riscaldare alcol 95° direttamente: estremamente infiammabile.',
        '- Legno: solo certificato alimentare, mai da falegnameria.',
        '- Il tool applica automaticamente avvertenze di sicurezza per ingredienti a rischio.',
        '',
        'Categorie supportate: hop, wood, seed_spice, bark_root, fresh_herb, dried_herb, citrus_peel, chili, coffee, cacao, vanilla, fruit, other.',
    ].join('\n');
    readonly parameters: Record<string, unknown> = toInputJsonSchema(TinctureCalculatorInputSchema);

    resolveExecution(rawArgs: TinctureCalculatorInput): ToolExecution {
        const parsed = TinctureCalculatorInputSchema.parse(rawArgs);
        const args = parsed as TinctureCalculatorInput;
        const abvDesc = args.mode === 'plan' ? (args.target_abv_percent ?? 'auto') : (args.tincture_abv_percent ?? 'auto');
        return {
            description: `Tintura: ${args.ingredient} (${args.category}) @ ${abvDesc}%`,
            approvalRule: this.name,
            execute: () => {
                try { return Promise.resolve({ output: formatResults(args) }); }
                catch (e) { return Promise.resolve({ isError: true, output: e instanceof Error ? e.message : String(e) }); }
            },
        };
    }
}

registerTool(TinctureCalculatorTool);
