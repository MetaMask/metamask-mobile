import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Rule source of the design system evals. The engine reads this JSON; how the
 * file is generated is out of scope for the check.
 */
export const EVAL_RULES_FILE = join(__dirname, 'eval-rules.json');

/**
 * Config for the `no-numeric-literal-on-keys` kind: report numeric literals
 * on the listed object keys, except the allowed values.
 */
export interface NumericLiteralOnKeysRuleConfig {
  id: string;
  kind: 'no-numeric-literal-on-keys';
  keys: string[];
  allowedValues: number[];
  message: string;
}

export type EvalRuleConfig = NumericLiteralOnKeysRuleConfig;

const KNOWN_KINDS = new Set(['no-numeric-literal-on-keys']);

/**
 * Parse and validate the eval rules JSON. Throws on the first defect so a
 * broken source fails the check loudly instead of passing silently.
 */
export function parseEvalRules(json: unknown): EvalRuleConfig[] {
  if (typeof json !== 'object' || json === null || !Array.isArray((json as { rules?: unknown }).rules)) {
    throw new Error('eval rules source must be an object with a "rules" array');
  }

  const configs = (json as { rules: unknown[] }).rules.map((entry, index) =>
    parseRule(entry, index),
  );

  const seen = new Set<string>();
  for (const config of configs) {
    if (seen.has(config.id)) {
      throw new Error(`duplicate eval rule id "${config.id}"`);
    }
    seen.add(config.id);
  }

  return configs;
}

/**
 * Load the checked-in eval rules JSON next to this file.
 */
export function loadEvalRules(): EvalRuleConfig[] {
  return parseEvalRules(JSON.parse(readFileSync(EVAL_RULES_FILE, 'utf8')));
}

function parseRule(entry: unknown, index: number): EvalRuleConfig {
  const where = `rules[${index}]`;
  if (typeof entry !== 'object' || entry === null) {
    throw new Error(`${where} must be an object`);
  }

  const rule = entry as Record<string, unknown>;

  const id = readString(rule, 'id', where);
  const kind = readString(rule, 'kind', where);
  if (!KNOWN_KINDS.has(kind)) {
    throw new Error(
      `${where} ("${id}") has unknown kind "${kind}". Known kinds: ${[...KNOWN_KINDS].join(', ')}`,
    );
  }

  const message = readString(rule, 'message', where);
  const keys = readStringArray(rule, 'keys', where);
  const allowedValues = readNumberArray(rule, 'allowedValues', where);

  return { id, kind: kind as EvalRuleConfig['kind'], keys, allowedValues, message };
}

function readString(
  rule: Record<string, unknown>,
  field: string,
  where: string,
): string {
  const value = rule[field];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${where}.${field} must be a non-empty string`);
  }
  return value;
}

function readStringArray(
  rule: Record<string, unknown>,
  field: string,
  where: string,
): string[] {
  const value = rule[field];
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== 'string' || item.trim().length === 0)
  ) {
    throw new Error(`${where}.${field} must be a non-empty array of non-empty strings`);
  }
  return value as string[];
}

function readNumberArray(
  rule: Record<string, unknown>,
  field: string,
  where: string,
): number[] {
  const value = rule[field];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'number')) {
    throw new Error(`${where}.${field} must be an array of numbers`);
  }
  return value as number[];
}
