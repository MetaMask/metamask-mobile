import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, View, StyleSheet, Text, Dimensions, InteractionManager } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import Step1 from './Step1';
import Step2 from './Step2';
import Step3 from './Step3';
import Step4 from './Step4';
import Step5 from './Step5';
import Step6 from './Step6';
import setOnboardingWizardStep from '../../../actions/wizard';
import { DrawerActions } from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import DefaultPreference from 'react-native-default-preference';
import ElevatedView from 'react-native-elevated-view';
import Modal from 'react-native-modal';
import Device from '../../../util/device';
import { ONBOARDING_WIZARD_STEP_DESCRIPTION } from '../../../util/analytics';
import { ONBOARDING_WIZARD, EXPLORED } from '../../../constants/storage';
import AnalyticsV2 from '../../../util/analyticsV2';

const MIN_HEIGHT = Dimensions.get('window').height;
const styles = StyleSheet.create({
	root: {
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
		flex: 1,
		margin: 0,
		position: 'absolute',
		backgroundColor: colors.transparent,
	},
	main: {
		flex: 1,
		backgroundColor: colors.transparent,
	},
	smallSkipWrapper: {
		alignItems: 'center',
		alignSelf: 'center',
		bottom: Device.isIos() ? 30 : 35,
	},
	largeSkipWrapper: {
		alignItems: 'center',
		alignSelf: 'center',
		bottom: Device.isIos() && Device.isIphoneX() ? 98 : 66,
	},
	skip: {
		height: 30,
		borderRadius: 30,
		backgroundColor: colors.white,
		alignItems: 'center',
	},
	androidElevated: {
		width: 120,
		borderRadius: 30,
	},
	iosTouchable: {
		width: 120,
	},
	skipTextWrapper: {
		flex: 1,
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
	},
	skipText: {
		...fontStyles.normal,
		fontSize: 12,
		color: colors.blue,
	},
});

class OnboardingWizard extends PureComponent {
	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object,
		/**
		 * Wizard state
		 */
		wizard: PropTypes.object,
		/**
		 * Dispatch set onboarding wizard step
		 */
		setOnboardingWizardStep: PropTypes.func,
		/**
		 * Coachmark ref to get position
		 */
		coachmarkRef: PropTypes.object,
	};

	/**
	 * Close onboarding wizard setting step to 0 and closing drawer
	 */
	closeOnboardingWizard = async () => {
		const {
			setOnboardingWizardStep,
			navigation,
			wizard: { step },
		} = this.props;
		await DefaultPreference.set(ONBOARDING_WIZARD, EXPLORED);
		setOnboardingWizardStep && setOnboardingWizardStep(0);
		navigation && navigation.dispatch(DrawerActions.closeDrawer());
		InteractionManager.runAfterInteractions(() => {
			AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.ONBOARDING_TOUR_SKIPPED, {
				tutorial_step_count: step,
				tutorial_step_name: ONBOARDING_WIZARD_STEP_DESCRIPTION[step],
			});
			AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.ONBOARDING_TOUR_COMPLETED);
		});
	};

	onboardingWizardNavigator = (step) => {
		const steps = {
			1: <Step1 onClose={this.closeOnboardingWizard} />,
			2: <Step2 coachmarkRef={this.props.coachmarkRef} />,
			3: <Step3 coachmarkRef={this.props.coachmarkRef} />,
			4: <Step4 coachmarkRef={this.props.coachmarkRef} navigation={this.props.navigation} />,
			5: <Step5 coachmarkRef={this.props.coachmarkRef} navigation={this.props.navigation} />,
			6: (
				<Step6
					coachmarkRef={this.props.coachmarkRef}
					navigation={this.props.navigation}
					onClose={this.closeOnboardingWizard}
				/>
			),
		};
		return steps[step];
	};

	getBackButtonBehavior = () => {
		const {
			wizard: { step },
			navigation,
			setOnboardingWizardStep,
		} = this.props;
		if (step === 1) {
			return this.closeOnboardingWizard();
		} else if (step === 5) {
			setOnboardingWizardStep(4);
			navigation.navigate('WalletView');
			navigation.dispatch(DrawerActions.closeDrawer());
		} else if (step === 6) {
			navigation && navigation.openDrawer();
			setOnboardingWizardStep(5);
		}
		return setOnboardingWizardStep(step - 1);
	};

	render() {
		const {
			wizard: { step },
		} = this.props;
		return (
			<Modal
				animationIn={{ from: { opacity: 1 }, to: { opacity: 1 } }}
				animationOut={{ from: { opacity: 0 }, to: { opacity: 0 } }}
				isVisible
				backdropOpacity={0}
				disableAnimation
				transparent
				onBackButtonPress={this.getBackButtonBehavior}
				style={[styles.root, Device.isAndroid() ? { minHeight: MIN_HEIGHT } : {}]}
			>
				<View style={styles.main}>{this.onboardingWizardNavigator(step)}</View>
				{step !== 1 && (
					<ElevatedView
						elevation={10}
						style={[
							Device.isSmallDevice() ? styles.smallSkipWrapper : styles.largeSkipWrapper,
							Device.isIos() ? {} : styles.androidElevated,
						]}
					>
						<TouchableOpacity
							style={[styles.skip, Device.isIos() ? styles.iosTouchable : {}]}
							onPress={this.closeOnboardingWizard}
						>
							<View style={styles.skipTextWrapper}>
								<Text style={styles.skipText}>{strings('onboarding_wizard.skip_tutorial')}</Text>
							</View>
						</TouchableOpacity>
					</ElevatedView>
				)}
			</Modal>
		);
	}
}

const mapDispatchToProps = (dispatch) => ({
	setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
});

const mapStateToProps = (state) => ({
	wizard: state.wizard,
});

export default connect(mapStateToProps, mapDispatchToProps)(OnboardingWizard);
