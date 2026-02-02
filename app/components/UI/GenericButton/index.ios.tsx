import React from 'react';
import {
  TouchableOpacity,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';

/**
 * @deprecated The `<GenericButton>` component has been deprecated in favor of the `<Button>` component from `@metamask/design-system-react-native`.
 * Please update your code to use the new `<Button>` component from `@metamask/design-system-react-native`.
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
