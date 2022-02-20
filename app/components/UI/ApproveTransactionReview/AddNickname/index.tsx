import React, { useState } from 'react';
import { SafeAreaView, View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import AntDesignIcon from 'react-native-vector-icons/AntDesign';
import { colors, fontStyles } from '../../../../styles/common';
import EthereumAddress from '../../EthereumAddress';
import Engine from '../../../../core/Engine';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { toChecksumAddress } from 'ethereumjs-util';
import { connect } from 'react-redux';
import { WebView } from 'react-native-webview';
import StyledButton from '../../StyledButton';
import Text from '../../../Base/Text';
import { showSimpleNotification } from '../../../../actions/notification';
import Identicon from '../../../UI/Identicon';
import WebviewProgressBar from '../../../UI/WebviewProgressBar';
import { getEtherscanAddressUrl, getEtherscanBaseUrl } from '../../../../util/etherscan';
import Feather from 'react-native-vector-icons/Feather';
import { strings } from '../../../../../locales/i18n';
import GlobalAlert from '../../../UI/GlobalAlert';
import { showAlert } from '../../../../actions/alert';
import ClipboardManager from '../../../../core/ClipboardManager';
import { protectWalletModalVisible } from '../../../../actions/user';

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.white,
	},
	headerWrapper: {
		position: 'relative',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginHorizontal: 15,
		marginVertical: 5,
		paddingVertical: 10,
	},
	icon: {
		position: 'absolute',
		right: 0,
		padding: 10,
	},
	headerText: {
		color: colors.black,
		textAlign: 'center',
		fontSize: 15,
	},
	addressWrapperPrimary: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 10,
	},
	addressWrapper: {
		backgroundColor: colors.blue100,
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 40,
		paddingVertical: 10,
		paddingHorizontal: 15,
		width: '90%',
	},
	address: {
		fontSize: 12,
		color: colors.grey400,
		letterSpacing: 0.8,
		marginLeft: 10,
	},
	label: {
		fontSize: 14,
		paddingVertical: 12,
		color: colors.fontPrimary,
	},
	input: {
		...fontStyles.normal,
		fontSize: 12,
		borderColor: colors.grey200,
		borderRadius: 5,
		borderWidth: 2,
		padding: 10,
		flexDirection: 'row',
		alignItems: 'center',
	},
	bodyWrapper: {
		marginHorizontal: 20,
		marginBottom: 'auto',
	},
	updateButton: {
		marginHorizontal: 20,
	},
	addressIdenticon: {
		alignItems: 'center',
		marginVertical: 10,
	},
	actionIcon: {
		color: colors.blue,
	},
	progressBarWrapper: {
		height: 3,
		width: '100%',
		left: 0,
		right: 0,
		bottom: 0,
		position: 'absolute',
		zIndex: 999999,
	},
});

interface HeaderProps {
	onUpdateContractNickname: () => void;
	nicknameExists: boolean;
}

interface AddNicknameProps {
	onUpdateContractNickname: () => void;
	contractAddress: string;
	network: number;
	nicknameExists: boolean;
	nickname: string;
	addressBook: [];
	showModalAlert: (config: any) => void;
	protectWalletVisible: () => void;
	networkState: any;
	type: string;
}

interface ShowBlockExplorerProps {
	contractAddress: string;
	type: string;
	setIsBlockExplorerVisible: (isBlockExplorerVisible: boolean) => void;
}

const Header = (props: HeaderProps) => {
	const { onUpdateContractNickname, nicknameExists } = props;
	return (
		<View style={styles.headerWrapper}>
			<Text bold style={styles.headerText}>
				{nicknameExists ? strings('nickname.edit_nickname') : strings('nickname.add_nickname')}
			</Text>
			<AntDesignIcon name={'close'} size={20} style={styles.icon} onPress={() => onUpdateContractNickname()} />
		</View>
	);
};

const ShowBlockExplorer = (props: ShowBlockExplorerProps) => {
	const { type, contractAddress, setIsBlockExplorerVisible } = props;
	const [loading, setLoading] = useState(0);
	const url = getEtherscanAddressUrl(type, contractAddress);
	const etherscan_url = getEtherscanBaseUrl(type).replace('https://', '');

	const onLoadProgress = ({ nativeEvent: { progress } }: { nativeEvent: { progress: number } }) => {
		setLoading(progress);
	};

	const renderProgressBar = () => (
		<View style={styles.progressBarWrapper}>
			<WebviewProgressBar progress={loading} />
		</View>
	);

	return (
		<>
			<View style={styles.headerWrapper}>
				<Text bold style={styles.headerText}>
					{etherscan_url}
				</Text>
				<AntDesignIcon
					name={'close'}
					size={20}
					style={styles.icon}
					onPress={() => setIsBlockExplorerVisible(false)}
				/>
			</View>
			<WebView source={{ uri: url }} onLoadProgress={onLoadProgress} />
			{renderProgressBar()}
		</>
	);
};

const getAnalyticsParams = () => {
	try {
		const { NetworkController } = Engine.context as any;
		const { type } = NetworkController?.state?.provider || {};
		return {
			network_name: type,
		};
	} catch (error) {
		return {};
	}
};

const AddNickname = (props: AddNicknameProps) => {
	const {
		onUpdateContractNickname,
		contractAddress,
		nicknameExists,
		nickname,
		showModalAlert,
		protectWalletVisible,
		networkState: {
			network,
			provider: { type },
		},
	} = props;

	const [newNickname, setNewNickname] = useState(nickname);
	const [isBlockExplorerVisible, setIsBlockExplorerVisible] = useState(false);

	const copyContractAddress = async () => {
		await ClipboardManager.setString(contractAddress);
		showModalAlert({
			isVisible: true,
			autodismiss: 1500,
			content: 'clipboard-alert',
			data: { msg: strings('transactions.address_copied_to_clipboard') },
		});
		setTimeout(() => protectWalletVisible(), 2000);
		AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.CONTRACT_ADDRESS_COPIED, getAnalyticsParams());
	};

	const saveTokenNickname = () => {
		const { AddressBookController } = Engine.context;
		if (!newNickname || !contractAddress) return;
		AddressBookController.set(toChecksumAddress(contractAddress), newNickname, network);
		onUpdateContractNickname();
		AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.CONTRACT_ADDRESS_NICKNAME, getAnalyticsParams());
	};

	const toggleBlockExplorer = () => setIsBlockExplorerVisible(true);

	return (
		<SafeAreaView style={styles.container}>
			{isBlockExplorerVisible ? (
				<ShowBlockExplorer
					setIsBlockExplorerVisible={setIsBlockExplorerVisible}
					type={type}
					contractAddress={contractAddress}
				/>
			) : (
				<>
					<Header onUpdateContractNickname={onUpdateContractNickname} nicknameExists={nicknameExists} />
					<View style={styles.bodyWrapper}>
						<View style={styles.addressIdenticon}>
							<Identicon address={contractAddress} diameter={25} />
						</View>
						<Text style={styles.label}>{strings('nickname.address')}</Text>
						<View style={styles.addressWrapperPrimary}>
							<TouchableOpacity style={styles.addressWrapper} onPress={copyContractAddress}>
								<Feather name="copy" size={18} color={colors.blue} style={styles.actionIcon} />
								<EthereumAddress address={contractAddress} type="mid" style={styles.address} />
							</TouchableOpacity>
							<AntDesignIcon
								style={styles.actionIcon}
								name="export"
								size={22}
								onPress={toggleBlockExplorer}
							/>
						</View>
						<Text style={styles.label}>{strings('nickname.name')}</Text>
						<TextInput
							autoCapitalize={'none'}
							autoCorrect={false}
							onChangeText={setNewNickname}
							placeholder={strings('nickname.name_placeholder')}
							placeholderTextColor={colors.grey100}
							spellCheck={false}
							numberOfLines={1}
							style={styles.input}
							value={newNickname}
							testID={'contact-name-input'}
						/>
					</View>
					<View style={styles.updateButton}>
						<StyledButton
							type={'confirm'}
							disabled={!newNickname}
							onPress={saveTokenNickname}
							testID={'nickname.save_nickname'}
						>
							{strings('nickname.save_nickname')}
						</StyledButton>
					</View>
					<GlobalAlert />
				</>
			)}
		</SafeAreaView>
	);
};

const mapStateToProps = (state: any) => ({
	addressBook: state.engine.backgroundState.AddressBookController.addressBook,
	networkState: state.engine.backgroundState.NetworkController,
});

const mapDispatchToProps = (dispatch: any) => ({
	showModalAlert: (config) => dispatch(showAlert(config)),
	protectWalletVisible: () => dispatch(protectWalletModalVisible()),
	showSimpleNotification: (notification: Notification) => dispatch(showSimpleNotification(notification)),
});

export default connect(mapStateToProps, mapDispatchToProps)(AddNickname);
