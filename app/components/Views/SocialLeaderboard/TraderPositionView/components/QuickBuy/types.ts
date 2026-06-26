import type { Position } from '@metamask/social-controllers';
import type { CaipChainId } from '@metamask/utils';
import type { ReactNode } from 'react';
import type { QuickBuySheetSource } from './analytics';
import { chainNameToId } from '../../../utils/chainMapping';

/** Host-agnostic trade target — maps from social `Position` via adapter. */
export interface QuickBuyTarget {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  chain: CaipChainId;
}

export type QuickBuyTradeMode = 'buy' | 'sell';

/** Which amount is shown as the large primary value in the amount section. */
export type QuickBuyAmountDisplayMode = 'fiat' | 'crypto';

export type QuickBuyScreen =
  | 'amount'
  | 'quoteDetails'
  | 'selectQuote'
  | 'payWith'
  | 'priceImpactConfirm';

/** Feature flags for optional flow pieces (enabled per consumer). */
export interface QuickBuyFeatures {
  tradeModes: QuickBuyTradeMode[];
  quoteDetails: boolean;
  selectQuote: boolean;
  payWithSheet: boolean;
  highPriceImpactModal: boolean;
  fiatCryptoToggle: boolean;
}

/** Stable-token destination candidates for the Sell "Receive with" picker. */
export interface QuickBuyAnalyticsContext {
  traderAddress?: string;
  marketCap?: number;
  source?: QuickBuySheetSource;
  traderTradeType?: 'buy' | 'sell';
  /**
   * Latest price of the buy token in the user's display currency, supplied by
   * the host (e.g. the trader position chart feed). Used as the pre-quote
   * exchange-rate source for tokens the user does not hold — for which the
   * cached market-data lookup resolves nothing — so the rate pill renders
   * immediately on open. Display-only; never fed into quote fetching.
   */
  tokenPriceFiat?: number;
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

/**
 * Maps a social leaderboard position into a portable QuickBuy target.
 *
 * Returns `null` when the position's chain name isn't mapped to a CAIP id —
 * `QuickBuy.Root` treats a `null` target as inert.
 */
export function positionToQuickBuyTarget(
  position: Position,
): QuickBuyTarget | null {
  const chain = chainNameToId(position.chain);
  if (!chain) return null;
  return {
    tokenAddress: position.tokenAddress,
    tokenSymbol: position.tokenSymbol,
    tokenName: position.tokenName,
    chain,
  };
}
