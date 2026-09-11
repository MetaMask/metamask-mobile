import React from 'react';
import { Linking } from 'react-native';
import {
  Box,
  Button,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import { AddDeviceScannerUiState } from './addDeviceScannerUtils';

interface AddDeviceScannerRecoveryProps {
  state: AddDeviceScannerUiState;
  onTryAgain: () => void;
}

const getInvalidQrRecoveryCopy = (): {
  title: string;
  description: string;
} => ({
  title: strings('app_settings.add_device.scanner.invalid_qr_title'),
  description: strings(
    'app_settings.add_device.scanner.invalid_qr_description',
  ),
});

const getRecoveryCopy = (
  state: AddDeviceScannerUiState,
): { title: string; description: string } => {
  switch (state) {
    case AddDeviceScannerUiState.ExpiredQr:
      return {
        title: strings('app_settings.add_device.scanner.expired_qr_title'),
        description: strings(
          'app_settings.add_device.scanner.expired_qr_description',
        ),
      };
    case AddDeviceScannerUiState.ConnectionFailed:
      return {
        title: strings(
          'app_settings.add_device.scanner.connection_failed_title',
        ),
        description: strings(
          'app_settings.add_device.scanner.connection_failed_description',
        ),
      };
    case AddDeviceScannerUiState.InvalidQr:
    default:
      return getInvalidQrRecoveryCopy();
  }
};

export const AddDeviceScannerPermissionDenied = () => (
  <Box twClassName="flex-1 justify-center px-6">
    <Text
      variant={TextVariant.HeadingSm}
      color={TextColor.TextDefault}
      twClassName="text-center mb-2"
    >
      {strings('app_settings.add_device.scanner.permission_title')}
    </Text>
    <Text
      variant={TextVariant.BodyMd}
      color={TextColor.TextAlternative}
      twClassName="text-center mb-6"
    >
      {strings('app_settings.add_device.scanner.permission_description')}
    </Text>
    <Button
      variant={ButtonVariant.Primary}
      twClassName="w-full"
      onPress={() => Linking.openSettings()}
    >
      {strings('app_settings.add_device.scanner.open_settings')}
    </Button>
  </Box>
);

const AddDeviceScannerRecovery = ({
  state,
  onTryAgain,
}: AddDeviceScannerRecoveryProps) => {
  const { title, description } = getRecoveryCopy(state);

  return (
    <Box twClassName="flex-1 justify-center px-6">
      <Text
        variant={TextVariant.HeadingSm}
        color={TextColor.TextDefault}
        twClassName="text-center mb-2"
      >
        {title}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="text-center mb-6"
      >
        {description}
      </Text>
      <Button
        variant={ButtonVariant.Primary}
        twClassName="w-full"
        onPress={onTryAgain}
      >
        {strings('app_settings.add_device.scanner.try_again')}
      </Button>
    </Box>
  );
};

export default AddDeviceScannerRecovery;
