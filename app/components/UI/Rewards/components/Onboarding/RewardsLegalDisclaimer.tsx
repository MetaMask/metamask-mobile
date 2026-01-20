import React from 'react';
import { Linking } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import {
  REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL,
  REWARDS_ONBOARD_TERMS_URL,
} from './constants';

interface RewardsLegalDisclaimerProps {
  /**
   * The first part of the legal disclaimer text (before the Terms of Use link)
   */
  disclaimerPart1: string;
  /**
   * The Terms of Use link text
   */
  disclaimerPart2: string;
  /**
   * The middle part of the legal disclaimer text (between the two links)
   */
  disclaimerPart3: string;
  /**
   * The Learn More link text
   */
  disclaimerPart4: string;
}

/**
 * RewardsLegalDisclaimer Component
 *
 * A reusable component that renders the legal disclaimer text with clickable links
 * for Terms of Use and Learn More. Used across multiple onboarding steps.
 */
const RewardsLegalDisclaimer: React.FC<RewardsLegalDisclaimerProps> = ({
  disclaimerPart1,
  disclaimerPart2,
  disclaimerPart3,
  disclaimerPart4,
}) => {
  const openTermsOfUse = () => {
    Linking.openURL(REWARDS_ONBOARD_TERMS_URL);
  };

  const openLearnMore = () => {
    Linking.openURL(REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL);
  };

  return (
    <Box
      testID="rewards-legal-disclaimer-container"
      twClassName="w-full flex-row mt-4"
    >
      <Box
        testID="rewards-legal-disclaimer-content"
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="justify-center flex-wrap gap-2 flex-1"
      >
        <Text
          testID="rewards-legal-disclaimer-text"
          variant={TextVariant.BodySm}
          twClassName="text-alternative text-center"
        >
          <Text
            testID="rewards-legal-disclaimer-part1"
            variant={TextVariant.BodySm}
            twClassName="text-alternative text-center"
          >
            {disclaimerPart1}
          </Text>{' '}
          <Text
            testID="rewards-legal-disclaimer-terms-link"
            variant={TextVariant.BodySm}
            twClassName="text-primary-default"
            onPress={openTermsOfUse}
          >
            {disclaimerPart2}
          </Text>
          <Text
            testID="rewards-legal-disclaimer-part3"
            variant={TextVariant.BodySm}
            twClassName="text-alternative text-center"
          >
            {disclaimerPart3}
          </Text>{' '}
          <Text
            testID="rewards-legal-disclaimer-learn-more-link"
            variant={TextVariant.BodySm}
            twClassName="text-primary-default"
            onPress={openLearnMore}
          >
            {disclaimerPart4}
          </Text>
          .{' '}
        </Text>
      </Box>
    </Box>
  );
};

export default RewardsLegalDisclaimer;
