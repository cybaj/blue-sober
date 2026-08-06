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

let indexHtml: string;
let entryDirs: string[];

beforeAll(async () => {
  indexHtml = await readFile(join(dist, 'index.html'), 'utf8');
  entryDirs = await entryPageDirs();
});

describe('verse rendering', () => {
  it('preserves every line of a poem as a line break', async () => {
    const html = await readFile(
      join(dist, entryDirs[0]!, 'index.html'),
      'utf8',
    );
    const verse = html.match(/<div class="verse"[^>]*>([\s\S]*?)<\/div>/)?.[1];
    expect(verse, 'verse block should exist').toBeDefined();

    const source = await readFile(
      join(diaryDir, (await diaryFiles())[0]!),
      'utf8',
    );
    const body = source.split(/^---$/m).slice(2).join('---').trim();
    const sourceLines = body.split('\n').filter((l) => l.trim() !== '');

    // n lines of unbroken verse must yield n-1 <br> elements. If Markdown ever
    // collapses newlines again, this drops to 0 and the test fails loudly.
    const breaks = verse!.match(/<br\s*\/?>/g) ?? [];
    expect(breaks.length).toBe(sourceLines.length - 1);
  });

  it('renders the first and last line of the source', async () => {
    const html = await readFile(
      join(dist, entryDirs[0]!, 'index.html'),
      'utf8',
    );
    const source = await readFile(
      join(diaryDir, (await diaryFiles())[0]!),
      'utf8',
    );
    const body = source.split(/^---$/m).slice(2).join('---').trim();
    const lines = body.split('\n').filter((l) => l.trim() !== '');

    expect(html).toContain(lines[0]!.trim());
    expect(html).toContain(lines[lines.length - 1]!.trim());
  });
});

describe('entry metadata', () => {
  it('renders the date and place caption', () => {
    expect(indexHtml).toMatch(
      /<time datetime="2026-06-08"[^>]*>2026\.06\.08<\/time>/,
    );
    expect(indexHtml).toContain('춘천');
  });

  it('gives the date a machine-readable datetime', () => {
    const times = indexHtml.match(/<time datetime="(\d{4}-\d{2}-\d{2})"/g) ?? [];
    expect(times.length).toBeGreaterThan(0);
  });

  it('does not repeat the title inside the verse body', () => {
    // The H1 and date line were lifted into frontmatter; if they leak back
    // into the body they would render twice.
    const verse = indexHtml.match(/<div class="verse"[^>]*>([\s\S]*?)<\/div>/)?.[1];
    expect(verse).not.toContain('<h1');
    expect(verse).not.toContain('2026.06.08');
  });
});

describe('routing', () => {
  it('builds one page per diary file', async () => {
    const files = await diaryFiles();
    expect(entryDirs.length).toBe(files.length);
  });

  it('links every entry from the index', async () => {
    // Hrefs are written with literal Hangul, not percent-encoded. The base
    // prefix is left unasserted so switching to a user site doesn't fail here.
    for (const dir of entryDirs) {
      expect(indexHtml).toMatch(
        new RegExp(`href="[^"]*/${escapeRegExp(dir)}/"`),
      );
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
