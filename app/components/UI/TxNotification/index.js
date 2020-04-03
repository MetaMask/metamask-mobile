import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { hideTransactionNotification } from '../../../actions/transactionNotification';
import { connect } from 'react-redux';
import { colors, fontStyles } from '../../../styles/common';
import Ionicons from 'react-native-vector-icons/Ionicons';
import TransactionDetails from '../TransactionElement/TransactionDetails';
import decodeTransaction from '../TransactionElement/utils';
import { TransactionNotification } from '../TransactionNotification';
import Device from '../../../util/Device';

const styles = StyleSheet.create({
	modalView: {
		flex: 1,
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
	modalTypeView: { position: 'absolute', bottom: 0, left: 0, right: 0 },
	modalTypeVisible: { zIndex: 100 },
	modalTypeNotVisible: { zIndex: -100 },
	transactionDetailsVisible: { top: 0, backgroundColor: colors.greytransparent },
	closeIcon: { paddingTop: 4, position: 'absolute', right: 16 },
	notificationContainer: { flex: 0.1, flexDirection: 'row', alignItems: 'flex-end' },
	notificationWrapper: { height: 70, width: '100%', marginBottom: Device.isIphoneX() ? 20 : 10 }
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
		transactions: PropTypes.array
		// transactionId: PropTypes.string
	};

	state = {
		transactionDetails: undefined,
		transactionElement: undefined,
		tx: undefined,
		transactionDetailsIsVisible: undefined
	};

	async componentDidUpdate(prevProps) {
		if (this.props.autodismiss && !isNaN(this.props.autodismiss) && !prevProps.isVisible && this.props.isVisible) {
			setTimeout(() => {
				this.props.hideTransactionNotification();
			}, this.props.autodismiss);

			const { transactions } = this.props;
			const tx = transactions[1293];
			const [transactionElement, transactionDetails] = await decodeTransaction({ ...this.props, tx });
			// eslint-disable-next-line react/no-did-update-set-state
			this.setState({ tx, transactionElement, transactionDetails });
		}
	}

	onClose = () => {
		this.props.hideTransactionNotification();
	};

	onCloseDetails = () => {
		this.setState({ transactionDetailsIsVisible: false });
	};

	onPress = () => {
		this.setState({ transactionDetailsIsVisible: true });
	};

	render = () => {
		const { isVisible, navigation } = this.props;
		const { transactionElement, transactionDetails, tx, transactionDetailsIsVisible } = this.state;

		if (!transactionElement || !transactionDetails) return <View />;
		console.log('isVisible', isVisible);
		return (
			<View
				style={[
					styles.modalTypeView,
					!isVisible ? styles.modalTypeNotVisible : styles.modalTypeVisible,
					transactionDetailsIsVisible ? styles.transactionDetailsVisible : {}
				]}
			>
				{/* 
				style={styles.modal}
				isVisible={isVisible}
				onBackdropPress={this.onClose}
				onBackButtonPress={this.onClose}
				backdropOpacity={0.1}
				animationIn={'fadeIn'}
				animationOut={'fadeOut'}
				useNativeDriver
				underlayColor={colors.grey000}
			> */}
				{!!transactionDetailsIsVisible && (
					<View style={styles.modalView}>
						<View style={styles.modalContainer}>
							<View style={styles.titleWrapper}>
								<Text style={styles.title} onPress={this.onCloseDetails}>
									{transactionElement.actionKey}
								</Text>
								<Ionicons
									onPress={this.onCloseDetails}
									name={'ios-close'}
									size={38}
									style={styles.closeIcon}
								/>
							</View>
							<TransactionDetails
								transactionObject={tx}
								transactionDetails={transactionDetails}
								navigation={navigation}
								close={this.onClose}
							/>
						</View>
					</View>
				)}
				<View style={styles.notificationContainer}>
					<View style={styles.notificationWrapper}>
						<TransactionNotification
							message={{ type: 'pending', message: { transaction: tx } }}
							onPress={this.onPress}
							onHide={this.onClose}
						/>
					</View>
				</View>
			</View>
			// </Modal>
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
