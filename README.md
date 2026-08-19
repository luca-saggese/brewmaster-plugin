# Brewmaster — Maestra Birraia AI

A Kimi Code plugin that turns the assistant into a dedicated **homebrewing master brewer** ("Maestra Birraia"). It designs, analyzes, reproduces, and optimizes craft beer recipes, backed by a local MCP server with a full suite of brewing math and recipe tools.

> **Note:** The plugin's system prompt (`SYSTEM.md`) is written in Italian, and the assistant responds in Italian. This README is the English-language documentation for the plugin.

## Features

- **Recipe design & analysis** — full all-grain recipe development from sensory goals, available ingredients, or BJCP styles, with explicit balance checks (OG/IBU, FG/body, malt/hop profile, etc.).
- **Critical, non-sycophantic guidance** — the assistant pushes back on unbalanced or technically fragile choices and proposes better alternatives with rationale.
- **BJCP reference library** — ~98 real, verified BJCP reference recipes for cloning and interpretation.
- **Brewing math** — ABV, attenuation, efficiency, strike water, volumes, pitching rates, IBU (Tinseth/Rager), priming, water chemistry, and more.
- **Persistent cellar & inventory** — track real inventory and cross-session brewing memory.
- **Export** — render a recipe YAML to a styled `.pdf` or `.docx` document.

## Installation

This plugin is distributed as a GitHub repository. Install it directly from the Kimi Code TUI with the `/plugins` command:

```
/plugins install https://github.com/<owner>/<repo>
```

The following URL forms are supported:

- `https://github.com/<owner>/<repo>` — install the latest release; falls back to the default branch if no release exists
- `https://github.com/<owner>/<repo>/tree/<ref>` — install a specific branch, tag, or short commit SHA
- `https://github.com/<owner>/<repo>/releases/tag/<tag>` — pin to a specific tag
- `https://github.com/<owner>/<repo>/commit/<sha>` — pin to a specific commit

After installing, run `/reload` or `/new` to activate the plugin (the current session will not update). You can also manage it interactively with `/plugins`, or install from a local directory or zip URL with `/plugins install <path-or-url>`.

> **Note:** Local installations are copied to `$KIMI_CODE_HOME/plugins/managed/<id>/`, and the CLI always runs from this managed copy. Editing the original source directory after installation has no effect — you must reinstall.

### Building the tools (for contributors)

The plugin registers a local MCP server named `brewing` that runs the bundled tools server (`tools/dist/server.mjs`), which is committed so the plugin runs without a build step. If you modify the tools, rebuild with:

```sh
cd tools
npm install
npm run build
```

## Tools

The plugin exposes the following tools through the `brewing` MCP server. They appear with the `mcp__brewing__` prefix (e.g. `mcp__brewing__brewing_calculator`).

| Tool | Purpose |
|---|---|
| `brewing_calculator` | General brewing math: ABV, attenuation, efficiency, strike water, volumes, pitching rates, gravity corrections, dilution, boil-off |
| `water_profile_calculator` | Adjust mash/sparge water mineral profile per style, with automatic volume calculation |
| `ibu_calculator` | IBU calculation (Tinseth/Rager) with hop schedule, alpha-acid database, whirlpool/first-wort/dry hop |
| `priming_calculator` | Sugar dosing for natural carbonation in bottle or keg |
| `recipe_validator` | Generates a qualitative LLM review prompt for a structured recipe |
| `yaml_validator` | Full deterministic validation of a recipe YAML file (OG/FG/IBU/EBC, volumes, grist, water, carbonation) |
| `inventory_search` | Search the static virtual catalog of malts, hops, and yeasts (specs, substitutes) |
| `inventory_manager` | Persistent real inventory (`~/.kimi-code/brewing/inventory.json`): add/remove/adjust/list/search/stats |
| `recipe_list` | Scan the workspace for existing `.yaml`/`.yml` recipes |
| `reference_recipe_search` | Search the library of ~98 real, verified BJCP reference recipes |
| `brewday_log` | Structured brew-day log by phase (mash, boil, fermentation, dry hop, bottling, etc.) |
| `fruit_calculator` | Fruit dosing for fruit beers (intensity, format, addition method, style) |
| `botanical_adjunct_calculator` | Dosing for spices, cocoa, coffee, tea, herbs, zest, and wood |
| `tincture_calculator` | Planning and dosing of alcoholic tinctures (hops, spices, wood, zest, coffee, cocoa, fruit) |
| `memory_save` | Persist a brewing fact across sessions (equipment, preferences, constraints) |
| `memory_search` | Search/list/delete saved memories |
| `memory_toggle` | Enable/disable memory saving for the current session |
| `yaml_to_docx` | Export a recipe YAML to a `.docx` document |
| `yaml_to_pdf` | Export a recipe YAML to a `.pdf` document |

For everything else — reading recipe files, writing new recipes, searching technical info on the web or in project files — the plugin uses the general tools (`Read`, `Write`, `Grep`, `Glob`, `WebSearch`, `FetchURL`, `Bash`).

## Recipe YAML Schema

When producing a complete recipe, the assistant saves it as a `.yaml` file following a fixed schema. A condensed example:

```yaml
nome: "Recipe name"
stile: "BJCP 21A — American IPA"
descrizione: |
  Sensory and stylistic goal of the recipe.

parametri:
  batch_size_litri: 20
  og: 1.065
  fg: 1.012
  abv_percent: 6.8
  ibu: 55
  ebc: 18
  efficienza_percent: 75
  impianto: "BrewZilla 35L"
  volume_fermentatore: 23

grist:
  - malto: "Pale Ale Malt (Crisp)"
    kg: 4.5
    percent: 75.0
    note: "Base malt"

luppolatura:
  - varieta: "Magnum"
    grammi: 20
    tempo_min: 60
    uso: boil
    aa_percent: 13.0
    ibu_stimati: 25

lievito:
  ceppo: "SafAle US-05"
  forma: secco
  attenuazione_percent: 78
  temperatura_fermentazione: "18-20°C"
  note: "Clean, lets the hops shine"

acqua:
  ca_mg_l: 120
  so4_mg_l: 200
  cl_mg_l: 60
  rapporto_so4_cl: 3.3
  ph_target: 5.4

mash:
  temperatura_c: 66
  durata_min: 60
  spessore_l_kg: 3.0

bollitura:
  durata_min: 60
  volume_pre_boil_litri: 26
  volume_post_boil_litri: 23

fermentazione:
  primaria_giorni: 7
  temperatura_c: 19
  cold_crash: true

carbonazione:
  metodo: bottiglia
  zucchero_tipo: saccarosio
  co2_volumi: 2.4

note_critiche:
  - "Dry hop during active fermentation for biotransformation"

alternative:
  - descrizione: "More malty version"
    cambiamenti: "Increase Munich to 1.5kg, reduce Crystal to 0.2kg"
    impatto: "More body, less sweetness, more amber color"
```

After saving a recipe YAML, the assistant runs `yaml_validator` for deterministic validation and fixes any critical errors immediately.

## Data & Storage

- **Inventory**: `~/.kimi-code/brewing/inventory.json`
- **Cross-session memory**: persisted via `memory_save` / `memory_search` / `memory_toggle`

## Development

The tools live in `tools/src/brewing/` and are bundled into a single-file MCP server (`tools/dist/server.mjs`) using `tsdown`. The server is dependency-free at runtime (only `js-yaml` and `zod` at build time), so it ships as one bundled file.

```sh
cd tools
npm install
npm run build
```

## License

Part of the kimi-code repository. See the repository root for license details.