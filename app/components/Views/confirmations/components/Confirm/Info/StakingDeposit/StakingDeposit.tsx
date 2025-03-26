import React, { useEffect } from 'react';
import { strings } from '../../../../../../../../locales/i18n';
import { EVENT_PROVIDERS } from '../../../../../../UI/Stake/constants/events';
import useClearConfirmationOnBackSwipe from '../../../../hooks/useClearConfirmationOnBackSwipe';
import { useConfirmationMetricEvents } from '../../../../hooks/useConfirmationMetricEvents';
import useNavbar from '../../../../hooks/useNavbar';
import { useTokenValues } from '../../../../hooks/useTokenValues';
import InfoSectionAccordion from '../../../UI/InfoSectionAccordion';
import StakingContractInteractionDetails from '../../StakingContractInteractionDetails/StakingContractInteractionDetails';
import StakingDetails from '../../StakingDetails/StakingDetails';
import TokenHero from '../../TokenHero';
import GasFeesDetails from '../GasFeesDetails';

const StakingDeposit = () => {
  useNavbar(strings('stake.stake'));
  useClearConfirmationOnBackSwipe();

  const {
    trackAdvancedDetailsToggledEvent,
    trackPageViewedEvent,
    setConfirmationMetric,
  } = useConfirmationMetricEvents();
  const { tokenAmountDisplayValue } = useTokenValues();
  useEffect(() => {
    setConfirmationMetric({
      properties: {
        selected_provider: EVENT_PROVIDERS.CONSENSYS,
        transaction_amount_eth: tokenAmountDisplayValue,
      },
    });
  }, [tokenAmountDisplayValue, setConfirmationMetric]);

  useEffect(() => {
    trackPageViewedEvent();
    setConfirmationMetric({
      properties: {
        advanced_details_viewed: false,
      },
    });
  }, [trackPageViewedEvent, setConfirmationMetric]);

  const handleAdvancedDetailsToggledEvent = (isExpanded: boolean) => {
    trackAdvancedDetailsToggledEvent({ isExpanded });
    if (isExpanded) {
      setConfirmationMetric({
        properties: {
          advanced_details_viewed: true,
        },
      });
    }
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
