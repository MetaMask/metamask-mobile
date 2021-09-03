import React, { PureComponent } from 'react';
import { Platform, SafeAreaView, StyleSheet, TextInput, View, Text, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../../../../styles/common';
import PropTypes from 'prop-types';
import { getEditableOptions } from '../../../../UI/Navbar';
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
import ActionSheet from 'react-native-actionsheet';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		flexDirection: 'column',
	},
	scrollWrapper: {
		flex: 1,
		paddingVertical: 12,
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
		alignItems: 'center',
	},
	resolvedInput: {
		...fontStyles.normal,
		fontSize: 10,
	},
	informationWrapper: {
		flex: 1,
		paddingHorizontal: 24,
	},
	label: {
		fontSize: 14,
		paddingVertical: 12,
		color: colors.fontPrimary,
		...fontStyles.bold,
	},
	buttonsWrapper: {
		marginVertical: 12,
		flexDirection: 'row',
		alignSelf: 'flex-end',
	},
	buttonsContainer: {
		flex: 1,
		flexDirection: 'column',
		alignSelf: 'flex-end',
	},
	scanIcon: {
		flexDirection: 'column',
		alignItems: 'center',
	},
	iconWrapper: {
		alignItems: 'flex-end',
	},
	textInput: {
		...fontStyles.normal,
		padding: 0,
		paddingRight: 8,
		color: colors.black,
	},
	inputWrapper: {
		flex: 1,
		flexDirection: 'column',
	},
	textInputDisaled: {
		borderColor: colors.transparent,
	},
	actionButton: {
		marginVertical: 4,
	},
});

const ADD = 'add';
const EDIT = 'edit';

/**
 * View that contains app information
 */
class ContactForm extends PureComponent {
	static navigationOptions = ({ navigation, route }) =>
		getEditableOptions(strings(`address_book.${route.params?.mode ?? ADD}_contact_title`), navigation, route);

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
		addressBook: PropTypes.object,
		/**
		 * Object that represents the current route info like params passed to it
		 */
		route: PropTypes.object,
	};

	state = {
		name: undefined,
		address: undefined,
		addressError: undefined,
		toEnsName: undefined,
		addressReady: false,
		mode: this.props.route.params?.mode ?? ADD,
		memo: undefined,
		editable: true,
		inputWidth: Platform.OS === 'android' ? '99%' : undefined,
	};

	actionSheet = React.createRef();
	addressInput = React.createRef();
	memoInput = React.createRef();

	componentDidMount = () => {
		const { mode } = this.state;
		const { navigation } = this.props;
		// Workaround https://github.com/facebook/react-native/issues/9958
		this.state.inputWidth &&
			setTimeout(() => {
				this.setState({ inputWidth: '100%' });
			}, 100);
		if (mode === EDIT) {
			const { addressBook, network, identities } = this.props;
			const networkAddressBook = addressBook[network] || {};
			const address = this.props.route.params?.address ?? '';
			const contact = networkAddressBook[address] || identities[address];
			this.setState({ address, name: contact.name, memo: contact.memo, addressReady: true, editable: false });
			navigation && navigation.setParams({ dispatch: this.onEdit, mode: EDIT });
		}
	};

	onEdit = () => {
		const { navigation } = this.props;
		const { editable } = this.state;
		if (editable) navigation.setParams({ editMode: EDIT });
		else navigation.setParams({ editMode: ADD });

		this.setState({ editable: !editable });
	};

	onDelete = () => {
		this.contactAddressToRemove = this.state.address;
		this.actionSheet && this.actionSheet.show();
	};

	onChangeName = (name) => {
		this.setState({ name });
	};

	checkIfAlreadySaved = (address) => {
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

	onChangeAddress = async (address) => {
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

	onChangeMemo = (memo) => {
		this.setState({ memo });
	};

	jumpToAddressInput = () => {
		const { current } = this.addressInput;
		current && current.focus();
	};

	jumpToMemoInput = () => {
		const { current } = this.memoInput;
		current && current.focus();
	};

	saveContact = () => {
		const { name, address, memo } = this.state;
		const { network, navigation } = this.props;
		const { AddressBookController } = Engine.context;
		if (!name || !address) return;
		AddressBookController.set(toChecksumAddress(address), name, network, memo);
		navigation.pop();
	};

	deleteContact = () => {
		const { AddressBookController } = Engine.context;
		const { network, navigation, route } = this.props;
		AddressBookController.delete(network, this.contactAddressToRemove);
		route.params.onDelete();
		navigation.pop();
	};

	onScan = () => {
		this.props.navigation.navigate('QRScanner', {
			onScanSuccess: (meta) => {
				if (meta.target_address) {
					this.onChangeAddress(meta.target_address);
				}
			},
		});
	};

	createActionSheetRef = (ref) => {
		this.actionSheet = ref;
	};

	render = () => {
		const { address, addressError, toEnsName, name, mode, addressReady, memo, editable, inputWidth } = this.state;
		return (
			<SafeAreaView style={styles.wrapper} testID={'add-contact-screen'}>
				<KeyboardAwareScrollView style={styles.informationWrapper}>
					<View style={styles.scrollWrapper}>
						<Text style={styles.label}>{strings('address_book.name')}</Text>
						<TextInput
							editable={this.state.editable}
							autoCapitalize={'none'}
							autoCorrect={false}
							onChangeText={this.onChangeName}
							placeholder={strings('address_book.nickname')}
							placeholderTextColor={colors.grey100}
							spellCheck={false}
							numberOfLines={1}
							style={[
								styles.input,
								inputWidth ? { width: inputWidth } : {},
								editable ? {} : styles.textInputDisaled,
							]}
							value={name}
							onSubmitEditing={this.jumpToAddressInput}
							testID={'contact-name-input'}
						/>

						<Text style={styles.label}>{strings('address_book.address')}</Text>
						<View style={[styles.input, editable ? {} : styles.textInputDisaled]}>
							<View style={styles.inputWrapper}>
								<TextInput
									editable={editable}
									autoCapitalize={'none'}
									autoCorrect={false}
									onChangeText={this.onChangeAddress}
									placeholder={strings('address_book.add_input_placeholder')}
									placeholderTextColor={colors.grey100}
									spellCheck={false}
									numberOfLines={1}
									style={[styles.textInput, inputWidth ? { width: inputWidth } : {}]}
									value={toEnsName || address}
									ref={this.addressInput}
									onSubmitEditing={this.jumpToMemoInput}
									testID={'contact-address-input'}
								/>
								{toEnsName && <Text style={styles.resolvedInput}>{renderShortAddress(address)}</Text>}
							</View>

							{editable && (
								<TouchableOpacity onPress={this.onScan} style={styles.iconWrapper}>
									<AntIcon name="scan1" size={20} color={colors.grey500} style={styles.scanIcon} />
								</TouchableOpacity>
							)}
						</View>

						<Text style={styles.label}>{strings('address_book.memo')}</Text>
						<View style={[styles.input, editable ? {} : styles.textInputDisaled]}>
							<View style={styles.inputWrapper}>
								<TextInput
									multiline
									editable={editable}
									autoCapitalize={'none'}
									autoCorrect={false}
									onChangeText={this.onChangeMemo}
									placeholder={strings('address_book.memo')}
									placeholderTextColor={colors.grey100}
									spellCheck={false}
									numberOfLines={1}
									style={[styles.textInput, inputWidth ? { width: inputWidth } : {}]}
									value={memo}
									ref={this.memoInput}
									testID={'contact-memo-input'}
								/>
							</View>
						</View>
					</View>

					{addressError && <ErrorMessage errorMessage={addressError} />}

					{!!editable && (
						<View style={styles.buttonsWrapper}>
							<View style={styles.buttonsContainer}>
								<View style={styles.actionButton}>
									<StyledButton
										type={'confirm'}
										disabled={!addressReady || !name || !!addressError}
										onPress={this.saveContact}
										testID={'contact-add-contact-button'}
									>
										{strings(`address_book.${mode}_contact`)}
									</StyledButton>
								</View>
								{mode === EDIT && (
									<View style={styles.actionButton}>
										<StyledButton
											style={styles.actionButton}
											type={'warning-empty'}
											disabled={!addressReady || !name || !!addressError}
											onPress={this.onDelete}
										>
											{strings(`address_book.delete`)}
										</StyledButton>
									</View>
								)}
							</View>
						</View>
					)}
					<ActionSheet
						ref={this.createActionSheetRef}
						title={strings('address_book.delete_contact')}
						options={[strings('address_book.delete'), strings('address_book.cancel')]}
						cancelButtonIndex={1}
						destructiveButtonIndex={0}
						// eslint-disable-next-line react/jsx-no-bind
						onPress={(index) => (index === 0 ? this.deleteContact() : null)}
					/>
				</KeyboardAwareScrollView>
			</SafeAreaView>
		);
	};
}

const mapStateToProps = (state) => ({
	addressBook: state.engine.backgroundState.AddressBookController.addressBook,
	identities: state.engine.backgroundState.PreferencesController.identities,
	network: state.engine.backgroundState.NetworkController.network,
});

export default connect(mapStateToProps)(ContactForm);
