import React, { useEffect } from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../../component-library/hooks/useStyles';
import { UnstakeConfirmationViewProps } from '../../../../../../UI/Stake/Views/UnstakeConfirmationView/UnstakeConfirmationView.types';
import { EVENT_PROVIDERS } from '../../../../../../UI/Stake/constants/events';
import useClearConfirmationOnBackSwipe from '../../../../hooks/useClearConfirmationOnBackSwipe';
import { useConfirmationMetricEvents } from '../../../../hooks/useConfirmationMetricEvents';
import useNavbar from '../../../../hooks/useNavbar';
import { useTokenValues } from '../../../../hooks/useTokenValues';
import InfoSection from '../../../UI/InfoRow/InfoSection';
import StakingContractInteractionDetails from '../../StakingContractInteractionDetails/StakingContractInteractionDetails';
import TokenHero from '../../TokenHero';
import UnstakingTimeSection from '../../UnstakingTime/UnstakingTime';
import GasFeesDetails from '../GasFeesDetails';
import styleSheet from './StakingWithdrawal.styles';

const StakingWithdrawal = ({ route }: UnstakeConfirmationViewProps) => {
  const { styles } = useStyles(styleSheet, {});
  const amountWei = route?.params?.amountWei;
  
  useNavbar(strings('stake.unstake'));
  useClearConfirmationOnBackSwipe();

  const { trackPageViewedEvent, setConfirmationMetric } =
    useConfirmationMetricEvents();
  const { tokenAmountDisplayValue } = useTokenValues({ amountWei });  
  useEffect(() => {
    setConfirmationMetric({
      properties: {
        selected_provider: EVENT_PROVIDERS.CONSENSYS,
        transaction_amount_eth: tokenAmountDisplayValue,
      },
    });
  }, [tokenAmountDisplayValue, setConfirmationMetric]);

  useEffect(trackPageViewedEvent, [trackPageViewedEvent]);
  
  return (
    <>
      <TokenHero amountWei={amountWei} />
      <UnstakingTimeSection />
      <View style={styles.stakingContractInteractionDetailsContainer}>
        <InfoSection>
          <StakingContractInteractionDetails />
        </InfoSection>
      </View>
      <GasFeesDetails />
    </>
  );
};
export default StakingWithdrawal;
