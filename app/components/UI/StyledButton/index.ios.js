import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { ViewPropTypes, Text } from 'react-native';
import Button from '@metamask/react-native-button';
import getStyles from './styledButtonStyles';
import { ThemeContext, mockTheme } from '../../../util/theme';

/**
 * @deprecated The `<StyledButton>` component has been deprecated in favor of the new `<Button>` component from the component-library.
 * Please update your code to use the new `<Button>` component instead, which can be found at app/component-library/components/Buttons/Button/Button.tsx.
 * You can find documentation for the new Button component in the README:
 * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Buttons/Button/README.md}
 * If you would like to help with the replacement of the old `Button` component, please submit a pull request against this GitHub issue:
 * {@link https://github.com/MetaMask/metamask-mobile/issues/8106}
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
    /**
     * Theme object provided by the ThemeProvider
     */
    theme: PropTypes.shape({
      colors: PropTypes.object,
      themeAppearance: PropTypes.string,
    }),
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
      theme,
    } = this.props;
    const colors = theme?.colors || this.context?.colors || mockTheme.colors;
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
