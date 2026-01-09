import React, { useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';

export enum PriceChangeOption {
  PriceChange = 'price_change',
  Volume = 'volume',
  MarketCap = 'market_cap',
}

export enum SortDirection {
  Ascending = 'ascending',
  Descending = 'descending',
}

export interface TrendingTokenPriceChangeBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onPriceChangeSelect?: (
    option: PriceChangeOption,
    sortDirection: SortDirection,
  ) => void;
  selectedOption?: PriceChangeOption;
  sortDirection?: SortDirection;
}

const closeButtonStyle = StyleSheet.create({
  closeButton: {
    width: 24,
    height: 24,
    flexShrink: 0,
    marginTop: -12,
  },
});

const TrendingTokenPriceChangeBottomSheet: React.FC<
  TrendingTokenPriceChangeBottomSheetProps
> = ({
  isVisible,
  onClose,
  onPriceChangeSelect,
  selectedOption = PriceChangeOption.PriceChange,
  sortDirection = SortDirection.Descending,
}) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { colors } = useTheme();

  // Open bottom sheet when isVisible becomes true
  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

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
    arrowContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
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

  const onOptionPress = useCallback(
    (option: PriceChangeOption) => {
      let newDirection: SortDirection;
      let newOption: PriceChangeOption;

      // If clicking the same option, toggle sort direction
      if (selectedOption === option) {
        newDirection =
          sortDirection === SortDirection.Ascending
            ? SortDirection.Descending
            : SortDirection.Ascending;
        newOption = option;
      } else {
        // If clicking a different option, select it with descending direction
        newOption = option;
        newDirection = SortDirection.Descending;
      }

      // Apply the selection immediately and close the sheet
      if (onPriceChangeSelect) {
        onPriceChangeSelect(newOption, newDirection);
      }
      sheetRef.current?.onCloseBottomSheet(() => {
        onClose();
      });
    },
    [selectedOption, sortDirection, onPriceChangeSelect, onClose],
  );

  if (!isVisible) return null;

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
        <Text variant={TextVariant.HeadingMD}>
          {strings('trending.sort_by')}
        </Text>
      </BottomSheetHeader>
      <View style={optionStyles.optionsList}>
        <TouchableOpacity
          style={[
            optionStyles.optionRow,
            selectedOption === PriceChangeOption.PriceChange &&
              optionStyles.optionRowSelected,
          ]}
          activeOpacity={1}
          onPress={() => onOptionPress(PriceChangeOption.PriceChange)}
        >
          <Text variant={TextVariant.BodyMD}>
            {strings('trending.price_change')}
          </Text>
          {selectedOption === PriceChangeOption.PriceChange && (
            <View style={optionStyles.arrowContainer}>
              <Text
                variant={TextVariant.BodyMDMedium}
                color={TextColor.Alternative}
              >
                {sortDirection === SortDirection.Ascending
                  ? strings('trending.low_to_high')
                  : strings('trending.high_to_low')}
              </Text>
              <Icon
                name={
                  sortDirection === SortDirection.Ascending
                    ? IconName.Arrow2Up
                    : IconName.Arrow2Down
                }
                size={IconSize.Md}
                color={IconColor.Alternative}
              />
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            optionStyles.optionRow,
            selectedOption === PriceChangeOption.Volume &&
              optionStyles.optionRowSelected,
          ]}
          activeOpacity={1} // this disables the default opacity change when pressing the option
          onPress={() => onOptionPress(PriceChangeOption.Volume)}
        >
          <Text variant={TextVariant.BodyMD}>{strings('trending.volume')}</Text>
          {selectedOption === PriceChangeOption.Volume && (
            <View style={optionStyles.arrowContainer}>
              <Text
                variant={TextVariant.BodyMDMedium}
                color={TextColor.Alternative}
              >
                {sortDirection === SortDirection.Ascending
                  ? strings('trending.low_to_high')
                  : strings('trending.high_to_low')}
              </Text>
              <Icon
                name={
                  sortDirection === SortDirection.Ascending
                    ? IconName.Arrow2Up
                    : IconName.Arrow2Down
                }
                size={IconSize.Md}
                color={IconColor.Alternative}
              />
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            optionStyles.optionRow,
            selectedOption === PriceChangeOption.MarketCap &&
              optionStyles.optionRowSelected,
          ]}
          activeOpacity={1}
          onPress={() => onOptionPress(PriceChangeOption.MarketCap)}
        >
          <Text variant={TextVariant.BodyMD}>
            {strings('trending.market_cap')}
          </Text>
          {selectedOption === PriceChangeOption.MarketCap && (
            <View style={optionStyles.arrowContainer}>
              <Text
                variant={TextVariant.BodyMDMedium}
                color={TextColor.Alternative}
              >
                {sortDirection === SortDirection.Ascending
                  ? strings('trending.low_to_high')
                  : strings('trending.high_to_low')}
              </Text>
              <Icon
                name={
                  sortDirection === SortDirection.Ascending
                    ? IconName.Arrow2Up
                    : IconName.Arrow2Down
                }
                size={IconSize.Md}
                color={IconColor.Alternative}
              />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
};

export { TrendingTokenPriceChangeBottomSheet };
