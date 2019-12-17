import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { SafeAreaView, ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { colors } from '../../../../styles/common';
import TransactionEditor from '../../../UI/TransactionEditor';
import { strings } from '../../../../../locales/i18n';
import { getTransactionOptionsTitle } from '../../../UI/Navbar';
import { connect } from 'react-redux';
import { newTransaction } from '../../../../actions/transaction';
import InstaPay from '../../../../core/InstaPay';
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
		newTransaction: PropTypes.func.isRequired,
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
		this.props.newTransaction();
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

		const sendAmount = fromTokenMinimalUnit(transaction.value, 18);
		const sendRecipient = transaction.to;
		try {
			await InstaPay.send({
				sendAmount,
				sendRecipient
			});
		} catch (e) {
			const msg = strings('payment_channel.unknown_error');
			Alert.alert(strings('payment_channel.error'), msg);
			Logger.error('buy error error', e);
			this.sending = false;
			return;
		}

		this.sending = false;
		Logger.log('Send succesful');
		InstaPay.setPaymentPending(true);
		navigation.pop();
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
	newTransaction: () => dispatch(newTransaction())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(PaymentChannelSend);
