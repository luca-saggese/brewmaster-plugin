import { RecipeValidatorTool } from '../src/brewing/recipe-validator.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) passed++;
  else {
    failed++;
    console.error(`FAIL: ${message}`);
  }
}

async function main(): Promise<void> {
  const tool = new RecipeValidatorTool();
  const result = await tool.resolveExecution({
    normalized_recipe: {
      recipe_name: 'Habanero Dark Speziata',
      beer_style: '30A',
      grain_bill: [{ malt: 'Pale Ale', kg: 4 }],
      hop_schedule: [],
      yeast: { strain: 'US-05' },
    },
    validation_report: {
      validation_status: 'valid',
      errors: [],
      warnings: [{ code: 'BJCP_DEVIATION', severity: 'warning', path: 'stile', message: 'Deviazione intenzionale', source: 'yaml_validator' }],
      checks: [{ id: 'ibu_calculator', status: 'not_verified' }],
    },
    sensory_objectives: ['peperoncino percepibile ma integrato'],
    base_style: '20B',
  }).execute({ turnId: 1, toolCallId: 'recipe-test', signal: new AbortController().signal });

  assert(!result.isError, 'recipe validator should return a structured request');
  const output = JSON.parse(result.output) as { request_type: string; review_status: string; prompt: string; output_schema: { required: string[] } };
  assert(output.request_type === 'review_request', 'output must identify a review request');
  assert(output.review_status === 'pending_llm', 'prompt generation must not claim completed review');
  assert(output.prompt.includes('RICETTA NORMALIZZATA'), 'prompt must include normalized recipe');
  assert(output.prompt.includes('Deviazione intenzionale'), 'prompt must include YAML warnings');
  assert(output.output_schema.required.includes('recommendations'), 'schema must include recommendations');

  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

void main();
