import React, { useCallback, useRef, useEffect } from 'react';
import { Image, Platform } from 'react-native';
import { reloadAsync } from 'expo-updates';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../locales/i18n';
import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import Logger from '../../../util/Logger';
import { useAssetFromTheme } from '../../../util/theme';
import { MetaMetricsEvents } from '../../../core/Analytics';
import generateDeviceAnalyticsMetaData from '../../../util/metrics';
import { useMetrics } from '../../hooks/useMetrics';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';

/* eslint-disable import-x/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const foxLogo = require('../../../images/branding/fox.png');
const metamaskNameLightMode = require('../../../images/branding/metamask-name.png');
const metamaskNameDarkMode = require('../../../images/branding/metamask-name-white.png');

export const createOTAUpdatesModalNavDetails = createNavigationDetails(
  Routes.MODAL.ROOT_MODAL_FLOW,
  Routes.MODAL.OTA_UPDATES_MODAL,
);

const OTAUpdatesModal = () => {
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useMetrics();
  const bottomSheetRef = useRef<BottomSheetRef | null>(null);
  const metamaskName = useAssetFromTheme(
    metamaskNameLightMode,
    metamaskNameDarkMode,
  );

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.OTA_UPDATES_MODAL_VIEWED)
        .addProperties({
          ...generateDeviceAnalyticsMetaData(),
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const dismissBottomSheet = (cb?: () => void): void =>
    bottomSheetRef.current?.onCloseBottomSheet(cb);

  const onPress = useCallback(() => {
    dismissBottomSheet(async () => {
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.OTA_UPDATES_MODAL_PRIMARY_ACTION_CLICKED,
        )
          .addProperties({
            ...generateDeviceAnalyticsMetaData(),
          })
          .build(),
      );

      if (Platform.OS === 'ios') {
        try {
          await reloadAsync();
        } catch (error) {
          Logger.error(
            error as Error,
            'OTA Updates: Error reloading app after modal reload pressed',
          );
        }
      }
    });
  }, [trackEvent, createEventBuilder]);

  const primaryActionLabel =
    Platform.OS === 'ios'
      ? strings('ota_update_modal.primary_action_reload')
      : strings('ota_update_modal.primary_action_acknowledge');

  const description =
    Platform.OS === 'ios'
      ? strings('ota_update_modal.description_ios')
      : strings('ota_update_modal.description_android');

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack
      style={tw.style('bg-default')}
    >
      <HeaderCompactStandard
        twClassName="px-4"
        onClose={() => dismissBottomSheet()}
      >
        <Image
          style={tw.style('h-8')}
          source={metamaskName}
          resizeMode="contain"
        />
      </HeaderCompactStandard>
      <Box twClassName="px-6 pt-2 items-center">
        <Box twClassName="items-center py-6">
          <Box twClassName="items-center mb-6">
            <Image
              source={foxLogo}
              style={tw.style('w-[100px] h-[100px]')}
              resizeMethod="auto"
              resizeMode="contain"
            />
          </Box>
          <Text
            variant={TextVariant.HeadingLg}
            style={tw.style('text-center pb-3')}
          >
            {strings('ota_update_modal.title')}
          </Text>
          <Text variant={TextVariant.BodyMd} style={tw.style('text-center')}>
            {description}
          </Text>
        </Box>
        <Box twClassName="w-full pb-4">
          <Button
            twClassName="w-full"
            size={ButtonSize.Lg}
            variant={ButtonVariant.Primary}
            onPress={onPress}
          >
            {primaryActionLabel}
          </Button>
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default React.memo(OTAUpdatesModal);
