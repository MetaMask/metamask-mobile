import React, { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../../../locales/i18n';
import AdvancedDetails from '../../AdvancedDetails/AdvancedDetails';
import StakingDetails from '../../StakingDetails';
import TokenHero from '../../TokenHero';
import GasFeesDetails from '../GasFeesDetails';
import { getStakingDepositNavbar } from './Navbar';

const StakingDeposit = () => {
  const navigation = useNavigation();

  const updateNavBar = useCallback(() => {
    navigation.setOptions(
      getStakingDepositNavbar({
        title: strings('stake.stake'),
        onReject: () => navigation.goBack(),
      }),
    );
  }, [navigation]);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  return (
    <>
      <TokenHero />
      <StakingDetails />
      <GasFeesDetails />
      <AdvancedDetails />
    </>
  );
};
export default StakingDeposit;
