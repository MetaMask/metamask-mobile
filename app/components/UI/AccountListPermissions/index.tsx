import React, { useCallback, useEffect, useRef, useState } from 'react';
import { connect } from 'react-redux';
import { FlatList, SafeAreaView, StyleSheet, View } from 'react-native';
import { toChecksumAddress } from 'ethereumjs-util';
import { orderBy } from 'lodash';
import Device from '../../../util/device';
import { colors } from '../../../styles/common';
import ImportedEngine from '../../../core/Engine';
import { addPermittedAccount, getPermittedAccountsByOrigin, removePermittedAccount } from '../../../core/Permissions';
import AccountElement from './AccountElement';
import { doENSReverseLookup } from '../../../util/ENSUtils';

const Engine = ImportedEngine as any;

interface Props {
	accounts: string[];
	identities: any;
	selectedAddress: string;
	keyrings: any;
	hostname: string;
	permittedAccountsMap: string[];
	ticker: any;
	network: string;
	onAccountConnect: (address: string) => void;
	onAccountsChange: (close: boolean) => void;
}

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		minHeight: 450,
	},
	titleWrapper: {
		width: '100%',
		height: 33,
		alignItems: 'center',
		justifyContent: 'center',
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grey100,
	},
	dragger: {
		width: 48,
		height: 5,
		borderRadius: 4,
		backgroundColor: colors.grey400,
		opacity: Device.isAndroid() ? 0.6 : 0.5,
	},
	accountsWrapper: {
		flex: 1,
	},
});

const AccountListPermissions = ({
	identities,
	selectedAddress,
	keyrings,
	hostname,
	permittedAccountsMap,
	ticker,
	network,
	onAccountConnect,
	onAccountsChange,
}: Props) => {
	const flatList = useRef();
	const [orderedAccounts, setOrderedAccounts] = useState<any[]>([]);
	const [, setAccountsENS] = useState({});

	const keyExtractor = (item: any) => item.address;

	const onConnect = (address: string) => {
		if (onAccountConnect) {
			return onAccountConnect(address);
		}
		addPermittedAccount(hostname, address);
		onAccountsChange(true);
	};

	const onRevoke = (address: string) => {
		removePermittedAccount(hostname, address);
		onAccountsChange(false);
	};

	const renderItem = ({ item, index }: { item: string; index: number }) => {
		const selectedIsConnected = orderedAccounts?.[0]?.isSelected && orderedAccounts?.[0]?.isConnected;
		const isLastConnected =
			orderedAccounts.length !== index + 1 &&
			orderedAccounts?.[index]?.isConnected &&
			!orderedAccounts?.[index + 1]?.isConnected;

		return (
			<AccountElement
				onConnect={onConnect}
				onRevoke={onRevoke}
				item={item}
				ticker={ticker}
				index={index}
				selectedIsConnected={selectedIsConnected}
				isLastConnected={isLastConnected}
			/>
		);
	};

	const assignENSToAccounts = useCallback(
		(newOrderedAccounts: string[]) => {
			newOrderedAccounts.forEach(async (account: any) => {
				try {
					const ens = await doENSReverseLookup(account.address, network);
					setAccountsENS((oldAccountsENS: any) => ({
						...oldAccountsENS,
						[account.address]: ens,
					}));
				} catch {
					// Error
				}
			});
		},
		[network]
	);

	useEffect(() => {
		const allKeyrings = keyrings?.length ? keyrings : Engine.context.KeyringController.state.keyrings;
		const accountsTracker = Engine.context.AccountTrackerController.state.accounts;

		const accountsOrdered = allKeyrings
			.reduce((list: any[], keyring: { accounts: any }) => list.concat(keyring.accounts), [])
			.filter((address: string) => !!identities[toChecksumAddress(address)]);

		const permittedAccountsByOrigin = getPermittedAccountsByOrigin(permittedAccountsMap);

		const newOrderedAccounts = orderBy(
			accountsOrdered.map((addr: string) => {
				const checksummedAddress = toChecksumAddress(addr);
				const identity = identities[checksummedAddress];
				const { name, address } = identity;
				const identityAddressChecksummed = toChecksumAddress(address);
				const isConnected = Boolean(
					permittedAccountsByOrigin[hostname]?.find(
						(item: string) => toChecksumAddress(item) === identityAddressChecksummed
					)
				);

				const isSelected = Boolean(identityAddressChecksummed === toChecksumAddress(selectedAddress));

				const lastSelected = identity.lastSelected;
				let balance = 0x0;
				if (accountsTracker[identityAddressChecksummed]) {
					balance = accountsTracker[identityAddressChecksummed].balance;
				}

				return {
					name,
					address: addr,
					balance,
					isSelected,
					isConnected,
					lastSelected,
				};
			}),
			['isSelected', 'isConnected', 'lastSelected'],
			['desc', 'desc', 'desc']
		);

		setOrderedAccounts(newOrderedAccounts);

		assignENSToAccounts(newOrderedAccounts);
	}, [assignENSToAccounts, hostname, identities, keyrings, permittedAccountsMap, selectedAddress]);

	return (
		<SafeAreaView style={styles.wrapper} testID={'account-list'}>
			<View style={styles.titleWrapper}>
				<View style={styles.dragger} testID={'account-list-dragger'} />
			</View>
			<FlatList
				data={orderedAccounts}
				keyExtractor={keyExtractor}
				renderItem={renderItem}
				ref={flatList}
				style={styles.accountsWrapper}
				testID={'account-number-button'}
				getItemLayout={(_, index) => ({ length: 80, offset: 80 * index, index })} // eslint-disable-line
			/>
		</SafeAreaView>
	);
};

const mapStateToProps = (state: {
	privacy: { thirdPartyApiMode: any };
	engine: {
		backgroundState: {
			KeyringController: { keyrings: any };
			NetworkController: { network: any; provider: { ticker: any } };
			PermissionController: any;
			PreferencesController: { identities: any; selectedAddress: any };
		};
	};
}) => ({
	thirdPartyApiMode: state.privacy.thirdPartyApiMode,
	keyrings: state.engine.backgroundState.KeyringController.keyrings,
	network: state.engine.backgroundState.NetworkController.network,
	permittedAccountsMap: state.engine.backgroundState.PermissionController,

	identities: state.engine.backgroundState.PreferencesController.identities,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
});

export default connect(mapStateToProps)(AccountListPermissions);
