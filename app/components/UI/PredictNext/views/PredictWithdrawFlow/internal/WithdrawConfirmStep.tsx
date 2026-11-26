import React from 'react';
import { TouchableOpacity } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  Icon,
  IconName,
  IconSize,
  KeyValueRow,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import I18n, { strings } from '../../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../../util/intl';
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
        value={preview.destination.network}
        testID={PredictWithdrawFlowTestIds.NETWORK_VALUE}
      />
      <KeyValueRow
        keyLabel={strings('predict_next.withdraw.destination_row')}
        value={
          <Box twClassName="flex-1 flex-row items-center gap-2">
            <SensitiveText
              isHidden={isPrivacyMode}
              length={SensitiveTextLength.Medium}
              twClassName="flex-1"
              testID={PredictWithdrawFlowTestIds.DESTINATION}
            >
              {preview.destination.address}
            </SensitiveText>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={strings(
                'predict_next.withdraw.copy_destination',
              )}
              onPress={() => Clipboard.setString(preview.destination.address)}
              testID={PredictWithdrawFlowTestIds.COPY_DESTINATION}
            >
              <Icon name={IconName.Copy} size={IconSize.Sm} />
            </TouchableOpacity>
          </Box>
        }
      />
      {/* Withdrawal previews have no fee field. This flow charges no fee. */}
      <KeyValueRow
        keyLabel={strings('predict_next.withdraw.fee_row')}
        value={strings('predict_next.withdraw.no_fee')}
        testID={PredictWithdrawFlowTestIds.FEE}
      />
    </Box>
    <Text
      variant={TextVariant.BodyXs}
      color={TextColor.TextAlternative}
      testID={PredictWithdrawFlowTestIds.EXPIRY}
    >
      {strings('predict_next.withdraw.expires_at', {
        time: getIntlDateTimeFormatter(I18n.locale, {
          hour: 'numeric',
          minute: '2-digit',
        }).format(new Date(preview.expiresAt)),
      })}
    </Text>
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
