import React, { type ReactNode } from 'react';
import { QuoteStreamCompleteReason } from '@metamask/bridge-controller';
import type { Hex } from '@metamask/utils';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { createBridgeTestState, createMockToken } from '../../../testUtils';
import type { BridgeToken } from '../../../types';
import { FEATURE_FLAG_NAME as RWA_FEATURE_FLAG_NAME } from '../../../../../../selectors/featureFlagController/rwa';
import { SwapsBanners } from '../SwapsBanners';

export const mockSourceToken = createMockToken({
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
});

const HOUR_MS = 60 * 60 * 1000;

export const createStockRwaToken = ({
  nowMs,
  inRegularHours,
  inOffHours,
}: {
  nowMs: number;
  inRegularHours: boolean;
  inOffHours: boolean;
}): BridgeToken => ({
  address: '0x1111111111111111111111111111111111111111',
  symbol: 'AAPL',
  name: 'Apple',
  decimals: 18,
  chainId: '0x1' as Hex,
  rwaData: {
    instrumentType: 'stock',
    market: inRegularHours
      ? {
          nextOpen: new Date(nowMs - HOUR_MS).toISOString(),
          nextClose: new Date(nowMs + 6 * HOUR_MS).toISOString(),
        }
      : {
          nextOpen: new Date(nowMs + 12 * HOUR_MS).toISOString(),
          nextClose: new Date(nowMs + 20 * HOUR_MS).toISOString(),
        },
    ...(inOffHours
      ? {
          offhours: {
            nextOpen: new Date(nowMs - HOUR_MS).toISOString(),
            nextClose: new Date(nowMs + 2 * HOUR_MS).toISOString(),
          },
        }
      : {}),
  } as BridgeToken['rwaData'],
});

export const createBannerState = ({
  sourceAmount = '1',
  sourceToken = mockSourceToken,
  destToken = createMockToken({ address: '0xdest', symbol: 'USDC' }),
  quoteStreamComplete,
  rwaEnabled = false,
}: {
  sourceAmount?: string;
  sourceToken?: BridgeToken;
  destToken?: BridgeToken;
  quoteStreamComplete?: {
    quoteCount: number;
    hasQuotes: boolean;
    reason?: QuoteStreamCompleteReason;
  };
  rwaEnabled?: boolean;
} = {}) => {
  const state = createBridgeTestState({
    // Always set explicitly: the controller state helper merges into the shared
    // default state object, so an omitted value leaks across test cases.
    bridgeControllerOverrides: {
      quoteStreamComplete: quoteStreamComplete ?? null,
    },
    bridgeReducerOverrides: {
      sourceAmount,
      sourceToken,
      destToken,
    },
  });

  return {
    ...state,
    engine: {
      ...state.engine,
      backgroundState: {
        ...state.engine?.backgroundState,
        RemoteFeatureFlagController: {
          ...state.engine?.backgroundState?.RemoteFeatureFlagController,
          remoteFeatureFlags: {
            ...state.engine?.backgroundState?.RemoteFeatureFlagController
              ?.remoteFeatureFlags,
            [RWA_FEATURE_FLAG_NAME]: rwaEnabled,
          },
        },
      },
    },
  };
};

/**
 * Renders a banner the way an order type would: inside the container that
 * provides the swap being quoted.
 */
export const renderBanner = (
  banner: ReactNode,
  {
    state = createBannerState(),
    onAdjustSourceAmount = jest.fn(),
  }: {
    state?: ReturnType<typeof createBannerState>;
    onAdjustSourceAmount?: (amount: string) => void;
  } = {},
) =>
  renderWithProvider(
    <SwapsBanners onAdjustSourceAmount={onAdjustSourceAmount}>
      {banner}
    </SwapsBanners>,
    { state },
  );
