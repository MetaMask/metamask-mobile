import React from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import AntIcon from 'react-native-vector-icons/AntDesign';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import PropTypes from 'prop-types';
import Identicon from '../../../UI/Identicon';
import { renderShortAddress } from '../../../../util/address';

const styles = StyleSheet.create({
	wrapper: {
		flexDirection: 'row',
		marginVertical: 8
	},
	inputWrapper: {
		flex: 1,
		marginLeft: 8,
		padding: 10,
		height: 52,
		flexDirection: 'row',
		borderWidth: 1,
		borderRadius: 8
	},
	input: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center'
	},
	addressToInformation: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center'
	},
	address: {
		flex: 1,
		flexDirection: 'column',
		alignItems: 'flex-start',
		marginHorizontal: 8
	},
	textAddress: {
		...fontStyles.normal,
		fontSize: 14
	},
	textBalance: {
		...fontStyles.normal,
		fontSize: 12,
		color: colors.grey500
	},
	label: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '15%'
	},
	labelText: {
		...fontStyles.normal,
		fontSize: 16,
		marginLeft: 10
	},
	textInput: {
		backgroundColor: colors.white,
		paddingLeft: 0,
		paddingRight: 8,
		width: '100%'
	},
	scanIcon: {
		flexDirection: 'column',
		alignItems: 'center'
	},
	iconOpaque: {
		color: colors.grey500
	},
	iconHighlighted: {
		color: colors.blue
	},
	borderOpaque: {
		borderColor: colors.grey100
	},
	borderHighlighted: {
		borderColor: colors.blue
	},
	iconWrapper: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	dropdownIconWrapper: {
		height: 23,
		width: 23
	},
	dropdownIcon: {
		alignSelf: 'center'
	}
});

export const AddressTo = props => {
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
		onInputBlur
	} = props;
	return (
		<View style={styles.wrapper}>
			<View style={styles.label}>
				<Text style={styles.labelText}>To:</Text>
			</View>
			{!addressToReady ? (
				<View style={[styles.inputWrapper, highlighted ? styles.borderHighlighted : styles.borderOpaque]}>
					<View style={styles.input}>
						<TextInput
							ref={inputRef}
							autoCapitalize="none"
							autoCorrect={false}
							onChangeText={onToSelectedAddressChange}
							placeholder={'Search, public address (0x), or ENS'}
							placeholderTextColor={colors.grey100}
							spellCheck={false}
							style={styles.textInput}
							numberOfLines={1}
							onFocus={onInputFocus}
							onBlur={onInputBlur}
							onSubmitEditing={onSubmit}
							value={toSelectedAddress}
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
				<View style={[styles.inputWrapper, highlighted ? styles.borderHighlighted : styles.borderOpaque]}>
					<View style={styles.addressToInformation}>
						<Identicon address={toSelectedAddress} diameter={30} />
						<View style={styles.address}>
							{toAddressName && (
								<Text style={styles.textAddress} numberOfLines={1}>
									{toAddressName}
								</Text>
							)}
							<Text style={toAddressName ? styles.textBalance : styles.textAddress} numberOfLines={1}>
								{renderShortAddress(toSelectedAddress)}
							</Text>
						</View>
					</View>
					{!!onClear && (
						<TouchableOpacity onPress={onClear} style={styles.iconWrapper}>
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
	toAddressName: PropTypes.string
};

export const AddressFrom = props => {
	const { highlighted, onPressIcon, fromAccountName, fromAccountBalance, fromAccountAddress } = props;
	return (
		<View style={styles.wrapper}>
			<View style={styles.label}>
				<Text style={styles.labelText}>From:</Text>
			</View>
			<View style={[styles.inputWrapper, highlighted ? styles.borderHighlighted : styles.borderOpaque]}>
				<Identicon address={fromAccountAddress} diameter={30} />
				<View style={styles.address}>
					<Text style={styles.textAddress}>{fromAccountName}</Text>
					<Text style={styles.textBalance}>{`Balance: ${fromAccountBalance}`}</Text>
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
	fromAccountBalance: PropTypes.string
};
