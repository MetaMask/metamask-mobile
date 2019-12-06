import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { ActivityIndicator, Platform, Animated, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import ActionView from '../ActionView';
import ElevatedView from 'react-native-elevated-view';
import Identicon from '../Identicon';
import { strings } from '../../../../locales/i18n';
import { colors, fontStyles } from '../../../styles/common';
import DeviceSize from '../../../util/DeviceSize';
import WebsiteIcon from '../WebsiteIcon';
import { renderAccountName } from '../../../util/address';
import EthereumAddress from '../EthereumAddress';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		minHeight: Platform.OS === 'ios' ? '65%' : '80%',
		paddingBottom: DeviceSize.isIphoneX() ? 20 : 0
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.white
	},
	wrapper: {
		paddingHorizontal: 25
	},
	iconWrapper: {
		marginTop: 60,
		alignItems: 'center',
		justifyContent: 'center'
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
		marginTop: 15,
		marginBottom: 30
	},
	totalPrice: {
		textAlign: 'center',
		...fontStyles.bold,
		color: colors.fontPrimary,
		fontSize: 55
	},
	permissions: {
		alignItems: 'flex-start',
		borderColor: colors.grey100,
		borderTopWidth: 1,
		display: 'flex',
		flexDirection: 'row',
		paddingVertical: 16
	},
	permissionText: {
		textAlign: 'left',
		...fontStyles.normal,
		color: colors.fontPrimary,
		flexGrow: 1,
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
	},
	successIcon: {
		color: colors.green500,
		marginBottom: 30
	}
});

/**
 * Payment channel request approval component
 */
class PaymentChannelApproval extends PureComponent {
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
		loading: PropTypes.bool,
		/**
		 * A bool that determines when the payment is in progress
		 */
		complete: PropTypes.bool
	};

	iconSpringVal = new Animated.Value(0.4);

	animateIcon() {
		Animated.spring(this.iconSpringVal, {
			toValue: 1,
			friction: 2,
			useNativeDriver: true,
			isInteraction: false
		}).start();
	}

	componentDidUpdate(prevProps) {
		if (!prevProps.complete && this.props.complete) {
			this.animateIcon();
		}
	}

	getFormattedAmount = () =>
		parseFloat(this.props.info.amount)
			.toFixed(2)
			.toString();

	renderAddressOrEns = (to, ensName) => {
		if (!to) return null;

		if (ensName) {
			return <Text style={styles.selectedAddress}>{ensName}</Text>;
		}

		return <EthereumAddress style={styles.selectedAddress} address={to} type={'short'} />;
	};

	renderLoader = () => (
		<View style={styles.root}>
			<View style={styles.emptyContainer}>
				<ActivityIndicator style={styles.loader} size="small" />
			</View>
		</View>
	);

	render = () => {
		if (!this.props.info) {
			return this.renderLoader();
		}

		const {
			info: { title, detail, to, ensName },
			onConfirm,
			onCancel,
			selectedAddress,
			identities,
			loading,
			complete
		} = this.props;
		const formattedAmount = this.getFormattedAmount();

		if (complete) {
			return (
				<View style={styles.root}>
					<View style={styles.titleWrapper}>
						<Text style={styles.title} onPress={this.cancelSignature}>
							<Text>{strings('paymentRequest.title_complete')}</Text>
						</Text>
					</View>
					<Animated.View
						style={[
							styles.iconWrapper,
							{
								transform: [{ scale: this.iconSpringVal }]
							}
						]}
					>
						<Icon name="check-circle" size={160} style={styles.successIcon} />
					</Animated.View>
				</View>
			);
		}

		return (
			<View style={styles.root}>
				<View style={styles.titleWrapper}>
					<Text style={styles.title} onPress={this.cancelSignature}>
						<Text>{strings('paymentRequest.title')}</Text>
					</Text>
				</View>
				<ActionView
					cancelText={strings('paymentRequest.cancel')}
					confirmText={strings('paymentRequest.confirm')}
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
								{title ? (
									<WebsiteIcon style={styles.icon} title={title} />
								) : (
									<Identicon address={to} diameter={54} />
								)}
								{title ? (
									<Text style={styles.headerTitle} numberOfLines={1}>
										{title}
									</Text>
								) : (
									this.renderAddressOrEns(to, ensName)
								)}
							</View>
						</View>
						<Text style={styles.intro}>{strings('paymentRequest.is_requesting_you_to_pay')}</Text>
						<View style={styles.total}>
							<Text style={styles.totalPrice}>
								{formattedAmount} {strings(`unit.dai`)}
							</Text>
						</View>
						{detail && (
							<View style={styles.permissions}>
								<Text style={styles.permissionText}>
									<Text style={styles.permission}> {detail}</Text>
								</Text>
							</View>
						)}
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
