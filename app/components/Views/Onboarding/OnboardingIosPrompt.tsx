import React from 'react';
import { Box, Text } from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import { navigateToSuccessErrorSheetPromise } from '../SuccessErrorSheet/utils';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

const IosGoogleLoginUnsupportedBlockingSheetDescription = () => {
  const tw = useTailwind();
  return (
    <Box gap={4}>
      <Text style={tw.style('text-pretty')}>
        {strings(
          'error_sheet.ios_google_login_unsupported_blocking_description',
        )}
      </Text>
      <Text style={tw.style('text-pretty')}>
        {strings(
          'error_sheet.ios_google_login_unsupported_blocking_description_2',
        )}
      </Text>
    </Box>
  );
};
const IosGoogleLoginUnsupportedBlockingSheetRehydrationDescription = () => {
  const tw = useTailwind();
  return (
    <Box gap={4}>
      <Text style={tw.style('text-pretty')}>
        {strings(
          'error_sheet.ios_google_login_unsupported_blocking_rehydration_description',
        )}
      </Text>
      <Text style={tw.style('text-pretty')}>
        {strings(
          'error_sheet.ios_google_login_unsupported_blocking_rehydration_description_2',
        )}
      </Text>
      <Text style={tw.style('text-pretty')}>
        {strings(
          'error_sheet.ios_google_login_unsupported_blocking_rehydration_description_3',
        )}
      </Text>
    </Box>
  );
};

export const IosGoogleLoginVersionWarningDescription = () => {
  const tw = useTailwind();
  return (
    <Box gap={4}>
      <Text style={tw.style('text-pretty')}>
        {strings('error_sheet.ios_need_update_description')}
        <Text twClassName="font-bold">
          {strings('error_sheet.ios_need_update_description_version')}
        </Text>
        {strings('error_sheet.ios_need_update_description_end')}
      </Text>
      <Text style={tw.style('text-pretty')}>
        {strings('error_sheet.ios_need_update_description2')}
      </Text>
    </Box>
  );
};

export const IosGoogleLoginVersionWarningDescriptionReminder = () => {
  const tw = useTailwind();
  return (
    <Box gap={4}>
      <Text style={tw.style('text-pretty')}>
        {strings('error_sheet.ios_need_update_reminder_description')}
        <Text style={tw.style('text-pretty')}>
          {strings('error_sheet.ios_need_update_reminder_description_version')}
        </Text>
        {strings('error_sheet.ios_need_update_reminder_description_end')}
      </Text>
      <Text style={tw.style('text-pretty')}>
        {strings('error_sheet.ios_need_update_reminder_description_2')}
      </Text>
    </Box>
  );
};

export async function presentIosGoogleLoginUnsupportedBlockingSheet(
  navigation: AppNavigationProp,
): Promise<void> {
  await navigateToSuccessErrorSheetPromise(navigation, {
    type: 'error',
    title: strings('error_sheet.ios_google_login_unsupported_blocking_title'),
    description: <IosGoogleLoginUnsupportedBlockingSheetDescription />,
    primaryButtonLabel: strings(
      'error_sheet.ios_google_login_unsupported_blocking_button',
    ),
    closeOnPrimaryButtonPress: true,
    isInteractable: false,
  });
}

export async function presentIosGoogleLoginUnsupportedBlockingSheetRehydration(
  navigation: AppNavigationProp,
): Promise<void> {
  await navigateToSuccessErrorSheetPromise(navigation, {
    type: 'error',
    title: strings(
      'error_sheet.ios_google_login_unsupported_blocking_rehydration_title',
    ),
    description: (
      <IosGoogleLoginUnsupportedBlockingSheetRehydrationDescription />
    ),
    primaryButtonLabel: strings(
      'error_sheet.ios_google_login_unsupported_blocking_rehydration_button',
    ),
    closeOnPrimaryButtonPress: true,
    isInteractable: false,
  });
}

export async function presentIosGoogleLoginVersionWarningSheet(
  navigation: AppNavigationProp,
): Promise<void> {
  await navigateToSuccessErrorSheetPromise(navigation, {
    type: 'error',
    icon: IconName.Warning,
    iconColor: IconColor.Warning,
    title: strings('error_sheet.ios_need_update_title'),
    description: <IosGoogleLoginVersionWarningDescription />,
    primaryButtonLabel: strings('error_sheet.ios_need_update_button'),
    closeOnPrimaryButtonPress: true,
    isInteractable: false,
  });
}

export async function presentIosGoogleLoginVersionWarningSheetReminder(
  navigation: AppNavigationProp,
): Promise<void> {
  await navigateToSuccessErrorSheetPromise(navigation, {
    type: 'error',
    icon: IconName.Warning,
    iconColor: IconColor.Warning,
    title: strings('error_sheet.ios_need_update_reminder_title'),
    description: <IosGoogleLoginVersionWarningDescriptionReminder />,
    primaryButtonLabel: strings('error_sheet.ios_need_update_reminder_button'),
    closeOnPrimaryButtonPress: true,
    isInteractable: false,
  });
}
