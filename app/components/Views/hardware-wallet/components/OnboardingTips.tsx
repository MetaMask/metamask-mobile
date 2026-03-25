import React from 'react';
import {
  Box,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';

const ONBOARDING_TIPS = [
  {
    iconName: IconName.Lock,
    textKey: 'ledger.ledger_reminder_message_step_one',
  },
  {
    iconName: IconName.Ethereum,
    textKey: 'ledger.ledger_reminder_message_step_two',
  },
  {
    iconName: IconName.Hardware,
    textKey: 'ledger.ledger_reminder_message_step_three',
  },
  {
    iconName: IconName.Notification,
    textKey: 'ledger.ledger_reminder_message_step_five',
  },
] as const;

const TipRow = ({
  iconName,
  text,
}: {
  iconName: IconName;
  text: string;
}) => (
  <Box twClassName="w-full flex-row items-center gap-4 py-2">
    <Box twClassName="h-10 w-10 items-center justify-center rounded-full bg-muted">
      <Icon name={iconName} size={IconSize.Md} />
    </Box>
    <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
      {text}
    </Text>
  </Box>
);

const OnboardingTips = () => (
  <Box twClassName="mt-8 w-full px-4">
    {ONBOARDING_TIPS.map((tip) => (
      <TipRow
        key={tip.textKey}
        iconName={tip.iconName}
        text={strings(tip.textKey)}
      />
    ))}
  </Box>
);

export default OnboardingTips;
