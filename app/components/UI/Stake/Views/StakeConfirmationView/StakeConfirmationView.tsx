import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../../hooks/useStyles';
import { getStakeConfirmationNavbar } from '../../../Navbar';
import styleSheet from './StakeConfirmationView.styles';
import AmountHeader from '../../components/StakingReview/AmountHeader/AmountHeader';
import AccountHeaderCard from '../../components/StakingReview/AccountHeaderCard/AccountHeaderCard';
import EstimatedGasCard from '../../components/StakingReview/EstimatedGasCard/EstimatedGasCard';
import RewardsCard from '../../components/StakingReview/RewardsCard/RewardsCard';
import ConfirmationFooter from '../../components/StakingReview/ConfirmationFooter/ConfirmationFooter';
import {
  MOCK_REWARD_DATA,
  MOCK_STAKING_CONTRACT,
  MOCK_STAKING_REVIEW_DATA,
} from './StakeConfirmationMockData';
import { StakeConfirmationViewProps } from './StakeConfirmationView.types';

const StakeConfirmationView = ({ route }: StakeConfirmationViewProps) => {
  const navigation = useNavigation();

  const { styles, theme } = useStyles(styleSheet, {});

  useEffect(() => {
    navigation.setOptions(getStakeConfirmationNavbar(navigation, theme.colors));
  }, [navigation, theme.colors]);

  return (
    <View style={styles.mainContainer}>
      <View>
        <AmountHeader
          wei={route.params.wei}
          fiat={`$${route.params.fiat}`}
          tokenSymbol="wETH"
        />
        <View style={styles.cardsContainer}>
          <AccountHeaderCard recipient={MOCK_STAKING_CONTRACT} />
          <EstimatedGasCard
            gasCostEth={MOCK_STAKING_REVIEW_DATA.GAS_COST.ETH}
            gasCostFiat={MOCK_STAKING_REVIEW_DATA.GAS_COST.FIAT}
          />
          <RewardsCard
            rewardRate={MOCK_REWARD_DATA.REWARD_RATE}
            rewardsEth={MOCK_REWARD_DATA.REWARDS.ETH}
            rewardsFiat={MOCK_REWARD_DATA.REWARDS.FIAT}
          />
        </View>
      </View>
      <ConfirmationFooter />
    </View>
  );
};

export default StakeConfirmationView;
