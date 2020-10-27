import React from 'react';
import ActionModal from '../../UI/ActionModal';
import Icon from 'react-native-vector-icons/FontAwesome';
import { View, Image, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { strings } from '../../../../locales/i18n';
// eslint-disable-next-line import/no-unresolved
import CheckBox from '@react-native-community/checkbox';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';
const warning_skip_backup = require('../../../images/warning.png'); // eslint-disable-line

const styles = StyleSheet.create({
	imageWarning: {
		width: 56,
		height: 56,
		alignSelf: 'center'
	},
	modalNoBorder: {
		borderTopWidth: 0
	},
	skipTitle: {
		fontSize: 24,
		marginTop: 12,
		marginBottom: 16,
		color: colors.fontPrimary,
		textAlign: 'center',
		...fontStyles.bold
	},
	skipModalContainer: {
		flex: 1,
		margin: 24,
		flexDirection: 'column'
	},
	skipModalXButton: {
		flex: 1,
		alignItems: 'flex-end'
	},
	skipModalXIcon: {
		fontSize: 16
	},
	skipModalActionButtons: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	skipModalCheckbox: {
		height: 18,
		width: 18,
		marginRight: 12
	},
	skipModalText: {
		flex: 1,
		...fontStyles.normal,
		lineHeight: 20,
		fontSize: 14,
		paddingHorizontal: 10
	}
});

const SkipAccountSecurityModal = ({ modalVisible, onConfirm, onCancel, onPress, toggleSkipCheckbox, skipCheckbox }) => (
	<ActionModal
		confirmText={strings('account_backup_step_1.skip_button_confirm')}
		cancelText={strings('account_backup_step_1.skip_button_cancel')}
		confirmButtonMode={'confirm'}
		cancelButtonMode={'normal'}
		displayCancelButton
		modalVisible={modalVisible}
		actionContainerStyle={styles.modalNoBorder}
		onCancelPress={onCancel}
		confirmDisabled={!skipCheckbox}
		onConfirmPress={onConfirm}
	>
		<View style={styles.skipModalContainer}>
			<TouchableOpacity
				onPress={onPress}
				style={styles.skipModalXButton}
				hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
			>
				<Icon name="times" style={styles.skipModalXIcon} />
			</TouchableOpacity>
			<Image
				source={warning_skip_backup}
				style={styles.imageWarning}
				resizeMethod={'auto'}
				testID={'skip_backup_warning'}
			/>
			<Text style={styles.skipTitle}>{strings('account_backup_step_1.skip_title')}</Text>
			<View style={styles.skipModalActionButtons}>
				<CheckBox
					style={styles.skipModalCheckbox}
					value={skipCheckbox}
					onValueChange={toggleSkipCheckbox}
					boxType={'square'}
					tintColors={{ true: colors.blue }}
					testID={'skip-backup-check'}
				/>
				<Text onPress={toggleSkipCheckbox} style={styles.skipModalText} testID={'skip-backup-text'}>
					{strings('account_backup_step_1.skip_check')}
				</Text>
			</View>
		</View>
	</ActionModal>
);

SkipAccountSecurityModal.propTypes = {
	modalVisible: PropTypes.bool,
	onConfirm: PropTypes.func,
	onCancel: PropTypes.func,
	onPress: PropTypes.func,
	toggleSkipCheckbox: PropTypes.func,
	skipCheckbox: PropTypes.bool
};

export default SkipAccountSecurityModal;
