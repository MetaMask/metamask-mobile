import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
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
import HeaderCenter from '../../../../../component-library/components-temp/HeaderCenter';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../../../component-library/components/Buttons/Button';

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

const TrendingTokenPriceChangeBottomSheet: React.FC<
  TrendingTokenPriceChangeBottomSheetProps
> = ({
  isVisible,
  onClose,
  onPriceChangeSelect,
  selectedOption: initialSelectedOption,
  sortDirection: initialSortDirection,
}) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { colors } = useTheme();
  // Default to "Price change" if no selection
  const [selectedOption, setSelectedOption] = useState<PriceChangeOption>(
    initialSelectedOption || PriceChangeOption.PriceChange,
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    initialSortDirection || SortDirection.Descending,
  );

  // Sync selectedOption and sortDirection when initial values change or when sheet opens
  // This ensures uncommitted changes are reset when reopening the sheet
  useEffect(() => {
    if (isVisible) {
      if (initialSelectedOption) {
        setSelectedOption(initialSelectedOption);
      }
      if (initialSortDirection) {
        setSortDirection(initialSortDirection);
      }
    }
  }, [initialSelectedOption, initialSortDirection, isVisible]);

  // Open bottom sheet when isVisible becomes true
  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  const optionStyles = StyleSheet.create({
    optionsList: {
      paddingBottom: 24,
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
    buttonContainer: {
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === 'android' ? 0 : 16,
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

  const handleApply = useCallback(() => {
    // Apply the current selection and close
    if (onPriceChangeSelect) {
      onPriceChangeSelect(selectedOption, sortDirection);
    }
    sheetRef.current?.onCloseBottomSheet(() => {
      onClose();
    });
  }, [onPriceChangeSelect, selectedOption, sortDirection, onClose]);

  const onOptionPress = useCallback(
    (option: PriceChangeOption) => {
      // If clicking the same option, toggle sort direction
      if (selectedOption === option) {
        const newDirection =
          sortDirection === SortDirection.Ascending
            ? SortDirection.Descending
            : SortDirection.Ascending;
        setSortDirection(newDirection);
      } else {
        // If clicking a different option, select it with descending direction
        setSelectedOption(option);
        setSortDirection(SortDirection.Descending);
      }
      // Don't call the callback here - wait for Apply button
    },
    [selectedOption, sortDirection],
  );

  if (!isVisible) return null;

  return (
    <BottomSheet
      shouldNavigateBack={false}
      ref={sheetRef}
      onClose={handleSheetClose}
    >
      <HeaderCenter
        title={strings('trending.sort_by')}
        onClose={handleClose}
        closeButtonProps={{ testID: 'close-button' }}
      />
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
      <View style={optionStyles.buttonContainer}>
        <Button
          variant={ButtonVariants.Primary}
          label={strings('trending.apply')}
          onPress={handleApply}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
        />
      </View>
    </BottomSheet>
  );
};

export { TrendingTokenPriceChangeBottomSheet };
