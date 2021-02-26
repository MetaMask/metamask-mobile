import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import StyledButton from '../StyledButton';
import { StyleSheet, Text, View } from 'react-native';
import TransactionHeader from '../TransactionHeader';
import { strings } from '../../../../locales/i18n';
import { colors, fontStyles } from '../../../styles/common';
import Device from '../../../util/Device';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		paddingTop: 24,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		minHeight: 200,
		paddingBottom: Device.isIphoneX() ? 20 : 0
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
	warning: {
		...fontStyles.normal,
		color: colors.fontPrimary,
		paddingHorizontal: 24,
		fontSize: 13,
		width: '100%',
		textAlign: 'center',
		paddingBottom: 16
	},
	actionContainer: noMargin => ({
		flex: 0,
		flexDirection: 'row',
		padding: 24,
		marginTop: noMargin ? 0 : 20
	}),
	button: {
		flex: 1
	},
	cancel: {
		marginRight: 8
	},
	confirm: {
		marginLeft: 8
	},
	otherNetworkIcon: {
		backgroundColor: colors.grey100,
		borderColor: colors.grey100,
		borderWidth: 2,
		width: 13,
		height: 13,
		borderRadius: 100,
		marginRight: 10,
		marginTop: 1
	},
	networkContainer: {
		alignItems: 'center'
	},
	networkBadge: {
		flexDirection: 'row',
		borderColor: colors.grey200,
		borderRadius: 100,
		borderWidth: 1,
		padding: 10
	},
	networkText: {
		...fontStyles.normal,
		fontSize: 12
	},
	bold: {
		...fontStyles.bold
	},
	light: {
		color: colors.grey500
	}
});

/**
 * Account access approval component
 */
const SwitchCustomNetwork = ({ customNetworkInformation, currentPageInformation, onCancel, onConfirm, type }) => {
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

	return (
		<View style={styles.root}>
			{type === 'switch' ? <TransactionHeader currentPageInformation={currentPageInformation} /> : null}
			<Text style={styles.intro}>
				{type === 'switch'
					? strings('switch_custom_network.title_existing_network')
					: strings('switch_custom_network.title_new_network')}
			</Text>
			<Text style={styles.warning}>
				{type === 'switch' ? (
					strings('switch_custom_network.switch_warning')
				) : (
					<Text>
						<Text style={styles.bold}>{`"${customNetworkInformation.chainName}"`}</Text>
						<Text style={styles.light}> {strings('switch_custom_network.available')}</Text>
					</Text>
				)}
			</Text>
			{type === 'switch' ? (
				<View style={styles.networkContainer}>
					<View style={styles.networkBadge}>
						<View style={styles.otherNetworkIcon} />
						<Text style={styles.networkText}>{customNetworkInformation.chainName}</Text>
					</View>
				</View>
			) : null}
			<View style={styles.actionContainer(type === 'new')}>
				<StyledButton
					type={'cancel'}
					onPress={cancel}
					containerStyle={[styles.button, styles.cancel]}
					testID={'connect-cancel-button'}
				>
					{strings('switch_custom_network.cancel')}
				</StyledButton>
				<StyledButton
					type={'confirm'}
					onPress={confirm}
					containerStyle={[styles.button, styles.confirm]}
					testID={'connect-approve-button'}
				>
					{strings('switch_custom_network.switch')}
				</StyledButton>
			</View>
		</View>
	);
};

SwitchCustomNetwork.propTypes = {
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
	 * String representing if it's an existing or a newly added network
	 */
	type: PropTypes.string
};

const mapStateToProps = state => ({});

export default connect(mapStateToProps)(SwitchCustomNetwork);
