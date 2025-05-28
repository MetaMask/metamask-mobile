import { TransactionMeta } from '@metamask/transaction-controller';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import { SimulationDetails } from '../../../../../UI/SimulationDetails/SimulationDetails';
import useClearConfirmationOnBackSwipe from '../../../hooks/ui/useClearConfirmationOnBackSwipe';
import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import { useIsNft } from '../../../hooks/nft/useIsNft';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import useNavbar from '../../../hooks/ui/useNavbar';
import { useMaxValueRefresher } from '../../../hooks/useMaxValueRefresher';
import FromTo from '../../rows/transactions/from-to';
import GasFeesDetails from '../../rows/transactions/gas-fee-details';
import AdvancedDetailsRow from '../../rows/transactions/advanced-details-row/advanced-details-row';
import TokenHero from '../../rows/transactions/token-hero';
import NetworkRow from '../../rows/transactions/network-row';
import styleSheet from './transfer.styles';
import { HeroNft } from '../../hero/nft/nft';

const Transfer = () => {
  const transactionMetadata = useTransactionMetadataRequest();
  const { styles } = useStyles(styleSheet, {});
  const { trackPageViewedEvent } = useConfirmationMetricEvents();

  useClearConfirmationOnBackSwipe();
  useNavbar(strings('confirm.review'));
  useMaxValueRefresher();
  useEffect(trackPageViewedEvent, [trackPageViewedEvent]);

  const { isNft } = useIsNft();

  return (
    <View>
      {isNft ? (
        <HeroNft />
      ) : (
        <TokenHero />
      )}
      <FromTo />
      <NetworkRow />
      <View style={styles.simulationsDetailsContainer}>
        <SimulationDetails
          transaction={transactionMetadata as TransactionMeta}
          enableMetrics
          isTransactionsRedesign
        />
      </View>
      <GasFeesDetails />
      <AdvancedDetailsRow />
    </View>
  );
};

export default Transfer;
