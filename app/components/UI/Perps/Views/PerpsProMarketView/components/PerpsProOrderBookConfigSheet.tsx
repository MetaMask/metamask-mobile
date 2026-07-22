import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  BoxFlexDirection,
  FilterButton,
  ListItemSelect,
  SegmentedControl,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
  ButtonBaseSize,
} from '@metamask/design-system-react-native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { strings } from '../../../../../../../locales/i18n';
import {
  formatGroupingLabel,
  type OrderBookListCurrency,
  type OrderBookListMetric,
} from '../../../utils/orderBookGrouping';

export interface PerpsProOrderBookConfigSheetProps {
  isVisible: boolean;
  baseSymbol: string;
  currency: OrderBookListCurrency;
  metric: OrderBookListMetric;
  grouping: number | null;
  groupingOptions: number[];
  onApply: (next: {
    currency: OrderBookListCurrency;
    metric: OrderBookListMetric;
    grouping: number;
  }) => void;
  onClose: () => void;
  testID?: string;
}

/**
 * Bottom sheet for Pro order-book list currency, metric, and price grouping.
 * Mirrors Extension's `PerpsOrderBookConfigModal`.
 */
const PerpsProOrderBookConfigSheet = ({
  isVisible,
  baseSymbol,
  currency,
  metric,
  grouping,
  groupingOptions,
  onApply,
  onClose,
  testID = 'perps-pro-order-book-config-sheet',
}: PerpsProOrderBookConfigSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [draftCurrency, setDraftCurrency] =
    useState<OrderBookListCurrency>(currency);
  const [draftMetric, setDraftMetric] = useState<OrderBookListMetric>(metric);
  const [draftGrouping, setDraftGrouping] = useState<number | null>(grouping);

  useEffect(() => {
    if (isVisible) {
      setDraftCurrency(currency);
      setDraftMetric(metric);
      setDraftGrouping(grouping);
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible, currency, metric, grouping]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(onClose);
  }, [onClose]);

  const handleApply = useCallback(() => {
    if (draftGrouping === null) {
      return;
    }
    onApply({
      currency: draftCurrency,
      metric: draftMetric,
      grouping: draftGrouping,
    });
    handleClose();
  }, [draftCurrency, draftMetric, draftGrouping, onApply, handleClose]);

  const primaryButtonProps = useMemo(
    () => ({
      children: strings('perps.order_book.apply'),
      onPress: handleApply,
      isDisabled: draftGrouping === null,
      testID: `${testID}-apply`,
    }),
    [handleApply, draftGrouping, testID],
  );

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet ref={sheetRef} onClose={onClose} testID={testID}>
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ testID: `${testID}-close` }}
      >
        {strings('perps.order_book.config_title')}
      </BottomSheetHeader>

      <Box twClassName="gap-4 px-4 pb-2">
        <Box twClassName="gap-2">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
          >
            {strings('perps.order_book.listed_by')}
          </Text>
          <SegmentedControl
            value={draftCurrency}
            onChange={(value) =>
              setDraftCurrency(value as OrderBookListCurrency)
            }
            isFullWidth
            size={ButtonBaseSize.Sm}
            testID={`${testID}-currency`}
          >
            <FilterButton value="base" testID={`${testID}-currency-base`}>
              {baseSymbol}
            </FilterButton>
            <FilterButton value="usd" testID={`${testID}-currency-usd`}>
              USD
            </FilterButton>
          </SegmentedControl>
        </Box>

        <Box twClassName="gap-2">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
          >
            {strings('perps.order_book.value_type')}
          </Text>
          <SegmentedControl
            value={draftMetric}
            onChange={(value) => setDraftMetric(value as OrderBookListMetric)}
            isFullWidth
            size={ButtonBaseSize.Sm}
            testID={`${testID}-metric`}
          >
            <FilterButton value="size" testID={`${testID}-metric-size`}>
              {strings('perps.order_book.size')}
            </FilterButton>
            <FilterButton value="total" testID={`${testID}-metric-total`}>
              {strings('perps.order_book.total')}
            </FilterButton>
          </SegmentedControl>
        </Box>

        <Box twClassName="gap-2">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
          >
            {strings('perps.order_book.group_by')}
          </Text>
          <Box flexDirection={BoxFlexDirection.Column}>
            {groupingOptions.map((value) => (
              <ListItemSelect
                key={value}
                title={formatGroupingLabel(value)}
                isSelected={draftGrouping === value}
                showSelectedIcon
                onPress={() => setDraftGrouping(value)}
                testID={`${testID}-grouping-${value}`}
              />
            ))}
          </Box>
        </Box>
      </Box>

      <BottomSheetFooter
        primaryButtonProps={primaryButtonProps}
        twClassName="pt-4"
      />
    </BottomSheet>
  );
};

export default PerpsProOrderBookConfigSheet;
