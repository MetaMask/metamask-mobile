import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import PropTypes from 'prop-types';
import AntIcon from 'react-native-vector-icons/AntDesign';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.yellow100,
		borderWidth: 1,
		borderColor: colors.yellow,
		borderRadius: 4,
		padding: 8,
		flexDirection: 'row'
	},
	errorMessage: {
		...fontStyles.normal,
		flex: 1,
		fontSize: 12,
		color: colors.grey,
		flexDirection: 'row',
		alignItems: 'center'
	},
	icon: {
		paddingRight: 8
	},
	iconWrapper: {
		alignItems: 'center',
		flexDirection: 'row',
		alignSelf: 'flex-start'
	}
});

export default function WarningMessage(props) {
	const { warningMessage } = props;
	return (
		<View style={styles.wrapper}>
			<View style={styles.iconWrapper}>
				<AntIcon style={styles.icon} name="bells" color={colors.yellow} size={15} />
			</View>
			<Text style={styles.errorMessage}>{warningMessage}</Text>
		</View>
	);
}

WarningMessage.propTypes = {
	/**
	 * Warning message to display
	 */
	warningMessage: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
};
