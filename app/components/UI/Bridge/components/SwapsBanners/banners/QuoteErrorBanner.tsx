import React from 'react';
import { useSelector } from 'react-redux';
import {
  BannerBase,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { QuoteStreamCompleteReason } from '@metamask/bridge-controller';
import { selectQuoteStreamComplete } from '../../../../../../core/redux/slices/bridge';
import { useBridgeQuoteDataContext } from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { useStockMarketHours } from '../../../hooks/useStockMarketHours';
import { getQuoteStreamReasonString } from '../../../utils/getQuoteStreamReasonString';
import { ERROR_BANNER_TW_CLASSNAME } from '../SwapsBanners.constants';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';

/**
 * Explains why the quote stream ended without a quote the user can take.
 */
export const QuoteErrorBanner = () => {
  const quoteStreamComplete = useSelector(selectQuoteStreamComplete);
  const { quoteFetchError } = useBridgeQuoteDataContext();
  const { isStockMarketClosed } = useStockMarketHours();

  const hideMarketUnavailableQuoteError =
    isStockMarketClosed &&
    quoteStreamComplete?.reason ===
      QuoteStreamCompleteReason.RWA_MARKET_UNAVAILABLE;

  if (
    !quoteFetchError &&
    (!quoteStreamComplete?.reason || hideMarketUnavailableQuoteError)
  ) {
    return null;
  }

  return (
    <BannerBase
      twClassName={ERROR_BANNER_TW_CLASSNAME}
      startAccessory={
        <Icon
          name={IconName.Error}
          color={IconColor.ErrorDefault}
          size={IconSize.Lg}
        />
      }
      description={
        <Text
          testID={SwapsBannersSelectorsIDs.QUOTE_ERROR}
          variant={TextVariant.BodySm}
        >
          {getQuoteStreamReasonString(quoteStreamComplete?.reason)}
        </Text>
      }
    />
  );
};
