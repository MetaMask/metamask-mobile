import Modal from 'react-native-modal';
import React from 'react';
import { View, StyleSheet, Linking, Image } from 'react-native';
import StyledButton from '../StyledButton';
import { strings } from '../../../../locales/i18n';
import Text from '../../Base/Text';
import FadeIn from 'react-native-fade-in-image';
import { colors, fontStyles } from '../../../styles/common';
import NetworkDetails from './NetworkDetails';
import NetworkAdded from './NetworkAdded';
import Engine from '../../../core/Engine';
import { isprivateConnection } from '../../../util/networks';
import URLPARSE from 'url-parse';
import scaling from '../../../util/scaling';
import { isWebUri } from 'valid-url';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import InfoModal from '../Swaps/components/InfoModal';

const styles = StyleSheet.create({
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0,
	},
	modalContainer: {
		borderRadius: 10,
		backgroundColor: colors.white,
		padding: 20,
	},
	buttonView: {
		flexDirection: 'row',
		paddingVertical: 16,
	},
	button: {
		flex: 1,
	},
	cancel: {
		marginRight: 8,
		backgroundColor: colors.white,
		borderColor: colors.grey100,
		borderWidth: 1,
	},
	confirm: {
		marginLeft: 8,
	},
	networkInformation: {
		flexDirection: 'row',
		justifyContent: 'flex-start',
		borderWidth: 1,
		borderColor: colors.grey200,
		borderRadius: 10,
		padding: 16,
		marginBottom: 10,
	},
	title: {
		...fontStyles.bold,
		fontSize: scaling.scale(18),
		textAlign: 'center',
		color: colors.black,
		lineHeight: 34,
		marginVertical: 10,
		paddingHorizontal: 16,
	},
	bottomSpace: {
		marginBottom: 10,
	},
	nameWrapper: {
		backgroundColor: colors.grey000,
		marginRight: '15%',
		marginLeft: '15%',
		paddingVertical: 5,
		borderRadius: 40,
		justifyContent: 'center',
		alignItems: 'center',
		flexDirection: 'row',
	},
	infoIcon: {
		fontSize: 12,
		color: colors.grey400,
	},
	placeholderStyle: {
		color: colors.grey500,
		borderRadius: 15,
	},
	popularNetworkImage: {
		width: 20,
		height: 20,
		marginRight: 10,
	},
});

interface NetworkProps {
	isVisible: boolean;
	onClose: () => void;
	network: any;
	navigation: any;
}

const NetworkModals = (props: NetworkProps) => {
	const {
		navigation,
		isVisible,
		onClose,
		network: {
			chainId,
			nickname,
			ticker,
			rpcUrl,
			rpcPrefs: { blockExplorerUrl, imageUrl },
		},
	} = props;
	const [showDetails, setShowDetails] = React.useState(false);
	const [showInfo, setShowInfo] = React.useState(false);
	const [networkAdded, setNetworkAdded] = React.useState(false);

	const showDetailsModal = () => setShowDetails(!showDetails);

	const getDecimalChainId = (id: string) => {
		if (!id || typeof id !== 'string' || !id.startsWith('0x')) {
			return id;
		}
		return parseInt(id, 16).toString(10);
	};

	const validateRpcUrl = (url: string) => {
		if (!isWebUri(url)) return false;
		return true;
	};

	const addNetwork = async () => {
		const { PreferencesController, CurrencyRateController } = Engine.context;
		let formChainId = chainId.trim().toLowerCase();

		if (!formChainId.startsWith('0x')) {
			formChainId = `0x${parseInt(formChainId, 10).toString(16)}`;
		}

		const validUrl = validateRpcUrl(rpcUrl);

		if (validUrl) {
			const url = new URLPARSE(rpcUrl);
			const decimalChainId = getDecimalChainId(chainId);
			!isprivateConnection(url.hostname) && url.set('protocol', 'https:');
			CurrencyRateController.setNativeCurrency(ticker);
			PreferencesController.addToFrequentRpcList(url.href, decimalChainId, ticker, nickname, {
				blockExplorerUrl,
			});
			setNetworkAdded(true);
		} else {
			setNetworkAdded(false);
		}
	};

	const showToolTip = () => setShowInfo(!showInfo);

	const goToLink = () => Linking.openURL(strings('networks.security_link'));

	const goHome = () => {
		onClose();
		navigation.navigate('WalletView');
	};

	const switchNetwork = () => {
		const { NetworkController } = Engine.context;
		const url = new URLPARSE(rpcUrl);
		const decimalChainId = getDecimalChainId(chainId);
		NetworkController.setRpcTarget(url.href, decimalChainId, ticker, nickname);
		goHome();
	};

	return (
		<Modal
			isVisible={isVisible}
			animationIn="slideInUp"
			animationOut="slideOutDown"
			style={styles.bottomModal}
			backdropOpacity={0.7}
			animationInTiming={600}
			animationOutTiming={600}
			swipeDirection={'down'}
			propagateSwipe
		>
			<View style={styles.modalContainer}>
				{showDetails ? (
					<NetworkDetails
						goBack={showDetailsModal}
						chainId={chainId}
						nickname={nickname}
						ticker={ticker}
						rpcUrl={rpcUrl}
						blockExplorerUrl={blockExplorerUrl}
					/>
				) : networkAdded ? (
					<NetworkAdded nickname={nickname} goHome={goHome} switchNetwork={switchNetwork} />
				) : (
					<View>
						{showInfo && (
							<InfoModal
								isVisible
								toggleModal={showToolTip}
								message={
									'A provider is trusted to tell your wallet its balances and to broadcast its transactions faithfully'
								}
								clickText={undefined}
								clickPress={undefined}
							/>
						)}
						<View style={styles.nameWrapper}>
							<FadeIn placeholderStyle={styles.placeholderStyle}>
								<Image source={{ uri: imageUrl || null }} style={styles.popularNetworkImage} />
							</FadeIn>
							<Text black>{nickname}</Text>
						</View>
						<Text reset style={styles.title}>
							{strings('networks.want_to_add_network')}
						</Text>
						<Text centered style={styles.bottomSpace}>
							{strings('networks.network_infomation')}
						</Text>
						<Text centered bold>
							{strings('networks.network_endorsement')}
							<FAIcon name="info-circle" style={styles.infoIcon} onPress={showToolTip} />
						</Text>
						<Text centered style={styles.bottomSpace}>
							<Text>{strings('networks.learn_about')} </Text>
							<Text link onPress={goToLink}>
								{strings('networks.network_risk')}
							</Text>
						</Text>
						<View style={styles.networkInformation}>
							<View>
								<Text black>{strings('networks.network_display_name')}</Text>
								<Text bold black style={styles.bottomSpace}>
									{nickname}
								</Text>
								<Text black>{strings('networks.network_chain_id')}</Text>
								<Text bold black style={styles.bottomSpace}>
									{chainId}
								</Text>
								<Text black>{strings('networks.network_rpc_url')}</Text>
								<Text bold black style={styles.bottomSpace}>
									{rpcUrl}
								</Text>
							</View>
						</View>
						<Text onPress={showDetailsModal} centered link bold>
							{strings('networks.view_details')}
						</Text>
						<View style={styles.buttonView}>
							<StyledButton
								type={'cancel'}
								onPress={onClose}
								containerStyle={[styles.button, styles.cancel]}
								testID={'connect-approve-button'}
							>
								<Text centered>{strings('networks.cancel')}</Text>
							</StyledButton>
							<StyledButton
								type={'confirm'}
								onPress={addNetwork}
								containerStyle={[styles.button, styles.confirm]}
								testID={'connect-approve-button'}
								disabled={!validateRpcUrl(rpcUrl)}
							>
								{strings('networks.approve')}
							</StyledButton>
						</View>
					</View>
				)}
			</View>
		</Modal>
	);
};

export default NetworkModals;
