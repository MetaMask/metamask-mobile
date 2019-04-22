import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Platform, View, StyleSheet } from 'react-native';
import Coachmark from '../Coachmark';
import setOnboardingWizardStep from '../../../../actions/wizard';
import { colors } from '../../../../styles/common';
import { renderAccountName } from '../../../../util/address';
import AccountOverview from '../../AccountOverview';

const styles = StyleSheet.create({
	main: {
		flex: 1
	},
	some: {
		marginHorizontal: 45
	},
	coachmarkContainer: {
		flex: 1,
		position: 'absolute',
		left: 0,
		right: 0,
		top: 200
	},
	accountLabelContainer: {
		alignItems: 'center',
		marginTop: Platform.OS === 'ios' ? 88 : 57,
		backgroundColor: colors.white
	}
});

class Step3 extends Component {
	static propTypes = {
		/**
		 * String that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		/* Identities object required to get account name
		*/
		identities: PropTypes.object,
		/**
		 * Map of accounts to information objects including balances
		 */
		accounts: PropTypes.object,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		setOnboardingWizardStep: PropTypes.func,
		screenProps: PropTypes.object
	};

	state = {
		accountLabel: '',
		accountLabelEditable: false
	};

	componentDidMount = () => {
		const { identities, selectedAddress } = this.props;
		const accountLabel = renderAccountName(selectedAddress, identities);
		this.setState({ accountLabel });
	};

	onNext = () => {
		const { setOnboardingWizardStep } = this.props;
		setOnboardingWizardStep && setOnboardingWizardStep(4);
	};

	onBack = () => {
		const { setOnboardingWizardStep } = this.props;
		setOnboardingWizardStep && setOnboardingWizardStep(2);
	};

	onClose = () => {
		const { close } = this.props.screenProps;
		close && close();
	};

	render() {
		const { selectedAddress, identities, accounts, currentCurrency } = this.props;
		const account = { address: selectedAddress, ...identities[selectedAddress], ...accounts[selectedAddress] };

		return (
			<View style={styles.main}>
				<View style={styles.accountLabelContainer}>
					<AccountOverview account={account} currentCurrency={currentCurrency} onboardingWizard />
				</View>

				<View style={styles.coachmarkContainer}>
					<Coachmark
						title={'Edit Account Name'}
						content={`'Account 1' isn't that catchy. So why not name your account something a little more memorable.\n\n<b>Long tap</n> now to edit account name.`}
						onNext={this.onNext}
						onBack={this.onBack}
						onClose={this.onClose}
						style={styles.some}
						topIndicatorPosition={'topCenter'}
						currentStep={2}
					/>
				</View>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	identities: state.engine.backgroundState.PreferencesController.identities
});

const mapDispatchToProps = dispatch => ({
	setOnboardingWizardStep: step => dispatch(setOnboardingWizardStep(step))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Step3);
