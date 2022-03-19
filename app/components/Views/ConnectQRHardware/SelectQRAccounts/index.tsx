import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import Icon from 'react-native-vector-icons/FontAwesome';
import { fontStyles, colors as importedColors } from '../../../../styles/common';
import CheckBox from '@react-native-community/checkbox';
import util from './util';
import { IAccount } from '../types';
import { renderFromWei } from '../../../../util/number';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { getEtherscanAddressUrl } from '../../../../util/etherscan';
import { getNetworkTypeByChainId } from '../../../../util/networks';
import { mockTheme, useAppThemeFromContext } from '../../../../util/theme';

interface ISelectQRAccountsProps {
	canUnlock: boolean;
	accounts: IAccount[];
	nextPage: () => void;
	prevPage: () => void;
	toggleAccount: (index: number) => void;
	onUnlock: () => void;
	onForget: () => void;
}

const createStyle = (colors: any) =>
	StyleSheet.create({
		container: {
			width: '100%',
			paddingHorizontal: 32,
		},
		title: {
			marginTop: 40,
			fontSize: 24,
			marginBottom: 24,
			...fontStyles.normal,
			color: colors.text.default,
		},
		account: {
			flexDirection: 'row',
			alignItems: 'center',
			height: 36,
			width: '100%',
			paddingHorizontal: 12,
			paddingVertical: 4,
		},
		checkBox: {
			marginRight: 8,
		},
		accountUnchecked: {
			backgroundColor: colors.primary.muted,
		},
		accountChecked: {
			backgroundColor: colors.primary.disabled,
		},
		number: {
			...fontStyles.normal,
			color: colors.text.default,
		},
		address: {
			marginLeft: 8,
			fontSize: 15,
			flexGrow: 1,
			...fontStyles.normal,
			color: colors.text.default,
		},
		pagination: {
			marginTop: 4,
			alignSelf: 'flex-end',
			flexDirection: 'row',
			alignItems: 'center',
		},
		paginationText: {
			fontSize: 18,
			color: colors.primary.default,
		},
		paginationItem: {
			flexDirection: 'row',
			alignItems: 'center',
			marginRight: 8,
			...fontStyles.normal,
		},
		bottom: {
			alignItems: 'center',
			marginTop: 120,
			height: 108,
			justifyContent: 'space-between',
		},
		button: {
			width: '80%',
			borderRadius: 25,
			height: 50,
			alignItems: 'center',
			justifyContent: 'center',
			padding: 12,
		},
		backgroundBlue: {
			backgroundColor: colors.primary.default,
		},
		backgroundGrey: {
			backgroundColor: colors.primary.disabled,
		},
		textBlue: {
			fontSize: 14,
			color: colors.primary.default,
			...fontStyles.normal,
		},
		textWhite: {
			fontSize: 14,
			color: importedColors.white,
			...fontStyles.normal,
		},
	});

const SelectQRAccounts = (props: ISelectQRAccountsProps) => {
	const { accounts, prevPage, nextPage, toggleAccount, onForget, onUnlock, canUnlock } = props;
	const { colors } = useAppThemeFromContext() || mockTheme;
	const styles = createStyle(colors);
	const navigation = useNavigation();
	const chainId = useSelector((state: any) => state.engine.backgroundState.NetworkController.provider.chainId);

	const toEtherscan = (address: string) => {
		const accountLink = getEtherscanAddressUrl(getNetworkTypeByChainId(chainId), address);
		navigation.navigate('Webview', {
			screen: 'SimpleWebview',
			params: {
				url: accountLink,
			},
		});
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>{strings('connect_qr_hardware.select_accounts')}</Text>
			<FlatList
				data={accounts}
				keyExtractor={(item) => `address-${item.index}`}
				renderItem={({ item }) => (
					<View style={[styles.account, item.checked ? styles.accountChecked : styles.accountUnchecked]}>
						<CheckBox
							style={styles.checkBox}
							disabled={item.exist}
							value={item.checked}
							onValueChange={() => toggleAccount(item.index)}
							boxType={'square'}
							tintColors={{ true: colors.background.default, false: colors.background.default }}
							testID={'skip-backup-check'}
						/>
						<Text style={styles.number}>{item.index}</Text>
						<Text style={styles.address}>{util.clipAddress(item.address, 4, 4)}</Text>
						<Text style={styles.address}>{renderFromWei(item.balance)} ETH</Text>
						<Icon
							size={18}
							name={'external-link'}
							onPress={() => toEtherscan(item.address)}
							color={colors.text.default}
						/>
					</View>
				)}
			/>
			<View style={styles.pagination}>
				<TouchableOpacity style={styles.paginationItem} onPress={prevPage}>
					<Icon name={'chevron-left'} color={colors.primary.default} />
					<Text style={styles.paginationText}>{strings('connect_qr_hardware.prev')}</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.paginationItem} onPress={nextPage}>
					<Text style={styles.paginationText}>{strings('connect_qr_hardware.next')}</Text>
					<Icon name={'chevron-right'} color={colors.primary.default} />
				</TouchableOpacity>
			</View>

			<View style={styles.bottom}>
				<TouchableOpacity
					onPress={onUnlock}
					style={[styles.button, canUnlock ? styles.backgroundBlue : styles.backgroundGrey]}
					disabled={!canUnlock}
				>
					<Text style={styles.textWhite}>{strings('connect_qr_hardware.unlock')}</Text>
				</TouchableOpacity>
				<TouchableOpacity onPress={onForget} style={styles.button}>
					<Text style={styles.textBlue}>{strings('connect_qr_hardware.forget')}</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

export default SelectQRAccounts;
