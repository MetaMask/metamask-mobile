import type { ReactNode } from 'react';
import type { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import type { BigNumber } from 'ethers';
import type { BridgeToken } from '../../types';

export interface SwapsBannersProps {
  /**
   * The banners to show, in the order the order type wants them.
   */
  children: ReactNode;
  /**
   * Source token balance in atomic units, used to work out whether the entered
   * amount would eat into the native balance kept in reserve for gas.
   */
  latestSourceAtomicBalance?: BigNumber;
  /**
   * Entry point reported to analytics when a banner opens a modal.
   */
  location?: MetaMetricsSwapsEventSource;
  /**
   * Called with a new source amount when a banner offers to correct the amount.
   * Must be referentially stable, otherwise every banner re-renders whenever the
   * hosting screen does.
   */
  onAdjustSourceAmount: (amount: string) => void;
}

export type SwapsBannersProviderProps = SwapsBannersProps;

/**
 * The swap the banners describe, plus the callbacks the hosting screen owns.
 * Banner specific state (quote errors, token security, native reserve) is
 * derived by each banner instead, so composing a banner is enough to opt into
 * the work it does.
 */
export interface SwapsBannersContextValue {
  sourceAmount?: string;
  sourceToken?: BridgeToken;
  destToken?: BridgeToken;
  walletAddress?: string;
  latestSourceAtomicBalance?: BigNumber;
  location: MetaMetricsSwapsEventSource;
  onAdjustSourceAmount: (amount: string) => void;
}
