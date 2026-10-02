import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as yaml from 'js-yaml';

import { parseYamlRecipe, type ParsedRecipe } from './yaml-validator';

export type DocumentPhase =
  | 'preparation'
  | 'water'
  | 'mash'
  | 'sparge'
  | 'boil'
  | 'post_boil'
  | 'cooling'
  | 'fermentation'
  | 'packaging';

export interface TargetValue {
  readonly label: string;
  readonly value: string;
}

export interface MeasurementField {
  readonly label: string;
  readonly unit?: string;
}

export interface OperationalAction {
  readonly phase: DocumentPhase;
  readonly order: number;
  readonly moment: string;
  readonly action: string;
  readonly ingredient?: string;
  readonly quantity?: string;
  readonly temperature?: string;
  readonly duration?: string;
  readonly note?: string;
}

export interface OperationalSection {
  readonly phase: DocumentPhase;
  readonly title: string;
  readonly actions: OperationalAction[];
  readonly targets: TargetValue[];
  readonly measurements: MeasurementField[];
  readonly warnings: string[];
  readonly notes: string[];
}

export interface RecipeDocumentModel {
  readonly schemaVersion: string;
  readonly metadata: {
    readonly name: string;
    readonly style: string;
    readonly brewDate: MeasurementField;
    readonly equipment?: string;
    readonly description?: string;
  };
  readonly objectives: TargetValue[];
  readonly summaryTargets: TargetValue[];
  readonly sections: OperationalSection[];
  readonly notes: string[];
  readonly alternatives: string[];
  readonly unmappedFields: string[];
}

export interface RecipeDocumentResult {
  readonly model: RecipeDocumentModel;
  readonly recipe: ParsedRecipe;
}

type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function formatNumber(value: number | undefined, digits = 2): string | undefined {
  return value === undefined ? undefined : Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

function quantity(value: unknown, unit: string): string | undefined {
  const n = num(value);
  return n === undefined ? undefined : `${formatNumber(n)} ${unit}`;
}

function firstText(source: RecordValue, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = text(source[key]);
    if (value) return value;
  }
  return undefined;
}

function firstNumber(source: RecordValue, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = num(source[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function numberFromText(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const match = value.match(/-?\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(',', '.')) : undefined;
}

interface RawBoilAddition {
  ingredient: string;
  grams?: number;
  use: string;
  form?: string;
  timeMinutes?: number;
  durationMinutes?: number;
  temperatureC?: number;
  note?: string;
}

function rawBoilAdditions(raw: RecordValue): RawBoilAddition[] {
  const boil = record(raw['bollitura']);
  const additions = Array.isArray(boil['aggiunte_bollitura']) ? boil['aggiunte_bollitura'] : [];
  return additions.map(item => {
    const addition = record(item);
    return {
      ingredient: text(addition['ingrediente']) ?? 'Aggiunta non nominata',
      grams: num(addition['grammi']),
      use: text(addition['uso']) ?? 'boil',
      form: text(addition['forma']),
      timeMinutes: num(addition['tempo_min']),
      durationMinutes: num(addition['durata_whirlpool_min']),
      temperatureC: num(addition['temperatura_whirlpool_c']),
      note: text(addition['nota']),
    };
  });
}

function target(label: string, value: unknown, suffix = ''): TargetValue | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return { label, value: `${String(value)}${suffix}` };
}

function measurement(label: string, unit?: string): MeasurementField {
  return { label, unit };
}

function section(phase: DocumentPhase, title: string): OperationalSection {
  return { phase, title, actions: [], targets: [], measurements: [], warnings: [], notes: [] };
}

function requireValue(errors: string[], value: unknown, path: string): void {
  if (value === undefined || value === null || value === '') errors.push(path);
}

function saltActions(phase: 'water', salts: ParsedRecipe['mash_salts'] | undefined, moment: string, order: number): OperationalAction[] {
  if (!salts) return [];
  const definitions: Array<[keyof NonNullable<ParsedRecipe['mash_salts']>, string, string]> = [
    ['gypsum_g', 'Gesso', 'g'], ['cacl2_g', 'Cloruro di calcio', 'g'], ['epsom_g', 'Sale di Epsom', 'g'],
    ['nahco3_g', 'Bicarbonato', 'g'], ['lactic_acid_ml', 'Acido lattico', 'mL'],
  ];
  return definitions.flatMap(([key, label, unit]) => {
    const value = salts[key];
    return value === undefined ? [] : [{ phase, order, moment, action: 'Aggiungere al trattamento', ingredient: label, quantity: quantity(value, unit) }];
  });
}

function nestedUnmappedFields(raw: RecordValue): string[] {
  const allowed: Record<string, string[]> = {
    parametri: ['batch_size_litri', 'og', 'fg', 'ibu', 'ebc', 'abv_percent', 'efficienza_percent', 'bollitura_min', 'pre_boil_litri', 'post_boil_litri', 'fermentatore_litri', 'confezionamento_litri', 'carbonazione_vol', 'priming_gl', 'priming_totale_g', 'priming_total_g', 'impianto', 'bu_gu', 'colore', 'corpo', 'volume_fermentatore'],
    mash: ['tipo', 'temperatura_c', 'temperatura_in_c', 'temperatura_strike_c', 'durata_min', 'steps', 'acqua_strike_litri', 'spessore_l_kg', 'ph_target', 'sparge', 'note', 'nota'],
    bollitura: ['durata_min', 'volume_pre_boil_litri', 'volume_post_boil_litri', 'perdita_evaporazione_litri', 'perdita_trub_litri', 'og_pre_boil', 'og_post_boil', 'whirlpool', 'whirlpool_temperatura_c', 'whirlpool_temp_c', 'whirlpool_durata_min', 'hop_stand_temperatura_c', 'aggiunte_bollitura', 'nota'],
    fermentazione: ['temperatura_c', 'temperatura_controllo', 'primaria_giorni', 'madurazione_giorni', 'cold_crash', 'cold_crash_giorni', 'cold_crash_temp_c', 'dry_hop_giorno', 'steps', 'note', 'nota'],
    carbonazione: ['metodo', 'zucchero_tipo', 'zucchero_grammi', 'zucchero_g_per_litro', 'co2_volumi', 'temperatura_servizio_c', 'tipo_botella', 'priming_gl', 'priming_totale_g', 'priming_total_g', 'zucchero_totale_g', 'preparazione'],
    lievito: ['ceppo', 'forma', 'quantita_ml', 'quantita_g', 'quantita', 'attenuazione_percent', 'laboratorio', 'temp_min_c', 'temp_max_c', 'temperatura_inoculo_c', 'temp_inoculo_c', 'temperatura_fermentazione', 'durata_primaria_giorni', 'note'],
    acqua: ['fonte', 'profilo_originale', 'sales', 'mash_litri', 'mash_agua_litri', 'strike_litri', 'sparge_litri', 'sparge_agua_litri', 'total_litri', 'total_agua_litri', 'ca', 'mg', 'na', 'cl', 'so4', 'hco3', 'ca_mg_l', 'mg_mg_l', 'na_mg_l', 'cl_mg_l', 'so4_mg_l', 'hco3_mg_l', 'rapporto_so4_cl', 'ph_target', 'nota'],
    sparge: ['sparge_litri', 'volumen_litri', 'litri', 'temperatura_c', 'temperature_c', 'procedura'],
    mash_salts: ['gesso_g', 'gypsum_g', 'gesso', 'cacl2_g', 'cacl2', 'epsom_g', 'epsom', 'nahco3_g', 'nahco3', 'acido_lactico_ml', 'lactic_acid_ml', 'acido_lactico'],
    sparge_salts: ['gesso_g', 'gypsum_g', 'gesso', 'cacl2_g', 'cacl2', 'epsom_g', 'epsom', 'nahco3_g', 'nahco3', 'acido_lactico_ml', 'lactic_acid_ml', 'acido_lactico'],
  };
  const fields: string[] = [];
  for (const [parent, keys] of Object.entries(allowed)) {
    const value = record(raw[parent]);
    for (const key of Object.keys(value)) if (!keys.includes(key)) fields.push(`${parent}.${key}`);
  }
  return fields;
}

function parseObjectives(raw: RecordValue): TargetValue[] {
  const value = raw['obiettivi_sensoriali'];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string').map(item => ({ label: 'Obiettivo sensoriale', value: item }));
  if (typeof value === 'string') return [{ label: 'Obiettivo sensoriale', value }];
  return [];
}

function buildModel(recipe: ParsedRecipe, raw: RecordValue): RecipeDocumentModel {
  const params = record(raw['parametri']);
  const mashRaw = record(raw['mash']);
  const waterRaw = record(raw['acqua'] ?? raw['agua']);
  const boilRaw = record(raw['bollitura']);
  const fermentationRaw = record(raw['fermentazione']);
  const packagingRaw = record(raw['confezionamento']);
  const carbonationRaw = record(raw['carbonazione']);
  const boilAdditions = rawBoilAdditions(raw);
  const sections: OperationalSection[] = [];

  const preparation = section('preparation', 'Preparazione degli ingredienti');
  recipe.grain_bill.forEach(grain => preparation.actions.push({
    phase: 'preparation', order: 10, moment: 'Prima della cotta', action: 'Preparare il malto', ingredient: grain.malt,
    quantity: quantity(grain.kg, 'kg'), note: [grain.percent !== undefined ? `${grain.percent}%` : undefined, grain.note].filter(Boolean).join(' — ') || undefined,
  }));
  recipe.hop_schedule.forEach(hop => preparation.actions.push({
    phase: 'preparation', order: 20, moment: 'Prima della cotta', action: 'Pesare e predisporre il luppolo', ingredient: hop.variety,
    quantity: quantity(hop.grams, 'g'), note: [hop.aa_percent !== undefined ? `AA ${hop.aa_percent}%` : undefined, hop.note].filter(Boolean).join(' — ') || undefined,
  }));
  recipe.spezie?.forEach(spice => preparation.actions.push({
    phase: 'preparation', order: 30, moment: 'Prima della cotta', action: 'Preparare l\'adjunct', ingredient: spice.nome,
    quantity: quantity(spice.grammi, 'g'), note: spice.note,
  }));
  boilAdditions.forEach(addition => preparation.actions.push({
    phase: 'preparation', order: 35, moment: 'Prima della cotta', action: 'Preparare l\'aggiunta botanica', ingredient: addition.ingredient,
    quantity: quantity(addition.grams, 'g'), note: [addition.form, addition.use === 'whirlpool' ? 'da usare in whirlpool' : undefined, addition.note].filter(Boolean).join(' — ') || undefined,
  }));
  recipe.zuccheri?.forEach(sugar => preparation.actions.push({
    phase: 'preparation', order: 40, moment: 'Prima della cotta', action: 'Pesare lo zucchero/fermentabile', ingredient: sugar.tipo,
    quantity: quantity(sugar.grammi, 'g'), note: sugar.note,
  }));
  recipe.aggiunte_speciali?.forEach(addition => preparation.actions.push({
    phase: 'preparation', order: 45, moment: 'Prima dell’aggiunta', action: 'Preparare l’aggiunta speciale', ingredient: addition.ingrediente,
    quantity: quantity(addition.quantita_kg, 'kg'), note: [addition.forma, addition.stadio, addition.preparazione, addition.note].filter(Boolean).join(' — ') || undefined,
  }));
  if (recipe.yeast.strain) preparation.actions.push({ phase: 'preparation', order: 50, moment: 'Prima dell\'inoculo', action: 'Preparare il lievito', ingredient: recipe.yeast.strain, note: firstText(record(raw['lievito']), ['forma', 'note']) });
  sections.push(preparation);

  if (Object.keys(waterRaw).length > 0 || recipe.mash_water_liters !== undefined || recipe.sparge_water_liters !== undefined) {
    const water = section('water', 'Preparazione dell\'acqua');
    water.targets.push(...[
      target('Acqua mash', recipe.mash_water_liters, ' L'), target('Acqua sparge', recipe.sparge_water_liters, ' L'), target('Acqua totale', recipe.total_water_liters, ' L'),
      target('pH mash target', firstNumber(mashRaw, ['ph_target', 'pH_target']), ''),
      target('Rapporto SO₄:Cl', firstNumber(waterRaw, ['rapporto_so4_cl']), ''),
    ].filter((item): item is TargetValue => item !== undefined));
    const originalProfile = record(waterRaw['profilo_originale']);
    water.notes.push(...[
      text(waterRaw['fonte']) ? `Fonte: ${text(waterRaw['fonte'])}` : undefined,
      text(waterRaw['nota']),
      numberFromText(originalProfile['ph']) !== undefined ? `pH fonte: ${numberFromText(originalProfile['ph'])}` : undefined,
    ].filter((item): item is string => Boolean(item)));
    water.actions.push(...saltActions('water', recipe.mash_salts, 'Trattamento acqua mash', 10));
    water.actions.push(...saltActions('water', recipe.sparge_salts, 'Trattamento acqua sparge', 11));
    const sales = Array.isArray(waterRaw['sales']) ? waterRaw['sales'] : [];
    sales.forEach((item, index) => {
      const sale = record(item);
      water.actions.push({ phase: 'water', order: 15 + index, moment: 'Trattamento acqua mash', action: 'Pesare e aggiungere il sale', ingredient: text(sale['sale']), quantity: quantity(sale['grammi'], 'g') });
    });
    if (recipe.mash_water_liters !== undefined) water.actions.push({ phase: 'water', order: 20, moment: 'Mash-in', action: 'Preparare il volume di acqua mash', quantity: quantity(recipe.mash_water_liters, 'L'), note: 'Per sistemi all-in-one, il volume sotto il cestello appartiene all’acqua mash.' });
    if (recipe.sparge_water_liters !== undefined) water.actions.push({ phase: 'water', order: 30, moment: 'Sparge', action: 'Preparare il volume di acqua sparge', quantity: quantity(recipe.sparge_water_liters, 'L') });
    water.measurements.push(measurement('pH mash reale', 'pH'));
    sections.push(water);
  }

  if (raw['mash'] !== undefined) {
    const mash = section('mash', 'Mash-in e ammostamento');
    mash.targets.push(...[
      target('Temperatura mash-in', recipe.mash_in_temp_c, ' °C'), target('Temperatura mash', recipe.mash_temp_c, ' °C'), target('Volume acqua mash', recipe.mash_water_liters, ' L'),
      target('Spessore mash', firstNumber(mashRaw, ['spessore_l_kg']), ' L/kg'),
    ].filter((item): item is TargetValue => item !== undefined));
    const steps = Array.isArray(mashRaw['steps']) ? mashRaw['steps'] as RecordValue[] : [];
    if (steps.length > 0) steps.forEach((step, index) => mash.actions.push({ phase: 'mash', order: 20 + index, moment: `Step ${index + 1}`, action: 'Mantenere il mash', temperature: quantity(step['temperatura_c'], '°C'), duration: quantity(step['tempo_min'], 'min'), note: text(step['note']) }));
    else if (recipe.mash_temp_c !== undefined && firstNumber(mashRaw, ['durata_min']) !== undefined) mash.actions.push({ phase: 'mash', order: 20, moment: 'Mash', action: 'Mantenere il mash', temperature: quantity(recipe.mash_temp_c, '°C'), duration: quantity(firstNumber(mashRaw, ['durata_min']), 'min'), note: recipe.mash_temp_c ? text(mashRaw['note']) : undefined });
    mash.measurements.push(measurement('pH mash reale', 'pH'));
    if (text(mashRaw['tipo']) || text(mashRaw['note']) || text(mashRaw['nota'])) mash.notes.push(...[text(mashRaw['tipo']) ? `Metodo: ${text(mashRaw['tipo'])}` : undefined, text(mashRaw['note']) ?? text(mashRaw['nota'])].filter((item): item is string => Boolean(item)));
    sections.push(mash);
  }

  if (recipe.sparge_water_liters !== undefined || raw['sparge'] !== undefined) {
    const sparge = section('sparge', 'Sparge e checkpoint pre-boil');
    const spargeRaw = record(raw['sparge'] ?? mashRaw['sparge']);
    sparge.targets.push(...[
      target('Acqua sparge', recipe.sparge_water_liters, ' L'), target('Volume pre-boil', recipe.pre_boil_volume_liters, ' L'), target('Densità pre-boil', recipe.pre_boil_og), target('Temperatura sparge', firstNumber(spargeRaw, ['temperatura_c', 'temperature_c']), ' °C'),
    ].filter((item): item is TargetValue => item !== undefined));
    if (text(spargeRaw['tipo'])) sparge.notes.push(`Metodo: ${text(spargeRaw['tipo'])}`);
    sparge.actions.push({ phase: 'sparge', order: 10, moment: 'Sparge', action: text(spargeRaw['procedura']) ?? 'Eseguire lo sparge previsto dalla ricetta', quantity: quantity(recipe.sparge_water_liters, 'L'), temperature: quantity(firstNumber(spargeRaw, ['temperatura_c', 'temperature_c']), '°C') });
    sparge.measurements.push(measurement('Volume misurato', 'L'), measurement('Densità misurata', 'SG'), measurement('pH reale', 'pH'));
    sections.push(sparge);
  }

  if (recipe.boil_time_minutes !== undefined || recipe.hop_schedule.some(hop => ['boil', 'first_wort', 'flameout'].includes(hop.use)) || recipe.spezie?.some(spice => spice.uso === 'boil') || boilAdditions.some(addition => ['boil', 'first_wort', 'flameout'].includes(addition.use))) {
    const boil = section('boil', 'Bollitura — timeline cronologica');
    boil.targets.push(...[
      target('Durata bollitura', recipe.boil_time_minutes, ' min'), target('Volume pre-boil', recipe.pre_boil_volume_liters, ' L'),
      target('Perdita evaporazione', firstNumber(boilRaw, ['perdita_evaporazione_litri']), ' L'), target('Perdita trub', firstNumber(boilRaw, ['perdita_trub_litri']), ' L'),
    ].filter((item): item is TargetValue => item !== undefined));
    if (text(boilRaw['nota'])) boil.notes.push(text(boilRaw['nota'])!);
    const boilMinutes = recipe.boil_time_minutes ?? 60;
    recipe.hop_schedule.filter(hop => ['first_wort', 'boil', 'flameout'].includes(hop.use)).forEach(hop => {
      const moment = hop.use === 'first_wort' ? 'First Wort' : hop.time_minutes === 0 ? 'T 0 — Flameout' : `T −${hop.time_minutes} min`;
      boil.actions.push({ phase: 'boil', order: hop.use === 'first_wort' ? -1 : boilMinutes - hop.time_minutes, moment, action: `Aggiungere (${hop.use})`, ingredient: hop.variety, quantity: quantity(hop.grams, 'g'), note: [hop.aa_percent !== undefined ? `AA ${hop.aa_percent}%` : undefined, hop.note].filter(Boolean).join(' — ') || undefined });
    });
    recipe.spezie?.filter(spice => spice.uso === 'boil').forEach(spice => boil.actions.push({ phase: 'boil', order: boilMinutes - (spice.tempo_min ?? 0), moment: spice.tempo_min ? `T −${spice.tempo_min} min` : 'T 0 — Fine bollitura', action: 'Aggiungere botanica', ingredient: spice.nome, quantity: quantity(spice.grammi, 'g'), note: spice.note }));
    boilAdditions.filter(addition => ['boil', 'first_wort', 'flameout'].includes(addition.use)).forEach(addition => boil.actions.push({ phase: 'boil', order: boilMinutes - (addition.timeMinutes ?? 0), moment: addition.timeMinutes ? `T −${addition.timeMinutes} min` : 'T 0 — Fine bollitura', action: 'Aggiungere botanica', ingredient: addition.ingredient, quantity: quantity(addition.grams, 'g'), note: [addition.form, addition.note].filter(Boolean).join(' — ') || undefined }));
    boil.actions.sort((a, b) => a.order - b.order);
    sections.push(boil);
  }

  if (recipe.post_boil_volume_liters !== undefined || recipe.hop_schedule.some(hop => ['whirlpool', 'hop_stand'].includes(hop.use)) || boilAdditions.some(addition => ['whirlpool', 'hop_stand'].includes(addition.use))) {
    const post = section('post_boil', 'Post-boil e whirlpool');
    post.targets.push(...[
      target('Volume post-boil', recipe.post_boil_volume_liters, ' L'), target('Densità post-boil', recipe.post_boil_og),
    ].filter((item): item is TargetValue => item !== undefined));
    recipe.hop_schedule.filter(hop => ['whirlpool', 'hop_stand'].includes(hop.use)).forEach(hop => post.actions.push({ phase: 'post_boil', order: 10, moment: 'Whirlpool', action: 'Aggiungere e mantenere il whirlpool', ingredient: hop.variety, quantity: quantity(hop.grams, 'g'), temperature: quantity(recipe.whirlpool_temp_c, '°C'), duration: hop.time_minutes ? `${hop.time_minutes} min` : undefined, note: hop.note }));
    boilAdditions.filter(addition => ['whirlpool', 'hop_stand'].includes(addition.use)).forEach((addition, index) => post.actions.push({ phase: 'post_boil', order: 20 + index, moment: 'Inizio whirlpool', action: 'Aggiungere e mantenere nel whirlpool', ingredient: addition.ingredient, quantity: quantity(addition.grams, 'g'), temperature: quantity(addition.temperatureC ?? recipe.whirlpool_temp_c, '°C'), duration: quantity(addition.durationMinutes ?? firstNumber(boilRaw, ['whirlpool_durata_min']), 'min'), note: [addition.form, addition.note, 'Rimuovere al termine del whirlpool'].filter(Boolean).join(' — ') || undefined }));
    post.measurements.push(measurement('Volume post-boil misurato', 'L'), measurement('Densità post-boil misurata', 'SG'));
    sections.push(post);
  }

  if (recipe.fermentation_volume_liters !== undefined || recipe.yeast.strain || raw['lievito'] !== undefined) {
    const cooling = section('cooling', 'Raffreddamento, trasferimento e inoculo');
    const yeastRaw = record(raw['lievito']);
    const inoculationTemperature = firstNumber(yeastRaw, ['temperatura_inoculo_c', 'temp_inoculo_c']) ?? numberFromText(yeastRaw['temperatura_fermentazione']) ?? recipe.fermentation_temp_c;
    cooling.targets.push(...[
      target('Volume fermentatore', recipe.fermentation_volume_liters, ' L'), target('Temperatura inoculo', inoculationTemperature, ' °C'),
    ].filter((item): item is TargetValue => item !== undefined));
    if (inoculationTemperature !== undefined) cooling.actions.push({ phase: 'cooling', order: 10, moment: 'Raffreddamento', action: 'Raffreddare il mosto alla temperatura di inoculo', temperature: quantity(inoculationTemperature, '°C') });
    else {
      cooling.actions.push({ phase: 'cooling', order: 10, moment: 'Raffreddamento', action: 'Definire la temperatura target di inoculo prima di raffreddare' });
      cooling.warnings.push('Temperatura target di inoculo non dichiarata: completare il dato prima della cotta.');
    }
    const yeastQuantity = firstNumber(yeastRaw, ['quantita_ml', 'quantita_g', 'quantita']);
    if (recipe.yeast.strain) cooling.actions.push({ phase: 'cooling', order: 20, moment: 'Inoculo', action: 'Inoculare il lievito', ingredient: recipe.yeast.strain, quantity: quantity(yeastQuantity, yeastRaw['forma']?.toString().toLowerCase().includes('slurry') ? 'mL' : 'g'), note: [text(yeastRaw['forma']), yeastQuantity === undefined ? 'Quantità da determinare; non presumere un dosaggio.' : undefined].filter(Boolean).join(' — ') || undefined });
    cooling.measurements.push(measurement('Volume effettivo nel fermentatore', 'L'), measurement('OG effettiva', 'SG'), measurement('Temperatura di inoculo', '°C'), measurement('Ora inoculo'));
    sections.push(cooling);
  }

  if (raw['fermentazione'] !== undefined) {
    const fermentation = section('fermentation', 'Fermentazione');
    fermentation.targets.push(...[
      target('Temperatura fermentazione', recipe.fermentation_temp_c, ' °C'), target('Fermentazione primaria', recipe.primary_days, ' giorni'), target('Maturazione', recipe.conditioning_days, ' giorni'),
    ].filter((item): item is TargetValue => item !== undefined));
    recipe.fermentation_steps?.forEach((step, index) => fermentation.actions.push({ phase: 'fermentation', order: 10 + index, moment: `Step ${index + 1}`, action: 'Mantenere la fermentazione', temperature: quantity(step.temperature_c, '°C'), duration: quantity(step.duration_days, 'giorni'), note: step.note }));
    if (recipe.primary_days !== undefined && recipe.fermentation_steps?.length === 0) fermentation.actions.push({ phase: 'fermentation', order: 10, moment: `Giorni 0–${recipe.primary_days}`, action: 'Fermentazione primaria', temperature: quantity(recipe.fermentation_temp_c, '°C'), duration: `${recipe.primary_days} giorni`, note: text(fermentationRaw['note']) });
    if (Boolean(fermentationRaw['cold_crash'])) fermentation.actions.push({ phase: 'fermentation', order: 30, moment: 'Cold crash', action: 'Raffreddare per il cold crash', temperature: quantity(firstNumber(fermentationRaw, ['cold_crash_temp_c']), '°C'), duration: quantity(firstNumber(fermentationRaw, ['cold_crash_giorni']), 'giorni') });
    recipe.hop_schedule.filter(hop => hop.use === 'dry_hop').forEach(hop => fermentation.actions.push({ phase: 'fermentation', order: 20, moment: text(fermentationRaw['dry_hop_giorno']) ? `Giorno ${String(fermentationRaw['dry_hop_giorno'])}` : 'Dry hop', action: 'Aggiungere dry hop', ingredient: hop.variety, quantity: quantity(hop.grams, 'g'), note: hop.note }));
    recipe.spezie?.filter(spice => ['secondary', 'fermentation', 'conditioning', 'tincture', 'post_fermentation'].includes(spice.uso)).forEach(spice => {
      const isTincture = spice.uso === 'tincture' || /tintur/i.test(spice.note ?? '');
      fermentation.actions.push({ phase: 'fermentation', order: 25, moment: isTincture ? 'Dopo bench trial' : 'Aggiunta in fermentazione/secondaria', action: isTincture ? 'Dosare la tintura dopo bench trial' : 'Aggiungere botanica', ingredient: spice.nome, quantity: quantity(spice.grammi, 'g'), note: spice.note });
      if (isTincture) fermentation.warnings.push(`La dose di ${spice.nome} resta da determinare sperimentalmente con bench trial.`);
    });
    recipe.aggiunte_speciali?.filter(addition => /primar|ferment|secondar|conditioning/i.test(addition.stadio)).forEach(addition => {
      fermentation.actions.push({
        phase: 'fermentation', order: 25, moment: addition.stadio, action: 'Aggiungere ingrediente speciale',
        ingredient: addition.ingrediente, quantity: quantity(addition.quantita_kg, 'kg'),
        duration: addition.giorni_contatto ? `${addition.giorni_contatto} giorni di contatto` : undefined,
        note: [addition.forma, addition.preparazione, addition.note].filter(Boolean).join(' — ') || undefined,
      });
    });
    fermentation.measurements.push(measurement('FG reale', 'SG'), measurement('Temperatura reale', '°C'), measurement('Data fine fermentazione'));
    fermentation.warnings.push('La fermentazione è conclusa solo dopo stabilità della FG, non per sola durata nominale.');
    if (text(fermentationRaw['temperatura_controllo'])) fermentation.notes.push(`Controllo temperatura: ${text(fermentationRaw['temperatura_controllo'])}`);
    if (text(fermentationRaw['note']) || text(fermentationRaw['nota'])) fermentation.notes.push(text(fermentationRaw['note']) ?? text(fermentationRaw['nota'])!);
    fermentation.actions.sort((a, b) => a.order - b.order);
    sections.push(fermentation);
  }

  if (raw['carbonazione'] !== undefined || recipe.packaging_volume_liters !== undefined) {
    const packaging = section('packaging', 'Confezionamento e maturazione');
    const method = recipe.carbonation_method ?? firstText(carbonationRaw, ['metodo']);
    packaging.targets.push(...[
      target('Metodo', method), target('Volume confezionamento', recipe.packaging_volume_liters, ' L'), target('Carbonazione', recipe.carbonation_volumes, ' vol CO₂'), target('Priming', recipe.priming_sugar_gl, ' g/L'),
    ].filter((item): item is TargetValue => item !== undefined));
    if (method && /bott|bottiglia/i.test(method) && (recipe.priming_total_grams !== undefined || recipe.priming_sugar_gl !== undefined)) packaging.actions.push({ phase: 'packaging', order: 20, moment: 'Imbottigliamento', action: 'Aggiungere il fermentabile di priming', ingredient: firstText(carbonationRaw, ['zucchero_tipo']) ?? 'Zucchero', quantity: quantity(recipe.priming_total_grams ?? (recipe.priming_sugar_gl! * (recipe.packaging_volume_liters ?? 0)), 'g'), note: recipe.priming_total_grams !== undefined ? 'Quantità totale dichiarata' : `${recipe.priming_sugar_gl} g/L sul volume confezionato` });
    if (text(carbonationRaw['preparazione'])) packaging.actions.push({ phase: 'packaging', order: 15, moment: 'Preparazione priming', action: 'Preparare la soluzione di priming', ingredient: firstText(carbonationRaw, ['zucchero_tipo']), quantity: quantity(recipe.priming_total_grams, 'g'), note: text(carbonationRaw['preparazione']) });
    packaging.actions.unshift({ phase: 'packaging', order: 10, moment: 'Prima del confezionamento', action: 'Verificare stabilità della FG' });
    packaging.measurements.push(measurement('FG stabile verificata', 'SG'), measurement('Volume reale confezionato', 'L'), measurement('Data confezionamento'), measurement('Quantità effettivamente utilizzata', 'g')); 
    sections.push(packaging);
  }

  const alternatives = Array.isArray(raw['alternative']) ? (raw['alternative'] as RecordValue[]).map(item => [text(item['descrizione']), text(item['cambiamenti']), text(item['impatto'])].filter(Boolean).join(' — ')).filter(Boolean) : [];
  const handled = new Set(['schema_version', 'nome', 'stile', 'codice_bjcp', 'descrizione', 'note', 'parametri', 'grist', 'luppolatura', 'aggiunte_speciali', 'lievito', 'mash', 'fermentazione', 'bollitura', 'acqua', 'agua', 'sparge', 'sales', 'mash_salts', 'sparge_salts', 'carbonazione', 'spezie', 'zuccheri', 'confezionamento', 'obiettivi_sensoriali', 'vincoli_produzione', 'fonte', 'alternative', 'note_critiche']);
  const unmappedFields = [...Object.keys(raw).filter(key => !handled.has(key)), ...nestedUnmappedFields(raw)];
  return {
    schemaVersion: recipe.schema_version ?? 'unspecified',
    metadata: { name: recipe.recipe_name, style: recipe.beer_style, brewDate: measurement('Data della cotta'), equipment: recipe.impianto, description: recipe.descrizione },
    objectives: parseObjectives(raw),
    summaryTargets: [
      target('Batch target', recipe.batch_size_liters, ' L'), target('Volume pre-boil', recipe.pre_boil_volume_liters, ' L'), target('Volume post-boil', recipe.post_boil_volume_liters, ' L'), target('Volume fermentatore', recipe.fermentation_volume_liters, ' L'), target('Volume confezionato', recipe.packaging_volume_liters, ' L'), target('OG', recipe.og), target('FG', recipe.fg), target('ABV', recipe.abv_percent, '%'), target('IBU', recipe.ibu), target('EBC', recipe.ebc), target('Efficienza', recipe.efficiency_percent, '%'), target('BU:GU', firstNumber(params, ['bu_gu']), ''), target('Colore', text(params['colore'])), target('Corpo', text(params['corpo'])), target('Bollitura', recipe.boil_time_minutes, ' min'),
    ].filter((item): item is TargetValue => item !== undefined),
    sections,
    notes: [recipe.note, ...(Array.isArray(raw['note']) ? raw['note'].filter((item): item is string => typeof item === 'string') : []), ...(Array.isArray(raw['note_critiche']) ? raw['note_critiche'].filter((item): item is string => typeof item === 'string') : [])].filter((item): item is string => Boolean(item)),
    alternatives,
    unmappedFields,
  };
}

export function buildRecipeDocumentModel(inputPath: string): RecipeDocumentResult {
  const rawText = readFileSync(inputPath, 'utf-8');
  const loaded = yaml.load(rawText);
  if (loaded === null || typeof loaded !== 'object' || Array.isArray(loaded)) throw new Error('Il file YAML non contiene un oggetto ricetta valido.');
  const raw = loaded as RecordValue;
  // These fields are document metadata, not recipe-calculation inputs. Keep
  // them in the raw model while excluding them from the canonical parser.
  const parserData = { ...raw };
  delete parserData['note_critiche'];
  delete parserData['alternative'];
  const parserDirectory = mkdtempSync(join(tmpdir(), 'brewmaster-document-'));
  const parserPath = join(parserDirectory, 'recipe.yaml');
  writeFileSync(parserPath, yaml.dump(parserData), 'utf-8');
  let recipe: ParsedRecipe;
  try {
    recipe = parseYamlRecipe(parserPath);
  } finally {
    rmSync(parserDirectory, { recursive: true, force: true });
  }
  const errors: string[] = [];
  if (raw['mash'] !== undefined) {
    const mash = record(raw['mash']);
    if (recipe.mash_temp_c === undefined && recipe.mash_steps === undefined) errors.push('mash.temperatura_c o mash.steps');
    if (recipe.mash_steps === undefined && firstNumber(mash, ['durata_min']) === undefined) errors.push('mash.durata_min');
  }
  if (recipe.boil_time_minutes !== undefined && recipe.pre_boil_volume_liters === undefined) errors.push('parametri.pre_boil_litri o bollitura.volume_pre_boil_litri');
  if (recipe.priming_sugar_gl !== undefined && recipe.priming_total_grams === undefined && recipe.packaging_volume_liters === undefined) {
    errors.push('Volume confezionamento (parametri.confezionamento_litri) necessario per calcolare il totale del priming');
  }
  if (errors.length > 0) throw new Error(`Esportazione incompleta: dati indispensabili mancanti: ${errors.join(', ')}`);
  return { recipe, model: buildModel(recipe, raw) };
}
