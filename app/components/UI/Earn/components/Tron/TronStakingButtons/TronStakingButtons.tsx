import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenI } from '../../../../Tokens/types';
import { TronStakingButtonsTestIds } from './TronStakingButtons.testIds';
import { strings } from '../../../../../../../locales/i18n';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { EVENT_LOCATIONS } from '../../../../../UI/Stake/constants/events';
import { trace, TraceName } from '../../../../../../util/trace';
import { RootState } from '../../../../../../reducers';
import { selectAsset } from '../../../../../../selectors/assets/assets-list';
import useStakingEligibility from '../../../../Stake/hooks/useStakingEligibility';

interface TronStakingButtonsProps {
  asset: TokenI;
}

const TronStakingButtons = ({ asset }: TronStakingButtonsProps) => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { isEligible } = useStakingEligibility();

  const isStakedTrx =
    asset?.isStaked || asset?.symbol === 'sTRX' || asset?.ticker === 'sTRX';

  const unstakedTrxAsset = useSelector((state: RootState) =>
    isStakedTrx && asset?.address && asset?.chainId
      ? selectAsset(state, {
          address: asset.address,
          chainId: asset.chainId,
          isStaked: false,
        })
      : undefined,
  );

  const baseAssetForStake = React.useMemo(
    () =>
      !isStakedTrx ? asset : (unstakedTrxAsset ?? asset.nativeAsset ?? asset),
    [asset, isStakedTrx, unstakedTrxAsset],
  );

  const onStakePress = () => {
    trace({ name: TraceName.EarnDepositScreen });
    navigation.navigate('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: { token: baseAssetForStake },
    });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.STAKE_BUTTON_CLICKED)
        .addProperties({
          location: EVENT_LOCATIONS.HOME_SCREEN,
          text: 'Stake',
          token: asset.symbol,
        })
        .build(),
    );
  };

  const onUnstakePress = () => {
    trace({ name: TraceName.EarnWithdrawScreen });
    navigation.navigate('StakeScreens', {
      screen: Routes.STAKING.UNSTAKE,
      params: { token: asset },
    });
  };

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      justifyContent={BoxJustifyContent.Between}
      gap={4}
    >
      <Button
        testID={TronStakingButtonsTestIds.UNSTAKE_BUTTON}
        variant={ButtonVariant.Secondary}
        twClassName="flex-1"
        onPress={onUnstakePress}
      >
        {strings('stake.unstake')}
      </Button>
      {isEligible && (
        <Button
          testID={TronStakingButtonsTestIds.STAKE_MORE_BUTTON}
          variant={ButtonVariant.Secondary}
          twClassName="flex-1"
          onPress={onStakePress}
        >
          {strings('stake.stake_more')}
        </Button>
      )}
    </Box>
  );
};

export default TronStakingButtons;
