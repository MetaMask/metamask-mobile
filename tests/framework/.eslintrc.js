// eslint-disable-next-line import-x/no-commonjs
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
            selector:
              "CallExpression[callee.object.name='TestHelpers'][callee.property.name='delay']",
            message:
              'Avoid TestHelpers.delay(). Use proper waiting (from `tests/framework/index.ts`) with Assertions.expectElementToBeVisible() or similar framework methods instead.',
          },
        ],
      },
    },
    {
      files: ['**/specs/**/*.{js,ts}'],
      excludedFiles: ['**/specs/**/*.failing.{js,ts}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: '../api-mocking/mock-server',
                message:
                  'Do not import startMockServer directly in test specs. Use withFixtures() with testSpecificMock parameter instead.',
              },
              {
                name: '../../api-mocking/mock-server',
                message:
                  'Do not import startMockServer directly in test specs. Use withFixtures() with testSpecificMock parameter instead.',
              },
            ],
            patterns: [
              {
                group: ['**/api-mocking/mock-server*'],
                message:
                  'Do not import startMockServer directly in test specs. Use withFixtures() with testSpecificMock parameter instead.',
              },
            ],
          },
        ],
        'no-restricted-syntax': [
          'warn',
          {
            selector:
              "CallExpression[callee.object.name='TestHelpers'][callee.property.name='delay']",
            message:
              'Avoid TestHelpers.delay(). Use proper waiting (from `tests/framework/index.ts`) with Assertions.expectElementToBeVisible() or similar framework methods instead.',
          },
          {
            selector: "CallExpression[callee.name='element']",
            message:
              'Avoid direct element() calls in test specs. Use Page Object methods or Matchers utility instead to follow POM patterns.',
          },
          {
            selector:
              "CallExpression[callee.object.name='by'][callee.property.name=/^(id|text|label|type|accessibilityLabel)$/]",
            message:
              'Avoid direct by.* selectors in test specs. Move element selectors to Page Objects or selector files to follow POM patterns.',
          },
          {
            selector: "CallExpression[callee.name='waitFor']",
            message:
              'Avoid direct waitFor() calls in test specs. Use Assertions utility methods (from tests/framework/Assertions.ts) for better error handling.',
          },
          {
            selector:
              "CallExpression[callee.object.callee.name='waitFor'][callee.property.name=/^(toBeVisible|toExist|toHaveText|withTimeout)$/]",
            message:
              'Avoid direct waitFor() chains in test specs. Use Assertions utility methods (from tests/framework/Assertions.ts) for better error handling.',
          },
          {
            selector: "CallExpression[callee.name='startMockServer']",
            message:
              'Do not call startMockServer directly in test specs. Use withFixtures() with testSpecificMock parameter instead.',
          },
          {
            selector:
              "Program:not(:has(CallExpression[callee.name=/^with.*Fixtures$/])):has(CallExpression[callee.name='describe']):has(CallExpression[callee.name=/^(it|test)$/])",
            message:
              'All E2E spec files must use withFixtures() or other with*Fixtures() methods for consistent test setup, mocking, and fixture management.',
          },
        ],
      },
    },
    {
      files: ['**/page-objects/**/*.{js,ts}', '**/flows/**/*.{js,ts}'],
      excludedFiles: [
        '**/page-objects/**/*.test.ts',
        '**/page-objects/**/*.test.js',
        '**/flows/**/*.test.ts',
        '**/flows/**/*.test.js',
      ],
      rules: {
        'no-restricted-imports': [
          'warn',
          {
            patterns: [
              {
                group: ['**/UnifiedGestures', '**/UnifiedGestures.ts'],
                message:
                  'Use Gestures from tests/framework (canonical). UnifiedGestures is legacy dual-runner API.',
              },
              {
                group: [
                  '**/framework',
                  '**/framework/index',
                  '**/framework/index.ts',
                  '**/framework/index.js',
                ],
                importNames: ['UnifiedGestures'],
                message:
                  'Use Gestures from tests/framework (canonical). UnifiedGestures is legacy dual-runner API.',
              },
            ],
          },
        ],
      },
    },
    // MMQA-2174: ban UnifiedGestures in smoke specs (error)
    {
      files: ['**/smoke-appium/**/*.{js,ts}', '**/smoke/**/*.{js,ts}'],
      excludedFiles: ['**/smoke-appium/**/*.test.ts', '**/smoke/**/*.test.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/UnifiedGestures', '**/UnifiedGestures.ts'],
                message:
                  'Use Gestures from tests/framework (canonical). UnifiedGestures is legacy dual-runner API.',
              },
              {
                group: [
                  '**/framework',
                  '**/framework/index',
                  '**/framework/index.ts',
                  '**/framework/index.js',
                ],
                importNames: ['UnifiedGestures'],
                message:
                  'Use Gestures from tests/framework (canonical). UnifiedGestures is legacy dual-runner API.',
              },
            ],
          },
        ],
      },
    },
  ],
};
