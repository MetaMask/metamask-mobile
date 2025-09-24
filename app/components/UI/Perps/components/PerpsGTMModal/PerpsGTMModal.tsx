import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Image, LayoutChangeEvent, View, useColorScheme } from 'react-native';
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

import { PerpsGTMModalSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import {
  PERPS_GTM_MODAL_DECLINE,
  PERPS_GTM_MODAL_ENGAGE,
  PERPS_GTM_WHATS_NEW_MODAL,
} from '../../constants/perpsConfig';

const PerpsGTMModal = () => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const { navigate } = useNavigation();
  const theme = useTheme();

  const isDarkMode = useColorScheme() === 'dark';
  const [titleFontSize, setTitleFontSize] = useState<number | null>(null);
  const [subtitleFontSize, setSubtitleFontSize] = useState<number | null>(null);

  const styles = createStyles(
    theme,
    isDarkMode,
    titleFontSize,
    subtitleFontSize,
  );

  const handleTitleLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    const maxTitleHeight = 120; // Approximate max height for title in header section

    if (height > maxTitleHeight && titleFontSize === null) {
      // Scale down font size proportionally
      const currentFontSize = styles.title.fontSize;
      const scaleFactor = maxTitleHeight / height;
      const newFontSize = Math.max(currentFontSize * scaleFactor, 32); // Min font size of 32
      setTitleFontSize(newFontSize);
    }
  };

  const handleSubtitleLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    const maxSubtitleHeight = 80; // Approximate max height for subtitle in header section

    if (height > maxSubtitleHeight && subtitleFontSize === null) {
      // Scale down font size proportionally
      const currentFontSize = styles.titleDescription.fontSize;
      const scaleFactor = maxSubtitleHeight / height;
      const newFontSize = Math.max(currentFontSize * scaleFactor, 14); // Min font size of 14
      setSubtitleFontSize(newFontSize);
    }
  };

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
    navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.TUTORIAL,
      params: {
        isFromGTMModal: true,
      },
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
          {strings('perps.gtm_content.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMD}
          style={styles.titleDescription}
          onLayout={handleSubtitleLayout}
        >
          {strings('perps.gtm_content.title_description')}
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
