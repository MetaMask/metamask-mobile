import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { StyleSheet, ScrollView } from 'react-native';

import SettingsDrawer from '../../UI/SettingsDrawer';
import { colors } from '../../../styles/common';
import { getClosableNavigationOptions } from '../../UI/Navbar';
import { strings } from '../../../../locales/i18n';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		paddingLeft: 18
	}
});

/**
 * Main view for app configurations
 */
export default class Settings extends Component {
	static navigationOptions = ({ navigation }) =>
		getClosableNavigationOptions(strings('app_settings.title'), strings('navigation.close'), navigation);

	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object
	};

	render = () => {
		/* eslint-disable */
		/* prettier-ignore */
		const { navigation } = this.props;
		return (
			<ScrollView style={styles.wrapper}>
				<SettingsDrawer
					description={strings('app_settings.general_desc')}
					onPress={() => {
						navigation.push('GeneralSettings');
					}}
					title={strings('app_settings.general_title')}
				/>
				<SettingsDrawer
					description={strings('app_settings.advanced_desc')}
					onPress={() => {
						navigation.push('AdvancedSettings');
					}}
					title={strings('app_settings.advanced_title')}
				/>
				<SettingsDrawer
					description={strings('app_settings.security_desc')}
					onPress={() => {
						navigation.push('SecuritySettings');
					}}
					title={strings('app_settings.security_title')}
				/>
				<SettingsDrawer
					title={strings('app_settings.info_title')}
					onPress={() => {
						navigation.push('CompanySettings');
					}}
				/>
			</ScrollView>
		);
	};
}
