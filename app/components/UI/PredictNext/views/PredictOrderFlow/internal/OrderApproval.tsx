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
import type { PredictOrderPreview } from '../../../types';

import { OrderPreviewRows } from './OrderPreviewRows';
import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

const EXPIRY_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
};

interface OrderApprovalProps {
  preview: PredictOrderPreview;
  /** Whether the Preview can no longer be committed, locally or at the venue. */
  isExpired: boolean;
  onApprove: () => void;
  onBack: () => void;
  onRefresh: () => void;
}

/**
 * The explicit approval step between the quoted Order Preview and its
 * Commit: the exact quoted values — contracts, prices, fees, Total Debit,
 * and expiry — are shown verbatim for approval. Committing sends nothing
 * but the Preview reference, so nothing quoted can change here. An expired
 * Preview degrades to a re-quote affordance, never a failure.
 */
export const OrderApproval = ({
  preview,
  isExpired,
  onApprove,
  onBack,
  onRefresh,
}: OrderApprovalProps) => (
  <Box twClassName="gap-3" testID={PredictOrderFlowTestIds.APPROVAL}>
    <Text variant={TextVariant.HeadingSm}>
      {strings('predict_next.order_approval.title')}
    </Text>
    <OrderPreviewRows preview={preview} />
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
          testID={PredictOrderFlowTestIds.APPROVE}
        >
          {strings('predict_next.order_approval.approve')}
        </Button>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={onBack}
          testID={PredictOrderFlowTestIds.BACK}
        >
          {strings('predict_next.order_approval.edit_order')}
        </Button>
      </>
    )}
  </Box>
);
