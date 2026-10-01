import { z } from 'zod';
import { existsSync, writeFileSync } from 'node:fs';

import type { BuiltinTool, ToolExecution } from '../shim/tool-contract';
import { registerTool } from '../shim/tool-registry';
import { toInputJsonSchema } from '../shim/input-schema';
import { buildRecipeDocumentModel, type OperationalSection, type RecipeDocumentModel, type TargetValue } from './recipe-document-model';

export const YamlToDocxInputSchema = z.object({
  input_file: z.string().describe('Path to the recipe YAML file.'),
  output_file: z.string().optional().describe('Path for the output .docx file.'),
});
export type YamlToDocxInput = z.infer<typeof YamlToDocxInputSchema>;

function escapeXml(value: unknown): string {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function paragraph(text: string, bold = false, size = 20): string {
  return `<w:p><w:r><w:rPr>${bold ? '<w:b/>' : ''}<w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}
function heading(text: string): string {
  return `<w:p><w:pPr><w:keepNext/><w:pBdr><w:bottom w:val="single" w:sz="5" w:space="4" w:color="8E2F23"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="8E2F23"/><w:sz w:val="28"/></w:rPr><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;
}
function cell(text: string, header = false): string {
  return `<w:tc><w:tcPr><w:shd w:fill="${header ? '8E2F23' : 'F5F1ED'}"/><w:tcMar><w:top w:w="70" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:start w:w="80" w:type="dxa"/><w:end w:w="80" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:r><w:rPr>${header ? '<w:b/><w:color w:val="FFFFFF"/>' : ''}<w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p></w:tc>`;
}
function table(headers: string[], rows: string[][]): string {
  const grid = headers.map(() => '<w:gridCol w:w="1800"/>').join('');
  const header = `<w:tr>${headers.map(item => cell(item, true)).join('')}</w:tr>`;
  const body = rows.map(row => `<w:tr>${headers.map((_, index) => cell(row[index] ?? '')).join('')}</w:tr>`).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblLayout w:type="autofit"/><w:tblBorders><w:top w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="2"/><w:insideV w:val="single" w:sz="2"/></w:tblBorders></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${header}${body}</w:tbl>`;
}
function targetRows(values: TargetValue[]): string[][] { return values.map(item => [item.label, item.value]); }
function renderSection(section: OperationalSection): string {
  let output = heading(section.title);
  if (section.targets.length) output += table(['TARGET', 'Valore'], targetRows(section.targets));
  if (section.actions.length) output += table(['Momento', 'Azione / ingrediente', 'Quantità', 'Temperatura / durata', 'Nota'], section.actions.map(action => [action.moment, [action.action, action.ingredient].filter(Boolean).join(': '), action.quantity ?? '', [action.temperature, action.duration].filter(Boolean).join(' / '), action.note ?? '']));
  if (section.measurements.length) output += table(['MISURATO', 'Valore reale'], section.measurements.map(item => [`${item.label}${item.unit ? ` (${item.unit})` : ''}`, '____________________________']));
  for (const warning of section.warnings) output += paragraph(`ATTENZIONE: ${warning}`);
  for (const note of section.notes) output += paragraph(`NOTA: ${note}`);
  return output;
}
function renderModel(model: RecipeDocumentModel): string {
  let body = `<w:p><w:pPr><w:jc w:val="center"/><w:keepNext/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="8E2F23"/><w:sz w:val="36"/></w:rPr><w:t>${escapeXml(model.metadata.name)}</w:t></w:r></w:p>`;
  body += `<w:p><w:pPr><w:jc w:val="center"/><w:keepNext/></w:pPr><w:r><w:rPr><w:i/><w:sz w:val="22"/></w:rPr><w:t>${escapeXml(model.metadata.style)}</w:t></w:r></w:p>`;
  if (model.metadata.description) body += paragraph(model.metadata.description);
  body += heading('A. Scheda iniziale');
  body += table(['Campo', 'TARGET / dato'], [['Data della cotta', '____________________________'], ['Impianto', model.metadata.equipment ?? ''], ...targetRows(model.summaryTargets), ...targetRows(model.objectives)]);
  for (const section of model.sections) body += renderSection(section);
  if (model.notes.length) { body += heading('Note informative'); for (const note of model.notes) body += paragraph(`NOTA: ${note}`); }
  if (model.alternatives.length) { body += heading('Alternative non selezionate'); for (const alternative of model.alternatives) body += paragraph(alternative); }
  if (model.unmappedFields.length) { body += heading('Campi YAML non mappati'); body += paragraph(model.unmappedFields.join(', ')); }
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
  const { model } = buildRecipeDocumentModel(inputPath);
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${renderModel(model)}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850"/></w:sectPr></w:body></w:document>`;
  const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
  const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  writeFileSync(outputPath, zip([{ name: '[Content_Types].xml', data: Buffer.from(contentTypes) }, { name: '_rels/.rels', data: Buffer.from(rels) }, { name: 'word/document.xml', data: Buffer.from(documentXml) }]));
  return outputPath;
}
export class YamlToDocxTool implements BuiltinTool<YamlToDocxInput> {
  readonly name = 'yaml_to_docx' as const;
  readonly description = 'Genera una scheda operativa di cotta DOCX compilabile da una ricetta YAML, usando il modello operativo condiviso.';
  readonly parameters = toInputJsonSchema(YamlToDocxInputSchema);
  resolveExecution(args: YamlToDocxInput): ToolExecution {
    const outputFile = args.output_file ?? args.input_file.replace(/\.ya?ml$/i, '') + '.docx';
    return { description: `Generate brewday DOCX from ${args.input_file}`, approvalRule: this.name, execute: () => {
      try { if (!existsSync(args.input_file)) throw new Error(`File non trovato: ${args.input_file}`); const { model } = buildRecipeDocumentModel(args.input_file); const path = yamlToDocx(args.input_file, outputFile); const warnings = model.sections.flatMap(section => section.warnings); return Promise.resolve({ output: JSON.stringify({ status: warnings.length || model.unmappedFields.length ? 'warning' : 'ok', document_type: 'docx', path, recipe_name: model.metadata.name, schema_version: model.schemaVersion, warnings, unmapped_fields: model.unmappedFields, errors: [] }) }); }
      catch (error) { return Promise.resolve({ isError: true, output: JSON.stringify({ status: 'error', document_type: 'docx', path: outputFile, recipe_name: null, schema_version: null, warnings: [], unmapped_fields: [], errors: [error instanceof Error ? error.message : String(error)] }) }); }
    } };
  }
}
registerTool(YamlToDocxTool);
