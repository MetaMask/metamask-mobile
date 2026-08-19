/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, import-x/no-commonjs */
import React from 'react';
import { ActivityIndicator, Image } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import Device from '../../../../app/util/device';
import { useTheme } from '../../../util/theme';

const foxLogo = require('../../../images/branding/fox.png');

// Size is derived from the device width at runtime, so it stays as an inline
// style object rather than a static tailwind class.
const FOX_SIZE = Device.getDeviceWidth() * 0.2;

export const SDKLoading = () => {
  const { colors } = useTheme();

  return (
    <Box
      twClassName={`bg-default rounded-t-3xl ${
        Device.isIphoneX() ? 'pb-5' : 'pb-0'
      }`}
    >
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        gap={3}
        twClassName="w-full px-6 py-8"
      >
        <Image
          style={{ width: FOX_SIZE, height: FOX_SIZE }}
          source={foxLogo}
          resizeMode="contain"
        />
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('sdk.loading')}
        </Text>
        <ActivityIndicator color={colors.primary.default} />
      </Box>
    </Box>
  );
};

export default SDKLoading;
