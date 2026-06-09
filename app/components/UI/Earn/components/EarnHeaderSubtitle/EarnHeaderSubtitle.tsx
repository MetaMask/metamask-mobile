import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { EarnTokenDetails } from '../../types/lending.types';
import { EARN_HEADER_SUBTITLE_TEST_IDS } from './EarnHeaderSubtitle.testIds';

interface EarnHeaderSubtitleProps {
  /**
   * The earn token whose balance and APR to display. When falsy, the component renders nothing.
   */
  earnToken: EarnTokenDetails | null | undefined;
  /**
   * Optional APR override (e.g. for Tron staking, where APR comes from a different source).
   * If provided and parses to a positive number, it takes precedence over `earnToken.experience.apr`.
   */
  aprOverride?: string | null;
  /**
   * Optional test ID for the wrapper element.
   */
  testID?: string;
}

/**
 * Renders a balance + APR row used as the subtitle of an Earn screen header.
 *
 * Designed to be passed to the `subtitle` prop of `HeaderStandard` from
 * `@metamask/design-system-react-native`, or composed into other navbar
 * builders that need the same Earn balance/APR pair.
 */
const EarnHeaderSubtitle: React.FC<EarnHeaderSubtitleProps> = ({
  earnToken,
  aprOverride = null,
  testID = EARN_HEADER_SUBTITLE_TEST_IDS.CONTAINER,
}) => {
  if (!earnToken) {
    return null;
  }

  const parsedOverride = aprOverride ? parseFloat(aprOverride) : 0;
  const apr =
    parsedOverride > 0
      ? aprOverride
      : `${parseFloat(earnToken.experience?.apr ?? '0').toFixed(1)}%`;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={1}
      testID={testID}
    >
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        numberOfLines={1}
        ellipsizeMode="tail"
        testID={EARN_HEADER_SUBTITLE_TEST_IDS.BALANCE}
      >
        {earnToken.balanceFormatted}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.SuccessDefault}
        testID={EARN_HEADER_SUBTITLE_TEST_IDS.APR}
      >
        {`${apr} ${strings('earn.apr')}`}
      </Text>
    </Box>
  );
};

export default EarnHeaderSubtitle;
