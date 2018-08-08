import React, { Component } from 'react';
import { TouchableOpacity, StyleSheet, Text, View, SafeAreaView } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { colors, fontStyles } from '../../styles/common';
import Identicon from '../Identicon';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.concrete,
		flex: 1
	},
	title: {
		fontSize: 25,
		marginVertical: 30,
		marginHorizontal: 20,
		color: colors.fontPrimary,
		...fontStyles.bold
	},
	account: {
		flexDirection: 'row',
		marginLeft: 20,
		marginBottom: 20
	},
	accountInfo: {
		marginLeft: 15
	},
	accountLabel: {
		fontSize: 18,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	accountBalance: {
		paddingTop: 5,
		fontSize: 12,
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	selected: {
		width: 30,
		marginRight: 15
	}
});

/**
 * View contains the list of all the available accounts
 */

export default class AccountList extends Component {
	state = {
		selectedAccountIndex: 0
	};

	onAccountPress = newIndex => {
		this.setState({ selectedAccountIndex: newIndex });
	};

	renderAccounts() {
		const accounts = [
			{
				label: 'Account 1',
				address: '0xe7E125654064EEa56229f273dA586F10DF96B0a1',
				balance: '0.017700'
			},
			{
				label: 'Account 2',
				address: '0xf4F6A83117a9D0a9cA3b9684DEDaBc69d56721D8',
				balance: '0.4'
			}
		];

		return accounts.map((account, i) => {
			const selected =
				this.state.selectedAccountIndex === i ? <Icon name="check" size={30} color={colors.primary} /> : null;

			const { address, label, balance } = account;

			return (
				<TouchableOpacity
					style={styles.account}
					key={`account-${address}`}
					onPress={() => this.onAccountPress(i)} // eslint-disable-line
				>
					<View style={styles.selected}>{selected}</View>
					<Identicon address={address} diameter={38} />
					<View style={styles.accountInfo}>
						<Text style={styles.accountLabel}>{label}</Text>
						<Text style={styles.accountBalance}>{balance} ETH</Text>
					</View>
				</TouchableOpacity>
			);
		});
	}

	render() {
		return (
			<SafeAreaView style={styles.wrapper}>
				<Text style={styles.title}>My Accounts</Text>
				<View style={styles.accountsWrapper}>{this.renderAccounts()}</View>
			</SafeAreaView>
		);
	}
}
