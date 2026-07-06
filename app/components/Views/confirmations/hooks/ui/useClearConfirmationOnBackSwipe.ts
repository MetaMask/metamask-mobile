import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import Device from '../../../../../util/device';
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

  useEffect(() => {
    if (!isFullScreenConfirmation) {
      return;
    }

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (mmPayRequestInProgressNavHandler.current) {
        e.preventDefault();
        return;
      }
      rejectConfirmation(true);
    });

    return () => unsubscribe?.();
  }, [
    mmPayRequestInProgressNavHandler,
    isFullScreenConfirmation,
    navigation,
    rejectConfirmation,
  ]);

  useEffect(() => {
    if (isFullScreenConfirmation && Device.isAndroid()) {
      const backHandlerSubscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          if (mmPayRequestInProgressNavHandler.current) {
            return true;
          }
          rejectConfirmation();
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
