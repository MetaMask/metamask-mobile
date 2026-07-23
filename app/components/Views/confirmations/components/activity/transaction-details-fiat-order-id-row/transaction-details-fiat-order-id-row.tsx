import React from 'react';
import { TransactionType } from '@metamask/transaction-controller';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
} from '@metamask/design-system-react-native';
import { ButtonIconSizes } from '../../../../../../component-library/components/Buttons/ButtonIcon';
import { IconColor } from '../../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../../locales/i18n';
import { shortenString } from '../../../../../../util/notifications/methods/common';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { hasTransactionType } from '../../../utils/transaction';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import CopyButton from '../../UI/copy-button/copy-button';
import { TransactionDetailsFiatOrderIdRowTestIds } from './transaction-details-fiat-order-id-row.testIds';

export function TransactionDetailsFiatOrderIdRow() {
  const { transactionMeta } = useTransactionDetails();

  const isDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);
  const orderId = transactionMeta?.metamaskPay?.fiat?.orderId;

  // Order ids arrive in the normalized `/providers/{provider}/orders/{id}`
  // form; show only the trailing id.
  const displayId = orderId?.includes('/') ? orderId.split('/').pop() : orderId;

  // Nothing to show if there's no id, this isn't a deposit, or the path had
  // no trailing segment (e.g. a trailing slash).
  if (!isDeposit || !displayId) {
    return null;
  }

  return (
    <TransactionDetailsRow
      label={strings('transaction_details.label.order_id')}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-1.5"
      >
        {/* Order ids can be long (e.g. UUIDs); shorten to a start…end form so
            the value never collides with the label, and let the copy button
            surface the full id. */}
        <Text color={TextColor.TextAlternative}>
          {shortenString(displayId)}
        </Text>
        <CopyButton
          copyText={displayId}
          size={ButtonIconSizes.Sm}
          iconColor={IconColor.Alternative}
          testID={TransactionDetailsFiatOrderIdRowTestIds.COPY}
        />
      </Box>
    </TransactionDetailsRow>
  );
}
