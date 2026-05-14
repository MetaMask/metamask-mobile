import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';
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
import {
  PERPS_SLIPPAGE_MIN_BPS,
  PERPS_SLIPPAGE_MAX_BPS,
  PERPS_SLIPPAGE_STEP_BPS,
  PERPS_SLIPPAGE_QUICK_PICKS_BPS,
  bpsToPercent,
  percentToBps,
} from '../../constants/slippageConfig';
import { createStyles } from './PerpsSlippageBottomSheet.styles';
import {
  PerpsSlippageConfigSelectorsIDs,
  getPerpsSlippageConfigSelector,
} from '../../Perps.testIds';

interface PerpsSlippageBottomSheetProps {
  isVisible: boolean;
  currentValueBps: number;
  onClose: () => void;
  onSave: (valueBps: number) => void;
}

const MIN_PCT = bpsToPercent(PERPS_SLIPPAGE_MIN_BPS);
const MAX_PCT = bpsToPercent(PERPS_SLIPPAGE_MAX_BPS);
const STEP_PCT = bpsToPercent(PERPS_SLIPPAGE_STEP_BPS);

function snapToStep(value: number): number {
  const snapped = Math.round(value / STEP_PCT) * STEP_PCT;
  return Number(snapped.toFixed(1));
}

const PerpsSlippageBottomSheet: React.FC<PerpsSlippageBottomSheetProps> = ({
  isVisible,
  currentValueBps,
  onClose,
  onSave,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  // Draft is in percent for display (user types "3" for 3%)
  const [draftValue, setDraftValue] = useState(
    bpsToPercent(currentValueBps).toString(),
  );
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setDraftValue(bpsToPercent(currentValueBps).toString());
    }
  }, [isVisible, currentValueBps]);

  const parsedDraft = Number.parseFloat(draftValue);
  const draftIsEmpty = draftValue.trim() === '';
  const draftIsValid =
    Number.isFinite(parsedDraft) &&
    parsedDraft >= MIN_PCT &&
    parsedDraft <= MAX_PCT;

  const handleSave = useCallback(() => {
    if (!draftIsValid) return;
    const clampedPct = snapToStep(
      Math.min(MAX_PCT, Math.max(MIN_PCT, parsedDraft)),
    );
    onSave(percentToBps(clampedPct));
    onClose();
  }, [draftIsValid, parsedDraft, onSave, onClose]);

  const handleQuickPick = useCallback((bps: number) => {
    setDraftValue(bpsToPercent(bps).toString());
  }, []);

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
    >
      <BottomSheetHeader onClose={onClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('perps.slippage.config_title')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.container}>
        <Text
          variant={TextVariant.BodySM}
          color={TextColor.Alternative}
          style={styles.description}
        >
          {strings('perps.slippage.config_description')}
        </Text>

        <View
          style={[
            styles.inputContainer,
            isFocused && styles.inputContainerFocused,
            !draftIsValid && !draftIsEmpty && styles.inputContainerError,
          ]}
        >
          <TextInput
            testID={PerpsSlippageConfigSelectorsIDs.INPUT}
            style={styles.input}
            value={draftValue}
            onChangeText={setDraftValue}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            keyboardType="decimal-pad"
            selectTextOnFocus
            accessibilityLabel={strings('perps.slippage.input_label')}
          />
          <Text style={styles.percentSuffix}>%</Text>
        </View>

        <View style={styles.quickSelectContainer}>
          {PERPS_SLIPPAGE_QUICK_PICKS_BPS.map((bps) => {
            const pct = bpsToPercent(bps);
            const isSelected =
              draftIsValid && Math.abs(parsedDraft - pct) < STEP_PCT / 2;
            return (
              <TouchableOpacity
                key={bps}
                testID={getPerpsSlippageConfigSelector.preset(pct)}
                style={[
                  styles.quickSelectButton,
                  isSelected && styles.quickSelectButtonActive,
                ]}
                onPress={() => handleQuickPick(bps)}
              >
                <Text
                  variant={TextVariant.BodyLGMedium}
                  color={isSelected ? TextColor.Inverse : TextColor.Default}
                >
                  {pct}%
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {!draftIsValid && !draftIsEmpty && (
          <Text
            testID={PerpsSlippageConfigSelectorsIDs.ERROR}
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
      </View>

      <BottomSheetFooter
        buttonPropsArray={[
          {
            label: strings('perps.slippage.save'),
            variant: ButtonVariants.Primary,
            size: ButtonSize.Lg,
            onPress: handleSave,
            isDisabled: !draftIsValid,
            testID: PerpsSlippageConfigSelectorsIDs.SAVE,
          },
        ]}
      />
    </BottomSheet>
  );
};

PerpsSlippageBottomSheet.displayName = 'PerpsSlippageBottomSheet';

export default memo(
  PerpsSlippageBottomSheet,
  (prevProps, nextProps) =>
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.currentValueBps === nextProps.currentValueBps,
);
