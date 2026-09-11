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
import PerpsLoader from '../../components/PerpsLoader';
import PerpsProOrderFormPanel from '../PerpsProMarketView/components/PerpsProOrderFormPanel';
import { PerpsBalanceOrderViewSelectorsIDs } from './PerpsBalanceOrderView.testIds';

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
  const market = markets.find(({ symbol }) => symbol === params.asset);

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
      {activeProvider !== 'lighter' || (!isLoading && !market) ? (
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
            key={market.symbol}
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
