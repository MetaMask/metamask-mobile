import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Platform, TouchableOpacity, View, StyleSheet, Text, Dimensions } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import Step1 from './Step1';
import Step2 from './Step2';
import Step3 from './Step3';
import Step4 from './Step4';
import Step5 from './Step5';
import Step6 from './Step6';
import setOnboardingWizardStep from '../../../actions/wizard';
import { DrawerActions } from 'react-navigation-drawer'; // eslint-disable-line
import { strings } from '../../../../locales/i18n';
import AsyncStorage from '@react-native-community/async-storage';
import ElevatedView from 'react-native-elevated-view';
import Modal from 'react-native-modal';
import DeviceSize from '../../../util/DeviceSize';

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
		backgroundColor: colors.transparent
	},
	main: {
		flex: 1,
		backgroundColor: colors.transparent
	},
	skipWrapper: {
		alignItems: 'center',
		alignSelf: 'center',
		bottom: Platform.OS === 'ios' && DeviceSize.isIphoneX() ? 98 : 66
	},
	skip: {
		height: 30,
		borderRadius: 30,
		backgroundColor: colors.white,
		alignItems: 'center'
	},
	androidElevated: {
		width: 120,
		borderRadius: 30
	},
	iosTouchable: {
		width: 120
	},
	skipTextWrapper: {
		flex: 1,
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center'
	},
	skipText: {
		...fontStyles.normal,
		fontSize: 12,
		color: colors.blue
	}
});

class OnboardingWizard extends Component {
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
		coachmarkRef: PropTypes.object
	};

	/**
	 * Close onboarding wizard setting step to 0 and closing drawer
	 */
	closeOnboardingWizard = async () => {
		const { setOnboardingWizardStep, navigation } = this.props;
		await AsyncStorage.setItem('@MetaMask:onboardingWizard', 'explored');
		setOnboardingWizardStep && setOnboardingWizardStep(0);
		navigation && navigation.dispatch(DrawerActions.closeDrawer());
	};

	onboardingWizardNavigator = step => {
		const steps = {
			1: <Step1 onClose={this.closeOnboardingWizard} />,
			2: <Step2 coachmarkRef={this.props.coachmarkRef} />,
			3: <Step3 coachmarkRef={this.props.coachmarkRef} />,
			4: <Step4 coachmarkRef={this.props.coachmarkRef} navigation={this.props.navigation} />,
			5: <Step5 coachmarkRef={this.props.coachmarkRef} navigation={this.props.navigation} />,
			6: <Step6 coachmarkRef={this.props.coachmarkRef} onClose={this.closeOnboardingWizard} />
		};
		return steps[step];
	};

	render() {
		const {
			wizard: { step }
		} = this.props;
		return (
			<Modal
				animationIn={{ from: { opacity: 1 }, to: { opacity: 1 } }}
				animationOut={{ from: { opacity: 0 }, to: { opacity: 0 } }}
				isVisible
				backdropOpacity={0}
				disableAnimation
				transparent
				style={[styles.root, Platform.OS === 'android' ? { minHeight: MIN_HEIGHT } : {}]}
			>
				<View style={styles.main}>{this.onboardingWizardNavigator(step)}</View>
				{step !== 1 && (
					<ElevatedView
						elevation={10}
						style={[styles.skipWrapper, Platform.OS === 'ios' ? {} : styles.androidElevated]}
					>
						<TouchableOpacity
							style={[styles.skip, Platform.OS === 'ios' ? styles.iosTouchable : {}]}
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

const mapDispatchToProps = dispatch => ({
	setOnboardingWizardStep: step => dispatch(setOnboardingWizardStep(step))
});

const mapStateToProps = state => ({
	wizard: state.wizard
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(OnboardingWizard);
