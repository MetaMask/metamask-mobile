import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { strings } from '../../../../../../../../locales/i18n';
import { useConfirmationMetricEvents } from '../../../../hooks/useConfirmationMetricEvents';
import { useConfirmActions } from '../../../../hooks/useConfirmActions';
import InfoSectionAccordion from '../../../UI/InfoSectionAccordion';
import { getNavbar } from '../../Navbar/Navbar';
import StakingContractInteractionDetails from '../../StakingContractInteractionDetails/StakingContractInteractionDetails';
import StakingDetails from '../../StakingDetails/StakingDetails';
import TokenHero from '../../TokenHero';
import GasFeesDetails from '../GasFeesDetails';

const StakingDeposit = () => {
  const navigation = useNavigation();
  const { onReject } = useConfirmActions();
  const { trackAdvancedDetailsToggledEvent, trackPageViewedEvent } =
    useConfirmationMetricEvents();

  useEffect(() => {
    navigation.setOptions(
      getNavbar({
        title: strings('stake.stake'),
        onReject,
      }),
    );
  }, [navigation, onReject]);

  useEffect(trackPageViewedEvent, [trackPageViewedEvent]);

  const handleAdvancedDetailsToggledEvent = (isExpanded: boolean) => {
    trackAdvancedDetailsToggledEvent({ isExpanded });
  };

  return (
    <>
      <TokenHero />
      <StakingDetails />
      <GasFeesDetails />
      <InfoSectionAccordion
        onStateChange={handleAdvancedDetailsToggledEvent}
        header={strings('stake.advanced_details')}
      >
        <StakingContractInteractionDetails />
      </InfoSectionAccordion>
    </>
  );
};
export default StakingDeposit;
