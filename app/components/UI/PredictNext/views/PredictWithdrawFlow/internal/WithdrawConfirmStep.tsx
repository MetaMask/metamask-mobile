import React from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  KeyValueRow,
  SensitiveText,
  SensitiveTextLength,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../../locales/i18n';
import type { PredictWithdrawPreview } from '../../../types';
import { formatUsd } from '../../../utils/formatUsd';
import { PredictWithdrawFlowTestIds } from './PredictWithdrawFlow.testIds';

interface WithdrawConfirmStepProps {
  preview: PredictWithdrawPreview;
  isPrivacyMode: boolean;
}

/**
 * The figure the Withdrawal takes: the requested amount for a fixed
 * Withdrawal, and "the whole balance" for a sweep, whose actual figure the
 * Venue decides and the receipt reports.
 */
export const withdrawAmountValue = (preview: PredictWithdrawPreview): string =>
  preview.mode === 'sweep_all' || preview.requestedAmount === undefined
    ? strings('predict_next.withdraw.full_balance')
    : formatUsd(preview.requestedAmount);

/** `0xcDe7…9B9c`: enough of a wallet address to recognize it, and not enough
 * to read it. The destination is display-only; there is nothing to edit. */
export const truncateDestination = (address: string): string =>
  address.length <= 12
    ? address
    : strings('predict_next.withdraw.destination_truncated', {
        start: address.slice(0, 6),
        end: address.slice(-4),
      });

/**
 * Confirmation step: exactly what the Commit will move, and where. The
 * destination is venue-owned and read-only — this client cannot set one — and
 * the sandbox notice says so when the address is the demo wallet registered
 * at setup rather than a binding the Venue reported.
 */
export const WithdrawConfirmStep = ({
  preview,
  isPrivacyMode,
}: WithdrawConfirmStepProps) => (
  <Box gap={3}>
    <Box>
      <KeyValueRow
        keyLabel={strings('predict_next.withdraw.amount_row')}
        value={
          <SensitiveText
            isHidden={isPrivacyMode}
            length={SensitiveTextLength.Short}
            testID={PredictWithdrawFlowTestIds.AMOUNT_VALUE}
          >
            {withdrawAmountValue(preview)}
          </SensitiveText>
        }
      />
      <KeyValueRow
        keyLabel={strings('predict_next.withdraw.network_row')}
        value={strings('predict_next.withdraw.network_base')}
        testID={PredictWithdrawFlowTestIds.NETWORK_VALUE}
      />
      <KeyValueRow
        keyLabel={strings('predict_next.withdraw.destination_row')}
        value={
          <SensitiveText
            isHidden={isPrivacyMode}
            length={SensitiveTextLength.Medium}
            testID={PredictWithdrawFlowTestIds.DESTINATION}
          >
            {truncateDestination(preview.destination.address)}
          </SensitiveText>
        }
      />
    </Box>
    {preview.destination.source === 'configured_demo' ? (
      <BannerAlert
        severity={BannerAlertSeverity.Info}
        title={strings('predict_next.withdraw.sandbox_notice.title')}
        description={strings('predict_next.withdraw.sandbox_notice.body')}
        testID={PredictWithdrawFlowTestIds.SANDBOX_NOTICE}
      />
    ) : null}
  </Box>
);
