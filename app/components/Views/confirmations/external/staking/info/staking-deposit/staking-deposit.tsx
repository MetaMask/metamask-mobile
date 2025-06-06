import React, { useEffect } from 'react';
import { strings } from '../../../../../../../../locales/i18n';
import { EVENT_PROVIDERS } from '../../../../../../UI/Stake/constants/events';
import useClearConfirmationOnBackSwipe from '../../../../hooks/ui/useClearConfirmationOnBackSwipe';
import { useConfirmationMetricEvents } from '../../../../hooks/metrics/useConfirmationMetricEvents';
import useNavbar from '../../../../hooks/ui/useNavbar';
import { useTokenAmount } from '../../../../hooks/useTokenAmount';
import InfoSectionAccordion from '../../../../components/UI/info-section-accordion';
import StakingContractInteractionDetails from '../../components/staking-contract-interaction-details/staking-contract-interaction-details';
import StakingDetails from '../../components/staking-details/staking-details';
import { HeroRow } from '../../../../components/rows/transactions/hero-row';
import GasFeesDetailsRow from '../../../../components/rows/transactions/gas-fee-details-row';

const StakingDeposit = () => {
  useNavbar(strings('stake.stake'));
  useClearConfirmationOnBackSwipe();

  const {
    trackAdvancedDetailsToggledEvent,
    trackPageViewedEvent,
    setConfirmationMetric,
  } = useConfirmationMetricEvents();
  const { amount } = useTokenAmount();
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
      <HeroRow />
      <StakingDetails />
      <GasFeesDetailsRow disableUpdate />
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
