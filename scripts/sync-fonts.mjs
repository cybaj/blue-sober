// Copies self-hosted font files out of node_modules into public/fonts/.
// Runs automatically before `dev` and `build`, so public/fonts/ is generated
// output and stays out of git.
//
// Pretendard ships a dynamic subset: ~92 small woff2 files split by unicode
// range. The browser downloads only the ranges a page actually uses, so a
// Korean page pulls a few dozen KB instead of the 2MB full variable font.
// Its CSS references the files with relative URLs, so copying the stylesheet
// and its sibling directory together keeps those URLs valid under any `base`.

import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'fonts');

const copies = [
  {
    from: 'node_modules/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css',
    to: 'pretendard/pretendard.css',
  },
  {
    from: 'node_modules/pretendard/dist/web/variable/woff2-dynamic-subset',
    to: 'pretendard/woff2-dynamic-subset',
  },
  {
    from: 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
    to: 'inter-latin-wght-normal.woff2',
  },
];

await rm(out, { recursive: true, force: true });

for (const { from, to } of copies) {
  const dest = join(out, to);
  await mkdir(dirname(dest), { recursive: true });
  await cp(join(root, from), dest, { recursive: true });
}

// Inter's stylesheet is written rather than copied, so its url() stays
// relative like Pretendard's — both then resolve correctly under any `base`.
const interCss = `@font-face {
	font-family: 'Inter Variable';
	font-style: normal;
	font-display: swap;
	font-weight: 100 900;
	src: url(./inter-latin-wght-normal.woff2) format('woff2-variations');
	unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
`;

await writeFile(join(out, 'inter.css'), interCss, 'utf8');

console.log(`fonts synced → ${out}`);
