import { toHex } from '@metamask/controller-utils';
import type { Hex } from '@metamask/utils';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import type { RootState } from '../../../../reducers';
import { selectNetworkConfigurationByChainId } from '../../../../selectors/networkController';
import { trace, TraceName } from '../../../../util/trace';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { EVENT_LOCATIONS } from '../constants/events/earnEvents';
import type { TokenI } from '../../Tokens/types';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';

interface UseStablecoinLendingRedirectParams {
  asset?: TokenI;
  location?: (typeof EVENT_LOCATIONS)[keyof typeof EVENT_LOCATIONS];
  onNavigate?: (asset: TokenI) => void;
}

export const useStablecoinLendingRedirect = ({
  asset,
  location = EVENT_LOCATIONS.HOME_SCREEN,
  onNavigate,
}: UseStablecoinLendingRedirectParams) => {
  const { trackEvent, createEventBuilder } = useMetrics();

  const network = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, asset?.chainId as Hex),
  );

  const navigation = useNavigation();

  const navigateToStakeScreen = useCallback(
    (token: TokenI) => {
      if (onNavigate) {
        onNavigate(token);
        return;
      }

      navigation.navigate('StakeScreens', {
        screen: Routes.STAKING.STAKE,
        params: {
          token,
        },
      });
    },
    [navigation, onNavigate],
  );

  const onPress = useCallback(async () => {
    if (!asset?.chainId) return;

    const networkClientId =
      Engine.context.NetworkController.findNetworkClientIdByChainId(
        toHex(asset.chainId),
      );

    if (!networkClientId) {
      console.error(
        `Stablecoin lending redirect failed: could not retrieve networkClientId for chainId: ${asset.chainId}`,
      );
      return;
    }

    trace({ name: TraceName.EarnDepositScreen });
    await Engine.context.NetworkController.setActiveNetwork(networkClientId);

    trackEvent(
      createEventBuilder(MetaMetricsEvents.EARN_BUTTON_CLICKED)
        .addProperties({
          action_type: 'deposit',
          location,
          network: network?.name,
          text: 'Earn',
          token: asset.symbol,
          experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
        })
        .build(),
    );

    navigateToStakeScreen(asset);
  }, [
    asset,
    createEventBuilder,
    location,
    navigateToStakeScreen,
    network?.name,
    trackEvent,
  ]);

  return onPress;
};
