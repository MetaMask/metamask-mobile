import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import Device from '../../../util/Device';

import Text from '../Text';
import { colors } from '../../../styles/common';

const styles = StyleSheet.create({
	keypad: {
		paddingHorizontal: 25
	},
	keypadRow: {
		flexDirection: 'row',
		justifyContent: 'space-around'
	},
	keypadButton: {
		paddingHorizontal: 20,
		paddingVertical: Device.isMediumDevice() ? (Device.isIphone5() ? 5 : 10) : 15,
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	keypadButtonText: {
		color: colors.black,
		textAlign: 'center',
		fontSize: 30
	},
	deleteIcon: {
		fontSize: 25,
		marginTop: 5
	}
});

const KeypadContainer = props => <View style={styles.keypad} {...props} />;
const KeypadRow = props => <View style={styles.keypadRow} {...props} />;
const KeypadButton = ({ children, ...props }) => (
	<TouchableOpacity style={styles.keypadButton} {...props}>
		<Text style={styles.keypadButtonText}>{children}</Text>
	</TouchableOpacity>
);

KeypadButton.propTypes = {
	children: PropTypes.node
};

const KeypadDeleteButton = props => (
	<TouchableOpacity style={styles.keypadButton} {...props}>
		<IonicIcon style={[styles.keypadButtonText, styles.deleteIcon]} name="md-arrow-back" />
	</TouchableOpacity>
);

const Keypad = KeypadContainer;
Keypad.Row = KeypadRow;
Keypad.Button = KeypadButton;
Keypad.DeleteButton = KeypadDeleteButton;

export default Keypad;
