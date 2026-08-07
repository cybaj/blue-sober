/**
 * YouTube support for diary entries.
 *
 * A YouTube URL alone on its own line becomes an embedded player. Anywhere
 * else — mid-sentence, or as part of a longer line — it stays an ordinary
 * link, so quoting a URL inside a poem doesn't accidentally embed a video.
 */

const HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

const VIDEO_ID = /^[\w-]{11}$/;

/**
 * Parses a start-time offset. YouTube writes these as a bare seconds count
 * (`90`), seconds with a suffix (`90s`), or a duration (`1m30s`, `1h2m3s`).
 * Returns whole seconds, or 0 when there is no usable offset.
 */
function parseStart(value) {
  if (!value) return 0;

  if (/^\d+$/.test(value)) return Number(value);

  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!match || (!match[1] && !match[2] && !match[3])) return 0;

  const [, h = 0, m = 0, s = 0] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

/**
 * Extracts the video id and start offset from a YouTube URL.
 * Returns null for anything that isn't a recognisable YouTube video link,
 * including YouTube URLs that point at a channel, playlist, or search.
 */
export function parseYouTube(raw) {
  if (typeof raw !== 'string') return null;

  let url;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!HOSTS.has(url.hostname)) return null;

  const segments = url.pathname.split('/').filter(Boolean);
  let id = null;

  if (url.hostname.endsWith('youtu.be')) {
    id = segments[0] ?? null;
  } else if (segments[0] === 'watch') {
    id = url.searchParams.get('v');
  } else if (['shorts', 'embed', 'live', 'v'].includes(segments[0])) {
    id = segments[1] ?? null;
  }

  if (!id || !VIDEO_ID.test(id)) return null;

  const start = parseStart(url.searchParams.get('t') ?? url.searchParams.get('start'));
  return { id, start };
}

/** Builds the embed markup for a parsed video. */
export function youTubeEmbed({ id, start }) {
  const src =
    `https://www.youtube-nocookie.com/embed/${id}` +
    (start > 0 ? `?start=${start}` : '');

  // A <span> rather than a <div>: remark-breaks renders each entry as one
  // <p>, and a block-level element inside it would split the paragraph. The
  // span is display:block in CSS, and <iframe> is phrasing content, so this
  // nests validly.
  return (
    `<span class="youtube">` +
    `<iframe src="${src}" title="YouTube video player" loading="lazy" ` +
    `referrerpolicy="strict-origin-when-cross-origin" ` +
    `allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ` +
    `allowfullscreen></iframe>` +
    `</span>`
  );
}

/** True when the node is a link or bare text holding only this URL. */
function urlOf(node) {
  if (!node) return null;
  if (node.type === 'link') return node.url;
  if (node.type === 'text') {
    const value = node.value.trim();
    return value === '' ? null : value;
  }
  return null;
}

/**
 * remark plugin. Must run AFTER remark-breaks so that lines are delimited by
 * `break` nodes; ordering is set in astro.config.mjs.
 */
export function remarkYouTube() {
  return (tree) => {
    visitParagraphs(tree, (paragraph) => {
      const out = [];
      let line = [];

      const flush = () => {
        const meaningful = line.filter(
          (n) => !(n.type === 'text' && n.value.trim() === ''),
        );

        if (meaningful.length === 1) {
          const parsed = parseYouTube(urlOf(meaningful[0]));
          if (parsed) {
            out.push({ type: 'html', value: youTubeEmbed(parsed) });
            line = [];
            return;
          }
        }

        out.push(...line);
        line = [];
      };

      for (const child of paragraph.children) {
        if (child.type === 'break') {
          flush();
          out.push(child);
        } else {
          line.push(child);
        }
      }
      flush();

      paragraph.children = out;
    });
  };
}

function visitParagraphs(node, fn) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'paragraph') fn(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) visitParagraphs(child, fn);
  }
}
