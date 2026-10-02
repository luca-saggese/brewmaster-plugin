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
  evaporazione_litri: 3
  perdita_trub_litri: 2
  irish_moss: false
  whirlpool: true
  whirlpool_temperatura_c: 80
  whirlpool_durata_min: 20
fermentazione:
  primaria_giorni: 7
  temperatura_c: 18
  steps:
    - fase: "Avvio"
      giorno_inizio: 0
      giorno_fine: 4
      temperatura_c: 18
    - fase: "Rampa libera"
      giorno_inizio: 4
      giorno_fine: 7
      temperatura_min_c: 21
      temperatura_max_c: 23
      note: "Lasciare salire gradualmente"
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
mash_salts:
  gypsum_g: 3.2
  cacl2_g: 2.4
  epsom_g: 0.8
  nahco3_g: 0.3
  lactic_acid_ml: 1.5
sparge_salts:
  cacl2_g: 1
  lactic_acid_ml: 0.6
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
    const waterActions = validModel.sections.find(section => section.phase === 'water')?.actions ?? [];
    assert(waterActions.some(action => action.ingredient === 'Acido lattico' && action.quantity === '1.50 mL' && action.moment.includes('mash')), 'mash lactic acid should be present in the operational model');
    assert(waterActions.some(action => action.ingredient === 'Acido lattico' && action.quantity === '0.60 mL' && action.moment.includes('sparge')), 'sparge lactic acid should be present when explicitly declared');
    assert(validModel.sections.find(section => section.phase === 'post_boil')?.actions.some(action => action.temperature === '80 °C'), 'whirlpool temperature should be mapped');
    const fermentation = validModel.sections.find(section => section.phase === 'fermentation');
    assert(fermentation?.actions.filter(action => action.action.includes('Mantenere la fermentazione')).length === 2, 'multistep fermentation should be rendered');
    assert(fermentation?.actions.some(action => action.moment === 'Avvio' && action.duration === 'Giorni 0–4' && action.temperature === '18 °C'), 'fermentation phase should retain its name, day range, and temperature');
    assert(fermentation?.actions.some(action => action.moment === 'Rampa libera' && action.duration === 'Giorni 4–7' && action.temperature === '21–23 °C'), 'fermentation phase should render a temperature range');
    const boil = validModel.sections.find(section => section.phase === 'boil');
    assert(boil?.targets.some(target => target.label === 'OG pre-boil' && target.value === '1.050'), 'boil section should include pre-boil OG');
    assert(boil?.targets.some(target => target.label === 'OG post-boil' && target.value === '1.060'), 'boil section should include post-boil OG');
    assert(boil?.targets.some(target => target.label === 'Durata bollitura' && target.value === '60 min'), 'boil section should include boil duration');
    assert(boil?.targets.some(target => target.label === 'Volume pre-boil' && target.value === '25 L'), 'boil section should include pre-boil volume');
    assert(boil?.targets.some(target => target.label === 'Volume post-boil' && target.value === '20 L'), 'boil section should include post-boil volume');
    assert(boil?.targets.some(target => target.label === 'Perdita evaporazione' && target.value === '3 L'), 'boil section should include evaporation loss');
    assert(boil?.targets.some(target => target.label === 'Perdita trub' && target.value === '2 L'), 'boil section should include trub loss');
    assert(boil?.targets.some(target => target.label === 'Irish Moss' && target.value === 'No'), 'boil section should preserve an explicit false Irish Moss value');
    assert(boil?.targets.some(target => target.label === 'Whirlpool' && target.value === 'Sì'), 'boil section should preserve the whirlpool flag');
    assert(boil?.targets.some(target => target.label === 'Temperatura whirlpool' && target.value === '80 °C'), 'boil section should include whirlpool temperature');
    assert(boil?.targets.some(target => target.label === 'Durata whirlpool' && target.value === '20 min'), 'boil section should include whirlpool duration');
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
    const unmappedFixture = join(workDir, 'unmapped-fields.yaml');
    writeFileSync(unmappedFixture, VALID_RECIPE.replace('  whirlpool_durata_min: 20\n', '  whirlpool_durata_min: 20\n  dettagli_extra:\n    densita: 1.04\n    nota: "controllare colore"\n'), 'utf-8');
    const unmappedDocx = join(workDir, 'unmapped-fields.docx');
    await new YamlToDocxTool().resolveExecution({ input_file: unmappedFixture, output_file: unmappedDocx }).execute({ turnId: 5, toolCallId: 'unmapped-fields-docx', signal: new AbortController().signal });
    const unmappedXml = execFileSync('unzip', ['-p', unmappedDocx, 'word/document.xml']).toString();
    assert(unmappedXml.includes('bollitura.dettagli_extra') && unmappedXml.includes('densita: 1.04') && unmappedXml.includes('controllare colore'), 'DOCX should render unmapped field names and structured values');
    const sectionNotesFixture = join(workDir, 'section-notes.yaml');
    const sectionNotesYaml = VALID_RECIPE
      .replace('parametri:\n', 'parametri:\n  note: "Nota parametri"\n')
      .replace('  whirlpool_durata_min: 20\n', '  whirlpool_durata_min: 20\n  note: "Nota bollitura"\n')
      .replace('carbonazione:\n', 'carbonazione:\n  note: "Nota carbonazione"\n')
      .replace('  total_litri: 36\n', '  total_litri: 36\n  note: "Nota acqua"\n');
    writeFileSync(sectionNotesFixture, sectionNotesYaml, 'utf-8');
    const sectionNotesModel = buildRecipeDocumentModel(sectionNotesFixture).model;
    assert(sectionNotesModel.summaryNotes.includes('Nota parametri'), 'parameter note should be attached to recipe summary');
    assert(!sectionNotesModel.unmappedFields.some(field => /^(parametri|bollitura|carbonazione|acqua)\.(note|nota)$/.test(field)), 'section note fields should be treated as mapped');
    assert(sectionNotesModel.sections.find(section => section.phase === 'water')?.notes.includes('Nota acqua'), 'water note should be attached to water section');
    assert(sectionNotesModel.sections.find(section => section.phase === 'boil')?.notes.includes('Nota bollitura'), 'boil note should be attached to boil section');
    assert(sectionNotesModel.sections.find(section => section.phase === 'packaging')?.notes.includes('Nota carbonazione'), 'carbonation note should be attached to packaging section');
    const sectionNotesDocx = join(workDir, 'section-notes.docx');
    await new YamlToDocxTool().resolveExecution({ input_file: sectionNotesFixture, output_file: sectionNotesDocx }).execute({ turnId: 6, toolCallId: 'section-notes-docx', signal: new AbortController().signal });
    const sectionNotesXml = execFileSync('unzip', ['-p', sectionNotesDocx, 'word/document.xml']).toString();
    assert(['Nota parametri', 'Nota acqua', 'Nota bollitura', 'Nota carbonazione'].every(note => sectionNotesXml.includes(note)), 'DOCX should render all section-specific YAML notes');
    assert(sectionNotesXml.indexOf('Nota parametri') < sectionNotesXml.lastIndexOf('Preparazione degli ingredienti')
      && sectionNotesXml.indexOf('Nota acqua') < sectionNotesXml.lastIndexOf('Mash-in e ammostamento')
      && sectionNotesXml.indexOf('Nota bollitura') < sectionNotesXml.lastIndexOf('Post-boil e whirlpool'), 'DOCX should place summary, water, and boil notes at the end of their related content');
    assert(documentXml.includes('Lampone') && documentXml.includes('1.25 kg') && documentXml.includes('5-7 giorni di contatto'), 'DOCX XML should render the special fruit addition, amount, and contact time');
    assert(documentXml.includes('Acido lattico') && documentXml.includes('1.50 mL') && documentXml.includes('0.60 mL'), 'DOCX XML should render conventional mash and sparge acid fields');
      const derivedSpargeFixture = join(workDir, 'derived-sparge.yaml');
      writeFileSync(derivedSpargeFixture, VALID_RECIPE.replace('  sparge_litri: 20\n', ''), 'utf-8');
      const derivedSpargeModel = buildRecipeDocumentModel(derivedSpargeFixture).model;
      assert(derivedSpargeModel.sections.find(section => section.phase === 'water')?.targets.some(target => target.label === 'Acqua sparge' && target.value === '20 L'), 'water section should derive sparge volume when only total and mash are declared');
      const derivedSpargeDocx = join(workDir, 'derived-sparge.docx');
      await new YamlToDocxTool().resolveExecution({ input_file: derivedSpargeFixture, output_file: derivedSpargeDocx }).execute({ turnId: 4, toolCallId: 'derived-sparge-docx', signal: new AbortController().signal });
      const derivedSpargeXml = execFileSync('unzip', ['-p', derivedSpargeDocx, 'word/document.xml']).toString();
      assert(derivedSpargeXml.includes('Acqua sparge') && derivedSpargeXml.includes('20 L'), 'DOCX should render derived sparge volume');
    assert(documentXml.includes('OG pre-boil') && documentXml.includes('OG post-boil') && documentXml.includes('1.050') && documentXml.includes('1.060'), 'DOCX should render both boil gravities');
    assert(documentXml.includes('Volume post-boil') && documentXml.includes('3 L') && documentXml.includes('2 L') && documentXml.includes('Irish Moss') && documentXml.includes('Whirlpool'), 'DOCX should render the additional boil parameters');
    assert(documentXml.includes('FASE') && documentXml.includes('GIORNI') && documentXml.includes('TEMPERATURA') && documentXml.includes('Giorni 4–7') && documentXml.includes('Rampa libera') && documentXml.includes('21–23 °C'), 'DOCX should render the fermentation phase and temperature table');
    assert(!documentXml.includes('w:type="page"'), 'DOCX should not force page breaks between operational sections');
    execFileSync('unzip', ['-t', docx], { stdio: 'ignore' });
    assertDocxXmlIsValid(docx, workDir);
    assert(documentXml.includes('<w:tbl>') && documentXml.includes('<w:sectPr>'), 'DOCX should contain tables and section properties, not only a ZIP header');
    assert(existsSync(pdf) && readFileSync(pdf).subarray(0, 5).toString() === '%PDF-', 'PDF should have a valid header');
    const pdfText = execFileSync('strings', [pdf]).toString('latin1');
    assert(pdfText.includes('Operational Test Ale'), 'PDF should contain the recipe title');
    assert(pdfText.includes('Lampone') && pdfText.includes('1.25 kg') && pdfText.includes('5-7') && pdfText.includes('contatto'), 'PDF should render the special fruit addition, amount, and contact time');
    assert(pdfText.includes('Acido lattico') && pdfText.includes('1.50 mL') && pdfText.includes('0.60 mL'), 'PDF should render conventional mash and sparge acid fields');
    assert(pdfText.includes('OG pre-boil') && pdfText.includes('OG post-boil') && pdfText.includes('1.050') && pdfText.includes('1.060'), 'PDF should render both boil gravities');
    assert(pdfText.includes('Volume post-boil') && pdfText.includes('3 L') && pdfText.includes('2 L') && pdfText.includes('Irish Moss') && pdfText.includes('Whirlpool'), 'PDF should render the additional boil parameters');
    assert(pdfText.includes('FASE') && pdfText.includes('TEMPERATURA'), 'PDF should render the fermentation table headers');
    assert(pdfText.includes('Rampa libera'), 'PDF should render the fermentation phase name');
    assert(pdfText.includes('21-23'), 'PDF should render the fermentation temperature range');
    assert(pdfText.includes('Giorni 4-7'), 'PDF should render the fermentation day range');
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
