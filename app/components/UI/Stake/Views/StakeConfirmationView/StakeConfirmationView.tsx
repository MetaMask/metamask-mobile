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
import { ScrollView } from 'react-native-gesture-handler';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../constants/events';
import { getDecimalChainId } from '../../../../../util/networks';

const MOCK_STAKING_CONTRACT_NAME = 'MM Pooled Staking';

const StakeConfirmationView = ({ route }: StakeConfirmationViewProps) => {
  const navigation = useNavigation();

  const { styles, theme } = useStyles(styleSheet, {});

  useEffect(() => {
    navigation.setOptions(
      getStakingNavbar(
        strings('stake.stake'),
        navigation,
        theme.colors,
        {
          backgroundColor: theme.colors.background.alternative,
          hasCancelButton: false,
        },
        {
          backButtonEvent: {
            event: MetaMetricsEvents.STAKE_CONFIRMATION_BACK_CLICKED,
            properties: {
              selected_provider: EVENT_PROVIDERS.CONSENSYS,
              location: EVENT_LOCATIONS.STAKE_CONFIRMATION_VIEW,
            },
          },
        },
      ),
    );
  }, [navigation, theme.colors]);

  return (
    <ScrollView contentContainerStyle={styles.mainContainer}>
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
            chainId={getDecimalChainId(route?.params?.chainId)}
          />
          <RewardsCard
            rewardRate={route.params.annualRewardRate}
            // @ts-expect-error - TODO: Handle when annualRewardsToken is not defined
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
    </ScrollView>
  );
};

export default StakeConfirmationView;
