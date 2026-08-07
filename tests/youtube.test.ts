import { describe, expect, it } from 'vitest';
import { parseYouTube, youTubeEmbed } from '../plugins/youtube.mjs';

describe('parseYouTube — accepted forms', () => {
  const id = 'dQw4w9WgXcQ';

  it.each([
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://music.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube.com/live/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`,
  ])('parses %s', (url) => {
    expect(parseYouTube(url)?.id).toBe(id);
  });

  it('ignores unrelated query parameters', () => {
    expect(
      parseYouTube(`https://www.youtube.com/watch?v=${id}&list=PLabc&index=2`)
        ?.id,
    ).toBe(id);
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseYouTube(`  https://youtu.be/${id}  `)?.id).toBe(id);
  });
});

describe('parseYouTube — rejected forms', () => {
  it.each([
    ['a channel', 'https://www.youtube.com/@someone'],
    ['a playlist', 'https://www.youtube.com/playlist?list=PLabc'],
    ['a search', 'https://www.youtube.com/results?search_query=blue'],
    ['a watch URL with no id', 'https://www.youtube.com/watch'],
    ['a look-alike host', 'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ'],
    ['a non-YouTube host', 'https://vimeo.com/123456'],
    ['a too-short id', 'https://youtu.be/abc'],
    ['plain prose', '유튜브를 켜놓고 자주 말들 재생했었다.'],
    ['an empty string', ''],
  ])('rejects %s', (_label, url) => {
    expect(parseYouTube(url)).toBeNull();
  });

  it('rejects non-string input', () => {
    expect(parseYouTube(null as unknown as string)).toBeNull();
    expect(parseYouTube(undefined as unknown as string)).toBeNull();
  });
});

describe('parseYouTube — start time', () => {
  const base = 'https://youtu.be/dQw4w9WgXcQ';

  it.each([
    ['?t=90', 90],
    ['?t=90s', 90],
    ['?t=1m30s', 90],
    ['?t=1h2m3s', 3723],
    ['?start=45', 45],
    ['', 0],
    ['?t=', 0],
    ['?t=abc', 0],
  ])('reads %s as %i seconds', (query, expected) => {
    expect(parseYouTube(base + query)?.start).toBe(expected);
  });
});

describe('youTubeEmbed', () => {
  const video = { id: 'dQw4w9WgXcQ', start: 0 };

  it('embeds via the no-cookie domain', () => {
    expect(youTubeEmbed(video)).toContain(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    );
  });

  it('omits the start parameter when there is no offset', () => {
    expect(youTubeEmbed(video)).not.toContain('start=');
  });

  it('includes the start parameter when there is an offset', () => {
    expect(youTubeEmbed({ id: 'dQw4w9WgXcQ', start: 90 })).toContain(
      '?start=90',
    );
  });

  it('lazy-loads and stays keyboard accessible', () => {
    const html = youTubeEmbed(video);
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('title="YouTube video player"');
    expect(html).toContain('allowfullscreen');
  });

  it('wraps in a span so it stays valid inside a paragraph', () => {
    const html = youTubeEmbed(video);
    expect(html.startsWith('<span')).toBe(true);
    expect(html).not.toContain('<div');
  });

  it('does not permit autoplay', () => {
    expect(youTubeEmbed(video)).not.toContain('autoplay');
  });
});
