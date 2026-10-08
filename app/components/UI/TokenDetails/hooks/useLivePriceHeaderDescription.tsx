import React, { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { formatPriceWithSubscriptNotation } from '../../Predict/utils/format';

/** Scroll distance at which the header subtitle swaps from the contract
 * address to the live price. */
export const LIVE_PRICE_SCROLL_THRESHOLD_PX = 80;

export const LIVE_PRICE_HEADER_TEST_ID = 'token-details-header-live-price';

interface UseLivePriceHeaderDescriptionParams {
  currentPrice: number | null | undefined;
  currentCurrency: string | null | undefined;
}

interface UseLivePriceHeaderDescriptionResult {
  /** Header subtitle override: the live price once scrolled, otherwise
   * `undefined` so the header falls back to the contract address. */
  description: ReactNode | undefined;
  /** Feed the vertical content offset of the page's scroll view here. */
  onScrollOffset: (y: number) => void;
}

/**
 * Drives the ASSETS-4016 header subtitle: shows the contract address at the
 * top of the page and swaps to the live price once the user scrolls past the
 * hero section.
 */
export const useLivePriceHeaderDescription = ({
  currentPrice,
  currentCurrency,
}: UseLivePriceHeaderDescriptionParams): UseLivePriceHeaderDescriptionResult => {
  const [showsLivePrice, setShowsLivePrice] = useState(false);

  const onScrollOffset = useCallback((y: number) => {
    const next = y >= LIVE_PRICE_SCROLL_THRESHOLD_PX;
    setShowsLivePrice((current) => (current === next ? current : next));
  }, []);

  const livePriceLabel = useMemo(() => {
    if (
      typeof currentPrice !== 'number' ||
      !Number.isFinite(currentPrice) ||
      currentPrice <= 0
    ) {
      return null;
    }
    return formatPriceWithSubscriptNotation(
      currentPrice,
      currentCurrency ?? 'usd',
    );
  }, [currentPrice, currentCurrency]);

  const description = useMemo(() => {
    if (!showsLivePrice || !livePriceLabel) {
      return undefined;
    }
    return (
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
        numberOfLines={1}
        testID={LIVE_PRICE_HEADER_TEST_ID}
      >
        {livePriceLabel}
      </Text>
    );
  }, [showsLivePrice, livePriceLabel]);

  return { description, onScrollOffset };
};
