import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

const ReferralInfoSection: React.FC = () => (
  <Box twClassName="gap-2">
    <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
      {strings('rewards.referral.info.title')}
    </Text>

    <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
      {strings('rewards.referral.info.description')}
    </Text>
  </Box>
);

export default ReferralInfoSection;
