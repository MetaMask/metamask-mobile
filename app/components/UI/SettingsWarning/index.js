import React from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, View, StyleSheet, Text } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fontStyles } from '../../../styles/common';

const styles = StyleSheet.create({
	flexRow: {
		width: '100%',
		display: 'flex',
		flexDirection: 'row'
	},
	wrapper: {
		padding: 12,
		borderRadius: 10,
		display: 'flex',
		flexDirection: 'row',
		width: '100%',
		marginVertical: 10
	},
	red: {
		backgroundColor: colors.red000
	},
	normal: {
		backgroundColor: colors.grey000
	},
	check: {
		color: colors.green500
	},
	marginLeft: {
		marginLeft: 10
	},
	warningText: {
		fontSize: 12
	},
	warningBold: {
		...fontStyles.bold,
		marginLeft: 'auto'
	}
});

const WarningIcon = () => <Icon size={16} color={colors.red} name="exclamation-triangle" />;
const CheckIcon = () => <MaterialIcon size={16} name="check-circle" style={styles.check} />;
const isWarning = type => type === 'warning';

const SettingsWarning = ({ msgText, actionText, type, children, onPress }) => (
	<View style={[styles.wrapper, isWarning(type) ? styles.red : styles.normal]}>
		<TouchableOpacity style={styles.flexRow} onPress={onPress}>
			{isWarning(type) ? <WarningIcon /> : <CheckIcon />}
			<Text style={[styles.warningText, styles.marginLeft]}>{msgText}</Text>
			<Text style={[styles.warningText, styles.warningBold]}>{actionText}</Text>
		</TouchableOpacity>
	</View>
);

SettingsWarning.propTypes = {
	type: PropTypes.string,
	children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
	onPress: PropTypes.onPress,
	msgText: PropTypes.string,
	actionText: PropTypes.string
};

SettingsWarning.defaultProps = {
	type: 'normal'
};

export default SettingsWarning;
