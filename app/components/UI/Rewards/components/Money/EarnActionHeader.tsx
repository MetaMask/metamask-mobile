import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { EARN_ACTION_HEADER_TEST_IDS } from './EarnActionHeader.testIds';

export interface EarnActionHeaderCta {
  label: string;
  onPress: () => void;
}

interface EarnActionHeaderProps {
  title: string;
  description: string;
  /** Without a CTA the button and the subtext are both left out. */
  cta?: EarnActionHeaderCta;
  /** The line under the button, for example the user's referral code. */
  subtext?: string;
}

/**
 * Top section of an earn page: what the way to earn is, and the one action
 * that starts it.
 */
const EarnActionHeader: React.FC<EarnActionHeaderProps> = ({
  title,
  description,
  cta,
  subtext,
}) => (
  <Box
    twClassName="gap-2 px-4 pb-2 pt-4"
    testID={EARN_ACTION_HEADER_TEST_IDS.CONTAINER}
  >
    <Text
      variant={TextVariant.HeadingSm}
      testID={EARN_ACTION_HEADER_TEST_IDS.TITLE}
    >
      {title}
    </Text>
    <Text
      variant={TextVariant.BodyMd}
      color={TextColor.TextAlternative}
      testID={EARN_ACTION_HEADER_TEST_IDS.DESCRIPTION}
    >
      {description}
    </Text>
    {cta ? (
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        twClassName="mt-2 self-stretch"
        onPress={cta.onPress}
        testID={EARN_ACTION_HEADER_TEST_IDS.CTA}
      >
        {cta.label}
      </Button>
    ) : null}
    {cta && subtext ? (
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="text-center"
        testID={EARN_ACTION_HEADER_TEST_IDS.SUBTEXT}
      >
        {subtext}
      </Text>
    ) : null}
  </Box>
);

export default EarnActionHeader;
