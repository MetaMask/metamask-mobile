import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import WebsiteIcon from '../WebsiteIcon';
import { getHost, getUrlObj } from '../../../util/browser';
import networkList from '../../../util/networks';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import AppConstants from '../../../core/AppConstants';
import { renderShortAddress } from '../../../util/address';

const { ORIGIN_DEEPLINK, ORIGIN_QR_CODE } = AppConstants.DEEPLINKS;

const styles = StyleSheet.create({
	transactionHeader: {
		justifyContent: 'center',
		alignItems: 'center'
	},
	domainLogo: {
		width: 56,
		height: 56,
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
		flexDirection: 'row'
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
	},
	deeplinkIconContainer: {
		borderWidth: 1,
		borderColor: colors.grey600,
		width: 56,
		height: 56,
		borderRadius: 38
	},
	deeplinkIcon: {
		alignSelf: 'center',
		lineHeight: 56
	}
});

/**
 * PureComponent that renders the transaction header used for signing, granting permissions and sending
 */
const TransactionHeader = props => {
	const originIsDeeplink =
		props.currentPageInformation.origin === ORIGIN_DEEPLINK ||
		props.currentPageInformation.origin === ORIGIN_QR_CODE;
	/**
	 * Returns a small circular indicator, red if the current selected network is offline, green if it's online.
	 *
	 * @return {element} - JSX view element
	 */
	const renderNetworkStatusIndicator = () => {
		const { networkType } = props;
		const networkStatusIndicatorColor = (networkList[networkType] && networkList[networkType].color) || colors.red;
		const networkStatusIndicator = (
			<View style={[styles.networkStatusIndicator, { backgroundColor: networkStatusIndicatorColor }]} />
		);
		return networkStatusIndicator;
	};

	/**
	 * Returns a secure icon next to the dApp URL. Lock for https protocol, warning sign otherwise.
	 *
	 * @return {element} - JSX image element
	 */
	const renderSecureIcon = () => {
		if (originIsDeeplink) return null;
		const { url } = props.currentPageInformation;
		const name = getUrlObj(url).protocol === 'https:' ? 'lock' : 'warning';
		return <FontAwesome name={name} size={15} style={styles.secureIcon} />;
	};

	const renderTopIcon = () => {
		const { url, currentEnsName, icon, origin } = props.currentPageInformation;
		if (originIsDeeplink) {
			return (
				<View style={styles.deeplinkIconContainer}>
					<FontAwesome
						style={styles.deeplinkIcon}
						name={origin === ORIGIN_DEEPLINK ? 'link' : 'qrcode'}
						size={32}
						color={colors.grey600}
					/>
				</View>
			);
		}
		return (
			<WebsiteIcon
				style={styles.domainLogo}
				viewStyle={styles.assetLogo}
				title={getHost(currentEnsName || url)}
				url={currentEnsName || url}
				icon={icon}
			/>
		);
	};

	const renderTitle = () => {
		const { url, currentEnsName, spenderAddress } = props.currentPageInformation;
		let title = '';
		if (originIsDeeplink) title = renderShortAddress(spenderAddress);
		else title = getHost(currentEnsName || url);

		return <Text style={styles.domainUrl}>{title}</Text>;
	};

	const networkName = networkList[props.networkType].shortName;

	return (
		<View style={styles.transactionHeader}>
			{renderTopIcon()}
			<View style={styles.domanUrlContainer}>
				{renderSecureIcon()}
				{renderTitle()}
			</View>
			<View style={styles.networkContainer}>
				{renderNetworkStatusIndicator()}
				<Text style={styles.network}>{networkName}</Text>
			</View>
		</View>
	);
};

TransactionHeader.propTypes = {
	/**
	 * Object containing current page title and url
	 */
	currentPageInformation: PropTypes.object,
	/**
	 * String representing the selected network
	 */
	networkType: PropTypes.string
};

const mapStateToProps = state => ({
	networkType: state.engine.backgroundState.NetworkController.provider.type,
	networkStatus: state.engine.backgroundState.NetworkStatusController.networkStatus.infura
});

export default connect(mapStateToProps)(TransactionHeader);
