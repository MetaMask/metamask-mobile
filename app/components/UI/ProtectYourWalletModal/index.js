import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, Image } from 'react-native';
import ActionModal from '../ActionModal';
import { fontStyles, colors } from '../../../styles/common';
import { connect } from 'react-redux';
import { protectWalletModalNotVisible } from '../../../actions/user';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { TouchableOpacity } from 'react-native-gesture-handler';

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
		protectWalletModalVisible: PropTypes.bool
	};

	goToBackupFlow = () => {
		this.props.navigation.navigate('AccountBackupStep1');
	};

	render() {
		return (
			<ActionModal
				modalVisible={this.props.protectWalletModalVisible}
				cancelText={'Protect wallet'}
				confirmText={'Remind me later'}
				onCancelPress={this.goToBackupFlow}
				onRequestClose={this.props.protectWalletModalNotVisible}
				onConfirmPress={this.props.protectWalletModalNotVisible}
				cancelButtonMode={'sign'}
				confirmButtonMode={'transparent-blue'}
				verticalButtons
			>
				<View style={styles.wrapper}>
					<View style={styles.titleWrapper}>
						<Text style={styles.title}>{'Protect your wallet'}</Text>

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
						{
							'Don’t risk loosing your funds. Protect your wallet by saving your seed phrase in a place you trust.'
						}
						<Text style={{ ...fontStyles.bold }}>
							{
								' It’s the only way to recover your wallet if you get locked out of the app or get a new device.'
							}
						</Text>
					</Text>
					<TouchableOpacity onPress={this.props.protectWalletModalNotVisible}>
						<Text style={styles.learnMoreText}>{'Learn more'}</Text>
					</TouchableOpacity>
				</View>
			</ActionModal>
		);
	}
}

const mapStateToProps = state => ({
	protectWalletModalVisible: state.user.protectWalletModalVisible
});

const mapDispatchToProps = dispatch => ({
	protectWalletModalNotVisible: enable => dispatch(protectWalletModalNotVisible())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(ProtectYourWalletModal);
