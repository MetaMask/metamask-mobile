import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useCallback, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import Device from '../../../../../util/device';
import Logger from '../../../../../util/Logger';
import { ensureError } from '../../../../../util/errorUtils';
import { useConfirmActions } from '../useConfirmActions';
import { useFullScreenConfirmation } from './useFullScreenConfirmation';
import type { RootStackParamList } from '../../../../../core/NavigationService/types';
import { useConfirmationContext } from '../../context/confirmation-context';

interface UseClearConfirmationOnBackSwipeOptions {
  rejectOnBeforeRemove?: boolean;
  rejectOnBeforeRemoveWithoutGesture?: boolean;
  skipNavigationOnGestureEnd?: boolean;
  onBeforeReject?: () => void;
}

const useClearConfirmationOnBackSwipe = ({
  rejectOnBeforeRemove = false,
  rejectOnBeforeRemoveWithoutGesture = false,
  skipNavigationOnGestureEnd = false,
  onBeforeReject,
}: UseClearConfirmationOnBackSwipeOptions = {}) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const { onReject } = useConfirmActions();
  const { isConfirmationSubmittingRef } = useConfirmationContext();
  const hasRejectedRef = useRef(false);
  const isGestureInProgressRef = useRef(false);

  const rejectConfirmation = useCallback(
    (skipNavigation = false) => {
      if (hasRejectedRef.current || isConfirmationSubmittingRef.current) {
        return;
      }

      try {
        onBeforeReject?.();
      } catch (error) {
        Logger.error(
          ensureError(error),
          'useClearConfirmationOnBackSwipe: onBeforeReject failed',
        );
      }

      hasRejectedRef.current = true;
      onReject(undefined, skipNavigation);
    },
    [isConfirmationSubmittingRef, onBeforeReject, onReject],
  );

  useEffect(() => {
    if (isFullScreenConfirmation) {
      const unsubscribe = navigation.addListener('gestureEnd', () => {
        isGestureInProgressRef.current = false;
        if (rejectOnBeforeRemove) {
          rejectConfirmation(skipNavigationOnGestureEnd);
          return;
        }

        onReject();
      });

      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }
  }, [
    isFullScreenConfirmation,
    navigation,
    onReject,
    rejectConfirmation,
    rejectOnBeforeRemove,
    skipNavigationOnGestureEnd,
  ]);

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
          const shouldRejectBeforeRemove =
            isGestureInProgressRef.current ||
            rejectOnBeforeRemoveWithoutGesture;

          if (
            isConfirmationSubmittingRef.current ||
            !shouldRejectBeforeRemove
          ) {
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
    rejectOnBeforeRemoveWithoutGesture,
    isConfirmationSubmittingRef,
  ]);

  useEffect(() => {
    if (isFullScreenConfirmation && Device.isAndroid()) {
      const backHandlerSubscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          if (rejectOnBeforeRemove) {
            rejectConfirmation();
          } else {
            onReject();
          }

          return true;
        },
      );

      return () => {
        backHandlerSubscription.remove();
      };
    }
  }, [
    isFullScreenConfirmation,
    onReject,
    rejectConfirmation,
    rejectOnBeforeRemove,
  ]);

  return rejectConfirmation;
};

export default useClearConfirmationOnBackSwipe;
