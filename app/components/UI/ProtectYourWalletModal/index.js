import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, Image } from 'react-native';
import ActionModal from '../ActionModal';
import { fontStyles, colors } from '../../../styles/common';
import { connect } from 'react-redux';
import StyledButton from '../StyledButton';

const protectWalletImage = require('../../../images/protect-wallet.jpg'); // eslint-disable-line

const styles = StyleSheet.create({
	wrapper: { margin: 24 },
	title: {
		...fontStyles.bold,
		color: colors.black,
		textAlign: 'center',
		fontSize: 20,
		marginBottom: 16
	},
	imageWrapper: { flexDirection: 'column', alignItems: 'center', marginBottom: 12 },
	image: { width: 135, height: 160 },
	text: {
		...fontStyles.normal,
		color: colors.black,
		textAlign: 'center',
		fontSize: 14
	}
});

/**
 * View that renders an action modal
 */
class ProtectYourWalletModal extends PureComponent {
	static propTypes = {
		navigation: PropTypes.object
	};

	goToBackupFlow = () => {
		this.props.navigation.navigate('AccountBackupStep1');
	};

	// eslint-disable-next-line no-empty-function
	hideModal = () => {};

	render() {
		return (
			<ActionModal
				modalVisible
				cancelText={'Protect wallet'}
				confirmText={'Remind me later'}
				onCancelPress={this.goToBackupFlow}
				onRequestClose={this.hideModal}
				onConfirmPress={this.hideModal}
				cancelButtonMode={'sign'}
				confirmButtonMode={'transparent-blue'}
				verticalButtons
			>
				<View style={styles.wrapper}>
					<Text style={styles.title}>{'Protect your wallet'}</Text>
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
					<StyledButton
						type={'transparent-blue'}
						onPress={this.onConfirm}
						containerStyle={[styles.button, styles.confirm]}
					>
						{'Learn more'}
					</StyledButton>
				</View>
			</ActionModal>
		);
	}
}

const mapStateToProps = state => ({});

export default connect(mapStateToProps)(ProtectYourWalletModal);
