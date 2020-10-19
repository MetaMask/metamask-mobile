import React from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../styles/common';

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
		marginTop: 10
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

const WarningIcon = () => <Icon size={16} color={colors.red} name="exclamation-triangle" />;
const CheckIcon = () => <MaterialIcon size={16} name="check-circle" style={styles.check} />;

const propTypes = {
	isWarning: PropTypes.boolean,
	children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
	onPress: PropTypes.onPress
};

const defaultProps = {
	isWarning: false,
	onPress: () => ({})
};

const SettingsWarning = ({ isWarning, children, onPress }) => (
	<View style={[styles.wrapper, isWarning ? styles.red : styles.normal]}>
		<TouchableOpacity style={styles.flexRow} onPress={onPress}>
			{isWarning ? <WarningIcon /> : <CheckIcon />}
			{children}
		</TouchableOpacity>
	</View>
);

SettingsWarning.propTypes = propTypes;
SettingsWarning.defaultProps = defaultProps;

export default SettingsWarning;
