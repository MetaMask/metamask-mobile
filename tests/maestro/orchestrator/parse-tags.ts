import yaml from 'js-yaml';
import { readFileSync } from 'fs';

interface FlowConfig {
  tags?: unknown[];
}

function parseConfig(flowPath: string): FlowConfig | null {
  const content = readFileSync(flowPath, 'utf-8');
  const configSection = content.split('---')[0];
  return yaml.load(configSection) as FlowConfig | null;
}

function findTag(config: FlowConfig | null, prefix: string): string | null {
  if (!config?.tags || !Array.isArray(config.tags)) {
    return null;
  }
  const tag = config.tags.find(
    (t: unknown) => typeof t === 'string' && t.startsWith(prefix),
  );
  return (tag as string) ?? null;
}

/**
 * Extract the fixture tag from a Maestro flow YAML file.
 * Maestro YAML uses --- to separate config (frontmatter) from commands.
 * Returns the full tag string (e.g., "fixture:default:with-tokens") or null.
 */
export function parseFixtureTag(flowPath: string): string | null {
  return findTag(parseConfig(flowPath), 'fixture:');
}

/**
 * Extract the mock override name from a Maestro flow YAML file.
 * Looks for a tag starting with "mock:" and returns the name portion.
 * e.g., "mock:send-balances" → "send-balances"
 */
export function parseMockTag(flowPath: string): string | null {
  const tag = findTag(parseConfig(flowPath), 'mock:');
  return tag ? tag.slice('mock:'.length) : null;
}
