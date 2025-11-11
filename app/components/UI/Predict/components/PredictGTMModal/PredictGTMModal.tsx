import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Image, View, useColorScheme } from 'react-native';
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
import StorageWrapper from '../../../../../store/storage-wrapper';
import { PREDICT_GTM_MODAL_SHOWN } from '../../../../../constants/storage';
import { useTheme } from '../../../../../util/theme';
import generateDeviceAnalyticsMetaData from '../../../../../util/metrics';
import createStyles from './PredictGTMModal.styles';
import {
  PREDICT_GTM_MODAL_DECLINE,
  PREDICT_GTM_MODAL_ENGAGE,
  PREDICT_GTM_WHATS_NEW_MODAL,
} from '../../constants/eventNames';
import {
  createFontScaleHandler,
  hasNonLatinCharacters,
} from '../../../Perps/utils/textUtils';

const PredictGTMModal = () => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const { navigate } = useNavigation();
  const theme = useTheme();

  const isDarkMode = useColorScheme() === 'dark';
  const [titleFontSize, setTitleFontSize] = useState<number | null>(null);
  const [subtitleFontSize, setSubtitleFontSize] = useState<number | null>(null);

  const titleText = strings('predict.gtm_content.title');
  const subtitleText = strings('predict.gtm_content.title_description');
  const useSystemFont =
    hasNonLatinCharacters(titleText) || hasNonLatinCharacters(subtitleText);

  const styles = createStyles(
    theme,
    isDarkMode,
    titleFontSize,
    subtitleFontSize,
    useSystemFont,
  );

  const handleTitleLayout = createFontScaleHandler({
    maxHeight: useSystemFont ? 100 : 120,
    currentFontSize: styles.title.fontSize,
    setter: setTitleFontSize,
    minFontSize: useSystemFont ? 28 : 32,
    currentValue: titleFontSize,
  });

  const handleSubtitleLayout = createFontScaleHandler({
    maxHeight: useSystemFont ? 70 : 80,
    currentFontSize: styles.titleDescription.fontSize,
    setter: setSubtitleFontSize,
    minFontSize: useSystemFont ? 12 : 14,
    currentValue: subtitleFontSize,
  });

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

    navigate(Routes.WALLET.HOME);
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
    navigate(Routes.PREDICT.MARKET_LIST);
  };

  return (
    <View style={styles.pageContainer} testID="predict-gtm-modal-container">
      {/* Background Image - Full Screen */}
      <Image source={PredictMarketingImage} style={styles.backgroundImage} />

      {/* Content Overlay */}
      <SafeAreaView style={styles.contentContainer}>
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <Text
            style={styles.title}
            variant={TextVariant.HeadingLG}
            onLayout={handleTitleLayout}
          >
            {titleText}
          </Text>
          <Text
            variant={TextVariant.BodyMD}
            style={styles.titleDescription}
            onLayout={handleSubtitleLayout}
          >
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
    </View>
  );
};

export default PredictGTMModal;
