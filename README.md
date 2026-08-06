# blue sober

일기.

A static blog for diary entries, built with [Astro](https://astro.build).
Visual direction follows the style reference in `TODO/style/DESIGN.md`.

## Writing an entry

Add a Markdown file to `diary/`. The filename convention is `YYMMDD-place.md`
and becomes the entry's URL.

```markdown
---
title: Blue sober
date: 2026-06-08
place: 춘천
---

친구의 차를 타고 집에 돌아와
오늘 일기를 써야겠다고 앉아
```

`title` and `date` are required, `place` is optional. A missing or malformed
field fails the build rather than publishing something wrong.

Single newlines are preserved as line breaks, so free verse keeps its shape —
no trailing double-spaces needed. Entries are ordered by `date`, newest first.

## Commands

| Command | Effect |
| --- | --- |
| `npm run dev` | Local dev server at `localhost:4321` |
| `npm run build` | Static build to `dist/` |
| `npm run preview` | Serve the built site |
| `npm test` | Build, then assert the output is correct |

## Fonts

`public/fonts/` is generated from `node_modules` by `scripts/sync-fonts.mjs`
and is not committed. `npm run dev` and `npm run build` regenerate it.

Inter carries Latin; Pretendard carries Hangul. Pretendard is loaded as a
dynamic subset, so a page downloads only the unicode ranges it actually uses
rather than the full 2MB variable font.

## Deployment

Pushing to `main` builds, tests, and publishes to GitHub Pages via
`.github/workflows/deploy.yml`. Enable it once under
**Settings → Pages → Source → GitHub Actions**.

`astro.config.mjs` is set up for a **project site** at
`https://<user>.github.io/blue-sober`. For a **user site** at
`https://<user>.github.io`, delete the `base` line and update `site`.
