import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { strings } from '../../../../../../../../locales/i18n';
import { UnstakeConfirmationViewProps } from '../../../../../../UI/Stake/Views/UnstakeConfirmationView/UnstakeConfirmationView.types';
import { useConfirmActions } from '../../../../hooks/useConfirmActions';
import InfoSection from '../../../UI/InfoRow/InfoSection';
import ContractInteractionDetails from '../../ContractInteractionDetails/ContractInteractionDetails';
import { getNavbar } from '../../Navbar/Navbar';
import TokenHero from '../../TokenHero';
import UnstakingTimeSection from '../../UnstakingTime/UnstakingTime';
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
      <UnstakingTimeSection />
      <InfoSection>
        <ContractInteractionDetails />
      </InfoSection>
      <GasFeesDetails />
    </>
  );
};
export default StakingWithdrawal;
