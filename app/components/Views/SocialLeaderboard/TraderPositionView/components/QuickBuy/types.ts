import type { Position } from '@metamask/social-controllers';
import type { CaipChainId } from '@metamask/utils';
import type { ReactNode } from 'react';
import type { QuickBuySheetSource } from '../../../analytics';
import { chainNameToId } from '../../../utils/chainMapping';

/** Host-agnostic trade target — maps from social `Position` via adapter. */
export interface QuickBuyTarget {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  chain: CaipChainId;
  /**
   * Token decimals when the host already holds the fully-resolved token
   * (e.g. the asset-details page). When provided, `useQuickBuySetup` builds
   * the destination token directly — mirroring how the Swap UI seeds its
   * dest token from the asset page — instead of re-fetching metadata. This
   * is required for chains whose addresses the metadata lookup can't
   * validate (e.g. TRC-20 assets on Tron).
   */
  tokenDecimals?: number;
  /** Token icon URL from the host. Only used together with `tokenDecimals`. */
  tokenImage?: string;
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
