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
import type { PredictOrderPreview, PredictOrderReview } from '../../../types';

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
  display?: PredictOrderReview;
  /** Whether the Preview can no longer be committed, locally or at the venue. */
  isExpired: boolean;
  /** The sheet is stale: no approval, refresh or edit may run. */
  isDisabled?: boolean;
  /** A dispatched order can only be observed, never approved or edited again. */
  isObserving?: boolean;
  onApprove: () => void;
  onBack: () => void;
  onRefresh: () => void;
}

/**
 * The explicit approval step between the quoted Order Preview and its
 * Commit: the quoted values, with the total replaced by the bound the
 * phone signs (maximum buy cost or conditional full-fill sell proceeds), and
 * the expiry. An expired Preview degrades to a re-quote affordance, never
 * a failure.
 */
export const OrderApproval = ({
  preview,
  display,
  isExpired,
  isDisabled = false,
  isObserving = false,
  onApprove,
  onBack,
  onRefresh,
}: OrderApprovalProps) => {
  let actions: React.ReactElement;
  if (isObserving) {
    actions = (
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={onApprove}
        isDisabled={isDisabled}
        testID={PredictOrderFlowTestIds.KEEP_CHECKING}
      >
        {strings('predict_next.order_receipt.keep_checking')}
      </Button>
    );
  } else if (isExpired) {
    actions = (
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
    );
  } else {
    actions = (
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
    );
  }

  return (
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
          time: getIntlDateTimeFormatter(
            I18n.locale,
            EXPIRY_TIME_OPTIONS,
          ).format(new Date(preview.expiresAt)),
        })}
      </Text>
      {actions}
    </Box>
  );
};
