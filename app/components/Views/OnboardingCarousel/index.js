import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Text, View, ScrollView, StyleSheet, Image, Platform } from 'react-native';
import StyledButton from '../../UI/StyledButton';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import ScrollableTabView from 'react-native-scrollable-tab-view';

const styles = StyleSheet.create({
	scroll: {
		flexGrow: 1
	},
	wrapper: {
		paddingTop: 30,
		paddingHorizontal: 40,
		flex: 1
	},
	title: {
		fontSize: 24,
		marginBottom: 12,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.bold
	},
	subtitle: {
		fontSize: 14,
		lineHeight: 19,
		marginTop: 12,
		marginBottom: 25,
		color: colors.grey500,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.normal
	},
	ctas: {
		flex: 1,
		flexDirection: 'column',
		marginBottom: 35
	},
	ctaWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
	},
	importWrapper: {
		marginTop: 24
	},
	metamaskNameWrapper: {
		marginTop: Platform.OS === 'android' ? 0 : 60,
		alignContent: 'center',
		alignItems: 'center'
	},
	metamaskName: {
		width: 122,
		height: 15
	},
	carouselImage: {},
	carouselImage1: {
		width: 200,
		height: 285
	},
	carouselImage2: {
		width: 240,
		height: 222
	},
	carouselImage3: {
		width: 276,
		height: 214
	},
	carouselImageWrapper: {
		alignItems: 'center',
		marginTop: 25
	},
	circle: {
		width: 8,
		height: 8,
		borderRadius: 8 / 2,
		backgroundColor: colors.grey500,
		opacity: 0.4,
		marginHorizontal: 8
	},
	solidCircle: {
		opacity: 1
	},
	progessContainer: {
		flexDirection: 'row',
		alignSelf: 'center'
	},
	scrollTab: {
		flexDirection: 'row',
		alignItems: 'center'
	}
});

const metamask_name = require('../../../images/metamask-name.png'); // eslint-disable-line
const onboarding_carousel_1 = require('../../../images/onboarding-carousel-1.png'); // eslint-disable-line
const onboarding_carousel_2 = require('../../../images/onboarding-carousel-2.png'); // eslint-disable-line
const onboarding_carousel_3 = require('../../../images/onboarding-carousel-3.png'); // eslint-disable-line

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

	state = {
		currentTab: 1
	};

	onPresGetStarted = () => {
		const { navigation } = this.props;
		navigation && navigation.navigate('Onboarding');
	};

	renderTabBar = () => <View />;

	onChangeTab = obj => {
		this.setState({ currentTab: obj.i + 1 });
	};

	render() {
		const { currentTab } = this.state;
		return (
			<View style={baseStyles.flexGrow} testID={'onboarding-carousel-screen'}>
				<ScrollView style={baseStyles.flexGrow} contentContainerStyle={styles.scroll}>
					<View style={styles.metamaskNameWrapper}>
						<Image source={metamask_name} style={styles.metamaskName} resizeMethod={'auto'} />
					</View>
					<View style={styles.wrapper}>
						<ScrollableTabView
							style={styles.scrollTab}
							renderTabBar={this.renderTabBar}
							onChangeTab={this.onChangeTab}
						>
							<View key={'1'}>
								<View>
									<Text style={styles.title}>{strings('onboarding_carousel.title1')}</Text>
									<Text style={styles.subtitle}>{strings('onboarding_carousel.subtitle1')}</Text>
								</View>
								<View style={styles.carouselImageWrapper}>
									<Image
										source={onboarding_carousel_1}
										style={[styles.carouselImage, styles.carouselImage1]}
										resizeMethod={'auto'}
									/>
								</View>
							</View>
							<View key={'2'}>
								<View>
									<Text style={styles.title}>{strings('onboarding_carousel.title2')}</Text>
									<Text style={styles.subtitle}>{strings('onboarding_carousel.subtitle2')}</Text>
								</View>
								<View style={styles.carouselImageWrapper}>
									<Image
										source={onboarding_carousel_2}
										style={[styles.carouselImage, styles.carouselImage2]}
										resizeMethod={'auto'}
									/>
								</View>
							</View>
							<View key={'3'}>
								<View>
									<Text style={styles.title}>{strings('onboarding_carousel.title2')}</Text>
									<Text style={styles.subtitle}>{strings('onboarding_carousel.subtitle3')}</Text>
								</View>
								<View style={styles.carouselImageWrapper}>
									<Image
										source={onboarding_carousel_3}
										style={[styles.carouselImage, styles.carouselImage3]}
										resizeMethod={'auto'}
									/>
								</View>
							</View>
						</ScrollableTabView>

						<View style={styles.progessContainer}>
							{[1, 2, 3].map(i => (
								<View key={i} style={[styles.circle, currentTab === i ? styles.solidCircle : {}]} />
							))}
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
											{strings('onboarding_carousel.get_started')}
										</StyledButton>
									</View>
								</View>
							</View>
						</View>
					</View>
				</ScrollView>
				<FadeOutOverlay />
			</View>
		);
	}
}
