import React, { useEffect } from 'react';

import { strings } from '../../../../../../../../locales/i18n';
import { UnstakeConfirmationViewProps } from '../../../../../../UI/Stake/Views/UnstakeConfirmationView/UnstakeConfirmationView.types';
import { EVENT_PROVIDERS } from '../../../../../../UI/Stake/constants/events';
import { ConfirmationInfoComponentIDs } from '../../../../constants/info-ids';
import useClearConfirmationOnBackSwipe from '../../../../hooks/ui/useClearConfirmationOnBackSwipe';
import { useConfirmationMetricEvents } from '../../../../hooks/metrics/useConfirmationMetricEvents';
import useNavbar from '../../../../hooks/ui/useNavbar';
import { useTokenAmount } from '../../../../hooks/useTokenAmount';
import InfoSection from '../../../../components/UI/info-row/info-section';
import StakingContractInteractionDetails from '../../components/staking-contract-interaction-details/staking-contract-interaction-details';
import { HeroRow } from '../../../../components/rows/transactions/hero-row';
import UnstakingTimeSection from '../../components/unstaking-time/unstaking-time';
import GasFeesDetailsRow from '../../../../components/rows/transactions/gas-fee-details-row';
import useEndTraceOnMount from '../../../../../../hooks/useEndTraceOnMount';
import { TraceName } from '../../../../../../../util/trace';
import { useStakingTransactionTracing } from '../../../../../../UI/Stake/hooks/useStakingTransactionTracing';
import { ScrollView } from 'react-native-gesture-handler';

const StakingWithdrawal = ({ route }: UnstakeConfirmationViewProps) => {
  const amountWei = route?.params?.amountWei;

  useNavbar(strings('stake.unstake'));
  useClearConfirmationOnBackSwipe();

  const { trackPageViewedEvent, setConfirmationMetric } =
    useConfirmationMetricEvents();
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
  useEndTraceOnMount(TraceName.EarnWithdrawConfirmationScreen);
  useStakingTransactionTracing();

  return (
    <ScrollView testID={ConfirmationInfoComponentIDs.STAKING_WITHDRAWAL}>
      <HeroRow amountWei={amountWei} />
      <UnstakingTimeSection />
      <InfoSection>
        <StakingContractInteractionDetails />
      </InfoSection>
      <GasFeesDetailsRow disableUpdate />
    </ScrollView>
  );
};
export default StakingWithdrawal;
