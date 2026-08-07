/**
 * Assertions against the built site in dist/.
 *
 * `npm test` runs the build first. These cover the things that can break
 * silently — where the page still renders and looks plausible but the content
 * is wrong.
 */

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseYouTube } from '../plugins/youtube.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const diaryDir = join(root, 'diary');

/** Directories in dist/ holding a page, excluding generated asset folders. */
async function entryPageDirs(): Promise<string[]> {
  const skip = new Set(['fonts', '_astro']);
  const dirents = await readdir(dist, { withFileTypes: true });
  const dirs: string[] = [];
  for (const d of dirents) {
    if (!d.isDirectory() || skip.has(d.name)) continue;
    const files = await readdir(join(dist, d.name));
    if (files.includes('index.html')) dirs.push(d.name);
  }
  return dirs;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function diaryFiles(): Promise<string[]> {
  const files = await readdir(diaryDir);
  return files.filter((f) => f.endsWith('.md'));
}

/** Visible text of a fragment, with tags dropped and entities decoded. */
function textOf(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

interface Entry {
  /** Source filename in diary/. */
  file: string;
  /** Built directory in dist/. */
  dir: string;
  html: string;
  /** Inner HTML of the entry's verse block. */
  verse: string;
  /** Non-blank body lines from the source. */
  lines: string[];
}

/**
 * Pairs every diary source file with the page it produced.
 *
 * Pairing matters: reading dist/ and diary/ as two independent lists and
 * indexing both by position silently compares one entry's page against
 * another entry's source as soon as there is more than one entry.
 */
async function loadEntries(): Promise<Entry[]> {
  const dirs = await entryPageDirs();
  const files = await diaryFiles();

  return Promise.all(
    files.map(async (file) => {
      const slug = file.replace(/\.md$/, '');
      const dir =
        dirs.find((d) => d === slug) ??
        dirs.find((d) => d.toLowerCase() === slug.toLowerCase());

      if (!dir) {
        throw new Error(
          `no built page for ${file} — expected "${slug}" among: ${dirs.join(', ')}`,
        );
      }

      const html = await readFile(join(dist, dir, 'index.html'), 'utf8');
      const verse =
        html.match(/<div class="verse"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';

      const source = await readFile(join(diaryDir, file), 'utf8');
      const body = source.split(/^---$/m).slice(2).join('---').trim();
      const lines = body.split('\n').filter((l) => l.trim() !== '');

      return { file, dir, html, verse, lines };
    }),
  );
}

let indexHtml: string;
let entryDirs: string[];
let entries: Entry[];

beforeAll(async () => {
  indexHtml = await readFile(join(dist, 'index.html'), 'utf8');
  entryDirs = await entryPageDirs();
  entries = await loadEntries();
});

describe('verse rendering', () => {
  it('has a verse block on every entry page', () => {
    for (const e of entries) {
      expect(e.verse, `${e.file} has no verse block`).not.toBe('');
    }
  });

  it('preserves every line of a poem as a line break', () => {
    for (const e of entries) {
      const breaks = e.verse.match(/<br\s*\/?>/g) ?? [];
      const paragraphs = (e.verse.match(/<p[\s>]/g) ?? []).length;

      // Within a paragraph each newline is a <br>, so n lines across p
      // paragraphs yield n - p breaks. If Markdown ever collapses newlines
      // again this drops toward zero and fails loudly.
      expect(breaks.length, `${e.file}`).toBe(e.lines.length - paragraphs);
    }
  });

  it('renders every source line, as text or as an embed', () => {
    for (const e of entries) {
      const visible = textOf(e.verse);

      for (const line of e.lines) {
        const trimmed = line.trim();
        const video = parseYouTube(trimmed);

        if (video) {
          // A standalone YouTube URL is deliberately replaced by a player,
          // so the raw URL is absent from the output by design.
          expect(e.verse, `${e.file}: ${trimmed}`).toContain(
            `/embed/${video.id}`,
          );
        } else {
          expect(visible, `${e.file}: ${trimmed}`).toContain(trimmed);
        }
      }
    }
  });
});

describe('entry metadata', () => {
  it('renders the date and place caption', () => {
    expect(indexHtml).toMatch(
      /<time datetime="2026-06-08"[^>]*>2026\.06\.08<\/time>/,
    );
    expect(indexHtml).toContain('춘천');
  });

  it('gives every entry a machine-readable datetime', () => {
    const times = indexHtml.match(/<time datetime="(\d{4}-\d{2}-\d{2})"/g) ?? [];
    expect(times.length).toBe(entries.length);
  });

  it('does not repeat the title inside the verse body', () => {
    // The H1 and date line were lifted into frontmatter; if they leak back
    // into the body they would render twice.
    for (const e of entries) {
      expect(e.verse, e.file).not.toContain('<h1');
      expect(e.verse, e.file).not.toContain('<h2');
    }
  });
});

describe('routing', () => {
  it('builds one page per diary file', async () => {
    const files = await diaryFiles();
    expect(entryDirs.length).toBe(files.length);
  });

  it('links every entry from the index', () => {
    // Hrefs are written with literal Hangul, not percent-encoded. The base
    // prefix is left unasserted so switching to a user site doesn't fail here.
    for (const dir of entryDirs) {
      expect(indexHtml).toMatch(
        new RegExp(`href="[^"]*/${escapeRegExp(dir)}/"`),
      );
    }
  });

  it('orders entries newest first on the index', () => {
    const dates = [...indexHtml.matchAll(/<time datetime="([\d-]+)"/g)].map(
      (m) => m[1]!,
    );
    expect(dates).toEqual([...dates].sort().reverse());
  });
});

describe('youtube embeds', () => {
  it('embeds a player for every standalone YouTube URL in the diary', () => {
    const expected = entries.flatMap((e) =>
      e.lines
        .map((l) => parseYouTube(l.trim()))
        .filter((v): v is NonNullable<typeof v> => v !== null)
        .map((v) => ({ file: e.file, verse: e.verse, id: v.id })),
    );

    for (const { file, verse, id } of expected) {
      expect(verse, file).toContain(
        `https://www.youtube-nocookie.com/embed/${id}`,
      );
      expect(verse, file).toContain('loading="lazy"');
    }
  });

  it('never emits a block element that would split the verse paragraph', () => {
    for (const e of entries) {
      // A <div> inside the single verse <p> would terminate the paragraph and
      // scatter the poem's line breaks.
      expect(e.verse, e.file).not.toContain('<div');
    }
  });
});

describe('assets', () => {
  it('links both font stylesheets under the configured base', () => {
    expect(indexHtml).toMatch(
      /<link rel="stylesheet" href="[^"]*fonts\/pretendard\/pretendard\.css"/,
    );
    expect(indexHtml).toMatch(
      /<link rel="stylesheet" href="[^"]*fonts\/inter\.css"/,
    );
  });

  it('ships the font files the stylesheets reference', async () => {
    const fonts = await readdir(join(dist, 'fonts'));
    expect(fonts).toContain('inter-latin-wght-normal.woff2');
    expect(fonts).toContain('inter.css');

    const subset = await readdir(
      join(dist, 'fonts', 'pretendard', 'woff2-dynamic-subset'),
    );
    expect(subset.length).toBeGreaterThan(0);
  });
});
