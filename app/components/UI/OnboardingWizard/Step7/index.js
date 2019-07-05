import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Platform, View, Text, StyleSheet } from 'react-native';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { strings } from '../../../../../locales/i18n';
import onboardingStyles from './../styles';
import DeviceSize from '../../../../util/DeviceSize';

const styles = StyleSheet.create({
	main: {
		flex: 1
	},
	coachmarkContainer: {
		flex: 1,
		position: 'absolute',
		left: 0,
		right: 0,
		marginHorizontal: 35
	}
});

class Step7 extends Component {
	static propTypes = {
		/**
		 * Dispatch set onboarding wizard step
		 */
		setOnboardingWizardStep: PropTypes.func,
		/**
		 * Callback to call when closing
		 */
		onClose: PropTypes.func
	};

	state = {
		coachmarkTop: 0
	};

	componentDidMount() {
		this.getPosition();
	}

	/**
	 * If component ref defined, calculate its position and position coachmark accordingly
	 */
	getPosition = () => {
		const position = Platform.OS === 'android' ? 85 : DeviceSize.isIphoneX() ? 120 : 100;
		this.setState({ coachmarkTop: position });
	};

	/**
	 * Dispatches 'setOnboardingWizardStep' with back step
	 */
	onBack = () => {
		const { setOnboardingWizardStep } = this.props;
		setOnboardingWizardStep && setOnboardingWizardStep(6);
	};

	/**
	 * Calls props onClose
	 */
	onClose = () => {
		const { onClose } = this.props;
		onClose && onClose();
	};

	/**
	 * Returns content for this step
	 */
	content = () => (
		<View style={onboardingStyles.contentContainer}>
			<Text style={onboardingStyles.content}>{strings('onboarding_wizard.step7.content')}</Text>
		</View>
	);

	render() {
		return (
			<View style={styles.main}>
				<View style={[styles.coachmarkContainer, { top: this.state.coachmarkTop }]}>
					<Coachmark
						title={strings('onboarding_wizard.step7.title')}
						content={this.content()}
						onNext={this.onClose}
						onBack={this.onBack}
						onClose={this.onClose}
						currentStep={6}
						bottomIndicatorPosition={'bottomLeft'}
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
)(Step7);
