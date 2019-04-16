import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../../../styles/common';
import Tooltip from '../Tooltip';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { DrawerActions } from 'react-navigation-drawer'; // eslint-disable-line

const styles = StyleSheet.create({
	main: {
		flex: 1,
		backgroundColor: colors.transparent
	},
	some: {
		marginLeft: 30,
		marginRight: 80
	},
	tooltipContainer: {
		flex: 1,
		position: 'absolute',
		left: 0,
		right: 0,
		top: 400
	}
});

class Step5 extends Component {
	static propTypes = {
		navigation: PropTypes.object,
		setOnboardingWizardStep: PropTypes.func,
		screenProps: PropTypes.object
	};

	onNext = () => {
		const { navigation, setOnboardingWizardStep } = this.props;
		setOnboardingWizardStep && setOnboardingWizardStep(6);
		navigation && navigation.dispatch(DrawerActions.closeDrawer());
		navigation && navigation.navigate('BrowserView');
	};

	onBack = () => {
		const { navigation, setOnboardingWizardStep } = this.props;
		setOnboardingWizardStep && setOnboardingWizardStep(4);
		navigation && navigation.dispatch(DrawerActions.closeDrawer());
	};

	onClose = () => {
		const { close } = this.props.screenProps;
		close && close();
	};

	render() {
		return (
			<View style={styles.main}>
				<View style={styles.tooltipContainer}>
					<Tooltip
						title={'Explore the Browser'}
						content={'You can explore blockchainapplications (DAPPS) in the Browser.'}
						onNext={this.onNext}
						onBack={this.onBack}
						onClose={this.onClose}
						style={styles.some}
						topIndicatorPosition={'topLeft'}
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
