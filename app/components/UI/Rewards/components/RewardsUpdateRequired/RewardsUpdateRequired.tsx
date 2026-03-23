import React, { useCallback, useEffect } from 'react';
import { Image, Linking, Platform } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import {
  MM_APP_STORE_LINK,
  MM_PLAY_STORE_LINK,
} from '../../../../../constants/urls';
import { useMetrics } from '../../../../hooks/useMetrics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import Logger from '../../../../../util/Logger';
import foxLogo from '../../../../../images/branding/fox.png';

const RewardsUpdateRequired: React.FC = () => {
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useMetrics();

  useEffect(() => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.REWARDS_VERSION_GUARD_VIEWED,
      ).build(),
    );
  }, [trackEvent, createEventBuilder]);

  const handleUpdate = useCallback(() => {
    const link = Platform.OS === 'ios' ? MM_APP_STORE_LINK : MM_PLAY_STORE_LINK;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.REWARDS_VERSION_GUARD_UPDATE_CLICKED)
        .addProperties({ link })
        .build(),
    );

    Linking.canOpenURL(link).then(
      (supported) => {
        if (supported) {
          Linking.openURL(link);
        }
      },
      (err) => Logger.error(err, 'Unable to open store link for update'),
    );
  }, [trackEvent, createEventBuilder]);

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="flex-1 bg-default px-6"
      testID="rewards-update-required-container"
    >
      <Image
        source={foxLogo}
        style={tw.style('w-24 h-24 mb-6')}
        resizeMode="contain"
      />

      <Text
        variant={TextVariant.HeadingLg}
        twClassName="text-center mb-3"
        testID="rewards-update-required-title"
      >
        {strings('rewards.version_guard.title')}
      </Text>

      <Text
        variant={TextVariant.BodyMd}
        twClassName="text-alternative text-center mb-8"
        testID="rewards-update-required-description"
      >
        {strings('rewards.version_guard.description')}
      </Text>

      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        startIconName={IconName.Export}
        startIconProps={{ size: IconSize.Sm }}
        onPress={handleUpdate}
        twClassName="w-full"
        testID="rewards-update-required-update-button"
      >
        {strings('rewards.version_guard.update_button')}
      </Button>
    </Box>
  );
};

export default RewardsUpdateRequired;
