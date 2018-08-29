import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Platform, TextInput, StyleSheet, Text, ScrollView, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { connect } from 'react-redux';
import QRCode from 'react-native-qrcode';
import StyledButton from '../StyledButton'; // eslint-disable-line  import/no-unresolved
import Share from 'react-native-share'; // eslint-disable-line  import/default
import Logger from '../../util/Logger';
import { strings } from '../../../locales/i18n';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
	},
	wrapperContainer: {
		flex: 1,
		padding: Platform.OS === 'android' ? 20 : 10,
		alignItems: 'center'
	},
	text: {
		marginTop: Platform.OS === 'android' ? 10 : 20,
		fontSize: 18,
		textAlign: 'center',
		...fontStyles.normal
	},
	address: {
		marginTop: Platform.OS === 'android' ? 20 : 30,
		backgroundColor: colors.concrete,
		paddingVertical: Platform.OS === 'android' ? 10 : 15,
		paddingLeft: 8,
		paddingRight: 8,
		fontSize: 14,
		borderRadius: 10,
		...fontStyles.normal
	},
	qrCode: {
		marginTop: Platform.OS === 'android' ? 20 : 40,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: Platform.OS === 'android' ? 20 : 40
	},
	shareButton: {
		width: Platform.OS === 'android' ? 180 : 250
	}
});

/**
 * View that wraps the wraps the "Receive" screen
 */
class ReceiveScreen extends Component {
	static propTypes = {
		/**
		 * String that represents the selected address
		 */
		selectedAddress: PropTypes.string
	};

	share = () => {
		Share.open({
			url: this.props.selectedAddress
		}).catch(err => {
			Logger.log('Error while trying to share address', err);
		});
	};

	render() {
		const { selectedAddress } = this.props;
		return (
			<ScrollView style={styles.wrapper}>
				<View style={styles.wrapperContainer} testID={'receive-screen'}>
					<Text style={styles.text}>{strings('receiveScreen.publicAddress')}</Text>
					<TextInput
						value={selectedAddress}
						selectTextOnFocus
						style={styles.address}
						editable={false}
						testID={'public-address-input'}
					/>
					<View style={styles.qrCode}>
						<QRCode
							value={selectedAddress}
							size={Platform.OS === 'android' ? 180 : 250}
							bgColor={colors.fontPrimary}
							fgColor={colors.white}
						/>
					</View>
					<StyledButton type={'normal'} onPress={this.share} containerStyle={styles.shareButton}>
						{strings('receiveScreen.shareButton')}
					</StyledButton>
				</View>
			</ScrollView>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.backgroundState.PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(ReceiveScreen);
