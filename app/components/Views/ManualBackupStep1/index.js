import React, { PureComponent } from 'react';
import { Text, View, SafeAreaView, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import OnboardingProgress from '../../UI/OnboardingProgress';
import { strings } from '../../../../locales/i18n';
import FeatherIcons from 'react-native-vector-icons/Feather';
import { BlurView } from '@react-native-community/blur';
import ActionView from '../../UI/ActionView';
import Device from '../../../util/Device';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
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
		alignItems: 'center',
		borderRadius: 8,
		paddingHorizontal: 24,
		paddingVertical: 45
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
		marginBottom: 32
	},
	reveal: {
		fontSize: Device.isMediumDevice() ? 13 : 16,
		...fontStyles.extraBold,
		color: colors.white,
		lineHeight: 22,
		marginBottom: 8,
		textAlign: 'center'
	},
	watching: {
		fontSize: Device.isMediumDevice() ? 10 : 12,
		color: colors.white,
		lineHeight: 17,
		marginBottom: 32,
		textAlign: 'center'
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
		marginBottom: 64,
		height: 275
	},
	wordColumn: {
		flex: 1,
		alignItems: 'center',
		paddingHorizontal: Device.isMediumDevice() ? 18 : 24,
		paddingVertical: 18,
		justifyContent: 'space-between'
	},
	wordWrapper: {
		flexDirection: 'row'
	},
	word: {
		paddingHorizontal: 8,
		paddingVertical: 6,
		fontSize: 14,
		color: colors.fontPrimary,
		backgroundColor: colors.white,
		borderColor: colors.blue,
		borderWidth: 1,
		borderRadius: 13,
		textAlign: 'center',
		lineHeight: 14,
		flex: 1
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
		this.words = props.navigation.getParam('words');
	}
	steps = [
		strings('manual_backup.progressOne'),
		strings('manual_backup.progressTwo'),
		strings('manual_backup.progressThree')
	];

	state = {
		seedPhraseHidden: true,
		currentStep: 2
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
				<View style={styles.onBoardingWrapper}>
					<OnboardingProgress currentStep={this.state.currentStep} steps={this.steps} />
				</View>
				<ActionView
					confirmTestID={'manual-backup-step-1-continue-button'}
					confirmText={strings('manual_backup_step_1.continue')}
					onConfirmPress={this.goNext}
					confirmDisabled={this.state.seedPhraseHidden}
					showCancelButton={false}
					confirmButtonMode={'confirm'}
				>
					<View style={styles.wrapper} testID={'manual_backup_step_1-screen'}>
						<Text style={styles.action}>{strings('manual_backup_step_1.action')}</Text>
						<View style={styles.infoWrapper}>
							<Text style={styles.info}>{strings('manual_backup_step_1.info')}</Text>
						</View>
						<View style={styles.seedPhraseWrapper}>
							<View style={styles.wordColumn}>
								{this.words.slice(0, 6).map((word, i) => (
									<View key={`word_${i}`} style={styles.wordWrapper}>
										<Text style={styles.word}>{`${i + 1}. ${word}`}</Text>
									</View>
								))}
							</View>
							<View style={styles.wordColumn}>
								{this.words.slice(-6).map((word, i) => (
									<View key={`word_${i}`} style={styles.wordWrapper}>
										<Text style={styles.word}>{`${i + 7}. ${word}`}</Text>
									</View>
								))}
							</View>
							{this.state.seedPhraseHidden && this.renderSeedPhraseConcealer()}
						</View>
					</View>
				</ActionView>
			</SafeAreaView>
		);
	}
}
