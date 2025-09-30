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
            selector:
              "CallExpression[callee.object.name='TestHelpers'][callee.property.name='delay']",
            message:
              'Avoid TestHelpers.delay(). Use proper waiting (from `e2e/framework/index.ts`) with Assertions.expectElementToBeVisible() or similar framework methods instead.',
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
              'Avoid TestHelpers.delay(). Use proper waiting (from `e2e/framework/index.ts`) with Assertions.expectElementToBeVisible() or similar framework methods instead.',
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
              'Avoid direct waitFor() calls in test specs. Use Assertions utility methods (from e2e/framework/Assertions.ts) for better error handling.',
          },
          {
            selector:
              "CallExpression[callee.object.callee.name='waitFor'][callee.property.name=/^(toBeVisible|toExist|toHaveText|withTimeout)$/]",
            message:
              'Avoid direct waitFor() chains in test specs. Use Assertions utility methods (from e2e/framework/Assertions.ts) for better error handling.',
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
      files: ['**/e2e/pages/**/*.{js,ts}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: '../utils/Gestures',
                message:
                  'Do not import Gestures from e2e/utils/. Use e2e/framework/index.ts instead.',
              },
              {
                name: '../utils/Gestures.js',
                message:
                  'Do not import Gestures from e2e/utils/. Use e2e/framework/index.ts instead.',
              },
              {
                name: '../utils/Assertions',
                message:
                  'Do not import Assertions from e2e/utils/. Use e2e/framework/index.ts instead.',
              },
              {
                name: '../utils/Assertions.js',
                message:
                  'Do not import Assertions from e2e/utils/. Use e2e/framework/index.ts instead.',
              },
              {
                name: '../utils/Utilities',
                message:
                  'Do not import Utilities from e2e/utils/. Use e2e/framework/index.ts instead.',
              },
              {
                name: '../utils/Utilities.js',
                message:
                  'Do not import Utilities from e2e/utils/. Use e2e/framework/index.ts instead.',
              },
              {
                name: '../utils/Matchers',
                message:
                  'Do not import Matchers from e2e/utils/. Use e2e/framework/index.ts instead.',
              },
              {
                name: '../utils/Matchers.js',
                message:
                  'Do not import Matchers from e2e/utils/. Use e2e/framework/index.ts instead.',
              },
            ],
          },
        ],
      },
    },
  ],
};
