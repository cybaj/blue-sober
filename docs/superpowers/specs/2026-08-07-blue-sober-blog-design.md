# blue sober — Blog Design Spec

**Date:** 2026-08-07
**Status:** Approved

## Purpose

A personal blog for Korean diary/poetry entries. The content is free verse; the
site's job is to present it with editorial restraint and get out of the way.

Visual direction follows the "reboot" style reference captured in
`TODO/style/DESIGN.md` — a warm off-white canvas, a single typographic voice, a
narrow left-aligned column, and one blue gradient mark as the only color.

## Decisions

| Decision | Choice |
|---|---|
| Framework | Astro 7, static output |
| Hosting | GitHub Pages via GitHub Actions |
| Typography | Inter (Latin) + Pretendard (Hangul), self-hosted |
| Site name | `blue sober` |
| Homepage | All entries stacked on one scrolling page, newest first |
| Place metadata | Displayed beside the date (`2026.06.08 · 춘천`) |
| Content metadata | Explicit YAML frontmatter, zod-validated |
| Theme | Light only |

## Architecture

```
blue-sober/
├── diary/                        # source content, stays in place
│   └── 260608-춘천.md
├── src/
│   ├── content.config.ts         # collection → ../diary, zod schema
│   ├── layouts/Base.astro        # html shell, fonts, meta tags
│   ├── components/
│   │   ├── Header.astro          # wordmark
│   │   ├── Entry.astro           # title, meta caption, verse body, closing marker
│   │   └── Marker.astro          # 24px sapphire gradient square
│   ├── pages/
│   │   ├── index.astro           # all entries, newest first, 80px gaps
│   │   └── [slug].astro          # permalink per entry
│   └── styles/
│       ├── tokens.css            # DESIGN.md custom properties
│       └── global.css            # reset + prose rules
├── public/
│   ├── favicon.svg               # the sapphire square, reused as the icon
│   └── fonts/                    # generated, gitignored
├── scripts/sync-fonts.mjs        # copies fonts out of node_modules
├── tests/build.test.ts
├── astro.config.mjs
├── vitest.config.ts
├── package.json
└── .github/workflows/deploy.yml
```

`diary/` is the source of truth and is never copied or moved. Astro reads it
through a content-collection `glob()` loader with `base: './diary'`.

### Units and boundaries

- **`content.config.ts`** — owns the shape of a diary entry. Nothing else
  parses frontmatter or touches the filesystem.
- **`Entry.astro`** — owns how one entry looks. Takes an entry object, renders
  title, metadata caption, verse body, and closing marker. Both pages use it,
  so index and permalink can never drift apart.
- **`Marker.astro`** — owns the gradient square. Isolated so the one piece of
  color in the system has exactly one definition.
- **`tokens.css`** — owns design values. Components reference variables and
  never hardcode a hex or a pixel size.

## Content model

Each file in `diary/` carries frontmatter. The `# Title` heading and the bare
date line are **lifted out of the body** into frontmatter so they are not
rendered twice:

```yaml
---
title: Blue sober
date: 2026-06-08
place: 춘천
---
```

Schema (zod, via Astro content collections):

- `title` — string, required
- `date` — date, required
- `place` — string, optional

A malformed or missing field fails the build rather than rendering wrong.

Filenames keep the `YYMMDD-place.md` convention for the author's own ordering,
but the build reads frontmatter, not filenames. Renaming a file changes its URL
slug and nothing else.

Sort order is by `date` descending.

## Verse rendering

The diary is free verse — line breaks carry meaning. Standard Markdown collapses
single newlines into one paragraph, which would fuse an entire poem into a
block of prose.

Astro 7's default Markdown processor (Satteri) exposes no line-break option, so
`astro.config.mjs` selects the remark pipeline explicitly via
`markdown.processor: unified({ remarkPlugins: [remarkBreaks] })` — the supported
path for plugin use in Astro 7. Every newline becomes a `<br>`.

SmartyPants is disabled alongside it, so quotes and dashes render exactly as
written rather than being curled.

This is the single highest-risk behavior in the build. Its test was verified to
fail when `remark-breaks` is removed, so it is a real guard rather than a
passing assertion.

## Style mapping

Tokens are taken from `TODO/style/DESIGN.md` verbatim.

| Token | Application |
|---|---|
| `--text-heading` 40px / weight 500 | Entry title |
| `--text-caption` 14px, `--color-soft-graphite` | `2026.06.08 · 춘천` |
| `--text-body-relaxed` 16px / 1.8, `--color-editorial-black` | Verse lines |
| `--gradient-sapphire-beam`, 24px, 8px radius | Closing mark, once per entry |
| `--section-gap` 80px | Between entries on the index |
| `--surface-page-canvas` `#e5e7eb` | Page background |
| `--page-max-width` 720px, text column 480px | Layout |

### Deliberate deviations from the reference

1. **No pill button.** The reference's black pill is its single CTA. A diary has
   no call to action, and the reference itself records "no distinct CTA color."
   Omitted rather than invented.

2. **No grayscale gradation inside verse.** The reference's prose block grades
   sentences charcoal → black → gray to build hierarchy within a paragraph.
   Applying that to a poem would mean choosing which of the author's lines
   recede — editing the work with typography. Verse body stays uniformly
   `--color-editorial-black` at weight 400. Grayscale gradation is used only for
   metadata.

3. **Two typefaces instead of one.** The reference specifies Inter as the sole
   voice. Inter has no Hangul glyphs. Pretendard is metrically compatible with
   Inter and designed as its Korean counterpart; the CSS stack is
   `Inter, Pretendard, sans-serif` so Latin resolves to Inter and Hangul falls
   through per-glyph. The reference's single-voice character survives.

4. **Ember Sunset gradient unused.** The reference lists it as a secondary
   decorative gradient for sparing use. Nothing in a diary blog needs a second
   accent. (Note: its value in `DESIGN.md` contains an invalid 5-digit hex,
   `#a4341` — irrelevant here since it is not used, but worth flagging if it is
   ever wanted.)

Fonts are self-hosted in `public/fonts/` rather than CDN-linked, so the
deployed site has no third-party runtime dependency. `public/fonts/` is
generated from `node_modules` by `scripts/sync-fonts.mjs` (run automatically
before `dev` and `build`) and is gitignored, keeping ~3MB of font binaries out
of the repo.

Pretendard is loaded as a dynamic subset — 92 small woff2 files split by
unicode range, of which a browser fetches only the ones a page uses. The full
variable font would be a 2MB download.

Both `@font-face` stylesheets live in `public/fonts/` and use relative `url()`s,
so they resolve correctly under any `base` value.

## Error handling

- **Invalid frontmatter** → build fails with a zod error naming the file and field.
- **Missing `diary/` or empty collection** → index renders an empty page; build
  succeeds. An empty blog is a valid state, not an error.
- **404** → Astro's default static 404. No custom page; out of scope.

## Testing

The Astro build is the primary gate — schema violations and template errors
fail it.

Nine Vitest assertions against the built HTML in `dist/`, covering the failures
that would otherwise be silent — a page that still renders and looks plausible
while the content is wrong:

1. Line breaks survive — the `<br>` count equals source lines minus one.
2. The first and last line of the source both appear in the output.
3. The metadata caption renders with date and place.
4. The date carries a machine-readable `datetime`.
5. The title and date do not leak back into the verse body and render twice.
6. Every file in `diary/` produces a page.
7. Every entry is linked from the index.
8. Both font stylesheets are linked under the configured base.
9. The font files those stylesheets reference are actually shipped.

## Deployment

GitHub Actions workflow on push to `main`: checkout → `npm ci` → `npm test`
(which builds first) → `upload-pages-artifact` → `deploy-pages`. Tests gate the
deploy, so a collapsed poem never reaches the live site.

`astro.config.mjs` is configured for a **project site**:

```js
site: 'https://cybaj.github.io',
base: '/blue-sober',
```

**Open item:** the username was inferred, not confirmed. If this deploys to a
user site (`cybaj.github.io`) rather than a project site
(`cybaj.github.io/blue-sober`), the `base` line must be deleted. Getting this
wrong 404s every link. Confirm before the first deploy.

## Out of scope

RSS feed, tags or filtering, search, pagination, dark mode, comments, analytics,
custom 404. Each is a small addition later if wanted; none is needed for the
site to work.
