import React from 'react';
import PropTypes from 'prop-types';
import { ViewPropTypes, TouchableOpacity } from 'react-native';

/**
 * UI component that renders a button
 * specifically for iOS
 */
const GenericButton = (props) => (
  <TouchableOpacity
    onPress={props.onPress}
    style={props.style}
    delayPressIn={50}
  >
    {props.children}
  </TouchableOpacity>
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
