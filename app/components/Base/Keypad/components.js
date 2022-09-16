import React from 'react';
import PropTypes from 'prop-types';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ViewPropTypes,
} from 'react-native';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import Device from '../../../util/device';
import Text from '../Text';
import { useTheme } from '../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    keypad: {
      paddingHorizontal: 25,
    },
    keypadRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    keypadButton: {
      paddingHorizontal: 20,
      paddingVertical: Device.isMediumDevice()
        ? Device.isIphone5()
          ? 4
          : 8
        : 12,
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    keypadButtonText: {
      color: colors.text.default,
      textAlign: 'center',
      fontSize: 30,
    },
    deleteIcon: {
      fontSize: 25,
      marginTop: 5,
    },
  });

const KeypadContainer = ({ style, ...props }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return <View style={[styles.keypad, style]} {...props} />;
};

KeypadContainer.propTypes = {
  /**
   * Custom style for digit buttons
   */
  style: ViewPropTypes.style,
};

const KeypadRow = (props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return <View style={styles.keypadRow} {...props} />;
};
const KeypadButton = ({ style, textStyle, children, ...props }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <TouchableOpacity style={[styles.keypadButton, style]} {...props}>
      <Text style={[styles.keypadButtonText, textStyle]}>{children}</Text>
    </TouchableOpacity>
  );
};

KeypadButton.propTypes = {
  children: PropTypes.node,
  /**
   * Custom style for digit buttons
   */
  style: ViewPropTypes.style,
  /**
   * Custom style for digit text
   */
  textStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

const KeypadDeleteButton = ({ style, icon, ...props }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <TouchableOpacity style={[styles.keypadButton, style]} {...props}>
      {icon || (
        <IonicIcon
          style={[styles.keypadButtonText, styles.deleteIcon]}
          name="md-arrow-back"
        />
      )}
    </TouchableOpacity>
  );
};

KeypadDeleteButton.propTypes = {
  /**
   * Custom style for digit buttons
   */
  style: ViewPropTypes.style,
  icon: PropTypes.node,
};

const Keypad = KeypadContainer;
Keypad.Row = KeypadRow;
Keypad.Button = KeypadButton;
Keypad.DeleteButton = KeypadDeleteButton;

export default Keypad;
