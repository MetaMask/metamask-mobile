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
import Character from '../../../../../images/character_3x.png';
import StorageWrapper from '../../../../../store/storage-wrapper';
import { PERPS_GTM_MODAL_SHOWN } from '../../../../../constants/storage';
import { useTheme } from '../../../../../util/theme';
import generateDeviceAnalyticsMetaData from '../../../../../util/metrics';
import createStyles from './PerpsGTMModal.styles';

import { PerpsGTMModalSelectorsIDs } from '../../Perps.testIds';
import {
  PERPS_GTM_MODAL_DECLINE,
  PERPS_GTM_MODAL_ENGAGE,
  PERPS_GTM_WHATS_NEW_MODAL,
} from '../../constants/perpsConfig';
import {
  createFontScaleHandler,
  hasNonLatinCharacters,
} from '../../utils/textUtils';

const PerpsGTMModal = () => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const { navigate } = useNavigation();
  const theme = useTheme();

  const isDarkMode = useColorScheme() === 'dark';
  const [titleFontSize, setTitleFontSize] = useState<number | null>(null);
  const [subtitleFontSize, setSubtitleFontSize] = useState<number | null>(null);

  const titleText = strings('perps.gtm_content.title');
  const subtitleText = strings('perps.gtm_content.title_description');
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
    maxHeight: useSystemFont ? 100 : 120, // System fonts typically render taller
    currentFontSize: styles.title.fontSize,
    setter: setTitleFontSize,
    minFontSize: useSystemFont ? 28 : 32, // Slightly smaller min for system fonts
    currentValue: titleFontSize,
  });

  const handleSubtitleLayout = createFontScaleHandler({
    maxHeight: useSystemFont ? 70 : 80, // System fonts typically render taller
    currentFontSize: styles.titleDescription.fontSize,
    setter: setSubtitleFontSize,
    minFontSize: useSystemFont ? 12 : 14, // Slightly smaller min for system fonts
    currentValue: subtitleFontSize,
  });

  const handleClose = async () => {
    await StorageWrapper.setItem(PERPS_GTM_MODAL_SHOWN, 'true');

    trackEvent(
      createEventBuilder(MetaMetricsEvents.WHATS_NEW_LINK_CLICKED)
        .addProperties({
          ...generateDeviceAnalyticsMetaData(),
          feature: PERPS_GTM_WHATS_NEW_MODAL,
          action: PERPS_GTM_MODAL_DECLINE,
        })
        .build(),
    );

    navigate(Routes.WALLET.HOME);
  };

  const tryPerpsNow = async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.WHATS_NEW_LINK_CLICKED)
        .addProperties({
          ...generateDeviceAnalyticsMetaData(),
          feature: PERPS_GTM_WHATS_NEW_MODAL,
          action: PERPS_GTM_MODAL_ENGAGE,
        })
        .build(),
    );

    await StorageWrapper.setItem(PERPS_GTM_MODAL_SHOWN, 'true', {
      emitEvent: false,
    });
    navigate(Routes.PERPS.TUTORIAL, {
      isFromGTMModal: true,
    });
  };

  return (
    <SafeAreaView
      style={styles.pageContainer}
      testID={PerpsGTMModalSelectorsIDs.PERPS_GTM_MODAL}
    >
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

      {/* Content Section */}
      <View style={styles.contentImageContainer}>
        <Image source={Character} style={styles.image} />
      </View>

      {/* Footer Section */}
      <View style={styles.footerContainer}>
        <ButtonBase
          onPress={() => tryPerpsNow()}
          testID={PerpsGTMModalSelectorsIDs.PERPS_TRY_NOW_BUTTON}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          style={styles.tryNowButton}
          activeOpacity={0.6}
          label={
            <Text
              variant={TextVariant.BodyMDMedium}
              style={styles.tryNowButtonText}
            >
              {strings('perps.gtm_content.try_now')}
            </Text>
          }
        />
        <Button
          variant={ButtonVariants.Secondary}
          onPress={() => handleClose()}
          testID={PerpsGTMModalSelectorsIDs.PERPS_NOT_NOW_BUTTON}
          width={ButtonWidthTypes.Full}
          size={ButtonSize.Lg}
          style={styles.notNowButton}
          activeOpacity={0.6}
          label={
            <Text
              variant={TextVariant.BodyMDMedium}
              style={styles.notNowButtonText}
            >
              {strings('perps.gtm_content.not_now')}
            </Text>
          }
        />
      </View>
    </SafeAreaView>
  );
};

export default PerpsGTMModal;
