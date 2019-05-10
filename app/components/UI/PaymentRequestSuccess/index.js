import React, { Component } from 'react';
import {
	Dimensions,
	Clipboard,
	SafeAreaView,
	View,
	ScrollView,
	Text,
	StyleSheet,
	InteractionManager
} from 'react-native';
import { connect } from 'react-redux';
import { colors, fontStyles } from '../../../styles/common';
import { getPaymentRequestSuccessOptionsTitle } from '../../UI/Navbar';
import PropTypes from 'prop-types';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import StyledButton from '../StyledButton';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { showAlert } from '../../../actions/alert';
import Logger from '../../../util/Logger';
import Share from 'react-native-share'; // eslint-disable-line  import/default
import Modal from 'react-native-modal';
import QRCode from 'react-native-qrcode-svg';
import { renderNumber } from '../../../util/number';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	contentWrapper: {
		padding: 24
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
	},
	detailsWrapper: {
		padding: 10,
		alignItems: 'center'
	},
	qrCode: {
		marginVertical: 15,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 40,
		backgroundColor: colors.grey000,
		borderRadius: 8
	},
	informationWrapper: {
		paddingHorizontal: 40
	},
	linkWrapper: {
		paddingHorizontal: 24
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
		navigation: PropTypes.object,
		/**
		/* Triggers global alert
		*/
		showAlert: PropTypes.func
	};

	state = {
		link: '',
		amount: '',
		symbol: '',
		qrModalVisible: false
	};

	componentDidMount = () => {
		const { navigation } = this.props;
		const link = navigation && navigation.getParam('link', '');
		const amount = navigation && navigation.getParam('amount', '');
		const symbol = navigation && navigation.getParam('symbol', '');
		this.setState({ link, amount, symbol });
	};

	copyAccountToClipboard = async () => {
		const { link } = this.state;
		await Clipboard.setString(link);
		InteractionManager.runAfterInteractions(() => {
			this.props.showAlert({
				isVisible: true,
				autodismiss: 1500,
				content: 'clipboard-alert',
				data: { msg: 'Link copied to clipboard' }
			});
		});
	};

	onShare = () => {
		const { link } = this.state;
		Share.open({
			message: link
		}).catch(err => {
			Logger.log('Error while trying to share payment request', err);
		});
	};

	showQRModal = () => {
		this.setState({ qrModalVisible: true });
	};

	closeQRModal = () => {
		this.setState({ qrModalVisible: false });
	};

	render() {
		const { link, amount, symbol } = this.state;
		return (
			<SafeAreaView style={styles.wrapper}>
				<ScrollView style={styles.contentWrapper} contentContainerStyle={styles.scrollViewContainer}>
					<View style={styles.iconWrapper}>
						<EvilIcons name="share-apple" size={54} style={styles.icon} />
					</View>
					<View style={styles.informationWrapper}>
						<Text style={styles.titleText}>Send Link</Text>
						<Text style={styles.descriptionText}>Your request link is ready to send!</Text>
						<Text style={styles.descriptionText}>
							Send this link to a friend, and it will ask them to send
							<Text style={fontStyles.bold}>{' ' + renderNumber(amount) + ' ' + symbol}</Text>
						</Text>
					</View>
					<View style={styles.linkWrapper}>
						<Text style={styles.linkText}>{link}</Text>
					</View>

					<View style={styles.buttonsWrapper}>
						<View style={styles.buttonsContainer}>
							<StyledButton
								type={'normal'}
								onPress={this.copyAccountToClipboard}
								containerStyle={styles.button}
							>
								<View style={styles.buttonContent}>
									<View style={styles.buttonIconWrapper}>
										<FontAwesome name={'copy'} size={18} color={colors.blue} />
									</View>
									<View style={styles.buttonTextWrapper}>
										<Text style={styles.buttonText}>{'Copy to Clipboard'}</Text>
									</View>
								</View>
							</StyledButton>
							<StyledButton type={'normal'} onPress={this.showQRModal} containerStyle={styles.button}>
								<View style={styles.buttonContent}>
									<View style={styles.buttonIconWrapper}>
										<FontAwesome name={'qrcode'} size={18} color={colors.blue} />
									</View>
									<View style={styles.buttonTextWrapper}>
										<Text style={styles.buttonText}>{'QR Code'}</Text>
									</View>
								</View>
							</StyledButton>
							<StyledButton type={'blue'} onPress={this.onShare} containerStyle={styles.button}>
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
				<Modal
					isVisible={this.state.qrModalVisible}
					onBackdropPress={this.closeQRModal}
					onSwipeComplete={this.closeQRModal}
					swipeDirection={'down'}
					propagateSwipe
				>
					<View style={styles.detailsWrapper}>
						<View style={styles.qrCode}>
							<QRCode value={this.state.link} size={Dimensions.get('window').width - 160} />
						</View>
					</View>
				</Modal>
			</SafeAreaView>
		);
	}
}

const mapDispatchToProps = dispatch => ({
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	null,
	mapDispatchToProps
)(PaymentRequestSuccess);
