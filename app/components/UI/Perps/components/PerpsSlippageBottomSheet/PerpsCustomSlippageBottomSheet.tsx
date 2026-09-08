import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { strings } from '../../../../../../locales/i18n';
import InputStepper from '../../../../../component-library/components-temp/InputStepper';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetFooter from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Keypad from '../../../../Base/Keypad';
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
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const [draftValue, setDraftValue] = useState<string>(
    bpsToPercent(currentValueBps).toString(),
  );

  useEffect(() => {
    if (isVisible) {
      setDraftValue(bpsToPercent(currentValueBps).toString());
      bottomSheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible, currentValueBps]);

  const parsedDraft = Number.parseFloat(draftValue);
  const draftIsEmpty = draftValue.trim() === '' || draftValue === '.';
  const draftIsFiniteNumber = Number.isFinite(parsedDraft);
  const draftIsInRange =
    draftIsFiniteNumber && parsedDraft >= MIN_PCT && parsedDraft <= MAX_PCT;
  const showError = !draftIsEmpty && !draftIsInRange;

  const handleKeypadChange = useCallback(
    ({ value }: { value: string; valueAsNumber: number }) => {
      setDraftValue(value);
    },
    [],
  );

  const adjustBy = useCallback(
    (deltaPct: number) => {
      const basePct = draftIsFiniteNumber ? parsedDraft : MIN_PCT;
      const next = snapToStep(clampToRange(basePct + deltaPct));
      setDraftValue(next.toString());
    },
    [draftIsFiniteNumber, parsedDraft],
  );

  const handleDecrement = useCallback(() => adjustBy(-STEP_PCT), [adjustBy]);
  const handleIncrement = useCallback(() => adjustBy(STEP_PCT), [adjustBy]);

  const handleSet = useCallback(() => {
    if (!draftIsInRange) return;
    const finalPct = snapToStep(clampToRange(parsedDraft));
    onSave(percentToBps(finalPct));
  }, [draftIsInRange, parsedDraft, onSave]);

  const footerButtonProps = [
    {
      label: strings('perps.slippage.cancel'),
      testID: PerpsCustomSlippageBottomSheetSelectorsIDs.CANCEL,
      variant: ButtonVariants.Secondary,
      size: ButtonSize.Lg,
      onPress: onClose,
    },
    {
      label: strings('perps.slippage.set'),
      testID: PerpsCustomSlippageBottomSheetSelectorsIDs.SET,
      variant: ButtonVariants.Primary,
      size: ButtonSize.Lg,
      onPress: handleSet,
      isDisabled: !draftIsInRange,
    },
  ];

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
    >
      <BottomSheetHeader onClose={onClose}>
        <Text variant={TextVariant.HeadingMd}>
          {strings('perps.slippage.use_custom_title')}
        </Text>
      </BottomSheetHeader>

      <Box paddingHorizontal={4} paddingBottom={4}>
        <Box paddingVertical={6}>
          <InputStepper
            value={draftValue}
            onDecrease={handleDecrement}
            onIncrease={handleIncrement}
            minAmount={MIN_PCT}
            maxAmount={MAX_PCT}
            postValue="%"
            testID={PerpsCustomSlippageBottomSheetSelectorsIDs.DISPLAY}
            decreaseButtonProps={{
              testID: PerpsCustomSlippageBottomSheetSelectorsIDs.DECREMENT,
              accessibilityLabel: strings('perps.slippage.decrement_label'),
            }}
            increaseButtonProps={{
              testID: PerpsCustomSlippageBottomSheetSelectorsIDs.INCREMENT,
              accessibilityLabel: strings('perps.slippage.increment_label'),
            }}
            description={
              showError
                ? {
                    message: strings('perps.slippage.out_of_range', {
                      min: `${MIN_PCT}`,
                      max: `${MAX_PCT}`,
                    }),
                    color: TextColor.ErrorDefault,
                    testID: PerpsCustomSlippageBottomSheetSelectorsIDs.ERROR,
                  }
                : undefined
            }
          />
        </Box>

        <Box
          marginTop={2}
          testID={PerpsCustomSlippageBottomSheetSelectorsIDs.KEYPAD}
        >
          <Keypad
            value={draftValue}
            onChange={handleKeypadChange}
            currency="USD_PERPS"
            decimals={1}
          />
        </Box>
      </Box>

      <BottomSheetFooter buttonPropsArray={footerButtonProps} />
    </BottomSheet>
  );
};

PerpsCustomSlippageBottomSheet.displayName = 'PerpsCustomSlippageBottomSheet';

export default memo(PerpsCustomSlippageBottomSheet);
