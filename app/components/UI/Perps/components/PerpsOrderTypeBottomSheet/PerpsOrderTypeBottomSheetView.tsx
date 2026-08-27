import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  BottomSheet,
  BottomSheetHeader,
  FontWeight,
  type BottomSheetRef,
  ListItemSelect,
} from '@metamask/design-system-react-native';
import type { OrderType, TriggerOrderType } from '@metamask/perps-controller';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { SvgProps } from 'react-native-svg';
import { strings } from '../../../../../../locales/i18n';
import TabsBar from '../../../../../component-library/components-temp/Tabs/TabsBar';
import type { TabItem } from '../../../../../component-library/components-temp/Tabs/TabsBar/TabsBar.types';
import { useAssetFromTheme, useTheme } from '../../../../../util/theme';
import LimitIconDark from '../../../../../images/perps/order-types/limit.svg';
import LimitIconLight from '../../../../../images/perps/order-types/limit-light.svg';
import MarketIconDark from '../../../../../images/perps/order-types/market.svg';
import MarketIconLight from '../../../../../images/perps/order-types/market-light.svg';
import ScaleIconDark from '../../../../../images/perps/order-types/scale.svg';
import ScaleIconLight from '../../../../../images/perps/order-types/scale-light.svg';
import StopLimitIconDark from '../../../../../images/perps/order-types/stop-limit.svg';
import StopLimitIconLight from '../../../../../images/perps/order-types/stop-limit-light.svg';
import StopMarketIconDark from '../../../../../images/perps/order-types/stop-market.svg';
import StopMarketIconLight from '../../../../../images/perps/order-types/stop-market-light.svg';
import TakeLimitIconDark from '../../../../../images/perps/order-types/take-limit.svg';
import TakeLimitIconLight from '../../../../../images/perps/order-types/take-limit-light.svg';
import TakeMarketIconDark from '../../../../../images/perps/order-types/take-market.svg';
import TakeMarketIconLight from '../../../../../images/perps/order-types/take-market-light.svg';
import TwapIconDark from '../../../../../images/perps/order-types/twap.svg';
import TwapIconLight from '../../../../../images/perps/order-types/twap-light.svg';
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

const SCALE_ORDER_TYPE: OrderTypeOption = {
  type: 'scale',
  titleKey: 'perps.order.type.scale.title',
  descriptionKey: 'perps.order.type.scale.description',
  LightIcon: ScaleIconLight,
  DarkIcon: ScaleIconDark,
  testID: PerpsOrderTypeBottomSheetSelectorsIDs.SCALE_OPTION,
};

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
  LightIcon: TwapIconLight,
  DarkIcon: TwapIconDark,
  testID: PerpsOrderTypeBottomSheetSelectorsIDs.TWAP_OPTION,
};

type OrderTypeCategoryKey = 'basic' | 'triggered' | 'advanced';

interface OrderTypeCategory {
  key: OrderTypeCategoryKey;
  labelKey: string;
  orderTypes: readonly OrderType[];
  testID: string;
}

const ORDER_TYPE_OPTIONS = new Map<OrderType, OrderTypeOption>(
  [
    ...BASIC_ORDER_TYPES,
    ...TRIGGERED_ORDER_TYPES,
    TWAP_ORDER_TYPE,
    SCALE_ORDER_TYPE,
  ].map((option): [OrderType, OrderTypeOption] => [option.type, option]),
);

const ORDER_TYPE_CATEGORIES: readonly OrderTypeCategory[] = [
  {
    key: 'basic',
    labelKey: 'perps.order.type.basic',
    orderTypes: ['market', 'limit'],
    testID: PerpsOrderTypeBottomSheetSelectorsIDs.BASIC_TAB,
  },
  {
    key: 'triggered',
    labelKey: 'perps.order.type.triggered',
    orderTypes: [
      'stop_limit',
      'stop_market',
      'take_profit_limit',
      'take_profit_market',
    ],
    testID: PerpsOrderTypeBottomSheetSelectorsIDs.TRIGGERED_TAB,
  },
  {
    key: 'advanced',
    labelKey: 'perps.order.type.advanced',
    // Canonical shared order for implemented advanced strategies. Chase
    // remains filtered out until its own gated option metadata lands.
    orderTypes: ['twap', 'scale', 'chase'],
    testID: PerpsOrderTypeBottomSheetSelectorsIDs.ADVANCED_TAB,
  },
];

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
  /** Ordered types available in the Pro picker. Omit for the Basic-only sheet. */
  availableOrderTypes?: readonly OrderType[];
  sheetRef?: React.RefObject<BottomSheetRef | null>;
}

const PerpsOrderTypeBottomSheetView = ({
  isVisible = true,
  onClose,
  onSelect,
  currentOrderType,
  title = strings('perps.order.type.title'),
  showSelectedIcon = false,
  availableOrderTypes,
  sheetRef: externalSheetRef,
}: PerpsOrderTypeBottomSheetViewProps) => {
  const internalSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = externalSheetRef ?? internalSheetRef;
  const shouldShowOrderTypeIcon =
    showSelectedIcon || availableOrderTypes !== undefined;
  const availableOrderTypeSet = useMemo(
    () =>
      new Set<OrderType>(
        availableOrderTypes ?? BASIC_ORDER_TYPES.map(({ type }) => type),
      ),
    [availableOrderTypes],
  );
  const visibleCategories = useMemo(
    () =>
      ORDER_TYPE_CATEGORIES.map((category) => ({
        ...category,
        options: category.orderTypes
          .filter((type) => availableOrderTypeSet.has(type))
          .map((type) => ORDER_TYPE_OPTIONS.get(type))
          .filter((option): option is OrderTypeOption => option !== undefined),
      })).filter(({ options }) => options.length > 0),
    [availableOrderTypeSet],
  );
  const selectedCategoryKey = visibleCategories.find(({ options }) =>
    options.some(({ type }) => type === currentOrderType),
  )?.key;
  const fallbackCategoryKey =
    selectedCategoryKey ?? visibleCategories[0]?.key ?? 'basic';
  const [activeCategoryKey, setActiveCategoryKey] =
    useState<OrderTypeCategoryKey>(fallbackCategoryKey);

  useEffect(() => {
    if (!isVisible) {
      return;
    }
    setActiveCategoryKey((currentKey) => {
      const currentCategoryExists = visibleCategories.some(
        ({ key }) => key === currentKey,
      );
      return currentCategoryExists ? currentKey : fallbackCategoryKey;
    });
  }, [fallbackCategoryKey, isVisible, visibleCategories]);

  const activeCategoryIndex = Math.max(
    0,
    visibleCategories.findIndex(({ key }) => key === activeCategoryKey),
  );
  const activeCategory = visibleCategories[activeCategoryIndex];
  const categoryTabs = useMemo<TabItem[]>(
    () =>
      visibleCategories.map(({ key, labelKey, testID }) => ({
        key,
        label: strings(labelKey),
        content: null,
        testID,
      })),
    [visibleCategories],
  );

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

  const renderOrderType = (orderType: OrderTypeOption) => (
    <ListItemSelect
      key={orderType.type}
      title={strings(orderType.titleKey)}
      description={strings(orderType.descriptionKey)}
      descriptionProps={DESCRIPTION_PROPS}
      accessoryGap={2}
      startAccessory={
        shouldShowOrderTypeIcon ? (
          <OrderTypeStartAccessory
            LightIcon={orderType.LightIcon}
            DarkIcon={orderType.DarkIcon}
            type={orderType.type}
            testID={orderType.testID}
          />
        ) : undefined
      }
      isSelected={currentOrderType === orderType.type}
      showSelectedIcon={false}
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
      {availableOrderTypes !== undefined && visibleCategories.length > 1 ? (
        <TabsBar
          tabs={categoryTabs}
          activeIndex={activeCategoryIndex}
          onTabPress={(index) => {
            const category = visibleCategories[index];
            if (category) {
              setActiveCategoryKey(category.key);
            }
          }}
          testID={PerpsOrderTypeBottomSheetSelectorsIDs.TABS}
        />
      ) : null}
      {activeCategory?.options.map(renderOrderType)}
    </BottomSheet>
  );
};

export default PerpsOrderTypeBottomSheetView;
