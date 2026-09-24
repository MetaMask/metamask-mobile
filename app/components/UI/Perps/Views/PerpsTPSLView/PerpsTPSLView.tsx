import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ScrollView,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { strings } from '../../../../../../locales/i18n';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  type BottomSheetRef,
  ButtonsAlignment,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  HelpText,
  HelpTextSeverity,
  Icon,
  IconColor,
  IconName,
  IconSize,
  KeyValueRow,
  KeyValueRowVariant,
  Label,
  SectionDivider,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import Keypad from '../../../../../components/Base/Keypad';
import { ImpactMoment, useHaptics } from '../../../../../util/haptics';

import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  PERPS_CONSTANTS,
  DECIMAL_PRECISION_CONFIG,
} from '@metamask/perps-controller';
import { usePerpsLivePositions, usePerpsLivePrices } from '../../hooks/stream';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import type { PerpsNavigationParamList } from '../../types/navigation';
import {
  getPerpsTPSLViewSelector,
  PerpsTPSLViewSelectorsIDs,
} from '../../Perps.testIds';
import { usePerpsTPSLForm } from '../../hooks/usePerpsTPSLForm';
import { usePerpsLiquidationPrice } from '../../hooks/usePerpsLiquidationPrice';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../utils/formatUtils';
import { toPerpsEntryAttribution } from '../../utils/perpsAnalyticsAttribution';
import {
  calculateLiquidationDistance,
  clampLiquidationDistance,
} from '../../utils/liquidationDistance';
import {
  LIQUIDATION_DISTANCE_DECIMALS,
  TP_SL_VIEW_CONFIG,
} from '../../constants/perpsConfig';

/**
 * Await a dismissal that may never call back.
 *
 * Resolves on the dismissal callback, or on
 * {@link TP_SL_VIEW_CONFIG.DismissTimeoutMs}, whichever lands first, and only
 * ever once. The timer is cleared when the dismissal wins so a confirmed edit
 * does not leave it pending.
 *
 * @param dismiss - Dismissal that takes a post-dismiss callback.
 * @returns Resolves once the route has dismissed, or the wait has expired.
 */
export function waitForDismissal(dismiss: (afterDismiss: () => void) => void) {
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;

  const dismissed = new Promise<void>((resolve) => {
    dismiss(resolve);
  });
  const expired = new Promise<void>((resolve) => {
    expiryTimer = setTimeout(resolve, TP_SL_VIEW_CONFIG.DismissTimeoutMs);
  });

  return Promise.race([dismissed, expired]).finally(() => {
    clearTimeout(expiryTimer);
  });
}

/** Button tertiary text color must resolve per press state. */
const getClearTextClassName = () => 'text-primary-default';

const SHEET_PRICE_PLACEHOLDER = '0.00';
const SHEET_PERCENTAGE_PLACEHOLDER = '0';

const priceKeyTextProps = {
  variant: TextVariant.BodyMd,
  color: TextColor.TextAlternative,
} as const;

const priceValueTextProps = {
  variant: TextVariant.BodyMd,
  color: TextColor.TextDefault,
} as const;

const sheetPriceKeyTextProps = {
  variant: TextVariant.BodySm,
  fontWeight: FontWeight.Medium,
  color: TextColor.TextAlternative,
} as const;

const sheetPriceValueTextProps = {
  variant: TextVariant.BodyMd,
  fontWeight: FontWeight.Medium,
  color: TextColor.TextDefault,
} as const;

/**
 * Compact +/− control for %RoE fields. ButtonBase defaults to `self-start`,
 * which pins the chip to the top of TextField's 48px row; force center so it
 * lines up with the $ prefix, input text, and % suffix.
 */
const RoeSignBadge: React.FC<{
  sign: '+' | '-';
  onPress: () => void;
  testID: string;
  accessibilityLabel: string;
  isDisabled: boolean;
  isNeutral?: boolean;
}> = ({
  sign,
  onPress,
  testID,
  accessibilityLabel,
  isDisabled,
  isNeutral = false,
}) => {
  return (
    <ButtonIcon
      size={ButtonIconSize.Sm}
      variant={ButtonIconVariant.Filled}
      iconName={sign === '+' ? IconName.Add : IconName.Minus}
      iconProps={{
        size: IconSize.Sm,
        color: isNeutral
          ? IconColor.IconDefault
          : sign === '+'
            ? IconColor.SuccessDefault
            : IconColor.ErrorDefault,
      }}
      isDisabled={isDisabled}
      onPress={onPress}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: sign }}
      twClassName="shrink-0 self-center"
    />
  );
};

/**
 * Reserves HelpText vertical space so TP/SL sections do not jump when
 * expected PnL or validation errors appear. Uses an invisible danger+icon
 * HelpText as the in-flow sizer (tallest common single-line layout).
 */
const SectionHelpText: React.FC<{
  errorMessage?: string;
  expectedMessage?: string;
  errorTestID?: string;
  /**
   * Drops the sizer while both messages are absent, trading a shift when one
   * appears for the vertical space the sheet does not have.
   */
  reserveWhenEmpty?: boolean;
}> = ({
  errorMessage,
  expectedMessage,
  errorTestID,
  reserveWhenEmpty = true,
}) => {
  if (!reserveWhenEmpty && !errorMessage && !expectedMessage) {
    return null;
  }

  return (
    <Box>
      <HelpText
        severity={HelpTextSeverity.Danger}
        showIcon
        twClassName="opacity-0"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {errorMessage ?? '\u00A0'}
      </HelpText>
      {errorMessage ? (
        <Box twClassName="absolute inset-x-0 top-0">
          <HelpText
            severity={HelpTextSeverity.Danger}
            showIcon
            testID={errorTestID}
          >
            {errorMessage}
          </HelpText>
        </Box>
      ) : expectedMessage ? (
        <Box twClassName="absolute inset-x-0 top-0">
          <HelpText>{expectedMessage}</HelpText>
        </Box>
      ) : null}
    </Box>
  );
};

export interface PerpsTPSLViewProps {
  /**
   * `screen` is the experiment control and must stay byte-for-byte the
   * experience that shipped.
   */
  variant?: 'screen' | 'sheet';
}

const PerpsTPSLView: React.FC<PerpsTPSLViewProps> = ({
  variant = 'screen',
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<RouteProp<PerpsNavigationParamList, 'PerpsTPSL'>>();
  const tw = useTailwind();
  const { playImpact, playSelection } = useHaptics();

  const isSheet = variant === 'sheet';
  const sheetRef = useRef<BottomSheetRef>(null);
  // A close already in flight makes BottomSheet drop any later close callback,
  // so a second dismissal would never settle and would fall through to the
  // timeout. Tracked here so Save cannot submit an edit Cancel already discarded.
  const closingRef = useRef(false);

  // The sheet plays its close animation before the route pops; the screen pops
  // straight away. Both paths must dismiss before `onConfirm` runs — see the
  // Android Fabric note in handleConfirm.
  const dismiss = useCallback(
    (afterDismiss?: () => void) => {
      closingRef.current = true;
      // The sheet pops the route from its close-animation callback, so work
      // that must not race the transition has to run from there rather than
      // beside it. With no ref attached there is no animation to wait on, so
      // fall through to the screen path rather than dropping the callback.
      if (isSheet && sheetRef.current) {
        sheetRef.current.onCloseBottomSheet(afterDismiss);
        return;
      }
      navigation.goBack();
      afterDismiss?.();
    },
    [isSheet, navigation],
  );

  // Extract params from navigation route
  const {
    asset,
    currentPrice: initialCurrentPrice,
    direction,
    position,
    initialTakeProfitPrice,
    initialStopLossPrice,
    leverage: propLeverage,
    orderType,
    limitPrice,
    amount,
    szDecimals,
    enableHaptics = false,
    onConfirm,
  } = route.params;

  const [isUpdating, setIsUpdating] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const takeProfitSectionRef = useRef<View>(null);
  const stopLossSectionRef = useRef<View>(null);
  const scrollOffsetRef = useRef(0);

  // Keypad state management
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Refs for TextField inputs to programmatically blur them
  const takeProfitPriceRef = useRef<TextInput>(null);
  const takeProfitPercentageRef = useRef<TextInput>(null);
  const stopLossPriceRef = useRef<TextInput>(null);
  const stopLossPercentageRef = useRef<TextInput>(null);

  // Subscribe to real-time price only when we have an asset
  // Use throttle for TP/SL screen to reduce re-renders
  const priceData = usePerpsLivePrices({
    symbols: asset ? [asset] : [],
    throttleMs: TP_SL_VIEW_CONFIG.PriceThrottleMs,
  });
  const livePrice = priceData[asset]?.price
    ? parseFloat(priceData[asset].price)
    : undefined;

  // Use the current market price if available, otherwise use entry price
  // For new orders, use initialCurrentPrice
  // For existing positions, prefer live price over initial price over entry price
  const spotPrice =
    livePrice ||
    initialCurrentPrice ||
    (position?.entryPrice ? parseFloat(position.entryPrice) : 0);

  // For display purposes, use limit price for limit orders, otherwise use spot price
  const hasValidLimitPrice =
    orderType === 'limit' && limitPrice && parseFloat(limitPrice) > 0;
  const currentPrice = hasValidLimitPrice ? parseFloat(limitPrice) : spotPrice;

  // Compute keypad decimal places from current price so low-value assets
  // (e.g. PUMP at ~$0.002) get enough decimal places to enter a trigger price.
  // Formula: floor(-log10(price)) + MaxSignificantFigures, clamped to [2, MaxPriceDecimals].
  const keypadDecimals =
    currentPrice > 0 && isFinite(currentPrice)
      ? Math.min(
          Math.max(
            2,
            Math.floor(-Math.log10(currentPrice)) +
              DECIMAL_PRECISION_CONFIG.MaxSignificantFigures,
          ),
          DECIMAL_PRECISION_CONFIG.MaxPriceDecimals,
        )
      : DECIMAL_PRECISION_CONFIG.MaxPriceDecimals;

  // Determine the entry price based on order type
  // For limit orders, use the limit price as entry price if available
  // For market orders or when limit price is not set, use spot price
  // Ensure we always have a valid price > 0 for calculations
  let effectiveEntryPrice: number;
  if (position?.entryPrice) {
    effectiveEntryPrice = parseFloat(position.entryPrice);
  } else if (
    orderType === 'limit' &&
    limitPrice &&
    parseFloat(limitPrice) > 0
  ) {
    effectiveEntryPrice = parseFloat(limitPrice);
  } else if (spotPrice > 0) {
    effectiveEntryPrice = spotPrice;
  } else {
    effectiveEntryPrice = livePrice || initialCurrentPrice || 0;
  }

  // Determine direction for tracking events
  let actualDirection: 'long' | 'short';
  if (position) {
    actualDirection = parseFloat(position.size) > 0 ? 'long' : 'short';
  } else {
    actualDirection = direction || 'long';
  }

  // Calculate liquidation price for new orders (when there's no existing position)
  const shouldCalculateLiquidation =
    !position && currentPrice > 0 && propLeverage && actualDirection && asset;
  const { liquidationPrice: calculatedLiquidationPrice } =
    usePerpsLiquidationPrice({
      entryPrice: shouldCalculateLiquidation ? currentPrice : 0,
      leverage: shouldCalculateLiquidation ? propLeverage : 0,
      direction: shouldCalculateLiquidation ? actualDirection : 'long',
      asset: shouldCalculateLiquidation ? asset : '',
    });

  // Use position's liquidation price if available, otherwise use calculated price
  const displayLiquidationPrice =
    position?.liquidationPrice ||
    (shouldCalculateLiquidation ? calculatedLiquidationPrice : undefined);

  // Use the TPSL form hook for all state management and business logic
  const tpslForm = usePerpsTPSLForm({
    asset,
    currentPrice,
    direction,
    position,
    initialTakeProfitPrice,
    initialStopLossPrice,
    leverage: propLeverage,
    entryPrice: effectiveEntryPrice,
    isVisible: true,
    liquidationPrice: displayLiquidationPrice,
    orderType,
    amount,
    szDecimals,
  });

  // Extract form state and handlers for easier access
  const {
    takeProfitPrice,
    stopLossPrice,
    takeProfitPercentage,
    stopLossPercentage,
    takeProfitSign,
    stopLossSign,
  } = tpslForm.formState;

  const {
    handleTakeProfitPriceChange,
    handleTakeProfitPercentageChange,
    handleStopLossPriceChange,
    handleStopLossPercentageChange,
    handleTakeProfitPriceFocus,
    handleTakeProfitPriceBlur,
    handleTakeProfitPercentageFocus,
    handleTakeProfitPercentageBlur,
    handleStopLossPriceFocus,
    handleStopLossPriceBlur,
    handleStopLossPercentageFocus,
    handleStopLossPercentageBlur,
  } = tpslForm.handlers;

  const {
    handleTakeProfitPercentageButton,
    handleStopLossPercentageButton,
    handleTakeProfitOff,
    handleStopLossOff,
    handleTakeProfitSignToggle,
    handleStopLossSignToggle,
  } = tpslForm.buttons;

  const {
    isValid,
    hasChanges,
    takeProfitError,
    stopLossError,
    stopLossLiquidationError,
  } = tpslForm.validation;
  const {
    formattedTakeProfitPercentage,
    formattedStopLossPercentage,
    expectedTakeProfitPnL,
    expectedStopLossPnL,
  } = tpslForm.display;

  // Determine if this is create (new order) or edit (existing position) TP/SL
  const isEditingExistingPosition = !!position;

  // The route snapshot outlives the position. Once the live stream has loaded
  // without it, submitting would attach TP/SL to nothing and the controller
  // would record a failed Risk Management request for a benign venue race.
  const { positions: livePositions, isInitialLoading: isPositionsLoading } =
    usePerpsLivePositions({
      throttleMs: TP_SL_VIEW_CONFIG.PositionThrottleMs,
    });
  const isPositionGone =
    isEditingExistingPosition &&
    !isPositionsLoading &&
    !livePositions.some((p) => p.symbol === position.symbol);
  const tpslScreenType = isEditingExistingPosition
    ? PERPS_EVENT_VALUE.SCREEN_TYPE.EDIT_TPSL
    : PERPS_EVENT_VALUE.SCREEN_TYPE.CREATE_TPSL;

  const { track } = usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    properties: {
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]: tpslScreenType,
      [PERPS_EVENT_PROPERTY.ASSET]: asset,
      [PERPS_EVENT_PROPERTY.DIRECTION]:
        actualDirection === 'long'
          ? PERPS_EVENT_VALUE.DIRECTION.LONG
          : PERPS_EVENT_VALUE.DIRECTION.SHORT,
      // Add initial TP/SL state to understand what user already has set
      [PERPS_EVENT_PROPERTY.HAS_TAKE_PROFIT]: !!initialTakeProfitPrice,
      [PERPS_EVENT_PROPERTY.HAS_STOP_LOSS]: !!initialStopLossPrice,
      [PERPS_EVENT_PROPERTY.SOURCE]: isEditingExistingPosition
        ? PERPS_EVENT_VALUE.SOURCE.POSITION_SCREEN
        : PERPS_EVENT_VALUE.SOURCE.TRADE_SCREEN,
    },
  });

  // Handle back button press
  const handleBack = useCallback(() => {
    if (closingRef.current) {
      return;
    }
    if (enableHaptics) {
      playImpact(ImpactMoment.PageNavigation).catch(() => undefined);
    }
    dismiss();
  }, [dismiss, enableHaptics, playImpact]);

  const scrollFocusedSectionIntoView = useCallback((inputType: string) => {
    const sectionRef =
      inputType === 'takeProfitPrice' || inputType === 'takeProfitPercentage'
        ? takeProfitSectionRef
        : stopLossSectionRef;
    const scrollView = scrollViewRef.current;
    const section = sectionRef.current;
    if (!scrollView || !section) {
      return;
    }

    const scrollViewNative = scrollView as unknown as View;

    section.measureInWindow(
      (_sx: number, sectionY: number, _sw: number, sectionHeight: number) => {
        scrollViewNative.measureInWindow(
          (_vx: number, viewY: number, _vw: number, viewHeight: number) => {
            const margin = 16;
            const sectionBottom = sectionY + sectionHeight;
            const visibleBottom = viewY + viewHeight - margin;
            const sectionTop = sectionY;
            const visibleTop = viewY + margin;

            let delta = 0;
            if (sectionBottom > visibleBottom) {
              delta = sectionBottom - visibleBottom;
            } else if (sectionTop < visibleTop) {
              delta = sectionTop - visibleTop;
            }

            if (Math.abs(delta) > 1) {
              scrollView.scrollTo({
                y: Math.max(0, scrollOffsetRef.current + delta),
                animated: true,
              });
            }
          },
        );
      },
    );
  }, []);

  // After the custom keypad mounts (and ScrollView shrinks), scroll the focused
  // section so its inputs + HelpText sit in the remaining viewport.
  useEffect(() => {
    if (!focusedInput) {
      return;
    }
    const timeoutId = setTimeout(() => {
      scrollFocusedSectionIntoView(focusedInput);
    }, 50);
    return () => clearTimeout(timeoutId);
  }, [focusedInput, scrollFocusedSectionIntoView]);

  const handleScroll = useCallback(
    (scrollEvent: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetRef.current = scrollEvent.nativeEvent.contentOffset.y;
    },
    [],
  );

  // Footer onLayout fires after the keypad mounts and the ScrollView viewport
  // shrinks — re-measure so the focused section stays visible.
  const handleKeypadFooterLayout = useCallback(() => {
    if (!focusedInput) {
      return;
    }
    scrollFocusedSectionIntoView(focusedInput);
  }, [focusedInput, scrollFocusedSectionIntoView]);

  const handleKeypadChange = useCallback(
    ({ value }: { value: string; valueAsNumber: number }) => {
      if (focusedInput === 'takeProfitPrice') {
        handleTakeProfitPriceChange(value);
      } else if (focusedInput === 'takeProfitPercentage') {
        handleTakeProfitPercentageChange(value);
      } else if (focusedInput === 'stopLossPrice') {
        handleStopLossPriceChange(value);
      } else if (focusedInput === 'stopLossPercentage') {
        handleStopLossPercentageChange(value.trim());
      }
    },
    [
      focusedInput,
      handleTakeProfitPriceChange,
      handleTakeProfitPercentageChange,
      handleStopLossPriceChange,
      handleStopLossPercentageChange,
    ],
  );

  const handleInputFocus = useCallback(
    (inputType: string) => {
      setFocusedInput(inputType);

      // The system keyboard is suppressed via showSoftInputOnFocus={false} on
      // each Input, which the native iOS implementation honors by swapping in
      // an empty inputView. The custom keypad is the only keyboard shown and
      // the native caret stays focused and blinking — no Keyboard.dismiss()
      // workaround needed.
      // Scroll-into-view runs in an effect after the keypad layout settles.

      // Call the appropriate original focus handler
      switch (inputType) {
        case 'takeProfitPrice':
          handleTakeProfitPriceFocus();
          break;
        case 'takeProfitPercentage':
          handleTakeProfitPercentageFocus();
          break;
        case 'stopLossPrice':
          handleStopLossPriceFocus();
          break;
        case 'stopLossPercentage':
          handleStopLossPercentageFocus();
          break;
      }
    },
    [
      handleTakeProfitPriceFocus,
      handleTakeProfitPercentageFocus,
      handleStopLossPriceFocus,
      handleStopLossPercentageFocus,
    ],
  );

  // Only hide the keypad when the active/focused field is the one blurring
  // (prevents hiding the keypad when the user moves focus to another field).
  const handleInputBlur = useCallback(
    (inputType: string) => {
      if (inputType === 'takeProfitPrice') {
        handleTakeProfitPriceBlur();
      } else if (inputType === 'takeProfitPercentage') {
        handleTakeProfitPercentageBlur();
      } else if (inputType === 'stopLossPrice') {
        handleStopLossPriceBlur();
      } else if (inputType === 'stopLossPercentage') {
        handleStopLossPercentageBlur();
      }

      // Only clear the keypad when the field that is blurring is still the
      // active one (i.e. the user isn't moving to another input).
      setFocusedInput((prev) => (prev === inputType ? null : prev));
    },
    [
      handleTakeProfitPriceBlur,
      handleTakeProfitPercentageBlur,
      handleStopLossPriceBlur,
      handleStopLossPercentageBlur,
    ],
  );

  const dismissKeypad = useCallback(() => {
    // Blur the currently focused input to trigger onBlur events
    if (focusedInput === 'takeProfitPrice') {
      takeProfitPriceRef.current?.blur();
    } else if (focusedInput === 'takeProfitPercentage') {
      takeProfitPercentageRef.current?.blur();
    } else if (focusedInput === 'stopLossPrice') {
      stopLossPriceRef.current?.blur();
    } else if (focusedInput === 'stopLossPercentage') {
      stopLossPercentageRef.current?.blur();
    }
    setFocusedInput(null);
  }, [focusedInput]);

  const handleConfirm = useCallback(async () => {
    if (
      closingRef.current ||
      !hasChanges ||
      !isValid ||
      isUpdating ||
      isPositionGone
    ) {
      return;
    }

    if (focusedInput) {
      dismissKeypad();
    }

    // Parse the formatted prices back to plain numbers for storage
    // Check for non-empty strings (empty strings should be treated as undefined)
    const parseTakeProfitPrice = takeProfitPrice?.trim()
      ? takeProfitPrice.replace(/[$,]/g, '')
      : undefined;
    const parseStopLossPrice = stopLossPrice?.trim()
      ? stopLossPrice.replace(/[$,]/g, '')
      : undefined;

    if (enableHaptics) {
      playImpact(ImpactMoment.PrimaryCTA).catch(() => undefined);
    }

    setIsUpdating(true);

    // Pass tracking data to avoid duplicate position fetch in controller
    // Use appropriate source based on context:
    // - POSITION_SCREEN when editing TP/SL on an existing position
    // - TRADE_SCREEN when setting TP/SL for a new order
    const riskSource = isEditingExistingPosition
      ? PERPS_EVENT_VALUE.RISK_MANAGEMENT_SOURCE.POSITION_SCREEN
      : PERPS_EVENT_VALUE.RISK_MANAGEMENT_SOURCE.TRADE_SCREEN;
    const trackingData = {
      direction: actualDirection,
      source: riskSource,
      ...toPerpsEntryAttribution({ source: riskSource }),
      positionSize: position?.size ? Math.abs(parseFloat(position.size)) : 0,
      takeProfitPercentage: takeProfitPercentage
        ? (takeProfitSign === '-' ? -1 : 1) *
          Math.abs(parseFloat(takeProfitPercentage.replace(/[^\d.-]/g, '')))
        : undefined,
      stopLossPercentage: stopLossPercentage
        ? (stopLossSign === '-' ? -1 : 1) *
          Math.abs(parseFloat(stopLossPercentage.replace(/[^\d.-]/g, '')))
        : undefined,
      isEditingExistingPosition,
      entryPrice: effectiveEntryPrice,
    };

    // Dismiss first (same as PerpsClosePositionView). Updating while this
    // screen is still dismissing crashes Android Fabric under nav v7 —
    // optimistic parent re-render races react-native-screens' transition.
    //
    // The sheet can drop its close callback — a close already in flight returns
    // before storing it — so this settles on a timer too. Waiting forever would
    // strand the update behind a spinner, which is worse than confirming a beat
    // early.
    await waitForDismissal(dismiss);

    // Pass position from route params so the callback always has the correct position (avoids "No position found" when parent ref is stale)
    await onConfirm(
      position,
      parseTakeProfitPrice,
      parseStopLossPrice,
      trackingData,
    );
  }, [
    focusedInput,
    takeProfitPrice,
    stopLossPrice,
    onConfirm,
    dismissKeypad,
    dismiss,
    actualDirection,
    position,
    takeProfitPercentage,
    stopLossPercentage,
    takeProfitSign,
    stopLossSign,
    isEditingExistingPosition,
    effectiveEntryPrice,
    enableHaptics,
    playImpact,
    hasChanges,
    isValid,
    isUpdating,
    isPositionGone,
  ]);

  const confirmDisabled =
    !hasChanges || !isValid || isUpdating || isPositionGone;
  const inputsDisabled = isUpdating;

  const handleTakeProfitSignPress = useCallback(() => {
    if (inputsDisabled) {
      return;
    }
    if (enableHaptics) {
      playSelection().catch(() => undefined);
    }
    const nextSign = takeProfitSign === '+' ? '-' : '+';
    handleTakeProfitSignToggle();
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.TPSL_ROE_SIGN_TOGGLED,
      [PERPS_EVENT_PROPERTY.ACTION]: PERPS_EVENT_VALUE.ACTION.TP,
      [PERPS_EVENT_PROPERTY.ROE_SIGN]: nextSign,
    });
  }, [
    enableHaptics,
    handleTakeProfitSignToggle,
    inputsDisabled,
    playSelection,
    takeProfitSign,
    track,
  ]);

  const handleStopLossSignPress = useCallback(() => {
    if (inputsDisabled) {
      return;
    }
    if (enableHaptics) {
      playSelection().catch(() => undefined);
    }
    const nextSign = stopLossSign === '-' ? '+' : '-';
    handleStopLossSignToggle();
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.TPSL_ROE_SIGN_TOGGLED,
      [PERPS_EVENT_PROPERTY.ACTION]: PERPS_EVENT_VALUE.ACTION.SL,
      [PERPS_EVENT_PROPERTY.ROE_SIGN]: nextSign,
    });
  }, [
    enableHaptics,
    handleStopLossSignToggle,
    inputsDisabled,
    playSelection,
    stopLossSign,
    track,
  ]);

  const handleTakeProfitPresetPress = useCallback(
    (percentage: number) => {
      if (inputsDisabled) {
        return;
      }
      if (enableHaptics) {
        playSelection().catch(() => undefined);
      }
      handleTakeProfitPercentageButton(percentage);
    },
    [
      enableHaptics,
      handleTakeProfitPercentageButton,
      inputsDisabled,
      playSelection,
    ],
  );

  const handleStopLossPresetPress = useCallback(
    (percentage: number) => {
      if (inputsDisabled) {
        return;
      }
      if (enableHaptics) {
        playSelection().catch(() => undefined);
      }
      handleStopLossPercentageButton(percentage);
    },
    [
      enableHaptics,
      handleStopLossPercentageButton,
      inputsDisabled,
      playSelection,
    ],
  );

  // The screen's dismissal is load-bearing: its Clear went unresponsive while
  // the keypad was up. The sheet's Clear responds on the first tap, so it
  // keeps the keypad open and closes only via Done.
  const handleTakeProfitClear = useCallback(() => {
    if (focusedInput && !isSheet) {
      dismissKeypad();
    }
    if (enableHaptics) {
      playSelection().catch(() => undefined);
    }
    handleTakeProfitOff();
  }, [
    focusedInput,
    isSheet,
    dismissKeypad,
    enableHaptics,
    handleTakeProfitOff,
    playSelection,
  ]);

  const handleStopLossClear = useCallback(() => {
    if (focusedInput && !isSheet) {
      dismissKeypad();
    }
    if (enableHaptics) {
      playSelection().catch(() => undefined);
    }
    handleStopLossOff();
  }, [
    focusedInput,
    isSheet,
    dismissKeypad,
    enableHaptics,
    handleStopLossOff,
    playSelection,
  ]);

  const cancelButtonProps = useMemo(
    () => ({
      children: strings('perps.tpsl.cancel'),
      onPress: handleBack,
      size: ButtonSize.Lg,
      ...(isSheet ? { twClassName: 'rounded-xl bg-muted' } : {}),
      testID: PerpsTPSLViewSelectorsIDs.CANCEL_BUTTON,
    }),
    [handleBack, isSheet],
  );

  const setButtonProps = useMemo(
    () => ({
      children: isSheet
        ? strings('perps.order.tpsl_modal.save')
        : strings('perps.tpsl.set'),
      onPress: handleConfirm,
      size: ButtonSize.Lg,
      isDisabled: confirmDisabled,
      isLoading: isUpdating,
      testID: PerpsTPSLViewSelectorsIDs.SET_BUTTON,
    }),
    [handleConfirm, confirmDisabled, isSheet, isUpdating],
  );

  const doneButtonProps = useMemo(
    () => ({
      children: strings('perps.tpsl.done'),
      onPress: dismissKeypad,
      size: ButtonSize.Lg,
      testID: PerpsTPSLViewSelectorsIDs.DONE_BUTTON,
    }),
    [dismissKeypad],
  );

  const keypadPresets = useMemo(() => {
    if (!focusedInput) {
      return [];
    }

    const isTakeProfit =
      focusedInput === 'takeProfitPrice' ||
      focusedInput === 'takeProfitPercentage';

    if (isTakeProfit) {
      return TP_SL_VIEW_CONFIG.TakeProfitRoePresets.map((percentage) => ({
        key: `take-profit-${percentage}`,
        // Take profit presets are stored unsigned, stop loss presets negative.
        label: `+${percentage}%`,
        testID: getPerpsTPSLViewSelector.takeProfitPercentageButton(percentage),
        onPress: () => handleTakeProfitPresetPress(percentage),
      }));
    }

    return TP_SL_VIEW_CONFIG.StopLossRoePresets.map((percentage) => ({
      key: `stop-loss-${percentage}`,
      label: `${percentage}%`,
      testID: getPerpsTPSLViewSelector.stopLossPercentageButton(percentage),
      onPress: () => handleStopLossPresetPress(percentage),
    }));
  }, [focusedInput, handleStopLossPresetPress, handleTakeProfitPresetPress]);

  const entryPriceDisplay =
    position &&
    position.entryPrice !== undefined &&
    position.entryPrice !== null &&
    position.entryPrice !== 'null' &&
    position.entryPrice !== '0.00'
      ? formatPerpsFiat(position.entryPrice, {
          ranges: PRICE_RANGES_UNIVERSAL,
        })
      : PERPS_CONSTANTS.FallbackPriceDisplay;

  const currentPriceDisplay =
    currentPrice !== undefined && currentPrice !== null
      ? formatPerpsFiat(currentPrice, {
          ranges: PRICE_RANGES_UNIVERSAL,
        })
      : PERPS_CONSTANTS.FallbackPriceDisplay;

  const hasLiquidationPrice =
    displayLiquidationPrice !== undefined &&
    displayLiquidationPrice !== null &&
    displayLiquidationPrice !== 'null' &&
    displayLiquidationPrice !== '0.00';

  const liquidationPriceDisplay = hasLiquidationPrice
    ? formatPerpsFiat(displayLiquidationPrice, {
        ranges: PRICE_RANGES_UNIVERSAL,
      })
    : PERPS_CONSTANTS.FallbackPriceDisplay;

  // Sheet-only: the control arm must keep the plain liquidation price it ships
  // with today, or the experiment measures two changes at once.
  const liquidationDistanceDisplay = useMemo(() => {
    if (!isSheet || !hasLiquidationPrice || !currentPrice) {
      return undefined;
    }

    const parsedLiquidationPrice = Number.parseFloat(
      String(displayLiquidationPrice),
    );
    if (!Number.isFinite(parsedLiquidationPrice)) {
      return undefined;
    }

    const distance = clampLiquidationDistance(
      calculateLiquidationDistance(currentPrice, parsedLiquidationPrice),
    );

    return `${distance.toFixed(LIQUIDATION_DISTANCE_DECIMALS)}%`;
  }, [currentPrice, displayLiquidationPrice, hasLiquidationPrice, isSheet]);

  const takeProfitHasError = !isValid && Boolean(takeProfitError);
  const stopLossHasError = !isValid && Boolean(stopLossError);
  const stopLossErrorMessage =
    !isValid && (stopLossError || stopLossLiquidationError)
      ? stopLossError || stopLossLiquidationError
      : undefined;

  const formatExpectedPnL = (pnl: number) =>
    pnl >= 0
      ? strings('perps.tpsl.expected_profit', {
          amount: formatPerpsFiat(Math.abs(pnl), {
            ranges: PRICE_RANGES_MINIMAL_VIEW,
          }),
        })
      : strings('perps.tpsl.expected_loss', {
          amount: formatPerpsFiat(Math.abs(pnl), {
            ranges: PRICE_RANGES_MINIMAL_VIEW,
          }),
        });

  // ButtonTertiary hardcodes `text-default` through `textClassName`, which
  // beats `textProps.color`, so the blue has to come through that same prop.
  // Only spread it for the sheet: passing `undefined` would clobber the
  // variant's own resolver rather than fall back to it.
  const clearColorProps = isSheet
    ? { textClassName: getClearTextClassName }
    : {};

  // Spread rather than pass `undefined`, which would wipe out Label's own
  // BodyMd default instead of falling back to it.
  const sectionLabelProps = isSheet
    ? {
        color: TextColor.TextAlternative,
        variant: TextVariant.BodySm,
        fontWeight: FontWeight.Medium,
      }
    : { color: TextColor.TextDefault };

  const keyTextProps = isSheet ? sheetPriceKeyTextProps : priceKeyTextProps;
  const valueTextProps = isSheet
    ? sheetPriceValueTextProps
    : priceValueTextProps;

  const pricePlaceholder = isSheet
    ? SHEET_PRICE_PLACEHOLDER
    : strings('perps.tpsl.trigger_price_placeholder');
  const takeProfitPercentagePlaceholder = isSheet
    ? SHEET_PERCENTAGE_PLACEHOLDER
    : takeProfitSign === '-'
      ? strings('perps.tpsl.loss_roe_placeholder')
      : strings('perps.tpsl.profit_roe_placeholder');
  const stopLossPercentagePlaceholder = isSheet
    ? SHEET_PERCENTAGE_PLACEHOLDER
    : stopLossSign === '+'
      ? strings('perps.tpsl.gain_roe_placeholder')
      : strings('perps.tpsl.loss_roe_placeholder');

  const reviewFooter = (
    <BottomSheetFooter
      buttonsAlignment={ButtonsAlignment.Horizontal}
      secondaryButtonProps={cancelButtonProps}
      primaryButtonProps={setButtonProps}
    />
  );

  const keypad = (
    <Box twClassName="px-4 pt-2 bg-default">
      <Keypad
        value={(() => {
          if (focusedInput === 'takeProfitPrice') return takeProfitPrice;
          if (focusedInput === 'takeProfitPercentage')
            return formattedTakeProfitPercentage;
          if (focusedInput === 'stopLossPrice') return stopLossPrice;
          return formattedStopLossPercentage;
        })()}
        onChange={handleKeypadChange}
        currency={TP_SL_VIEW_CONFIG.KeypadCurrencyCode}
        decimals={
          focusedInput === 'takeProfitPercentage' ||
          focusedInput === 'stopLossPercentage'
            ? TP_SL_VIEW_CONFIG.KeypadDecimals
            : keypadDecimals
        }
      />
    </Box>
  );

  let footerContent: React.ReactNode = reviewFooter;
  if (focusedInput && isSheet) {
    footerContent = (
      <>
        {reviewFooter}
        <Box twClassName="flex-row gap-2 px-4 pt-3">
          {keypadPresets.map((preset) => (
            <Button
              key={preset.key}
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Sm}
              // ButtonBase hardcodes px-4, which clips these labels once five
              // buttons share the row. Trim the padding so the text governs.
              twClassName="flex-1 px-2"
              onPress={preset.onPress}
              testID={preset.testID}
              isDisabled={inputsDisabled}
            >
              {preset.label}
            </Button>
          ))}
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            twClassName="px-3"
            onPress={dismissKeypad}
            testID={PerpsTPSLViewSelectorsIDs.DONE_BUTTON}
          >
            {strings('perps.tpsl.done')}
          </Button>
        </Box>
        {keypad}
      </>
    );
  } else if (focusedInput) {
    footerContent = (
      <>
        <BottomSheetFooter primaryButtonProps={doneButtonProps} />
        {keypad}
      </>
    );
  }

  const body = (
    <>
      {/* The screen fills a bounded SafeAreaView, so the scroller claims the
          leftover height. A bottom sheet sizes to its content instead, and
          `flex-1` against an unbounded parent collapses the body to zero, so
          the sheet lets the same content set the height. */}
      <ScrollView
        ref={scrollViewRef}
        style={isSheet ? undefined : tw.style('flex-1')}
        contentContainerStyle={isSheet ? undefined : tw.style('grow')}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Box
          twClassName={isSheet ? undefined : 'flex-1'}
          testID="scroll-content"
        >
          {/* Current price and liquidation price info */}
          <Box twClassName={isSheet ? undefined : 'mb-6 gap-2'}>
            {position && (
              <KeyValueRow
                variant={KeyValueRowVariant.Summary}
                twClassName={isSheet ? 'h-8' : undefined}
                keyLabel={strings('perps.tpsl.entry_price')}
                value={entryPriceDisplay}
                keyTextProps={keyTextProps}
                valueTextProps={valueTextProps}
              />
            )}
            <KeyValueRow
              variant={KeyValueRowVariant.Summary}
              twClassName={isSheet ? 'h-8' : undefined}
              keyLabel={
                orderType === 'limit' &&
                limitPrice &&
                parseFloat(limitPrice) > 0
                  ? strings('perps.order.limit_price')
                  : strings('perps.tpsl.current_price')
              }
              value={currentPriceDisplay}
              keyTextProps={keyTextProps}
              valueTextProps={valueTextProps}
            />
            <KeyValueRow
              variant={KeyValueRowVariant.Summary}
              twClassName={isSheet ? 'h-8' : undefined}
              keyLabel={strings('perps.tpsl.liquidation_price')}
              value={
                liquidationDistanceDisplay ? (
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    gap={1}
                    accessible={false}
                    testID={PerpsTPSLViewSelectorsIDs.LIQUIDATION_DISTANCE}
                  >
                    <Text {...valueTextProps}>{liquidationPriceDisplay}</Text>
                    <Icon
                      name={
                        actualDirection === 'long'
                          ? IconName.TrendDown
                          : IconName.TrendUp
                      }
                      size={IconSize.Sm}
                      color={IconColor.IconAlternative}
                    />
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                      color={TextColor.TextAlternative}
                    >
                      {liquidationDistanceDisplay}
                    </Text>
                  </Box>
                ) : (
                  liquidationPriceDisplay
                )
              }
              keyTextProps={keyTextProps}
              valueTextProps={valueTextProps}
            />
          </Box>

          {/* Spacing lives on the divider so it sits equidistant from the
              rows either side of it. */}
          {isSheet ? <SectionDivider twClassName="my-4" /> : null}

          {/* Take Profit Section */}
          <View ref={takeProfitSectionRef} collapsable={false}>
            <Box twClassName={isSheet ? 'mb-2 px-4' : 'mb-6 px-4'}>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
                twClassName="mb-2 -mr-3 min-h-8"
              >
                <Label {...sectionLabelProps}>
                  {actualDirection === 'short'
                    ? strings('perps.tpsl.take_profit_short')
                    : strings('perps.tpsl.take_profit_long')}
                </Label>
                {(isSheet || Boolean(takeProfitPrice)) && (
                  <Button
                    variant={ButtonVariant.Tertiary}
                    size={ButtonSize.Sm}
                    onPress={handleTakeProfitClear}
                    isDisabled={inputsDisabled}
                    {...clearColorProps}
                    testID={PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_CLEAR_BUTTON}
                  >
                    {strings('perps.tpsl.clear')}
                  </Button>
                )}
              </Box>

              {isSheet ? null : (
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  twClassName="mb-3 gap-2"
                >
                  {TP_SL_VIEW_CONFIG.TakeProfitRoePresets.map((percentage) => (
                    <Button
                      key={percentage}
                      variant={ButtonVariant.Secondary}
                      size={ButtonSize.Md}
                      twClassName="flex-1"
                      onPress={() => handleTakeProfitPresetPress(percentage)}
                      testID={getPerpsTPSLViewSelector.takeProfitPercentageButton(
                        percentage,
                      )}
                      isDisabled={inputsDisabled}
                    >
                      {`+${percentage}%`}
                    </Button>
                  ))}
                </Box>
              )}

              <Box
                flexDirection={BoxFlexDirection.Row}
                twClassName="mb-2 gap-2"
              >
                <TextField
                  twClassName="flex-1"
                  inputRef={takeProfitPriceRef}
                  isError={takeProfitHasError}
                  value={takeProfitPrice}
                  onChangeText={(text) => {
                    const digitCount = (text.match(/\d/g) || []).length;
                    if (digitCount > TP_SL_VIEW_CONFIG.MaxInputDigits) return;
                    handleTakeProfitPriceChange(text);
                  }}
                  placeholder={pricePlaceholder}
                  isDisabled={inputsDisabled}
                  onFocus={() => {
                    handleInputFocus('takeProfitPrice');
                  }}
                  onBlur={() => handleInputBlur('takeProfitPrice')}
                  startAccessory={
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextAlternative}
                    >
                      {strings('perps.tpsl.usd_label')}
                    </Text>
                  }
                  inputProps={{
                    testID: PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_PRICE_INPUT,
                    showSoftInputOnFocus: false,
                  }}
                />
                <TextField
                  twClassName="flex-1"
                  inputRef={takeProfitPercentageRef}
                  isError={takeProfitHasError}
                  value={formattedTakeProfitPercentage}
                  onChangeText={(text) => {
                    const digitCount = (text.match(/\d/g) || []).length;
                    if (digitCount > TP_SL_VIEW_CONFIG.MaxInputDigits) return;
                    handleTakeProfitPercentageChange(text);
                  }}
                  placeholder={takeProfitPercentagePlaceholder}
                  isDisabled={inputsDisabled}
                  onFocus={() => {
                    handleInputFocus('takeProfitPercentage');
                  }}
                  onBlur={() => handleInputBlur('takeProfitPercentage')}
                  startAccessory={
                    <RoeSignBadge
                      sign={takeProfitSign}
                      onPress={handleTakeProfitSignPress}
                      testID={
                        PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_ROE_SIGN_BADGE
                      }
                      accessibilityLabel={strings(
                        'perps.tpsl.toggle_take_profit_sign',
                      )}
                      isDisabled={inputsDisabled}
                      isNeutral={isSheet}
                    />
                  }
                  endAccessory={
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextAlternative}
                    >
                      %
                    </Text>
                  }
                  inputProps={{
                    testID:
                      PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_PERCENTAGE_INPUT,
                    showSoftInputOnFocus: false,
                  }}
                />
              </Box>

              <SectionHelpText
                reserveWhenEmpty={!isSheet}
                errorTestID={PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_ERROR}
                errorMessage={
                  takeProfitHasError ? takeProfitError || undefined : undefined
                }
                expectedMessage={
                  takeProfitPrice
                    ? expectedTakeProfitPnL !== undefined
                      ? formatExpectedPnL(expectedTakeProfitPnL)
                      : PERPS_CONSTANTS.FallbackDataDisplay
                    : undefined
                }
              />
            </Box>
          </View>

          {/* Stop Loss Section */}
          <View ref={stopLossSectionRef} collapsable={false}>
            <Box twClassName={isSheet ? 'mb-2 px-4' : 'mb-6 px-4'}>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
                twClassName="mb-2 -mr-3 min-h-8"
              >
                <Label {...sectionLabelProps}>
                  {actualDirection === 'short'
                    ? strings('perps.tpsl.stop_loss_short')
                    : strings('perps.tpsl.stop_loss_long')}
                </Label>
                {(isSheet || Boolean(stopLossPrice)) && (
                  <Button
                    variant={ButtonVariant.Tertiary}
                    size={ButtonSize.Sm}
                    onPress={handleStopLossClear}
                    isDisabled={inputsDisabled}
                    {...clearColorProps}
                    testID={PerpsTPSLViewSelectorsIDs.STOP_LOSS_CLEAR_BUTTON}
                  >
                    {strings('perps.tpsl.clear')}
                  </Button>
                )}
              </Box>

              {isSheet ? null : (
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  twClassName="mb-3 gap-2"
                >
                  {TP_SL_VIEW_CONFIG.StopLossRoePresets.map((percentage) => (
                    <Button
                      key={percentage}
                      variant={ButtonVariant.Secondary}
                      size={ButtonSize.Md}
                      twClassName="flex-1"
                      onPress={() => handleStopLossPresetPress(percentage)}
                      testID={getPerpsTPSLViewSelector.stopLossPercentageButton(
                        percentage,
                      )}
                      isDisabled={inputsDisabled}
                    >
                      {`${percentage}%`}
                    </Button>
                  ))}
                </Box>
              )}

              <Box
                flexDirection={BoxFlexDirection.Row}
                twClassName="mb-2 gap-2"
              >
                <TextField
                  twClassName="flex-1"
                  inputRef={stopLossPriceRef}
                  isError={stopLossHasError}
                  value={stopLossPrice}
                  onChangeText={(text) => {
                    const digitCount = (text.match(/\d/g) || []).length;
                    if (digitCount > TP_SL_VIEW_CONFIG.MaxInputDigits) return;
                    handleStopLossPriceChange(text);
                  }}
                  placeholder={pricePlaceholder}
                  isDisabled={inputsDisabled}
                  onFocus={() => {
                    handleInputFocus('stopLossPrice');
                  }}
                  onBlur={() => handleInputBlur('stopLossPrice')}
                  startAccessory={
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextAlternative}
                    >
                      {strings('perps.tpsl.usd_label')}
                    </Text>
                  }
                  inputProps={{
                    testID: PerpsTPSLViewSelectorsIDs.STOP_LOSS_PRICE_INPUT,
                    showSoftInputOnFocus: false,
                  }}
                />
                <TextField
                  twClassName="flex-1"
                  inputRef={stopLossPercentageRef}
                  isError={stopLossHasError}
                  value={formattedStopLossPercentage}
                  onChangeText={(text) => {
                    const digitCount = (text.match(/\d/g) || []).length;
                    if (digitCount > TP_SL_VIEW_CONFIG.MaxInputDigits) return;
                    handleStopLossPercentageChange(text);
                  }}
                  placeholder={stopLossPercentagePlaceholder}
                  isDisabled={inputsDisabled}
                  onFocus={() => {
                    handleInputFocus('stopLossPercentage');
                  }}
                  onBlur={() => handleInputBlur('stopLossPercentage')}
                  startAccessory={
                    <RoeSignBadge
                      sign={stopLossSign}
                      onPress={handleStopLossSignPress}
                      testID={
                        PerpsTPSLViewSelectorsIDs.STOP_LOSS_ROE_SIGN_BADGE
                      }
                      accessibilityLabel={strings(
                        'perps.tpsl.toggle_stop_loss_sign',
                      )}
                      isDisabled={inputsDisabled}
                      isNeutral={isSheet}
                    />
                  }
                  endAccessory={
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextAlternative}
                    >
                      %
                    </Text>
                  }
                  inputProps={{
                    testID:
                      PerpsTPSLViewSelectorsIDs.STOP_LOSS_PERCENTAGE_INPUT,
                    showSoftInputOnFocus: false,
                  }}
                />
              </Box>

              <SectionHelpText
                reserveWhenEmpty={!isSheet}
                errorTestID={PerpsTPSLViewSelectorsIDs.STOP_LOSS_ERROR}
                errorMessage={stopLossErrorMessage || undefined}
                expectedMessage={
                  stopLossPrice
                    ? expectedStopLossPnL !== undefined
                      ? formatExpectedPnL(expectedStopLossPnL)
                      : PERPS_CONSTANTS.FallbackDataDisplay
                    : undefined
                }
              />
            </Box>
          </View>
        </Box>
      </ScrollView>

      <Box twClassName="px-0 pb-4 w-full" onLayout={handleKeypadFooterLayout}>
        {footerContent}
      </Box>
    </>
  );

  if (isSheet) {
    return (
      <BottomSheet
        ref={sheetRef}
        goBack={navigation.goBack}
        // The dialog surface defaults to `bg-elevated1`; this sheet sits on
        // `background.default`.
        twClassName="bg-default"
        testID={PerpsTPSLViewSelectorsIDs.BOTTOM_SHEET}
      >
        <BottomSheetHeader
          onBack={handleBack}
          backButtonProps={{ testID: PerpsTPSLViewSelectorsIDs.BACK_BUTTON }}
        >
          {strings('perps.tpsl.title')}
        </BottomSheetHeader>
        {body}
      </BottomSheet>
    );
  }

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      edges={['bottom']}
      testID={PerpsTPSLViewSelectorsIDs.BOTTOM_SHEET}
    >
      <HeaderStandard
        includesTopInset
        title={strings('perps.tpsl.title')}
        onBack={handleBack}
        backButtonProps={{ testID: PerpsTPSLViewSelectorsIDs.BACK_BUTTON }}
      />
      {body}
    </SafeAreaView>
  );
};

export default memo(PerpsTPSLView);
