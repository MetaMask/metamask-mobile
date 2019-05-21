import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import ActionView from '../ActionView';
import ElevatedView from 'react-native-elevated-view';
import Identicon from '../Identicon';
import { strings } from '../../../../locales/i18n';
import { colors, fontStyles } from '../../../styles/common';
import DeviceSize from '../../../util/DeviceSize';
import WebsiteIcon from '../WebsiteIcon';
import { renderAccountName } from '../../../util/address';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		minHeight: '70%',
		paddingBottom: DeviceSize.isIphoneX() ? 20 : 0
	},
	wrapper: {
		paddingHorizontal: 25
	},
	title: {
		...fontStyles.bold,
		color: colors.fontPrimary,
		fontSize: 14,
		marginVertical: 24,
		textAlign: 'center'
	},
	intro: {
		...fontStyles.normal,
		textAlign: 'center',
		color: colors.fontPrimary,
		fontSize: 20,
		marginVertical: 24
	},
	total: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 25
	},
	totalText: {
		textAlign: 'left',
		...fontStyles.bold,
		color: colors.fontPrimary,
		fontSize: 25
	},
	totalPrice: {
		textAlign: 'right',
		...fontStyles.bold,
		color: colors.fontPrimary,
		fontSize: 25
	},
	permissions: {
		alignItems: 'center',
		borderBottomWidth: 1,
		borderColor: colors.grey100,
		borderTopWidth: 1,
		display: 'flex',
		flexDirection: 'row',
		paddingHorizontal: 8,
		paddingVertical: 16
	},
	permissionText: {
		...fontStyles.normal,
		color: colors.fontPrimary,
		flexGrow: 1,
		flexShrink: 1,
		fontSize: 14
	},
	permission: {
		...fontStyles.bold,
		color: colors.fontPrimary,
		fontSize: 14
	},
	header: {
		alignItems: 'flex-start',
		display: 'flex',
		flexDirection: 'row',
		marginBottom: 12
	},
	headerTitle: {
		...fontStyles.normal,
		color: colors.fontPrimary,
		fontSize: 16,
		textAlign: 'center'
	},
	selectedAddress: {
		...fontStyles.normal,
		color: colors.fontPrimary,
		fontSize: 16,
		marginTop: 12,
		textAlign: 'center'
	},
	dapp: {
		alignItems: 'center',
		paddingHorizontal: 14,
		width: '50%'
	},
	graphic: {
		alignItems: 'center',
		position: 'absolute',
		top: 12,
		width: '100%'
	},
	check: {
		alignItems: 'center',
		height: 2,
		width: '33%'
	},
	border: {
		borderColor: colors.grey400,
		borderStyle: 'dashed',
		borderWidth: 1,
		left: 0,
		overflow: 'hidden',
		position: 'absolute',
		top: 12,
		width: '100%',
		zIndex: 1
	},
	checkWrapper: {
		alignItems: 'center',
		backgroundColor: colors.green500,
		borderRadius: 12,
		height: 24,
		position: 'relative',
		width: 24,
		zIndex: 2
	},
	checkIcon: {
		color: colors.white,
		fontSize: 14,
		lineHeight: 24
	},
	icon: {
		borderRadius: 27,
		marginBottom: 12,
		height: 54,
		width: 54
	}
});

/**
 * Payment channel request approval component
 */
class PaymentChannelApproval extends Component {
	static propTypes = {
		/**
		 * Object containing current title, amount and detail
		 */
		info: PropTypes.object,
		/**
		 * Callback triggered on account access approval
		 */
		onConfirm: PropTypes.func,
		/**
		 * Callback triggered on account access rejection
		 */
		onCancel: PropTypes.func,
		/**
		/* Identities object required to get account name
		*/
		identities: PropTypes.object,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * A bool that determines when the payment is in progress
		 */
		loading: PropTypes.bool
	};

	getFormattedAmount = () =>
		parseFloat(this.props.info.amount)
			.toFixed(2)
			.toString();

	render = () => {
		const {
			info: { title, detail },
			onConfirm,
			onCancel,
			selectedAddress,
			identities,
			loading
		} = this.props;
		const formattedAmount = this.getFormattedAmount();
		return (
			<View style={styles.root}>
				<View style={styles.titleWrapper}>
					<Text style={styles.title} onPress={this.cancelSignature}>
						<Text>{strings('paymentRequest.title')}</Text>
					</Text>
				</View>
				<ActionView
					cancelText={strings('paymentRequest.cancel')}
					confirmText={strings('paymentRequest.cancel')}
					onCancelPress={onCancel}
					onConfirmPress={onConfirm}
					confirmButtonMode={'confirm'}
					confirmed={loading}
				>
					<View style={styles.wrapper}>
						<View style={styles.header}>
							<View style={styles.dapp}>
								<Identicon address={selectedAddress} diameter={54} />
								<Text style={styles.selectedAddress}>
									{renderAccountName(selectedAddress, identities)}
								</Text>
							</View>
							<View style={styles.graphic}>
								<View style={styles.check}>
									<ElevatedView style={styles.checkWrapper} elevation={8}>
										<Icon name="dollar" style={styles.checkIcon} />
									</ElevatedView>
									<View style={styles.border} />
								</View>
							</View>
							<View style={styles.dapp}>
								<WebsiteIcon style={styles.icon} title={title} />
								<Text style={styles.headerTitle} numberOfLines={1}>
									{title}
								</Text>
							</View>
						</View>
						<Text style={styles.intro}>{strings('paymentRequest.complete_your_payment_for')}</Text>
						<View style={styles.permissions}>
							<Text style={styles.permissionText} numberOfLines={1}>
								<Text style={styles.permission}> {detail}</Text>
							</Text>
						</View>
						<View style={styles.total}>
							<Text style={styles.totalText}>{strings('paymentRequest.total')}</Text>
							<Text style={styles.totalPrice}> ${formattedAmount}</Text>
						</View>
					</View>
				</ActionView>
			</View>
		);
	};
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	identities: state.engine.backgroundState.PreferencesController.identities
});

export default connect(mapStateToProps)(PaymentChannelApproval);
