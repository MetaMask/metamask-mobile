import React, { useState } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import StyledButton from '../StyledButton';
import { StyleSheet, View, TouchableOpacity, Text, ScrollView } from 'react-native';
import TransactionHeader from '../TransactionHeader';
import { strings } from '../../../../locales/i18n';
import { colors, fontStyles } from '../../../styles/common';
import Device from '../../../util/Device';
import Icon from 'react-native-vector-icons/FontAwesome';
import Alert from '../../Base/Alert';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import { withNavigation } from 'react-navigation';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		paddingTop: 24,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		minHeight: 200,
		paddingBottom: Device.isIphoneX() ? 20 : 0
	},
	accountCardWrapper: {
		borderWidth: 1,
		borderColor: colors.grey200,
		borderRadius: 10,
		padding: 16,
		margin: 24
	},
	intro: {
		...fontStyles.bold,
		textAlign: 'center',
		color: colors.fontPrimary,
		fontSize: Device.isSmallDevice() ? 18 : 24,
		marginBottom: 16,
		marginTop: 16,
		marginRight: 24,
		marginLeft: 24
	},
	bold: {
		...fontStyles.bold
	},
	warning: {
		...fontStyles.normal,
		color: colors.fontPrimary,
		paddingHorizontal: 24,
		fontSize: 13,
		width: '100%',
		textAlign: 'center',
		paddingBottom: 12
	},
	warningSubtext: {
		lineHeight: 20,
		...fontStyles.normal,
		color: colors.fontPrimary,
		paddingHorizontal: 24,
		fontSize: 13,
		width: '100%',
		textAlign: 'center'
	},
	actionContainer: {
		flex: 0,
		flexDirection: 'row',
		padding: 24
	},
	button: {
		flex: 1
	},
	cancel: {
		marginRight: 8
	},
	confirm: {
		marginLeft: 8
	},
	actionTouchable: {
		flexDirection: 'column',
		alignItems: 'center'
	},
	viewDetailsText: {
		...fontStyles.bold,
		color: colors.blue,
		fontSize: 12,
		lineHeight: 16,
		textAlign: 'center'
	},
	textSection: {
		flexDirection: 'row',
		paddingBottom: 7
	},
	textSectionLast: {
		flexDirection: 'row'
	},
	networkInfoTitle: {
		...fontStyles.normal,
		paddingRight: 10,
		fontSize: 12
	},
	networkInfoValue: {
		...fontStyles.bold,
		flex: 1,
		textAlign: 'right',
		fontSize: 13
	},
	link: {
		color: colors.blue
	},
	detailsTitle: {
		textAlign: 'center',
		...fontStyles.bold,
		fontSize: 14
	},
	detailsBackButton: {
		height: 24,
		width: 24,
		justifyContent: 'space-around',
		alignItems: 'center',
		textAlign: 'center',
		padding: 24
	},
	detailsBackIcon: {
		width: 24,
		height: 24,
		color: colors.black,
		textAlign: 'center'
	},
	detailsContainer: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	flexAux: {
		flex: 1
	},
	alertText: {
		...fontStyles.normal,
		fontSize: 14
	},
	alertContainer: {
		marginHorizontal: 24,
		marginBottom: 16
	},
	alertIcon: {
		fontSize: 20,
		...fontStyles.bold,
		color: colors.yellow
	},
	alertTextContainer: {
		paddingLeft: 6
	}
});

/**
 * Account access approval component
 */
const AddCustomNetwork = ({ customNetworkInformation, currentPageInformation, navigation, onCancel, onConfirm }) => {
	const [viewDetails, setViewDetails] = useState(false);

	/**
	 * Calls onConfirm callback and analytics to track connect confirmed event
	 */
	const confirm = () => {
		onConfirm && onConfirm();
	};

	/**
	 * Calls onConfirm callback and analytics to track connect canceled event
	 */
	const cancel = () => {
		onCancel && onCancel();
	};

	/**
	 * Toggle network details
	 */
	const toggleViewDetails = () => {
		setViewDetails(viewDetails => !viewDetails);
	};

	const renderNetworkInfo = moreDetails => (
		<View style={styles.accountCardWrapper}>
			<View style={styles.textSection}>
				<Text style={styles.networkInfoTitle}>{strings('add_custom_network.display_name')}</Text>
				<Text style={styles.networkInfoValue}>{customNetworkInformation.chainName}</Text>
			</View>
			<View style={styles.textSection}>
				<Text style={styles.networkInfoTitle}>{strings('add_custom_network.chain_id')}</Text>
				<Text style={styles.networkInfoValue}>{customNetworkInformation.chainId}</Text>
			</View>
			<View style={moreDetails ? styles.textSection : styles.textSectionLast}>
				<Text style={styles.networkInfoTitle}>{strings('add_custom_network.network_url')}</Text>
				<Text style={styles.networkInfoValue}>{customNetworkInformation.rpcUrl}</Text>
			</View>
			{moreDetails ? (
				<View>
					<View style={styles.textSection}>
						<Text style={styles.networkInfoTitle}>{strings('add_custom_network.currency_symbol')}</Text>
						<Text style={styles.networkInfoValue}>{customNetworkInformation.ticker}</Text>
					</View>
					<View style={styles.textSectionLast}>
						<Text style={styles.networkInfoTitle}>{strings('add_custom_network.block_explorer_url')}</Text>
						<Text style={styles.networkInfoValue}>{customNetworkInformation.blockExplorerUrl}</Text>
					</View>
				</View>
			) : null}
		</View>
	);

	const renderDetails = () => (
		<View>
			<View style={styles.detailsContainer}>
				<View style={styles.flexAux}>
					<TouchableOpacity
						onPress={toggleViewDetails}
						style={styles.detailsBackButton}
						testID={'go-back-button'}
					>
						<Icon name="angle-left" size={24} style={styles.detailsBackIcon} />
					</TouchableOpacity>
				</View>
				<Text style={styles.detailsTitle}>{strings('add_custom_network.details_title')}</Text>
				<View style={styles.flexAux} />
			</View>
			{renderNetworkInfo(true)}
		</View>
	);

	const openLink = () => {
		cancel();
		navigation.navigate('SimpleWebview', { url: 'https://chainid.network' });
	};

	const renderAlert = () => {
		if (!customNetworkInformation.alert) return null;
		let alertText;
		if (customNetworkInformation.alert === 'INVALID_CHAIN') {
			alertText = strings('add_custom_network.invalid_chain', { rpcUrl: customNetworkInformation.rpcUrl });
		}
		if (customNetworkInformation.alert === 'UNRECOGNIZED_CHAIN') {
			alertText = strings('add_custom_network.unrecognized_chain');
		}

		return (
			<Alert
				type={'warning'}
				testID={'error-message-warning'}
				style={styles.alertContainer}
				renderIcon={() => <EvilIcons name="bell" style={styles.alertIcon} />}
			>
				<View style={styles.alertTextContainer}>
					<Text style={styles.alertText}>
						<Text style={styles.bold}>
							{alertText}
							{'\n'}
						</Text>
						<Text>
							{strings('add_custom_network.alert_recommend')}{' '}
							<Text onPress={openLink} style={styles.link}>
								{strings('add_custom_network.alert_verify')}
							</Text>
							.
						</Text>
					</Text>
				</View>
			</Alert>
		);
	};

	const renderApproval = () => (
		<ScrollView>
			<TransactionHeader currentPageInformation={currentPageInformation} />
			<Text style={styles.intro}>{strings('add_custom_network.title')}</Text>
			<Text style={styles.warning}>{strings('add_custom_network.warning')}</Text>
			<Text style={styles.warningSubtext}>
				<Text style={styles.bold}>{strings('add_custom_network.warning_subtext_1')}</Text>{' '}
				{strings('add_custom_network.warning_subtext_2')}
				<Text style={styles.link}> {strings('add_custom_network.warning_subtext_3')}</Text>.
			</Text>
			{renderNetworkInfo()}
			{renderAlert()}
			<TouchableOpacity style={styles.actionTouchable} onPress={toggleViewDetails}>
				<View style={styles.viewDetailsWrapper}>
					<Text style={styles.viewDetailsText}>{strings('spend_limit_edition.view_details')}</Text>
				</View>
			</TouchableOpacity>
			<View style={styles.actionContainer}>
				<StyledButton
					type={'cancel'}
					onPress={cancel}
					containerStyle={[styles.button, styles.cancel]}
					testID={'connect-cancel-button'}
				>
					{strings('spend_limit_edition.cancel')}
				</StyledButton>
				<StyledButton
					type={'confirm'}
					onPress={confirm}
					containerStyle={[styles.button, styles.confirm]}
					testID={'connect-approve-button'}
				>
					{strings('spend_limit_edition.approve')}
				</StyledButton>
			</View>
		</ScrollView>
	);

	return <View style={styles.root}>{viewDetails ? renderDetails() : renderApproval()}</View>;
};

AddCustomNetwork.propTypes = {
	/**
	 * Object containing current page title, url, and icon href
	 */
	currentPageInformation: PropTypes.object,
	/**
	 * Callback triggered on account access approval
	 */
	onConfirm: PropTypes.func,
	/**
	 * Callback triggered on account access rejection
	 */
	onCancel: PropTypes.func,
	/**
	 * Object containing info of the network to add
	 */
	customNetworkInformation: PropTypes.object,
	/**
	 * Object that represents the navigator
	 */
	navigation: PropTypes.object
};

const mapStateToProps = state => ({});

export default connect(mapStateToProps)(withNavigation(AddCustomNetwork));
