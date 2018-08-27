import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { TextInput, StyleSheet, Text, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { connect } from 'react-redux';
import QRCode from 'react-native-qrcode';
import StyledButton from '../StyledButton'; // eslint-disable-line  import/no-unresolved
import Share from 'react-native-share'; // eslint-disable-line  import/default
import Logger from '../../util/Logger';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		padding: 10,
		alignItems: 'center'
	},
	text: {
		marginTop: 20,
		fontSize: 18,
		textAlign: 'center',
		...fontStyles.normal
	},
	address: {
		marginTop: 30,
		backgroundColor: colors.concrete,
		paddingTop: 15,
		paddingBottom: 15,
		paddingLeft: 8,
		paddingRight: 8,
		fontSize: 14,
		borderRadius: 10,
		...fontStyles.normal
	},
	qrCode: {
		marginTop: 40,
		alignItems: 'center',
		justifyContent: 'center'
	},
	shareButton: {
		marginTop: 40,
		width: 250
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
			<View style={styles.wrapper}>
				<View style={styles.wrapper} testID={'receive-screen'}>
					<Text style={styles.text}>Public Address</Text>
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
							size={250}
							bgColor={colors.fontPrimary}
							fgColor={colors.white}
						/>
					</View>
					<StyledButton type={'normal'} onPress={this.share} containerStyle={styles.shareButton}>
						SHARE
					</StyledButton>
				</View>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.backgroundState.PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(ReceiveScreen);
