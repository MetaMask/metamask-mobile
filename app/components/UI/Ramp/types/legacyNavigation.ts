import type { BuyQuote } from '@consensys/native-ramps-sdk';

/** Legacy deposit-stack webview modal params (stack removed; types kept for NavigationService). */
export type WebviewModalParams = {
  sourceUrl: string;
  handleNavigationStateChange?: (navState: { url: string }) => void;
};

export type KycWebviewModalParams = WebviewModalParams & {
  quote: BuyQuote;
  workFlowRunId: string;
};
