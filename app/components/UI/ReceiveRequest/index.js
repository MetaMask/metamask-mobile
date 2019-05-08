import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { SafeAreaView, Platform, TouchableOpacity, Dimensions, StyleSheet, View, Text } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import ReceiveRequestAction from './ReceiveRequestAction';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Logger from '../../../util/Logger';
import Share from 'react-native-share'; // eslint-disable-line  import/default
import { toChecksumAddress } from 'ethereumjs-util';
import { connect } from 'react-redux';
import { toggleReceiveModal } from '../../../actions/modals';
import Modal from 'react-native-modal';
import QRCode from 'react-native-qrcode-svg';
import { strings } from '../../../../locales/i18n';

const ACTION_WIDTH = (Dimensions.get('window').width - 60) / 2;

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		minHeight: 2 * ACTION_WIDTH + 100
	},
	actionsWrapper: {
		flex: 1,
		margin: 14
	},
	accountInformation: {},
	row: {
		flexDirection: 'row',
		alignItems: 'center'
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
	addressWrapper: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 15,
		paddingVertical: 10,
		marginTop: 10,
		marginBottom: 20,
		marginRight: 10,
		marginLeft: 10,
		borderRadius: 5,
		backgroundColor: colors.grey000
	},
	addressTitle: {
		fontSize: 16,
		marginBottom: 10,
		...fontStyles.normal
	},
	address: {
		fontSize: Platform.OS === 'ios' ? 17 : 20,
		letterSpacing: 2,
		fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
	}
});

/**
 * Component that renders receive options
 */
class ReceiveRequest extends Component {
	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object,
		/**
		 * Selected address as string
		 */
		selectedAddress: PropTypes.string,
		toggleReceiveModal: PropTypes.func
	};

	state = {
		qrModalVisible: false
	};

	onShare = () => {
		const { selectedAddress } = this.props;
		Share.open({
			message: `ethereum:${selectedAddress}`
		}).catch(err => {
			Logger.log('Error while trying to share address', err);
		});
	};

	actions = [
		{
			icon: <MaterialIcon name={'share-variant'} size={32} color={colors.black} />,
			title: 'Share Address',
			description: 'Email or text your address',
			onPress: () => {
				this.onShare();
			}
		},
		{
			icon: <FontAwesome name={'qrcode'} size={32} color={colors.black} />,
			title: 'QR Code',
			description: 'Scannable image that can read your address',
			onPress: () => {
				this.openQrModal();
			}
		},
		{
			icon: <MaterialIcon solid name={'hand-pointing-right'} size={32} color={colors.black} />,
			title: 'Request',
			description: 'Request assets from friends',
			onPress: () => {
				this.props.toggleReceiveModal();
				this.props.navigation.navigate('PaymentRequestView');
			}
		},
		{
			icon: <FontAwesome name={'credit-card'} size={32} color={colors.black} />,
			title: 'Buy',
			description: 'Buy Crypto with Credit Card',
			onPress: () => {
				this.props.toggleReceiveModal();
				this.props.navigation.navigate('WalletView');
			}
		}
	];

	closeQrModal = () => {
		this.setState({ qrModalVisible: false });
	};

	openQrModal = () => {
		this.setState({ qrModalVisible: true });
	};

	render() {
		const { qrModalVisible } = this.state;
		return (
			<SafeAreaView style={styles.wrapper}>
				<View style={styles.accountInformation}>
					<Text style={fontStyles.normal}>Receive</Text>
				</View>

				<View style={styles.actionsWrapper}>
					<View style={styles.row}>
						<ReceiveRequestAction
							style={{ width: ACTION_WIDTH, height: ACTION_WIDTH }}
							icon={this.actions[0].icon}
							actionTitle={this.actions[0].title}
							actionDescription={this.actions[0].description}
							onPress={this.actions[0].onPress}
						/>
						<ReceiveRequestAction
							style={{ width: ACTION_WIDTH, height: ACTION_WIDTH }}
							icon={this.actions[1].icon}
							actionTitle={this.actions[1].title}
							actionDescription={this.actions[1].description}
							onPress={this.actions[1].onPress}
						/>
					</View>
					<View style={styles.row}>
						<ReceiveRequestAction
							style={{ width: ACTION_WIDTH, height: ACTION_WIDTH }}
							icon={this.actions[2].icon}
							actionTitle={this.actions[2].title}
							actionDescription={this.actions[2].description}
							onPress={this.actions[2].onPress}
						/>
						<ReceiveRequestAction
							style={{ width: ACTION_WIDTH, height: ACTION_WIDTH }}
							icon={this.actions[3].icon}
							actionTitle={this.actions[3].title}
							actionDescription={this.actions[3].description}
							onPress={this.actions[2].onPress}
						/>
					</View>
				</View>
				<Modal
					isVisible={qrModalVisible}
					onBackdropPress={this.closeQrModal}
					onSwipeComplete={this.closeQrModal}
					swipeDirection={'down'}
					propagateSwipe
				>
					<View style={styles.detailsWrapper}>
						<View style={styles.qrCode}>
							<QRCode
								value={`ethereum:${this.props.selectedAddress}`}
								size={Dimensions.get('window').width - 160}
							/>
						</View>
						<TouchableOpacity style={styles.addressWrapper} onPress={this.copyAccountToClipboard}>
							<Text style={styles.addressTitle} testID={'public-address-text'}>
								{strings('drawer.public_address')}
							</Text>
							<Text style={styles.address} testID={'public-address-text'}>
								{this.props.selectedAddress}
							</Text>
						</TouchableOpacity>
					</View>
				</Modal>
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: toChecksumAddress(state.engine.backgroundState.PreferencesController.selectedAddress)
});

const mapDispatchToProps = dispatch => ({
	toggleReceiveModal: () => dispatch(toggleReceiveModal())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(ReceiveRequest);
