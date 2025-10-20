import React, { useRef, useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { Box } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { styleSheet } from './PerpsMarketSortDirectionBottomSheet.styles';
import type { PerpsMarketSortDirectionBottomSheetProps } from './PerpsMarketSortDirectionBottomSheet.types';
import type { SortDirection } from '../../utils/sortMarkets';

// Available sort directions with their display labels
const DIRECTION_OPTIONS: { value: SortDirection; labelKey: string }[] = [
  { value: 'desc', labelKey: 'perps.sort.high_to_low' },
  { value: 'asc', labelKey: 'perps.sort.low_to_high' },
];

/**
 * PerpsMarketSortDirectionBottomSheet Component
 *
 * Bottom sheet for selecting sort direction (High to Low / Low to High).
 * Follows the candle period bottom sheet pattern with auto-close on selection.
 *
 * Features:
 * - Grid layout of direction options
 * - Highlights current selection
 * - Auto-closes on selection
 * - Consistent styling with other bottom sheets
 *
 * @example
 * ```tsx
 * <PerpsMarketSortDirectionBottomSheet
 *   isVisible={showDirectionSheet}
 *   onClose={() => setShowDirectionSheet(false)}
 *   selectedDirection={direction}
 *   onDirectionSelect={handleDirectionChange}
 * />
 * ```
 */
const PerpsMarketSortDirectionBottomSheet: React.FC<
  PerpsMarketSortDirectionBottomSheetProps
> = ({ isVisible, onClose, selectedDirection, onDirectionSelect, testID }) => {
  const { styles } = useStyles(styleSheet, {});
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  const handleDirectionSelect = (direction: SortDirection) => {
    onDirectionSelect(direction);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
      isFullscreen={false}
      testID={testID}
    >
      <BottomSheetHeader onClose={onClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('perps.sort.sort_direction')}
        </Text>
      </BottomSheetHeader>
      <Box style={styles.optionsGrid}>
        {DIRECTION_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              selectedDirection === option.value && styles.optionActive,
            ]}
            onPress={() => handleDirectionSelect(option.value)}
            testID={testID ? `${testID}-option-${option.value}` : undefined}
          >
            <Text
              variant={
                selectedDirection === option.value
                  ? TextVariant.BodyMDBold
                  : TextVariant.BodySMMedium
              }
              color={
                selectedDirection === option.value
                  ? TextColor.Inverse
                  : TextColor.Default
              }
            >
              {strings(option.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </Box>
    </BottomSheet>
  );
};

export default PerpsMarketSortDirectionBottomSheet;
