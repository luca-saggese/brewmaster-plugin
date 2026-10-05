import { z } from 'zod';
import { existsSync, writeFileSync } from 'node:fs';

import type { BuiltinTool, ToolExecution } from '../shim/tool-contract';
import { registerTool } from '../shim/tool-registry';
import { toInputJsonSchema } from '../shim/input-schema';
import { buildRecipeDocumentModel, type OperationalSection, type RecipeDocumentModel, type TargetValue } from './recipe-document-model';
import { validateYamlFile } from './yaml-validator';

export const YamlToDocxInputSchema = z.object({
  input_file: z.string().describe('Path to the recipe YAML file.'),
  output_file: z.string().optional().describe('Path for the output .docx file.'),
});
export type YamlToDocxInput = z.infer<typeof YamlToDocxInputSchema>;

const PAGE_WIDTH = 9638;
const PRIMARY = '243447';
const LIGHT = 'EAF0F3';
const PALE = 'F6F8F9';
const TEXT = '1F2933';

function escapeXml(value: unknown): string {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function run(text: string, options: { bold?: boolean; italic?: boolean; color?: string; size?: number } = {}): string {
  const properties = `<w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>${options.bold ? '<w:b/>' : ''}${options.italic ? '<w:i/>' : ''}${options.color ? `<w:color w:val="${options.color}"/>` : ''}<w:sz w:val="${options.size ?? 20}"/></w:rPr>`;
  return String(text).split(/\r?\n/).map((line, index) => `${index > 0 ? '<w:br/>' : ''}<w:r>${properties}<w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r>`).join('');
}
function paragraph(text: string, options: { bold?: boolean; italic?: boolean; color?: string; size?: number; align?: string; keepNext?: boolean; before?: number; after?: number } = {}): string {
  return `<w:p><w:pPr><w:spacing w:before="${options.before ?? 40}" w:after="${options.after ?? 80}" w:line="260" w:lineRule="auto"/>${options.keepNext ? '<w:keepNext/>' : ''}${options.align ? `<w:jc w:val="${options.align}"/>` : ''}</w:pPr>${run(text, options)}</w:p>`;
}
function heading(text: string, level = 1): string {
  const size = level === 1 ? 30 : 25;
  return `<w:p><w:pPr><w:keepNext/><w:spacing w:before="${level === 1 ? 240 : 160}" w:after="100"/><w:outlineLvl w:val="${level - 1}"/><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="6" w:color="${PRIMARY}"/></w:pBdr></w:pPr>${run(text, { bold: true, color: PRIMARY, size })}</w:p>`;
}
function pageBreak(): string { return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'; }
function cell(text: string, width: number, header = false, align = 'left'): string {
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:shd w:fill="${header ? PRIMARY : PALE}"/><w:vAlign w:val="center"/><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:start w:w="120" w:type="dxa"/><w:end w:w="120" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/><w:jc w:val="${align}"/></w:pPr>${run(text, { bold: header, color: header ? 'FFFFFF' : TEXT, size: header ? 17 : 18 })}</w:p></w:tc>`;
}
function table(headers: string[], rows: string[][], widths: number[], aligns: string[] = []): string {
  const grid = widths.map(width => `<w:gridCol w:w="${width}"/>`).join('');
  const header = `<w:tr><w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>${headers.map((item, index) => cell(item, widths[index]!, true, aligns[index] ?? 'left')).join('')}</w:tr>`;
  const body = rows.map(row => `<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="420" w:hRule="atLeast"/></w:trPr>${widths.map((width, index) => cell(row[index] ?? '', width, false, aligns[index] ?? 'left')).join('')}</w:tr>`).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="${PAGE_WIDTH}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:start w:w="100" w:type="dxa"/><w:end w:w="100" w:type="dxa"/></w:tblCellMar><w:tblBorders><w:top w:val="single" w:sz="6" w:color="9AA8B2"/><w:bottom w:val="single" w:sz="6" w:color="9AA8B2"/><w:insideH w:val="single" w:sz="3" w:color="C9D2D8"/><w:insideV w:val="single" w:sz="3" w:color="C9D2D8"/></w:tblBorders></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${header}${body}</w:tbl><w:p><w:pPr><w:spacing w:after="80"/></w:pPr></w:p>`;
}
function targetRows(values: TargetValue[]): string[][] { return values.map(item => [item.label, item.value]); }
function checkpointRows(section: OperationalSection): string[][] { return section.measurements.map(item => [`${item.label}${item.unit ? ` (${item.unit})` : ''}`, '________________________', '']); }
function actionRows(section: OperationalSection, actions = section.actions): string[][] {
  return actions.map(action => [
    '☐', action.moment, action.action, action.ingredient ?? '', action.quantity ?? '', [action.temperature, action.duration].filter(Boolean).join(' / '), action.note ?? '',
  ]);
}
function fermentationRows(section: OperationalSection): string[][] {
  return section.actions.filter(action => action.action === 'Mantenere la fermentazione' || action.action === 'Fermentazione primaria').map(action => [
    action.moment,
    action.duration ?? '',
    action.temperature ?? '',
    [action.action, action.ingredient, action.quantity].filter(Boolean).join(' — '),
    action.note ?? '',
  ]);
}
function renderSection(section: OperationalSection): string {
  let output = heading(section.title, 1);
  if (section.targets.length) output += heading('Target di fase', 2) + table(['PARAMETRO', 'TARGET'], targetRows(section.targets), [5300, 4338]);
  if (section.actions.length) {
    output += heading('Operazioni e checklist', 2);
    if (section.phase === 'fermentation') {
      const scheduleRows = fermentationRows(section);
      const otherActions = section.actions.filter(action => action.action !== 'Mantenere la fermentazione' && action.action !== 'Fermentazione primaria');
      if (scheduleRows.length) output += table(['FASE', 'GIORNI', 'TEMPERATURA', 'OPERAZIONE', 'NOTE'], scheduleRows, [1700, 1200, 1300, 2750, 2688]);
      if (otherActions.length) output += table(['CHECK', 'MOMENTO', 'OPERAZIONE', 'INGREDIENTE', 'QUANTITÀ', 'PARAMETRI', 'NOTE'], actionRows(section, otherActions), [600, 1350, 2200, 1750, 950, 1250, 1538], ['center', 'left', 'left', 'left', 'right', 'left', 'left']);
    } else {
      output += table(['CHECK', 'MOMENTO', 'OPERAZIONE', 'INGREDIENTE', 'QUANTITÀ', 'PARAMETRI', 'NOTE'], actionRows(section), [600, 1350, 2200, 1750, 950, 1250, 1538], ['center', 'left', 'left', 'left', 'right', 'left', 'left']);
    }
  }
  if (section.measurements.length) output += heading('Checkpoint compilabili', 2) + table(['PARAMETRO', 'MISURATO', 'NOTE'], checkpointRows(section), [4100, 2500, 3038]);
  for (const warning of section.warnings) output += paragraph(`ATTENZIONE  ${warning}`, { bold: true, color: '8B2E2E', before: 100, after: 100 });
  for (const note of section.notes) output += paragraph(`NOTA  ${note}`, { color: '52606D' });
  return output;
}
function renderModel(model: RecipeDocumentModel): string {
  let body = paragraph(model.metadata.name, { bold: true, color: PRIMARY, size: 36, align: 'center', keepNext: true, before: 100, after: 40 });
  body += paragraph(model.metadata.style, { italic: true, color: '52606D', size: 22, align: 'center', keepNext: true, after: 180 });
  body += heading('A. Riepilogo operativo', 1);
  body += table(['CAMPO', 'VALORE'], [
    ['Data della cotta', '____________________________'],
    ['Impianto', model.metadata.equipment ?? ''],
    ...(model.recipeVersion === undefined ? [] : [['Versione ricetta', String(model.recipeVersion)]]),
    ...targetRows(model.summaryTargets),
  ], [3300, 6338]);
  if (model.metadata.description) body += paragraph(model.metadata.description, { size: 19, after: 120 });
  for (const note of model.summaryNotes) body += paragraph(`NOTA  ${note}`, { color: '52606D' });
  if (model.objectives.length) body += table(['OBIETTIVO PRODUTTIVO', 'DESCRIZIONE'], targetRows(model.objectives), [3300, 6338]);
  body += heading('Macrofasi', 2) + table(['N.', 'FASE'], model.sections.map((section, index) => [String(index + 1), section.title]), [900, 8738], ['center', 'left']);
  for (const section of model.sections) body += renderSection(section);
  if (model.notes.length) { body += heading('Note e avvertenze', 1); for (const note of model.notes) body += paragraph(`NOTA  ${note}`, { color: '52606D' }); }
  if (model.alternatives.length) { body += heading('Alternative non selezionate', 1); for (const alternative of model.alternatives) body += paragraph(alternative); }
  if (model.changelog.length) {
    body += heading('Cronologia della ricetta', 1);
    body += table(['VERSIONE', 'DATA', 'MODIFICA'], model.changelog.map(entry => [String(entry.version), entry.date, entry.change]), [1400, 1800, 6438]);
  }
  if (model.unmappedFieldDetails.length) { body += heading('Note aggiuntive', 1); body += table(['CAMPO', 'CONTENUTO'], model.unmappedFieldDetails.map(field => [field.name, field.value]), [3300, 6338]); }
  return body;
}
function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function zip(entries: Array<{ name: string; data: Buffer }>): Buffer {
  const local: Buffer[] = [], central: Buffer[] = [], offsets: number[] = []; let offset = 0;
  for (const entry of entries) { const name = Buffer.from(entry.name, 'utf8'); const header = Buffer.alloc(30 + name.length); header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x0800, 6); header.writeUInt32LE(crc32(entry.data), 14); header.writeUInt32LE(entry.data.length, 18); header.writeUInt32LE(entry.data.length, 22); header.writeUInt16LE(name.length, 26); name.copy(header, 30); offsets.push(offset); local.push(header, entry.data); offset += header.length + entry.data.length; }
  const centralStart = offset;
  for (let index = 0; index < entries.length; index++) { const entry = entries[index]!; const name = Buffer.from(entry.name, 'utf8'); const header = Buffer.alloc(46 + name.length); header.writeUInt32LE(0x02014b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(20, 6); header.writeUInt16LE(0x0800, 8); header.writeUInt32LE(crc32(entry.data), 16); header.writeUInt32LE(entry.data.length, 20); header.writeUInt32LE(entry.data.length, 24); header.writeUInt16LE(name.length, 28); header.writeUInt32LE(offsets[index]!, 42); name.copy(header, 46); central.push(header); offset += header.length; }
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(offset - centralStart, 12); end.writeUInt32LE(centralStart, 16);
  return Buffer.concat([...local, ...central, end]);
}
export function yamlToDocx(inputPath: string, outputPath: string): string {
  const validation = validateYamlFile(inputPath);
  if (validation.validation_status === 'invalid') throw new Error(`Validazione YAML bloccante: ${validation.errors.map(error => error.message).join('; ')}`);
  const { model } = buildRecipeDocumentModel(inputPath);
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${renderModel(model)}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/><w:headerReference w:type="default" r:id="rId2"/><w:footerReference w:type="default" r:id="rId3"/></w:sectPr></w:body></w:document>`;
  const headerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:after="0"/></w:pPr>${run('SCHEDA OPERATIVA · BREWMASTER', { bold: true, color: PRIMARY, size: 16 })}</w:p></w:hdr>`;
  const footerXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr>' + run('Pagina ', { color: '52606D', size: 16 }) + '<w:fldSimple w:instr="PAGE"><w:r><w:rPr><w:color w:val="52606D"/><w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>';
  const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>';
  const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  const documentRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>';
  writeFileSync(outputPath, zip([
    { name: '[Content_Types].xml', data: Buffer.from(contentTypes) },
    { name: '_rels/.rels', data: Buffer.from(rels) },
    { name: 'word/document.xml', data: Buffer.from(documentXml) },
    { name: 'word/_rels/document.xml.rels', data: Buffer.from(documentRels) },
    { name: 'word/header1.xml', data: Buffer.from(headerXml) },
    { name: 'word/footer1.xml', data: Buffer.from(footerXml) },
  ]));
  return outputPath;
}
export class YamlToDocxTool implements BuiltinTool<YamlToDocxInput> {
  readonly name = 'yaml_to_docx' as const;
  readonly description = 'Genera una scheda operativa di cotta DOCX compilabile da una ricetta YAML, usando il modello operativo condiviso.';
  readonly parameters = toInputJsonSchema(YamlToDocxInputSchema);
  resolveExecution(args: YamlToDocxInput): ToolExecution {
    const outputFile = args.output_file ?? args.input_file.replace(/\.ya?ml$/i, '') + '.docx';
    return { description: `Generate brewday DOCX from ${args.input_file}`, approvalRule: this.name, execute: () => {
      try { if (!existsSync(args.input_file)) throw new Error(`File non trovato: ${args.input_file}`); const validation = validateYamlFile(args.input_file); if (validation.validation_status === 'invalid') throw new Error(`Validazione YAML bloccante: ${validation.errors.map(error => error.message).join('; ')}`); const { model } = buildRecipeDocumentModel(args.input_file); const path = yamlToDocx(args.input_file, outputFile); const warnings = [...model.sections.flatMap(section => section.warnings), ...validation.warnings.map(warning => warning.message)]; return Promise.resolve({ output: JSON.stringify({ status: warnings.length || model.unmappedFields.length ? 'warning' : 'ok', document_type: 'docx', path, recipe_name: model.metadata.name, schema_version: model.schemaVersion, validation_status: validation.validation_status, warnings, unmapped_fields: model.unmappedFields, errors: [] }) }); }
      catch (error) { return Promise.resolve({ isError: true, output: JSON.stringify({ status: 'error', document_type: 'docx', path: outputFile, recipe_name: null, schema_version: null, warnings: [], unmapped_fields: [], errors: [error instanceof Error ? error.message : String(error)] }) }); }
    } };
  }
}
registerTool(YamlToDocxTool);
