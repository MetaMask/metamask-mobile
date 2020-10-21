import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { StyleSheet, ScrollView, InteractionManager } from 'react-native';
import SettingsDrawer from '../../UI/SettingsDrawer';
import { colors } from '../../../styles/common';
import { getClosableNavigationOptions } from '../../UI/Navbar';
import { strings } from '../../../../locales/i18n';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { connect } from 'react-redux';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		paddingLeft: 18,
		zIndex: 99999999999999
	}
});

/**
 * Main view for app configurations
 */
class Settings extends PureComponent {
	static navigationOptions = ({ navigation }) =>
		getClosableNavigationOptions(strings('app_settings.title'), strings('navigation.close'), navigation);

	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		seedphraseBackedUp: PropTypes.bool
	};

	onPressGeneral = () => {
		InteractionManager.runAfterInteractions(() => Analytics.trackEvent(ANALYTICS_EVENT_OPTS.SETTINGS_GENERAL));
		this.props.navigation.push('GeneralSettings');
	};

	onPressAdvanced = () => {
		InteractionManager.runAfterInteractions(() => Analytics.trackEvent(ANALYTICS_EVENT_OPTS.SETTINGS_ADVANCED));
		this.props.navigation.push('AdvancedSettings');
	};

	onPressSecurity = () => {
		InteractionManager.runAfterInteractions(() =>
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.SETTINGS_SECURITY_AND_PRIVACY)
		);
		this.props.navigation.push('SecuritySettings');
	};

	onPressNetworks = () => {
		this.props.navigation.push('NetworksSettings');
	};

	onPressExperimental = () => {
		InteractionManager.runAfterInteractions(() => Analytics.trackEvent(ANALYTICS_EVENT_OPTS.SETTINGS_EXPERIMENTAL));
		this.props.navigation.push('ExperimentalSettings');
	};

	onPressInfo = () => {
		InteractionManager.runAfterInteractions(() => Analytics.trackEvent(ANALYTICS_EVENT_OPTS.SETTINGS_ABOUT));
		this.props.navigation.push('CompanySettings');
	};

	onPressContacts = () => {
		this.props.navigation.push('ContactsSettings');
	};

	render = () => {
		const { seedphraseBackedUp } = this.props;
		return (
			<ScrollView style={styles.wrapper}>
				<SettingsDrawer
					description={strings('app_settings.general_desc')}
					onPress={this.onPressGeneral}
					title={strings('app_settings.general_title')}
				/>
				<SettingsDrawer
					description={strings('app_settings.advanced_desc')}
					onPress={this.onPressAdvanced}
					title={strings('app_settings.advanced_title')}
				/>
				<SettingsDrawer
					description={strings('app_settings.contacts_desc')}
					onPress={this.onPressContacts}
					title={strings('app_settings.contacts_title')}
				/>
				<SettingsDrawer
					description={strings('app_settings.security_desc')}
					onPress={this.onPressSecurity}
					title={strings('app_settings.security_title')}
					warning={!seedphraseBackedUp}
				/>
				<SettingsDrawer
					title={strings('app_settings.networks_title')}
					description={strings('app_settings.networks_desc')}
					onPress={this.onPressNetworks}
				/>
				<SettingsDrawer
					title={strings('app_settings.experimental_title')}
					description={strings('app_settings.experimental_desc')}
					onPress={this.onPressExperimental}
				/>
				<SettingsDrawer title={strings('app_settings.info_title')} onPress={this.onPressInfo} />
			</ScrollView>
		);
	};
}

const mapStateToProps = state => ({
	seedphraseBackedUp: state.user.seedphraseBackedUp
});

export default connect(mapStateToProps)(Settings);
