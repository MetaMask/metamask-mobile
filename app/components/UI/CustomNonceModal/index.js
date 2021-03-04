import React from 'react';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Modal from 'react-native-modal';
import { Svg, Circle, Path } from 'react-native-svg';
import PropTypes from 'prop-types';

const IncrementDecrementSvg = ({ plus }) => (
	<Svg width="44" height="44" viewBox="0 0 44 44" fill="none">
		<Circle cx="22" cy="22" r="21.5" fill="white" stroke="#037DD6" />
		<Path
			d={
				plus
					? 'M30.25 20.6875H24.0625V14.5C24.0625 13.7695 23.418 13.125 22.6875 13.125H21.3125C20.5391 13.125 19.9375 13.7695 19.9375 14.5V20.6875H13.75C12.9766 20.6875 12.375 21.332 12.375 22.0625V23.4375C12.375 24.2109 12.9766 24.8125 13.75 24.8125H19.9375V31C19.9375 31.7734 20.5391 32.375 21.3125 32.375H22.6875C23.418 32.375 24.0625 31.7734 24.0625 31V24.8125H30.25C30.9805 24.8125 31.625 24.2109 31.625 23.4375V22.0625C31.625 21.332 30.9805 20.6875 30.25 20.6875Z'
					: 'M30.25 20.6875H13.75C12.9766 20.6875 12.375 21.332 12.375 22.0625V23.4375C12.375 24.2109 12.9766 24.8125 13.75 24.8125H30.25C30.9805 24.8125 31.625 24.2109 31.625 23.4375V22.0625C31.625 21.332 30.9805 20.6875 30.25 20.6875Z'
			}
			fill="#037DD6"
		/>
	</Svg>
);

IncrementDecrementSvg.propTypes = {
	plus: PropTypes.bool
};

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
		minWidth: 80,
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
	}
});

const CustomModalNonce = ({ proposedNonce, nonceValue, review }) => {
	const [nonce, onChangeText] = React.useState(nonceValue);

	const incrementDecrementNonce = decrement => {
		let newValue = nonce;
		newValue = decrement ? --newValue : ++newValue;
		onChangeText(newValue > 1 ? newValue : 1);
	};

	// const displayWarning = proposedNonce !== nonceValue;
	// console.log(displayWarning);
	return (
		<Modal
			isVisible
			animationIn="slideInUp"
			animationOut="slideOutDown"
			style={styles.bottomModal}
			backdropOpacity={0.7}
			animationInTiming={600}
			animationOutTiming={600}
			onBackdropPress={review}
			onBackButtonPress={review}
			onSwipeComplete={review}
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
								onChangeText={text => onChangeText(text)}
								placeholder={String(proposedNonce)}
								placeholderTextColor={colors.grey100}
								spellCheck={false}
								editable
								style={styles.nonceInput}
								value={String(nonce)}
								numberOfLines={1}
								// onBlur={this.onBlur}
								// onFocus={this.onInputFocus}
								// onSubmitEditing={this.onFocus}
							/>
							<TouchableOpacity onPress={() => incrementDecrementNonce(false)}>
								<IncrementDecrementSvg plus />
							</TouchableOpacity>
						</View>
						<Text style={styles.currentSuggested}>
							{strings('transaction.current_suggested_nonce')}{' '}
							<Text style={styles.bold}>{proposedNonce}</Text>
						</Text>
						<Text style={[styles.desc, styles.bold]}>{strings('transaction.this_is_an_advanced')}</Text>
						<Text style={styles.desc}>{strings('transaction.think_of_the_nonce')}</Text>
					</View>
				</View>
			</KeyboardAwareScrollView>
		</Modal>
	);
};

CustomModalNonce.propTypes = {
	proposedNonce: PropTypes.number.isRequired,
	nonceValue: PropTypes.number.isRequired,
	review: PropTypes.func.isRequired
};

export default CustomModalNonce;
