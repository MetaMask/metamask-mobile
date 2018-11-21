import React, { Component } from 'react';
import {
	SafeAreaView,
	StyleSheet,
	Image,
	Text,
	InteractionManager,
	View,
	ScrollView,
	TouchableOpacity,
	Linking
} from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../locales/i18n';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapperContent: {
		paddingLeft: 20,
		paddingRight: 20,
		paddingVertical: 20
	},
	title: {
		fontSize: 18,
		textAlign: 'left',
		marginBottom: 20,
		...fontStyles.normal
	},
	link: {
		fontSize: 18,
		textAlign: 'left',
		marginBottom: 20,
		...fontStyles.normal,
		color: colors.primary
	},
	division: {
		borderBottomColor: colors.gray,
		borderBottomWidth: 1,
		width: '30%',
		marginBottom: 20
	},
	image: {
		width: 100,
		height: 100
	},
	logoWrapper: {
		flex: 1,
		backgroundColor: colors.white,
		alignItems: 'center',
		justifyContent: 'center',
		top: 20,
		marginBottom: 40
	}
});

const foxImage = require('../../images/fox.png'); // eslint-disable-line import/no-commonjs

/**
 * View that contains app information
 */
export default class AppInformation extends Component {
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

	goTo = url => {
		this.props.navigation.pop();
		InteractionManager.runAfterInteractions(() => {
			this.props.navigation.navigate('BrowserView', {
				url
			});
		});
	};

	onPrivacyPolicy = () => {
		const url = 'https://metamask.io/privacy.html';
		this.goTo(url);
	};

	onTermsOfUse = () => {
		const url = 'https://metamask.io/terms.html';
		this.goTo(url);
	};

	onAttributions = () => {
		const url = 'https://metamask.io/attributions.html';
		this.goTo(url);
	};

	onSupportCenter = () => {
		const url = 'https://metamask.zendesk.com/hc/en-us';
		this.goTo(url);
	};

	onWebSite = () => {
		const url = 'https://metamask.io/';
		this.goTo(url);
	};

	onEmailUs = () => {
		this.props.navigation.pop();
		Linking.openURL('mailto:help@metamask.io?subject=Feedback');
	};

	render() {
		return (
			<SafeAreaView style={styles.wrapper} testID={'app-settings-screen'}>
				<ScrollView contentContainerStyle={styles.wrapperContent}>
					<View style={styles.logoWrapper}>
						<Image source={foxImage} style={styles.image} resizeMethod={'auto'} />
					</View>
					<Text style={styles.title}>{strings('app_information.links')}</Text>
					<View style={styles.links}>
						<TouchableOpacity onPress={this.onPrivacyPolicy}>
							<Text style={styles.link}>{strings('app_information.privacy_policy')}</Text>
						</TouchableOpacity>
						<TouchableOpacity onPress={this.onTermsOfUse}>
							<Text style={styles.link}>{strings('app_information.terms_of_use')}</Text>
						</TouchableOpacity>
						<TouchableOpacity onPress={this.onAttributions}>
							<Text style={styles.link}>{strings('app_information.attributions')}</Text>
						</TouchableOpacity>
					</View>
					<View style={styles.division} />
					<View style={styles.links}>
						<TouchableOpacity onPress={this.onSupportCenter}>
							<Text style={styles.link}>{strings('app_information.support_center')}</Text>
						</TouchableOpacity>
						<TouchableOpacity onPress={this.onWebSite}>
							<Text style={styles.link}>{strings('app_information.web_site')}</Text>
						</TouchableOpacity>
						<TouchableOpacity onPress={this.onEmailUs}>
							<Text style={styles.link}>{strings('app_information.email_us')}</Text>
						</TouchableOpacity>
					</View>
				</ScrollView>
			</SafeAreaView>
		);
	}
}
