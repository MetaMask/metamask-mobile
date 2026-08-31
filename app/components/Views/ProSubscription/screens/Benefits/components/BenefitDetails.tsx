import React, { useCallback } from 'react';
import { Linking } from 'react-native';
import {
  BottomSheet,
  Text,
  TextVariant,
  TextColor,
  Box,
  FontWeight,
} from '@metamask/design-system-react-native';
import { BenefitDetailItem } from '../Benefits.constants';
import { strings } from '../../../../../../../locales/i18n';
import { BenefitsTestIds } from '../Benefits.testIds';

interface BenefitDetailsProps {
  onClose: () => void;
  details: BenefitDetailItem;
  selectedPlan?: string;
}

const BenefitDetails = ({
  onClose,
  details,
  selectedPlan,
}: BenefitDetailsProps) => {
  const descriptionKeys =
    selectedPlan === 'monthly' && details.descriptionMonthly
      ? details.descriptionMonthly
      : details.description;
  const handleLinkPress = useCallback(() => {
    if (details.link) {
      Linking.openURL(details.link.url);
    }
  }, [details.link]);

  return (
    <BottomSheet
      onClose={onClose}
      testID={BenefitsTestIds.BENEFIT_DETAILS_CONTAINER}
    >
      <Box twClassName="px-4 pt-6 flex flex-col">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
          twClassName="mb-2"
        >
          {strings(details.title)}
        </Text>
        {descriptionKeys.map((descriptionKey) => (
          <Text
            key={descriptionKey}
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="mb-3"
          >
            {strings(descriptionKey)}
          </Text>
        ))}

        {details.points && (
          <Box twClassName="flex flex-col gap-y-1.5 mb-3">
            {details.points.map((pointKey) => (
              <Text
                key={pointKey}
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {`\u2022 ${strings(pointKey)}`}
              </Text>
            ))}
          </Box>
        )}

        {details.link && (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextDefault}
            twClassName="mb-3 self-start border-b border-border-default"
            onPress={handleLinkPress}
            accessibilityRole="link"
          >
            {strings(details.link.label)}
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
