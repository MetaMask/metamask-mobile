import React, { Component } from 'react';
import Icon from 'react-native-vector-icons/FontAwesome';
import Identicon from '../Identicon';
import PropTypes from 'prop-types';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { connect } from 'react-redux';
import { renderShortAddress } from '../../util/address';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { ScrollView } from 'react-native-gesture-handler';
import ElevatedView from 'react-native-elevated-view';

const styles = StyleSheet.create({
	root: {
		flex: 1
	},
	arrow: {
		color: colors.inputBorderColor,
		position: 'absolute',
		right: 10,
		top: Platform.OS === 'android' ? 20 : 13
	},
	componentContainer: {
		position: 'relative',
		maxHeight: 200,
		borderColor: colors.inputBorderColor,
		borderRadius: 4,
		borderWidth: 1
	},
	input: {
		...fontStyles.bold,
		backgroundColor: colors.white,
		borderColor: colors.inputBorderColor,
		borderRadius: 4,
		borderWidth: 1,
		fontSize: 16,
		paddingBottom: 16,
		paddingRight: 40,
		paddingLeft: 52,
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
		top: Platform.OS === 'android' ? 8 : 6,
		paddingVertical: 8,
		paddingHorizontal: 10
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
		const { isOpen } = this.state;
		this.setState({ isOpen: !isOpen });
		onFocus && onFocus();
	};

	selectAccount(account) {
		this.onChange(account.address);
	}

	renderOption(account, onPress) {
		return (
			<TouchableOpacity key={account.address} onPress={onPress} style={styles.option}>
				<View style={styles.icon}>
					<Identicon address={account.address} diameter={22} />
				</View>
				<View style={styles.content}>
					<View>
						<Text style={styles.name}>{account.name}</Text>
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

	onChange = value => {
		const { accounts, onChange } = this.props;
		const addresses = Object.keys(accounts).filter(address => address.toLowerCase().match(value.toLowerCase()));
		const visibleOptions = value.length === 0 ? accounts : addresses.map(address => accounts[address]);
		const match = visibleOptions.length === 1 && visibleOptions[0].address.toLowerCase() === value.toLowerCase();
		this.setState({
			isOpen: (value.length === 0 || visibleOptions.length) > 0 && !match
		});
		onChange && onChange(value);
	};

	scan = () => {
		const { showQRScanner } = this.props;
		this.setState({ isOpen: false });
		showQRScanner && showQRScanner();
	};

	render = () => {
		const { isOpen } = this.state;
		const { placeholder, value } = this.props;
		return (
			<View style={styles.root}>
				<TextInput
					autoCapitalize="none"
					autoCorrect={false}
					onChangeText={this.onChange}
					placeholder={placeholder}
					spellCheck={false}
					style={styles.input}
					value={value}
				/>
				<TouchableOpacity onPress={this.scan} style={styles.qrCodeButton}>
					<Icon name="qrcode" size={Platform.OS === 'android' ? 28 : 28} />
				</TouchableOpacity>
				<MaterialIcon onPress={this.onFocus} name={'arrow-drop-down'} size={24} style={styles.arrow} />
				{isOpen && this.renderOptionList()}
			</View>
		);
	};
}

const mapStateToProps = ({
	engine: {
		backgroundState: { PreferencesController }
	}
}) => ({
	accounts: PreferencesController.identities,
	activeAddress: PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(AccountInput);
