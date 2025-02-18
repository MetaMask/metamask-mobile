import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

import { strings } from '../../../../../../../../locales/i18n';
import { useConfirmActions } from '../../../../hooks/useConfirmActions';
import TokenHero from '../../TokenHero';
import GasFeesDetails from '../GasFeesDetails';
import { getStakingDepositNavbar } from './Navbar';

const StakingDeposit = () => {
  const navigation = useNavigation();
  const { onReject } = useConfirmActions();
  const title = strings('stake.stake');

  useEffect(() => {
    navigation.setOptions(getStakingDepositNavbar({ title, onReject }));
  }, [navigation, onReject, title]);

  return (
    <>
      <TokenHero />
      <GasFeesDetails />
    </>
  );
};
export default StakingDeposit;
