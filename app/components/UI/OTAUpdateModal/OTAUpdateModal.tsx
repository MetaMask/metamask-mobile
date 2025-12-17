import React, { useCallback, useRef, useEffect } from 'react';
import { Image } from 'react-native';
import { reloadAsync } from 'expo-updates';
import { strings } from '../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import Logger from '../../../util/Logger';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import HeaderBase from '../../../component-library/components/HeaderBase';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';
import { MetaMetricsEvents } from '../../../core/Analytics';

import { ScrollView } from 'react-native-gesture-handler';
import generateDeviceAnalyticsMetaData from '../../../util/metrics';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';

/* eslint-disable import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const foxLogo = require('../../../images/branding/fox.png');
const metamaskName = require('../../../images/branding/metamask-name.png');

export const createOTAUpdateModalNavDetails = createNavigationDetails(
  Routes.MODAL.ROOT_MODAL_FLOW,
  Routes.MODAL.OTA_UPDATE_MODAL,
);

const UpdateNeeded = () => {
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useMetrics();
  const bottomSheetRef = useRef<BottomSheetRef | null>(null);

  useEffect(() => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.FORCE_UPGRADE_UPDATE_NEEDED_PROMPT_VIEWED,
      )
        .addProperties({
          ...generateDeviceAnalyticsMetaData(),
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const dismissBottomSheet = (cb?: () => void): void =>
    bottomSheetRef.current?.onCloseBottomSheet(cb);

  const triggerClose = () =>
    dismissBottomSheet(() => {
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.FORCE_UPGRADE_REMIND_ME_LATER_CLICKED,
        )
          .addProperties({
            ...generateDeviceAnalyticsMetaData(),
          })
          .build(),
      );
    });

  const onUpdatePressed = useCallback(() => {
    dismissBottomSheet(async () => {
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.FORCE_UPGRADE_UPDATE_TO_THE_LATEST_VERSION_CLICKED,
        )
          .addProperties({
            ...generateDeviceAnalyticsMetaData(),
          })
          .build(),
      );

      try {
        await reloadAsync();
      } catch (error) {
        Logger.error(
          error as Error,
          'OTA Updates: Error reloading app after update',
        );
      }
    });
  }, [trackEvent, createEventBuilder]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack
      style={tw.style(
        'flex-1 px-6 py-4 justify-between items-center bg-default',
      )}
    >
      <HeaderBase
        includesTopInset
        twClassName="h-auto items-center"
        endAccessory={
          <ButtonIcon
            onPress={triggerClose}
            iconName={IconName.Close}
            iconColor={IconColor.Default}
            testID="update-needed-modal-close-button"
          />
        }
      >
        <Image
          style={tw.style('w-[67px] h-8')}
          source={metamaskName}
          resizeMode="contain"
        />
      </HeaderBase>
      <ScrollView
        contentContainerStyle={tw.style('flex-grow justify-center px-4')}
      >
        <Box twClassName="items-center mb-10">
          <Image
            source={foxLogo}
            style={tw.style('w-[140px] h-[140px]')}
            resizeMethod="auto"
            resizeMode="contain"
          />
        </Box>
        <Text
          variant={TextVariant.HeadingLG}
          style={tw.style('text-center pb-4')}
        >
          {strings('ota_update_modal.title')}
        </Text>
        <Text variant={TextVariant.BodyMD} style={tw.style('text-center')}>
          {strings('ota_update_modal.description')}
        </Text>
      </ScrollView>
      <Box twClassName="w-full p-4">
        <Button
          variant={ButtonVariants.Primary}
          width={ButtonWidthTypes.Full}
          label={strings('ota_update_modal.primary_action')}
          onPress={onUpdatePressed}
          style={tw.style('my-2 py-2')}
        />
      </Box>
    </BottomSheet>
  );
};

export default React.memo(UpdateNeeded);
