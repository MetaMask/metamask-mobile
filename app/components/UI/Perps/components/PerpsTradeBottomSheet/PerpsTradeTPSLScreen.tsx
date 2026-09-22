import {
  BottomSheetFooter,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  HelpText,
  HelpTextSeverity,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  DECIMAL_PRECISION_CONFIG,
  type OrderType,
} from '@metamask/perps-controller';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type TextInput,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { strings } from '../../../../../../locales/i18n';
import Keypad from '../../../../Base/Keypad';
import { TP_SL_VIEW_CONFIG } from '../../constants/perpsConfig';
import { usePerpsTPSLForm } from '../../hooks/usePerpsTPSLForm';
import {
  formatPerpsFiat,
  PRICE_RANGES_MINIMAL_VIEW,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import {
  getPerpsTPSLViewSelector,
  PerpsTPSLViewSelectorsIDs,
} from '../../Perps.testIds';
import { usePerpsTradeSheet } from './PerpsTradeBottomSheet';

/** Lets the keypad mount and section layout settle before measuring. */
const SCROLL_SETTLE_DELAY_MS = 50;

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
});

type TPSLInput =
  | 'takeProfitPrice'
  | 'takeProfitPercentage'
  | 'stopLossPrice'
  | 'stopLossPercentage';

interface PerpsTradeTPSLScreenProps {
  asset: string;
  amount: string;
  currentPrice: number;
  direction: 'long' | 'short';
  initialTakeProfitPrice?: string;
  initialStopLossPrice?: string;
  leverage: number;
  limitPrice?: string;
  liquidationPrice?: string;
  orderType: OrderType;
  szDecimals?: number;
  onSave: (
    takeProfitPrice?: string,
    stopLossPrice?: string,
  ) => Promise<void> | void;
}

const RoeSign: React.FC<{ sign: '+' | '-'; testID: string }> = ({
  sign,
  testID,
}) => (
  <Box
    accessible={false}
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Center}
    twClassName="h-6 w-6 shrink-0 self-center rounded-full bg-muted"
  >
    <Icon
      name={sign === '+' ? IconName.Add : IconName.Minus}
      size={IconSize.Sm}
      color={IconColor.IconAlternative}
      testID={testID}
    />
  </Box>
);

const PriceRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <Box
    accessible
    accessibilityRole="text"
    accessibilityLabel={`${label}, ${value}`}
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    paddingVertical={1}
  >
    <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
      {label}
    </Text>
    <Text variant={TextVariant.BodyMd}>{value}</Text>
  </Box>
);

const PerpsTradeTPSLScreen: React.FC<PerpsTradeTPSLScreenProps> = ({
  asset,
  amount,
  currentPrice,
  direction,
  initialTakeProfitPrice,
  initialStopLossPrice,
  leverage,
  limitPrice,
  liquidationPrice,
  orderType,
  szDecimals,
  onSave,
}) => {
  const { goBack } = usePerpsTradeSheet();
  const [isUpdating, setIsUpdating] = useState(false);
  const [focusedInput, setFocusedInput] = useState<TPSLInput | null>(null);
  const inputRefs = useRef<Record<TPSLInput, TextInput | null>>({
    takeProfitPrice: null,
    takeProfitPercentage: null,
    stopLossPrice: null,
    stopLossPercentage: null,
  });
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const takeProfitSectionRef = useRef<View>(null);
  const stopLossSectionRef = useRef<View>(null);
  // A limit order can reach this screen before its price is set, so fall back
  // to the live price for both the reference row and the TP/SL calculations.
  const parsedLimitPrice = limitPrice ? Number.parseFloat(limitPrice) : NaN;
  const usesLimitPrice = orderType === 'limit' && parsedLimitPrice > 0;
  const effectiveEntryPrice = usesLimitPrice ? parsedLimitPrice : currentPrice;

  const tpslForm = usePerpsTPSLForm({
    asset,
    amount,
    currentPrice,
    direction,
    initialTakeProfitPrice,
    initialStopLossPrice,
    isVisible: true,
    leverage,
    liquidationPrice,
    orderType,
    entryPrice: effectiveEntryPrice,
    szDecimals,
  });

  const { takeProfitPrice, stopLossPrice, takeProfitSign, stopLossSign } =
    tpslForm.formState;
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
    handleTakeProfitOff,
    handleStopLossOff,
    handleTakeProfitPercentageButton,
    handleStopLossPercentageButton,
  } = tpslForm.buttons;
  const {
    formattedTakeProfitPercentage,
    formattedStopLossPercentage,
    expectedTakeProfitPnL,
    expectedStopLossPnL,
  } = tpslForm.display;

  const currentPriceDisplay = formatPerpsFiat(effectiveEntryPrice, {
    ranges: PRICE_RANGES_UNIVERSAL,
  });
  const liquidationPriceDisplay = liquidationPrice
    ? formatPerpsFiat(liquidationPrice, {
        ranges: PRICE_RANGES_UNIVERSAL,
      })
    : '--';
  // Mirror the full-screen TP/SL view: a trigger-price message only surfaces
  // once the form as a whole is invalid, so a stale string can never block Save
  // on its own.
  const { hasChanges, isValid } = tpslForm.validation;
  const takeProfitErrorMessage =
    !isValid && tpslForm.validation.takeProfitError
      ? tpslForm.validation.takeProfitError
      : undefined;
  const stopLossErrorMessage = !isValid
    ? tpslForm.validation.stopLossError ||
      tpslForm.validation.stopLossLiquidationError ||
      undefined
    : undefined;
  const inputsDisabled = isUpdating;
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

  // Low-value assets need more decimals than the USD default so a trigger
  // price like $0.00214 can be entered.
  const keypadDecimals =
    effectiveEntryPrice > 0 && Number.isFinite(effectiveEntryPrice)
      ? Math.min(
          Math.max(
            2,
            Math.floor(-Math.log10(effectiveEntryPrice)) +
              DECIMAL_PRECISION_CONFIG.MaxSignificantFigures,
          ),
          DECIMAL_PRECISION_CONFIG.MaxPriceDecimals,
        )
      : DECIMAL_PRECISION_CONFIG.MaxPriceDecimals;

  const enforceDigitLimit = useCallback(
    (handler: (value: string) => void) => (value: string) => {
      const digitCount = (value.match(/\d/g) || []).length;
      if (digitCount <= TP_SL_VIEW_CONFIG.MaxInputDigits) {
        handler(value);
      }
    },
    [],
  );

  const handleInputFocus = useCallback(
    (input: TPSLInput) => {
      setFocusedInput(input);

      switch (input) {
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
      handleStopLossPercentageFocus,
      handleStopLossPriceFocus,
      handleTakeProfitPercentageFocus,
      handleTakeProfitPriceFocus,
    ],
  );

  const handleInputBlur = useCallback(
    (input: TPSLInput) => {
      switch (input) {
        case 'takeProfitPrice':
          handleTakeProfitPriceBlur();
          break;
        case 'takeProfitPercentage':
          handleTakeProfitPercentageBlur();
          break;
        case 'stopLossPrice':
          handleStopLossPriceBlur();
          break;
        case 'stopLossPercentage':
          handleStopLossPercentageBlur();
          break;
      }

      // Keep the keypad mounted when focus moves straight to another field.
      setFocusedInput((current) => (current === input ? null : current));
    },
    [
      handleStopLossPercentageBlur,
      handleStopLossPriceBlur,
      handleTakeProfitPercentageBlur,
      handleTakeProfitPriceBlur,
    ],
  );

  const dismissKeypad = useCallback(() => {
    if (focusedInput) {
      inputRefs.current[focusedInput]?.blur();
    }
    setFocusedInput(null);
  }, [focusedInput]);

  const handleTakeProfitClear = useCallback(() => {
    dismissKeypad();
    handleTakeProfitOff();
  }, [dismissKeypad, handleTakeProfitOff]);

  const handleStopLossClear = useCallback(() => {
    dismissKeypad();
    handleStopLossOff();
  }, [dismissKeypad, handleStopLossOff]);

  const handleKeypadChange = useCallback(
    ({ value }: { value: string; valueAsNumber: number }) => {
      switch (focusedInput) {
        case 'takeProfitPrice':
          enforceDigitLimit(handleTakeProfitPriceChange)(value);
          break;
        case 'takeProfitPercentage':
          enforceDigitLimit(handleTakeProfitPercentageChange)(value);
          break;
        case 'stopLossPrice':
          enforceDigitLimit(handleStopLossPriceChange)(value);
          break;
        case 'stopLossPercentage':
          enforceDigitLimit(handleStopLossPercentageChange)(value.trim());
          break;
      }
    },
    [
      enforceDigitLimit,
      focusedInput,
      handleStopLossPercentageChange,
      handleStopLossPriceChange,
      handleTakeProfitPercentageChange,
      handleTakeProfitPriceChange,
    ],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  // The keypad shrinks the scroll viewport, so keep the focused section — and
  // the validation message underneath it — inside what is left.
  const scrollSectionIntoView = useCallback((input: TPSLInput) => {
    const section =
      input === 'takeProfitPrice' || input === 'takeProfitPercentage'
        ? takeProfitSectionRef.current
        : stopLossSectionRef.current;
    const scrollView = scrollViewRef.current;
    if (!section || !scrollView) {
      return;
    }

    section.measureInWindow((_x, sectionY, _width, sectionHeight) => {
      (scrollView as unknown as View).measureInWindow(
        (_viewX, viewY, _viewWidth, viewHeight) => {
          const margin = 16;
          const sectionBottom = sectionY + sectionHeight;
          const visibleBottom = viewY + viewHeight - margin;
          const visibleTop = viewY + margin;

          let delta = 0;
          if (sectionBottom > visibleBottom) {
            delta = sectionBottom - visibleBottom;
          } else if (sectionY < visibleTop) {
            delta = sectionY - visibleTop;
          }

          if (Math.abs(delta) > 1) {
            scrollView.scrollTo({
              y: Math.max(0, scrollOffsetRef.current + delta),
              animated: true,
            });
          }
        },
      );
    });
  }, []);

  // Runs after the keypad mounts and after a validation message changes the
  // section height.
  useEffect(() => {
    if (!focusedInput) {
      return undefined;
    }
    const timeoutId = setTimeout(
      () => scrollSectionIntoView(focusedInput),
      SCROLL_SETTLE_DELAY_MS,
    );
    return () => clearTimeout(timeoutId);
  }, [
    focusedInput,
    scrollSectionIntoView,
    stopLossErrorMessage,
    takeProfitErrorMessage,
  ]);

  const handleKeypadFooterLayout = useCallback(() => {
    if (focusedInput) {
      scrollSectionIntoView(focusedInput);
    }
  }, [focusedInput, scrollSectionIntoView]);

  const keypadValue = useMemo(() => {
    switch (focusedInput) {
      case 'takeProfitPrice':
        return takeProfitPrice;
      case 'takeProfitPercentage':
        return formattedTakeProfitPercentage;
      case 'stopLossPrice':
        return stopLossPrice;
      case 'stopLossPercentage':
        return formattedStopLossPercentage;
      default:
        return '';
    }
  }, [
    focusedInput,
    formattedStopLossPercentage,
    formattedTakeProfitPercentage,
    stopLossPrice,
    takeProfitPrice,
  ]);

  const handleSave = useCallback(async () => {
    if (!hasChanges || !isValid || isUpdating) {
      return;
    }

    dismissKeypad();
    setIsUpdating(true);
    try {
      await onSave(
        takeProfitPrice.trim() || undefined,
        stopLossPrice.trim() || undefined,
      );
    } finally {
      setIsUpdating(false);
    }
    goBack();
  }, [
    dismissKeypad,
    goBack,
    isUpdating,
    onSave,
    hasChanges,
    isValid,
    stopLossPrice,
    takeProfitPrice,
  ]);

  const saveButtonProps = useMemo(
    () => ({
      children: strings('perps.order.tpsl_modal.save'),
      onPress: handleSave,
      size: ButtonSize.Lg,
      isDisabled: !hasChanges || !isValid || isUpdating,
      isLoading: isUpdating,
      testID: PerpsTPSLViewSelectorsIDs.SET_BUTTON,
    }),
    [handleSave, hasChanges, isUpdating, isValid],
  );

  const focusedPresets =
    focusedInput === 'takeProfitPrice' ||
    focusedInput === 'takeProfitPercentage'
      ? TP_SL_VIEW_CONFIG.TakeProfitRoePresets
      : TP_SL_VIEW_CONFIG.StopLossRoePresets;
  const handlePresetPress =
    focusedInput === 'takeProfitPrice' ||
    focusedInput === 'takeProfitPercentage'
      ? handleTakeProfitPercentageButton
      : handleStopLossPercentageButton;

  return (
    <Box accessible={false} twClassName="flex-1">
      <HeaderStandard
        title={strings('perps.tpsl.title')}
        onBack={goBack}
        backButtonProps={{
          testID: PerpsTPSLViewSelectorsIDs.BACK_BUTTON,
          accessibilityLabel: strings('navigation.back'),
        }}
      />
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Box accessible={false} paddingHorizontal={4} paddingTop={3} gap={2}>
          <PriceRow
            label={
              usesLimitPrice
                ? strings('perps.order.limit_price')
                : strings('perps.tpsl.current_price')
            }
            value={currentPriceDisplay}
          />
          <PriceRow
            label={strings('perps.tpsl.liquidation_price')}
            value={liquidationPriceDisplay}
          />
        </Box>

        <Box accessible={false} twClassName="my-3 h-px bg-muted" />

        <Box accessible={false} paddingHorizontal={4} gap={3}>
          <View ref={takeProfitSectionRef} collapsable={false}>
            <Box accessible={false} gap={3}>
              <Box
                accessible={false}
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
                twClassName="min-h-8"
              >
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings('perps.order.take_profit')}
                </Text>
                <Button
                  variant={ButtonVariant.Tertiary}
                  size={ButtonSize.Sm}
                  onPress={handleTakeProfitClear}
                  isDisabled={inputsDisabled}
                  accessibilityLabel={`${strings('perps.tpsl.clear')} ${strings(
                    'perps.order.take_profit',
                  )}`}
                  testID={PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_CLEAR_BUTTON}
                >
                  {strings('perps.tpsl.clear')}
                </Button>
              </Box>
              <Box
                accessible={false}
                flexDirection={BoxFlexDirection.Row}
                gap={2}
              >
                <TextField
                  twClassName="flex-1"
                  value={takeProfitPrice}
                  inputRef={(ref) => {
                    inputRefs.current.takeProfitPrice = ref;
                  }}
                  onChangeText={enforceDigitLimit(handleTakeProfitPriceChange)}
                  onFocus={() => handleInputFocus('takeProfitPrice')}
                  onBlur={() => handleInputBlur('takeProfitPrice')}
                  isDisabled={inputsDisabled}
                  isError={Boolean(takeProfitErrorMessage)}
                  startAccessory={
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextAlternative}
                    >
                      {strings('perps.tpsl.usd_label')}
                    </Text>
                  }
                  inputProps={{
                    keyboardType: 'decimal-pad',
                    accessibilityLabel: strings('perps.order.take_profit'),
                    testID: PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_PRICE_INPUT,
                    showSoftInputOnFocus: false,
                  }}
                />
                <TextField
                  twClassName="flex-1"
                  value={formattedTakeProfitPercentage}
                  inputRef={(ref) => {
                    inputRefs.current.takeProfitPercentage = ref;
                  }}
                  onChangeText={enforceDigitLimit(
                    handleTakeProfitPercentageChange,
                  )}
                  onFocus={() => handleInputFocus('takeProfitPercentage')}
                  onBlur={() => handleInputBlur('takeProfitPercentage')}
                  isDisabled={inputsDisabled}
                  isError={Boolean(takeProfitErrorMessage)}
                  startAccessory={
                    <RoeSign
                      sign={takeProfitSign}
                      testID={
                        PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_ROE_SIGN_BADGE
                      }
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
                    keyboardType: 'decimal-pad',
                    accessibilityLabel: `${strings(
                      'perps.order.take_profit',
                    )} ${takeProfitSign}%`,
                    testID:
                      PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_PERCENTAGE_INPUT,
                    showSoftInputOnFocus: false,
                  }}
                />
              </Box>
              {takeProfitErrorMessage ? (
                <HelpText
                  severity={HelpTextSeverity.Danger}
                  showIcon
                  testID={PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_ERROR}
                >
                  {takeProfitErrorMessage}
                </HelpText>
              ) : takeProfitPrice && expectedTakeProfitPnL !== undefined ? (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  twClassName="text-right"
                >
                  {formatExpectedPnL(expectedTakeProfitPnL)}
                </Text>
              ) : null}
            </Box>
          </View>

          <View ref={stopLossSectionRef} collapsable={false}>
            <Box accessible={false} gap={3}>
              <Box
                accessible={false}
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
                twClassName="min-h-8"
              >
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings('perps.order.stop_loss')}
                </Text>
                <Button
                  variant={ButtonVariant.Tertiary}
                  size={ButtonSize.Sm}
                  onPress={handleStopLossClear}
                  isDisabled={inputsDisabled}
                  accessibilityLabel={`${strings('perps.tpsl.clear')} ${strings(
                    'perps.order.stop_loss',
                  )}`}
                  testID={PerpsTPSLViewSelectorsIDs.STOP_LOSS_CLEAR_BUTTON}
                >
                  {strings('perps.tpsl.clear')}
                </Button>
              </Box>
              <Box
                accessible={false}
                flexDirection={BoxFlexDirection.Row}
                gap={2}
              >
                <TextField
                  twClassName="flex-1"
                  value={stopLossPrice}
                  inputRef={(ref) => {
                    inputRefs.current.stopLossPrice = ref;
                  }}
                  onChangeText={enforceDigitLimit(handleStopLossPriceChange)}
                  onFocus={() => handleInputFocus('stopLossPrice')}
                  onBlur={() => handleInputBlur('stopLossPrice')}
                  isDisabled={inputsDisabled}
                  isError={Boolean(stopLossErrorMessage)}
                  startAccessory={
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextAlternative}
                    >
                      {strings('perps.tpsl.usd_label')}
                    </Text>
                  }
                  inputProps={{
                    keyboardType: 'decimal-pad',
                    accessibilityLabel: strings('perps.order.stop_loss'),
                    testID: PerpsTPSLViewSelectorsIDs.STOP_LOSS_PRICE_INPUT,
                    showSoftInputOnFocus: false,
                  }}
                />
                <TextField
                  twClassName="flex-1"
                  value={formattedStopLossPercentage}
                  inputRef={(ref) => {
                    inputRefs.current.stopLossPercentage = ref;
                  }}
                  onChangeText={enforceDigitLimit(
                    handleStopLossPercentageChange,
                  )}
                  onFocus={() => handleInputFocus('stopLossPercentage')}
                  onBlur={() => handleInputBlur('stopLossPercentage')}
                  isDisabled={inputsDisabled}
                  isError={Boolean(stopLossErrorMessage)}
                  startAccessory={
                    <RoeSign
                      sign={stopLossSign}
                      testID={
                        PerpsTPSLViewSelectorsIDs.STOP_LOSS_ROE_SIGN_BADGE
                      }
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
                    keyboardType: 'decimal-pad',
                    accessibilityLabel: `${strings(
                      'perps.order.stop_loss',
                    )} ${stopLossSign}%`,
                    testID:
                      PerpsTPSLViewSelectorsIDs.STOP_LOSS_PERCENTAGE_INPUT,
                    showSoftInputOnFocus: false,
                  }}
                />
              </Box>
              {stopLossErrorMessage ? (
                <HelpText
                  severity={HelpTextSeverity.Danger}
                  showIcon
                  testID={PerpsTPSLViewSelectorsIDs.STOP_LOSS_ERROR}
                >
                  {stopLossErrorMessage}
                </HelpText>
              ) : stopLossPrice && expectedStopLossPnL !== undefined ? (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  twClassName="text-right"
                >
                  {formatExpectedPnL(expectedStopLossPnL)}
                </Text>
              ) : null}
            </Box>
          </View>
        </Box>

        <Box accessible={false} twClassName="my-3 h-px bg-muted" />

        <Box accessible={false} paddingHorizontal={4} paddingBottom={3}>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('perps.tooltips.tp_sl.content')}
          </Text>
        </Box>
      </ScrollView>
      <Box
        accessible={false}
        twClassName="w-full"
        onLayout={handleKeypadFooterLayout}
      >
        <BottomSheetFooter primaryButtonProps={saveButtonProps} />
        {focusedInput ? (
          <>
            <Box
              accessible={false}
              flexDirection={BoxFlexDirection.Row}
              paddingHorizontal={4}
              paddingTop={2}
              gap={2}
            >
              {focusedPresets.map((percentage) => (
                <Button
                  key={percentage}
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Md}
                  twClassName="flex-1"
                  onPress={() => handlePresetPress(percentage)}
                  isDisabled={inputsDisabled}
                  testID={
                    percentage > 0
                      ? getPerpsTPSLViewSelector.takeProfitPercentageButton(
                          percentage,
                        )
                      : getPerpsTPSLViewSelector.stopLossPercentageButton(
                          percentage,
                        )
                  }
                >
                  {percentage > 0 ? `+${percentage}%` : `${percentage}%`}
                </Button>
              ))}
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Md}
                twClassName="flex-1"
                onPress={dismissKeypad}
                testID={PerpsTPSLViewSelectorsIDs.DONE_BUTTON}
              >
                {strings('perps.tpsl.done')}
              </Button>
            </Box>
            <Box accessible={false} paddingHorizontal={4} paddingTop={2}>
              <Keypad
                value={keypadValue}
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
          </>
        ) : null}
      </Box>
    </Box>
  );
};

export default PerpsTradeTPSLScreen;
