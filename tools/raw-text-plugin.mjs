// rolldown/tsdown plugin: resolves `...something.yaml?raw` imports and returns
// a JS module that default-exports the raw file content as a string.
// Recreates the previously external `../../../../build/raw-text-plugin.mjs`
// (never committed to the repo) so the build works standalone.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RAW_SUFFIX = '?raw';

/** Convert the query id (e.g. `/a/b.yaml?raw`) to its on-disk path. */
function stripRaw(id) {
  return id.endsWith(RAW_SUFFIX) ? id.slice(0, -RAW_SUFFIX.length) : id;
}

export function rawTextPlugin() {
  return {
    name: 'raw-text',
    resolveId(source, importer) {
      if (!source.includes(RAW_SUFFIX)) return null;
      if (!importer) return { id: source };
      const abs = resolve(importer.replace(/\/[^/]+$/, ''), source);
      return { id: abs };
    },
    async load(id) {
      if (!id.endsWith(RAW_SUFFIX)) return null;
      const filePath = stripRawQueries(id);
      const content = readFileSync(filePath, 'utf-8');
      return {
        code: `export default ${JSON.stringify(content)};`,
        map: null,
      };
    },
  };
}

function stripRawQueries(id) {
  // id ends with "?raw" but resolution may have kept it; remove it.
  return id.endsWith(RAW_SUFFIX) ? id.slice(0, -RAW_SUFFIX.length) : id;
}