import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
// formatPrice import removed - using raw values for input state
import { strings } from '../../../../../locales/i18n';
import { regex } from '../../../../util/regex';
import {
  DECIMAL_PRECISION_CONFIG,
  calculatePositionSize,
  type OrderType,
  type Position,
} from '@metamask/perps-controller';
import { formatPerpsFiat, PRICE_RANGES_UNIVERSAL } from '../utils/formatUtils';
import { calculateExpectedPnL } from '../utils/pnlCalculations';
import {
  calculatePriceForRoE,
  calculateRoEForPrice,
  formatRoEPercentageDisplay,
  getStopLossErrorDirection,
  getStopLossLiquidationErrorDirection,
  getTakeProfitErrorDirection,
  hasExceededSignificantFigures,
  hasTPSLValuesChanged,
  isPositiveTriggerPrice,
  isStopLossSafeFromLiquidation,
  isValidStopLossPrice,
  isValidTakeProfitPrice,
  roundToSignificantFigures,
  safeParseRoEPercentage,
  sanitizePercentageInput,
  validateTPSLPrices,
} from '../utils/tpslValidation';
import { usePerpsOrderFees } from './usePerpsOrderFees';

/** Sign shown on the RoE badge and applied to the RoE value sent to the order. */
export type TpslRoeSign = '+' | '-';

const TAKE_PROFIT_DEFAULT_SIGN: TpslRoeSign = '+';
const STOP_LOSS_DEFAULT_SIGN: TpslRoeSign = '-';

const flipSign = (sign: TpslRoeSign): TpslRoeSign => (sign === '+' ? '-' : '+');

/** Apply a badge sign to an unsigned RoE magnitude. */
const applyRoeSign = (sign: TpslRoeSign, magnitude: number): number =>
  sign === '-' ? -Math.abs(magnitude) : Math.abs(magnitude);

/** Sign of a derived RoE string, falling back when it is empty / zero. */
const roeSignFromValue = (roe: string, fallback: TpslRoeSign): TpslRoeSign => {
  const parsed = Number.parseFloat(roe);
  if (!roe || Number.isNaN(parsed) || parsed === 0) return fallback;
  return parsed < 0 ? '-' : '+';
};

/** Format a signed RoE string as an unsigned magnitude for storage. */
const toRoeMagnitude = (roe: string): string => {
  const parsed = Number.parseFloat(roe);
  if (!roe || Number.isNaN(parsed)) return '';
  return safeParseRoEPercentage(Math.abs(parsed).toString());
};

/** Strip any leading sign so the RoE input only carries a magnitude. */
const stripRoeSign = (text: string): string => text.replace(/[+\-–—]/g, '');

interface UsePerpsTPSLFormParams {
  asset: string;
  currentPrice?: number;
  direction?: 'long' | 'short';
  position?: Position;
  initialTakeProfitPrice?: string;
  initialStopLossPrice?: string;
  leverage?: number;
  entryPrice?: number;
  isVisible?: boolean;
  liquidationPrice?: string;
  orderType?: OrderType;
  amount?: string; // For new orders - USD amount to calculate position size
  szDecimals?: number; // For new orders - asset decimal precision
}

interface TPSLFormState {
  takeProfitPrice: string;
  stopLossPrice: string;
  takeProfitPercentage: string;
  stopLossPercentage: string;
  selectedTpPercentage: number | null;
  selectedSlPercentage: number | null;
  tpPriceInputFocused: boolean;
  tpPercentInputFocused: boolean;
  slPriceInputFocused: boolean;
  slPercentInputFocused: boolean;
  tpUsingPercentage: boolean;
  slUsingPercentage: boolean;
  takeProfitSign: TpslRoeSign;
  stopLossSign: TpslRoeSign;
}

interface TPSLFormHandlers {
  handleTakeProfitPriceChange: (text: string) => void;
  handleTakeProfitPercentageChange: (text: string) => void;
  handleStopLossPriceChange: (text: string) => void;
  handleStopLossPercentageChange: (text: string) => void;
  handleTakeProfitPriceFocus: () => void;
  handleTakeProfitPriceBlur: () => void;
  handleTakeProfitPercentageFocus: () => void;
  handleTakeProfitPercentageBlur: () => void;
  handleStopLossPriceFocus: () => void;
  handleStopLossPriceBlur: () => void;
  handleStopLossPercentageFocus: () => void;
  handleStopLossPercentageBlur: () => void;
}

interface TPSLFormButtons {
  handleTakeProfitPercentageButton: (roePercentage: number) => void;
  handleStopLossPercentageButton: (roePercentage: number) => void;
  handleTakeProfitOff: () => void;
  handleStopLossOff: () => void;
  handleTakeProfitSignToggle: () => void;
  handleStopLossSignToggle: () => void;
}

interface TPSLFormValidation {
  isValid: boolean;
  hasChanges: boolean;
  takeProfitError: string;
  stopLossError: string;
  stopLossLiquidationError: string;
}

interface TPSLFormDisplay {
  formattedTakeProfitPercentage: string;
  formattedStopLossPercentage: string;
  expectedTakeProfitPnL?: number;
  expectedStopLossPnL?: number;
}

export interface UsePerpsTPSLFormReturn {
  formState: TPSLFormState;
  handlers: TPSLFormHandlers;
  buttons: TPSLFormButtons;
  validation: TPSLFormValidation;
  display: TPSLFormDisplay;
}

/**
 * Resolves the inline error for one trigger price field.
 *
 * A non-positive price is reported first: it is rejected by the protocol
 * regardless of which side of the reference price it falls on, and the
 * direction rules on their own would let it through.
 *
 * @param price - The current trigger price value, empty when the field is unset
 * @param isOnValidSide - Whether the price sits on the correct side of the reference price
 * @param getWrongSideMessage - Builds the direction-specific message for a wrong-side price
 * @returns The message to show under the field, or an empty string when there is nothing to report
 */
const resolveTriggerPriceError = (
  price: string,
  isOnValidSide: boolean,
  getWrongSideMessage: () => string,
): string => {
  if (!price) return '';

  if (!isPositiveTriggerPrice(price)) {
    return strings('perps.tpsl.trigger_price_must_be_positive');
  }

  return isOnValidSide ? '' : getWrongSideMessage();
};

/**
 * Custom hook to manage TPSL form state, validation, and business logic
 * Handles source of truth management to prevent input interference
 *
 * @param params Configuration object with asset, prices, position info
 * @returns Object containing form state, handlers, validation, and display helpers
 */
export function usePerpsTPSLForm(
  params: UsePerpsTPSLFormParams,
): UsePerpsTPSLFormReturn {
  const {
    asset,
    currentPrice: initialCurrentPrice,
    direction,
    position,
    initialTakeProfitPrice,
    initialStopLossPrice,
    leverage: propLeverage,
    entryPrice: propEntryPrice,
    isVisible = false,
    liquidationPrice,
    orderType,
    amount,
    szDecimals,
  } = params;

  // Initialize form state with raw values (no currency formatting for inputs)
  // Don't default to empty string - preserve undefined to properly clear values
  const [takeProfitPrice, setTakeProfitPrice] = useState(
    initialTakeProfitPrice ?? '',
  );
  const [stopLossPrice, setStopLossPrice] = useState(
    initialStopLossPrice ?? '',
  );
  const [takeProfitPercentage, setTakeProfitPercentage] = useState('');
  const [stopLossPercentage, setStopLossPercentage] = useState('');

  // Focus states for source of truth management
  const [tpPriceInputFocused, setTpPriceInputFocused] = useState(false);
  const [tpPercentInputFocused, setTpPercentInputFocused] = useState(false);
  const [slPriceInputFocused, setSlPriceInputFocused] = useState(false);
  const [slPercentInputFocused, setSlPercentInputFocused] = useState(false);

  // Source of truth tracking to prevent input interference
  const [tpSourceOfTruth, setTpSourceOfTruth] = useState<
    'price' | 'percentage' | null
  >(null);
  const [slSourceOfTruth, setSlSourceOfTruth] = useState<
    'price' | 'percentage' | null
  >(null);

  // Button selection states
  const [selectedTpPercentage, setSelectedTpPercentage] = useState<
    number | null
  >(null);
  const [selectedSlPercentage, setSelectedSlPercentage] = useState<
    number | null
  >(null);

  // Usage tracking for analytics
  const [tpUsingPercentage, setTpUsingPercentage] = useState(false);
  const [slUsingPercentage, setSlUsingPercentage] = useState(false);

  // RoE sign per section. The badge owns the sign; the percentage input only
  // carries an unsigned magnitude. Signed RoE (sign × magnitude) drives the
  // trigger-price math and the confirm payload.
  const [takeProfitSign, setTakeProfitSign] = useState<TpslRoeSign>(
    TAKE_PROFIT_DEFAULT_SIGN,
  );
  const [stopLossSign, setStopLossSign] = useState<TpslRoeSign>(
    STOP_LOSS_DEFAULT_SIGN,
  );

  // Calculate derived values
  const currentPrice =
    initialCurrentPrice ||
    (position?.entryPrice ? Number.parseFloat(position.entryPrice) : 0);

  let actualDirection: 'long' | 'short';
  if (position) {
    actualDirection = Number.parseFloat(position.size) > 0 ? 'long' : 'short';
  } else {
    actualDirection = direction || 'long';
  }

  const leverage = position?.leverage?.value || propLeverage;
  const entryPrice = position?.entryPrice
    ? Number.parseFloat(position.entryPrice)
    : propEntryPrice || currentPrice;

  // Reset form state when bottom sheet becomes visible with new initial values
  useEffect(() => {
    if (isVisible) {
      // Update prices from initial values (including undefined to clear)
      setTakeProfitPrice(initialTakeProfitPrice ?? '');
      setStopLossPrice(initialStopLossPrice ?? '');

      // Ensure we have valid prices before calculating RoE
      const hasValidPrices =
        (entryPrice && entryPrice > 0) || (currentPrice && currentPrice > 0);

      if (hasValidPrices && leverage) {
        // Calculate initial RoE percentages when opening
        if (initialTakeProfitPrice) {
          const roePercent = calculateRoEForPrice(
            initialTakeProfitPrice,
            true,
            !!position,
            {
              currentPrice,
              direction: actualDirection,
              leverage,
              entryPrice,
            },
          );
          setTakeProfitPercentage(toRoeMagnitude(roePercent));
          setTakeProfitSign(
            roeSignFromValue(roePercent, TAKE_PROFIT_DEFAULT_SIGN),
          );
        } else {
          setTakeProfitPercentage('');
          setTakeProfitSign(TAKE_PROFIT_DEFAULT_SIGN);
        }

        if (initialStopLossPrice) {
          const roePercent = calculateRoEForPrice(
            initialStopLossPrice,
            false,
            !!position,
            {
              currentPrice,
              direction: actualDirection,
              leverage,
              entryPrice,
            },
          );
          setStopLossPercentage(toRoeMagnitude(roePercent));
          setStopLossSign(roeSignFromValue(roePercent, STOP_LOSS_DEFAULT_SIGN));
        } else {
          setStopLossPercentage('');
          setStopLossSign(STOP_LOSS_DEFAULT_SIGN);
        }
      } else {
        setTakeProfitSign(TAKE_PROFIT_DEFAULT_SIGN);
        setStopLossSign(STOP_LOSS_DEFAULT_SIGN);
      }

      // Clear selection states when reopening
      setSelectedTpPercentage(null);
      setSelectedSlPercentage(null);
      setTpUsingPercentage(false);
      setSlUsingPercentage(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, initialTakeProfitPrice, initialStopLossPrice]); // Run when visibility or initial values change

  // Update ROE% display when leverage changes (keep trigger prices constant)
  // Prevent updates when user is actively editing to avoid input interference
  const prevLeverageRef = useRef(leverage);
  useEffect(() => {
    const leverageChanged = prevLeverageRef.current !== leverage;
    prevLeverageRef.current = leverage;

    // Ensure we have valid prices before calculating RoE
    const hasValidPrices =
      (entryPrice && entryPrice > 0) || (currentPrice && currentPrice > 0);

    if (leverage && isVisible && hasValidPrices) {
      // For take profit: recalculate ROE% based on new leverage or price
      // Only update if user is not actively editing the percentage field or if this is a leverage change
      if (
        takeProfitPrice &&
        (leverageChanged ||
          (tpSourceOfTruth !== 'percentage' && !tpPercentInputFocused))
      ) {
        const roePercent = calculateRoEForPrice(
          takeProfitPrice,
          true,
          !!position,
          {
            currentPrice,
            direction: actualDirection,
            leverage,
            entryPrice,
          },
        );
        setTakeProfitPercentage(toRoeMagnitude(roePercent));
        setTakeProfitSign(
          roeSignFromValue(roePercent, TAKE_PROFIT_DEFAULT_SIGN),
        );
        // Only clear button selection if leverage changed (not on price updates)
        if (leverageChanged) {
          setSelectedTpPercentage(null);
        }
      }

      // For stop loss: recalculate ROE% based on new leverage or price
      // Only update if user is not actively editing the percentage field or if this is a leverage change
      if (
        stopLossPrice &&
        (leverageChanged ||
          (slSourceOfTruth !== 'percentage' && !slPercentInputFocused))
      ) {
        const roePercent = calculateRoEForPrice(
          stopLossPrice,
          false,
          !!position,
          {
            currentPrice,
            direction: actualDirection,
            leverage,
            entryPrice,
          },
        );
        setStopLossPercentage(toRoeMagnitude(roePercent));
        setStopLossSign(roeSignFromValue(roePercent, STOP_LOSS_DEFAULT_SIGN));
        // Only clear button selection if leverage changed (not on price updates)
        if (leverageChanged) {
          setSelectedSlPercentage(null);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    leverage,
    currentPrice,
    actualDirection,
    entryPrice,
    isVisible,
    takeProfitPrice,
    stopLossPrice,
    tpSourceOfTruth,
    tpPercentInputFocused,
    slSourceOfTruth,
    slPercentInputFocused,
  ]);

  // Input change handlers
  const handleTakeProfitPriceChange = useCallback(
    (text: string) => {
      // Allow only numbers and decimal point
      const sanitized = text.replace(/[^0-9.]/g, '');
      // Prevent multiple decimal points
      const parts = sanitized.split('.');
      if (parts.length > 2) return;
      // Allow erasing but prevent adding when there are more than MAX_PRICE_DECIMALS decimal places
      if (
        parts[1]?.length > DECIMAL_PRECISION_CONFIG.MaxPriceDecimals &&
        sanitized.length >= takeProfitPrice.length
      )
        return;

      if (
        hasExceededSignificantFigures(
          sanitized,
          DECIMAL_PRECISION_CONFIG.MaxPriceDecimals,
        ) &&
        sanitized.length >= takeProfitPrice.length
      )
        return;

      setTakeProfitPrice(sanitized);

      // Set price as source of truth when user is actively typing
      setTpSourceOfTruth('price');

      // Update RoE percentage based on price whenever the user types a trigger
      // price. The price field is the active source of truth here, so we do not
      // gate on tpPercentInputFocused — a stale true value must not silently
      // block the auto-fill (mirrors the same reasoning in handleTakeProfitPercentageChange).
      if (
        sanitized &&
        leverage &&
        ((entryPrice && entryPrice > 0) || (currentPrice && currentPrice > 0))
      ) {
        const roePercent = calculateRoEForPrice(sanitized, true, !!position, {
          currentPrice,
          direction: actualDirection,
          leverage,
          entryPrice,
        });
        if (roePercent && roePercent !== '') {
          setTakeProfitPercentage(toRoeMagnitude(roePercent));
          setTakeProfitSign(
            roeSignFromValue(roePercent, TAKE_PROFIT_DEFAULT_SIGN),
          );
        }
      } else if (!sanitized) {
        setTakeProfitPercentage('');
      }
      setSelectedTpPercentage(null);
      setTpUsingPercentage(false); // User is manually entering price
    },
    [
      currentPrice,
      actualDirection,
      leverage,
      entryPrice,
      takeProfitPrice,
      position,
    ],
  );

  const handleTakeProfitPercentageChange = useCallback(
    (text: string) => {
      const finalValue = sanitizePercentageInput(
        stripRoeSign(text),
        takeProfitPercentage,
        DECIMAL_PRECISION_CONFIG.MaxPriceDecimals,
      );
      if (finalValue === null) return; // Invalid input, don't update state

      const magnitudeText = stripRoeSign(finalValue);
      setTakeProfitPercentage(magnitudeText);

      // Set percentage as source of truth when user is actively typing
      setTpSourceOfTruth('percentage');

      // Always compute the trigger price when the user is typing a percentage.
      // The percentage field is the active source of truth here, so we do not
      // gate on tpPriceInputFocused — a stale true value (e.g. due to iOS
      // focus/blur ordering) must not silently block the auto-fill.
      if (
        magnitudeText &&
        !Number.isNaN(Number.parseFloat(magnitudeText.replace(' ', ''))) &&
        leverage
      ) {
        const magnitude = Number.parseFloat(magnitudeText.replace(' ', ''));
        const roeValue = applyRoeSign(takeProfitSign, magnitude);
        const price = calculatePriceForRoE(roeValue, true, {
          currentPrice,
          direction: actualDirection,
          leverage,
          entryPrice,
        });
        // Round to MaxPriceDecimals significant figures to match input validation
        const roundedPrice = roundToSignificantFigures(
          price.toString(),
          DECIMAL_PRECISION_CONFIG.MaxPriceDecimals,
        );
        setTakeProfitPrice(roundedPrice);
        setSelectedTpPercentage(roeValue);
      } else if (!magnitudeText) {
        setTakeProfitPrice('');
        setSelectedTpPercentage(null);
      }
      setTpUsingPercentage(true); // User is using RoE percentage-based calculation
    },
    [
      currentPrice,
      actualDirection,
      leverage,
      entryPrice,
      takeProfitPercentage,
      takeProfitSign,
    ],
  );

  const handleStopLossPriceChange = useCallback(
    (text: string) => {
      // Allow only numbers and decimal point
      const sanitized = text.replace(/[^0-9.]/g, '');
      // Prevent multiple decimal points
      const parts = sanitized.split('.');
      if (parts.length > 2) return;
      // Allow erasing but prevent adding when there are more than MAX_PRICE_DECIMALS decimal places
      if (
        parts[1]?.length > DECIMAL_PRECISION_CONFIG.MaxPriceDecimals &&
        sanitized.length >= stopLossPrice.length
      )
        return;

      if (
        hasExceededSignificantFigures(
          sanitized,
          DECIMAL_PRECISION_CONFIG.MaxPriceDecimals,
        ) &&
        sanitized.length >= stopLossPrice.length
      )
        return;

      setStopLossPrice(sanitized);

      // Set price as source of truth when user is actively typing
      setSlSourceOfTruth('price');

      // Update RoE percentage based on price whenever the user types a trigger
      // price. The price field is the active source of truth here, so we do not
      // gate on slPercentInputFocused — a stale true value must not silently
      // block the auto-fill (mirrors the same reasoning in handleStopLossPercentageChange).
      if (
        sanitized &&
        leverage &&
        ((entryPrice && entryPrice > 0) || (currentPrice && currentPrice > 0))
      ) {
        const roePercent = calculateRoEForPrice(sanitized, false, !!position, {
          currentPrice,
          direction: actualDirection,
          leverage,
          entryPrice,
        });
        if (roePercent && roePercent !== '') {
          setStopLossPercentage(toRoeMagnitude(roePercent));
          setStopLossSign(roeSignFromValue(roePercent, STOP_LOSS_DEFAULT_SIGN));
        }
      } else if (!sanitized) {
        setStopLossPercentage('');
      }
      setSelectedSlPercentage(null);
      setSlUsingPercentage(false); // User is manually entering price
    },
    [
      currentPrice,
      actualDirection,
      leverage,
      entryPrice,
      stopLossPrice,
      position,
    ],
  );

  const handleStopLossPercentageChange = useCallback(
    (text: string) => {
      const finalValue = sanitizePercentageInput(
        stripRoeSign(text),
        stopLossPercentage,
        DECIMAL_PRECISION_CONFIG.MaxPriceDecimals,
      );
      if (finalValue === null) return; // Invalid input, don't update state

      const magnitudeText = stripRoeSign(finalValue);
      setStopLossPercentage(magnitudeText);

      // Set percentage as source of truth when user is actively typing
      setSlSourceOfTruth('percentage');

      // Always compute the trigger price when the user is typing a percentage.
      // The percentage field is the active source of truth here, so we do not
      // gate on slPriceInputFocused — a stale true value (e.g. due to iOS
      // focus/blur ordering) must not silently block the auto-fill.
      if (
        magnitudeText &&
        !Number.isNaN(Number.parseFloat(magnitudeText.replace(' ', ''))) &&
        leverage
      ) {
        const magnitude = Number.parseFloat(magnitudeText.replace(' ', ''));
        const roeValue = applyRoeSign(stopLossSign, magnitude);
        const price = calculatePriceForRoE(roeValue, false, {
          currentPrice,
          direction: actualDirection,
          leverage,
          entryPrice,
        });
        // Round to MaxPriceDecimals significant figures to match input validation
        const roundedPrice = roundToSignificantFigures(
          price.toString(),
          DECIMAL_PRECISION_CONFIG.MaxPriceDecimals,
        );
        setStopLossPrice(roundedPrice);
        setSelectedSlPercentage(roeValue);
      } else if (!magnitudeText) {
        setStopLossPrice('');
        setSelectedSlPercentage(null);
      }
      setSlUsingPercentage(true); // User is using RoE percentage-based calculation
    },
    [
      currentPrice,
      actualDirection,
      leverage,
      entryPrice,
      stopLossPercentage,
      stopLossSign,
    ],
  );

  // Focus/blur event handlers to manage source of truth and prevent input interference
  const handleTakeProfitPriceFocus = useCallback(() => {
    setTpPriceInputFocused(true);
    setTpSourceOfTruth('price');
  }, []);

  const handleTakeProfitPriceBlur = useCallback(() => {
    setTpPriceInputFocused(false);
    setTpSourceOfTruth(null); // Clear source of truth to allow bidirectional updates
    // Don't format input value on blur - keep it as clean number for input
    // Update percentage field if we have a valid price and leverage and valid entry price
    if (
      takeProfitPrice &&
      leverage &&
      !Number.isNaN(Number.parseFloat(takeProfitPrice)) &&
      ((entryPrice && entryPrice > 0) || (currentPrice && currentPrice > 0))
    ) {
      const roePercent = calculateRoEForPrice(
        takeProfitPrice,
        true,
        !!position,
        {
          currentPrice,
          direction: actualDirection,
          leverage,
          entryPrice,
        },
      );
      if (roePercent && roePercent !== '') {
        const formattedPercent = toRoeMagnitude(roePercent);
        setTakeProfitPercentage(formattedPercent);
        setTakeProfitSign(
          roeSignFromValue(roePercent, TAKE_PROFIT_DEFAULT_SIGN),
        );

        // If percentage was clamped to 0, sync price to match 0% RoE
        if (formattedPercent === '0') {
          const zeroRoePrice = calculatePriceForRoE(0, true, {
            currentPrice,
            direction: actualDirection,
            leverage,
            entryPrice,
          });
          if (zeroRoePrice && zeroRoePrice !== takeProfitPrice) {
            // Round to MaxPriceDecimals significant figures to match input validation
            const roundedPrice = roundToSignificantFigures(
              zeroRoePrice.toString(),
              DECIMAL_PRECISION_CONFIG.MaxPriceDecimals,
            );
            setTakeProfitPrice(roundedPrice);
          }
        }
      }
    }
  }, [
    takeProfitPrice,
    leverage,
    currentPrice,
    actualDirection,
    entryPrice,
    position,
  ]);

  const handleTakeProfitPercentageFocus = useCallback(() => {
    setTpPercentInputFocused(true);
    setTpSourceOfTruth('percentage');
  }, []);

  const handleTakeProfitPercentageBlur = useCallback(() => {
    setTpPercentInputFocused(false);
    setTpSourceOfTruth(null); // Clear source of truth to allow bidirectional updates
    // Update price field if we have a valid percentage and leverage
    if (
      takeProfitPercentage &&
      leverage &&
      !Number.isNaN(Number.parseFloat(takeProfitPercentage.replace(' ', '')))
    ) {
      const magnitude = Number.parseFloat(
        takeProfitPercentage.replace(' ', ''),
      );
      const roeValue = applyRoeSign(takeProfitSign, magnitude);
      const price = calculatePriceForRoE(roeValue, true, {
        currentPrice,
        direction: actualDirection,
        leverage,
        entryPrice,
      });
      // Round to MaxPriceDecimals significant figures to match input validation
      const roundedPrice = roundToSignificantFigures(
        price.toString(),
        DECIMAL_PRECISION_CONFIG.MaxPriceDecimals,
      );
      setTakeProfitPrice(roundedPrice);
    }
  }, [
    takeProfitPercentage,
    takeProfitSign,
    leverage,
    currentPrice,
    actualDirection,
    entryPrice,
  ]);

  const handleStopLossPriceFocus = useCallback(() => {
    setSlPriceInputFocused(true);
    setSlSourceOfTruth('price');
  }, []);

  const handleStopLossPriceBlur = useCallback(() => {
    setSlPriceInputFocused(false);
    setSlSourceOfTruth(null); // Clear source of truth to allow bidirectional updates
    // Don't format input value on blur - keep it as clean number for input
    // Update percentage field if we have a valid price and leverage and valid entry price
    if (
      stopLossPrice &&
      leverage &&
      !Number.isNaN(Number.parseFloat(stopLossPrice)) &&
      ((entryPrice && entryPrice > 0) || (currentPrice && currentPrice > 0))
    ) {
      const roePercent = calculateRoEForPrice(
        stopLossPrice,
        false,
        !!position,
        {
          currentPrice,
          direction: actualDirection,
          leverage,
          entryPrice,
        },
      );
      if (roePercent && roePercent !== '') {
        const formattedPercent = toRoeMagnitude(roePercent);
        setStopLossPercentage(formattedPercent);
        setStopLossSign(roeSignFromValue(roePercent, STOP_LOSS_DEFAULT_SIGN));

        // If percentage was clamped to 0, sync price to match 0% RoE
        if (formattedPercent === '0') {
          const zeroRoePrice = calculatePriceForRoE(0, false, {
            currentPrice,
            direction: actualDirection,
            leverage,
            entryPrice,
          });
          if (zeroRoePrice && zeroRoePrice !== stopLossPrice) {
            // Round to MaxPriceDecimals significant figures to match input validation
            const roundedPrice = roundToSignificantFigures(
              zeroRoePrice.toString(),
              DECIMAL_PRECISION_CONFIG.MaxPriceDecimals,
            );
            setStopLossPrice(roundedPrice);
          }
        }
      }
    }
  }, [
    stopLossPrice,
    leverage,
    currentPrice,
    actualDirection,
    entryPrice,
    position,
  ]);

  const handleStopLossPercentageFocus = useCallback(() => {
    setSlPercentInputFocused(true);
    setSlSourceOfTruth('percentage');
  }, []);

  const handleStopLossPercentageBlur = useCallback(() => {
    setSlPercentInputFocused(false);
    setSlSourceOfTruth(null); // Clear source of truth to allow bidirectional updates
    // Update price field if we have a valid percentage and leverage
    if (
      stopLossPercentage &&
      leverage &&
      !Number.isNaN(Number.parseFloat(stopLossPercentage.replace(' ', '')))
    ) {
      const magnitude = Number.parseFloat(stopLossPercentage.replace(' ', ''));
      const roeValue = applyRoeSign(stopLossSign, magnitude);
      const price = calculatePriceForRoE(roeValue, false, {
        currentPrice,
        direction: actualDirection,
        leverage,
        entryPrice,
      });
      // Round to MaxPriceDecimals significant figures to match input validation
      const roundedPrice = roundToSignificantFigures(
        price.toString(),
        DECIMAL_PRECISION_CONFIG.MaxPriceDecimals,
      );
      setStopLossPrice(roundedPrice);
    }
  }, [
    stopLossPercentage,
    stopLossSign,
    leverage,
    currentPrice,
    actualDirection,
    entryPrice,
  ]);

  // Button handlers for percentage quick-select
  const handleTakeProfitPercentageButton = useCallback(
    (roePercentage: number) => {
      if (!leverage) {
        DevLogger.log(
          '[TPSL Debug] No leverage available for TP button calculation',
        );
        return;
      }

      DevLogger.log('[TPSL Debug] TP percentage button clicked:', {
        roePercentage,
        asset,
        currentPrice,
        actualDirection,
        leverage,
        entryPrice,
      });

      const price = calculatePriceForRoE(roePercentage, true, {
        currentPrice,
        direction: actualDirection,
        leverage,
        entryPrice,
      });

      // Only set values if we got a valid price
      if (price && price !== '' && Number.parseFloat(price) > 0) {
        // Round to MaxPriceDecimals significant figures to match input validation
        const roundedPrice = roundToSignificantFigures(
          price.toString(),
          DECIMAL_PRECISION_CONFIG.MaxPriceDecimals,
        );
        const formattedPriceString = formatPerpsFiat(roundedPrice, {
          ranges: PRICE_RANGES_UNIVERSAL,
        });
        const sanitizedPriceString = formattedPriceString.replace(
          regex.nonNumber,
          '',
        );
        setTakeProfitPrice(sanitizedPriceString);
        setTakeProfitPercentage(toRoeMagnitude(roePercentage.toString()));
        setTakeProfitSign(
          roeSignFromValue(roePercentage.toString(), TAKE_PROFIT_DEFAULT_SIGN),
        );
        setSelectedTpPercentage(roePercentage);
        setTpUsingPercentage(true);
        setTpSourceOfTruth('percentage');
      } else {
        DevLogger.log(
          '[TPSL Debug] Invalid take profit price calculated, not updating',
          { price, roePercentage, entryPrice, currentPrice },
        );
      }
    },
    [asset, currentPrice, actualDirection, leverage, entryPrice],
  );

  const handleStopLossPercentageButton = useCallback(
    (roePercentage: number) => {
      if (!leverage) {
        DevLogger.log(
          '[TPSL Debug] No leverage available for SL button calculation',
        );
        return;
      }

      DevLogger.log('[TPSL Debug] SL percentage button clicked:', {
        roePercentage,
        asset,
        currentPrice,
        actualDirection,
        leverage,
        entryPrice,
      });

      // For stop loss buttons, we want negative RoE (loss)
      const price = calculatePriceForRoE(roePercentage, false, {
        currentPrice,
        direction: actualDirection,
        leverage,
        entryPrice,
      });

      // Only set values if we got a valid price
      if (price && price !== '' && Number.parseFloat(price) > 0) {
        // Round to MaxPriceDecimals significant figures to match input validation
        const roundedPrice = roundToSignificantFigures(
          price.toString(),
          DECIMAL_PRECISION_CONFIG.MaxPriceDecimals,
        );
        const formattedPriceString = formatPerpsFiat(roundedPrice, {
          ranges: PRICE_RANGES_UNIVERSAL,
        });
        const sanitizedPriceString = formattedPriceString.replace(
          regex.nonNumber,
          '',
        );
        setStopLossPrice(sanitizedPriceString);
        setStopLossPercentage(toRoeMagnitude(roePercentage.toString()));
        setStopLossSign(
          roeSignFromValue(roePercentage.toString(), STOP_LOSS_DEFAULT_SIGN),
        );
      } else {
        DevLogger.log(
          '[TPSL Debug] Invalid stop loss price calculated, not updating',
          { price, roePercentage, entryPrice, currentPrice },
        );
      }
      setSelectedSlPercentage(roePercentage);
      setSlUsingPercentage(true);
      setSlSourceOfTruth('percentage');
    },
    [asset, currentPrice, actualDirection, leverage, entryPrice],
  );

  // "Off" button handlers - clear all related state
  const handleTakeProfitOff = useCallback(() => {
    setTakeProfitPrice('');
    setTakeProfitPercentage('');
    setTakeProfitSign(TAKE_PROFIT_DEFAULT_SIGN);
    setSelectedTpPercentage(null);
    setTpUsingPercentage(false);
    setTpSourceOfTruth(null);
  }, []);

  const handleStopLossOff = useCallback(() => {
    setStopLossPrice('');
    setStopLossPercentage('');
    setStopLossSign(STOP_LOSS_DEFAULT_SIGN);
    setSelectedSlPercentage(null);
    setSlUsingPercentage(false);
    setSlSourceOfTruth(null);
  }, []);

  // Sign toggle. Flipping keeps the entered RoE magnitude and recomputes the
  // trigger so the return switches between positive and negative.
  const handleTakeProfitSignToggle = useCallback(() => {
    const nextSign = flipSign(takeProfitSign);
    setTakeProfitSign(nextSign);

    const magnitude = Number.parseFloat(takeProfitPercentage);
    if (takeProfitPercentage && !Number.isNaN(magnitude) && leverage) {
      setTpSourceOfTruth('percentage');
      setTpUsingPercentage(true);
      const price = calculatePriceForRoE(
        applyRoeSign(nextSign, magnitude),
        true,
        {
          currentPrice,
          direction: actualDirection,
          leverage,
          entryPrice,
        },
      );
      setTakeProfitPrice(
        roundToSignificantFigures(
          price.toString(),
          DECIMAL_PRECISION_CONFIG.MaxPriceDecimals,
        ),
      );
    }
  }, [
    takeProfitSign,
    takeProfitPercentage,
    leverage,
    currentPrice,
    actualDirection,
    entryPrice,
  ]);

  const handleStopLossSignToggle = useCallback(() => {
    const nextSign = flipSign(stopLossSign);
    setStopLossSign(nextSign);

    const magnitude = Number.parseFloat(stopLossPercentage);
    if (stopLossPercentage && !Number.isNaN(magnitude) && leverage) {
      setSlSourceOfTruth('percentage');
      setSlUsingPercentage(true);
      const price = calculatePriceForRoE(
        applyRoeSign(nextSign, magnitude),
        false,
        {
          currentPrice,
          direction: actualDirection,
          leverage,
          entryPrice,
        },
      );
      setStopLossPrice(
        roundToSignificantFigures(
          price.toString(),
          DECIMAL_PRECISION_CONFIG.MaxPriceDecimals,
        ),
      );
    }
  }, [
    stopLossSign,
    stopLossPercentage,
    leverage,
    currentPrice,
    actualDirection,
    entryPrice,
  ]);

  // Validation logic
  // For existing positions, always validate against current price to allow setting TP/SL
  // between entry and current price when position is at a loss
  // For new orders, use entry price (limit price for limit orders, current price for market orders)
  const { referencePrice, priceType } = useMemo(() => {
    if (position) {
      // Existing position: validate against current price
      return { referencePrice: currentPrice, priceType: 'current' };
    }

    if (orderType === 'market') {
      // New market order: validate against current price
      return { referencePrice: currentPrice, priceType: 'current' };
    }

    // New limit order: validate against entry price (limit price)
    return {
      referencePrice: entryPrice || currentPrice,
      priceType: 'entry',
    };
  }, [position, currentPrice, orderType, entryPrice]);

  const isValid = validateTPSLPrices(takeProfitPrice, stopLossPrice, {
    currentPrice: referencePrice,
    direction: actualDirection,
    liquidationPrice,
  });

  const hasChanges = hasTPSLValuesChanged(
    takeProfitPrice,
    stopLossPrice,
    initialTakeProfitPrice,
    initialStopLossPrice,
  );

  // Take Profit Errors
  const takeProfitError = resolveTriggerPriceError(
    takeProfitPrice,
    isValidTakeProfitPrice(takeProfitPrice, {
      currentPrice: referencePrice,
      direction: actualDirection,
    }),
    () =>
      strings('perps.tpsl.take_profit_invalid_price', {
        direction: getTakeProfitErrorDirection(actualDirection),
        priceType,
      }),
  );

  // Stop Loss Errors
  const stopLossError = resolveTriggerPriceError(
    stopLossPrice,
    isValidStopLossPrice(stopLossPrice, {
      currentPrice: referencePrice,
      direction: actualDirection,
    }),
    () =>
      strings('perps.tpsl.stop_loss_invalid_price', {
        direction: getStopLossErrorDirection(actualDirection),
        priceType,
      }),
  );

  const stopLossLiquidationError =
    !isStopLossSafeFromLiquidation(
      stopLossPrice,
      liquidationPrice,
      actualDirection,
    ) && stopLossPrice
      ? strings('perps.tpsl.stop_loss_beyond_liquidation_error', {
          direction: getStopLossLiquidationErrorDirection(actualDirection),
        })
      : '';

  // Display helpers
  const formattedTakeProfitPercentage = formatRoEPercentageDisplay(
    takeProfitPercentage,
    tpPercentInputFocused,
    false,
  );

  const formattedStopLossPercentage = formatRoEPercentageDisplay(
    stopLossPercentage,
    slPercentInputFocused,
    false,
  );

  // Calculate position size for expected P&L calculations
  let positionSizeForPnL = 0;
  if (position) {
    // Keep the sign from the position (positive for long, negative for short)
    positionSizeForPnL = Number.parseFloat(position.size || '0');
  } else if (
    amount &&
    entryPrice &&
    entryPrice > 0 &&
    szDecimals !== undefined
  ) {
    // calculatePositionSize returns unsigned value, apply direction sign
    const unsignedSize = Number.parseFloat(
      calculatePositionSize({
        amount,
        price: entryPrice,
        szDecimals,
      }),
    );
    positionSizeForPnL =
      actualDirection === 'long' ? unsignedSize : -unsignedSize;
  }

  // Calculate expected P&L for Take Profit
  // Use fee hook for accurate closing fees
  // Notional value must be positive for fee calculation (use abs for short positions)
  const tpNotionalValue =
    takeProfitPrice && positionSizeForPnL !== 0
      ? (
          Number.parseFloat(takeProfitPrice) * Math.abs(positionSizeForPnL)
        ).toFixed(2)
      : '0';

  const tpClosingFees = usePerpsOrderFees({
    orderType: 'market',
    amount: tpNotionalValue,
    isClosing: true,
    symbol: asset,
  });

  const expectedTakeProfitPnL =
    takeProfitPrice && positionSizeForPnL !== 0 && entryPrice && entryPrice > 0
      ? calculateExpectedPnL({
          triggerPrice: Number.parseFloat(takeProfitPrice),
          entryPrice,
          size: positionSizeForPnL,
          closingFee: tpClosingFees.totalFee,
        })
      : undefined;

  // Calculate expected P&L for Stop Loss
  // Notional value must be positive for fee calculation (use abs for short positions)
  const slNotionalValue =
    stopLossPrice && positionSizeForPnL !== 0
      ? (
          Number.parseFloat(stopLossPrice) * Math.abs(positionSizeForPnL)
        ).toFixed(2)
      : '0';

  const slClosingFees = usePerpsOrderFees({
    orderType: 'market',
    amount: slNotionalValue,
    isClosing: true,
    symbol: asset,
  });

  const expectedStopLossPnL =
    stopLossPrice && positionSizeForPnL !== 0 && entryPrice && entryPrice > 0
      ? calculateExpectedPnL({
          triggerPrice: Number.parseFloat(stopLossPrice),
          entryPrice,
          size: positionSizeForPnL,
          closingFee: slClosingFees.totalFee,
        })
      : undefined;

  return {
    formState: {
      takeProfitPrice,
      stopLossPrice,
      takeProfitPercentage,
      stopLossPercentage,
      selectedTpPercentage,
      selectedSlPercentage,
      tpPriceInputFocused,
      tpPercentInputFocused,
      slPriceInputFocused,
      slPercentInputFocused,
      tpUsingPercentage,
      slUsingPercentage,
      takeProfitSign,
      stopLossSign,
    },
    handlers: {
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
    },
    buttons: {
      handleTakeProfitPercentageButton,
      handleStopLossPercentageButton,
      handleTakeProfitOff,
      handleStopLossOff,
      handleTakeProfitSignToggle,
      handleStopLossSignToggle,
    },
    validation: {
      isValid,
      hasChanges,
      takeProfitError,
      stopLossError,
      stopLossLiquidationError,
    },
    display: {
      formattedTakeProfitPercentage,
      formattedStopLossPercentage,
      expectedTakeProfitPnL,
      expectedStopLossPnL,
    },
  };
}
