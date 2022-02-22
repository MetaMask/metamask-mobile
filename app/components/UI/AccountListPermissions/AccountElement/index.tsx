import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import { isDefaultAccountName } from '../../../../util/ENSUtils';
import { renderFromWei } from '../../../../util/number';
import Identicon from '../../Identicon';
import Text from '../../../../components/Base/Text';
import { getTicker } from '../../../../util/transactions';
import EthereumAddress from '../../EthereumAddress';
import StyledButton from '../../StyledButton';
import { strings } from '../../../../../locales/i18n';

const styles = StyleSheet.create({
	account: {
		flexDirection: 'row',
		height: 80,
	},
	border: {
		borderBottomWidth: 2,
		borderColor: colors.grey000,
	},
	accountInfo: {
		flex: 1,
		flexDirection: 'row',
	},
	accountLabel: {
		marginLeft: 8,
		...fontStyles.normal,
	},
	accountBalanceWrapper: {
		marginTop: 10,
		display: 'flex',
		flexDirection: 'row',
		alignItems: 'center',
	},
	accountBalance: {
		marginLeft: 8,
		fontSize: 12,
		color: colors.fontSecondary,
		...fontStyles.normal,
	},
	accountMain: {
		flex: 1,
		flexDirection: 'column',
	},
	row: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		padding: 8,
	},
	selected: {
		borderRadius: 10,
		backgroundColor: colors.yellow100,
		borderColor: colors.yellow,
		borderWidth: 1,
		marginBottom: 8,
	},
	accountNameContainer: {
		flexDirection: 'row',
	},
	notConnectedText: {
		fontSize: 12,
	},
	isActiveContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginLeft: 6,
	},
	isActiveLabel: {
		width: 8,
		height: 8,
		backgroundColor: colors.green300,
		borderRadius: 100,
		marginRight: 5,
	},
	isActiveText: {
		fontSize: 12,
		...fontStyles.normal,
	},
	ethAddressText: {
		color: colors.fontSecondary,
		fontSize: 12,
		...fontStyles.normal,
	},
	connectContainer: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	connectText: {
		fontSize: 11,
	},
	connectTextContainer: {
		paddingVertical: 10,
		paddingHorizontal: 24,
	},
	activeContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	activeLabel: {
		width: 8,
		height: 8,
		backgroundColor: colors.green300,
		borderRadius: 100,
		marginRight: 5,
	},
	activeText: {
		fontSize: 12,
		...fontStyles.normal,
	},
	button: {
		fontSize: 12,
		...fontStyles.normal,
	},
	buttonText: {
		fontSize: 11,
	},
	buttonContainer: {
		paddingVertical: 10,
		paddingHorizontal: 24,
	},
});

interface Props {
	item: any;
	ticker: string;
	onConnect: (address: string) => void;
	onRevoke: (address: string) => void;
	onSwitch: (address: string) => void;
	index: number;
	selectedIsConnected: boolean;
	isLastConnected: boolean;
	isConnectRequest: boolean;
	viewPermissions: boolean;
}

const AccountElement = ({
	item,
	ticker,
	onConnect,
	onRevoke,
	onSwitch,
	index,
	selectedIsConnected,
	isLastConnected,
	isConnectRequest,
	viewPermissions,
}: Props) => {
	const { address, isSelected, isConnected, name, ens, balance } = item;

	if (viewPermissions && !isConnected) return null;

	let isActive = false;
	if ((index === 1 && isConnected && !selectedIsConnected) || (isSelected && isConnected)) {
		isActive = true;
	}

	const selectedIsNotConnected = !isConnectRequest && isSelected && !isConnected;

	return (
		<View onStartShouldSetResponder={() => true}>
			<View
				style={[
					styles.account,
					isLastConnected || (isSelected && !isConnected && !isConnectRequest) ? styles.border : null,
				]}
				key={`account-${address}`}
			>
				<View style={[styles.row, selectedIsNotConnected ? styles.selected : null]}>
					<View style={styles.accountInfo}>
						<View style={styles.accountMain}>
							<View style={styles.accountNameContainer}>
								<Identicon address={address} diameter={20} />

								<Text numberOfLines={1} style={[styles.accountLabel]}>
									{isDefaultAccountName(name) && ens ? ens : name}
									<Text style={styles.notConnectedText}>
										{selectedIsNotConnected
											? ` (${strings('account_approval_permissions.account_not_connected')})`
											: ''}
									</Text>
								</Text>
								{isActive && !isSelected ? (
									<View style={styles.isActiveContainer}>
										<View style={styles.isActiveLabel} />
										<Text style={styles.isActiveText}>
											{strings('account_approval_permissions.active')}
										</Text>
									</View>
								) : null}
							</View>
							<View style={styles.accountBalanceWrapper}>
								<Text style={styles.ethAddressText}>(</Text>
								<EthereumAddress address={address} style={styles.ethAddressText} type={'short'} />
								<Text style={styles.ethAddressText}>)</Text>
								<Text style={styles.accountBalance}>
									{renderFromWei(balance)} {getTicker(ticker)}
								</Text>
							</View>
						</View>
						{!isConnected && (
							<View style={styles.connectContainer}>
								<StyledButton
									type="confirm-alternative"
									style={styles.connectText}
									containerStyle={styles.connectTextContainer}
									onPress={() => onConnect(address)}
								>
									{strings('account_approval_permissions.connect')}
								</StyledButton>
							</View>
						)}
						{!viewPermissions && isActive && isSelected ? (
							<View style={styles.activeContainer}>
								<View style={styles.activeLabel} />
								<Text style={styles.activeText}>{strings('account_approval_permissions.active')}</Text>
							</View>
						) : null}
						{!viewPermissions && !isSelected && !!isConnected ? (
							<View style={styles.button}>
								<StyledButton
									type="confirm-alternative"
									style={styles.buttonText}
									containerStyle={styles.buttonContainer}
									onPress={() => onSwitch(address)}
								>
									{strings('account_approval_permissions.switch_to_accounts')}
								</StyledButton>
							</View>
						) : null}
						{viewPermissions && isConnected ? (
							<View style={styles.button}>
								<StyledButton
									type="confirm-alternative"
									style={styles.buttonText}
									containerStyle={styles.buttonContainer}
									onPress={() => onRevoke(address)}
								>
									{strings('account_approval_permissions.revoke')}
								</StyledButton>
							</View>
						) : null}
					</View>
				</View>
			</View>
		</View>
	);
};

export default AccountElement;
