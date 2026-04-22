import React, { useCallback, useEffect, useMemo } from 'react';
import { Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';

import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  getSocialAccountType,
  WalletCreationErrorCtaType,
} from '../../../constants/onboarding';
import { selectSeedlessOnboardingAuthConnection } from '../../../selectors/seedlessOnboardingController';

import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import AppConstants from '../../../core/AppConstants';
import { Authentication } from '../../../core';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
const FOX_LOGO = require('../../../images/branding/fox.png');

interface SocialLoginErrorSheetProps {
  error?: Error;
}

const SocialLoginErrorSheet = ({ error }: SocialLoginErrorSheetProps) => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const oauthProvider = useSelector(selectSeedlessOnboardingAuthConnection);
  const accountType = useMemo(
    () => getSocialAccountType(oauthProvider ?? '', false),
    [oauthProvider],
  );

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.WALLET_CREATION_ERROR_SCREEN_VIEWED)
        .addProperties({
          account_type: accountType,
          error_type: error?.name || 'Unknown',
          error_message: error?.message || 'No message',
        })
        .build(),
    );
  }, [error, trackEvent, createEventBuilder, accountType]);

  const handleTryAgain = useCallback(async () => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.WALLET_CREATION_ERROR_SCREEN_CTA_CLICKED,
      )
        .addProperties({
          cta_type: WalletCreationErrorCtaType.Retry,
          account_type: accountType,
        })
        .build(),
    );

    await Authentication.deleteWallet();
    navigation.reset({
      routes: [{ name: Routes.ONBOARDING.ROOT_NAV }],
    });
  }, [navigation, trackEvent, createEventBuilder, accountType]);

  const handleContactSupport = useCallback(() => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.WALLET_CREATION_ERROR_SCREEN_CTA_CLICKED,
      )
        .addProperties({
          cta_type: WalletCreationErrorCtaType.ContactSupport,
          account_type: accountType,
        })
        .build(),
    );
    Linking.openURL(AppConstants.REVIEW_PROMPT.SUPPORT);
  }, [trackEvent, createEventBuilder, accountType]);

  return (
    <SafeAreaView style={tw.style('flex-1 bg-alternative justify-end')}>
      <Box twClassName="flex-1 justify-center items-center">
        <Image
          source={FOX_LOGO}
          style={tw.style('w-[120px] h-[120px]')}
          resizeMode="contain"
        />
      </Box>

      <Box twClassName="bg-default rounded-t-2xl p-4 pb-10 items-center">
        <Box twClassName="w-10 h-1 bg-border-muted rounded-full self-center mb-4" />

        <Icon
          name={IconName.Danger}
          size={IconSize.Xl}
          color={IconColor.ErrorDefault}
          twClassName="mb-4"
        />

        <Text variant={TextVariant.HeadingMd} twClassName="text-center mb-2">
          {strings('wallet_creation_error.title')}
        </Text>

        <Text variant={TextVariant.BodyMd} twClassName="text-left mb-6 w-full">
          {strings('wallet_creation_error.social_login_description_part1')}{' '}
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.PrimaryDefault}
            onPress={handleContactSupport}
          >
            {strings('wallet_creation_error.metamask_support')}
          </Text>
          {'.'}
        </Text>

        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleTryAgain}
        >
          {strings('wallet_creation_error.try_again')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default SocialLoginErrorSheet;
