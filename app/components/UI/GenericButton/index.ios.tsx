import React from 'react';
import { ViewStyle,
  GestureResponderEvent } from 'react-native';
import TouchableOpacity from '../../Base/TouchableOpacity';

/**
 * @deprecated The `<GenericButton>` component has been deprecated in favor of the new `<Button>` component from the component-library.
 * Please update your code to use the new `<Button>` component instead, which can be found at app/component-library/components/Buttons/Button/Button.tsx.
 * You can find documentation for the new Button component in the README:
 * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Buttons/Button/README.md}
 * If you would like to help with the replacement of the old `Button` component, please submit a pull request against this GitHub issue:
 * {@link https://github.com/MetaMask/metamask-mobile/issues/8107}
 */

interface GenericButtonProps {
  /**
   * Children components of the GenericButton
   * it can be a text node, an image, or an icon
   * or an Array with a combination of them
   */
  children?: React.ReactNode;
  /**
   * Styles to be applied to the GenericButton
   */
  style?: ViewStyle;
  /**
   * Function to be called on press
   */
  onPress?: (event: GestureResponderEvent) => void;
}

const GenericButton: React.FC<GenericButtonProps> = (props) => (
  <TouchableOpacity
    onPress={props.onPress}
    style={props.style}
    delayPressIn={50}
  >
    {props.children}
  </TouchableOpacity>
);

export default GenericButton;
