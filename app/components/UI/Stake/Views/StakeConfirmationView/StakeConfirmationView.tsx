import React, { useCallback } from 'react';
import { View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './StakeConfirmationView.styles';
import TokenValueStack from '../../components/StakingConfirmation/TokenValueStack/TokenValueStack';
import AccountCard from '../../components/StakingConfirmation/AccountCard/AccountCard';
import RewardsCard from '../../components/StakingConfirmation/RewardsCard/RewardsCard';
import ConfirmationFooter from '../../components/StakingConfirmation/ConfirmationFooter/ConfirmationFooter';
import { StakeConfirmationViewRouteParams } from './StakeConfirmationView.types';
import { strings } from '../../../../../../locales/i18n';
import { FooterButtonGroupActions } from '../../components/StakingConfirmation/ConfirmationFooter/FooterButtonGroup/FooterButtonGroup.types';
import UnstakingTimeCard from '../../components/StakingConfirmation/UnstakeTimeCard/UnstakeTimeCard';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../constants/events';
import { getDecimalChainId } from '../../../../../util/networks';

const MOCK_STAKING_CONTRACT_NAME = 'MM Pooled Staking';

const StakeConfirmationView = () => {
  const navigation = useNavigation();
  const route =
    useRoute<
      RouteProp<{ params: StakeConfirmationViewRouteParams }, 'params'>
    >();

  const { styles } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useAnalytics();

  const handleBackPress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.STAKE_CONFIRMATION_BACK_CLICKED)
        .addProperties({
          selected_provider: EVENT_PROVIDERS.CONSENSYS,
          location: EVENT_LOCATIONS.STAKE_CONFIRMATION_VIEW,
        })
        .build(),
    );
    navigation.goBack();
  }, [navigation, trackEvent, createEventBuilder]);

  return (
    <Box twClassName="flex-1 bg-default">
      <HeaderStandard
        title={strings('stake.stake')}
        onBack={handleBackPress}
        includesTopInset
      />
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
    </Box>
  );
};

export default StakeConfirmationView;
