/**
 * Botanical adjunct calculator — estimate dosage for spices, cocoa, coffee,
 * tea, herbs, peels, and woods in brewing.
 *
 * Separates aromatic dose (volatile terpenes/phenols) from chemesthetic dose
 * (pungency, heat, cooling, astringency) because they behave differently.
 * Accounts for physical form, addition stage, contact time, temperature,
 * beer matrix (ABV, FG, IBU, roast, acidity), adjunct-adjunct interactions,
 * freshness, and category-specific parameters (roast level for coffee,
 * SHU for chili, etc.). Returns an interval with confidence level, risk flags,
 * and an incremental-adjustment protocol — never a single precise number.
 *
 * Key caveats: essential-oil content varies enormously with origin, cultivar,
 * harvest year, and storage. The database values are starting points; actual
 * potency depends on your specific lot. Bench trials and incremental dosing
 * are always recommended when precision matters.
 */

import { z } from 'zod';

import type { BuiltinTool, ToolExecution } from '../shim/tool-contract';
import { registerTool } from '../shim/tool-registry';

type DoseUnit = 'g' | 'ml';

type DeliveryMode = 'solid_extraction' | 'direct_liquid_dose';

type WoodToastLevel = 'untoasted' | 'light' | 'medium' | 'heavy';

// ── Sensory profile ──────────────────────────────────────────────────────────

interface SpiceSensoryProfile {
    /** Volatile aroma intensity (0-1 scale). */
    aroma: number;
    /** Trigeminal heat / pungency / burning (0-1). */
    pungency: number;
    /** Bitterness (0-1). */
    bitterness: number;
    /** Mouth-drying / puckering astringency (0-1). */
    astringency: number;
    /** Cooling sensation (menthol, eucalyptol etc.) (0-1). */
    cooling: number;
}

// ── Spice database ───────────────────────────────────────────────────────────

interface SpiceDosageRange {
    /** Quantity per 20L, for the reference form and method. Unit in grams or mL. */
    min: number;
    max: number;
    recommend: number;
}

interface ExtractionCalibration {
    /** Multiplier for volatile rate constant k (default 1.0). */
    volatileRateMultiplier: number;
    /** Multiplier for non-volatile rate constant k (default 1.0). */
    nonVolatileRateMultiplier: number;
}

interface ReferenceConditions {
    /** Addition stage under which the empirical dosage ranges were measured. */
    stage: AdditionStage;
    /** Contact time in hours for the reference dosage. */
    contactTimeHours: number;
    /** Temperature in °C during reference contact. */
    temperatureCelsius: number;
}

interface WoodToastProfile {
    /** Multiplier for perceived aroma relative to reference toast. */
    aroma: number;
    /** Multiplier for perceived astringency relative to reference toast. */
    astringency: number;
}

const WOOD_TOAST: Record<WoodToastLevel, WoodToastProfile> = {
    untoasted: { aroma: 0.85, astringency: 1.25 },
    light: { aroma: 1.05, astringency: 1.05 },
    medium: { aroma: 1.10, astringency: 0.95 },
    heavy: { aroma: 0.95, astringency: 0.90 },
};

interface SpiceInfo {
    id: string;
    name: string;
    aliases: string[];
    /** Category: spice, peel, cocoa, coffee, tea, herb, wood */
    category: 'spice' | 'peel' | 'cocoa' | 'coffee' | 'tea' | 'herb' | 'wood';
    /** Default reference form for dosage ranges. */
    referenceForm: SpiceForm;
    /** Unit for dosage ranges: g (most) or ml (cold brew). */
    doseUnit: DoseUnit;
    /** How the ingredient enters the beer: solid extraction (default) or pre-made liquid. */
    deliveryMode?: DeliveryMode;
    /** Empirical conditions under which the database dosage ranges were calibrated.
     *  Defaults to conditioning, 72 h, 20 °C when omitted. */
    referenceConditions?: ReferenceConditions;
    /** Sensory vector. */
    profile: SpiceSensoryProfile;
    /** Empirical dosage range per intensity level (per 20L, reference form). */
    low: SpiceDosageRange;
    medium: SpiceDosageRange;
    high: SpiceDosageRange;
    /** Per-ingredient extraction rate calibration. */
    extraction: ExtractionCalibration;
    /** Key volatile compounds (for interaction matching). */
    keyVolatiles: string[];
    /** Key non-volatile active compounds. */
    keyActives: string[];
    /** Perception curve profile. */
    perceptionProfile: 'immediate' | 'building' | 'persistent';
    /** Rough essential-oil range (% of dry weight) — for freshness modeling. */
    oilRangePercent?: [number, number];
    /** Lipid/fat range (% of dry weight) — for cocoa/coffee. */
    fatRangePercent?: [number, number];
    /** Known risks and pitfalls. */
    risks: string[];
    /** Special handling notes. */
    notes: string;
}

type SpiceForm =
    | 'whole'
    | 'cracked'
    | 'ground'
    | 'fresh'
    | 'dried';

type AdditionStage =
    | 'mash'
    | 'boil'
    | 'whirlpool'
    | 'fermentation'
    | 'conditioning'
    | 'keg'
    | 'tincture';

type IntensityLevel = 'low' | 'medium' | 'high';

// ── Form extraction properties ───────────────────────────────────────────────

interface FormProperties {
    label: string;
    /** Multiplier for volatile extraction speed (higher = faster). */
    volatileExtractSpeed: number;
    /** Multiplier for non-volatile extraction speed. */
    nonVolatileExtractSpeed: number;
    /** Volatile loss multiplier during heat (higher = more loss). */
    volatileHeatLoss: number;
    /** How consistently this form doses across batches. */
    repeatability: 'low' | 'medium' | 'good' | 'very_good';
    /** Overdose risk. */
    overdoseRisk: 'low' | 'medium' | 'high';
    /** Can the spice be removed after steeping? */
    removable: boolean;
}

const FORMS: Record<SpiceForm, FormProperties> = {
    whole: { label: 'Intero', volatileExtractSpeed: 0.30, nonVolatileExtractSpeed: 0.25, volatileHeatLoss: 0.30, repeatability: 'low', overdoseRisk: 'low', removable: true },
    cracked: { label: 'Spezzato / schiacciato', volatileExtractSpeed: 0.65, nonVolatileExtractSpeed: 0.55, volatileHeatLoss: 0.50, repeatability: 'medium', overdoseRisk: 'low', removable: true },
    ground: { label: 'Macinato / polvere', volatileExtractSpeed: 1.0, nonVolatileExtractSpeed: 1.0, volatileHeatLoss: 0.80, repeatability: 'good', overdoseRisk: 'high', removable: false },
    fresh: { label: 'Fresco', volatileExtractSpeed: 0.80, nonVolatileExtractSpeed: 0.70, volatileHeatLoss: 0.60, repeatability: 'low', overdoseRisk: 'medium', removable: true },
    dried: { label: 'Essiccato', volatileExtractSpeed: 0.55, nonVolatileExtractSpeed: 0.50, volatileHeatLoss: 0.45, repeatability: 'medium', overdoseRisk: 'low', removable: true },
};

// ── Stage extraction properties ──────────────────────────────────────────────

interface StageProperties {
    label: string;
    /** Volatile extraction multiplier. */
    volatileExtract: number;
    /** Non-volatile extraction multiplier. */
    nonVolatileExtract: number;
    /** Volatile evaporation / degradation multiplier. */
    volatileEvaporation: number;
    /** Can the spice be removed post-extraction? */
    removable: boolean;
    /** Description for output. */
    tip: string;
}

const STAGES: Record<AdditionStage, StageProperties> = {
    mash: { label: 'Mash', volatileExtract: 0.40, nonVolatileExtract: 0.60, volatileEvaporation: 0.15, removable: true, tip: 'I volatili delicati sopravvivono poco al mash; meglio per spezie resinose o amare.' },
    boil: { label: 'Bollitura', volatileExtract: 0.90, nonVolatileExtract: 0.95, volatileEvaporation: 0.85, removable: false, tip: 'Massima estrazione ma forte perdita di volatili leggeri. Aggiungere a fine bollitura per preservare aromi.' },
    whirlpool: { label: 'Whirlpool (80-95°C)', volatileExtract: 0.75, nonVolatileExtract: 0.70, volatileEvaporation: 0.50, removable: true, tip: 'Buon compromesso: estrazione senza evaporazione estrema. 15-30 min tipicamente.' },
    fermentation: { label: 'Fermentazione', volatileExtract: 0.60, nonVolatileExtract: 0.50, volatileEvaporation: 0.40, removable: false, tip: 'Alcuni volatili vengono trascinati dalla CO₂. Aggiungere dopo la fase più attiva.' },
    conditioning: { label: 'Maturazione / dry-spice', volatileExtract: 0.55, nonVolatileExtract: 0.45, volatileEvaporation: 0.10, removable: true, tip: 'Metodo più controllabile. Assaggiare ogni 12-24 ore. Rimuovere quando soddisfatti.' },
    keg: { label: 'Fusto / serving tank', volatileExtract: 0.50, nonVolatileExtract: 0.40, volatileEvaporation: 0.05, removable: true, tip: 'Temperatura bassa = estrazione lenta. Usare sacchetto in acciaio per rimozione facile.' },
    tincture: { label: 'Tintura alcolica separata', volatileExtract: 0.95, nonVolatileExtract: 0.90, volatileEvaporation: 0.0, removable: false, tip: 'Massimo controllo. Aggiungere goccia a goccia su campione, poi scalare.' },
};

// ── Beer matrix effects ──────────────────────────────────────────────────────

interface BeerMatrixInput {
    abv: number;
    finalGravity?: number;
    ibu?: number;
    roastIntensity: number;       // 0-1
    hopAromaIntensity: number;    // 0-1
    acidity: number;              // 0-1 (0 = not sour, 1 = very sour)
}

/**
 * Compute per-dimension matrix factors, separated by mechanism:
 * - extractionFactor: how the beer medium affects physical extraction
 * - perceptionAmplification: how the beer amplifies perceived intensity
 * - maskingFactor: how the beer masks or suppresses perception
 */
function computeMatrixFactors(m: BeerMatrixInput) {
    const abv = m.abv;
    const fg = m.finalGravity ?? 1.008;

    // ABV: increases solubility of apolar compounds → higher extraction
    const abvExtraction = 1 + Math.max(0, (abv - 4.5) * 0.06);
    // ABV also amplifies warm/pungent sensation
    const abvPerceptionWarm = 1 + Math.max(0, (abv - 5) * 0.08);

    // FG: masks delicate aromas. Baseline FG 1.008 produces no masking;
    // every point above that reduces perceived aroma.
    const fgAbove = Math.max(0, (fg - 1.008) * 1000);
    const fgMaskAroma = clamp(1 - fgAbove * 0.006, 0.50, 1.05);

    // IBU: additive bitterness risk
    const ibuRisk = Math.min(1, (m.ibu ?? 0) / 80);

    // Roast: masks delicate aromas, complements warm/resinous spices
    const roastMask = clamp(1 - m.roastIntensity * 0.4, 0.40, 1.0);
    const roastBoostWarm = 1 + m.roastIntensity * 0.3;

    // Hop aroma: terpene overlap risk (informational, not dose-changing)
    const hopOverlapRisk = m.hopAromaIntensity * 0.5;

    // Acidity: amplifies perceived brightness and heat/astringency
    const acidAmplifyBright = 1 + m.acidity * 0.25;
    const acidAmplifyHeat = 1 + m.acidity * 0.30;
    const acidAmplifyAstringency = 1 + m.acidity * 0.20;

    return {
        // Extraction: how the beer pulls compounds from the spice
        extractionFactor: abvExtraction,
        // Perception amplification per dimension
        perceptionAmplification: {
            aroma: acidAmplifyBright,
            pungency: abvPerceptionWarm * acidAmplifyHeat * roastBoostWarm,
            bitterness: abvExtraction * (1 + ibuRisk * 0.3),
            astringency: abvExtraction * acidAmplifyAstringency * (1 + ibuRisk * 0.15),
            cooling: acidAmplifyBright,
        },
        // Masking per dimension: <1 means the beer masks this dimension
        maskingFactor: {
            aroma: fgMaskAroma * roastMask,
            pungency: 1.0,   // pungency is rarely masked
            bitterness: 1.0,
            astringency: 1.0,
            cooling: 1.0,
        },
        hopOverlapRisk,
        roastMask,
    };
}

// ── Freshness / potency adjustment ───────────────────────────────────────────

/**
 * Potency factor: >1 = more potent than reference, <1 = less potent.
 * A more potent spice needs LESS grams → dose is DIVIDED by potencyFactor.
 */
function potencyMultiplier(freshness: Freshness): number {
    switch (freshness) {
        case 'freshly_cracked': return 1.15;  // more potent → lower dose
        case 'recent': return 1.0;
        case 'older': return 0.75;            // less potent → higher dose
        case 'unknown': return 1.0;           // neutral, confidence drops
    }
}

type Freshness = 'freshly_cracked' | 'recent' | 'older' | 'unknown';

// ── Spice database ───────────────────────────────────────────────────────────

const SPICES: SpiceInfo[] = [
    {
        id: 'coriander_seed', name: 'Coriandolo (seme)', aliases: ['coriandolo', 'coriander', 'coriander seed'], category: 'spice',
        referenceForm: 'cracked',
        profile: { aroma: 0.80, pungency: 0.10, bitterness: 0.25, astringency: 0.20, cooling: 0.0 },
        low: { min: 4, max: 8, recommend: 6 },
        medium: { min: 8, max: 16, recommend: 12 },
        high: { min: 16, max: 30, recommend: 22 },
        keyVolatiles: ['linalool', 'α-pinene', 'γ-terpinene', 'camphor'],
        keyActives: ['linalool', 'geranyl acetate'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [0.18, 1.40],
        risks: ['Profilo saponoso/detergente se sovradosato con agrumi', 'Variabilità enorme tra lotti (olio 0.18-1.40%)'],
        notes: 'Schiacciare sempre prima dell\'uso. Le varietà indiane sono più agrumate, quelle europee più floreali.',
    },
    {
        id: 'black_pepper', name: 'Pepe nero', aliases: ['pepe nero', 'pepe', 'black pepper'], category: 'spice',
        referenceForm: 'cracked',
        profile: { aroma: 0.65, pungency: 0.55, bitterness: 0.30, astringency: 0.40, cooling: 0.0 },
        low: { min: 1, max: 3, recommend: 2 },
        medium: { min: 3, max: 6, recommend: 4.5 },
        high: { min: 6, max: 10, recommend: 8 },
        keyVolatiles: ['β-caryophyllene', 'limonene', 'α-pinene', 'β-pinene', 'δ-3-carene'],
        keyActives: ['piperine'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [1.0, 3.5],
        risks: ['Piperina 2-9%: due pepi uguali in g/L possono essere molto diversi', 'Sovrapposizione terpenica con luppoli resinosi/agrumati', 'Nota legnosa oltre 7 giorni di contatto'],
        notes: 'Spezzare fresco prima dell\'uso. Tellicherry e Sarawak hanno profili molto diversi. Per dry-spice, rimuovere entro 5-7 giorni.',
    },
    {
        id: 'sichuan_pepper', name: 'Pepe di Sichuan', aliases: ['sichuan', 'sichuan pepper', 'pepe di sichuan', 'sancho'], category: 'spice',
        referenceForm: 'cracked',
        profile: { aroma: 0.60, pungency: 0.50, bitterness: 0.15, astringency: 0.55, cooling: 0.45 },
        low: { min: 1, max: 3, recommend: 2 },
        medium: { min: 3, max: 6, recommend: 4.5 },
        high: { min: 6, max: 10, recommend: 8 },
        keyVolatiles: ['geraniol', 'limonene', 'citronellal', 'linalool'],
        keyActives: ['hydroxy-α-sanshool', 'hydroxy-β-sanshool'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [1.5, 4.0],
        risks: ['Effetto anestetizzante/tingling cumulativo con altre spezie pungenti', 'Sapore metallico se sovradosato'],
        notes: 'Aggiunge un effetto "buzz" unico. Si sposa bene con agrumi e coriandolo. Rimuovere dopo 3-5 giorni.',
    },
    {
        id: 'cinnamon', name: 'Cannella', aliases: ['cannella', 'cinnamon'], category: 'spice',
        referenceForm: 'whole',
        profile: { aroma: 0.75, pungency: 0.30, bitterness: 0.35, astringency: 0.40, cooling: 0.0 },
        low: { min: 2, max: 5, recommend: 3.5 },
        medium: { min: 5, max: 10, recommend: 7.5 },
        high: { min: 10, max: 18, recommend: 14 },
        keyVolatiles: ['cinnamaldehyde', 'eugenol', 'linalool'],
        keyActives: ['cinnamaldehyde', 'coumarin'],
        risks: ['La cannella Cassia contiene cumarina (tossicità epatica ad alte dosi). Preferire Ceylon per dosaggi alti.', 'Astringenza fastidiosa oltre 10 g/20L in stecca', 'Può dominare tutto oltre i 15 g/20L'],
        notes: 'Usare stecche intere in infusione, rimuovere dopo 3-5 giorni. La polvere è difficile da rimuovere e torbida.',
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
    },
    {
        id: 'clove', name: 'Chiodo di garofano', aliases: ['chiodi di garofano', 'chiodo', 'clove', 'cloves'], category: 'spice',
        referenceForm: 'whole',
        profile: { aroma: 0.95, pungency: 0.40, bitterness: 0.50, astringency: 0.70, cooling: 0.05 },
        low: { min: 0.2, max: 0.6, recommend: 0.4 },
        medium: { min: 0.6, max: 1.2, recommend: 0.9 },
        high: { min: 1.2, max: 2.0, recommend: 1.5 },
        keyVolatiles: ['eugenol', 'β-caryophyllene', 'eugenyl acetate'],
        keyActives: ['eugenol'],
        perceptionProfile: 'persistent',
        doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [14, 20],
        risks: ['CURVA RIPIDA: la distanza tra riconoscibile e dominante è minuscola', 'Può anestetizzare il palato mascherando altre spezie', 'Eugenolo dominante: copre aromi delicati'],
        notes: 'Dosare con estrema cautela. Per 20L, iniziare con 2-3 chiodi, assaggiare dopo 24 ore.',
    },
    {
        id: 'star_anise', name: 'Anice stellato', aliases: ['anice stellato', 'star anise', 'badiana'], category: 'spice',
        referenceForm: 'whole',
        profile: { aroma: 0.85, pungency: 0.10, bitterness: 0.30, astringency: 0.45, cooling: 0.0 },
        low: { min: 0.5, max: 1.5, recommend: 1 },
        medium: { min: 1.5, max: 4, recommend: 2.5 },
        high: { min: 4, max: 8, recommend: 6 },
        keyVolatiles: ['anethole', 'estragole', 'limonene', 'linalool'],
        keyActives: ['anethole'],
        perceptionProfile: 'building',
        doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [5, 9],
        risks: ['CURVA RIPIDA come il chiodo di garofano', 'L\'anetolo è molto persistente e può coprire tutto', 'Sapore medicinale se sovradosato'],
        notes: '1-2 stelle per 20L come punto di partenza. Aggiungere in infusione rimovibile.',
    },
    {
        id: 'ginger', name: 'Zenzero', aliases: ['zenzero', 'ginger'], category: 'spice',
        referenceForm: 'fresh',
        profile: { aroma: 0.55, pungency: 0.60, bitterness: 0.20, astringency: 0.25, cooling: 0.0 },
        low: { min: 10, max: 25, recommend: 18 },
        medium: { min: 25, max: 60, recommend: 40 },
        high: { min: 60, max: 120, recommend: 90 },
        keyVolatiles: ['zingiberene', 'β-sesquiphellandrene', 'α-curcumene', 'citral'],
        keyActives: ['gingerol', 'shogaol', 'zingerone'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [0.5, 3.0],
        risks: ['Pungenza cumulativa con pepe/peperoncino', 'Il fresco e il secco hanno profili molto diversi (gingerol vs shogaol)', 'Nota terrosa oltre 10 giorni di contatto'],
        notes: 'Fresco: sbucciare e affettare sottile. Secco in polvere: ~1/4 del peso fresco. Per dry-spice, rimuovere entro 5-7 giorni.',
    },
    {
        id: 'chili', name: 'Peperoncino', aliases: ['peperoncino', 'chili', 'chili pepper', 'chile'], category: 'spice',
        referenceForm: 'dried',
        profile: { aroma: 0.35, pungency: 0.95, bitterness: 0.25, astringency: 0.30, cooling: 0.0 },
        low: { min: 0, max: 0, recommend: 0 },
        medium: { min: 0, max: 0, recommend: 0 },
        high: { min: 0, max: 0, recommend: 0 },
        keyVolatiles: ['variable by cultivar'],
        keyActives: ['capsaicin', 'dihydrocapsaicin'],
        perceptionProfile: 'building',
        doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [0.1, 1.0],
        risks: ['IMPOSSIBILE DOSARE SENZA SHU O VARIETÀ. Restituisce intervallo ampio e incerto.', 'Pungenza cumulativa con zenzero e pepe nero', 'La capsaicina è liposolubile: birra più alcolica = estrazione più efficiente'],
        notes: 'SENZA SHU o varietà il calcolo è puramente indicativo. Fornire capsaicinoids_mg_per_g o SHU per stima utile. Ancho/pasilla = poco piccante, habanero = estremamente piccante.',
    },
    {
        id: 'cardamom', name: 'Cardamomo verde', aliases: ['cardamomo', 'cardamom', 'cardamomo verde'], category: 'spice',
        referenceForm: 'cracked',
        profile: { aroma: 0.70, pungency: 0.15, bitterness: 0.20, astringency: 0.25, cooling: 0.10 },
        low: { min: 1, max: 3, recommend: 2 },
        medium: { min: 3, max: 7, recommend: 5 },
        high: { min: 7, max: 12, recommend: 9 },
        keyVolatiles: ['1,8-cineole', 'α-terpinyl acetate', 'limonene', 'linalool'],
        keyActives: ['1,8-cineole'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [2.5, 8.0],
        risks: ['Può diventare medicinale/farmaceutico a dosi alte', 'L\'1,8-cineolo è dominante e può stancare'],
        notes: 'Schiacciare i baccelli, usare solo i semi. Aggiungere a whirlpool o in infusione post-fermento.',
    },
    {
        id: 'nutmeg', name: 'Noce moscata', aliases: ['noce moscata', 'nutmeg'], category: 'spice',
        referenceForm: 'cracked',
        profile: { aroma: 0.60, pungency: 0.35, bitterness: 0.35, astringency: 0.40, cooling: 0.0 },
        low: { min: 0.5, max: 2, recommend: 1 },
        medium: { min: 2, max: 5, recommend: 3.5 },
        high: { min: 5, max: 10, recommend: 7 },
        keyVolatiles: ['myristicin', 'sabinene', 'α-pinene', 'β-pinene', 'terpinen-4-ol'],
        keyActives: ['myristicin', 'elemicin'],
        perceptionProfile: 'building',
        doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [5, 15],
        risks: ['La miristicina ha effetti psicotropi a dosi molto alte (>>10g)', 'Grattugiare fresco: la polvere pre-macinata perde aroma in giorni'],
        notes: 'Grattugiare al momento. Microplane o grattugia fine. In infusione, rimuovere dopo 3-5 giorni.',
    },
    {
        id: 'mace', name: 'Macis', aliases: ['macis', 'mace'], category: 'spice',
        referenceForm: 'dried',
        profile: { aroma: 0.55, pungency: 0.25, bitterness: 0.30, astringency: 0.30, cooling: 0.0 },
        low: { min: 0.5, max: 1.5, recommend: 1 },
        medium: { min: 1.5, max: 4, recommend: 2.5 },
        high: { min: 4, max: 8, recommend: 6 },
        keyVolatiles: ['myristicin', 'α-pinene', 'sabinene', 'terpinen-4-ol'],
        keyActives: ['myristicin'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [4, 12],
        risks: ['Più delicato della noce moscata ma simile profilo di rischio', 'Può dare note legnose persistenti'],
        notes: 'Aroma più fine e floreale della noce moscata. Si sposa bene con birre chiare e speziate.',
    },
    {
        id: 'vanilla', name: 'Vaniglia', aliases: ['vaniglia', 'vanilla'], category: 'spice',
        referenceForm: 'whole',
        profile: { aroma: 0.65, pungency: 0.0, bitterness: 0.10, astringency: 0.05, cooling: 0.0 },
        low: { min: 0.5, max: 1.5, recommend: 1 },
        medium: { min: 1.5, max: 4, recommend: 2.5 },
        high: { min: 4, max: 8, recommend: 6 },
        keyVolatiles: ['vanillin', '4-hydroxybenzaldehyde'],
        keyActives: ['vanillin'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [1.5, 3.5],
        risks: ['L\'estratto artificiale ha profilo piatto vs bacca intera', 'Aroma mascherato da malti tostati e luppoli intensi'],
        notes: 'Bacca intera: incidere longitudinalmente, infusione 7-14 giorni. Estratto: usare poche gocce, assaggiare. Tintura fatta in casa: 2 bacche in 50 mL alcool per 2 settimane.',
    },
    {
        id: 'fennel_seed', name: 'Finocchio (seme)', aliases: ['finocchio', 'fennel', 'fennel seed'], category: 'spice',
        referenceForm: 'cracked',
        profile: { aroma: 0.70, pungency: 0.05, bitterness: 0.15, astringency: 0.20, cooling: 0.0 },
        low: { min: 2, max: 5, recommend: 3.5 },
        medium: { min: 5, max: 12, recommend: 8 },
        high: { min: 12, max: 20, recommend: 16 },
        keyVolatiles: ['anethole', 'estragole', 'fenchone', 'α-pinene'],
        keyActives: ['anethole'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [1.5, 6.0],
        risks: ['L\'anetolo è dominante e persistente', 'Sapore medicinale se sovradosato'],
        notes: 'Schiacciare leggermente. Si sposa bene con coriandolo in Witbier e Saison.',
    },
    {
        id: 'grains_of_paradise', name: 'Grani del paradiso / Maniguetta', aliases: ['grani del paradiso', 'maniguetta', 'grains of paradise', 'melegueta'], category: 'spice',
        referenceForm: 'cracked',
        profile: { aroma: 0.55, pungency: 0.50, bitterness: 0.30, astringency: 0.35, cooling: 0.0 },
        low: { min: 1, max: 3, recommend: 2 },
        medium: { min: 3, max: 7, recommend: 5 },
        high: { min: 7, max: 12, recommend: 9 },
        keyVolatiles: ['β-caryophyllene', 'limonene', 'α-pinene', 'α-humulene'],
        keyActives: ['paradol', 'gingerol', 'shogaol'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [0.5, 2.0],
        risks: ['Pungenza cumulativa', 'Può dominare birre delicate'],
        notes: 'Sapore tra pepe e zenzero con note agrumate. Ottimo in Saison e Belgian ale.',
    },
    {
        id: 'allspice', name: 'Pimento / Pepe della Giamaica', aliases: ['pimento', 'pepe della giamaica', 'allspice', 'pimenta'], category: 'spice',
        referenceForm: 'cracked',
        profile: { aroma: 0.70, pungency: 0.30, bitterness: 0.25, astringency: 0.35, cooling: 0.0 },
        low: { min: 1, max: 3, recommend: 2 },
        medium: { min: 3, max: 7, recommend: 5 },
        high: { min: 7, max: 12, recommend: 9 },
        keyVolatiles: ['eugenol', 'β-caryophyllene', 'methyl eugenol', 'cineole'],
        keyActives: ['eugenol'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [2.5, 4.5],
        risks: ['Ricorda cannella + chiodo + noce moscata: può creare ridondanza con queste spezie'],
        notes: 'Aroma complesso "tuttospezie". Ottimo in birre natalizie e stout speziate.',
    },
    {
        id: 'orange_peel', name: 'Scorza d\'arancia', aliases: ['scorza arancia', 'orange peel', 'bucce arancia', 'scorza d\'arancia'], category: 'peel',
        referenceForm: 'dried',
        profile: { aroma: 0.70, pungency: 0.0, bitterness: 0.35, astringency: 0.20, cooling: 0.0 },
        low: { min: 3, max: 8, recommend: 5 },
        medium: { min: 8, max: 20, recommend: 14 },
        high: { min: 20, max: 40, recommend: 30 },
        keyVolatiles: ['limonene', 'citral', 'linalool', 'α-pinene'],
        keyActives: ['limonene'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [0.5, 3.0],
        risks: ['Profilo saponoso/detergente se sovradosata con coriandolo', 'L\'amaro della scorza può sommarsi agli IBU'],
        notes: 'Solo scorza, no albedo (parte bianca = amaro sgradevole). Se fresca, ~2x il peso del secco. Curacao = più aromatica, Valencia = più dolce.',
    },
    {
        id: 'lemon_peel', name: 'Scorza di limone', aliases: ['scorza limone', 'lemon peel', 'bucce limone'], category: 'peel',
        referenceForm: 'dried',
        profile: { aroma: 0.70, pungency: 0.0, bitterness: 0.20, astringency: 0.15, cooling: 0.0 },
        low: { min: 3, max: 8, recommend: 5 },
        medium: { min: 8, max: 20, recommend: 14 },
        high: { min: 20, max: 40, recommend: 30 },
        keyVolatiles: ['limonene', 'citral', 'β-pinene', 'γ-terpinene'],
        keyActives: ['limonene', 'citral'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [0.5, 2.5],
        risks: ['Aroma meno persistente dell\'arancia in birra', 'Simile rischio saponoso con coriandolo'],
        notes: 'Solo scorza, no albedo. Eccellente in Witbier con coriandolo. Fresca ~2x il secco.',
    },
    {
        id: 'long_pepper', name: 'Pepe lungo', aliases: ['pepe lungo', 'long pepper', 'pippali'], category: 'spice',
        referenceForm: 'cracked',
        profile: { aroma: 0.50, pungency: 0.70, bitterness: 0.30, astringency: 0.45, cooling: 0.0 },
        low: { min: 0.5, max: 2, recommend: 1 },
        medium: { min: 2, max: 5, recommend: 3.5 },
        high: { min: 5, max: 10, recommend: 7 },
        keyVolatiles: ['β-caryophyllene', 'limonene', 'sabinene', 'α-pinene'],
        keyActives: ['piperine', 'piperlongumine'],
        perceptionProfile: 'building',
        doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [1.0, 3.0],
        risks: ['Più potente del pepe nero: CURVA RIPIDA', 'Pungenza che si accumula lentamente ma intensamente'],
        notes: 'Usare con cautela. Più complesso e persistente del pepe nero. Ottimo in stout e porter.',
    },
    {
        id: 'tonka_bean', name: 'Fava tonka', aliases: ['fava tonka', 'tonka', 'tonka bean'], category: 'spice',
        referenceForm: 'cracked',
        profile: { aroma: 0.60, pungency: 0.0, bitterness: 0.20, astringency: 0.25, cooling: 0.0 },
        low: { min: 0.3, max: 1, recommend: 0.5 },
        medium: { min: 1, max: 2, recommend: 1.5 },
        high: { min: 2, max: 4, recommend: 3 },
        keyVolatiles: ['coumarin', 'dihydrocoumarin'],
        keyActives: ['coumarin'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [1.0, 3.0],
        risks: ['Contiene cumarina (epatotossica ad alte dosi). Non superare 4 g/20L.', 'Aroma molto persistente. 1 fava per 20L può bastare.'],
        notes: 'Microplane o grattugia fine. Aroma tra vaniglia, mandorla e fieno. Attenzione: la cumarina è regolamentata in alcuni paesi.',
    },
    {
        id: 'juniper', name: 'Ginepro (bacche)', aliases: ['ginepro', 'juniper', 'bacche di ginepro'], category: 'spice',
        referenceForm: 'cracked',
        profile: { aroma: 0.60, pungency: 0.25, bitterness: 0.30, astringency: 0.35, cooling: 0.0 },
        low: { min: 2, max: 6, recommend: 4 },
        medium: { min: 6, max: 15, recommend: 10 },
        high: { min: 15, max: 30, recommend: 22 },
        keyVolatiles: ['α-pinene', 'myrcene', 'limonene', 'terpinen-4-ol'],
        keyActives: ['α-pinene', 'myrcene'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [0.5, 2.5],
        risks: ['Può dominare birre delicate con note resinose/piney', 'Rischio di sovrapposizione con luppoli resinosi/terrosi'],
        notes: 'Schiacciare leggermente. Ottimo in Saison, Farmhouse e birre affumicate.',
    },

    // ── Cocoa ──
    {
        id: 'cocoa_nibs', name: 'Cacao in granella (nibs)', aliases: ['cacao', 'cocoa nibs', 'granella di cacao', 'nibs di cacao'], category: 'cocoa',
        referenceForm: 'cracked',
        referenceConditions: { stage: 'conditioning', contactTimeHours: 120, temperatureCelsius: 20 },
        profile: { aroma: 0.55, pungency: 0.0, bitterness: 0.50, astringency: 0.55, cooling: 0.0 },
        low: { min: 20, max: 50, recommend: 35 },
        medium: { min: 50, max: 120, recommend: 80 },
        high: { min: 120, max: 250, recommend: 180 },
        keyVolatiles: ['pyrazines', 'aldehydes', 'methylbutanal', 'phenylacetaldehyde'],
        keyActives: ['theobromine', 'caffeine', 'cocoa polyphenols'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 0.65, nonVolatileRateMultiplier: 0.75 },
        fatRangePercent: [48, 55],
        risks: ['Alto contenuto di grassi (48-55%): può ridurre ritenzione schiuma', 'Theobromina e caffeina: amaro persistente', 'Astringenza elevata con contatto prolungato oltre 7gg'],
        notes: 'Aroma cioccolato/toast/nocciola. Per stout/porter: 50-120 g/20L. Tostare leggermente prima dell\'uso per amplificare l\'aroma. Rimuovere dopo 5-7gg.',
    },
    {
        id: 'cocoa_powder', name: 'Cacao in polvere (naturale)', aliases: ['cacao in polvere', 'cocoa powder', 'polvere di cacao'], category: 'cocoa',
        referenceForm: 'ground',
        referenceConditions: { stage: 'conditioning', contactTimeHours: 72, temperatureCelsius: 20 },
        profile: { aroma: 0.45, pungency: 0.0, bitterness: 0.65, astringency: 0.70, cooling: 0.0 },
        low: { min: 10, max: 30, recommend: 20 },
        medium: { min: 30, max: 80, recommend: 50 },
        high: { min: 80, max: 180, recommend: 120 },
        keyVolatiles: ['pyrazines', 'aldehydes'],
        keyActives: ['theobromine', 'caffeine', 'cocoa polyphenols'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.20, nonVolatileRateMultiplier: 1.40 },
        fatRangePercent: [10, 22],
        risks: ['Più amaro e astringente dei nibs', 'Torbidità elevata', 'Attenzione: il cacao alcalinizzato ha profilo diverso (meno acido, più scuro)'],
        notes: 'Polvere sgrassata (10-12% grassi). Sciogliere in acqua calda prima di aggiungere. Per stout/porter: 30-80 g/20L. Cacao alcalinizzato (olandese): colore più scuro, sapore più morbido.',
    },
    {
        id: 'cocoa_husk', name: 'Bucce di cacao', aliases: ['bucce cacao', 'cocoa husk', 'cacao husk'], category: 'cocoa',
        referenceForm: 'dried',
        referenceConditions: { stage: 'conditioning', contactTimeHours: 96, temperatureCelsius: 20 },
        profile: { aroma: 0.50, pungency: 0.0, bitterness: 0.30, astringency: 0.40, cooling: 0.0 },
        low: { min: 30, max: 80, recommend: 50 },
        medium: { min: 80, max: 200, recommend: 140 },
        high: { min: 200, max: 400, recommend: 300 },
        keyVolatiles: ['pyrazines', 'vanillin'],
        keyActives: ['theobromine', 'tannins'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        fatRangePercent: [1, 4],
        risks: ['Più delicate dei nibs: aroma meno intenso', 'Tannini: astringenza se contatto prolungato'],
        notes: 'Aroma più floreale e meno amaro dei nibs. Ottime in saison e birre chiare. Rimuovere dopo 3-5gg.',
    },

    // ── Coffee ──
    {
        id: 'coffee_beans', name: 'Caffè in grani (interi)', aliases: ['caffè', 'coffee', 'caffè in grani', 'coffee beans', 'chicchi caffè'], category: 'coffee',
        referenceForm: 'whole',
        referenceConditions: { stage: 'conditioning', contactTimeHours: 36, temperatureCelsius: 20 },
        profile: { aroma: 0.60, pungency: 0.0, bitterness: 0.45, astringency: 0.40, cooling: 0.0 },
        low: { min: 15, max: 40, recommend: 25 },
        medium: { min: 40, max: 100, recommend: 70 },
        high: { min: 100, max: 200, recommend: 150 },
        keyVolatiles: ['furfuryl mercaptan', 'pyrazines', 'guaiacol', '2-methylbutanal'],
        keyActives: ['caffeine', 'chlorogenic acids', 'trigonelline'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 0.45, nonVolatileRateMultiplier: 0.35 },
        fatRangePercent: [12, 18],
        risks: ['I grani interi estraggono lentamente: 24-48h minime', 'Tostatura scura = più amaro e meno acido', 'Caffeina: amaro persistente ad alte dosi'],
        notes: 'Grani interi: estrazione lenta, aroma delicato. Per dry-bean: 40-100 g/20L, 24-48h. Usare roast_level per aggiustare il profilo. Light roast = più acido/fruttato, dark = più tostato/amaro.',
    },
    {
        id: 'coffee_ground', name: 'Caffè macinato (grosso)', aliases: ['caffè macinato', 'coarse ground coffee', 'caffè macinato grosso'], category: 'coffee',
        referenceForm: 'cracked',
        referenceConditions: { stage: 'conditioning', contactTimeHours: 18, temperatureCelsius: 20 },
        profile: { aroma: 0.70, pungency: 0.0, bitterness: 0.60, astringency: 0.55, cooling: 0.0 },
        low: { min: 15, max: 40, recommend: 25 },
        medium: { min: 40, max: 100, recommend: 65 },
        high: { min: 100, max: 180, recommend: 130 },
        keyVolatiles: ['furfuryl mercaptan', 'pyrazines', 'guaiacol', '2-methylbutanal'],
        keyActives: ['caffeine', 'chlorogenic acids'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.35, nonVolatileRateMultiplier: 1.50 },
        fatRangePercent: [12, 18],
        risks: ['Macinatura fine = sovra-estrazione rapida e torbidità', 'La macinatura da french press/cold brew è ideale', 'Contatto >24h a temperatura ambiente può estrarre tannini sgradevoli'],
        notes: 'Macinatura grossa (french press). Aggiungere in sacchetto, rimuovere dopo 12-24h. Per coffee stout: 70-180 g/20L. Light roast = acidità e frutta, dark roast = tostato e cioccolato amaro.',
    },
    {
        id: 'cold_brew_coffee', name: 'Cold brew coffee (concentrato)', aliases: ['cold brew', 'cold brew coffee', 'caffè cold brew'], category: 'coffee',
        referenceForm: 'fresh',
        doseUnit: 'ml',
        deliveryMode: 'direct_liquid_dose',
        profile: { aroma: 0.65, pungency: 0.0, bitterness: 0.30, astringency: 0.25, cooling: 0.0 },
        low: { min: 100, max: 250, recommend: 180 },
        medium: { min: 250, max: 600, recommend: 400 },
        high: { min: 600, max: 1200, recommend: 900 },
        keyVolatiles: ['pyrazines', 'furfuryl derivatives'],
        keyActives: ['caffeine', 'chlorogenic acids'],
        perceptionProfile: 'immediate', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Attenzione: il dosaggio è in mL, non in grammi', 'Aggiunge liquido: considerare la diluizione', 'Concentrazione non standard: specificare il rapporto caffè/acqua usato'],
        notes: 'Dosaggio espresso in mL di concentrato, non in grammi di caffè. Preparare con rapporto 1:5 caffè/acqua, 18-24h a 4°C. Esempio: 200g caffè in 1L acqua fredda per 24h.',
    },

    // ── Tea & Herbs ──
    {
        id: 'earl_grey_tea', name: 'Tè Earl Grey', aliases: ['earl grey', 'earl grey tea'], category: 'tea',
        referenceForm: 'dried',
        referenceConditions: { stage: 'conditioning', contactTimeHours: 36, temperatureCelsius: 4 },
        profile: { aroma: 0.55, pungency: 0.0, bitterness: 0.35, astringency: 0.40, cooling: 0.0 },
        low: { min: 10, max: 25, recommend: 18 },
        medium: { min: 25, max: 60, recommend: 40 },
        high: { min: 60, max: 120, recommend: 90 },
        keyVolatiles: ['bergamot oil', 'linalool', 'limonene', 'linalyl acetate'],
        keyActives: ['caffeine', 'tannins'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [0.5, 1.5],
        risks: ['Bergamotto dominante a dosi alte', 'Tannini: astringenza con infusione a caldo o contatto prolungato'],
        notes: 'Aggiungere a freddo (dry-tea) per 24-48h per minimizzare tannini. Per infusione a caldo: 10-15 min a 80°C. Ottimo in saison, witbier e pale ale.',
    },
    {
        id: 'green_tea', name: 'Tè verde', aliases: ['tè verde', 'green tea'], category: 'tea',
        referenceForm: 'dried',
        referenceConditions: { stage: 'conditioning', contactTimeHours: 24, temperatureCelsius: 4 },
        profile: { aroma: 0.35, pungency: 0.0, bitterness: 0.35, astringency: 0.35, cooling: 0.0 },
        low: { min: 10, max: 30, recommend: 20 },
        medium: { min: 30, max: 80, recommend: 50 },
        high: { min: 80, max: 160, recommend: 120 },
        keyVolatiles: ['hexanal', 'linalool', 'geraniol'],
        keyActives: ['caffeine', 'catechins', 'EGCG'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.30, nonVolatileRateMultiplier: 1.60 },
        oilRangePercent: [0.3, 1.0],
        risks: ['Molto sensibile alla temperatura: >80°C produce amaro eccessivo', 'Catechine: astringenza marcata con infusione prolungata'],
        notes: 'Dry-tea a freddo (24h) o infusione a 70°C per 10 min max. Ottimo in IPA e lager per note erbacee e fresche.',
    },
    {
        id: 'chamomile', name: 'Camomilla', aliases: ['camomilla', 'chamomile'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'conditioning', contactTimeHours: 36, temperatureCelsius: 4 },
        profile: { aroma: 0.40, pungency: 0.0, bitterness: 0.15, astringency: 0.20, cooling: 0.0 },
        low: { min: 5, max: 15, recommend: 10 },
        medium: { min: 15, max: 40, recommend: 25 },
        high: { min: 40, max: 80, recommend: 60 },
        keyVolatiles: ['α-bisabolol', 'chamazulene', 'bisabolol oxides'],
        keyActives: ['apigenin', 'bisabolol'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [0.3, 1.5],
        risks: ['Aroma delicato: facilmente mascherato da luppoli e malti tostati'],
        notes: 'Floreale, miele, mela. Ottima in witbier, saison e blonde ale. Infusione a freddo 24-48h o a caldo 10 min a 80°C.',
    },
    {
        id: 'hibiscus', name: 'Ibisco / Karkadè', aliases: ['ibisco', 'karkadè', 'hibiscus', 'hibiscus tea'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'conditioning', contactTimeHours: 24, temperatureCelsius: 20 },
        profile: { aroma: 0.35, pungency: 0.0, bitterness: 0.25, astringency: 0.35, cooling: 0.0 },
        low: { min: 10, max: 30, recommend: 20 },
        medium: { min: 30, max: 80, recommend: 50 },
        high: { min: 80, max: 150, recommend: 110 },
        keyVolatiles: ['geraniol', 'linalool', 'hexanal'],
        keyActives: ['anthocyanins', 'hibiscus acid', 'citric acid', 'malic acid'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [0.2, 0.8],
        risks: ['Colore rosso intenso: può dominare visivamente', 'Acidità percepita: può sembrare più acida di quanto sia'],
        notes: 'Colore rosso brillante, sapore acidulo-fruttato. Ottimo in sour, gose e berliner weisse. Infusione a freddo per colore più brillante.',
    },

    // ── Nuts & Seeds ──
    {
        id: 'coconut', name: 'Cocco', aliases: ['cocco', 'coconut', 'cocco essiccato', 'coconut flakes', 'cocco grattugiato', 'cocco rapè'], category: 'spice',
        referenceForm: 'dried',
        referenceConditions: { stage: 'conditioning', contactTimeHours: 120, temperatureCelsius: 20 },
        profile: { aroma: 0.60, pungency: 0.0, bitterness: 0.05, astringency: 0.15, cooling: 0.0 },
        low: { min: 50, max: 120, recommend: 80 },
        medium: { min: 120, max: 300, recommend: 200 },
        high: { min: 300, max: 600, recommend: 450 },
        keyVolatiles: ['δ-decalactone', 'δ-octalactone', 'methyl ketones'],
        keyActives: ['fatty acids', 'medium-chain triglycerides'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 0.80, nonVolatileRateMultiplier: 0.50 },
        fatRangePercent: [60, 70],
        risks: ['Altissimo contenuto di grassi (60-70%): impatto significativo sulla ritenzione schiuma', 'Irrancidimento possibile se conservato a lungo: usare solo cocco fresco', 'Il cocco tostato ha profilo più intenso e meno grasso del crudo'],
        notes: 'Cocco essiccato in scaglie o grattugiato. Tostare leggermente in forno a 150°C per 10-15 min per intensificare l\'aroma. A contatto prolungato oltre 10gg può rilasciare note untuose. Ottimo in stout, porter e birre tropicali.',
    },

    // ── Woods ──
    {
        id: 'oak_chips', name: 'Chips di rovere', aliases: ['rovere', 'oak chips', 'chips rovere'], category: 'wood',
        referenceForm: 'dried',
        referenceConditions: { stage: 'conditioning', contactTimeHours: 240, temperatureCelsius: 20 },
        profile: { aroma: 0.45, pungency: 0.0, bitterness: 0.25, astringency: 0.45, cooling: 0.0 },
        low: { min: 5, max: 15, recommend: 10 },
        medium: { min: 15, max: 40, recommend: 25 },
        high: { min: 40, max: 80, recommend: 55 },
        keyVolatiles: ['vanillin', 'whisky lactone', 'eugenol', 'furfural'],
        keyActives: ['tannins', 'lignins'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 0.25, nonVolatileRateMultiplier: 0.30 },
        risks: ['Tostatura influenza il profilo: light = più vaniglia/cocco, dark = più tostato/affumicato', 'Tannini: astringenza con contatto prolungato oltre 14gg'],
        notes: 'Vaniglia, cocco, tostato, speziato. Tostare le chips in forno prima dell\'uso per amplificare aromi. Contatto 7-14gg, assaggiare ogni 2-3gg.',
    },

    // ── Herbs & botanicals from reference table ──
    {
        id: 'ale_cost', name: 'Alecost', aliases: ['alecost', 'costmary', 'tanacetum balsamita'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'boil', contactTimeHours: 1, temperatureCelsius: 100 },
        profile: { aroma: 0.45, pungency: 0.0, bitterness: 0.25, astringency: 0.20, cooling: 0.0 },
        low: { min: 1.5, max: 6, recommend: 3.5 },
        medium: { min: 6, max: 14, recommend: 10 },
        high: { min: 14, max: 28, recommend: 20 },
        keyVolatiles: ['camphor', 'thujone', '1,8-cineole'],
        keyActives: ['tannins'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Aroma balsamico che può dominare birre delicate', 'Thujone: usare con moderazione'],
        notes: 'Foglie essiccate. Aroma balsamico-mentolato, simile alla menta ma più erbaceo. Storicamente usato nelle ale inglesi prima del luppolo.',
    },
    {
        id: 'anise_hyssop', name: 'Anice issopo', aliases: ['anice issopo', 'anise hyssop', 'agastache foeniculum'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'boil', contactTimeHours: 0.25, temperatureCelsius: 100 },
        profile: { aroma: 0.65, pungency: 0.0, bitterness: 0.15, astringency: 0.15, cooling: 0.0 },
        low: { min: 1.5, max: 6, recommend: 3.5 },
        medium: { min: 6, max: 14, recommend: 10 },
        high: { min: 14, max: 28, recommend: 20 },
        keyVolatiles: ['estragole', 'methyl chavicol', 'limonene'],
        keyActives: ['estragole'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['L\'estragole ricorda l\'anice: può creare ridondanza con anice stellato o finocchio'],
        notes: 'Fiori essiccati. Aroma di anice e liquirizia con note floreali. Ottimo in Saison e Farmhouse ale.',
    },
    {
        id: 'bitter_orange_peel', name: 'Scorza d\'arancia amara', aliases: ['scorza arancia amara', 'bitter orange peel', 'curaçao peel', 'arancia amara'], category: 'peel',
        referenceForm: 'dried',
        referenceConditions: { stage: 'boil', contactTimeHours: 0.25, temperatureCelsius: 100 },
        profile: { aroma: 0.65, pungency: 0.0, bitterness: 0.40, astringency: 0.25, cooling: 0.0 },
        low: { min: 1.5, max: 6, recommend: 3.5 },
        medium: { min: 6, max: 14, recommend: 10 },
        high: { min: 14, max: 28, recommend: 20 },
        keyVolatiles: ['limonene', 'citral', 'linalool', 'neohesperidin'],
        keyActives: ['neohesperidin', 'naringin'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [0.5, 2.5],
        risks: ['Più amara della scorza dolce: il neohesperidina contribuisce all\'amaro', 'L\'amaro può sommarsi agli IBU'],
        notes: 'Scorza essiccata di arancia amara (Curaçao). Aroma più intenso e complesso della scorza dolce. Classica nelle Belgian ale. Solo scorza, no albedo.',
    },
    {
        id: 'cowslip', name: 'Primula odorosa', aliases: ['primula', 'cowslip', 'primula veris'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'boil', contactTimeHours: 0.25, temperatureCelsius: 100 },
        profile: { aroma: 0.40, pungency: 0.0, bitterness: 0.15, astringency: 0.15, cooling: 0.0 },
        low: { min: 1.5, max: 6, recommend: 3.5 },
        medium: { min: 6, max: 14, recommend: 10 },
        high: { min: 14, max: 28, recommend: 20 },
        keyVolatiles: ['methyl salicylate', 'benzyl alcohol', 'linalool'],
        keyActives: ['saponins', 'flavonoids'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Aroma molto delicato: facilmente mascherato da luppoli e malti tostati'],
        notes: 'Fiori essiccati. Aroma floreale dolce e delicato. Usata storicamente in birre primaverili inglesi.',
    },
    {
        id: 'dandelion', name: 'Tarassaco (foglia)', aliases: ['tarassaco', 'dandelion', 'dente di leone'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'boil', contactTimeHours: 1, temperatureCelsius: 100 },
        profile: { aroma: 0.25, pungency: 0.0, bitterness: 0.55, astringency: 0.35, cooling: 0.0 },
        low: { min: 3, max: 12, recommend: 7 },
        medium: { min: 12, max: 28, recommend: 20 },
        high: { min: 28, max: 56, recommend: 40 },
        keyVolatiles: ['hexanal', 'phenylacetaldehyde'],
        keyActives: ['taraxacin', 'inulin', 'sesquiterpene lactones'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Amarezza significativa: il taraxacin è molto amaro', 'Può aggiungere un amaro terroso/vegetale'],
        notes: 'Foglie essiccate. Amaro erbaceo e terroso. Tradizionalmente usato in birre stagionali primaverili e come sostituto parziale del luppolo.',
    },
    {
        id: 'elderberry_flower', name: 'Fiori di sambuco', aliases: ['sambuco', 'elderberry flower', 'elderflower', 'fiori di sambuco'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'conditioning', contactTimeHours: 48, temperatureCelsius: 20 },
        profile: { aroma: 0.60, pungency: 0.0, bitterness: 0.10, astringency: 0.15, cooling: 0.0 },
        low: { min: 3, max: 12, recommend: 7 },
        medium: { min: 12, max: 28, recommend: 20 },
        high: { min: 28, max: 56, recommend: 40 },
        keyVolatiles: ['linalool', 'hotrienol', 'cis-rose oxide', 'phenylacetaldehyde'],
        keyActives: ['flavonoids', 'chlorogenic acid'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Aroma floreale intenso: può dominare birre delicate', 'I fiori freschi contengono tracce di glicosidi cianogenici (innocui dopo essiccazione/ebollizione)'],
        notes: 'Fiori essiccati. Aroma floreale, miele, uva moscato. Ottimo in Saison, witbier e blonde ale. Infusione a freddo 24-48h per massimo aroma.',
    },
    {
        id: 'elecampane', name: 'Enula campana', aliases: ['enula', 'elecampane', 'inula helenium'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'boil', contactTimeHours: 1, temperatureCelsius: 100 },
        profile: { aroma: 0.35, pungency: 0.0, bitterness: 0.40, astringency: 0.30, cooling: 0.0 },
        low: { min: 3, max: 12, recommend: 7 },
        medium: { min: 12, max: 28, recommend: 20 },
        high: { min: 28, max: 56, recommend: 40 },
        keyVolatiles: ['alantolactone', 'isoalantolactone', 'azulene'],
        keyActives: ['inulin', 'alantolactone'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Amarezza terrosa marcata', 'Può aggiungere note medicinali a dosi alte'],
        notes: 'Radice essiccata. Aroma terroso, amaro, con note di violetta. Usata storicamente in birre medicinali e amari.',
    },
    {
        id: 'greek_oregano', name: 'Origano greco', aliases: ['origano', 'greek oregano', 'origanum vulgare'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'boil', contactTimeHours: 0.75, temperatureCelsius: 100 },
        profile: { aroma: 0.55, pungency: 0.15, bitterness: 0.30, astringency: 0.25, cooling: 0.0 },
        low: { min: 3, max: 12, recommend: 7 },
        medium: { min: 12, max: 28, recommend: 20 },
        high: { min: 28, max: 56, recommend: 40 },
        keyVolatiles: ['carvacrol', 'thymol', 'γ-terpinene', 'p-cymene'],
        keyActives: ['carvacrol', 'thymol', 'rosmarinic acid'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [1.5, 4.0],
        risks: ['Carvacrolo e timolo sono molto potenti: CURVA RIPIDA', 'Può evocare note da cucina/pizza se sovradosato'],
        notes: 'Foglie essiccate. Aroma erbaceo, caldo, leggermente piccante. Ottimo in Saison, Farmhouse e birre al miele. Dosare con cautela.',
    },
    {
        id: 'heather', name: 'Erica', aliases: ['erica', 'heather', 'calluna vulgaris', 'brugo'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'boil', contactTimeHours: 1.5, temperatureCelsius: 100 },
        profile: { aroma: 0.50, pungency: 0.0, bitterness: 0.30, astringency: 0.35, cooling: 0.0 },
        low: { min: 5, max: 20, recommend: 12 },
        medium: { min: 20, max: 50, recommend: 35 },
        high: { min: 50, max: 100, recommend: 70 },
        keyVolatiles: ['β-caryophyllene', 'germacrene D', 'α-terpineol'],
        keyActives: ['tannins', 'arbutin', 'quercetin'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Astringenza significativa con bollitura prolungata', '12 cups ≈ 100g fiori secchi: volume, non peso'],
        notes: 'Fiori essiccati. Aroma floreale, miele, leggermente resinoso. Ingrediente tradizionale delle Fraoch (Scottish heather ale). 12 cups ≈ 100g secchi. Bollitura 90 min tradizionale.',
    },
    {
        id: 'horehound', name: 'Marrubio', aliases: ['marrubio', 'horehound', 'marrubium vulgare'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'boil', contactTimeHours: 1, temperatureCelsius: 100 },
        profile: { aroma: 0.30, pungency: 0.0, bitterness: 0.60, astringency: 0.30, cooling: 0.0 },
        low: { min: 3, max: 12, recommend: 7 },
        medium: { min: 12, max: 28, recommend: 20 },
        high: { min: 28, max: 56, recommend: 40 },
        keyVolatiles: ['β-caryophyllene', 'germacrene D', 'α-pinene'],
        keyActives: ['marrubiin', 'tannins'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Marrubina: amarezza molto intensa e persistente', 'Può facilmente dominare il profilo amaro'],
        notes: 'Foglie essiccate. Amaro erbaceo intenso, usato storicamente come sostituto del luppolo e in birre medicinali. Dosare con estrema cautela.',
    },
    {
        id: 'hyssop', name: 'Issopo', aliases: ['issopo', 'hyssop', 'hyssopus officinalis'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'boil', contactTimeHours: 1, temperatureCelsius: 100 },
        profile: { aroma: 0.50, pungency: 0.05, bitterness: 0.30, astringency: 0.25, cooling: 0.0 },
        low: { min: 1.5, max: 6, recommend: 3.5 },
        medium: { min: 6, max: 14, recommend: 10 },
        high: { min: 14, max: 28, recommend: 20 },
        keyVolatiles: ['isopinocamphone', 'pinocamphone', 'β-pinene', 'limonene'],
        keyActives: ['tannins', 'marrubiin'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Aroma balsamico-mentolato che può dominare', 'Amarezza moderata: attenzione con IBU già alti'],
        notes: 'Fiori essiccati. Aroma tra menta, salvia e rosmarino. Usato storicamente in birre monastiche e amari. Ottimo in Saison.',
    },
    {
        id: 'juniper_leaf', name: 'Ginepro (foglie)', aliases: ['foglie di ginepro', 'juniper leaf', 'juniper branches'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'boil', contactTimeHours: 1, temperatureCelsius: 100 },
        profile: { aroma: 0.50, pungency: 0.20, bitterness: 0.35, astringency: 0.40, cooling: 0.0 },
        low: { min: 6, max: 24, recommend: 14 },
        medium: { min: 24, max: 56, recommend: 40 },
        high: { min: 56, max: 113, recommend: 80 },
        keyVolatiles: ['α-pinene', 'sabinene', 'limonene', 'terpinen-4-ol'],
        keyActives: ['tannins', 'α-pinene'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Resinoso e astringente: può dominare birre delicate', 'Rischio di sovrapposizione con luppoli resinosi'],
        notes: 'Foglie/rametti essiccati. Più resinoso e astringente delle bacche. Tradizionalmente usato nelle Sahti e birre nordiche. Filtrare bene dopo bollitura.',
    },
    {
        id: 'labrador_tea', name: 'Tè del Labrador', aliases: ['labrador tea', 'tè del labrador', 'ledum groenlandicum', 'rhododendron groenlandicum'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'boil', contactTimeHours: 1, temperatureCelsius: 100 },
        profile: { aroma: 0.45, pungency: 0.0, bitterness: 0.30, astringency: 0.35, cooling: 0.0 },
        low: { min: 6, max: 24, recommend: 14 },
        medium: { min: 24, max: 56, recommend: 40 },
        high: { min: 56, max: 113, recommend: 80 },
        keyVolatiles: ['ledol', 'palustrol', 'myrcene', 'limonene'],
        keyActives: ['tannins', 'ursolic acid'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Ledolo: può causare effetti narcotici/psicotropi a dosi molto alte', 'Aroma resinoso-terroso che può dominare'],
        notes: 'Foglie essiccate. Aroma resinoso, terroso, con note di agrumi. Usato tradizionalmente in birre nordiche e canadesi. Dosare con cautela per il contenuto di ledolo.',
    },
    {
        id: 'lavender', name: 'Lavanda', aliases: ['lavanda', 'lavender', 'lavandula'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'whirlpool', contactTimeHours: 0.25, temperatureCelsius: 85 },
        profile: { aroma: 0.85, pungency: 0.0, bitterness: 0.20, astringency: 0.20, cooling: 0.0 },
        low: { min: 1.5, max: 6, recommend: 3.5 },
        medium: { min: 6, max: 14, recommend: 10 },
        high: { min: 14, max: 28, recommend: 20 },
        keyVolatiles: ['linalool', 'linalyl acetate', '1,8-cineole', 'camphor'],
        keyActives: ['linalool', 'tannins'],
        perceptionProfile: 'persistent', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [0.5, 3.0],
        risks: ['CURVA RIPIDA: la distanza tra piacevole e saponoso/profumato è minima', 'Può evocare sapone o profumo se sovradosata', 'Aroma molto persistente'],
        notes: 'Fiori essiccati. Usare varietà culinaria (L. angustifolia), non ornamentale. Infusione a caldo 10-15 min o dry-herb 24h. Ottimo in Saison, blonde ale e birre al miele.',
    },
    {
        id: 'lemon_balm', name: 'Melissa', aliases: ['melissa', 'lemon balm', 'melissa officinalis', 'cedronella'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'whirlpool', contactTimeHours: 0.25, temperatureCelsius: 85 },
        profile: { aroma: 0.55, pungency: 0.0, bitterness: 0.15, astringency: 0.15, cooling: 0.0 },
        low: { min: 1.5, max: 6, recommend: 3.5 },
        medium: { min: 6, max: 14, recommend: 10 },
        high: { min: 14, max: 28, recommend: 20 },
        keyVolatiles: ['citronellal', 'geranial', 'neral', 'β-caryophyllene'],
        keyActives: ['citronellal', 'rosmarinic acid'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Aroma citrato delicato: facilmente mascherato da luppoli intensi', 'I volatili citrati si degradano rapidamente con il calore'],
        notes: 'Foglie essiccate. Aroma di limone dolce e menta. Infusione a caldo 10-15 min o dry-herb. Ottimo in witbier, Saison e birre estive.',
    },
    {
        id: 'licorice_root', name: 'Liquirizia (radice)', aliases: ['liquirizia', 'licorice', 'licorice root', 'glycyrrhiza glabra'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'boil', contactTimeHours: 1, temperatureCelsius: 100 },
        profile: { aroma: 0.40, pungency: 0.0, bitterness: 0.25, astringency: 0.20, cooling: 0.0 },
        low: { min: 0.7, max: 3, recommend: 1.8 },
        medium: { min: 3, max: 7, recommend: 5 },
        high: { min: 7, max: 14, recommend: 10 },
        keyVolatiles: ['anethole', 'estragole', 'hexanoic acid'],
        keyActives: ['glycyrrhizin', 'glycyrrhizic acid'],
        perceptionProfile: 'building', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Glicirrizina: dolcezza persistente che si accumula', 'Può aggiungere dolcezza non fermentabile', 'Effetto lassativo a dosi molto alte'],
        notes: 'Radice essiccata, spezzettata. Dolcezza naturale 50× superiore al saccarosio. La dolcezza persiste dopo fermentazione. Ottimo in stout, porter e birre scure.',
    },
    {
        id: 'milk_thistle', name: 'Cardo mariano', aliases: ['cardo mariano', 'milk thistle', 'silybum marianum'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'boil', contactTimeHours: 0.75, temperatureCelsius: 100 },
        profile: { aroma: 0.20, pungency: 0.0, bitterness: 0.50, astringency: 0.30, cooling: 0.0 },
        low: { min: 3, max: 12, recommend: 7 },
        medium: { min: 12, max: 28, recommend: 20 },
        high: { min: 28, max: 56, recommend: 40 },
        keyVolatiles: ['hexanal', 'benzaldehyde'],
        keyActives: ['silymarin', 'tannins'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Amarezza erbacea marcata', 'Silimarina: sapore terroso e amaro persistente'],
        notes: 'Foglie essiccate. Amaro erbaceo e terroso. Usato storicamente in birre medicinali e come sostituto parziale del luppolo in alcune tradizioni.',
    },
    {
        id: 'mugwort', name: 'Artemisia comune', aliases: ['artemisia', 'mugwort', 'artemisia vulgaris', 'erba di san giovanni'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'boil', contactTimeHours: 1, temperatureCelsius: 100 },
        profile: { aroma: 0.40, pungency: 0.0, bitterness: 0.45, astringency: 0.30, cooling: 0.0 },
        low: { min: 3, max: 12, recommend: 7 },
        medium: { min: 12, max: 28, recommend: 20 },
        high: { min: 28, max: 56, recommend: 40 },
        keyVolatiles: ['thujone', '1,8-cineole', 'camphor', 'β-caryophyllene'],
        keyActives: ['thujone', 'tannins'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Thujone: usare con moderazione (tossico ad alte dosi)', 'Amarezza erbacea intensa', 'Può dominare birre delicate'],
        notes: 'Foglie essiccate. Aroma erbaceo-balsamico con note di salvia. Usata storicamente in birre prima del luppolo (gruit). Non superare i dosaggi consigliati.',
    },
    {
        id: 'nettle', name: 'Ortica', aliases: ['ortica', 'nettle', 'urtica dioica', 'ortica fresca'], category: 'herb',
        referenceForm: 'fresh',
        referenceConditions: { stage: 'boil', contactTimeHours: 1, temperatureCelsius: 100 },
        profile: { aroma: 0.25, pungency: 0.0, bitterness: 0.35, astringency: 0.30, cooling: 0.0 },
        low: { min: 1.5, max: 6, recommend: 3.5 },
        medium: { min: 6, max: 14, recommend: 10 },
        high: { min: 14, max: 28, recommend: 20 },
        keyVolatiles: ['hexanal', '3-hexenol', 'phenylacetaldehyde'],
        keyActives: ['chlorophyll', 'tannins', 'minerals'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Foglie fresche: contenuto d\'acqua variabile (~80-85%)', 'Sapore vegetale/erbaceo che può dominare', 'Raccogliere solo prima della fioritura (giovani)'],
        notes: 'Foglie fresche, raccolte prima della fioritura. Sapore vegetale, minerale, leggermente amaro. Tradizionalmente usata in birre primaverili inglesi. Se essiccata: ~1/5 del peso fresco.',
    },
    {
        id: 'rose_hips', name: 'Bacche di rosa canina', aliases: ['rosa canina', 'rose hips', 'cinorrodonti', 'rosehip'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'boil', contactTimeHours: 1, temperatureCelsius: 100 },
        profile: { aroma: 0.35, pungency: 0.0, bitterness: 0.20, astringency: 0.35, cooling: 0.0 },
        low: { min: 3, max: 12, recommend: 7 },
        medium: { min: 12, max: 28, recommend: 20 },
        high: { min: 28, max: 56, recommend: 40 },
        keyVolatiles: ['β-damascenone', 'geraniol', 'citronellol', 'phenylethyl alcohol'],
        keyActives: ['ascorbic acid', 'tannins', 'pectin'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Astringenza da tannini e pectina', 'Colore rosso-arancio che può influenzare l\'aspetto', 'Sapore fruttato-acidulo che può sembrare acidità'],
        notes: 'Bacche essiccate e spezzettate. Aroma fruttato-floreale con note di mela e fragola. Ricche di vitamina C. Ottimo in Saison, sour e birre alla frutta.',
    },
    {
        id: 'rosemary', name: 'Rosmarino', aliases: ['rosmarino', 'rosemary', 'rosmarinus officinalis'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'boil', contactTimeHours: 0.75, temperatureCelsius: 100 },
        profile: { aroma: 0.65, pungency: 0.10, bitterness: 0.30, astringency: 0.25, cooling: 0.0 },
        low: { min: 1.5, max: 6, recommend: 3.5 },
        medium: { min: 6, max: 14, recommend: 10 },
        high: { min: 14, max: 28, recommend: 20 },
        keyVolatiles: ['1,8-cineole', 'α-pinene', 'camphor', 'borneol', 'verbenone'],
        keyActives: ['rosmarinic acid', 'carnosic acid'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        oilRangePercent: [0.5, 2.5],
        risks: ['Aroma resinoso-balsamico molto potente: CURVA RIPIDA', 'Può evocare note da cucina se sovradosato', 'L\'1,8-cineolo è dominante e persistente'],
        notes: 'Foglie essiccate. Aroma balsamico, pino, canfora. Ottimo in Saison, Farmhouse e birre al miele. Dosare con cautela: iniziare dal minimo.',
    },
    {
        id: 'sarsaparilla', name: 'Salsapariglia', aliases: ['salsapariglia', 'sarsaparilla', 'smilax'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'boil', contactTimeHours: 1, temperatureCelsius: 100 },
        profile: { aroma: 0.35, pungency: 0.0, bitterness: 0.25, astringency: 0.20, cooling: 0.0 },
        low: { min: 0.7, max: 3, recommend: 1.8 },
        medium: { min: 3, max: 7, recommend: 5 },
        high: { min: 7, max: 14, recommend: 10 },
        keyVolatiles: ['methyl salicylate', 'safrole', 'vanillin'],
        keyActives: ['saponins', 'tannins'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Safrolo: potenzialmente cancerogeno ad alte dosi (regolamentato in alcuni paesi)', 'Sapore dolce-radice che può dominare'],
        notes: 'Radice essiccata. Sapore dolce, radice, con note di wintergreen e vaniglia. Ingrediente classico della root beer tradizionale. Ottimo in stout e porter.',
    },
    {
        id: 'spruce_tips', name: 'Abete (germogli freschi)', aliases: ['abete', 'spruce tips', 'germogli di abete', 'spruce buds'], category: 'herb',
        referenceForm: 'fresh',
        referenceConditions: { stage: 'boil', contactTimeHours: 1, temperatureCelsius: 100 },
        profile: { aroma: 0.55, pungency: 0.10, bitterness: 0.30, astringency: 0.35, cooling: 0.0 },
        low: { min: 9, max: 36, recommend: 22 },
        medium: { min: 36, max: 85, recommend: 60 },
        high: { min: 85, max: 170, recommend: 120 },
        keyVolatiles: ['α-pinene', 'β-pinene', 'limonene', 'bornyl acetate', 'δ-3-carene'],
        keyActives: ['tannins', 'vitamin C'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Resinoso e astringente: può dominare birre delicate', 'Raccogliere solo germogli primaverili teneri (non aghi maturi)', 'Variabilità stagionale significativa'],
        notes: 'Germogli freschi primaverili, di colore verde chiaro. Aroma resinoso, agrumato, balsamico. Tradizionalmente usato in birre nordiche e coloniali americane. Ottimo in Saison, Farmhouse e porter.',
    },
    {
        id: 'sweet_basil', name: 'Basilico dolce', aliases: ['basilico', 'sweet basil', 'basilico genovese', 'ocimum basilicum'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'whirlpool', contactTimeHours: 0.25, temperatureCelsius: 85 },
        profile: { aroma: 0.55, pungency: 0.0, bitterness: 0.15, astringency: 0.15, cooling: 0.0 },
        low: { min: 3, max: 12, recommend: 7 },
        medium: { min: 12, max: 28, recommend: 20 },
        high: { min: 28, max: 56, recommend: 40 },
        keyVolatiles: ['linalool', 'estragole', 'eugenol', '1,8-cineole'],
        keyActives: ['linalool', 'rosmarinic acid'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Aroma che può evocare cucina/pesto se sovradosato', 'I volatili delicati si perdono rapidamente con il calore'],
        notes: 'Foglie essiccate. Aroma dolce, leggermente anicato e floreale. Infusione a caldo 10-15 min o dry-herb. Ottimo in Saison, witbier e birre estive.',
    },
    {
        id: 'sweet_gale', name: 'Mirto di palude / Sweet Gale', aliases: ['mirto di palude', 'sweet gale', 'bog myrtle', 'myrica gale'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'boil', contactTimeHours: 0.5, temperatureCelsius: 100 },
        profile: { aroma: 0.50, pungency: 0.05, bitterness: 0.30, astringency: 0.35, cooling: 0.0 },
        low: { min: 3, max: 12, recommend: 7 },
        medium: { min: 12, max: 28, recommend: 20 },
        high: { min: 28, max: 56, recommend: 40 },
        keyVolatiles: ['α-pinene', 'limonene', 'myrcene', 'β-caryophyllene'],
        keyActives: ['tannins', 'myricitrin'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Astringenza significativa', 'Resinoso: può sovrapporsi con luppoli resinosi'],
        notes: 'Foglie essiccate. Aroma resinoso, balsamico, leggermente agrumato. Ingrediente tradizionale del gruit scandinavo e scozzese. Ottimo in Saison e Farmhouse ale.',
    },
    {
        id: 'sweet_woodruff', name: 'Asperula / Stellina odorosa', aliases: ['asperula', 'stellina odorosa', 'sweet woodruff', 'galium odoratum', 'waldmeister'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'conditioning', contactTimeHours: 48, temperatureCelsius: 20 },
        profile: { aroma: 0.55, pungency: 0.0, bitterness: 0.10, astringency: 0.15, cooling: 0.0 },
        low: { min: 1.5, max: 6, recommend: 3.5 },
        medium: { min: 6, max: 14, recommend: 10 },
        high: { min: 14, max: 28, recommend: 20 },
        keyVolatiles: ['coumarin', 'salicylaldehyde'],
        keyActives: ['coumarin', 'asperuloside'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Cumarina: epatotossica ad alte dosi. Non superare i dosaggi consigliati.', 'Aroma molto persistente'],
        notes: 'Foglie essiccate. Aroma di fieno dolce, vaniglia e mandorla (cumarina). L\'aroma si sviluppa durante l\'essiccazione. Classica nella Berliner Weisse e nelle birre tedesche. Infusione a freddo 24-48h.',
    },
    {
        id: 'sweetgrass', name: 'Erba dolce / Sweetgrass', aliases: ['erba dolce', 'sweetgrass', 'hierochloe odorata', 'erba della madonna'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'conditioning', contactTimeHours: 48, temperatureCelsius: 20 },
        profile: { aroma: 0.50, pungency: 0.0, bitterness: 0.10, astringency: 0.15, cooling: 0.0 },
        low: { min: 3, max: 12, recommend: 7 },
        medium: { min: 12, max: 28, recommend: 20 },
        high: { min: 28, max: 56, recommend: 40 },
        keyVolatiles: ['coumarin', 'vanillin', 'benzaldehyde'],
        keyActives: ['coumarin'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Cumarina: epatotossica ad alte dosi', 'Aroma delicato: facilmente mascherato'],
        notes: 'Foglie essiccate. Aroma di fieno dolce, vaniglia e mandorla. Usata tradizionalmente in birre nord-europee e polacche. Infusione a freddo 24-48h.',
    },
    {
        id: 'wintergreen', name: 'Wintergreen / Gaultheria', aliases: ['wintergreen', 'gaultheria', 'gaultheria procumbens'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'whirlpool', contactTimeHours: 0.5, temperatureCelsius: 85 },
        profile: { aroma: 0.60, pungency: 0.0, bitterness: 0.20, astringency: 0.25, cooling: 0.30 },
        low: { min: 3, max: 12, recommend: 7 },
        medium: { min: 12, max: 28, recommend: 20 },
        high: { min: 28, max: 56, recommend: 40 },
        keyVolatiles: ['methyl salicylate', 'limonene', 'α-pinene'],
        keyActives: ['methyl salicylate', 'gaultherin'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Metil salicilato: aroma molto potente e persistente (simile a pomata/linimento)', 'Può evocare note medicinali/farmaceutiche se sovradosato', 'Tossico ad alte dosi: non superare i dosaggi'],
        notes: 'Foglie essiccate. Aroma intenso di menta invernale, balsamico, con sensazione rinfrescante. Usato tradizionalmente in root beer e birre speziate. Dosare con estrema cautela.',
    },
    {
        id: 'wormwood', name: 'Assenzio / Artemisia absinthium', aliases: ['assenzio', 'wormwood', 'artemisia absinthium', 'assenzio maggiore'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'boil', contactTimeHours: 0.25, temperatureCelsius: 100 },
        profile: { aroma: 0.45, pungency: 0.0, bitterness: 0.80, astringency: 0.35, cooling: 0.0 },
        low: { min: 0.25, max: 1, recommend: 0.6 },
        medium: { min: 1, max: 2.5, recommend: 1.8 },
        high: { min: 2.5, max: 5, recommend: 3.5 },
        keyVolatiles: ['thujone', 'absinthin', 'artabsin', 'chamazulene'],
        keyActives: ['absinthin', 'thujone', 'artabsin'],
        perceptionProfile: 'persistent', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['ESTREMAMENTE AMARO: absintina è uno dei composti più amari conosciuti', 'Thujone: neurotossico ad alte dosi. Non superare MAI i dosaggi.', 'CURVA RIPIDA: pochi decimi di grammo fanno la differenza'],
        notes: 'Foglie essiccate. Amarezza estrema e persistente. Usato storicamente nel gruit e in birre medicinali. DOSARE CON ESTREMA CAUTELA: iniziare sempre dal minimo assoluto.',
    },
    {
        id: 'yarrow', name: 'Achillea millefoglie', aliases: ['achillea', 'yarrow', 'achillea millefolium', 'millefoglie'], category: 'herb',
        referenceForm: 'dried',
        referenceConditions: { stage: 'boil', contactTimeHours: 0.5, temperatureCelsius: 100 },
        profile: { aroma: 0.40, pungency: 0.0, bitterness: 0.40, astringency: 0.30, cooling: 0.0 },
        low: { min: 3, max: 12, recommend: 7 },
        medium: { min: 12, max: 28, recommend: 20 },
        high: { min: 28, max: 56, recommend: 40 },
        keyVolatiles: ['chamazulene', 'β-pinene', '1,8-cineole', 'sabinene'],
        keyActives: ['achilleine', 'tannins', 'azulene'],
        perceptionProfile: 'immediate', doseUnit: 'g', extraction: { volatileRateMultiplier: 1.0, nonVolatileRateMultiplier: 1.0 },
        risks: ['Amarezza erbacea moderata', 'Azulene: colore blu-verde che può influenzare l\'aspetto'],
        notes: 'Foglie e fiori essiccati. Aroma erbaceo, leggermente balsamico e amaro. Usata storicamente nel gruit e in birre medicinali anglosassoni. Ottimo in Saison e Farmhouse ale.',
    },
];

// ── Compatibility matrix ─────────────────────────────────────────────────────

interface Interaction {
    ingredientA: string;
    ingredientB: string;
    /** -1 (dissonance) to +1 (synergy). */
    aromaCompatibility: number;
    /** -1 (cancel) to +1 (synergize). */
    pungencySynergy: number;
    /** 0 (no risk) to 1 (high risk). */
    bitternessRisk: number;
    /** 0 (no risk) to 1 (high risk). */
    astringencyRisk: number;
    explanation: string;
}

/** Lookup key: two spice IDs sorted alphabetically. */
function interactKey(a: string, b: string): string {
    return [a, b].sort().join('::');
}

const INTERACTIONS: Record<string, Interaction> = {
    'black_pepper::coriander_seed': { ingredientA: 'black_pepper', ingredientB: 'coriander_seed', aromaCompatibility: 0.60, pungencySynergy: 0.20, bitternessRisk: 0.30, astringencyRisk: 0.25, explanation: 'Buona complementarità: coriandolo agrumato/floreale completa il pepe resinoso. Terpeni condivisi (pineni, limonene).' },
    'black_pepper::sichuan_pepper': { ingredientA: 'black_pepper', ingredientB: 'sichuan_pepper', aromaCompatibility: 0.40, pungencySynergy: 0.70, bitternessRisk: 0.30, astringencyRisk: 0.60, explanation: 'Alta sinergia pungente con effetto buzz amplificato. Rischio di sovraccarico trigeminale. Ridurre entrambi del 30%.' },
    'black_pepper::chili': { ingredientA: 'black_pepper', ingredientB: 'chili', aromaCompatibility: 0.20, pungencySynergy: 0.80, bitternessRisk: 0.25, astringencyRisk: 0.50, explanation: 'Pungenza cumulativa. Due fonti di calore si sommano in modo non lineare. Ridurre entrambi del 40% rispetto al dosaggio singolo.' },
    'black_pepper::ginger': { ingredientA: 'black_pepper', ingredientB: 'ginger', aromaCompatibility: 0.40, pungencySynergy: 0.60, bitternessRisk: 0.20, astringencyRisk: 0.35, explanation: 'Buona complementarità aromatica (terpeni condivisi) ma pungenza cumulativa. Ridurre ciascuno del 25%.' },
    'black_pepper::cinnamon': { ingredientA: 'black_pepper', ingredientB: 'cinnamon', aromaCompatibility: 0.50, pungencySynergy: 0.30, bitternessRisk: 0.40, astringencyRisk: 0.45, explanation: 'Classico abbinamento invernale. Il calore della cannella completa il pepe. Attenzione all\'astringenza cumulativa.' },
    'black_pepper::clove': { ingredientA: 'black_pepper', ingredientB: 'clove', aromaCompatibility: 0.20, pungencySynergy: 0.40, bitternessRisk: 0.60, astringencyRisk: 0.70, explanation: 'Rischio alto. Eugenolo + astringenza del pepe creano sensazione tannica aggressiva.' },
    'coriander_seed::orange_peel': { ingredientA: 'coriander_seed', ingredientB: 'orange_peel', aromaCompatibility: 0.70, pungencySynergy: 0.0, bitternessRisk: 0.40, astringencyRisk: 0.20, explanation: 'Alta affinità agrumata/floreale (linalolo + limonene). Rischio profilo saponoso/detergente se entrambi a dose alta.' },
    'coriander_seed::lemon_peel': { ingredientA: 'coriander_seed', ingredientB: 'lemon_peel', aromaCompatibility: 0.65, pungencySynergy: 0.0, bitternessRisk: 0.30, astringencyRisk: 0.15, explanation: 'Simile all\'arancia ma profilo più fresco e meno saponoso. Buona sinergia.' },
    'cinnamon::clove': { ingredientA: 'cinnamon', ingredientB: 'clove', aromaCompatibility: 0.50, pungencySynergy: 0.35, bitternessRisk: 0.60, astringencyRisk: 0.75, explanation: 'Entrambi ricchi di eugenolo: ridondanza e astringenza cumulativa. Meglio sceglierne uno solo come dominante.' },
    'cinnamon::vanilla': { ingredientA: 'cinnamon', ingredientB: 'vanilla', aromaCompatibility: 0.70, pungencySynergy: 0.0, bitternessRisk: 0.10, astringencyRisk: 0.20, explanation: 'Classico dessert. La vaniglia ammorbidisce il calore della cannella. Ottima sinergia.' },
    'cinnamon::nutmeg': { ingredientA: 'cinnamon', ingredientB: 'nutmeg', aromaCompatibility: 0.60, pungencySynergy: 0.25, bitternessRisk: 0.40, astringencyRisk: 0.45, explanation: 'Buona compatibilità invernale. Entrambi caldi e speziati ma con profili complementari.' },
    'clove::star_anise': { ingredientA: 'clove', ingredientB: 'star_anise', aromaCompatibility: 0.30, pungencySynergy: 0.30, bitternessRisk: 0.60, astringencyRisk: 0.70, explanation: 'Entrambi dominanti con curva ripida. Rischio molto alto di saturazione sensoriale. Meglio sceglierne uno.' },
    'chili::ginger': { ingredientA: 'chili', ingredientB: 'ginger', aromaCompatibility: 0.30, pungencySynergy: 0.75, bitternessRisk: 0.20, astringencyRisk: 0.35, explanation: 'Tre fonti di calore trigeminale (capsaicina + gingerolo). Rischio di aggressività: procedere con estrema cautela.' },
    'chili::sichuan_pepper': { ingredientA: 'chili', ingredientB: 'sichuan_pepper', aromaCompatibility: 0.25, pungencySynergy: 0.65, bitternessRisk: 0.20, astringencyRisk: 0.50, explanation: 'Fuoco + formicolio: effetto amplificato. Interessante ma pericoloso a dosi alte.' },
    'cardamom::orange_peel': { ingredientA: 'cardamom', ingredientB: 'orange_peel', aromaCompatibility: 0.55, pungencySynergy: 0.0, bitternessRisk: 0.25, astringencyRisk: 0.20, explanation: 'L\'1,8-cineolo del cardamomo completa gli agrumi. Buona sinergia floreale-agrumata.' },
    'cardamom::cinnamon': { ingredientA: 'cardamom', ingredientB: 'cinnamon', aromaCompatibility: 0.50, pungencySynergy: 0.20, bitternessRisk: 0.35, astringencyRisk: 0.30, explanation: 'Classico mediorientale. Il cardamomo aggiunge freschezza alla cannella calda.' },
    'vanilla::nutmeg': { ingredientA: 'vanilla', ingredientB: 'nutmeg', aromaCompatibility: 0.65, pungencySynergy: 0.0, bitternessRisk: 0.10, astringencyRisk: 0.15, explanation: 'La dolcezza della vaniglia bilancia la speziatura della noce moscata. Ottima compatibilità.' },
    'vanilla::cinnamon': { ingredientA: 'vanilla', ingredientB: 'cinnamon', aromaCompatibility: 0.70, pungencySynergy: 0.0, bitternessRisk: 0.10, astringencyRisk: 0.20, explanation: 'Vedi cinnamon::vanilla (simmetrico).' },
    'vanilla::clove': { ingredientA: 'vanilla', ingredientB: 'clove', aromaCompatibility: 0.45, pungencySynergy: 0.10, bitternessRisk: 0.35, astringencyRisk: 0.40, explanation: 'La vaniglia può ammorbidire il chiodo ma non eliminare l\'astringenza. Usare chiodo come nota di sfondo.' },
    'ginger::cinnamon': { ingredientA: 'ginger', ingredientB: 'cinnamon', aromaCompatibility: 0.55, pungencySynergy: 0.40, bitternessRisk: 0.25, astringencyRisk: 0.30, explanation: 'Caldo + caldo: buona compatibilità invernale. Attenzione alla pungenza cumulativa.' },
    'ginger::lemon_peel': { ingredientA: 'ginger', ingredientB: 'lemon_peel', aromaCompatibility: 0.60, pungencySynergy: 0.15, bitternessRisk: 0.15, astringencyRisk: 0.20, explanation: 'Lo zenzero citrato con limone è un classico rinfrescante. Ottimo in Saison e Witbier.' },
    'allspice::cinnamon': { ingredientA: 'allspice', ingredientB: 'cinnamon', aromaCompatibility: 0.55, pungencySynergy: 0.30, bitternessRisk: 0.35, astringencyRisk: 0.40, explanation: 'Ridondanza parziale (il pimento sa già di cannella). Se li usi entrambi, riduci ciascuno del 40%.' },
    'allspice::clove': { ingredientA: 'allspice', ingredientB: 'clove', aromaCompatibility: 0.40, pungencySynergy: 0.30, bitternessRisk: 0.55, astringencyRisk: 0.65, explanation: 'Alta ridondanza (eugenolo in entrambi). Meglio sceglierne uno solo.' },
    'juniper::coriander_seed': { ingredientA: 'juniper', ingredientB: 'coriander_seed', aromaCompatibility: 0.50, pungencySynergy: 0.15, bitternessRisk: 0.35, astringencyRisk: 0.35, explanation: 'Terpeni condivisi (pineni). Buona compatibilità resinosa-agrumata. Ottimo in Saison e Farmhouse.' },
    'juniper::black_pepper': { ingredientA: 'juniper', ingredientB: 'black_pepper', aromaCompatibility: 0.45, pungencySynergy: 0.40, bitternessRisk: 0.40, astringencyRisk: 0.50, explanation: 'Resinoso + resinoso: può diventare monotematico. Meglio con una terza spezia agrumata.' },
    'long_pepper::cinnamon': { ingredientA: 'long_pepper', ingredientB: 'cinnamon', aromaCompatibility: 0.45, pungencySynergy: 0.50, bitternessRisk: 0.40, astringencyRisk: 0.45, explanation: 'Calore complesso e persistente. Ottimo in stout invernali ma con cautela.' },
};

function findInteraction(a: string, b: string): Interaction | undefined {
    return INTERACTIONS[interactKey(a, b)];
}

// ── Matching ─────────────────────────────────────────────────────────────────

function normalizeName(value: string): string {
    return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
}

function findAllSpiceMatches(raw: string): SpiceInfo[] {
    const query = normalizeName(raw);
    const exact = SPICES.filter(s => s.id === query || normalizeName(s.name) === query || s.aliases.some(a => normalizeName(a) === query));
    if (exact.length > 0) return exact;
    const candidates = SPICES.filter(s => normalizeName(s.name).includes(query) || s.aliases.some(a => normalizeName(a).includes(query)));
    return candidates.sort((a, b) => Math.abs(a.name.length - raw.length) - Math.abs(b.name.length - raw.length));
}

function findSpice(raw: string): SpiceInfo | undefined {
    const matches = findAllSpiceMatches(raw);
    if (matches.length === 0) return undefined;
    return matches[0];
}

// ── Dose computation ─────────────────────────────────────────────────────────

interface SpiceCalcInput {
    spice_name: string;
    batch_liters: number;
    intensity: IntensityLevel;
    form: SpiceForm;
    stage: AdditionStage;
    contact_time_hours: number;
    temperature_celsius: number;
    freshness: Freshness;
    capsaicinoids_mg_per_g?: number;
    shu?: number;
    /** Coffee/cocoa roast level */
    roast_level?: 'light' | 'medium' | 'dark';
    beer_matrix: BeerMatrixInput;
    /** Names of other adjuncts already in the recipe. */
    other_spices: string[];
    /** For direct liquid doses: relative concentration vs reference (1.0 = reference 1:5 cold brew). */
    liquid_strength_relative?: number;
    /** For direct liquid doses: coffee grams per liter of water used in preparation. */
    coffee_grams_per_liter?: number;
    /** Toast level for wood adjuncts (oak chips etc.). */
    wood_toast_level?: WoodToastLevel;
    /** Hours since the liquid adjunct (cold brew, tincture) was prepared. */
    prepared_hours_ago?: number;
}

interface SpiceDoseOutput {
    /** Recommended dose, in the ingredient's doseUnit. */
    doseRecommended: number;
    /** Low end of operational range, in the ingredient's doseUnit. */
    doseMin: number;
    /** High end of operational range, in the ingredient's doseUnit. */
    doseMax: number;
    /** Unit of the dose values: g or ml. */
    doseUnit: DoseUnit;
    /** For ml doses: dilution added to the batch, as percent of batch volume. */
    dilutionPercent?: number;
    /** Expected perceived intensity as an integer percentage, 0-100. */
    contributions: {
        aroma: number;
        pungency: number;
        bitterness: number;
        astringency: number;
        cooling: number;
    };
    /** How confident the model is (0-1). */
    confidence: number;
    /** Factors reducing confidence. */
    confidenceNotes: string[];
    /** Best addition method recommendation. */
    recommendedMethod: string;
    /** Incremental dosing protocol. */
    adjustmentProtocol: string;
    /** Risk flags. */
    risks: string[];
    /** Compatibility notes with other spices. */
    compatibilityNotes: string[];
    /** General brewing tips. */
    tips: string[];
}

function computeSpiceDose(input: SpiceCalcInput): SpiceDoseOutput {
    // ── 1. Find the spice ──
    const matches = findAllSpiceMatches(input.spice_name);
    if (matches.length === 0) {
        throw new Error(`Ingrediente "${input.spice_name}" non trovato nel database.`);
    }
    const spice = matches[0]!;

    // ── 2. Handle chili specially ──
    const isChili = spice.id === 'chili';

    // ── 3. Get reference dosage range ──
    const refRange = spice[input.intensity];
    if (isChili && !input.capsaicinoids_mg_per_g && !input.shu) {
        return buildChiliUnknownResult(spice, input);
    }

    // ── 4. Delivery mode ──
    const isDirectLiquid = spice.deliveryMode === 'direct_liquid_dose';

    // ── 5. Form: normalize vs referenceForm (skipped for direct liquid doses) ──
    const form = FORMS[input.form];
    const refForm = FORMS[spice.referenceForm];

    // Relative extraction: >1 = extracts more than reference → need LESS grams
    const relativeVolatileExtract = isDirectLiquid
        ? 1
        : form.volatileExtractSpeed / Math.max(0.01, refForm.volatileExtractSpeed);
    const relativeNonVolatileExtract = isDirectLiquid
        ? 1
        : form.nonVolatileExtractSpeed / Math.max(0.01, refForm.nonVolatileExtractSpeed);

    // ── 6. Stage + time + temperature — saturating extraction model ──
    const stage = STAGES[input.stage];
    const timeHours = clamp(input.contact_time_hours, 0.05, 720);
    const tempC = Math.max(0, input.temperature_celsius);

    // Temperature-dependent rate constant k (per hour), calibrated per ingredient
    // Reference k at 20°C: ~0.03/h for volatiles, ~0.02/h for non-volatiles
    const tempKMultiplier = Math.pow(1.8, (tempC - 20) / 10); // milder than Q10=2
    const kVolatile = 0.03 * tempKMultiplier * spice.extraction.volatileRateMultiplier;
    const kNonVolatile = 0.02 * tempKMultiplier * spice.extraction.nonVolatileRateMultiplier;

    // Saturating extraction: fraction = 1 - exp(-k * t)
    // Direct liquid doses skip the extraction model — the extract is already in solution
    const volatileExtractFraction = isDirectLiquid ? 1 : 1 - Math.exp(-kVolatile * timeHours);
    const nonVolatileExtractFraction = isDirectLiquid ? 1 : 1 - Math.exp(-kNonVolatile * timeHours);

    // Volatile retention: some are lost to evaporation/degradation (stage × form dependent)
    const effectiveHeatLoss = stage.volatileEvaporation * form.volatileHeatLoss;
    const volatileRetention = effectiveHeatLoss < 1
        ? Math.exp(-effectiveHeatLoss * 3 * volatileExtractFraction)
        : 0.05;

    // Effective extraction: what actually ends up in the beer
    const effectiveVolatileExtract = isDirectLiquid
        ? 1
        : volatileExtractFraction * volatileRetention * stage.volatileExtract;
    const effectiveNonVolatileExtract = isDirectLiquid
        ? 1
        : nonVolatileExtractFraction * stage.nonVolatileExtract;

    // Reference extraction — uses per-ingredient reference conditions if specified
    // (the empirical dosage ranges were measured under these conditions)
    const refConditions = spice.referenceConditions ?? {
        stage: 'conditioning' as AdditionStage,
        contactTimeHours: 72,
        temperatureCelsius: 20,
    };
    const refStage = STAGES[refConditions.stage];
    const refTimeHours = refConditions.contactTimeHours;
    const refTempMultiplier = Math.pow(1.8, (refConditions.temperatureCelsius - 20) / 10);
    const refKVolatile = 0.03 * refTempMultiplier * spice.extraction.volatileRateMultiplier;
    const refKNonVolatile = 0.02 * refTempMultiplier * spice.extraction.nonVolatileRateMultiplier;

    // Direct liquid doses: reference effective extraction is also 1
    const refVolatileFraction = isDirectLiquid ? 1 : 1 - Math.exp(-refKVolatile * refTimeHours);
    const refNonVolatileFraction = isDirectLiquid ? 1 : 1 - Math.exp(-refKNonVolatile * refTimeHours);
    const refEffectiveHeatLoss = refStage.volatileEvaporation * refForm.volatileHeatLoss;
    const refVolatileRetention = Math.exp(-refEffectiveHeatLoss * 3 * refVolatileFraction);
    const refEffectiveVolatile = isDirectLiquid
        ? 1
        : refVolatileFraction * refVolatileRetention * refStage.volatileExtract;
    const refEffectiveNonVolatile = isDirectLiquid
        ? 1
        : refNonVolatileFraction * refStage.nonVolatileExtract;

    // Dose = referenceDose / (relativeExtraction × relativeForm)
    // More extraction → divide → less dose
    const baseVolatileDoseDivisor = (effectiveVolatileExtract / Math.max(0.01, refEffectiveVolatile)) * relativeVolatileExtract;
    const baseNonVolatileDoseDivisor = (effectiveNonVolatileExtract / Math.max(0.01, refEffectiveNonVolatile)) * relativeNonVolatileExtract;

    // ── 7. Potency / freshness (skipped for pre-made liquid doses — use prepared_hours_ago instead) ──
    const potencyFactor = isDirectLiquid ? 1 : potencyMultiplier(input.freshness);

    // ── 8. Matrix factors ──
    const matrix = computeMatrixFactors(input.beer_matrix);

    // Extraction factor: ABV affects physical extraction (not liquid doses)
    const extractionBoost = isDirectLiquid ? 1 : matrix.extractionFactor;

    // Masking: roast & FG mask aroma perception → need MORE grams to compensate
    const aromaMasking = matrix.maskingFactor.aroma;
    // Perception amplification: >1 means the beer amplifies perceived intensity → need FEWER grams
    const aromaAmplification = matrix.perceptionAmplification.aroma;

    // ── 9. Roast level adjustment (coffee, cocoa) and wood toast ──
    let roastAromaPotency = 1.0;
    let roastBitterness = 1.0;
    let roastAstringency = 1.0;
    if (input.roast_level && (spice.category === 'coffee' || spice.category === 'cocoa')) {
        const ra = input.roast_level === 'light' ? { aromaPotency: 1.05, bitterness: 0.85, astringency: 0.95 }
            : input.roast_level === 'dark' ? { aromaPotency: 0.90, bitterness: 1.20, astringency: 1.10 }
                : { aromaPotency: 1.0, bitterness: 1.0, astringency: 1.0 };
        roastAromaPotency = ra.aromaPotency;
        roastBitterness = ra.bitterness;
        roastAstringency = ra.astringency;
    }

    // Wood toast: affects perceived aroma and astringency (separate from coffee/cocoa roast)
    let woodToastAroma = 1.0;
    let woodToastAstringency = 1.0;
    if (input.wood_toast_level && spice.category === 'wood') {
        const wt = WOOD_TOAST[input.wood_toast_level];
        woodToastAroma = wt.aroma;
        woodToastAstringency = wt.astringency;
    }

    // ── 10. Blend aroma/non-volatile dose divisors ──
    // Non-volatile weight includes pungency, bitterness AND astringency
    // so cocoa/coffee/tea aren't treated as purely aromatic ingredients
    const nonVolatileWeightRaw = spice.profile.pungency
        + spice.profile.bitterness * 0.7
        + spice.profile.astringency * 0.8;
    const totalWeight = spice.profile.aroma + nonVolatileWeightRaw + 0.01;
    const aromaWeight = spice.profile.aroma / totalWeight;
    const nonVolatileWeight = nonVolatileWeightRaw / totalWeight;

    // Aroma dose: reference / (extraction * form * potency * extractionBoost * amplification * masking * roastAromaPotency * woodToastAroma)
    // masking < 1 → divisor shrinks → dose increases (correct: need more grams when beer masks aroma)
    // roastAromaPotency > 1 → more aromatic potency → divisor grows → dose decreases (correct)
    const aromaDoseDivisor = baseVolatileDoseDivisor * potencyFactor * extractionBoost * aromaAmplification * Math.max(0.4, aromaMasking) * roastAromaPotency * woodToastAroma;

    // Composite non-volatile amplification: pungency, bitterness and astringency
    // are weighted by their share of the non-volatile profile, not by pungency alone.
    const nonVolatileProfileTotal = spice.profile.pungency + spice.profile.bitterness + spice.profile.astringency + 0.01;
    const nonVolatileAmplification = (
        spice.profile.pungency * matrix.perceptionAmplification.pungency
        + spice.profile.bitterness * matrix.perceptionAmplification.bitterness
        + spice.profile.astringency * matrix.perceptionAmplification.astringency
    ) / nonVolatileProfileTotal;

    // Dark roast raises bitterness/astringency → the sensory limit is hit sooner → less product needed
    // Weighted by the ingredient's relative share of bitterness vs astringency
    const roastNonVolatileWeightTotal = spice.profile.bitterness + spice.profile.astringency + 0.01;
    const nonVolatileRoastPenalty = (
        spice.profile.bitterness * roastBitterness
        + spice.profile.astringency * roastAstringency
    ) / roastNonVolatileWeightTotal;

    // Wood toast astringency multiplier (untoasted wood is more astringent)
    const nonVolatileDoseDivisor = baseNonVolatileDoseDivisor * potencyFactor * extractionBoost * nonVolatileAmplification * nonVolatileRoastPenalty * woodToastAstringency;
    const blendedDoseDivisor = aromaDoseDivisor * aromaWeight + nonVolatileDoseDivisor * nonVolatileWeight;

    // ── 10b. Dose divergence check ──
    // Compute individual target doses to detect when aroma and non-volatile pull in opposite directions
    const safeAromaDivisor = Math.max(0.15, aromaDoseDivisor);
    const safeNonVolatileDivisor = Math.max(0.15, nonVolatileDoseDivisor);
    const aromaTargetDose = refRange.recommend * (input.batch_liters / 20) / safeAromaDivisor;
    const nonVolatileTargetDose = refRange.recommend * (input.batch_liters / 20) / safeNonVolatileDivisor;
    const doseDivergence = Math.max(aromaTargetDose, nonVolatileTargetDose)
        / Math.max(0.01, Math.min(aromaTargetDose, nonVolatileTargetDose));

    // ── 11. Chili: intensity-aware SHU-based reference ──
    // Empirical baseline: 1 g dried chili @ 40,000 SHU in 20L ≈ medium intensity
    // (assumes ~65% extraction; actual perception depends on matrix)
    const CHILI_REFERENCE_SHU = 40_000;
    let refMin = refRange.min;
    let refMax = refRange.max;
    let refRec = refRange.recommend;

    if (isChili) {
        const chiliIntensityFactor = { low: 0.4, medium: 1.0, high: 1.8 }[input.intensity];
        if (input.shu) {
            const shuScale = CHILI_REFERENCE_SHU / Math.max(100, input.shu);
            refRec = 1.0 * shuScale * chiliIntensityFactor;
            refMin = refRec * 0.6;
            refMax = refRec * 1.8;
        } else if (input.capsaicinoids_mg_per_g) {
            // Capsaicinoids in mg/g → approximate SHU: 1 mg/g ≈ 15,000 SHU
            const approxShu = input.capsaicinoids_mg_per_g * 15000;
            const shuScale = CHILI_REFERENCE_SHU / Math.max(1500, approxShu);
            refRec = 1.0 * shuScale * chiliIntensityFactor;
            refMin = refRec * 0.6;
            refMax = refRec * 1.8;
        }
    }

    // ── 12. Scale from 20L reference to actual batch size, divide by efficiency ──
    const batchScale = input.batch_liters / 20;
    const divisorWasClamped = blendedDoseDivisor < 0.15;
    const safeDivisor = Math.max(0.15, blendedDoseDivisor);
    // Liquid strength: how concentrated is the cold brew / tincture vs the reference?
    // Reference = 200 g coffee per L water (1:5 ratio). If user provides coffee_grams_per_liter,
    // compute a concentration factor directly. Otherwise accept liquid_strength_relative.
    const COFFEE_REFERENCE_GRAMSPERLITER = 200;
    const liquidStrengthFactor: number = (() => {
        if (input.coffee_grams_per_liter && input.coffee_grams_per_liter > 0) {
            return input.coffee_grams_per_liter / COFFEE_REFERENCE_GRAMSPERLITER;
        }
        if (input.liquid_strength_relative !== undefined && input.liquid_strength_relative > 0) {
            return input.liquid_strength_relative;
        }
        return 1;
    })();
    const doseRecommended = refRec * batchScale / safeDivisor / (isDirectLiquid ? liquidStrengthFactor : 1);
    const doseMin = refMin * batchScale / safeDivisor / (isDirectLiquid ? liquidStrengthFactor : 1);
    const doseMax = refMax * batchScale / safeDivisor / (isDirectLiquid ? liquidStrengthFactor : 1);
    // For liquid doses, the added volume dilutes the batch
    const addedVolumeL = spice.doseUnit === 'ml' ? doseRecommended / 1000 : 0;
    const dilutionPercent = addedVolumeL / input.batch_liters * 100;

    // ── 13. Compute sensory contributions from actual dose ──
    // effectiveDose_gL = dose × deliveredStrength × extraction × relativeForm × potency × extractionBoost / volume
    // For direct liquid doses: dose is already divided by liquidStrengthFactor, so we multiply it back
    // to restore the effective concentration delivered to the beer.
    const deliveredStrengthFactor = isDirectLiquid ? liquidStrengthFactor : 1;
    const effectiveVolatileDoseGL = doseRecommended * deliveredStrengthFactor * effectiveVolatileExtract * relativeVolatileExtract * potencyFactor * extractionBoost / input.batch_liters;
    const effectiveNonVolatileDoseGL = doseRecommended * deliveredStrengthFactor * effectiveNonVolatileExtract * relativeNonVolatileExtract * potencyFactor * extractionBoost / input.batch_liters;

    // Fix #2: spice-specific EC50 derived from reference medium dose.
    // Under reference conditions, medium.recommend g/20L should produce ~50% intensity
    // for the dominant dimension, so "medium" actually maps to a medium contribution.
    // Chili is special: its database doses are zero; use the SHU-scaled dose instead.
    const calibrationMediumDoseG = isChili
        ? (() => {
            const capsaicinoidShu = (input.capsaicinoids_mg_per_g ?? 0) * 15000;
            const effectiveShu = input.shu ?? (capsaicinoidShu > 0 ? capsaicinoidShu : 40_000);
            return 1.0 * CHILI_REFERENCE_SHU / Math.max(100, effectiveShu);
        })()
        : spice.medium.recommend;
    const refMediumDoseGL = Math.max(0.001, calibrationMediumDoseG / 20);
    const refEffectiveVolatileGL = refMediumDoseGL * refEffectiveVolatile;
    const refEffectiveNonVolatileGL = refMediumDoseGL * refEffectiveNonVolatile;
    const halfSatVolatileGL = Math.max(0.001, refEffectiveVolatileGL);
    const halfSatNonVolatileGL = Math.max(0.001, refEffectiveNonVolatileGL);

    // Hill-type saturation curve: intensity = dose^n / (ec50^n + dose^n)
    const hillNAroma = spice.perceptionProfile === 'persistent' ? 2 : 1;
    const hillNNonVolatile = spice.perceptionProfile === 'building' ? 2 : 1;

    const rawAroma = Math.pow(effectiveVolatileDoseGL, hillNAroma) /
        (Math.pow(halfSatVolatileGL, hillNAroma) + Math.pow(effectiveVolatileDoseGL, hillNAroma));
    const rawNonVolatile = Math.pow(effectiveNonVolatileDoseGL, hillNNonVolatile) /
        (Math.pow(halfSatNonVolatileGL, hillNNonVolatile) + Math.pow(effectiveNonVolatileDoseGL, hillNNonVolatile));

    // Apply perception amplification and masking to the raw intensity.
    // Profile is used as relative partition, normalized by the dominant dimension,
    // so "medium" dose produces ~50% on the dominant dimension in reference conditions.
    const dominantProfile = Math.max(
        spice.profile.aroma, spice.profile.pungency, spice.profile.bitterness,
        spice.profile.astringency, spice.profile.cooling, 0.01
    );
    const normAroma = spice.profile.aroma / dominantProfile;
    const normNonVolatile = spice.profile.pungency / dominantProfile;
    const normBitterness = spice.profile.bitterness / dominantProfile;
    const normAstringency = spice.profile.astringency / dominantProfile;
    const normCooling = spice.profile.cooling / dominantProfile;

    const contributions = {
        aroma: clamp01(rawAroma * normAroma * aromaAmplification * aromaMasking * roastAromaPotency * woodToastAroma),
        pungency: clamp01(rawNonVolatile * normNonVolatile * matrix.perceptionAmplification.pungency),
        bitterness: clamp01(rawNonVolatile * normBitterness * matrix.perceptionAmplification.bitterness * roastBitterness),
        astringency: clamp01(rawNonVolatile * normAstringency * matrix.perceptionAmplification.astringency * roastAstringency * woodToastAstringency),
        cooling: clamp01(rawAroma * normCooling * matrix.perceptionAmplification.cooling),
    };

    // ── 12. Confidence ──
    let confidence = 0.80;
    const confidenceNotes: string[] = [];

    if (isChili) {
        if (input.shu) {
            confidence -= 0.10;
            confidenceNotes.push('Variabilità SHU: il valore nominale può differire dal lotto reale fino al 30%.');
        }
        if (input.capsaicinoids_mg_per_g) {
            confidence -= 0.05;
        }
        if (!input.shu && !input.capsaicinoids_mg_per_g) {
            confidence = 0.30;
            confidenceNotes.push('Nessun SHU o capsaicinoidi dichiarati: intervallo ampio e incerto.');
        }
    }

    if (spice.id === 'coffee_ground' && input.intensity === 'high') {
        confidence -= 0.15;
        confidenceNotes.push('Caffè macinato a intensità alta: rischio elevato di sovra-estrazione. Bench trial obbligatorio prima di scalare.');
    }

    if (input.form === 'ground') {
        confidence -= 0.05;
        confidenceNotes.push('Forma macinata: estrazione rapida ma difficile da rimuovere e dosare con precisione.');
    }
    if (input.form === 'fresh') {
        confidence -= 0.10;
        confidenceNotes.push('Fresco: contenuto d\'acqua e potenza variabili con cultivar e stagione.');
    }
    if (input.freshness === 'unknown') {
        confidence -= 0.10;
        confidenceNotes.push('Freschezza / condizione di conservazione sconosciuta: il profilo aromatico potrebbe essere degradato.');
    }
    if (input.freshness === 'older') {
        confidence -= 0.15;
        confidenceNotes.push('Ingrediente conservato a lungo: possibile perdita di aromaticità o alterazione del profilo.');
    }

    // Cold brew concentration not declared
    if (spice.id === 'cold_brew_coffee' && !input.coffee_grams_per_liter && !input.liquid_strength_relative) {
        confidence -= 0.15;
        confidenceNotes.push('Concentrazione del cold brew non dichiarata: la stima assume circa 200 g di caffè per litro d\'acqua (rapporto 1:5).');
    }

    // Cold brew age since preparation
    if (spice.id === 'cold_brew_coffee' && input.prepared_hours_ago !== undefined && input.prepared_hours_ago > 48) {
        confidence -= 0.10;
        confidenceNotes.push(`Cold brew preparato da ${input.prepared_hours_ago} ore: possibile ossidazione e perdita di volatili delicati.`);
    }
    if (input.contact_time_hours > 168) {
        confidence -= 0.05;
        confidenceNotes.push('Contatto prolungato (>7gg): possibile estrazione di tannini e note legnose.');
    }
    if (input.temperature_celsius > 80 && input.stage !== 'boil') {
        confidence -= 0.05;
        confidenceNotes.push('Temperatura >80°C: possibile degradazione termica di alcuni volatili.');
    }

    // Oil range variability
    const oilRange = spice.oilRangePercent;
    if (oilRange && oilRange[0] > 0 && oilRange[1] > 0 && oilRange[1] / oilRange[0] > 3) {
        confidence -= 0.10;
        confidenceNotes.push(`Forte variabilità dell'olio essenziale (${oilRange[0].toFixed(1)}-${oilRange[1].toFixed(1)}%): due lotti possono differire significativamente.`);
    }

    // Divisor clamping: the model thinks the method is extremely inefficient
    if (divisorWasClamped) {
        confidence -= 0.20;
        confidenceNotes.push(
            'Efficienza prevista estremamente bassa: il correttore di sicurezza ha limitato la dose. ' +
            'Cambiare metodo di aggiunta (es. conditioning, tintura) invece di aumentare ulteriormente la quantità.'
        );
    }

    // Dose divergence: aroma and pungency pull in opposite directions
    if (doseDivergence > 2) {
        confidence -= 0.10;
        confidenceNotes.push(
            'Aroma e sensazioni non volatili richiedono dosi molto diverse (fattore ' + doseDivergence.toFixed(1) + '×). ' +
            'La dose proposta è un compromesso: preferire tintura e dosaggio incrementale.'
        );
    }

    confidence = clamp(confidence, 0.1, 0.95);

    // ── 13. Method recommendation ──
    const practicallyRemovable = stage.removable && form.removable;
    const recommendedMethod = isDirectLiquid
        ? 'Aggiungere il concentrato direttamente alla birra finita, preferibilmente nel keg o nel vessel di confezionamento. Mescolare delicatamente, attendere 10–15 minuti e assaggiare prima di aggiungerne altro.'
        : input.stage === 'tincture'
            ? 'Tintura: aggiungere goccia a goccia su campione da 100 mL fino a intensità desiderata, poi scalare al volume totale.'
            : practicallyRemovable
                ? `${stage.label} (${form.label}): aggiungere in sacchetto/sacco per rimozione facile. Assaggiare ogni 12-24 ore. Rimuovere quando l'intensità raggiunge ~80% del target (continuerà a estrarre brevemente dopo la rimozione).`
                : `${stage.label} (${form.label}): metodo non rimovibile. Iniziare con il 70% della dose consigliata, assaggiare dopo 24 ore, aggiungere il resto se necessario.`;

    // ── 14. Adjustment protocol ──
    const sampleLiters = 0.2;
    const sampleDose = doseRecommended * sampleLiters / input.batch_liters;
    const isMicroscopicDose = spice.doseUnit === 'g' && sampleDose < 0.1;

    const adjustmentProtocol = input.stage === 'tincture'
        ? `1. Preparare tintura separata (${spice.name} in alcool neutro 40-50% per 7-14 giorni). 2. Prelevare 100 mL di birra. 3. Aggiungere tintura goccia a goccia, assaggiare. 4. Annotare gocce necessarie. 5. Scalare: (gocce × volume_totale / 100) = gocce totali.`
        : isMicroscopicDose
            ? `1. Preparare una tintura madre con 1,00 g di ${spice.name} in 100 mL di alcool neutro al 40-50%. ` +
            `2. Estrarre 7 giorni, agitando quotidianamente, quindi filtrare. ` +
            `3. La tintura rappresenta ~10 mg/mL di spezia caricata (non necessariamente estratta). ` +
            `4. Prelevare 200 mL di birra. ` +
            `5. Aggiungere ${(sampleDose * 100).toFixed(1)} mL di tintura. ` +
            `6. Mescolare, attendere 10-15 minuti e assaggiare. ` +
            `7. Ripetere a incrementi del 10-20%. ` +
            `Nota: il bench trial con tintura approssima il dosaggio aromatico, ma non necessariamente lo stesso rapporto aroma/amaro/astringenza del contatto diretto.`
            : spice.doseUnit === 'ml'
                ? `1. Preparare un bench trial: prelevare 200 mL di birra. 2. Aggiungere ${sampleDose.toFixed(1)} mL di concentrato. 3. Mescolare, attendere 10-15 minuti e assaggiare. 4. Regolare la dose principale proporzionalmente.`
                : `1. Preparare un bench trial: prelevare 200 mL di birra. 2. Aggiungere ${sampleDose.toFixed(1)} g di spezia. 3. Assaggiare dopo ${input.contact_time_hours <= 12 ? input.contact_time_hours : 12} ore. 4. Regolare la dose principale proporzionalmente. 5. Se possibile, usare infusione rimovibile e assaggiare ogni 12-24 ore.`;

    // ── 15. Risks ──
    const risks = [...spice.risks];
    if (contributions.pungency > 0.6) risks.push('Pungenza elevata. Ridurre del 25% e ri-assaggiare.');
    if (contributions.astringency > 0.5) risks.push('Astringenza significativa. Valutare rimozione anticipata o riduzione dose.');
    if (contributions.bitterness > 0.5 && input.beer_matrix.ibu && input.beer_matrix.ibu > 50) {
        risks.push('Possibile sommatoria sgradevole con amaro del luppolo (>50 IBU).');
    }
    if (matrix.hopOverlapRisk > 0.3 && spice.keyVolatiles.some(v => v.includes('pinene') || v.includes('caryophyllene') || v.includes('limonene'))) {
        risks.push('Rischio di sovrapposizione terpenica con luppoli (pineni, cariofillene, limonene). Può risultare confuso o "verde".');
    }

    // ── 16. Compatibility with other spices ──
    const compatibilityNotes: string[] = [];
    for (const otherName of input.other_spices) {
        const other = findSpice(otherName);
        if (!other || other.id === spice.id) continue;
        const ix = findInteraction(spice.id, other.id);
        if (ix) {
            const emoji = ix.aromaCompatibility > 0.4 ? '✅' : ix.aromaCompatibility > 0 ? '⚠️' : '❌';
            compatibilityNotes.push(`${emoji} **${other.name}**: ${ix.explanation}`);
            if (ix.pungencySynergy > 0.5) {
                risks.push(`Sinergia pungente con ${other.name}. Valutare una riduzione iniziale fino al ${Math.round(ix.pungencySynergy * 50)}% se l'altra spezia è già dosata a intensità media o alta.`);
            }
            if (ix.bitternessRisk > 0.5) {
                risks.push(`Rischio amaro cumulativo con ${other.name}. Considerare rimozione anticipata.`);
            }
            if (ix.astringencyRisk > 0.6) {
                risks.push(`Alta astringenza cumulativa con ${other.name}. Ridurre le dosi o scegliere una sola spezia dominante.`);
            }
        } else {
            compatibilityNotes.push(`ℹ️ **${other.name}**: nessun dato di interazione specifico. Procedere con bench trial.`);
        }
    }

    // ── 17. Tips ──
    const tips: string[] = [];
    if (input.stage === 'boil') tips.push('Bollitura: aggiungere a -5 minuti per preservare i volatili più delicati.');
    if (input.stage === 'whirlpool') tips.push('Whirlpool: 15-30 min a 80-90°C è il punto ottimale per molte spezie.');
    if (input.form === 'ground') tips.push('Polvere: difficile da rimuovere. Considerare filtrazione fine o cold crash prima del confezionamento.');
    if (input.form === 'whole' && input.stage !== 'boil') tips.push('Intero: schiacciare o spezzare leggermente prima dell\'uso per favorire l\'estrazione.');
    if (input.beer_matrix.roastIntensity > 0.3) tips.push('I malti tostati mascherano gli aromi delicati. Il dosaggio proposto include già una correzione per questo effetto; confermare comunque tramite bench trial.');
    if (input.beer_matrix.acidity > 0.3) tips.push('Birra acida: esalta freschezza e agrumi ma può rendere aggressivi zenzero, peperoncino e chiodo di garofano.');

    return {
        doseRecommended: Math.round(doseRecommended * 10) / 10,
        doseMin: Math.round(doseMin * 10) / 10,
        doseMax: Math.round(doseMax * 10) / 10,
        doseUnit: spice.doseUnit,
        dilutionPercent: spice.doseUnit === 'ml' ? Math.round(dilutionPercent * 10) / 10 : undefined,
        contributions: {
            aroma: Math.round(contributions.aroma * 100),
            pungency: Math.round(contributions.pungency * 100),
            bitterness: Math.round(contributions.bitterness * 100),
            astringency: Math.round(contributions.astringency * 100),
            cooling: Math.round(contributions.cooling * 100),
        },
        confidence,
        confidenceNotes,
        recommendedMethod,
        adjustmentProtocol,
        risks: [...new Set(risks)],
        compatibilityNotes,
        tips: [...new Set(tips)],
    };
}

function buildChiliUnknownResult(spice: SpiceInfo, input: SpiceCalcInput): SpiceDoseOutput {
    return {
        doseRecommended: 0,
        doseMin: 0,
        doseMax: 0,
        doseUnit: spice.doseUnit,
        contributions: { aroma: 0, pungency: 0, bitterness: 0, astringency: 0, cooling: 0 },
        confidence: 0.15,
        confidenceNotes: [
            'IMPOSSIBILE DOSARE senza SHU o capsaicinoidi_mg_per_g.',
            'La capsaicina varia di oltre 100× tra varietà (es. habanero vs ancho).',
            'Fornire il valore SHU della varietà o il contenuto di capsaicinoidi per una stima utile.',
        ],
        recommendedMethod: 'Bench trial obbligatorio: preparare una tintura o infusione separata e aggiungere goccia a goccia su un campione misurato.',
        adjustmentProtocol: '1. Identificare la varietà e il suo SHU. 2. Preparare tintura con 2-5 g di peperoncino secco in 50 mL alcool 50% per 7 gg. 3. Aggiungere goccia a goccia a 100 mL di birra. 4. Scalare dal numero di gocce.',
        risks: [
            ...spice.risks,
            'Senza SHU, anche un "peperoncino medio" può variare da impercettibile a incontrollabile.',
        ],
        compatibilityNotes: [],
        tips: [
            'Per birre commerciali, usare estratto standardizzato di capsaicina per ripetibilità.',
            'Ancho/pasilla/guajillo: poco piccanti, più aromatici.',
            'Cayenne/thai: mediamente piccanti.',
            'Habanero/scotch bonnet/ghost: estremamente piccanti.',
        ],
    };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function clamp01(v: number): number {
    return Math.max(0, Math.min(1, v));
}

function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
}

function contributionLabel(v: number): string {
    if (v >= 75) return 'molto alto';
    if (v >= 55) return 'alto';
    if (v >= 35) return 'medio';
    if (v >= 15) return 'basso';
    return 'molto basso';
}

function confidenceLabel(c: number): string {
    if (c >= 0.75) return 'alta';
    if (c >= 0.50) return 'media';
    if (c >= 0.30) return 'bassa';
    return 'molto bassa';
}

// ── Formatting ───────────────────────────────────────────────────────────────

function formatSpiceResults(input: SpiceCalcInput, showDetails: boolean): string {
    const lines: string[] = [];
    lines.push(`# � Botanical Adjunct Calculator: ${input.spice_name} in ${input.batch_liters}L`);
    lines.push('');

    const matches = findAllSpiceMatches(input.spice_name);
    if (matches.length === 0) {
        lines.push(`⚠️ **"${input.spice_name}" non trovato.** Ingredienti disponibili:`);
        for (const s of SPICES) lines.push(`- ${s.name}`);
        return lines.join('\n');
    }

    const spice = matches[0]!;
    const ambiguous = matches.length > 1 ? matches.slice(1).map(s => s.name) : [];
    const result = computeSpiceDose(input);
    const formLabel = FORMS[input.form].label;
    const stageLabel = STAGES[input.stage].label;

    // ── Header ──
    lines.push('## 📊 Parametri');
    lines.push('');
    lines.push('| Parametro | Valore |');
    lines.push('|---|---|');
    lines.push(`| Ingrediente | **${spice.name}** |`);
    if (ambiguous.length > 0) lines.push(`| ⚠️ Ambiguità | Trovati anche: ${ambiguous.join(', ')}. Specifica il nome esatto. |`);
    lines.push(`| Intensità desiderata | **${input.intensity === 'low' ? 'Bassa' : input.intensity === 'medium' ? 'Media' : 'Alta'}** |`);
    lines.push(`| Forma | ${formLabel} |`);
    lines.push(`| Stadio | ${stageLabel} |`);
    lines.push(`| Tempo di contatto | ${input.contact_time_hours} ore |`);
    lines.push(`| Temperatura | ${input.temperature_celsius}°C |`);
    lines.push(`| Freschezza | ${input.freshness === 'freshly_cracked' ? 'Appena aperto, macinato o preparato' : input.freshness === 'recent' ? 'Recente / ben conservato' : input.freshness === 'older' ? 'Conservazione prolungata' : 'Condizione sconosciuta'} |`);
    lines.push(`| Volume birra | ${input.batch_liters} L |`);
    lines.push(`| ABV | ${input.beer_matrix.abv}% |`);
    if (input.beer_matrix.finalGravity) lines.push(`| FG | ${input.beer_matrix.finalGravity.toFixed(3)} |`);
    if (input.beer_matrix.ibu) lines.push(`| IBU | ${input.beer_matrix.ibu} |`);
    if (input.beer_matrix.roastIntensity > 0) lines.push(`| Intensità tostato | ${(input.beer_matrix.roastIntensity * 100).toFixed(0)}% |`);
    if (input.beer_matrix.hopAromaIntensity > 0) lines.push(`| Aroma luppolo | ${(input.beer_matrix.hopAromaIntensity * 100).toFixed(0)}% |`);
    if (input.beer_matrix.acidity > 0) lines.push(`| Acidità | ${(input.beer_matrix.acidity * 100).toFixed(0)}% |`);
    if (isChiliInput(input)) {
        if (input.shu) lines.push(`| SHU | ${input.shu} |`);
        if (input.capsaicinoids_mg_per_g) lines.push(`| Capsaicinoidi | ${input.capsaicinoids_mg_per_g} mg/g |`);
    }
    if (input.roast_level) lines.push(`| Livello tostatura | ${input.roast_level} |`);
    if (input.other_spices.length > 0) lines.push(`| Altri ingredienti | ${input.other_spices.join(', ')} |`);
    lines.push('');

    // ── Dosage ──
    const fmtUnit = result.doseUnit === 'ml' ? 'mL' : 'g';
    const fmtPerLiter = result.doseUnit === 'ml' ? 'mL/L' : 'g/L';
    lines.push('## 🎯 Dosaggio consigliato');
    lines.push('');
    lines.push(`| | ${result.doseUnit === 'ml' ? 'Millilitri' : 'Grammi'} | ${fmtPerLiter} |`);
    lines.push(`|---|---|---|`);
    if (result.doseRecommended > 0) {
        lines.push(`| **Consigliato** | **${result.doseRecommended.toFixed(1)} ${fmtUnit}** | ${(result.doseRecommended / input.batch_liters).toFixed(2)} ${fmtPerLiter} |`);
        lines.push(`| Min | ${result.doseMin.toFixed(1)} ${fmtUnit} | ${(result.doseMin / input.batch_liters).toFixed(2)} ${fmtPerLiter} |`);
        lines.push(`| Max | ${result.doseMax.toFixed(1)} ${fmtUnit} | ${(result.doseMax / input.batch_liters).toFixed(2)} ${fmtPerLiter} |`);
    } else {
        lines.push(`| **Consigliato** | **NON DETERMINABILE** | — |`);
        lines.push(`| Min | NON DETERMINABILE | — |`);
        lines.push(`| Max | NON DETERMINABILE | — |`);
    }
    lines.push('');
    if (result.dilutionPercent !== undefined && result.dilutionPercent > 0) {
        lines.push(`> 💧 Il concentrato aggiunge **~${result.dilutionPercent.toFixed(1)}%** di volume al batch: considerare la diluizione nel calcolo di ABV e densità.`);
        lines.push('');
    }
    lines.push(`**Confidenza:** ${confidenceLabel(result.confidence)} (${(result.confidence * 100).toFixed(0)}%)`);
    lines.push('');
    lines.push('> ⚠️ Intervallo indicativo basato su euristiche sensoriali ed empiriche. La potenza reale dipende dal lotto specifico, dall\'origine e dalla cultivar. **Fare sempre un bench trial.**');

    if (result.confidenceNotes.length > 0) {
        lines.push('');
        lines.push('### Fattori che riducono la confidenza');
        for (const n of result.confidenceNotes) {
            lines.push(`- ${n}`);
        }
    }
    lines.push('');

    // ── Sensory contributions (detail section) ──
    if (showDetails) {
        lines.push('## 👃 Contributi sensoriali attesi');
        lines.push('');
        lines.push('| Dimensione | Intensità |');
        lines.push('|---|---|');
        lines.push(`| Aroma | ${contributionLabel(result.contributions.aroma)} (${result.contributions.aroma}%) |`);
        lines.push(`| Pungenza / calore | ${contributionLabel(result.contributions.pungency)} (${result.contributions.pungency}%) |`);
        lines.push(`| Amaro | ${contributionLabel(result.contributions.bitterness)} (${result.contributions.bitterness}%) |`);
        lines.push(`| Astringenza | ${contributionLabel(result.contributions.astringency)} (${result.contributions.astringency}%) |`);
        lines.push(`| Raffrescante | ${contributionLabel(result.contributions.cooling)} (${result.contributions.cooling}%) |`);
        lines.push('');
    }

    // ── Method recommendation ──
    lines.push('## 🔧 Metodo consigliato');
    lines.push('');
    lines.push(`> ${result.recommendedMethod}`);
    lines.push('');

    // ── Protocol ──
    lines.push('### Protocollo di aggiustamento');
    lines.push('');
    lines.push(result.adjustmentProtocol);
    lines.push('');

    // ── Compatibility (detail section) ──
    if (showDetails && result.compatibilityNotes.length > 0) {
        lines.push('## 🔗 Compatibilità con altri ingredienti');
        lines.push('');
        for (const c of result.compatibilityNotes) {
            lines.push(`- ${c}`);
        }
        lines.push('');
    }

    // ── Tips ──
    if (result.tips.length > 0) {
        lines.push('## 💡 Consigli');
        lines.push('');
        for (const t of result.tips) {
            lines.push(`- ${t}`);
        }
        lines.push('');
    }

    // ── Risks ──
    if (result.risks.length > 0) {
        lines.push('## ⚠️ Rischi');
        lines.push('');
        for (const r of result.risks) {
            lines.push(`- ${r}`);
        }
        lines.push('');
    }

    // ── Key compounds (detail section) ──
    if (showDetails) {
        lines.push('## 🧪 Profilo chimico indicativo');
        lines.push('');
        lines.push(`**Volatili principali:** ${spice.keyVolatiles.join(', ')}`);
        lines.push(`**Attivi non volatili:** ${spice.keyActives.join(', ')}`);
        if (spice.oilRangePercent) {
            lines.push(`**Olio essenziale:** ~${spice.oilRangePercent[0].toFixed(1)}–${spice.oilRangePercent[1].toFixed(1)}% (variabile con origine e cultivar)`);
        }
        if (spice.fatRangePercent) {
            lines.push(`**Lipidi / grassi:** ~${spice.fatRangePercent[0].toFixed(1)}–${spice.fatRangePercent[1].toFixed(1)}% (può influenzare ritenzione schiuma)`);
        }
        if (spice.perceptionProfile === 'building') lines.push('**Profilo percettivo:** si accumula gradualmente — non giudicare dal primo assaggio.');
        if (spice.perceptionProfile === 'persistent') lines.push('**Profilo percettivo:** molto persistente — può dominare anche a dosi moderate.');
        lines.push('');

        // ── Sensory profile radar summary (detail) ──
        lines.push('### Profilo sensoriale di riferimento');
        lines.push('');
        const p = spice.profile;
        lines.push('```');
        lines.push(`Aroma:      ${'█'.repeat(Math.round(p.aroma * 20))}${'░'.repeat(20 - Math.round(p.aroma * 20))}`);
        lines.push(`Pungenza:   ${'█'.repeat(Math.round(p.pungency * 20))}${'░'.repeat(20 - Math.round(p.pungency * 20))}`);
        lines.push(`Amaro:      ${'█'.repeat(Math.round(p.bitterness * 20))}${'░'.repeat(20 - Math.round(p.bitterness * 20))}`);
        lines.push(`Astringenza:${'█'.repeat(Math.round(p.astringency * 20))}${'░'.repeat(20 - Math.round(p.astringency * 20))}`);
        lines.push(`Raffrescante:${'█'.repeat(Math.round(p.cooling * 20))}${'░'.repeat(20 - Math.round(p.cooling * 20))}`);
        lines.push('```');
        lines.push('');

        // ── All intensities table (detail) ──
        const refUnit = spice.doseUnit === 'ml' ? 'mL' : 'g';
        lines.push('## 📋 Tabella per tutte le intensità');
        lines.push('');
        lines.push(`| Intensità | ${refUnit} (per 20L, forma di riferimento) | Note |`);
        lines.push('|---|---|---|');
        lines.push(`| Bassa | ${spice.low.min}–${spice.low.max} ${refUnit} | ${spice.low.recommend > 0 ? `consigliato ~${spice.low.recommend} ${refUnit}` : 'non determinabile senza SHU'} |`);
        lines.push(`| Media | ${spice.medium.min}–${spice.medium.max} ${refUnit} | ${spice.medium.recommend > 0 ? `consigliato ~${spice.medium.recommend} ${refUnit}` : 'non determinabile senza SHU'} |`);
        lines.push(`| Alta | ${spice.high.min}–${spice.high.max} ${refUnit} | ${spice.high.recommend > 0 ? `consigliato ~${spice.high.recommend} ${refUnit}` : 'non determinabile senza SHU'} |`);
        lines.push('');
        lines.push(`*Forma di riferimento: ${FORMS[spice.referenceForm].label} — ${spice.notes}*`);
        lines.push('');
    }

    lines.push('---');
    lines.push('*I dosaggi sono punti di partenza basati su euristiche sensoriali ed empiriche. La composizione chimica degli oli essenziali varia con origine, cultivar, annata e conservazione. Regola sempre in base al tuo lotto specifico e fai bench trial.*');

    return lines.join('\n');
}

function isChiliInput(input: SpiceCalcInput): boolean {
    const matches = findAllSpiceMatches(input.spice_name);
    return matches.length > 0 && matches[0]!.id === 'chili';
}

// ── Input schema ─────────────────────────────────────────────────────────────

export const SpiceCalculatorInputSchema = z.object({
    ingredient_name: z.string().trim().min(1).optional().describe('Nome dell\'ingrediente botanico in italiano. Es: "Pepe nero", "Coriandolo", "Cold brew coffee". Alternativa preferita a spice_name.'),
    spice_name: z.string().trim().min(1).optional().describe('Alias legacy di ingredient_name (deprecato, usare ingredient_name).'),
    batch_liters: z.number().positive().describe('Volume della birra a cui aggiungere la spezia (L).'),
    intensity: z.enum(['low', 'medium', 'high']).default('medium').describe('Intensità desiderata: low, medium, high.'),
    form: z.enum(['whole', 'cracked', 'ground', 'fresh', 'dried']).default('cracked').describe('Forma fisica della spezia.'),
    stage: z.enum(['mash', 'boil', 'whirlpool', 'fermentation', 'conditioning', 'keg', 'tincture']).default('conditioning').describe('Stadio di aggiunta.'),
    contact_time_hours: z.number().positive().default(72).describe('Tempo di contatto previsto in ore (es. 72 per 3 giorni).'),
    temperature_celsius: z.number().min(0).max(100).default(20).describe('Temperatura durante il contatto (°C).'),
    freshness: z.enum(['freshly_cracked', 'recent', 'older', 'unknown']).default('recent').describe('Freschezza della spezia.'),
    capsaicinoids_mg_per_g: z.number().positive().optional().describe('Solo per peperoncino: capsaicinoidi in mg/g.'),
    shu: z.number().positive().optional().describe('Solo per peperoncino: gradi Scoville (SHU).'),
    roast_level: z.enum(['light', 'medium', 'dark']).optional().describe('Livello di tostatura per cacao e caffè: light, medium, dark.'),
    wood_toast_level: z.enum(['untoasted', 'light', 'medium', 'heavy']).optional().describe('Livello di tostatura per legni (rovere): untoasted, light, medium, heavy.'),
    liquid_strength_relative: z.number().positive().optional().describe('Per dosi liquide: concentrazione relativa vs riferimento (1.0 = cold brew 1:5).'),
    coffee_grams_per_liter: z.number().positive().optional().describe('Per cold brew: grammi di caffè per litro d\'acqua usati nella preparazione.'),
    prepared_hours_ago: z.number().min(0).optional().describe('Per dosi liquide: ore trascorse dalla preparazione del concentrato.'),
    abv: z.number().min(0).max(20).default(5).describe('ABV della birra (%).'),
    final_gravity: z.number().min(1.000).max(1.200).optional().describe('Gravità finale (es. 1.012).'),
    ibu: z.number().min(0).max(200).optional().describe('IBU della birra.'),
    roast_intensity: z.number().min(0).max(1).default(0).describe('Intensità dei malti tostati (0-1).'),
    hop_aroma_intensity: z.number().min(0).max(1).default(0).describe('Intensità aromatica del luppolo (0-1).'),
    acidity: z.number().min(0).max(1).default(0).describe('Acidità percepita (0-1, 0=non acida).'),
    other_spices: z.array(z.string().trim().min(1)).default([]).describe('Altri ingredienti botanici già presenti nella ricetta.'),
    other_adjuncts: z.array(z.string().trim().min(1)).optional().describe('Alias di other_spices (uniti durante la risoluzione).'),
    show_details: z.boolean().default(true).describe('Mostra dettagli completi.'),
}).superRefine((input, ctx) => {
    if (!input.ingredient_name && !input.spice_name) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['ingredient_name'],
            message: 'Fornire ingredient_name (o l\'alias legacy spice_name).',
        });
    }
    if (input.stage === 'mash' && input.contact_time_hours > 3) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['contact_time_hours'],
            message: 'In mash il tempo di contatto è limitato dalla durata del mash (tipicamente ≤2 ore).',
        });
    }
    if (input.stage === 'boil' && input.contact_time_hours > 3) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['contact_time_hours'],
            message: 'In bollitura il tempo di contatto è limitato dalla durata della bollitura (tipicamente ≤2 ore).',
        });
    }
});

export type SpiceCalculatorInput = z.infer<typeof SpiceCalculatorInputSchema>;

// ── Tool ─────────────────────────────────────────────────────────────────────

const SPICE_CALCULATOR_PARAMETERS: Record<string, unknown> = {
    type: 'object',
    properties: {
        ingredient_name: { type: 'string', description: 'Nome dell\'ingrediente botanico in italiano. Es: "Pepe nero", "Coriandolo", "Cacao in granella", "Cold brew coffee".' },
        spice_name: { type: 'string', description: 'Alias legacy di ingredient_name (deprecato).' },
        batch_liters: { type: 'number', exclusiveMinimum: 0, description: 'Volume della birra a cui aggiungere la spezia (L).' },
        intensity: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium', description: 'Intensità desiderata: low (bassa), medium (media), high (alta).' },
        form: { type: 'string', enum: ['whole', 'cracked', 'ground', 'fresh', 'dried'], default: 'cracked', description: 'Forma fisica: whole (intero), cracked (spezzato), ground (macinato), fresh (fresco), dried (essiccato).' },
        stage: { type: 'string', enum: ['mash', 'boil', 'whirlpool', 'fermentation', 'conditioning', 'keg', 'tincture'], default: 'conditioning', description: 'Stadio di aggiunta: mash, boil (bollitura), whirlpool, fermentation, conditioning (maturazione/dry-spice), keg (fusto), tincture (tintura separata).' },
        contact_time_hours: { type: 'number', exclusiveMinimum: 0, default: 72, description: 'Tempo di contatto previsto in ore (es. 72 per 3 giorni).' },
        temperature_celsius: { type: 'number', minimum: 0, maximum: 100, default: 20, description: 'Temperatura durante il contatto (°C).' },
        freshness: { type: 'string', enum: ['freshly_cracked', 'recent', 'older', 'unknown'], default: 'recent', description: 'Freschezza: freshly_cracked (appena spezzata), recent (recente), older (non freschissima), unknown (sconosciuta).' },
        capsaicinoids_mg_per_g: { type: 'number', exclusiveMinimum: 0, description: 'Solo per peperoncino: contenuto di capsaicinoidi in mg/g.' },
        shu: { type: 'number', exclusiveMinimum: 0, description: 'Solo per peperoncino: gradi Scoville (SHU). Es: cayenna ~40000, habanero ~200000.' },
        roast_level: { type: 'string', enum: ['light', 'medium', 'dark'], description: 'Livello di tostatura per caffè/cacao: light (chiaro), medium (medio), dark (scuro).' },
        wood_toast_level: { type: 'string', enum: ['untoasted', 'light', 'medium', 'heavy'], description: 'Livello di tostatura per legni (rovere): untoasted, light, medium, heavy.' },
        liquid_strength_relative: { type: 'number', exclusiveMinimum: 0, description: 'Per dosi liquide: concentrazione relativa vs riferimento (1.0 = cold brew 1:5).' },
        coffee_grams_per_liter: { type: 'number', exclusiveMinimum: 0, description: 'Per cold brew: grammi di caffè per litro d\'acqua usati nella preparazione.' },
        prepared_hours_ago: { type: 'number', minimum: 0, description: 'Per dosi liquide: ore trascorse dalla preparazione del concentrato.' },
        abv: { type: 'number', minimum: 0, maximum: 20, default: 5, description: 'ABV della birra (%).' },
        final_gravity: { type: 'number', minimum: 1.000, maximum: 1.200, description: 'Gravità finale (es. 1.012). Opzionale.' },
        ibu: { type: 'number', minimum: 0, maximum: 200, description: 'IBU della birra. Opzionale.' },
        roast_intensity: { type: 'number', minimum: 0, maximum: 1, default: 0, description: 'Intensità dei malti tostati (0 = nessuno, 1 = molto tostato).' },
        hop_aroma_intensity: { type: 'number', minimum: 0, maximum: 1, default: 0, description: 'Intensità aromatica del luppolo (0 = nessuna, 1 = molto luppolata).' },
        acidity: { type: 'number', minimum: 0, maximum: 1, default: 0, description: 'Acidità percepita (0 = non acida, 1 = molto acida).' },
        other_spices: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
            default: [],
            description: 'Altri ingredienti botanici già presenti nella ricetta per analisi di compatibilità.',
        },
        other_adjuncts: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
            description: 'Alias di other_spices.',
        },
        show_details: { type: 'boolean', default: true, description: 'Mostra dettagli completi (contributi sensoriali, profilo chimico, rischi).' },
    },
    required: ['batch_liters'],
    additionalProperties: false,
};

export class BotanicalAdjunctCalculatorTool implements BuiltinTool<SpiceCalculatorInput> {
    readonly name = 'botanical_adjunct_calculator' as const;
    readonly description = 'Stima il dosaggio di ingredienti botanici per birra: spezie, scorze, cacao, caffè, tè, erbe, legni. Separa dose aromatica (volatili) dalla dose chemestetica (pungenza, calore). Considera forma, stadio, tempo, temperatura, matrice della birra, interazioni e freschezza. Supporta parametri specifici per categoria: SHU per peperoncino, roast_level per caffè/cacao. Restituisce intervallo con confidenza e protocollo di aggiustamento incrementale.';
    readonly parameters = SPICE_CALCULATOR_PARAMETERS;

    resolveExecution(args: SpiceCalculatorInput): ToolExecution {
        const resolvedName = args.ingredient_name ?? args.spice_name ?? '';
        const resolvedOthers = [
            ...new Set([
                ...(args.other_spices ?? []),
                ...(args.other_adjuncts ?? []),
            ].map(s => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase())),
        ];
        return {
            description: `Botanical calc: ${resolvedName} @ ${args.intensity}`,
            approvalRule: this.name,
            execute: () => {
                try {
                    const input: SpiceCalcInput = {
                        spice_name: resolvedName,
                        batch_liters: args.batch_liters,
                        intensity: args.intensity ?? 'medium',
                        form: args.form ?? 'cracked',
                        stage: args.stage ?? 'conditioning',
                        contact_time_hours: args.contact_time_hours ?? 72,
                        temperature_celsius: args.temperature_celsius ?? 20,
                        freshness: args.freshness ?? 'recent',
                        capsaicinoids_mg_per_g: args.capsaicinoids_mg_per_g,
                        shu: args.shu,
                        roast_level: args.roast_level,
                        wood_toast_level: args.wood_toast_level,
                        liquid_strength_relative: args.liquid_strength_relative,
                        coffee_grams_per_liter: args.coffee_grams_per_liter,
                        prepared_hours_ago: args.prepared_hours_ago,
                        beer_matrix: {
                            abv: args.abv ?? 5,
                            finalGravity: args.final_gravity,
                            ibu: args.ibu,
                            roastIntensity: args.roast_intensity ?? 0,
                            hopAromaIntensity: args.hop_aroma_intensity ?? 0,
                            acidity: args.acidity ?? 0,
                        },
                        other_spices: resolvedOthers,
                    };
                    return Promise.resolve({ output: formatSpiceResults(input, args.show_details) });
                } catch (e) {
                    return Promise.resolve({ isError: true, output: e instanceof Error ? e.message : String(e) });
                }
            },
        };
    }
}

registerTool(BotanicalAdjunctCalculatorTool);
