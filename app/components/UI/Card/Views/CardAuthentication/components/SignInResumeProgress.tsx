import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { CardAuthenticationSelectors } from '../CardAuthentication.testIds';

const SignInResumeProgress = () => (
  <Box
    twClassName="gap-2.5 px-4 py-3 rounded-xl bg-background-muted"
    testID={CardAuthenticationSelectors.RESUME_PROGRESS}
  >
    <Box twClassName="flex-row items-center gap-2.5">
      <Icon
        name={IconName.Confirmation}
        size={IconSize.Md}
        twClassName="text-success-default"
      />
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {strings('card.card_authentication.resume_progress_identity')}
      </Text>
    </Box>
    <Box twClassName="flex-row items-center gap-2.5">
      <Icon
        name={IconName.Info}
        size={IconSize.Md}
        twClassName="text-icon-alternative"
      />
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        twClassName="text-text-alternative"
      >
        {strings('card.card_authentication.resume_progress_spending')}
      </Text>
    </Box>
  </Box>
);

export default SignInResumeProgress;
