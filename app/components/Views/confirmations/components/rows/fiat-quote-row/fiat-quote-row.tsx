import React from 'react';
import BigNumber from 'bignumber.js';
import { View, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import {
  selectTransactionPayQuotesByTransactionId,
  selectTransactionPayTotalsByTransactionId,
} from '../../../../../../selectors/transactionPayController';
import type { RootState } from '../../../../../../reducers';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
});

export function FiatQuoteRow() {
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';

  const quotes = useSelector((state: RootState) =>
    selectTransactionPayQuotesByTransactionId(state, transactionId),
  );

  const totals = useSelector((state: RootState) =>
    selectTransactionPayTotalsByTransactionId(state, transactionId),
  );

  const quote = quotes?.[0];

  if (!quote) {
    return null;
  }

  const providerFeeUsd = quote.fees?.provider?.usd ?? '0.00';
  const estimatedDuration = quote.estimatedDuration ?? 30;
  const totalUsd = new BigNumber(quote.targetAmount.usd).plus(
    new BigNumber(quote.fees?.provider?.usd),
  );

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          Provider fee
        </Text>
        <Text variant={TextVariant.BodyMD}>${providerFeeUsd}</Text>
      </View>
      <View style={styles.row}>
        <Text variant={TextVariant.BodyMDBold}>Total</Text>
        <Text variant={TextVariant.BodyMDBold}>$ {totalUsd.toString()}</Text>
      </View>
      <View style={styles.row}>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          Est. time
        </Text>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          ~{estimatedDuration}s
        </Text>
      </View>
    </View>
  );
}
