// eslint-disable-next-line import/no-commonjs
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
      files: ['e2e/**/*.{js,ts}', 'appwright/**/*.{js,ts}'],
      extends: ['./e2e/framework/.eslintrc.js'],
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
        // This change is included in `@metamask/eslint-config-typescript@10.0.0
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            vars: 'all',
            args: 'all',
            argsIgnorePattern: '[_]+',
            ignoreRestSiblings: true, // this line is what has changed
          },
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
      files: ['scripts/**/*.js', 'e2e/tools/**/*.{js,ts}', 'app.config.js'],
      rules: {
        'no-console': 0,
        'import/no-commonjs': 0,
        'import/no-nodejs-modules': 0,
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
    'no-catch-shadow': 0,
    'no-console': ['error', { allow: ['warn', 'error'] }],
    quotes: [
      'error',
      'single',
      {
        avoidEscape: true,
        allowTemplateLiterals: true,
      },
    ],
    'comma-dangle': 0,
    curly: 0,
    'no-shadow': 0,
    'no-bitwise': 0,
    'class-methods-use-this': 0,
    'eol-last': 1,
    'import/no-named-as-default': 0,
    'no-invalid-this': 0,
    'no-new': 0,
    'react/jsx-handler-names': 0,
    'react/no-did-mount-set-state': 0,
    'react/prefer-stateless-function': 0,
    'require-atomic-updates': 0,
    'array-callback-return': 2,
    'arrow-body-style': 2,
    'dot-notation': 2,
    eqeqeq: 2,
    'import/no-amd': 2,
    'import/no-commonjs': 2,
    'import/no-duplicates': 2,
    'import/no-extraneous-dependencies': ['error', { packageDir: ['./'] }],
    'import/no-mutable-exports': 2,
    'import/no-namespace': 2,
    'import/no-nodejs-modules': 2,
    'import/prefer-default-export': 0,
    'no-alert': 2,
    'no-constant-condition': [
      2,
      {
        checkLoops: false,
      },
    ],
    'no-duplicate-imports': 2,
    'no-empty-function': 2,
    'no-else-return': 2,
    'no-eval': 2,
    'no-extend-native': 2,
    'no-extra-bind': 2,
    'no-global-assign': 2,
    'no-implicit-globals': 2,
    'no-implied-eval': 2,
    'no-lonely-if': 2,
    'no-loop-func': 2,
    'no-new-func': 2,
    'no-new-wrappers': 2,
    'no-proto': 2,
    'no-script-url': 2,
    'no-self-compare': 2,
    'no-throw-literal': 2,
    'no-unmodified-loop-condition': 2,
    'no-unneeded-ternary': [
      2,
      {
        defaultAssignment: false,
      },
    ],
    'no-unsafe-negation': 2,
    'no-unused-expressions': 'off',
    'no-use-before-define': [2, 'nofunc'],
    'no-useless-call': 2,
    'no-useless-computed-key': 2,
    'no-useless-concat': 2,
    'no-useless-constructor': 2,
    'no-useless-rename': 2,
    'no-var': 2,
    'no-with': 2,
    'object-shorthand': 2,
    'operator-assignment': 2,
    'prefer-arrow-callback': 2,
    'prefer-const': 2,
    'prefer-rest-params': 2,
    'prefer-spread': 2,
    'import/no-unresolved': 2,
    'eslint-comments/no-unlimited-disable': 0,
    'eslint-comments/no-unused-disable': 0,
    'react-native/no-color-literals': 2,
    'react-native/no-inline-styles': 2,
    'react-native/no-unused-styles': 0,
    'react-native/split-platform-components': 2,
    'react/jsx-boolean-value': 2,
    'react/jsx-key': 1,
    'react/jsx-no-bind': 0,
    'react/jsx-pascal-case': 2,
    'react/jsx-wrap-multilines': 2,
    'react/no-danger': 2,
    'react/no-did-update-set-state': 2,
    'react/no-find-dom-node': 2,
    'react/no-multi-comp': [
      2,
      {
        ignoreStateless: true,
      },
    ],
    'react/no-render-return-value': 2,
    'react/no-string-refs': 2,
    'react/no-unused-prop-types': 2,
    'react/prefer-es6-class': 2,
    '@metamask/design-tokens/color-no-hex': 'warn',
    radix: 0,
  },

  ignorePatterns: ['wdio.conf.js', 'app/util/termsOfUse/termsOfUseContent.ts'],
};
