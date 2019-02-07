import React, { Component } from 'react';
import { ScrollView, Text, View, SafeAreaView, StyleSheet } from 'react-native';

import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../styles/common';
import StyledButton from '../StyledButton';
import Emoji from 'react-native-emoji';
import { renderShortAddress } from '../../util/address';
import { strings } from '../../../locales/i18n';

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
 * View that's displayed the first time a user receives funds
 */
export default class FirstIncomingTransaction extends Component {
	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object
	};

	goNext = () => {
		this.props.navigation.navigate('ProtectYourAccount');
	};

	render = () => {
		const { navigation } = this.props;
		const tx = navigation.getParam('incomingTransaction', null);
		const selectedAddress = navigation.getParam('selectedAddress', null);
		const accountName = navigation.getParam('accountName', null);

		return (
			<SafeAreaView style={styles.mainWrapper}>
				<ScrollView
					contentContainerStyle={styles.wrapper}
					style={styles.mainWrapper}
					testID={'first-incoming-transaction-screen'}
				>
					<View style={styles.content}>
						<Emoji name="raised_hands" style={styles.emoji} />
						<Text style={styles.title}>
							{tx && strings('first_incoming_transaction.title', { asset: tx.asset })}
						</Text>
						<View style={styles.dataRow}>
							<Text style={styles.label}>{strings('first_incoming_transaction.amount')}</Text>
							<Text style={styles.value}>{tx && tx.amount}</Text>
						</View>
						<View style={styles.dataRow}>
							<Text style={styles.label}>{strings('first_incoming_transaction.account')}</Text>
							<Text style={styles.value}>
								{selectedAddress && `${accountName} (${renderShortAddress(selectedAddress)})`}
							</Text>
						</View>
						{tx &&
							tx.from && (
								<View style={styles.dataRow}>
									<Text style={styles.label}>{strings('first_incoming_transaction.from')}</Text>
									<Text style={styles.value}>{renderShortAddress(tx.from)}</Text>
								</View>
							)}
					</View>
					<View style={styles.buttonWrapper}>
						<StyledButton
							containerStyle={styles.button}
							type={'confirm'}
							onPress={this.goNext}
							testID={'submit-button'}
						>
							{strings('first_incoming_transaction.cta_text')}
						</StyledButton>
					</View>
				</ScrollView>
			</SafeAreaView>
		);
	};
}
