import { useEffect } from 'react';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useBridgeQuoteData } from '../useBridgeQuoteData';
import Routes from '../../../../../constants/navigation/Routes';

/**
 * Resets the BridgeModalStack to show only QuoteExpiredModal when quotes expire.
 *
 * Must be called from a screen that lives inside BridgeModalStack so that
 * CommonActions.reset targets BridgeModalStack (not the root navigator).
 * This prevents the previous modal's BottomSheetOverlay from remaining
 * visible behind QuoteExpiredModal.
 */
export const useModalCloseOnQuoteExpiry = () => {
  const navigation = useNavigation();
  const { isExpired, willRefresh } = useBridgeQuoteData();

  useEffect(() => {
    if (isExpired && !willRefresh) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: Routes.BRIDGE.MODALS.QUOTE_EXPIRED_MODAL }],
        }),
      );
    }
  }, [isExpired, willRefresh, navigation]);
};
