import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { View, StyleSheet } from 'react-native';
import Tooltip from '../Tooltip';
import setOnboardingWizardStep from '../../../../actions/wizard';

const styles = StyleSheet.create({
	main: {
		flex: 1
	},
	tooltipContainer: {
		flex: 1,
		position: 'absolute',
		left: 0,
		right: 0,
		top: 150,
		marginHorizontal: 45
	}
});

class Step6 extends Component {
	static propTypes = {
		setOnboardingWizardStep: PropTypes.func,
		screenProps: PropTypes.object,
		navigation: PropTypes.object
	};

	state = {
		ready: false
	};

	componentDidMount() {
		// TODO animation ?
		this.setState({ ready: true });
	}

	onNext = () => {
		const { setOnboardingWizardStep } = this.props;
		setOnboardingWizardStep && setOnboardingWizardStep(7);
	};

	onBack = () => {
		const { navigation, setOnboardingWizardStep } = this.props;
		navigation && navigation.openDrawer();
		setOnboardingWizardStep && setOnboardingWizardStep(5);
	};

	onClose = () => {
		const { close } = this.props.screenProps;
		close && close();
	};

	render() {
		const { ready } = this.state;
		if (!ready) return null;
		return (
			<View style={styles.main}>
				<View style={styles.tooltipContainer}>
					<Tooltip
						title={'Search Dapps'}
						content={'Search directly blockchain applications (DAPPS)!'}
						onNext={this.onNext}
						onBack={this.onBack}
						onClose={this.onClose}
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
