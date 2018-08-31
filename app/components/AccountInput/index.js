import React, { Component } from 'react';
import Icon from 'react-native-vector-icons/FontAwesome';
import Identicon from '../Identicon';
import PropTypes from 'prop-types';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { connect } from 'react-redux';

const styles = StyleSheet.create({
	root: {
		flex: 1
	},
	input: {
		...fontStyles.bold,
		backgroundColor: colors.white,
		borderColor: colors.inputBorderColor,
		borderRadius: 4,
		borderWidth: 1,
		fontSize: 16,
		paddingBottom: 16,
		paddingLeft: 10,
		paddingRight: 52,
		paddingTop: 16,
		position: 'relative'
	},
	option: {
		flexDirection: 'row',
		paddingBottom: 4,
		paddingLeft: 8,
		paddingRight: 10,
		paddingTop: 8
	},
	address: {
		...fontStyles.normal,
		fontSize: 16
	},
	name: {
		...fontStyles.bold,
		fontSize: 16,
		marginBottom: 4
	},
	icon: {
		paddingRight: 9,
		paddingTop: 1.5
	},
	optionList: {
		backgroundColor: colors.white,
		borderColor: colors.inputBorderColor,
		borderRadius: 4,
		borderWidth: 1,
		paddingBottom: 12,
		paddingTop: 10,
		position: 'absolute',
		top: 52,
		width: '100%'
	},
	content: {
		flex: 1
	},
	qrIcon: {
		position: 'absolute',
		right: 16,
		top: 16
	}
});

/**
 * ComboBox form component allowing address input with auto-completion based on
 * the current keychain's accounts
 */
class AccountInput extends Component {
	static propTypes = {
		/**
		 * List of accounts from the PreferencesController
		 */
		accounts: PropTypes.object,
		/**
		 * Callback triggered when the address changes
		 */
		onChange: PropTypes.func,
		/**
		 * Callback triggered when the input is focused
		 */
		onFocus: PropTypes.func,
		/**
		 * Placeholder text to show inside this input
		 */
		placeholder: PropTypes.string,
		/**
		 * Called when a user clicks the QR code icon
		 */
		showQRScanner: PropTypes.func,
		/**
		 * Value of this underlying input
		 */
		value: PropTypes.string
	};

	state = { isOpen: false };

	onFocus = () => {
		const { onFocus } = this.props;
		this.setState({ isOpen: true });
		onFocus && onFocus();
	};

	selectAccount(account) {
		this.onChange(account.address);
	}

	renderOption(account, onPress) {
		return (
			<TouchableOpacity key={account.address} onPress={onPress} style={styles.option}>
				<View style={styles.icon}>
					<Identicon address={account.address} diameter={18} />
				</View>
				<View style={styles.content}>
					<View>
						<Text style={styles.name}>{account.name}</Text>
					</View>
					<View>
						<Text style={styles.address} numberOfLines={1}>
							{account.address}
						</Text>
					</View>
				</View>
			</TouchableOpacity>
		);
	}

	renderOptionList() {
		const { visibleOptions = this.props.accounts } = this.state;
		return (
			<View style={styles.optionList}>
				{Object.keys(visibleOptions).map(address =>
					this.renderOption(visibleOptions[address], () => {
						this.selectAccount(visibleOptions[address]);
					})
				)}
			</View>
		);
	}

	onChange = value => {
		const { accounts, onChange } = this.props;
		const addresses = Object.keys(accounts).filter(address => address.toLowerCase().match(value.toLowerCase()));
		const visibleOptions = value.length === 0 ? accounts : addresses.map(address => accounts[address]);
		const match = visibleOptions.length === 1 && visibleOptions[0].address.toLowerCase() === value.toLowerCase();
		this.setState({
			isOpen: (value.length === 0 || visibleOptions.length) > 0 && !match,
			visibleOptions
		});
		onChange && onChange(value);
	};

	showQRScanner = () => {
		const { showQRScanner } = this.props;
		this.setState({ isOpen: false });
		showQRScanner && showQRScanner();
	};

	render() {
		const { isOpen } = this.state;
		const { placeholder, value } = this.props;
		return (
			<View style={styles.root}>
				<TextInput
					autoCapitalize="none"
					autoCorrect={false}
					onChangeText={this.onChange}
					onFocus={this.onFocus}
					placeholder={placeholder}
					spellCheck={false}
					style={styles.input}
					value={value}
				/>
				<Icon name="qrcode" onPress={this.showQRScanner} size={24} style={styles.qrIcon} />
				{isOpen && this.renderOptionList()}
			</View>
		);
	}
}

const mapStateToProps = ({ backgroundState: { PreferencesController } }) => ({
	accounts: PreferencesController.identities,
	activeAddress: PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(AccountInput);
