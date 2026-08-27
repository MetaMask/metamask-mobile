import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { SwapsBannersSelectorsIDs } from './SwapsBanners.testIds';
import { SwapsBannersProvider } from './SwapsBannersContext';
import type { SwapsBannersProps } from './SwapsBanners.types';

/**
 * Lays out the warning and error banners an order type composes, and shares the
 * swap being quoted with them. Banners read the active quote, so this must be
 * rendered within a `BridgeQuoteDataProvider`.
 *
 * Each banner decides on its own whether it applies, so an order type only has
 * to list the ones it wants:
 *
 * ```tsx
 * <SwapsBanners onAdjustSourceAmount={handleAmountChange}>
 *   <QuoteErrorBanner />
 *   <TokenWarningBanner />
 * </SwapsBanners>
 * ```
 */
export const SwapsBanners = ({
  children,
  latestSourceAtomicBalance,
  location,
  onAdjustSourceAmount,
}: SwapsBannersProps) => (
  <SwapsBannersProvider
    latestSourceAtomicBalance={latestSourceAtomicBalance}
    location={location}
    onAdjustSourceAmount={onAdjustSourceAmount}
  >
    <Box gap={3} twClassName="mx-4" testID={SwapsBannersSelectorsIDs.CONTAINER}>
      {children}
    </Box>
  </SwapsBannersProvider>
);
