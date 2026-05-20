import {
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  IconName,
} from '@metamask/design-system-react-native';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetFooter from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import Keypad from '../../../../Base/Keypad';
import {
  PERPS_SLIPPAGE_MAX_BPS,
  PERPS_SLIPPAGE_MIN_BPS,
  PERPS_SLIPPAGE_STEP_BPS,
  bpsToPercent,
  percentToBps,
} from '../../constants/slippageConfig';
import { PerpsCustomSlippageBottomSheetSelectorsIDs } from '../../Perps.testIds';
import { createStyles } from './PerpsCustomSlippageBottomSheet.styles';

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
  return Number((Math.round(pct / STEP_PCT) * STEP_PCT).toFixed(1));
}

function clampToRange(pct: number): number {
  return Math.min(MAX_PCT, Math.max(MIN_PCT, pct));
}

const PerpsCustomSlippageBottomSheet: React.FC<
  PerpsCustomSlippageBottomSheetProps
> = ({ isVisible, currentValueBps, onClose, onSave }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  const [draftValue, setDraftValue] = useState<string>(
    bpsToPercent(currentValueBps).toString(),
  );

  useEffect(() => {
    if (isVisible) {
      setDraftValue(bpsToPercent(currentValueBps).toString());
      bottomSheetRef.current?.onOpenBottomSheet();
      Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(cursorOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      cursorOpacity.stopAnimation();
      cursorOpacity.setValue(1);
    }
  }, [isVisible, currentValueBps, cursorOpacity]);

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
        <Text variant={TextVariant.HeadingMD}>
          {strings('perps.slippage.use_custom_title')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.container}>
        <View
          style={styles.displayRow}
          testID={PerpsCustomSlippageBottomSheetSelectorsIDs.DISPLAY}
        >
          <ButtonIcon
            iconName={IconName.Minus}
            size={ButtonIconSize.Md}
            variant={ButtonIconVariant.Filled}
            onPress={handleDecrement}
            isDisabled={draftIsFiniteNumber && parsedDraft <= MIN_PCT + 1e-9}
            testID={PerpsCustomSlippageBottomSheetSelectorsIDs.DECREMENT}
            accessibilityLabel={strings('perps.slippage.decrement_label')}
          />
          <View style={styles.displayCenter}>
            <Text style={styles.displayValue}>{draftValue || '0'}</Text>
            <Animated.View
              style={[styles.cursor, { opacity: cursorOpacity }]}
            />
            <Text style={styles.displaySuffix}>%</Text>
          </View>
          <ButtonIcon
            iconName={IconName.Add}
            size={ButtonIconSize.Md}
            variant={ButtonIconVariant.Filled}
            onPress={handleIncrement}
            isDisabled={draftIsFiniteNumber && parsedDraft >= MAX_PCT - 1e-9}
            testID={PerpsCustomSlippageBottomSheetSelectorsIDs.INCREMENT}
            accessibilityLabel={strings('perps.slippage.increment_label')}
          />
        </View>

        {showError && (
          <Text
            testID={PerpsCustomSlippageBottomSheetSelectorsIDs.ERROR}
            variant={TextVariant.BodySM}
            color={TextColor.Error}
            style={styles.errorText}
          >
            {strings('perps.slippage.out_of_range', {
              min: `${MIN_PCT}`,
              max: `${MAX_PCT}`,
            })}
          </Text>
        )}

        <View
          style={styles.keypadContainer}
          testID={PerpsCustomSlippageBottomSheetSelectorsIDs.KEYPAD}
        >
          <Keypad
            value={draftValue}
            onChange={handleKeypadChange}
            currency="USD"
            decimals={1}
          />
        </View>
      </View>

      <BottomSheetFooter buttonPropsArray={footerButtonProps} />
    </BottomSheet>
  );
};

PerpsCustomSlippageBottomSheet.displayName = 'PerpsCustomSlippageBottomSheet';

export default memo(PerpsCustomSlippageBottomSheet);
