import {
  ButtonBaseSize,
  ButtonFilter,
  IconName,
} from '@metamask/design-system-react-native';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
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
  PERPS_SLIPPAGE_QUICK_PICKS_BPS,
  bpsToPercent,
} from '../../constants/slippageConfig';
import {
  PerpsSlippageConfigSelectorsIDs,
  getPerpsSlippageConfigSelector,
} from '../../Perps.testIds';
import PerpsCustomSlippageBottomSheet from './PerpsCustomSlippageBottomSheet';
import { createStyles } from './PerpsSlippageBottomSheet.styles';

interface PerpsSlippageBottomSheetProps {
  isVisible: boolean;
  currentValueBps: number;
  onClose: () => void;
  onSave: (valueBps: number) => void;
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

  const [selectedBps, setSelectedBps] = useState(currentValueBps);
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setSelectedBps(currentValueBps);
      setIsCustomOpen(false);
    }
  }, [isVisible, currentValueBps]);

  const isCustom = !matchesPreset(selectedBps);

  const handlePresetPress = useCallback((bps: number) => {
    setSelectedBps(bps);
  }, []);

  const handleOpenCustom = useCallback(() => {
    setIsCustomOpen(true);
  }, []);

  const handleCustomClose = useCallback(() => {
    setIsCustomOpen(false);
  }, []);

  const handleCustomSave = useCallback((bps: number) => {
    setSelectedBps(bps);
    setIsCustomOpen(false);
  }, []);

  const handleSet = useCallback(() => {
    onSave(selectedBps);
    onClose();
  }, [onSave, onClose, selectedBps]);

  const footerButtonProps = [
    {
      label: strings('perps.slippage.set'),
      testID: PerpsSlippageConfigSelectorsIDs.SET,
      variant: ButtonVariants.Primary,
      size: ButtonSize.Lg,
      onPress: handleSet,
    },
  ];

  if (!isVisible) return null;

  if (isCustomOpen) {
    return (
      <PerpsCustomSlippageBottomSheet
        isVisible
        currentValueBps={selectedBps}
        onClose={handleCustomClose}
        onSave={handleCustomSave}
      />
    );
  }

  const customLabel = isCustom ? `${bpsToPercent(selectedBps)}%` : undefined;

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

        <View style={styles.chipRow}>
          {PERPS_SLIPPAGE_QUICK_PICKS_BPS.map((bps) => {
            const pct = bpsToPercent(bps);
            const isSelected = !isCustom && selectedBps === bps;
            return (
              <ButtonFilter
                key={bps}
                isActive={isSelected}
                size={ButtonBaseSize.Lg}
                onPress={() => handlePresetPress(bps)}
                testID={getPerpsSlippageConfigSelector.preset(pct)}
                style={styles.chip}
              >
                {`${pct}%`}
              </ButtonFilter>
            );
          })}

          <ButtonFilter
            isActive={isCustom}
            size={ButtonBaseSize.Lg}
            onPress={handleOpenCustom}
            testID={PerpsSlippageConfigSelectorsIDs.EDIT_CHIP}
            startIconName={IconName.Edit}
            accessibilityLabel={strings('perps.slippage.custom')}
            style={isCustom && customLabel ? styles.chip : styles.editChip}
          >
            {isCustom && customLabel ? customLabel : ''}
          </ButtonFilter>
        </View>
      </View>

      <BottomSheetFooter buttonPropsArray={footerButtonProps} />
    </BottomSheet>
  );
};

PerpsSlippageBottomSheet.displayName = 'PerpsSlippageBottomSheet';

export default memo(PerpsSlippageBottomSheet);
