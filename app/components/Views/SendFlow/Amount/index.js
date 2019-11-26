import React, { PureComponent } from 'react';
import { colors, fontStyles } from '../../../../styles/common';
import {
	StyleSheet,
	Text,
	SafeAreaView,
	View,
	TouchableOpacity,
	TextInput,
	Platform,
	KeyboardAvoidingView
} from 'react-native';
import { connect } from 'react-redux';
import { setRecipient, newTransaction } from '../../../../actions/newTransaction';
import { getSendFlowTitle } from '../../../UI/Navbar';
import StyledButton from '../../../UI/StyledButton';
import PropTypes from 'prop-types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

const KEYBOARD_OFFSET = 120;

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
	},
	buttonNextWrapper: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'flex-end'
	},
	buttonNext: {
		flex: 1,
		marginHorizontal: 24
	},
	inputWrapper: {
		flex: 1,
		marginTop: 45,
		marginHorizontal: 24
	},
	actionsWrapper: {
		flexDirection: 'row'
	},
	action: {
		flex: 1,
		alignItems: 'center'
	},
	actionDropdown: {
		backgroundColor: colors.blue,
		paddingHorizontal: 16,
		paddingVertical: 2,
		borderRadius: 100,
		flexDirection: 'row'
	},
	textDropdown: {
		...fontStyles.normal,
		fontSize: 14,
		color: colors.white
	},
	iconDropdown: {
		paddingLeft: 10
	},
	maxText: {
		...fontStyles.normal,
		fontSize: 12,
		color: colors.blue,
		alignSelf: 'flex-end'
	},
	actionMax: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-end'
	},
	actionMaxTouchable: {},
	inputContainer: {
		marginVertical: 8
	},
	textInput: {
		...fontStyles.light,
		fontSize: 44,
		textAlign: 'center'
	},
	switch: {
		flex: 1,
		transform: [{ rotate: '90deg' }]
	},
	actionSwitch: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 8,
		flexDirection: 'row',
		borderColor: colors.grey500,
		borderWidth: 1
	},
	textSwitch: {
		...fontStyles.normal,
		fontSize: 14,
		color: colors.grey500
	},
	switchWrapper: {
		flexDirection: 'row',
		alignItems: 'center'
	}
});

/**
 * View that wraps the wraps the "Send" screen
 */
class Amount extends PureComponent {
	static navigationOptions = ({ navigation }) => getSendFlowTitle('send.amount', navigation);

	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object
	};

	state = {
		inputValue: undefined
	};

	amountInput = React.createRef();

	componentDidMount = () => {
		this.amountInput && this.amountInput.current && this.amountInput.current.focus();
	};

	onNext = () => {
		const { navigation } = this.props;
		navigation.navigate('Confirm');
	};

	onInputChange = inputValue => {
		this.setState({ inputValue });
	};

	render = () => {
		const { inputValue } = this.state;
		return (
			<SafeAreaView style={styles.wrapper}>
				<View style={styles.inputWrapper}>
					<View style={styles.actionsWrapper}>
						<View style={styles.action} />
						<View style={[styles.action]}>
							<TouchableOpacity style={styles.actionDropdown}>
								<Text style={styles.textDropdown}>ETH</Text>
								<View styles={styles.arrow}>
									<Ionicons
										name="ios-arrow-down"
										size={16}
										color={colors.white}
										style={styles.iconDropdown}
									/>
								</View>
							</TouchableOpacity>
						</View>
						<View style={[styles.action, styles.actionMax]}>
							<TouchableOpacity style={styles.actionMaxTouchable}>
								<Text style={styles.maxText}>USE MAX</Text>
							</TouchableOpacity>
						</View>
					</View>
					<View style={styles.inputContainer}>
						<TextInput
							ref={this.amountInput}
							style={styles.textInput}
							value={inputValue}
							onChangeText={this.onInputChange}
							keyboardType={'numeric'}
							placeholder={'0'}
						/>
					</View>
					<View style={styles.actionsWrapper}>
						<View style={[styles.action]}>
							<TouchableOpacity style={styles.actionSwitch}>
								<Text style={styles.textSwitch} numberOfLines={1}>
									{inputValue} USD
								</Text>
								<View styles={styles.switchWrapper}>
									<FontAwesome name="exchange" size={12} color={colors.blue} style={styles.switch} />
								</View>
							</TouchableOpacity>
						</View>
					</View>
				</View>
				<KeyboardAvoidingView
					style={styles.buttonsWrapper}
					behavior={'padding'}
					keyboardVerticalOffset={KEYBOARD_OFFSET}
					enabled={Platform.OS === 'ios'}
				>
					<View style={styles.buttonNextWrapper}>
						<StyledButton type={'confirm'} containerStyle={styles.buttonNext} onPress={this.onNext}>
							Next
						</StyledButton>
					</View>
				</KeyboardAvoidingView>
			</SafeAreaView>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	addressBook: state.engine.backgroundState.AddressBookController.addressBook,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	identities: state.engine.backgroundState.PreferencesController.identities,
	keyrings: state.engine.backgroundState.KeyringController.keyrings,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	network: state.engine.backgroundState.NetworkController.network
});

const mapDispatchToProps = dispatch => ({
	newTransaction: () => dispatch(newTransaction()),
	setRecipient: (from, to, ensRecipient) => dispatch(setRecipient(from, to, ensRecipient))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Amount);
