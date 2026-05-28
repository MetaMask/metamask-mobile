import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useCallback, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import Device from '../../../../../util/device';
import { useConfirmActions } from '../useConfirmActions';
import { useFullScreenConfirmation } from './useFullScreenConfirmation';
import type { RootStackParamList } from '../../../../../core/NavigationService/types';

interface UseClearConfirmationOnBackSwipeOptions {
  rejectOnBeforeRemove?: boolean;
}

const useClearConfirmationOnBackSwipe = ({
  rejectOnBeforeRemove = false,
}: UseClearConfirmationOnBackSwipeOptions = {}) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const { onReject } = useConfirmActions();
  const hasRejectedRef = useRef(false);
  const isGestureInProgressRef = useRef(false);

  const rejectConfirmation = useCallback(
    (skipNavigation = false) => {
      if (hasRejectedRef.current) {
        return;
      }

      hasRejectedRef.current = true;
      onReject(undefined, skipNavigation);
    },
    [onReject],
  );

  useEffect(() => {
    if (isFullScreenConfirmation) {
      const unsubscribe = navigation.addListener('gestureEnd', () => {
        isGestureInProgressRef.current = false;
        rejectConfirmation();
      });

      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }
  }, [isFullScreenConfirmation, navigation, rejectConfirmation]);

  useEffect(() => {
    if (isFullScreenConfirmation && rejectOnBeforeRemove) {
      const unsubscribeGestureStart = navigation.addListener(
        'gestureStart',
        () => {
          isGestureInProgressRef.current = true;
        },
      );
      const unsubscribeGestureCancel = navigation.addListener(
        'gestureCancel',
        () => {
          isGestureInProgressRef.current = false;
        },
      );
      const unsubscribeBeforeRemove = navigation.addListener(
        'beforeRemove',
        () => {
          if (!isGestureInProgressRef.current) {
            return;
          }

          isGestureInProgressRef.current = false;
          rejectConfirmation(true);
        },
      );

      return () => {
        if (typeof unsubscribeGestureStart === 'function') {
          unsubscribeGestureStart();
        }
        if (typeof unsubscribeGestureCancel === 'function') {
          unsubscribeGestureCancel();
        }
        if (typeof unsubscribeBeforeRemove === 'function') {
          unsubscribeBeforeRemove();
        }
      };
    }
  }, [
    isFullScreenConfirmation,
    navigation,
    rejectConfirmation,
    rejectOnBeforeRemove,
  ]);

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
};

export default useClearConfirmationOnBackSwipe;
