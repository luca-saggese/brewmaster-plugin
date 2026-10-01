import { z } from 'zod';
import { existsSync } from 'node:fs';

import type { BuiltinTool, ToolExecution } from '../shim/tool-contract';
import { registerTool } from '../shim/tool-registry';
import { toInputJsonSchema } from '../shim/input-schema';
import { PDFLite } from '../shim/pdf-lite';
import { buildRecipeDocumentModel, type OperationalSection, type RecipeDocumentModel, type TargetValue } from './recipe-document-model';

export const YamlToPdfInputSchema = z.object({
  input_file: z.string().describe('Path to the recipe YAML file.'),
  output_file: z.string().optional().describe('Path for the output .pdf file.'),
});
export type YamlToPdfInput = z.infer<typeof YamlToPdfInputSchema>;

const MARGIN = 42;
const PAGE_W = 595;
const PAGE_H = 842;
const USABLE_W = PAGE_W - MARGIN * 2;
const PRIMARY = '#8e2f23';
const TEXT = '#1a1a1a';
const MUTED = '#68615d';

function wrapCount(value: string, width: number): number { return Math.max(1, Math.ceil(value.length / Math.max(1, Math.floor(width / 5.2)))); }
function targetRows(values: TargetValue[]): string[][] { return values.map(item => [item.label, item.value]); }

class BrewdayPdfRenderer {
  private readonly doc = new PDFLite({ size: 'A4', margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } });
  private readonly widths = [115, USABLE_W - 115];
  private ensure(height: number): void { if (this.doc.y + height > PAGE_H - MARGIN) this.doc.addPage(); }
  private title(text: string): void { this.ensure(35); this.doc.font('Helvetica-Bold').fontSize(14).fillColor(PRIMARY).text(text, MARGIN, this.doc.y + 6, { width: USABLE_W }); this.doc.moveTo(MARGIN, this.doc.y + 2).lineTo(PAGE_W - MARGIN, this.doc.y + 2).strokeColor(PRIMARY).lineWidth(1).stroke(); this.doc.y += 8; }
  private paragraph(text: string, bold = false): void { this.ensure(24); this.doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5).fillColor(TEXT).text(text, MARGIN, this.doc.y + 2, { width: USABLE_W, lineGap: 2 }); this.doc.y += 3; }
  private table(headers: string[], rows: string[][]): void {
    const widths = headers.length === 2 ? this.widths : headers.map(() => USABLE_W / headers.length);
    let headerPending = true;
    const drawHeader = (): void => { this.ensure(24); let x = MARGIN; headers.forEach((header, index) => { const width = widths[index]!; this.doc.rect(x, this.doc.y, width, 22).fill(PRIMARY); this.doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff').text(header, x + 3, this.doc.y + 5, { width: width - 6 }); x += width; }); this.doc.y += 22; headerPending = false; };
    drawHeader();
    for (const row of rows) {
      const lines = row.map((value, index) => wrapCount(value, widths[index]! - 8));
      const height = Math.max(20, Math.max(...lines) * 11 + 8);
      if (this.doc.y + height > PAGE_H - MARGIN) { this.doc.addPage(); headerPending = true; }
      if (headerPending) drawHeader();
      let x = MARGIN; row.forEach((value, index) => { const width = widths[index]!; this.doc.rect(x, this.doc.y, width, height).fill('#f5f1ed'); this.doc.font('Helvetica').fontSize(8.5).fillColor(TEXT).text(value, x + 3, this.doc.y + 5, { width: width - 6, lineGap: 1 }); x += width; }); this.doc.y += height;
    }
    this.doc.y += 7;
  }
  section(section: OperationalSection): void {
    this.title(section.title);
    if (section.targets.length) this.table(['TARGET', 'Valore'], targetRows(section.targets));
    if (section.actions.length) this.table(['Momento', 'Azione / ingrediente', 'Quantità', 'Temp. / durata', 'Nota'], section.actions.map(action => [action.moment, [action.action, action.ingredient].filter(Boolean).join(': '), action.quantity ?? '', [action.temperature, action.duration].filter(Boolean).join(' / '), action.note ?? '']));
    if (section.measurements.length) this.table(['MISURATO', 'Valore reale'], section.measurements.map(item => [`${item.label}${item.unit ? ` (${item.unit})` : ''}`, '____________________________']));
    for (const warning of section.warnings) this.paragraph(`ATTENZIONE: ${warning}`);
    for (const note of section.notes) this.paragraph(`NOTA: ${note}`);
  }
  render(model: RecipeDocumentModel, outputPath: string): void {
    this.doc.font('Helvetica-Bold').fontSize(22).fillColor(PRIMARY).text(model.metadata.name, MARGIN, this.doc.y, { width: USABLE_W, align: 'center' });
    this.doc.font('Helvetica-Oblique').fontSize(11).fillColor(MUTED).text(model.metadata.style, MARGIN, this.doc.y + 4, { width: USABLE_W, align: 'center' });
    if (model.metadata.description) this.paragraph(model.metadata.description);
    this.title('A. Scheda iniziale');
    this.table(['Campo', 'TARGET / dato'], [['Data della cotta', '____________________________'], ['Impianto', model.metadata.equipment ?? ''], ...targetRows(model.summaryTargets), ...targetRows(model.objectives)]);
    for (const section of model.sections) this.section(section);
    if (model.notes.length) { this.title('Note informative'); for (const note of model.notes) this.paragraph(`NOTA: ${note}`); }
    if (model.alternatives.length) { this.title('Alternative non selezionate'); for (const alternative of model.alternatives) this.paragraph(alternative); }
    if (model.unmappedFields.length) { this.title('Campi YAML non mappati'); this.paragraph(model.unmappedFields.join(', ')); }
    this.doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(MUTED).text('Scheda operativa generata da Maestra Birraia AI', MARGIN, Math.min(this.doc.y + 10, PAGE_H - MARGIN), { width: USABLE_W, align: 'center' });
    this.doc.save(outputPath);
  }
}

export function yamlToPdf(inputPath: string, outputPath: string): string {
  const { model } = buildRecipeDocumentModel(inputPath);
  new BrewdayPdfRenderer().render(model, outputPath);
  return outputPath;
}

export class YamlToPdfTool implements BuiltinTool<YamlToPdfInput> {
  readonly name = 'yaml_to_pdf' as const;
  readonly description = 'Genera una scheda operativa di cotta PDF A4 con PDFLite, usando lo stesso modello operativo del DOCX.';
  readonly parameters = toInputJsonSchema(YamlToPdfInputSchema);
  resolveExecution(args: YamlToPdfInput): ToolExecution {
    const outputFile = args.output_file ?? args.input_file.replace(/\.ya?ml$/i, '') + '.pdf';
    return { description: `Generate brewday PDF from ${args.input_file}`, approvalRule: this.name, execute: () => {
      try { if (!existsSync(args.input_file)) throw new Error(`File non trovato: ${args.input_file}`); const { model } = buildRecipeDocumentModel(args.input_file); const path = yamlToPdf(args.input_file, outputFile); const warnings = model.sections.flatMap(section => section.warnings); return Promise.resolve({ output: JSON.stringify({ status: warnings.length || model.unmappedFields.length ? 'warning' : 'ok', document_type: 'pdf', path, recipe_name: model.metadata.name, schema_version: model.schemaVersion, warnings, unmapped_fields: model.unmappedFields, errors: [] }) }); }
      catch (error) { return Promise.resolve({ isError: true, output: JSON.stringify({ status: 'error', document_type: 'pdf', path: outputFile, recipe_name: null, schema_version: null, warnings: [], unmapped_fields: [], errors: [error instanceof Error ? error.message : String(error)] }) }); }
    } };
  }
}
registerTool(YamlToPdfTool);
