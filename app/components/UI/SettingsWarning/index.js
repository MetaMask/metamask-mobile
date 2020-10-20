import React from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../styles/common';

const styles = StyleSheet.create({
	menuItemWarning: {
		flex: 1,
		alignSelf: 'center',
		flexDirection: 'row',
		marginRight: 24
	},
	wrapper: {
		padding: 12,
		borderRadius: 10,
		display: 'flex',
		flexDirection: 'row',
		width: '100%',
		marginTop: 10
	},
	icon: {
		marginRight: 4
	},
	red: {
		backgroundColor: colors.red000
	},
	normal: {
		backgroundColor: colors.grey000
	},
	check: {
		color: colors.green500
	}
});

const WarningIcon = () => <Icon style={styles.icon} size={16} color={colors.red} name="exclamation-triangle" />;
const CheckIcon = () => <MaterialIcon style={[styles.icon, styles.check]} size={16} name="check-circle" />;

const propTypes = {
	isWarning: PropTypes.bool,
	isNotification: PropTypes.bool,
	children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
	onPress: PropTypes.func
};

const defaultProps = {
	isWarning: false,
	isHighlighted: false,
	onPress: undefined
};

const SettingsWarning = ({ isWarning, isNotification, children, onPress }) => (
	<TouchableOpacity
		style={[
			isNotification ? styles.menuItemWarning : styles.wrapper,
			isNotification ? null : isWarning ? styles.red : styles.normal
		]}
		onPress={onPress}
	>
		{isWarning ? <WarningIcon /> : <CheckIcon />}
		{children}
	</TouchableOpacity>
);

SettingsWarning.propTypes = propTypes;
SettingsWarning.defaultProps = defaultProps;

export default SettingsWarning;
