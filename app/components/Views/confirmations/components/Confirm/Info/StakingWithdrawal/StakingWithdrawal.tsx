import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect } from 'react';
import { strings } from '../../../../../../../../locales/i18n';
import { UnstakeConfirmationViewProps } from '../../../../../../UI/Stake/Views/UnstakeConfirmationView/UnstakeConfirmationView.types';
import { useConfirmActions } from '../../../../hooks/useConfirmActions';
import AdvancedDetails from '../../AdvancedDetails/AdvancedDetails';
import StakingDetails from '../../StakingDetails';
import TokenHero from '../../TokenHero';
import GasFeesDetails from '../GasFeesDetails';
import { getStakingNavbar } from '../Navbar/Navbar';

const StakingWithdrawal = ({ route }: UnstakeConfirmationViewProps) => {
  const navigation = useNavigation();
  const { onReject } = useConfirmActions();

  const updateNavBar = useCallback(() => {
    navigation.setOptions(
      getStakingNavbar({
        title: strings('stake.unstake'),
        onReject,
      }),
    );
  }, [navigation, onReject]);

  useEffect(updateNavBar, [updateNavBar]);

  return (
    <>
      <TokenHero amountWei={route.params.amountWei} />
      <StakingDetails />
      <GasFeesDetails />
      <AdvancedDetails />
    </>
  );
};
export default StakingWithdrawal;
