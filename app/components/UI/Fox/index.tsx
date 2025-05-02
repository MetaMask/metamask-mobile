import React, { forwardRef } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { WebViewProps } from '@metamask/react-native-webview';
import { useTheme } from '../../../util/theme';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Theme } from '@metamask/design-tokens';

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    webView: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
  });

interface FoxProps extends Omit<WebViewProps, 'ref'> {
  style?: StyleProp<ViewStyle>;
  customStyle?: string;
  customContent?: string;
}

function Fox({
  style,
  customStyle,
  customContent = '',
  ...props
}: FoxProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const opacityControl = useSharedValue(0);

  /* eslint-disable-next-line */
  const webViewStyle = useAnimatedStyle(() => {
    return {
      opacity: opacityControl.value,
    };
  });

  const showWebView = () => {
    opacityControl.value = withTiming(1, { duration: 500 });
  };

  return null
}

const FoxWithRef = forwardRef<Omit<FoxProps, 'forwardedRef'>>(
  (props, ref) => <Fox {...props} />,
);

FoxWithRef.displayName = 'FoxWithRef';

export default FoxWithRef;
