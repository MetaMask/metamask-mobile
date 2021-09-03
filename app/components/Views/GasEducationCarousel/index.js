import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { View, ScrollView, StyleSheet, Image, Dimensions, TouchableOpacity } from 'react-native';
import StyledButton from '../../UI/StyledButton';
import { colors, baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { getTransparentOnboardingNavbarOptions } from '../../UI/Navbar';
import OnboardingScreenWithBg from '../../UI/OnboardingScreenWithBg';
import Text from '../../Base/Text';
import { getBasicGasEstimates, getRenderableFiatGasFee } from '../../../util/custom-gas';
import { connect } from 'react-redux';
import Device from '../../../util/device';

const IMAGE_3_RATIO = 281 / 354;
const IMAGE_2_RATIO = 353 / 416;
const IMAGE_1_RATIO = 295 / 354;
const DEVICE_WIDTH = Dimensions.get('window').width;

const IMG_PADDING = Device.isIphone5() ? 220 : 200;

const styles = StyleSheet.create({
	scroll: {
		flexGrow: 1,
	},
	wrapper: {
		paddingVertical: Device.isIphone5() ? 15 : 30,
		flex: 1,
	},
	title: {
		fontSize: 24,
		marginBottom: Device.isIphone5() ? 8 : 14,
		justifyContent: 'center',
		textAlign: 'center',
	},
	subtitle: {
		fontSize: 14,
		marginBottom: Device.isIphone5() ? 8 : 14,
		justifyContent: 'center',
		textAlign: 'center',
		lineHeight: 20,
	},
	subheader: {
		fontSize: 16,
		marginBottom: Device.isIphone5() ? 8 : 14,
		lineHeight: 22.5,
		justifyContent: 'center',
		textAlign: 'center',
	},
	link: {
		marginTop: Device.isIphone5() ? 12 : 24,
		fontSize: 14,
		justifyContent: 'center',
		textAlign: 'center',
		lineHeight: 20,
	},
	ctas: {
		flex: 1,
		justifyContent: 'flex-end',
		paddingHorizontal: 40,
	},
	ctaWrapper: {
		justifyContent: 'flex-end',
	},
	carouselImage: {},
	// eslint-disable-next-line react-native/no-unused-styles
	carouselImage1: {
		width: DEVICE_WIDTH - IMG_PADDING,
		height: (DEVICE_WIDTH - IMG_PADDING) * IMAGE_1_RATIO,
	},
	// eslint-disable-next-line react-native/no-unused-styles
	carouselImage2: {
		width: DEVICE_WIDTH - IMG_PADDING,
		height: (DEVICE_WIDTH - IMG_PADDING) * IMAGE_2_RATIO,
	},
	// eslint-disable-next-line react-native/no-unused-styles
	carouselImage3: {
		width: DEVICE_WIDTH - IMG_PADDING,
		height: (DEVICE_WIDTH - IMG_PADDING) * IMAGE_3_RATIO,
	},
	carouselImageWrapper: {
		flexDirection: 'row',
		justifyContent: 'center',
	},
	circle: {
		width: 8,
		height: 8,
		borderRadius: 8 / 2,
		backgroundColor: colors.grey500,
		opacity: 0.4,
		marginHorizontal: 8,
	},
	solidCircle: {
		opacity: 1,
	},
	progessContainer: {
		flexDirection: 'row',
		alignSelf: 'center',
		marginVertical: Device.isIphone5() ? 18 : 36,
	},
	tab: {
		margin: 32,
	},
});

const gas_education_carousel_1 = require('../../../images/gas-education-carousel-1.png'); // eslint-disable-line
const gas_education_carousel_2 = require('../../../images/gas-education-carousel-2.png'); // eslint-disable-line
const gas_education_carousel_3 = require('../../../images/gas-education-carousel-3.png'); // eslint-disable-line
const carousel_images = [gas_education_carousel_1, gas_education_carousel_2, gas_education_carousel_3];

/**
 * View that is displayed to first time (new) users
 */
const GasEducationCarousel = ({ navigation, route, conversionRate, currentCurrency }) => {
	const [currentTab, setCurrentTab] = useState(1);
	const [gasFiat, setGasFiat] = useState(null);

	useEffect(() => {
		const setGasEstimates = async () => {
			const gasEstimate = await getBasicGasEstimates();
			const gasFiat = getRenderableFiatGasFee(gasEstimate.averageGwei, conversionRate, currentCurrency);
			setGasFiat(gasFiat);
		};
		setGasEstimates();
	}, [conversionRate, currentCurrency]);

	const onPresGetStarted = () => {
		navigation.pop();
		route?.params?.navigateTo?.();
	};

	const renderTabBar = () => <View />;

	const onChangeTab = (obj) => {
		setCurrentTab(obj.i + 1);
	};

	const openLink = () =>
		navigation.navigate('Webview', {
			screen: 'SimpleWebview',
			params: { url: 'https://community.metamask.io/t/what-is-gas-why-do-transactions-take-so-long/3172' },
		});

	const renderText = (key) => {
		if (key === 1) {
			return (
				<View style={styles.tab}>
					<Text noMargin bold black style={styles.title} testID={`carousel-screen-${key}`}>
						{strings('fiat_on_ramp.gas_education_carousel.step_1.title')}
					</Text>
					<Text grey noMargin bold style={styles.subheader}>
						{strings('fiat_on_ramp.gas_education_carousel.step_1.average_gas_fee')} {gasFiat}
					</Text>
					<Text grey noMargin style={styles.subtitle}>
						{strings('fiat_on_ramp.gas_education_carousel.step_1.subtitle_1')}
					</Text>
					<Text grey noMargin style={styles.subtitle}>
						{strings('fiat_on_ramp.gas_education_carousel.step_1.subtitle_2')}{' '}
						<Text bold>{strings('fiat_on_ramp.gas_education_carousel.step_1.subtitle_3')}</Text>
					</Text>
				</View>
			);
		}
		if (key === 2) {
			return (
				<View style={styles.tab}>
					<Text noMargin bold black style={styles.title} testID={`carousel-screen-${key}`}>
						{strings('fiat_on_ramp.gas_education_carousel.step_2.title')}
					</Text>
					<Text grey noMargin style={styles.subtitle}>
						{strings('fiat_on_ramp.gas_education_carousel.step_2.subtitle_1')}
					</Text>
					<Text grey noMargin bold style={styles.subtitle}>
						{strings('fiat_on_ramp.gas_education_carousel.step_2.subtitle_2')}
					</Text>
					<TouchableOpacity onPress={openLink}>
						<Text link noMargin bold style={styles.link}>
							{strings('fiat_on_ramp.gas_education_carousel.step_2.learn_more')}
						</Text>
					</TouchableOpacity>
				</View>
			);
		}
		if (key === 3) {
			return (
				<View style={styles.tab}>
					<Text noMargin bold black style={styles.title} testID={`carousel-screen-${key}`}>
						{strings('fiat_on_ramp.gas_education_carousel.step_3.title')}
					</Text>
					<Text noMargin bold style={styles.subheader}>
						{strings('fiat_on_ramp.gas_education_carousel.step_3.subtitle_1')}
					</Text>
					<Text noMargin style={styles.subtitle}>
						{strings('fiat_on_ramp.gas_education_carousel.step_3.subtitle_2')}{' '}
					</Text>
					<Text noMargin style={styles.subtitle}>
						{strings('fiat_on_ramp.gas_education_carousel.step_3.subtitle_3')}{' '}
						<Text bold>{strings('fiat_on_ramp.gas_education_carousel.step_3.subtitle_4')}</Text>{' '}
						{strings('fiat_on_ramp.gas_education_carousel.step_3.subtitle_5')}
					</Text>
				</View>
			);
		}
	};

	return (
		<View style={baseStyles.flexGrow} testID={'gas-education-carousel-screen'}>
			<OnboardingScreenWithBg screen={'carousel'}>
				<ScrollView style={baseStyles.flexGrow} contentContainerStyle={styles.scroll}>
					<View style={styles.wrapper}>
						<ScrollableTabView
							style={styles.scrollTabs}
							renderTabBar={renderTabBar}
							onChangeTab={onChangeTab}
						>
							{['one', 'two', 'three'].map((value, index) => {
								const key = index + 1;
								const imgStyleKey = `carouselImage${key}`;
								return (
									<View key={key} style={baseStyles.flexGrow}>
										<View style={styles.carouselImageWrapper}>
											<Image
												source={carousel_images[index]}
												style={[styles.carouselImage, styles[imgStyleKey]]}
												resizeMethod={'auto'}
												testID={`carousel-${value}-image`}
											/>
										</View>
										<View style={baseStyles.flexGrow}>
											{renderText(key)}
											{key === 3 && (
												<View style={styles.ctas}>
													<View style={styles.ctaWrapper}>
														<StyledButton
															type={'confirm'}
															onPress={onPresGetStarted}
															testID={'gas-education-fiat-on-ramp-start'}
														>
															{strings('fiat_on_ramp.gas_education_carousel.step_3.cta')}
														</StyledButton>
													</View>
												</View>
											)}
										</View>
									</View>
								);
							})}
						</ScrollableTabView>

						<View style={styles.progessContainer}>
							{[1, 2, 3].map((i) => (
								<View key={i} style={[styles.circle, currentTab === i && styles.solidCircle]} />
							))}
						</View>
					</View>
				</ScrollView>
			</OnboardingScreenWithBg>
			<FadeOutOverlay />
		</View>
	);
};

GasEducationCarousel.navigationOptions = ({ navigation }) => getTransparentOnboardingNavbarOptions(navigation);

GasEducationCarousel.propTypes = {
	/**
	 * The navigator object
	 */
	navigation: PropTypes.object,
	/**
		/* conversion rate of ETH - FIAT
		*/
	conversionRate: PropTypes.any,
	/**
		/* Selected currency
		*/
	currentCurrency: PropTypes.string,
	/**
	 * Object that represents the current route info like params passed to it
	 */
	route: PropTypes.object,
};

const mapStateToProps = (state) => ({
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
});

export default connect(mapStateToProps)(GasEducationCarousel);
