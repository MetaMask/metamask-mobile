import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { strings } from '../../../../../../../../locales/i18n';
import { UnstakeConfirmationViewProps } from '../../../../../../UI/Stake/Views/UnstakeConfirmationView/UnstakeConfirmationView.types';
import { useConfirmActions } from '../../../../hooks/useConfirmActions';
import AdvancedDetails from '../../AdvancedDetails/AdvancedDetails';
import { getNavbar } from '../../Navbar/Navbar';
import StakingDetails from '../../StakingDetails';
import TokenHero from '../../TokenHero';
import GasFeesDetails from '../GasFeesDetails';

const StakingWithdrawal = ({ route }: UnstakeConfirmationViewProps) => {
  const navigation = useNavigation();
  const { onReject } = useConfirmActions();

  useEffect(() => {
    navigation.setOptions(
      getNavbar({
        title: strings('stake.unstake'),
        onReject,
      }),
    );
  }, [navigation, onReject]);

  return (
    <>
      <TokenHero amountWei={route?.params?.amountWei} />
      <StakingDetails />
      <GasFeesDetails />
      <AdvancedDetails />
    </>
  );
};
export default StakingWithdrawal;
