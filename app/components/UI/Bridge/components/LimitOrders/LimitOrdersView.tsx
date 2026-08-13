import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonBase,
  ButtonBaseSize,
  ContentVariant,
  FontWeight,
  ListItem,
  Tag,
  TagSeverity,
  TabEmptyState,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Pressable, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  selectDestToken,
  selectSlippage,
  selectSourceToken,
  setSlippage,
} from '../../../../../core/redux/slices/bridge';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { useTokenFiatRate } from '../../hooks/useTokenFiatRate';
import { useBridgeQuoteDataContext } from '../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import {
  formatCurrency,
  formatMinimumReceived,
} from '../../utils/currencyUtils';
import TabsBar from '../../../../../component-library/components-temp/Tabs/TabsBar';
import { FilterButton } from '../../../Trending/components/FilterBar/FilterBar';
import LimitOrderExpirationBottomSheet from './LimitOrderExpirationBottomSheet';
import {
  calculateLimitTriggerFiat,
  DEFAULT_LIMIT_ORDER_EXPIRATION,
  getTriggerPresetLabel,
  LIMIT_ORDER_EXPIRATION_OPTIONS,
  LIMIT_ORDER_TRIGGER_OFFSETS,
  LimitOrdersSelectorsIDs,
  LimitOrdersTab,
  type LimitOrderExpiration,
  type LimitOrderRowModel,
  type LimitOrderStatus,
  type LimitOrderTriggerOffset,
} from './limitOrders';

export interface LimitOrdersViewProps {
  selectorForm?: ReactNode;
  openOrders?: LimitOrderRowModel[];
  historyOrders?: LimitOrderRowModel[];
}

const statusSeverity: Record<LimitOrderStatus, TagSeverity> = {
  open: TagSeverity.Info,
  pending: TagSeverity.Warning,
  filled: TagSeverity.Success,
  cancelled: TagSeverity.Neutral,
  expired: TagSeverity.Neutral,
};

const statusLabelKeys: Record<LimitOrderStatus, string> = {
  open: 'bridge.limit_order.status.open',
  pending: 'bridge.limit_order.status.pending',
  filled: 'bridge.limit_order.status.filled',
  cancelled: 'bridge.limit_order.status.cancelled',
  expired: 'bridge.limit_order.status.expired',
};

const LimitOrderRow = ({ order }: { order: LimitOrderRowModel }) => (
  <ListItem
    testID={`${LimitOrdersSelectorsIDs.ORDER_ROW_PREFIX}-${order.id}`}
    variant={ContentVariant.TwoLines}
    avatar={
      <AvatarToken
        name={order.destinationToken.symbol}
        src={
          order.destinationToken.iconUrl
            ? { uri: order.destinationToken.iconUrl }
            : undefined
        }
        size={AvatarTokenSize.Sm}
      />
    }
    title={`${order.sourceAmount} ${order.sourceToken.symbol} → ${order.destinationAmount} ${order.destinationToken.symbol}`}
    description={`${order.networkName} · ${order.expiration}`}
    value={
      <Tag severity={statusSeverity[order.status]}>
        {strings(statusLabelKeys[order.status])}
      </Tag>
    }
    subvalue={order.triggerPrice}
  />
);

const LimitOrdersView = ({
  selectorForm,
  openOrders = [],
  historyOrders = [],
}: LimitOrdersViewProps) => {
  const dispatch = useDispatch();
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const sourceToken = useSelector(selectSourceToken);
  const destinationToken = useSelector(selectDestToken);
  const slippage = useSelector(selectSlippage);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const sourceTokenFiatRate = useTokenFiatRate(sourceToken);
  const { quoteRate, isLoading, isExpired, isActiveQuoteForCurrentTokenPair } =
    useBridgeQuoteDataContext();

  const [selectedTriggerOffset, setSelectedTriggerOffset] =
    useState<LimitOrderTriggerOffset>(0);
  const [selectedExpiration, setSelectedExpiration] =
    useState<LimitOrderExpiration>(DEFAULT_LIMIT_ORDER_EXPIRATION);
  const [isExpirationSheetVisible, setIsExpirationSheetVisible] =
    useState(false);
  const [selectedOrdersTab, setSelectedOrdersTab] = useState(
    LimitOrdersTab.OpenOrders,
  );

  useEffect(() => {
    if (slippage === undefined) {
      dispatch(setSlippage('2'));
    }
  }, [dispatch, slippage]);

  useEffect(() => {
    setSelectedTriggerOffset(0);
  }, [
    destinationToken?.address,
    destinationToken?.chainId,
    quoteRate,
    sourceToken?.address,
    sourceToken?.chainId,
  ]);

  const hasUsableQuote =
    !isLoading &&
    !isExpired &&
    isActiveQuoteForCurrentTokenPair &&
    Number.isFinite(quoteRate) &&
    (quoteRate ?? 0) > 0 &&
    Number.isFinite(sourceTokenFiatRate) &&
    (sourceTokenFiatRate ?? 0) > 0;

  const triggerValues = useMemo(() => {
    if (
      !hasUsableQuote ||
      quoteRate === undefined ||
      sourceTokenFiatRate === undefined
    ) {
      return undefined;
    }

    const sourcePerDestination = 1 / quoteRate;
    const triggerFiat = calculateLimitTriggerFiat({
      quoteRate,
      sourceTokenFiatRate,
      offset: selectedTriggerOffset,
    });

    return {
      sourcePerDestination:
        sourcePerDestination * (1 + selectedTriggerOffset / 100),
      triggerFiat,
    };
  }, [hasUsableQuote, quoteRate, selectedTriggerOffset, sourceTokenFiatRate]);

  const handleSlippagePress = () => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SWAP_DEFAULT_SLIPPAGE_MODAL,
      params: {
        sourceChainId: sourceToken?.chainId,
        destChainId: destinationToken?.chainId,
      },
    });
  };

  const selectedOrders =
    selectedOrdersTab === LimitOrdersTab.OpenOrders
      ? openOrders
      : historyOrders;

  const orderTabs = [
    {
      key: LimitOrdersTab.OpenOrders,
      label: strings('bridge.limit_order.open_orders'),
      content: null,
      testID: LimitOrdersSelectorsIDs.OPEN_ORDERS_TAB,
    },
    {
      key: LimitOrdersTab.History,
      label: strings('bridge.limit_order.history'),
      content: null,
      testID: LimitOrdersSelectorsIDs.HISTORY_TAB,
    },
  ];

  const selectedExpirationLabel =
    LIMIT_ORDER_EXPIRATION_OPTIONS.find(
      (option) => option.value === selectedExpiration,
    )?.labelKey ?? 'bridge.limit_order.expiration.1_week';

  return (
    <>
      <ScrollView
        testID={LimitOrdersSelectorsIDs.CONTAINER}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('pb-8')}
      >
        {selectorForm ? (
          <Box testID={LimitOrdersSelectorsIDs.SELECTOR_FORM}>
            {selectorForm}
          </Box>
        ) : null}

        <Box twClassName="gap-4 px-4 pt-4">
          <Box
            twClassName="gap-3 rounded-xl bg-background-muted p-4"
            testID={LimitOrdersSelectorsIDs.TRIGGER_SECTION}
          >
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings('bridge.limit_order.trigger_price')}
            </Text>
            {triggerValues ? (
              <>
                <Text
                  variant={TextVariant.HeadingMd}
                  testID={LimitOrdersSelectorsIDs.TRIGGER_PRICE}
                >
                  {formatCurrency(
                    triggerValues.triggerFiat,
                    currentCurrency ?? 'USD',
                  )}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {`1 ${destinationToken?.symbol ?? ''} = ${formatMinimumReceived(
                    triggerValues.sourcePerDestination,
                  )} ${sourceToken?.symbol ?? ''}`}
                </Text>
              </>
            ) : (
              <Text
                variant={TextVariant.HeadingMd}
                color={TextColor.TextAlternative}
                testID={LimitOrdersSelectorsIDs.TRIGGER_PRICE}
              >
                {strings('bridge.limit_order.quote_unavailable')}
              </Text>
            )}
            <Box
              flexDirection={BoxFlexDirection.Row}
              twClassName="gap-2"
              alignItems={BoxAlignItems.Center}
            >
              {LIMIT_ORDER_TRIGGER_OFFSETS.map((offset) => (
                <ButtonBase
                  key={offset}
                  size={ButtonBaseSize.Sm}
                  isDisabled={!hasUsableQuote}
                  onPress={() => setSelectedTriggerOffset(offset)}
                  twClassName={
                    selectedTriggerOffset === offset
                      ? 'bg-background-default'
                      : undefined
                  }
                  testID={`${LimitOrdersSelectorsIDs.TRIGGER_PRESET_PREFIX}-${offset}`}
                >
                  {getTriggerPresetLabel(offset)}
                </ButtonBase>
              ))}
            </Box>
          </Box>

          <Pressable
            onPress={() => setIsExpirationSheetVisible(true)}
            testID={LimitOrdersSelectorsIDs.EXPIRATION_ROW}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
              twClassName="py-2"
            >
              <Text variant={TextVariant.BodyMd}>
                {strings('bridge.limit_order.expiration.label')}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings(selectedExpirationLabel)}
              </Text>
            </Box>
          </Pressable>

          <Pressable
            onPress={handleSlippagePress}
            testID={LimitOrdersSelectorsIDs.SLIPPAGE_ROW}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
              twClassName="py-2"
            >
              <Text variant={TextVariant.BodyMd}>
                {strings('bridge.limit_order.slippage')}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {slippage === undefined ? '2%' : `${slippage}%`}
              </Text>
            </Box>
          </Pressable>

          <Box twClassName="mt-4">
            <TabsBar
              tabs={orderTabs}
              activeIndex={
                selectedOrdersTab === LimitOrdersTab.OpenOrders ? 0 : 1
              }
              onTabPress={(index) =>
                setSelectedOrdersTab(
                  index === 0
                    ? LimitOrdersTab.OpenOrders
                    : LimitOrdersTab.History,
                )
              }
              testID={LimitOrdersSelectorsIDs.ORDER_TABS}
            />
          </Box>

          <FilterButton
            label={strings('bridge.limit_order.all_networks')}
            onPress={() => undefined}
            testID={LimitOrdersSelectorsIDs.NETWORK_FILTER}
          />

          {selectedOrders.length > 0 ? (
            <Box>
              {selectedOrders.map((order) => (
                <LimitOrderRow key={order.id} order={order} />
              ))}
            </Box>
          ) : (
            <TabEmptyState
              testID={
                selectedOrdersTab === LimitOrdersTab.OpenOrders
                  ? LimitOrdersSelectorsIDs.OPEN_ORDERS_EMPTY
                  : LimitOrdersSelectorsIDs.HISTORY_EMPTY
              }
              description={strings(
                selectedOrdersTab === LimitOrdersTab.OpenOrders
                  ? 'bridge.limit_order.empty_open_orders'
                  : 'bridge.limit_order.empty_history',
              )}
              twClassName="self-center py-8"
            />
          )}
        </Box>
      </ScrollView>

      <LimitOrderExpirationBottomSheet
        isVisible={isExpirationSheetVisible}
        selectedExpiration={selectedExpiration}
        onClose={() => setIsExpirationSheetVisible(false)}
        onSelect={(expiration) => {
          setSelectedExpiration(expiration);
          setIsExpirationSheetVisible(false);
        }}
      />
    </>
  );
};

export default LimitOrdersView;
