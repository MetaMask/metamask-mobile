import React, { Component } from 'react';
import { TouchableOpacity, StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/FontAwesome';
import { colors, fontStyles } from '../../styles/common';
import Identicon from '../Identicon';
import Button from '../Button';
import Engine from '../../core/Engine';
import { strings } from '../../../locales/i18n';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.concrete,
		flex: 1
	},
	title: {
		fontSize: 25,
		marginVertical: 30,
		marginHorizontal: 20,
		color: colors.fontPrimary,
		...fontStyles.bold
	},
	accountsWrapper: {
		flex: 1
	},
	account: {
		flexDirection: 'row',
		marginLeft: 20,
		marginBottom: 20
	},
	accountInfo: {
		marginLeft: 15
	},
	accountLabel: {
		fontSize: 18,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	accountBalance: {
		paddingTop: 5,
		fontSize: 12,
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	selected: {
		width: 30,
		marginRight: 15
	},
	footer: {
		height: 80,
		justifyContent: 'flex-end',
		flexDirection: 'row',
		alignItems: 'center'
	},
	icon: {
		height: 50,
		width: 10,
		backgroundColor: colors.concrete
	}
});

/**
 * View that contains the list of all the available accounts
 */
class AccountList extends Component {
	static propTypes = {
		/**
		 * An object containing each identity in the format address => account
		 */
		accounts: PropTypes.object,
		/**
		 * A string representing the selected address => account
		 */
		selectedAddress: PropTypes.string,
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object
	};

	state = {
		selectedAccountIndex: 0
	};

	getInitialSelectedAccountIndex = () => {
		const { accounts, selectedAddress } = this.props;
		Object.keys(accounts).forEach((address, i) => {
			if (selectedAddress === address) {
				this.setState({ selectedAccountIndex: i });
			}
		});
	};

	componentDidMount() {
		this.getInitialSelectedAccountIndex();
	}

	onAccountChange = async newIndex => {
		const previousIndex = this.state.selectedAccountIndex;
		const { PreferencesController } = Engine.context;
		try {
			this.setState({ selectedAccountIndex: newIndex });
			await PreferencesController.update({ selectedAddress: Object.keys(this.props.accounts)[newIndex] });
		} catch (e) {
			// Restore to the previous index in case anything goes wrong
			this.setState({ selectedAccountIndex: previousIndex });
			console.error('error while trying change the selected account', e); // eslint-disable-line
		}
	};

	addAccount = async () => {
		const { KeyringController } = Engine.context;
		try {
			await KeyringController.addNewAccount();
			this.setState({ selectedAccountIndex: Object.keys(this.props.accounts).length - 1 });
		} catch (e) {
			// Restore to the previous index in case anything goes wrong
			console.error('error while trying to add a new account', e); // eslint-disable-line
		}
	};

	openAccountSettings = () => false;

	closeSideBar = () => {
		this.props.navigation.closeDrawer();
	};

	renderAccounts() {
		const { accounts } = this.props;
		return Object.keys(accounts).map((key, i) => {
			const { name, address, balance = 0 } = accounts[key];
			const selected =
				this.state.selectedAccountIndex === i ? <Icon name="check" size={30} color={colors.primary} /> : null;

			return (
				<TouchableOpacity
					style={styles.account}
					key={`account-${address}`}
					onPress={() => this.onAccountChange(i)} // eslint-disable-line
				>
					<View style={styles.selected}>{selected}</View>
					<Identicon address={address} diameter={38} />
					<View style={styles.accountInfo}>
						<Text style={styles.accountLabel}>{name}</Text>
						<Text style={styles.accountBalance}>{balance} ETH</Text>
					</View>
				</TouchableOpacity>
			);
		});
	}

	render() {
		return (
			<SafeAreaView style={styles.wrapper} testID={'account-list'}>
				<Text testID={'account-list-title'} style={styles.title} onPress={this.closeSideBar}>
					{strings('accounts.title')}
				</Text>
				<View style={styles.accountsWrapper}>{this.renderAccounts()}</View>
				<View style={styles.footer}>
					<Button style={[styles.icon, styles.left]} onPress={this.addAccount}>
						<Icon name="plus" testID={'add-account-button'} size={30} color={colors.fontSecondary} />
					</Button>
					<Button style={[styles.icon, styles.right]} onPress={this.openAccountSettings}>
						<Icon name="cog" size={30} color={colors.fontSecondary} />
					</Button>
				</View>
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({
	accounts: state.backgroundState.PreferencesController.identities,
	selectedAddress: state.backgroundState.PreferencesController.selectedAddress
});
export default connect(mapStateToProps)(AccountList);
