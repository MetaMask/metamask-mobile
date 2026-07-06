import MaskedView from '@react-native-masked-view/masked-view';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  View,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
  runOnJS,
} from 'react-native-reanimated';
import Overlay from '../../../component-library/components/Overlay';
import { useParams } from '../../../util/navigation/navUtils';
import { Box } from '../../UI/Box/Box';

import {
  ActionListItem,
  FontWeight,
  IconName,
  Tag,
  TagSeverity,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  usePureBlack,
  useTailwind,
} from '@metamask/design-system-twrnc-preset';
import { BatchSellMetricsLocation } from '@metamask/bridge-controller';
import { useElevatedSurface } from '../../../util/theme/themeUtils';
import { useTheme } from '../../../util/theme';
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletActionsBottomSheetSelectorsIDs } from '../WalletActions/WalletActionsBottomSheet.testIds';
import { strings } from '../../../../locales/i18n';
import { AnimationDuration } from '../../../component-library/constants/animation.constants';
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
import { selectPredictEnabledFlag } from '../../UI/Predict';
import { PredictEventValues } from '../../UI/Predict/constants/eventNames';
import { EVENT_LOCATIONS as STAKE_EVENT_LOCATIONS } from '../../UI/Stake/constants/events';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { ActionLocation } from '../../../util/analytics/actionButtonTracking';

import BottomShape from './components/BottomShape';
import OverlayWithHole from './components/OverlayWithHole';
import TradeMenuOutline from './components/TradeMenuOutline';
import { selectIsFirstTimePerpsUser } from '../../UI/Perps/selectors/perpsController';
import useStakingEligibility from '../../UI/Stake/hooks/useStakingEligibility';

const bottomMaskHeight = 35;
const bottomShapePeakHeight = 16;
const bottomShapePeakBezierLength = 25;
const bottomShapeBaseBezierLength = 55;
const animationDuration = AnimationDuration.Fast;
const batchSellIconStyle = {
  transform: [{ rotate: '180deg' }],
} satisfies ViewStyle;

interface TradeWalletActionsParams {
  onDismiss?: () => void;
  buttonLayout: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

function TradeWalletActions() {
  const { navigate } = useNavigation();
  const { onDismiss, buttonLayout } = useParams<TradeWalletActionsParams>();
  const isFirstTimePerpsUser = useSelector(selectIsFirstTimePerpsUser);

  const postCallback = useRef<(() => void) | undefined>(undefined);
  const [visible, setIsVisible] = useState(true);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { height: screenHeight } = useSafeAreaFrame();
  const insets = useSafeAreaInsets();
  const insetsTop = Platform.OS === 'android' ? insets.top : 0;

  const tw = useTailwind();
  const { colors } = useTheme();
  const isPureBlack = usePureBlack();
  const surfaceClass = useElevatedSurface();
  const [menuLayout, setMenuLayout] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const chainId = useSelector(selectChainId);
  const isSwapsEnabled = useSelector((state: RootState) =>
    selectIsSwapsEnabled(state),
  );
  const isPooledStakingEnabled = useSelector(selectPooledStakingEnabledFlag);

  const { trackEvent, createEventBuilder } = useAnalytics();
  const navigation = useNavigation();

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
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);

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

  const dismissRootModalFlow = useCallback(() => {
    const parentNavigation = navigation.getParent();
    if (parentNavigation?.canGoBack()) {
      parentNavigation.goBack();
      return;
    }

    navigation.goBack();
  }, [navigation]);

  const handleNavigateBack = useCallback(() => {
    onDismiss?.();
    setIsVisible(false);
  }, [onDismiss]);

  const goToSwaps = useCallback(() => {
    postCallback.current = () => {
      goToSwapsBase();
    };
    handleNavigateBack();
  }, [goToSwapsBase, handleNavigateBack]);

  const onBatchSell = useCallback(() => {
    postCallback.current = () => {
      navigate(Routes.BRIDGE.ROOT, {
        screen: Routes.BRIDGE.BATCH_SELL_TOKEN_SELECT,
        params: {
          batchSellLocation: BatchSellMetricsLocation.TradeMenu,
        },
      });
    };
    handleNavigateBack();
  }, [handleNavigateBack, navigate]);

  const onPerps = useCallback(() => {
    postCallback.current = () => {
      if (isFirstTimePerpsUser) {
        navigate(Routes.PERPS.TUTORIAL);
      } else {
        navigate(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.PERPS_HOME,
        });
      }
    };
    handleNavigateBack();
  }, [handleNavigateBack, navigate, isFirstTimePerpsUser]);

  const onPredict = useCallback(() => {
    postCallback.current = () => {
      navigate(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: {
          entryPoint: PredictEventValues.ENTRY_POINT.MAIN_TRADE_BUTTON,
        },
      });
    };
    handleNavigateBack();
  }, [handleNavigateBack, navigate]);

  const onEarn = useCallback(async () => {
    postCallback.current = () => {
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
    };
    handleNavigateBack();
  }, [handleNavigateBack, navigate, trackEvent, createEventBuilder, chainId]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleNavigateBack();
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => backHandler.remove();
    }, [handleNavigateBack]),
  );

  const exitingAnimationWithCallback = useCallback(
    (callback: () => void) =>
      FadeOutDown.duration(animationDuration).withCallback(
        (finished) => finished && runOnJS(callback)(),
      ),
    [],
  );

  const exitingWithNavigateBack = useMemo(
    () =>
      exitingAnimationWithCallback(() => {
        const callback = postCallback.current;
        postCallback.current = undefined;

        dismissRootModalFlow();

        if (callback) {
          // Defer navigation until RootModalFlow is fully dismissed so screens
          // on MainNavigator (e.g. StakeModals) are not opened underneath it.
          requestAnimationFrame(() => {
            callback();
          });
        }
      }),
    [dismissRootModalFlow, exitingAnimationWithCallback],
  );

  const handleMenuLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setMenuLayout({ width, height });
  }, []);

  return (
    <View style={tw.style('flex-1 justify-end')}>
      <MaskedView
        style={{ ...StyleSheet.absoluteFillObject }}
        maskElement={
          <OverlayWithHole
            width={windowWidth}
            height={windowHeight + insetsTop}
            circleSize={buttonLayout.width - 1}
            circleX={buttonLayout.x + buttonLayout.width / 2}
            circleY={buttonLayout.y + buttonLayout.height / 2 + insetsTop}
          />
        }
      >
        <Overlay
          onPress={handleNavigateBack}
          duration={animationDuration}
        ></Overlay>
      </MaskedView>

      {visible && (
        <Animated.View exiting={exitingWithNavigateBack}>
          <MaskedView
            // iOS: MaskedView otherwise intercepts touches and ActionListItem onPress never fires (Android is unaffected).
            pointerEvents="box-none"
            maskElement={
              <View style={tw.style('flex-1 bg-transparent px-4')}>
                <View style={tw.style('flex-1 bg-black')} />
                <View style={tw.style('flex-row mt-[-1px]')}>
                  <View style={tw.style('bg-black flex-1 rounded-bl-2xl')} />
                  <BottomShape
                    width={buttonLayout.width * 4}
                    height={bottomMaskHeight}
                    peakHeight={bottomShapePeakHeight}
                    peakBezierLength={bottomShapePeakBezierLength}
                    baseBezierLength={bottomShapeBaseBezierLength}
                    fill="black"
                  />
                  <View style={tw.style('bg-black flex-1 rounded-br-2xl')} />
                </View>
              </View>
            }
          >
            <Animated.View
              entering={FadeInDown.duration(
                animationDuration,
              ).withInitialValues({
                transform: [{ translateY: 50 }],
              })}
            >
              <Box
                testID={WalletActionsBottomSheetSelectorsIDs.MENU_CONTAINER}
                onLayout={handleMenuLayout}
                style={tw.style(
                  surfaceClass,
                  'relative p-4 rounded-2xl mx-4',
                  `pb-[${bottomMaskHeight - 12}px]`,
                  'px-0',
                )}
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
                    description={strings(
                      'asset_overview.batch_sell_description',
                    )}
                    iconName={IconName.Merge}
                    iconProps={{
                      style: batchSellIconStyle,
                    }}
                    onPress={onBatchSell}
                    testID={
                      WalletActionsBottomSheetSelectorsIDs.BATCH_SELL_BUTTON
                    }
                    isDisabled={!isSwapsEnabled}
                    style={tw.style('bg-transparent')}
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
                    style={tw.style('bg-transparent')}
                  />
                )}
                {isPerpsEnabled && (
                  <ActionListItem
                    label={strings('asset_overview.perps_button')}
                    description={strings('asset_overview.perps_description')}
                    iconName={IconName.Candlestick}
                    onPress={onPerps}
                    testID={WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON}
                    isDisabled={!canSignTransactions}
                    style={tw.style('bg-transparent')}
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
                    style={tw.style('bg-transparent')}
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
                    style={tw.style('bg-transparent')}
                  />
                )}
                {isPureBlack && menuLayout ? (
                  <TradeMenuOutline
                    width={menuLayout.width}
                    height={menuLayout.height}
                    stroke={colors.border.muted}
                    peakHeight={bottomShapePeakHeight}
                    peakBezierLength={bottomShapePeakBezierLength}
                    baseBezierLength={bottomShapeBaseBezierLength}
                  />
                ) : null}
              </Box>
            </Animated.View>
          </MaskedView>
        </Animated.View>
      )}
      <View
        style={tw.style('pointer-events-none', {
          height: screenHeight - buttonLayout.y - insetsTop,
        })}
      />
    </View>
  );
}

export default TradeWalletActions;
