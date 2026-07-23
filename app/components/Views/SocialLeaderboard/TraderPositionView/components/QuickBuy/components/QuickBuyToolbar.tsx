import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
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
  const showFullToggle = features.tradeModes.length > 1 && hasSellableBalance;

  return (
    <Box
      twClassName="px-4 pt-2 pb-3"
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
    >
      <QuickBuyTradeModeToggle buyOnly={!showFullToggle} />

      <QuickBuyRateTag
        label={rateLabel}
        onPress={() => setActiveScreen('quoteDetails')}
        isHighPriceImpact={isPriceImpactError}
      />
    </Box>
  );
};

export default QuickBuyToolbar;
