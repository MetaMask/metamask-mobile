/* eslint-disable import/no-commonjs */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
  },
  extends: [
    '@react-native',
    'eslint:recommended',
    // '@metamask/eslint-config', // TODO: Enable when ready
    'plugin:import/warnings',
    'plugin:react/recommended',
  ],
  // ESLint can find the plugin without the `eslint-plugin-` prefix. Ex. `eslint-plugin-react-compiler` -> `react-compiler`
  plugins: [
    '@typescript-eslint',
    '@metamask/design-tokens',
    'react-compiler',
    'tailwindcss',
  ],
  overrides: [
    {
      files: ['tests/**/*.{js,ts}', 'appwright/**/*.{js,ts}'],
      extends: ['./tests/framework/.eslintrc.js'],
    },
    {
      files: ['*.{ts,tsx}'],
      extends: ['@metamask/eslint-config-typescript'],
      rules: {
        // TODO: re-enable
        'jsdoc/no-types': 'off',
        'react/display-name': 'off',
        'react/no-unused-prop-types': 'off',
        'react/prop-types': 'off',
        'react/self-closing-comp': 'off',
        // Temporarily overriding this rule to postpone this breaking change: https://github.com/MetaMask/eslint-config/pull/216
        // TODO: Remove this override and align on prefering type over interface.
        '@typescript-eslint/consistent-type-definitions': [
          'error',
          'interface',
        ],
        '@typescript-eslint/no-explicit-any': 'error',
        // Under discussion
        '@typescript-eslint/no-duplicate-enum-values': 'off',
        '@typescript-eslint/no-shadow': [
          'warn',
          {
            builtinGlobals: true,
            allow: ['Text'],
          },
        ],
      },
    },
    {
      files: ['*.js', '*.jsx'],
      parser: '@babel/eslint-parser',
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ['@babel/preset-env'],
        },
      },
      rules: {
        // under discussion
        'no-unused-vars': 'off',
        'react/no-unstable-nested-components': [
          'warn',
          {
            allowAsProps: true,
          },
        ],
      },
    },
    {
      files: ['scripts/**/*.js', 'tests/tools/**/*.{js,ts}', 'app.config.js'],
      rules: {
        'no-console': 'off',
        'import/no-commonjs': 'off',
        'import/no-nodejs-modules': 'off',
      },
    },
    {
      files: ['**/*.test.{js,ts,tsx}', '**/*.stories.{js,ts,tsx}'],
      rules: {
        '@metamask/design-tokens/color-no-hex': 'off',
      },
    },
    {
      files: [
        'app/components/UI/Name/**/*.{js,ts,tsx}',
        'app/components/UI/SimulationDetails/**/*.{js,ts,tsx}',
        'app/components/hooks/DisplayName/**/*.{js,ts,tsx}',
        'app/components/Views/confirmations/**/*.{js,ts,tsx}',
      ],
      excludedFiles: [
        'app/components/Views/confirmations/components/WatchAssetRequest/**/*.{js,ts,tsx}',
      ],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: `ImportSpecifier[imported.name=/${[
              'selectChainId',
              'selectContractExchangeRates',
              'selectConversionRate',
              'selectNetworkClientId',
              'selectNetworkStatus',
              'selectNickname',
              'selectProviderConfig',
              'selectProviderType',
              'selectRpcUrl',
              'selectSelectedNetworkClientId',
              'selectEvmTicker',
            ]
              .map((method) => `^${method}$`)
              .join('|')}/]`,
            message: 'Avoid using global network selectors in confirmations',
          },
        ],
      },
    },
    {
      files: [
        'app/component-library/**/*.{js,ts,tsx}',
        'app/components/**/*.{js,ts,tsx}',
      ],
      plugins: ['tailwindcss'],
      rules: {
        'tailwindcss/classnames-order': 'error',
        'tailwindcss/enforces-negative-arbitrary-values': 'error',
        'tailwindcss/enforces-shorthand': 'error',
        'tailwindcss/no-arbitrary-value': 'off', // There are legitimate reasons to use arbitrary values but we should specifically error on static colors
        'tailwindcss/no-custom-classname': 'error',
        'tailwindcss/no-contradicting-classname': 'error',
        'tailwindcss/no-unnecessary-arbitrary-value': 'error',
      },
      settings: {
        tailwindcss: {
          callees: ['twClassName', 'tw'],
          config: './tailwind.config.js',
          tags: ['tw'], // Enable template literal support for tw`classnames`
        },
      },
    },
    {
      files: ['**/*.view.test.{js,ts,tsx,jsx}'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector:
              "CallExpression[callee.object.name='jest'][callee.property.name='mock'][arguments.0.type='Literal'][arguments.0.value!='../../../core/Engine'][arguments.0.value!='../../../core/Engine/Engine'][arguments.0.value!='react-native-device-info']",
            message:
              'Only Engine and react-native-device-info can be mocked in component-view tests.',
          },
        ],
      },
    },
  ],

  globals: {
    process: true,
    beforeAll: true,
    afterAll: true,
    describe: true,
    expect: true,
    it: true,
    jasmine: true,
    jest: true,
    spyOn: true,
    element: true,
    by: true,
    beforeEach: true,
    device: true,
    __DEV__: true,
    driver: true,
    $: true,
    $$: true,
  },

  settings: {
    'import/resolver': {
      typescript: {}, // this loads <rootdir>/tsconfig.json to eslint
    },
  },

  rules: {
    // Set to error once all warnings reported by React Compiler are resolved
    'react-compiler/react-compiler': 'warn',
    'no-catch-shadow': 'off',
    'no-console': ['error', { allow: ['warn', 'error'] }],
    quotes: [
      'error',
      'single',
      {
        avoidEscape: true,
        allowTemplateLiterals: true,
      },
    ],
    'comma-dangle': 'off',
    curly: 'off',
    'no-shadow': 'off',
    'no-bitwise': 'off',
    'class-methods-use-this': 'off',
    'eol-last': 'warn',
    'import/no-named-as-default': 'off',
    'no-invalid-this': 'off',
    'no-new': 'off',
    'react/jsx-handler-names': 'off',
    'react/no-did-mount-set-state': 'off',
    'react/prefer-stateless-function': 'off',
    'require-atomic-updates': 'off',
    'array-callback-return': 'error',
    'arrow-body-style': 'error',
    'dot-notation': 'error',
    eqeqeq: 'error',
    'import/no-amd': 'error',
    'import/no-commonjs': 'error',
    'import/no-duplicates': 'error',
    'import/no-extraneous-dependencies': ['error', { packageDir: ['./'] }],
    'import/no-mutable-exports': 'error',
    'import/no-namespace': 'error',
    'import/no-nodejs-modules': 'error',
    'import/prefer-default-export': 'off',
    'no-alert': 'error',
    'no-constant-condition': [
      'error',
      {
        checkLoops: false,
      },
    ],
    'no-duplicate-imports': 'error',
    'no-empty-function': 'error',
    'no-else-return': 'error',
    'no-eval': 'error',
    'no-extend-native': 'error',
    'no-extra-bind': 'error',
    'no-global-assign': 'error',
    'no-implicit-globals': 'error',
    'no-implied-eval': 'error',
    'no-lonely-if': 'error',
    'no-loop-func': 'error',
    'no-new-func': 'error',
    'no-new-wrappers': 'error',
    'no-proto': 'error',
    'no-script-url': 'error',
    'no-self-compare': 'error',
    'no-throw-literal': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-unneeded-ternary': [
      'error',
      {
        defaultAssignment: false,
      },
    ],
    'no-unsafe-negation': 'error',
    'no-unused-expressions': 'off',
    'no-use-before-define': ['error', 'nofunc'],
    'no-useless-call': 'error',
    'no-useless-computed-key': 'error',
    'no-useless-concat': 'error',
    'no-useless-constructor': 'error',
    'no-useless-rename': 'error',
    'no-var': 'error',
    'no-with': 'error',
    'object-shorthand': 'error',
    'operator-assignment': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-const': 'error',
    'prefer-rest-params': 'error',
    'prefer-spread': 'error',
    'import/no-unresolved': 'error',
    'eslint-comments/no-unlimited-disable': 'off',
    'eslint-comments/no-unused-disable': 'off',
    'react-native/no-color-literals': 'error',
    'react-native/no-inline-styles': 'error',
    'react-native/no-unused-styles': 'off',
    'react-native/split-platform-components': 'error',
    'react/jsx-boolean-value': 'error',
    'react/jsx-key': 'warn',
    'react/jsx-no-bind': 'off',
    'react/jsx-pascal-case': 'error',
    'react/jsx-wrap-multilines': 'error',
    'react/no-danger': 'error',
    'react/no-did-update-set-state': 'error',
    'react/no-find-dom-node': 'error',
    'react/no-multi-comp': [
      'error',
      {
        ignoreStateless: true,
      },
    ],
    'react/no-render-return-value': 'error',
    'react/no-string-refs': 'error',
    'react/no-unused-prop-types': 'error',
    'react/prefer-es6-class': 'error',
    '@metamask/design-tokens/color-no-hex': 'warn',
    radix: 'off',
  },

  ignorePatterns: ['wdio.conf.js', 'app/util/termsOfUse/termsOfUseContent.ts'],
};
