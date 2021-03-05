import React from 'react';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import IncrementDecrementSvg from '../IncrementDecrementSvg';
import { StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Modal from 'react-native-modal';
import PropTypes from 'prop-types';

const styles = StyleSheet.create({
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	},
	keyboardAwareWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
	},
	modal: {
		minHeight: 200,
		backgroundColor: colors.white,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20
	},
	modalContainer: {
		margin: 24
	},
	title: {
		fontSize: 14,
		color: colors.black,
		...fontStyles.bold,
		textAlign: 'center'
	},
	nonceInput: {
		width: 80,
		fontSize: 36,
		...fontStyles.bold,
		color: colors.black,
		textAlign: 'center',
		marginHorizontal: 24
	},
	desc: {
		color: colors.black,
		fontSize: 12,
		lineHeight: 16,
		...fontStyles.normal,
		marginVertical: 10
	},
	bold: {
		...fontStyles.bold
	},
	nonceInputContainer: {
		display: 'flex',
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'center',
		marginVertical: 24
	},
	currentSuggested: {
		textAlign: 'center',
		...fontStyles.normal,
		fontSize: 14,
		color: colors.grey500,
		marginBottom: 20
	},
	nonceWarning: {
		borderWidth: 1,
		borderColor: colors.yellow,
		backgroundColor: colors.yellow100,
		padding: 16,
		display: 'flex',
		borderRadius: 8,
		marginBottom: 16
	},
	nonceWarningText: {
		...fontStyles.normal,
		color: colors.black,
		fontSize: 12,
		lineHeight: 16
	},
	descWarningContainer: {
		height: 240
	}
});

const CustomModalNonce = ({ proposedNonce, nonceValue, close, save }) => {
	const [nonce, onChangeText] = React.useState(nonceValue);

	const incrementDecrementNonce = decrement => {
		let newValue = nonce;
		newValue = decrement ? --newValue : ++newValue;
		onChangeText(newValue > 1 ? newValue : 1);
	};

	const saveAndClose = value => {
		save(value);
		close();
	};

	const displayWarning = String(proposedNonce) !== String(nonce);

	return (
		<Modal
			isVisible
			animationIn="slideInUp"
			animationOut="slideOutDown"
			style={styles.bottomModal}
			backdropOpacity={0.7}
			animationInTiming={600}
			animationOutTiming={600}
			onBackdropPress={close}
			onBackButtonPress={close}
			onSwipeComplete={close}
			swipeDirection={'down'}
			propagateSwipe
		>
			<KeyboardAwareScrollView contentContainerStyle={styles.keyboardAwareWrapper}>
				<View style={styles.modal}>
					<View style={styles.modalContainer}>
						<Text style={styles.title}>{strings('transaction.edit_transaction_nonce')}</Text>
						<View style={styles.nonceInputContainer}>
							<TouchableOpacity onPress={() => incrementDecrementNonce(true)}>
								<IncrementDecrementSvg />
							</TouchableOpacity>
							<TextInput
								keyboardType="numeric"
								autoFocus
								autoCapitalize="none"
								autoCorrect={false}
								onChangeText={onChangeText}
								placeholder={String(proposedNonce)}
								placeholderTextColor={colors.grey100}
								spellCheck={false}
								editable
								style={styles.nonceInput}
								value={String(nonce)}
								numberOfLines={1}
								// onBlur={this.onBlur}
								// onFocus={this.onInputFocus}
								onSubmitEditing={() => saveAndClose(nonce)}
							/>
							<TouchableOpacity onPress={() => incrementDecrementNonce(false)}>
								<IncrementDecrementSvg plus />
							</TouchableOpacity>
						</View>
						<Text style={styles.currentSuggested}>
							{strings('transaction.current_suggested_nonce')}{' '}
							<Text style={styles.bold}>{proposedNonce}</Text>
						</Text>
						<View style={styles.descWarningContainer}>
							{displayWarning ? (
								<View style={styles.nonceWarning}>
									<Text style={styles.nonceWarningText}>{strings('transaction.nonce_warning')}</Text>
								</View>
							) : null}
							<Text style={[styles.desc, styles.bold]}>{strings('transaction.this_is_an_advanced')}</Text>
							<Text style={styles.desc}>{strings('transaction.think_of_the_nonce')}</Text>
						</View>
					</View>
				</View>
			</KeyboardAwareScrollView>
		</Modal>
	);
};

CustomModalNonce.propTypes = {
	proposedNonce: PropTypes.number.isRequired,
	nonceValue: PropTypes.number.isRequired,
	save: PropTypes.func.isRequired,
	close: PropTypes.func.isRequired
};

export default CustomModalNonce;
