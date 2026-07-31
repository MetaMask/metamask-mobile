import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import Device from '../../../../../util/device';
import { usePreventRemove } from '../../../../../util/navigation/usePreventRemove';
import { useConfirmActions } from '../useConfirmActions';
import { useFullScreenConfirmation } from './useFullScreenConfirmation';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useConfirmationContext } from '../../context/confirmation-context';

const useClearConfirmationOnBackSwipe = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const { onReject } = useConfirmActions();
  const { mmPayRequestInProgressNavHandler, isConfirmationSubmittingRef } =
    useConfirmationContext();
  const hasRejectedRef = useRef(false);

  const rejectConfirmation = useCallback(
    (skipNavigation = false) => {
      if (hasRejectedRef.current || isConfirmationSubmittingRef.current) {
        return;
      }

      hasRejectedRef.current = true;
      onReject(undefined, skipNavigation);
    },
    [isConfirmationSubmittingRef, onReject],
  );

  // v6 shim — swap to `@react-navigation/native` in the v7 bump (Phase 4).
  // When not intercepting an in-progress MM Pay request, re-dispatch the
  // original action so dismiss proceeds (matches prior beforeRemove behavior
  // that did not call preventDefault on the reject path).
  usePreventRemove(isFullScreenConfirmation, ({ data }) => {
    if (mmPayRequestInProgressNavHandler.current) {
      mmPayRequestInProgressNavHandler.current();
      return;
    }
    rejectConfirmation(true);
    navigation.dispatch(data.action);
  });

  useEffect(() => {
    if (isFullScreenConfirmation && Device.isAndroid()) {
      const backHandlerSubscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          if (!mmPayRequestInProgressNavHandler.current) {
            rejectConfirmation();
          }
          return true;
        },
      );

      return () => {
        backHandlerSubscription.remove();
      };
    }
  }, [
    mmPayRequestInProgressNavHandler,
    isFullScreenConfirmation,
    rejectConfirmation,
  ]);

  return rejectConfirmation;
};

export default useClearConfirmationOnBackSwipe;
