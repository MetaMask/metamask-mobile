import React, { PureComponent } from 'react';
import { SafeAreaView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';
import { getApproveNavbar } from '../../UI/Navbar';
import { colors, fontStyles } from '../../../styles/common';
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
		marginBottom: 8
	},
	editText: {
		...fontStyles.normal,
		color: colors.blue,
		fontSize: 12
	},
	fiatFeeText: {
		...fontStyles.bold,
		fontSize: 18,
		color: colors.black
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
		flex: 0.7,
		flexDirection: 'row',
		alignItems: 'center'
	},
	sectionRight: {
		flex: 0.3,
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
	}
});

/**
 * PureComponent that manages transaction approval from the dapp browser
 */
class Approve extends PureComponent {
	static navigationOptions = ({ navigation }) => getApproveNavbar('approve.title', navigation);

	static propTypes = {
		/**
		 * Transaction state
		 */
		transaction: PropTypes.object.isRequired
	};

	state = {
		host: undefined,
		tokenSymbol: undefined,
		viewDetails: false
	};

	componentDidMount = async () => {
		const {
			transaction: { origin, to }
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
		this.setState({ host, tokenSymbol });
	};

	onViewDetails = () => {
		const { viewDetails } = this.state;
		this.setState({ viewDetails: !viewDetails });
	};

	render = () => {
		const { transaction } = this.props;
		const { host, tokenSymbol, viewDetails } = this.state;
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
							<TouchableOpacity style={styles.actionTouchable}>
								<Text style={styles.editPermissionText}>Edit permission</Text>
							</TouchableOpacity>
						</View>
						<View style={styles.section}>
							<View style={styles.sectionTitleRow}>
								<FontAwesome5 name={'tag'} size={20} color={colors.grey500} />
								<Text style={[styles.sectionTitleText, styles.sectionLeft]}>Transaction fee</Text>
								<TouchableOpacity style={styles.sectionRight}>
									<Text style={styles.editText}>Edit</Text>
								</TouchableOpacity>
							</View>
							<View style={styles.row}>
								<View style={[styles.sectionLeft, styles.row]}>
									<Text style={[styles.sectionExplanationText]}>
										A transaction fee is associated ith this permission. Learn why
									</Text>
								</View>
								<View style={[styles.column, styles.sectionRight]}>
									<Text style={styles.fiatFeeText}>$fiat</Text>
									<Text style={styles.feeText}>fee</Text>
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
									<TouchableOpacity style={styles.sectionRight}>
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
					</View>
				</ActionView>
			</SafeAreaView>
		);
	};
}

const mapStateToProps = state => ({
	transaction: state.transaction
});

export default connect(mapStateToProps)(Approve);
