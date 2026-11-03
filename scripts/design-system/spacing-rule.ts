import type { Rule } from 'eslint';

import { lineHasException } from './ds-exception';

/**
 * Pilot key set. shortcut: horizontal, vertical, start, end, rowGap, and
 * columnGap stay out until a later spec adds them.
 */
export const SPACING_KEYS: ReadonlySet<string> = new Set([
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'gap',
]);

export const SPACING_RULE_ID = 'design-system/no-hardcoded-spacing';

const HARDCODED_MESSAGE =
  'Hard-coded spacing value "{{value}}" on "{{key}}". Use a Box spacing prop (1 unit = 4px, for example marginRight={2}) or twClassName. Intentional exception: add "// ds-exception: <reason>" on this line.';

type SpacingProperty = Parameters<NonNullable<Rule.NodeListener['Property']>>[0];

/**
 * Report numeric spacing literals other than 0 on the pilot keys.
 * JSX attributes are not object properties, so Box props are ignored.
 */
export const spacingRule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw numeric spacing on margin, padding, and gap object keys.',
    },
    schema: [],
    messages: {
      hardcoded: HARDCODED_MESSAGE,
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
        if (!key || !SPACING_KEYS.has(key)) {
          return;
        }

        // Property.value is an ESLint node. Its ESTree type omits parent.
        const literal = spacingLiteral(unwrapExpression(node.value as Rule.Node));
        if (!literal?.loc) {
          return;
        }

        if (lineHasException(sourceCode, literal.loc.start.line)) {
          return;
        }

        context.report({
          node: literal,
          messageId: 'hardcoded',
          data: {
            key,
            value: sourceCode.getText(literal),
          },
        });
      },
    };
  },
};

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
 * is 0 or not a numeric literal. Unary minus and plus count.
 */
function spacingLiteral(node: Rule.Node): Rule.Node | undefined {
  const value = readNumeric(node);
  if (value === undefined || value === 0) {
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
