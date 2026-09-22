import React, { useEffect, useMemo, useState, memo } from 'react';
import { strings } from '../../../../../../locales/i18n';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HelpText,
  HelpTextSeverity,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import Keypad from '../../../../Base/Keypad';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import {
  getPerpsDisplaySymbol,
  PERPS_CONSTANTS,
} from '@metamask/perps-controller';
import { PerpsLimitPriceBottomSheetSelectorsIDs } from '../../Perps.testIds';
import { usePerpsLiveAccount } from '../../hooks/stream';
import { usePerpsLimitPriceInput } from '../../hooks/usePerpsLimitPriceInput';
import { getIncrementalMarginInsufficientBalanceError } from '../../utils/openOrderMarginValidation';

/** Separate bid and ask buttons here, unlike the close sheet's single one. */
const LIMIT_PRESET_TEST_IDS = {
  mid: PerpsLimitPriceBottomSheetSelectorsIDs.PRESET_MID,
  bid: PerpsLimitPriceBottomSheetSelectorsIDs.PRESET_BID,
  ask: PerpsLimitPriceBottomSheetSelectorsIDs.PRESET_ASK,
  percentPrefix: PerpsLimitPriceBottomSheetSelectorsIDs.PRESET_PERCENT,
};

interface PerpsLimitPriceBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (limitPrice: string) => void;
  asset: string;
  limitPrice?: string;
  currentPrice?: number;
  direction?: 'long' | 'short';
  isClosingPosition?: boolean;
  /** When set (open-order price edit), enable incremental margin validation. */
  restingOrderSize?: string;
  /** Effective asset leverage for open-order margin validation. */
  leverage?: number;
  /** Skip margin validation for reduce-only close orders. */
  reduceOnly?: boolean;
  /** When false during open-order edit, hold confirm until market leverage is ready. */
  isMarketDataReady?: boolean;
}

/**
 * PerpsLimitPriceBottomSheet
 * Modal for setting limit order prices with direction-specific presets
 *
 * Features:
 * - Direction-aware presets (Long: Mid, Bid, -1%, -2% | Short: Mid, Ask, +1%, +2%)
 * - Custom keypad for price input
 * - Real-time current market price display
 * - Automatic preset calculation based on current price
 */
const PerpsLimitPriceBottomSheet: React.FC<PerpsLimitPriceBottomSheetProps> = ({
  isVisible,
  onClose,
  onConfirm,
  asset,
  limitPrice: initialLimitPrice,
  currentPrice: passedCurrentPrice = 0,
  direction = 'long',
  isClosingPosition = false,
  restingOrderSize,
  leverage = PERPS_CONSTANTS.DefaultMaxLeverage,
  reduceOnly = false,
  isMarketDataReady = true,
}) => {
  // Initialize with initial limit price or empty to show placeholder
  const [limitPrice, setLimitPrice] = useState(initialLimitPrice || '');

  const {
    currentPrice,
    formattedLimitPrice,
    presets,
    exceedsMaxDeviation,
    directionWarning,
    handleKeypadChange,
    trackInputMethod,
    resetInputMethod,
  } = usePerpsLimitPriceInput({
    asset,
    currentPrice: passedCurrentPrice,
    direction,
    limitPrice,
    setLimitPrice,
    isClosingPosition,
    enabled: isVisible,
    testIDs: LIMIT_PRESET_TEST_IDS,
  });

  const isOpenOrderPriceEdit = restingOrderSize !== undefined;
  const { account, isInitialLoading: isAccountLoading } = usePerpsLiveAccount({
    enabled: isVisible && isOpenOrderPriceEdit,
  });
  const isAccountReady = !isAccountLoading && account !== null;
  const spendableBalance = Number.parseFloat(account?.spendableBalance ?? '0');

  useEffect(() => {
    if (isVisible) {
      // Re-seed from props whenever visibility or the target order's price
      // changes — otherwise switching edit targets while mounted keeps the
      // previous order's typed keypad value.
      setLimitPrice(initialLimitPrice || '');
      resetInputMethod(); // Reset input method tracking for new session
    }
  }, [initialLimitPrice, isVisible, resetInputMethod]);

  const handleConfirm = () => {
    // Remove any formatting (commas, dollar signs) before passing the value
    const cleanPrice = limitPrice.replace(/[$,]/g, '');

    trackInputMethod();

    // Only call onConfirm; parent controls visibility. Avoid calling onClose here
    // to distinguish between confirm vs dismiss (onClose used for cancel/dismiss).
    onConfirm(cleanPrice);
  };

  const marginError = useMemo(() => {
    if (!isOpenOrderPriceEdit || !isAccountReady || !isMarketDataReady) {
      return '';
    }

    const parsedEditedPrice = parseFloat(limitPrice.replace(/[$,]/g, ''));
    const parsedInitialPrice = parseFloat(
      (initialLimitPrice ?? '').replace(/[$,]/g, ''),
    );
    const parsedSize = parseFloat((restingOrderSize ?? '').replace(/,/g, ''));
    if (
      !Number.isFinite(parsedEditedPrice) ||
      parsedEditedPrice <= 0 ||
      !Number.isFinite(parsedSize) ||
      parsedSize <= 0
    ) {
      return '';
    }

    const editedNotionalUsd = parsedSize * parsedEditedPrice;
    const currentNotionalUsd =
      Number.isFinite(parsedInitialPrice) && parsedInitialPrice > 0
        ? parsedSize * parsedInitialPrice
        : 0;

    return getIncrementalMarginInsufficientBalanceError({
      editedNotionalUsd,
      currentNotionalUsd,
      spendableBalance,
      leverage,
      reduceOnly,
    });
  }, [
    initialLimitPrice,
    isAccountReady,
    isMarketDataReady,
    isOpenOrderPriceEdit,
    leverage,
    limitPrice,
    reduceOnly,
    restingOrderSize,
    spendableBalance,
  ]);

  const isConfirmDisabled =
    !limitPrice ||
    limitPrice === '' ||
    limitPrice === '0' ||
    parseFloat(limitPrice.replace(/[$,]/g, '')) <= 0 ||
    exceedsMaxDeviation ||
    (isOpenOrderPriceEdit && (!isAccountReady || !isMarketDataReady)) ||
    Boolean(marginError);

  const hasInputError = Boolean(
    exceedsMaxDeviation || directionWarning || marginError,
  );

  if (!isVisible) return null;

  return (
    <BottomSheet onClose={onClose}>
      <BottomSheetHeader onClose={onClose}>
        {strings('perps.order.limit_price_modal.title')}
      </BottomSheetHeader>

      <Box twClassName="gap-2 px-4">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('perps.order.limit_price')}
        </Text>
        <TextField
          testID={PerpsLimitPriceBottomSheetSelectorsIDs.PRICE_DISPLAY}
          value={formattedLimitPrice}
          isReadOnly
          isError={hasInputError}
          endAccessory={
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              USD
            </Text>
          }
          inputProps={{
            showSoftInputOnFocus: false,
          }}
        />
        {hasInputError ? (
          <HelpText severity={HelpTextSeverity.Danger} showIcon>
            {exceedsMaxDeviation
              ? strings('perps.order.limit_price_modal.limit_price_too_far')
              : marginError || directionWarning}
          </HelpText>
        ) : (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {getPerpsDisplaySymbol(asset)}-USD{' '}
            {currentPrice !== undefined && currentPrice !== null
              ? formatPerpsFiat(currentPrice, {
                  ranges: PRICE_RANGES_UNIVERSAL,
                })
              : PERPS_CONSTANTS.FallbackPriceDisplay}
          </Text>
        )}

        <Box twClassName="mb-4 flex-row gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              testID={preset.testID}
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              twClassName="flex-1"
              onPress={preset.onPress}
            >
              {preset.label}
            </Button>
          ))}
        </Box>
      </Box>

      <Box twClassName="mb-4 px-4">
        <Keypad
          value={limitPrice}
          // This is intentionaly not a real currecy
          // It is used to override the default decimals for USD with minimal changes
          currency="USD_PERPS"
          onChange={handleKeypadChange}
          decimals={5}
        />
      </Box>

      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('perps.order.limit_price_modal.set'),
          onPress: handleConfirm,
          size: ButtonSize.Lg,
          isDisabled: isConfirmDisabled,
          testID: PerpsLimitPriceBottomSheetSelectorsIDs.CONFIRM_BUTTON,
        }}
      />
    </BottomSheet>
  );
};

PerpsLimitPriceBottomSheet.displayName = 'PerpsLimitPriceBottomSheet';

export default memo(PerpsLimitPriceBottomSheet, (prevProps, nextProps) => {
  // If bottom sheet is not visible in both states, skip re-render
  if (!prevProps.isVisible && !nextProps.isVisible) {
    return true;
  }

  // Only re-render if these critical props change
  return (
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.asset === nextProps.asset &&
    prevProps.limitPrice === nextProps.limitPrice &&
    prevProps.direction === nextProps.direction &&
    prevProps.restingOrderSize === nextProps.restingOrderSize &&
    prevProps.leverage === nextProps.leverage &&
    prevProps.reduceOnly === nextProps.reduceOnly &&
    prevProps.isMarketDataReady === nextProps.isMarketDataReady &&
    prevProps.onConfirm === nextProps.onConfirm &&
    prevProps.onClose === nextProps.onClose
  );
});
