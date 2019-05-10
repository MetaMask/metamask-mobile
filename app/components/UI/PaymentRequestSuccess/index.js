import React, { Component } from 'react';
import { SafeAreaView, View, ScrollView, Text, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { colors, fontStyles } from '../../../styles/common';
import { getPaymentRequestSuccessOptionsTitle } from '../../UI/Navbar';
import PropTypes from 'prop-types';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import StyledButton from '../StyledButton';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	contentWrapper: {
		padding: 35
	},
	button: {
		marginBottom: 16
	},
	titleText: {
		...fontStyles.bold,
		fontSize: 24,
		marginVertical: 16,
		alignSelf: 'center'
	},
	descriptionText: {
		...fontStyles.normal,
		fontSize: 14,
		alignSelf: 'center',
		textAlign: 'center',
		marginVertical: 8
	},
	linkText: {
		...fontStyles.normal,
		fontSize: 14,
		color: colors.blue,
		alignSelf: 'center',
		textAlign: 'center',
		marginVertical: 16
	},
	buttonsWrapper: {
		flex: 1,
		flexDirection: 'row',
		alignSelf: 'center'
	},
	buttonsContainer: {
		flex: 1,
		flexDirection: 'column',
		alignSelf: 'flex-end'
	},
	scrollViewContainer: {
		flexGrow: 1
	},
	icon: {
		color: colors.blue,
		marginBottom: 16
	},
	blueIcon: {
		color: colors.white
	},
	iconWrapper: {
		alignItems: 'center'
	},
	buttonText: {
		...fontStyles.bold,
		color: colors.blue,
		fontSize: 14,
		marginLeft: 8
	},
	blueButtonText: {
		...fontStyles.bold,
		color: colors.white,
		fontSize: 14,
		marginLeft: 8
	},
	buttonContent: {
		flexDirection: 'row',
		alignSelf: 'center'
	},
	buttonIconWrapper: {
		flexDirection: 'column',
		alignSelf: 'center'
	},
	buttonTextWrapper: {
		flexDirection: 'column',
		alignSelf: 'center'
	}
});

/**
 * Main view for general app configurations
 */
class PaymentRequestSuccess extends Component {
	static navigationOptions = ({ navigation }) => getPaymentRequestSuccessOptionsTitle(navigation);

	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object
	};

	state = {
		link: '',
		amount: ''
	};

	componentDidMount = () => {
		const { navigation } = this.props;
		const link = navigation && navigation.getParam('link', '');
		const amount = navigation && navigation.getParam('amount', '');
		this.setState({ link, amount });
	};

	render() {
		const { link, amount } = this.state;
		return (
			<SafeAreaView style={styles.wrapper}>
				<ScrollView style={styles.contentWrapper} contentContainerStyle={styles.scrollViewContainer}>
					<View style={styles.iconWrapper}>
						<EvilIcons name="share-apple" size={54} style={styles.icon} />
					</View>
					<Text style={styles.titleText}>Send Link</Text>
					<Text style={styles.descriptionText}>Your request link is ready to send!</Text>
					<Text style={styles.descriptionText}>
						Send this link to a friend, and it will ask them to send {amount}
					</Text>
					<Text style={styles.linkText}>{link}</Text>

					<View style={styles.buttonsWrapper}>
						<View style={styles.buttonsContainer}>
							<StyledButton type={'normal'} onPress={this.onReset} containerStyle={styles.button}>
								<View style={styles.buttonContent}>
									<View style={styles.buttonIconWrapper}>
										<FontAwesome name={'copy'} size={18} color={colors.blue} />
									</View>
									<View style={styles.buttonTextWrapper}>
										<Text style={styles.buttonText}>{'Copy to Clipboard'}</Text>
									</View>
								</View>
							</StyledButton>
							<StyledButton type={'normal'} onPress={this.onReset} containerStyle={styles.button}>
								<View style={styles.buttonContent}>
									<View style={styles.buttonIconWrapper}>
										<FontAwesome name={'qrcode'} size={18} color={colors.blue} />
									</View>
									<View style={styles.buttonTextWrapper}>
										<Text style={styles.buttonText}>{'QR Code'}</Text>
									</View>
								</View>
							</StyledButton>
							<StyledButton type={'blue'} onPress={this.onReset} containerStyle={styles.button}>
								<View style={styles.buttonContent}>
									<View style={styles.buttonIconWrapper}>
										<EvilIcons name="share-apple" size={24} style={styles.blueIcon} />
									</View>
									<View style={styles.buttonTextWrapper}>
										<Text style={styles.blueButtonText}>{'Send Link'}</Text>
									</View>
								</View>
							</StyledButton>
						</View>
					</View>
				</ScrollView>
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	searchEngine: state.settings.searchEngine,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	primaryCurrency: state.settings.primaryCurrency
});

export default connect(mapStateToProps)(PaymentRequestSuccess);
