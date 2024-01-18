import React from 'react';
import PropTypes from 'prop-types';
import { View, ViewPropTypes, TouchableNativeFeedback } from 'react-native';

/**
 * @deprecated The `<GenericButton>` component has been deprecated in favor of the new `<Button>` component from the component-library.
 * Please update your code to use the new `<Button>` component instead, which can be found at app/component-library/components/Buttons/Button/Button.tsx.
 * You can find documentation for the new Button component in the README:
 * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Buttons/Button/README.md}
 * If you would like to help with the replacement of the old `Button` component, please submit a pull request against this GitHub issue:
 * {@link https://github.com/MetaMask/metamask-mobile/issues/8107}
 */
const GenericButton = (props) => (
  <TouchableNativeFeedback
    delayPressIn={0}
    background={TouchableNativeFeedback.SelectableBackground()} // eslint-disable-line new-cap
    onPress={props.onPress}
  >
    <View style={props.style}>{props.children}</View>
  </TouchableNativeFeedback>
);

GenericButton.propTypes = {
  /**
   * Children components of the GenericButton
   * it can be a text node, an image, or an icon
   * or an Array with a combination of them
   */
  children: PropTypes.any,
  /**
   * Styles to be applied to the GenericButton
   */
  style: ViewPropTypes.style,
  /**
   * Function to be called on press
   */
  onPress: PropTypes.func,
};

export default GenericButton;
