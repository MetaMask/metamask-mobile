import React, { memo, useEffect, useRef, useMemo } from 'react';
import { Animated } from 'react-native';
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
import styleSheet from './PerpsWebSocketHealthToast.styles';
import type { PerpsWebSocketHealthToastProps } from './PerpsWebSocketHealthToast.types';

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
 * States:
 * - DISCONNECTED: Shows error state with disconnect message
 * - CONNECTING: Shows loading spinner with reconnection attempt number
 * - CONNECTED: Shows success state, auto-hides after 3 seconds
 *
 * @example
 * ```tsx
 * <PerpsWebSocketHealthToast
 *   isVisible={showToast}
 *   connectionState={WebSocketConnectionState.CONNECTING}
 *   reconnectionAttempt={2}
 *   onHide={() => setShowToast(false)}
 * />
 * ```
 */
const PerpsWebSocketHealthToast: React.FC<PerpsWebSocketHealthToastProps> =
  memo(
    ({
      isVisible,
      connectionState,
      reconnectionAttempt = 0,
      onHide,
      testID = 'perps-websocket-health-toast',
    }) => {
      const { styles } = useStyles(styleSheet, {});

      // Animation value for slide-in/out effect (negative = slide from top)
      const slideAnim = useRef(new Animated.Value(-100)).current; // Start off-screen (top)
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
              description: `${strings('perps.connection.websocket_connecting_message')} Attempt ${reconnectionAttempt}`,
              iconColor: IconColor.Warning,
              showSpinner: false,
            };

          case WebSocketConnectionState.CONNECTED:
            return {
              title: strings('perps.connection.websocket_connected'),
              description: strings(
                'perps.connection.websocket_connected_message',
              ),
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
          // Slide in
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
        } else {
          // Slide out (back to top)
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
          ]).start();
        }
      }, [isVisible, slideAnim, opacityAnim]);

      // Auto-hide for success state
      useEffect(() => {
        // Clear any existing timeout
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }

        // Set timeout to auto-hide on success
        if (
          isVisible &&
          connectionState === WebSocketConnectionState.CONNECTED
        ) {
          hideTimeoutRef.current = setTimeout(() => {
            onHide?.();
          }, SUCCESS_TOAST_DURATION_MS);
        }

        return () => {
          if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
          }
        };
      }, [isVisible, connectionState, onHide]);

      // Don't render if no valid config (e.g., DISCONNECTING state)
      if (!toastConfig) {
        return null;
      }

      return (
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnim }],
              opacity: opacityAnim,
            },
          ]}
          testID={testID}
          pointerEvents={isVisible ? 'auto' : 'none'}
        >
          <Animated.View style={styles.toast}>
            {/* Icon or Spinner */}
            <Animated.View style={styles.iconContainer}>
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
            </Animated.View>

            {/* Text Content */}
            <Animated.View style={styles.textContainer}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                {toastConfig.title}
              </Text>
              <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
                {toastConfig.description}
              </Text>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      );
    },
  );

PerpsWebSocketHealthToast.displayName = 'PerpsWebSocketHealthToast';

export default PerpsWebSocketHealthToast;
