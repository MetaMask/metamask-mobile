import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Platform, Text, View, ScrollView, StyleSheet, Image } from 'react-native';
import StyledButton from '../StyledButton';

import { colors, fontStyles } from '../../styles/common';
import OnboardingScreenWithBg from '../OnboardingScreenWithBg';
import { strings } from '../../../locales/i18n';

const styles = StyleSheet.create({
	flex: {
		flex: 1
	},
	wrapper: {
		paddingTop: 10,
		paddingHorizontal: 40,
		paddingBottom: 30,
		flex: 1
	},
	content: {
		flex: 1,
		alignItems: 'flex-start'
	},
	ctas: {
		justifyContent: 'flex-end',
		height: 210,
		paddingBottom: 50
	},
	logoWrapper: {
		justifyContent: 'flex-start',
		alignItems: 'flex-start'
	},
	fox: {
		marginTop: Platform.OS === 'android' ? 25 : 45,
		width: 66,
		height: 63
	},
	title: {
		fontSize: 32,
		marginTop: 20,
		marginBottom: 10,
		color: colors.fontPrimary,
		justifyContent: 'flex-start',
		textAlign: 'left',
		...fontStyles.bold
	},
	subtitle: {
		fontSize: 14,
		lineHeight: 19,
		marginBottom: 20,
		color: colors.copy,
		justifyContent: 'flex-start',
		textAlign: 'left',
		...fontStyles.normal
	},
	ctaWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
	}
});

/**
 * View that is displayed to first time (new) users
 */
export default class Onboarding extends Component {
	static navigationOptions = () => ({
		headerStyle: {
			shadowColor: 'transparent',
			elevation: 0,
			backgroundColor: 'white',
			borderBottomWidth: 0
		},
		headerTitle: null
	});

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

	render() {
		return (
			<OnboardingScreenWithBg>
				<ScrollView style={styles.flex} contentContainerStyle={styles.flex} testID={'onboarding-screen'}>
					<View style={styles.wrapper}>
						<View style={styles.content}>
							<View style={styles.logoWrapper}>
								<Image
									source={require('../../images/fox.png')}
									style={styles.fox}
									resizeMethod={'auto'}
								/>
							</View>
							<Text style={styles.title}>{strings('onboarding.title')}</Text>
							<Text style={styles.subtitle}>{strings('onboarding.subtitle')}</Text>
						</View>
						<View style={styles.ctas}>
							<View style={styles.ctaWrapper}>
								<StyledButton
									type={'blue'}
									onPress={this.onPressCreate}
									testID={'onboarding-new-button'}
								>
									{strings('onboarding.start_exploring_now')}
								</StyledButton>
							</View>
							<View style={styles.ctaWrapper}>
								<StyledButton
									type={'normal'}
									onPress={this.onPressImport}
									testID={'onboarding-import-button'}
								>
									{strings('onboarding.import_wallet_button')}
								</StyledButton>
							</View>
						</View>
					</View>
				</ScrollView>
			</OnboardingScreenWithBg>
		);
	}
}
