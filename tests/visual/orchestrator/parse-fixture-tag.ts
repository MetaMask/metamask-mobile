import yaml from 'js-yaml';
import { readFileSync } from 'fs';

/**
 * Extract the fixture tag from a Maestro flow YAML file.
 * Maestro YAML uses --- to separate config (frontmatter) from commands.
 * Returns the full tag string (e.g., "fixture:default:with-tokens") or null.
 */
export function parseFixtureTag(flowPath: string): string | null {
  const content = readFileSync(flowPath, 'utf-8');
  const configSection = content.split('---')[0];
  const config = yaml.load(configSection) as Record<string, unknown> | null;

  if (!config?.tags || !Array.isArray(config.tags)) {
    return null;
  }

  const fixtureTag = config.tags.find(
    (tag: unknown) => typeof tag === 'string' && tag.startsWith('fixture:'),
  );
  return (fixtureTag as string) ?? null;
}
