import { useNavigation, useFocusEffect } from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  FadeOutDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../../util/theme';
import { useParams } from '../../../util/navigation/navUtils';

import {
  ActionListItem,
  FontWeight,
  IconName,
  Tag,
  TagSeverity,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import { BatchSellMetricsLocation } from '@metamask/bridge-controller';
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletActionsBottomSheetSelectorsIDs } from '../WalletActions/WalletActionsBottomSheet.testIds';
import { strings } from '../../../../locales/i18n';
import { AnimationDuration } from '../../../component-library/constants/animation.constants';
import {
  BLUR_INTENSITY,
  useBlurMaterial,
} from '../../../component-library/hooks/useBlurMaterial';
import { useLiquidGlass } from '../../../component-library/hooks/useLiquidGlass';
import {
  TAB_BAR_FLOATING_HEIGHT,
  TRADE_TRAY_GLASS_BORDER_OPACITY,
  TRADE_TRAY_GLASS_FILL_OPACITY,
  TRADE_TRAY_GLASS_RADIUS,
} from '../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.constants';
import { getTabBarFloatingBottomPadding } from '../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.utils';
import { selectBatchSellEnabled } from '../../../selectors/featureFlagController/batchSell';
import { useABTest } from '../../../hooks/useABTest';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog. */
import {
  HEADER_NAV_BAR_AB_KEY,
  HEADER_NAV_BAR_VARIANTS,
} from '../Homepage/abTestConfig';
/* eslint-enable import-x/no-restricted-paths */
import Routes from '../../../constants/navigation/Routes';
import AppConstants from '../../../core/AppConstants';
import { selectIsSwapsEnabled } from '../../../core/redux/slices/bridge';
import { RootState } from '../../../reducers';
import {
  selectCanSignTransactions,
  selectSelectedInternalAccountAddress,
} from '../../../selectors/accountsController';
import { isHardwareAccount } from '../../../util/address';
import { colorWithOpacity } from '../../../util/colors';
import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../../UI/Bridge/hooks/useSwapBridgeNavigation';
import { selectPerpsEnabledFlag } from '../../UI/Perps';
import { selectPerpsProModeEnabledFlag } from '../../UI/Perps/selectors/featureFlags';
import {
  toPerpsNavigatorScreenParams,
  useGetPerpsHomeNavigationTarget,
} from '../../UI/Perps/utils/perpsModeSwitch';
import { openPerpsModeSelection } from '../../UI/Perps/utils/openPerpsModeSelection';
import { hasCompletedPerpsModeSelection } from '../../UI/Perps/utils/perpsModeSelectionStorage';
import { selectPredictEnabledFlag } from '../../UI/Predict';
import { PredictEventValues } from '../../UI/Predict/constants/eventNames';
import { ActionLocation } from '../../../util/analytics/actionButtonTracking';

import BottomShape from './components/BottomShape';
import OverlayWithHole from './components/OverlayWithHole';
import { selectIsFirstTimePerpsUser } from '../../UI/Perps/selectors/perpsController';
import EarnTradeMenuRow from './components/EarnTradeMenuRow/EarnTradeMenuRow';

const bottomMaskHeight = 35;
// The trade-focused sheet sits on a blur with its own edge, so its page is not dimmed.
const TRADE_FOCUSED_BACKDROP_OPACITY = 0.2;
export const TRADE_FOCUSED_BORDER_OPACITY = 0.2;
const animationDuration = AnimationDuration.Fast;

const batchSellIconStyle = {
  transform: [{ rotate: '180deg' }],
} satisfies ViewStyle;

export interface TradeWalletActionsParams {
  onDismiss?: () => void;
  /** Measured tab-bar button layout; may be unset until first layout. */
  buttonLayout?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Whether the sheet dips into a peak above the opening button. The floating bar's trailing "+" opens a plain rounded sheet instead. */
  hasBottomNotch?: boolean;
  /**
   * Sit the sheet where it would sit above the floating bar when there is no
   * `buttonLayout` to anchor to: the native iOS 26 bar cannot be measured.
   */
  anchorsToTabBar?: boolean;
}

function TradeWalletActions() {
  const { navigate } = useNavigation();
  const {
    onDismiss,
    buttonLayout,
    hasBottomNotch = true,
    anchorsToTabBar = false,
  } = useParams<TradeWalletActionsParams>();
  const isFirstTimePerpsUser = useSelector(selectIsFirstTimePerpsUser);

  const postCallback = useRef<(() => void | Promise<void>) | undefined>(
    undefined,
  );
  const [visible, setIsVisible] = useState(true);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { height: screenHeight } = useSafeAreaFrame();
  const insets = useSafeAreaInsets();
  const insetsTop = Platform.OS === 'android' ? insets.top : 0;

  const tw = useTailwind();
  const surfaceClass = 'bg-elevated1';
  const { colors } = useTheme();
  // Assignment-only read: exposure is tracked where the experiment surface is
  // owned, the wallet header and the tab bar, so this must not emit it again.
  const { variant: headerNavBarVariant } = useABTest(
    HEADER_NAV_BAR_AB_KEY,
    HEADER_NAV_BAR_VARIANTS,
    { trackExposure: false },
  );
  const isTradeFocusedArm =
    headerNavBarVariant.trailingNavBarAction === 'trade';
  const { isBlurAvailable, tint } = useBlurMaterial();
  const { isGlassEnabled, glassColorScheme } = useLiquidGlass();
  // Glass needs one rounded surface; the notched edge is an SVG shape that
  // cannot be glass, so only the plain sheet gets the material.
  const isGlassSheet = isGlassEnabled && !hasBottomNotch;
  const isTranslucentSheet =
    !isGlassSheet && isTradeFocusedArm && isBlurAvailable;

  const glassBorderStyle = useMemo(
    () => ({
      borderRadius: TRADE_TRAY_GLASS_RADIUS,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colorWithOpacity(
        colors.border.muted,
        TRADE_TRAY_GLASS_BORDER_OPACITY,
      ),
    }),
    [colors.border.muted],
  );
  const glassFillStyle = useMemo(
    () => ({
      borderRadius: TRADE_TRAY_GLASS_RADIUS,
      opacity: TRADE_TRAY_GLASS_FILL_OPACITY,
    }),
    [],
  );

  const backdropOpacity = useSharedValue(0);
  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetProgress = useSharedValue(0);
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    opacity: isGlassSheet ? 1 : sheetProgress.value,
    transform: [{ translateY: (1 - sheetProgress.value) * 50 }],
  }));

  useEffect(() => {
    backdropOpacity.value = withTiming(
      isTradeFocusedArm ? TRADE_FOCUSED_BACKDROP_OPACITY : 1,
      { duration: animationDuration, easing: Easing.linear },
    );
    sheetProgress.value = withTiming(1, { duration: animationDuration });
  }, [backdropOpacity, isTradeFocusedArm, sheetProgress]);

  const isSwapsEnabled = useSelector((state: RootState) =>
    selectIsSwapsEnabled(state),
  );

  const navigation = useNavigation();

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

  const getPerpsHomeNavigationTarget = useGetPerpsHomeNavigationTarget();

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

  const onActionSelected = useCallback(
    (callback: () => void | Promise<void>) => {
      postCallback.current = callback;
      handleNavigateBack();
    },
    [handleNavigateBack],
  );

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
    postCallback.current = async () => {
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
    };
    handleNavigateBack();
  }, [
    handleNavigateBack,
    navigate,
    navigation,
    isFirstTimePerpsUser,
    isPerpsProModeEnabled,
    getPerpsHomeNavigationTarget,
  ]);

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

  // Svg fill/stroke take color strings, not classes, so resolve the surface
  // class to its color value.
  const elevatedSurfaceColor = tw.color(surfaceClass);

  const bottomShapeMaskWidth = buttonLayout ? buttonLayout.width * 2 : 0;
  // Same distance the floating bar's top sits from the screen bottom, so the
  // tray lands where the measured-button path puts it.
  const bottomSpacerHeight = anchorsToTabBar
    ? getTabBarFloatingBottomPadding(insets.bottom) + TAB_BAR_FLOATING_HEIGHT
    : 0;

  const actionList = (
    <>
      {shouldRenderBatchSell && (
        <ActionListItem
          label={strings('asset_overview.batch_sell')}
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
          label={strings('asset_overview.perps_button')}
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
      <EarnTradeMenuRow
        onActionSelected={onActionSelected}
        isDisabled={!canSignTransactions}
      />
    </>
  );
  const sheetContent = (
    <Animated.View style={sheetAnimatedStyle}>
      <View style={tw.style('px-4')}>
        {isGlassSheet ? (
          <View style={[tw.style('mb-4'), glassBorderStyle]}>
            <GlassView
              glassEffectStyle="regular"
              colorScheme={glassColorScheme}
              testID={WalletActionsBottomSheetSelectorsIDs.MENU_CONTAINER}
              style={[
                tw.style('p-4 px-0 overflow-hidden'),
                { borderRadius: TRADE_TRAY_GLASS_RADIUS },
              ]}
            >
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  tw.style(surfaceClass),
                  glassFillStyle,
                ]}
              />
              {actionList}
            </GlassView>
          </View>
        ) : isTranslucentSheet && !hasBottomNotch ? (
          <BlurView
            testID={WalletActionsBottomSheetSelectorsIDs.MENU_CONTAINER}
            tint={tint}
            intensity={BLUR_INTENSITY}
            style={[
              tw.style('p-4 px-0 rounded-2xl mb-4 overflow-hidden'),
              {
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colorWithOpacity(
                  colors.border.muted,
                  TRADE_FOCUSED_BORDER_OPACITY,
                ),
              },
            ]}
          >
            {actionList}
          </BlurView>
        ) : (
          <View
            testID={WalletActionsBottomSheetSelectorsIDs.MENU_CONTAINER}
            style={tw.style(
              `${surfaceClass} p-4 px-0 border-alternative`,
              hasBottomNotch
                ? 'rounded-t-2xl border-t border-l border-r'
                : 'rounded-2xl border mb-4',
            )}
          >
            {actionList}
          </View>
        )}
        {hasBottomNotch && (
          <View
            style={tw.style('flex-row mt-[-1px]', { height: bottomMaskHeight })}
          >
            <View
              style={tw.style(
                `${surfaceClass} flex-1 rounded-bl-2xl`,
                'border-l border-b border-alternative',
              )}
            />
            <BottomShape
              width={bottomShapeMaskWidth}
              height={bottomMaskHeight}
              peakHeight={16}
              peakBezierLength={25}
              baseBezierLength={55}
              fill={elevatedSurfaceColor}
            />
            <View
              style={tw.style(
                `${surfaceClass} flex-1 rounded-br-2xl`,
                'border-r border-b border-alternative',
              )}
            />
            <View
              pointerEvents="none"
              style={tw.style('absolute bottom-0 inset-x-0 items-center')}
              testID={WalletActionsBottomSheetSelectorsIDs.MENU_BOTTOM_STROKE}
            >
              <BottomShape
                width={bottomShapeMaskWidth + 4}
                height={bottomMaskHeight}
                peakHeight={16}
                peakBezierLength={25}
                baseBezierLength={55}
                strokeOnly
                pathProps={{
                  stroke: colors.border.alternative,
                  strokeWidth: 2,
                }}
              />
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );

  return (
    <View style={tw.style('flex-1 justify-end')}>
      <Animated.View style={[StyleSheet.absoluteFill, backdropAnimatedStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleNavigateBack}>
          {buttonLayout ? (
            <OverlayWithHole
              width={windowWidth}
              height={windowHeight + insetsTop}
              circleSize={buttonLayout.width - 1}
              circleX={buttonLayout.x + buttonLayout.width / 2}
              circleY={buttonLayout.y + buttonLayout.height / 2 + insetsTop}
              fill={colors.overlay.default}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.overlay.default },
              ]}
            />
          )}
        </Pressable>
      </Animated.View>

      {visible && (
        <Animated.View exiting={exitingWithNavigateBack}>
          {sheetContent}
        </Animated.View>
      )}
      <View
        style={tw.style('pointer-events-none', {
          height: buttonLayout
            ? screenHeight - buttonLayout.y - insetsTop
            : bottomSpacerHeight,
        })}
      />
    </View>
  );
}

export default TradeWalletActions;
