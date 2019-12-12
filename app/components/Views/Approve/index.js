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
import { safeToChecksumAddress } from '../../../util/address';
import Engine from '../../../core/Engine';

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
	basicInformationSection: {
		flexDirection: 'column',
		paddingHorizontal: 24,
		marginVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: colors.grey200
	},
	title: {
		...fontStyles.normal,
		fontSize: 24,
		textAlign: 'center',
		marginBottom: 16,
		color: colors.black,
		lineHeight: 34
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
		textAlign: 'center'
	},
	editPermissionTouchable: {
		flexDirection: 'column',
		alignItems: 'center',
		marginVertical: 22
	},
	websiteIconWrapper: {
		flexDirection: 'column',
		alignItems: 'center',
		marginBottom: 16
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
		tokenSymbol: undefined
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

	render = () => {
		const { transaction } = this.props;
		const { host, tokenSymbol } = this.state;
		return (
			<SafeAreaView style={styles.wrapper}>
				<TransactionDirection />
				<View style={styles.basicInformationSection}>
					<View style={styles.websiteIconWrapper}>
						<WebsiteIcon style={styles.icon} url={transaction.origin} title={host} />
					</View>
					<Text style={styles.title}>{`Allow ${host} to access your ${tokenSymbol}?`}</Text>
					<Text
						style={styles.explanation}
					>{`Do you trust this site? By granting this permission, you're allowing ${host} to withdraw you ${tokenSymbol} and automate transactions for you.`}</Text>
					<TouchableOpacity style={styles.editPermissionTouchable}>
						<Text style={styles.editPermissionText}>Edit permission</Text>
					</TouchableOpacity>
				</View>
				<View style={styles.transactionFeeSection} />
			</SafeAreaView>
		);
	};
}

const mapStateToProps = state => ({
	transaction: state.transaction
});

export default connect(mapStateToProps)(Approve);
