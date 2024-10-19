import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../../hooks/useStyles';
import { getStakingNavbar } from '../../../Navbar';
import styleSheet from './StakeConfirmationView.styles';
import TokenValueStack from '../../components/StakingConfirmation/TokenValueStack/TokenValueStack';
import AccountHeaderCard from '../../components/StakingConfirmation/AccountHeaderCard/AccountHeaderCard';
import RewardsCard from '../../components/StakingConfirmation/RewardsCard/RewardsCard';
import ConfirmationFooter from '../../components/StakingConfirmation/ConfirmationFooter/ConfirmationFooter';
import { StakeConfirmationViewProps } from './StakeConfirmationView.types';
import { MOCK_GET_VAULT_RESPONSE } from '../../__mocks__/mockData';
import { strings } from '../../../../../../locales/i18n';

const MOCK_REWARD_DATA = {
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
        <TokenValueStack
          amountWei={route.params.amountWei}
          amountFiat={`$${route.params.amountFiat}`}
          tokenSymbol="ETH"
        />
        <View style={styles.cardsContainer}>
          <AccountHeaderCard contractName={MOCK_STAKING_CONTRACT_NAME} />
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
