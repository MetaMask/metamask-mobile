import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import ActionModal from '../ActionModal';
import { fontStyles, colors } from '../../../styles/common';
import { connect } from 'react-redux';
import { protectWalletModalNotVisible } from '../../../actions/user';
import Icon from 'react-native-vector-icons/FontAwesome';
import { strings } from '../../../../locales/i18n';
import scaling from '../../../util/scaling';

const protectWalletImage = require('../../../images/protect-wallet.jpg'); // eslint-disable-line

const styles = StyleSheet.create({
	wrapper: {
		marginTop: 24,
		marginHorizontal: 24,
		flex: 1
	},
	title: {
		...fontStyles.bold,
		color: colors.black,
		textAlign: 'center',
		fontSize: 20,
		flex: 1
	},
	imageWrapper: { flexDirection: 'column', alignItems: 'center', marginBottom: 12, marginTop: 30 },
	image: {
		width: scaling.scale(135, { baseModel: 1 }),
		height: scaling.scale(160, { baseModel: 1 })
	},
	text: {
		...fontStyles.normal,
		color: colors.black,
		textAlign: 'center',
		fontSize: 14,
		marginBottom: 24
	},
	closeIcon: {
		padding: 5
	},
	learnMoreText: {
		textAlign: 'center',
		...fontStyles.normal,
		color: colors.blue,
		marginBottom: 14,
		fontSize: 14
	},
	modalXIcon: {
		fontSize: 16
	},
	titleWrapper: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center'
	},
	auxCenter: {
		width: 26
	}
});

/**
 * View that renders an action modal
 */
class ProtectYourWalletModal extends PureComponent {
	static propTypes = {
		navigation: PropTypes.object,
		/**
		 * Hide this modal
		 */
		protectWalletModalNotVisible: PropTypes.func,
		/**
		 * Whether this modal is visible
		 */
		protectWalletModalVisible: PropTypes.bool,
		/**
		 * Boolean that determines if the user has set a password before
		 */
		passwordSet: PropTypes.bool
	};

	goToBackupFlow = () => {
		this.props.protectWalletModalNotVisible();
		this.props.navigation.navigate(this.props.passwordSet ? 'AccountBackupStep1' : 'SetPasswordFlow');
	};

	onLearnMore = () => {
		this.props.protectWalletModalNotVisible();
		this.props.navigation.navigate('Webview', {
			url: 'https://metamask.zendesk.com/hc/en-us/articles/360015489591-Basic-Safety-Tips',
			title: strings('protect_wallet_modal.title')
		});
	};

	render() {
		return (
			<ActionModal
				modalVisible={this.props.protectWalletModalVisible}
				cancelText={strings('protect_wallet_modal.top_button')}
				confirmText={strings('protect_wallet_modal.bottom_button')}
				onCancelPress={this.goToBackupFlow}
				onRequestClose={this.props.protectWalletModalNotVisible}
				onConfirmPress={this.props.protectWalletModalNotVisible}
				cancelButtonMode={'sign'}
				confirmButtonMode={'transparent-blue'}
				verticalButtons
			>
				<View style={styles.wrapper} testID={'protect-wallet-modal'}>
					<View style={styles.titleWrapper}>
						<View style={styles.auxCenter} />
						<Text style={styles.title}>{strings('protect_wallet_modal.title')}</Text>
						<TouchableOpacity
							onPress={this.props.protectWalletModalNotVisible}
							style={styles.closeIcon}
							hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
						>
							<Icon name="times" style={styles.modalXIcon} />
						</TouchableOpacity>
					</View>
					<View style={styles.imageWrapper}>
						<Image source={protectWalletImage} style={styles.image} />
					</View>

					<Text style={styles.text}>
						{strings('protect_wallet_modal.text')}
						<Text style={{ ...fontStyles.bold }}>{' ' + strings('protect_wallet_modal.text_bold')}</Text>
					</Text>

					<TouchableOpacity onPress={this.onLearnMore}>
						<Text style={styles.learnMoreText}>{strings('protect_wallet_modal.action')}</Text>
					</TouchableOpacity>
				</View>
			</ActionModal>
		);
	}
}

const mapStateToProps = state => ({
	protectWalletModalVisible: state.user.protectWalletModalVisible,
	passwordSet: state.user.passwordSet
});

const mapDispatchToProps = dispatch => ({
	protectWalletModalNotVisible: enable => dispatch(protectWalletModalNotVisible())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(ProtectYourWalletModal);
