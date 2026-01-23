import React, { memo, useEffect, useRef, useMemo, useState } from 'react';
import { Animated, TouchableOpacity, View, StyleSheet } from 'react-native';
import {
  IconColor as ReactNativeDsIconColor,
  IconSize as ReactNativeDsIconSize,
} from '@metamask/design-system-react-native';
import { Spinner } from '@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import { WebSocketConnectionState } from '../../controllers/types';
import toastStyleSheet from './PerpsWebSocketHealthToast.styles';
import { useWebSocketHealthToastContext } from './PerpsWebSocketHealthToast.context';

/** Duration of the slide animation in milliseconds */
const ANIMATION_DURATION_MS = 300;

/** Duration to show the success toast before auto-hiding */
const SUCCESS_TOAST_DURATION_MS = 3000;

/**
 * PerpsWebSocketHealthToast
 *
 * A custom toast component that displays WebSocket connection health status.
 * Shows at the top of the screen (74px from top) with slide-in/out animations.
 *
 * This component reads its state from WebSocketHealthToastContext and should
 * be rendered at the App level to appear on top of all other content.
 *
 * States:
 * - DISCONNECTED: Shows error state with disconnect message and retry button
 * - CONNECTING: Shows warning state with reconnection attempt number
 * - CONNECTED: Shows success state, auto-hides after 3 seconds
 */
const PerpsWebSocketHealthToast: React.FC = memo(() => {
  const { styles } = useStyles(toastStyleSheet, {});
  const { state, hide, onRetry } = useWebSocketHealthToastContext();
  const { isVisible, connectionState, reconnectionAttempt } = state;

  // Track whether the component should be rendered (separate from isVisible)
  // This allows the exit animation to complete before unmounting
  const [shouldRender, setShouldRender] = useState(false);

  // Animation value for slide-in/out effect (negative = slide from top)
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Track if we should auto-hide for success state
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get toast configuration based on connection state
  const toastConfig = useMemo(() => {
    switch (connectionState) {
      case WebSocketConnectionState.DISCONNECTED:
        return {
          title: strings('perps.connection.websocket_disconnected'),
          description: strings(
            'perps.connection.websocket_disconnected_message',
          ),
          iconColor: IconColor.Error,
          showSpinner: false,
        };

      case WebSocketConnectionState.CONNECTING:
        return {
          title: strings('perps.connection.websocket_connecting'),
          description: strings(
            'perps.connection.websocket_connecting_message',
            {
              attempt: reconnectionAttempt,
            },
          ),
          iconColor: IconColor.Warning,
          showSpinner: false,
        };

      case WebSocketConnectionState.CONNECTED:
        return {
          title: strings('perps.connection.websocket_connected'),
          description: strings('perps.connection.websocket_connected_message'),
          iconColor: IconColor.Success,
          showSpinner: false,
        };

      default:
        return null;
    }
  }, [connectionState, reconnectionAttempt]);

  // Handle visibility animation
  useEffect(() => {
    if (isVisible) {
      // Show the component immediately, then animate in
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION_MS,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION_MS,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (shouldRender) {
      // Animate out first, then unmount after animation completes
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: ANIMATION_DURATION_MS,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION_MS,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        // Only unmount after animation finishes
        if (finished) {
          setShouldRender(false);
        }
      });
    }
    // Note: shouldRender is intentionally excluded from deps to prevent animation restart.
    // We only want to react to isVisible changes - shouldRender is internal lifecycle state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, slideAnim, opacityAnim]);

  // Auto-hide for success state
  useEffect(() => {
    // Clear any existing timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // Set timeout to auto-hide on success
    if (isVisible && connectionState === WebSocketConnectionState.CONNECTED) {
      hideTimeoutRef.current = setTimeout(() => {
        hide();
      }, SUCCESS_TOAST_DURATION_MS);
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [isVisible, connectionState, hide]);

  // Don't render if no valid config (e.g., DISCONNECTING state) or not rendering
  // Note: We use shouldRender (not isVisible) to allow exit animation to complete
  if (!toastConfig || !shouldRender) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY: slideAnim }],
            opacity: opacityAnim,
          },
        ]}
        testID="perps-websocket-health-toast"
        pointerEvents="box-none"
      >
        <View style={styles.toast}>
          {/* Icon or Spinner */}
          <View style={styles.iconContainer}>
            {toastConfig.showSpinner ? (
              <Spinner
                color={ReactNativeDsIconColor.PrimaryDefault}
                spinnerIconProps={{ size: ReactNativeDsIconSize.Md }}
              />
            ) : (
              <Icon
                name={IconName.Connect}
                size={IconSize.Xl}
                color={toastConfig.iconColor}
              />
            )}
          </View>

          {/* Text Content */}
          <View style={styles.textContainer}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
              {toastConfig.title}
            </Text>
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {toastConfig.description}
            </Text>
          </View>

          {/* Retry Button - only shown when disconnected */}
          {connectionState === WebSocketConnectionState.DISCONNECTED &&
            onRetry && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={onRetry}
                testID="perps-websocket-health-toast-retry-button"
              >
                <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                  {strings('perps.connection.websocket_retry')}
                </Text>
              </TouchableOpacity>
            )}
        </View>
      </Animated.View>
    </View>
  );
});

PerpsWebSocketHealthToast.displayName = 'PerpsWebSocketHealthToast';

export default PerpsWebSocketHealthToast;
