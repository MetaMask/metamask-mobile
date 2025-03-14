import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { strings } from '../../../../../../../../locales/i18n';
import { UnstakeConfirmationViewProps } from '../../../../../../UI/Stake/Views/UnstakeConfirmationView/UnstakeConfirmationView.types';
import { useConfirmActions } from '../../../../hooks/useConfirmActions';
import InfoSection from '../../../UI/InfoRow/InfoSection';
import { useConfirmationMetricEvents } from '../../../../hooks/useConfirmationMetricEvents';
import { getNavbar } from '../../Navbar/Navbar';
import StakingContractInteractionDetails from '../../StakingContractInteractionDetails/StakingContractInteractionDetails';
import TokenHero from '../../TokenHero';
import UnstakingTimeSection from '../../UnstakingTime/UnstakingTime';
import GasFeesDetails from '../GasFeesDetails';

const StakingWithdrawal = ({ route }: UnstakeConfirmationViewProps) => {
  const navigation = useNavigation();
  const { onReject } = useConfirmActions();
  const { trackPageViewedEvent } = useConfirmationMetricEvents();

  useEffect(() => {
    navigation.setOptions(
      getNavbar({
        title: strings('stake.unstake'),
        onReject,
      }),
    );
  }, [navigation, onReject]);

  useEffect(trackPageViewedEvent, [trackPageViewedEvent]);

  return (
    <>
      <TokenHero amountWei={route?.params?.amountWei} />
      <UnstakingTimeSection />
      <InfoSection>
        <StakingContractInteractionDetails />
      </InfoSection>
      <GasFeesDetails />
    </>
  );
};
export default StakingWithdrawal;
