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
import { getIntlDateTimeFormatter } from '../../../../../../util/intl';
import I18n, { strings } from '../../../../../../../locales/i18n';
import type { InvariantDisplay } from '../../../auth/signing/profileTemplates';
import type { PredictOrderPreview } from '../../../types';

import { OrderPreviewRows } from './OrderPreviewRows';
import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

const EXPIRY_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
};

interface OrderApprovalProps {
  preview: PredictOrderPreview;
  /** The worst case the phone signs, from the profile's invariant. Until it
   * is known (or when the profile refuses the quote) Approve is disabled:
   * the user approves what is signed, not only what was quoted. */
  display?: InvariantDisplay;
  /** Whether the Preview can no longer be committed, locally or at the venue. */
  isExpired: boolean;
  /** The sheet is stale: no approval, refresh or edit may run. */
  isDisabled?: boolean;
  onApprove: () => void;
  onBack: () => void;
  onRefresh: () => void;
}

/**
 * The explicit approval step between the quoted Order Preview and its
 * Commit: the quoted values, with the total replaced by the bound the
 * phone signs (maximum cost for a buy, minimum proceeds for a sell), and
 * the expiry. An expired Preview degrades to a re-quote affordance, never
 * a failure.
 */
export const OrderApproval = ({
  preview,
  display,
  isExpired,
  isDisabled = false,
  onApprove,
  onBack,
  onRefresh,
}: OrderApprovalProps) => (
  <Box twClassName="gap-3" testID={PredictOrderFlowTestIds.APPROVAL}>
    <Text variant={TextVariant.HeadingSm}>
      {strings('predict_next.order_approval.title')}
    </Text>
    <OrderPreviewRows preview={preview} display={display} />
    <Text
      variant={TextVariant.BodyXs}
      color={TextColor.TextAlternative}
      testID={PredictOrderFlowTestIds.EXPIRY}
    >
      {strings('predict_next.order_approval.expires_at', {
        time: getIntlDateTimeFormatter(I18n.locale, EXPIRY_TIME_OPTIONS).format(
          new Date(preview.expiresAt),
        ),
      })}
    </Text>
    {isExpired ? (
      <>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={PredictOrderFlowTestIds.EXPIRED}
        >
          {strings('predict_next.order_preview.expired')}
        </Text>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={onRefresh}
          isDisabled={isDisabled}
          testID={PredictOrderFlowTestIds.REFRESH}
        >
          {strings('predict_next.order_preview.refresh')}
        </Button>
      </>
    ) : (
      <>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={onApprove}
          isDisabled={isDisabled || display === undefined}
          testID={PredictOrderFlowTestIds.APPROVE}
        >
          {strings('predict_next.order_approval.approve')}
        </Button>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={onBack}
          isDisabled={isDisabled}
          testID={PredictOrderFlowTestIds.BACK}
        >
          {strings('predict_next.order_approval.edit_order')}
        </Button>
      </>
    )}
  </Box>
);
