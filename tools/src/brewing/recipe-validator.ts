/**
 * Richiesta di revisione qualitativa di una ricetta gia validata.
 * Questo tool non sostituisce il YAML validator e non esegue calcoli.
 */

import { z } from 'zod';

import type { BuiltinTool, ExecutableToolResult, ToolExecution } from '../shim/tool-contract';
import { registerTool } from '../shim/tool-registry';
import { toInputJsonSchema } from '../shim/input-schema';
import { findStyle, type YamlValidationReport } from './yaml-validator';

const RecipePayloadSchema = z.record(z.string(), z.unknown());

export const RecipeValidatorInputSchema = z.object({
  normalized_recipe: RecipePayloadSchema.describe('Ricetta normalizzata restituita da yaml_validator.'),
  validation_report: RecipePayloadSchema.describe('Report JSON restituito da yaml_validator.'),
  calculator_results: z.record(z.string(), z.unknown()).optional().describe('Risultati strutturati pertinenti dei calculator.'),
  beer_style: z.string().optional().describe('Stile BJCP dichiarato, se non presente nella ricetta.'),
  base_style: z.string().optional().describe('Stile base per categorie Specialty.'),
  sensory_objectives: z.array(z.string()).optional().describe('Obiettivi sensoriali dichiarati.'),
  production_constraints: z.array(z.string()).optional().describe('Vincoli dell impianto o del processo.'),
  user_notes: z.string().optional().describe('Note dell utente per la revisione.'),
});

export type RecipeValidatorInput = z.infer<typeof RecipeValidatorInputSchema>;

export const ReviewOutputSchema = {
  type: 'object',
  properties: {
    review_status: { type: 'string', enum: ['completed', 'needs_revision', 'blocked'] },
    technical_issues: { type: 'array' },
    qualitative_warnings: { type: 'array' },
    sensory_assessment: { type: 'object' },
    style_assessment: { type: 'object' },
    repeatability_issues: { type: 'array' },
    recommendations: { type: 'array' },
    recalculate: { type: 'array' },
    missing_data: { type: 'array' },
  },
  required: [
    'review_status', 'technical_issues', 'qualitative_warnings', 'sensory_assessment',
    'style_assessment', 'repeatability_issues', 'recommendations', 'recalculate', 'missing_data',
  ],
};

function buildReviewPrompt(args: RecipeValidatorInput): string {
  const recipe = args.normalized_recipe;
  const styleName = args.beer_style ?? (typeof recipe.beer_style === 'string' ? recipe.beer_style : 'non dichiarato');
  const style = findStyle(styleName);
  const report = args.validation_report as Partial<YamlValidationReport>;
  const errors = Array.isArray(report.errors) ? report.errors : [];
  const warnings = Array.isArray(report.warnings) ? report.warnings : [];

  return [
    'Sei un revisore brassicolo senior. Esegui una revisione qualitativa, senza riscrivere automaticamente la ricetta.',
    'Il YAML validator ha gia eseguito i controlli deterministici: non ricalcolare ABV, volumi, efficienza, IBU o priming.',
    'Distingui tra errore tecnico gia presente nel report, conseguenza brassicola e nuova criticita qualitativa.',
    'Una birra Specialty, Spice, Fruit o Experimental non va penalizzata per il solo scostamento BJCP: valuta stile base e obiettivo dichiarato.',
    'Ogni raccomandazione deve indicare problema, motivazione tecnica, modifica proposta, impatto sensoriale, compromesso e priorita.',
    'Non modificare lo YAML. Indica i parametri da ricalcolare dopo una modifica sostanziale.',
    '',
    '=== RICETTA NORMALIZZATA ===',
    JSON.stringify(recipe, null, 2),
    '',
    '=== REPORT DETERMINISTICO ===',
    JSON.stringify({ validation_status: report.validation_status, errors, warnings, checks: report.checks ?? [] }, null, 2),
    '',
    '=== CALCULATORI ===',
    JSON.stringify(args.calculator_results ?? report.calculator_references ?? null, null, 2),
    '',
    '=== CONTESTO ===',
    JSON.stringify({
      stile: style ? { code: style.code, name: style.name, category: style.category, og: [style.og_min, style.og_max], fg: [style.fg_min, style.fg_max], abv: [style.abv_min, style.abv_max], ibu: [style.ibu_min, style.ibu_max], ebc: [style.ebc_min, style.ebc_max] } : { declared: styleName },
      stile_base: args.base_style ?? null,
      obiettivi_sensoriali: args.sensory_objectives ?? [],
      vincoli_produzione: args.production_constraints ?? [],
      note_utente: args.user_notes ?? null,
    }, null, 2),
    '',
    'Restituisci esclusivamente JSON conforme allo schema seguente:',
    JSON.stringify(ReviewOutputSchema, null, 2),
  ].join('\n');
}

export class RecipeValidatorTool implements BuiltinTool<RecipeValidatorInput> {
  readonly name = 'recipe_validator' as const;
  readonly description =
    'Prepara una review_request JSON usando la ricetta normalizzata e il report di yaml_validator. Non esegue calcoli e non simula una revisione LLM completata.';
  readonly parameters: Record<string, unknown> = toInputJsonSchema(RecipeValidatorInputSchema);

  resolveExecution(args: RecipeValidatorInput): ToolExecution {
    const parsed = RecipeValidatorInputSchema.safeParse(args);
    return {
      description: 'Prepara richiesta di revisione qualitativa della ricetta',
      approvalRule: this.name,
      execute: () => parsed.success
        ? this.execute(parsed.data)
        : Promise.resolve({ isError: true, output: JSON.stringify({ status: 'error', errors: parsed.error.issues }) }),
    };
  }

  private execute(args: RecipeValidatorInput): Promise<ExecutableToolResult> {
    try {
      const report = args.validation_report as Partial<YamlValidationReport>;
      const blocked = report.validation_status === 'invalid';
      const output = {
        schema_version: '1.0',
        request_type: 'review_request',
        review_status: blocked ? 'blocked' : 'pending_llm',
        recipe_id: args.normalized_recipe.recipe_name ?? null,
        deterministic_report_status: report.validation_status ?? 'unknown',
        prompt: buildReviewPrompt(args),
        output_schema: ReviewOutputSchema,
        instructions: blocked
          ? ['Il report deterministico contiene ERROR. Descrivere l impatto senza ripetere meccanicamente i messaggi e senza correggere automaticamente la ricetta.']
          : ['La revisione LLM non e stata eseguita da questo tool; Gaia deve inoltrare il prompt e validare nuovamente dopo modifiche sostanziali.'],
      };
      return Promise.resolve({ output: JSON.stringify(output, null, 2) });
    } catch (error) {
      return Promise.resolve({ isError: true, output: JSON.stringify({ status: 'error', errors: [error instanceof Error ? error.message : String(error)] }) });
    }
  }
}

registerTool(RecipeValidatorTool);
