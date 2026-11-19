import type { Rule } from 'eslint';

import { lineHasException } from './ds-exception';
import type {
  EvalRuleConfig,
  NumericLiteralOnKeysRuleConfig,
} from './eval-rules';

/**
 * Build an ESLint rule module from an eval rule config. Each config `kind`
 * maps to one generic check implemented here; the JSON source only picks the
 * kind and its parameters.
 */
export function createRuleFromConfig(config: EvalRuleConfig): Rule.RuleModule {
  switch (config.kind) {
    case 'no-numeric-literal-on-keys':
      return createNumericLiteralOnKeysRule(config);
  }
}

type SpacingProperty = Parameters<NonNullable<Rule.NodeListener['Property']>>[0];

/**
 * Report numeric literals other than the allowed values on the configured
 * object keys. JSX attributes are not object properties, so Box spacing props
 * are ignored.
 */
function createNumericLiteralOnKeysRule(
  config: NumericLiteralOnKeysRuleConfig,
): Rule.RuleModule {
  const keys: ReadonlySet<string> = new Set(config.keys);

  return {
    meta: {
      type: 'problem',
      docs: {
        description: `Disallow raw numeric values on the ${config.id} keys.`,
      },
      schema: [],
      messages: {
        flagged: config.message,
      },
    },
    create(context) {
      const sourceCode = context.sourceCode;

      return {
        Property(node: SpacingProperty) {
          if (node.parent?.type !== 'ObjectExpression') {
            return;
          }

          const key = propertyName(node);
          if (!key || !keys.has(key)) {
            return;
          }

          // Property.value is an ESLint node. Its ESTree type omits parent.
          const literal = disallowedLiteral(
            unwrapExpression(node.value as Rule.Node),
            config.allowedValues,
          );
          if (!literal?.loc) {
            return;
          }

          if (lineHasException(sourceCode, literal.loc.start.line)) {
            return;
          }

          context.report({
            node: literal,
            messageId: 'flagged',
            data: {
              key,
              value: sourceCode.getText(literal),
            },
          });
        },
      };
    },
  };
}

function propertyName(property: SpacingProperty): string | undefined {
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

/**
 * The node whose text is the offending literal, or undefined when the value
 * is allowed or not a numeric literal. Unary minus and plus count. `-0`
 * equals `0`, so an allowed 0 also allows -0.
 */
function disallowedLiteral(
  node: Rule.Node,
  allowedValues: readonly number[],
): Rule.Node | undefined {
  const value = readNumeric(node);
  if (value === undefined || allowedValues.includes(value)) {
    return undefined;
  }
  return node;
}

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
