import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { fontStyles, colors } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import BlockingActionModal from '../BlockingActionModal';

const styles = StyleSheet.create({
	blockingModalText: {
		alignSelf: 'center',
		borderRadius: 10,
		fontSize: 16,
		textAlign: 'center',
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	blockingModalTitle: {
		color: colors.fontPrimary,
		fontSize: 22,
		marginBottom: 15,
		textAlign: 'center',
		...fontStyles.bold
	},
	returnIcon: {
		marginTop: 15,
		textAlign: 'center',
		color: colors.fontSecondary,
		fontSize: 60,
		lineHeight: 60
	}
});

/**
 * View that renders an action modal
 */
export default function WalletConnectReturnToBrowserModal({ modalVisible }) {
	return (
		<BlockingActionModal modalVisible={modalVisible}>
			<React.Fragment>
				<Text style={styles.blockingModalTitle}>{strings('walletconnect_return_modal.title')}</Text>
				<Text style={styles.blockingModalText}>{strings('walletconnect_return_modal.text')}</Text>
				<Icon name="md-exit" style={styles.returnIcon} />
			</React.Fragment>
		</BlockingActionModal>
	);
}

WalletConnectReturnToBrowserModal.propTypes = {
	/**
	 * Whether modal is shown
	 */
	modalVisible: PropTypes.bool
};
