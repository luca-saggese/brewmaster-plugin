/**
 * Brewing memory store — persistent cross-session memory for the brassicolo profile.
 *
 * Stores and retrieves brewing-related facts (user preferences, equipment,
 * recurring constraints, learned preferences) across sessions.
 *
 * File: ~/.kimi-code/brewing/memory.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';

function resolveKimiHome(): string {
  return join(homedir(), '.kimi-code');
}

export interface MemoryEntry {
  readonly key: string;           // short identifier
  readonly category: string;      // equipment, preference, constraint, note, etc.
  readonly content: string;       // the actual remembered fact
  readonly createdAt: string;     // ISO timestamp
  readonly updatedAt: string;     // ISO timestamp
}

interface MemoryFile {
  version: 1;
  entries: MemoryEntry[];
}

const MEMORY_DIR = 'brewing';
const MEMORY_FILE = 'memory.json';

function memoryPath(): string {
  const home = resolveKimiHome();
  return join(home, MEMORY_DIR, MEMORY_FILE);
}

function ensureDir(): void {
  const dir = dirname(memoryPath());
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/** Read all memory entries from disk. Returns empty array if file doesn't exist. */
export function loadMemories(): MemoryEntry[] {
  const path = memoryPath();
  if (!existsSync(path)) return [];
  try {
    const raw = readFileSync(path, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && 'entries' in parsed) {
      const file = parsed as MemoryFile;
      if (file.version === 1 && Array.isArray(file.entries)) {
        return file.entries;
      }
    }
    return [];
  } catch {
    return [];
  }
}

/** Save a new memory entry (or update existing by key). */
export function saveMemory(entry: Omit<MemoryEntry, 'createdAt' | 'updatedAt'>): void {
  ensureDir();
  const memories = loadMemories();
  const now = new Date().toISOString();
  const existing = memories.findIndex((m) => m.key === entry.key);

  if (existing >= 0) {
    memories[existing] = {
      ...memories[existing],
      content: entry.content,
      category: entry.category,
      updatedAt: now,
    };
  } else {
    memories.push({
      ...entry,
      createdAt: now,
      updatedAt: now,
    });
  }

  const file: MemoryFile = { version: 1, entries: memories };
  writeFileSync(memoryPath(), JSON.stringify(file, null, 2), 'utf-8');
}

/** Delete a memory entry by key. Returns true if deleted. */
export function deleteMemory(key: string): boolean {
  const memories = loadMemories();
  const idx = memories.findIndex((m) => m.key === key);
  if (idx < 0) return false;
  memories.splice(idx, 1);
  const file: MemoryFile = { version: 1, entries: memories };
  writeFileSync(memoryPath(), JSON.stringify(file, null, 2), 'utf-8');
  return true;
}

/** Search memories by query (searches key, category, and content fields). */
export function searchMemories(query: string): MemoryEntry[] {
  const q = query.toLowerCase();
  return loadMemories().filter(
    (m) =>
      m.key.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      m.content.toLowerCase().includes(q),
  );
}

/** Get all memories grouped by category. */
export function getMemoriesByCategory(): Record<string, MemoryEntry[]> {
  const groups: Record<string, MemoryEntry[]> = {};
  for (const m of loadMemories()) {
    (groups[m.category] ??= []).push(m);
  }
  return groups;
}

/** Generate a condensed summary of all memories for the system prompt context. */
export function summarizeMemories(): string {
  const memories = loadMemories();
  if (memories.length === 0) return '';

  const groups = getMemoriesByCategory();
  const lines: string[] = ['## MEMORIA PERSISTENTE', '', 'Informazioni ricordate da sessioni precedenti:'];

  for (const [category, entries] of Object.entries(groups)) {
    const catName = category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    lines.push(`\n### ${catName}`);
    for (const entry of entries) {
      lines.push(`- ${entry.content}`);
    }
  }

  return lines.join('\n');
}
