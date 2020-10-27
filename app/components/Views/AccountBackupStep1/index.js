import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, Text, View, SafeAreaView, StyleSheet, Image, BackHandler } from 'react-native';
import PropTypes from 'prop-types';
import AsyncStorage from '@react-native-community/async-storage';
import { colors, fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import OnboardingProgress from '../../UI/OnboardingProgress';
import { strings } from '../../../../locales/i18n';
import AndroidBackHandler from '../AndroidBackHandler';
import Device from '../../../util/Device';
import SeedphraseModal from '../../UI/SeedphraseModal';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import scaling from '../../../util/scaling';
import Engine from '../../../core/Engine';
import { ONBOARDING_WIZARD, METRICS_OPT_IN } from '../../../constants/storage';
import { CHOOSE_PASSWORD_STEPS } from '../../../constants/onboarding';
import SkipAccountSecurityModal from '../../UI/SkipAccountSecurityModal';

const explain_backup_seedphrase = require('../../../images/explain-backup-seedphrase.png'); // eslint-disable-line

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	scrollviewWrapper: {
		flexGrow: 1
	},
	wrapper: {
		flex: 1,
		padding: 20,
		paddingTop: 0,
		paddingBottom: 0
	},
	content: {
		alignItems: 'center',
		justifyContent: 'flex-start',
		flex: 1,
		marginBottom: 10
	},
	title: {
		fontSize: 24,
		marginBottom: 40,
		color: colors.fontPrimary,
		textAlign: 'center',
		...fontStyles.bold
	},
	text: {
		marginTop: 32,
		justifyContent: 'center'
	},
	label: {
		lineHeight: scaling.scale(20),
		fontSize: scaling.scale(14),
		color: colors.fontPrimary,
		textAlign: 'center',
		...fontStyles.normal
	},
	buttonWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
	},
	bold: {
		...fontStyles.bold
	},
	blue: {
		color: colors.blue
	},
	remindLaterText: {
		textAlign: 'center',
		fontSize: 15,
		lineHeight: 20,
		color: colors.blue,
		...fontStyles.normal
	},
	remindLaterSubText: {
		textAlign: 'center',
		fontSize: 11,
		lineHeight: 20,
		color: colors.grey600,
		...fontStyles.normal
	},
	startSubText: {
		textAlign: 'center',
		fontSize: 11,
		marginTop: 12,
		color: colors.grey600,
		...fontStyles.normal
	},
	remindLaterContainer: {
		marginBottom: 34
	},
	remindLaterButton: {
		elevation: 10,
		zIndex: 10
	},
	ctaContainer: {
		marginBottom: 30
	},
	image: {
		width: scaling.scale(138),
		height: scaling.scale(162)
	}
});

/**
 * View that's shown during the first step of
 * the backup seed phrase flow
 */
const AccountBackupStep1 = props => {
	const [showRemindLaterModal, setRemindLaterModal] = useState(false);
	const [showWhatIsSeedphraseModal, setWhatIsSeedphraseModal] = useState(false);
	const [skipCheckbox, setToggleSkipCheckbox] = useState(false);
	const [hasFunds, setHasFunds] = useState(false);

	useEffect(
		() => {
			// Check if user has funds
			if (Engine.hasFunds()) setHasFunds(true);

			// Disable back press
			const hardwareBackPress = () => true;

			// Add event listener
			BackHandler.addEventListener('hardwareBackPress', hardwareBackPress);

			// Remove event listener on cleanup
			return () => {
				BackHandler.removeEventListener('hardwareBackPress', hardwareBackPress);
			};
		},
		[] // Run only when component mounts
	);

	const goNext = () => {
		props.navigation.navigate('AccountBackupStep1B', { ...props.navigation.state.params });
	};

	const showRemindLater = () => {
		if (hasFunds) return;

		setRemindLaterModal(true);
	};

	const toggleSkipCheckbox = () => (skipCheckbox ? setToggleSkipCheckbox(false) : setToggleSkipCheckbox(true));

	const hideRemindLaterModal = () => {
		setToggleSkipCheckbox(false);
		setRemindLaterModal(false);
	};

	const secureNow = () => {
		hideRemindLaterModal();
		goNext();
	};

	const skip = async () => {
		hideRemindLaterModal();
		// Get onboarding wizard state
		const onboardingWizard = await AsyncStorage.getItem(ONBOARDING_WIZARD);
		// Check if user passed through metrics opt-in screen
		const metricsOptIn = await AsyncStorage.getItem(METRICS_OPT_IN);
		if (!metricsOptIn) {
			props.navigation.navigate('OptinMetrics');
		} else if (onboardingWizard) {
			props.navigation.navigate('HomeNav');
			props.navigation.popToTop();
			props.navigation.goBack(null);
		} else {
			props.navigation.navigate('HomeNav');
		}
	};

	const showWhatIsSeedphrase = () => setWhatIsSeedphraseModal(true);

	const hideWhatIsSeedphrase = () => setWhatIsSeedphraseModal(false);

	return (
		<SafeAreaView style={styles.mainWrapper}>
			<ScrollView
				contentContainerStyle={styles.scrollviewWrapper}
				style={styles.mainWrapper}
				testID={'account-backup-step-1-screen'}
			>
				<View style={styles.wrapper} testID={'protect-your-account-screen'}>
					<OnboardingProgress steps={CHOOSE_PASSWORD_STEPS} currentStep={1} />
					<View style={styles.content}>
						<Text style={styles.title}>{strings('account_backup_step_1.title')}</Text>
						<Image
							source={explain_backup_seedphrase}
							style={styles.image}
							resizeMethod={'auto'}
							testID={'carousel-one-image'}
						/>
						<View style={styles.text}>
							<Text style={styles.label}>
								{strings('account_backup_step_1.info_text_1_1')}{' '}
								<Text style={styles.blue} onPress={showWhatIsSeedphrase}>
									{strings('account_backup_step_1.info_text_1_2')}
								</Text>{' '}
								{strings('account_backup_step_1.info_text_1_3')}{' '}
								<Text style={styles.bold}>{strings('account_backup_step_1.info_text_1_4')}</Text>
							</Text>
						</View>
					</View>
					<View style={styles.buttonWrapper}>
						{!hasFunds && (
							<View style={styles.remindLaterContainer}>
								<TouchableOpacity
									style={styles.remindLaterButton}
									onPress={showRemindLater}
									hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
									testID={'remind-me-later-button'}
								>
									<Text style={styles.remindLaterText}>
										{strings('account_backup_step_1.remind_me_later')}
									</Text>
								</TouchableOpacity>
								<Text style={styles.remindLaterSubText}>
									{strings('account_backup_step_1.remind_me_later_subtext')}
								</Text>
							</View>
						)}
						<View style={styles.ctaContainer}>
							<StyledButton
								containerStyle={styles.button}
								type={'confirm'}
								onPress={goNext}
								testID={'submit-button'}
							>
								{strings('account_backup_step_1.cta_text')}
							</StyledButton>
							<Text style={styles.startSubText}>{strings('account_backup_step_1.cta_subText')}</Text>
						</View>
					</View>
				</View>
			</ScrollView>
			{Device.isAndroid() && <AndroidBackHandler customBackPress={showRemindLater} />}
			<SkipAccountSecurityModal
				modalVisible={showRemindLaterModal}
				onCancel={secureNow}
				onConfirm={skip}
				skipCheckbox={skipCheckbox}
				onPress={hideRemindLaterModal}
				toggleSkipCheckbox={toggleSkipCheckbox}
			/>
			<SeedphraseModal
				showWhatIsSeedphraseModal={showWhatIsSeedphraseModal}
				hideWhatIsSeedphrase={hideWhatIsSeedphrase}
			/>
		</SafeAreaView>
	);
};

AccountBackupStep1.propTypes = {
	/**
	/* navigation object required to push and pop other views
	*/
	navigation: PropTypes.object
};

AccountBackupStep1.navigationOptions = ({ navigation }) => ({
	...getOnboardingNavbarOptions(navigation, { headerLeft: <View /> }),
	gesturesEnabled: false
});

export default AccountBackupStep1;
