import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { TransactionStatus } from '@metamask/transaction-controller';
import {
  Box,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useTransactionDetails } from '../../../../Views/confirmations/hooks/activity/useTransactionDetails';
import { strings } from '../../../../../../locales/i18n';

const styles = StyleSheet.create({
  button: {
    marginTop: 16,
    marginBottom: 20,
  },
});

export function MoneyTransactionDetailsRetryButton() {
  const { transactionMeta } = useTransactionDetails();
  const { status } = transactionMeta;

  const handlePress = useCallback(() => {
    // TODO: implement Money Account retry flow
  }, []);

  if (status !== TransactionStatus.failed) {
    return null;
  }

  return (
    <Box twClassName="flex-col items-stretch">
      <Button
        isFullWidth
        onPress={handlePress}
        variant={ButtonVariant.Secondary}
        style={styles.button}
        testID="money-transaction-details-retry-button"
      >
        {strings('transaction_details.label.retry_button')}
      </Button>
    </Box>
  );
}
