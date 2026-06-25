import type { BuyQuote } from './legacyDeposit';

/** Legacy deposit-stack webview modal params (stack removed; types kept for NavigationService). */
export interface WebviewModalParams {
  sourceUrl: string;
  handleNavigationStateChange?: (navState: { url: string }) => void;
}

export type KycWebviewModalParams = WebviewModalParams & {
  quote: BuyQuote;
  workFlowRunId: string;
};
