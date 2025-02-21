import React from 'react';
import { Text, View } from 'react-native';
import { TransactionMeta } from '@metamask/transaction-controller';

import { strings } from '../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../../component-library/hooks';
import useHideFiatForTestnet from '../../../../../../hooks/useHideFiatForTestnet';
import { useFeeCalculations } from '../../../../hooks/useFeeCalculations';
import { useTransactionMetadataRequest } from '../../../../hooks/useTransactionMetadataRequest';
import InfoRow from '../../../UI/InfoRow';
import InfoSection from '../../../UI/InfoRow/InfoSection';
import styleSheet from './GasFeesDetails.styles';

const GasFeesDetails = () => {
  const { styles } = useStyles(styleSheet, {});
  const transactionMetadata = useTransactionMetadataRequest();
  const feeCalculations = useFeeCalculations(
    transactionMetadata as TransactionMeta,
  );
  const hideFiatForTestnet = useHideFiatForTestnet(
    transactionMetadata?.chainId,
  );

  return (
    <View style={styles.container}>
      <InfoSection>
        <InfoRow label={strings('transactions.network_fee')}>
          <View style={styles.valueContainer}>
            {!hideFiatForTestnet && feeCalculations.estimatedFeeFiat && (
              <Text style={styles.secondaryValue}>
                {feeCalculations.estimatedFeeFiat}
              </Text>
            )}
            <Text style={styles.primaryValue}>
              {feeCalculations.estimatedFeeNative}
            </Text>
          </View>
        </InfoRow>
      </InfoSection>
    </View>
  );
};

export default GasFeesDetails;
