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
import { styleSheet } from './PerpsMarketSortFieldBottomSheet.styles';
import type { PerpsMarketSortFieldBottomSheetProps } from './PerpsMarketSortFieldBottomSheet.types';
import { MARKET_SORTING_CONFIG } from '../../constants/perpsConfig';

/**
 * PerpsMarketSortFieldBottomSheet Component
 *
 * Simple list-based bottom sheet for selecting market sort options.
 * Each option combines field + direction into a single selectable item.
 *
 * Features:
 * - Flat list of sort options
 * - Checkmark icon on selected option
 * - Auto-closes on selection
 *
 * @example
 * ```tsx
 * <PerpsMarketSortFieldBottomSheet
 *   isVisible={showSortSheet}
 *   onClose={() => setShowSortSheet(false)}
 *   selectedOptionId="priceChange-desc"
 *   onOptionSelect={handleSortChange}
 * />
 * ```
 */
const PerpsMarketSortFieldBottomSheet: React.FC<
  PerpsMarketSortFieldBottomSheetProps
> = ({ isVisible, onClose, selectedOptionId, onOptionSelect, testID }) => {
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
  const handleOptionSelect = (optionId: string) => {
    const option = MARKET_SORTING_CONFIG.SORT_OPTIONS.find(
      (opt) => opt.id === optionId,
    );
    if (option) {
      onOptionSelect(option.id, option.field, option.direction);
      onClose();
    }
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
      <Box style={styles.optionsList}>
        {/* Render sort options */}
        {MARKET_SORTING_CONFIG.SORT_OPTIONS.map((option) => {
          const isSelected = selectedOptionId === option.id;
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

export default PerpsMarketSortFieldBottomSheet;
