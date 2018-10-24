import React, { Component } from 'react';
import { TextInput, StyleSheet, Text, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import Engine from '../../core/Engine';
import { strings } from '../../../locales/i18n';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.slate,
		flex: 1,
		padding: 20
	},
	text: {
		marginTop: 20,
		fontSize: 18,
		textAlign: 'center',
		...fontStyles.normal
	},
	seedPhrase: {
		marginTop: 30,
		backgroundColor: colors.white,
		paddingTop: 20,
		paddingBottom: 20,
		paddingLeft: 20,
		paddingRight: 20,
		fontSize: 20,
		borderRadius: 10,
		...fontStyles.normal
	}
});

/**
 * View that displays the current account seed words
 */
export default class SeedWords extends Component {
	static navigationOptions = () => ({
		title: strings('seedWords.title'),
		headerTitleStyle: {
			fontSize: 20,
			...fontStyles.normal
		}
	});

	render() {
		const { KeyringController } = Engine.context;
		const seedWords = JSON.stringify(KeyringController.keyring.keyrings[0].mnemonic).replace(/"/g, '');

		return (
			<View style={styles.wrapper} testID={'seed-words-screen'}>
				<Text style={styles.text}>{strings('seedWords.label')}</Text>
				<TextInput
					value={seedWords}
					numberOfLines={3}
					multiline
					selectTextOnFocus
					style={styles.seedPhrase}
					testID={'current-seed-words'}
				/>
			</View>
		);
	}
}
