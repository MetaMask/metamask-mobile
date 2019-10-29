import React from 'react';
import PropTypes from 'prop-types';
import { Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modal';
import { colors, baseStyles, fontStyles } from '../../../styles/common';

const styles = StyleSheet.create({
	modal: {
		margin: 0,
		width: '100%'
	},
	modalView: {
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center'
	},
	modalText: {
		alignSelf: 'center',
		width: '90%',
		height: 300,
		backgroundColor: colors.white,
		borderRadius: 10,
		fontSize: 18,
		textAlign: 'center',
		...fontStyles.normal
	},
	modalTitle: {
		fontSize: 22,
		marginBottom: 15,
		textAlign: 'center',
		...fontStyles.bold
	}
});

/**
 * View that renders an action modal
 */
export default function InstaPayUpgradeModal({ modalVisible }) {
	return (
		<Modal isVisible={modalVisible} style={styles.modal}>
			<View style={styles.modalView}>
				<View style={baseStyles.flexGrow}>
					<Text style={styles.modalTitle}>{'Upgrading account'}</Text>
					<Text style={styles.modalText}>
						{'Please wait while we upgrade your InstaPay account to the latest version'}
					</Text>
					<ActivityIndicator size="small" color="white" />
				</View>
			</View>
		</Modal>
	);
}

InstaPayUpgradeModal.propTypes = {
	/**
	 * Whether modal is shown
	 */
	modalVisible: PropTypes.bool
};
