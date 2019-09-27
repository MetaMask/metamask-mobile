import React, { PureComponent } from 'react';
import { View, StyleSheet, Text, ImageBackground } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import PropTypes from 'prop-types';
import ElevatedView from 'react-native-elevated-view';
import { strings } from '../../../../locales/i18n';
import { TouchableOpacity } from 'react-native-gesture-handler';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		borderRadius: 8,
		minHeight: 200
	},
	contentWrapper: {
		marginHorizontal: 30,
		marginVertical: 30
	},
	title: {
		...fontStyles.normal,
		fontSize: 12
	},
	balance: {
		...fontStyles.normal,
		fontSize: 40,
		textTransform: 'uppercase'
	},
	balanceFiat: {
		...fontStyles.normal,
		fontSize: 12,
		color: colors.grey200,
		textTransform: 'uppercase'
	},
	description: {
		...fontStyles.normal,
		fontSize: 10,
		color: colors.grey500,
		marginBottom: 10,
		textAlign: 'center'
	},
	descriptionWrapper: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'flex-end'
	},
	watermarkWrapper: {
		flex: 1
	},
	watermarkImage: {
		flex: 1,
		borderRadius: 8,
		width: '70%',
		left: '30%',
		opacity: 0.5
	},
	qrCode: {
		maxWidth: 24,
		marginTop: 12
	}
});

const paymentChannelWatermark = require('../../../images/payment-channel-watermark.png'); // eslint-disable-line

/**
 * View that displays an asset card
 */
export default class AssetCard extends PureComponent {
	static propTypes = {
		balance: PropTypes.string,
		balanceFiat: PropTypes.string,
		description: PropTypes.string,
		openQrModal: PropTypes.func
	};

	render() {
		const { balance, balanceFiat, description, openQrModal } = this.props;
		return (
			<ElevatedView elevation={10} style={styles.wrapper}>
				<ImageBackground
					source={paymentChannelWatermark}
					style={styles.watermarkWrapper}
					imageStyle={styles.watermarkImage}
				>
					<View style={styles.contentWrapper}>
						<Text style={styles.title}>{strings('payment_request.balance')}</Text>
						<Text style={styles.balance}>{balance}</Text>
						<Text style={styles.balanceFiat}>{balanceFiat}</Text>
						<View style={styles.qrCode}>
							<TouchableOpacity onPress={openQrModal}>
								<FontAwesome name={'qrcode'} size={24} color={colors.blue} />
							</TouchableOpacity>
						</View>
					</View>

					{description && (
						<View style={styles.descriptionWrapper}>
							<Text style={styles.description}>{description}</Text>
						</View>
					)}
				</ImageBackground>
			</ElevatedView>
		);
	}
}
