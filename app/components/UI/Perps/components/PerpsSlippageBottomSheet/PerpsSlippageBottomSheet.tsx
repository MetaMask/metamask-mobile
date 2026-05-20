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

function matchesPreset(bps: number): boolean {
  return PERPS_SLIPPAGE_QUICK_PICKS_BPS.includes(bps);
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

  const [isCustom, setIsCustom] = useState(!matchesPreset(currentValueBps));
  const [selectedBps, setSelectedBps] = useState(currentValueBps);
  const [draftValue, setDraftValue] = useState(
    bpsToPercent(currentValueBps).toString(),
  );

  useEffect(() => {
    if (isVisible) {
      const fromPreset = matchesPreset(currentValueBps);
      setIsCustom(!fromPreset);
      setSelectedBps(currentValueBps);
      setDraftValue(bpsToPercent(currentValueBps).toString());
    }
  }, [isVisible, currentValueBps]);

  const parsedDraft = Number.parseFloat(draftValue);
  const draftIsEmpty = draftValue.trim() === '';
  const draftIsValid =
    Number.isFinite(parsedDraft) &&
    parsedDraft >= MIN_PCT &&
    parsedDraft <= MAX_PCT;

  const canSet = isCustom ? draftIsValid : true;

  const handleSet = useCallback(() => {
    if (isCustom) {
      if (!draftIsValid) return;
      const clampedPct = snapToStep(
        Math.min(MAX_PCT, Math.max(MIN_PCT, parsedDraft)),
      );
      onSave(percentToBps(clampedPct));
    } else {
      onSave(selectedBps);
    }
    onClose();
  }, [isCustom, draftIsValid, parsedDraft, selectedBps, onSave, onClose]);

  const handlePreset = useCallback((bps: number) => {
    setIsCustom(false);
    setSelectedBps(bps);
  }, []);

  const handleCustom = useCallback(() => {
    setIsCustom(true);
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

        <View style={styles.quickSelectContainer}>
          {PERPS_SLIPPAGE_QUICK_PICKS_BPS.map((bps) => {
            const pct = bpsToPercent(bps);
            const isSelected = !isCustom && selectedBps === bps;
            return (
              <TouchableOpacity
                key={bps}
                testID={getPerpsSlippageConfigSelector.preset(pct)}
                style={[
                  styles.quickSelectButton,
                  isSelected && styles.quickSelectButtonActive,
                ]}
                onPress={() => handlePreset(bps)}
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

          {isCustom ? (
            <View
              style={[
                styles.quickSelectButton,
                styles.customInputContainer,
                !draftIsValid && !draftIsEmpty && styles.inputContainerError,
              ]}
            >
              <TextInput
                testID={PerpsSlippageConfigSelectorsIDs.INPUT}
                style={styles.customInput}
                value={draftValue}
                onChangeText={setDraftValue}
                keyboardType="decimal-pad"
                autoFocus
                selectTextOnFocus
                accessibilityLabel={strings('perps.slippage.input_label')}
              />
              <Text style={styles.customPercentSuffix}>%</Text>
            </View>
          ) : (
            <TouchableOpacity
              testID={PerpsSlippageConfigSelectorsIDs.CUSTOM}
              style={styles.quickSelectButton}
              onPress={handleCustom}
            >
              <Text
                variant={TextVariant.BodyLGMedium}
                color={TextColor.Default}
              >
                {strings('perps.slippage.custom')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {isCustom && !draftIsValid && !draftIsEmpty && (
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
            label: strings('perps.slippage.set'),
            variant: ButtonVariants.Primary,
            size: ButtonSize.Lg,
            onPress: handleSet,
            isDisabled: !canSet,
            testID: PerpsSlippageConfigSelectorsIDs.SET,
          },
        ]}
      />
    </BottomSheet>
  );
};

PerpsSlippageBottomSheet.displayName = 'PerpsSlippageBottomSheet';

export default memo(PerpsSlippageBottomSheet);
