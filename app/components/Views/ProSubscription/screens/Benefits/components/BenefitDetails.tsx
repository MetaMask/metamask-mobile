import React, { useCallback } from 'react';
import { Linking } from 'react-native';
import {
  BottomSheet,
  Text,
  TextVariant,
  TextColor,
  Box,
} from '@metamask/design-system-react-native';
import { BenefitDetailItem } from '../Benefits.constants';
import { strings } from '../../../../../../../locales/i18n';
import { BenefitsTestIds } from '../Benefits.testIds';

interface BenefitDetailsProps {
  onClose: () => void;
  details: BenefitDetailItem;
}

const BenefitDetails = ({ onClose, details }: BenefitDetailsProps) => {
  const handleLearnMorePress = useCallback(() => {
    if (details.learnMoreUrl) {
      Linking.openURL(details.learnMoreUrl);
    }
  }, [details.learnMoreUrl]);

  return (
    <BottomSheet
      onClose={onClose}
      testID={BenefitsTestIds.BENEFIT_DETAILS_CONTAINER}
    >
      <Box twClassName="px-4 pt-6 flex flex-col">
        <Text
          variant={TextVariant.HeadingMd}
          color={TextColor.TextDefault}
          twClassName="mb-4"
        >
          {strings(details.title)}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mb-4"
        >
          {strings(details.description)}
        </Text>
        {details.subDescription && (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="mb-4"
          >
            {strings(details.subDescription)}
          </Text>
        )}

        {details.points && (
          <Box twClassName="flex flex-col gap-y-2 mb-4">
            {details.points.map((pointKey) => (
              <Text
                key={pointKey}
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {`\u2022 ${strings(pointKey)}`}
              </Text>
            ))}
          </Box>
        )}

        {details.learnMore && details.learnMoreUrl && (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            twClassName="mb-4 self-start border-b-2 border-border-default"
            onPress={handleLearnMorePress}
            accessibilityRole="link"
          >
            {strings(details.learnMore)}
          </Text>
        )}

        {details.notes && (
          <Text variant={TextVariant.BodyXs} color={TextColor.TextMuted}>
            {strings(details.notes)}
          </Text>
        )}
      </Box>
    </BottomSheet>
  );
};

export default BenefitDetails;
