import React, { PureComponent } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import PropTypes from 'prop-types';
import { getApproveNavbar } from '../../UI/Navbar';
import { colors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import WebsiteIcon from '../../UI/WebsiteIcon';
import { getHost } from '../../../util/browser';
import TransactionDirection from '../TransactionDirection';

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
	basicInformation: {
		flexDirection: 'column',
		marginHorizontal: 20
	},
	title: {
		...fontStyles.normal,
		fontSize: 24,
		textAlign: 'center',
		marginBottom: 16,
		color: colors.black
	},
	explanation: {
		...fontStyles.normal,
		fontSize: 14,
		textAlign: 'center',
		color: colors.grey500
	},
	websiteIconWrapper: {
		flexDirection: 'column',
		alignItems: 'center',
		marginVertical: 16
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
		host: undefined
	};

	componentDidMount = () => {
		const { transaction } = this.props;
		const host = getHost(transaction.origin);
		this.setState({ host });
	};

	render = () => {
		const { transaction } = this.props;
		const { host } = this.state;
		return (
			<SafeAreaView style={styles.wrapper}>
				<TransactionDirection />
				<View style={styles.basicInformation}>
					<View style={styles.websiteIconWrapper}>
						<WebsiteIcon style={styles.icon} url={transaction.origin} title={getHost(transaction.origin)} />
					</View>
					<Text style={styles.title}>{`Allow ${host} to access your WHATEVER?`}</Text>
					<Text
						style={styles.explanation}
					>{`Do you trust this site? By granting this permission, you're allowing ${host} to withdraw you WHATEVER and automate transactions for you.`}</Text>
				</View>
			</SafeAreaView>
		);
	};
}

const mapStateToProps = state => ({
	transaction: state.transaction
});

export default connect(mapStateToProps)(Approve);
