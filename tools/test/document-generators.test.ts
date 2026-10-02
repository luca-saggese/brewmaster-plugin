import { existsSync, readFileSync, rmSync, mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { buildRecipeDocumentModel } from '../src/brewing/recipe-document-model.ts';
import { YamlToDocxTool } from '../src/brewing/yaml-to-docx.ts';
import { YamlToPdfTool } from '../src/brewing/yaml-to-pdf.ts';
import { validateYamlFile } from '../src/brewing/yaml-validator.ts';

let passed = 0;
let failed = 0;
function assert(condition: boolean, message: string): void {
  if (condition) passed++;
  else { failed++; console.error(`FAIL: ${message}`); }
}

function assertDocxXmlIsValid(docx: string, workDir: string): void {
  const entries = execFileSync('unzip', ['-Z1', docx]).toString().split('\n').filter(entry => /(?:\.xml|\.rels)$/.test(entry));
  for (const [index, entry] of entries.entries()) {
    const xmlPath = join(workDir, `xml-${index}.xml`);
    const unzipEntry = entry === '[Content_Types].xml' ? '[[]Content_Types].xml' : entry;
    writeFileSync(xmlPath, execFileSync('unzip', ['-p', docx, unzipEntry]));
    execFileSync('xmllint', ['--noout', xmlPath], { stdio: 'ignore' });
  }
}

const VALID_RECIPE = `schema_version: "1.0"
nome: "Operational Test Ale"
stile: "Experimental Beer"
parametri:
  batch_size_litri: 20
  og: 1.060
  fg: 1.012
  abv_percent: 6.3
  ibu: 35
  bollitura_min: 60
  pre_boil_litri: 25
  post_boil_litri: 20
  fermentatore_litri: 19
  confezionamento_litri: 17.5
  priming_totale_g: 52.5
grist:
  - malto: "Pale Ale"
    kg: 5
luppolatura:
  - varieta: "Cascade"
    grammi: 30
    tempo_min: 60
    uso: boil
    aa_percent: 6
  - varieta: "Citra"
    grammi: 40
    tempo_min: 10
    uso: whirlpool
  - varieta: "Mosaic"
    grammi: 35
    tempo_min: 4
    uso: dry_hop
spezie:
  - nome: "Coriandolo"
    grammi: 8
    uso: boil
    tempo_min: 5
  - nome: "Pepe"
    grammi: 4
    uso: fermentation
    tempo_min: 48
aggiunte_speciali:
  - ingrediente: "Lampone"
    quantita_kg: 1.25
    forma: "purea"
    stadio: "secondario, fine fermentazione primaria"
    giorni_contatto: "5-7"
    preparazione: "Aggiungere in sacchetto sanitizzato."
    note: "Attendere FG stabile."
lievito:
  ceppo: "US-05"
mash:
  temperatura_in_c: 68
  steps:
    - temperatura_c: 64
      tempo_min: 30
    - temperatura_c: 68
      tempo_min: 30
bollitura:
  durata_min: 60
  volume_pre_boil_litri: 25
  volume_post_boil_litri: 20
  og_pre_boil: 1.050
  og_post_boil: 1.060
  whirlpool_temperatura_c: 80
fermentazione:
  primaria_giorni: 7
  temperatura_c: 18
  steps:
    - temperatura_c: 18
      giorni: 4
    - temperatura_c: 21
      giorni: 3
carbonazione:
  metodo: bottiglia
  co2_volumi: 2.4
  tipo_botella: long_neck
acqua:
  mash_litri: 16
  sparge_litri: 20
  total_litri: 36
sales:
  gesso_g: 1
sparge_salts:
  cacl2_g: 1
`;

async function main(): Promise<void> {
  const fixture = join(process.cwd(), 'src/brewing/recipes/34-specialty/34C-experimental.yaml');
  const model = buildRecipeDocumentModel(fixture).model;
  const phases = model.sections.map(section => section.phase);
  assert(model.metadata.name.includes('Rastaman'), 'model should preserve recipe name');
  assert(phases.includes('preparation') && phases.includes('mash') && phases.includes('boil') && phases.includes('fermentation'), 'model should include operational phases');
  assert(model.sections.find(section => section.phase === 'boil')?.actions.some(action => action.ingredient?.includes('Gesho Kitel')), 'boil timeline should include the declared boil addition');
  assert(model.sections.find(section => section.phase === 'fermentation')?.actions.some(action => action.action.includes('dry hop')), 'dry hop should belong to fermentation');
  assert(model.sections.find(section => section.phase === 'packaging')?.measurements.some(field => field.label.includes('FG stabile')), 'packaging should require stable FG');

  const workDir = mkdtempSync(join(tmpdir(), 'brewmaster-document-'));
  const validFixture = join(workDir, 'valid.yaml');
  writeFileSync(validFixture, VALID_RECIPE, 'utf-8');
  const outputBase = join(workDir, 'operational');
  const docx = `${outputBase}.docx`;
  const pdf = `${outputBase}.pdf`;
  try {
    const validation = validateYamlFile(validFixture);
    assert(validation.validation_status === 'incomplete', 'fixture without calculator results should be incomplete, not valid');
    const validModel = buildRecipeDocumentModel(validFixture).model;
    const fruitAction = validModel.sections.find(section => section.phase === 'fermentation')?.actions.find(action => action.ingredient === 'Lampone');
    assert(fruitAction?.quantity === '1.25 kg' && fruitAction.duration === '5-7 giorni di contatto', 'special fruit should appear in fermentation timeline with quantity and contact time');
    const packaging = validModel.sections.find(section => section.phase === 'packaging');
    assert(packaging?.actions.some(action => action.quantity === '52.50 g'), 'priming total should use the declared total quantity');
    assert(!packaging?.actions.some(action => action.quantity === '52 g'), 'priming must not use batch_size_liters');
    assert(validModel.sections.find(section => section.phase === 'water')?.actions.some(action => action.moment.includes('sparge')), 'mash and sparge salts should be distinct');
    assert(validModel.sections.find(section => section.phase === 'post_boil')?.actions.some(action => action.temperature === '80 °C'), 'whirlpool temperature should be mapped');
    const fermentation = validModel.sections.find(section => section.phase === 'fermentation');
    assert(fermentation?.actions.filter(action => action.action.includes('Mantenere la fermentazione')).length === 2, 'multistep fermentation should be rendered');
    assert(fermentation?.actions.map(action => action.ingredient ?? action.action).join('|').includes('Pepe'), 'botanical additions should remain in the fermentation timeline');
    const docxResult = await new YamlToDocxTool().resolveExecution({ input_file: validFixture, output_file: docx }).execute({ turnId: 1, toolCallId: 'docx-test', signal: new AbortController().signal });
    const pdfResult = await new YamlToPdfTool().resolveExecution({ input_file: validFixture, output_file: pdf }).execute({ turnId: 1, toolCallId: 'pdf-test', signal: new AbortController().signal });
    const docxPayload = JSON.parse(docxResult.output) as { status: string; document_type: string; path: string; errors: string[]; validation_status: string };
    const pdfPayload = JSON.parse(pdfResult.output) as { status: string; document_type: string; path: string; errors: string[]; validation_status: string };
    assert(docxPayload.document_type === 'docx' && docxPayload.status !== 'error', 'DOCX result should be structured and successful');
    assert(pdfPayload.document_type === 'pdf' && pdfPayload.status !== 'error', 'PDF result should be structured and successful');
    assert(docxPayload.validation_status === 'incomplete' && pdfPayload.validation_status === 'incomplete', 'DOCX and PDF should use the same current validation report');
    assert(existsSync(docx) && readFileSync(docx).subarray(0, 2).toString('hex') === '504b', 'DOCX should be a ZIP package');
    const documentXml = execFileSync('unzip', ['-p', docx, 'word/document.xml']).toString();
    assert(documentXml.includes('Operational Test Ale') && documentXml.includes('52.50 g') && documentXml.includes('80 °C'), 'DOCX XML should contain rendered operational content');
    assert(documentXml.includes('Lampone') && documentXml.includes('1.25 kg') && documentXml.includes('5-7 giorni di contatto'), 'DOCX XML should render the special fruit addition, amount, and contact time');
    assert(!documentXml.includes('w:type="page"'), 'DOCX should not force page breaks between operational sections');
    execFileSync('unzip', ['-t', docx], { stdio: 'ignore' });
    assertDocxXmlIsValid(docx, workDir);
    assert(documentXml.includes('<w:tbl>') && documentXml.includes('<w:sectPr>'), 'DOCX should contain tables and section properties, not only a ZIP header');
    assert(existsSync(pdf) && readFileSync(pdf).subarray(0, 5).toString() === '%PDF-', 'PDF should have a valid header');
    const pdfText = execFileSync('strings', [pdf]).toString();
    assert(pdfText.includes('Operational Test Ale'), 'PDF should contain the recipe title');
    assert(pdfText.includes('Lampone') && pdfText.includes('1.25 kg') && pdfText.includes('5-7 giorni di contatto'), 'PDF should render the special fruit addition, amount, and contact time');
    const pdfInfoResult = spawnSync('pdfinfo', [pdf], { encoding: 'utf-8' });
    if (!pdfInfoResult.error) assert(Number(pdfInfoResult.stdout.match(/^Pages:\s+(\d+)/m)?.[1] ?? 0) > 1, 'PDF should be genuinely multipage');

    const habaneroFixture = '/Users/lvx/habanero-dark-speziata.yaml';
    if (existsSync(habaneroFixture)) {
      const habaneroModel = buildRecipeDocumentModel(habaneroFixture).model;
      const preparation = habaneroModel.sections.find(section => section.phase === 'preparation');
      const postBoil = habaneroModel.sections.find(section => section.phase === 'post_boil');
      const cooling = habaneroModel.sections.find(section => section.phase === 'cooling');
      const habaneroDocx = join(workDir, 'habanero-dark-speziata.docx');
      await new YamlToDocxTool().resolveExecution({ input_file: habaneroFixture, output_file: habaneroDocx }).execute({ turnId: 3, toolCallId: 'habanero-docx', signal: new AbortController().signal });
      const habaneroXml = execFileSync('unzip', ['-p', habaneroDocx, 'word/document.xml']).toString();
      assert(preparation?.actions.some(action => action.ingredient?.includes('Habanero')), 'Habanero should be present in preparation');
      assert(preparation?.actions.some(action => action.ingredient?.includes('Finocchio') && action.quantity === '3.80 g'), 'fennel quantity should be preserved');
      assert(preparation?.actions.some(action => action.ingredient?.includes('Liquirizia') && action.quantity === '0.90 g'), 'licorice quantity should be preserved');
      assert(postBoil?.actions.some(action => action.temperature === '80 °C' && action.duration === '20 min'), 'whirlpool target should be preserved');
      assert(cooling?.actions.some(action => action.ingredient?.includes('US-05') && action.quantity === '100 mL') && cooling?.actions.some(action => action.temperature === '21 °C'), 'slurry and inoculation temperature should be preserved');
      assert(habaneroXml.includes('Habanero') && habaneroXml.includes('Finocchio') && habaneroXml.includes('Liquirizia'), 'Habanero DOCX should contain the three botanicals');
      assert(habaneroModel.unmappedFields.length === 0, 'Habanero should not leave operational fields unmapped');
      assertDocxXmlIsValid(habaneroDocx, workDir);
    }

    const missingPrimingVolume = join(workDir, 'missing-priming-volume.yaml');
    writeFileSync(missingPrimingVolume, VALID_RECIPE.replace('confezionamento_litri: 17.5\n  priming_totale_g: 52.5', 'priming_gl: 3'), 'utf-8');
    let primingError = '';
    try { buildRecipeDocumentModel(missingPrimingVolume); } catch (error) { primingError = error instanceof Error ? error.message : String(error); }
    assert(primingError.toLowerCase().includes('volume confezionamento'), 'priming without packaging volume should fail explicitly');

    const invalidFixture = join(workDir, 'invalid.yaml');
    writeFileSync(invalidFixture, VALID_RECIPE.replace('og: 1.060', 'og: not-a-number'), 'utf-8');
    const blockedDocx = await new YamlToDocxTool().resolveExecution({ input_file: invalidFixture, output_file: join(workDir, 'blocked.docx') }).execute({ turnId: 2, toolCallId: 'blocked-docx', signal: new AbortController().signal });
    const blockedPdf = await new YamlToPdfTool().resolveExecution({ input_file: invalidFixture, output_file: join(workDir, 'blocked.pdf') }).execute({ turnId: 2, toolCallId: 'blocked-pdf', signal: new AbortController().signal });
    assert(blockedDocx.isError && blockedPdf.isError, 'blocking YAML errors must prevent both document types');
    assert(!existsSync(join(workDir, 'blocked.docx')) && !existsSync(join(workDir, 'blocked.pdf')), 'blocked generation must not leave definitive documents');
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}
void main();
