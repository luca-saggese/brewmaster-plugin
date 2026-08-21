/**
 * YAML to DOCX converter — converts a beer recipe YAML file to a .docx document.
 * Pure Node.js: uses js-yaml for parsing, generates Office Open XML (docx is a zip of XML).
 */

import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import * as yaml from 'js-yaml';

import type { BuiltinTool, ToolExecution } from '../shim/tool-contract';
import { registerTool } from '../shim/tool-registry';
import { toInputJsonSchema } from '../shim/input-schema';

export const YamlToDocxInputSchema = z.object({
  input_file: z.string().describe('Path to the recipe YAML file.'),
  output_file: z.string().optional().describe('Path for the output .docx file. Defaults to input_file with .docx extension.'),
});

export type YamlToDocxInput = z.infer<typeof YamlToDocxInputSchema>;

function escapeXml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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

export function yamlToDocx(inputPath: string, outputPath: string): string {
  const raw = readFileSync(inputPath, 'utf-8');
  const data: Record<string, unknown> = (yaml.load(raw) ?? {}) as Record<string, unknown>;

  // Build document.xml
  let body = '';

  // Title
  const nome = String(data['nome'] ?? 'Ricetta di Birra');
  body += `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="36"/></w:rPr><w:t xml:space="preserve">${escapeXml(nome)}</w:t></w:r></w:p>`;

  if (data['stile']) {
    body += `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:i/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${escapeXml(String(data['stile']))}</w:t></w:r></w:p>`;
  }

  if (data['descrizione']) {
    body += `<w:p><w:r><w:rPr><w:sz w:val="21"/></w:rPr><w:t xml:space="preserve">${escapeXml(String(data['descrizione']))}</w:t></w:r></w:p>`;
  }

  function heading(text: string): void {
    body += `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="4" w:color="C0392B"/></w:pBdr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="C0392B"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
  }

  function kv(label: string, value: unknown): void {
    const lines = valueLines(value, 0);
    const isComplex = Array.isArray(value) || (typeof value === 'object' && value !== null);
    if (isComplex) {
      // Label on its own line, then every item on its own line below.
      body += `<w:p><w:r><w:rPr><w:b/><w:sz w:val="21"/></w:rPr><w:t xml:space="preserve">${escapeXml(label)}:</w:t></w:r></w:p>`;
      for (const line of lines) {
        body += `<w:p><w:r><w:rPr><w:sz w:val="21"/></w:rPr><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`;
      }
    } else {
      body += `<w:p><w:r><w:rPr><w:b/><w:sz w:val="21"/></w:rPr><w:t xml:space="preserve">${escapeXml(label)}: </w:t></w:r><w:r><w:rPr><w:sz w:val="21"/></w:rPr><w:t xml:space="preserve">${escapeXml(lines[0] ?? '-')}</w:t></w:r></w:p>`;
    }
  }

  function simpleTable(header: string[], rows: string[][]): void {
    body += '<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="C0392B"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="C0392B"/></w:tblBorders></w:tblPr><w:tblGrid>';
    const colWidth = Math.floor(9000 / header.length);
    for (let i = 0; i < header.length; i++) body += `<w:gridCol w:w="${colWidth}"/>`;
    body += '</w:tblGrid>';

    // Header row
    body += '<w:tr>';
    for (const h of header) {
      body += `<w:tc><w:tcPr><w:shd w:fill="C0392B" w:val="clear"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="19"/></w:rPr><w:t xml:space="preserve">${escapeXml(h)}</w:t></w:r></w:p></w:tc>`;
    }
    body += '</w:tr>';

    // Data rows
    for (const row of rows) {
      body += '<w:tr>';
      for (let c = 0; c < header.length; c++) {
        body += `<w:tc><w:p><w:r><w:rPr><w:sz w:val="19"/></w:rPr><w:t xml:space="preserve">${escapeXml(row[c] ?? '-')}</w:t></w:r></w:p></w:tc>`;
      }
      body += '</w:tr>';
    }
    body += '</w:tbl>';
  }

  // Parameters
  const params = data['parametri'] as Record<string, unknown> | undefined;
  if (params && Object.keys(params).length > 0) {
    heading('Parametri');
    for (const [k, v] of Object.entries(params)) {
      kv(k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), v);
    }
  }

  // Grist
  const grist = data['grist'] as Array<Record<string, unknown>> | undefined;
  if (grist && grist.length > 0) {
    heading('Grist');
    simpleTable(['Malto', 'Kg', '%', 'Note'],
      grist.map((g) => [String(g['malto'] ?? ''), String(g['kg'] ?? ''), String(g['percent'] ?? ''), String(g['note'] ?? '')]));
  }

  // Hops
  const hops = data['luppolatura'] as Array<Record<string, unknown>> | undefined;
  if (hops && hops.length > 0) {
    heading('Luppolatura');
    simpleTable(['Varietà', 'g', 'Tempo', 'Uso', 'AA%', 'IBU', 'Note'],
      hops.map((h) => [
        String(h['varieta'] ?? ''), String(h['grammi'] ?? ''), String(h['tempo_min'] ?? ''),
        String(h['uso'] ?? ''), String(h['aa_percent'] ?? ''), String(h['ibu_stimati'] ?? ''),
        String(h['note'] ?? ''),
      ]));
  }

  // Sections
  for (const sec of ['lievito', 'acqua', 'mash', 'bollitura', 'fermentazione', 'carbonazione']) {
    const obj = data[sec] as Record<string, unknown> | undefined;
    if (obj && Object.keys(obj).length > 0) {
      heading(sec.charAt(0).toUpperCase() + sec.slice(1));
      for (const [k, v] of Object.entries(obj)) {
        kv(k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), v);
      }
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
    heading(title);
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          for (const line of valueLines(item, 0)) {
            body += `<w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`;
          }
        } else {
          body += `<w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">• ${escapeXml(String(item))}</w:t></w:r></w:p>`;
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        kv(k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), v);
      }
    } else {
      body += `<w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${escapeXml(String(value))}</w:t></w:r></w:p>`;
    }
  }

  // Critical notes
  const notes = data['note_critiche'];
  if (notes) {
    heading('Note Critiche');
    const items: string[] = Array.isArray(notes) ? notes : String(notes).split('\n');
    for (const n of items) {
      const trimmed = String(n).trim();
      if (!trimmed) continue;
      body += `<w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">• ${escapeXml(trimmed)}</w:t></w:r></w:p>`;
    }
  }

  // Alternatives
  const alts = data['alternative'] as Array<Record<string, unknown>> | undefined;
  if (alts && alts.length > 0) {
    heading('Alternative');
    for (const a of alts) {
      body += `<w:p><w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">• ${escapeXml(String(a['descrizione'] ?? ''))}</w:t></w:r></w:p>`;
      if (a['cambiamenti']) body += `<w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">  Cambiamenti: ${escapeXml(String(a['cambiamenti']))}</w:t></w:r></w:p>`;
      if (a['impatto']) body += `<w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">  Impatto: ${escapeXml(String(a['impatto']))}</w:t></w:r></w:p>`;
    }
  }

  // Footer
  body += `<w:p><w:r><w:rPr><w:i/><w:sz w:val="16"/><w:color w:val="999999"/></w:rPr><w:t xml:space="preserve">Generato da Maestra Birraia AI</w:t></w:r></w:p>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>${body}</w:body></w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  // Simple zip: store method, no compression (compatible with all readers)
  function crc32(data: Buffer): number {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i]!;
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  interface ZipEntry {
    name: string;
    data: Buffer;
  }

  function buildZip(entries: ZipEntry[]): Buffer {
    const chunks: Buffer[] = [];
    const localHeaders: Array<{ offset: number; name: string; crc: number; size: number }> = [];
    let offset = 0;

    for (const entry of entries) {
      const nameBuf = Buffer.from(entry.name, 'utf-8');
      const crc = crc32(entry.data);
      const header = Buffer.alloc(30 + nameBuf.length);
      let pos = 0;
      header.writeUInt32LE(0x04034b50, pos); pos += 4; // local file header sig
      header.writeUInt16LE(20, pos); pos += 2; // version needed
      header.writeUInt16LE(0x0800, pos); pos += 2; // flags: UTF-8
      header.writeUInt16LE(0, pos); pos += 2; // compression: store
      header.writeUInt16LE(0, pos); pos += 2; // mod time
      header.writeUInt16LE(0, pos); pos += 2; // mod date
      header.writeUInt32LE(crc, pos); pos += 4;
      header.writeUInt32LE(entry.data.length, pos); pos += 4; // compressed size
      header.writeUInt32LE(entry.data.length, pos); pos += 4; // uncompressed size
      header.writeUInt16LE(nameBuf.length, pos); pos += 2;
      header.writeUInt16LE(0, pos); pos += 2; // extra field length
      nameBuf.copy(header, pos);
      chunks.push(header);
      chunks.push(entry.data);
      localHeaders.push({ offset, name: entry.name, crc, size: entry.data.length });
      offset += header.length + entry.data.length;
    }

    // Central directory
    const cdChunks: Buffer[] = [];
    let cdOffset = offset;
    for (const lh of localHeaders) {
      const nameBuf = Buffer.from(lh.name, 'utf-8');
      const cd = Buffer.alloc(46 + nameBuf.length);
      let pos = 0;
      cd.writeUInt32LE(0x02014b50, pos); pos += 4;
      cd.writeUInt16LE(20, pos); pos += 2; // version made by
      cd.writeUInt16LE(20, pos); pos += 2; // version needed
      cd.writeUInt16LE(0x0800, pos); pos += 2; // UTF-8
      cd.writeUInt16LE(0, pos); pos += 2; // compression: store
      cd.writeUInt16LE(0, pos); pos += 2; // mod time
      cd.writeUInt16LE(0, pos); pos += 2; // mod date
      cd.writeUInt32LE(lh.crc, pos); pos += 4;
      cd.writeUInt32LE(lh.size, pos); pos += 4;
      cd.writeUInt32LE(lh.size, pos); pos += 4;
      cd.writeUInt16LE(nameBuf.length, pos); pos += 2;
      cd.writeUInt16LE(0, pos); pos += 2; // extra
      cd.writeUInt16LE(0, pos); pos += 2; // comment
      cd.writeUInt16LE(0, pos); pos += 2; // disk
      cd.writeUInt16LE(0, pos); pos += 2; // internal attrs
      cd.writeUInt32LE(0, pos); pos += 4; // external attrs
      cd.writeUInt32LE(lh.offset, pos); pos += 4;
      nameBuf.copy(cd, pos);
      cdChunks.push(cd);
      cdOffset += cd.length;
    }

    // End of central directory
    const eocd = Buffer.alloc(22);
    let pos = 0;
    eocd.writeUInt32LE(0x06054b50, pos); pos += 4;
    eocd.writeUInt16LE(0, pos); pos += 2;
    eocd.writeUInt16LE(0, pos); pos += 2;
    eocd.writeUInt16LE(entries.length, pos); pos += 2;
    eocd.writeUInt16LE(entries.length, pos); pos += 2;
    eocd.writeUInt32LE(cdOffset - offset, pos); pos += 4;
    eocd.writeUInt32LE(offset, pos); pos += 4;
    eocd.writeUInt16LE(0, pos);

    return Buffer.concat([...chunks, ...cdChunks, eocd]);
  }

  const zip = buildZip([
    { name: '[Content_Types].xml', data: Buffer.from(contentTypesXml, 'utf-8') },
    { name: '_rels/.rels', data: Buffer.from(relsXml, 'utf-8') },
    { name: 'word/document.xml', data: Buffer.from(documentXml, 'utf-8') },
  ]);

  writeFileSync(outputPath, zip);
  return `DOCX saved: ${outputPath}`;
}

// ── Tool ─────────────────────────────────────────────────────────────────────

export class YamlToDocxTool implements BuiltinTool<YamlToDocxInput> {
  readonly name = 'yaml_to_docx' as const;
  readonly description =
    'Convert a beer recipe YAML file to a .docx (Word) document. Pure Node.js — generates valid Office Open XML, no external dependencies beyond js-yaml.';
  readonly parameters: Record<string, unknown> = toInputJsonSchema(YamlToDocxInputSchema);

  resolveExecution(args: YamlToDocxInput): ToolExecution {
    const inputFile = args.input_file;
    const outputFile = args.output_file ?? inputFile.replace(/\.ya?ml$/i, '') + '.docx';

    return {
      description: `Convert ${inputFile} → DOCX`,
      approvalRule: this.name,
      execute: () => {
        try {
          if (!existsSync(inputFile)) {
            return Promise.resolve({ isError: true, output: `File not found: ${inputFile}` });
          }
          const result = yamlToDocx(inputFile, outputFile);
          return Promise.resolve({ output: result });
        } catch (error) {
          return Promise.resolve({ isError: true, output: error instanceof Error ? error.message : String(error) });
        }
      },
    };
  }
}

registerTool(YamlToDocxTool);
