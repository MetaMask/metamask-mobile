import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Identicon from '../Identicon';
import { toggleAccountsModal } from '../../../actions/modals';
import Device from '../../../util/device';
import AnalyticsV2 from '../../../util/analyticsV2';

const styles = StyleSheet.create({
	leftButton: {
		marginTop: 12,
		marginRight: Device.isAndroid() ? 7 : 18,
		marginLeft: Device.isAndroid() ? 7 : 0,
		marginBottom: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
});

/**
 * UI PureComponent that renders on the top right of the navbar
 * showing an identicon for the selectedAddress
 */
class AccountRightButton extends PureComponent {
	static propTypes = {
		/**
		 * Selected address as string
		 */
		address: PropTypes.string,
		/**
		 * Action that toggles the account modal
		 */
		toggleAccountsModal: PropTypes.func,
		/**
		 * List of accounts from the AccountTrackerController
		 */
		accounts: PropTypes.object,
	};

	animating = false;

	toggleAccountsModal = () => {
		const { accounts } = this.props;
		if (!this.animating) {
			this.animating = true;
			this.props.toggleAccountsModal();
			setTimeout(() => {
				this.animating = false;
			}, 500);
		}
		// Track Event: "Opened Acount Switcher"
		AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.BROWSER_OPEN_ACCOUNT_SWITCH, {
			number_of_accounts: Object.keys(accounts ?? {}).length,
		});
	};

	render = () => {
		const { address } = this.props;
		return (
			<TouchableOpacity
				style={styles.leftButton}
				onPress={this.toggleAccountsModal}
				testID={'navbar-account-button'}
			>
				<Identicon diameter={28} address={address} />
			</TouchableOpacity>
		);
	};
}

const mapStateToProps = (state) => ({
	address: state.engine.backgroundState.PreferencesController.selectedAddress,
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
});

const mapDispatchToProps = (dispatch) => ({
	toggleAccountsModal: () => dispatch(toggleAccountsModal()),
});

export default connect(mapStateToProps, mapDispatchToProps)(AccountRightButton);
