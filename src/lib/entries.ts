import { getCollection, type CollectionEntry } from 'astro:content';

/** All diary entries, newest first. The single place sort order is decided. */
export async function getDiaryEntries(): Promise<CollectionEntry<'diary'>[]> {
  const entries = await getCollection('diary');
  return entries.sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );
}
