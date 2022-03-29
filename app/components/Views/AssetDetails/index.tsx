import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getNetworkNavbarOptions } from '../../UI/Navbar';
import { colors, fontStyles } from '../../../styles/common';
import ClipboardManager from '../../../core/ClipboardManager';
import { showAlert } from '../../../actions/alert';
import { strings } from '../../../../locales/i18n';
import { useDispatch, useSelector } from 'react-redux';
import EthereumAddress from '../../UI/EthereumAddress';
import Icon from 'react-native-vector-icons/Feather';
import TokenImage from '../../UI/TokenImage';
import Networks from '../../../util/networks';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import NotificationManager from '../../../core/NotificationManager';
import AppConstants from '../../../core/AppConstants';

const styles = StyleSheet.create({
	container: {
		padding: 16,
		backgroundColor: colors.white,
		alignItems: 'flex-start',
	},
	balanceContainer: { marginTop: 8 },
	balanceAmountLabel: {
		...(fontStyles.bold as any),
		fontSize: 32,
		color: colors.black,
		marginTop: 8,
	},
	fiatAmountLabel: {
		...(fontStyles.normal as any),
		fontSize: 16,
		color: colors.black,
	},
	tokenImage: { height: 50, width: 50 },
	sectionTitleLabel: {
		...(fontStyles.bold as any),
		fontSize: 16,
		color: colors.black,
		marginTop: 32,
	},
	sectionDescription: {
		...(fontStyles.normal as any),
		fontSize: 16,
		color: colors.black,
		marginTop: 4,
	},
	hideButton: {
		marginTop: 48,
	},
	hideButtonLabel: {
		...(fontStyles.normal as any),
		fontSize: 16,
		color: colors.red,
	},
	addressLinkContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 4,
	},
	addressLinkLabel: {
		...(fontStyles.normal as any),
		fontSize: 16,
		color: colors.blue,
	},
	copyIcon: {
		marginLeft: 4,
		color: colors.blue,
	},
	warning: {
		borderRadius: 8,
		color: colors.black,
		...(fontStyles.normal as any),
		fontSize: 14,
		lineHeight: 20,
		borderWidth: 1,
		borderColor: colors.yellow,
		backgroundColor: colors.yellow100,
		padding: 20,
	},
	warningLinks: {
		color: colors.blue,
	},
});

interface Props {
	route: {
		params: {
			address: string;
			decimals: number;
			symbol: string;
			aggregators: string[];
			balance: string;
			balanceFiat: string;
			balanceError?: string;
			logo: string;
		};
	};
}

const AssetDetails = (props: Props) => {
	const { address, decimals, symbol, aggregators, balance, balanceFiat, balanceError } = props.route.params;
	const asset = props.route.params;
	const navigation = useNavigation();
	const dispatch = useDispatch();
	const network = useSelector((state: any) => state.engine.backgroundState.NetworkController);

	const getNetworkName = () => {
		let name = '';
		if (network.provider.nickname) {
			name = network.provider.nickname;
		} else {
			name = (Networks as any)[network.provider.type]?.name || { ...Networks.rpc, color: null }.name;
		}
		return name;
	};

	useEffect(() => {
		navigation.setOptions(getNetworkNavbarOptions('Token Details', false, navigation));
	}, [navigation]);

	const copyAddressToClipboard = async () => {
		await ClipboardManager.setString(address);
		dispatch(
			showAlert({
				isVisible: true,
				autodismiss: 1500,
				content: 'clipboard-alert',
				data: { msg: strings('detected_tokens.address_copied_to_clipboard') },
			})
		);
	};

	const triggerIgnoreToken = () => {
		const { TokensController } = Engine.context as any;
		navigation.navigate('AssetHideConfirmation', {
			onConfirm: async () => {
				try {
					await TokensController.removeAndIgnoreToken(address);
					navigation.navigate('WalletView');
					NotificationManager.showSimpleNotification({
						status: `simple_notification`,
						duration: 5000,
						title: 'Token Ignored',
						description: `Ignoring ${symbol} from wallet`,
					});
				} catch (err) {
					Logger.log(err, 'AssetDetails: Failed to ignore token!');
				}
			},
		});
	};

	const renderWarning = () => (
		<TouchableOpacity
			onPress={() =>
				navigation.navigate('BrowserTabHome', {
					screen: 'BrowserView',
					params: {
						newTabUrl: AppConstants.URLS.TOKEN_BALANCE,
						timestamp: Date.now(),
					},
				})
			}
		>
			<Text style={styles.warning}>
				{strings('asset_overview.were_unable')} {symbol} {strings('asset_overview.balance')}{' '}
				<Text style={styles.warningLinks}>{strings('asset_overview.troubleshooting_missing')}</Text>{' '}
				{strings('asset_overview.for_help')}
			</Text>
		</TouchableOpacity>
	);

	const renderBalanceSection = () =>
		balanceError ? (
			renderWarning()
		) : (
			<View style={styles.balanceContainer}>
				<TokenImage asset={asset} containerStyle={styles.tokenImage} iconStyle={styles.tokenImage} />
				<Text style={styles.balanceAmountLabel}>{`${balance} ${symbol}`}</Text>
				<Text style={styles.fiatAmountLabel}>{balanceFiat}</Text>
			</View>
		);

	const renderSectionTitle = (title: string) => <Text style={styles.sectionTitleLabel}>{title}</Text>;

	const renderSectionDescription = (description: string) => (
		<Text style={styles.sectionDescription}>{description}</Text>
	);

	const renderHideButton = () => (
		<TouchableOpacity
			onPress={triggerIgnoreToken}
			hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
			style={styles.hideButton}
		>
			<Text style={styles.hideButtonLabel}>{'Hide token'}</Text>
		</TouchableOpacity>
	);

	const renderTokenAddressLink = () => (
		<TouchableOpacity
			hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
			onPress={copyAddressToClipboard}
			style={styles.addressLinkContainer}
		>
			<EthereumAddress style={styles.addressLinkLabel} address={address} type={'short'} />
			<Icon style={styles.copyIcon} name={'copy'} size={16} />
		</TouchableOpacity>
	);

	return (
		<ScrollView contentContainerStyle={styles.container}>
			{renderBalanceSection()}
			{renderSectionTitle('Token contract address')}
			{renderTokenAddressLink()}
			{renderSectionTitle('Token decimal')}
			{renderSectionDescription(String(decimals))}
			{renderSectionTitle('Network')}
			{renderSectionDescription(getNetworkName())}
			{renderSectionTitle('Token lists')}
			{renderSectionDescription(aggregators.join(', '))}
			{renderHideButton()}
		</ScrollView>
	);
};

export default AssetDetails;
