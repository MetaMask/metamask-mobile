import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { flaskTags, smokeTags } from '../../../tests/tags.js';
import { performanceTags } from '../../../tests/tags.performance.js';

export type TagConfig = { tag: string; description: string };

export type CatalogEntry = { id: string; description: string };

export type SmartE2eCatalog = {
  e2e: CatalogEntry[];
  performance: CatalogEntry[];
};

const here = dirname(fileURLToPath(import.meta.url));

export function catalogEntries(
  tags: Record<string, TagConfig>,
): CatalogEntry[] {
  return Object.values(tags).map((config) => ({
    id: config.tag.replace(/:$/, ''),
    description: config.description,
  }));
}

export function buildSmartE2eCatalog(): SmartE2eCatalog {
  return {
    e2e: catalogEntries({ ...smokeTags, ...flaskTags }),
    performance: catalogEntries(performanceTags),
  };
}

export function writeSmartE2eCatalog(outputDir = here): string {
  const catalog = buildSmartE2eCatalog();
  const outputPath = join(outputDir, 'catalog.json');
  writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);
  return outputPath;
}
