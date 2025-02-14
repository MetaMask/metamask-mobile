import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

import { strings } from '../../../../../../../../locales/i18n';
import { useConfirmActions } from '../../../../hooks/useConfirmActions';
import StakingDetails from '../../StakingDetails';
import TokenHero from '../../TokenHero';
import { getStakingDepositNavbar } from './Navbar';

const StakingDeposit = () => {
  const navigation = useNavigation();
  const { onReject } = useConfirmActions();
  const title = strings('stake.stake');

  useEffect(() => {
    navigation.setOptions(getStakingDepositNavbar({ title, onReject }));
  }, [navigation, title]);

  return (
    <>
      <TokenHero />
      <StakingDetails />
    </>
  );
};
export default StakingDeposit;
