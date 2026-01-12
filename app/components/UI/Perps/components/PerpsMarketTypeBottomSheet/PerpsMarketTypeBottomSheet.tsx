import React, { useRef, useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
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
import { styleSheet } from './PerpsMarketTypeBottomSheet.styles';
import type {
  PerpsMarketTypeBottomSheetProps,
  MarketTypeFilterOption,
} from './PerpsMarketTypeBottomSheet.types';
import type { MarketTypeFilter } from '../../controllers/types';

/**
 * Market type filter options configuration
 */
const MARKET_TYPE_FILTER_OPTIONS: MarketTypeFilterOption[] = [
  {
    id: 'all',
    labelKey: 'perps.home.tabs.all',
  },
  {
    id: 'crypto',
    labelKey: 'perps.home.tabs.crypto',
  },
  {
    id: 'stocks_and_commodities',
    labelKey: 'perps.home.tabs.stocks_and_commodities',
  },
];

/**
 * PerpsMarketTypeBottomSheet Component
 *
 * Simple list-based bottom sheet for selecting market type filter.
 *
 * Features:
 * - Flat list of market type options
 * - Checkmark icon on selected option
 * - Auto-closes on selection
 *
 * @example
 * ```tsx
 * <PerpsMarketTypeBottomSheet
 *   isVisible={showMarketTypeSheet}
 *   onClose={() => setShowMarketTypeSheet(false)}
 *   selectedFilter="all"
 *   onFilterSelect={handleFilterChange}
 * />
 * ```
 */
const PerpsMarketTypeBottomSheet: React.FC<PerpsMarketTypeBottomSheetProps> = ({
  isVisible,
  onClose,
  selectedFilter,
  onFilterSelect,
  testID,
}) => {
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
  const handleOptionSelect = (filter: MarketTypeFilter) => {
    onFilterSelect(filter);
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
          {strings('perps.market_type.filter_by')}
        </Text>
      </BottomSheetHeader>
      <Box style={styles.optionsList}>
        {/* Render market type filter options */}
        {MARKET_TYPE_FILTER_OPTIONS.map((option) => {
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

export default PerpsMarketTypeBottomSheet;
