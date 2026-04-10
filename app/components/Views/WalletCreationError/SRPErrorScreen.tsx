import React, { useCallback, useState, useRef, useEffect } from 'react';
import { SafeAreaView, ScrollView, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import { captureException } from '@sentry/react-native';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';

import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';

import {
  OnboardingActionTypes,
  saveOnboardingEvent as saveEvent,
} from '../../../actions/onboarding';
import { MetaMetricsEvents } from '../../../core/Analytics';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { ITrackingEvent } from '../../../core/Analytics/MetaMetrics.types';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import OldButton, {
  ButtonVariants,
  ButtonSize as OldButtonSize,
} from '../../../component-library/components/Buttons/Button';
import { IconName as CLibIconName } from '../../../component-library/components/Icons/Icon';

import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import AppConstants from '../../../core/AppConstants';
import { Authentication } from '../../../core';

interface SRPErrorScreenProps {
  error: Error;
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) => void;
}

const SRPErrorScreen = ({
  error,
  saveOnboardingEvent,
}: SRPErrorScreenProps) => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    trackOnboarding(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.WALLET_CREATION_ERROR_SCREEN_VIEWED,
      )
        .addProperties({
          account_type: 'srp',
          error_type: error?.name || 'Unknown',
          error_message: error?.message || 'No message',
        })
        .build(),
      saveOnboardingEvent,
    );
  }, [error, saveOnboardingEvent]);

  const errorReport = `View: ChoosePassword\nError: ${error?.name || 'Unknown'}\n${error?.message || 'No message'}`;

  const handleTryAgain = useCallback(async () => {
    trackOnboarding(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.WALLET_CREATION_ERROR_RETRY_CLICKED,
      )
        .addProperties({
          account_type: 'srp',
        })
        .build(),
      saveOnboardingEvent,
    );

    await Authentication.deleteWallet();
    navigation.reset({
      routes: [{ name: Routes.ONBOARDING.ROOT_NAV }],
    });
  }, [navigation, saveOnboardingEvent]);

  const handleSendErrorReport = useCallback(() => {
    trackOnboarding(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.WALLET_CREATION_ERROR_REPORT_SENT,
      )
        .addProperties({
          account_type: 'srp',
        })
        .build(),
      saveOnboardingEvent,
    );

    captureException(error, {
      tags: {
        view: 'WalletCreationError',
        context: 'User manually sent error report - SRP flow',
      },
    });

    navigation.reset({
      routes: [
        {
          name: Routes.ONBOARDING.ROOT_NAV,
          params: {
            screen: Routes.ONBOARDING.NAV,
            params: {
              screen: Routes.ONBOARDING.ONBOARDING,
              params: { showErrorReportSentToast: true },
            },
          },
        },
      ],
    });
  }, [navigation, error, saveOnboardingEvent]);

  const handleCopyError = useCallback(() => {
    Clipboard.setString(errorReport);
    setCopied(true);
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }, [errorReport]);

  const handleContactSupport = useCallback(() => {
    Linking.openURL(AppConstants.REVIEW_PROMPT.SUPPORT);
  }, []);

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      <ScrollView
        contentContainerStyle={tw.style('flex-grow p-4')}
        showsVerticalScrollIndicator={false}
      >
        <Box twClassName="flex-1 items-center pt-12">
          <Icon
            name={IconName.Danger}
            size={IconSize.Xl}
            color={IconColor.ErrorDefault}
            twClassName="mb-4"
          />

          <Text variant={TextVariant.HeadingMd} twClassName="text-center mb-4">
            {strings('wallet_creation_error.title')}
          </Text>

          <Box twClassName="flex-row bg-info-muted rounded-lg p-3 mb-6 w-full">
            <Icon
              name={IconName.Info}
              size={IconSize.Sm}
              color={IconColor.InfoDefault}
              twClassName="mr-2 mt-0.5"
            />
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              twClassName="flex-1"
            >
              {strings('wallet_creation_error.srp_description_part1')}{' '}
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.PrimaryDefault}
                onPress={handleContactSupport}
              >
                {strings('wallet_creation_error.metamask_support')}
              </Text>
              {'.'}
            </Text>
          </Box>

          <Box twClassName="w-full mb-6">
            <Box twClassName="flex-row justify-between items-center mb-2">
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {strings('wallet_creation_error.error_report')}
              </Text>
              <OldButton
                variant={ButtonVariants.Link}
                size={OldButtonSize.Sm}
                label={
                  copied
                    ? strings('wallet_creation_error.copied')
                    : strings('wallet_creation_error.copy')
                }
                onPress={handleCopyError}
                startIconName={copied ? CLibIconName.Check : CLibIconName.Copy}
              />
            </Box>
            <ScrollView
              style={tw.style('bg-alternative rounded-lg p-3 max-h-[200px]')}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
                {errorReport}
              </Text>
            </ScrollView>
          </Box>
        </Box>

        <Box twClassName="w-full pt-4 pb-6">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleSendErrorReport}
            style={tw.style('mb-4')}
          >
            {strings('wallet_creation_error.send_error_report')}
          </Button>

          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleTryAgain}
          >
            {strings('wallet_creation_error.try_again')}
          </Button>
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
};

const mapDispatchToProps = (dispatch: Dispatch<OnboardingActionTypes>) => ({
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) =>
    dispatch(saveEvent(eventArgs)),
});

export default connect(null, mapDispatchToProps)(SRPErrorScreen);
