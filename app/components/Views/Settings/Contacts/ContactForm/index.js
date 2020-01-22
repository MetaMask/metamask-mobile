import React, { PureComponent } from 'react';
import { SafeAreaView, StyleSheet, TextInput, View, Text, TouchableOpacity } from 'react-native';
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
import AntIcon from 'react-native-vector-icons/AntDesign';

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
		flex: 1,
		fontSize: 12,
		borderColor: colors.grey200,
		borderRadius: 5,
		borderWidth: 2,
		padding: 10,
		flexDirection: 'row',
		alignItems: 'center'
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
	},
	scanIcon: {
		flexDirection: 'column',
		alignItems: 'center'
	},
	iconWrapper: {
		alignItems: 'flex-end'
	},
	textInput: {
		...fontStyles.normal,
		padding: 0,
		paddingRight: 8
	},
	inputWrapper: {
		flex: 1,
		flexDirection: 'column'
	}
});

const ADD = 'add';
const EDIT = 'edit';

/**
 * View that contains app information
 */
class ContactForm extends PureComponent {
	static navigationOptions = ({ navigation }) =>
		getNavigationOptionsTitle(
			strings(`address_book.${navigation.getParam('mode', ADD)}_contact_title`),
			navigation
		);

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
		addressReady: false,
		mode: this.props.navigation.getParam('mode', ADD)
	};

	addressInput = React.createRef();

	componentDidMount = () => {
		const { mode } = this.state;
		if (mode === EDIT) {
			const { addressBook, network, identities } = this.props;
			const networkAddressBook = addressBook[network] || {};
			const address = this.props.navigation.getParam('address', '');
			const contact = networkAddressBook[address] || identities[address];
			this.setState({ address, name: contact.name, addressReady: true });
		}
	};

	onChangeName = name => {
		this.setState({ name });
	};

	checkIfAlreadySaved = address => {
		const { addressBook, network, identities } = this.props;
		const { mode } = this.state;
		const networkAddressBook = addressBook[network] || {};
		const checksummedResolvedAddress = toChecksumAddress(address);
		if (
			mode === ADD &&
			(networkAddressBook[checksummedResolvedAddress] || identities[checksummedResolvedAddress])
		) {
			return strings('address_book.address_already_saved');
		}
		return;
	};

	onChangeAddress = async address => {
		const { network } = this.props;
		let addressError, toEnsName;
		let addressReady = false;
		if (isValidAddress(address)) {
			addressError = this.checkIfAlreadySaved(address);
			addressReady = true;
		} else if (isENS(address)) {
			const resolvedAddress = await doENSLookup(address, network);
			if (resolvedAddress) {
				const checksummedResolvedAddress = toChecksumAddress(resolvedAddress);
				toEnsName = address;
				address = resolvedAddress;
				addressError = this.checkIfAlreadySaved(checksummedResolvedAddress);
				addressReady = true;
			} else {
				addressError = strings('transaction.could_not_resolve_ens');
			}
		} else if (address.length >= 42) {
			addressError = strings('transaction.invalid_address');
		}
		this.setState({ address, addressError, toEnsName, addressReady });
	};

	jumpToAddressInput = () => {
		const { current } = this.addressInput;
		current && current.focus();
	};

	saveContact = () => {
		const { name, address } = this.state;
		const { network, navigation } = this.props;
		const { AddressBookController } = Engine.context;
		if (!name || !address) return;
		AddressBookController.set(toChecksumAddress(address), name, network);
		navigation.pop();
	};

	onScan = () => {
		this.props.navigation.navigate('QRScanner', {
			onScanSuccess: meta => {
				if (meta.target_address) {
					this.onChangeAddress(meta.target_address);
				}
			}
		});
	};

	render = () => {
		const { address, addressError, toEnsName, name, mode, addressReady } = this.state;
		return (
			<SafeAreaView style={styles.wrapper}>
				<KeyboardAwareScrollView style={styles.informationWrapper}>
					<View style={styles.scrollWrapper}>
						<Text style={styles.label}>{strings('address_book.name')}</Text>
						<TextInput
							autoCapitalize={'none'}
							autoCorrect={false}
							onChangeText={this.onChangeName}
							placeholder={strings('address_book.nickname')}
							placeholderTextColor={colors.grey100}
							spellCheck={false}
							numberOfLines={1}
							onBlur={this.onBlur}
							style={[styles.input, this.state.inputWidth ? { width: this.state.inputWidth } : {}]}
							value={name}
							onSubmitEditing={this.jumpToAddressInput}
						/>

						<Text style={styles.label}>{strings('address_book.address')}</Text>
						<View style={styles.input}>
							<View style={styles.inputWrapper}>
								<TextInput
									autoCapitalize={'none'}
									autoCorrect={false}
									onChangeText={this.onChangeAddress}
									placeholder={strings('address_book.add_input_placeholder')}
									placeholderTextColor={colors.grey100}
									spellCheck={false}
									numberOfLines={1}
									onBlur={this.onBlur}
									style={[styles.textInput]}
									value={toEnsName || address}
									ref={this.addressInput}
									onSubmitEditing={this.saveContact}
								/>
								{toEnsName && <Text style={styles.resolvedInput}>{renderShortAddress(address)}</Text>}
							</View>

							<TouchableOpacity onPress={this.onScan} style={styles.iconWrapper}>
								<AntIcon name="scan1" size={20} color={colors.grey500} style={styles.scanIcon} />
							</TouchableOpacity>
						</View>
					</View>

					{addressError && <ErrorMessage errorMessage={addressError} />}

					<View style={styles.buttonsWrapper}>
						<View style={styles.buttonsContainer}>
							<StyledButton
								type={'confirm'}
								disabled={!addressReady || !name || !!addressError}
								onPress={this.saveContact}
							>
								{strings(`address_book.${mode}_contact`)}
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

export default connect(mapStateToProps)(ContactForm);
