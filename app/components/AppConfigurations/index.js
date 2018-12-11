import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import AppSettings from '../AppSettings';
import SecuritySettings from '../SecuritySettings';
import AppInformation from '../AppInformation';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.slate
	},
	tabUnderlineStyle: {
		height: 2,
		backgroundColor: colors.primary
	},
	tabStyle: {
		paddingBottom: 0
	},
	textStyle: {
		fontSize: 12,
		letterSpacing: 0.5,
		...fontStyles.bold
	}
});

/**
 * Main view for app configurations
 */
export default class AppConfigurations extends Component {
	static navigationOptions = () => ({
		title: strings('app_settings.title'),
		headerTitleStyle: {
			fontSize: 20,
			...fontStyles.normal
		}
	});

	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object
	};

	state = {
		locked: false,
		appState: 'active'
	};

	scrollableTabViewRef = React.createRef();

	renderTabBar() {
		return (
			<DefaultTabBar
				underlineStyle={styles.tabUnderlineStyle}
				activeTextColor={colors.primary}
				inactiveTextColor={colors.fontTertiary}
				backgroundColor={colors.white}
				tabStyle={styles.tabStyle}
				textStyle={styles.textStyle}
			/>
		);
	}

	render = () => {
		const { navigation } = this.props;
		return (
			<View style={styles.wrapper}>
				<ScrollableTabView ref={this.scrollableTabViewRef} renderTabBar={this.renderTabBar}>
					<AppSettings navigation={navigation} tabLabel={strings('app_configurations.settings_title')} />
					<SecuritySettings navigation={navigation} tabLabel={strings('app_configurations.security_title')} />
					<AppInformation
						navigation={navigation}
						tabLabel={strings('app_configurations.information_title')}
					/>
				</ScrollableTabView>
			</View>
		);
	};
}
