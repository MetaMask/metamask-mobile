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
import { styleSheet } from './PerpsMarketSortFieldBottomSheet.styles';
import type { PerpsMarketSortFieldBottomSheetProps } from './PerpsMarketSortFieldBottomSheet.types';
import type { SortField } from '../../utils/sortMarkets';

// Available sort fields with their display labels
const SORT_OPTIONS: { value: SortField; labelKey: string }[] = [
  { value: 'volume', labelKey: 'perps.sort.volume' },
  { value: 'priceChange', labelKey: 'perps.sort.price_change' },
  { value: 'fundingRate', labelKey: 'perps.sort.funding_rate' },
];

/**
 * PerpsMarketSortFieldBottomSheet Component
 *
 * Bottom sheet for selecting market sort field (Volume, Price Change, Funding Rate).
 * Follows the candle period bottom sheet pattern with auto-close on selection.
 *
 * Features:
 * - Grid layout of sort options
 * - Highlights current selection
 * - Auto-closes on selection
 * - Consistent styling with other bottom sheets
 *
 * @example
 * ```tsx
 * <PerpsMarketSortFieldBottomSheet
 *   isVisible={showSortSheet}
 *   onClose={() => setShowSortSheet(false)}
 *   selectedSort={sortBy}
 *   onSortSelect={handleSortChange}
 * />
 * ```
 */
const PerpsMarketSortFieldBottomSheet: React.FC<
  PerpsMarketSortFieldBottomSheetProps
> = ({ isVisible, onClose, selectedSort, onSortSelect, testID }) => {
  const { styles } = useStyles(styleSheet, {});
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  const handleSortSelect = (sort: SortField) => {
    onSortSelect(sort);
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
          {strings('perps.sort.sort_by')}
        </Text>
      </BottomSheetHeader>
      <Box style={styles.optionsGrid}>
        {SORT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              selectedSort === option.value && styles.optionActive,
            ]}
            onPress={() => handleSortSelect(option.value)}
            testID={testID ? `${testID}-option-${option.value}` : undefined}
          >
            <Text
              variant={
                selectedSort === option.value
                  ? TextVariant.BodyMDBold
                  : TextVariant.BodySMMedium
              }
              color={
                selectedSort === option.value
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

export default PerpsMarketSortFieldBottomSheet;
