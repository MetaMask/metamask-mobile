import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import ActionView from '../ActionView';
import ElevatedView from 'react-native-elevated-view';
import Identicon from '../Identicon';
import { strings } from '../../../../locales/i18n';
import { colors, fontStyles } from '../../../styles/common';
import Device from '../../../util/Device';
import WebsiteIcon from '../WebsiteIcon';
import { renderAccountName } from '../../../util/address';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		minHeight: '70%',
		paddingBottom: Device.isIphoneX() ? 20 : 0
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
	dappTitle: {
		...fontStyles.bold,
		color: colors.fontPrimary,
		fontSize: 20
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
	warning: {
		...fontStyles.normal,
		color: colors.fontPrimary,
		fontSize: 14,
		marginTop: 24
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
	headerUrl: {
		...fontStyles.normal,
		color: colors.fontSecondary,
		fontSize: 12,
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
 * WalletConnect request approval component
 */
class WalletConnectSessionApproval extends PureComponent {
	static propTypes = {
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
		/* Identities object required to get account name
		*/
		identities: PropTypes.object,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * A boolean to requests permission to autosign
		 */
		autosign: PropTypes.bool
	};

	renderSpecialPermissions = () => {
		if (this.props.autosign) {
			return (
				<View style={styles.permissions}>
					<Text style={styles.permissionText} numberOfLines={1}>
						<Text style={styles.permission}> {strings('accountApproval.sign_messages')}</Text>
						{` `}
						{strings('accountApproval.on_your_behalf')}
					</Text>
					<Icon name="info-circle" color={colors.blue} size={22} />
				</View>
			);
		}
		return null;
	};

	render = () => {
		const {
			currentPageInformation: { title, url },
			onConfirm,
			onCancel,
			selectedAddress,
			identities
		} = this.props;
		return (
			<View style={styles.root}>
				<View style={styles.titleWrapper}>
					<Text style={styles.title} onPress={this.cancelSignature}>
						<Text>{strings('accountApproval.walletconnect_title')}</Text>
					</Text>
				</View>
				<ActionView
					cancelText={strings('accountApproval.cancel')}
					confirmText={strings('accountApproval.connect')}
					onCancelPress={onCancel}
					onConfirmPress={onConfirm}
					confirmButtonMode={'confirm'}
				>
					<View style={styles.wrapper}>
						<View style={styles.header}>
							<View style={styles.dapp}>
								<WebsiteIcon style={styles.icon} title={title} url={url} />
								<Text style={styles.headerTitle} numberOfLines={1}>
									{title}
								</Text>
								<Text style={styles.headerUrl} numberOfLines={1}>
									{url}
								</Text>
							</View>
							<View style={styles.graphic}>
								<View style={styles.check}>
									<ElevatedView style={styles.checkWrapper} elevation={8}>
										<Icon name="check" style={styles.checkIcon} />
									</ElevatedView>
									<View style={styles.border} />
								</View>
							</View>
							<View style={styles.dapp}>
								<Identicon address={selectedAddress} diameter={54} />
								<Text style={styles.selectedAddress}>
									{renderAccountName(selectedAddress, identities)}
								</Text>
							</View>
						</View>
						<Text style={styles.intro}>
							<Text style={styles.dappTitle}>{title} </Text>
							{strings('accountApproval.action')}:
						</Text>
						<View style={styles.permissions}>
							<Text style={styles.permissionText} numberOfLines={1}>
								{strings('accountApproval.permission')}
								<Text style={styles.permission}> {strings('accountApproval.address')}</Text>
							</Text>
							<Icon name="info-circle" color={colors.blue} size={22} />
						</View>
						{this.renderSpecialPermissions()}
						<Text style={styles.warning}>{strings('accountApproval.warning')}</Text>
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

export default connect(mapStateToProps)(WalletConnectSessionApproval);
