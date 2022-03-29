import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, InteractionManager } from 'react-native';
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
	descriptionContainer: { marginTop: 4, flexDirection: 'row', alignItems: 'center' },
	tokenImage: { height: 36, width: 36, marginRight: 8 },
	sectionTitleLabel: {
		...(fontStyles.bold as any),
		fontSize: 16,
		color: colors.black,
		marginTop: 32,
	},
	firstSectionTitle: {
		marginTop: 8,
	},
	descriptionLabel: {
		...(fontStyles.normal as any),
		fontSize: 16,
		color: colors.black,
	},
	hideButton: {
		marginTop: 48,
	},
	hideButtonLabel: {
		...(fontStyles.normal as any),
		fontSize: 16,
		color: colors.red,
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
	const asset = props.route.params;
	const { address, decimals, symbol, aggregators, balance, balanceFiat, balanceError } = asset;
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
		navigation.setOptions(getNetworkNavbarOptions('Token Details', false, navigation, undefined, true));
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
			onConfirm: () => {
				navigation.navigate('WalletView');
				InteractionManager.runAfterInteractions(async () => {
					try {
						await TokensController.removeAndIgnoreToken(address);
						NotificationManager.showSimpleNotification({
							status: `simple_notification`,
							duration: 5000,
							title: strings('wallet.token_hidden_notif_title'),
							description: strings('wallet.token_hidden_notif_desc', { tokenSymbol: symbol }),
						});
					} catch (err) {
						Logger.log(err, 'AssetDetails: Failed to ignore token!');
					}
				});
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

	const renderSectionTitle = (title: string, isFirst?: boolean) => (
		<Text style={[styles.sectionTitleLabel, isFirst && styles.firstSectionTitle]}>{title}</Text>
	);

	const renderSectionDescription = (description: string) => (
		<Text style={[styles.descriptionLabel, styles.descriptionContainer]}>{description}</Text>
	);

	const renderTokenSymbol = () => (
		<View style={styles.descriptionContainer}>
			<TokenImage asset={asset} containerStyle={styles.tokenImage} iconStyle={styles.tokenImage} />
			<Text style={styles.descriptionLabel}>{symbol}</Text>
		</View>
	);

	const renderTokenBalance = () =>
		balanceError ? (
			renderWarning()
		) : (
			<View style={styles.descriptionContainer}>
				<Text style={styles.descriptionLabel}>{`${balance}${balanceFiat ? ` (${balanceFiat})` : ''}`}</Text>
			</View>
		);

	const renderHideButton = () => (
		<TouchableOpacity
			onPress={triggerIgnoreToken}
			hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
			style={styles.hideButton}
		>
			<Text style={styles.hideButtonLabel}>{strings('asset_details.hide_cta')}</Text>
		</TouchableOpacity>
	);

	const renderTokenAddressLink = () => (
		<TouchableOpacity
			hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
			onPress={copyAddressToClipboard}
			style={styles.descriptionContainer}
		>
			<EthereumAddress style={styles.addressLinkLabel} address={address} type={'short'} />
			<Icon style={styles.copyIcon} name={'copy'} size={16} />
		</TouchableOpacity>
	);

	return (
		<ScrollView contentContainerStyle={styles.container}>
			{renderSectionTitle(strings('asset_details.token'), true)}
			{renderTokenSymbol()}
			{renderSectionTitle(strings('asset_details.amount'))}
			{renderTokenBalance()}
			{renderSectionTitle(strings('asset_details.address'))}
			{renderTokenAddressLink()}
			{renderSectionTitle(strings('asset_details.decimal'))}
			{renderSectionDescription(String(decimals))}
			{renderSectionTitle(strings('asset_details.network'))}
			{renderSectionDescription(getNetworkName())}
			{renderSectionTitle(strings('asset_details.lists'))}
			{renderSectionDescription(aggregators.join(', '))}
			{renderHideButton()}
		</ScrollView>
	);
};

export default AssetDetails;
