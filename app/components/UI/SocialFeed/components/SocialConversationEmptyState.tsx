import {
  Box,
  BoxAlignItems,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { Image } from 'react-native';
import megaphonePixelWaves from '../../../../images/socialV1/megaphone-pixel-waves.png';

/** Illustration size from the empty-state design. */
const ILLUSTRATION = { width: 218, height: 212 };
/** Body line width in the empty-state frame. */
const BODY_WIDTH = 302;

const ILLUSTRATION_TEST_ID = 'social-conversation-empty-illustration';

export interface SocialConversationEmptyStateProps {
  title: string;
  description: string;
  testID?: string;
  illustrationTestID?: string;
}

/**
 * Illustrated empty feed: megaphone, fox, and pixel squares, then a heading
 * and a short body. No action button. Hosts pass their own copy.
 */
const SocialConversationEmptyState: React.FC<
  SocialConversationEmptyStateProps
> = ({
  title,
  description,
  testID,
  illustrationTestID = ILLUSTRATION_TEST_ID,
}) => (
  <Box
    alignItems={BoxAlignItems.Center}
    twClassName="w-full px-4 pb-12"
    testID={testID}
  >
    <Image
      source={megaphonePixelWaves}
      resizeMode="contain"
      style={ILLUSTRATION}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={illustrationTestID}
    />
    <Text
      variant={TextVariant.HeadingLg}
      color={TextColor.TextDefault}
      twClassName="text-center"
    >
      {title}
    </Text>
    <Text
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextAlternative}
      twClassName="mt-1 text-center"
      style={{ maxWidth: BODY_WIDTH }}
    >
      {description}
    </Text>
  </Box>
);

export default SocialConversationEmptyState;
