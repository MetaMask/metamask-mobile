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

const BoldIosVersion = () => {
  const tw = useTailwind();
  return (
    <Text style={tw.style('text-pretty font-bold')}>
      {strings('error_sheet.ios_need_update_description_version')}
    </Text>
  );
};

/** Body copy for the blocking sheet when Google login is unsupported on this iOS version. */
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

/** Body copy for the blocking sheet shown during vault rehydration on unsupported iOS. */
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

/** Body copy for the non-blocking "update iOS" warning sheet (initial presentation). */
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

/** Body copy for the reminder variant of the "update iOS" warning sheet. */
export const IosGoogleLoginVersionWarningDescriptionReminder = () => {
  const tw = useTailwind();
  return (
    <Box gap={4}>
      <Text style={tw.style('text-pretty')}>
        {strings('error_sheet.ios_need_update_reminder_description')}
        <BoldIosVersion />
        {strings('error_sheet.ios_need_update_reminder_description_end')}
      </Text>
      <Text style={tw.style('text-pretty')}>
        {strings('error_sheet.ios_need_update_reminder_description_2')}
      </Text>
    </Box>
  );
};

/** Body copy for the error sheet when Google login is unsupported on this iOS version. */
export const IosGoogleLoginVersionErrorDescription = () => {
  const tw = useTailwind();
  return (
    <Box gap={4}>
      <Text style={tw.style('text-pretty')}>
        {strings('error_sheet.ios_google_login_unsupported_error_description')}
        <BoldIosVersion />
        {strings(
          'error_sheet.ios_google_login_unsupported_error_description_2',
        )}
      </Text>
      <Text style={tw.style('text-pretty')}>
        {strings(
          'error_sheet.ios_google_login_unsupported_error_description_3',
        )}
      </Text>
      <Box>
        <Text style={tw.style('text-pretty')}>
          {strings(
            'error_sheet.ios_google_login_unsupported_error_description_4',
          )}
          <BoldIosVersion />
        </Text>
        <Text style={tw.style('text-pretty')}>
          {strings(
            'error_sheet.ios_google_login_unsupported_error_description_5',
          )}
        </Text>
      </Box>
    </Box>
  );
};

/**
 * Presents a non-dismissible error sheet explaining that Google login is not supported on this iOS version.
 *
 * @param navigation - App navigation used to push the success/error sheet.
 */
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

/**
 * Presents the unsupported-iOS blocking sheet with copy tailored to vault rehydration.
 *
 * @param navigation - App navigation used to push the success/error sheet.
 */
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

/**
 * Presents the standard "update iOS" warning for Google login on older iOS versions.
 *
 * @param navigation - App navigation used to push the success/error sheet.
 */
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

/**
 * Presents the reminder copy for the "update iOS" warning (e.g. after login when eligible).
 *
 * @param navigation - App navigation used to push the success/error sheet.
 */
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

/**
 * Presents the error sheet for the "update iOS" warning (e.g. after login when eligible).
 *
 * @param navigation - App navigation used to push the success/error sheet.
 */
export async function presentIosGoogleLoginVersionErrorSheetReminder(
  navigation: AppNavigationProp,
): Promise<void> {
  await navigateToSuccessErrorSheetPromise(navigation, {
    type: 'error',
    icon: IconName.Warning,
    iconColor: IconColor.Warning,
    title: strings('error_sheet.ios_google_login_unsupported_error_title'),
    description: <IosGoogleLoginVersionErrorDescription />,
    primaryButtonLabel: strings(
      'error_sheet.ios_google_login_unsupported_error_button',
    ),
    closeOnPrimaryButtonPress: true,
    isInteractable: false,
  });
}
