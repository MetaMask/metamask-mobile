import React, { ReactNode } from 'react';
import {
  StyleSheet,
  ViewStyle,
  StyleProp,
  GestureResponderEvent,
} from 'react-native';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import GenericButton from '../GenericButton';
import { useTheme } from '../../../util/theme';
import { Theme } from '@metamask/design-tokens';

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    button: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary.default,
      paddingVertical: 10,
      paddingHorizontal: 15,
      height: 40,
      borderRadius: 4,
    },
  });

/**
 * @deprecated This `<Button>` component has been deprecated in favor of the new `<Button>` component from the component-library.
 * Please update your code to use the new `<Button>` component instead, which can be found at app/component-library/components/Buttons/Button/Button.tsx.
 * You can find documentation for the new Button component in the README:
 * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Buttons/Button/README.md}
 * If you would like to help with the replacement of the old `Button` component, please submit a pull request against this GitHub issue:
 * {@link https://github.com/MetaMask/metamask-mobile/issues/8108}
 */
const Button = (props: ButtonPropTypes) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <GenericButton onPress={props.onPress} style={[styles.button, props.style]}>
      {props.children}
    </GenericButton>
  );
};

interface ButtonPropTypes {
  /**
   * Children components of the Button
   * it can be a text node, an image, or an icon
   * or an Array with a combination of them
   */
  children: ReactNode;
  /**
   * Styles to be applied to the Button
   */
  style: StyleProp<ViewStyle>;
  /**
   * Function to be called on press
   */
  onPress: (event: GestureResponderEvent) => void;
}

export default Button;
