---
name: pto-design-system
description: Enforce PTO design-system-first module creation. Use when building a new PTO page, composing an IDE/workbench/graph/timeline/architecture page from shared patterns, or retrofitting an existing demo to PTO. Reuse existing tokens, components, and patterns by default; do not invent new visual styles.
---

# PTO Design System Skill (shareable bundle)

This bundle lets any AI generate or retrofit pages in PTO visual style.

## How to use this bundle

1. Send the entire `design-system-share/` folder (this file + `DESIGN.md` + `design-system-preview.html` + `tokens/` + `css/` + `references/` + `patterns/`) to the AI together.
2. Tell the AI which workflow you want:
   - **New page from product requirement** → see *Workflow A*.
   - **Pattern-first PTO page / block** → see *Workflow C*.
   - **Retrofit an existing demo to PTO style** → see *Workflow B*.
3. Use `design-system-preview.html` only as a helper for base components. For full PTO pages, use `patterns/` and the matched `pattern.json` contracts.

The rule: pages must consume the existing PTO design system. Do not invent a new button, toggle, badge, card, panel, spacing scale, or color language.

Page chrome baseline: generated PTO app/workbench pages should use a transparent top header by default. Do not add a filled header background, decorative header band, or outer margin/gap below the header unless the user explicitly asks for separated page chrome. The first content shell should start flush under the header and use token-derived spacing inside the shell or pane, not an extra page-level gap.

## Required baseline (read in this order)

1. `DESIGN.md` — full system spec: theme, surfaces, palette, typography, spacing, components, governance. **Read this first.**
2. `references/quick-reference.md` — one-page cheat sheet of tokens and class names.
3. `references/retrofit-container-audit.md` — mandatory rules for removing legacy card / panel decoration during retrofit.
4. `patterns/patterns.json` — shared pattern registry for IDE frames, workbench splits, graph, timeline, architecture, and playback surfaces.
5. `tokens/foundation.css`, `tokens/semantic.css`, `tokens/components.css` — token implementation (CSS variables).
6. `css/style.css` — concrete class implementations.
7. `design-system-preview.html` — auxiliary base-component preview only; do not treat it as canonical for full pages or complex patterns.

For layout-heavy or visualization-heavy work, read the matched `patterns/<pattern-id>/pattern.json` before writing code. The pattern JSON is the source of truth for allowed overrides, forbidden overrides, and required APIs.

## Workflow A — New page from product requirement

Before writing code, list the UI pieces the page needs:

- header / toolbar
- buttons (entry / commit)
- toggle, toggle group
- chip filter
- labels / badges
- card, inspector, popup
- input, select
- data-viz-only patterns
- IDE frame, workbench split, graph, timeline, architecture, or playback patterns

Map each piece to the existing system using `references/pto-design-system-map.md`, `patterns/patterns.json`, and any matched `patterns/<id>/pattern.json`. Use the preview page only to confirm base component appearance.

Then write the page using:

- HTML class names from `css/style.css`
- Colors / spacing / type via CSS variables from `tokens/*.css` (e.g. `var(--surface-2)`, `var(--foreground-secondary)`, `var(--space-3)`)
- Layout via flex/grid composition; layout classes may be module-local
- Patterns (graph node, swimlane, memory tier, floating playback, workbench split kernel, IDE frame, etc.) from `patterns/` if applicable

## Workflow C — Pattern-first PTO page or block

Use this workflow when the user asks for a complete PTO page, a blocks-style preview, an IDE/workbench surface, or any page dominated by graph, timeline, architecture, split-pane, or playback behavior.

### 1. Select the page shell first

If the page is IDE-like, use `patterns/ide-frame`. Do not recreate a shadcn dashboard or generic block layout as a PTO block.

If an IDE/workbench page layout is underspecified, ask the user before writing code:

- how many panes / split regions the page needs
- what each pane contains, such as explorer, code, graph, timeline, report, inspector, console, or preview
- whether the page is `standalone` or `vscode-webview`
- whether panes must be draggable / persisted
- whether playback, step, or scrubber controls are needed

Use `patterns/workbench-shell` only as the draggable split kernel. It does not own page chrome, pane fills, typography, titles, or canvas controls. IDE-style pages should normally load `ide-frame`, which delegates drag behavior to `workbench-shell`.

### 2. Match each pane or view to a pattern

| User need | Pattern to read first |
|---|---|
| PTO IDE / workbench shell | `patterns/ide-frame/pattern.json` |
| Draggable horizontal, vertical, or nested panes | `patterns/workbench-shell/pattern.json` |
| Execution trace, swimlane, timeline task bars | `patterns/swimlane-task/pattern.json` |
| Pass-IR op, tensor, incast, outcast, or group node cards | `patterns/pass-ir-graph-node/pattern.json` |
| TorchVista, model Graphviz, folded model architecture graphs, report overlays | `patterns/model-graphviz/pattern.json` |
| Full memory architecture diagrams | `patterns/memory-architecture/pattern.json` |
| AIC or AIV internal object shells | `patterns/aic-core-object/pattern.json` or `patterns/aiv-core-object/pattern.json` |
| Floating playback, step, pause, scrubber, collapsed playback chrome | `patterns/floating-playback-control/pattern.json` |

If a matched pattern is rendered, canvas, SVG, or hybrid, do not rebuild it with static HTML/CSS. Load its `pattern.css` and `pattern.js`, then call its documented `window.Pto*Pattern` or `window.Pto*` API.

Before changing or reusing a pattern preview, run this capability contract check so preview copy cannot drift from implementation:

1. Read the matching `design-system-preview.html` card and list every capability it claims, such as hover tips, playback, collapse, resize, zoom, overlay, or scrubber behavior.
2. Confirm each claimed capability is declared in `patterns/<pattern-id>/pattern.json`, especially in `requiredApis`, `allowedOverrides`, and `forbiddenOverrides`.
3. Confirm `patterns/<pattern-id>/pattern.js` actually exports the named `window.Pto*Pattern` / `window.Pto*` API and implements the behavior.
4. Confirm `patterns/<pattern-id>/pattern.html` calls that API in the preview so the behavior can be visually verified.

If any of these four points disagree, fix the shared pattern contract or preview before consuming it in a product page. Do not leave a preview card promising behavior that is not exported and exercised by the pattern.

#### Memory architecture publication rules

When changing or consuming `memory-architecture-layout`, run these checks before finishing:

1. Route geometry belongs in `patterns/memory-architecture/pattern.js` preset data and overlay helpers. Do not repair route positions from a product page with local CSS or local DOM traversal.
2. Direct CV detour routes must anchor to concrete rendered hardware nodes, such as `data-aiv-node="exec:SIMD"`, rather than broad stack containers like an entire AIV exec column.
3. Hover, path focus, playback, or step focus must not change route `stroke-width`. Use opacity, color, and glow so route thickness stays visually stable during playback.
4. If a shared pattern file changes, update `patterns/memory-architecture/pattern.html` and `design-system-preview.html` cache keys so the design-system preview loads the new CSS/JS.
5. If a `/Users/yin/pto` page consumes the pattern through `vendor/pto-design-system`, update the vendor checkout pointer and bump the product page resource query strings in the same release. Pushing `pto-design-system` alone does not update `compute-graph-viewer` GitHub Pages.
6. Verify the published HTML references the new resource query and the published pattern JS contains the expected route selector before telling the user the Pages view is updated.

### 3. Choose iframe or direct embedding

Use an iframe when preserving a complete source page is more important than local composition. This is the right choice for parity previews and for pages where the original source owns heavy runtime behavior, such as Graphviz DOT generation, D3 zoom, popup behavior, graph reloads, or report-overlay focus state.

Use direct embedding when the new PTO page owns the data and should compose the pattern into its own layout. In that case, load the pattern dependencies and call the required API from `pattern.json`.

For model Graphviz report overlays, follow the existing practice: iframe the real Graphviz source page for parity previews; directly call `PtoModelGraphvizPattern.render` only for lightweight rendered examples or new pages that own graph data.

When building a new model architecture page (not the DeepSeek parity iframe), follow the current conventions captured by the `qwen7b_modelviz.html` reference and `patterns/model-graphviz/pattern.json`: derive each cluster box from the bounding box of its visible children so collapsing a module reflows and shrinks the parent; lay the decoder chain out as a single top-to-bottom column (Gate/Up are the only parallel pair); put cluster fold controls at the top-right corner with `--radius-xl` (16px) cluster corners; fill every expanded cluster, including repeated layer templates, with 10% white; vertically center the node label+type stack; use transform-based (`translate`+`scale`) cursor-anchored pan/zoom instead of scroll; show a single white selection stroke with the browser focus ring removed; and place the repeat-count badge at the cluster top-left under the title.

### 4. Compose without extra chrome

Pattern wrappers may provide spacing and sizing, but must not redefine internal pattern classes or add stacked borders, shadows, rounded frames, or extra card shells around the same surface.

For IDE blocks:

- the block should show a PTO typical page, not a copied shadcn demo
- `ide-frame` owns the activity rail, pane headers, preview/editor slots, inspector docks, and split initialization
- In multi-pane IDE/workbench pages, every pane title/meta/control row must live in the same `pto-ide-frame__pane-header` layer. Do not place one pane title inside an embedded pattern toolbar or inside `pto-ide-frame__pane-body`; body padding and pattern toolbar defaults will create header-height and baseline drift. If an embedded pattern such as `hardware-architecture-viewport` needs a mount root for its controls, make the pane itself the pattern root or adapt the mount root while keeping the title row in the `ide-frame` pane header.
- explorer collapse must remove the pane and its gutter together; remaining panes must fill the available space
- the whole preview page should remain scrollable; an embedded iframe must not trap normal page scroll
- icons should use Lucide-style SVGs; use opaque stroke colors and whole-SVG opacity to avoid transparent stroke overlap at path intersections

## Workflow B — Retrofit existing demo to PTO style

When the user already has an HTML/CSS demo and wants it migrated to PTO style:

1. Read the demo top-to-bottom and list every visual element (buttons, inputs, panels, badges, toggles, headings, surfaces, hard-coded colors).
2. For each element, map to PTO using `references/pto-design-system-map.md` + `patterns/patterns.json` + matched `pattern.json` files + `references/quick-reference.md`.
3. Run the **container decoration audit** from `references/retrofit-container-audit.md`. This is mandatory for every card, panel, list item, inspector block, and sidebar section.
4. Produce a **migration table** so the user can review before applying:

   | Element in demo | PTO equivalent | Class / token to use |
   |---|---|---|
   | `<button class="cta">Run</button>` | solid button | `btn btn-solid` |
   | `background: #1a1a1a` | surface-2 | `var(--surface-2)` |
   | `padding: 16px` | space-4 | `var(--space-4)` |

   Add a fourth column named `Legacy decoration to remove`. Use it to list old full borders, left rails, accent bars, inset highlights, shadows, pseudo-elements, and gradients that must be deleted rather than tokenized.

5. After the migration table is shown, replace classes and inline styles in the HTML; replace hard-coded colors / shadows / radii / spacing with tokens.
6. Remove legacy container decoration. Do not convert private card borders or left accent bars into PTO token values unless the target PTO component explicitly has that decoration.
7. Run the post-migration residue check from `references/retrofit-container-audit.md` and include the result in the final response.
8. Skip the preview-gate — no new style is being created, only consuming the existing system.
9. In the final response list:
   - Which PTO classes / tokens were used.
   - Any element that did **not** find an equivalent → flag for user decision (do not invent a new style silently).
   - The container decoration residue check result.

## Hard rules

- Do not create a new private button / toggle / badge / card system.
- Do not hard-code colors, radii, shadows, font sizes, borders, or spacing when an existing token fits.
- Do not preserve legacy card / panel decoration by merely replacing its colors with tokens.
- Do not keep `border-left`, `border-inline-start`, inset left `box-shadow`, pseudo-element rails, or side gradients on generic cards / panels / inspector blocks unless they encode data or an approved selected state.
- Do not add new module-local visual tokens unless the user has approved a preview first.
- Do not ship the business module with unapproved new visuals.
- Do not treat `design-system-preview.html` as the source of truth for graph, timeline, architecture, IDE, or workbench behavior.
- Do not copy a finished pattern screenshot into static DOM/CSS when `pattern.js` owns geometry, rendering, truncation, drag, zoom, or synchronized state.
- Do not override `.pto-workbench-shell__*` internals from product pages or higher-level patterns.
- Do not recreate floating playback chrome locally; use `floating-playback-control`.

Module-specific layout and structure classes are allowed. New visual language is not.

## Common failure modes to avoid

- Copying shadcn Blocks page content instead of showing PTO typical pages built from PTO patterns.
- Building an IDE page from generic divs while ignoring `ide-frame` and `workbench-shell`.
- Asking no layout questions for an IDE page, then guessing the pane count and pane content.
- Closing a file tree visually but leaving its gutter or a narrow leftover pane behind.
- Putting scroll only inside an iframe or preview stage when the whole page should scroll.
- Treating Graphviz, swimlane, memory architecture, or Pass-IR nodes as CSS-only components.
- Preserving legacy card borders, left rails, pseudo-elements, inset highlights, or gradients by merely replacing their colors with PTO tokens.

## Approval gate for missing styles (Workflow A / C only)

If the current system cannot satisfy a needed pattern:

1. Stop before writing the final module style.
2. Create a preview page (`<module>/component-preview.html`) showing:
   - the closest existing system pattern
   - the proposed new pattern
   - state coverage (normal / hover / active / selected)
   - token usage
   - why the current system is insufficient
3. Wait for explicit user approval.
4. After approval: absorb the new pattern into the shared system first, then consume it from the new module.

See `references/preview-gate.md` for the full rule.

## Expected outputs

In the final response, explicitly state:

- which existing system pieces were reused
- which pattern ids were matched
- for each matched pattern, whether it was used through iframe or direct embedding, and why
- for IDE/workbench pages, whether the pane count and pane content were confirmed or reasonably inferred
- which needs exceeded the current system (if any)
- whether a preview page was created
- whether the user approved new visuals
- whether approved visuals were absorbed into the shared system
- (Workflow B) the full migration table
- (Workflow B) the container decoration residue check result

## References

- `references/quick-reference.md` — token + class cheat sheet
- `references/pto-design-system-map.md` — element classification rules
- `references/preview-gate.md` — approval workflow
- `patterns/patterns.json` — shared pattern registry
- `patterns/<pattern-id>/pattern.json` — canonical reuse contract for each pattern
- `DESIGN.md` — canonical system spec
