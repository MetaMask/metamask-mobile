import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import KeypadComponent from '../../../Base/Keypad';
import { colors } from '../../../../styles/common';
import Feather from 'react-native-vector-icons/Feather';

const styles = StyleSheet.create({
	// TODO: change background color to theme color
	// eslint-disable-next-line react-native/no-color-literals
	keypad: {
		paddingHorizontal: 24,
		backgroundColor: '#EDEFF2',
		paddingVertical: 5,
	},
	digitButton: {
		borderRadius: 8,
		backgroundColor: colors.white,
		paddingVertical: 5,
		margin: 3.5,
		shadowColor: colors.grey200,
		shadowOffset: {
			width: 0,
			height: 1,
		},
		shadowOpacity: 1,
		shadowRadius: 1.0,

		elevation: 1,
	},
	digitText: {
		fontSize: 20,
		color: colors.black,
		padding: 0,
	},
	periodButton: {
		borderRadius: 8,
		backgroundColor: colors.transparent,
		paddingVertical: 0,
		margin: 3.5,
	},
});

interface Props {
	/**
	 * Custom style for container
	 */
	style: ViewStyle;
}

const Keypad: React.FC<Props> = ({ style, ...props }: Props) => (
	<KeypadComponent
		{...props}
		style={[styles.keypad, style]}
		digitButtonStyle={styles.digitButton}
		digitTextStyle={styles.digitText}
		periodButtonStyle={styles.periodButton}
		periodTextStyle={styles.digitText}
		deleteButtonStyle={styles.periodButton}
		deleteIcon={<Feather name="delete" size={24} />}
	/>
);

export default Keypad;
