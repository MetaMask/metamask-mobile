import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { CancelMembershipTestIds } from '../CancelMembership.testIds';
import { MOCK_CANCELLATION_END_DATE } from '../CancelMembership.constants';

export interface CancelSuccessStepProps {
  onDone: () => void;
}

const CancelSuccessStep = ({ onDone }: CancelSuccessStepProps) => (
  <>
    {/* ── Centered content ──────────────────────────────────────────────── */}
    <Box twClassName="flex-1 items-center justify-center px-8 gap-y-6">
      {/* Check icon badge */}
      <Box
        twClassName="w-16 h-16 bg-background-section rounded-2xl items-center justify-center"
        testID={CancelMembershipTestIds.SUCCESS_CHECK_ICON_BOX}
      >
        <Icon
          name={IconName.Check}
          size={IconSize.Lg}
          color={IconColor.IconDefault}
        />
      </Box>

      {/* Title */}
      <Text
        variant={TextVariant.HeadingLg}
        fontWeight={FontWeight.Bold}
        color={TextColor.TextDefault}
        twClassName="text-center"
        testID={CancelMembershipTestIds.SUCCESS_TITLE}
      >
        {strings('pro_hub.cancel_membership.success.title')}
      </Text>

      {/* Description — description_prefix + bold date + description_suffix */}
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="text-center"
        testID={CancelMembershipTestIds.SUCCESS_DESCRIPTION}
      >
        {strings('pro_hub.cancel_membership.success.description_prefix')}
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
        >
          {MOCK_CANCELLATION_END_DATE}
        </Text>
        {strings('pro_hub.cancel_membership.success.description_suffix')}
      </Text>
    </Box>

    {/* ── Done button ───────────────────────────────────────────────────── */}
    <Box twClassName="px-4 pb-2 w-full">
      <Button
        variant={ButtonVariant.Primary}
        onPress={onDone}
        testID={CancelMembershipTestIds.SUCCESS_DONE_BUTTON}
        isFullWidth
        size={ButtonSize.Lg}
      >
        {strings('pro_hub.cancel_membership.success.done')}
      </Button>
    </Box>
  </>
);

export default CancelSuccessStep;
