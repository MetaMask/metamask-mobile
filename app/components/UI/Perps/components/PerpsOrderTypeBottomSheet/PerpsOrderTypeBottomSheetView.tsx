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
import { useAssetFromTheme, useTheme } from '../../../../../util/theme';
import LimitIconDark from '../../../../../images/perps/order-types/limit.svg';
import LimitIconLight from '../../../../../images/perps/order-types/limit-light.svg';
import MarketIconDark from '../../../../../images/perps/order-types/market.svg';
import MarketIconLight from '../../../../../images/perps/order-types/market-light.svg';
import StopLimitIconDark from '../../../../../images/perps/order-types/stop-limit.svg';
import StopLimitIconLight from '../../../../../images/perps/order-types/stop-limit-light.svg';
import StopMarketIconDark from '../../../../../images/perps/order-types/stop-market.svg';
import StopMarketIconLight from '../../../../../images/perps/order-types/stop-market-light.svg';
import TakeLimitIconDark from '../../../../../images/perps/order-types/take-limit.svg';
import TakeLimitIconLight from '../../../../../images/perps/order-types/take-limit-light.svg';
import TakeMarketIconDark from '../../../../../images/perps/order-types/take-market.svg';
import TakeMarketIconLight from '../../../../../images/perps/order-types/take-market-light.svg';
import { PerpsOrderTypeBottomSheetSelectorsIDs } from '../../Perps.testIds';

type OrderTypeIcon = React.FC<SvgProps & { name: string }>;

interface OrderTypeOption {
  type: OrderType;
  titleKey: string;
  descriptionKey: string;
  LightIcon: OrderTypeIcon;
  DarkIcon: OrderTypeIcon;
  testID: string;
}

const DESCRIPTION_PROPS = {
  fontWeight: FontWeight.Regular,
} as const;

const BASIC_ORDER_TYPES: readonly OrderTypeOption[] = [
  {
    type: 'market',
    titleKey: 'perps.order.type.market.title',
    descriptionKey: 'perps.order.type.market.description',
    LightIcon: MarketIconLight,
    DarkIcon: MarketIconDark,
    testID: PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION,
  },
  {
    type: 'limit',
    titleKey: 'perps.order.type.limit.title',
    descriptionKey: 'perps.order.type.limit.description',
    LightIcon: LimitIconLight,
    DarkIcon: LimitIconDark,
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
    LightIcon: StopLimitIconLight,
    DarkIcon: StopLimitIconDark,
    testID: PerpsOrderTypeBottomSheetSelectorsIDs.STOP_LIMIT_OPTION,
  },
  {
    type: 'stop_market',
    titleKey: 'perps.order.type.stop_market.title',
    descriptionKey: 'perps.order.type.stop_market.description',
    LightIcon: StopMarketIconLight,
    DarkIcon: StopMarketIconDark,
    testID: PerpsOrderTypeBottomSheetSelectorsIDs.STOP_MARKET_OPTION,
  },
  {
    type: 'take_profit_limit',
    titleKey: 'perps.order.type.take_profit_limit.title',
    descriptionKey: 'perps.order.type.take_profit_limit.description',
    LightIcon: TakeLimitIconLight,
    DarkIcon: TakeLimitIconDark,
    testID: PerpsOrderTypeBottomSheetSelectorsIDs.TAKE_PROFIT_LIMIT_OPTION,
  },
  {
    type: 'take_profit_market',
    titleKey: 'perps.order.type.take_profit_market.title',
    descriptionKey: 'perps.order.type.take_profit_market.description',
    LightIcon: TakeMarketIconLight,
    DarkIcon: TakeMarketIconDark,
    testID: PerpsOrderTypeBottomSheetSelectorsIDs.TAKE_PROFIT_MARKET_OPTION,
  },
];

const TWAP_ORDER_TYPE: OrderTypeOption = {
  type: 'twap',
  titleKey: 'perps.order.type.twap.title',
  descriptionKey: 'perps.order.type.twap.description',
  LightIcon: MarketIconLight,
  DarkIcon: MarketIconDark,
  testID: PerpsOrderTypeBottomSheetSelectorsIDs.TWAP_OPTION,
};

const OrderTypeStartAccessory = ({
  LightIcon,
  DarkIcon,
  type,
  testID,
}: {
  LightIcon: OrderTypeIcon;
  DarkIcon: OrderTypeIcon;
  type: OrderType;
  testID: string;
}) => {
  const { themeAppearance } = useTheme();
  const IconComponent = useAssetFromTheme(LightIcon, DarkIcon);

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="h-10 w-10"
      testID={`${testID}-icon`}
      accessibilityLabel={`${testID}-icon-${themeAppearance}`}
    >
      <IconComponent name={`perps-order-type-${type}`} width={32} height={32} />
    </Box>
  );
};

export interface PerpsOrderTypeBottomSheetViewProps {
  isVisible?: boolean;
  onClose: () => void;
  onSelect: (orderType: OrderType) => void;
  currentOrderType?: OrderType;
  title?: string;
  showSelectedIcon?: boolean;
  showTriggeredTypes?: boolean;
  showTwapType?: boolean;
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
  showTwapType = false,
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

  const renderOrderType = (orderType: OrderTypeOption) => (
    <ListItemSelect
      key={orderType.type}
      title={strings(orderType.titleKey)}
      description={strings(orderType.descriptionKey)}
      descriptionProps={DESCRIPTION_PROPS}
      accessoryGap={2}
      startAccessory={
        shouldShowSelectedIcon ? (
          <OrderTypeStartAccessory
            LightIcon={orderType.LightIcon}
            DarkIcon={orderType.DarkIcon}
            type={orderType.type}
            testID={orderType.testID}
          />
        ) : undefined
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
        renderSectionHeader(
          strings('perps.order.type.basic'),
          PerpsOrderTypeBottomSheetSelectorsIDs.BASIC_SECTION_HEADER,
        )}
      {BASIC_ORDER_TYPES.map(renderOrderType)}
      {showTriggeredTypes &&
        renderSectionHeader(
          strings('perps.order.type.triggered'),
          PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_SECTION_HEADER,
        )}
      {showTriggeredTypes && TRIGGERED_ORDER_TYPES.map(renderOrderType)}
      {showTwapType &&
        renderSectionHeader(
          strings('perps.order.type.advanced'),
          PerpsOrderTypeBottomSheetSelectorsIDs.ADVANCED_SECTION_HEADER,
        )}
      {showTwapType && renderOrderType(TWAP_ORDER_TYPE)}
    </BottomSheet>
  );
};

export default PerpsOrderTypeBottomSheetView;
