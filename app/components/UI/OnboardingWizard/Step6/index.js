import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { View, Text, StyleSheet } from 'react-native';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { strings } from '../../../../../locales/i18n';
import onboardingStyles from './../styles';

const styles = StyleSheet.create({
	main: {
		flex: 1
	},
	coachmarkContainer: {
		flex: 1,
		position: 'absolute',
		left: 0,
		right: 0,
		marginHorizontal: 45
	}
});

class Step6 extends Component {
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
		ready: false,
		coachmarkTop: 0
	};

	componentDidMount() {
		// As we're changing the view on this step, we have to make sure Browser is rendered
		setTimeout(() => {
			this.getPosition(this.props.coachmarkRef.searchWrapperRef);
		}, 100);
	}

	/**
	 * If component ref defined, calculate its position and position coachmark accordingly
	 */
	getPosition = ref => {
		ref &&
			ref.current &&
			ref.current.measure((ox, oy, width, height, px, py) => {
				this.setState({ coachmarkTop: py + height, ready: true });
			});
	};

	/**
	 * Dispatches 'setOnboardingWizardStep' with next step
	 * Closing drawer and navigating to 'WalletView'
	 */
	onNext = () => {
		const { setOnboardingWizardStep } = this.props;
		setOnboardingWizardStep && setOnboardingWizardStep(7);
	};

	/**
	 * Dispatches 'setOnboardingWizardStep' with back step, opening drawer
	 */
	onBack = () => {
		const { navigation, setOnboardingWizardStep } = this.props;
		navigation && navigation.openDrawer();
		setOnboardingWizardStep && setOnboardingWizardStep(5);
	};

	/**
	 * Returns content for this step
	 */
	content = () => (
		<View style={onboardingStyles.contentContainer}>
			<Text style={onboardingStyles.content}>{strings('onboarding_wizard.step6.content')}</Text>
		</View>
	);

	render() {
		const { ready } = this.state;
		if (!ready) return null;
		return (
			<View style={styles.main}>
				<View style={[styles.coachmarkContainer, { top: this.state.coachmarkTop }]}>
					<Coachmark
						title={strings('onboarding_wizard.step6.title')}
						content={this.content()}
						onNext={this.onNext}
						onBack={this.onBack}
						topIndicatorPosition={'topCenter'}
						currentStep={5}
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
)(Step6);
