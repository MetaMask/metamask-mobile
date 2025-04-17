import React, { useEffect } from 'react';
import { strings } from '../../../../../../../../locales/i18n';
import { UnstakeConfirmationViewProps } from '../../../../../../UI/Stake/Views/UnstakeConfirmationView/UnstakeConfirmationView.types';
import { EVENT_PROVIDERS } from '../../../../../../UI/Stake/constants/events';
import useClearConfirmationOnBackSwipe from '../../../../hooks/ui/useClearConfirmationOnBackSwipe';
import { useConfirmationMetricEvents } from '../../../../hooks/metrics/useConfirmationMetricEvents';
import useNavbar from '../../../../hooks/ui/useNavbar';
import { useTokenValues } from '../../../../hooks/useTokenValues';
import InfoSection from '../../../../components/UI/info-row/info-section';
import StakingContractInteractionDetails from '../../components/staking-contract-interaction-details/staking-contract-interaction-details';
import TokenHero from '../../../../components/rows/transactions/token-hero';
import UnstakingTimeSection from '../../components/unstaking-time/unstaking-time';
import GasFeesDetails from '../../../../components/rows/transactions/gas-fee-details';

const StakingWithdrawal = ({ route }: UnstakeConfirmationViewProps) => {
  const amountWei = route?.params?.amountWei;

  useNavbar(strings('stake.unstake'));
  useClearConfirmationOnBackSwipe();

  const { trackPageViewedEvent, setConfirmationMetric } =
    useConfirmationMetricEvents();
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
      <TokenHero amountWei={amountWei} />
      <UnstakingTimeSection />
      <InfoSection>
        <StakingContractInteractionDetails />
      </InfoSection>
      <GasFeesDetails />
    </>
  );
};
export default StakingWithdrawal;
