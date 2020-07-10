import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, Text, View, SafeAreaView, StyleSheet, Image, Dimensions } from 'react-native';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-community/async-storage';
// eslint-disable-next-line import/no-unresolved
import CheckBox from '@react-native-community/checkbox';
import { colors, fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import OnboardingProgress from '../../UI/OnboardingProgress';
import { strings } from '../../../../locales/i18n';
import AndroidBackHandler from '../AndroidBackHandler';
import Device from '../../../util/Device';
import ActionModal from '../../UI/ActionModal';
import SeedphraseModal from '../../UI/SeedphraseModal';

const explain_backup_seedphrase = require('../../../images/explain-backup-seedphrase.png'); // eslint-disable-line
const warning_skip_backup = require('../../../images/warning.png'); // eslint-disable-line

const IMAGE_EXPLAIN_RATIO = 162.8 / 138;
const DEVICE_WIDTH = Dimensions.get('window').width;
const IMG_PADDING = Device.isIphoneX() ? 100 : Device.isIphone5S() ? 180 : 220;

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
		flex: 1
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
		lineHeight: 20,
		fontSize: 14,
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
		width: DEVICE_WIDTH - IMG_PADDING,
		height: (DEVICE_WIDTH - IMG_PADDING) * IMAGE_EXPLAIN_RATIO
	},
	imageWarning: {
		width: 56,
		height: 56,
		alignSelf: 'center'
	},
	modalNoBorder: {
		borderTopWidth: 0
	},
	skipTitle: {
		fontSize: 24,
		marginTop: 12,
		marginBottom: 16,
		color: colors.fontPrimary,
		textAlign: 'center',
		...fontStyles.bold
	},
	skipModalContainer: { flex: 1, padding: 27, flexDirection: 'column' },
	skipModalXButton: {
		flex: 1,
		alignItems: 'flex-end'
	},
	skipModalXIcon: {
		fontSize: 16
	},
	skipModalActionButtons: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center'
	},
	skipModalCheckbox: {
		height: 18,
		width: 18,
		marginRight: 12
	},
	skipModalText: {
		lineHeight: 20,
		fontSize: 14,
		flex: 1
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

	const goNext = () => {
		props.navigation.navigate('AccountBackupStep1B', { ...props.navigation.state.params });
	};

	const showRemindLater = () => {
		setRemindLaterModal(true);
	};

	const toggleSkipCheckbox = () => (skipCheckbox ? setToggleSkipCheckbox(false) : setToggleSkipCheckbox(true));

	const hideRemindLaterModal = () => {
		setToggleSkipCheckbox(false);
		setRemindLaterModal(false);
	};

	const skip = async () => {
		hideRemindLaterModal();
		// Get onboarding wizard state
		const onboardingWizard = await AsyncStorage.getItem('@MetaMask:onboardingWizard');
		// Check if user passed through metrics opt-in screen
		const metricsOptIn = await AsyncStorage.getItem('@MetaMask:metricsOptIn');
		if (!metricsOptIn) {
			props.navigation.navigate('OptinMetrics');
		} else if (onboardingWizard) {
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
					<OnboardingProgress
						steps={['Create password', 'Secure wallet', 'Confirm seed phrase']}
						currentStep={2}
					/>
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
						<View style={styles.remindLaterContainer}>
							<TouchableOpacity
								style={styles.remindLaterButton}
								onPress={showRemindLater}
								hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
							>
								<Text style={styles.remindLaterText}>
									{strings('account_backup_step_1.remind_me_later')}
								</Text>
							</TouchableOpacity>
							<Text style={styles.remindLaterSubText}>
								{strings('account_backup_step_1.remind_me_later_subtext')}
							</Text>
						</View>
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
			<ActionModal
				confirmText={strings('account_backup_step_1.skip_button_confirm')}
				cancelText={strings('account_backup_step_1.skip_button_cancel')}
				confirmButtonMode={'confirm'}
				cancelButtonMode={'normal'}
				displayCancelButton
				modalVisible={showRemindLaterModal}
				actionContainerStyle={styles.modalNoBorder}
				onCancelPress={hideRemindLaterModal}
				confirmDisabled={!skipCheckbox}
				onConfirmPress={skip}
			>
				<View style={styles.skipModalContainer}>
					<TouchableOpacity
						onPress={hideRemindLaterModal}
						style={styles.skipModalXButton}
						hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
					>
						<Icon name="times" style={styles.skipModalXIcon} />
					</TouchableOpacity>
					<Image
						source={warning_skip_backup}
						style={styles.imageWarning}
						resizeMethod={'auto'}
						testID={'skip_backup_warning'}
					/>
					<Text style={styles.skipTitle}>{strings('account_backup_step_1.skip_title')}</Text>
					<View style={styles.skipModalActionButtons}>
						<CheckBox
							style={styles.skipModalCheckbox}
							value={skipCheckbox}
							onValueChange={toggleSkipCheckbox}
							boxType={'square'}
							tintColors={{ true: colors.blue }}
						/>
						<Text onPress={toggleSkipCheckbox} style={styles.skipModalText}>
							{strings('account_backup_step_1.skip_check')}
						</Text>
					</View>
				</View>
			</ActionModal>
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

export default AccountBackupStep1;
