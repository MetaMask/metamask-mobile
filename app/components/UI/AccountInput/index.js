import React, { PureComponent } from 'react';
import Icon from 'react-native-vector-icons/FontAwesome';
import Identicon from '../Identicon';
import PropTypes from 'prop-types';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Keyboard } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import { renderShortAddress, isENS } from '../../../util/address';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import ElevatedView from 'react-native-elevated-view';
import ENS from 'ethjs-ens';
import networkMap from 'ethjs-ens/lib/network-map.json';
import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';
import { isValidAddress } from 'ethereumjs-util';
import Device from '../../../util/device';
import EthereumAddress from '../EthereumAddress';
import AppConstants from '../../../core/AppConstants';

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},
	arrow: {
		color: colors.grey100,
		position: 'absolute',
		right: 10,
		top: Device.isAndroid() ? 14 : 12,
	},
	componentContainer: {
		maxHeight: Device.isAndroid() ? 175 : 200,
		borderRadius: 4,
		flex: 1,
	},
	input: {
		...fontStyles.bold,
		backgroundColor: colors.white,
		marginRight: 24,
		paddingLeft: 0,
		minWidth: Device.isSmallDevice() ? 100 : 120,
	},
	qrCodeButton: {
		minHeight: 50,
		paddingRight: 8,
		paddingLeft: 12,
		paddingTop: 2,
		flexDirection: 'row',
		alignItems: 'center',
	},
	accountContainer: {
		flexDirection: 'row',
		backgroundColor: colors.white,
		borderColor: colors.grey100,
		borderRadius: 4,
		borderWidth: 1,
	},
	toContainer: {
		flexDirection: 'column',
	},
	inputContainer: {
		fontSize: 16,
		paddingLeft: 8,
		flexDirection: 'row',
		alignItems: 'center',
		marginRight: 48,
	},
	option: {
		flexDirection: 'row',
		paddingBottom: 4,
		paddingLeft: 8,
		paddingRight: 10,
		paddingTop: 8,
	},
	address: {
		...fontStyles.normal,
		fontSize: 16,
	},
	accountWithoutName: {
		marginTop: 4,
	},
	name: {
		flex: 1,
		...fontStyles.bold,
		fontSize: 16,
		marginBottom: 4,
	},
	icon: {
		paddingRight: 8,
		paddingLeft: 6,
		paddingTop: 1.5,
	},
	optionList: {
		backgroundColor: colors.white,
		borderColor: colors.grey100,
		borderRadius: 4,
		borderWidth: 1,
		paddingBottom: 12,
		paddingTop: 12,
		width: '100%',
		top: 0,
		left: 0,
		right: 0,
	},
	content: {
		flex: 1,
		paddingLeft: 8,
	},
	ensAddress: {
		fontSize: 10,
		top: Device.isAndroid() ? -16 : 0,
		paddingLeft: Device.isAndroid() ? 4 : 0,
	},
});

/**
 * ComboBox form component allowing address input with auto-completion based on
 * the current keychain's accounts
 */
class AccountInput extends PureComponent {
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
		 * Callback triggered when the input is blurred
		 */
		onBlur: PropTypes.func,
		/**
		 * Placeholder text to show inside this input
		 */
		placeholder: PropTypes.string,
		/**
		 * react-navigation object used for switching between screens
		 */
		navigation: PropTypes.object,
		/**
		 * Value of this underlying input
		 */
		address: PropTypes.string,
		/**
		 * Value of this underlying input
		 */
		ensRecipient: PropTypes.string,
		/**
		 * Network id
		 */
		network: PropTypes.string,
		/**
		 * Network id
		 */
		updateToAddressError: PropTypes.func,
		/**
		 * Callback to open accounts dropdown
		 */
		openAccountSelect: PropTypes.func,
		/**
		 * Whether accounts dropdown is opened
		 */
		isOpen: PropTypes.bool,
		/**
		 * Map representing the address book
		 */
		addressBook: PropTypes.object,
		/**
		 * Callback close all drowpdowns
		 */
		closeDropdowns: PropTypes.func,
	};

	state = {
		address: undefined,
		ensRecipient: undefined,
		value: undefined,
		inputEnabled: Device.isIos(),
	};

	componentDidMount = async () => {
		const { provider } = Engine.context.NetworkController;
		const { address, network, ensRecipient } = this.props;

		const networkHasEnsSupport = this.getNetworkEnsSupport();
		if (networkHasEnsSupport) {
			this.ens = new ENS({ provider, network });
		}
		if (ensRecipient) {
			this.setState({ value: ensRecipient, ensRecipient, address }, () => {
				// If we have an ENS name predefined
				// We need to resolve it
				this.onBlur();
			});
		} else if (address) {
			this.setState({ value: address, address });
		}

		// Workaround https://github.com/facebook/react-native/issues/9958
		!this.state.inputEnabled &&
			setTimeout(() => {
				this.setState({ inputEnabled: true });
			}, 100);
	};

	isEnsName = (recipient) => {
		if (!isENS(recipient)) {
			this.setState({ ensRecipient: undefined });
			return false;
		}
		return true;
	};

	lookupEnsName = async (recipient) => {
		const { address } = this.state;
		try {
			const resolvedAddress = await this.ens.lookup(recipient.trim());
			if (address !== AppConstants.ZERO_ADDRESS && isValidAddress(resolvedAddress)) {
				this.setState({ address: resolvedAddress, ensRecipient: recipient });
				return true;
			}
			throw new Error(strings('transaction.no_address_for_ens'));
		} catch (error) {
			this.props.updateToAddressError && this.props.updateToAddressError(error.message);
			return false;
		}
	};

	onFocus = () => {
		const { onFocus, isOpen, openAccountSelect } = this.props;
		openAccountSelect && openAccountSelect(!isOpen);
		onFocus && onFocus();
	};

	onBlur = async () => {
		const { value } = this.state;
		const { onBlur } = this.props;
		const isEnsName = this.isEnsName(value) && (await this.lookupEnsName(value));
		if (isEnsName) {
			onBlur && onBlur(this.state.address, value);
		} else {
			this.setState({ address: value, ensRecipient: undefined });
			onBlur && onBlur(value, undefined);
		}
	};

	selectAccount(account) {
		Keyboard.dismiss();
		this.onChange(account.address);
		const { openAccountSelect } = this.props;
		openAccountSelect && openAccountSelect(false);
	}

	getNetworkEnsSupport = () => {
		const { network } = this.props;
		return Boolean(networkMap[network]);
	};

	renderAccountName(name) {
		if (name !== '') {
			return (
				<View>
					<Text numberOfLines={1} style={styles.name}>
						{name}
					</Text>
				</View>
			);
		}

		return <View style={styles.accountWithoutName} />;
	}

	renderOption(account, onPress) {
		return (
			<TouchableOpacity key={account.address} onPress={onPress} style={styles.option}>
				<View style={styles.icon}>
					<Identicon address={account.address} diameter={22} />
				</View>
				<View style={styles.content}>
					{this.renderAccountName(account.name)}
					<View>
						<EthereumAddress style={styles.address} address={account.address} type={'short'} />
					</View>
				</View>
			</TouchableOpacity>
		);
	}

	getVisibleOptions = (value) => {
		const { accounts, addressBook, network } = this.props;
		const allAddresses = { ...addressBook[network], ...accounts };

		if (typeof value !== 'undefined' && value.toString().length > 0) {
			// If it's a valid address we don't show any suggestion
			if (isValidAddress(value)) {
				return allAddresses;
			}

			const filteredAddresses = {};
			Object.keys(allAddresses).forEach((address) => {
				if (
					address.toLowerCase().indexOf(value.toLowerCase()) !== -1 ||
					(allAddresses[address].name &&
						allAddresses[address].name.toLowerCase().indexOf(value.toLowerCase()) !== -1)
				) {
					filteredAddresses[address] = allAddresses[address];
				}
			});

			if (filteredAddresses.length > 0) {
				return filteredAddresses;
			}
		}
		return allAddresses;
	};

	renderOptionList() {
		const visibleOptions = this.getVisibleOptions(this.state.value);
		return (
			<ElevatedView borderRadius={4} elevation={10}>
				<ScrollView style={styles.componentContainer} keyboardShouldPersistTaps={'handled'} nestedScrollEnabled>
					<View style={styles.optionList}>
						{Object.keys(visibleOptions).map((address) =>
							this.renderOption(visibleOptions[address], () => {
								this.selectAccount(visibleOptions[address]);
							})
						)}
					</View>
				</ScrollView>
			</ElevatedView>
		);
	}

	onChange = async (value) => {
		const { onChange, openAccountSelect } = this.props;
		this.setState({
			value,
		});

		const filteredAccounts = this.getVisibleOptions(value);
		openAccountSelect && openAccountSelect(Object.keys(filteredAccounts).length > 0);
		onChange && onChange(value);
	};

	onInputFocus = () => {
		const { openAccountSelect } = this.props;
		openAccountSelect && openAccountSelect(true);
	};

	scan = () => {
		const { openAccountSelect, closeDropdowns } = this.props;
		openAccountSelect && openAccountSelect(false);
		this.setState({ isOpen: false });
		this.props.navigation.navigate('QRScanner', {
			onScanSuccess: (meta) => {
				if (meta.target_address) {
					this.onChange(meta.target_address);
					closeDropdowns && closeDropdowns();
				}
			},
		});
	};

	closeDropdown = () => {
		// nice to have
	};

	render = () => {
		const { value, ensRecipient, address } = this.state;
		const { placeholder, isOpen } = this.props;
		return (
			<View style={styles.root}>
				<View style={styles.accountContainer}>
					<TouchableOpacity onPress={this.scan} style={styles.qrCodeButton}>
						<Icon name="qrcode" size={Device.isAndroid() ? 28 : 28} />
					</TouchableOpacity>
					<View style={styles.inputContainer}>
						<View style={styles.toContainer}>
							<TextInput
								autoCapitalize="none"
								autoCorrect={false}
								onChangeText={this.onChange}
								placeholder={Device.isSmallDevice() ? placeholder.substr(0, 13) + '...' : placeholder}
								placeholderTextColor={colors.grey100}
								spellCheck={false}
								editable={this.state.inputEnabled}
								style={styles.input}
								value={value}
								numberOfLines={1}
								onBlur={this.onBlur}
								onFocus={this.onInputFocus}
								onSubmitEditing={this.onFocus}
							/>
							<View style={styles.ensView}>
								{!!ensRecipient && <Text style={styles.ensAddress}>{renderShortAddress(address)}</Text>}
							</View>
						</View>
					</View>
					<MaterialIcon
						onPress={this.onFocus}
						name={'arrow-drop-down'}
						size={24}
						style={styles.arrow}
						testID={'account-drop-down'}
					/>
				</View>

				{isOpen && this.renderOptionList()}
			</View>
		);
	};
}

const mapStateToProps = (state) => ({
	addressBook: state.engine.backgroundState.AddressBookController.addressBook,
	accounts: state.engine.backgroundState.PreferencesController.identities,
	activeAddress: state.engine.backgroundState.PreferencesController.activeAddress,
	network: state.engine.backgroundState.NetworkController.network,
});

export default connect(mapStateToProps)(AccountInput);
