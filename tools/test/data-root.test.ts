import { strict as assert } from 'node:assert';
import { dataRoot } from '../src/brewing/data-root.ts';

const args = {
  _kimi_user: {
    chroot: '/tmp/brewmaster-sandbox',
    username: 'mario.rossi',
  },
};

assert.equal(
  dataRoot(args),
  '/tmp/brewmaster-sandbox/users/mario.rossi/.brewing-data',
);

assert.throws(
  () => dataRoot({ _kimi_user: { chroot: '/tmp/brewmaster-sandbox' } }),
  /Contesto utente mancante/,
);

assert.throws(
  () => dataRoot({}),
  /Contesto utente mancante/,
);

console.log('data-root tests passed');