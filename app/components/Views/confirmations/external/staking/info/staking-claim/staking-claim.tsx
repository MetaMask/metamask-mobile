import { TransactionMeta } from '@metamask/transaction-controller';
import { RouteProp } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { View } from 'react-native';

import { strings } from '../../../../../../../../locales/i18n';
import SimulationDetails from '../../../../../../UI/SimulationDetails/SimulationDetails';
import { EVENT_PROVIDERS } from '../../../../../../UI/Stake/constants/events';
import useClearConfirmationOnBackSwipe from '../../../../hooks/ui/useClearConfirmationOnBackSwipe';
import { useConfirmationMetricEvents } from '../../../../hooks/metrics/useConfirmationMetricEvents';
import useNavbar from '../../../../hooks/ui/useNavbar';
import { useTokenAmount } from '../../../../hooks/useTokenAmount';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import InfoSection from '../../../../components/UI/info-row/info-section';
import StakingContractInteractionDetails from '../../components/staking-contract-interaction-details/staking-contract-interaction-details';
import { HeroRow } from '../../../../components/rows/transactions/hero-row';
import GasFeesDetailsRow from '../../../../components/rows/transactions/gas-fee-details-row';
import { ConfirmationInfoComponentIDs } from '../../../../constants/info-ids';
import useEndTraceOnMount from '../../../../../../hooks/useEndTraceOnMount';
import { TraceName } from '../../../../../../../util/trace';
import { useStakingTransactionTracing } from '../../../../../../UI/Stake/hooks/useStakingTransactionTracing';

const StakingClaim = ({
  route,
}: {
  route: RouteProp<{ params: { amountWei: string } }, 'params'>;
}) => {
  useNavbar(strings('stake.claim'), false);
  useClearConfirmationOnBackSwipe();
  const transactionMetadata = useTransactionMetadataRequest();

  const { trackPageViewedEvent, setConfirmationMetric } =
    useConfirmationMetricEvents();
  const amountWei = route?.params?.amountWei;
  const { amount } = useTokenAmount({ amountWei });

  useEffect(() => {
    if (amount === undefined) {
      return;
    }

    setConfirmationMetric({
      properties: {
        selected_provider: EVENT_PROVIDERS.CONSENSYS,
        transaction_amount_eth: amount,
      },
    });
  }, [amount, setConfirmationMetric]);

  useEffect(trackPageViewedEvent, [trackPageViewedEvent]);
  useEndTraceOnMount(TraceName.EarnClaimConfirmationScreen);
  useStakingTransactionTracing();

  return (
    <View testID={ConfirmationInfoComponentIDs.STAKING_CLAIM}>
      <HeroRow amountWei={route?.params?.amountWei} />
      <SimulationDetails
        transaction={transactionMetadata as TransactionMeta}
        enableMetrics={false}
        isTransactionsRedesign
      />
      <InfoSection>
        <StakingContractInteractionDetails />
      </InfoSection>
      <GasFeesDetailsRow disableUpdate />
    </View>
  );
};
export default StakingClaim;
