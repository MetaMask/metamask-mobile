import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useBridgeQuoteData } from '../useBridgeQuoteData';

/**
 * Resets the BridgeModalStack when quotes expire.
 * Must be called from a screen that lives inside BridgeModalStack.
 */
export const useModalCloseOnQuoteExpiry = () => {
  const navigation = useNavigation();
  const { needsNewQuote } = useBridgeQuoteData();

  useEffect(() => {
    if (needsNewQuote && navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [needsNewQuote, navigation]);
};
