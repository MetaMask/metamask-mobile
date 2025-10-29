import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Image, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import {
  Text,
  TextVariant,
  FontFamily,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
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

  const titleText = strings('perps.gtm_content.title');
  const subtitleText = strings('perps.gtm_content.title_description');

  const styles = createStyles(theme);

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
      <ScrollView
        style={styles.scrollableContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <Text
            variant={TextVariant.DisplayLg}
            fontFamily={FontFamily.Hero}
            twClassName="text-center"
          >
            {titleText}
          </Text>
          <Text twClassName="text-center">{subtitleText}</Text>
        </View>

        {/* Content Section */}
        <View style={styles.contentImageContainer}>
          <Image source={Character} style={styles.image} />
        </View>
      </ScrollView>

      {/* Footer Section */}
      <View style={styles.footerContainer}>
        <Button
          onPress={() => tryPerpsNow()}
          testID={PerpsGTMModalSelectorsIDs.PERPS_TRY_NOW_BUTTON}
          size={ButtonSize.Lg}
          isFullWidth
        >
          {strings('perps.gtm_content.try_now')}
        </Button>
        <Button
          variant={ButtonVariant.Secondary}
          onPress={() => handleClose()}
          testID={PerpsGTMModalSelectorsIDs.PERPS_NOT_NOW_BUTTON}
          isFullWidth
          size={ButtonSize.Lg}
        >
          {strings('perps.gtm_content.not_now')}
        </Button>
      </View>
    </SafeAreaView>
  );
};

export default PerpsGTMModal;
