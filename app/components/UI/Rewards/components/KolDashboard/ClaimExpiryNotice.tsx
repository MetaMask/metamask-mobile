import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { formatUsd, KOL_EARNINGS_FIXTURE } from './rewardsUiFixtures';

interface ClaimExpiryNoticeProps {
  testID: string;
}

/**
 * Prototype copy for rewards that are about to expire. Engineers replace the
 * amount and day count with live claim data.
 */
const ClaimExpiryNotice: React.FC<ClaimExpiryNoticeProps> = ({ testID }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    gap={2}
    testID={testID}
  >
    <Icon
      name={IconName.Danger}
      size={IconSize.Sm}
      color={IconColor.WarningDefault}
    />
    <Text
      variant={TextVariant.BodySm}
      color={TextColor.WarningDefault}
      twClassName="flex-1"
    >
      {strings('rewards.kol.claim_expiry_warning', {
        amount: formatUsd(KOL_EARNINGS_FIXTURE.expiringSoonAmount),
        days: KOL_EARNINGS_FIXTURE.expiringSoonDays,
      })}
    </Text>
  </Box>
);

export default ClaimExpiryNotice;
