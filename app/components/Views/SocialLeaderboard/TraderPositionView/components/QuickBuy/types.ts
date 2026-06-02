import type { ReactNode } from 'react';
import type { Position } from '@metamask/social-controllers';
import type { QuickBuySheetSource } from '../../../analytics';

/** Host-agnostic trade target — maps from social `Position` via adapter. */
export interface QuickBuyTarget {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  chain: string;
}

export type QuickBuyTradeMode = 'buy' | 'sell';

/** Which amount is shown as the large primary value in the amount section. */
export type QuickBuyAmountDisplayMode = 'fiat' | 'crypto';

export type QuickBuyScreen =
  | 'amount'
  | 'quoteDetails'
  | 'selectQuote'
  | 'payWith';

/** Feature flags for optional flow pieces (enabled per consumer). */
export interface QuickBuyFeatures {
  tradeModes: QuickBuyTradeMode[];
  quoteDetails: boolean;
  selectQuote: boolean;
  payWithSheet: boolean;
  highPriceImpactModal: boolean;
  fiatCryptoToggle: boolean;
}

export interface QuickBuyAnalyticsContext {
  traderAddress?: string;
  marketCap?: number;
  source?: QuickBuySheetSource;
}

export interface QuickBuySheetProps {
  isVisible: boolean;
  target: QuickBuyTarget | null;
  onClose: () => void;
  features?: QuickBuyFeatures;
  analyticsContext?: QuickBuyAnalyticsContext;
  children?: ReactNode;
}

/** Same contract as `QuickBuySheetProps` — props for `QuickBuy.Root`. */
export type QuickBuyRootProps = QuickBuySheetProps;

/** Maps a social leaderboard position into a portable QuickBuy target. */
export function positionToQuickBuyTarget(position: Position): QuickBuyTarget {
  return {
    tokenAddress: position.tokenAddress,
    tokenSymbol: position.tokenSymbol,
    tokenName: position.tokenName,
    chain: position.chain,
  };
}
