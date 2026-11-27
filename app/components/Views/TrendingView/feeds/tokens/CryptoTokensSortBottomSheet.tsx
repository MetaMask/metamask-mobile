import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSelector } from 'react-redux';
import {
  BottomSheet,
  BottomSheetFooter,
  type BottomSheetRef,
  Box,
  ButtonsAlignment,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItemSelect,
  ListItemVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import BottomSheetHeaderGlass from '../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import {
  PriceChangeOption,
  SortDirection,
} from '../../../../UI/Trending/components/TrendingTokensBottomSheet';

export interface CryptoTokensSort {
  option: PriceChangeOption;
  direction: SortDirection;
}

export const CRYPTO_TOKENS_SORT_OPTIONS: readonly {
  option: PriceChangeOption;
  labelKey: string;
}[] = [
  {
    option: PriceChangeOption.PriceChange,
    labelKey: 'perps.sort.price_change',
  },
  { option: PriceChangeOption.Volume, labelKey: 'perps.sort.volume' },
  { option: PriceChangeOption.MarketCap, labelKey: 'trending.market_cap' },
];

export interface CryptoTokensSortBottomSheetProps {
  onClose: () => void;
  sort?: CryptoTokensSort;
  onApply: (sort: CryptoTokensSort | undefined) => void;
  testID?: string;
}

const CryptoTokensSortBottomSheet: React.FC<
  CryptoTokensSortBottomSheetProps
> = ({ onClose, sort, onApply, testID }) => {
  const isGlassHeader = Boolean(useSelector(selectGlassHeadersEnabled));
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [draft, setDraft] = useState<CryptoTokensSort | undefined>(sort);

  useEffect(() => {
    bottomSheetRef.current?.onOpenBottomSheet();
  }, []);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet(onClose);
  }, [onClose]);

  const handleOptionPress = useCallback((option: PriceChangeOption) => {
    setDraft((current) => {
      if (current?.option === option) {
        return {
          option,
          direction:
            current.direction === SortDirection.Ascending
              ? SortDirection.Descending
              : SortDirection.Ascending,
        };
      }
      return { option, direction: SortDirection.Descending };
    });
  }, []);

  const handleApply = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet(() => {
      onApply(draft);
      onClose();
    });
  }, [draft, onApply, onClose]);

  const handleReset = useCallback(() => setDraft(undefined), []);

  const primaryButtonProps = useMemo(
    () => ({
      children: strings('perps.sort.apply'),
      onPress: handleApply,
      testID: testID ? `${testID}-apply` : undefined,
    }),
    [handleApply, testID],
  );

  const secondaryButtonProps = useMemo(
    () => ({
      children: strings('perps.sort.reset'),
      onPress: handleReset,
      testID: testID ? `${testID}-reset` : undefined,
    }),
    [handleReset, testID],
  );

  return (
    <BottomSheet ref={bottomSheetRef} onClose={onClose} testID={testID}>
      <BottomSheetHeaderGlass
        isGlass={isGlassHeader}
        onClose={handleClose}
        closeButtonProps={{ testID: testID ? `${testID}-close` : undefined }}
      >
        {strings('perps.sort.sort_by')}
      </BottomSheetHeaderGlass>
      {CRYPTO_TOKENS_SORT_OPTIONS.map(({ option, labelKey }) => {
        const isSelected = draft?.option === option;
        const isAscending = draft?.direction === SortDirection.Ascending;
        return (
          <ListItemSelect
            key={option}
            title={strings(labelKey)}
            titleProps={{ numberOfLines: 1, ellipsizeMode: 'tail' }}
            variant={ListItemVariant.OneLine}
            isSelected={isSelected}
            showSelectedIcon={false}
            onPress={() => handleOptionPress(option)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            endAccessory={
              isSelected ? (
                <Box twClassName="flex-row items-center gap-2">
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                    testID={testID ? `${testID}-direction-text` : undefined}
                  >
                    {isAscending
                      ? strings('perps.sort.low_to_high')
                      : strings('perps.sort.high_to_low')}
                  </Text>
                  <Icon
                    name={isAscending ? IconName.Arrow2Up : IconName.Arrow2Down}
                    size={IconSize.Md}
                    color={IconColor.IconAlternative}
                  />
                </Box>
              ) : undefined
            }
            testID={testID ? `${testID}-option-${option}` : undefined}
          />
        );
      })}
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        primaryButtonProps={primaryButtonProps}
        secondaryButtonProps={secondaryButtonProps}
        className="pt-4"
      />
    </BottomSheet>
  );
};

export default CryptoTokensSortBottomSheet;
