import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { CardSignInLinkStage } from '../../../../../../core/Engine/controllers/card-controller/provider-types';
import { CardAuthenticationSelectors } from '../CardAuthentication.testIds';

interface SignInResumeProgressProps {
  stage: CardSignInLinkStage | null;
}

const SignInResumeProgress = ({ stage }: SignInResumeProgressProps) => {
  const identityVerified = stage === 'spending';

  return (
    <Box
      twClassName="gap-2.5 px-4 py-3 rounded-xl bg-muted"
      testID={CardAuthenticationSelectors.RESUME_PROGRESS}
    >
      <Box twClassName="flex-row items-center gap-2.5">
        <Icon
          name={identityVerified ? IconName.Confirmation : IconName.Info}
          size={IconSize.Md}
          color={identityVerified ? IconColor.SuccessDefault : undefined}
        />
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {strings(
            identityVerified
              ? 'card.card_authentication.resume_progress_identity'
              : 'card.card_authentication.resume_progress_identity_pending',
          )}
        </Text>
      </Box>
      <Box twClassName="flex-row items-center gap-2.5">
        <Icon
          name={IconName.Info}
          size={IconSize.Md}
          color={IconColor.IconAlternative}
        />
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {strings('card.card_authentication.resume_progress_spending')}
        </Text>
      </Box>
    </Box>
  );
};

export default SignInResumeProgress;
