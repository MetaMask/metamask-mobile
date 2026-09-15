import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { InteractionManager, RefreshControl, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderBase,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import Tokens from '../../UI/Tokens';
import { useMusdBalance } from '../../UI/Earn/hooks/useMusdBalance';
import {
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../../UI/Earn/constants/musd';
import { useRampNavigation } from '../../UI/Ramp/hooks/useRampNavigation';
import { RAMPS_BUY_CUF_SURFACE } from '../../UI/Ramp/constants/rampsBuyCufTags';
import {
  useSwapBridgeNavigation,
  SwapBridgeNavigationLocation,
} from '../../UI/Bridge/hooks/useSwapBridgeNavigation';
import MoneyMusdEmptyBalanceRow from '../../UI/Money/components/MoneyMusdEmptyBalanceRow';
import { MUSD_MAINNET_ASSET_FOR_DETAILS } from './CashTokensFullView.constants';
import CashTokensFullViewSkeleton from './CashTokensFullViewSkeleton';
import { useCashTokensRefresh } from './useCashTokensRefresh';
import { selectMoneyHubEnabledFlag } from '../../UI/Money/selectors/featureFlags';
import { useSelector } from 'react-redux';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { MONEY_HUB_EVENTS_CONSTANTS } from '../../UI/Money/constants/moneyHubEvents';
import { CashTokensFullViewTestIds } from './CashTokensFullView.testIds';

const { EVENT_LOCATIONS: MONEY_EVENT_LOCATIONS } = MONEY_HUB_EVENTS_CONSTANTS;

const CashTokensFullView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { hasMusdBalanceOnAnyChain, tokenBalanceByChain } = useMusdBalance();

  const numChainsWithMusdBalance = Object.keys(tokenBalanceByChain).length;

  const handleEmptyMusdRowPress = useCallback(() => {
    navigation.navigate('Asset', {
      ...MUSD_MAINNET_ASSET_FOR_DETAILS,
    });
  }, [navigation]);

  const isMoneyHubEnabled = useSelector(selectMoneyHubEnabledFlag);

  const [isTokenListReady, setIsTokenListReady] = useState(false);
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      setIsTokenListReady(true);
    });
    return () => handle.cancel();
  }, []);

  const screenViewedRef = useRef(false);

  const isScreenReady = !hasMusdBalanceOnAnyChain || isTokenListReady;

  useEffect(() => {
    if (!isScreenReady || screenViewedRef.current || !isMoneyHubEnabled) return;
    screenViewedRef.current = true;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.MONEY_HUB_SCREEN_VIEWED).build(),
    );
  }, [createEventBuilder, trackEvent, isMoneyHubEnabled, isScreenReady]);

  const { refreshing, onRefresh } = useCashTokensRefresh();

  const { goToBuy } = useRampNavigation();
  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.MainView,
    sourcePage: 'CashTokensFullView',
  });

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSwapsPress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.MONEY_HUB_SWAP_BUTTON_CLICKED)
        .addProperties({
          location: MONEY_EVENT_LOCATIONS.MONEY_HUB,
        })
        .build(),
    );

    goToSwaps();
  }, [createEventBuilder, goToSwaps, trackEvent]);

  const handleBuyPress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.MONEY_HUB_BUY_BUTTON_CLICKED)
        .addProperties({
          location: MONEY_EVENT_LOCATIONS.MONEY_HUB,
        })
        .build(),
    );

    goToBuy(
      {
        assetId: MUSD_TOKEN_ASSET_ID_BY_CHAIN[MUSD_CONVERSION_DEFAULT_CHAIN_ID],
      },
      { surface: RAMPS_BUY_CUF_SURFACE.CASH },
    );
  }, [createEventBuilder, goToBuy, trackEvent]);

  const balanceHeading = useMemo(
    () => (
      <Box twClassName="px-4 pt-2 pb-3">
        <Text
          variant={TextVariant.HeadingLg}
          fontWeight={FontWeight.Bold}
          testID={CashTokensFullViewTestIds.HEADING}
        >
          {strings('money.your_balance')}
        </Text>
      </Box>
    ),
    [],
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-default pb-4`}>
      <HeaderBase
        startAccessory={
          <ButtonIcon
            size={ButtonIconSize.Md}
            onPress={handleBackPress}
            iconName={IconName.ArrowLeft}
            testID={CashTokensFullViewTestIds.BACK_BUTTON}
          />
        }
        style={tw`p-4`}
        twClassName="h-auto"
      >
        {strings('money.title')}
      </HeaderBase>
      {hasMusdBalanceOnAnyChain ? (
        isTokenListReady ? (
          <Tokens
            isFullView
            showOnlyMusd
            hideLoadingSkeleton
            hasMusdBalanceOnAnyChain={hasMusdBalanceOnAnyChain}
            // MUSD-729: hide the "3% bonus" / price-rail secondary row on
            // mUSD entries inside Money Hub so the row reads as a balance
            // entry under the new "Your balance" heading.
            hideSecondaryPriceRow={isMoneyHubEnabled}
            listHeaderComponent={isMoneyHubEnabled ? balanceHeading : undefined}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        ) : (
          <CashTokensFullViewSkeleton
            numChainsWithMusdBalance={numChainsWithMusdBalance}
            listHeaderComponent={isMoneyHubEnabled ? balanceHeading : undefined}
          />
        )
      ) : (
        <ScrollView
          style={tw`flex-1`}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {isMoneyHubEnabled && balanceHeading}
          {/*
            MUSD-729 empty state: mirror the "Your balance" funded layout
            (mUSD avatar + network badge + $0.00 / 0 mUSD). The standard
            <Tokens /> list does not render a row for tokens with zero
            balance, and there is no shared design-system component that
            matches this presentation, so we fall back to a small bespoke
            row to keep the empty/funded structures visually consistent.
          */}
          <MoneyMusdEmptyBalanceRow onPress={handleEmptyMusdRowPress} />
        </ScrollView>
      )}
      {isMoneyHubEnabled && (
        <Box flexDirection={BoxFlexDirection.Row} twClassName="px-4 pt-4 gap-2">
          <Box twClassName="flex-1">
            <Button
              testID={CashTokensFullViewTestIds.SWAP_BUTTON}
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handleSwapsPress}
            >
              {strings('money.convert_stablecoins.swap')}
            </Button>
          </Box>
          <Box twClassName="flex-1">
            <Button
              testID={CashTokensFullViewTestIds.BUY_BUTTON}
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handleBuyPress}
            >
              {strings('money.convert_stablecoins.buy')}
            </Button>
          </Box>
        </Box>
      )}
    </SafeAreaView>
  );
};

CashTokensFullView.displayName = 'CashTokensFullView';

export default CashTokensFullView;
