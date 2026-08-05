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
  PerpsProSizeSliderModel,
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
  sizeSlider: PerpsProSizeSliderModel;
  effectiveUsdAmount: string;
  commitPendingSliderPreview: () => boolean;
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
  if (!finalizedAmount) {
    return '';
  }
  if (effectivePrice <= 0) {
    return '0';
  }

  return new BigNumber(finalizedAmount)
    .dividedBy(effectivePrice)
    .decimalPlaces(getDecimalPlaces(szDecimals), BigNumber.ROUND_DOWN)
    .toFixed();
};

const clampSliderUsdAmount = (
  value: number,
  maxPossibleAmount: number,
): string => {
  if (!Number.isFinite(value) || maxPossibleAmount <= 0) {
    return '0';
  }

  // Match Lite: the amount-domain slider uses whole-dollar steps.
  const clamped = Math.min(maxPossibleAmount, Math.max(0, value));
  return Math.floor(clamped).toString();
};

const getSliderDisplayValue = (
  usdAmount: string,
  maxPossibleAmount: number,
): number => {
  if (maxPossibleAmount <= 0) {
    return 0;
  }

  const amount = Number.parseFloat(usdAmount || '0');
  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.min(maxPossibleAmount, Math.max(0, amount));
};

/**
 * Owns the Pro size field's editable draft while keeping order state canonical
 * in USD. Asset drafts remain stable across live price updates.
 *
 * @param params - Canonical amount, market conversion, and sizing constraints.
 * @returns Size-input model, amount-domain slider, and effective USD amount.
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
  const [sliderPreview, setSliderPreview] = useState<string | null>(null);
  const sliderPreviewRef = useRef<string | null>(null);
  const lastUsdAmountRef = useRef(usdAmount);
  // Tracks USD amounts this hook just committed so external clamps (leverage /
  // balance / payment-token caps) can be distinguished from our own setAmount
  // echoes and from live price ticks that should keep a dirty asset draft.
  const pendingInternalUsdRef = useRef<string | null>(null);

  const clearSliderPreview = useCallback(() => {
    sliderPreviewRef.current = null;
    setSliderPreview(null);
  }, []);

  const commitUsdAmount = useCallback(
    (nextUsdAmount: string) => {
      if (new BigNumber(nextUsdAmount || 0).eq(new BigNumber(usdAmount || 0))) {
        pendingInternalUsdRef.current = null;
        return false;
      }

      pendingInternalUsdRef.current = nextUsdAmount;
      setAmount(nextUsdAmount);
      return true;
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
    clearSliderPreview();
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
    clearSliderPreview,
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
      acceptedDecimalSeparators: ['.', ','],
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

      // A valid keyboard edit supersedes any preview left by an interrupted
      // slider gesture. Invalid edits preserve the current displayed value.
      clearSliderPreview();

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
      clearSliderPreview,
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

  const onFocus = useCallback(() => {
    clearSliderPreview();
    setIsSizeFocused(true);
  }, [clearSliderPreview]);

  const onToggleDenomination = useCallback(() => {
    if (!canToggleDenomination) {
      return;
    }

    clearSliderPreview();

    if (denominationUnit === 'usd') {
      const canonicalUsdDraft = finalizeNumericTextInput(usdDraft);
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
    clearSliderPreview,
    commitUsdAmount,
    denominationUnit,
    effectivePrice,
    szDecimals,
    usdDraft,
  ]);

  const effectiveUsdAmount = useMemo(() => {
    if (sliderPreview !== null) {
      return sliderPreview;
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
    sliderPreview,
    usdAmount,
    usdDraft,
  ]);

  const onSliderValueChange = useCallback(
    (value: number) => {
      const nextUsdAmount = clampSliderUsdAmount(value, maxPossibleAmount);
      sliderPreviewRef.current = nextUsdAmount;
      setSliderPreview(nextUsdAmount);
    },
    [maxPossibleAmount],
  );

  const commitSliderUsdAmount = useCallback(
    (nextUsdAmount: string) => {
      const didCommitCanonicalAmount = commitUsdAmount(nextUsdAmount);
      setUsdDraft(nextUsdAmount);
      if (canToggleDenomination) {
        setAssetDraftState({
          value: getAssetFromUsd(nextUsdAmount, effectivePrice, szDecimals),
          source: 'canonical',
        });
      }
      clearSliderPreview();
      return didCommitCanonicalAmount;
    },
    [
      canToggleDenomination,
      clearSliderPreview,
      commitUsdAmount,
      effectivePrice,
      szDecimals,
    ],
  );

  const onSliderDragEnd = useCallback(
    (value: number) => {
      commitSliderUsdAmount(clampSliderUsdAmount(value, maxPossibleAmount));
    },
    [commitSliderUsdAmount, maxPossibleAmount],
  );

  const onSliderDragCancel = useCallback(() => {
    const nextUsdAmount = sliderPreviewRef.current;
    if (nextUsdAmount !== null) {
      commitSliderUsdAmount(nextUsdAmount);
    }
  }, [commitSliderUsdAmount]);

  const commitPendingSliderPreview = useCallback((): boolean => {
    const nextUsdAmount = sliderPreviewRef.current;
    if (nextUsdAmount === null) {
      return false;
    }

    return commitSliderUsdAmount(nextUsdAmount);
  }, [commitSliderUsdAmount]);

  const value = useMemo(() => {
    if (sliderPreview === null) {
      return denominationUnit === 'usd' ? usdDraft : assetDraft;
    }
    if (denominationUnit === 'usd') {
      return sliderPreview;
    }
    if (canToggleDenomination) {
      return getAssetFromUsd(sliderPreview, effectivePrice, szDecimals);
    }
    return assetDraft;
  }, [
    assetDraft,
    canToggleDenomination,
    denominationUnit,
    effectivePrice,
    sliderPreview,
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

  const sizeSlider = useMemo<PerpsProSizeSliderModel>(
    () => ({
      value: getSliderDisplayValue(effectiveUsdAmount, maxPossibleAmount),
      maximumValue: Math.max(0, maxPossibleAmount),
      onValueChange: onSliderValueChange,
      onDragEnd: onSliderDragEnd,
      onDragCancel: onSliderDragCancel,
    }),
    [
      effectiveUsdAmount,
      maxPossibleAmount,
      onSliderDragCancel,
      onSliderDragEnd,
      onSliderValueChange,
    ],
  );

  return {
    sizeInput,
    sizeSlider,
    effectiveUsdAmount,
    commitPendingSliderPreview,
  };
};
