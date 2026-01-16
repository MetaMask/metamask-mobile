import React, { useRef, useEffect } from 'react';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { Box } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { styleSheet } from './PerpsStocksCommoditiesBottomSheet.styles';
import type { PerpsStocksCommoditiesBottomSheetProps } from './PerpsStocksCommoditiesBottomSheet.types';

const FILTER_OPTIONS = [
  {
    id: 'all' as const,
    labelKey: 'perps.home.all',
  },
  {
    id: 'equity' as const,
    labelKey: 'perps.home.stocks',
  },
  {
    id: 'commodity' as const,
    labelKey: 'perps.home.commodities',
  },
];

/**
 * PerpsStocksCommoditiesBottomSheet Component
 *
 * Bottom sheet for selecting stocks/commodities filter.
 *
 * Features:
 * - List of filter options (All, Stocks, Commodities)
 * - Checkmark icon on selected option
 * - Auto-closes on selection
 *
 * @example
 * ```tsx
 * <PerpsStocksCommoditiesBottomSheet
 *   isVisible={showSheet}
 *   onClose={() => setShowSheet(false)}
 *   selectedFilter="all"
 *   onFilterSelect={handleFilterChange}
 * />
 * ```
 */
const PerpsStocksCommoditiesBottomSheet: React.FC<
  PerpsStocksCommoditiesBottomSheetProps
> = ({ isVisible, onClose, selectedFilter, onFilterSelect, testID }) => {
  const { styles } = useStyles(styleSheet, {});
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  /**
   * Handle option selection - selects the option and closes the sheet
   */
  const handleOptionSelect = (filterId: 'all' | 'equity' | 'commodity') => {
    onFilterSelect(filterId);
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
          {strings('perps.home.filter_by')}
        </Text>
      </BottomSheetHeader>
      <Box style={styles.optionsList}>
        {/* Render filter options */}
        {FILTER_OPTIONS.map((option) => {
          const isSelected = selectedFilter === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.optionRow, isSelected && styles.optionRowSelected]}
              onPress={() => handleOptionSelect(option.id)}
              testID={testID ? `${testID}-option-${option.id}` : undefined}
            >
              <Text variant={TextVariant.BodyMD}>
                {strings(option.labelKey)}
              </Text>
              {isSelected && (
                <Icon
                  name={IconName.Check}
                  size={IconSize.Md}
                  testID={
                    testID ? `${testID}-checkmark-${option.id}` : undefined
                  }
                />
              )}
            </TouchableOpacity>
          );
        })}
      </Box>
    </BottomSheet>
  );
};

export default PerpsStocksCommoditiesBottomSheet;
