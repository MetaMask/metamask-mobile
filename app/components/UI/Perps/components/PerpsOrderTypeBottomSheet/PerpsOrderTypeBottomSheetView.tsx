import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  BottomSheet,
  BottomSheetHeader,
  FontWeight,
  type BottomSheetRef,
  ListItemSelect,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { OrderType, TriggerOrderType } from '@metamask/perps-controller';
import React, { useCallback, useEffect, useRef } from 'react';
import type { SvgProps } from 'react-native-svg';
import { strings } from '../../../../../../locales/i18n';
import LimitIcon from '../../../../../images/perps/order-types/limit.svg';
import MarketIcon from '../../../../../images/perps/order-types/market.svg';
import StopLimitIcon from '../../../../../images/perps/order-types/stop-limit.svg';
import StopMarketIcon from '../../../../../images/perps/order-types/stop-market.svg';
import TakeLimitIcon from '../../../../../images/perps/order-types/take-limit.svg';
import TakeMarketIcon from '../../../../../images/perps/order-types/take-market.svg';
import { PerpsOrderTypeBottomSheetSelectorsIDs } from '../../Perps.testIds';

interface OrderTypeOption {
  type: OrderType;
  titleKey: string;
  descriptionKey: string;
  IconComponent: React.ComponentType<SvgProps>;
  testID: string;
}

const BASIC_ORDER_TYPES: readonly OrderTypeOption[] = [
  {
    type: 'market',
    titleKey: 'perps.order.type.market.title',
    descriptionKey: 'perps.order.type.market.description',
    IconComponent: MarketIcon,
    testID: PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION,
  },
  {
    type: 'limit',
    titleKey: 'perps.order.type.limit.title',
    descriptionKey: 'perps.order.type.limit.description',
    IconComponent: LimitIcon,
    testID: PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION,
  },
];

const TRIGGERED_ORDER_TYPES: readonly (OrderTypeOption & {
  type: TriggerOrderType;
})[] = [
  {
    type: 'stop_limit',
    titleKey: 'perps.order.type.stop_limit.title',
    descriptionKey: 'perps.order.type.stop_limit.description',
    IconComponent: StopLimitIcon,
    testID: PerpsOrderTypeBottomSheetSelectorsIDs.STOP_LIMIT_OPTION,
  },
  {
    type: 'stop_market',
    titleKey: 'perps.order.type.stop_market.title',
    descriptionKey: 'perps.order.type.stop_market.description',
    IconComponent: StopMarketIcon,
    testID: PerpsOrderTypeBottomSheetSelectorsIDs.STOP_MARKET_OPTION,
  },
  {
    type: 'take_profit_limit',
    titleKey: 'perps.order.type.take_profit_limit.title',
    descriptionKey: 'perps.order.type.take_profit_limit.description',
    IconComponent: TakeLimitIcon,
    testID: PerpsOrderTypeBottomSheetSelectorsIDs.TAKE_PROFIT_LIMIT_OPTION,
  },
  {
    type: 'take_profit_market',
    titleKey: 'perps.order.type.take_profit_market.title',
    descriptionKey: 'perps.order.type.take_profit_market.description',
    IconComponent: TakeMarketIcon,
    testID: PerpsOrderTypeBottomSheetSelectorsIDs.TAKE_PROFIT_MARKET_OPTION,
  },
];

export interface PerpsOrderTypeBottomSheetViewProps {
  isVisible?: boolean;
  onClose: () => void;
  onSelect: (orderType: OrderType) => void;
  currentOrderType?: OrderType;
  title?: string;
  showSelectedIcon?: boolean;
  showTriggeredTypes?: boolean;
  sheetRef?: React.RefObject<BottomSheetRef | null>;
}

const PerpsOrderTypeBottomSheetView = ({
  isVisible = true,
  onClose,
  onSelect,
  currentOrderType,
  title = strings('perps.order.type.title'),
  showSelectedIcon = false,
  showTriggeredTypes = false,
  sheetRef: externalSheetRef,
}: PerpsOrderTypeBottomSheetViewProps) => {
  const internalSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = externalSheetRef ?? internalSheetRef;
  const shouldShowSelectedIcon = showSelectedIcon || showTriggeredTypes;

  useEffect(() => {
    if (isVisible && !externalSheetRef) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible, externalSheetRef, sheetRef]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, [sheetRef]);

  const handleSelect = useCallback(
    (orderType: OrderType) => {
      onSelect(orderType);
      handleClose();
    },
    [handleClose, onSelect],
  );

  const renderSectionHeader = (label: string, testID?: string) => (
    <Box paddingHorizontal={4} paddingTop={2} paddingBottom={3} testID={testID}>
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Regular}
        color={TextColor.TextAlternative}
      >
        {label}
      </Text>
    </Box>
  );

  const renderOrderType = (orderType: OrderTypeOption) => {
    const { IconComponent } = orderType;

    return (
      <ListItemSelect
        key={orderType.type}
        title={strings(orderType.titleKey)}
        description={strings(orderType.descriptionKey)}
        startAccessory={
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName="h-10 w-10"
          >
            <IconComponent width={32} height={32} />
          </Box>
        }
        isSelected={currentOrderType === orderType.type}
        showSelectedIcon={shouldShowSelectedIcon}
        // The Pro design uses a checkmark without a selected-row fill. Shared
        // sheets without checkmarks retain ListItemSelect's selected background.
        twClassName={shouldShowSelectedIcon ? 'bg-transparent' : undefined}
        onPress={() => handleSelect(orderType.type)}
        testID={orderType.testID}
      />
    );
  };

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      testID={PerpsOrderTypeBottomSheetSelectorsIDs.CONTAINER}
      goBack={!externalSheetRef ? onClose : undefined}
      onClose={externalSheetRef ? onClose : undefined}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: PerpsOrderTypeBottomSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {title}
      </BottomSheetHeader>
      {showTriggeredTypes &&
        renderSectionHeader(strings('perps.order.type.basic'))}
      {BASIC_ORDER_TYPES.map(renderOrderType)}
      {showTriggeredTypes &&
        renderSectionHeader(
          strings('perps.order.type.triggered'),
          PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_SECTION_HEADER,
        )}
      {showTriggeredTypes && TRIGGERED_ORDER_TYPES.map(renderOrderType)}
    </BottomSheet>
  );
};

export default PerpsOrderTypeBottomSheetView;
