// eslint-disable-next-line import/no-commonjs
module.exports = {
  overrides: [
    {
      files: ['**/*.{js,ts}'],
      rules: {
        // E2E Framework Best Practices (starting with warnings, we will be changing to errors when the migration is complete)
        'no-console': 'off',
        'no-restricted-syntax': [
          'warn',
          {
            selector: "CallExpression[callee.object.name='TestHelpers'][callee.property.name='delay']",
            message: 'Avoid TestHelpers.delay(). Use proper waiting (from `e2e/framework/index.ts`) with Assertions.expectElementToBeVisible() or similar framework methods instead.',
          },
        ],
      },
    },
    {
      files: ['**/specs/**/*.{js,ts}'],
      rules: {
        'no-restricted-syntax': [
          'warn',
          {
            selector: "CallExpression[callee.object.name='TestHelpers'][callee.property.name='delay']",
            message: 'Avoid TestHelpers.delay(). Use proper waiting (from `e2e/framework/index.ts`) with Assertions.expectElementToBeVisible() or similar framework methods instead.',
          },
          {
            selector: "CallExpression[callee.name='element']",
            message: 'Avoid direct element() calls in test specs. Use Page Object methods or Matchers utility instead to follow POM patterns.',
          },
          {
            selector: "CallExpression[callee.object.name='by'][callee.property.name=/^(id|text|label|type|accessibilityLabel)$/]",
            message: 'Avoid direct by.* selectors in test specs. Move element selectors to Page Objects or selector files to follow POM patterns.',
          },
          {
            selector: "CallExpression[callee.name='waitFor']",
            message: 'Avoid direct waitFor() calls in test specs. Use Assertions utility methods (from e2e/framework/Assertions.ts) for better error handling.',
          },
          {
            selector: "CallExpression[callee.object.callee.name='waitFor'][callee.property.name=/^(toBeVisible|toExist|toHaveText|withTimeout)$/]",
            message: 'Avoid direct waitFor() chains in test specs. Use Assertions utility methods (from e2e/framework/Assertions.ts) for better error handling.',
          },
        ],
      },
    },
  ],
};
