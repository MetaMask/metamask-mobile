import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import ActionModal from '../ActionModal';
import { fontStyles, colors } from '../../../styles/common';
import { connect } from 'react-redux';
import { protectWalletModalNotVisible } from '../../../actions/user';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { strings } from '../../../../locales/i18n';

const protectWalletImage = require('../../../images/protect-wallet.jpg'); // eslint-disable-line

const styles = StyleSheet.create({
	wrapper: {
		marginTop: 24,
		marginHorizontal: 24
	},
	title: {
		...fontStyles.bold,
		color: colors.black,
		textAlign: 'center',
		fontSize: 20
	},
	imageWrapper: { flexDirection: 'column', alignItems: 'center', marginBottom: 12, marginTop: 30 },
	image: { width: 135, height: 160 },
	text: {
		...fontStyles.normal,
		color: colors.black,
		textAlign: 'center',
		fontSize: 14,
		marginBottom: 24
	},
	closeIcon: {
		position: 'absolute',
		right: 0,
		top: -2
	},
	learnMoreText: {
		textAlign: 'center',
		...fontStyles.normal,
		color: colors.blue,
		marginBottom: 14,
		fontSize: 14
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
				<View style={styles.wrapper}>
					<View style={styles.titleWrapper}>
						<Text style={styles.title}>{strings('protect_wallet_modal.title')}</Text>

						<Ionicons
							onPress={this.props.protectWalletModalNotVisible}
							name={'ios-close'}
							size={32}
							style={styles.closeIcon}
						/>
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
