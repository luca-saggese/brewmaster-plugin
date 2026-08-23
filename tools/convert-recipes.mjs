// Convert recipe YAML keys from Italian to English.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import * as yaml from 'js-yaml';

const MAP = {
  // ── Top-level ──
  nome: 'name',
  stile: 'style',
  codice_bjcp: 'bjcp_code',
  descrizione: 'description',
  note_critiche: 'critical_notes',
  alternative: 'alternatives',
  parametri: 'parameters',
  grist: 'grain_bill',
  malto: 'malt',
  luppolatura: 'hops',
  varieta: 'variety',
  lievito: 'yeast',
  ceppo: 'strain',
  bollitura: 'boil',
  fermentazione: 'fermentation',
  carbonazione: 'carbonation',
  // ── fonte ──
  fonte: 'source',
  url: 'url',
  autore: 'author',
  verifica: 'verification',
  // ── parametri ──
  batch_size_litri: 'batch_size_liters',
  volume_fermentatore: 'fermentor_volume',
  efficienza_percent: 'efficiency_percent',
  impianto: 'equipment',
  impatto: 'impact',
  cambiamenti: 'changes',
  // ── grist / hops ──
  grammi: 'grams',
  tempo_min: 'time_min',
  uso: 'use',
  aa_percent: 'aa_percent',
  ibu_stimati: 'ibu_estimated',
  percent: 'percent',
  // ── lievito ──
  attenuazione_percent: 'attenuation_percent',
  forma: 'form',
  temperatura_fermentazione: 'fermentation_temp',
  // ── mash ──
  temperatura_c: 'temperature_c',
  durata_min: 'duration_min',
  spessore_l_kg: 'mash_thickness_l_kg',
  // ── bollitura ──
  volume_pre_boil_litri: 'pre_boil_volume_liters',
  volume_post_boil_litri: 'post_boil_volume_liters',
  // ── fermentazione ──
  primaria_giorni: 'primary_days',
  cold_crash: 'cold_crash',
  cold_crash_giorni: 'cold_crash_days',
  cold_crash_temp_c: 'cold_crash_temp_c',
  dry_hop_giorno: 'dry_hop_day',
  dry_hop_temperatura_c: 'dry_hop_temp_c',
  // ── carbonazione ──
  metodo: 'method',
  zucchero_tipo: 'sugar_type',
  co2_volumi: 'co2_volumes',
  temperatura_servizio_c: 'serving_temp_c',
};

function walk(dir) {
  let files = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) files = files.concat(walk(p));
    else if (extname(p) === '.yaml') files.push(p);
  }
  return files;
}

function transform(node) {
  if (Array.isArray(node)) return node.map(transform);
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      const key = MAP[k] ?? k;
      out[key] = transform(v);
    }
    return out;
  }
  return node;
}

function walkKeys(node, acc) {
  if (Array.isArray(node)) { node.forEach(n => walkKeys(n, acc)); return; }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (!(k in MAP)) acc.set(k, (acc.get(k) ?? 0) + 1);
      walkKeys(v, acc);
    }
  }
}

let count = 0;
const unmapped = new Map();
for (const f of walk('recipes')) {
  const data = yaml.load(readFileSync(f, 'utf-8'));
  walkKeys(data, unmapped);
  const out = transform(data);
  writeFileSync(f, yaml.dump(out, { lineWidth: 120 }));
  count++;
}
console.log('Converted', count, 'files');
console.log('Unmapped keys used:', Array.from(unmapped.keys()));