import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { strings } from '../../../../../../../../locales/i18n';
import { UnstakeConfirmationViewProps } from '../../../../../../UI/Stake/Views/UnstakeConfirmationView/UnstakeConfirmationView.types';
import { EVENT_PROVIDERS } from '../../../../../../UI/Stake/constants/events';
import { useConfirmActions } from '../../../../hooks/useConfirmActions';
import { useTokenValues } from '../../../../hooks/useTokenValues';
import InfoSection from '../../../UI/InfoRow/InfoSection';
import { useConfirmationMetricEvents } from '../../../../hooks/useConfirmationMetricEvents';
import { getNavbar } from '../../Navbar/Navbar';
import StakingContractInteractionDetails from '../../StakingContractInteractionDetails/StakingContractInteractionDetails';
import TokenHero from '../../TokenHero';
import UnstakingTimeSection from '../../UnstakingTime/UnstakingTime';
import GasFeesDetails from '../GasFeesDetails';

const StakingWithdrawal = ({ route }: UnstakeConfirmationViewProps) => {
  const amountWei = route?.params?.amountWei;

  const navigation = useNavigation();
  const { onReject } = useConfirmActions();
  const { trackPageViewedEvent, setTransactionMetrics } =
    useConfirmationMetricEvents();
  const { tokenAmountDisplayValue } = useTokenValues({ amountWei });


  useEffect(() => {
    navigation.setOptions(
      getNavbar({
        title: strings('stake.unstake'),
        onReject,
      }),
    );
  }, [navigation, onReject]);

  useEffect(trackPageViewedEvent, [trackPageViewedEvent]);

  useEffect(() => {
    setTransactionMetrics({
      properties: {
        selected_provider: EVENT_PROVIDERS.CONSENSYS,
        transaction_amount_eth: tokenAmountDisplayValue,
      },
    });
  }, [amountWei, setTransactionMetrics]);

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
