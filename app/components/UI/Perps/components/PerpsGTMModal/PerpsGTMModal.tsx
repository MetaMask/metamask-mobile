import { useNavigation } from '@react-navigation/native';
import NavigationService from '../../../../../core/NavigationService';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

import React from 'react';
import { Image, Platform } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { useAnalytics } from '../../../../../components/hooks/useAnalytics/useAnalytics';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import Character from '../../../../../images/character_3x.png';
import StorageWrapper from '../../../../../store/storage-wrapper';
import { PERPS_GTM_MODAL_SHOWN } from '../../../../../constants/storage';
import generateDeviceAnalyticsMetaData from '../../../../../util/metrics';
import MarketingMoment from '../../../MarketingMoment';

import { PerpsGTMModalSelectorsIDs } from '../../Perps.testIds';
import {
  PERPS_GTM_MODAL_DECLINE,
  PERPS_GTM_MODAL_ENGAGE,
  PERPS_GTM_WHATS_NEW_MODAL,
} from '../../constants/perpsConfig';
import { hasNonLatinCharacters } from '../../utils/textUtils';

const PerpsGTMModal = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { navigate } = useNavigation<AppNavigationProp>();
  const tw = useTailwind();

  const titleText = strings('perps.gtm_content.title');
  const subtitleText = strings('perps.gtm_content.title_description');
  const useSystemFont =
    hasNonLatinCharacters(titleText) || hasNonLatinCharacters(subtitleText);
  const systemFontStyle = useSystemFont
    ? { fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto' }
    : undefined;

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

    navigate(Routes.HOME_TABS, { screen: Routes.WALLET.HOME }, { pop: true });
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
    navigate(Routes.HOME_TABS, { screen: Routes.WALLET.HOME }, { pop: true });
    NavigationService.navigation.navigate(Routes.PERPS.TUTORIAL, {
      isFromGTMModal: true,
    });
  };

  return (
    <MarketingMoment
      testID={PerpsGTMModalSelectorsIDs.PERPS_GTM_MODAL}
      title={titleText}
      description={subtitleText}
      titleStyle={systemFontStyle}
      descriptionStyle={systemFontStyle}
      artwork={
        <Image
          source={Character}
          style={tw.style('h-full w-full')}
          resizeMode="contain"
        />
      }
      primaryAction={{
        label: strings('perps.gtm_content.try_now'),
        onPress: tryPerpsNow,
        testID: PerpsGTMModalSelectorsIDs.PERPS_TRY_NOW_BUTTON,
      }}
      secondaryAction={{
        label: strings('perps.gtm_content.not_now'),
        onPress: handleClose,
        testID: PerpsGTMModalSelectorsIDs.PERPS_NOT_NOW_BUTTON,
      }}
    />
  );
};

export default PerpsGTMModal;
