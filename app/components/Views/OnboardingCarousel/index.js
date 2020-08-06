import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Text, View, ScrollView, StyleSheet, Image, Dimensions } from 'react-native';
import StyledButton from '../../UI/StyledButton';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { getTransparentOnboardingNavbarOptions } from '../../UI/Navbar';
import OnboardingScreenWithBg from '../../UI/OnboardingScreenWithBg';
// eslint-disable-next-line import/named
import { NavigationActions } from 'react-navigation';
import Device from '../../../util/Device';

const IMAGE_3_RATIO = 215 / 315;
const IMAGE_2_RATIO = 222 / 239;
const IMAGE_1_RATIO = 285 / 203;
const DEVICE_WIDTH = Dimensions.get('window').width;

const IMG_PADDING = Device.isIphoneX() ? 100 : Device.isIphone5S() ? 180 : 220;

const styles = StyleSheet.create({
	scroll: {
		flexGrow: 1
	},
	wrapper: {
		paddingVertical: 30,
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
		paddingHorizontal: 40,
		paddingBottom: Device.isIphoneX() ? 40 : 20,
		flexDirection: 'column'
	},
	ctaWrapper: {
		justifyContent: 'flex-end'
	},
	carouselImage: {},
	// eslint-disable-next-line react-native/no-unused-styles
	carouselImage1: {
		marginTop: 30,
		width: DEVICE_WIDTH - IMG_PADDING,
		height: (DEVICE_WIDTH - IMG_PADDING) * IMAGE_1_RATIO
	},
	// eslint-disable-next-line react-native/no-unused-styles
	carouselImage2: {
		width: DEVICE_WIDTH - IMG_PADDING,
		height: (DEVICE_WIDTH - IMG_PADDING) * IMAGE_2_RATIO
	},
	// eslint-disable-next-line react-native/no-unused-styles
	carouselImage3: {
		width: DEVICE_WIDTH - 60,
		height: (DEVICE_WIDTH - 60) * IMAGE_3_RATIO
	},
	carouselImageWrapper: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center'
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
		alignSelf: 'center',
		marginVertical: 36
	},
	tab: {
		marginHorizontal: 30
	}
});

const onboarding_carousel_1 = require('../../../images/onboarding-carousel-1.png'); // eslint-disable-line
const onboarding_carousel_2 = require('../../../images/onboarding-carousel-2.png'); // eslint-disable-line
const onboarding_carousel_3 = require('../../../images/onboarding-carousel-3.png'); // eslint-disable-line
const explain_backup_seedphrase = require('../../../images/explain-backup-seedphrase.png'); // eslint-disable-line

const carousel_images = [onboarding_carousel_1, onboarding_carousel_2, onboarding_carousel_3];

/**
 * View that is displayed to first time (new) users
 */
export default class OnboardingCarousel extends PureComponent {
	static navigationOptions = ({ navigation }) => getTransparentOnboardingNavbarOptions(navigation);

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
		navigation &&
			navigation.navigate('OnboardingRootNav', {}, NavigationActions.navigate({ routeName: 'Onboarding' }));
	};

	renderTabBar = () => <View />;

	onChangeTab = obj => {
		this.setState({ currentTab: obj.i + 1 });
	};

	render() {
		const { currentTab } = this.state;
		return (
			<View style={baseStyles.flexGrow} testID={'onboarding-carousel-screen'}>
				<OnboardingScreenWithBg screen={'carousel'}>
					<ScrollView style={baseStyles.flexGrow} contentContainerStyle={styles.scroll}>
						<View style={styles.wrapper}>
							<ScrollableTabView
								style={styles.scrollTabs}
								renderTabBar={this.renderTabBar}
								onChangeTab={this.onChangeTab}
							>
								{['one', 'two', 'three'].map((value, index) => {
									const key = index + 1;
									const imgStyleKey = `carouselImage${key}`;
									return (
										<View key={key} style={baseStyles.flexGrow}>
											<View style={styles.tab}>
												<Text style={styles.title} testID={`carousel-screen-${value}`}>
													{strings(`onboarding_carousel.title${key}`)}
												</Text>
												<Text style={styles.subtitle}>
													{strings(`onboarding_carousel.subtitle${key}`)}
												</Text>
											</View>
											<View style={styles.carouselImageWrapper}>
												<Image
													source={carousel_images[index]}
													style={[styles.carouselImage, styles[imgStyleKey]]}
													resizeMethod={'auto'}
													testID={`carousel-${value}-image`}
												/>
											</View>
										</View>
									);
								})}
							</ScrollableTabView>

							<View style={styles.progessContainer}>
								{[1, 2, 3].map(i => (
									<View key={i} style={[styles.circle, currentTab === i ? styles.solidCircle : {}]} />
								))}
							</View>
						</View>
					</ScrollView>
					<View style={styles.ctas}>
						<View style={styles.ctaWrapper}>
							<StyledButton
								type={'normal'}
								onPress={this.onPresGetStarted}
								testID={'onboarding-get-started-button'}
							>
								{strings('onboarding_carousel.get_started')}
							</StyledButton>
						</View>
					</View>
				</OnboardingScreenWithBg>
				<FadeOutOverlay />
			</View>
		);
	}
}
