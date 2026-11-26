import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { strings } from '../../../../../../locales/i18n';
import {
  BottomSheet,
  BottomSheetFooter,
  Box,
  ButtonSize,
  HelpText,
  HelpTextSeverity,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import Keypad from '../../../../Base/Keypad';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import {
  DECIMAL_PRECISION_CONFIG,
  getPerpsDisplaySymbol,
  PERPS_CONSTANTS,
} from '@metamask/perps-controller';
import { PerpsOrderSizeBottomSheetSelectorsIDs } from '../../Perps.testIds';
import { formatPerpsFiat } from '../../utils/formatUtils';
import { MAX_PERPS_INPUT_DIGITS } from '../../constants/perpsConfig';
import { useMinimumOrderAmount } from '../../hooks/useMinimumOrderAmount';
import {
  readAvailableToTradeUsd,
  usePerpsLiveAvailableToTrade,
} from '../../hooks/stream/usePerpsLiveAvailableToTrade';
import { usePerpsLiveAccount } from '../../hooks/stream';
import {
  getIncrementalMarginInsufficientBalanceError,
  getOpenOrderMarginBalance,
} from '../../utils/openOrderMarginValidation';
import BottomSheetHeaderGlass from '../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { useSelector } from 'react-redux';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

interface PerpsOrderSizeBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (size: string) => void;
  asset: string;
  orderSize?: string;
  limitPrice?: string;
  szDecimals?: number;
  /** Effective asset leverage (position or saved trade config) used to estimate
   * additional margin for a size increase. Prefer this over market max. */
  leverage?: number;
  /** When true, the resting order is reduce-only (close) and needs little or
   * no additional margin on size edits — skip the incremental margin check. */
  reduceOnly?: boolean;
  /** When false, market szDecimals/leverage inputs are still loading — hold
   * confirm and skip margin checks that would use misleading fallbacks. */
  isMarketDataReady?: boolean;
  /** Side of the resting order. Available to trade is reported per side. */
  direction: 'long' | 'short';
}

/**
 * Formats a raw size string for display with thousand separators on the
 * integer part while preserving in-progress typing (trailing "." or partial
 * decimals), matching the live-formatting behavior of the limit price sheet.
 */
const formatOrderSizeDisplay = (value: string): string => {
  const raw = value.replace(/,/g, '');
  if (!raw || raw === '0') {
    return '';
  }

  const [integerPart, decimalPart] = raw.split('.');
  const formattedInteger = (integerPart || '0').replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ',',
  );

  return decimalPart !== undefined
    ? `${formattedInteger}.${decimalPart}`
    : formattedInteger;
};

/**
 * Bottom sheet for editing an open limit order's size in token units.
 */
const PerpsOrderSizeBottomSheet: React.FC<PerpsOrderSizeBottomSheetProps> = ({
  isVisible,
  onClose,
  onConfirm,
  asset,
  orderSize: initialOrderSize,
  limitPrice,
  szDecimals = DECIMAL_PRECISION_CONFIG.FallbackSizeDecimals,
  leverage = PERPS_CONSTANTS.DefaultMaxLeverage,
  reduceOnly = false,
  isMarketDataReady = true,
  direction,
}) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const [orderSize, setOrderSize] = useState(initialOrderSize || '');
  const displaySymbol = getPerpsDisplaySymbol(asset);
  const { minimumOrderAmount } = useMinimumOrderAmount({ asset });
  // Only subscribe while the sheet is open; the venue figure is only needed
  // to warn when an edited size would require more margin than is available.
  const {
    availableToTrade,
    isInitialLoading: isAvailableToTradeLoading,
    isUnavailable: isAvailableToTradeStreamFailed,
  } = usePerpsLiveAvailableToTrade({
    symbol: asset,
    enabled: isVisible,
  });
  // If the venue stream fails, fall back to the account spendable balance so
  // an open order can still be resized.
  const { account } = usePerpsLiveAccount({
    enabled: isVisible && isAvailableToTradeStreamFailed,
  });
  const marginBalance = getOpenOrderMarginBalance({
    venueAvailableToTrade: readAvailableToTradeUsd(availableToTrade, direction),
    isAvailableToTradeStreamFailed,
    accountSpendableBalance: account?.spendableBalance,
  });
  // Hold confirm until a figure is known. A missing value is unknown, not
  // zero, so the margin check must not run against a coerced 0.
  const isAccountReady =
    !isAvailableToTradeLoading && marginBalance !== undefined;
  const spendableBalance = marginBalance ?? 0;
  const isInputReady = isMarketDataReady && isAccountReady;

  useEffect(() => {
    if (isVisible) {
      setOrderSize(initialOrderSize || '');
    }
  }, [initialOrderSize, isVisible]);

  const handleConfirm = () => {
    const cleanSize = orderSize.replace(/,/g, '');
    onConfirm(cleanSize);
  };

  const handleKeypadChange = useCallback(
    ({ value }: { value: string; valueAsNumber: number }) => {
      const digitCount = (value.match(/\d/g) || []).length;
      if (digitCount > MAX_PERPS_INPUT_DIGITS) {
        return;
      }
      setOrderSize(value || '');
    },
    [],
  );

  const parsedSize = parseFloat(orderSize.replace(/,/g, ''));
  const parsedLimitPrice = parseFloat(limitPrice ?? '');
  const parsedInitialSize = parseFloat(
    (initialOrderSize ?? '').replace(/,/g, ''),
  );
  const notionalUsd =
    Number.isFinite(parsedSize) &&
    parsedSize > 0 &&
    Number.isFinite(parsedLimitPrice) &&
    parsedLimitPrice > 0
      ? parsedSize * parsedLimitPrice
      : 0;
  const currentNotionalUsd =
    Number.isFinite(parsedInitialSize) &&
    parsedInitialSize > 0 &&
    Number.isFinite(parsedLimitPrice) &&
    parsedLimitPrice > 0
      ? parsedInitialSize * parsedLimitPrice
      : 0;

  const minimumSizeError = useMemo(() => {
    if (
      !Number.isFinite(parsedSize) ||
      parsedSize <= 0 ||
      minimumOrderAmount <= 0
    ) {
      return '';
    }

    if (notionalUsd > 0 && notionalUsd < minimumOrderAmount) {
      // `minimum_amount` already includes a literal "$" prefix, so the
      // amount is passed as a plain number (matches other call sites of
      // this string) rather than a pre-formatted fiat value.
      return strings('perps.order.validation.minimum_amount', {
        amount: minimumOrderAmount.toString(),
      });
    }

    return '';
  }, [minimumOrderAmount, notionalUsd, parsedSize]);

  // For open-order edits, margin already reserved by the resting order is
  // released on modify — only the incremental notional (size increase) can
  // require additional margin. Reduce-only close orders need little or no
  // extra margin, so skip this check for them entirely.
  const maximumSizeError = useMemo(() => {
    if (!isMarketDataReady || !isAccountReady) {
      return '';
    }

    if (
      !Number.isFinite(parsedSize) ||
      parsedSize <= 0 ||
      !Number.isFinite(parsedLimitPrice) ||
      parsedLimitPrice <= 0 ||
      notionalUsd <= 0
    ) {
      return '';
    }

    return getIncrementalMarginInsufficientBalanceError({
      editedNotionalUsd: notionalUsd,
      currentNotionalUsd,
      spendableBalance,
      leverage,
      reduceOnly,
    });
  }, [
    currentNotionalUsd,
    isAccountReady,
    isMarketDataReady,
    leverage,
    notionalUsd,
    parsedLimitPrice,
    parsedSize,
    reduceOnly,
    spendableBalance,
  ]);

  const sizeError = minimumSizeError || maximumSizeError;

  const formattedOrderSize = formatOrderSizeDisplay(orderSize);

  const isConfirmDisabled =
    !isInputReady ||
    !orderSize ||
    orderSize === '' ||
    orderSize === '0' ||
    !Number.isFinite(parsedSize) ||
    parsedSize <= 0 ||
    Boolean(sizeError);

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet onClose={onClose}>
      <BottomSheetHeaderGlass isGlass={isGlassHeader} onClose={onClose}>
        {strings('perps.order.size_modal.title')}
      </BottomSheetHeaderGlass>

      <Box className="gap-2 px-4">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('perps.pro_positions_panel.order_card.size')}
        </Text>
        <TextField
          testID={PerpsOrderSizeBottomSheetSelectorsIDs.SIZE_DISPLAY}
          value={formattedOrderSize}
          isReadOnly
          isError={Boolean(sizeError)}
          endAccessory={
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {displaySymbol}
            </Text>
          }
          inputProps={{
            showSoftInputOnFocus: false,
          }}
        />
        {sizeError ? (
          <HelpText severity={HelpTextSeverity.Danger} showIcon>
            {sizeError}
          </HelpText>
        ) : (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('perps.order.size_modal.order_value', {
              value:
                notionalUsd > 0
                  ? formatPerpsFiat(notionalUsd, {
                      ranges: [
                        {
                          condition: () => true,
                          threshold: 0,
                          maximumDecimals: 2,
                          minimumDecimals: 2,
                        },
                      ],
                    })
                  : PERPS_CONSTANTS.FallbackPriceDisplay,
            })}
          </Text>
        )}
      </Box>

      <Box className="mb-4 mt-4 px-4">
        {isInputReady ? (
          <Keypad
            value={orderSize}
            currency="USD_PERPS"
            onChange={handleKeypadChange}
            decimals={szDecimals}
          />
        ) : (
          <Skeleton height={240} width="100%" />
        )}
      </Box>

      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('perps.order.size_modal.set'),
          onPress: handleConfirm,
          size: ButtonSize.Lg,
          isDisabled: isConfirmDisabled,
          testID: PerpsOrderSizeBottomSheetSelectorsIDs.CONFIRM_BUTTON,
        }}
      />
    </BottomSheet>
  );
};

PerpsOrderSizeBottomSheet.displayName = 'PerpsOrderSizeBottomSheet';

export default memo(PerpsOrderSizeBottomSheet, (prevProps, nextProps) => {
  if (!prevProps.isVisible && !nextProps.isVisible) {
    return true;
  }

  return (
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.asset === nextProps.asset &&
    prevProps.orderSize === nextProps.orderSize &&
    prevProps.limitPrice === nextProps.limitPrice &&
    prevProps.szDecimals === nextProps.szDecimals &&
    prevProps.leverage === nextProps.leverage &&
    prevProps.reduceOnly === nextProps.reduceOnly &&
    prevProps.direction === nextProps.direction &&
    prevProps.isMarketDataReady === nextProps.isMarketDataReady &&
    prevProps.onConfirm === nextProps.onConfirm &&
    prevProps.onClose === nextProps.onClose
  );
});
