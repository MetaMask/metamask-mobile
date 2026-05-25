/* eslint-disable import-x/no-commonjs */

/**
 * Files still allowed to import deprecated `app/util/number/index.js` during
 * the BN.js → BigInt migration. Kept in one array so the default import-fence
 * override can exclude them while the follow-up override below re-applies only
 * the expo-haptics / perps restrictions (see comments on those overrides).
 */
const utilNumberImportBurndownFiles = [
  'app/component-library/components-temp/CustomSpendCap/CustomInput/CustomInput.tsx',
  'app/component-library/components-temp/CustomSpendCap/CustomSpendCap.tsx',
  'app/components/UI/AccountInfoCard/index.js',
  'app/components/UI/AssetOverview/Price/Price.advanced.tsx',
  'app/components/UI/AssetOverview/Price/Price.legacy.tsx',
  'app/components/UI/AssetOverview/utils/marketDetails.ts',
  'app/components/UI/Bridge/components/QuoteSelectorView/QuoteRow.tsx',
  'app/components/UI/Bridge/components/QuoteSelectorView/index.tsx',
  'app/components/UI/Bridge/hooks/useBridgeQuoteData/index.ts',
  'app/components/UI/Bridge/hooks/useFormattedBalanceWithThreshold/index.ts',
  'app/components/UI/Bridge/hooks/useHasSufficientGas/index.ts',
  'app/components/UI/Bridge/hooks/useInsufficientBalance/index.ts',
  'app/components/UI/Bridge/hooks/useTokenBalanceInUsd/index.ts',
  'app/components/UI/Bridge/hooks/useTokensWithBalance/index.ts',
  'app/components/UI/Bridge/utils/exchange-rates.ts',
  'app/components/UI/Bridge/utils/formatNetworkFee.test.ts',
  'app/components/UI/Bridge/utils/formatNetworkFee.ts',
  'app/components/UI/Bridge/utils/transaction-history.ts',
  'app/components/UI/Card/hooks/useAssetBalances.tsx',
  'app/components/UI/Card/hooks/useCardDelegation.test.ts',
  'app/components/UI/Card/hooks/useCardDelegation.ts',
  'app/components/UI/Card/hooks/useNeedsGasFaucet.ts',
  'app/components/UI/Card/sdk/CardSDK.ts',
  'app/components/UI/CollectibleOverview/index.js',
  'app/components/UI/Earn/Views/EarnInputView/EarnInputView.test.tsx',
  'app/components/UI/Earn/Views/EarnLendingDepositConfirmationView/components/Erc20TokenHero/index.tsx',
  'app/components/UI/Earn/Views/EarnLendingDepositConfirmationView/index.tsx',
  'app/components/UI/Earn/Views/EarnLendingWithdrawalConfirmationView/index.tsx',
  'app/components/UI/Earn/Views/EarnWithdrawInputView/EarnWithdrawInputView.tsx',
  'app/components/UI/Earn/components/EarnLendingBalance/index.tsx',
  'app/components/UI/Earn/components/Earnings/EarningsHistory/EarningsHistory.utils.ts',
  'app/components/UI/Earn/components/InputDisplay/InputDisplay.test.tsx',
  'app/components/UI/Earn/hooks/useEarnGasFee.ts',
  'app/components/UI/Earn/hooks/useEarnInput.ts',
  'app/components/UI/Earn/hooks/useEarnings.ts',
  'app/components/UI/Earn/hooks/useInput.ts',
  'app/components/UI/Earn/hooks/useMultichainInputHandlers.ts',
  'app/components/UI/Earn/hooks/useMusdBalance.ts',
  'app/components/UI/Earn/hooks/useMusdCtaVisibility.ts',
  'app/components/UI/Earn/utils/number.ts',
  'app/components/UI/Earn/utils/token/index.ts',
  'app/components/UI/Earn/utils/tron.ts',
  'app/components/UI/HardwareWallet/AccountDetails/index.tsx',
  'app/components/UI/Money/constants/activityStyles.ts',
  'app/components/UI/Money/hooks/useMoneyAccountBalance.ts',
  'app/components/UI/Money/utils/moneyActivityFiat.ts',
  'app/components/UI/MultichainBridgeTransactionListItem/MultichainBridgeTransactionListItem.tsx',
  'app/components/UI/Notification/TransactionNotification/index.js',
  'app/components/UI/Ramp/Aggregator/Views/BuildQuote/BuildQuote.test.tsx',
  'app/components/UI/Ramp/Aggregator/Views/BuildQuote/BuildQuote.tsx',
  'app/components/UI/Ramp/Aggregator/Views/OrdersList/OrdersList.tsx',
  'app/components/UI/Ramp/Aggregator/Views/SendTransaction/SendTransaction.tsx',
  'app/components/UI/Ramp/Aggregator/components/OrderDetails.tsx',
  'app/components/UI/Ramp/Aggregator/components/OrderListItem/OrderListItem.tsx',
  'app/components/UI/Ramp/Aggregator/components/Quote/Quote.tsx',
  'app/components/UI/Ramp/Aggregator/hooks/useBalance.test.ts',
  'app/components/UI/Ramp/Aggregator/hooks/useBalance.ts',
  'app/components/UI/Ramp/Aggregator/hooks/useERC20GasLimitEstimation.ts',
  'app/components/UI/Ramp/Aggregator/hooks/useHandleSuccessfulOrder.ts',
  'app/components/UI/Ramp/Aggregator/hooks/useIntentAmount.ts',
  'app/components/UI/Ramp/Aggregator/utils/index.ts',
  'app/components/UI/Ramp/Deposit/utils/index.ts',
  'app/components/UI/Ramp/utils/getOrderAmount.ts',
  'app/components/UI/Ramp/utils/v2OrderToast.ts',
  'app/components/UI/Stake/components/StakingBalance/StakingBanners/ClaimBanner/ClaimBanner.tsx',
  'app/components/UI/Stake/components/StakingConfirmation/TokenValueStack/TokenValueStack.test.tsx',
  'app/components/UI/Stake/components/StakingConfirmation/TokenValueStack/TokenValueStack.tsx',
  'app/components/UI/Stake/components/StakingConfirmation/YouReceiveCard/YouReceiveCard.test.tsx',
  'app/components/UI/Stake/components/StakingConfirmation/YouReceiveCard/YouReceiveCard.tsx',
  'app/components/UI/Stake/hooks/useBalance.ts',
  'app/components/UI/Tokens/util/deriveBalanceFromAssetMarketDetails.test.ts',
  'app/components/UI/Tokens/util/deriveBalanceFromAssetMarketDetails.ts',
  'app/components/UI/TransactionElement/utils-gas.js',
  'app/components/UI/TransactionElement/utils.js',
  'app/components/UI/UrlAutocomplete/Result.tsx',
  'app/components/Views/AssetDetails/index.tsx',
  'app/components/Views/GasEducationCarousel/index.js',
  'app/components/Views/NetworksManagement/NetworkDetailsView/hooks/useNetworkValidation.ts',
  'app/components/Views/SocialLeaderboard/TraderPositionView/components/QuickBuyBottomSheet/useQuickBuyBottomSheet.ts',
  'app/components/Views/SocialLeaderboard/TraderPositionView/components/QuickBuyBottomSheet/useQuickBuyQuotes.ts',
  'app/components/Views/SocialLeaderboard/utils/formatters.ts',
  'app/components/Views/UnifiedTransactionsView/useUnifiedTxActions.test.ts',
  'app/components/Views/confirmations/components/gas/max-base-fee-input/max-base-fee-input.tsx',
  'app/components/Views/confirmations/components/gas/priority-fee-input/priority-fee-input.tsx',
  'app/components/Views/confirmations/components/info/typed-sign-v3v4/simulation/components/native-value-display/native-value-display.tsx',
  'app/components/Views/confirmations/components/info/typed-sign-v3v4/simulation/components/value-display/value-display.tsx',
  'app/components/Views/confirmations/components/transactions/custom-amount/custom-amount.tsx',
  'app/components/Views/confirmations/context/send-context/utils.ts',
  'app/components/Views/confirmations/external/staking/hooks/useStakingDetails.ts',
  'app/components/Views/confirmations/hooks/earn/useCustomAmount.tsx',
  'app/components/Views/confirmations/hooks/gas/useCancelSpeedupGas/useCancelSpeedupGas.ts',
  'app/components/Views/confirmations/hooks/send/useBalance.ts',
  'app/components/Views/confirmations/hooks/send/useCurrencyConversions.ts',
  'app/components/Views/confirmations/hooks/send/usePercentageAmount.ts',
  'app/components/Views/confirmations/hooks/useTokenAmount.ts',
  'app/components/Views/confirmations/legacy/components/CustomNonceModal/index.js',
  'app/components/Views/confirmations/legacy/components/WatchAssetRequest/index.js',
  'app/components/Views/confirmations/utils/send.ts',
  'app/components/hooks/useAddressBalance/useAddressBalance.ts',
  'app/components/hooks/useGetFormattedTokensPerChain.tsx',
  'app/components/hooks/useGetTotalFiatBalanceCrossChains.tsx',
  'app/core/Engine/Engine.ts',
  'app/core/Engine/controllers/gas-fee-controller/gas-fee-controller-init.test.ts',
  'app/core/GasPolling/GasPolling.ts',
  'app/core/NotificationManager.js',
  'app/selectors/assets/assets-list.ts',
  'app/selectors/earnController/earn/index.ts',
  'app/selectors/multichain/evm.ts',
  // `app/util/**` importers of `./number` or `../number` (resolves to `index.js`);
  // same burndown contract as feature files — remove when migrated to
  // `../number/bigint` (or `./number/bigint` from `app/util/`).
  'app/util/confirm-tx.js',
  'app/util/conversions.js',
  'app/util/confirmation/gas.ts',
  'app/util/confirmation/transactions.ts',
  'app/util/custom-gas/index.js',
  'app/util/networks/index.js',
  'app/util/transactions/index.js',
  'app/util/transactions/index.test.ts',
];

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
    'plugin:import-x/warnings',
    'plugin:react/recommended',
  ],
  // ESLint can find the plugin without the `eslint-plugin-` prefix. Ex. `eslint-plugin-react-compiler` -> `react-compiler`
  plugins: [
    '@typescript-eslint',
    '@metamask/design-tokens',
    'promise',
    'react-compiler',
    'tailwindcss',
  ],
  overrides: [
    {
      files: ['tests/**/*.{js,ts}'],
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
        // Surface JSDoc @deprecated annotations at every use-site (warn for now;
        // ratchet to 'error' once the BN.js → BigInt migration is complete).
        // Pairs with the `import-x/no-restricted-paths` fence on
        // `app/util/number/index.js` in the app import-fence override below.
        '@typescript-eslint/no-deprecated': 'warn',
        // Under discussion
        '@typescript-eslint/no-duplicate-enum-values': 'off',
        '@typescript-eslint/no-shadow': [
          'warn',
          {
            builtinGlobals: true,
            allow: ['Text'],
          },
        ],

        // These rule modifications are removing changes to our shared ESLint config made after
        // version v9. This is a temporary measure to get us to ESLint v9 compatible versions,
        // at which point we can restore the intended rules and use error suppression instead.
        //
        // TODO: Remove these modifications after the ESLint v9 update
        '@typescript-eslint/await-thenable': 'off',
        '@typescript-eslint/consistent-type-imports': 'off',
        '@typescript-eslint/consistent-type-exports': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/naming-convention': 'off',
        '@typescript-eslint/no-base-to-string': 'off',
        '@typescript-eslint/no-duplicate-type-constituents': 'off',
        '@typescript-eslint/no-empty-object-type': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/no-implied-eval': 'off',
        '@typescript-eslint/no-misused-promises': 'off',
        '@typescript-eslint/no-redundant-type-constituents': 'off',
        '@typescript-eslint/no-throw-literal': 'off',
        '@typescript-eslint/no-unnecessary-type-assertion': 'off',
        '@typescript-eslint/no-unnecessary-type-arguments': 'off',
        '@typescript-eslint/no-unsafe-enum-comparison': 'off',
        '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-wrapper-object-types': 'off',
        '@typescript-eslint/only-throw-error': 'off',
        '@typescript-eslint/prefer-enum-initializers': 'off',
        '@typescript-eslint/prefer-includes': 'off',
        '@typescript-eslint/prefer-nullish-coalescing': 'off',
        '@typescript-eslint/prefer-optional-chain': 'off',
        '@typescript-eslint/prefer-promise-reject-errors': 'off',
        '@typescript-eslint/prefer-readonly': 'off',
        '@typescript-eslint/prefer-reduce-type-parameter': 'off',
        '@typescript-eslint/prefer-string-starts-ends-with': 'off',
        '@typescript-eslint/promise-function-async': 'off',
        '@typescript-eslint/restrict-plus-operands': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
        '@typescript-eslint/switch-exhaustiveness-check': 'off',
        '@typescript-eslint/unbound-method': 'off',
        'no-restricted-syntax': [
          'error',
          {
            selector: 'WithStatement',
            message: 'With statements are not allowed',
          },
          {
            selector: 'SequenceExpression',
            message: 'Sequence expressions are not allowed',
          },
          // {
          //   selector: "BinaryExpression[operator='in']",
          //   message: 'The "in" operator is not allowed',
          // },
          // {
          //   selector:
          //     "PropertyDefinition[accessibility='private'], MethodDefinition[accessibility='private'], TSParameterProperty[accessibility='private']",
          //   message: 'Use a hash name instead.',
          // },
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
      files: ['scripts/**/*.mjs'],
      parser: '@babel/eslint-parser',
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ['@babel/preset-env'],
        },
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      rules: {
        'no-console': 'off',
        'import-x/no-commonjs': 'off',
        'import-x/no-nodejs-modules': 'off',
      },
    },
    {
      files: [
        'scripts/**/*.{js,ts}',
        'tests/tools/**/*.{js,ts}',
        'app.config.js',
      ],
      rules: {
        'no-console': 'off',
        'import-x/no-commonjs': 'off',
        'import-x/no-nodejs-modules': 'off',
      },
    },
    {
      files: ['tests/module-mocking/**/*.{js,ts}'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      files: [
        'app/components/**/*.{js,jsx,ts,tsx}',
        'app/component-library/**/*.{js,jsx,ts,tsx}',
      ],
      rules: {
        '@metamask/design-tokens/color-no-hex': 'error',
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
    {
      files: ['**/*.test.{js,ts,tsx,jsx}', '**/*.spec.{js,ts,tsx,jsx}'],
      plugins: ['jest'],
      rules: {
        // Prevent new file-based snapshots. Inline snapshots (toMatchInlineSnapshot)
        // are still allowed as they keep assertions co-located with the test.
        'jest/no-restricted-matchers': [
          'error',
          {
            toMatchSnapshot:
              'Use toMatchInlineSnapshot() or an explicit assertion instead. File-based snapshots are being phased out.',
          },
        ],
      },
    },
    {
      // Matches CODEOWNERS `**/snaps/**` and `**/Snaps/**` (@MetaMask/core-platform).
      // ESLint cannot read CODEOWNERS.
      files: [
        '**/snaps/**/*.{test,spec}.{js,ts,tsx,jsx}',
        '**/Snaps/**/*.{test,spec}.{js,ts,tsx,jsx}',
      ],
      plugins: ['jest'],
      rules: {
        'jest/no-restricted-matchers': 'off',
      },
    },
    // ── Perps controller Core-alignment override ──
    // Enforces the same ESLint rules that Core's @metamask/eslint-config
    // applies to packages/perps-controller so that code written in mobile
    // passes Core's linter after a straight copy.
    //
    // Plugin differences from Core:
    //   - mobile uses `import` (eslint-plugin-import); Core uses `import-x`
    //     (eslint-plugin-import-x). Rules are identical; `--fix` in Core
    //     handles any formatting delta.
    //
    // See docs/perps/perps-core-sync.md for the full sync workflow.
    {
      files: ['app/**/*-method-action-types*.ts'],
      excludedFiles: ['**/*.test.ts', '**/*.test.tsx'],
      rules: {
        // === Existing rule ===
        '@typescript-eslint/consistent-type-definitions': ['error', 'type'],

        // === Core base rules (from @metamask/eslint-config) ===
        'no-restricted-syntax': [
          'error',
          {
            selector: 'TSParameterProperty',
            message:
              'Prefer explicit property declaration and assignment in constructor.',
          },
          {
            selector: "MethodDefinition[accessibility='private']",
            message:
              'Use ES private class fields (#field) instead of TypeScript private keyword.',
          },
          {
            selector: "PropertyDefinition[accessibility='private']",
            message:
              'Use ES private class fields (#field) instead of TypeScript private keyword.',
          },
          // Mirror @metamask/eslint-config base rule — prevents `'x' in obj`
          // type-guards that would land in core as new `no-restricted-syntax`
          // suppressions. Use `hasProperty()` from `@metamask/utils` instead.
          {
            selector: "BinaryExpression[operator='in']",
            message:
              'The "in" operator is not allowed. Use `hasProperty()` from `@metamask/utils` instead.',
          },
          {
            selector: 'WithStatement',
            message: 'With statements are not allowed',
          },
          {
            selector: 'SequenceExpression',
            message: 'Sequence expressions are not allowed',
          },
        ],
        'id-denylist': [
          'error',
          'buf',
          'cat',
          'err',
          'cb',
          'cfg',
          'hex',
          'int',
          'msg',
          'num',
          'opt',
          'sig',
        ],
        'id-length': [
          'error',
          {
            min: 2,
            exceptionPatterns: ['_', 'a', 'b', 'i', 'j', 'k'],
            properties: 'never',
          },
        ],
        'no-negated-condition': 'error',
        'no-eq-null': 'error',
        'no-nested-ternary': 'error',
        'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
        'require-unicode-regexp': 'error',
        'consistent-return': 'error',
        'prefer-template': 'error',
        'prefer-destructuring': [
          'error',
          {
            VariableDeclarator: { array: false, object: true },
            AssignmentExpression: { array: false, object: false },
          },
          { enforceForRenamedProperties: false },
        ],
        'no-implicit-coercion': 'error',
        'no-param-reassign': 'error',
        'no-duplicate-imports': 'off',
        curly: ['error', 'all'],
        'no-void': 'error',

        // === TypeScript type-aware rules ===
        'no-shadow': 'off',
        '@typescript-eslint/no-shadow': ['error', { builtinGlobals: true }],
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        '@typescript-eslint/prefer-readonly': 'error',
        '@typescript-eslint/explicit-function-return-type': 'error',
        '@typescript-eslint/naming-convention': [
          'error',
          {
            selector: 'default',
            format: ['camelCase'],
            leadingUnderscore: 'allow',
            trailingUnderscore: 'forbid',
          },
          {
            selector: 'enumMember',
            format: ['PascalCase'],
          },
          {
            selector: 'import',
            format: ['camelCase', 'PascalCase', 'snake_case', 'UPPER_CASE'],
          },
          {
            selector: 'interface',
            format: ['PascalCase'],
            custom: {
              regex: '^I[A-Z]',
              match: false,
            },
          },
          {
            selector: 'objectLiteralMethod',
            format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          },
          {
            selector: 'objectLiteralProperty',
            format: null,
          },
          {
            selector: 'typeLike',
            format: ['PascalCase'],
          },
          {
            selector: 'typeParameter',
            format: ['PascalCase'],
            custom: { regex: '^.{3,}', match: true },
          },
          {
            selector: 'variable',
            format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
            leadingUnderscore: 'allow',
          },
          {
            selector: 'parameter',
            format: ['camelCase', 'PascalCase'],
            leadingUnderscore: 'allow',
          },
          {
            selector: [
              'classProperty',
              'objectLiteralProperty',
              'typeProperty',
              'classMethod',
              'objectLiteralMethod',
              'typeMethod',
              'accessor',
              'enumMember',
            ],
            format: null,
            modifiers: ['requiresQuotes'],
          },
        ],
        '@typescript-eslint/consistent-type-exports': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/restrict-template-expressions': 'error',

        // === Import rules ===
        'import-x/consistent-type-specifier-style': [
          'error',
          'prefer-top-level',
        ],
        'import-x/no-named-as-default': 'error',
        'import-x/order': [
          'error',
          {
            groups: [
              ['builtin', 'external'],
              ['internal', 'parent', 'sibling', 'index'],
            ],
            alphabetize: { order: 'asc', caseInsensitive: true },
            'newlines-between': 'always',
          },
        ],

        // === JSDoc rules ===
        'jsdoc/check-alignment': 'error',
        'jsdoc/tag-lines': ['error', 'any', { startLines: 1 }],
        'jsdoc/check-param-names': 'error',
        'jsdoc/require-param': 'error',
        'jsdoc/require-param-description': 'error',
        'jsdoc/require-returns': 'error',
        'jsdoc/require-returns-description': 'error',

        // === Promise rules (eslint-plugin-promise) ===
        'promise/always-return': 'error',
        'promise/no-nesting': 'error',
        'promise/no-callback-in-promise': 'error',
        'promise/param-names': 'error',
      },
    },
    {
      // Default app import fences (expo-haptics, perps, deprecated util/number/index.js).
      // `excludedFiles` applies to the whole override — listing burn-down paths
      // here would incorrectly skip expo/perps for those files, so burn-down is
      // excluded from *this* block only and picked up by the next override.
      files: ['app/**/*.{ts,tsx,js,jsx}'],
      excludedFiles: [
        // Designated expo-haptics wrapper — only this tree may import expo-haptics.
        'app/util/haptics/**/*.{ts,tsx,js,jsx}',
        // Legacy number utils + parity tests.
        'app/util/number/**',
        // BN.js → BigInt burn-down: still allowed util/number imports; see next override.
        ...utilNumberImportBurndownFiles,
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'expo-haptics',
                message:
                  'Import from app/util/haptics instead of expo-haptics directly.',
              },
            ],
            patterns: [
              {
                group: ['expo-haptics/*'],
                message:
                  'Import from app/util/haptics instead of expo-haptics directly.',
              },
            ],
          },
        ],
        // Fences the deprecated `app/util/number/index.js` module. We use
        // `import-x/no-restricted-paths` (not `no-restricted-imports`) because
        // it resolves each import to its absolute file, which means a single
        // entry catches every spelling that lands on `index.js` — bare
        // (`from '../util/number'`), explicit (`'../util/number/index'`),
        // and explicit-with-extension. Sibling modules like `bigint`,
        // `bignumber`, and `subscriptNotation` resolve to different files
        // and are unaffected, so no negation list is needed. Inherits the
        // burn-down allowlist from this override's `excludedFiles`; the
        // burn-down override below intentionally does not re-declare this
        // rule, so allow-listed files remain exempt.
        'import-x/no-restricted-paths': [
          'error',
          {
            zones: [
              {
                target: 'app',
                from: 'app/util/number/index.js',
                message:
                  'app/util/number/index.js is deprecated. Import the BigInt-based replacement from app/util/number/bigint instead. See app/util/number/bigint-migration-reference.test.ts for migration patterns.',
              },
            ],
          },
        ],
      },
    },
    {
      // Re-apply expo-haptics + perps only for burn-down files. A second
      // override is required because ESLint replaces `no-restricted-imports`
      // when the same rule is set again — we cannot use one override with only
      // `excludedFiles` for util/number without silently dropping other fences.
      files: utilNumberImportBurndownFiles,
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'expo-haptics',
                message:
                  'Import from app/util/haptics instead of expo-haptics directly.',
              },
            ],
            patterns: [
              {
                group: ['expo-haptics/*'],
                message:
                  'Import from app/util/haptics instead of expo-haptics directly.',
              },
            ],
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
    'import-x/resolver': {
      typescript: {}, // this loads <rootdir>/tsconfig.json to eslint
    },
    'import-x/internal-regex': '^@metamask/perps-controller',
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
    'import-x/no-named-as-default': 'off',
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
    'import-x/no-amd': 'error',
    'import-x/no-commonjs': 'error',
    'import-x/no-duplicates': 'error',
    'import-x/no-extraneous-dependencies': ['error', { packageDir: ['./'] }],
    'import-x/no-mutable-exports': 'error',
    'import-x/no-namespace': 'error',
    'import-x/no-nodejs-modules': 'error',
    'import-x/prefer-default-export': 'off',
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
    'import-x/no-unresolved': 'error',
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
    '@metamask/design-tokens/color-no-hex': 'off',
    radix: 'off',

    // These rule modifications are removing changes to our shared ESLint config made after
    // version v9. This is a temporary measure to get us to ESLint v9 compatible versions,
    // at which point we can restore the intended rules and use error suppression instead.
    //
    // TODO: Remove these modifications after the ESLint v9 update
    'react-hooks/rules-of-hooks': 'off',
    'no-loss-of-precision': 'off',
  },

  ignorePatterns: ['wdio.conf.js', 'app/util/termsOfUse/termsOfUseContent.ts'],
};
