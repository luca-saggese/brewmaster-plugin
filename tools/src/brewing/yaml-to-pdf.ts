/**
 * YAML to PDF converter — converts a beer recipe YAML to a styled PDF.
 * Uses the dependency-free `PDFLite` shim (see ../shim/pdf-lite.ts) instead of
 * pdfkit, so the MCP server can ship as a single bundled file.
 */

import { z } from 'zod';
import { readFileSync, existsSync } from 'node:fs';
import * as yaml from 'js-yaml';

import type { BuiltinTool, ToolExecution } from '../shim/tool-contract';
import { registerTool } from '../shim/tool-registry';
import { toInputJsonSchema } from '../shim/input-schema';
import { PDFLite } from '../shim/pdf-lite';

export const YamlToPdfInputSchema = z.object({
  input_file: z.string().describe('Path to the recipe YAML file.'),
  output_file: z.string().optional().describe('Path for the output .pdf file.'),
});

export type YamlToPdfInput = z.infer<typeof YamlToPdfInputSchema>;

const MARGIN = 50;
const PAGE_W = 595;
const USABLE_W = PAGE_W - MARGIN * 2;
const PAGE_H = 842;

const COLOR_PRIMARY = '#c0392b';
const COLOR_TEXT = '#1a1a1a';
const COLOR_MUTED = '#7f8c8d';

export function yamlToPdf(inputPath: string, outputPath: string): string {
  const raw = readFileSync(inputPath, 'utf-8');
  const data: Record<string, unknown> = (yaml.load(raw) ?? {}) as Record<string, unknown>;

  const doc = new PDFLite({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });

  let y = doc.y;

  // Title
  doc.font('Helvetica-Bold').fontSize(22).fillColor(COLOR_PRIMARY)
    .text(String(data['nome'] ?? 'Ricetta di Birra'), MARGIN, y, { align: 'center' });
  y = doc.y + 12;

  // Style
  if (data['stile']) {
    doc.font('Helvetica-Oblique').fontSize(12).fillColor(COLOR_MUTED)
      .text(String(data['stile']), MARGIN, y, { align: 'center' });
    y = doc.y + 16;
  }

  // Description
  if (data['descrizione']) {
    y += 4;
    doc.font('Helvetica').fontSize(10).fillColor(COLOR_TEXT)
      .text(String(data['descrizione']), MARGIN, y, { width: USABLE_W, align: 'left' });
    y = doc.y + 12;
  }

  function section(title: string): number {
    if (doc.y > PAGE_H - 80) doc.addPage();
    const sy = doc.y + 6;
    doc.font('Helvetica-Bold').fontSize(14).fillColor(COLOR_PRIMARY)
      .text(title, MARGIN, sy);
    doc.moveTo(MARGIN, doc.y + 3).lineTo(PAGE_W - MARGIN, doc.y + 3).strokeColor(COLOR_PRIMARY).lineWidth(1.5).stroke();
    return doc.y + 9;
  }

  /**
   * Render a YAML value as a list of lines with proper indentation, so nested
   * objects and arrays of objects read like a JSON-serialized structure
   * instead of a flat `[object Object]` blob.
   */
  function valueLines(value: unknown, indent: number): string[] {
    if (value == null) return ['-'];
    if (typeof value === 'string') return [value];
    if (typeof value === 'number' || typeof value === 'boolean') return [String(value)];
    if (Array.isArray(value)) {
      if (value.length === 0) return ['-'];
      const lines: string[] = [];
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          const entries = Object.entries(item as Record<string, unknown>);
          if (entries.length === 0) {
            lines.push('• -');
            continue;
          }
          const [firstKey, firstVal] = entries[0]!;
          const firstLines = valueLines(firstVal, indent + 1);
          lines.push(`• ${firstKey}: ${firstLines[0] ?? ''}`);
          for (let i = 1; i < firstLines.length; i++) lines.push(`  ${firstLines[i]}`);
          for (let i = 1; i < entries.length; i++) {
            const [k, v] = entries[i]!;
            const vLines = valueLines(v, indent + 1);
            lines.push(`  ${k}: ${vLines[0] ?? ''}`);
            for (let j = 1; j < vLines.length; j++) lines.push(`    ${vLines[j]}`);
          }
        } else {
          lines.push(`• ${valueLines(item, indent + 1)[0] ?? ''}`);
        }
      }
      return lines;
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) return ['-'];
      const lines: string[] = [];
      for (const [k, v] of entries) {
        const vLines = valueLines(v, indent + 1);
        lines.push(`${k}: ${vLines[0] ?? ''}`);
        for (let i = 1; i < vLines.length; i++) lines.push(`  ${vLines[i]}`);
      }
      return lines;
    }
    return [String(value)];
  }

  function kv(label: string, value: unknown): number {
    const lines = valueLines(value, 0);
    const isComplex = Array.isArray(value) || (typeof value === 'object' && value !== null);
    if (doc.y > PAGE_H - 50) doc.addPage();
    if (isComplex) {
      // Label on its own line, then every item on its own line below.
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#555555')
        .text(label + ':', MARGIN, doc.y + 1, { lineGap: 4 });
      for (const line of lines) {
        if (doc.y > PAGE_H - 50) doc.addPage();
        doc.font('Helvetica').fontSize(10).fillColor(COLOR_TEXT)
          .text(line, MARGIN + 12, doc.y + 1, { width: USABLE_W - 12, lineGap: 4 });
      }
    } else {
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#555555')
        .text(label + ': ', MARGIN, doc.y + 1, { continued: true, lineGap: 4 })
        .font('Helvetica').fontSize(10).fillColor(COLOR_TEXT)
        .text(lines[0] ?? '-', { lineGap: 4 });
    }
    return doc.y;
  }

  /**
   * Render a top-level section generically: an array of strings becomes a
   * bulleted list (one line per item), an array of objects becomes a list of
   * indented blocks, and a plain object becomes key/value lines.
   */
  function renderSection(title: string, value: unknown): number {
    doc.y = section(title);
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          const lines = valueLines(item, 0);
          for (const line of lines) {
            if (doc.y > PAGE_H - 50) doc.addPage();
            doc.font('Helvetica').fontSize(10).fillColor(COLOR_TEXT)
              .text(line, MARGIN + 10, doc.y + 1, { width: USABLE_W - 10, lineGap: 4 });
          }
          doc.y += 2;
        } else {
          if (doc.y > PAGE_H - 50) doc.addPage();
          doc.font('Helvetica').fontSize(10).fillColor(COLOR_TEXT)
            .text('• ' + String(item), MARGIN + 10, doc.y + 1, { width: USABLE_W - 10, lineGap: 4 });
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        const label = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        doc.y = kv(label, v);
      }
    } else {
      if (doc.y > PAGE_H - 50) doc.addPage();
      doc.font('Helvetica').fontSize(10).fillColor(COLOR_TEXT)
        .text(String(value), MARGIN + 10, doc.y + 1, { width: USABLE_W - 10, lineGap: 4 });
    }
    return doc.y + 4;
  }

  function simpleTable(header: string[], rows: string[][], colWidths: number[]): number {
    if (doc.y > PAGE_H - 120) doc.addPage();
    const tableTop = doc.y + 4;
    const rowH = 18;

    // Header
    let x = MARGIN;
    for (let c = 0; c < header.length; c++) {
      doc.rect(x, tableTop, colWidths[c]!, rowH).fill(COLOR_PRIMARY);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff')
        .text(header[c]!, x + 3, tableTop + 4, { width: colWidths[c]! - 6, align: 'left' });
      x += colWidths[c]!;
    }

    // Rows
    let ry = tableTop + rowH;
    for (let ri = 0; ri < rows.length; ri++) {
      if (ry > PAGE_H - 60) { doc.addPage(); ry = MARGIN; }
      x = MARGIN;
      const fill = ri % 2 === 0 ? '#fafafa' : '#ffffff';
      for (let c = 0; c < header.length; c++) {
        doc.rect(x, ry, colWidths[c]!, rowH).fill(fill);
        doc.font('Helvetica').fontSize(9).fillColor(COLOR_TEXT)
          .text(rows[ri]?.[c] ?? '-', x + 3, ry + 4, { width: colWidths[c]! - 6 });
        x += colWidths[c]!;
      }
      ry += rowH;
    }
    return ry + 6;
  }

  // Parameters
  const params = data['parametri'] as Record<string, unknown> | undefined;
  if (params && Object.keys(params).length > 0) {
    y = section('Parametri');
    for (const [k, v] of Object.entries(params)) {
      const label = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      y = kv(label, v);
    }
    y += 6;
  }

  // Grist
  const grist = data['grist'] as Array<Record<string, unknown>> | undefined;
  if (grist && grist.length > 0) {
    y = section('Grist');
    y = simpleTable(['Malto', 'Kg', '%', 'Note'], grist.map((g) => [String(g['malto'] ?? ''), String(g['kg'] ?? ''), String(g['percent'] ?? ''), String(g['note'] ?? '')]), [200, 50, 50, USABLE_W - 300]);
  }

  // Hops
  const hops = data['luppolatura'] as Array<Record<string, unknown>> | undefined;
  if (hops && hops.length > 0) {
    y = section('Luppolatura');
    y = simpleTable(['Varietà', 'g', 'Tempo', 'Uso', 'AA%', 'IBU', 'Note'], hops.map((h) => [String(h['varieta'] ?? ''), String(h['grammi'] ?? ''), String(h['tempo_min'] ?? ''), String(h['uso'] ?? ''), String(h['aa_percent'] ?? ''), String(h['ibu_stimati'] ?? ''), String(h['note'] ?? '')]), [110, 45, 50, 55, 45, 45, USABLE_W - 350]);
  }

  // Key-value sections
  for (const sec of ['lievito', 'acqua', 'mash', 'bollitura', 'fermentazione', 'carbonazione']) {
    const obj = data[sec] as Record<string, unknown> | undefined;
    if (obj && Object.keys(obj).length > 0) {
      doc.y = section(sec.charAt(0).toUpperCase() + sec.slice(1));
      for (const [k, v] of Object.entries(obj)) {
        const label = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        y = kv(label, v);
      }
      y += 4;
    }
  }

  // Critical notes
  const notes = data['note_critiche'];
  if (notes) {
    y = section('Note Critiche');
    const items: string[] = Array.isArray(notes) ? notes : String(notes).split('\n');
    for (const n of items) {
      const trimmed = String(n).trim();
      if (!trimmed) continue;
      if (doc.y > PAGE_H - 40) doc.addPage();
      doc.font('Helvetica').fontSize(10).fillColor(COLOR_TEXT)
        .text('• ' + trimmed, MARGIN + 10, doc.y + 2, { width: USABLE_W - 10, lineGap: 4 });
    }
    y = doc.y;
  }

  // Alternatives
  const alts = data['alternative'] as Array<Record<string, unknown>> | undefined;
  if (alts && alts.length > 0) {
    y = section('Alternative');
    for (const a of alts) {
      if (doc.y > PAGE_H - 50) doc.addPage();
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR_TEXT)
        .text('• ' + String(a['descrizione'] ?? ''), MARGIN + 10, doc.y + 2, { width: USABLE_W - 10, lineGap: 4 });
      if (a['cambiamenti']) {
        doc.font('Helvetica').fontSize(9).fillColor(COLOR_MUTED)
          .text('Cambiamenti: ' + String(a['cambiamenti']), MARGIN + 20, doc.y + 1, { width: USABLE_W - 20, lineGap: 4 });
      }
      if (a['impatto']) {
        doc.font('Helvetica').fontSize(9).fillColor(COLOR_MUTED)
          .text('Impatto: ' + String(a['impatto']), MARGIN + 20, doc.y + 1, { width: USABLE_W - 20, lineGap: 4 });
      }
      doc.y += 2;
    }
  }

  // Generic fallback: render any remaining top-level section (cronologia,
  // note_degustazione, kit_originale, aggiunte_bollitura, fonte, ...) so no
  // recipe data is silently dropped.
  const handled = new Set([
    'nome', 'stile', 'descrizione', 'parametri', 'grist', 'luppolatura',
    'lievito', 'acqua', 'mash', 'bollitura', 'fermentazione', 'carbonazione',
    'note_critiche', 'alternative',
  ]);
  for (const [key, value] of Object.entries(data)) {
    if (handled.has(key)) continue;
    if (value == null) continue;
    const title = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    y = renderSection(title, value);
  }

  // Footer
  doc.y += 10;
  doc.font('Helvetica-Oblique').fontSize(8).fillColor(COLOR_MUTED)
    .text('Generato da Maestra Birraia AI — Kimi Code Brewing Assistant', MARGIN, doc.y, { align: 'center' });

  doc.save(outputPath);
  return outputPath;
}

// ── Tool ─────────────────────────────────────────────────────────────────────

export class YamlToPdfTool implements BuiltinTool<YamlToPdfInput> {
  readonly name = 'yaml_to_pdf' as const;
  readonly description =
    'Convert a beer recipe YAML file to a professionally styled PDF document. Uses pdfkit for reliable PDF generation.';
  readonly parameters: Record<string, unknown> = toInputJsonSchema(YamlToPdfInputSchema);

  resolveExecution(args: YamlToPdfInput): ToolExecution {
    const inputFile = args.input_file;
    const outputFile = args.output_file ?? inputFile.replace(/\.ya?ml$/i, '') + '.pdf';

    return {
      description: `Convert ${inputFile} → PDF`,
      approvalRule: this.name,
      execute: () => {
        try {
          if (!existsSync(inputFile)) {
            return Promise.resolve({ isError: true, output: `File not found: ${inputFile}` });
          }
          const result = yamlToPdf(inputFile, outputFile);
          return Promise.resolve({ output: `PDF saved: ${result}` });
        } catch (error) {
          return Promise.resolve({ isError: true, output: error instanceof Error ? error.message : String(error) });
        }
      },
    };
  }
}

registerTool(YamlToPdfTool);
