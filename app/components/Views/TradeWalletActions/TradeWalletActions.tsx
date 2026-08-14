import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import React, { useCallback, useMemo, useRef } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useSelector } from 'react-redux';
import { useParams } from '../../../util/navigation/navUtils';

import {
  ActionListItem,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  IconName,
  Tag,
  TagSeverity,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { BatchSellMetricsLocation } from '@metamask/bridge-controller';
import { PerpsMode } from '@metamask/perps-controller';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletActionsBottomSheetSelectorsIDs } from '../WalletActions/WalletActionsBottomSheet.testIds';
import { strings } from '../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import { selectBatchSellEnabled } from '../../../selectors/featureFlagController/batchSell';
import Routes from '../../../constants/navigation/Routes';
import AppConstants from '../../../core/AppConstants';
import { selectIsSwapsEnabled } from '../../../core/redux/slices/bridge';
import { RootState } from '../../../reducers';
import {
  selectCanSignTransactions,
  selectSelectedInternalAccountAddress,
} from '../../../selectors/accountsController';
import { earnSelectors } from '../../../selectors/earnController';
import { selectChainId } from '../../../selectors/networkController';
import { isHardwareAccount } from '../../../util/address';
import { getDecimalChainId } from '../../../util/networks';
import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../../UI/Bridge/hooks/useSwapBridgeNavigation';
import { EARN_INPUT_VIEW_ACTIONS } from '../../UI/Earn/Views/EarnInputView/EarnInputView.types';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../UI/Earn/selectors/featureFlags';
import { selectPerpsEnabledFlag } from '../../UI/Perps';
import { selectPerpsProModeEnabledFlag } from '../../UI/Perps/selectors/featureFlags';
import { usePerpsMode } from '../../UI/Perps/hooks';
import {
  toPerpsNavigatorScreenParams,
  useGetPerpsHomeNavigationTarget,
} from '../../UI/Perps/utils/perpsModeSwitch';
import { openPerpsModeSelection } from '../../UI/Perps/utils/openPerpsModeSelection';
import { hasCompletedPerpsModeSelection } from '../../UI/Perps/utils/perpsModeSelectionStorage';
import { selectPredictEnabledFlag } from '../../UI/Predict';
import { PredictEventValues } from '../../UI/Predict/constants/eventNames';
import { EVENT_LOCATIONS as STAKE_EVENT_LOCATIONS } from '../../UI/Stake/constants/events';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { ActionLocation } from '../../../util/analytics/actionButtonTracking';
import { selectIsFirstTimePerpsUser } from '../../UI/Perps/selectors/perpsController';
import useStakingEligibility from '../../UI/Stake/hooks/useStakingEligibility';

const batchSellIconStyle = {
  transform: [{ rotate: '180deg' }],
} satisfies ViewStyle;

export interface TradeWalletActionsParams {
  onDismiss?: () => void;
}

function TradeWalletActions() {
  const { navigate } = useNavigation<AppNavigationProp>();
  const navigation = useNavigation<AppNavigationProp>();
  const { onDismiss } = useParams<TradeWalletActionsParams>();
  const sheetRef = useRef<BottomSheetRef>(null);
  const tw = useTailwind();
  const isFirstTimePerpsUser = useSelector(selectIsFirstTimePerpsUser);

  const chainId = useSelector(selectChainId);
  const isSwapsEnabled = useSelector((state: RootState) =>
    selectIsSwapsEnabled(state),
  );
  const isPooledStakingEnabled = useSelector(selectPooledStakingEnabledFlag);

  const { trackEvent, createEventBuilder } = useAnalytics();

  const { isEligible: isEarnEligible } = useStakingEligibility();

  const canSignTransactions = useSelector(selectCanSignTransactions);
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
  const isHardwareWallet = selectedAddress
    ? Boolean(isHardwareAccount(selectedAddress))
    : false;
  const isBatchSellEnabled = useSelector(selectBatchSellEnabled);
  const shouldRenderBatchSell =
    isBatchSellEnabled && AppConstants.SWAPS.ACTIVE && !isHardwareWallet;
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isPerpsProModeEnabled = useSelector(selectPerpsProModeEnabledFlag);
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);

  const { mode: perpsMode } = usePerpsMode();
  // Product default is Lite; only Pro gets the gold badge treatment.
  const perpsModeBadge =
    perpsMode === PerpsMode.Pro ? PerpsMode.Pro : PerpsMode.Lite;
  const getPerpsHomeNavigationTarget = useGetPerpsHomeNavigationTarget();

  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );
  const { earnTokens } = useSelector(earnSelectors.selectEarnTokens);

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

  const { goToSwaps: goToSwapsBase } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.MainView,
    sourcePage: 'MainView',
    swapButtonEventLocationOverride: ActionLocation.NAVBAR,
  });

  const handleSheetClose = useCallback(() => {
    onDismiss?.();
  }, [onDismiss]);

  const closeBottomSheetAndNavigate = useCallback(
    (navigateFunc: () => void | Promise<void>) => {
      sheetRef.current?.onCloseBottomSheet(() => {
        // Defer navigation until RootModalFlow is fully dismissed so screens
        // on MainNavigator (e.g. StakeModals) are not opened underneath it.
        requestAnimationFrame(() => {
          void navigateFunc();
        });
      });
    },
    [],
  );

  const goToSwaps = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      goToSwapsBase();
    });
  }, [closeBottomSheetAndNavigate, goToSwapsBase]);

  const onBatchSell = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      navigate(Routes.BRIDGE.ROOT, {
        screen: Routes.BRIDGE.BATCH_SELL_TOKEN_SELECT,
        params: {
          batchSellLocation: BatchSellMetricsLocation.TradeMenu,
        },
      });
    });
  }, [closeBottomSheetAndNavigate, navigate]);

  const onPerps = useCallback(() => {
    closeBottomSheetAndNavigate(async () => {
      if (isPerpsProModeEnabled) {
        const hasCompletedModeSelection =
          await hasCompletedPerpsModeSelection();
        if (!hasCompletedModeSelection) {
          openPerpsModeSelection(navigation, { entry: 'trade' });
          return;
        }
      }

      if (isFirstTimePerpsUser) {
        navigate(Routes.PERPS.TUTORIAL);
      } else {
        navigate(
          Routes.PERPS.ROOT,
          toPerpsNavigatorScreenParams(getPerpsHomeNavigationTarget()),
        );
      }
    });
  }, [
    closeBottomSheetAndNavigate,
    navigate,
    navigation,
    isFirstTimePerpsUser,
    isPerpsProModeEnabled,
    getPerpsHomeNavigationTarget,
  ]);

  const onPredict = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      navigate(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: {
          entryPoint: PredictEventValues.ENTRY_POINT.MAIN_TRADE_BUTTON,
        },
      });
    });
  }, [closeBottomSheetAndNavigate, navigate]);

  const onEarn = useCallback(() => {
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

      trackEvent(
        createEventBuilder(MetaMetricsEvents.EARN_BUTTON_CLICKED)
          .addProperties({
            text: 'Earn',
            location: STAKE_EVENT_LOCATIONS.WALLET_ACTIONS_BOTTOM_SHEET,
            chain_id_destination: getDecimalChainId(chainId),
          })
          .build(),
      );
    });
  }, [
    closeBottomSheetAndNavigate,
    navigate,
    trackEvent,
    createEventBuilder,
    chainId,
  ]);

  return (
    <BottomSheet ref={sheetRef} onClose={handleSheetClose}>
      <View
        testID={WalletActionsBottomSheetSelectorsIDs.MENU_CONTAINER}
        style={tw.style('w-full py-4')}
      >
        {shouldRenderBatchSell && (
          <ActionListItem
            label={
              <View style={tw.style('flex-row items-center gap-2')}>
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  {strings('asset_overview.batch_sell')}
                </Text>
                <Tag severity={TagSeverity.Info}>
                  {strings('asset_overview.batch_sell_new_label')}
                </Tag>
              </View>
            }
            description={strings('asset_overview.batch_sell_description')}
            iconName={IconName.Merge}
            iconProps={{
              style: batchSellIconStyle,
            }}
            onPress={onBatchSell}
            testID={WalletActionsBottomSheetSelectorsIDs.BATCH_SELL_BUTTON}
            isDisabled={!isSwapsEnabled}
          />
        )}
        {AppConstants.SWAPS.ACTIVE && (
          <ActionListItem
            label={strings('asset_overview.swap')}
            description={strings('asset_overview.swap_description')}
            iconName={IconName.SwapVertical}
            onPress={goToSwaps}
            testID={WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON}
            isDisabled={!isSwapsEnabled}
          />
        )}
        {isPerpsEnabled && (
          <ActionListItem
            label={
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={2}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  {strings('asset_overview.perps_button')}
                </Text>
                {isPerpsProModeEnabled ? (
                  <Tag
                    severity={
                      perpsModeBadge === PerpsMode.Pro
                        ? TagSeverity.Warning
                        : TagSeverity.Neutral
                    }
                    testID={
                      WalletActionsBottomSheetSelectorsIDs.PERPS_MODE_BADGE
                    }
                  >
                    {strings(`perps.mode.${perpsModeBadge}`)}
                  </Tag>
                ) : null}
              </Box>
            }
            description={strings('asset_overview.perps_description')}
            iconName={IconName.Candlestick}
            onPress={onPerps}
            testID={WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON}
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
        {isEarnWalletActionEnabled && isEarnEligible && (
          <ActionListItem
            label={strings('asset_overview.earn_button')}
            description={strings('asset_overview.earn_description')}
            iconName={IconName.Stake}
            onPress={onEarn}
            testID={WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON}
            isDisabled={!canSignTransactions}
          />
        )}
      </View>
    </BottomSheet>
  );
}

export default TradeWalletActions;
