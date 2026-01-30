import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import HeaderCenter from '../../../../../component-library/components-temp/HeaderCenter';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import { SortTrendingBy } from '@metamask/assets-controllers';

export enum TimeOption {
  TwentyFourHours = '24h',
  SixHours = '6h',
  OneHour = '1h',
  FiveMinutes = '5m',
}

export interface TrendingTokenTimeBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onTimeSelect?: (sortBy: SortTrendingBy, timeOption: TimeOption) => void;
  selectedTime?: TimeOption;
}

/**
 * Maps TimeOption to SortTrendingBy
 */
const mapTimeOptionToSortBy = (option: TimeOption): SortTrendingBy => {
  switch (option) {
    case TimeOption.TwentyFourHours:
      return 'h24_trending' as SortTrendingBy;
    case TimeOption.SixHours:
      return 'h6_trending' as SortTrendingBy;
    case TimeOption.OneHour:
      return 'h1_trending' as SortTrendingBy;
    case TimeOption.FiveMinutes:
      return 'm5_trending' as SortTrendingBy;
    default:
      return 'h24_trending' as SortTrendingBy;
  }
};

/**
 * Maps SortTrendingBy back to TimeOption
 */
export const mapSortByToTimeOption = (
  sortBy: SortTrendingBy | undefined,
): TimeOption | undefined => {
  switch (sortBy) {
    case 'h24_trending':
      return TimeOption.TwentyFourHours;
    case 'h6_trending':
      return TimeOption.SixHours;
    case 'h1_trending':
      return TimeOption.OneHour;
    case 'm5_trending':
      return TimeOption.FiveMinutes;
    default:
      return undefined;
  }
};

const TrendingTokenTimeBottomSheet: React.FC<
  TrendingTokenTimeBottomSheetProps
> = ({
  isVisible,
  onClose,
  onTimeSelect,
  selectedTime: initialSelectedTime,
}) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { colors } = useTheme();
  // make default selected time 24 hours
  const [selectedTime, setSelectedTime] = useState<TimeOption>(
    initialSelectedTime || TimeOption.TwentyFourHours,
  );

  // Sync selectedTime when initialSelectedTime changes (e.g., when reopening the sheet)
  useEffect(() => {
    if (initialSelectedTime) {
      setSelectedTime(initialSelectedTime);
    }
  }, [initialSelectedTime]);

  // Open bottom sheet when isVisible becomes true
  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  const optionStyles = StyleSheet.create({
    optionsList: {
      paddingBottom: 16,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 16,
      minHeight: 56,
    },
    optionRowSelected: {
      backgroundColor: colors.background.muted,
    },
  });

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      onClose();
    });
  }, [onClose]);

  const handleSheetClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const onTimeOptionPress = useCallback(
    (option: TimeOption) => {
      setSelectedTime(option);
      const sortBy = mapTimeOptionToSortBy(option);
      if (onTimeSelect) {
        onTimeSelect(sortBy, option);
      }
      sheetRef.current?.onCloseBottomSheet(() => {
        onClose();
      });
    },
    [onTimeSelect, onClose],
  );

  if (!isVisible) return null;

  return (
    <BottomSheet
      shouldNavigateBack={false}
      ref={sheetRef}
      onClose={handleSheetClose}
    >
      <HeaderCenter
        title={strings('trending.time')}
        onClose={handleClose}
        closeButtonProps={{ testID: 'close-button' }}
      />
      <View style={optionStyles.optionsList}>
        <TouchableOpacity
          style={[
            optionStyles.optionRow,
            selectedTime === TimeOption.TwentyFourHours &&
              optionStyles.optionRowSelected,
          ]}
          onPress={() => onTimeOptionPress(TimeOption.TwentyFourHours)}
        >
          <Text variant={TextVariant.BodyMD}>
            {strings('trending.24_hours')}
          </Text>
          {selectedTime === TimeOption.TwentyFourHours && (
            <Icon name={IconName.Check} size={IconSize.Md} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            optionStyles.optionRow,
            selectedTime === TimeOption.SixHours &&
              optionStyles.optionRowSelected,
          ]}
          onPress={() => onTimeOptionPress(TimeOption.SixHours)}
        >
          <Text variant={TextVariant.BodyMD}>
            {strings('trending.6_hours')}
          </Text>
          {selectedTime === TimeOption.SixHours && (
            <Icon name={IconName.Check} size={IconSize.Md} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            optionStyles.optionRow,
            selectedTime === TimeOption.OneHour &&
              optionStyles.optionRowSelected,
          ]}
          onPress={() => onTimeOptionPress(TimeOption.OneHour)}
        >
          <Text variant={TextVariant.BodyMD}>{strings('trending.1_hour')}</Text>
          {selectedTime === TimeOption.OneHour && (
            <Icon name={IconName.Check} size={IconSize.Md} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            optionStyles.optionRow,
            selectedTime === TimeOption.FiveMinutes &&
              optionStyles.optionRowSelected,
          ]}
          onPress={() => onTimeOptionPress(TimeOption.FiveMinutes)}
        >
          <Text variant={TextVariant.BodyMD}>
            {strings('trending.5_minutes')}
          </Text>
          {selectedTime === TimeOption.FiveMinutes && (
            <Icon name={IconName.Check} size={IconSize.Md} />
          )}
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
};

export { TrendingTokenTimeBottomSheet };
