import React, { Component } from 'react';
import { TouchableOpacity, StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
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

class AccountList extends Component {
	static propTypes = {
		/**
		 * An object containing each identity in the format addres => account
		 */
		accounts: PropTypes.object
	};

	state = {
		selectedAccountIndex: 0
	};

	onAccountPress = newIndex => {
		this.setState({ selectedAccountIndex: newIndex });
	};

	renderAccounts() {
		const { accounts } = this.props;
		return Object.keys(accounts).map((key, i) => {
			const { name, address } = accounts[key];
			const selected =
				this.state.selectedAccountIndex === i ? <Icon name="check" size={30} color={colors.primary} /> : null;
			const balance = 0;

			return (
				<TouchableOpacity
					style={styles.account}
					key={`account-${address}`}
					onPress={() => this.onAccountPress(i)} // eslint-disable-line
				>
					<View style={styles.selected}>{selected}</View>
					<Identicon address={address} diameter={38} />
					<View style={styles.accountInfo}>
						<Text style={styles.accountLabel}>{name}</Text>
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

const mapStateToProps = state => ({ accounts: state.backgroundState.preferences.identities });
export default connect(mapStateToProps)(AccountList);
