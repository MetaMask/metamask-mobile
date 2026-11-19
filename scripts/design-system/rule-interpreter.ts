import type { Rule } from 'eslint';

import { lineHasException } from './ds-exception';
import type { EvalRuleConfig, KeyMatch, ValueMatch } from './eval-rules';

type PropertyNode = Parameters<NonNullable<Rule.NodeListener['Property']>>[0];

/**
 * Build an ESLint rule module from its JSON config. Everything the rule
 * matches comes from the JSON; this interpreter only knows the mechanics
 * (object properties, literals, TS unwrapping, ds-exception).
 */
export function createRuleFromConfig(config: EvalRuleConfig): Rule.RuleModule {
  const { match } = config;
  const keyHits = buildKeyMatcher(match.key);
  const isOffense = buildValueMatcher(match.value);

  return {
    meta: {
      type: 'problem',
      docs: { description: config.id },
      schema: [],
      messages: { flagged: config.message },
    },
    create(context) {
      const sourceCode = context.sourceCode;

      return {
        Property(node: PropertyNode) {
          if (node.parent?.type !== 'ObjectExpression') {
            return;
          }

          const key = propertyName(node);
          if (!key || !keyHits(key)) {
            return;
          }

          // Property.value is an ESLint node. Its ESTree type omits parent.
          const target = unwrapExpression(node.value as Rule.Node);
          if (!target.loc || !isOffense(target)) {
            return;
          }

          if (lineHasException(sourceCode, target.loc.start.line)) {
            return;
          }

          context.report({
            node: target,
            messageId: 'flagged',
            data: { key, value: sourceCode.getText(target) },
          });
        },
      };
    },
  };
}

function buildKeyMatcher(match: KeyMatch): (name: string) => boolean {
  if (match.oneOf) {
    const keys: ReadonlySet<string> = new Set(match.oneOf);
    return (name) => keys.has(name);
  }
  const regex = new RegExp(match.pattern ?? '');
  return (name) => regex.test(name);
}

function buildValueMatcher(match: ValueMatch): (node: Rule.Node) => boolean {
  if (match.type === 'number') {
    const except = match.except ?? [];
    return (node) => {
      const value = readNumeric(node);
      return value !== undefined && !except.includes(value);
    };
  }
  const regex = new RegExp(match.pattern);
  return (node) =>
    node.type === 'Literal' &&
    typeof node.value === 'string' &&
    regex.test(node.value);
}

function propertyName(property: PropertyNode): string | undefined {
  if (property.computed && property.key.type !== 'Literal') {
    return undefined;
  }

  if (!property.computed && property.key.type === 'Identifier' && property.key.name) {
    return property.key.name;
  }

  if (property.key.type === 'Literal' && typeof property.key.value === 'string') {
    return property.key.value;
  }

  return undefined;
}

function unwrapExpression(node: Rule.Node): Rule.Node {
  let current = node;
  // ESTree's node types omit TSAsExpression and the other TS wrappers.
  let type: string = current.type;
  while (
    type === 'TSAsExpression' ||
    type === 'TSTypeAssertion' ||
    type === 'TSSatisfiesExpression'
  ) {
    current = (current as Rule.Node & { expression: Rule.Node }).expression;
    type = current.type;
  }
  return current;
}

/** Numeric value of a literal, including unary minus and plus. `-0` is `0`. */
function readNumeric(node: Rule.Node): number | undefined {
  if (node.type === 'Literal' && typeof node.value === 'number') {
    return node.value;
  }

  if (
    node.type === 'UnaryExpression' &&
    (node.operator === '-' || node.operator === '+') &&
    node.argument.type === 'Literal' &&
    typeof node.argument.value === 'number'
  ) {
    return node.operator === '-' ? -node.argument.value : node.argument.value;
  }

  return undefined;
}
