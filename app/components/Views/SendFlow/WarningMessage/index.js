import React from 'react';
import { StyleSheet } from 'react-native';
import { colors } from '../../../../styles/common';
import PropTypes from 'prop-types';
import AntIcon from 'react-native-vector-icons/AntDesign';
import Alert from '../../../Base/Alert';

const styles = StyleSheet.create({
	icon: {
		paddingTop: 4,
		paddingRight: 8
	}
});

export default function WarningMessage({ warningMessage }) {
	return (
		<Alert
			type="warning"
			renderIcon={() => <AntIcon style={styles.icon} name="bells" color={colors.yellow} size={15} />}
		>
			{warningMessage}
		</Alert>
	);
}

WarningMessage.propTypes = {
	/**
	 * Warning message to display
	 */
	warningMessage: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
};
