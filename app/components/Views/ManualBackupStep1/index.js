import React, { PureComponent } from 'react';
import { ScrollView, Text, View, SafeAreaView, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	scrollviewWrapper: {
		flex: 1
	},
	wrapper: {
		flex: 1,
		padding: 32,
		paddingTop: 0
	},
	content: {
		alignItems: 'center'
	},
	action: {
		fontSize: 18,
		marginTop: 140,
		marginBottom: 16,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.bold
	},
	infoWrapper: {
		marginBottom: 16,
		justifyContent: 'center'
	},
	info: {
		fontSize: 14,
		color: colors.fontPrimary,
		textAlign: 'center',
		...fontStyles.normal
	},
	seedPhraseWrapper: {
		backgroundColor: colors.white,
		borderRadius: 8,
		paddingTop: 18,
		paddingBottom: 4,
		paddingHorizontal: 27,
		flexDirection: 'row',
		borderColor: colors.grey100,
		borderWidth: 1
	},
	colLeft: {
		flex: 1,
		alignItems: 'flex-start'
	},
	colRight: {
		flex: 1,
		alignItems: 'flex-end'
	},
	word: {
		paddingHorizontal: 8,
		paddingVertical: 6,
		fontSize: 14,
		color: colors.fontPrimary,
		width: 95,
		backgroundColor: colors.white,
		borderColor: colors.blue,
		borderWidth: 1,
		marginBottom: 14,
		borderRadius: 13,
		textAlign: 'center',
		lineHeight: 14
	},
	buttonWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
	}
});

/**
 * View that's shown during the second step of
 * the backup seed phrase flow
 */
export default class ManualBackupStep1 extends PureComponent {
	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object
	};

	constructor(props) {
		super(props);
		this.words = [
			'One',
			'Two',
			'Three',
			'Four',
			'Five',
			'Six',
			'Seven',
			'Eight',
			'Nine',
			'Ten',
			'Eleven',
			'Twelve'
		];
	}

	state = {
		seedPhraseRevealed: false
	};

	tryExportSeedPhrase = async password => {
		const { KeyringController } = Engine.context;
		const mnemonic = await KeyringController.exportSeedPhrase(password);
		const seed = JSON.stringify(mnemonic)
			.replace(/"/g, '')
			.split(' ');
		return seed;
	};

	goNext = () => {
		this.props.navigation.navigate('AccountBackupStep4', { ...this.props.navigation.state.params });
	};

	render() {
		return (
			<SafeAreaView style={styles.mainWrapper}>
				<ScrollView
					contentContainerStyle={styles.scrollviewWrapper}
					style={styles.mainWrapper}
					testID={'manual_backup_step_1-screen'}
				>
					<View style={styles.wrapper} testID={'manual_backup_step_1-screen'}>
						<View style={styles.content}>
							<Text style={styles.action}>{strings('manual_backup_step_1.action')}</Text>
							<View style={styles.infoWrapper}>
								<Text style={[styles.info]}>{strings('manual_backup_step_1.info')}</Text>
							</View>
							<View style={styles.seedPhraseWrapper}>
								<View style={styles.colLeft}>
									{this.words.slice(0, 6).map((word, i) => (
										<Text key={`word_${i}`} style={styles.word}>
											{`${i + 1}. ${word}`}
										</Text>
									))}
								</View>
								<View style={styles.colRight}>
									{this.words.slice(-6).map((word, i) => (
										<Text key={`word_${i}`} style={styles.word}>
											{`${i + 7}. ${word}`}
										</Text>
									))}
								</View>
							</View>
						</View>
						<View style={styles.buttonWrapper}>
							<StyledButton
								containerStyle={styles.button}
								type={'confirm'}
								onPress={this.goNext}
								testID={'submit-button'}
							>
								{strings('manual_backup_step_1.continue')}
							</StyledButton>
						</View>
					</View>
				</ScrollView>
			</SafeAreaView>
		);
	}
}
