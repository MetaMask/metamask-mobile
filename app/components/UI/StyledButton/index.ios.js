import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { ViewPropTypes, Text } from 'react-native';
import Button from 'react-native-button';
import getStyles from './styledButtonStyles';
import { ThemeContext, mockTheme } from '../../../util/theme';

/**
 * UI component that renders a styled button
 * for iOS devices
 * see styledButtonStyles.js for available styles
 */
export default class StyledButton extends PureComponent {
  static propTypes = {
    /**
     * Children components of the Button
     * it can be a text node, an image, or an icon
     * or an Array with a combination of them
     */
    children: PropTypes.any,
    /**
     * Type of the button
     */
    disabled: PropTypes.bool,
    /**
     * Styles to be applied to the Button Text
     */
    style: Text.propTypes.style,
    /**
     * Styles to be applied to the Button disabled state text
     */
    styleDisabled: Text.propTypes.style,
    /**
     * Styles to be applied to the Button disabled container
     */
    disabledContainerStyle: ViewPropTypes.style,
    /**
     * Styles to be applied to the Button Container
     */
    containerStyle: ViewPropTypes.style,
    /**
     * Function to be called on press
     */
    onPress: PropTypes.func,
    /**
     * Function to be called on press out
     */
    onPressOut: PropTypes.func,
    /**
     * Type of the button
     */
    type: PropTypes.string,
    /**
     * ID of the element to be used on e2e tests
     */
    testID: PropTypes.string,
  };

  static defaultProps = {
    ...PureComponent.defaultProps,
    styleDisabled: { opacity: 0.6 },
    disabledContainerStyle: { opacity: 0.6 },
  };

  render = () => {
    const {
      type,
      onPress,
      onPressOut,
      style,
      children,
      disabled,
      styleDisabled,
      testID,
      disabledContainerStyle,
    } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const { fontStyle, containerStyle } = getStyles(type, colors);

    return (
      <Button
        testID={testID}
        accessibilityRole="button"
        disabled={disabled}
        styleDisabled={disabled ? styleDisabled : null}
        disabledContainerStyle={disabled ? disabledContainerStyle : null}
        onPress={onPress}
        onPressOut={onPressOut}
        style={[...fontStyle, style]}
        containerStyle={[...containerStyle, this.props.containerStyle]}
      >
        {children}
      </Button>
    );
  };
}

StyledButton.contextType = ThemeContext;
