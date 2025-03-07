import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { strings } from '../../../../../../../../locales/i18n';
import { EVENT_LOCATIONS as STAKING_EVENT_LOCATIONS } from '../../../../../../UI/Stake/constants/events';
import { useConfirmationMetricEvents } from '../../../../hooks/useConfirmationMetricEvents';
import { useConfirmActions } from '../../../../hooks/useConfirmActions';
import AdvancedDetails from '../../AdvancedDetails/AdvancedDetails';
import { getNavbar } from '../../Navbar/Navbar';
import StakingDetails from '../../StakingDetails';
import TokenHero from '../../TokenHero';
import GasFeesDetails from '../GasFeesDetails';

const StakingDeposit = () => {
  const navigation = useNavigation();
  const { onReject } = useConfirmActions();
  const { trackPageViewedEvent } = useConfirmationMetricEvents();

  useEffect(() => {
    navigation.setOptions(
      getNavbar({
        title: strings('stake.stake'),
        onReject,
      }),
    );
  }, [navigation, onReject]);

  useEffect(() => {
    trackPageViewedEvent({
      location: STAKING_EVENT_LOCATIONS.REDESIGNED_STAKE_CONFIRMATION_VIEW,
    });
  }, [trackPageViewedEvent]);

  return (
    <>
      <TokenHero />
      <StakingDetails />
      <GasFeesDetails
        location={STAKING_EVENT_LOCATIONS.REDESIGNED_STAKE_CONFIRMATION_VIEW}
      />
      <AdvancedDetails
        location={STAKING_EVENT_LOCATIONS.REDESIGNED_STAKE_CONFIRMATION_VIEW}
      />
    </>
  );
};
export default StakingDeposit;
