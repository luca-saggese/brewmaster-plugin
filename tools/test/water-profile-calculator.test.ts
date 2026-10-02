import { WaterProfileCalculatorTool } from '../src/brewing/water-profile-calculator.ts';

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
  const tool = new WaterProfileCalculatorTool();
  const execution = tool.resolveExecution({
    source_water: { ca: 0, mg: 0, na: 0, cl: 0, so4: 0, hco3: 200 },
    target_profile: 'american_ipa',
    mash_water_liters: 20,
    sparge_water_liters: 10,
  });
  const response = await execution.execute({
    turnId: 1,
    toolCallId: 'water-yaml-payload-test',
    signal: new AbortController().signal,
  });
  const payload = JSON.parse(response.output) as {
    tool: string;
    calculation: string;
    status: string;
    result: {
      recipe_yaml: {
        acqua: Record<string, number>;
        mash_salts: Record<string, number>;
        sparge_salts: Record<string, number>;
      };
    };
    display: { report: string };
  };
  const recipe = payload.result.recipe_yaml;

  assert(!response.isError && payload.status === 'ok', 'water calculator should return a successful structured result');
  assert(payload.tool === 'water_profile_calculator' && payload.calculation === 'water_profile', 'JSON should identify calculator and calculation');
  assert(recipe.acqua.mash_litri === 20 && recipe.acqua.sparge_litri === 10 && recipe.acqua.total_litri === 30, 'recipe YAML patch should expose the computed water volumes');
  assert(typeof recipe.mash_salts.lactic_acid_ml === 'number' && recipe.mash_salts.lactic_acid_ml > 0, 'estimated lactic acid should be emitted in mash_salts');
  assert(recipe.sparge_salts.lactic_acid_ml === undefined, 'lactic acid should not be assigned to sparge');
  const saltKeys = ['gypsum_g', 'cacl2_g', 'epsom_g', 'nahco3_g'];
  assert(saltKeys.some(key => (recipe.mash_salts[key] ?? 0) > 0), 'mineral additions should be emitted under conventional mash_salts fields');
  for (const key of saltKeys) {
    const mash = recipe.mash_salts[key] ?? 0;
    const sparge = recipe.sparge_salts[key] ?? 0;
    if (mash + sparge > 0) {
      assert(mash > 0 && sparge > 0 && Math.abs(mash / sparge - 2) < 0.08, `${key} should be divided between mash and sparge by water volume`);
    }
  }
  assert(payload.display.report.includes('Aggiunte consigliate') && payload.display.report.includes('Acido lattico'), 'JSON should retain the human-readable addition report');

  const spargeOnlyResponse = await tool.resolveExecution({
    source_water: { ca: 0, mg: 0, na: 0, cl: 0, so4: 0, hco3: 200 },
    target_profile: 'american_ipa',
    sparge_water_liters: 30,
  }).execute({
    turnId: 2,
    toolCallId: 'water-sparge-only-test',
    signal: new AbortController().signal,
  });
  const spargeOnlyPayload = JSON.parse(spargeOnlyResponse.output) as {
    result: { recipe_yaml: { mash_salts: Record<string, number>; sparge_salts: Record<string, number> } };
    display: { report: string };
  };
  assert(spargeOnlyPayload.result.recipe_yaml.mash_salts.lactic_acid_ml === undefined, 'sparge-only water should not receive a mash acid dose');
  assert(typeof spargeOnlyPayload.result.recipe_yaml.sparge_salts.lactic_acid_ml === 'number', 'when mash volume is absent, lactic acid should be assigned to sparge_salts');
  assert(spargeOnlyPayload.display.report.includes('(nello sparge)'), 'text report should identify the sparge acid treatment');

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

void main();
