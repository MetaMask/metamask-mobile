import React, { useMemo, useRef, useState } from 'react';
import {
  useIsFocused,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonVariant,
  FilterButton,
  FilterButtonGroup,
  FilterButtonSize,
  HeaderStandard,
  Text,
  TextColor,
  TextFieldSearch,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type {
  CollectiblesSearchScope,
  CollectiblesStackParamList,
} from '../../types/navigation';
import PackCard from '../../components/PackCard';
import PackCardSkeleton from '../../components/PackCard/PackCardSkeleton';
import { CollectiblesPacksTestIds } from '../../Collectibles.testIds';
import PackPurchaseSheet from '../../components/PackPurchaseSheet';
import { DiscoveryCard } from '../../components/CollectiblesDiscovery/DiscoveryCard';
import { DiscoveryCardDetail } from '../CollectiblesCard/DiscoveryCardDetail';
import { usePackPartnerPacks } from '../../providers/pack-partner/hooks/usePackPartnerPacks';
import { usePackPartnerCards } from '../../providers/pack-partner/hooks/usePackPartnerCards';
import { useUsdcBalance } from '../../providers/pack-partner/hooks/useUsdcBalance';
import type {
  CollectiblesPack,
  CollectiblesInventoryCard,
  CollectiblesWalletAccount,
} from '../../types';
import { useCollectiblesPresentation } from '../../hooks/useCollectiblesPresentation';
import { usePackInsights } from '../../hooks/useCollectiblesDiscovery';
import { filterPacks } from '../CollectiblesHome/discoveryFilters';
import {
  pairItems,
  searchCards,
  type SearchCard,
} from './CollectiblesSearch.utils';
import { useKnownPublicCards } from './useKnownPublicCards';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type SearchRow =
  | { kind: 'heading'; id: string; label: string; count: number }
  | { kind: 'packs'; id: string; items: CollectiblesPack[] }
  | { kind: 'cards'; id: string; items: SearchCard[] };

/** Replit's unified local search. Queries use known metadata; typing never sends search requests. */
export default function CollectiblesSearch() {
  const tw = useTailwind();
  const { bottom } = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<CollectiblesStackParamList>>();
  const { params } =
    useRoute<RouteProp<CollectiblesStackParamList, 'CollectiblesSearch'>>();
  const focused = useIsFocused();
  const presentation = useCollectiblesPresentation();
  const listRef = useRef<FlashListRef<SearchRow>>(null);
  const [query, setQuery] = useState(params?.query ?? '');
  const [scope, setScope] = useState<CollectiblesSearchScope>(
    params?.scope ?? 'all',
  );
  const [selectedCard, setSelectedCard] = useState<CollectiblesInventoryCard>();
  const [purchase, setPurchase] = useState<{
    pack: CollectiblesPack;
    account: CollectiblesWalletAccount;
  }>();
  const { packs, isLoading } = usePackPartnerPacks({ enabled: focused });
  const insights = usePackInsights(
    packs.map((pack) => `pack_partner:${pack.code}`),
  );
  const { cards, account } = usePackPartnerCards({ enabled: focused });
  if (
    purchase &&
    (purchase.account.id !== account?.id ||
      purchase.account.address !== account?.address)
  ) {
    setPurchase(undefined);
  }
  const balance = useUsdcBalance();
  const visiblePacks = useMemo(
    () =>
      filterPacks(packs, {
        category: '',
        query,
        sort: 'priceAsc',
        range: 'all',
      }),
    [packs, query],
  );
  const knownPublicCards = useKnownPublicCards();
  const visibleCards = searchCards(cards, knownPublicCards, query);
  const rows: SearchRow[] = [];
  if (scope !== 'cards' && visiblePacks.length) {
    rows.push({
      kind: 'heading',
      id: 'packs',
      label: strings('collectibles.tabs.packs'),
      count: visiblePacks.length,
    });
    pairItems(visiblePacks).forEach((items) =>
      rows.push({ kind: 'packs', id: `packs-${items[0].code}`, items }),
    );
  }
  if (scope !== 'packs' && visibleCards.length) {
    rows.push({
      kind: 'heading',
      id: 'cards',
      label: strings('collectibles_discovery.search_cards_tab'),
      count: visibleCards.length,
    });
    pairItems(visibleCards).forEach((items) =>
      rows.push({ kind: 'cards', id: `cards-${items[0].card.mint}`, items }),
    );
  }
  const openPack = (pack: CollectiblesPack) =>
    navigation.navigate(Routes.COLLECTIBLES.PACK, { packCode: pack.code });
  const updateQuery = (value: string) => {
    setQuery(value);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };
  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={tw.style('flex-1 bg-default')}
      testID="collectibles-search"
    >
      <HeaderStandard
        includesTopInset
        title={strings('collectibles_discovery.search')}
        onBack={() => navigation.goBack()}
      />
      <Box paddingHorizontal={4} gap={3} paddingBottom={3}>
        <TextFieldSearch
          value={query}
          onChangeText={updateQuery}
          onPressClearButton={() => updateQuery('')}
          autoFocus
          placeholder={strings('collectibles_discovery.search_packs_cards')}
          inputAccessibilityLabel={strings(
            'collectibles_discovery.search_packs_cards',
          )}
          testID="collectibles-search-input"
          inputProps={{ testID: 'collectibles-search-input' }}
        />
        <FilterButtonGroup
          value={scope}
          onChange={(value) => {
            if (value === 'all' || value === 'packs' || value === 'cards')
              setScope(value);
            listRef.current?.scrollToOffset({ offset: 0, animated: false });
          }}
        >
          {(['all', 'packs', 'cards'] as const).map((value) => (
            <FilterButton
              key={value}
              value={value}
              size={FilterButtonSize.Sm}
              testID={`collectibles-search-scope-${value}`}
            >
              {strings(
                value === 'all'
                  ? 'collectibles_discovery.search_all'
                  : value === 'packs'
                    ? 'collectibles.tabs.packs'
                    : 'collectibles_discovery.search_cards_tab',
              )}
            </FilterButton>
          ))}
        </FilterButtonGroup>
      </Box>
      <FlashList<SearchRow>
        ref={listRef}
        data={rows}
        keyExtractor={(row) => row.id}
        getItemType={(row) => row.kind}
        drawDistance={presentation.drawDistance}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={tw.style('px-4', {
          paddingBottom: Math.max(16, bottom),
        })}
        ListEmptyComponent={
          isLoading && scope !== 'cards' ? (
            <Box
              twClassName="flex-row gap-3"
              testID={CollectiblesPacksTestIds.SKELETON}
            >
              {[0, 1].map((index) => (
                <Box key={index} twClassName="flex-1">
                  <PackCardSkeleton withPurchase />
                </Box>
              ))}
            </Box>
          ) : (
            <Box gap={3} paddingVertical={8}>
              <Text variant={TextVariant.HeadingSm} twClassName="text-center">
                {query
                  ? strings('collectibles_discovery.search_no_results', {
                      query,
                    })
                  : strings('collectibles_discovery.no_results')}
              </Text>
              <Text color={TextColor.TextAlternative} twClassName="text-center">
                {strings('collectibles_discovery.search_try_again')}
              </Text>
              {query && (
                <Button
                  variant={ButtonVariant.Secondary}
                  onPress={() => updateQuery('')}
                >
                  {strings('collectibles_discovery.clear_search')}
                </Button>
              )}
            </Box>
          )
        }
        renderItem={({ item }) =>
          item.kind === 'heading' ? (
            <Text variant={TextVariant.HeadingSm} twClassName="pt-3 pb-4">
              {item.label} ({item.count})
            </Text>
          ) : (
            <Box twClassName="flex-row gap-3 pb-4">
              {item.kind === 'packs'
                ? item.items.map((pack) => (
                    <Box key={pack.code} twClassName="flex-1">
                      <PackCard
                        pack={pack}
                        variant="compact"
                        onOpen={openPack}
                        openedLast7d={
                          insights.data?.[`pack_partner:${pack.code}`]
                            ?.openedLast7d
                        }
                        onBuy={(selected) =>
                          account
                            ? setPurchase({ pack: selected, account })
                            : openPack(selected)
                        }
                      />
                    </Box>
                  ))
                : item.items.map(({ card, owned }) => (
                    <Box key={card.mint} twClassName="flex-1">
                      <DiscoveryCard
                        card={card}
                        reserveCaption
                        caption={
                          owned
                            ? strings('collectibles_discovery.owned')
                            : undefined
                        }
                        onPress={() =>
                          owned
                            ? navigation.navigate(Routes.COLLECTIBLES.CARD, {
                                mint: card.mint,
                              })
                            : setSelectedCard(card)
                        }
                      />
                    </Box>
                  ))}
              {item.items.length === 1 && <Box twClassName="flex-1" />}
            </Box>
          )
        }
      />
      {selectedCard && (
        <DiscoveryCardDetail
          card={selectedCard}
          onClose={() => setSelectedCard(undefined)}
        />
      )}
      {purchase && (
        <PackPurchaseSheet
          pack={purchase.pack}
          account={purchase.account}
          balance={balance.baseUnits}
          onClose={() => setPurchase(undefined)}
          onPurchased={(memo, options) => {
            setPurchase(undefined);
            navigation.navigate(Routes.COLLECTIBLES.REVEAL, {
              memo,
              ...options,
            });
          }}
        />
      )}
    </SafeAreaView>
  );
}
