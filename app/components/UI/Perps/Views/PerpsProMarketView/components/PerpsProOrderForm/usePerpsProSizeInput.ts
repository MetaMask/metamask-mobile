import { BigNumber } from 'bignumber.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  finalizeNumericTextInput,
  normalizeNumericTextInput,
  type NormalizeNumericTextInputOptions,
} from '../../../../../../Base/Keypad/normalizeNumericTextInput';

export type PerpsProSizeUnit = 'usd' | 'coin';

interface CoinDraftState {
  value: string;
  source: 'canonical' | 'user';
}

export interface UsePerpsProSizeInputParams {
  usdAmount: string;
  setAmount: (value: string) => void;
  assetSymbol: string;
  effectivePrice: number;
  szDecimals: number;
  maxPossibleAmount: number;
  maxDigits?: number;
}

export interface UsePerpsProSizeInputResult {
  sizeDisplay: string;
  sizeInputValue: string;
  sizeUnit: PerpsProSizeUnit;
  sizeUnitLabel: string;
  onSizeChange: (text: string) => void;
  onSizeFocus: () => void;
  onSizeBlur: () => void;
  onSizeUnitPress: () => void;
  canToggleSizeUnit: boolean;
  showUsdPrefix: boolean;
  isSizeFocused: boolean;
  balancePercentage: number;
  onBalancePercentageChange: (value: number) => void;
  onBalancePercentageDragEnd: () => void;
  onBalancePercentageDragCancel: () => void;
  effectiveUsdAmount: string;
}

const getDecimalPlaces = (szDecimals: number) =>
  Number.isInteger(szDecimals) && szDecimals >= 0 ? szDecimals : 0;

const getUsdFromCoin = (coinAmount: string, effectivePrice: number): string => {
  const finalizedAmount = finalizeNumericTextInput(coinAmount);
  if (!finalizedAmount) {
    return '0';
  }

  return new BigNumber(finalizedAmount)
    .times(effectivePrice)
    .decimalPlaces(2, BigNumber.ROUND_HALF_UP)
    .toFixed();
};

const getCoinFromUsd = (
  usdAmount: string,
  effectivePrice: number,
  szDecimals: number,
): string => {
  const finalizedAmount = finalizeNumericTextInput(usdAmount);
  if (!finalizedAmount || effectivePrice <= 0) {
    return '0';
  }

  return new BigNumber(finalizedAmount)
    .dividedBy(effectivePrice)
    .decimalPlaces(getDecimalPlaces(szDecimals), BigNumber.ROUND_DOWN)
    .toFixed();
};

const getSliderUsdAmount = (
  percentage: number,
  maxPossibleAmount: number,
): string =>
  new BigNumber(maxPossibleAmount)
    .times(percentage)
    .dividedBy(100)
    .decimalPlaces(2, BigNumber.ROUND_HALF_UP)
    .toFixed();

/**
 * Owns the Pro size field's editable draft while keeping order state canonical
 * in USD. Coin drafts remain stable across live price updates.
 *
 * @param params - Canonical amount, market conversion, and sizing constraints.
 * @returns Input, unit-toggle, and deferred slider behavior for the Pro form.
 */
export const usePerpsProSizeInput = ({
  usdAmount,
  setAmount,
  assetSymbol,
  effectivePrice,
  szDecimals,
  maxPossibleAmount,
  maxDigits,
}: UsePerpsProSizeInputParams): UsePerpsProSizeInputResult => {
  const canToggleSizeUnit =
    Number.isFinite(effectivePrice) && effectivePrice > 0;
  const [sizeUnit, setSizeUnit] = useState<PerpsProSizeUnit>('usd');
  const [usdDraft, setUsdDraft] = useState(usdAmount);
  const [coinDraftState, setCoinDraftState] = useState<CoinDraftState>(() => ({
    value: canToggleSizeUnit
      ? getCoinFromUsd(usdAmount, effectivePrice, szDecimals)
      : '0',
    source: 'canonical',
  }));
  const coinDraft = coinDraftState.value;
  const [isSizeFocused, setIsSizeFocused] = useState(false);
  const [sliderPreview, setSliderPreview] = useState<number | null>(null);
  const sliderPreviewRef = useRef<number | null>(null);
  const lastUsdAmountRef = useRef(usdAmount);
  // Tracks USD amounts this hook just committed so external clamps (leverage /
  // balance / payment-token caps) can be distinguished from our own setAmount
  // echoes and from live price ticks that should keep a dirty coin draft.
  const pendingInternalUsdRef = useRef<string | null>(null);

  const commitUsdAmount = useCallback(
    (nextUsdAmount: string) => {
      pendingInternalUsdRef.current = nextUsdAmount;
      setAmount(nextUsdAmount);
    },
    [setAmount],
  );

  useEffect(() => {
    const amountChanged = lastUsdAmountRef.current !== usdAmount;
    lastUsdAmountRef.current = usdAmount;

    if (!amountChanged) {
      // Price/szDecimals-only updates: refresh a clean coin projection, but keep
      // user-typed coin text stable while the draft is dirty or focused, and
      // avoid overwriting a blur snap with a stale usdAmount before the parent
      // echoes the pending internal commit.
      if (
        sizeUnit === 'coin' &&
        canToggleSizeUnit &&
        coinDraftState.source === 'canonical' &&
        !isSizeFocused &&
        pendingInternalUsdRef.current === null
      ) {
        setCoinDraftState({
          value: getCoinFromUsd(usdAmount, effectivePrice, szDecimals),
          source: 'canonical',
        });
      }
      return;
    }

    const pendingInternalUsd = pendingInternalUsdRef.current;
    pendingInternalUsdRef.current = null;
    const wasInternalCommit =
      pendingInternalUsd !== null &&
      new BigNumber(pendingInternalUsd || 0).eq(new BigNumber(usdAmount || 0));

    if (wasInternalCommit) {
      return;
    }

    // External canonical update (amount clamp, reset, payment-token change).
    setUsdDraft(usdAmount);
    if (canToggleSizeUnit) {
      setCoinDraftState({
        value: getCoinFromUsd(usdAmount, effectivePrice, szDecimals),
        source: 'canonical',
      });
    }
  }, [
    canToggleSizeUnit,
    coinDraftState.source,
    effectivePrice,
    isSizeFocused,
    sizeUnit,
    szDecimals,
    usdAmount,
  ]);

  const inputOptions = useMemo<NormalizeNumericTextInputOptions>(
    () => ({
      maxDigits,
      maxDecimalPlaces: sizeUnit === 'usd' ? 2 : getDecimalPlaces(szDecimals),
    }),
    [maxDigits, sizeUnit, szDecimals],
  );

  const onSizeChange = useCallback(
    (text: string) => {
      const previousValue = sizeUnit === 'usd' ? usdDraft : coinDraft;
      const result = normalizeNumericTextInput(
        text,
        previousValue,
        inputOptions,
      );
      if (!result.ok) {
        return;
      }

      if (sizeUnit === 'usd') {
        setUsdDraft(result.value);
        commitUsdAmount(result.value || '0');
        return;
      }

      setCoinDraftState({ value: result.value, source: 'user' });
      if (canToggleSizeUnit) {
        const nextUsdAmount = getUsdFromCoin(result.value, effectivePrice);
        setUsdDraft(nextUsdAmount);
        commitUsdAmount(nextUsdAmount);
      }
    },
    [
      canToggleSizeUnit,
      coinDraft,
      commitUsdAmount,
      effectivePrice,
      inputOptions,
      sizeUnit,
      usdDraft,
    ],
  );

  const onSizeBlur = useCallback(() => {
    setIsSizeFocused(false);

    if (sizeUnit === 'usd') {
      const finalizedDraft = finalizeNumericTextInput(usdDraft);
      setUsdDraft(finalizedDraft);
      commitUsdAmount(finalizedDraft || '0');
      return;
    }

    const finalizedDraft = finalizeNumericTextInput(coinDraft);
    if (!canToggleSizeUnit) {
      setCoinDraftState({
        value: finalizedDraft,
        source: 'canonical',
      });
      return;
    }

    // Snap the coin field to the USD→coin round-trip so the display matches
    // deriveOrderSizing / provider size (USD cents half-up, szDecimals down).
    // Keep the committed USD (not re-derived from the snapped coin) so cents
    // do not drift a second time after snap.
    const nextUsdAmount = getUsdFromCoin(finalizedDraft, effectivePrice);
    const snappedCoinAmount = getCoinFromUsd(
      nextUsdAmount,
      effectivePrice,
      szDecimals,
    );
    setUsdDraft(nextUsdAmount);
    setCoinDraftState({
      value: snappedCoinAmount,
      source: 'canonical',
    });
    commitUsdAmount(nextUsdAmount);
  }, [
    canToggleSizeUnit,
    coinDraft,
    commitUsdAmount,
    effectivePrice,
    sizeUnit,
    szDecimals,
    usdDraft,
  ]);
  const onSizeFocus = useCallback(() => setIsSizeFocused(true), []);

  const onSizeUnitPress = useCallback(() => {
    if (!canToggleSizeUnit) {
      return;
    }

    if (sizeUnit === 'usd') {
      const canonicalUsdDraft = finalizeNumericTextInput(usdDraft) || '0';
      setCoinDraftState({
        value: getCoinFromUsd(canonicalUsdDraft, effectivePrice, szDecimals),
        source: 'canonical',
      });
      setSizeUnit('coin');
      return;
    }

    const nextUsdAmount = getUsdFromCoin(coinDraft, effectivePrice);
    setUsdDraft(nextUsdAmount);
    commitUsdAmount(nextUsdAmount);
    setSizeUnit('usd');
  }, [
    canToggleSizeUnit,
    coinDraft,
    commitUsdAmount,
    effectivePrice,
    sizeUnit,
    szDecimals,
    usdDraft,
  ]);

  const previewUsdAmount = useMemo(
    () =>
      sliderPreview === null
        ? null
        : getSliderUsdAmount(sliderPreview, maxPossibleAmount),
    [maxPossibleAmount, sliderPreview],
  );

  const effectiveUsdAmount = useMemo(() => {
    if (previewUsdAmount !== null) {
      return previewUsdAmount;
    }

    if (sizeUnit === 'usd') {
      return finalizeNumericTextInput(usdDraft) || '0';
    }

    if (!canToggleSizeUnit) {
      return usdAmount || '0';
    }

    // Dirty coin drafts re-project against the live price. Once clean (after
    // blur snap), use the committed USD so szDecimals snap does not re-round
    // cents and change order sizing.
    if (coinDraftState.source === 'user') {
      return getUsdFromCoin(coinDraft, effectivePrice);
    }

    return finalizeNumericTextInput(usdDraft) || '0';
  }, [
    canToggleSizeUnit,
    coinDraft,
    coinDraftState.source,
    effectivePrice,
    previewUsdAmount,
    sizeUnit,
    usdAmount,
    usdDraft,
  ]);

  const balancePercentage = useMemo(() => {
    if (sliderPreview !== null) {
      return sliderPreview;
    }
    if (maxPossibleAmount <= 0) {
      return 0;
    }

    const percentage = new BigNumber(effectiveUsdAmount)
      .dividedBy(maxPossibleAmount)
      .times(100)
      .decimalPlaces(0, BigNumber.ROUND_HALF_UP)
      .toNumber();
    return Math.min(100, Math.max(0, percentage));
  }, [effectiveUsdAmount, maxPossibleAmount, sliderPreview]);

  const onBalancePercentageChange = useCallback((value: number) => {
    const nextValue = Number.isFinite(value)
      ? Math.min(100, Math.max(0, value))
      : 0;
    sliderPreviewRef.current = nextValue;
    setSliderPreview(nextValue);
  }, []);

  const commitBalancePercentage = useCallback(() => {
    const percentage = sliderPreviewRef.current;
    if (percentage === null) {
      return;
    }

    const nextUsdAmount = getSliderUsdAmount(percentage, maxPossibleAmount);
    commitUsdAmount(nextUsdAmount);
    setUsdDraft(nextUsdAmount);
    if (canToggleSizeUnit) {
      setCoinDraftState({
        value: getCoinFromUsd(nextUsdAmount, effectivePrice, szDecimals),
        source: 'canonical',
      });
    }
    sliderPreviewRef.current = null;
    setSliderPreview(null);
  }, [
    canToggleSizeUnit,
    commitUsdAmount,
    effectivePrice,
    maxPossibleAmount,
    szDecimals,
  ]);

  const sizeInputValue = useMemo(() => {
    if (previewUsdAmount === null) {
      return sizeUnit === 'usd' ? usdDraft : coinDraft;
    }
    if (sizeUnit === 'usd') {
      return previewUsdAmount;
    }
    if (canToggleSizeUnit) {
      return getCoinFromUsd(previewUsdAmount, effectivePrice, szDecimals);
    }
    return coinDraft;
  }, [
    canToggleSizeUnit,
    coinDraft,
    effectivePrice,
    previewUsdAmount,
    sizeUnit,
    szDecimals,
    usdDraft,
  ]);

  return {
    sizeDisplay: sizeInputValue,
    sizeInputValue,
    sizeUnit,
    sizeUnitLabel: sizeUnit === 'usd' ? 'USD' : assetSymbol,
    onSizeChange,
    onSizeFocus,
    onSizeBlur,
    onSizeUnitPress,
    canToggleSizeUnit,
    showUsdPrefix: sizeUnit === 'usd',
    isSizeFocused,
    balancePercentage,
    onBalancePercentageChange,
    onBalancePercentageDragEnd: commitBalancePercentage,
    onBalancePercentageDragCancel: commitBalancePercentage,
    effectiveUsdAmount,
  };
};
