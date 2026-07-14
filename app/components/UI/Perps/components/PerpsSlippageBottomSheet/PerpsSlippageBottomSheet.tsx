import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  ButtonSize,
  FilterButton,
  FilterButtonGroup,
  FilterButtonSize,
  FilterButtonVariant,
  IconName,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { strings } from '../../../../../../locales/i18n';
import {
  PERPS_SLIPPAGE_QUICK_PICKS_BPS,
  bpsToPercent,
} from '../../constants/slippageConfig';
import {
  PerpsSlippageConfigSelectorsIDs,
  getPerpsSlippageConfigSelector,
} from '../../Perps.testIds';
import PerpsCustomSlippageBottomSheet from './PerpsCustomSlippageBottomSheet';

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
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const [selectedBps, setSelectedBps] = useState(currentValueBps);
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setSelectedBps(currentValueBps);
      setIsCustomOpen(false);
      bottomSheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible, currentValueBps]);

  const isCustom = !matchesPreset(selectedBps);

  const groupValue = useMemo(
    () => (isCustom ? '' : String(selectedBps)),
    [isCustom, selectedBps],
  );

  const handleFilterChange = useCallback((value: string) => {
    setSelectedBps(Number(value));
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

  const primaryButtonProps = useMemo(
    () => ({
      children: strings('perps.slippage.set'),
      onPress: handleSet,
      size: ButtonSize.Lg,
      testID: PerpsSlippageConfigSelectorsIDs.SET,
    }),
    [handleSet],
  );

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

  const customLabel = isCustom ? `${bpsToPercent(selectedBps)}%` : null;

  return (
    <BottomSheet ref={bottomSheetRef} onClose={onClose}>
      <BottomSheetHeader onClose={onClose}>
        {strings('perps.slippage.config_title')}
      </BottomSheetHeader>

      <Box twClassName="px-4 pb-4">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('perps.slippage.config_description')}
        </Text>

        <Box twClassName="mt-4 w-full">
          <FilterButtonGroup
            value={groupValue}
            onChange={handleFilterChange}
            variant={FilterButtonVariant.Primary}
            twClassName="grow justify-center gap-2"
          >
            {PERPS_SLIPPAGE_QUICK_PICKS_BPS.map((bps) => {
              const pct = bpsToPercent(bps);
              return (
                <FilterButton
                  key={bps}
                  value={String(bps)}
                  size={FilterButtonSize.Lg}
                  testID={getPerpsSlippageConfigSelector.preset(pct)}
                >
                  {`${pct}%`}
                </FilterButton>
              );
            })}
            <FilterButton
              isSelected={isCustom}
              variant={FilterButtonVariant.Primary}
              size={FilterButtonSize.Lg}
              onPress={handleOpenCustom}
              testID={PerpsSlippageConfigSelectorsIDs.EDIT_CHIP}
              startIconName={IconName.Edit}
              accessibilityLabel={strings('perps.slippage.custom')}
            >
              {customLabel}
            </FilterButton>
          </FilterButtonGroup>
        </Box>
      </Box>

      <BottomSheetFooter primaryButtonProps={primaryButtonProps} />
    </BottomSheet>
  );
};

PerpsSlippageBottomSheet.displayName = 'PerpsSlippageBottomSheet';

export default memo(PerpsSlippageBottomSheet);
