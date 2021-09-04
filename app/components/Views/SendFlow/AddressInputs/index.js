import React from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity } from 'react-native';
import { colors, fontStyles, baseStyles } from '../../../../styles/common';
import AntIcon from 'react-native-vector-icons/AntDesign';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import PropTypes from 'prop-types';
import Identicon from '../../../UI/Identicon';
import { renderShortAddress } from '../../../../util/address';
import { strings } from '../../../../../locales/i18n';
import Text from '../../../Base/Text';
import { hasZeroWidthPoints } from '../../../../util/validators';

const styles = StyleSheet.create({
	wrapper: {
		flexDirection: 'row',
		marginHorizontal: 8,
	},
	selectWrapper: {
		flex: 1,
		marginLeft: 8,
		paddingHorizontal: 10,
		minHeight: 52,
		flexDirection: 'row',
		borderWidth: 1,
		borderRadius: 8,
		marginVertical: 8,
	},
	inputWrapper: {
		flex: 1,
		marginLeft: 8,
		padding: 10,
		minHeight: 52,
		flexDirection: 'row',
		borderWidth: 1,
		borderRadius: 8,
		marginTop: 8,
	},
	input: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
	},
	identiconWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	addressToInformation: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		position: 'relative',
	},
	exclamation: {
		backgroundColor: colors.white,
		borderRadius: 12,
		position: 'absolute',
		bottom: 8,
		left: 20,
	},
	address: {
		flexDirection: 'column',
		alignItems: 'flex-start',
		marginHorizontal: 8,
	},
	addressWrapper: { flexDirection: 'row' },
	textAddress: {
		...fontStyles.normal,
		color: colors.black,
		fontSize: 14,
	},
	textBalance: {
		...fontStyles.normal,
		fontSize: 12,
		color: colors.grey500,
	},
	label: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '15%',
	},
	labelText: {
		...fontStyles.normal,
		color: colors.black,
		fontSize: 16,
	},
	textInput: {
		...fontStyles.normal,
		paddingLeft: 0,
		paddingRight: 8,
		width: '100%',
	},
	scanIcon: {
		flexDirection: 'column',
		alignItems: 'center',
	},
	iconOpaque: {
		color: colors.grey500,
	},
	iconHighlighted: {
		color: colors.blue,
	},
	borderOpaque: {
		borderColor: colors.grey100,
	},
	borderHighlighted: {
		borderColor: colors.blue,
	},
	iconWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	dropdownIconWrapper: {
		height: 23,
		width: 23,
	},
	dropdownIcon: {
		alignSelf: 'center',
	},
	checkIconWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	checkAddress: {
		flex: 0.9,
		// maxWidth: '90%'
	},
	toInputWrapper: {
		flexDirection: 'row',
	},
});

const AddressName = ({ toAddressName, confusableCollection = [] }) => {
	if (confusableCollection.length) {
		const texts = toAddressName.split('').map((char, index) => {
			// if text has a confusable highlight it red
			if (confusableCollection.includes(char)) {
				// if the confusable is zero width, replace it with `?`
				const replacement = hasZeroWidthPoints(char) ? '?' : char;
				return (
					<Text red key={index}>
						{replacement}
					</Text>
				);
			}
			return (
				<Text black key={index}>
					{char}
				</Text>
			);
		});
		return (
			<Text style={styles.textAddress} numberOfLines={1}>
				{texts}
			</Text>
		);
	}
	return (
		<Text style={styles.textAddress} numberOfLines={1}>
			{toAddressName}
		</Text>
	);
};

AddressName.propTypes = {
	toAddressName: PropTypes.string,
	confusableCollection: PropTypes.array,
};

export const AddressTo = (props) => {
	const {
		addressToReady,
		highlighted,
		inputRef,
		toSelectedAddress,
		onToSelectedAddressChange,
		onScan,
		onClear,
		toAddressName,
		onInputFocus,
		onSubmit,
		onInputBlur,
		inputWidth,
		confusableCollection,
		displayExclamation,
	} = props;
	return (
		<View style={styles.wrapper}>
			<View style={styles.label}>
				<Text style={styles.labelText}>To:</Text>
			</View>
			{!addressToReady ? (
				<View style={[styles.selectWrapper, highlighted ? styles.borderHighlighted : styles.borderOpaque]}>
					<View style={styles.input}>
						<TextInput
							ref={inputRef}
							autoCapitalize="none"
							autoCorrect={false}
							onChangeText={onToSelectedAddressChange}
							placeholder={strings('transactions.address_to_placeholder')}
							placeholderTextColor={colors.grey100}
							spellCheck={false}
							style={[styles.textInput, inputWidth]}
							numberOfLines={1}
							onFocus={onInputFocus}
							onBlur={onInputBlur}
							onSubmitEditing={onSubmit}
							value={toSelectedAddress}
							testID={'txn-to-address-input'}
						/>
					</View>
					{!!onScan && (
						<TouchableOpacity onPress={onScan} style={styles.iconWrapper}>
							<AntIcon
								name="scan1"
								size={20}
								style={[styles.scanIcon, highlighted ? styles.iconHighlighted : styles.iconOpaque]}
							/>
						</TouchableOpacity>
					)}
				</View>
			) : (
				<View style={[styles.selectWrapper, highlighted ? styles.borderHighlighted : styles.borderOpaque]}>
					<View style={styles.addressToInformation}>
						<Identicon address={toSelectedAddress} diameter={30} />
						{displayExclamation && (
							<View style={styles.exclamation}>
								<FontAwesome color={colors.red} name="exclamation-circle" size={14} />
							</View>
						)}
						<View style={styles.toInputWrapper}>
							<View style={[styles.address, styles.checkAddress]}>
								{toAddressName && (
									<AddressName
										toAddressName={toAddressName}
										confusableCollection={confusableCollection}
									/>
								)}
								<View style={styles.addressWrapper}>
									<Text
										style={toAddressName ? styles.textBalance : styles.textAddress}
										numberOfLines={1}
									>
										{renderShortAddress(toSelectedAddress)}
									</Text>
									<View style={(styles.checkIconWrapper, toAddressName ? {} : { paddingTop: 2 })}>
										<AntIcon name="check" color={colors.green600} size={15} />
									</View>
								</View>
							</View>
						</View>
					</View>
					{!!onClear && (
						<TouchableOpacity onPress={onClear} style={styles.iconWrapper} testID={'clear-address-button'}>
							<AntIcon
								name="close"
								size={20}
								style={[styles.scanIcon, highlighted ? styles.iconHighlighted : styles.iconOpaque]}
							/>
						</TouchableOpacity>
					)}
				</View>
			)}
		</View>
	);
};

AddressTo.propTypes = {
	/**
	 * Whether is a valid Ethereum address to send to
	 */
	addressToReady: PropTypes.bool,
	/**
	 * Whether the input is highlighted
	 */
	highlighted: PropTypes.bool,
	/**
	 * Object to use as reference for input
	 */
	inputRef: PropTypes.object,
	/**
	 * Address of selected address as string
	 */
	toSelectedAddress: PropTypes.string,
	/**
	 * Callback called when to selected address changes
	 */
	onToSelectedAddressChange: PropTypes.func,
	/**
	 * Callback called when scan icon is pressed
	 */
	onScan: PropTypes.func,
	/**
	 * Callback called when close icon is pressed
	 */
	onClear: PropTypes.func,
	/**
	 * Callback called when input onFocus
	 */
	onInputFocus: PropTypes.func,
	/**
	 * Callback called when input is submitted
	 */
	onSubmit: PropTypes.func,
	/**
	 * Callback called when input onBlur
	 */
	onInputBlur: PropTypes.func,
	/**
	 * Name of selected address as string
	 */
	toAddressName: PropTypes.string,
	/**
	 * Input width to solve android paste bug
	 * https://github.com/facebook/react-native/issues/9958
	 */
	inputWidth: PropTypes.object,
	/**
	 * Array of confusables
	 */
	confusableCollection: PropTypes.array,
	/**
	 * Display Exclamation Icon
	 */
	displayExclamation: PropTypes.bool,
};

export const AddressFrom = (props) => {
	const { highlighted, onPressIcon, fromAccountName, fromAccountBalance, fromAccountAddress } = props;
	return (
		<View style={styles.wrapper}>
			<View style={styles.label}>
				<Text style={styles.labelText}>From:</Text>
			</View>
			<View style={[styles.inputWrapper, highlighted ? styles.borderHighlighted : styles.borderOpaque]}>
				<View style={styles.identiconWrapper}>
					<Identicon address={fromAccountAddress} diameter={30} />
				</View>
				<View style={[baseStyles.flexGrow, styles.address]}>
					<Text style={styles.textAddress}>{fromAccountName}</Text>
					<Text style={styles.textBalance}>{`${strings(
						'transactions.address_from_balance'
					)} ${fromAccountBalance}`}</Text>
				</View>

				{!!onPressIcon && (
					<TouchableOpacity onPress={onPressIcon} style={styles.iconWrapper}>
						<View style={styles.dropdownIconWrapper}>
							<FontAwesome
								name={'caret-down'}
								size={20}
								style={[styles.dropdownIcon, highlighted ? styles.iconHighlighted : styles.iconOpaque]}
							/>
						</View>
					</TouchableOpacity>
				)}
			</View>
		</View>
	);
};

AddressFrom.propTypes = {
	/**
	 * Whether the input is highlighted
	 */
	highlighted: PropTypes.bool,
	/**
	 * Callback to execute when icon is pressed
	 */
	onPressIcon: PropTypes.func,
	/**
	 * Address of selected address as string
	 */
	fromAccountAddress: PropTypes.string,
	/**
	 * Name of selected address as string
	 */
	fromAccountName: PropTypes.string,
	/**
	 * Account balance of selected address as string
	 */
	fromAccountBalance: PropTypes.string,
};
