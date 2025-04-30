import { TransactionMeta } from '@metamask/transaction-controller';
import { RouteProp } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../../component-library/hooks/useStyles';
import SimulationDetails from '../../../../../../UI/SimulationDetails/SimulationDetails';
import { EVENT_PROVIDERS } from '../../../../../../UI/Stake/constants/events';
import useClearConfirmationOnBackSwipe from '../../../../hooks/ui/useClearConfirmationOnBackSwipe';
import { useConfirmationMetricEvents } from '../../../../hooks/metrics/useConfirmationMetricEvents';
import useNavbar from '../../../../hooks/ui/useNavbar';
import { useTokenValues } from '../../../../hooks/useTokenValues';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import InfoSection from '../../../../components/UI/info-row/info-section';
import StakingContractInteractionDetails from '../../components/staking-contract-interaction-details/staking-contract-interaction-details';
import TokenHero from '../../../../components/rows/transactions/token-hero';
import GasFeesDetails from '../../../../components/rows/transactions/gas-fee-details';
import styleSheet from './staking-claim.styles';

const StakingClaim = ({
  route,
}: {
  route: RouteProp<{ params: { amountWei: string } }, 'params'>;
}) => {
  const { styles } = useStyles(styleSheet, {});
  useNavbar(strings('stake.claim'), false);
  useClearConfirmationOnBackSwipe();
  const transactionMetadata = useTransactionMetadataRequest();

  const { trackPageViewedEvent, setConfirmationMetric } =
    useConfirmationMetricEvents();
  const amountWei = route?.params?.amountWei;
  const { tokenAmountDisplayValue } = useTokenValues({ amountWei });
  useEffect(() => {
    setConfirmationMetric({
      properties: {
        selected_provider: EVENT_PROVIDERS.CONSENSYS,
        transaction_amount_eth: tokenAmountDisplayValue,
      },
    });
  }, [tokenAmountDisplayValue, setConfirmationMetric]);

  useEffect(trackPageViewedEvent, [trackPageViewedEvent]);

  return (
    <>
      <TokenHero amountWei={route?.params?.amountWei} />
      <View style={styles.simulationsDetailsContainer}>
        <SimulationDetails
          transaction={transactionMetadata as TransactionMeta}
          enableMetrics={false}
          isTransactionsRedesign
        />
      </View>
      <InfoSection>
        <StakingContractInteractionDetails />
      </InfoSection>
      <GasFeesDetails />
    </>
  );
};
export default StakingClaim;
