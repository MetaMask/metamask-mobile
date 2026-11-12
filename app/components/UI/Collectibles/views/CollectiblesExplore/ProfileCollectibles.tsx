import React, { useState } from 'react';
import { FlashList } from '@shopify/flash-list';
import {
  Box,
  Button,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppStackNavigationProp } from '../../../../../core/NavigationService/types';
import {
  useProfileCollectibles,
  useProfileFavoritePacks,
} from '../../hooks/useCollectiblesSocial';
import { useCollectiblesPresentation } from '../../hooks/useCollectiblesPresentation';
import { usePackPartnerAccount } from '../../providers/pack-partner/hooks/usePackPartnerAccount';
import { usePackPartnerPacks } from '../../providers/pack-partner/hooks/usePackPartnerPacks';
import { useUsdcBalance } from '../../providers/pack-partner/hooks/useUsdcBalance';
import type { CollectiblesPack, CollectiblesWalletAccount } from '../../types';
import type { IndexedPack } from '../../services/clients/CollectiblesApiClient';
import { DiscoveryCard } from '../../components/CollectiblesDiscovery/DiscoveryCard';
import { DiscoveryCardDetail } from '../CollectiblesCard/DiscoveryCardDetail';
import { indexedCardPreview } from '../../components/CollectiblesDiscovery/IndexedCard';
import { saleReceiptUsd } from '../../components/CollectiblesDiscovery/saleReceipt';
import PackList from '../../components/PackList/PackList';
import PackPurchaseSheet from '../../components/PackPurchaseSheet';
import { ExploreState } from './ExploreState';

/** Profile openings come from every linked recipient wallet, including sold cards. */
export default function ProfileCollectibles({
  profileId,
  header,
  isOwnProfile = false,
}: {
  profileId: string;
  header: React.ReactElement;
  isOwnProfile?: boolean;
}) {
  const tw = useTailwind();
  const navigation = useNavigation<AppStackNavigationProp>();
  const activity = useProfileCollectibles(profileId);
  const favorites = useProfileFavoritePacks(profileId);
  const {
    packs,
    isLoading: packsLoading,
    error: packsError,
    refetch: refetchPacks,
  } = usePackPartnerPacks();
  const account = usePackPartnerAccount();
  const balance = useUsdcBalance();
  const presentation = useCollectiblesPresentation();
  const [selected, setSelected] = useState<IndexedPack>();
  const [purchase, setPurchase] = useState<{
    pack: CollectiblesPack;
    account: CollectiblesWalletAccount;
  }>();
  if (
    purchase &&
    (purchase.account.id !== account?.id ||
      purchase.account.address !== account?.address)
  ) {
    setPurchase(undefined);
  }
  const openPack = (pack: CollectiblesPack) =>
    navigation.navigate(Routes.COLLECTIBLES.PACK, { packCode: pack.code });
  const buyPack = (pack: CollectiblesPack) =>
    account ? setPurchase({ pack, account }) : openPack(pack);
  const records =
    activity.data?.pages
      .flatMap((page) => page.items)
      .filter((item) => item.card) ?? [];
  return (
    <>
      <FlashList
        data={records}
        numColumns={2}
        keyExtractor={(record) => record.packId}
        drawDistance={presentation.drawDistance}
        contentContainerStyle={tw.style('pb-6')}
        testID="collectibles-profile-cards"
        onEndReached={() => {
          if (activity.hasNextPage && !activity.isFetchingNextPage)
            return activity.fetchNextPage();
        }}
        ListHeaderComponent={
          <>
            {header}
            {(favorites.isPending || !!favorites.data?.length) && (
              <Box paddingVertical={4} gap={3}>
                <Text variant={TextVariant.HeadingMd} twClassName="px-4">
                  {strings('collectibles.profile.favorite_packs')}
                </Text>
                <PackList
                  packs={(favorites.data ?? []).flatMap((favorite) => {
                    const pack = packs.find(
                      (item) =>
                        `pack_partner:${item.code}` === favorite.packType,
                    );
                    return pack ? [pack] : [];
                  })}
                  isLoading={packsLoading || favorites.isPending}
                  error={Boolean(packsError)}
                  onRetry={refetchPacks}
                  tileWidth={176}
                  onOpen={openPack}
                  onBuy={buyPack}
                  renderFooter={(pack) => (
                    <Text
                      variant={TextVariant.BodyXs}
                      color={TextColor.TextAlternative}
                      numberOfLines={1}
                    >
                      {strings('collectibles.profile.opened_times', {
                        count:
                          favorites.data?.find(
                            (favorite) =>
                              favorite.packType === `pack_partner:${pack.code}`,
                          )?.openedCount ?? 0,
                      })}
                    </Text>
                  )}
                />
              </Box>
            )}
            {records.length > 0 && (
              <Box padding={4} gap={1}>
                <Text variant={TextVariant.HeadingMd}>
                  {strings('collectibles.profile.pulled_cards')}
                </Text>
                <Text
                  variant={TextVariant.BodyXs}
                  color={TextColor.TextAlternative}
                >
                  {strings('collectibles.profile.pulled_description')}
                </Text>
              </Box>
            )}
          </>
        }
        ListEmptyComponent={
          activity.isLoading || activity.isError ? (
            <ExploreState
              loading={activity.isLoading}
              error={activity.isError}
              onRetry={() => activity.refetch()}
              empty="no_history"
            />
          ) : (
            <Box padding={4} gap={4} testID="collectibles-profile-empty">
              <Text variant={TextVariant.HeadingMd} twClassName="text-center">
                {strings(
                  isOwnProfile
                    ? 'collectibles.profile.empty_title'
                    : 'collectibles.profile.empty_public_title',
                )}
              </Text>
              <Text color={TextColor.TextAlternative} twClassName="text-center">
                {strings(
                  isOwnProfile
                    ? 'collectibles.profile.empty_description'
                    : 'collectibles.profile.empty_public_description',
                )}
              </Text>
              <Button
                variant={ButtonVariant.Secondary}
                onPress={() =>
                  navigation.navigate(Routes.COLLECTIBLES.HOME, {
                    initialTab: 'packs',
                  })
                }
              >
                {strings('collectibles_discovery.browse_packs')}
              </Button>
              <PackList
                packs={packs.slice(0, 5)}
                isLoading={packsLoading}
                error={Boolean(packsError)}
                onRetry={refetchPacks}
                tileWidth={176}
                horizontalInset={0}
                onOpen={openPack}
                onBuy={buyPack}
              />
            </Box>
          )
        }
        renderItem={({ item }) =>
          item.card ? (
            <Box twClassName="w-full px-2 pb-4">
              <DiscoveryCard
                card={indexedCardPreview(item.card)}
                reserveCaption
                onPress={() => setSelected(item)}
                soldLabel={
                  item.status === 'bought_back'
                    ? strings('collectibles.batch.sold')
                    : undefined
                }
                displayValue={
                  item.status === 'bought_back'
                    ? saleReceiptUsd(item)
                    : undefined
                }
                caption={item.packName}
              />
            </Box>
          ) : null
        }
      />
      {selected?.card && (
        <DiscoveryCardDetail
          card={indexedCardPreview(selected.card)}
          onClose={() => setSelected(undefined)}
          sourcePackType={selected.packType}
          sourcePackName={selected.packName}
          saleReceipt={
            selected.status === 'bought_back'
              ? { amountUsd: saleReceiptUsd(selected) }
              : undefined
          }
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
              skipReveal: options?.skipReveal,
            });
          }}
        />
      )}
    </>
  );
}
