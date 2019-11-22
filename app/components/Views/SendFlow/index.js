import React, { PureComponent } from 'react';
import { colors } from '../../../styles/common';
import { getTransactionOptionsTitle } from '../../UI/Navbar';
import AddressList from './AddressList';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import { AddressFrom, AddressTo } from './AddressInputs';
import Modal from 'react-native-modal';
import AccountList from '../../UI/AccountList';
import { connect } from 'react-redux';
import { renderFromWei } from '../../../util/number';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
	},
	imputWrapper: {
		flex: 0,
		borderBottomWidth: 1,
		borderBottomColor: colors.grey050
	},
	addressListWrapper: {
		flex: 1
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	}
});

/**
 * View that wraps the wraps the "Send" screen
 */
class SendFlow extends PureComponent {
	static navigationOptions = ({ navigation }) => getTransactionOptionsTitle('send.title', navigation);

	static propTypes = {
		/**
		 * Map of accounts to information objects including balances
		 */
		accounts: PropTypes.object,
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object,
		/**
		 * Selected address as string
		 */
		selectedAddress: PropTypes.string,
		/**
		 * List of accounts from the PreferencesController
		 */
		identities: PropTypes.object,
		/**
		 * List of keyrings
		 */
		keyrings: PropTypes.array,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string
	};

	state = {
		fromAccountModalVisible: false
	};

	componentDidMount = () => {
		const { navigation, selectedAddress, identities, accounts, ticker } = this.props;
		navigation && navigation.setParams({ mode: 'edit' });
		this.setState({
			fromSelectedAddress: selectedAddress,
			fromAccountName: identities[selectedAddress].name,
			fromAccountBalance: `${renderFromWei(accounts[selectedAddress].balance)} ${ticker}`
		});
	};

	toggleFromAccountModal = () => {
		const { fromAccountModalVisible } = this.state;
		this.setState({ fromAccountModalVisible: !fromAccountModalVisible });
	};

	onAccountChange = accountAddress => {
		const { identities, ticker, accounts } = this.props;
		const { name: fromAccountName } = identities[accountAddress];
		const fromAccountBalance = `${renderFromWei(accounts[accountAddress].balance)} ${ticker}`;
		this.setState({ fromAccountName, fromAccountBalance, fromSelectedAddress: accountAddress });
		this.toggleFromAccountModal();
	};

	render = () => {
		const { identities, keyrings, ticker } = this.props;
		const { fromAccountModalVisible, fromSelectedAddress, fromAccountName, fromAccountBalance } = this.state;
		return (
			<View style={styles.wrapper}>
				<View style={styles.imputWrapper}>
					<AddressFrom
						onPressIcon={this.toggleFromAccountModal}
						fromAccountName={fromAccountName}
						fromAccountBalance={fromAccountBalance}
					/>
					<AddressTo highlighted />
				</View>
				<View style={styles.addressListWrapper}>
					<AddressList />
				</View>
				<Modal
					isVisible={fromAccountModalVisible}
					style={styles.bottomModal}
					onBackdropPress={this.toggleFromAccountModal}
					onBackButtonPress={this.toggleFromAccountModal}
					onSwipeComplete={this.toggleFromAccountModal}
					swipeDirection={'down'}
					propagateSwipe
				>
					<AccountList
						enableAccountsAddition={false}
						identities={identities}
						selectedAddress={fromSelectedAddress}
						keyrings={keyrings}
						onAccountChange={this.onAccountChange}
						ticker={ticker}
					/>
				</Modal>
			</View>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	identities: state.engine.backgroundState.PreferencesController.identities,
	keyrings: state.engine.backgroundState.KeyringController.keyrings,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker
});

export default connect(mapStateToProps)(SendFlow);
