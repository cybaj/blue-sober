import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// The diary folder is the source of truth and stays outside src/.
const diary = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './diary' }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    place: z.string().optional(),
  }),
});

export const collections = { diary };
