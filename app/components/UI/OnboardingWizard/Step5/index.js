import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { colors } from '../../../../styles/common';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { DrawerActions } from 'react-navigation-drawer'; // eslint-disable-line
import { strings } from '../../../../../locales/i18n';
import onboardingStyles from './../styles';
import DeviceSize from '../../../../util/DeviceSize';

const INDICATOR_HEIGHT = 10;
const DRAWER_WIDTH = 315;
const WIDTH = Dimensions.get('window').width;
const styles = StyleSheet.create({
	main: {
		flex: 1,
		backgroundColor: colors.transparent
	},
	some: {
		marginLeft: 24,
		marginRight: WIDTH - DRAWER_WIDTH + 24
	},
	coachmarkContainer: {
		flex: 1,
		position: 'absolute',
		left: 0,
		right: 0
	}
});

class Step5 extends PureComponent {
	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object,
		/**
		 * Dispatch set onboarding wizard step
		 */
		setOnboardingWizardStep: PropTypes.func,
		/**
		 * Coachmark ref to get position
		 */
		coachmarkRef: PropTypes.object
	};

	state = {
		coachmarkTop: 0,
		coachmarkBottom: 0
	};

	componentDidMount = () => {
		setTimeout(() => {
			this.getPosition(this.props.coachmarkRef);
		}, 300);
	};

	/**
	 * If component ref defined, calculate its position and position coachmark accordingly
	 */
	getPosition = ref => {
		ref &&
			ref.current &&
			ref.current.measure((a, b, width, height, px, py) => {
				this.setState({ coachmarkTop: height + py - INDICATOR_HEIGHT, coachmarkBottom: py - 165 });
			});
	};

	/**
	 * Dispatches 'setOnboardingWizardStep' with next step
	 * Closing drawer and navigating to 'BrowserView'
	 */
	onNext = () => {
		const { navigation, setOnboardingWizardStep } = this.props;
		setOnboardingWizardStep && setOnboardingWizardStep(6);
		navigation && navigation.dispatch(DrawerActions.closeDrawer());
		navigation && navigation.navigate('BrowserView');
	};

	/**
	 * Dispatches 'setOnboardingWizardStep' with next step
	 * Closing drawer and navigating to 'WalletView'
	 */
	onBack = () => {
		const { navigation, setOnboardingWizardStep } = this.props;
		setOnboardingWizardStep && setOnboardingWizardStep(4);
		navigation && navigation.navigate('WalletView');
		navigation && navigation.dispatch(DrawerActions.closeDrawer());
	};

	/**
	 * Returns content for this step
	 */
	content = () => (
		<View style={onboardingStyles.contentContainer}>
			<Text style={onboardingStyles.content} testID={'step5-title'}>
				{strings('onboarding_wizard.step5.content1')}
			</Text>
		</View>
	);

	render() {
		if (this.state.coachmarkTop === 0) return null;

		return (
			<View style={styles.main}>
				<View
					style={[
						styles.coachmarkContainer,
						DeviceSize.isSmallDevice()
							? { top: this.state.coachmarkBottom }
							: { top: this.state.coachmarkTop }
					]}
				>
					<Coachmark
						title={strings('onboarding_wizard.step5.title')}
						content={this.content()}
						onNext={this.onNext}
						onBack={this.onBack}
						style={styles.some}
						topIndicatorPosition={!DeviceSize.isSmallDevice() && 'topLeft'}
						bottomIndicatorPosition={DeviceSize.isSmallDevice() && 'bottomLeft'}
						currentStep={4}
					/>
				</View>
			</View>
		);
	}
}

const mapDispatchToProps = dispatch => ({
	setOnboardingWizardStep: step => dispatch(setOnboardingWizardStep(step))
});

export default connect(
	null,
	mapDispatchToProps
)(Step5);
