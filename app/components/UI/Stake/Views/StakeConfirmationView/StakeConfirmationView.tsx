import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../../hooks/useStyles';
import { getStakingNavbar } from '../../../Navbar';
import styleSheet from './StakeConfirmationView.styles';
import AmountHeader from '../../components/StakingConfirmation/AmountHeader/AmountHeader';
import AccountHeaderCard from '../../components/StakingConfirmation/AccountHeaderCard/AccountHeaderCard';
import EstimatedGasCard from '../../components/StakingConfirmation/EstimatedGasCard/EstimatedGasCard';
import RewardsCard from '../../components/StakingConfirmation/RewardsCard/RewardsCard';
import ConfirmationFooter from '../../components/StakingConfirmation/ConfirmationFooter/ConfirmationFooter';
import { StakeConfirmationViewProps } from './StakeConfirmationView.types';
import { MOCK_GET_VAULT_RESPONSE } from '../../components/StakingBalance/mockData';
import { strings } from '../../../../../../locales/i18n';

const MOCK_STAKING_REVIEW_DATA = {
  GAS_COST: {
    ETH: '0.0884 ETH',
    FIAT: '$43.56',
  },
};

const MOCK_REWARD_DATA = {
  REWARD_RATE: '2.6%',
  REWARDS: {
    ETH: '0.13 ETH',
    FIAT: '$334.93',
  },
};

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
        <AmountHeader
          amountWei={route.params.amountWei}
          amountFiat={`$${route.params.amountFiat}`}
          tokenSymbol="wETH"
        />
        <View style={styles.cardsContainer}>
          <AccountHeaderCard contractName={MOCK_STAKING_CONTRACT_NAME} />
          <EstimatedGasCard
            gasCostEth={MOCK_STAKING_REVIEW_DATA.GAS_COST.ETH}
            gasCostFiat={MOCK_STAKING_REVIEW_DATA.GAS_COST.FIAT}
          />
          <RewardsCard
            rewardRate={MOCK_GET_VAULT_RESPONSE.apy}
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
