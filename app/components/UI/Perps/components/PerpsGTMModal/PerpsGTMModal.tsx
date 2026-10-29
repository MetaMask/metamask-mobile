import { useNavigation } from '@react-navigation/native';
import NavigationService from '../../../../../core/NavigationService';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

import React from 'react';
import { Image } from 'react-native';
import { FadeInDown } from 'react-native-reanimated';
import { AnimationDuration } from '@metamask/design-tokens';
import { BoxJustifyContent } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { useAnalytics } from '../../../../../components/hooks/useAnalytics/useAnalytics';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import Character from '../../../../../images/character_3x.png';
import StorageWrapper from '../../../../../store/storage-wrapper';
import { PERPS_GTM_MODAL_SHOWN } from '../../../../../constants/storage';
import generateDeviceAnalyticsMetaData from '../../../../../util/metrics';
import MarketingMoment, {
  marketingMomentActionsEnteredAt,
} from '../../../MarketingMoment';

import { PerpsGTMModalSelectorsIDs } from '../../Perps.testIds';
import {
  PERPS_GTM_MODAL_DECLINE,
  PERPS_GTM_MODAL_ENGAGE,
  PERPS_GTM_WHATS_NEW_MODAL,
} from '../../constants/perpsConfig';

const CHARACTER_ASPECT_RATIO = 1179 / 1263;

const PerpsGTMModal = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { goBack, navigate } = useNavigation<AppNavigationProp>();
  const tw = useTailwind();

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

    goBack();
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
      title={strings('perps.gtm_content.title')}
      titleProps={{ testID: PerpsGTMModalSelectorsIDs.PERPS_GTM_TITLE }}
      description={strings('perps.gtm_content.title_description')}
      descriptionProps={{
        testID: PerpsGTMModalSelectorsIDs.PERPS_GTM_DESCRIPTION,
        twClassName: 'text-center px-4',
      }}
      artworkWrapperProps={{
        justifyContent: BoxJustifyContent.Start,
        className: 'overflow-visible',
      }}
      artworkWrapperAnimatedViewProps={{
        entering: FadeInDown.duration(AnimationDuration.Slowly)
          .delay(marketingMomentActionsEnteredAt)
          .withInitialValues({
            opacity: 0,
            transform: [{ translateY: 48 }],
          }),
      }}
      artwork={
        <Image
          source={Character}
          style={tw.style('mt-auto h-auto w-full', {
            aspectRatio: CHARACTER_ASPECT_RATIO,
          })}
          resizeMode="contain"
          testID={PerpsGTMModalSelectorsIDs.PERPS_GTM_IMAGE}
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
