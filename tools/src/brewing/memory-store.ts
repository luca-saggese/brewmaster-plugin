/**
 * Brewing memory store — persistent cross-session memory for the brassicolo profile.
 *
 * Stores and retrieves brewing-related facts (user preferences, equipment,
 * recurring constraints, learned preferences) across sessions.
 *
 * Data lives under the per-user data root (`.brewing-data` inside the user's
 * chroot when a user is attached, else `~/.kimi-code/brewing`).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

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

const MEMORY_FILE = 'memory.json';

function memoryPath(root: string): string {
  return join(root, MEMORY_FILE);
}

function ensureDir(root: string): void {
  const dir = dirname(memoryPath(root));
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/** Read all memory entries from disk. Returns empty array if file doesn't exist. */
export function loadMemories(root: string): MemoryEntry[] {
  const path = memoryPath(root);
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
export function saveMemory(root: string, entry: Omit<MemoryEntry, 'createdAt' | 'updatedAt'>): void {
  ensureDir(root);
  const memories = loadMemories(root);
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
  writeFileSync(memoryPath(root), JSON.stringify(file, null, 2), 'utf-8');
}

/** Delete a memory entry by key. Returns true if deleted. */
export function deleteMemory(root: string, key: string): boolean {
  const memories = loadMemories(root);
  const idx = memories.findIndex((m) => m.key === key);
  if (idx < 0) return false;
  memories.splice(idx, 1);
  const file: MemoryFile = { version: 1, entries: memories };
  writeFileSync(memoryPath(root), JSON.stringify(file, null, 2), 'utf-8');
  return true;
}

/** Search memories by query (searches key, category, and content fields). */
export function searchMemories(root: string, query: string): MemoryEntry[] {
  const q = query.toLowerCase();
  return loadMemories(root).filter(
    (m) =>
      m.key.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      m.content.toLowerCase().includes(q),
  );
}

/** Get all memories grouped by category. */
export function getMemoriesByCategory(root: string): Record<string, MemoryEntry[]> {
  const groups: Record<string, MemoryEntry[]> = {};
  for (const m of loadMemories(root)) {
    (groups[m.category] ??= []).push(m);
  }
  return groups;
}

/** Generate a condensed summary of all memories for the system prompt context. */
export function summarizeMemories(root: string): string {
  const memories = loadMemories(root);
  if (memories.length === 0) return '';

  const groups = getMemoriesByCategory(root);
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
