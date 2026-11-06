import type { BindingRegistry } from '../../../framework/scenario';
import WalletView from '../../../page-objects/wallet/WalletView';
import QuoteView from '../../../page-objects/swaps/QuoteView';

/**
 * Lockfile `binding` keys for the swap scenario, mapped to the same Page
 * Object calls tests/performance/login/eth-swap-flow.spec.ts makes.
 */
export const swapBindings: BindingRegistry = {
  'WalletView.tapWalletSwapButton': () => WalletView.tapWalletSwapButton(),
  'QuoteView.isVisible': () => QuoteView.isVisible(),
  'QuoteView.selectNetworkAndTokenTo': ({ network, token }) =>
    QuoteView.selectNetworkAndTokenTo(network, token),
  'QuoteView.enterSourceTokenAmount': ({ amount }) =>
    QuoteView.enterSourceTokenAmount(amount),
  'QuoteView.dismissKeypad': () => QuoteView.dismissKeypad(),
  'QuoteView.isQuoteDisplayed': () => QuoteView.isQuoteDisplayed(),
};
