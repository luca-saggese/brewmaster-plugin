/**
 * Side-effect barrel: importing this module registers every ported brewing
 * tool (via `registerTool`, see ../shim/tool-registry.ts) so `server.ts` can
 * enumerate them without listing each tool file by hand.
 */

import './brewing-calculator';
import './water-profile-calculator';
import './ibu-calculator';
import './priming-calculator';
import './recipe-validator';
import './inventory-search';
import './inventory-manager';
import './yaml-to-docx';
import './yaml-to-pdf';
import './memory-save';
import './memory-search';
import './memory-toggle';
import './recipe-list';
import './reference-recipe-search';
import './brewday-log';
import './fruit-calculator';
import './spice-calculator';
import './tincture-calculator';
import './yaml-validator';
