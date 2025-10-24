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
import { styleSheet } from './PerpsMarketTimeBottomSheet.styles';
import type { PerpsMarketTimeBottomSheetProps } from './PerpsMarketTimeBottomSheet.types';
import { MARKET_SORTING_CONFIG } from '../../constants/perpsConfig';

/**
 * PerpsMarketTimeBottomSheet Component
 *
 * Simple list-based bottom sheet for selecting market data timeframes.
 * Each option represents a time period (1 hour or 24 hours).
 *
 * Features:
 * - Flat list of timeframe options
 * - Checkmark icon on selected option
 * - Auto-closes on selection
 *
 * @example
 * ```tsx
 * <PerpsMarketTimeBottomSheet
 *   isVisible={showTimeSheet}
 *   onClose={() => setShowTimeSheet(false)}
 *   selectedTimeframe="24h"
 *   onTimeframeSelect={handleTimeframeChange}
 * />
 * ```
 */
const PerpsMarketTimeBottomSheet: React.FC<PerpsMarketTimeBottomSheetProps> = ({
  isVisible,
  onClose,
  selectedTimeframe,
  onTimeframeSelect,
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
   * Handle timeframe selection - selects the timeframe and closes the sheet
   */
  const handleTimeframeSelect = (timeframe: string) => {
    onTimeframeSelect(timeframe);
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
          {strings('perps.sort.time')}
        </Text>
      </BottomSheetHeader>
      <Box style={styles.optionsList}>
        {/* Render timeframe options */}
        {MARKET_SORTING_CONFIG.TIMEFRAME_OPTIONS.map((option) => {
          const isSelected = selectedTimeframe === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={styles.optionRow}
              onPress={() => handleTimeframeSelect(option.id)}
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

export default PerpsMarketTimeBottomSheet;
