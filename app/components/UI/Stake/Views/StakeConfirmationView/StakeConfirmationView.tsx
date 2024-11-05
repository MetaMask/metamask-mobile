import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../../hooks/useStyles';
import { getStakingNavbar } from '../../../Navbar';
import styleSheet from './StakeConfirmationView.styles';
import TokenValueStack from '../../components/StakingConfirmation/TokenValueStack/TokenValueStack';
import AccountCard from '../../components/StakingConfirmation/AccountCard/AccountCard';
import RewardsCard from '../../components/StakingConfirmation/RewardsCard/RewardsCard';
import ConfirmationFooter from '../../components/StakingConfirmation/ConfirmationFooter/ConfirmationFooter';
import { StakeConfirmationViewProps } from './StakeConfirmationView.types';
import { strings } from '../../../../../../locales/i18n';
import { FooterButtonGroupActions } from '../../components/StakingConfirmation/ConfirmationFooter/FooterButtonGroup/FooterButtonGroup.types';
import UnstakingTimeCard from '../../components/StakingConfirmation/UnstakeTimeCard/UnstakeTimeCard';

const MOCK_STAKING_CONTRACT_NAME = 'MM Pooled Staking';

const StakeConfirmationView = ({ route }: StakeConfirmationViewProps) => {
  const navigation = useNavigation();

  const { styles, theme } = useStyles(styleSheet, {});

  useEffect(() => {
    navigation.setOptions(
      getStakingNavbar(strings('stake.stake'), navigation, theme.colors, {
        backgroundColor: theme.colors.background.alternative,
        hasCancelButton: false,
      }),
    );
  }, [navigation, theme.colors]);

  return (
    <View style={styles.mainContainer}>
      <View>
        <TokenValueStack
          amountWei={route.params.amountWei}
          amountFiat={`$${route.params.amountFiat}`}
          tokenSymbol="ETH"
        />
        <View style={styles.cardsContainer}>
          <AccountCard
            contractName={MOCK_STAKING_CONTRACT_NAME}
            primaryLabel={strings('stake.staking_from')}
            secondaryLabel={strings('stake.interacting_with')}
          />
          <RewardsCard
            rewardRate={route.params.annualRewardRate}
            rewardsEth={route.params.annualRewardsETH}
            rewardsFiat={route.params.annualRewardsFiat}
          />
          <UnstakingTimeCard />
        </View>
      </View>
      <ConfirmationFooter
        valueWei={route.params.amountWei}
        action={FooterButtonGroupActions.STAKE}
      />
    </View>
  );
};

export default StakeConfirmationView;
