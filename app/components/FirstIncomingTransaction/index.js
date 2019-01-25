import React, { Component } from 'react';
import { Text, View, SafeAreaView, StyleSheet } from 'react-native';

import PropTypes from 'prop-types';
import { strings } from '../../../locales/i18n';
import { colors, fontStyles } from '../../styles/common';
import { getNavigationOptionsTitle } from '../Navbar';
import StyledButton from '../StyledButton';
import Emoji from 'react-native-emoji';
import { renderShortAddress } from '../../util/address';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flex: 1,
		padding: 20
	},
	content: {
		alignItems: 'flex-start'
	},
	title: {
		fontSize: 32,
		marginLeft: 20,
		marginTop: 20,
		marginBottom: 40,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'left',
		...fontStyles.normal
	},
	dataRow: {
		marginLeft: 20,
		marginBottom: 10,
		flexDirection: 'row',
		justifyContent: 'center'
	},
	label: {
		width: 100,
		fontSize: 16,
		color: colors.fontPrimary,
		textAlign: 'left',
		...fontStyles.normal
	},
	value: {
		fontSize: 16,
		color: colors.fontPrimary,
		textAlign: 'left',
		...fontStyles.normal
	},
	emoji: {
		textAlign: 'left',
		fontSize: 72,
		marginTop: 30,
		marginLeft: 20
	},
	buttonWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
	}
});

/**
 * Component that provides ability to render transaction submitted view
 */
export default class FirstIncomingTransaction extends Component {
	static navigationOptions = () => getNavigationOptionsTitle(strings('transaction_submitted.title'));

	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object
	};

	goNext = () => {
		this.props.navigation.goBack();
	};

	render = () => {
		const { navigation } = this.props;
		const tx = navigation.getParam('incomingTransaction', null);
		const selectedAddress = navigation.getParam('selectedAddress', null);
		const accountName = navigation.getParam('accountName', null);

		return (
			<SafeAreaView style={styles.mainWrapper}>
				<View style={styles.wrapper} testID={'first-incoming-transaction-screen'}>
					<View style={styles.content}>
						<Emoji name="raised_hands" style={styles.emoji} />
						<Text style={styles.title}>{tx.asset} was deposited into your account.</Text>
						<View style={styles.dataRow}>
							<Text style={styles.label}>Amount:</Text>
							<Text style={styles.value}>{tx.amount}</Text>
						</View>
						<View style={styles.dataRow}>
							<Text style={styles.label}>Account:</Text>
							<Text style={styles.value}>{`${accountName} (${renderShortAddress(
								selectedAddress
							)})`}</Text>
						</View>
						{tx.from && (
							<View style={styles.dataRow}>
								<Text style={styles.label}>From:</Text>
								<Text style={styles.value}>{renderShortAddress(tx.from)}</Text>
							</View>
						)}
					</View>
					<View style={styles.buttonWrapper}>
						<StyledButton
							containerStyle={styles.button}
							type={'confirm'}
							onPress={this.goNext}
							testID={'view-account-button'}
						>
							OK
						</StyledButton>
					</View>
				</View>
			</SafeAreaView>
		);
	};
}
