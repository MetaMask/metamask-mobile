import React, { PureComponent } from 'react';
import { SafeAreaView, StyleSheet, Text, View, TouchableOpacity, TextInput } from 'react-native';
import PropTypes from 'prop-types';
import { getApproveNavbar } from '../../UI/Navbar';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import WebsiteIcon from '../../UI/WebsiteIcon';
import { getHost } from '../../../util/browser';
import TransactionDirection from '../TransactionDirection';
import contractMap from 'eth-contract-metadata';
import { safeToChecksumAddress, renderShortAddress } from '../../../util/address';
import Engine from '../../../core/Engine';
import ActionView from '../../UI/ActionView';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import CustomGas from '../SendFlow/CustomGas';
import ActionModal from '../../UI/ActionModal';
import { strings } from '../../../../locales/i18n';
import { setTransactionObject } from '../../../actions/transaction';
import { BNToHex } from 'gaba/dist/util';
import { renderFromWei, weiToFiatNumber } from '../../../util/number';
import { getTicker } from '../../../util/transactions';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	icon: {
		borderRadius: 32,
		height: 64,
		width: 64
	},
	section: {
		flexDirection: 'column',
		paddingHorizontal: 24,
		borderBottomWidth: 1,
		borderBottomColor: colors.grey200,
		paddingVertical: 20
	},
	title: {
		...fontStyles.normal,
		fontSize: 24,
		textAlign: 'center',
		color: colors.black,
		lineHeight: 34,
		marginVertical: 16
	},
	explanation: {
		...fontStyles.normal,
		fontSize: 14,
		textAlign: 'center',
		color: colors.grey500,
		lineHeight: 20
	},
	editPermissionText: {
		...fontStyles.bold,
		color: colors.blue,
		fontSize: 14,
		lineHeight: 20,
		textAlign: 'center',
		marginVertical: 20
	},
	viewDetailsText: {
		...fontStyles.normal,
		color: colors.blue,
		fontSize: 12,
		lineHeight: 16,
		textAlign: 'center'
	},
	actionTouchable: {
		flexDirection: 'column',
		alignItems: 'center'
	},
	websiteIconWrapper: {
		flexDirection: 'column',
		alignItems: 'center'
	},
	sectionTitleText: {
		...fontStyles.bold,
		fontSize: 14,
		marginLeft: 8
	},
	sectionTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12
	},
	sectionExplanationText: {
		...fontStyles.normal,
		fontSize: 12,
		color: colors.grey500,
		marginVertical: 6
	},
	editText: {
		...fontStyles.normal,
		color: colors.blue,
		fontSize: 12
	},
	fiatFeeText: {
		...fontStyles.bold,
		fontSize: 18,
		color: colors.black,
		textTransform: 'uppercase'
	},
	feeText: {
		...fontStyles.normal,
		fontSize: 14,
		color: colors.grey500
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	column: {
		flexDirection: 'column'
	},
	sectionLeft: {
		flex: 0.6,
		flexDirection: 'row',
		alignItems: 'center'
	},
	sectionRight: {
		flex: 0.4,
		alignItems: 'flex-end'
	},
	permissionDetails: {
		...fontStyles.normal,
		fontSize: 14,
		color: colors.black,
		marginVertical: 8
	},
	viewDetailsWrapper: {
		flexDirection: 'row',
		marginTop: 20
	},
	copyIcon: {
		marginLeft: 8
	},
	customGasModalTitle: {
		borderBottomColor: colors.grey100,
		borderBottomWidth: 1
	},
	customGasModalTitleText: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 18,
		alignSelf: 'center',
		margin: 16
	},
	option: {
		flexDirection: 'row',
		marginVertical: 8
	},
	optionText: {
		...fontStyles.normal,
		fontSize: 14,
		lineHeight: 20
	},
	touchableOption: {
		flexDirection: 'row'
	},
	selectedCircle: {
		width: 8,
		height: 8,
		borderRadius: 8 / 2,
		margin: 3,
		backgroundColor: colors.blue
	},
	outSelectedCircle: {
		width: 18,
		height: 18,
		borderRadius: 18 / 2,
		borderWidth: 2,
		borderColor: colors.blue
	},
	circle: {
		width: 18,
		height: 18,
		borderRadius: 18 / 2,
		backgroundColor: colors.white,
		opacity: 1,
		borderWidth: 2,
		borderColor: colors.grey200
	},
	input: {
		padding: 12,
		borderColor: colors.grey200,
		borderRadius: 10,
		borderWidth: 2
	},
	spendLimitContent: {
		marginLeft: 8,
		flex: 1
	},
	spendLimitWrapper: {
		margin: 24
	},
	spendLimitTitle: {
		...fontStyles.bold,
		fontSize: 14,
		lineHeight: 20,
		marginBottom: 8
	},
	spendLimitSubtitle: {
		...fontStyles.normal,
		fontSize: 12,
		lineHeight: 18,
		color: colors.grey500
	},
	textBlue: {
		color: colors.blue
	},
	textBlack: {
		color: colors.black
	}
});

/**
 * PureComponent that manages transaction approval from the dapp browser
 */
class Approve extends PureComponent {
	static navigationOptions = ({ navigation }) => getApproveNavbar('approve.title', navigation);

	static propTypes = {
		/**
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		/**
		 * Transaction state
		 */
		transaction: PropTypes.object.isRequired,
		/**
		 * Action that sets transaction attributes from object to a transaction
		 */
		setTransactionObject: PropTypes.func.isRequired,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string
	};

	state = {
		currentCustomGasSelected: 'average',
		customGasSelected: 'average',
		customGas: undefined,
		customGasPrice: undefined,
		totalGas: undefined,
		totalGasFiat: undefined,
		host: undefined,
		tokenSymbol: undefined,
		viewDetails: false,
		customGasModalVisible: false,
		editPermissionModalVisible: false,
		ticker: getTicker(this.props.ticker),
		spendLimitUnlimitedSelected: true
	};

	componentDidMount = async () => {
		const {
			transaction: { origin, to, gas, gasPrice },
			conversionRate
		} = this.props;
		const { AssetsContractController } = Engine.context;
		const host = getHost(origin);
		let tokenSymbol;
		const contract = contractMap[safeToChecksumAddress(to)];
		if (!contract) {
			tokenSymbol = await AssetsContractController.getAssetSymbol(to);
		} else {
			tokenSymbol = contract.symbol;
		}
		const totalGas = gas.mul(gasPrice);
		this.setState({
			host,
			tokenSymbol,
			totalGas: renderFromWei(totalGas),
			totalGasFiat: weiToFiatNumber(totalGas, conversionRate)
		});
	};

	onViewDetails = () => {
		const { viewDetails } = this.state;
		this.setState({ viewDetails: !viewDetails });
	};

	toggleCustomGasModal = () => {
		const { customGasModalVisible } = this.state;
		this.setState({ customGasModalVisible: !customGasModalVisible });
	};

	toggleEditPermissionModal = () => {
		const { editPermissionModalVisible } = this.state;
		this.setState({ editPermissionModalVisible: !editPermissionModalVisible });
	};

	handleSetGasFee = () => {
		const { customGas, customGasPrice, customGasSelected } = this.state;
		const { setTransactionObject, conversionRate } = this.props;

		if (!customGas || !customGasPrice) {
			this.toggleCustomGasModal();
			return;
		}
		this.setState({ gasEstimationReady: false });

		setTransactionObject({ gas: customGas, gasPrice: customGasPrice });
		// TODO enough balance for gas
		const totalGas = customGas.mul(customGasPrice);

		setTimeout(() => {
			this.setState({
				customGas: undefined,
				customGasPrice: undefined,
				gasEstimationReady: true,
				currentCustomGasSelected: customGasSelected,
				errorMessage: undefined,
				totalGas: renderFromWei(totalGas),
				totalGasFiat: weiToFiatNumber(totalGas, conversionRate)
			});
		}, 100);
		this.toggleCustomGasModal();
	};

	handleGasFeeSelection = (gas, gasPrice, customGasSelected) => {
		this.setState({ customGas: gas, customGasPrice: gasPrice, customGasSelected });
	};

	renderCustomGasModal = () => {
		const { customGasModalVisible, currentCustomGasSelected } = this.state;
		const { gas, gasPrice } = this.props.transaction;
		return (
			<ActionModal
				modalVisible={customGasModalVisible}
				confirmText={strings('transaction.set_gas')}
				cancelText={strings('transaction.cancel_gas')}
				onCancelPress={this.toggleCustomGasModal}
				onRequestClose={this.toggleCustomGasModal}
				onConfirmPress={this.handleSetGasFee}
				cancelButtonMode={'neutral'}
				confirmButtonMode={'confirm'}
			>
				<View style={baseStyles.flexGrow}>
					<View style={styles.customGasModalTitle}>
						<Text style={styles.customGasModalTitleText}>{strings('transaction.transaction_fee')}</Text>
					</View>
					<CustomGas
						selected={currentCustomGasSelected}
						handleGasFeeSelection={this.handleGasFeeSelection}
						gas={gas}
						gasPrice={gasPrice}
					/>
				</View>
			</ActionModal>
		);
	};

	onPressSpendLimitUnlimitedSelected = () => {
		this.setState({ spendLimitUnlimitedSelected: true });
	};

	onPressSpendLimitCustomSelected = () => {
		this.setState({ spendLimitUnlimitedSelected: false });
	};

	renderEditPermissionModal = () => {
		const { editPermissionModalVisible, host, spendLimitUnlimitedSelected, tokenSymbol } = this.state;
		return (
			<ActionModal
				modalVisible={editPermissionModalVisible}
				confirmText={'Save'}
				cancelText={strings('transaction.cancel_gas')}
				onCancelPress={this.toggleCustomGasModal}
				onRequestClose={this.toggleCustomGasModal}
				onConfirmPress={this.handleSetGasFee}
				cancelButtonMode={'neutral'}
				confirmButtonMode={'confirm'}
				displayCancelButton={false}
			>
				<View style={baseStyles.flexGrow}>
					<View style={styles.customGasModalTitle}>
						<Text style={styles.customGasModalTitleText}>Edit Permission</Text>
					</View>
					<View style={styles.spendLimitWrapper}>
						<Text style={styles.spendLimitTitle}>Spend limit permission</Text>
						<Text
							style={styles.spendLimitSubtitle}
						>{`Allow ${host} to withdraw and spend up to the following amount:`}</Text>

						<View style={styles.option}>
							<TouchableOpacity
								onPress={this.onPressSpendLimitUnlimitedSelected}
								style={styles.touchableOption}
							>
								{spendLimitUnlimitedSelected ? (
									<View style={styles.outSelectedCircle}>
										<View style={styles.selectedCircle} />
									</View>
								) : (
									<View style={styles.circle} />
								)}
							</TouchableOpacity>
							<View style={styles.spendLimitContent}>
								<Text
									style={[
										styles.optionText,
										spendLimitUnlimitedSelected ? styles.textBlue : styles.textBlack
									]}
								>
									{'Unlimited'}
								</Text>
								<Text style={styles.sectionExplanationText}>
									{`Spend limit requested by`}
									<Text style={fontStyles.bold}>{` ${host}`}</Text>
								</Text>
								<Text style={styles.optionText}>{`100 ${tokenSymbol}`}</Text>
							</View>
						</View>

						<View style={styles.option}>
							<TouchableOpacity
								onPress={this.onPressSpendLimitCustomSelected}
								style={styles.touchableOption}
							>
								{spendLimitUnlimitedSelected ? (
									<View style={styles.circle} />
								) : (
									<View style={styles.outSelectedCircle}>
										<View style={styles.selectedCircle} />
									</View>
								)}
							</TouchableOpacity>
							<View style={styles.spendLimitContent}>
								<Text
									style={[
										styles.optionText,
										!spendLimitUnlimitedSelected ? styles.textBlue : styles.textBlack
									]}
								>
									{'Custom spend limit'}
								</Text>
								<Text style={styles.sectionExplanationText}>{`Enter a max spend limit`}</Text>
								<TextInput
									autoCapitalize="none"
									autoCorrect={false}
									onChangeText={this.onChange}
									placeholder={`100 ${tokenSymbol}`}
									placeholderTextColor={colors.grey100}
									spellCheck={false}
									editable={!spendLimitUnlimitedSelected}
									style={styles.input}
									// value={value}
									numberOfLines={1}
									// onBlur={this.onBlur}
									// onFocus={this.onInputFocus}
									// onSubmitEditing={this.onFocus}
								/>
								<Text style={styles.sectionExplanationText}>{`1.00 ${tokenSymbol} minimum`}</Text>
							</View>
						</View>
					</View>
				</View>
			</ActionModal>
		);
	};

	prepareTransaction = transaction => ({
		...transaction,
		gas: BNToHex(transaction.gas),
		gasPrice: BNToHex(transaction.gasPrice),
		value: BNToHex(transaction.value),
		to: safeToChecksumAddress(transaction.to)
	});

	onConfirm = () => {
		console.log('prepared', this.prepareTransaction(this.props.transaction));
	};

	render = () => {
		const { transaction, currentCurrency } = this.props;
		const { host, tokenSymbol, viewDetails, totalGas, totalGasFiat, ticker } = this.state;
		return (
			<SafeAreaView style={styles.wrapper}>
				<TransactionDirection />
				<ActionView
					cancelText={'Cancel'}
					confirmText={'Approve'}
					onCancelPress={this.onCancel}
					onConfirmPress={this.onConfirm}
					confirmButtonMode={'confirm'}
				>
					<View>
						<View style={styles.section}>
							<View style={styles.websiteIconWrapper}>
								<WebsiteIcon style={styles.icon} url={transaction.origin} title={host} />
							</View>
							<Text style={styles.title}>{`Allow ${host} to access your ${tokenSymbol}?`}</Text>
							<Text
								style={styles.explanation}
							>{`Do you trust this site? By granting this permission, you're allowing ${host} to withdraw you ${tokenSymbol} and automate transactions for you.`}</Text>
							<TouchableOpacity style={styles.actionTouchable} onPress={this.toggleEditPermissionModal}>
								<Text style={styles.editPermissionText}>Edit permission</Text>
							</TouchableOpacity>
						</View>
						<View style={styles.section}>
							<View style={styles.sectionTitleRow}>
								<FontAwesome5 name={'tag'} size={20} color={colors.grey500} />
								<Text style={[styles.sectionTitleText, styles.sectionLeft]}>Transaction fee</Text>
								<TouchableOpacity style={styles.sectionRight} onPress={this.toggleCustomGasModal}>
									<Text style={styles.editText}>Edit</Text>
								</TouchableOpacity>
							</View>
							<View style={styles.row}>
								<View style={[styles.sectionLeft]}>
									<Text style={[styles.sectionExplanationText]}>
										A transaction fee is associated with this permission. Learn why
									</Text>
								</View>
								<View style={[styles.column, styles.sectionRight]}>
									<Text style={styles.fiatFeeText}>{`${totalGasFiat} ${currentCurrency}`}</Text>
									<Text style={styles.feeText}>{`${totalGas} ${ticker}`}</Text>
								</View>
							</View>
							<TouchableOpacity style={styles.actionTouchable} onPress={this.onViewDetails}>
								<View style={styles.viewDetailsWrapper}>
									<Text style={styles.viewDetailsText}>View details</Text>
									<IonicIcon
										name={`ios-arrow-${viewDetails ? 'up' : 'down'}`}
										size={16}
										color={colors.blue}
										style={styles.copyIcon}
									/>
								</View>
							</TouchableOpacity>
						</View>

						{viewDetails && (
							<View style={styles.section}>
								<View style={styles.sectionTitleRow}>
									<FontAwesome5 name={'user-check'} size={20} color={colors.grey500} />
									<Text style={[styles.sectionTitleText, styles.sectionLeft]}>
										Permission request
									</Text>
									<TouchableOpacity
										style={styles.sectionRight}
										onPress={this.toggleEditPermissionModal}
									>
										<Text style={styles.editText}>Edit</Text>
									</TouchableOpacity>
								</View>
								<View style={styles.row}>
									<Text
										style={[styles.sectionExplanationText]}
									>{`${host} may access and spend p to this max amount from this account.`}</Text>
								</View>
								<Text style={styles.permissionDetails}>
									<Text style={fontStyles.bold}>Amount: </Text>
									{`100 ${tokenSymbol}`}
								</Text>
								<View style={styles.row}>
									<Text style={styles.permissionDetails}>
										<Text style={fontStyles.bold}>To: </Text>
										{`Contract (${renderShortAddress(transaction.to)})`}
									</Text>
									<FontAwesome name="copy" size={16} color={colors.blue} style={styles.copyIcon} />
								</View>
							</View>
						)}

						{viewDetails && (
							<View style={styles.section}>
								<View style={styles.sectionTitleRow}>
									<FontAwesome5 solid name={'file-alt'} size={20} color={colors.grey500} />
									<Text style={[styles.sectionTitleText, styles.sectionLeft]}>Data</Text>
								</View>
								<View style={styles.row}>
									<Text style={[styles.sectionExplanationText]}>{`Function: Approve`}</Text>
								</View>
								<Text style={styles.sectionExplanationText}>{transaction.data}</Text>
							</View>
						)}
						{this.renderCustomGasModal()}
						{this.renderEditPermissionModal()}
					</View>
				</ActionView>
			</SafeAreaView>
		);
	};
}

const mapStateToProps = state => ({
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	transaction: state.transaction
});

const mapDispatchToProps = dispatch => ({
	setTransactionObject: transaction => dispatch(setTransactionObject(transaction))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Approve);
