import React from 'react';
import PropTypes from 'prop-types';
import { View, ViewPropTypes, TouchableNativeFeedback } from 'react-native';

/**
 * UI component that renders a button
 * specifically for android
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
