import React from 'react';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  selectSourceAmount,
  selectSourceToken,
  selectBridgeControllerState,
} from '../../../../../../core/redux/slices/bridge';
import { useBridgeQuoteDataContext } from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { useHasMissingQuoteAndAssetsPriceData } from '../../../hooks/useHasMissingQuoteAndAssetsPriceData';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { SwapsLimitOrderConfirmButton } from '../../../components/SwapsLimitOrderConfirmButton/index.tsx';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';

export const BridgeLimitOrderFooterView = () => {
  const { bottom: bottomInset } = useSafeAreaInsets();
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const { activeQuote, isLoading, needsNewQuote } = useBridgeQuoteDataContext();
  const { quotesLastFetched } = useSelector(selectBridgeControllerState);
  const isMissingPrice = useHasMissingQuoteAndAssetsPriceData();

  const isValidSourceAmount =
    sourceAmount !== undefined && sourceAmount !== '.' && sourceToken?.decimals;

  if (isLoading && !activeQuote && !needsNewQuote) {
    return null;
  }

  if (!activeQuote || !isValidSourceAmount || !quotesLastFetched) {
    return null;
  }

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      gap={3}
      paddingTop={3}
      paddingLeft={4}
      paddingRight={4}
      twClassName="w-full shrink-0 bg-default"
      style={{ paddingBottom: bottomInset }}
    >
      <SwapsLimitOrderConfirmButton
        onPress={() => 'test'}
        label="test"
        testID={BridgeViewSelectorsIDs.CONFIRM_BUTTON}
        disabled={isMissingPrice}
      />
    </Box>
  );
};
