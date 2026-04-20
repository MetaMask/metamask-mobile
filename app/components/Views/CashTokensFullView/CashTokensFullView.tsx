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
import { useMusdConversionTokens } from '../../UI/Earn/hooks/useMusdConversionTokens';
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

const CashTokensFullView = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const { hasMusdBalanceOnAnyChain } = useMusdBalance();
  const { tokens: conversionTokens } = useMusdConversionTokens();

  const isMoneyHubEnabled = useSelector(selectMoneyHubEnabledFlag);

  const hasConversionTokens = conversionTokens.length > 0;

  // Loading signal: neither useMusdBalance nor useMusdConversionTokens expose
  // an isLoading flag (they derive from synchronous Redux selectors). We mirror
  // the Tokens component's hasInitialLoad pattern and flip loading off after
  // the first InteractionManager tick so the Hub's dedicated skeleton shows on
  // the first paint instead of falling through to TokenListSkeleton.
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      setIsLoading(false);
    });
    return () => handle.cancel();
  }, []);

  const merklRefetchRef = useRef<(() => void) | null>(null);
  const refetchMerklBonus = useCallback(() => merklRefetchRef.current?.(), []);
  const handleRefetchReady = useCallback((refetch: () => void) => {
    merklRefetchRef.current = refetch;
  }, []);
  const { refreshing, onRefresh } = useCashTokensRefresh(refetchMerklBonus);

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
        await initiateMaxConversion(token);
      } catch (error) {
        Logger.error(error as Error, {
          message: '[CashTokensFullView] Failed to initiate max conversion',
        });
      }
    },
    [initiateMaxConversion],
  );

  const handleConvertEditPress = useCallback(
    async (token: AssetType) => {
      try {
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
    [initiateCustomConversion],
  );

  const handleConvertPress = useCallback(async () => {
    const topToken = conversionTokens[0];
    if (!topToken) return;
    try {
      await initiateMaxConversion(topToken);
    } catch (error) {
      Logger.error(error as Error, {
        message: '[CashTokensFullView] Failed to initiate convert CTA',
      });
    }
  }, [conversionTokens, initiateMaxConversion]);

  const handleLearnMorePress = useCallback(() => {
    Linking.openURL(AppConstants.URLS.MUSD_LEARN_MORE);
  }, []);

  const bonusAndConvertSections = useMemo(
    () => (
      <>
        <AssetOverviewClaimBonus
          asset={MUSD_MAINNET_ASSET_FOR_DETAILS}
          onRefetchReady={handleRefetchReady}
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

  if (isLoading) {
    return <CashTokensFullViewSkeleton />;
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-default pb-4`}>
      <HeaderBase
        startAccessory={
          <ButtonIcon
            size={ButtonIconSize.Md}
            onPress={handleBackPress}
            iconName={IconName.ArrowLeft}
            testID="back-button"
          />
        }
        style={tw`p-4`}
        twClassName="h-auto"
      >
        {strings('homepage.sections.cash')}
      </HeaderBase>
      {hasMusdBalanceOnAnyChain ? (
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
        <ScrollView
          style={tw`flex-1`}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <SectionRow>
            <CashGetMusdEmptyState isFullView />
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
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                isFullWidth
                onPress={() => goToSwaps()}
              >
                {strings('money.convert_stablecoins.swap')}
              </Button>
            </Box>
            <Box twClassName="flex-1">
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                isFullWidth
                onPress={() =>
                  goToBuy({
                    assetId:
                      MUSD_TOKEN_ASSET_ID_BY_CHAIN[
                        MUSD_CONVERSION_DEFAULT_CHAIN_ID
                      ],
                  })
                }
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
