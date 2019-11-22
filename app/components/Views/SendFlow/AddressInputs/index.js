import React from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import AntIcon from 'react-native-vector-icons/AntDesign';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import PropTypes from 'prop-types';
import Identicon from '../../../UI/Identicon';

const styles = StyleSheet.create({
	wrapper: {
		flexDirection: 'row',
		margin: 8
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
		alignItems: 'center',
		marginHorizontal: 6
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
		width: '12%'
	},
	labelText: {
		...fontStyles.normal,
		fontSize: 16
	},
	textInput: {
		backgroundColor: colors.white,
		paddingLeft: 0,
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
	scanIconWrapper: {
		marginTop: 1,
		flexDirection: 'row',
		alignItems: 'center'
	}
});

export const AddressTo = props => {
	const { highlighted, toSelectedAddress, onToSelectedAddressChange, onScan } = props;
	return (
		<View style={styles.wrapper}>
			<View style={styles.label}>
				<Text style={styles.labelText}>To:</Text>
			</View>
			<View style={[styles.inputWrapper, highlighted ? styles.borderHighlighted : styles.borderOpaque]}>
				<View style={styles.input}>
					<TextInput
						autoCapitalize="none"
						autoCorrect={false}
						onChangeText={onToSelectedAddressChange}
						placeholder={'Search, public address (0x), or ENS'}
						placeholderTextColor={colors.grey100}
						spellCheck={false}
						style={styles.textInput}
						numberOfLines={1}
						onBlur={this.onBlur}
						onFocus={this.onInputFocus}
						onSubmitEditing={this.onFocus}
						value={toSelectedAddress}
					/>
				</View>

				<TouchableOpacity onPress={onScan} style={styles.scanIconWrapper}>
					<AntIcon
						name="scan1"
						size={20}
						style={[styles.scanIcon, highlighted ? styles.iconHighlighted : styles.iconOpaque]}
					/>
				</TouchableOpacity>
			</View>
		</View>
	);
};

AddressTo.propTypes = {
	/**
	 * Whether the input is highlighted
	 */
	highlighted: PropTypes.bool,
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
	onScan: PropTypes.func
};

export const AddressFrom = props => {
	const { highlighted, onPressIcon, fromAccountName, fromAccountBalance, fromAccountAddress } = props;
	return (
		<View style={styles.wrapper}>
			<View style={styles.label}>
				<Text>From:</Text>
			</View>
			<View style={[styles.inputWrapper, highlighted ? styles.borderHighlighted : styles.borderOpaque]}>
				<Identicon address={fromAccountAddress} diameter={30} />
				<View style={styles.address}>
					<Text style={styles.textAddress}>{fromAccountName}</Text>
					<Text style={styles.textBalance}>{`Balance: ${fromAccountBalance}`}</Text>
				</View>

				<TouchableOpacity onPress={onPressIcon} style={styles.scanIconWrapper}>
					<FontAwesome
						name={'caret-down'}
						size={20}
						style={[styles.backIcon, highlighted ? styles.iconHighlighted : styles.iconOpaque]}
					/>
				</TouchableOpacity>
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
