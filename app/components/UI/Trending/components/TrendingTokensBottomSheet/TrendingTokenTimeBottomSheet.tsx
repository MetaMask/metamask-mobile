import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../../util/theme';
import { useParams } from '../../../../../util/navigation/navUtils';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
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

export interface TrendingTokenTimeBottomSheetParams {
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

const closeButtonStyle = StyleSheet.create({
  closeButton: {
    width: 24,
    height: 24,
    flexShrink: 0,
    marginTop: -12,
  },
});

const TrendingTokenTimeBottomSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { onTimeSelect, selectedTime: initialSelectedTime } =
    useParams<TrendingTokenTimeBottomSheetParams>();
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

  const optionStyles = StyleSheet.create({
    optionsList: {
      paddingBottom: 32,
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
    // Navigate back immediately to dismiss modal and remove overlay
    // The sheet animation will continue in the background
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
    sheetRef.current?.onCloseBottomSheet();
  }, [navigation]);

  const handleSheetClose = useCallback(() => {
    // Navigate back immediately when clicking outside to dismiss modal and remove overlay
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const onTimeOptionPress = useCallback(
    (option: TimeOption) => {
      setSelectedTime(option);
      const sortBy = mapTimeOptionToSortBy(option);
      if (onTimeSelect) {
        onTimeSelect(sortBy, option);
      }
      sheetRef.current?.onCloseBottomSheet();
    },
    [onTimeSelect],
  );

  return (
    <BottomSheet
      shouldNavigateBack={false}
      ref={sheetRef}
      onClose={handleSheetClose}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ style: closeButtonStyle.closeButton }}
      >
        <Text variant={TextVariant.HeadingMD}>{strings('trending.time')}</Text>
      </BottomSheetHeader>
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
