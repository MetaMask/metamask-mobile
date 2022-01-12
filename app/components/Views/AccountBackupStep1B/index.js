import React, { useState } from 'react';
import {
	ScrollView,
	TouchableOpacity,
	Text,
	View,
	SafeAreaView,
	StyleSheet,
	Image,
	Dimensions,
	InteractionManager,
} from 'react-native';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/FontAwesome';
import { colors, fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import OnboardingProgress from '../../UI/OnboardingProgress';
import { strings } from '../../../../locales/i18n';
import AndroidBackHandler from '../AndroidBackHandler';
import Device from '../../../util/device';
import ActionModal from '../../UI/ActionModal';
import SeedphraseModal from '../../UI/SeedphraseModal';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import { CHOOSE_PASSWORD_STEPS } from '../../../constants/onboarding';
import AnalyticsV2 from '../../../util/analyticsV2';

const explain_backup_seedphrase = require('../../../images/explain-backup-seedphrase.png'); // eslint-disable-line

const IMAGE_1_RATIO = 162.8 / 138;
const DEVICE_WIDTH = Dimensions.get('window').width;
const IMG_PADDING = Device.isIphoneX() ? 100 : Device.isIphone5S() ? 180 : 220;

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1,
	},
	scrollviewWrapper: {
		flexGrow: 1,
	},
	wrapper: {
		flex: 1,
		padding: 20,
		paddingTop: 0,
		paddingBottom: 0,
	},
	content: {
		alignItems: 'center',
		paddingBottom: 16,
	},
	title: {
		fontSize: 24,
		marginLeft: 0,
		marginTop: 16,
		marginBottom: 16,
		color: colors.fontPrimary,
		justifyContent: 'center',
		...fontStyles.bold,
	},
	text: {
		marginBottom: 16,
		justifyContent: 'center',
	},
	label: {
		lineHeight: 20,
		fontSize: 16,
		color: colors.fontPrimary,
		textAlign: 'left',
		...fontStyles.normal,
	},
	bold: {
		lineHeight: 25,
		...fontStyles.bold,
	},
	image: {
		marginTop: 14,
		marginBottom: 8,
		width: DEVICE_WIDTH - IMG_PADDING,
		height: (DEVICE_WIDTH - IMG_PADDING) * IMAGE_1_RATIO,
	},
	card: {
		backgroundColor: colors.white,
		borderWidth: 1,
		borderColor: colors.grey100,
		borderRadius: 10,
		shadowColor: colors.black,
		shadowOffset: {
			width: 1,
			height: 4,
		},
		shadowOpacity: 0.1,
		shadowRadius: 2.62,

		elevation: 4,
		padding: 16,
		marginBottom: 20,
	},

	modalNoBorder: {
		borderTopWidth: 0,
	},
	secureModalContainer: { flex: 1, padding: 27, flexDirection: 'column' },
	secureModalXButton: {
		padding: 5,
		alignItems: 'flex-end',
	},
	whySecureTitle: {
		flex: 1,
		fontSize: 18,
		color: colors.fontPrimary,
		textAlign: 'center',
		...fontStyles.bold,
	},
	learnMoreText: {
		marginTop: 21,
		textAlign: 'center',
		fontSize: 15,
		lineHeight: 20,
		color: colors.blue,
		...fontStyles.normal,
	},
	blue: {
		color: colors.blue,
	},
	titleIcon: {
		fontSize: 32,
	},
	centerContent: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
	},
	infoIcon: {
		fontSize: 15,
		marginRight: 6,
	},
	whyImportantText: {
		fontSize: 14,
		color: colors.blue,
	},
	manualTitle: {
		fontSize: 16,
		marginBottom: 8,
		lineHeight: 17,
		color: colors.fontPrimary,
		...fontStyles.bold,
	},
	paragraph: {
		lineHeight: 17,
		marginBottom: 20,
		fontSize: 12,
		color: colors.fontPrimary,
	},
	smallParagraph: {
		lineHeight: 17,
		fontSize: 12,
		color: colors.fontPrimary,
	},
	barsTitle: {
		lineHeight: 17,
		marginBottom: 8,
		fontSize: 12,
		color: colors.fontPrimary,
	},
	barsContainer: {
		lineHeight: 17,
		flexDirection: 'row',
		marginBottom: 20,
	},
	bar: {
		lineHeight: 17,
		width: 32,
		height: 6,
		backgroundColor: colors.blue,
		marginRight: 2,
	},
	secureModalXIcon: {
		fontSize: 16,
	},
	auxCenterView: {
		width: 26,
	},
	secureModalTitleContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 16,
	},
	explainBackupContainer: {
		flexDirection: 'column',
		alignItems: 'center',
	},
	whySecureText: {
		textAlign: 'center',
		lineHeight: 20,
		color: colors.fontPrimary,
	},
});

/**
 * View that's shown during the first step of
 * the backup seed phrase flow
 */
const AccountBackupStep1B = (props) => {
	const [showWhySecureWalletModal, setWhySecureWalletModal] = useState(false);
	const [showWhatIsSeedphraseModal, setWhatIsSeedphraseModal] = useState(false);

	const goNext = () => {
		props.navigation.navigate('ManualBackupStep1', { ...props.route.params });
		InteractionManager.runAfterInteractions(() => {
			AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.WALLET_SECURITY_MANUAL_BACKUP_INITIATED);
		});
	};

	const learnMore = () => {
		setWhySecureWalletModal(false);
		props.navigation.navigate('Webview', {
			screen: 'SimpleWebview',
			params: {
				url: 'https://metamask.zendesk.com/hc/en-us/articles/360015489591-Basic-Safety-Tips',
				title: strings('drawer.metamask_support'),
			},
		});
	};

	const dismiss = () => null;

	const showWhySecureWallet = () => setWhySecureWalletModal(true);
	const hideWhySecureWallet = () => setWhySecureWalletModal(false);

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
						<Text style={styles.titleIcon}>🔒</Text>
						<Text style={styles.title}>{strings('account_backup_step_1B.title')}</Text>
						<View style={styles.text}>
							<Text style={styles.label}>
								{strings('account_backup_step_1B.subtitle_1')}{' '}
								<Text style={styles.blue} onPress={showWhatIsSeedphrase}>
									{strings('account_backup_step_1B.subtitle_2')}
								</Text>
							</Text>
						</View>
						<TouchableOpacity onPress={showWhySecureWallet} style={styles.centerContent}>
							<Icon name="info-circle" style={styles.infoIcon} color={colors.blue} />
							<Text style={styles.whyImportantText}>
								{strings('account_backup_step_1B.why_important')}
							</Text>
						</TouchableOpacity>
					</View>
					<View style={styles.card}>
						<Text style={styles.manualTitle}>{strings('account_backup_step_1B.manual_title')}</Text>
						<Text style={styles.paragraph}>{strings('account_backup_step_1B.manual_subtitle')}</Text>
						<Text style={styles.barsTitle}>{strings('account_backup_step_1B.manual_security')}</Text>
						<View style={styles.barsContainer}>
							<View style={styles.bar} />
							<View style={styles.bar} />
							<View style={styles.bar} />
						</View>
						<Text style={styles.smallParagraph}>{strings('account_backup_step_1B.risks_title')}</Text>
						<Text style={styles.smallParagraph}>• {strings('account_backup_step_1B.risks_1')}</Text>
						<Text style={styles.smallParagraph}>• {strings('account_backup_step_1B.risks_2')}</Text>
						<Text style={styles.paragraph}>• {strings('account_backup_step_1B.risks_3')}</Text>
						<Text style={styles.paragraph}>{strings('account_backup_step_1B.other_options')}</Text>
						<Text style={styles.smallParagraph}>{strings('account_backup_step_1B.tips_title')}</Text>
						<Text style={styles.smallParagraph}>• {strings('account_backup_step_1B.tips_1')}</Text>
						<Text style={styles.smallParagraph}>• {strings('account_backup_step_1B.tips_2')}</Text>
						<Text style={styles.paragraph}>• {strings('account_backup_step_1B.tips_3')}</Text>

						<StyledButton
							containerStyle={styles.button}
							type={'confirm'}
							onPress={goNext}
							testID={'submit-button'}
						>
							{strings('account_backup_step_1B.cta_text')}
						</StyledButton>
					</View>
				</View>
			</ScrollView>
			{Device.isAndroid() && <AndroidBackHandler customBackPress={dismiss} />}
			<ActionModal
				modalVisible={showWhySecureWalletModal}
				actionContainerStyle={styles.modalNoBorder}
				displayConfirmButton={false}
				displayCancelButton={false}
				onRequestClose={hideWhySecureWallet}
			>
				<View style={styles.secureModalContainer}>
					<View style={styles.secureModalTitleContainer}>
						<View style={styles.auxCenterView} />
						<Text style={styles.whySecureTitle}>{strings('account_backup_step_1B.why_secure_title')}</Text>
						<TouchableOpacity
							onPress={hideWhySecureWallet}
							style={styles.secureModalXButton}
							hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
						>
							<Icon name="times" style={styles.secureModalXIcon} />
						</TouchableOpacity>
					</View>
					<View style={styles.explainBackupContainer}>
						<Image
							source={explain_backup_seedphrase}
							style={styles.image}
							resizeMethod={'auto'}
							testID={'carousel-one-image'}
						/>
						<Text style={styles.whySecureText}>
							{strings('account_backup_step_1B.why_secure_1')}
							<Text style={styles.bold}>{strings('account_backup_step_1B.why_secure_2')}</Text>
						</Text>
						<TouchableOpacity
							style={styles.remindLaterButton}
							onPress={learnMore}
							hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
						>
							<Text style={styles.learnMoreText}>{strings('account_backup_step_1B.learn_more')}</Text>
						</TouchableOpacity>
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

AccountBackupStep1B.propTypes = {
	/**
	/* navigation object required to push and pop other views
	*/
	navigation: PropTypes.object,
	/**
	 * Object that represents the current route info like params passed to it
	 */
	route: PropTypes.object,
};

AccountBackupStep1B.navigationOptions = ({ navigation, route }) => getOnboardingNavbarOptions(navigation, route);

export default AccountBackupStep1B;
