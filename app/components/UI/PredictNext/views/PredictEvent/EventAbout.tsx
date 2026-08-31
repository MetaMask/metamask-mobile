import React from 'react';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { EventAboutTestIds } from './EventAbout.testIds';

export interface EventAboutProps {
  description?: string;
  rules?: string;
}

export const EventAbout = ({ description, rules }: EventAboutProps) => {
  const descriptionText = description?.trim();
  const rulesText = rules?.trim();
  if (!descriptionText && !rulesText) {
    return null;
  }

  return (
    <Box testID={EventAboutTestIds.SECTION} twClassName="mt-4 gap-4">
      {descriptionText ? (
        <Box testID={EventAboutTestIds.DESCRIPTION_CARD} twClassName="gap-2">
          <Text
            testID={EventAboutTestIds.TITLE}
            accessibilityRole="header"
            variant={TextVariant.HeadingMd}
          >
            {strings('predict.event.description')}
          </Text>
          <Text
            testID={EventAboutTestIds.DESCRIPTION}
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
          >
            {descriptionText}
          </Text>
        </Box>
      ) : null}
      {rulesText ? (
        <Box testID={EventAboutTestIds.RULES_CARD} twClassName="gap-2">
          <Text
            testID={EventAboutTestIds.RULES_TITLE}
            accessibilityRole="header"
            variant={TextVariant.HeadingMd}
          >
            {strings('predict.rules.title')}
          </Text>
          <Text
            testID={EventAboutTestIds.RULES}
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
          >
            {rulesText}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
};
