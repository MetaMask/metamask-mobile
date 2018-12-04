import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Platform, Text, View, ScrollView, StyleSheet, Image } from 'react-native';
import StyledButton from '../StyledButton';

import { colors, fontStyles } from '../../styles/common';
import OnboardingScreenWithBg from '../OnboardingScreenWithBg';
import { strings } from '../../../locales/i18n';
import { getOnboardingNavbarOptions } from '../Navbar';

const styles = StyleSheet.create({
	flex: {
		flex: 1
	},
	wrapper: {
		paddingVertical: 10,
		paddingHorizontal: 40,
		paddingBottom: 30
	},
	logoWrapper: {
		justifyContent: 'center',
		alignItems: 'center'
	},
	fox: {
		marginTop: Platform.OS === 'android' ? 25 : 45,
		width: 128,
		height: 119
	},
	title: {
		fontSize: 32,
		marginTop: 20,
		marginBottom: 10,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.bold
	},
	subtitle: {
		fontSize: 14,
		marginBottom: 20,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.normal
	},
	bigText: {
		textAlign: 'center',
		fontSize: 22,
		marginTop: Platform.OS === 'android' ? 25 : 50,
		marginBottom: 30,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	smallText: {
		fontSize: 18,
		textAlign: 'center',
		marginTop: 12,
		marginBottom: 12,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	separator: {
		marginBottom: 0
	},
	ctaWrapper: {
		marginTop: 10
	}
});

/**
 * View that is displayed to first time (new) users
 */
export default class Onboarding extends Component {
	static navigationOptions = ({ navigation }) => getOnboardingNavbarOptions(navigation);

	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object
	};

	onPressCreate = () => {
		this.props.navigation.push('CreateWallet');
	};

	onPressImport = () => {
		this.props.navigation.push('ImportWallet');
	};

	render = () => (
		<OnboardingScreenWithBg>
			<ScrollView style={styles.flex} testID={'onboarding-screen'}>
				<View style={styles.wrapper}>
					<View style={styles.logoWrapper}>
						<Image source={require('../../images/fox.png')} style={styles.fox} resizeMethod={'auto'} />
					</View>
					<Text style={styles.title}>{strings('onboarding.title')}</Text>
					<Text style={styles.subtitle}>{strings('onboarding.subtitle')}</Text>

					<Text style={styles.bigText}>{strings('onboarding.lets_get_started')}</Text>
					<Text style={styles.smallText}>{strings('onboarding.already_using_metamask')}</Text>

					<View style={styles.ctaWrapper}>
						<StyledButton type={'blue'} onPress={this.onPressImport} testID={'onboarding-import-button'}>
							{strings('onboarding.import_wallet_button')}
						</StyledButton>
					</View>
					<Text style={[styles.smallText, styles.separator]}>{strings('onboarding.or')}</Text>
					<View style={styles.ctaWrapper}>
						<StyledButton type={'blue'} onPress={this.onPressCreate} testID={'onboarding-new-button'}>
							{strings('onboarding.create_new_wallet_button')}
						</StyledButton>
					</View>
				</View>
			</ScrollView>
		</OnboardingScreenWithBg>
	);
}
