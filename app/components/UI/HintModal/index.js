import PropTypes from 'prop-types';
import { Text, View, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, TextInput } from 'react-native';
import React from 'react';
import ActionModal from '../../UI/ActionModal';
import Icon from 'react-native-vector-icons/Octicons';
import { strings } from '../../../../locales/i18n';
import { colors, fontStyles } from '../../../styles/common';

const styles = StyleSheet.create({
	hintWrapper: {
		alignSelf: 'center',
		backgroundColor: colors.white,
		borderRadius: 16,
		padding: 24
	},
	hintHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16
	},
	recovery: {
		fontSize: 18,
		...fontStyles.extraBold,
		color: colors.fontPrimary
	},
	leaveHint: {
		fontSize: 14,
		...fontStyles.regular,
		color: colors.fontPrimary,
		marginBottom: 16
	},
	noSeedphrase: {
		fontSize: 14,
		...fontStyles.regular,
		color: colors.red,
		marginBottom: 16
	},
	hintInput: {
		borderRadius: 6,
		borderWidth: 1,
		borderColor: colors.grey500,
		padding: 16,
		minHeight: 76,
		paddingTop: 16
	}
});

const HintModal = ({ onCancel, onConfirm, modalVisible, onRequestClose, value, onChangeText }) => (
	<ActionModal
		confirmText={strings('manual_backup_step_3.save')}
		confirmButtonMode={'confirm'}
		onCancelPress={onCancel}
		onConfirmPress={onConfirm}
		modalVisible={modalVisible}
		onRequestClose={onRequestClose}
	>
		<TouchableWithoutFeedback onPress={onRequestClose} accessible={false}>
			<View style={styles.hintWrapper}>
				<View style={styles.hintHeader}>
					<Text style={styles.recovery}>{strings('manual_backup_step_3.recovery_hint')}</Text>
					<TouchableOpacity onPress={onCancel}>
						<Icon name="x" size={16} />
					</TouchableOpacity>
				</View>
				<Text style={styles.leaveHint}>{strings('manual_backup_step_3.leave_hint')}</Text>
				<Text style={styles.noSeedphrase}>{strings('manual_backup_step_3.no_seedphrase')}</Text>
				<TextInput
					style={styles.hintInput}
					value={value}
					placeholder={strings('manual_backup_step_3.example')}
					onChangeText={onChangeText}
					multiline
					textAlignVertical={'top'}
				/>
			</View>
		</TouchableWithoutFeedback>
	</ActionModal>
);

const propTypes = {
	onCancel: PropTypes.func.isRequired,
	onConfirm: PropTypes.func.isRequired,
	modalVisible: PropTypes.bool.isRequired,
	onRequestClose: PropTypes.func.isRequired,
	value: PropTypes.string,
	onChangeText: PropTypes.func.isRequired
};
const defaultProps = {
	modalVisible: false
};

HintModal.propTypes = propTypes;
HintModal.defaultProps = defaultProps;

export default HintModal;
