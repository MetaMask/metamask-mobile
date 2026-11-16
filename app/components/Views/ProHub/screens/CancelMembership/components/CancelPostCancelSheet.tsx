import React from 'react';
import {
  BottomSheet,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { CancelMembershipTestIds } from '../CancelMembership.testIds';
import { CANCELLATION_TIMINGS } from '../CancelMembership.utils';

/** Sheet content. A period-end cancellation always includes its renewal date. */
export type CancelPostCancelSheetContent =
  | {
      timing: typeof CANCELLATION_TIMINGS.IMMEDIATE;
    }
  | {
      timing: typeof CANCELLATION_TIMINGS.PERIOD_END;
      /** Formatted period end, e.g. `Jul 20, 2027`. */
      periodEndDate: string;
    };

export type CancelPostCancelSheetProps = CancelPostCancelSheetContent & {
  onConfirm: () => void;
};

/**
 * Confirmation shown after a successful cancellation.
 *
 * Not dismissable: `isInteractable={false}` disables overlay press, swipe, and
 * Android back, and there is no header close button. "Got it" is the only exit.
 */
const CancelPostCancelSheet = ({
  onConfirm,
  ...content
}: CancelPostCancelSheetProps) => {
  const isImmediate = content.timing === CANCELLATION_TIMINGS.IMMEDIATE;

  const title = strings(
    isImmediate
      ? 'pro_hub.cancel_membership.post_cancel_sheet.immediate_title'
      : 'pro_hub.cancel_membership.post_cancel_sheet.period_end_title',
  );
  const description = isImmediate
    ? strings(
        'pro_hub.cancel_membership.post_cancel_sheet.immediate_description',
      )
    : strings(
        'pro_hub.cancel_membership.post_cancel_sheet.period_end_description',
        { date: content.periodEndDate },
      );

  return (
    <BottomSheet
      isInteractable={false}
      testID={CancelMembershipTestIds.POST_CANCEL_SHEET}
    >
      <Box twClassName="px-6 pt-2 pb-4 gap-y-4">
        <Text
          variant={TextVariant.HeadingMd}
          testID={CancelMembershipTestIds.POST_CANCEL_SHEET_TITLE}
        >
          {title}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={CancelMembershipTestIds.POST_CANCEL_SHEET_DESCRIPTION}
        >
          {description}
        </Text>
      </Box>
      <Box twClassName="px-6 pb-6">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={onConfirm}
          isFullWidth
          testID={CancelMembershipTestIds.POST_CANCEL_SHEET_BUTTON}
        >
          {strings('pro_hub.cancel_membership.post_cancel_sheet.got_it')}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default CancelPostCancelSheet;
