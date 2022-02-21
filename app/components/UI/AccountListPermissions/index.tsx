import React, { useCallback, useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { FlatList, SafeAreaView, StyleSheet, View, InteractionManager, Image, TouchableOpacity } from 'react-native';
import { toChecksumAddress } from 'ethereumjs-util';
import { orderBy } from 'lodash';
import Device from '../../../util/device';
import { colors, fontStyles } from '../../../styles/common';
import ImportedEngine from '../../../core/Engine';
import { addPermittedAccount, getPermittedAccountsByOrigin, removePermittedAccount } from '../../../core/Permissions';
import AccountElement from './AccountElement';
import { doENSReverseLookup } from '../../../util/ENSUtils';
import Text from '../../../components/Base/Text';
import StyledButton from '../StyledButton';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import WebsiteIcon from '../WebsiteIcon';
import { strings } from '../../../../locales/i18n';

const Engine = ImportedEngine as any;
const metamask_fox = require('../../../images/fox.png'); // eslint-disable-line

interface Props {
	accounts: string[];
	identities: any;
	selectedAddress: string;
	keyrings: any;
	hostname: string;
	permittedAccountsMap: string[];
	ticker: any;
	network: string;
	onAccountConnect: (address: string) => void | undefined;
	onAccountsChange: (close: boolean) => void;
	thirdPartyApiMode: boolean;
	onCancel: () => void;
	currentPageInformation: any;
}

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		minHeight: '85%',
		paddingHorizontal: 24,
	},
	titleWrapper: {
		width: '100%',
		height: 33,
		alignItems: 'center',
		justifyContent: 'center',
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
	button: {
		flex: 1,
		padding: 10,
	},
	siteIcon: {
		width: 30,
		height: 30,
	},
	container: {
		flex: 1,
		paddingHorizontal: 24,
	},
	titleContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 20,
	},
	flex: {
		flex: 1,
	},
	titleText: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 16,
	},
	websiteContainer: {
		flexDirection: 'row',
	},
	websiteLabel(viewPermissions: boolean) {
		return {
			flexDirection: 'row',
			alignItems: 'center',
			backgroundColor: colors.white,
			borderWidth: 2,
			borderColor: colors.grey000,
			borderRadius: 100,
			paddingVertical: 8,
			paddingLeft: 16,
			marginBottom: 14,
			flex: !viewPermissions ? 1 : 0,
		};
	},
	websiteIconContainer: {
		marginLeft: -10,
		backgroundColor: colors.grey000,
		borderRadius: 100,
	},
	websiteText: {
		...fontStyles.bold,
		color: colors.black,
		marginLeft: 10,
		marginRight: 16,
		flexWrap: 'nowrap',
	},
	viewPermissionsText: {
		fontSize: 12,
	},
	viewPermissionsContainer: {
		paddingVertical: 10,
	},
	permissionItemText: {
		marginTop: 10,
		marginBottom: 24,
	},
	noAccountsConnected: {
		paddingVertical: 24,
		flex: 1,
	},
	cancelButton: {
		height: 44,
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
	thirdPartyApiMode,
	onAccountConnect,
	onAccountsChange,
	onCancel,
	currentPageInformation,
}: Props) => {
	const [orderedAccounts, setOrderedAccounts] = useState<any[] | null>([]);
	const [viewPermissions, setViewPermissions] = useState(false);
	const [, setAccountsENS] = useState({});

	const keyExtractor = (item: any) => item.address;

	const switchToAccount = (address: string) => {
		const { PreferencesController } = Engine.context;

		PreferencesController.setSelectedAddress(address);

		thirdPartyApiMode &&
			InteractionManager.runAfterInteractions(async () => {
				Engine.refreshTransactionHistory();
			});
	};

	const onConnect = (address: string) => {
		switchToAccount(address);
		if (onAccountConnect) {
			return onAccountConnect(address);
		}
		addPermittedAccount(hostname, address);
		onAccountsChange(true);
	};

	const onSwitch = (address: string) => {
		switchToAccount(address);
		onAccountsChange(true);
	};

	const onRevoke = (address: string) => {
		removePermittedAccount(hostname, address);
		onAccountsChange(false);
	};

	const togglePermissions = () => {
		setViewPermissions((perm) => !perm);
	};

	const renderItem = ({ item, index }: { item: string; index: number }) => {
		const selectedIsConnected = orderedAccounts?.[0]?.isSelected && orderedAccounts?.[0]?.isConnected;
		const isLastConnected =
			orderedAccounts?.length !== index + 1 &&
			orderedAccounts?.[index]?.isConnected &&
			!orderedAccounts?.[index + 1]?.isConnected;

		return (
			<AccountElement
				onConnect={onConnect}
				onRevoke={onRevoke}
				onSwitch={onSwitch}
				item={item}
				ticker={ticker}
				index={index}
				selectedIsConnected={selectedIsConnected}
				isLastConnected={isLastConnected}
				isConnectRequest={!!onAccountConnect}
				viewPermissions={viewPermissions}
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
		const permittedAccountsByOrigin = getPermittedAccountsByOrigin(permittedAccountsMap, hostname);

		if (!onAccountConnect && (!permittedAccountsByOrigin || !permittedAccountsByOrigin.length)) {
			setViewPermissions(false);
			return setOrderedAccounts(null);
		}

		const allKeyrings = keyrings?.length ? keyrings : Engine.context.KeyringController.state.keyrings;
		const accountsTracker = Engine.context.AccountTrackerController.state.accounts;

		const accountsOrdered = allKeyrings
			.reduce((list: any[], keyring: { accounts: any }) => list.concat(keyring.accounts), [])
			.filter((address: string) => !!identities[toChecksumAddress(address)]);

		const newOrderedAccounts = orderBy(
			accountsOrdered.map((addr: string) => {
				const checksummedAddress = toChecksumAddress(addr);
				const identity = identities[checksummedAddress];
				const { name, address } = identity;
				const identityAddressChecksummed = toChecksumAddress(address);
				const isConnected = Boolean(
					permittedAccountsByOrigin?.find(
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
	}, [assignENSToAccounts, hostname, identities, keyrings, onAccountConnect, permittedAccountsMap, selectedAddress]);

	const isConnectRequest = !!onAccountConnect;

	return (
		<SafeAreaView style={styles.wrapper} testID={'account-list'}>
			<View style={styles.container}>
				<View style={styles.titleWrapper}>
					<View style={styles.dragger} testID={'account-list-dragger'} />
				</View>

				<View style={styles.titleContainer}>
					{viewPermissions && (
						<TouchableOpacity style={styles.flex} onPress={() => setViewPermissions(false)}>
							<IonicIcon name={'ios-arrow-back'} size={24} style={{ color: colors.black }} />
						</TouchableOpacity>
					)}

					<Text style={styles.titleText}>
						{viewPermissions
							? strings('accountApprovalPermissions.view_permissions_title')
							: isConnectRequest
							? strings('accountApprovalPermissions.connect_title')
							: strings('accountApprovalPermissions.connected_accounts_tilte')}
					</Text>
					{viewPermissions && <View style={styles.flex} />}
				</View>
				<View style={styles.websiteContainer}>
					{viewPermissions && <View style={styles.flex} />}
					<View style={styles.websiteLabel(viewPermissions)}>
						<Image style={styles.siteIcon} source={metamask_fox} />

						<View style={styles.websiteIconContainer}>
							<WebsiteIcon
								style={styles.siteIcon}
								title={currentPageInformation?.title || hostname}
								url={currentPageInformation?.url || hostname}
								icon={currentPageInformation?.icon}
							/>
						</View>
						<Text style={styles.websiteText}>{hostname}</Text>
						{!viewPermissions && <View style={styles.flex} />}
						{!viewPermissions && (
							<StyledButton
								type={'transparent-blue'}
								onPress={togglePermissions}
								style={styles.viewPermissionsText}
								testID={'view-permissions-button'}
								containerStyle={styles.viewPermissionsContainer}
							>
								{strings('accountApprovalPermissions.view_permissions_title')}
							</StyledButton>
						)}
					</View>
					{viewPermissions && <View style={styles.flex} />}
				</View>
				{viewPermissions ? (
					<Text style={styles.permissionItemText}>
						{strings('accountApprovalPermissions.permission_description')}
					</Text>
				) : null}

				{!orderedAccounts ? (
					<View style={styles.noAccountsConnected}>
						<Text>{'not_connected_description'}</Text>
					</View>
				) : (
					<FlatList
						data={orderedAccounts}
						keyExtractor={keyExtractor}
						renderItem={renderItem}
						style={styles.accountsWrapper}
						testID={'account-number-button'}
						getItemLayout={(_, index) => ({ length: 80, offset: 80 * index, index })} // eslint-disable-line
					/>
				)}
				<View style={styles.cancelButton}>
					<StyledButton
						type={'cancel'}
						onPress={onCancel}
						containerStyle={styles.button}
						testID={'connect-cancel-button'}
					>
						{strings('accountApprovalPermissions.cancel')}
					</StyledButton>
				</View>
			</View>
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
