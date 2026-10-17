# Sime Darby Property Design System

> **Product context: this is a dashboard, not a marketing site.**
> The tokens below come from the Sime Darby Property University Hackathon landing page (https://www.simedarbyproperty.com/universityhackathon/). This project uses them for an **operational dashboard**: live location maps, favour lists, patrol checkpoints, RA reports and a points marketplace. Keep the brand (colours, type, radii, focus treatment) and drop the marketing devices (full-bleed hero art, 6rem headlines, scroll-reveal animation, big section padding, glowing CTAs everywhere). Wherever this doc says **Dashboard adaptation**, it describes how a landing-page pattern should change for the app.

## 1. Visual Theme & Atmosphere

Confident, warm and civic. The landing page sells a smart-township future to university students. It opens with a near-black blueprint illustration of a township, then moves into warm off-white content sections. The overall mood is premium property developer mixed with a tech initiative.

The design language is warm neutrals with one saturated brand red, backed by the orange-to-gold ramp from the Sime Darby Property logo. Surfaces are soft and rounded (pill buttons, 1.75rem cards). Depth comes from hairline warm-gray borders plus diffuse, low-opacity shadows. Dark "deep" panels (warm near-black, not blue-black) provide contrast blocks for data such as the prize table.

**Dashboard adaptation:** use the light warm surfaces (`--bg`, `--surface`) as the default app canvas. Reserve the deep surfaces for the sidebar/top nav or for one high-emphasis panel (e.g. the live map frame), not whole pages. Red is for actions and alerts, not decoration.

### Key Characteristics
- Single brand red `#D71920` drives every primary action, the focus ring and text selection
- Logo ramp (red → `#F15A22` → `#F58220` → `#FCAF17`) appears as a radial "supergraphic" glow and gold accent tiles
- Warm-tinted neutrals everywhere: off-white `#FCF9F7` background, brown-black `#211815` text, warm gray `#E3DCDA` lines
- Metropolis geometric sans for all text, bold display headings with tight `-0.04em` tracking
- Pill-shaped buttons and chips (`9999px`) paired with large-radius cards (`1.25rem`/`1.75rem`)
- Small uppercase eyebrow labels with wide tracking (`0.14em`–`0.18em`) in brand red
- Dark data table with `tabular-nums` and bright-red numeric values
- Visible 3px red `:focus-visible` outline on every interactive element

## 2. Color Palette & Roles

Warm monochrome neutrals with one dominant red and a supporting orange/gold ramp. The site is light-first with dark "deep" sections. There is no `prefers-color-scheme` or `.dark` theme switch, so the dark tokens are section surfaces, not a dark mode. Source tokens are in `oklch()`; the hex values below are sRGB conversions.

### Primary
| Hex       | Role                         | Where seen                                   |
| --------- | ---------------------------- | -------------------------------------------- |
| `#D71920` | Brand / action / focus       | `:root --brand`, `--action`, `--focus`       |
| `#B5151C` | Action hover                 | `:root --brand-strong`, `--action-hover`     |
| `#FF3B41` | Brand red on dark surfaces   | `:root --brand-bright`, `.text-brand-bright` |
| `#FFE7E4` | Brand soft tint              | `:root --brand-soft` (`oklch(0.95 0.03 25)`) |
| `#FFFFFF` | Text on action               | `:root --action-contrast`                    |

### Accent
| Hex       | Role                           | Where seen                                   |
| --------- | ------------------------------ | -------------------------------------------- |
| `#F15A22` | Brand ramp 2 (red-orange)      | `:root --brand-2`, `.supergraphic`           |
| `#F58220` | Brand ramp 3 / "tech" orange   | `:root --brand-3`, `--tech`                  |
| `#FFE7D7` | Tech soft tint                 | `:root --tech-soft`                          |
| `#9F4500` | Tech ink (orange text)         | `:root --tech-ink`                           |
| `#FCAF17` | Gold                           | `:root --gold`, `.bg-gold` icon tiles        |
| `#E09A0F` | Gold strong                    | `:root --gold-strong`                        |
| `#FFEACA` | Gold soft (callout panel)      | `:root --gold-soft`, `.bg-gold-soft`         |
| `#905D00` | Gold ink (text on gold-soft)   | `:root --gold-ink`, `.text-gold-ink`         |

### Semantic
| Hex       | Role  | Where seen                                    |
| --------- | ----- | --------------------------------------------- |
| `#AC1A1C` | Error | `:root --error` (`oklch(0.48 0.18 27)`)       |

The site defines no success, warning or info tokens. **Dashboard adaptation:** a dashboard needs status colours (favour status, patrolled vs. unpatrolled jalan, redemption state):
- **Warning / pending:** reuse the gold family (`--gold-soft` background, `--gold-ink` text).
- **In progress / info:** reuse the tech family (`--tech-soft` background, `--tech-ink` text).
- **Success / completed / patrolled:** add one muted green at the same lightness/chroma as the other soft/ink pairs (soft ≈ `oklch(0.95 0.04 150)`, ink ≈ `oklch(0.50 0.12 150)`). It is new, so tune it against the warm neutrals.
- **Error / missed checkpoint:** `--error` on `--brand-soft`.

Do not use `--brand` red for "success". Red means action or problem.

### Surfaces
| Hex       | Role                         | Where seen                                 |
| --------- | ---------------------------- | ------------------------------------------ |
| `#FCF9F7` | Page background              | `body`, `:root --bg`                       |
| `#FFFFFF` | Raised surface (cards, chips)| `:root --surface`, `.bg-surface`           |
| `#F7F3EF` | Secondary surface            | `:root --surface-2`, `.bg-surface-2`       |
| `#120B0A` | Deep surface (dark sections) | `:root --bg-deep`, `.bg-deep`              |
| `#1C1412` | Deep surface 2               | `:root --bg-deep-2`, dark chips/buttons    |
| `#261D1B` | Raised surface on dark       | `:root --surface-dark`                     |

### Text
| Hex       | Role                | Where seen                       |
| --------- | ------------------- | -------------------------------- |
| `#211815` | Primary text        | `body`, `:root --text`, `.text-ink` |
| `#6B615D` | Muted text          | `:root --text-muted`             |
| `#FCF4EB` | Text on dark        | `:root --text-on-dark`           |
| `#C5B3A9` | Muted text on dark  | `:root --text-on-dark-muted`     |

### Borders
| Hex                                | Role               | Where seen                         |
| ---------------------------------- | ------------------ | ---------------------------------- |
| `#E3DCDA`                          | Default hairline   | `* { border-color: var(--line) }`  |
| `--text-on-dark` at 16% (≈ `#FCF4EB29`) | Hairline on dark | `:root --line-on-dark`        |

### Shadows
| Value                    | Role                      | Where seen          |
| ------------------------ | ------------------------- | ------------------- |
| `rgba(15,23,42,.04/.18)` | Panel shadow tint         | `.shadow-panel`     |
| `rgba(215,25,32,.45)`    | Red glow under CTAs       | `.shadow-glow`      |
| `rgba(0,0,0,.25/.6)`     | Panel shadow on dark      | `.shadow-panel-dark`|

### Notes
Red appears in four places only: primary buttons, focus outlines, eyebrow labels and bullet markers (`.bg-brand` dots, `marker:text-brand`). Body copy is always ink or muted ink. Gold and orange are accents for callouts and icon tiles, never for buttons. Selection highlight is `--brand` at 30% via `color-mix`. **Dashboard adaptation:** keep the same discipline. One red primary action per view; status uses the soft/ink pairs above; charts lead with red then follow the logo ramp (`#D71920`, `#F15A22`, `#F58220`, `#FCAF17`), with warm grays for "other".

## 3. Typography Rules

Display and body both use **Metropolis**, self-hosted from `app/fonts/` via `next/font/local` in weights 500/600/700/800 (no 400 or italics). Stack: `var(--font-metropolis), ui-sans-serif, system-ui, sans-serif`, plus the size-adjusted fallback `next/font` generates. There is no Montserrat fallback. Mono uses Tailwind's default `ui-monospace, SFMono-Regular, Menlo, …` stack.

### Hierarchy
| Role    | Font        | Size                                   | Weight | Line height | Letter spacing |
| ------- | ----------- | -------------------------------------- | ------ | ----------- | -------------- |
| Display | Metropolis  | 48px → 72px (sm) → 96px (lg)           | 700    | 1.04        | -0.025em       |
| H1      | Metropolis  | 30px → 36px → 48px (register heading)  | 700    | 1.08        | -0.025em to -0.04em |
| H2      | Metropolis  | 30px / 36px                            | 700    | 1.12        | -0.04em        |
| H3      | Metropolis  | 18px → 20px (md)                       | 600    | 1.08–1.375  | -0.025em       |
| Body    | Metropolis  | 16px                                   | 500    | 1.6         | 0              |
| Small   | Metropolis  | 14px                                   | 500    | 1.25rem     | 0              |
| Eyebrow | Metropolis  | 14px / 12px, uppercase                 | 700    | 1.25rem     | 0.14em–0.18em  |
| Table header | Metropolis | 11.2px → 12px, uppercase           | 600    | —           | 0.1em          |
| Mono    | ui-monospace| 1em                                    | 500    | inherit     | 0              |

### Principles
- All `h1–h4` are bold (700) with negative tracking (`-0.04em` base, `tracking-tight` `-0.025em` on utilities) and `text-wrap: balance`
- Regular text is Medium (500), set once on `body`. Nothing renders at 400, so don't use `font-normal` or lighter.
- Body copy uses `text-wrap: pretty` and a `max-width: 70ch` measure (`.max-w-measure`)
- Uppercase is only used for small eyebrow and table-header labels, always with wide positive tracking
- Numbers in tables use `tabular-nums`
- **Dashboard adaptation:** cap page titles at 24–30px (`text-2xl`/`text-3xl`); never use the 72–96px display sizes in the app. Card titles use H3 (18px/600). Use `tabular-nums` for every metric, point balance, timestamp and count.

## 4. Component Stylings

### Buttons
- **Primary:** `background: var(--action)` `#D71920`, white text, `border-radius: 9999px`, `padding: 0.75rem 1.75rem` (`px-7 py-3`), `min-height: 3rem`, 16px/600. Hover → `var(--action-hover)` `#B5151C`. Carries `.shadow-glow`. Compact variant: `min-height: 2.75rem`, `px-5 py-2.5`, 14px.
- **Secondary (dark):** `background: var(--bg-deep-2)`, `color: var(--text-on-dark)`, `1px solid var(--line-on-dark)`, pill, `min-height: 2.75rem`, `px-4`, 14px/600, `.shadow-panel-dark`. Hover → text white.
- **Ghost / chip:** `background: var(--surface)`, `1px solid var(--line)`, pill, `px-4 py-2`, 14px/500, ink text, `.shadow-panel`.
- **Destructive:** none on the site. **Dashboard adaptation:** outline pill with `--error` text and border; fill with `--error` only in a confirm dialog.
- **Dashboard adaptation:** drop `.shadow-glow` from buttons in dense UI (tables, toolbars). Keep it at most for one hero action per page. Default height 2.75rem (44px), which also meets the touch target.

### Cards
- Standard: `background: var(--surface)`, `1px solid var(--line)`, `border-radius: 1.75rem` (`rounded-3xl`), `padding: 1.75rem` → `2rem` (md), `.shadow-panel`.
- Muted: `background: var(--surface-2)`, border, no shadow.
- Callout: `background: var(--gold-soft)`, no border, `padding: 2rem` → `3rem`, `.shadow-panel`.
- Deep: `background: var(--bg-deep)`, `color: var(--text-on-dark)`, `.shadow-panel-dark`.
- **Dashboard adaptation:** use `rounded-2xl` (1.25rem) and `p-5`/`p-6` for dashboard widgets. 1.75rem radius and 3rem padding are too loose for a grid of stat tiles.

### Inputs
The page has no form inputs. Grounded values are the global `:focus-visible` outline (`3px solid var(--focus)`, `outline-offset: 2px`) and Tailwind's default placeholder `#9CA3AF`. **Dashboard adaptation (inferred):** `background: var(--surface)`, `1px solid var(--line)`, `border-radius: 0.75rem`, `min-height: 2.75rem`, `padding-inline: 1rem`, placeholder `var(--text-muted)` instead of the cool `#9CA3AF`, and the global red focus outline.

### Navigation
- Desktop: `<nav class="container-x">` with `height: var(--nav-h)` (4rem, 4.5rem at md+), centered text links (About, Theme, How It Works, Timeline, Prizes, FAQ), 14px, `--text-on-dark` over the hero. Links hover to white.
- A compact "Register" pill fades in on scroll (`opacity-0 translate-y-1` → visible, `duration-300 ease-arrive`).
- Skip link: `sr-only` that becomes a red pill on focus.
- **Dashboard adaptation:** replace the anchor-link top nav with a persistent left sidebar on `--bg-deep` (`--text-on-dark-muted` items, `--text-on-dark` when active, active row on `hover:bg-white/5` plus a 2px `--brand-bright` indicator), and a light top bar with the `--nav-h` height for page title, live-sharing toggle and user menu.

### Image Treatment
- Full-bleed hero illustration (blueprint line art on deep warm black) with `object-cover`.
- Video features use `aspect-video` (16:9) inside `rounded-2xl` frames with `overflow-hidden`.
- Decorative blurred brand blobs: `rounded-full`, `blur(64px)`, `opacity .5–.7`, behind content (`-z-10`).
- **Dashboard adaptation:** maps and avatars only. Map panels get `rounded-2xl overflow-hidden border border-line`; no decorative blobs.

### Distinctive
- **Supergraphic glow:** `.supergraphic`, a radial gradient from the bottom-left corner through brand → brand-2 → brand-3 → gold at 26–46% alpha. Dashboard use: at most a subtle background on the login screen or an empty state.
- **Eyebrow label:** `text-sm font-bold uppercase tracking-[0.18em] text-brand`, used above section headings. Dashboard use: section labels in the sidebar or above widget groups.
- **Dark data table:** `rounded-2xl` frame with `border-line-dark`; header cells `text-[0.7rem] uppercase tracking-[0.1em] text-on-dark-muted`; row headers `font-display font-semibold text-on-dark`; values `tabular-nums text-brand-bright`; cell padding `px-3.5 py-3` → `px-6 py-4`. Dashboard use: the pattern for the patrol leaderboard / RA monthly report. Use a light variant (`--surface`, `--line`, ink values) for most tables.
- **Gold icon tile:** `h-16 w-16 rounded-2xl bg-gold text-ink`, centred icon. Dashboard use: shrink to `h-10 w-10` for stat-tile icons.
- **FAQ accordion:** `<details class="border-b border-line">` with `py-5` summary and a chevron that rotates 180° when open. Dashboard use: collapsible filter groups.

## 5. Layout Principles

### Spacing Scale
Tailwind 4px base (`rem`). Values in use: `0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4, 4.5, 6, 7, 8, 9rem` (8–144px). Stack gaps use `space-y-2…5` (8–20px). Section padding runs `py-24`–`py-36` (96–144px) at md+.

### Grid
- `.container-x`: `max-width: 72rem` (1152px), centred, `padding-inline: 1.25rem` → `2rem` (md).
- Content grids: 1 column → `sm:grid-cols-2` / `md:grid-cols-2` / `md:grid-cols-3`. Asymmetric splits `1fr 1.15fr` and `1.1fr 1.4fr`. Gutters `md:gap-8` (2rem) and `md:gap-16` (4rem).
- A divided grid trick: `gap-px` over a `bg-line-dark` parent produces 1px cell dividers.
- **Dashboard adaptation:** sidebar (≈16rem) + fluid main area; drop the 72rem cap for data views so maps and tables use the full width. Use a 12-column grid with `gap-4`/`gap-6` for widgets; the `gap-px` divider trick works well for stat strips.

### Whitespace
The landing page is generous: sections breathe at 96–144px, and copy stays within 70ch. **Dashboard adaptation:** much denser. Page padding `p-6`/`p-8`, widget gaps 16–24px, card padding 20–24px, table rows ≈ 44–48px. Keep the 70ch measure only for long text (favour descriptions, report notes).

### Radius Scale
`md 0.375rem (6px)`, `2xl 1.25rem (20px)`, `3xl 1.75rem (28px)`, `pill 9999px`. Focus outline uses 2px. **Dashboard adaptation:** add an `xl 0.75rem` step for inputs, table frames and small panels.

## 6. Depth & Elevation

### Levels
| Level | Use                        | Shadow                                                                   |
| ----- | -------------------------- | ------------------------------------------------------------------------ |
| 0     | Flat / muted surfaces      | none (border only)                                                       |
| 1     | Cards, chips (light)       | `0 1px 2px 0 rgba(15,23,42,.04), 0 8px 24px -12px rgba(15,23,42,.18)` (`.shadow-panel`) |
| 1d    | Cards, chips on dark       | `0 1px 2px 0 rgba(0,0,0,.25), 0 18px 40px -20px rgba(0,0,0,.6)` (`.shadow-panel-dark`) |
| 2     | Primary CTA glow           | `0 0 0 1px rgba(15,23,42,.04), 0 24px 60px -28px rgba(215,25,32,.45)` (`.shadow-glow`) |

### Philosophy
Elevation is quiet: a 1px warm hairline does most of the separation, plus a large negative-spread shadow that reads as soft lift rather than a drop shadow. The only coloured shadow is the red glow under primary actions. **Dashboard adaptation:** use Level 1 for widgets. Popovers, dropdowns and the map info-card get Level 1 plus a border. Modals reuse the dark-panel shadow values (inferred).

## 7. Interaction & Motion

### Hover States
- Primary buttons: background `#D71920` → `#B5151C` (`transition-colors duration-200 ease-arrive`).
- Dark buttons and nav links: text `--text-on-dark` → white; rows/links on dark get `hover:bg-white/5`.
- Light links: muted → `--text` (`hover:text-ink`).
- Group hover: an arrow/icon nudges down `translate-y-1` (0.25rem) (scroll cue).

### Focus States
Global `:where(a,button,input,select,textarea,summary,[tabindex]):focus-visible { outline: 3px solid #D71920; outline-offset: 2px; border-radius: 2px }`. Some buttons use a 2px variant. Focus is always visible, so keep it in the dashboard.

### Transitions
- Default Tailwind `cubic-bezier(.4,0,.2,1)` at `150ms`. Durations `200ms` (colour), `300ms` (nav CTA reveal), `700ms` (scroll reveal).
- Custom ease `ease-arrive`: `cubic-bezier(.16,1,.3,1)` (fast-out, long settle).
- Keyframes: `hero-rise` (opacity .25 → 1, `translateY 14px` → 0, `blur 8px` → 0, 900ms), `scroll-bob` (4px, 1.6s infinite), `.reveal` (24px rise + fade, 700ms).
- All motion is disabled under `prefers-reduced-motion: reduce`.
- **Dashboard adaptation:** keep the 150–200ms colour transitions and `ease-arrive` for panels/drawers. Remove `hero-rise`, `.reveal` and parallax. Use motion only for live data: a pulsing dot on live-location markers, and a brief highlight when a jalan flips to "patrolled" (inferred, respect reduced-motion).

## 8. Responsive Behavior

### Breakpoints
| Name | Min width | Primary changes                                                    |
| ---- | --------- | ------------------------------------------------------------------ |
| sm   | 640px     | 2-col grids, row layouts, display 48px → 72px, table cell padding up |
| md   | 768px     | `--nav-h` 4rem → 4.5rem, 3-col grids, container padding 2rem, desktop nav shows (`md:flex`), section padding 96–144px |
| lg   | 1024px    | display 96px (`lg:text-8xl`)                                       |
| xl   | 1280px    | `.container` max-width only                                        |
| 2xl  | 1536px    | `.container` max-width only                                        |

### Touch Targets
Interactive pills use `min-h-11` (44px) and `min-h-12` (48px). Keep 44px as the minimum for all dashboard controls, especially guard-facing mobile screens (live-location toggle, status updates).

### Collapsing Strategy
Primary nav links are hidden below md and shown with `md:flex`. Grids collapse to a single column; asymmetric splits stack. **Dashboard adaptation:** below md, the sidebar becomes a bottom tab bar or slide-over drawer. Tables become stacked cards; the map goes full-width with a bottom sheet for details. Guards and residents will mostly use phones, so design those flows mobile-first.

### Image Behavior
`img, video { max-width: 100%; height: auto }`, `object-cover` for full-bleed art, `aspect-video` for media. Under `prefers-reduced-motion: no-preference` at md+, a sticky scroll section switches media to `object-contain` within `calc(100svh - var(--nav-h))`. This pattern is marketing-only and not used in the dashboard.

## 9. Agent Prompt Guide

### Quick Color Reference
```text
#D71920  // brand / primary action / focus ring
#B5151C  // action hover
#FF3B41  // brand red on dark surfaces
#FCAF17  // gold accent (icon tiles)
#F58220  // tech orange accent
#FCF9F7  // app background
#FFFFFF  // card surface
#F7F3EF  // secondary surface
#120B0A  // deep surface (sidebar)
#211815  // primary text
#6B615D  // muted text
#E3DCDA  // hairline border
#AC1A1C  // error
```

### Example Prompts
1. "Build a dashboard shell in Next.js + Tailwind: left sidebar on `#120B0A` with `#C5B3A9` nav items (active item `#FCF4EB` with a 2px `#FF3B41` left indicator), a 4.5rem light top bar on `#FCF9F7` with a 1px `#E3DCDA` bottom border, and Metropolis as the font (500 for body text). Page titles 30px/700 with `-0.025em` tracking. This is an internal dashboard, not a landing page, so keep spacing dense."
2. "Create a stat-tile row: white cards (`#FFFFFF`, `1px #E3DCDA` border, `border-radius: 1.25rem`, `padding: 1.5rem`, shadow `0 1px 2px rgba(15,23,42,.04), 0 8px 24px -12px rgba(15,23,42,.18)`). Each tile has a 40px gold `#FCAF17` rounded-xl icon square, an uppercase 12px/700 `0.14em`-tracked label in `#6B615D`, and a 30px/700 `tabular-nums` value in `#211815`."
3. "Build a favour list table: light table in a `rounded-2xl` bordered frame, uppercase 12px `0.1em` headers in `#6B615D`, 44px rows split by `#E3DCDA` hairlines, points in `tabular-nums`, and status pills (pill radius, 12px/600) using soft/ink pairs: gold `#FFEACA`/`#905D00` for pending, orange `#FFE7D7`/`#9F4500` for in progress, red `#FFE7E4`/`#AC1A1C` for cancelled. Primary 'Accept' button: pill, `#D71920` background, white 14px/600 text, 44px min height, hover `#B5151C`, 3px `#D71920` focus outline with 2px offset."

### Iteration Guide
- Keep red scarce: one primary red action per view. If a screen feels loud, move secondary actions to the white ghost-pill style before touching the palette.
- New status colours should copy the soft/ink pattern: soft ≈ `oklch(0.95 C h)`, ink ≈ `oklch(0.50–0.52 C h)`, chroma 0.03–0.14. This keeps them in the same family as gold/tech/brand.
- Keep neutrals warm (hue 30–70 in oklch). Do not bring in Tailwind's cool `slate`/`gray` (e.g. the default `#9CA3AF` placeholder or `#E5E7EB` border); use `--text-muted` and `--line`.
- To make something denser, shrink radius one step (`3xl` → `2xl` → `xl`) and padding together. Leave the pill radius on buttons and chips alone; it is a brand signature.
- Dark surfaces are for chrome (sidebar) and one hero data panel at most. On dark, switch red to `#FF3B41` and lines to `--line-on-dark`.
- Do not bring marketing motion (hero-rise, scroll reveals, parallax, red glow on every button) into the dashboard. Motion should signal live data changes only.
