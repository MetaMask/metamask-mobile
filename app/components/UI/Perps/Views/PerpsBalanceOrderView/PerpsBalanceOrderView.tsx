import React, { useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useIsFocused,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  HeaderStandard,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type { PerpsNavigationParamList } from '../../types/navigation';
import {
  PerpsOrderProvider,
  usePerpsOrderContext,
} from '../../contexts/PerpsOrderContext';
import { usePerpsMarkets } from '../../hooks/usePerpsMarkets';
import { selectPerpsProvider } from '../../selectors/perpsController';
import { PROVIDER_CONFIG } from '../../constants/perpsConfig';
import PerpsLoader from '../../components/PerpsLoader';
import PerpsProOrderFormPanel from '../PerpsProMarketView/components/PerpsProOrderFormPanel';
import { PerpsBalanceOrderViewSelectorsIDs } from './PerpsBalanceOrderView.testIds';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller/constants';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsMeasurement } from '../../hooks/usePerpsMeasurement';
import { usePerpsLiveAccount, usePerpsLivePrices } from '../../hooks/stream';
import { TraceName } from '../../../../../util/trace';

/** Applies an order-book limit selection once, without overwriting later edits. */
const InitialLimitPrice = ({ price }: { price?: string }) => {
  const { commitLimitPrice } = usePerpsOrderContext();
  const applied = useRef(false);
  useEffect(() => {
    if (!applied.current) {
      applied.current = true;
      if (price !== undefined) commitLimitPrice(price);
    }
  }, [price, commitLimitPrice]);
  return null;
};

/** Direct venue-balance trading, independent of deposit confirmations and UI mode. */
const PerpsBalanceOrderView = () => {
  const { params } =
    useRoute<RouteProp<PerpsNavigationParamList, 'PerpsBalanceOrder'>>();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const activeProvider = useSelector(selectPerpsProvider);
  const { markets, isLoading } = usePerpsMarkets();
  const orderProvider = params.providerId ?? activeProvider;
  const isLighterOrder = orderProvider === 'lighter';
  const defaultMarketProvider =
    activeProvider !== undefined &&
    activeProvider !== PROVIDER_CONFIG.AggregatedProvider
      ? activeProvider
      : PROVIDER_CONFIG.DefaultProvider;
  const market = isLighterOrder
    ? markets.find(
        ({ symbol, providerId }) =>
          symbol === params.asset &&
          (providerId ?? defaultMarketProvider) === orderProvider,
      )
    : undefined;
  const { account, isInitialLoading: isLoadingAccount } = usePerpsLiveAccount();
  const prices = usePerpsLivePrices({
    symbols: market ? [market.symbol] : [],
    throttleMs: 1000,
  });
  const isReady =
    Boolean(market) &&
    !isLoading &&
    !isLoadingAccount &&
    Boolean(account) &&
    Number(prices[params.asset]?.price) > 0;
  const screenKey = `${orderProvider}:${params.asset}`;
  usePerpsMeasurement({
    traceName: TraceName.PerpsOrderView,
    resetKey: screenKey,
    ownerActive: isFocused,
    startConditions: [isFocused, isLighterOrder],
    endConditions: [isReady],
    debugContext: { asset: params.asset, provider: orderProvider },
  });
  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    resetKey: screenKey,
    conditions: [isFocused, isReady],
    properties: {
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]: PERPS_EVENT_VALUE.SCREEN_TYPE.TRADING,
      [PERPS_EVENT_PROPERTY.ASSET]: params.asset,
      [PERPS_EVENT_PROPERTY.DIRECTION]: params.direction,
      [PERPS_EVENT_PROPERTY.SOURCE]:
        params.source ?? PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
      [PERPS_EVENT_PROPERTY.ASSET_TYPE]: PERPS_EVENT_VALUE.ASSET_TYPE.PERP,
      [PERPS_EVENT_PROPERTY.HAS_PERP_BALANCE]:
        Number(account?.totalBalance) > 0,
    },
  });

  return (
    <Box
      twClassName="flex-1 bg-default"
      style={tw.style({ paddingTop: insets.top, paddingBottom: insets.bottom })}
      accessible={false}
      testID={PerpsBalanceOrderViewSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        title={params.asset}
        onBack={navigation.goBack}
        backButtonProps={{ testID: PerpsBalanceOrderViewSelectorsIDs.BACK }}
      />
      {!isLighterOrder || (!isLoading && !market) ? (
        <Text
          variant={TextVariant.BodyMd}
          testID={PerpsBalanceOrderViewSelectorsIDs.ERROR}
        >
          {strings('perps.market.details.error_message')}
        </Text>
      ) : !market ? (
        <PerpsLoader />
      ) : (
        <ScrollView
          ref={scrollViewRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={tw.style('p-4 pb-12')}
        >
          <PerpsOrderProvider
            key={`${market.providerId}:${market.symbol}`}
            initialAsset={market.symbol}
            initialDirection={params.direction}
            initialAmount={params.amount}
            initialLeverage={params.leverage}
            initialType={params.orderType}
            existingPosition={params.existingPosition}
            fallbackAmount=""
          >
            <InitialLimitPrice price={params.price} />
            <PerpsProOrderFormPanel
              market={market}
              isScreenFocused={isFocused}
              scrollViewRef={scrollViewRef}
            />
          </PerpsOrderProvider>
        </ScrollView>
      )}
    </Box>
  );
};

export default PerpsBalanceOrderView;
