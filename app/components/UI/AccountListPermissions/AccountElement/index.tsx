import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import { isDefaultAccountName } from '../../../../util/ENSUtils';
import { renderFromWei } from '../../../../util/number';
import Identicon from '../../Identicon';
import Text from '../../../../components/Base/Text';
import { getTicker } from '../../../../util/transactions';

const styles = StyleSheet.create({
	account: {
		flexDirection: 'row',
		height: 80,
	},
	border: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grey100,
	},
	accountInfo: {
		marginLeft: 15,
		marginRight: 0,
		flex: 1,
		flexDirection: 'row',
	},
	accountLabel: {
		fontSize: 18,
		color: colors.fontPrimary,
		...fontStyles.normal,
	},
	accountBalanceWrapper: {
		display: 'flex',
		flexDirection: 'row',
	},
	accountBalance: {
		paddingTop: 5,
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
		margin: 5,
		padding: 10,
	},
	selected: {
		backgroundColor: colors.yellow100,
		borderColor: colors.yellow,
		borderWidth: 1,
	},
});

interface Props {
	item: any;
	ticker: string;
	onConnect: (address: string) => void;
	onRevoke: (address: string) => void;
	index: number;
	selectedIsConnected: boolean;
	isLastConnected: boolean;
}

const AccountElement = ({ item, ticker, onConnect, onRevoke, index, selectedIsConnected, isLastConnected }: Props) => {
	const { address, isSelected, isConnected, name, ens, balance } = item;

	let isActive = false;
	if ((index === 1 && isConnected && !selectedIsConnected) || (isSelected && isConnected)) {
		isActive = true;
	}

	return (
		<View onStartShouldSetResponder={() => true}>
			<View
				style={[styles.account, isLastConnected || (isSelected && !isConnected) ? styles.border : null]}
				key={`account-${address}`}
			>
				<View style={[styles.row, isSelected && !isConnected ? styles.selected : null]}>
					<Identicon address={address} diameter={38} />
					<View style={styles.accountInfo}>
						<View style={styles.accountMain}>
							<Text numberOfLines={1} style={[styles.accountLabel]}>
								{isDefaultAccountName(name) && ens ? ens : name}
							</Text>
							<View style={styles.accountBalanceWrapper}>
								<Text style={styles.accountBalance}>
									{renderFromWei(balance)} {getTicker(ticker)}
								</Text>
							</View>
						</View>
						<TouchableOpacity onPress={() => onConnect(address)}>
							{!isConnected && <Text>Connect</Text>}
						</TouchableOpacity>
						{!!isActive && <Text>Active</Text>}
						<TouchableOpacity>
							{!isSelected && !!isConnected && <Text>Switch to this account</Text>}
						</TouchableOpacity>
						<TouchableOpacity onPress={() => onRevoke(address)}>
							{!!isConnected && <Text>Revoke</Text>}
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</View>
	);
};

export default AccountElement;
