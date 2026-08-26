/* eslint-disable import-x/no-commonjs -- ESLint config must use CommonJS */

/** Dual-framework import restrictions. Error everywhere; no allowlist. */
const dualFrameworkRestrictedImportOptions = {
  patterns: [
    {
      group: ['**/UnifiedGestures', '**/UnifiedGestures.ts'],
      message:
        'Use Gestures from tests/framework (canonical). UnifiedGestures is an internal Appium facade.',
    },
    {
      group: [
        '**/FrameworkDetector',
        '**/FrameworkDetector.ts',
        '**/FrameworkDetector.js',
      ],
      message:
        'Do not import FrameworkDetector in POs/specs. Use Gestures/Assertions/Matchers (Appium-only).',
    },
    {
      group: [
        '**/EncapsulatedElement',
        '**/EncapsulatedElement.ts',
        '**/EncapsulatedElement.js',
      ],
      importNames: ['encapsulated', 'encapsulatedAction'],
      message:
        'Do not use encapsulated(). Prefer Matchers + Gestures/Assertions.',
    },
    {
      group: [
        '**/encapsulatedAction',
        '**/encapsulatedAction.ts',
        '**/encapsulatedAction.js',
      ],
      message:
        'Do not import encapsulatedAction. Prefer Gestures/Assertions from tests/framework.',
    },
    {
      group: [
        '**/AppiumMatchers',
        '**/AppiumMatchers.ts',
        '**/AppiumGestures',
        '**/AppiumGestures.ts',
        '**/AppiumAssertions',
        '**/AppiumAssertions.ts',
        '**/AppiumWebMatchers',
        '**/AppiumWebMatchers.ts',
      ],
      message:
        'Do not import AppiumMatchers/AppiumGestures/AppiumAssertions backends in POs/specs. Use Gestures/Assertions/Matchers.',
    },
    {
      // Only bare `from '.../framework'` / index re-exports (not framework/EncapsulatedElement etc.)
      group: [
        '**/framework/index',
        '**/framework/index.ts',
        '**/framework/index.js',
      ],
      importNames: [
        'UnifiedGestures',
        'FrameworkDetector',
        'encapsulated',
        'encapsulatedAction',
        'AppiumMatchers',
        'AppiumGestures',
        'AppiumAssertions',
        'AppiumWebMatchers',
      ],
      message:
        'Do not import dual-framework legacy APIs from tests/framework. Use Gestures/Assertions/Matchers.',
    },
    // Bare package-style imports that resolve to tests/framework/index
    {
      group: [
        '../../framework',
        '../framework',
        '../../../framework',
        '../../../../framework',
        '../../../../../framework',
      ],
      importNames: [
        'UnifiedGestures',
        'FrameworkDetector',
        'encapsulated',
        'encapsulatedAction',
        'AppiumMatchers',
        'AppiumGestures',
        'AppiumAssertions',
        'AppiumWebMatchers',
      ],
      message:
        'Do not import dual-framework legacy APIs from tests/framework. Use Gestures/Assertions/Matchers.',
    },
  ],
};

// eslint-disable-next-line import-x/no-commonjs
module.exports = {
  overrides: [
    {
      files: ['**/*.{js,ts}'],
      rules: {
        'no-console': 'off',
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
      files: [
        '**/page-objects/**/*.{js,ts}',
        '**/flows/**/*.{js,ts}',
        '**/smoke-appium/**/*.{js,ts}',
      ],
      excludedFiles: [
        '**/page-objects/**/*.test.ts',
        '**/page-objects/**/*.test.js',
        '**/flows/**/*.test.ts',
        '**/flows/**/*.test.js',
        '**/smoke-appium/**/*.test.ts',
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          dualFrameworkRestrictedImportOptions,
        ],
      },
    },
  ],
};
