import React, { PureComponent } from 'react';
import { SafeAreaView, StyleSheet, TextInput, View, Text } from 'react-native';
import { colors, fontStyles } from '../../../../../styles/common';
import PropTypes from 'prop-types';
import { getNavigationOptionsTitle } from '../../../../UI/Navbar';
import StyledButton from '../../../../UI/StyledButton';
import Engine from '../../../../../core/Engine';
import { toChecksumAddress, isValidAddress } from 'ethereumjs-util';
import { connect } from 'react-redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { strings } from '../../../../../../locales/i18n';
import { doENSLookup } from '../../../../../util/ENSUtils';
import { isENS, renderShortAddress } from '../../../../../util/address';
import ErrorMessage from '../../../SendFlow/ErrorMessage';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		flexDirection: 'column'
	},
	scrollWrapper: {
		flex: 1,
		paddingVertical: 12
	},
	input: {
		...fontStyles.normal,
		fontSize: 12,
		borderColor: colors.grey200,
		borderRadius: 5,
		borderWidth: 2,
		padding: 10
	},
	resolvedInput: {
		...fontStyles.normal,
		fontSize: 10
	},
	informationWrapper: {
		flex: 1,
		paddingHorizontal: 24
	},
	label: {
		fontSize: 14,
		paddingVertical: 12,
		color: colors.fontPrimary,
		...fontStyles.bold
	},
	buttonsWrapper: {
		marginVertical: 12,
		flexDirection: 'row',
		alignSelf: 'flex-end'
	},
	buttonsContainer: {
		flex: 1,
		flexDirection: 'column',
		alignSelf: 'flex-end'
	}
});

const ADD = 'add';
const EDIT = 'edit';

/**
 * View that contains app information
 */
class AddContact extends PureComponent {
	static navigationOptions = ({ navigation }) =>
		getNavigationOptionsTitle(`${navigation.getParam('mode', ADD)} Contact`, navigation);

	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object,
		/**
		 * Network id
		 */
		network: PropTypes.string,
		/**
		 * An object containing each identity in the format address => account
		 */
		identities: PropTypes.object,
		/**
		 * Map representing the address book
		 */
		addressBook: PropTypes.object
	};

	state = {
		name: undefined,
		address: undefined,
		addressError: undefined,
		toEnsName: undefined,
		validAddress: false,
		mode: this.props.navigation.getParam('mode', ADD)
	};

	componentDidMount = () => {
		const { mode } = this.state;
		if (mode === EDIT) {
			const { addressBook, network, identities } = this.props;
			const networkAddressBook = addressBook[network] || {};
			const address = this.props.navigation.getParam('address', '');
			const contact = networkAddressBook[address] || identities[address];
			this.setState({ address, name: contact.name });
		}
	};

	onChangeName = name => {
		this.setState({ name });
	};

	checkIfAlreadySaved = address => {
		const { addressBook, network, identities } = this.props;
		const { mode } = this.state;
		const networkAddressBook = addressBook[network] || {};
		let addressError;
		let validAddress = false;
		const checksummedResolvedAddress = toChecksumAddress(address);
		if (
			mode === ADD &&
			(networkAddressBook[checksummedResolvedAddress] || identities[checksummedResolvedAddress])
		) {
			addressError = 'Address already saved';
		} else {
			validAddress = true;
		}
		return { addressError, validAddress };
	};

	onChangeAddress = async address => {
		const { network } = this.props;
		let addressError, toEnsName;
		let validAddress = false;

		if (isValidAddress(address)) {
			const { addressError: checkAddressError, validAddress: checkValidAddress } = this.checkIfAlreadySaved(
				address
			);
			addressError = checkAddressError;
			validAddress = checkValidAddress;
		}
		if (isENS(address)) {
			toEnsName = address;
			const resolvedAddress = await doENSLookup(address, network);
			if (resolvedAddress) {
				const checksummedResolvedAddress = toChecksumAddress(resolvedAddress);
				address = resolvedAddress;
				const { addressError: checkAddressError, validAddress: checkValidAddress } = this.checkIfAlreadySaved(
					checksummedResolvedAddress
				);
				addressError = checkAddressError;
				validAddress = checkValidAddress;
			} else {
				addressError = strings('transaction.could_not_resolve_ens');
			}
		} else if (!isValidAddress(address) && address && address.length >= 42) {
			addressError = strings('transaction.invalid_address');
		}

		this.setState({ address, addressError, toEnsName, validAddress });
	};

	addContact = () => {
		const { name, address } = this.state;
		const { network, navigation } = this.props;
		const { AddressBookController } = Engine.context;
		if (!name || !address) return;
		AddressBookController.set(toChecksumAddress(address), name, network);
		navigation.pop();
	};

	render = () => {
		const { address, addressError, toEnsName, validAddress, name, mode } = this.state;
		return (
			<SafeAreaView style={styles.wrapper}>
				<KeyboardAwareScrollView style={styles.informationWrapper}>
					<View style={styles.scrollWrapper}>
						<Text style={styles.label}>{'Name'}</Text>
						<TextInput
							autoCapitalize={'none'}
							autoCorrect={false}
							onChangeText={this.onChangeName}
							placeholder={'Nickname'}
							placeholderTextColor={colors.grey100}
							spellCheck={false}
							numberOfLines={1}
							onBlur={this.onBlur}
							onFocus={this.onInputFocus}
							onSubmitEditing={this.onFocus}
							style={[styles.input, this.state.inputWidth ? { width: this.state.inputWidth } : {}]}
							value={name}
						/>

						<Text style={styles.label}>{'Address'}</Text>
						<View style={styles.input}>
							<TextInput
								autoCapitalize={'none'}
								autoCorrect={false}
								onChangeText={this.onChangeAddress}
								placeholder={'Public address (0x), or ENS'}
								placeholderTextColor={colors.grey100}
								spellCheck={false}
								numberOfLines={1}
								onBlur={this.onBlur}
								onFocus={this.onInputFocus}
								onSubmitEditing={this.onFocus}
								style={[this.state.inputWidth ? { width: this.state.inputWidth } : {}]}
								value={toEnsName || address}
							/>
							{toEnsName && <Text style={styles.resolvedInput}>{renderShortAddress(address)}</Text>}
						</View>
					</View>

					{addressError && <ErrorMessage errorMessage={addressError} />}

					<View style={styles.buttonsWrapper}>
						<View style={styles.buttonsContainer}>
							<StyledButton
								type={'confirm'}
								disabled={!!addressError || !validAddress || !name}
								onPress={this.addContact}
							>
								{`${mode} contact`}
							</StyledButton>
						</View>
					</View>
				</KeyboardAwareScrollView>
			</SafeAreaView>
		);
	};
}

const mapStateToProps = state => ({
	addressBook: state.engine.backgroundState.AddressBookController.addressBook,
	identities: state.engine.backgroundState.PreferencesController.identities,
	network: state.engine.backgroundState.NetworkController.network
});

export default connect(mapStateToProps)(AddContact);
