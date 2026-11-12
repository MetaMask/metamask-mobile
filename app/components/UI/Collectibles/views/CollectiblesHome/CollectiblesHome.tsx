import type { PackHeroSource } from '../../components/CollectiblesDiscovery/PackHeroFlight.geometry';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  StackActions,
  type RouteProp,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  Box,
  HeaderStandard,
  ButtonIcon,
  IconName,
  ButtonIconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { CollectiblesHomeTestIds } from '../../Collectibles.testIds';
import AttentionBanner from '../../components/AttentionBanner';
import OverviewTab, { type DiscoveryScreen } from './OverviewTab';
import PackPurchaseSheet from '../../components/PackPurchaseSheet';
import type { CollectiblesPack, CollectiblesWalletAccount } from '../../types';
import { useAttentionOperations } from '../../providers/pack-partner/hooks/usePackPartnerOperation';
import { usePackPartnerPacks } from '../../providers/pack-partner/hooks/usePackPartnerPacks';
import { usePackPartnerCards } from '../../providers/pack-partner/hooks/usePackPartnerCards';
import { usePackPartnerAccount } from '../../providers/pack-partner/hooks/usePackPartnerAccount';
import { useUsdcBalance } from '../../providers/pack-partner/hooks/useUsdcBalance';
import type {
  CollectiblesHomeTab,
  CollectiblesStackParamList,
} from '../../types/navigation';
import CardsTab from './CardsTab';
import PacksTab from './PacksTab';
import { isCollectiblesDevEnabled } from '../../dev/devTools';
import DevTab from './DevTab';
import MarketTab from './MarketTab';
import { useBlurMaterial } from '../../../../../component-library/hooks/useBlurMaterial';
import TabBarFloatingSurface from '../../../../../component-library/components/Navigation/TabBarFloating/TabBarFloatingSurface';

/** Each destination is a stack entry: Back pops the actual caller, including wallet entry. */
const CollectiblesHome = () => {
  const tw = useTailwind();
  const material = useBlurMaterial();
  const popularScroll = useRef(new Animated.Value(0)).current;
  const { bottom, top } = useSafeAreaInsets();
  const headerHeight = top + 56;
  const navigationInset = Math.max(bottom, 16);
  const navigation = useNavigation<AppNavigationProp>();
  const isFocused = useIsFocused();
  const { params } =
    useRoute<RouteProp<CollectiblesStackParamList, 'CollectiblesHome'>>();
  const account = usePackPartnerAccount();
  const balance = useUsdcBalance();
  const attentionOperations = useAttentionOperations(account?.address);
  const devEnabled = isCollectiblesDevEnabled();
  const initialTab =
    params?.initialTab === 'dev' && !devEnabled
      ? 'packs'
      : (params?.initialTab ?? 'home');

  const [tab, setTab] = useState<CollectiblesHomeTab>(initialTab);
  const [category, setCategory] = useState(params?.category ?? '');
  const [purchase, setPurchase] = useState<{
    pack: CollectiblesPack;
    account: CollectiblesWalletAccount;
    returnToWallet?: boolean;
  }>();
  if (
    purchase &&
    (purchase.account.id !== account?.id ||
      purchase.account.address !== account?.address)
  ) {
    setPurchase(undefined);
  }
  const entry = params?.entry;
  const entryPacks = usePackPartnerPacks({
    enabled: entry?.kind === 'purchase',
  });
  // New params (e.g. returning from a reveal) select their tab once.
  const [lastParams, setLastParams] = useState(params);
  if (params !== lastParams) {
    setLastParams(params);
    if (params?.initialTab) {
      setTab(initialTab);
      setCategory(params.category ?? '');
    }
  }
  const visibleTab = tab === 'dev' && !devEnabled ? 'packs' : tab;
  const cardsState = usePackPartnerCards({
    enabled: isFocused && visibleTab === 'cards',
  });

  const closeModule = useCallback(() => navigation.goBack(), [navigation]);
  const title = {
    home: strings('collectibles.title'),
    packs: strings('collectibles.tabs.packs'),
    cards: strings('collectibles.tabs.cards'),
    market: strings('collectibles_discovery.market'),
    dev: strings('collectibles.tabs.dev'),
  }[visibleTab];

  const openReveal = useCallback(
    (memo: string, options?: { skipReveal?: boolean }) =>
      navigation.navigate(Routes.COLLECTIBLES.REVEAL, { memo, ...options }),
    [navigation],
  );
  const openCard = useCallback(
    (mint: string) => navigation.navigate(Routes.COLLECTIBLES.CARD, { mint }),
    [navigation],
  );
  const openSection = useCallback(
    (section: CollectiblesHomeTab, collection = '') =>
      navigation.dispatch(
        StackActions.push(Routes.COLLECTIBLES.HOME, {
          initialTab: section,
          category: collection,
        }),
      ),
    [navigation],
  );
  const showPacks = useCallback(
    (collection = '') => openSection('packs', collection),
    [openSection],
  );
  const openPack = useCallback(
    (pack: CollectiblesPack, heroSource?: PackHeroSource) => {
      navigation.navigate(Routes.COLLECTIBLES.PACK, {
        packCode: pack.code,
        ...(heroSource ? { heroSource } : {}),
      });
    },
    [navigation],
  );
  const buyPack = (pack: CollectiblesPack) =>
    account ? setPurchase({ pack, account }) : openPack(pack);
  const openExplore = useCallback(
    (screen: DiscoveryScreen, profileId?: string) => {
      navigation.navigate(Routes.COLLECTIBLES.EXPLORE, { screen, profileId });
    },
    [navigation],
  );
  const attentionOperation = attentionOperations[0];
  const notices = attentionOperation ? (
    <Box twClassName="px-4 pb-3">
      <AttentionBanner operation={attentionOperation} onView={openReveal} />
    </Box>
  ) : undefined;
  useEffect(() => {
    if (!entry || !isFocused) return;
    if (entry.kind === 'purchase') {
      const selectedPack = entryPacks.packs.find(
        (item) => item.code === entry.packCode,
      );
      if (!selectedPack || !account) return;
      navigation.setParams({ entry: undefined });
      setPurchase({ pack: selectedPack, account, returnToWallet: true });
    }
  }, [account, entry, entryPacks.packs, isFocused, navigation]);

  const header = (
    <Box
      pointerEvents="box-none"
      twClassName={
        visibleTab === 'home' ? 'absolute top-0 left-0 right-0 z-20' : ''
      }
    >
      {visibleTab === 'home' && (
        <Animated.View
          pointerEvents="none"
          testID="collectibles-popular-header-material"
          style={tw.style('absolute inset-0', {
            opacity: popularScroll.interpolate({
              inputRange: [0, 64],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            }),
          })}
        >
          <TabBarFloatingSurface
            isBlurAvailable={material.isBlurAvailable}
            colorScheme={material.colorScheme}
            twClassName="absolute inset-0"
            style={tw.style('border-0')}
          />
        </Animated.View>
      )}
      <HeaderStandard
        includesTopInset
        twClassName="bg-transparent"
        title={title}
        onBack={closeModule}
        backButtonProps={{
          accessibilityLabel: strings('navigation.back'),
          testID: CollectiblesHomeTestIds.BACK_BUTTON,
        }}
        endAccessory={
          <Box twClassName="flex-row items-center gap-1">
            {devEnabled && (
              <ButtonIcon
                iconName={IconName.Code}
                size={ButtonIconSize.Md}
                accessibilityLabel={strings('collectibles.tabs.dev')}
                onPress={() => openSection('dev')}
                testID={CollectiblesHomeTestIds.DEV_TAB}
              />
            )}
            {visibleTab === 'cards' && (
              <Box twClassName="flex-row rounded-full bg-muted">
                <ButtonIcon
                  iconName={IconName.Clock}
                  size={ButtonIconSize.Md}
                  accessibilityLabel={strings('collectibles_discovery.history')}
                  onPress={() => openExplore('history')}
                  testID="collectibles-history-entry"
                />
                <ButtonIcon
                  iconName={IconName.Book}
                  size={ButtonIconSize.Md}
                  accessibilityLabel={strings('collectibles_discovery.pokedex')}
                  onPress={() => openExplore('pokedex')}
                  testID="collectibles-pokedex-entry"
                />
              </Box>
            )}
          </Box>
        }
      />
    </Box>
  );

  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={tw.style('flex-1 bg-default')}
      testID={CollectiblesHomeTestIds.CONTAINER}
    >
      {visibleTab !== 'home' && header}
      <>
        {visibleTab !== 'home' && notices}
        <Box twClassName={visibleTab === 'home' ? 'flex-1' : 'flex-1 pt-3'}>
          {visibleTab === 'home' ? (
            <OverviewTab
              headerScrollY={popularScroll}
              topInset={headerHeight + 16}
              notices={notices}
              bottomInset={navigationInset}
              onOpenPack={openPack}
              onBuyPack={buyPack}
              onExplore={openExplore}
              onSection={openSection}
              isObscured={Boolean(purchase)}
            />
          ) : visibleTab === 'packs' ? (
            <PacksTab
              bottomInset={navigationInset}
              key={category}
              initialCollection={category}
              onOpenPack={openPack}
              onBuyPack={buyPack}
              onSearch={() =>
                navigation.navigate(Routes.COLLECTIBLES.SEARCH, {
                  scope: 'all',
                })
              }
            />
          ) : visibleTab === 'dev' ? (
            <Box
              twClassName="flex-1"
              style={{ paddingBottom: navigationInset }}
            >
              <DevTab />
            </Box>
          ) : visibleTab === 'market' ? (
            <MarketTab bottomInset={navigationInset} />
          ) : (
            <CardsTab
              bottomInset={navigationInset}
              isActive={isFocused && visibleTab === 'cards'}
              onSearch={() =>
                navigation.navigate(Routes.COLLECTIBLES.SEARCH, {
                  scope: 'cards',
                })
              }
              cardsState={cardsState}
              onCardPress={openCard}
              onOpenPack={showPacks}
              onExplore={openExplore}
            />
          )}
        </Box>
      </>
      {/* Blur is mounted after the scrolling content so the native material samples the list. */}
      {visibleTab === 'home' && header}
      {purchase && (
        <PackPurchaseSheet
          pack={purchase.pack}
          account={purchase.account}
          balance={balance.baseUnits}
          onClose={() => {
            setPurchase(undefined);
            if (purchase.returnToWallet) closeModule();
          }}
          onPurchased={openReveal}
        />
      )}
    </SafeAreaView>
  );
};

export default CollectiblesHome;
