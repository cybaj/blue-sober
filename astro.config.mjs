// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkBreaks from 'remark-breaks';

// GitHub Pages. For a PROJECT site (cybaj.github.io/blue-sober) keep `base`.
// For a USER site (cybaj.github.io) delete the `base` line entirely.
export default defineConfig({
  site: 'https://cybaj.github.io',
  base: '/blue-sober',
  trailingSlash: 'always',
  markdown: {
    // Astro 7's default processor (Satteri) has no line-break option, so the
    // remark pipeline is selected explicitly to run remark-breaks.
    //
    // The diary is free verse — a single newline is a line break, not filler.
    // Without this every poem collapses into one paragraph.
    processor: unified({
      remarkPlugins: [remarkBreaks],
      // Straight quotes and dashes are left exactly as written.
      smartypants: false,
    }),
  },
});
