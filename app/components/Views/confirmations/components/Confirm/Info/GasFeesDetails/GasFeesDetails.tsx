import React from 'react';
import { Text, View } from 'react-native';
import { TransactionMeta } from '@metamask/transaction-controller';

import { strings } from '../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../../component-library/hooks';
import useHideFiatForTestnet from '../../../../../../hooks/useHideFiatForTestnet';
import { EVENT_LOCATIONS as STAKING_EVENT_LOCATIONS } from '../../../../../../UI/Stake/constants/events';
import { useFeeCalculations } from '../../../../hooks/useFeeCalculations';
import { TOOLTIP_TYPES as CONFIRMATION_TOOLTIP_TYPES } from '../../../../constants/metricEvents';
import { useTransactionMetadataRequest } from '../../../../hooks/useTransactionMetadataRequest';
import { useConfirmationMetricEvents } from '../../../../hooks/useConfirmationMetricEvents';
import InfoRow from '../../../UI/InfoRow';
import InfoSection from '../../../UI/InfoRow/InfoSection';
import styleSheet from './GasFeesDetails.styles';

interface GasFeesDetailsProps {
  /**
   * The location of the component to be used for analytics.
   */
  location: (typeof STAKING_EVENT_LOCATIONS)[keyof typeof STAKING_EVENT_LOCATIONS];
}

const GasFeesDetails = ({ location }: GasFeesDetailsProps) => {
  const { styles } = useStyles(styleSheet, {});
  const transactionMetadata = useTransactionMetadataRequest();
  const feeCalculations = useFeeCalculations(
    transactionMetadata as TransactionMeta,
  );
  const hideFiatForTestnet = useHideFiatForTestnet(
    transactionMetadata?.chainId,
  );
  const { trackTooltipClickedEvent } = useConfirmationMetricEvents();

  const handleNetworkFeeTooltipClickedEvent = () => {
    trackTooltipClickedEvent({
      location,
      tooltip: CONFIRMATION_TOOLTIP_TYPES.NETWORK_FEE,
    });
  };

  return (
    <View style={styles.container}>
      <InfoSection>
        <InfoRow
          label={strings('transactions.network_fee')}
          tooltip={strings('transactions.network_fee_tooltip')}
          onTooltipPress={handleNetworkFeeTooltipClickedEvent}
        >
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
