import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Text, View, ScrollView, StyleSheet } from 'react-native';
import StyledButton from '../../UI/StyledButton';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import OnboardingScreenWithBg from '../../UI/OnboardingScreenWithBg';
import { strings } from '../../../../locales/i18n';
import FadeOutOverlay from '../../UI/FadeOutOverlay';

const styles = StyleSheet.create({
	scroll: {
		flexGrow: 1
	},
	wrapper: {
		paddingTop: 60,
		paddingHorizontal: 40,
		paddingBottom: 30,
		flex: 1
	},
	content: {
		flex: 1,
		alignItems: 'flex-start'
	},
	title: {
		fontSize: 28,
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
		color: colors.grey500,
		justifyContent: 'flex-start',
		textAlign: 'left',
		...fontStyles.normal
	},
	ctas: {
		flex: 1,
		flexDirection: 'column',
		marginBottom: 40
	},
	ctaWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
	},
	importWrapper: {
		marginTop: 24
	}
});

/**
 * View that is displayed to first time (new) users
 */
export default class OnboardingCarousel extends PureComponent {
	static navigationOptions = () => ({
		header: null
	});

	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object
	};

	onPresGetStarted = () => {
		const { navigation } = this.props;
		navigation && navigation.navigate('Onboarding');
	};

	render() {
		return (
			<View style={baseStyles.flexGrow} testID={'home-screen'}>
				<OnboardingScreenWithBg screen={'b'}>
					<ScrollView style={baseStyles.flexGrow} contentContainerStyle={styles.scroll}>
						<View style={styles.wrapper}>
							<View style={styles.content}>
								<Text style={styles.title}>{strings('onboarding.title')}</Text>
								<Text style={styles.subtitle}>{strings('onboarding.subtitle')}</Text>
							</View>
							<View style={styles.ctas}>
								<View style={styles.ctaWrapper}>
									<View style={styles.importWrapper}>
										<View style={styles.flexGrow}>
											<StyledButton
												type={'normal'}
												onPress={this.onPresGetStarted}
												testID={'onboarding-get-started-button'}
											>
												{'Get started'}
											</StyledButton>
										</View>
									</View>
								</View>
							</View>
						</View>
					</ScrollView>
				</OnboardingScreenWithBg>
				<FadeOutOverlay />
			</View>
		);
	}
}
