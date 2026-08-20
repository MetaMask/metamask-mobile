import React, { type ReactNode } from 'react';
import { QuoteStreamCompleteReason } from '@metamask/bridge-controller';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { createBridgeTestState, createMockToken } from '../../../testUtils';
import type { BridgeToken } from '../../../types';
import { SwapsBanners } from '../SwapsBanners';

export const mockSourceToken = createMockToken({
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
});

export const createBannerState = ({
  sourceAmount = '1',
  sourceToken = mockSourceToken,
  destToken = createMockToken({ address: '0xdest', symbol: 'USDC' }),
  quoteStreamComplete,
}: {
  sourceAmount?: string;
  sourceToken?: BridgeToken;
  destToken?: BridgeToken;
  quoteStreamComplete?: {
    quoteCount: number;
    hasQuotes: boolean;
    reason?: QuoteStreamCompleteReason;
  };
} = {}) =>
  createBridgeTestState({
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
