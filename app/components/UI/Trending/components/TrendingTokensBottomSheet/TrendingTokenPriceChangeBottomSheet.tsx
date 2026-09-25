import React, { useRef, useState, useCallback, useEffect } from 'react';
import { TrendingTokensBottomSheetTestIds } from './TrendingTokensBottomSheet.testIds';
import {
  HeaderStandard,
  Button,
  ButtonVariant,
  ButtonSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
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

const SORT_OPTIONS: {
  option: PriceChangeOption;
  labelKey: 'trending.price_change' | 'trending.volume' | 'trending.market_cap';
  testID: string;
}[] = [
  {
    option: PriceChangeOption.PriceChange,
    labelKey: 'trending.price_change',
    testID: 'price-change-select-price-change',
  },
  {
    option: PriceChangeOption.Volume,
    labelKey: 'trending.volume',
    testID: 'price-change-select-volume',
  },
  {
    option: PriceChangeOption.MarketCap,
    labelKey: 'trending.market_cap',
    testID: 'price-change-select-market-cap',
  },
];

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
    optionLabel: {
      flex: 1,
      minWidth: 0,
      marginRight: 8,
    },
    arrowContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 0,
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
      testID={TrendingTokensBottomSheetTestIds.PRICE_CHANGE}
    >
      <HeaderStandard
        title={strings('trending.sort_by')}
        onClose={handleClose}
        closeButtonProps={{ testID: 'close-button' }}
      />
      <View style={optionStyles.optionsList}>
        {SORT_OPTIONS.map(({ option, labelKey, testID }) => {
          const isSelected = selectedOption === option;

          return (
            <TouchableOpacity
              key={option}
              testID={testID}
              style={[
                optionStyles.optionRow,
                isSelected && optionStyles.optionRowSelected,
              ]}
              activeOpacity={1}
              onPress={() => onOptionPress(option)}
            >
              <Text
                variant={TextVariant.BodyMd}
                numberOfLines={1}
                ellipsizeMode="tail"
                style={optionStyles.optionLabel}
              >
                {strings(labelKey)}
              </Text>
              {isSelected ? (
                <View
                  style={optionStyles.arrowContainer}
                  testID="price-change-sort-direction"
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextAlternative}
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
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={optionStyles.buttonContainer}>
        <Button
          variant={ButtonVariant.Primary}
          onPress={handleApply}
          size={ButtonSize.Lg}
          isFullWidth
          testID="apply-button"
        >
          {strings('trending.apply')}
        </Button>
      </View>
    </BottomSheet>
  );
};

export { TrendingTokenPriceChangeBottomSheet };
