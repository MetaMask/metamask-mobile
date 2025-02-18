import React from 'react';
import { Text, View } from 'react-native';
import { TransactionMeta } from '@metamask/transaction-controller';

import { strings } from '../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../../component-library/hooks';
import useApprovalRequest from '../../../../hooks/useApprovalRequest';
import { useFeeCalculations } from '../../../../hooks/useFeeCalculations';
import { useTransactionMetadataRequest } from '../../../../hooks/useTransactionMetadataRequest';
import InfoRow from '../../../UI/InfoRow';
import InfoSection from '../../../UI/InfoRow/InfoSection';
import styleSheet from './GasFeeDetails.styles';

const GasFeeDetails = () => {
  const transactionMetadata = useTransactionMetadataRequest();
  const feeCalculations = useFeeCalculations(
    transactionMetadata as TransactionMeta,
  );

  const { approvalRequest } = useApprovalRequest();
  const { styles } = useStyles(styleSheet, {});

  if (!approvalRequest) {
    return null;
  }

  return (
    <View style={styles.container}>
      <InfoSection>
        <InfoRow
          label={strings('transactions.network_fee')}
          tooltip={'Network fee tooltip'}
        >
          <View style={styles.valueContainer}>
            <Text style={styles.secondaryValue}>$43.56</Text>
            <Text style={styles.primaryValue}>0.0025 ETH</Text>
          </View>
        </InfoRow>
      </InfoSection>
    </View>
  );
};

export default GasFeeDetails;
