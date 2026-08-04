import { BigNumber } from 'bignumber.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  finalizeNumericTextInput,
  normalizeNumericTextInput,
  type NormalizeNumericTextInputOptions,
} from '../../../../../../Base/Keypad/normalizeNumericTextInput';
import type {
  PerpsProSizeDenomination,
  PerpsProSizeInputModel,
} from './PerpsProOrderForm.types';

type SizeDenominationUnit = PerpsProSizeDenomination['unit'];

interface AssetDraftState {
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
  sizeInput: PerpsProSizeInputModel;
  balancePercentage: number;
  onBalancePercentageChange: (value: number) => void;
  onBalancePercentageDragEnd: () => void;
  onBalancePercentageDragCancel: () => void;
  effectiveUsdAmount: string;
}

const getDecimalPlaces = (szDecimals: number) =>
  Number.isInteger(szDecimals) && szDecimals >= 0 ? szDecimals : 0;

const getUsdFromAsset = (
  assetAmount: string,
  effectivePrice: number,
): string => {
  const finalizedAmount = finalizeNumericTextInput(assetAmount);
  if (!finalizedAmount) {
    return '0';
  }

  return new BigNumber(finalizedAmount)
    .times(effectivePrice)
    .decimalPlaces(2, BigNumber.ROUND_HALF_UP)
    .toFixed();
};

const getAssetFromUsd = (
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
 * in USD. Asset drafts remain stable across live price updates.
 *
 * @param params - Canonical amount, market conversion, and sizing constraints.
 * @returns Size-input model, deferred slider behavior, and effective USD amount.
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
  const canToggleDenomination =
    Number.isFinite(effectivePrice) && effectivePrice > 0;
  const [denominationUnit, setDenominationUnit] =
    useState<SizeDenominationUnit>('usd');
  const [usdDraft, setUsdDraft] = useState(usdAmount);
  const [assetDraftState, setAssetDraftState] = useState<AssetDraftState>(
    () => ({
      value: canToggleDenomination
        ? getAssetFromUsd(usdAmount, effectivePrice, szDecimals)
        : '0',
      source: 'canonical',
    }),
  );
  const assetDraft = assetDraftState.value;
  const [isSizeFocused, setIsSizeFocused] = useState(false);
  const [sliderPreview, setSliderPreview] = useState<number | null>(null);
  const sliderPreviewRef = useRef<number | null>(null);
  const lastUsdAmountRef = useRef(usdAmount);
  // Tracks USD amounts this hook just committed so external clamps (leverage /
  // balance / payment-token caps) can be distinguished from our own setAmount
  // echoes and from live price ticks that should keep a dirty asset draft.
  const pendingInternalUsdRef = useRef<string | null>(null);

  const commitUsdAmount = useCallback(
    (nextUsdAmount: string) => {
      if (new BigNumber(nextUsdAmount || 0).eq(new BigNumber(usdAmount || 0))) {
        pendingInternalUsdRef.current = null;
        return;
      }

      pendingInternalUsdRef.current = nextUsdAmount;
      setAmount(nextUsdAmount);
    },
    [setAmount, usdAmount],
  );

  useEffect(() => {
    const amountChanged = lastUsdAmountRef.current !== usdAmount;
    lastUsdAmountRef.current = usdAmount;

    if (!amountChanged) {
      // Price/szDecimals-only updates: refresh a clean asset projection, but
      // keep user-typed asset text stable while the draft is dirty or focused,
      // and avoid overwriting a blur snap with a stale usdAmount before the
      // parent echoes the pending internal commit.
      if (
        denominationUnit === 'asset' &&
        canToggleDenomination &&
        assetDraftState.source === 'canonical' &&
        !isSizeFocused &&
        pendingInternalUsdRef.current === null
      ) {
        setAssetDraftState({
          value: getAssetFromUsd(usdAmount, effectivePrice, szDecimals),
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
    if (canToggleDenomination) {
      setAssetDraftState({
        value: getAssetFromUsd(usdAmount, effectivePrice, szDecimals),
        source: 'canonical',
      });
    }
  }, [
    assetDraftState.source,
    canToggleDenomination,
    denominationUnit,
    effectivePrice,
    isSizeFocused,
    szDecimals,
    usdAmount,
  ]);

  const inputOptions = useMemo<NormalizeNumericTextInputOptions>(
    () => ({
      maxDigits,
      maxDecimalPlaces:
        denominationUnit === 'usd' ? 2 : getDecimalPlaces(szDecimals),
    }),
    [denominationUnit, maxDigits, szDecimals],
  );

  const onChange = useCallback(
    (text: string) => {
      const previousValue = denominationUnit === 'usd' ? usdDraft : assetDraft;
      const result = normalizeNumericTextInput(
        text,
        previousValue,
        inputOptions,
      );
      if (!result.ok) {
        return;
      }

      if (denominationUnit === 'usd') {
        setUsdDraft(result.value);
        commitUsdAmount(result.value || '0');
        return;
      }

      setAssetDraftState({ value: result.value, source: 'user' });
      if (canToggleDenomination) {
        const nextUsdAmount = getUsdFromAsset(result.value, effectivePrice);
        setUsdDraft(nextUsdAmount);
        commitUsdAmount(nextUsdAmount);
      }
    },
    [
      assetDraft,
      canToggleDenomination,
      commitUsdAmount,
      denominationUnit,
      effectivePrice,
      inputOptions,
      usdDraft,
    ],
  );

  const onBlur = useCallback(() => {
    setIsSizeFocused(false);

    if (denominationUnit === 'usd') {
      const finalizedDraft = finalizeNumericTextInput(usdDraft);
      setUsdDraft(finalizedDraft);
      commitUsdAmount(finalizedDraft || '0');
      return;
    }

    const finalizedDraft = finalizeNumericTextInput(assetDraft);
    if (!canToggleDenomination) {
      setAssetDraftState({
        value: finalizedDraft,
        source: 'canonical',
      });
      return;
    }

    if (assetDraftState.source === 'canonical') {
      setAssetDraftState({
        value: finalizedDraft,
        source: 'canonical',
      });
      return;
    }

    // Snap the asset field to the USD→asset round-trip so the display matches
    // deriveOrderSizing / provider size (USD cents half-up, szDecimals down).
    // Keep the committed USD (not re-derived from the snapped asset) so cents
    // do not drift a second time after snap.
    const nextUsdAmount = getUsdFromAsset(finalizedDraft, effectivePrice);
    const snappedAssetAmount = getAssetFromUsd(
      nextUsdAmount,
      effectivePrice,
      szDecimals,
    );
    setUsdDraft(nextUsdAmount);
    setAssetDraftState({
      value: snappedAssetAmount,
      source: 'canonical',
    });
    commitUsdAmount(nextUsdAmount);
  }, [
    assetDraft,
    assetDraftState.source,
    canToggleDenomination,
    commitUsdAmount,
    denominationUnit,
    effectivePrice,
    szDecimals,
    usdDraft,
  ]);

  const onFocus = useCallback(() => setIsSizeFocused(true), []);

  const onToggleDenomination = useCallback(() => {
    if (!canToggleDenomination) {
      return;
    }

    if (denominationUnit === 'usd') {
      const canonicalUsdDraft = finalizeNumericTextInput(usdDraft) || '0';
      setAssetDraftState({
        value: getAssetFromUsd(canonicalUsdDraft, effectivePrice, szDecimals),
        source: 'canonical',
      });
      setDenominationUnit('asset');
      return;
    }

    const nextUsdAmount = getUsdFromAsset(assetDraft, effectivePrice);
    setUsdDraft(nextUsdAmount);
    commitUsdAmount(nextUsdAmount);
    setDenominationUnit('usd');
  }, [
    assetDraft,
    canToggleDenomination,
    commitUsdAmount,
    denominationUnit,
    effectivePrice,
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

    if (denominationUnit === 'usd') {
      return finalizeNumericTextInput(usdDraft) || '0';
    }

    if (!canToggleDenomination) {
      return usdAmount || '0';
    }

    // Dirty asset drafts re-project against the live price. Once clean (after
    // blur snap), use the committed USD so szDecimals snap does not re-round
    // cents and change order sizing.
    if (assetDraftState.source === 'user') {
      return getUsdFromAsset(assetDraft, effectivePrice);
    }

    return finalizeNumericTextInput(usdDraft) || '0';
  }, [
    assetDraft,
    assetDraftState.source,
    canToggleDenomination,
    denominationUnit,
    effectivePrice,
    previewUsdAmount,
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
    if (canToggleDenomination) {
      setAssetDraftState({
        value: getAssetFromUsd(nextUsdAmount, effectivePrice, szDecimals),
        source: 'canonical',
      });
    }
    sliderPreviewRef.current = null;
    setSliderPreview(null);
  }, [
    canToggleDenomination,
    commitUsdAmount,
    effectivePrice,
    maxPossibleAmount,
    szDecimals,
  ]);

  const value = useMemo(() => {
    if (previewUsdAmount === null) {
      return denominationUnit === 'usd' ? usdDraft : assetDraft;
    }
    if (denominationUnit === 'usd') {
      return previewUsdAmount;
    }
    if (canToggleDenomination) {
      return getAssetFromUsd(previewUsdAmount, effectivePrice, szDecimals);
    }
    return assetDraft;
  }, [
    assetDraft,
    canToggleDenomination,
    denominationUnit,
    effectivePrice,
    previewUsdAmount,
    szDecimals,
    usdDraft,
  ]);

  const denomination = useMemo<PerpsProSizeDenomination>(
    () =>
      denominationUnit === 'usd'
        ? { unit: 'usd' }
        : { unit: 'asset', symbol: assetSymbol },
    [assetSymbol, denominationUnit],
  );

  const sizeInput = useMemo<PerpsProSizeInputModel>(
    () => ({
      value,
      denomination,
      canToggleDenomination,
      onChange,
      onFocus,
      onBlur,
      onToggleDenomination,
    }),
    [
      canToggleDenomination,
      denomination,
      onBlur,
      onChange,
      onFocus,
      onToggleDenomination,
      value,
    ],
  );

  return {
    sizeInput,
    balancePercentage,
    onBalancePercentageChange,
    onBalancePercentageDragEnd: commitBalancePercentage,
    onBalancePercentageDragCancel: commitBalancePercentage,
    effectiveUsdAmount,
  };
};
