import { BigNumber } from 'bignumber.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePerpsSizeDenomination } from '../../../../hooks/usePerpsSizeDenomination';
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

interface AssetDraftState {
  value: string;
  source: 'canonical' | 'user';
  /**
   * False until the coin field has been converted with a positive price.
   * An unprojected draft must not be shown: its placeholder is not the order size.
   */
  projected: boolean;
}

export interface UsePerpsProSizeInputParams {
  usdAmount: string;
  setAmount: (value: string) => void;
  assetSymbol: string;
  effectivePrice: number;
  szDecimals: number;
  maxPossibleAmount: number;
  maxDigits?: number;
  /**
   * When true, the size field stays empty and slider drags are visual-only
   * (used for reduce-only `no_position` / `wrong_side`).
   */
  keepSizeEmpty?: boolean;
  /** Preserve reactive maximum recalculation after a Chase MAX selection. */
  preserveMaxIntent?: boolean;
}

export interface UsePerpsProSizeInputResult {
  sizeInput: PerpsProSizeInputModel;
  sizeSlider: PerpsProSizeSliderModel;
  effectiveUsdAmount: string;
  /** True when the user last committed the slider at its maximum. */
  isAtMaxAmount: boolean;
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
    return '';
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

const isEmptyUsdAmount = (value: string) => value === '' || value === '0';

/**
 * True when the USD field still represents the canonical amount.
 * A trailing separator is an in-progress edit, so it stays on the USD field
 * until blur instead of being replaced by a coin conversion.
 */
const isCanonicalUsdDraft = (draft: string, canonicalUsdAmount: string) => {
  const finalizedDraft = finalizeNumericTextInput(draft);
  if (draft !== finalizedDraft) {
    return false;
  }

  if (
    isEmptyUsdAmount(finalizedDraft) &&
    isEmptyUsdAmount(canonicalUsdAmount)
  ) {
    return true;
  }

  return new BigNumber(finalizedDraft || 0).eq(
    new BigNumber(finalizeNumericTextInput(canonicalUsdAmount) || 0),
  );
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
  keepSizeEmpty = false,
  preserveMaxIntent = false,
}: UsePerpsProSizeInputParams): UsePerpsProSizeInputResult => {
  const priceReady = Number.isFinite(effectivePrice) && effectivePrice > 0;
  const { denomination: activeDenominationUnit, setDenomination } =
    usePerpsSizeDenomination();
  const [usdDraft, setUsdDraft] = useState(usdAmount);
  const [assetDraftState, setAssetDraftState] = useState<AssetDraftState>(
    () => ({
      value: priceReady
        ? getAssetFromUsd(usdAmount, effectivePrice, szDecimals)
        : '',
      source: 'canonical',
      // A persisted coin unit is not displayable until this projection exists.
      projected: priceReady,
    }),
  );
  /**
   * Coin mode is visible only after a real USD→coin projection. Until then the
   * field stays in USD, matching the amount Place Order submits.
   */
  const showsAssetSize =
    activeDenominationUnit === 'asset' && assetDraftState.projected;
  const canToggleDenomination =
    priceReady &&
    (activeDenominationUnit === 'usd' || assetDraftState.projected);
  const assetDraft = assetDraftState.value;
  const [isSizeFocused, setIsSizeFocused] = useState(false);
  const [sliderPreview, setSliderPreview] = useState<string | null>(null);
  const [isAtMaxAmount, setIsAtMaxAmount] = useState(false);
  const sliderPreviewRef = useRef<string | null>(null);
  const sliderAtMaxRef = useRef(false);
  const lastUsdAmountRef = useRef(usdAmount);
  // Tracks USD amounts this hook just committed so external clamps (leverage /
  // balance / payment-token caps) can be distinguished from our own setAmount
  // echoes and from live price ticks that should keep a dirty asset draft.
  const pendingInternalUsdRef = useRef<string | null>(null);

  const clearSliderPreview = useCallback(() => {
    sliderPreviewRef.current = null;
    setSliderPreview(null);
  }, []);

  const clearSliderMaxIntent = useCallback(() => {
    sliderAtMaxRef.current = false;
    setIsAtMaxAmount(false);
  }, []);

  const cancelPendingSliderPreview = useCallback(() => {
    if (sliderPreviewRef.current === null) {
      return;
    }

    clearSliderPreview();
    clearSliderMaxIntent();
  }, [clearSliderMaxIntent, clearSliderPreview]);

  const wasKeepSizeEmptyRef = useRef(keepSizeEmpty);
  useEffect(() => {
    if (wasKeepSizeEmptyRef.current && !keepSizeEmpty) {
      clearSliderPreview();
      clearSliderMaxIntent();
    }
    wasKeepSizeEmptyRef.current = keepSizeEmpty;
  }, [clearSliderMaxIntent, clearSliderPreview, keepSizeEmpty]);

  const commitUsdAmount = useCallback(
    (nextUsdAmount: string) => {
      if (nextUsdAmount === usdAmount) {
        pendingInternalUsdRef.current = null;
        return false;
      }

      if (isEmptyUsdAmount(nextUsdAmount) && isEmptyUsdAmount(usdAmount)) {
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
      const canSyncAssetDraft =
        activeDenominationUnit === 'asset' &&
        priceReady &&
        assetDraftState.source === 'canonical' &&
        pendingInternalUsdRef.current === null;
      // The first projection also runs while focused. The placeholder was never
      // a coin amount, so leaving it in place shows 0 for a non-zero order.
      const shouldProjectInitialAssetDraft =
        canSyncAssetDraft &&
        !assetDraftState.projected &&
        isCanonicalUsdDraft(usdDraft, usdAmount);
      const shouldRefreshProjectedAssetDraft =
        canSyncAssetDraft && assetDraftState.projected && !isSizeFocused;

      if (shouldProjectInitialAssetDraft || shouldRefreshProjectedAssetDraft) {
        setAssetDraftState({
          value: getAssetFromUsd(
            shouldProjectInitialAssetDraft
              ? finalizeNumericTextInput(usdDraft) || usdAmount
              : usdAmount,
            effectivePrice,
            szDecimals,
          ),
          source: 'canonical',
          projected: true,
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
      // A USD edit made before the price loaded still needs its coin projection
      // once the field is no longer being edited.
      if (
        !isSizeFocused &&
        activeDenominationUnit === 'asset' &&
        priceReady &&
        assetDraftState.source === 'canonical' &&
        !assetDraftState.projected
      ) {
        setAssetDraftState({
          value: getAssetFromUsd(usdAmount, effectivePrice, szDecimals),
          source: 'canonical',
          projected: true,
        });
      }
      return;
    }

    // External canonical update (amount clamp, reset, payment-token change).
    const clampedMaximum = new BigNumber(
      clampSliderUsdAmount(maxPossibleAmount, maxPossibleAmount),
    );
    const preservesMaxIntent =
      preserveMaxIntent &&
      sliderAtMaxRef.current &&
      maxPossibleAmount > 0 &&
      clampedMaximum.gt(0) &&
      new BigNumber(usdAmount || 0).eq(clampedMaximum);
    clearSliderPreview();
    if (!preservesMaxIntent) {
      clearSliderMaxIntent();
    }
    setUsdDraft(usdAmount);
    if (priceReady) {
      setAssetDraftState({
        value: getAssetFromUsd(usdAmount, effectivePrice, szDecimals),
        source: 'canonical',
        projected: true,
      });
    } else {
      // Drop the stale coin projection so the field follows the new USD amount
      // instead of keeping a coin value that no longer converts.
      setAssetDraftState({
        value: '',
        source: 'canonical',
        projected: false,
      });
    }
  }, [
    assetDraftState.projected,
    assetDraftState.source,
    clearSliderMaxIntent,
    clearSliderPreview,
    activeDenominationUnit,
    effectivePrice,
    isSizeFocused,
    maxPossibleAmount,
    preserveMaxIntent,
    priceReady,
    szDecimals,
    usdAmount,
    usdDraft,
  ]);

  const inputOptions = useMemo<NormalizeNumericTextInputOptions>(
    () => ({
      maxDigits,
      maxDecimalPlaces: showsAssetSize ? getDecimalPlaces(szDecimals) : 2,
      acceptedDecimalSeparators: ['.', ','],
    }),
    [maxDigits, showsAssetSize, szDecimals],
  );

  const onChange = useCallback(
    (text: string) => {
      if (keepSizeEmpty) {
        return;
      }

      const previousValue = showsAssetSize ? assetDraft : usdDraft;
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
      clearSliderMaxIntent();

      if (!showsAssetSize) {
        setUsdDraft(result.value);
        commitUsdAmount(result.value || '0');
        return;
      }

      setAssetDraftState({
        value: result.value,
        source: 'user',
        projected: true,
      });
      if (priceReady) {
        const nextUsdAmount = getUsdFromAsset(result.value, effectivePrice);
        setUsdDraft(nextUsdAmount);
        commitUsdAmount(nextUsdAmount || '0');
      }
    },
    [
      assetDraft,
      clearSliderMaxIntent,
      clearSliderPreview,
      commitUsdAmount,
      effectivePrice,
      inputOptions,
      keepSizeEmpty,
      priceReady,
      showsAssetSize,
      usdDraft,
    ],
  );

  const onBlur = useCallback(() => {
    setIsSizeFocused(false);
    if (keepSizeEmpty) {
      return;
    }

    if (!showsAssetSize) {
      const finalizedDraft = finalizeNumericTextInput(usdDraft);
      setUsdDraft(finalizedDraft);
      commitUsdAmount(finalizedDraft || '0');
      if (
        activeDenominationUnit === 'asset' &&
        priceReady &&
        assetDraftState.source === 'canonical'
      ) {
        setAssetDraftState({
          value: getAssetFromUsd(finalizedDraft, effectivePrice, szDecimals),
          source: 'canonical',
          projected: true,
        });
      }
      return;
    }

    const finalizedDraft = finalizeNumericTextInput(assetDraft);
    if (!priceReady) {
      setAssetDraftState({
        value: finalizedDraft,
        source: 'canonical',
        projected: assetDraftState.projected,
      });
      return;
    }

    if (assetDraftState.source === 'canonical') {
      setAssetDraftState({
        value: finalizedDraft,
        source: 'canonical',
        projected: true,
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
      projected: true,
    });
    commitUsdAmount(nextUsdAmount || '0');
  }, [
    activeDenominationUnit,
    assetDraft,
    assetDraftState.projected,
    assetDraftState.source,
    commitUsdAmount,
    effectivePrice,
    keepSizeEmpty,
    priceReady,
    showsAssetSize,
    szDecimals,
    usdDraft,
  ]);

  const onFocus = useCallback(() => {
    cancelPendingSliderPreview();
    setIsSizeFocused(true);
  }, [cancelPendingSliderPreview]);

  const onToggleDenomination = useCallback(() => {
    if (!canToggleDenomination || keepSizeEmpty) {
      return;
    }

    clearSliderPreview();
    clearSliderMaxIntent();

    if (activeDenominationUnit === 'usd') {
      const canonicalUsdDraft = finalizeNumericTextInput(usdDraft);
      setAssetDraftState({
        value: getAssetFromUsd(canonicalUsdDraft, effectivePrice, szDecimals),
        source: 'canonical',
        projected: true,
      });
      setDenomination('asset');
      return;
    }

    const nextUsdAmount = getUsdFromAsset(assetDraft, effectivePrice);
    setUsdDraft(nextUsdAmount);
    commitUsdAmount(nextUsdAmount || '0');
    setDenomination('usd');
  }, [
    assetDraft,
    canToggleDenomination,
    clearSliderPreview,
    commitUsdAmount,
    activeDenominationUnit,
    effectivePrice,
    keepSizeEmpty,
    clearSliderMaxIntent,
    setDenomination,
    szDecimals,
    usdDraft,
  ]);

  const effectiveUsdAmount = useMemo(() => {
    if (keepSizeEmpty) {
      return '0';
    }

    if (sliderPreview !== null) {
      return sliderPreview;
    }

    if (!showsAssetSize) {
      return finalizeNumericTextInput(usdDraft) || '0';
    }

    if (!priceReady) {
      return usdAmount || '0';
    }

    // Dirty asset drafts re-project against the live price. Once clean (after
    // blur snap), use the committed USD so szDecimals snap does not re-round
    // cents and change order sizing.
    if (assetDraftState.source === 'user') {
      return getUsdFromAsset(assetDraft, effectivePrice) || '0';
    }

    return finalizeNumericTextInput(usdDraft) || '0';
  }, [
    assetDraft,
    assetDraftState.source,
    effectivePrice,
    keepSizeEmpty,
    priceReady,
    showsAssetSize,
    sliderPreview,
    usdAmount,
    usdDraft,
  ]);

  const onSliderValueChange = useCallback(
    (value: number) => {
      const nextUsdAmount = clampSliderUsdAmount(value, maxPossibleAmount);
      const atMax = value >= maxPossibleAmount;
      sliderPreviewRef.current = nextUsdAmount;
      sliderAtMaxRef.current = atMax;
      setSliderPreview(nextUsdAmount);
      setIsAtMaxAmount(atMax);
    },
    [maxPossibleAmount],
  );

  const commitSliderUsdAmount = useCallback(
    (nextUsdAmount: string, atMax = false) => {
      const didCommitCanonicalAmount = commitUsdAmount(nextUsdAmount);
      sliderAtMaxRef.current = atMax;
      setIsAtMaxAmount(atMax);
      setUsdDraft(nextUsdAmount);
      if (priceReady) {
        setAssetDraftState({
          value: getAssetFromUsd(nextUsdAmount, effectivePrice, szDecimals),
          source: 'canonical',
          projected: true,
        });
      }
      clearSliderPreview();
      return didCommitCanonicalAmount;
    },
    [
      clearSliderPreview,
      commitUsdAmount,
      effectivePrice,
      priceReady,
      szDecimals,
    ],
  );

  const onSliderDragEnd = useCallback(
    (value: number) => {
      const nextUsdAmount = clampSliderUsdAmount(value, maxPossibleAmount);
      const atMax = value >= maxPossibleAmount;
      if (keepSizeEmpty) {
        sliderPreviewRef.current = nextUsdAmount;
        sliderAtMaxRef.current = atMax;
        setSliderPreview(nextUsdAmount);
        setIsAtMaxAmount(atMax);
        return;
      }

      commitSliderUsdAmount(nextUsdAmount, atMax);
    },
    [commitSliderUsdAmount, keepSizeEmpty, maxPossibleAmount],
  );

  const onSliderDragCancel = useCallback(() => {
    if (keepSizeEmpty) {
      clearSliderPreview();
      clearSliderMaxIntent();
      return;
    }

    const nextUsdAmount = sliderPreviewRef.current;
    if (nextUsdAmount !== null) {
      commitSliderUsdAmount(nextUsdAmount, sliderAtMaxRef.current);
    }
  }, [
    clearSliderMaxIntent,
    clearSliderPreview,
    commitSliderUsdAmount,
    keepSizeEmpty,
  ]);

  const commitPendingSliderPreview = useCallback((): boolean => {
    if (keepSizeEmpty) {
      return false;
    }

    const nextUsdAmount = sliderPreviewRef.current;
    if (nextUsdAmount === null) {
      return false;
    }

    return commitSliderUsdAmount(nextUsdAmount, sliderAtMaxRef.current);
  }, [commitSliderUsdAmount, keepSizeEmpty]);

  const value = useMemo(() => {
    if (keepSizeEmpty) {
      return '';
    }

    if (sliderPreview === null) {
      return showsAssetSize ? assetDraft : usdDraft;
    }
    if (!showsAssetSize) {
      return sliderPreview;
    }
    if (priceReady) {
      return getAssetFromUsd(sliderPreview, effectivePrice, szDecimals);
    }
    return assetDraft;
  }, [
    assetDraft,
    effectivePrice,
    keepSizeEmpty,
    priceReady,
    showsAssetSize,
    sliderPreview,
    szDecimals,
    usdDraft,
  ]);

  const denomination = useMemo<PerpsProSizeDenomination>(
    () =>
      showsAssetSize ? { unit: 'asset', symbol: assetSymbol } : { unit: 'usd' },
    [assetSymbol, showsAssetSize],
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
      value: getSliderDisplayValue(
        keepSizeEmpty ? (sliderPreview ?? '0') : effectiveUsdAmount,
        maxPossibleAmount,
      ),
      maximumValue: Math.max(0, maxPossibleAmount),
      onValueChange: onSliderValueChange,
      onDragEnd: onSliderDragEnd,
      onDragCancel: onSliderDragCancel,
    }),
    [
      effectiveUsdAmount,
      keepSizeEmpty,
      maxPossibleAmount,
      onSliderDragCancel,
      onSliderDragEnd,
      onSliderValueChange,
      sliderPreview,
    ],
  );

  return {
    sizeInput,
    sizeSlider,
    effectiveUsdAmount,
    isAtMaxAmount,
    commitPendingSliderPreview,
  };
};
