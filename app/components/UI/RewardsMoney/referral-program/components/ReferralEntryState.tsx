import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { REWARDS_MONEY_TEST_IDS } from '../../constants';

/**
 * What a never-referred user sees.
 *
 * They are gated out of earnings and claims entirely: there is no relationship
 * to pay against, so the screen prompts for a code rather than showing an empty
 * ledger that reads like a bug.
 */
const ReferralEntryState: React.FC = () => (
  <Box
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Center}
    twClassName="flex-1 px-8 gap-4"
    testID={REWARDS_MONEY_TEST_IDS.ENTRY_STATE}
  >
    <Icon
      name={IconName.Money}
      size={IconSize.Xl}
      color={IconColor.IconAlternative}
    />
    <Text variant={TextVariant.HeadingMd} twClassName="text-center">
      {strings('rewards_money.entry.title')}
    </Text>
    <Text
      variant={TextVariant.BodyMd}
      color={TextColor.TextAlternative}
      twClassName="text-center"
    >
      {strings('rewards_money.entry.description')}
    </Text>
  </Box>
);

export default ReferralEntryState;
