import MaskedView from '@react-native-masked-view/masked-view';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
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
  FadeInDown,
  FadeOutDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Overlay from '../../../component-library/components/Overlay';
import { useTheme } from '../../../util/theme';
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
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  getElevatedSurfaceColor,
  useElevatedSurface,
} from '../../../util/theme/themeUtils';
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
import { selectIsFirstTimePerpsUser } from '../../UI/Perps/selectors/perpsController';
import useStakingEligibility from '../../UI/Stake/hooks/useStakingEligibility';

const bottomMaskHeight = 35;
const animationDuration = AnimationDuration.Fast;

// OverlayWithHole's fill is hardcoded opaque black. When rendered directly
// (Android backdrop, see below) instead of as a MaskedView mask, the desired
// translucent dim has to come from fading a wrapping View to this color's own
// alpha rather than to 1 (which would render fully opaque black).
const getHexAlpha = (hexColor: string): number => {
  const match = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})$/.exec(hexColor.trim());
  return match ? parseInt(match[1], 16) / 255 : 1;
};
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
  const surfaceClass = useElevatedSurface();
  const theme = useTheme();
  const { colors } = theme;

  // Android only: mirrors the fade timing the shared Overlay component
  // provides (opacity 0 -> target, linear), applied directly here since the
  // Android backdrop below skips MaskedView (and therefore Overlay, which
  // depends on being masked) entirely. The target is the overlay color's own
  // alpha, not 1 -- OverlayWithHole's fill is opaque black, so fading to 1
  // would render fully opaque black instead of the intended translucent dim.
  const backdropOpacity = useSharedValue(0);
  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));
  if (Platform.OS === 'android') {
    backdropOpacity.value = withTiming(getHexAlpha(colors.overlay.default), {
      duration: animationDuration,
      easing: Easing.linear,
    });
  }

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

  const elevatedSurfaceColor = getElevatedSurfaceColor(theme);

  // Android skips the slide/fade-in entirely (see sheetContent below) -- no
  // entering animation needed there.
  const sheetEntering =
    Platform.OS === 'android'
      ? undefined
      : FadeInDown.duration(animationDuration).withInitialValues({
          transform: [{ translateY: 50 }],
        });

  const sheetMaskElement = (
    <View style={tw.style('flex-1 bg-transparent px-4')}>
      <View style={tw.style('flex-1 bg-black')} />
      <View style={tw.style('flex-row mt-[-1px]')}>
        <View style={tw.style('bg-black flex-1 rounded-bl-2xl')} />
        <BottomShape
          width={buttonLayout.width * 4}
          height={bottomMaskHeight}
          peakHeight={16}
          peakBezierLength={25}
          baseBezierLength={55}
          fill="black"
        />
        <View style={tw.style('bg-black flex-1 rounded-br-2xl')} />
      </View>
    </View>
  );

  const actionList = (
    <>
      {shouldRenderBatchSell && (
        <ActionListItem
          label={
            <View style={tw.style('flex-row items-center gap-2')}>
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
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
    </>
  );

  // Android: the card + button-notch shape is built from real Views instead
  // of a MaskedView mask (see backdrop comment above for why). Unlike a mask
  // -- which can erase pixels of the box underneath it to reveal the button
  // -- a plain View painted on top can only ever add pixels, never remove
  // the solid background already painted beneath it. So the notch row is a
  // genuine sibling stacked *below* the content box (not overlapping it):
  // the box's own background simply doesn't extend into that area, leaving
  // real transparency for the notch to reveal the button through.
  // This does make the card slightly taller than the masked/iOS version, but
  // that's safe: the outer container is `justify-end` with a fixed-height
  // spacer below the card (see the bottom of this component), so the card's
  // *bottom* edge -- where the notch lives -- stays pinned to the button's
  // position regardless of the card's total height; extra height only
  // pushes the action list further up.
  const sheetContent = (
    <Animated.View entering={sheetEntering}>
      {Platform.OS === 'android' ? (
        <View style={tw.style('px-4')}>
          <View style={tw.style(`${surfaceClass} p-4 rounded-t-2xl px-0`)}>
            {actionList}
          </View>
          <View
            style={tw.style('flex-row mt-[-1px]', { height: bottomMaskHeight })}
          >
            <View style={tw.style(`${surfaceClass} flex-1 rounded-bl-2xl`)} />
            <BottomShape
              width={buttonLayout.width * 4}
              height={bottomMaskHeight}
              peakHeight={16}
              peakBezierLength={25}
              baseBezierLength={55}
              fill={elevatedSurfaceColor}
            />
            <View style={tw.style(`${surfaceClass} flex-1 rounded-br-2xl`)} />
          </View>
        </View>
      ) : (
        <Box
          style={tw.style(
            `${surfaceClass} p-4 rounded-2xl mx-4`,
            `pb-[${bottomMaskHeight - 12}px]`,
            'px-0',
          )}
        >
          {actionList}
        </Box>
      )}
    </Animated.View>
  );

  return (
    <View style={tw.style('flex-1 justify-end')}>
      {/*
       * Android skips MaskedView for the backdrop: it routes through an opaque,
       * black-cleared offscreen layer that flashes for a frame on mount and
       * unmount (visible since the native-stack swap remounts the sheet on a
       * fresh fragment each open/close). OverlayWithHole is reused unmodified
       * (solid black + hole) but rendered directly and faded via opacity
       * instead of used as a MaskedView mask, so there's no compositing buffer
       * to flash. The translucent dim is approximated as black-at-opacity
       * rather than the exact `colors.overlay.default` token (a near-black
       * navy), which is visually indistinguishable once dimmed.
       * iOS keeps the original MaskedView + Overlay (no flash there).
       */}
      {Platform.OS === 'android' ? (
        <Animated.View
          style={[StyleSheet.absoluteFillObject, backdropAnimatedStyle]}
        >
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={handleNavigateBack}
          >
            <OverlayWithHole
              width={windowWidth}
              height={windowHeight + insetsTop}
              circleSize={buttonLayout.width - 1}
              circleX={buttonLayout.x + buttonLayout.width / 2}
              circleY={buttonLayout.y + buttonLayout.height / 2 + insetsTop}
            />
          </Pressable>
        </Animated.View>
      ) : (
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
          <Overlay onPress={handleNavigateBack} duration={animationDuration} />
        </MaskedView>
      )}

      {visible && (
        <Animated.View exiting={exitingWithNavigateBack}>
          {Platform.OS === 'android' ? (
            sheetContent
          ) : (
            <MaskedView
              // iOS: MaskedView otherwise intercepts touches and ActionListItem onPress never fires (Android is unaffected).
              pointerEvents="box-none"
              maskElement={sheetMaskElement}
            >
              {sheetContent}
            </MaskedView>
          )}
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
