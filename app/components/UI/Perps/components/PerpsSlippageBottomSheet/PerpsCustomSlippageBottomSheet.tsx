import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { strings } from '../../../../../../locales/i18n';
import {
  IconColor,
  IconName,
  IconSize,
  TextColor,
} from '@metamask/design-system-react-native';
import CustomSlippageBottomSheet from '../../../CustomSlippageBottomSheet';
import {
  PERPS_SLIPPAGE_MAX_BPS,
  PERPS_SLIPPAGE_MIN_BPS,
  PERPS_SLIPPAGE_STEP_BPS,
  bpsToPercent,
  percentToBps,
} from '../../constants/slippageConfig';
import { PerpsCustomSlippageBottomSheetSelectorsIDs } from '../../Perps.testIds';

interface PerpsCustomSlippageBottomSheetProps {
  isVisible: boolean;
  currentValueBps: number;
  onClose: () => void;
  onSave: (valueBps: number) => void;
}

const MIN_PCT = bpsToPercent(PERPS_SLIPPAGE_MIN_BPS);
const MAX_PCT = bpsToPercent(PERPS_SLIPPAGE_MAX_BPS);
const STEP_PCT = bpsToPercent(PERPS_SLIPPAGE_STEP_BPS);

function snapToStep(pct: number): number {
  const snappedBps =
    Math.round(percentToBps(pct) / PERPS_SLIPPAGE_STEP_BPS) *
    PERPS_SLIPPAGE_STEP_BPS;
  return bpsToPercent(snappedBps);
}

function clampToRange(pct: number): number {
  return Math.min(MAX_PCT, Math.max(MIN_PCT, pct));
}

const PerpsCustomSlippageBottomSheet: React.FC<
  PerpsCustomSlippageBottomSheetProps
> = ({ isVisible, currentValueBps, onClose, onSave }) => {
  const [draftValue, setDraftValue] = useState(
    bpsToPercent(currentValueBps).toString(),
  );

  useEffect(() => {
    if (isVisible) {
      setDraftValue(bpsToPercent(currentValueBps).toString());
    }
  }, [isVisible, currentValueBps]);

  const parsedDraft = Number.parseFloat(draftValue);
  const draftIsEmpty = draftValue.trim() === '' || draftValue === '.';
  const draftIsFiniteNumber = Number.isFinite(parsedDraft);
  const draftIsInRange =
    draftIsFiniteNumber && parsedDraft >= MIN_PCT && parsedDraft <= MAX_PCT;
  const showError = !draftIsEmpty && !draftIsInRange;

  const description = useMemo(
    () =>
      showError
        ? {
            message: strings('perps.slippage.out_of_range', {
              min: `${MIN_PCT}`,
              max: `${MAX_PCT}`,
            }),
            color: TextColor.ErrorDefault,
            icon: {
              name: IconName.Danger,
              size: IconSize.Lg,
              color: IconColor.ErrorDefault,
            },
          }
        : undefined,
    [showError],
  );

  const normalizeValue = useCallback(
    (pct: number) => snapToStep(clampToRange(pct)).toString(),
    [],
  );

  const handleConfirm = useCallback(
    (value: string) => {
      const parsed = Number.parseFloat(value);
      if (!Number.isFinite(parsed) || parsed < MIN_PCT || parsed > MAX_PCT) {
        return;
      }
      onSave(percentToBps(snapToStep(clampToRange(parsed))));
    },
    [onSave],
  );

  return (
    <CustomSlippageBottomSheet
      isVisible={isVisible}
      title={strings('perps.slippage.use_custom_title')}
      primaryButtonLabel={strings('perps.slippage.set')}
      secondaryButtonLabel={strings('perps.slippage.cancel')}
      value={draftValue}
      onValueChange={setDraftValue}
      minAmount={MIN_PCT}
      maxAmount={MAX_PCT}
      step={STEP_PCT}
      inputMaxDecimals={1}
      keypadCurrency="USD_PERPS"
      keypadDecimals={1}
      description={description}
      isConfirmDisabled={!draftIsInRange}
      normalizeValue={normalizeValue}
      onClose={onClose}
      onConfirm={handleConfirm}
      primaryButtonTestID={PerpsCustomSlippageBottomSheetSelectorsIDs.SET}
      secondaryButtonTestID={PerpsCustomSlippageBottomSheetSelectorsIDs.CANCEL}
      keypadTestID={PerpsCustomSlippageBottomSheetSelectorsIDs.KEYPAD}
    />
  );
};

PerpsCustomSlippageBottomSheet.displayName = 'PerpsCustomSlippageBottomSheet';

export default memo(PerpsCustomSlippageBottomSheet);
