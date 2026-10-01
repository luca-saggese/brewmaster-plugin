import { existsSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { buildRecipeDocumentModel } from '../src/brewing/recipe-document-model.ts';
import { YamlToDocxTool } from '../src/brewing/yaml-to-docx.ts';
import { YamlToPdfTool } from '../src/brewing/yaml-to-pdf.ts';

let passed = 0;
let failed = 0;
function assert(condition: boolean, message: string): void {
  if (condition) passed++;
  else { failed++; console.error(`FAIL: ${message}`); }
}

async function main(): Promise<void> {
  const fixture = join(process.cwd(), 'src/brewing/recipes/34-specialty/34C-experimental.yaml');
  const model = buildRecipeDocumentModel(fixture).model;
  const phases = model.sections.map(section => section.phase);
  assert(model.metadata.name.includes('Rastaman'), 'model should preserve recipe name');
  assert(phases.includes('preparation') && phases.includes('mash') && phases.includes('boil') && phases.includes('fermentation'), 'model should include operational phases');
  assert(model.sections.find(section => section.phase === 'boil')?.actions.some(action => action.ingredient?.includes('Gesho Kitel')), 'boil timeline should include the declared boil addition');
  assert(model.sections.find(section => section.phase === 'fermentation')?.actions.some(action => action.action.includes('dry hop')), 'dry hop should belong to fermentation');
  assert(model.sections.find(section => section.phase === 'packaging')?.measurements.some(field => field.label.includes('FG stabile')), 'packaging should require stable FG');

  const outputBase = join(tmpdir(), `brewmaster-document-${Date.now()}`);
  const docx = `${outputBase}.docx`;
  const pdf = `${outputBase}.pdf`;
  try {
    const docxResult = await new YamlToDocxTool().resolveExecution({ input_file: fixture, output_file: docx }).execute({ turnId: 1, toolCallId: 'docx-test', signal: new AbortController().signal });
    const pdfResult = await new YamlToPdfTool().resolveExecution({ input_file: fixture, output_file: pdf }).execute({ turnId: 1, toolCallId: 'pdf-test', signal: new AbortController().signal });
    const docxPayload = JSON.parse(docxResult.output) as { status: string; document_type: string; path: string; errors: string[] };
    const pdfPayload = JSON.parse(pdfResult.output) as { status: string; document_type: string; path: string; errors: string[] };
    assert(docxPayload.document_type === 'docx' && docxPayload.status !== 'error', 'DOCX result should be structured and successful');
    assert(pdfPayload.document_type === 'pdf' && pdfPayload.status !== 'error', 'PDF result should be structured and successful');
    assert(existsSync(docx) && readFileSync(docx).subarray(0, 2).toString('hex') === '504b', 'DOCX should be a ZIP package');
    execFileSync('unzip', ['-t', docx], { stdio: 'ignore' });
    assert(true, 'DOCX ZIP package should be structurally valid');
    assert(existsSync(pdf) && readFileSync(pdf).subarray(0, 5).toString() === '%PDF-', 'PDF should have a valid header');
  } finally {
    rmSync(docx, { force: true });
    rmSync(pdf, { force: true });
  }
  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}
void main();
