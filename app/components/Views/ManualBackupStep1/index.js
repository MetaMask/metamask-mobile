import React, { PureComponent } from 'react';
import { ScrollView, Text, View, SafeAreaView, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import OnboardingProgress from '../../UI/OnboardingProgress';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import FeatherIcons from 'react-native-vector-icons/Feather';
import { BlurView } from '@react-native-community/blur';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	scrollviewWrapper: {
		flex: 1,
		paddingTop: 12
	},
	wrapper: {
		flex: 1,
		paddingHorizontal: 32
	},
	onBoardingWrapper: {
		paddingHorizontal: 20
	},
	action: {
		fontSize: 18,
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
		...fontStyles.normal,
		paddingHorizontal: 6
	},
	seedPhraseConcealer: {
		position: 'absolute',
		width: '100%',
		height: '100%',
		backgroundColor: colors.grey700,
		opacity: 0.7,
		paddingTop: 34,
		paddingBottom: 43,
		alignItems: 'center',
		borderRadius: 8
	},
	blurView: {
		position: 'absolute',
		top: 0,
		left: 0,
		bottom: 0,
		right: 0,
		borderRadius: 8
	},
	icon: {
		width: 24,
		height: 24,
		color: colors.white,
		textAlign: 'center',
		marginBottom: 21
	},
	reveal: {
		fontSize: 16,
		...fontStyles.extraBold,
		color: colors.white,
		lineHeight: 22,
		marginHorizontal: 42,
		textAlign: 'center'
	},
	watching: {
		fontSize: 12,
		color: colors.white,
		lineHeight: 17,
		marginBottom: 38
	},
	viewButtonContainer: {
		width: 155,
		padding: 12
	},
	seedPhraseWrapper: {
		backgroundColor: colors.white,
		borderRadius: 8,
		flexDirection: 'row',
		borderColor: colors.grey100,
		borderWidth: 1,
		marginBottom: 64
	},
	colLeft: {
		flex: 1,
		paddingTop: 18,
		paddingLeft: 27,
		paddingBottom: 4,
		alignItems: 'flex-start'
	},
	colRight: {
		flex: 1,
		paddingTop: 18,
		paddingRight: 27,
		paddingBottom: 4,
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
		this.steps = [
			strings('manual_backup.progressOne'),
			strings('manual_backup.progressTwo'),
			strings('manual_backup.progressThree')
		];
	}

	state = {
		seedPhraseHidden: true,
		currentStep: 2
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
		this.props.navigation.navigate('ManualBackupStep2', { words: this.words, steps: this.steps });
	};

	revealSeedPhrase = () => this.setState({ seedPhraseHidden: false });

	renderSeedPhraseConcealer = () => (
		<React.Fragment>
			<BlurView blurType="light" blurAmount={5} style={styles.blurView} />
			<View style={styles.seedPhraseConcealer}>
				<FeatherIcons name="eye-off" size={24} style={styles.icon} />
				<Text style={styles.reveal}>{strings('manual_backup_step_1.reveal')}</Text>
				<Text style={styles.watching}>{strings('manual_backup_step_1.watching')}</Text>
				<View style={styles.viewButtonWrapper}>
					<StyledButton
						type={'view'}
						onPress={this.revealSeedPhrase}
						testID={'view-button'}
						containerStyle={styles.viewButtonContainer}
					>
						{strings('manual_backup_step_1.view')}
					</StyledButton>
				</View>
			</View>
		</React.Fragment>
	);

	render() {
		return (
			<SafeAreaView style={styles.mainWrapper}>
				<ScrollView
					contentContainerStyle={styles.scrollviewWrapper}
					style={styles.mainWrapper}
					testID={'manual_backup_step_1-screen'}
				>
					<View style={styles.onBoardingWrapper}>
						<OnboardingProgress currentStep={this.state.currentStep} stepWords={this.steps} />
					</View>
					<View style={styles.wrapper} testID={'manual_backup_step_1-screen'}>
						<Text style={styles.action}>{strings('manual_backup_step_1.action')}</Text>
						<View style={styles.infoWrapper}>
							<Text style={styles.info}>{strings('manual_backup_step_1.info')}</Text>
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

							{this.state.seedPhraseHidden && this.renderSeedPhraseConcealer()}
						</View>
						<View style={styles.buttonWrapper}>
							<StyledButton
								containerStyle={styles.button}
								type={'confirm'}
								onPress={this.goNext}
								testID={'submit-button'}
								disabled={this.state.seedPhraseHidden}
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
