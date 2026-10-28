import React from 'react';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';
import type { UsernameFeedback } from './utils/getUsernameFeedback';

interface UsernameStatusLineProps {
  feedback: UsernameFeedback | null;
  align?: 'left' | 'center';
}

const UsernameStatusLine: React.FC<UsernameStatusLineProps> = ({
  feedback,
  align = 'left',
}) => {
  if (!feedback) {
    return null;
  }

  return (
    <Text
      variant={TextVariant.BodySm}
      color={
        feedback.tone === 'success'
          ? TextColor.SuccessDefault
          : TextColor.ErrorDefault
      }
      twClassName={align === 'center' ? 'text-center' : undefined}
      testID={SocialProfileOnboardingSelectorsIDs.USERNAME_STATUS}
    >
      {feedback.message}
    </Text>
  );
};

export default UsernameStatusLine;
