import React from 'react';
import Pressable from '../../../component-library/components-temp/Pressable';
import { ViewStyle, GestureResponderEvent } from 'react-native';

/**
 * @deprecated The `<GenericButton>` component has been deprecated in favor of `<Button>` from `@metamask/design-system-react-native`.
 *
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/Button/README.md | Button component}
 *
 * Please replace this component with the equivalent component from `@metamask/design-system-react-native`.
 *
 * @see {@link https://github.com/MetaMask/metamask-mobile/issues/8107 | Tracking issue}
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
  <Pressable
    onPress={props.onPress}
    style={props.style}
    unstable_pressDelay={50}
  >
    {props.children}
  </Pressable>
);

export default GenericButton;
