import React from 'react';
import { StyleSheet } from 'react-native';
import { colors } from '../../../../styles/common';
import PropTypes from 'prop-types';
import AntIcon from 'react-native-vector-icons/AntDesign';
import Alert from '../../../Base/Alert';
import FAIcon from 'react-native-vector-icons/FontAwesome';

const styles = StyleSheet.create({
	icon: {
		paddingTop: 4,
		paddingRight: 8
	}
});

export default function WarningMessage({ type, warningMessage }) {
	const icon = () => {
		if (type === 'error') return <FAIcon name="info-circle" style={styles.icon} color={colors.red} size={15} />;

		return <AntIcon style={styles.icon} name="bells" color={colors.yellow} size={15} />;
	};

	return (
		<Alert type={type || 'warning'} renderIcon={icon}>
			{warningMessage}
		</Alert>
	);
}

WarningMessage.propTypes = {
	/**
	 * Message to display
	 */
	warningMessage: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
	/**
	 * Message type for styling (default style is 'warning')
	 */
	type: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
};
