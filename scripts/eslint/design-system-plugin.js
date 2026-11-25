/**
 * Spacing grid checks for app code. `spacing-grid` is core
 * `no-restricted-syntax` under this plugin's name, so its selectors in
 * eslint.config.mjs do not replace the `no-restricted-syntax` bans that
 * .eslintrc.js applies to the same files.
 *
 * The re-export reads `eslint/use-at-your-own-risk`, an undocumented ESLint
 * API that can change between releases; component-view-plugin.js relies on
 * the same alias. scripts/eslint-restricted-syntax-fences.test.ts resolves
 * these rules from the flat config ESLint actually uses and fails if the
 * alias stops resolving.
 */
'use strict';

const SPACING_RULE_ID = 'design-system/spacing-grid';

const MISSING_REASON_MESSAGE = `An eslint-disable for ${SPACING_RULE_ID} needs a reason: add "-- <why>" after the rule name.`;

const spacingGridDisableReason = {
  meta: {
    type: 'problem',
    docs: {
      description: `Require a description on eslint-disable comments for ${SPACING_RULE_ID}`,
    },
    schema: [],
    messages: { missingReason: MISSING_REASON_MESSAGE },
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    return {
      Program() {
        // getDisableDirectives() parses comments the same way ESLint does
        // when it applies them, so the rule list and description match.
        const { directives } = sourceCode.getDisableDirectives();
        for (const directive of directives) {
          if (directive.type === 'enable') {
            continue;
          }
          const namesSpacingGrid = directive.value
            .split(',')
            .some((entry) => entry.trim() === SPACING_RULE_ID);
          if (namesSpacingGrid && directive.justification.trim() === '') {
            context.report({ node: directive.node, messageId: 'missingReason' });
          }
        }
      },
    };
  },
};

module.exports = {
  meta: {
    name: 'design-system',
    version: '1.0.0',
  },
  rules: {
    'spacing-grid': require('eslint/use-at-your-own-risk').builtinRules.get(
      'no-restricted-syntax',
    ),
    'spacing-grid-disable-reason': spacingGridDisableReason,
  },
};
