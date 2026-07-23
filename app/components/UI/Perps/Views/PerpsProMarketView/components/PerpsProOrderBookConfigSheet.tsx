import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../util/theme';
import type { Colors } from '../../../../../../util/theme/models';
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

const GROUPING_ROW_SIZE = 3;

const chunkOptions = <T,>(items: T[], size: number): T[][] => {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
};

const createChipStyles = (colors: Colors) =>
  StyleSheet.create({
    chip: {
      flex: 1,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    chipSelected: {
      backgroundColor: colors.background.muted,
      borderColor: colors.border.default,
    },
    chipUnselected: {
      borderColor: colors.border.muted,
    },
  });

interface OptionChipProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  testID: string;
}

/**
 * Outlined option chip matching Figma FilterButton states:
 * - selected: muted fill + border-default + text-default
 * - unselected: transparent + border-muted + text-alternative
 */
const OptionChip = ({
  label,
  isSelected,
  onPress,
  testID,
}: OptionChipProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createChipStyles(colors), [colors]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      testID={testID}
      style={[
        styles.chip,
        isSelected ? styles.chipSelected : styles.chipUnselected,
      ]}
    >
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={isSelected ? TextColor.TextDefault : TextColor.TextAlternative}
      >
        {label}
      </Text>
    </Pressable>
  );
};

/**
 * Bottom sheet for Pro order-book list currency, metric, and price grouping.
 * Matches Figma "Order book settings" (layout section omitted).
 *
 * Rendered inside a RN Modal so the sheet is not clipped by the narrow Pro
 * order-book column (BottomSheet uses absolute inset-0 relative to its parent).
 * Android: wrap Modal in a plain View to avoid rendering/freezing issues.
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
  const wasVisibleRef = useRef(false);
  const [draftCurrency, setDraftCurrency] =
    useState<OrderBookListCurrency>(currency);
  const [draftMetric, setDraftMetric] = useState<OrderBookListMetric>(metric);
  const [draftGrouping, setDraftGrouping] = useState<number | null>(grouping);

  // Snapshot props into draft only when the sheet opens. Do not re-sync while
  // open — live grouping/mid updates would wipe in-progress chip selections.
  useEffect(() => {
    const justOpened = isVisible && !wasVisibleRef.current;
    wasVisibleRef.current = isVisible;

    if (!justOpened) {
      return;
    }

    setDraftCurrency(currency);
    setDraftMetric(metric);
    setDraftGrouping(grouping);
    sheetRef.current?.onOpenBottomSheet();
  }, [isVisible, currency, metric, grouping]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(onClose);
  }, [onClose]);

  const handleSave = useCallback(() => {
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
      children: strings('perps.order_book.save'),
      onPress: handleSave,
      isDisabled: draftGrouping === null,
      testID: `${testID}-apply`,
    }),
    [handleSave, draftGrouping, testID],
  );

  const groupingRows = useMemo(
    () => chunkOptions(groupingOptions, GROUPING_ROW_SIZE),
    [groupingOptions],
  );

  if (!isVisible) {
    return null;
  }

  return (
    <View>
      <Modal visible transparent animationType="none" statusBarTranslucent>
        <BottomSheet ref={sheetRef} onClose={onClose} testID={testID}>
          <BottomSheetHeader
            onClose={handleClose}
            closeButtonProps={{ testID: `${testID}-close` }}
          >
            {strings('perps.order_book.config_title')}
          </BottomSheetHeader>

          <Box twClassName="w-full gap-6 px-0 pb-3 pt-2">
            <Box twClassName="w-full gap-2">
              <Box twClassName="px-4">
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                >
                  {strings('perps.order_book.listed_by')}
                </Text>
              </Box>
              <Box twClassName="w-full gap-3">
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  twClassName="w-full gap-2 px-4"
                  testID={`${testID}-currency`}
                >
                  <OptionChip
                    label={baseSymbol}
                    isSelected={draftCurrency === 'base'}
                    onPress={() => setDraftCurrency('base')}
                    testID={`${testID}-currency-base`}
                  />
                  <OptionChip
                    label="USD"
                    isSelected={draftCurrency === 'usd'}
                    onPress={() => setDraftCurrency('usd')}
                    testID={`${testID}-currency-usd`}
                  />
                </Box>
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  twClassName="w-full gap-2 px-4"
                  testID={`${testID}-metric`}
                >
                  <OptionChip
                    label={strings('perps.order_book.size')}
                    isSelected={draftMetric === 'size'}
                    onPress={() => setDraftMetric('size')}
                    testID={`${testID}-metric-size`}
                  />
                  <OptionChip
                    label={strings('perps.order_book.total')}
                    isSelected={draftMetric === 'total'}
                    onPress={() => setDraftMetric('total')}
                    testID={`${testID}-metric-total`}
                  />
                </Box>
              </Box>
            </Box>

            <Box twClassName="w-full gap-2">
              <Box twClassName="px-4">
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                >
                  {strings('perps.order_book.group_by')}
                </Text>
              </Box>
              <Box twClassName="w-full gap-3">
                {groupingRows.map((row) => (
                  <Box
                    key={row.join('-')}
                    flexDirection={BoxFlexDirection.Row}
                    twClassName="w-full gap-2 px-4"
                  >
                    {row.map((value) => (
                      <OptionChip
                        key={value}
                        label={formatGroupingLabel(value)}
                        isSelected={draftGrouping === value}
                        onPress={() => setDraftGrouping(value)}
                        testID={`${testID}-grouping-${value}`}
                      />
                    ))}
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>

          <BottomSheetFooter
            primaryButtonProps={primaryButtonProps}
            twClassName="pt-4"
          />
        </BottomSheet>
      </Modal>
    </View>
  );
};

export default PerpsProOrderBookConfigSheet;
