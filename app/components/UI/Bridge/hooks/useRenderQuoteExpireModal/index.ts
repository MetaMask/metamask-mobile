import { RefObject, useEffect, useRef } from 'react';
import { TokenInputAreaRef } from '../../components/TokenInputArea';
import { useBridgeQuoteData } from '../useBridgeQuoteData';
import { useLatestBalance } from '../useLatestBalance';
import { useSelector } from 'react-redux';
import {
  selectIsSelectingRecipient,
  selectIsSelectingToken,
  selectIsSubmittingTx,
} from '../../../../../core/redux/slices/bridge';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';

interface Params {
  inputRef: RefObject<TokenInputAreaRef>;
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
}

export const useRenderQuoteExpireModal = ({
  inputRef,
  latestSourceBalance,
}: Params) => {
  const navigation = useNavigation();
  const isSelectingRecipient = useSelector(selectIsSelectingRecipient);
  const isSelectingToken = useSelector(selectIsSelectingToken);
  const isSubmittingTx = useSelector(selectIsSubmittingTx);

  const { isExpired, willRefresh } = useBridgeQuoteData({
    latestSourceAtomicBalance: latestSourceBalance?.atomicBalance,
  });

  // Track whether the expired-quote modal has already been shown for the
  // current expiry cycle, so it doesn't re-trigger when unrelated deps
  // (e.g. isSelectingToken) flip back after navigation.
  const hasShownExpiredModal = useRef(false);

  // Reset the flag whenever the quote is no longer expired
  // (i.e. a new quote was fetched or is loading).
  useEffect(() => {
    if (!isExpired) {
      hasShownExpiredModal.current = false;
    }
  }, [isExpired]);

  useEffect(() => {
    if (
      isExpired &&
      !willRefresh &&
      !isSelectingRecipient &&
      !isSelectingToken &&
      !isSubmittingTx &&
      !hasShownExpiredModal.current
    ) {
      hasShownExpiredModal.current = true;
      inputRef.current?.blur();
      // open the quote tooltip modal
      navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.QUOTE_EXPIRED_MODAL,
      });
    }
  }, [
    isExpired,
    willRefresh,
    navigation,
    isSelectingRecipient,
    isSelectingToken,
    isSubmittingTx,
    inputRef,
  ]);
};
