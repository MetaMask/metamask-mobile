/**
 * Spacing grid checks for app code. `spacing-grid` is core
 * `no-restricted-syntax` under this plugin's name, so its selectors in
 * eslint.config.mjs do not replace the `no-restricted-syntax` bans that
 * .eslintrc.js applies to the same files.
 *
 * The re-export reads `eslint/use-at-your-own-risk`, an undocumented ESLint
 * API that can change between releases; component-view-plugin.js relies on
 * the same alias. scripts/eslint-restricted-syntax-fences.test.ts resolves
 * these rules from the flat config ESLint actually uses, so an ESLint upgrade
 * that breaks the alias fails there before lint runs.
 */
'use strict';

const SPACING_RULE_ID = 'design-system/spacing-grid';

// ESLint's directive syntax separates the rule list from the description with
// `--`. Parsing stays on the directive's first line, so a rule name or `--`
// on a later line of a block comment is not treated as part of it.
const DISABLE_DIRECTIVE = /^eslint-disable(?:-next-line|-line)?\b/u;

/**
 * @param {string} commentValue
 * @returns {boolean} True when the comment disables `spacing-grid` without a description.
 */
function disablesSpacingGridWithoutReason(commentValue) {
  const firstLine = commentValue.trim().split('\n')[0];
  const directive = DISABLE_DIRECTIVE.exec(firstLine);
  if (!directive) {
    return false;
  }
  const rest = firstLine.slice(directive[0].length);
  const descriptionStart = rest.indexOf('--');
  const ruleList =
    descriptionStart === -1 ? rest : rest.slice(0, descriptionStart);
  const description =
    descriptionStart === -1 ? '' : rest.slice(descriptionStart + 2);
  const namesSpacingGrid = ruleList
    .split(',')
    .some((entry) => entry.trim() === SPACING_RULE_ID);
  return namesSpacingGrid && description.trim() === '';
}

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
        for (const comment of sourceCode.getAllComments()) {
          if (disablesSpacingGridWithoutReason(comment.value)) {
            context.report({ node: comment, messageId: 'missingReason' });
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
