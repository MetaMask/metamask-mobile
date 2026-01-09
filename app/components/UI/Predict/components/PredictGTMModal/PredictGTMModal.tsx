import { CommonActions, StackActions } from '@react-navigation/native';
import NavigationService from '../../../../../core/NavigationService';
import React, { useState, useEffect } from 'react';
import { Image, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import ButtonBase from '../../../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useMetrics } from '../../../../../components/hooks/useMetrics';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import PredictMarketingImage from '../../../../../images/predict-marketing.png';
import PoweredByPolymarketImage from '../../../../../images/powered-by-polymarket.png';
import StorageWrapper from '../../../../../store/storage-wrapper';
import { PREDICT_GTM_MODAL_SHOWN } from '../../../../../constants/storage';
import { useTheme } from '../../../../../util/theme';
import generateDeviceAnalyticsMetaData from '../../../../../util/metrics';
import createStyles from './PredictGTMModal.styles';
import {
  PREDICT_GTM_MODAL_DECLINE,
  PREDICT_GTM_MODAL_ENGAGE,
  PREDICT_GTM_WHATS_NEW_MODAL,
  PredictEventValues,
} from '../../constants/eventNames';

const PredictGTMModal = () => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const theme = useTheme();
  const [imageLoaded, setImageLoaded] = useState(false);
  const opacity = useSharedValue(0);

  const titleText = strings('predict.gtm_content.title');
  const subtitleText = strings('predict.gtm_content.title_description');

  const styles = createStyles(theme);

  // Animate content fade-in when image loads
  useEffect(() => {
    if (imageLoaded) {
      opacity.value = withTiming(1, { duration: 500 });
    }
  }, [imageLoaded, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleClose = async () => {
    await StorageWrapper.setItem(PREDICT_GTM_MODAL_SHOWN, 'true');

    trackEvent(
      createEventBuilder(MetaMetricsEvents.WHATS_NEW_LINK_CLICKED)
        .addProperties({
          ...generateDeviceAnalyticsMetaData(),
          feature: PREDICT_GTM_WHATS_NEW_MODAL,
          action: PREDICT_GTM_MODAL_DECLINE,
        })
        .build(),
    );

    // Pop the modal stack to dismiss this modal, then navigate to home
    NavigationService.navigation?.dispatch(StackActions.popToTop());
    NavigationService.navigation?.dispatch(
      CommonActions.navigate({ name: Routes.ONBOARDING.HOME_NAV }),
    );
  };

  const handleGetStarted = async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.WHATS_NEW_LINK_CLICKED)
        .addProperties({
          ...generateDeviceAnalyticsMetaData(),
          feature: PREDICT_GTM_WHATS_NEW_MODAL,
          action: PREDICT_GTM_MODAL_ENGAGE,
        })
        .build(),
    );

    await StorageWrapper.setItem(PREDICT_GTM_MODAL_SHOWN, 'true', {
      emitEvent: false,
    });

    // Pop the modal stack to dismiss this modal, then navigate to Predict
    NavigationService.navigation?.dispatch(StackActions.popToTop());
    NavigationService.navigation?.dispatch(
      CommonActions.navigate({
        name: Routes.ONBOARDING.HOME_NAV,
        params: {
          screen: Routes.PREDICT.ROOT,
          params: {
            screen: Routes.PREDICT.MARKET_LIST,
            params: {
              entryPoint: PredictEventValues.ENTRY_POINT.GTM_MODAL,
            },
          },
        },
      }),
    );
  };

  return (
    <Animated.View
      style={[styles.pageContainer, animatedStyle]}
      testID="predict-gtm-modal-container"
    >
      {/* Background Image - Full Screen */}
      <Image
        source={PredictMarketingImage}
        style={styles.backgroundImage}
        onLoad={() => setImageLoaded(true)}
      />

      {/* Content Overlay */}
      <SafeAreaView style={styles.contentContainer}>
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <Image
            source={PoweredByPolymarketImage}
            style={styles.poweredByImage}
            resizeMode="contain"
          />
          <Text style={styles.title} variant={TextVariant.HeadingLG}>
            {titleText}
          </Text>
          <Text variant={TextVariant.BodyMD} style={styles.titleDescription}>
            {subtitleText}
          </Text>
        </View>

        {/* Spacer to push footer to bottom */}
        <View style={styles.spacer} />

        {/* Footer Section */}
        <View style={styles.footerContainer}>
          <ButtonBase
            onPress={() => handleGetStarted()}
            testID="predict-gtm-get-started-button"
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            style={styles.getStartedButton}
            activeOpacity={0.6}
            label={
              <Text
                variant={TextVariant.BodyMDMedium}
                style={styles.getStartedButtonText}
              >
                {strings('predict.gtm_content.get_started')}
              </Text>
            }
          />
          <Button
            variant={ButtonVariants.Secondary}
            onPress={() => handleClose()}
            testID="predict-gtm-not-now-button"
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
            style={styles.notNowButton}
            activeOpacity={0.6}
            label={
              <Text
                variant={TextVariant.BodyMDMedium}
                style={styles.notNowButtonText}
              >
                {strings('predict.gtm_content.not_now')}
              </Text>
            }
          />
        </View>
      </SafeAreaView>
    </Animated.View>
  );
};

export default PredictGTMModal;
