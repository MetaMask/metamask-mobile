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
  const { isConfirmationSubmittingRef } = useConfirmationContext();
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

    const unsubscribe = navigation.addListener('beforeRemove', () => {
      rejectConfirmation(true);
    });

    return () => unsubscribe?.();
  }, [isFullScreenConfirmation, navigation, rejectConfirmation]);

  useEffect(() => {
    if (isFullScreenConfirmation && Device.isAndroid()) {
      const backHandlerSubscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          rejectConfirmation();
          return true;
        },
      );

      return () => {
        backHandlerSubscription.remove();
      };
    }
  }, [isFullScreenConfirmation, rejectConfirmation]);

  return rejectConfirmation;
};

export default useClearConfirmationOnBackSwipe;
