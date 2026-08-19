/**
 * Minimal, dependency-free PDF writer covering exactly the fluent API subset
 * `yaml-to-pdf.ts` uses (originally written against `pdfkit`). Bundling
 * pdfkit into a single-file MCP server is unreliable — it reads its standard
 * font metrics (.afm files) from paths relative to its own package at
 * runtime, which breaks once esbuild collapses everything into one file.
 * This class re-implements just enough of the PDF format (objects, xref,
 * standard-14 fonts, simple text/line/rect drawing) to render the same
 * recipe layout without any external dependency.
 *
 * Known simplifications versus pdfkit: text width is estimated from an
 * average glyph-width factor per font weight (not real AFM metrics), and
 * only Latin-1 codepoints are supported in text (others become `?`).
 */

import { writeFileSync } from 'node:fs';

export type PdfFontName = 'Helvetica' | 'Helvetica-Bold' | 'Helvetica-Oblique';

export interface PdfTextOptions {
  readonly align?: 'left' | 'center';
  readonly width?: number;
  readonly continued?: boolean;
  readonly lineGap?: number;
}

interface PageState {
  ops: string[];
}

const FONT_RESOURCE_NAME: Record<PdfFontName, string> = {
  Helvetica: 'F1',
  'Helvetica-Bold': 'F2',
  'Helvetica-Oblique': 'F3',
};

// Rough average glyph width as a fraction of font size (not real AFM metrics).
const AVG_CHAR_WIDTH: Record<PdfFontName, number> = {
  Helvetica: 0.5,
  'Helvetica-Bold': 0.56,
  'Helvetica-Oblique': 0.5,
};

function hexToRgb(color: string): [number, number, number] {
  let hex = color.trim();
  if (hex.startsWith('#')) hex = hex.slice(1);
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const n = parseInt(hex, 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  const r = ((n >> 16) & 0xff) / 255;
  const g = ((n >> 8) & 0xff) / 255;
  const b = (n & 0xff) / 255;
  return [r, g, b];
}

function toLatin1(str: string): string {
  let out = '';
  for (const ch of str) {
    const code = ch.codePointAt(0) ?? 63;
    out += code <= 255 ? String.fromCharCode(code) : '?';
  }
  return out;
}

function escapePdfString(str: string): string {
  return toLatin1(str).replace(/[\\()]/g, (m) => `\\${m}`);
}

export class PDFLite {
  private readonly pageW: number;
  private readonly pageH: number;
  private readonly margin: { top: number; bottom: number; left: number; right: number };
  private pages: PageState[] = [];
  private page!: PageState;

  private curFont: PdfFontName = 'Helvetica';
  private curSize = 12;
  private curFillColor: [number, number, number] = [0, 0, 0];
  private curStrokeColor: [number, number, number] = [0, 0, 0];
  private curLineWidth = 1;

  private cursorY: number;
  private pendingRect: { x: number; y: number; w: number; h: number } | undefined;
  private pendingLine: { x1: number; y1: number; x2: number; y2: number } | undefined;
  private lastMoveTo: { x: number; y: number } | undefined;
  /** Where a `continued: true` text call left off, in logical (top-down) coordinates. */
  private continuedCursor: { x: number; y: number } | undefined;

  constructor(opts: {
    size?: 'A4';
    margins?: { top: number; bottom: number; left: number; right: number };
  }) {
    // A4 in points.
    this.pageW = 595.28;
    this.pageH = 841.89;
    this.margin = opts.margins ?? { top: 50, bottom: 50, left: 50, right: 50 };
    this.cursorY = this.margin.top;
    this.addPage();
  }

  get y(): number {
    return this.cursorY;
  }

  set y(value: number) {
    this.cursorY = value;
  }

  addPage(): this {
    this.page = { ops: [] };
    this.pages.push(this.page);
    this.cursorY = this.margin.top;
    return this;
  }

  font(name: PdfFontName): this {
    this.curFont = name;
    return this;
  }

  fontSize(size: number): this {
    this.curSize = size;
    return this;
  }

  fillColor(color: string): this {
    this.curFillColor = hexToRgb(color);
    return this;
  }

  strokeColor(color: string): this {
    this.curStrokeColor = hexToRgb(color);
    return this;
  }

  lineWidth(width: number): this {
    this.curLineWidth = width;
    return this;
  }

  moveDown(lines = 1): this {
    this.cursorY += lines * this.lineHeight();
    return this;
  }

  moveTo(x: number, y: number): this {
    this.lastMoveTo = { x, y };
    return this;
  }

  lineTo(x: number, y: number): this {
    if (this.lastMoveTo) {
      this.pendingLine = { x1: this.lastMoveTo.x, y1: this.lastMoveTo.y, x2: x, y2: y };
    }
    this.lastMoveTo = { x, y };
    return this;
  }

  stroke(): this {
    // Drawn lazily so strokeColor()/lineWidth() calls made after lineTo() in
    // the same chain (as the ported call sites do) still take effect.
    if (!this.pendingLine) return this;
    const [r, g, b] = this.curStrokeColor;
    const { x1, y1, x2, y2 } = this.pendingLine;
    this.page.ops.push(
      `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG ${this.curLineWidth.toFixed(2)} w ` +
        `${x1.toFixed(2)} ${this.pdfY(y1).toFixed(2)} m ${x2.toFixed(2)} ${this.pdfY(y2).toFixed(2)} l S`,
    );
    this.pendingLine = undefined;
    return this;
  }

  rect(x: number, y: number, w: number, h: number): this {
    this.pendingRect = { x, y, w, h };
    return this;
  }

  fill(color?: string): this {
    if (!this.pendingRect) return this;
    const [r, g, b] = color ? hexToRgb(color) : this.curFillColor;
    const { x, y, w, h } = this.pendingRect;
    const pdfBottomY = this.pdfY(y + h);
    this.page.ops.push(
      `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x.toFixed(2)} ${pdfBottomY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`,
    );
    this.pendingRect = undefined;
    return this;
  }

  text(str: string, xOrOpts?: number | PdfTextOptions, y?: number, opts?: PdfTextOptions): this {
    let x: number | undefined;
    let actualY: number | undefined;
    let actualOpts: PdfTextOptions;
    if (typeof xOrOpts === 'object' && xOrOpts !== null) {
      actualOpts = xOrOpts;
    } else {
      x = xOrOpts;
      actualY = y;
      actualOpts = opts ?? {};
    }

    if (x === undefined) {
      const cursor = this.continuedCursor ?? { x: this.margin.left, y: this.cursorY };
      x = cursor.x;
      actualY = cursor.y;
    }
    actualY ??= this.cursorY;

    const lineHeight = this.curSize * 1.2 + (actualOpts.lineGap ?? 0);
    const usableWidth = actualOpts.width ?? this.pageW - this.margin.right - x;
    const lines = actualOpts.width || actualOpts.align === 'center'
      ? this.wrapText(str, actualOpts.width ?? usableWidth)
      : [str];

    let lastLineWidth = 0;
    lines.forEach((line, index) => {
      const lineY = actualY! + index * lineHeight;
      let lineX = x!;
      const lineWidth = this.measureWidth(line);
      lastLineWidth = lineWidth;
      if (actualOpts.align === 'center') {
        const box = actualOpts.width ?? this.pageW - this.margin.left - this.margin.right;
        const boxX = actualOpts.width ? x! : this.margin.left;
        lineX = boxX + Math.max(0, (box - lineWidth) / 2);
      }
      this.drawTextLine(line, lineX, lineY);
    });

    if (actualOpts.continued) {
      this.continuedCursor = { x: x + lastLineWidth, y: actualY };
    } else {
      this.continuedCursor = undefined;
      this.cursorY = actualY + lines.length * lineHeight;
    }
    return this;
  }

  save(outputPath: string): void {
    writeFileSync(outputPath, this.render());
  }

  // ── internals ────────────────────────────────────────────────────────────

  private lineHeight(): number {
    return this.curSize * 1.2;
  }

  private pdfY(logicalY: number): number {
    return this.pageH - logicalY;
  }

  private measureWidth(str: string): number {
    return str.length * this.curSize * AVG_CHAR_WIDTH[this.curFont];
  }

  private wrapText(str: string, maxWidth: number): string[] {
    if (maxWidth <= 0) return [str];
    const words = str.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [''];
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (this.measureWidth(candidate) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  private drawTextLine(str: string, x: number, y: number): void {
    if (!str) return;
    const [r, g, b] = this.curFillColor;
    const fontRes = FONT_RESOURCE_NAME[this.curFont];
    const pdfTextY = this.pdfY(y) - this.curSize; // baseline sits below the top of the line
    this.page.ops.push(
      `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg BT /${fontRes} ${this.curSize.toFixed(2)} Tf ` +
        `${x.toFixed(2)} ${pdfTextY.toFixed(2)} Td (${escapePdfString(str)}) Tj ET`,
    );
  }

  private render(): Buffer {
    const objects: string[] = [];
    // 1: Catalog, 2: Pages, 3-5: Fonts, then alternating Page/Content objects.
    const fontObjIds: Record<PdfFontName, number> = {
      Helvetica: 3,
      'Helvetica-Bold': 4,
      'Helvetica-Oblique': 5,
    };
    let nextId = 6;
    const pageIds: number[] = [];
    const contentIds: number[] = [];
    const pageObjects: string[] = [];

    for (const page of this.pages) {
      const pageId = nextId++;
      const contentId = nextId++;
      pageIds.push(pageId);
      contentIds.push(contentId);
      const content = page.ops.join('\n');
      pageObjects.push(
        `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> ` +
          `/MediaBox [0 0 ${this.pageW.toFixed(2)} ${this.pageH.toFixed(2)}] /Contents ${contentId} 0 R >>\nendobj`,
      );
      pageObjects.push(
        `${contentId} 0 obj\n<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream\nendobj`,
      );
    }

    objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`);
    objects.push(
      `2 0 obj\n<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>\nendobj`,
    );
    for (const [name, id] of Object.entries(fontObjIds)) {
      objects.push(
        `${id} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /${name} /Encoding /WinAnsiEncoding >>\nendobj`,
      );
    }
    objects.push(...pageObjects);

    const header = '%PDF-1.4\n';
    let body = '';
    const offsets: number[] = [0];
    let offset = Buffer.byteLength(header, 'latin1');
    for (const obj of objects) {
      offsets.push(offset);
      const chunk = `${obj}\n`;
      body += chunk;
      offset += Buffer.byteLength(chunk, 'latin1');
    }
    const xrefStart = offset;
    const totalObjects = objects.length + 1;
    let xref = `xref\n0 ${totalObjects}\n0000000000 65535 f \n`;
    for (let i = 1; i < totalObjects; i++) {
      xref += `${offsets[i]!.toString().padStart(10, '0')} 00000 n \n`;
    }
    const trailer = `trailer\n<< /Size ${totalObjects} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    return Buffer.from(header + body + xref + trailer, 'latin1');
  }
}
