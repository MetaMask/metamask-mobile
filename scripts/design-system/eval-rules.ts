import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Rule source of the design system evals: the JSON next to this file. */
const EVAL_RULES_FILE = join(__dirname, 'eval-rules.json');

/** Key predicate: an explicit list or a regex. Exactly one is required. */
export interface KeyMatch {
  oneOf?: string[];
  pattern?: string;
}

/** Value predicate over a literal. `number` allows unary +/- and an except list. */
export type ValueMatch =
  | { type: 'number'; except?: number[] }
  | { type: 'string'; pattern: string };

/** What a rule matches: an object-literal property. The schema is the language; see README.md. */
export interface RuleMatch {
  node: 'Property';
  key: KeyMatch;
  value: ValueMatch;
}

export interface EvalRuleConfig {
  id: string;
  message: string;
  match: RuleMatch;
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

function parseRule(entry: unknown, index: number): EvalRuleConfig {
  const where = `rules[${index}]`;
  const rule = asRecord(entry, where);
  const match = asRecord(rule.match, `${where}.match`);

  const node = readString(match.node, `${where}.match.node`);
  if (node !== 'Property') {
    throw new Error(`${where}.match.node "${node}" is not supported ("Property")`);
  }

  return {
    id: readString(rule.id, `${where}.id`),
    message: readString(rule.message, `${where}.message`),
    match: {
      node,
      key: parseKey(asRecord(match.key, `${where}.match.key`), `${where}.match.key`),
      value: parseValue(
        asRecord(match.value, `${where}.match.value`),
        `${where}.match.value`,
      ),
    },
  };
}

function parseKey(key: Record<string, unknown>, where: string): KeyMatch {
  const pattern = readPattern(key.pattern, `${where}.pattern`);
  if (key.oneOf === undefined) {
    if (pattern === undefined) {
      throw new Error(`${where} takes exactly one of "oneOf" or "pattern"`);
    }
    return { pattern };
  }
  if (pattern !== undefined) {
    throw new Error(`${where} takes exactly one of "oneOf" or "pattern"`);
  }
  const oneOf = key.oneOf;
  if (
    !Array.isArray(oneOf) ||
    oneOf.length === 0 ||
    oneOf.some((item) => typeof item !== 'string' || item.trim().length === 0)
  ) {
    throw new Error(`${where}.oneOf must be a non-empty array of non-empty strings`);
  }
  return { oneOf: oneOf as string[] };
}

function parseValue(value: Record<string, unknown>, where: string): ValueMatch {
  const type = readString(value.type, `${where}.type`);
  if (type === 'number') {
    const except = value.except;
    if (
      except !== undefined &&
      (!Array.isArray(except) || except.some((item) => typeof item !== 'number'))
    ) {
      throw new Error(`${where}.except must be an array of numbers`);
    }
    return { type, except: except as number[] | undefined };
  }
  if (type === 'string') {
    const pattern = readPattern(value.pattern, `${where}.pattern`);
    if (pattern === undefined) {
      throw new Error(`${where}.pattern is required when type is "string"`);
    }
    return { type, pattern };
  }
  throw new Error(`${where}.type "${type}" is not supported ("number", "string")`);
}

function asRecord(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${where} must be an object`);
  }
  return value as Record<string, unknown>;
}

function readString(value: unknown, where: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${where} must be a non-empty string`);
  }
  return value;
}

function readPattern(value: unknown, where: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const pattern = readString(value, where);
  try {
    new RegExp(pattern);
  } catch {
    throw new Error(`${where} is not a valid regex: "${pattern}"`);
  }
  return pattern;
}
