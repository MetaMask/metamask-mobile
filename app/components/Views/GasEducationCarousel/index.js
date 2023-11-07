import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import StyledButton from '../../UI/StyledButton';
import { baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { getTransparentOnboardingNavbarOptions } from '../../UI/Navbar';
import OnboardingScreenWithBg from '../../UI/OnboardingScreenWithBg';
import Text from '../../Base/Text';
import { connect } from 'react-redux';
import Device from '../../../util/device';
import { useTheme } from '../../../util/theme';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import AppConstants from '../../../core/AppConstants';
import { decGWEIToHexWEI } from '../../../util/conversions';
import { BNToHex, hexToBN } from '../../../util/number';
import {
  calculateEIP1559GasFeeHexes,
  getTicker,
} from '../../../util/transactions';
import Engine from '../../../core/Engine';
import TransactionTypes from '../../../core/TransactionTypes';
import { formatCurrency, getTransactionFee } from '../../../util/confirm-tx';
import Logger from '../../../util/Logger';
import { selectTicker } from '../../../selectors/networkController';
import {
  selectConversionRate,
  selectCurrentCurrency,
  selectNativeCurrency,
} from '../../../selectors/currencyRateController';

const IMAGE_3_RATIO = 281 / 354;
const IMAGE_2_RATIO = 353 / 416;
const IMAGE_1_RATIO = 295 / 354;
const DEVICE_WIDTH = Dimensions.get('window').width;

const IMG_PADDING = Device.isIphone5() ? 220 : 200;

const createStyles = (colors) =>
  StyleSheet.create({
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
      backgroundColor: colors.icon.default,
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
const carousel_images = [
  gas_education_carousel_1,
  gas_education_carousel_2,
  gas_education_carousel_3,
];

/**
 * View that is displayed to first time (new) users
 */
const GasEducationCarousel = ({
  navigation,
  route,
  conversionRate,
  currentCurrency,
  nativeCurrency,
  ticker,
}) => {
  const [currentTab, setCurrentTab] = useState(1);
  const [gasFiat, setGasFiat] = useState(null);
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions(getTransparentOnboardingNavbarOptions(colors));
  }, [navigation, colors]);

  useEffect(() => {
    const setGasEstimates = async () => {
      const { GasFeeController } = Engine.context;
      const gas = hexToBN(TransactionTypes.CUSTOM_GAS.DEFAULT_GAS_LIMIT);
      let estimatedTotalGas;
      try {
        const gasEstimates = await GasFeeController.fetchGasFeeEstimates({
          shouldUpdateState: false,
        });

        if (gasEstimates.gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
          const gasFeeEstimates =
            gasEstimates.gasFeeEstimates[AppConstants.GAS_OPTIONS.MEDIUM];
          const estimatedBaseFeeHex = decGWEIToHexWEI(
            gasEstimates.gasFeeEstimates.estimatedBaseFee,
          );
          const suggestedMaxPriorityFeePerGasHex = decGWEIToHexWEI(
            gasFeeEstimates.suggestedMaxPriorityFeePerGas,
          );
          const suggestedMaxFeePerGasHex = decGWEIToHexWEI(
            gasFeeEstimates.suggestedMaxFeePerGas,
          );
          const gasLimitHex = BNToHex(gas);
          const gasHexes = calculateEIP1559GasFeeHexes({
            gasLimitHex,
            estimatedBaseFeeHex,
            suggestedMaxFeePerGasHex,
            suggestedMaxPriorityFeePerGasHex,
          });
          estimatedTotalGas = hexToBN(gasHexes.gasFeeMaxHex);
        } else if (gasEstimates.gasEstimateType === GAS_ESTIMATE_TYPES.LEGACY) {
          const gasPrice = hexToBN(
            decGWEIToHexWEI(
              gasEstimates.gasFeeEstimates[AppConstants.GAS_OPTIONS.MEDIUM],
            ),
          );
          estimatedTotalGas = gas.mul(gasPrice);
        } else {
          const gasPrice = hexToBN(
            decGWEIToHexWEI(gasEstimates.gasFeeEstimates.gasPrice),
          );
          estimatedTotalGas = gas.mul(gasPrice);
        }

        const maxFeePerGasConversion = getTransactionFee({
          value: estimatedTotalGas,
          fromCurrency: nativeCurrency,
          toCurrency: currentCurrency,
          numberOfDecimals: 2,
          conversionRate,
        });

        const gasFiat = formatCurrency(maxFeePerGasConversion, currentCurrency);
        setGasFiat(gasFiat);
      } catch (e) {
        Logger.error(e);
      }
      setIsLoading(false);
    };
    setGasEstimates();
  }, [conversionRate, currentCurrency, nativeCurrency]);

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
      params: {
        url: 'https://community.metamask.io/t/what-is-gas-why-do-transactions-take-so-long/3172',
      },
    });

  const renderText = (key) => {
    if (key === 1) {
      return (
        <View style={styles.tab}>
          <Text
            noMargin
            bold
            black
            style={styles.title}
            testID={`carousel-screen-${key}`}
          >
            {strings('fiat_on_ramp.gas_education_carousel.step_1.title', {
              ticker: getTicker(ticker),
            })}
          </Text>
          {!isLoading && gasFiat && (
            <Text grey noMargin bold style={styles.subheader}>
              {strings(
                'fiat_on_ramp.gas_education_carousel.step_1.average_gas_fee',
              )}{' '}
              {gasFiat}
            </Text>
          )}
          <Text grey noMargin style={styles.subtitle}>
            {strings('fiat_on_ramp.gas_education_carousel.step_1.subtitle_1', {
              ticker: getTicker(ticker),
            })}
          </Text>
          <Text grey noMargin style={styles.subtitle}>
            {strings('fiat_on_ramp.gas_education_carousel.step_1.subtitle_2', {
              ticker: getTicker(ticker),
            })}{' '}
            <Text bold>
              {strings('fiat_on_ramp.gas_education_carousel.step_1.subtitle_3')}
            </Text>
          </Text>
        </View>
      );
    }
    if (key === 2) {
      return (
        <View style={styles.tab}>
          <Text
            noMargin
            bold
            black
            style={styles.title}
            testID={`carousel-screen-${key}`}
          >
            {strings('fiat_on_ramp.gas_education_carousel.step_2.title')}
          </Text>
          <Text grey noMargin style={styles.subtitle}>
            {strings('fiat_on_ramp.gas_education_carousel.step_2.subtitle_1', {
              ticker: getTicker(ticker),
            })}
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
          <Text
            noMargin
            bold
            black
            style={styles.title}
            testID={`carousel-screen-${key}`}
          >
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
            <Text bold>
              {strings('fiat_on_ramp.gas_education_carousel.step_3.subtitle_4')}
            </Text>{' '}
            {strings('fiat_on_ramp.gas_education_carousel.step_3.subtitle_5')}
          </Text>
        </View>
      );
    }
  };

  return (
    <View style={baseStyles.flexGrow} testID={'gas-education-carousel-screen'}>
      <OnboardingScreenWithBg screen={'carousel'}>
        <ScrollView
          style={baseStyles.flexGrow}
          contentContainerStyle={styles.scroll}
        >
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
                              {strings(
                                'fiat_on_ramp.gas_education_carousel.step_3.cta',
                                {
                                  ticker: getTicker(ticker),
                                },
                              )}
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
                <View
                  key={i}
                  style={[
                    styles.circle,
                    currentTab === i && styles.solidCircle,
                  ]}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </OnboardingScreenWithBg>
      <FadeOutOverlay />
    </View>
  );
};

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
  /**
   * Network native currency
   */
  nativeCurrency: PropTypes.string,
  /**
   * Current provider ticker
   */
  ticker: PropTypes.string,
};

const mapStateToProps = (state) => ({
  conversionRate: selectConversionRate(state),
  currentCurrency: selectCurrentCurrency(state),
  nativeCurrency: selectNativeCurrency(state),
  ticker: selectTicker(state),
});

export default connect(mapStateToProps)(GasEducationCarousel);
