import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import TheMiracleLogo from 'images/benefits/themiracle-logo.svg';
import { strings } from '../../../../../../locales/i18n';

const TheMiracleFooter = () => {
  return (
    <Box twClassName="flex flex-row gap-1 items-center justify-center">
      <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
        {strings('rewards.benefits.powered_by')}
      </Text>
      <TheMiracleLogo name="TheMiracleLogo" width={90} height={26} />
    </Box>
  );
};

export default TheMiracleFooter;
