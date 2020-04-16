import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import WebsiteIcon from '../WebsiteIcon';
import { getHost, getUrlObj } from '../../../util/browser';
import networkList from '../../../util/networks';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

const styles = StyleSheet.create({
	transactionHeader: {
		marginHorizontal: 10,
		marginTop: 10,
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
		marginRight: 5
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
		color: colors.black,
		textTransform: 'capitalize'
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
		 * Object representing the status of infura networks
		 */
		networkStatus: PropTypes.object
	};

	/**
	 * Returns a small circular indicator, red if the current selected network is offline, green if it's online.
	 *=
	 * @return {element} - JSX view element
	 */
	renderNetworkStatusIndicator = () => {
		const { networkType, networkStatus } = this.props;
		const networkStatusIndicatorColor = networkStatus[networkType] === 'ok' ? 'green' : 'red';
		const networkStatusIndicator = (
			<View style={[styles.networkStatusIndicator, { backgroundColor: networkStatusIndicatorColor }]} />
		);
		return networkStatusIndicator;
	};

	/**
	 * Returns a secure icon next to the dApp URL. Lock for https protocol, warning sign otherwise.
	 *=
	 * @return {element} - JSX image element
	 */
	renderSecureIcon = () => {
		const { url } = this.props.currentPageInformation;
		const secureIcon =
			getUrlObj(url).protocol === 'https:' ? (
				<FontAwesome name={'lock'} size={15} style={styles.secureIcon} />
			) : (
				<FontAwesome name={'warning'} size={15} style={styles.secureIcon} />
			);
		return secureIcon;
	};

	render() {
		const {
			currentPageInformation: { url },
			networkType
		} = this.props;
		const title = getHost(url);
		const networkName = networkList[networkType].shortName;
		return (
			<View style={styles.transactionHeader}>
				<WebsiteIcon style={styles.domainLogo} viewStyle={styles.assetLogo} title={title} url={url} />
				<View style={styles.domanUrlContainer}>
					{this.renderSecureIcon()}
					<Text style={styles.domainUrl}>{title}</Text>
				</View>
				<View style={styles.networkContainer}>
					{this.renderNetworkStatusIndicator()}
					<Text style={styles.network}>{networkName}</Text>
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
