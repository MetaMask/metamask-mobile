import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet } from 'react-native';
import GenericButton from '../GenericButton'; // eslint-disable-line import/no-unresolved
import { useTheme } from '../../../util/theme';
import { ViewPropTypes } from 'deprecated-react-native-prop-types';

const createStyles = (colors) =>
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
 * @deprecated The `<Button>` component has been deprecated in favor of `<Button>` from `@metamask/design-system-react-native`.
 *
 * @see {@link https://github.com/MetaMask/metamask-design-system/tree/main/packages/design-system-react-native/src/components/Button | Button component}
 *
 * Please replace this component with the equivalent component from `@metamask/design-system-react-native`.
 *
 * @see {@link https://github.com/MetaMask/metamask-mobile/issues/8108 | Tracking issue}
 */
const Button = (props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <GenericButton onPress={props.onPress} style={[styles.button, props.style]}>
      {props.children}
    </GenericButton>
  );
};

Button.propTypes = {
  /**
   * Children components of the Button
   * it can be a text node, an image, or an icon
   * or an Array with a combination of them
   */
  children: PropTypes.any,
  /**
   * Styles to be applied to the Button
   */
  style: ViewPropTypes.style,
  /**
   * Function to be called on press
   */
  onPress: PropTypes.func,
};

export default Button;
