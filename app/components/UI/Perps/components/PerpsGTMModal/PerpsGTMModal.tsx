import { useNavigation } from '@react-navigation/native';
import React from 'react';
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

  const styles = createStyles(theme, isDarkMode);

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
      {/* Content */}
      <View style={styles.contentContainer}>
        <Text style={styles.title} variant={TextVariant.HeadingLG}>
          {strings('perps.gtm_content.title')}
        </Text>
        <View style={styles.ctas}>
          <Text variant={TextVariant.BodyMD} style={styles.titleDescription}>
            {strings('perps.gtm_content.title_description')}
          </Text>
          <Image source={Character} style={styles.image} />
        </View>
      </View>

      {/* Footer */}
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
