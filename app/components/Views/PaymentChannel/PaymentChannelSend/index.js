import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { SafeAreaView, ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { colors } from '../../../../styles/common';
import TransactionEditor from '../../../UI/TransactionEditor';
import { strings } from '../../../../../locales/i18n';
import { getTransactionOptionsTitle } from '../../../UI/Navbar';
import { connect } from 'react-redux';
import { resetTransaction } from '../../../../actions/transaction';
import PaymentChannelsClient from '../../../../core/PaymentChannelsClient';
import Logger from '../../../../util/Logger';
import { fromTokenMinimalUnit } from '../../../../util/number';

const EDIT = 'edit';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	loader: {
		backgroundColor: colors.white,
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	}
});

/**
 * View that wraps the wraps the "PaymentChannelSend" screen
 */
class PaymentChannelSend extends PureComponent {
	static navigationOptions = ({ navigation }) => getTransactionOptionsTitle('send.title', navigation);

	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object,
		/**
		 * Action that cleans transaction state
		 */
		resetTransaction: PropTypes.func.isRequired,
		/**
		 * Transaction state
		 */
		transaction: PropTypes.object.isRequired
	};

	state = {
		mode: EDIT,
		transactionKey: undefined,
		ready: false,
		transactionConfirmed: false,
		transactionSubmitted: false
	};

	mounted = false;
	unmountHandled = false;

	/**
	 * Sets state mounted to true, resets transaction and check for deeplinks
	 */
	componentDidMount() {
		const { navigation } = this.props;
		navigation && navigation.setParams({ mode: EDIT, dispatch: this.onModeChange });
		this.mounted = true;
		this.setState({ ready: true });
	}

	/**
	 * Cancels transaction and sets mounted to false
	 */
	async componentWillUnmount() {
		this.props.resetTransaction();
	}

	onCancel = () => {
		this.props.navigation.pop();
	};

	/**
	 * Change transaction mode
	 *
	 * @param mode - Transaction mode, review or edit
	 */
	onModeChange = async () => {
		this.setState({ transactionConfirmed: true });
		const { transaction, navigation } = this.props;
		if (this.sending) {
			return;
		}

		try {
			const params = {
				sendRecipient: transaction.to,
				sendAmount: fromTokenMinimalUnit(transaction.value, 18)
			};

			if (isNaN(params.sendAmount) || params.sendAmount.trim() === '') {
				Alert.alert(strings('payment_channel.error'), strings('payment_channel.enter_the_amount'));
				return false;
			}

			if (!params.sendRecipient) {
				Alert.alert(strings('payment_channel.error'), strings('payment_channel.enter_the_recipient'));
			}

			Logger.log('Sending ', params);
			this.sending = true;
			await PaymentChannelsClient.send(params);
			this.sending = false;

			Logger.log('Send succesful');
			navigation.pop();
		} catch (e) {
			let msg = strings('payment_channel.unknown_error');
			if (e.message === 'insufficient_balance') {
				msg = strings('payment_channel.insufficient_balance');
			}
			Alert.alert(strings('payment_channel.error'), msg);
			Logger.log('buy error error', e);
			this.sending = false;
		}
	};

	renderLoader() {
		return (
			<View style={styles.loader}>
				<ActivityIndicator size="small" />
			</View>
		);
	}

	render = () => (
		<SafeAreaView style={styles.wrapper}>
			{this.state.ready ? (
				<TransactionEditor
					navigation={this.props.navigation}
					mode={this.state.mode}
					onCancel={this.onCancel}
					onModeChange={this.onModeChange}
					transactionConfirmed={this.state.transactionConfirmed}
				/>
			) : (
				this.renderLoader()
			)}
		</SafeAreaView>
	);
}

const mapStateToProps = state => ({
	transaction: state.transaction
});

const mapDispatchToProps = dispatch => ({
	resetTransaction: () => dispatch(resetTransaction())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(PaymentChannelSend);
