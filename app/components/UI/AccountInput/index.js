import React, { Component } from 'react';
import Icon from 'react-native-vector-icons/FontAwesome';
import Identicon from '../Identicon';
import PropTypes from 'prop-types';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import { renderShortAddress } from '../../../util/address';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { ScrollView } from 'react-native-gesture-handler';
import ElevatedView from 'react-native-elevated-view';
import ENS from 'ethjs-ens';
import networkMap from 'ethjs-ens/lib/network-map.json';
import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const styles = StyleSheet.create({
	root: {
		flex: 1,
		borderColor: colors.inputBorderColor,
		borderRadius: 4,
		borderWidth: 1
	},
	arrow: {
		color: colors.inputBorderColor,
		position: 'absolute',
		right: 10,
		top: Platform.OS === 'android' ? 16 : 14
	},
	componentContainer: {
		position: 'relative',
		maxHeight: Platform.OS === 'android' ? 175 : 200,
		borderColor: colors.inputBorderColor,
		borderRadius: 4,
		borderWidth: 1
	},
	input: {
		...fontStyles.bold,
		backgroundColor: colors.white,
		paddingHorizontal: 0,
		paddingVertical: 0,
		width: '100%'
	},
	inputContainer: {
		fontSize: 16,
		paddingBottom: 12,
		paddingRight: 40,
		paddingLeft: 52,
		paddingTop: Platform.OS === 'android' ? 10 : 12,
		position: 'relative',
		minHeight: Platform.OS === 'android' ? 22 : 50,
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center'
	},
	inputContent: {
		flex: 1,
		flexDirection: 'column',
		alignItems: 'flex-start'
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
		flex: 1,
		...fontStyles.bold,
		fontSize: 16,
		marginBottom: 4
	},
	icon: {
		paddingRight: 8,
		paddingLeft: 6,
		paddingTop: 1.5
	},
	optionList: {
		backgroundColor: colors.white,
		borderColor: colors.inputBorderColor,
		borderRadius: 4,
		borderWidth: 1,
		paddingBottom: 12,
		paddingTop: 10,
		width: '100%',
		top: 0,
		left: 0,
		right: 0
	},
	content: {
		flex: 1,
		paddingLeft: 8
	},
	qrCodeButton: {
		position: 'absolute',
		left: 5,
		minHeight: Platform.OS === 'android' ? 22 : 50,
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		paddingTop: 7,
		paddingHorizontal: 10
	},
	ensAddress: {
		fontSize: 10,
		top: Platform.OS === 'android' ? -8 : 0
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
		updateToAddressError: PropTypes.func
	};

	state = {
		isOpen: false,
		address: undefined,
		ensRecipient: undefined,
		value: undefined
	};

	componentDidMount = async () => {
		const { provider } = Engine.context.NetworkController;

		const { address, network, ensRecipient } = this.props;

		const networkHasEnsSupport = this.getNetworkEnsSupport();
		if (networkHasEnsSupport) {
			this.ens = new ENS({ provider, network });
		}
		if (ensRecipient) {
			this.setState({ value: ensRecipient, ensRecipient, address });
		} else if (address) {
			this.setState({ value: address, address });
		}
	};

	isEnsName = recipient => {
		const rec = recipient && recipient.split('.');
		if (!rec || rec.length === 1 || !AppConstants.supportedTLDs.includes(rec[rec.length - 1])) {
			this.setState({ ensRecipient: undefined });
			return false;
		}
		return true;
	};

	lookupEnsName = async recipient => {
		const { address } = this.state;
		try {
			const resolvedAddress = await this.ens.lookup(recipient.trim());
			if (address !== ZERO_ADDRESS && resolvedAddress !== address) {
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
		const { onFocus } = this.props;
		const { isOpen } = this.state;
		this.setState({ isOpen: !isOpen });
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
		this.onChange(account.address);
	}

	getNetworkEnsSupport = () => {
		const { network } = this.props;
		return Boolean(networkMap[network]);
	};

	renderOption(account, onPress) {
		return (
			<TouchableOpacity key={account.address} onPress={onPress} style={styles.option}>
				<View style={styles.icon}>
					<Identicon address={account.address} diameter={22} />
				</View>
				<View style={styles.content}>
					<View>
						<Text numberOfLines={1} style={styles.name}>
							{account.name}
						</Text>
					</View>
					<View>
						<Text style={styles.address} numberOfLines={1}>
							{renderShortAddress(account.address)}
						</Text>
					</View>
				</View>
			</TouchableOpacity>
		);
	}

	renderOptionList() {
		const { visibleOptions = this.props.accounts } = this.state;
		return (
			<ElevatedView elevation={10} style={styles.root}>
				<ScrollView style={styles.componentContainer}>
					<View style={styles.optionList}>
						{Object.keys(visibleOptions).map(address =>
							this.renderOption(visibleOptions[address], () => {
								this.selectAccount(visibleOptions[address]);
							})
						)}
					</View>
				</ScrollView>
			</ElevatedView>
		);
	}

	onChange = async value => {
		const { accounts, onChange } = this.props;
		const addresses = Object.keys(accounts).filter(address => address.toLowerCase().match(value.toLowerCase()));
		const visibleOptions = value.length === 0 ? accounts : addresses.map(address => accounts[address]);
		const match = visibleOptions.length === 1 && visibleOptions[0].address.toLowerCase() === value.toLowerCase();
		this.setState({
			isOpen: (value.length === 0 || visibleOptions.length) > 0 && !match,
			value
		});
		onChange && onChange(value);
	};

	onInputFocus = () => {
		this.setState({ isOpen: false });
	};

	scan = () => {
		this.setState({ isOpen: false });
		this.props.navigation.navigate('QRScanner', {
			onScanSuccess: meta => {
				if (meta.target_address) {
					this.onChange(meta.target_address);
				}
			}
		});
	};

	render = () => {
		const { isOpen, value, ensRecipient, address } = this.state;
		const { placeholder } = this.props;
		return (
			<View style={styles.root}>
				<View style={styles.inputContainer}>
					<View style={styles.inputContent}>
						<TextInput
							autoCapitalize="none"
							autoCorrect={false}
							onChangeText={this.onChange}
							placeholder={placeholder}
							spellCheck={false}
							style={styles.input}
							value={value}
							onBlur={this.onBlur}
							onFocus={this.onInputFocus}
						/>
						{ensRecipient && <Text style={styles.ensAddress}>{renderShortAddress(address)}</Text>}
					</View>
				</View>
				<TouchableOpacity onPress={this.scan} style={styles.qrCodeButton}>
					<Icon name="qrcode" size={Platform.OS === 'android' ? 28 : 28} />
				</TouchableOpacity>
				<MaterialIcon onPress={this.onFocus} name={'arrow-drop-down'} size={24} style={styles.arrow} />
				{isOpen && this.renderOptionList()}
			</View>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.PreferencesController.identities,
	activeAddress: state.engine.backgroundState.PreferencesController.activeAddress,
	network: state.engine.backgroundState.NetworkController.network
});

export default connect(mapStateToProps)(AccountInput);
