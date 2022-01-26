import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import Icon from 'react-native-vector-icons/FontAwesome';
import { colors } from '../../../../styles/common';
import CheckBox from '@react-native-community/checkbox';

interface Props {
	accounts: { address: string; index: number; checked: boolean; exist: boolean }[];
	nextPage: () => void;
	prevPage: () => void;
	toggleAccount: (index: number) => void;
	onUnlock: () => void;
	onForget: () => void;
}

const styles = StyleSheet.create({
	container: {
		width: '100%',
	},
	title: {
		marginTop: 40,
		fontSize: 24,
		marginBottom: 24,
	},
	account: {
		flexDirection: 'row',
		alignItems: 'center',
		height: 36,
		width: '100%',
		paddingHorizontal: 12,
		paddingVertical: 4,
		marginBottom: -2,
	},
	account_unchecked: {
		backgroundColor: colors.grey000,
	},
	account_checked: {
		backgroundColor: colors.grey050,
	},
	address: {
		marginLeft: 8,
		fontSize: 15,
		flexGrow: 1,
	},
	checkbox: {},
	external_link: {},
	pagination: {
		alignSelf: 'flex-end',
		flexDirection: 'row',
		alignItems: 'center',
	},
	pagination_text: {
		fontSize: 18,
		color: colors.blue200,
	},
	pagination_item: {
		flexDirection: 'row',
		alignItems: 'center',
		marginRight: 8,
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
		padding: 12,
	},
	button_blue: {
		backgroundColor: colors.blue,
	},
	button_white: {},
	button_text_blue: {
		color: colors.blue,
	},
	button_text_white: {
		color: colors.white,
	},
});

const dealWithAddress = (address: string) => {
	const length = address.length;
	return `${address.slice(0, 8)}......${address.slice(length - 8, length)}`;
};

const SelectQRAccounts = (props: Props) => {
	const { accounts, prevPage, nextPage, toggleAccount, onForget, onUnlock } = props;

	return (
		<View style={styles.container}>
			<Text style={styles.title}>{strings('connect_qr_hardware.select_accounts')}</Text>
			<FlatList
				data={accounts}
				keyExtractor={(item) => `address-${item.index}`}
				renderItem={({ item }) => (
					<View style={[styles.account, item.checked ? styles.account_checked : styles.account_unchecked]}>
						<CheckBox
							disabled={item.exist}
							style={styles.checkbox}
							value={item.checked}
							onValueChange={() => toggleAccount(item.index)}
							boxType={'square'}
							tintColors={{ true: colors.grey200, false: colors.grey100 }}
							testID={'skip-backup-check'}
						/>
						<Text style={styles.address}>{dealWithAddress(item.address)}</Text>
						<Icon style={styles.external_link} size={18} name={'external-link'} />
					</View>
				)}
			/>
			<View style={styles.pagination}>
				<TouchableOpacity style={styles.pagination_item} onPress={prevPage}>
					<Icon name={'chevron-left'} color={colors.blue200} />
					<Text style={styles.pagination_text}>{strings('connect_qr_hardware.prev')}</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.pagination_item} onPress={nextPage}>
					<Text style={styles.pagination_text}>{strings('connect_qr_hardware.next')}</Text>
					<Icon name={'chevron-right'} color={colors.blue200} />
				</TouchableOpacity>
			</View>

			<View style={styles.bottom}>
				<TouchableOpacity onPress={onUnlock} style={[styles.button, styles.button_blue]}>
					<Text style={styles.button_text_white}>{strings('connect_qr_hardware.unlock')}</Text>
				</TouchableOpacity>
				<TouchableOpacity onPress={onForget} style={[styles.button, styles.button_white]}>
					<Text style={styles.button_text_blue}>{strings('connect_qr_hardware.forget')}</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

export default SelectQRAccounts;
