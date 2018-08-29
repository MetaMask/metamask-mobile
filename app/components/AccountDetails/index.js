import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { TextInput, StyleSheet, Text, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { connect } from 'react-redux';
import QRCode from 'react-native-qrcode';
import { strings } from '../../../locales/i18n';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		padding: 20
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
		paddingLeft: 10,
		paddingRight: 10,
		fontSize: 13,
		borderRadius: 10,
		...fontStyles.normal
	},
	qrCode: {
		marginTop: 40,
		alignItems: 'center',
		justifyContent: 'center'
	}
});

/**
 * View that contains details about the selected Address
 */
class AccountDetails extends Component {
	static navigationOptions = {
		title: strings('accountDetails.title'),
		headerTitleStyle: {
			fontSize: 20,
			...fontStyles.normal
		}
	};

	static propTypes = {
		/**
		 * String that represents the selected address
		 */
		selectedAddress: PropTypes.string
	};

	render() {
		const { selectedAddress } = this.props;
		return (
			<View style={styles.wrapper} testID={'account-details-screen'}>
				<Text style={styles.text}>{strings('accountDetails.public_address')}</Text>
				<TextInput
					value={selectedAddress}
					selectTextOnFocus
					style={styles.address}
					editable={false}
					testID={'public-address-input'}
				/>
				<View style={styles.qrCode}>
					<QRCode value={selectedAddress} size={250} bgColor={colors.fontPrimary} fgColor={colors.white} />
				</View>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.backgroundState.PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(AccountDetails);
