import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  InteractionManager,
  Linking,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Hex } from '@metamask/utils';
import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderBase,
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import Tokens from '../../UI/Tokens';
import { useMusdBalance } from '../../UI/Earn/hooks/useMusdBalance';
import {
  tokenFiatValue,
  useMusdConversionTokens,
} from '../../UI/Earn/hooks/useMusdConversionTokens';
import { useMusdConversion } from '../../UI/Earn/hooks/useMusdConversion';
import {
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../../UI/Earn/constants/musd';
import { MUSD_CONVERSION_NAVIGATION_OVERRIDE } from '../../UI/Earn/types/musd.types';
import { useRampNavigation } from '../../UI/Ramp/hooks/useRampNavigation';
import {
  useSwapBridgeNavigation,
  SwapBridgeNavigationLocation,
} from '../../UI/Bridge/hooks/useSwapBridgeNavigation';
import MoneyConvertStablecoins from '../../UI/Money/components/MoneyConvertStablecoins/MoneyConvertStablecoins';
import AssetOverviewClaimBonus from '../../UI/Earn/components/AssetOverviewClaimBonus/AssetOverviewClaimBonus';
import { MUSD_MAINNET_ASSET_FOR_DETAILS } from '../Homepage/Sections/Cash/CashGetMusdEmptyState.constants';
import CashGetMusdEmptyState from '../Homepage/Sections/Cash/CashGetMusdEmptyState';
import SectionRow from '../Homepage/components/SectionRow/SectionRow';
import CashTokensFullViewSkeleton from './CashTokensFullViewSkeleton';
import { useCashTokensRefresh } from './useCashTokensRefresh';
import { AssetType } from '../confirmations/types/token';
import Logger from '../../../util/Logger';
import AppConstants from '../../../core/AppConstants';
import { selectMoneyHubEnabledFlag } from '../../UI/Money/selectors/featureFlags';
import { useSelector } from 'react-redux';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { MUSD_EVENTS_CONSTANTS } from '../../UI/Earn/constants/events/musdEvents';
import { MONEY_EVENTS_CONSTANTS } from '../../UI/Money/constants/moneyEvents';
import { getNetworkName } from '../../UI/Earn/utils/network';
import { CashTokensFullViewTestIds } from './CashTokensFullView.testIds';

const { EVENT_LOCATIONS: MONEY_EVENT_LOCATIONS } = MONEY_EVENTS_CONSTANTS;
const { EVENT_LOCATIONS: MUSD_EVENT_LOCATIONS } = MUSD_EVENTS_CONSTANTS;

const CashTokensFullView = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { hasMusdBalanceOnAnyChain, tokenBalanceByChain } = useMusdBalance();

  const numChainsWithMusdBalance = Object.keys(tokenBalanceByChain).length;

  const { tokens: conversionTokens } = useMusdConversionTokens();

  const isMoneyHubEnabled = useSelector(selectMoneyHubEnabledFlag);

  const hasConversionTokens = conversionTokens.length > 0;

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

    const hasConvertibleTokens = conversionTokens.length > 0;
    const highestBalanceConversionToken = hasConvertibleTokens
      ? conversionTokens.reduce(
          (max, token) =>
            tokenFiatValue(token) > tokenFiatValue(max) ? token : max,
          conversionTokens[0],
        )
      : undefined;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.MONEY_HUB_SCREEN_VIEWED)
        .addProperties({
          has_convertible_tokens: hasConvertibleTokens,
          ...(hasConvertibleTokens
            ? {
                highest_balance_conversion_token_symbol:
                  highestBalanceConversionToken?.symbol,
                highest_balance_conversion_token_chain_id:
                  highestBalanceConversionToken?.chainId,
              }
            : {}),
        })
        .build(),
    );
  }, [
    conversionTokens,
    createEventBuilder,
    trackEvent,
    isMoneyHubEnabled,
    isScreenReady,
  ]);

  const merklRefetchRef = useRef<(() => void) | null>(null);
  const handleRefetchReady = useCallback((refetch: () => void) => {
    merklRefetchRef.current = refetch;
  }, []);
  const { refreshing, onRefresh } = useCashTokensRefresh(merklRefetchRef);

  const { initiateMaxConversion, initiateCustomConversion } =
    useMusdConversion();
  const { goToBuy } = useRampNavigation();
  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.MainView,
    sourcePage: 'CashTokensFullView',
  });

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleConvertMaxPress = useCallback(
    async (token: AssetType) => {
      try {
        trackEvent(
          createEventBuilder(
            MetaMetricsEvents.MONEY_HUB_TOKEN_ROW_CONVERT_CLICKED,
          )
            .addProperties({
              location: MONEY_EVENT_LOCATIONS.MONEY_HUB,
              button_type: 'text_button',
              button_action: 'max',
              button_text: strings('earn.musd_conversion.max'),
              redirects_to:
                MUSD_EVENT_LOCATIONS.QUICK_CONVERT_MAX_BOTTOM_SHEET_CONFIRMATION_SCREEN,
              asset_symbol: token.symbol,
              network_chain_id: token.chainId,
              network_name: token.chainId
                ? getNetworkName(token.chainId as Hex)
                : 'unknown',
            })
            .build(),
        );
        await initiateMaxConversion(token);
      } catch (error) {
        Logger.error(error as Error, {
          message: '[CashTokensFullView] Failed to initiate max conversion',
        });
      }
    },
    [createEventBuilder, initiateMaxConversion, trackEvent],
  );

  const handleConvertEditPress = useCallback(
    async (token: AssetType) => {
      try {
        trackEvent(
          createEventBuilder(
            MetaMetricsEvents.MONEY_HUB_TOKEN_ROW_CONVERT_CLICKED,
          )
            .addProperties({
              location: MONEY_EVENT_LOCATIONS.MONEY_HUB,
              button_type: 'icon_button',
              icon: IconName.Edit,
              button_action: 'custom',
              redirects_to: MUSD_EVENT_LOCATIONS.CUSTOM_AMOUNT_SCREEN,
              asset_symbol: token.symbol,
              network_chain_id: token.chainId,
              network_name: token.chainId
                ? getNetworkName(token.chainId as Hex)
                : 'unknown',
            })
            .build(),
        );

        await initiateCustomConversion({
          preferredPaymentToken: {
            address: token.address as Hex,
            chainId: token.chainId as Hex,
          },
          navigationOverride: MUSD_CONVERSION_NAVIGATION_OVERRIDE.CUSTOM,
        });
      } catch (error) {
        Logger.error(error as Error, {
          message: '[CashTokensFullView] Failed to initiate custom conversion',
        });
      }
    },
    [createEventBuilder, initiateCustomConversion, trackEvent],
  );

  const handleConvertPress = useCallback(async () => {
    const topToken = conversionTokens[0];
    if (!topToken) return;
    try {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.MONEY_HUB_CONVERT_BUTTON_CLICKED)
          .addProperties({
            location: MONEY_EVENT_LOCATIONS.MONEY_HUB,
            button_type: 'text_button',
            button_action: 'custom',
            redirects_to: MUSD_EVENT_LOCATIONS.CUSTOM_AMOUNT_SCREEN,
            asset_symbol: topToken.symbol,
            network_chain_id: topToken.chainId,
            network_name: topToken.chainId
              ? getNetworkName(topToken.chainId as Hex)
              : 'unknown',
          })
          .build(),
      );

      await initiateCustomConversion({
        preferredPaymentToken: {
          address: topToken.address as Hex,
          chainId: topToken.chainId as Hex,
        },
      });
    } catch (error) {
      Logger.error(error as Error, {
        message: '[CashTokensFullView] Failed to initiate convert CTA',
      });
    }
  }, [
    conversionTokens,
    createEventBuilder,
    initiateCustomConversion,
    trackEvent,
  ]);

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

    goToBuy({
      assetId: MUSD_TOKEN_ASSET_ID_BY_CHAIN[MUSD_CONVERSION_DEFAULT_CHAIN_ID],
    });
  }, [createEventBuilder, goToBuy, trackEvent]);

  const handleLearnMorePress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.MONEY_HUB_LEARN_MORE_PRESSED)
        .addProperties({
          location: MONEY_EVENT_LOCATIONS.MONEY_HUB,
          url: AppConstants.URLS.MUSD_LEARN_MORE,
        })
        .build(),
    );

    Linking.openURL(AppConstants.URLS.MUSD_LEARN_MORE);
  }, [createEventBuilder, trackEvent]);

  const bonusAndConvertSections = useMemo(
    () => (
      <>
        <AssetOverviewClaimBonus
          asset={MUSD_MAINNET_ASSET_FOR_DETAILS}
          onRefetchReady={handleRefetchReady}
          location={MONEY_EVENT_LOCATIONS.MONEY_HUB}
        />
        <MoneyConvertStablecoins
          tokens={conversionTokens}
          onMaxPress={handleConvertMaxPress}
          onEditPress={handleConvertEditPress}
          onLearnMorePress={handleLearnMorePress}
        />
      </>
    ),
    [
      conversionTokens,
      handleConvertMaxPress,
      handleConvertEditPress,
      handleLearnMorePress,
      handleRefetchReady,
    ],
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
        {strings('homepage.sections.cash')}
      </HeaderBase>
      {hasMusdBalanceOnAnyChain ? (
        isTokenListReady ? (
          <Tokens
            isFullView
            showOnlyMusd
            hideLoadingSkeleton
            hasMusdBalanceOnAnyChain={hasMusdBalanceOnAnyChain}
            listFooterComponent={
              isMoneyHubEnabled ? bonusAndConvertSections : undefined
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        ) : (
          <CashTokensFullViewSkeleton
            numChainsWithMusdBalance={numChainsWithMusdBalance}
            hasMusdBalance={hasMusdBalanceOnAnyChain}
            isMoneyHubEnabled={isMoneyHubEnabled}
            conversionTokenCount={conversionTokens.length}
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
          <SectionRow>
            <CashGetMusdEmptyState
              isFullView
              hideClaimButton={isMoneyHubEnabled}
            />
          </SectionRow>
          {isMoneyHubEnabled ? bonusAndConvertSections : undefined}
        </ScrollView>
      )}
      {isMoneyHubEnabled &&
        (hasConversionTokens ? (
          <Box twClassName="px-4 pt-4">
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handleConvertPress}
            >
              {strings('money.convert_stablecoins.convert_cta')}
            </Button>
          </Box>
        ) : (
          <Box
            flexDirection={BoxFlexDirection.Row}
            twClassName="px-4 pt-4 gap-2"
          >
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
        ))}
    </SafeAreaView>
  );
};

CashTokensFullView.displayName = 'CashTokensFullView';

export default CashTokensFullView;
