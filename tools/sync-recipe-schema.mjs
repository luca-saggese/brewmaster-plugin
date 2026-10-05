import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const toolsDir = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(toolsDir, 'src/brewing/recipe-schema.yaml');
const systemPath = resolve(toolsDir, '../SYSTEM.md');
const startMarker = '<!-- RECIPE_SCHEMA:START -->';
const endMarker = '<!-- RECIPE_SCHEMA:END -->';

const schema = yaml.load(readFileSync(schemaPath, 'utf-8'));
const system = readFileSync(systemPath, 'utf-8');
const start = system.indexOf(startMarker);
const end = system.indexOf(endMarker);

if (start < 0 || end < 0 || end <= start) {
  throw new Error(`Marcatori dello schema ricetta mancanti o non validi in ${systemPath}`);
}

const fields = schema.canonical_fields.map(field => `- \`${field}\``).join('\n');
const acceptedFields = schema.validator.accepted_top_level_fields.map(field => `\`${field}\``).join(', ');
const requiredStrings = schema.validator.required_string_fields.map(field => `\`${field}\``).join(', ');
const requiredNumbers = Object.entries(schema.validator.required_numeric_parameters)
  .map(([field, rule]) => `\`parametri.${field}\` ${rule === 'positive' ? '> 0' : '>= 0'}`)
  .join(', ');
const historyRules = schema.validator.recipe_history;
const historyRequirements = [
  `- \`${historyRules.version_field}\`: optional positive integer; required together with \`${historyRules.changelog_field}\``,
  `- \`${historyRules.changelog_field}\`: optional non-empty list; entries have strictly increasing \`versione\`, quoted ISO date \`data\`, and non-empty \`modifica\`; latest entry must match \`${historyRules.version_field}\``,
];
const recipeFieldRules = schema.validator.recipe_fields;
const boilRequirements = Object.entries(recipeFieldRules.bollitura).map(([field, rule]) => {
  if (rule.required) return `- \`bollitura.${field}\`: required`;
  if (rule.required_if) return `- \`bollitura.${field}\`: required when \`bollitura.${rule.required_if.field}\` is \`${rule.required_if.equals}\``;
  return `- \`bollitura.${field}\`: optional`;
});
const fermentationRequirements = [
  `- \`fermentazione.steps\`: required, at least ${recipeFieldRules.fermentazione.steps.min_items} phase(s)`,
  ...Object.entries(recipeFieldRules.fermentazione.step_fields).map(([field, rule]) =>
    `- \`fermentazione.steps[].${field}\`: ${rule.required ? 'required' : 'optional'}`),
  `- Fermentation temperature: exactly one of ${recipeFieldRules.fermentazione.required_one_of
    .map(alternative => alternative.map(field => `\`${field}\``).join(' + ')).join(' or ')}`,
];
const generated = [
  'Campi canonici di primo livello supportati:',
  '',
  fields,
  '',
  `Il parser del validator richiede stringhe non vuote per ${requiredStrings} e valori numerici validi per ${requiredNumbers}. Accetta inoltre questi campi di primo livello: ${acceptedFields}. schema_version è facoltativo e supportato per compatibilità.`,
  '',
  'Metadati di revisione della ricetta:',
  ...historyRequirements,
  '',
  'Requisiti di completezza per bollitura e fermentazione (sincronizzati da `validator.recipe_fields`):',
  '',
  ...boilRequirements,
  ...fermentationRequirements,
  '',
  'Schema base obbligatorio:',
  '',
  '```yaml',
  schema.canonical_example.trimEnd(),
  '```',
].join('\n');

const updated = `${system.slice(0, start + startMarker.length)}\n${generated}\n${system.slice(end)}`;
if (updated !== system) writeFileSync(systemPath, updated, 'utf-8');