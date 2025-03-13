import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { strings } from '../../../../../../../../locales/i18n';
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

  useEffect(() => {
    navigation.setOptions(
      getNavbar({
        title: strings('stake.stake'),
        onReject,
      }),
    );
  }, [navigation, onReject]);

  return (
    <>
      <TokenHero />
      <StakingDetails />
      <GasFeesDetails />
      <InfoSectionAccordion header={strings('stake.advanced_details')}>
        <StakingContractInteractionDetails />
      </InfoSectionAccordion>
    </>
  );
};
export default StakingDeposit;
