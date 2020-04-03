import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import Modal from 'react-native-modal';
import { StyleSheet, View, Text } from 'react-native';
import { hideTransactionNotification } from '../../../actions/transactionNotification';
import { connect } from 'react-redux';
import { colors, fontStyles } from '../../../styles/common';
import Ionicons from 'react-native-vector-icons/Ionicons';
import TransactionDetails from '../TransactionElement/TransactionDetails';
import decodeTransaction from '../TransactionElement/utils';

const styles = StyleSheet.create({
	modal: {
		margin: 0,
		width: '100%'
	},
	modalView: {
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center'
	},
	modalContainer: {
		width: '90%',
		backgroundColor: colors.white,
		borderRadius: 10
	},
	titleWrapper: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grey100,
		flexDirection: 'row'
	},
	title: {
		flex: 1,
		textAlign: 'center',
		fontSize: 18,
		marginVertical: 12,
		marginHorizontal: 24,
		color: colors.fontPrimary,
		...fontStyles.bold
	},
	closeIcon: { paddingTop: 4, position: 'absolute', right: 16 }
});

/**
 * Wrapper component for a global alert
 * connected to redux
 */
class TxNotification extends PureComponent {
	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		/**
		 * Boolean that determines if the modal should be shown
		 */
		isVisible: PropTypes.bool.isRequired,
		/**
		 * Number that determines when it should be autodismissed (in miliseconds)
		 */
		autodismiss: PropTypes.number,
		/**
		 * function that dismisses de modal
		 */
		hideTransactionNotification: PropTypes.func,
		/**
		 * An array that represents the user transactions on chain
		 */
		transactions: PropTypes.array,
		transactionId: PropTypes.string
	};

	state = {
		transactionDetails: undefined,
		transactionElement: undefined,
		tx: undefined
	};

	componentDidMount = async () => {
		const { transactions, transactionId } = this.props;
		const [transactionElement, transactionDetails] = await decodeTransaction(this.props);
		const tx = transactions.find(({ id }) => id === transactionId);
		this.setState({ tx, transactionElement, transactionDetails });
		console.log('txnotification componentDidMount'.toUpperCase());
	};

	async componentDidUpdate(prevProps) {
		console.log(
			'TxNotification componentDidUpdate',
			prevProps.isVisible,
			this.props.isVisible,
			this.props.autodismiss
		);
		if (this.props.autodismiss && !isNaN(this.props.autodismiss) && !prevProps.isVisible && this.props.isVisible) {
			setTimeout(() => {
				console.log('TxNotification', 'hideTransactionNotification'.toUpperCase());
				this.props.hideTransactionNotification();
			}, this.props.autodismiss);

			const { transactions, transactionId } = this.props;
			console.log('TxNotification', 'in setstate', transactionId);
			const tx = transactions[1293];
			console.log('TxNotification', 'in setstate TXXXX', tx);
			const [transactionElement, transactionDetails] = await decodeTransaction({ ...this.props, tx });
			console.log('TxNotification', transactionElement, transactionDetails);
			console.log('TxNotification', tx, transactionElement, transactionDetails);
			// eslint-disable-next-line react/no-did-update-set-state
			this.setState({ tx, transactionElement, transactionDetails });
		}
	}

	onClose = () => {
		this.props.hideTransactionNotification();
	};

	render = () => {
		const { isVisible, navigation } = this.props;
		const { transactionElement, transactionDetails, tx } = this.state;

		if (!transactionElement || !transactionDetails) return <View />;

		return (
			<Modal
				style={styles.modal}
				isVisible={isVisible}
				onBackdropPress={this.onClose}
				onBackButtonPress={this.onClose}
				backdropOpacity={0.7}
				animationIn={'fadeIn'}
				animationOut={'fadeOut'}
				useNativeDriver
				underlayColor={colors.grey000}
			>
				<View style={styles.modalView}>
					<View style={styles.modalContainer}>
						<View style={styles.titleWrapper}>
							<Text style={styles.title} onPress={this.onCloseDetailsModal}>
								{transactionElement.actionKey}
							</Text>
							<Ionicons
								onPress={this.onCloseDetailsModal}
								name={'ios-close'}
								size={38}
								style={styles.closeIcon}
							/>
						</View>
						<TransactionDetails
							transactionObject={tx}
							transactionDetails={transactionDetails}
							navigation={navigation}
							close={this.onCloseDetailsModal}
						/>
					</View>
				</View>
			</Modal>
		);
	};
}

const mapStateToProps = state => ({
	isVisible: state.transactionNotification.isVisible,
	autodismiss: state.transactionNotification.autodismiss,
	transactionId: state.transactionNotification.transactionId,
	transactions: state.engine.backgroundState.TransactionController.transactions
});

const mapDispatchToProps = dispatch => ({
	hideTransactionNotification: () => dispatch(hideTransactionNotification())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(TxNotification);
