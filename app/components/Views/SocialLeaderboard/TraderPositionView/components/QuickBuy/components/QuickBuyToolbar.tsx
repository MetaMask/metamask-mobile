import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import QuickBuyRateTag from './QuickBuyRateTag';
import QuickBuyTradeModeToggle from './QuickBuyTradeModeToggle';
import { useQuickBuyContext } from '../useQuickBuyContext';

const QuickBuyToolbar: React.FC = () => {
  const {
    formattedRate,
    formattedExchangeRate,
    setActiveScreen,
    features,
    isPriceImpactError,
    hasSellableBalance,
  } = useQuickBuyContext();

  // Prefer the quote-derived rate (available once a quote is fetched),
  // fall back to the price-metadata rate for the pre-quote state.
  const rateLabel = formattedRate ?? formattedExchangeRate;
  const showToggle = features.tradeModes.length > 1 && hasSellableBalance;

  return (
    <Box
      twClassName="px-4 pt-2 pb-3"
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
    >
      {showToggle ? (
        <QuickBuyTradeModeToggle />
      ) : (
        <Box
          twClassName="rounded-full bg-muted px-3 py-1"
          flexDirection={BoxFlexDirection.Row}
        >
          <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
            {strings('social_leaderboard.quick_buy.buy_mode')}
          </Text>
        </Box>
      )}

      <QuickBuyRateTag
        label={rateLabel}
        onPress={() => setActiveScreen('quoteDetails')}
        isHighPriceImpact={isPriceImpactError}
      />
    </Box>
  );
};

export default QuickBuyToolbar;
