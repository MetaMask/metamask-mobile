import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';
import { colors } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import Text from '../../Base/Text';

const styles = StyleSheet.create({
	customNonce: {
		marginTop: 10,
		marginHorizontal: 24,
		borderWidth: 1,
		borderColor: colors.grey050,
		borderRadius: 8,
		paddingVertical: 14,
		paddingHorizontal: 16,
		display: 'flex',
		flexDirection: 'row',
	},
	nonceNumber: {
		marginLeft: 'auto',
	},
});

const CustomNonce = ({ nonce, onNonceEdit }) => (
	<TouchableOpacity style={styles.customNonce} onPress={onNonceEdit}>
		<Text bold black>
			{strings('transaction.custom_nonce')}
		</Text>
		<Text bold link>
			{'  '}
			{strings('transaction.edit')}
		</Text>
		<Text bold black style={styles.nonceNumber}>
			{nonce}
		</Text>
	</TouchableOpacity>
);

CustomNonce.propTypes = {
	/**
	 * Current nonce
	 */
	nonce: PropTypes.number,
	/**
	 * Function called when editing nonce
	 */
	onNonceEdit: PropTypes.func,
};

export default CustomNonce;
