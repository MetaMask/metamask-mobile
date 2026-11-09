import type { BindingCatalogEntry } from './types.ts';

/**
 * Maintainer-owned list of actions a scenario step can resolve to.
 *
 * Phrases are the wording authors write, plus the `elemDescription` strings
 * already used by the Page Objects, so a step can match either way.
 * `{name}` captures a value from the step (regenerating the lock keeps it).
 *
 * Adding an action here is what lets a new sentence run. Authors never edit
 * this file to change a token, an amount, or the order of steps.
 */
export const bindingCatalog: BindingCatalogEntry[] = [
  {
    binding: 'WalletView.tapWalletSwapButton',
    action: 'tap',
    source: 'tests/page-objects/wallet/WalletView.ts#tapWalletSwapButton',
    phrases: ['Tap the Swap button on the wallet home', 'Wallet Swap Button'],
    locators: [
      {
        strategy: 'testID',
        value: 'wallet-swap-button',
        source:
          'WalletViewSelectorsIDs.WALLET_SWAP_BUTTON (app/components/Views/Wallet/WalletView.testIds.ts)',
      },
    ],
  },
  {
    binding: 'QuoteView.isVisible',
    action: 'assertVisible',
    source: 'tests/page-objects/swaps/QuoteView.ts#isVisible',
    phrases: [
      'the swap screen with the source amount input is visible',
      'Swap screen source token input should be visible',
    ],
    locators: [
      {
        strategy: 'testID',
        value: 'source-token-area-input',
        source:
          'QuoteViewSelectorIDs.SOURCE_TOKEN_INPUT (tests/selectors/Bridge/QuoteView.selectors.ts)',
      },
    ],
  },
  {
    binding: 'QuoteView.selectNetworkAndTokenTo',
    action: 'macro',
    source: 'tests/page-objects/swaps/QuoteView.ts#selectNetworkAndTokenTo',
    phrases: ['Select {token} on {network} as the destination token'],
    locators: [],
  },
  {
    binding: 'QuoteView.enterSourceTokenAmount',
    action: 'macro',
    source: 'tests/page-objects/swaps/QuoteView.ts#enterSourceTokenAmount',
    phrases: ['Enter {amount} as the source amount'],
    locators: [],
  },
  {
    binding: 'QuoteView.dismissKeypad',
    action: 'tap',
    source: 'tests/page-objects/swaps/QuoteView.ts#dismissKeypad',
    phrases: ['Dismiss the amount keypad', 'Tap quote timer to dismiss keypad'],
    locators: [
      {
        strategy: 'testID',
        value: 'quote-keypad-dismiss-target',
        source:
          'QuoteViewSelectorIDs.QUOTE_KEYPAD_DISMISS_TARGET (tests/selectors/Bridge/QuoteView.selectors.ts)',
      },
    ],
  },
  {
    binding: 'QuoteView.isQuoteDisplayed',
    action: 'assertVisible',
    source: 'tests/page-objects/swaps/QuoteView.ts#isQuoteDisplayed',
    phrases: ['a quote with a positive destination amount is displayed'],
    locators: [
      {
        strategy: 'testID',
        value: 'dest-token-area-input',
        source:
          'QuoteViewSelectorIDs.DESTINATION_TOKEN_INPUT (tests/selectors/Bridge/QuoteView.selectors.ts)',
      },
    ],
  },
];
