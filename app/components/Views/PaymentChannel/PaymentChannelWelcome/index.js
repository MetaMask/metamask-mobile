import React, { PureComponent } from 'react';
import { SafeAreaView, Image, Text, View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import PropTypes from 'prop-types';
import StyledButton from '../../../UI/StyledButton';
import Device from '../../../../util/Device';
import Ionicon from 'react-native-vector-icons/Ionicons';
import { strings } from '../../../../../locales/i18n';

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.white,
		paddingBottom: Device.isIphoneX() ? 32 : 8
	},
	frame: {
		justifyContent: 'center',
		marginTop: Device.isSmallDevice() ? 5 : 80,
		marginBottom: 10,
		marginHorizontal: 35,
		alignSelf: 'center',
		width: Device.isSmallDevice() ? '80%' : '100%'
	},
	content: {
		flex: 1,
		marginHorizontal: 30,
		marginVertical: Device.isIphoneX() ? 10 : 0
	},
	text: {
		...fontStyles.normal,
		fontSize: 14,
		color: colors.fontPrimary
	},
	title: {
		fontSize: 24,
		...fontStyles.bold,
		color: colors.fontPrimary,
		textAlign: 'left',
		marginBottom: 10
	},
	button: {
		flexDirection: 'row',
		alignSelf: 'center',
		width: '100%'
	},
	buttonWrapper: {
		margin: 30
	},
	closeIcon: {
		marginTop: Platform.OS === 'ios' ? 24 : 14,
		alignSelf: 'flex-end'
	}
});

const welcomeImage = require('../../../../images/payment-channel-welcome.png'); // eslint-disable-line import/no-commonjs

/**
 * View show a welcome screen for payment channels
 */
export default class PaymentChannelWelcome extends PureComponent {
	static propTypes = {
		/**
		 * Close modal callback
		 */
		close: PropTypes.func
	};

	render() {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.content}>
					<TouchableOpacity style={styles.closeIcon} onPress={this.props.close}>
						<Ionicon name={'ios-close'} size={50} color={'black'} />
					</TouchableOpacity>
					<Text style={styles.title}>{strings('payment_channel.welcome.title')}</Text>
					<Text style={styles.text}>{strings('payment_channel.welcome.desc_1')}</Text>
					<Text />
					<Text style={styles.text}>{strings('payment_channel.welcome.desc_2')}</Text>
					<Image source={welcomeImage} style={styles.frame} resizeMode={'contain'} />
				</View>
				<View style={styles.buttonWrapper}>
					<StyledButton type={'normal'} onPress={this.props.close} containerStyle={styles.button}>
						{strings('payment_channel.welcome.close')}
					</StyledButton>
				</View>
			</SafeAreaView>
		);
	}
}
