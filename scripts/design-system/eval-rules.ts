import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Rule source of the design system evals: the JSON next to this file. */
const EVAL_RULES_FILE = join(__dirname, 'eval-rules.json');

/** One eval rule. `kind` picks the engine check; the rest are its parameters. */
export interface EvalRuleConfig {
  id: string;
  kind: 'no-numeric-literal-on-keys';
  keys: string[];
  allowedValues: number[];
  message: string;
}

/** Load the checked-in eval rules JSON. */
export function loadEvalRules(): EvalRuleConfig[] {
  return parseEvalRules(JSON.parse(readFileSync(EVAL_RULES_FILE, 'utf8')));
}

/** Parse the eval rules JSON. Throws on the first defect so a broken source fails loudly. */
export function parseEvalRules(json: unknown): EvalRuleConfig[] {
  const rules = (json as { rules?: unknown } | null)?.rules;
  if (!Array.isArray(rules)) {
    throw new Error('eval rules source must be an object with a "rules" array');
  }

  const configs = rules.map(parseRule);
  const seen = new Set<string>();
  for (const { id } of configs) {
    if (seen.has(id)) {
      throw new Error(`duplicate eval rule id "${id}"`);
    }
    seen.add(id);
  }
  return configs;
}

const isNonEmptyString = (item: unknown): item is string =>
  typeof item === 'string' && item.trim().length > 0;

const isNumber = (item: unknown): item is number => typeof item === 'number';

function parseRule(entry: unknown, index: number): EvalRuleConfig {
  const where = `rules[${index}]`;
  const rule = (
    typeof entry === 'object' && entry !== null ? entry : {}
  ) as Record<string, unknown>;

  const id = readString(rule.id, `${where}.id`);
  if (rule.kind !== 'no-numeric-literal-on-keys') {
    throw new Error(`${where} ("${id}") has unknown kind "${String(rule.kind)}"`);
  }

  return {
    id,
    kind: rule.kind,
    keys: readArray(rule.keys, `${where}.keys`, isNonEmptyString),
    allowedValues: readArray(rule.allowedValues, `${where}.allowedValues`, isNumber),
    message: readString(rule.message, `${where}.message`),
  };
}

function readString(value: unknown, where: string): string {  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${where} must be a non-empty string`);
  }
  return value;
}

function readArray<T>(
  value: unknown,
  where: string,
  guard: (item: unknown) => item is T,
): T[] {
  if (!Array.isArray(value) || value.length === 0 || !value.every(guard)) {
    throw new Error(`${where} must be a non-empty array of the expected type`);
  }
  return value;
}
