// Third party dependencies.
import React, { useCallback, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import AppConstants from '../../../core/AppConstants';
import { selectChainId } from '../../../selectors/networkController';
import { isSwapsAllowed } from '../../../components/UI/Swaps/utils';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { IconName } from '@metamask/design-system-react-native';
import ActionListItem from '../../../component-library/components-temp/ActionListItem';
import { useStyles } from '../../../component-library/hooks';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { getDecimalChainId } from '../../../util/networks';
import { WalletActionsBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletActionsBottomSheet.selectors';

// Internal dependencies
import styleSheet from './WalletActions.styles';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { selectCanSignTransactions } from '../../../selectors/accountsController';
import { EVENT_LOCATIONS as STAKE_EVENT_LOCATIONS } from '../../UI/Stake/constants/events';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../UI/Earn/selectors/featureFlags';
import { selectPerpsEnabledFlag } from '../../UI/Perps';
import { selectPredictEnabledFlag } from '../../UI/Predict/selectors/featureFlags';
import { EARN_INPUT_VIEW_ACTIONS } from '../../UI/Earn/Views/EarnInputView/EarnInputView.types';
import { earnSelectors } from '../../../selectors/earnController/earn';
import {
  useSwapBridgeNavigation,
  SwapBridgeNavigationLocation,
} from '../../UI/Bridge/hooks/useSwapBridgeNavigation';
import { RootState } from '../../../reducers';
import { selectIsSwapsLive } from '../../../core/redux/slices/bridge';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { selectIsFirstTimePerpsUser } from '../../UI/Perps/selectors/perpsController';

const WalletActions = () => {
  const { styles } = useStyles(styleSheet, {});
  const sheetRef = useRef<BottomSheetRef>(null);
  const { navigate } = useNavigation();
  const isPooledStakingEnabled = useSelector(selectPooledStakingEnabledFlag);
  const { earnTokens } = useSelector(earnSelectors.selectEarnTokens);

  const isFirstTimePerpsUser = useSelector(selectIsFirstTimePerpsUser);
  const chainId = useSelector(selectChainId);
  const swapsIsLive = useSelector((state: RootState) =>
    selectIsSwapsLive(state, chainId),
  );
  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const { trackEvent, createEventBuilder } = useMetrics();
  const canSignTransactions = useSelector(selectCanSignTransactions);
  const { goToSwaps: goToSwapsBase } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.TabBar,
    sourcePage: 'MainView',
  });

  const closeBottomSheetAndNavigate = useCallback(
    (navigateFunc: () => void) => {
      sheetRef.current?.onCloseBottomSheet(navigateFunc);
    },
    [],
  );

  const onEarn = useCallback(async () => {
    closeBottomSheetAndNavigate(() => {
      navigate('StakeModals', {
        screen: Routes.STAKING.MODALS.EARN_TOKEN_LIST,
        params: {
          tokenFilter: {
            includeNativeTokens: true,
            includeStakingTokens: false,
            includeLendingTokens: true,
            includeReceiptTokens: false,
          },
          onItemPressScreen: EARN_INPUT_VIEW_ACTIONS.DEPOSIT,
        },
      });
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.EARN_BUTTON_CLICKED)
        .addProperties({
          text: 'Earn',
          location: STAKE_EVENT_LOCATIONS.WALLET_ACTIONS_BOTTOM_SHEET,
          chain_id_destination: getDecimalChainId(chainId),
        })
        .build(),
    );
  }, [
    closeBottomSheetAndNavigate,
    navigate,
    chainId,
    createEventBuilder,
    trackEvent,
  ]);

  const goToSwaps = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      goToSwapsBase();
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.SWAP_BUTTON_CLICKED)
        .addProperties({
          text: 'Swap',
          tokenSymbol: '',
          location: 'TabBar',
          chain_id: getDecimalChainId(chainId),
        })
        .build(),
    );
  }, [
    closeBottomSheetAndNavigate,
    goToSwapsBase,
    trackEvent,
    chainId,
    createEventBuilder,
  ]);

  const onPerps = useCallback(() => {
    let params: Record<string, string> | null = null;
    if (isFirstTimePerpsUser) {
      params = {
        screen: Routes.PERPS.TUTORIAL,
      };
    } else {
      params = {
        screen: Routes.PERPS.MARKETS,
      };
    }
    closeBottomSheetAndNavigate(() => {
      navigate(Routes.PERPS.ROOT, params);
    });
  }, [closeBottomSheetAndNavigate, navigate, isFirstTimePerpsUser]);

  const onPredict = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      navigate(Routes.WALLET.HOME, {
        screen: Routes.WALLET.TAB_STACK_FLOW,
        params: {
          screen: Routes.PREDICT.ROOT,
          params: {
            screen: Routes.PREDICT.MARKET_LIST,
          },
        },
      });
    });
  }, [closeBottomSheetAndNavigate, navigate]);

  const isEarnWalletActionEnabled = useMemo(() => {
    if (
      !isStablecoinLendingEnabled ||
      (earnTokens.length <= 1 &&
        earnTokens[0]?.isETH &&
        !isPooledStakingEnabled)
    ) {
      return false;
    }
    return true;
  }, [isStablecoinLendingEnabled, earnTokens, isPooledStakingEnabled]);
  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.actionsContainer}>
        {AppConstants.SWAPS.ACTIVE && isSwapsAllowed(chainId) && (
          <ActionListItem
            label={strings('asset_overview.swap')}
            description={strings('asset_overview.swap_description')}
            iconName={IconName.SwapVertical}
            onPress={goToSwaps}
            testID={WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON}
            isDisabled={!canSignTransactions || !swapsIsLive}
          />
        )}

        {isPerpsEnabled && isEvmSelected && (
          <ActionListItem
            label={strings('asset_overview.perps_button')}
            description={strings('asset_overview.perps_description')}
            iconName={IconName.Candlestick}
            onPress={onPerps}
            testID={WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON}
            isDisabled={!canSignTransactions}
          />
        )}

        {isEarnWalletActionEnabled && (
          <ActionListItem
            label={strings('asset_overview.earn_button')}
            description={strings('asset_overview.earn_description')}
            iconName={IconName.Stake}
            onPress={onEarn}
            testID={WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON}
            isDisabled={!canSignTransactions}
          />
        )}

        {isPredictEnabled && (
          <ActionListItem
            label={strings('asset_overview.predict_button')}
            description={strings('asset_overview.predict_description')}
            iconName={IconName.Speedometer}
            onPress={onPredict}
            testID={WalletActionsBottomSheetSelectorsIDs.PREDICT_BUTTON}
            isDisabled={!canSignTransactions}
          />
        )}
      </View>
    </BottomSheet>
  );
};

export default WalletActions;
