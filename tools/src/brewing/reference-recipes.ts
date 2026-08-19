/**
 * Reference recipe library — the curated BJCP reference recipes, bundled into
 * the package via `?raw` imports so they are available at runtime in both dev
 * and production builds.
 *
 * Every recipe is a real, published recipe sourced from a recognized reference
 * (BYO, Craft Beer & Brewing, AHA, malt/yeast producers, established authors).
 * Each carries a `fonte` (source) block with a URL and a verification status.
 * Nothing here is invented.
 */

import * as yaml from 'js-yaml';

import r1A from './recipes/01-standard-american/1A-american-light-lager.yaml?raw';
import r1B from './recipes/01-standard-american/1B-american-lager.yaml?raw';
import r1C from './recipes/01-standard-american/1C-cream-ale.yaml?raw';
import r1D from './recipes/01-standard-american/1D-american-wheat.yaml?raw';
import r2A from './recipes/02-international-lager/2A-international-pale-lager.yaml?raw';
import r2B from './recipes/02-international-lager/2B-international-amber-lager.yaml?raw';
import r2C from './recipes/02-international-lager/2C-international-dark-lager.yaml?raw';
import r3A from './recipes/03-czech-lager/3A-czech-pale-lager.yaml?raw';
import r3B from './recipes/03-czech-lager/3B-czech-premium-pale-lager.yaml?raw';
import r3C from './recipes/03-czech-lager/3C-czech-amber-lager.yaml?raw';
import r3D from './recipes/03-czech-lager/3D-czech-dark-lager.yaml?raw';
import r4A from './recipes/04-pale-malty-european/4A-munich-helles.yaml?raw';
import r4B from './recipes/04-pale-malty-european/4B-festbier.yaml?raw';
import r4C from './recipes/04-pale-malty-european/4C-helles-bock.yaml?raw';
import r5A from './recipes/05-pale-bitter-european/5A-german-leichtbier.yaml?raw';
import r5B from './recipes/05-pale-bitter-european/5B-kolsch.yaml?raw';
import r5C from './recipes/05-pale-bitter-european/5C-german-helles-exportbier.yaml?raw';
import r5D from './recipes/05-pale-bitter-european/5D-german-pils.yaml?raw';
import r6A from './recipes/06-amber-malty-european/6A-marzen.yaml?raw';
import r6B from './recipes/06-amber-malty-european/6B-rauchbier.yaml?raw';
import r6C from './recipes/06-amber-malty-european/6C-dunkels-bock.yaml?raw';
import r7A from './recipes/07-amber-bitter-european/7A-vienna-lager.yaml?raw';
import r7B from './recipes/07-amber-bitter-european/7B-altbier.yaml?raw';
import r7C from './recipes/07-amber-bitter-european/7C-kellerbier.yaml?raw';
import r8A from './recipes/08-dark-european-lager/8A-munich-dunkel.yaml?raw';
import r8B from './recipes/08-dark-european-lager/8B-schwarzbier.yaml?raw';
import r9A from './recipes/09-strong-european/9A-doppelbock.yaml?raw';
import r9B from './recipes/09-strong-european/9B-eisbock.yaml?raw';
import r9C from './recipes/09-strong-european/9C-baltic-porter.yaml?raw';
import r10A from './recipes/10-german-wheat/10A-weissbier.yaml?raw';
import r10B from './recipes/10-german-wheat/10B-dunkles-weissbier.yaml?raw';
import r10C from './recipes/10-german-wheat/10C-weizenbock.yaml?raw';
import r11A from './recipes/11-british-bitter/11A-ordinary-bitter.yaml?raw';
import r11B from './recipes/11-british-bitter/11B-best-bitter.yaml?raw';
import r11C from './recipes/11-british-bitter/11C-strong-bitter.yaml?raw';
import r12A from './recipes/12-pale-commonwealth/12A-british-golden-ale.yaml?raw';
import r12B from './recipes/12-pale-commonwealth/12B-australian-sparkling-ale.yaml?raw';
import r12C from './recipes/12-pale-commonwealth/12C-english-ipa.yaml?raw';
import r13A from './recipes/13-brown-british/13A-dark-mild.yaml?raw';
import r13B from './recipes/13-brown-british/13B-british-brown-ale.yaml?raw';
import r13C from './recipes/13-brown-british/13C-english-porter.yaml?raw';
import r14A from './recipes/14-scottish/14A-scottish-light.yaml?raw';
import r14B from './recipes/14-scottish/14B-scottish-heavy.yaml?raw';
import r14C from './recipes/14-scottish/14C-scottish-export.yaml?raw';
import r15A from './recipes/15-irish/15A-irish-red-ale.yaml?raw';
import r15B from './recipes/15-irish/15B-irish-stout.yaml?raw';
import r15C from './recipes/15-irish/15C-irish-extra-stout.yaml?raw';
import r16A from './recipes/16-dark-british/16A-sweet-stout.yaml?raw';
import r16B from './recipes/16-dark-british/16B-oatmeal-stout.yaml?raw';
import r16C from './recipes/16-dark-british/16C-tropical-stout.yaml?raw';
import r16D from './recipes/16-dark-british/16D-foreign-extra-stout.yaml?raw';
import r17A from './recipes/17-strong-british/17A-british-strong-ale.yaml?raw';
import r17B from './recipes/17-strong-british/17B-old-ale.yaml?raw';
import r17C from './recipes/17-strong-british/17C-wee-heavy.yaml?raw';
import r17D from './recipes/17-strong-british/17D-english-barleywine.yaml?raw';
import r18A from './recipes/18-pale-american/18A-blonde-ale.yaml?raw';
import r18B from './recipes/18-pale-american/18B-american-pale-ale.yaml?raw';
import r19A from './recipes/19-amber-brown-american/19A-american-amber-ale.yaml?raw';
import r19B from './recipes/19-amber-brown-american/19B-california-common.yaml?raw';
import r19C from './recipes/19-amber-brown-american/19C-american-brown-ale.yaml?raw';
import r20A from './recipes/20-american-porter-stout/20A-american-porter.yaml?raw';
import r20B from './recipes/20-american-porter-stout/20B-american-stout.yaml?raw';
import r20C from './recipes/20-american-porter-stout/20C-imperial-stout.yaml?raw';
import r21A from './recipes/21-ipa/21A-american-ipa.yaml?raw';
import r21B from './recipes/21-ipa/21B-specialty-ipa-black-ipa.yaml?raw';
import r21B1 from './recipes/21-ipa/21B1-new-england-ipa.yaml?raw';
import r21C from './recipes/21-ipa/21C-hazy-ipa.yaml?raw';
import r22A from './recipes/22-strong-american/22A-double-ipa.yaml?raw';
import r22B from './recipes/22-strong-american/22B-american-strong-ale.yaml?raw';
import r22C from './recipes/22-strong-american/22C-american-barleywine.yaml?raw';
import r22D from './recipes/22-strong-american/22D-wheatwine.yaml?raw';
import r23A from './recipes/23-european-sour/23A-berliner-weisse.yaml?raw';
import r23B from './recipes/23-european-sour/23B-flanders-red-ale.yaml?raw';
import r23C from './recipes/23-european-sour/23C-oud-bruin.yaml?raw';
import r23D from './recipes/23-european-sour/23D-lambic.yaml?raw';
import r23E from './recipes/23-european-sour/23E-gueuze.yaml?raw';
import r23F from './recipes/23-european-sour/23F-fruit-lambic.yaml?raw';
import r23G from './recipes/23-european-sour/23G-gose.yaml?raw';
import r24A from './recipes/24-belgian-ale/24A-witbier.yaml?raw';
import r24B from './recipes/24-belgian-ale/24B-belgian-pale-ale.yaml?raw';
import r24C from './recipes/24-belgian-ale/24C-biere-de-garde.yaml?raw';
import r25A from './recipes/25-strong-belgian/25A-belgian-blond-ale.yaml?raw';
import r25B from './recipes/25-strong-belgian/25B-saison.yaml?raw';
import r25C from './recipes/25-strong-belgian/25C-belgian-golden-strong-ale.yaml?raw';
import r26A from './recipes/26-trappist/26A-trappist-single.yaml?raw';
import r26B from './recipes/26-trappist/26B-belgian-dubbel.yaml?raw';
import r26C from './recipes/26-trappist/26C-belgian-tripel.yaml?raw';
import r26D from './recipes/26-trappist/26D-belgian-dark-strong-ale.yaml?raw';
import r27A from './recipes/27-historical/27A-grodziskie.yaml?raw';
import r27B from './recipes/27-historical/27B-lichtenhainer.yaml?raw';
import r27C from './recipes/27-historical/27C-roggenbier.yaml?raw';
import r28A from './recipes/28-american-wild/28A-brett-beer.yaml?raw';
import r29A from './recipes/29-fruit-beer/29A-fruit-beer.yaml?raw';
import r30A from './recipes/30-spice-herb-vegetable/30A-spice-herb-vegetable.yaml?raw';
import r31A from './recipes/31-alternative-grain/31A-alternative-grain.yaml?raw';
import r32A from './recipes/32-smoked/32A-smoked-porter.yaml?raw';
import r33A from './recipes/33-wood-aged/33A-wood-aged.yaml?raw';
import r34C from './recipes/34-specialty/34C-experimental.yaml?raw';

const RAW_RECIPES: Array<{ code: string; raw: string }> = [
  { code: '1A', raw: r1A }, { code: '1B', raw: r1B }, { code: '1C', raw: r1C }, { code: '1D', raw: r1D },
  { code: '2A', raw: r2A }, { code: '2B', raw: r2B }, { code: '2C', raw: r2C },
  { code: '3A', raw: r3A }, { code: '3B', raw: r3B }, { code: '3C', raw: r3C }, { code: '3D', raw: r3D },
  { code: '4A', raw: r4A }, { code: '4B', raw: r4B }, { code: '4C', raw: r4C },
  { code: '5A', raw: r5A }, { code: '5B', raw: r5B }, { code: '5C', raw: r5C }, { code: '5D', raw: r5D },
  { code: '6A', raw: r6A }, { code: '6B', raw: r6B }, { code: '6C', raw: r6C },
  { code: '7A', raw: r7A }, { code: '7B', raw: r7B }, { code: '7C', raw: r7C },
  { code: '8A', raw: r8A }, { code: '8B', raw: r8B },
  { code: '9A', raw: r9A }, { code: '9B', raw: r9B }, { code: '9C', raw: r9C },
  { code: '10A', raw: r10A }, { code: '10B', raw: r10B }, { code: '10C', raw: r10C },
  { code: '11A', raw: r11A }, { code: '11B', raw: r11B }, { code: '11C', raw: r11C },
  { code: '12A', raw: r12A }, { code: '12B', raw: r12B }, { code: '12C', raw: r12C },
  { code: '13A', raw: r13A }, { code: '13B', raw: r13B }, { code: '13C', raw: r13C },
  { code: '14A', raw: r14A }, { code: '14B', raw: r14B }, { code: '14C', raw: r14C },
  { code: '15A', raw: r15A }, { code: '15B', raw: r15B }, { code: '15C', raw: r15C },
  { code: '16A', raw: r16A }, { code: '16B', raw: r16B }, { code: '16C', raw: r16C }, { code: '16D', raw: r16D },
  { code: '17A', raw: r17A }, { code: '17B', raw: r17B }, { code: '17C', raw: r17C }, { code: '17D', raw: r17D },
  { code: '18A', raw: r18A }, { code: '18B', raw: r18B },
  { code: '19A', raw: r19A }, { code: '19B', raw: r19B }, { code: '19C', raw: r19C },
  { code: '20A', raw: r20A }, { code: '20B', raw: r20B }, { code: '20C', raw: r20C },
  { code: '21A', raw: r21A }, { code: '21B', raw: r21B }, { code: '21B1', raw: r21B1 }, { code: '21C', raw: r21C },
  { code: '22A', raw: r22A }, { code: '22B', raw: r22B }, { code: '22C', raw: r22C }, { code: '22D', raw: r22D },
  { code: '23A', raw: r23A }, { code: '23B', raw: r23B }, { code: '23C', raw: r23C }, { code: '23D', raw: r23D },
  { code: '23E', raw: r23E }, { code: '23F', raw: r23F }, { code: '23G', raw: r23G },
  { code: '24A', raw: r24A }, { code: '24B', raw: r24B }, { code: '24C', raw: r24C },
  { code: '25A', raw: r25A }, { code: '25B', raw: r25B }, { code: '25C', raw: r25C },
  { code: '26A', raw: r26A }, { code: '26B', raw: r26B }, { code: '26C', raw: r26C }, { code: '26D', raw: r26D },
  { code: '27A', raw: r27A }, { code: '27B', raw: r27B }, { code: '27C', raw: r27C },
  { code: '28A', raw: r28A },
  { code: '29A', raw: r29A },
  { code: '30A', raw: r30A },
  { code: '31A', raw: r31A },
  { code: '32A', raw: r32A },
  { code: '33A', raw: r33A },
  { code: '34C', raw: r34C },
];

export interface ReferenceRecipe {
  code: string;
  data: Record<string, unknown>;
}

/**
 * All reference recipes, parsed from the bundled raw YAML.
 * Parsing is lazy and cached.
 */
let _parsed: ReferenceRecipe[] | null = null;

export function getAllReferenceRecipes(): ReferenceRecipe[] {
  if (_parsed) return _parsed;
  _parsed = RAW_RECIPES.map(({ code, raw }) => {
    const data = yaml.load(raw) as Record<string, unknown>;
    return { code, data };
  });
  return _parsed;
}
