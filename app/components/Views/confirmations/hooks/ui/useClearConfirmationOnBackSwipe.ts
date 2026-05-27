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
  enabled?: boolean;
  rejectOnBeforeRemove?: boolean;
  rejectOnBeforeRemoveWithoutGesture?: boolean;
  rejectOnTransitionEnd?: boolean;
  skipNavigationOnGestureEnd?: boolean;
  skipNavigationOnTransitionEnd?: boolean;
  onBeforeReject?: () => void;
}

const useClearConfirmationOnBackSwipe = ({
  enabled = true,
  rejectOnBeforeRemove = false,
  rejectOnBeforeRemoveWithoutGesture = false,
  rejectOnTransitionEnd = false,
  skipNavigationOnGestureEnd = false,
  skipNavigationOnTransitionEnd = false,
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
    if (enabled && isFullScreenConfirmation) {
      const unsubscribe = navigation.addListener('gestureEnd', () => {
        isGestureInProgressRef.current = false;
        if (rejectOnTransitionEnd) {
          return;
        }

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
    enabled,
    isFullScreenConfirmation,
    navigation,
    onReject,
    rejectConfirmation,
    rejectOnBeforeRemove,
    rejectOnTransitionEnd,
    skipNavigationOnGestureEnd,
  ]);

  useEffect(() => {
    if (enabled && isFullScreenConfirmation && rejectOnTransitionEnd) {
      const unsubscribeTransitionEnd = navigation.addListener(
        'transitionEnd',
        (event) => {
          if (!event.data.closing) {
            return;
          }

          rejectConfirmation(skipNavigationOnTransitionEnd);
        },
      );

      return () => {
        if (typeof unsubscribeTransitionEnd === 'function') {
          unsubscribeTransitionEnd();
        }
      };
    }
  }, [
    enabled,
    isFullScreenConfirmation,
    navigation,
    rejectConfirmation,
    rejectOnTransitionEnd,
    skipNavigationOnTransitionEnd,
  ]);

  useEffect(() => {
    if (enabled && isFullScreenConfirmation && rejectOnBeforeRemove) {
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
    enabled,
    isFullScreenConfirmation,
    navigation,
    rejectConfirmation,
    rejectOnBeforeRemove,
    rejectOnBeforeRemoveWithoutGesture,
    isConfirmationSubmittingRef,
  ]);

  useEffect(() => {
    if (enabled && isFullScreenConfirmation && Device.isAndroid()) {
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
    enabled,
    isFullScreenConfirmation,
    onReject,
    rejectConfirmation,
    rejectOnBeforeRemove,
  ]);

  return rejectConfirmation;
};

export default useClearConfirmationOnBackSwipe;
