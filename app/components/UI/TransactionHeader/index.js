import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, Image } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import WebsiteIcon from '../WebsiteIcon';
import { getHost, getUrlObj } from '../../../util/browser';
import lockIcon from '../../../images/lock-icon.png';
import warningIcon from '../../../images/warning-icon.png';

const styles = StyleSheet.create({
	transactionHeader: {
		margin: 10,
		justifyContent: 'center',
		alignItems: 'center'
	},
	domainLogo: {
		marginTop: 15,
		width: 64,
		height: 64,
		borderRadius: 32
	},
	assetLogo: {
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 10
	},
	domanUrlContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		marginTop: 10
	},
	secureIcon: {
		width: 15,
		height: 15,
		marginRight: 5,
		marginBottom: 3
	},
	domainUrl: {
		...fontStyles.bold,
		textAlign: 'center',
		fontSize: 14,
		color: colors.black
	},
	networkContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		marginBottom: 12
	},
	networkStatusIndicator: {
		borderRadius: 2.5,
		height: 5,
		width: 5
	},
	network: {
		...fontStyles.normal,
		textAlign: 'center',
		fontSize: 12,
		padding: 5,
		color: colors.black
	},
	functionNameWrapper: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	functionName: {
		...fontStyles.light,
		height: 20,
		borderWidth: 1,
		borderRadius: 10,
		paddingTop: 3,
		paddingLeft: 6,
		paddingRight: 6,
		borderColor: colors.grey100,
		textAlign: 'center',
		fontSize: 10
	}
});

/**
 * PureComponent that renders the transaction header used for signing, granting permissions and sending
 */
class TransactionHeader extends PureComponent {
	static propTypes = {
		/**
		 * Object containing current page title and url
		 */
		currentPageInformation: PropTypes.object,
		/**
		 * String representing the selected network
		 */
		networkType: PropTypes.string,
		/**
		 * String representing signature type
		 */
		type: PropTypes.string,
		/**
		 * Object representing the status of infura networks
		 */
		networkStatus: PropTypes.object
	};

	/**
	 * Returns corresponding tracking params to send
	 *=
	 * @return {object} - Object containing network and functionType
	 */
	getTrackingParams = () => {
		const { networkType, networkStatus, type } = this.props;
		return {
			network: networkType,
			status: networkStatus,
			functionType: type
		};
	};

	render() {
		const {
			currentPageInformation: { url }
		} = this.props;
		const title = getHost(url);
		const network = this.getTrackingParams().network;
		const networkStatusIndicatorColor = this.getTrackingParams().status[network] === 'ok' ? 'green' : 'red';
		const networkStatusIndicator = (
			<View style={[styles.networkStatusIndicator, { backgroundColor: networkStatusIndicatorColor }]} />
		);
		const secureIcon = getUrlObj(url).protocol === 'https:' ? lockIcon : warningIcon;
		const capitalizedNetwork = network.charAt(0).toUpperCase() + network.slice(1);
		return (
			<View style={styles.transactionHeader}>
				<WebsiteIcon style={styles.domainLogo} viewStyle={styles.assetLogo} title={title} url={url} />
				<View style={styles.domanUrlContainer}>
					<Image style={styles.secureIcon} source={secureIcon} resizeMode="contain" resizeMethod="resize" />
					<Text style={styles.domainUrl}>{title}</Text>
				</View>
				<View style={styles.networkContainer}>
					{networkStatusIndicator}
					<Text style={styles.network}>{capitalizedNetwork}</Text>
				</View>
				<View style={styles.functionNameWrapper}>
					<Text style={styles.functionName}>{'functionName'}</Text>
				</View>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	networkType: state.engine.backgroundState.NetworkController.provider.type,
	networkStatus: state.engine.backgroundState.NetworkStatusController.networkStatus.infura
});

export default connect(mapStateToProps)(TransactionHeader);
