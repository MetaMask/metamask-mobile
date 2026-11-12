import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { typography } from '@metamask/design-tokens';
import { Animated, FlatList, View, useWindowDimensions } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  type RouteProp,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  Button,
  ButtonBase,
  ButtonVariant,
  HeaderStandard,
  IconName,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import CollectiblesPackHero from './CollectiblesPackHero';
import { getPackDiscoveryGroup } from '../CollectiblesHome/CollectiblesHome.utils';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { CollectiblesPackDetailTestIds as IDs } from '../../Collectibles.testIds';
import type {
  CollectiblesPack as CollectiblesPackModel,
  CollectiblesWalletAccount,
  CollectiblesInventoryCard,
} from '../../types';
import type { CollectiblesStackParamList } from '../../types/navigation';
import { getCollectiblesPackArtwork } from '../../constants/packArtwork';
import { usePackPartnerPacks } from '../../providers/pack-partner/hooks/usePackPartnerPacks';
import { usePackPartnerAccount } from '../../providers/pack-partner/hooks/usePackPartnerAccount';
import { usePackPartnerOpenings } from '../../providers/pack-partner/hooks/usePackPartnerOpenings';
import { useUsdcBalance } from '../../providers/pack-partner/hooks/useUsdcBalance';
import { usePackHeroFlight } from '../../components/CollectiblesDiscovery/usePackHeroFlight';
import { useCollectiblesPresentation } from '../../hooks/useCollectiblesPresentation';
import { formatUsd } from '../../providers/pack-partner/utils/format';
import {
  PackJustOpened,
  PackRarityMetrics,
  PackDiscoveryContext,
  PackSocialFooter,
} from './CollectiblesPackSections';
import CollectiblesPublicCard from './CollectiblesPublicCard';
import PackPurchaseSheet from '../../components/PackPurchaseSheet';
import { OpeningsFooter } from './CollectiblesPackOpenings';
import {
  InventoryCardTile,
  InventoryFooter,
} from './CollectiblesPackInventory';
import { usePackPartnerInventory } from '../../providers/pack-partner/hooks/usePackPartnerInventory';
import CtaButton from '../../components/CtaButton';
import CollectiblesPackInformation, {
  type PackInformation,
} from './CollectiblesPackInformation';

/** Pack discovery uses the live catalogue; only confirmation authorizes purchase. */
const CollectiblesPack = () => {
  const tw = useTailwind();
  const scrollGesture = useMemo(() => Gesture.Native(), []);
  const navigation = useNavigation<AppNavigationProp>();
  const insets = useSafeAreaInsets();
  const { height, fontScale } = useWindowDimensions();
  const [footerLayout, setFooterLayout] = useState<{
    height: number;
    expandedHeight: number;
  }>();
  const list = useRef<FlatList<CollectiblesInventoryCard>>(null);
  const [showMore, setShowMore] = useState(true);
  const headerHeight = insets.top + 56;
  const footerHeight = footerLayout?.height ?? 116 + insets.bottom;
  // The expanded footer defines the hero viewport. Hiding See more while
  // scrolling must not resize the artwork or move its animation destination.
  const heroHeight = Math.max(
    420,
    height - headerHeight - (footerLayout?.expandedHeight ?? footerHeight),
  );
  const { params } =
    useRoute<RouteProp<CollectiblesStackParamList, 'CollectiblesPack'>>();
  const { packs, isLoading, error, refetch } = usePackPartnerPacks();
  const account = usePackPartnerAccount();
  const balance = useUsdcBalance();
  const isFocused = useIsFocused();
  const [confirmationAccount, setConfirmationAccount] =
    useState<CollectiblesWalletAccount>();
  if (
    confirmationAccount &&
    (confirmationAccount.id !== account?.id ||
      confirmationAccount.address !== account?.address)
  ) {
    setConfirmationAccount(undefined);
  }
  const [selectedCard, setSelectedCard] = useState<CollectiblesInventoryCard>();
  const { online, animate, previewCount } = useCollectiblesPresentation();
  const [information, setInformation] = useState<PackInformation>();
  const pack = packs.find((item) => item.code === params.packCode);
  const openReveal = useCallback(
    (memo: string, options?: { skipReveal?: boolean }) => {
      setConfirmationAccount(undefined);
      navigation.navigate(Routes.COLLECTIBLES.REVEAL, {
        memo,
        skipReveal: options?.skipReveal,
      });
    },
    [navigation],
  );
  const artwork = getCollectiblesPackArtwork(`pack_partner:${params.packCode}`);
  const name = artwork.name ?? pack?.name ?? strings('collectibles.title');
  const hero = usePackHeroFlight({
    source: params.heroSource,
    packCode: params.packCode,
    artwork,
    name,
    enabled: animate,
    layoutReady: Boolean(footerLayout),
    onClose: () => navigation.goBack(),
  });
  const inventory = usePackPartnerInventory(
    params.packCode,
    Boolean(pack) && isFocused && online,
  );
  const loadMoreInventory = () => {
    if (inventory.hasNextPage && !inventory.isFetching && !inventory.isError) {
      inventory.fetchNextPage().catch(() => undefined);
    }
  };
  const openings = usePackPartnerOpenings(
    { packType: params.packCode },
    {
      enabled:
        Boolean(pack) &&
        isFocused &&
        online &&
        !selectedCard &&
        !confirmationAccount &&
        !information,
    },
  );
  const categoryPacks = useMemo(
    () =>
      pack
        ? packs
            .filter(
              (item) =>
                getPackDiscoveryGroup(item) === getPackDiscoveryGroup(pack),
            )
            .sort((a, b) => a.price - b.price)
        : [],
    [packs, pack],
  );
  const switchPack = useCallback(
    (next: CollectiblesPackModel) => {
      navigation.setParams({ packCode: next.code, heroSource: undefined });
    },
    [navigation],
  );

  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={tw.style('flex-1 bg-default')}
      testID={IDs.CONTAINER}
    >
      <View
        ref={hero.frameRef}
        onLayout={hero.onFrameLayout}
        collapsable={false}
        style={tw.style('flex-1')}
      >
        <Animated.View
          style={tw.style('flex-1', { opacity: hero.contentOpacity })}
        >
          <Box twClassName="absolute top-0 left-0 right-0 z-20">
            <HeaderStandard
              includesTopInset
              onBack={hero.close}
              backButtonProps={{
                accessibilityLabel: strings('navigation.back'),
              }}
              twClassName="bg-transparent"
            />
          </Box>
          {isLoading ? (
            <Box
              twClassName="flex-1"
              style={{ paddingTop: headerHeight }}
              testID={IDs.LOADING}
            >
              <Box
                style={{ height: heroHeight }}
                paddingHorizontal={5}
                paddingBottom={5}
                gap={2}
              >
                <Box twClassName="flex-1 items-center py-6">
                  <Skeleton
                    height="100%"
                    width="55%"
                    twClassName="rounded-xl"
                  />
                </Box>
                <Box twClassName="items-center" gap={2}>
                  <Skeleton
                    height={typography.sBodyXS.lineHeight * fontScale}
                    width="40%"
                  />
                  <Skeleton
                    height={typography.sHeadingLG.lineHeight * fontScale}
                    width="75%"
                  />
                </Box>
                <Box twClassName="flex-row py-3 gap-4">
                  {[0, 1, 2].map((index) => (
                    <Box key={index} twClassName="flex-1 items-center" gap={1}>
                      <Skeleton
                        height={typography.sBodyMD.lineHeight * fontScale}
                        width="60%"
                      />
                      <Skeleton
                        height={typography.sBodySM.lineHeight * fontScale}
                        width="100%"
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box
                twClassName="absolute bottom-0 left-0 right-0 px-4 pt-3"
                style={{ height: footerHeight }}
              >
                <Skeleton height={48} width="100%" twClassName="rounded-full" />
              </Box>
            </Box>
          ) : !pack ? (
            <Box padding={4} style={{ paddingTop: headerHeight }}>
              <BannerAlert
                severity={BannerAlertSeverity.Warning}
                description={
                  error
                    ? strings('collectibles.packs.error')
                    : strings('collectibles.errors.machine_unavailable')
                }
                actionButtonLabel={strings('collectibles.errors.retry')}
                actionButtonOnPress={refetch}
              />
            </Box>
          ) : (
            <>
              <GestureDetector gesture={scrollGesture}>
                <FlatList
                  ref={list}
                  data={inventory.cards}
                  keyExtractor={(item) => item.mint}
                  renderItem={({ item }) => (
                    <InventoryCardTile card={item} onSelect={setSelectedCard} />
                  )}
                  numColumns={2}
                  initialNumToRender={previewCount}
                  maxToRenderPerBatch={previewCount}
                  windowSize={5}
                  columnWrapperStyle={tw.style('px-3.5')}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingTop: headerHeight,
                    paddingBottom: footerHeight + 16,
                  }}
                  onScroll={(event) => {
                    hero.onScroll(event);
                    if (showMore && event.nativeEvent.contentOffset.y > 16)
                      setShowMore(false);
                  }}
                  scrollEventThrottle={16}
                  onEndReached={loadMoreInventory}
                  onEndReachedThreshold={0.4}
                  refreshing={inventory.isRefetching}
                  onRefresh={() => {
                    inventory.refetch().catch(() => undefined);
                    openings.refresh();
                  }}
                  testID="collectibles-pack-inventory-list"
                  ListHeaderComponent={
                    <>
                      <CollectiblesPackHero
                        scrollGesture={scrollGesture}
                        pack={pack}
                        packs={categoryPacks}
                        height={heroHeight}
                        active={
                          isFocused &&
                          !confirmationAccount &&
                          !selectedCard &&
                          !information
                        }
                        animate={animate}
                        hidden={!footerLayout || hero.hidden}
                        layoutReady={Boolean(footerLayout)}
                        onSelect={switchPack}
                        destinationRef={hero.destinationRef}
                        onMeasure={hero.measure}
                      />
                      <PackJustOpened
                        cards={openings.data ?? []}
                        onPause={openings.pause}
                        onResume={openings.resume}
                        onSelect={setSelectedCard}
                        emptyContent={
                          <OpeningsFooter
                            loading={openings.isPending}
                            failed={openings.isError}
                            empty={!openings.data?.length}
                            onRetry={openings.refresh}
                          />
                        }
                      />
                      {Boolean(openings.data?.length) && openings.isError && (
                        <OpeningsFooter
                          loading={false}
                          failed
                          empty={false}
                          onRetry={openings.refresh}
                        />
                      )}
                      <PackDiscoveryContext packCode={pack.code} />
                      <PackRarityMetrics pack={pack} />
                      <ButtonBase
                        onPress={() => setInformation('odds')}
                        testID={IDs.VIEW_ODDS}
                        twClassName="bg-transparent self-start mx-5"
                        textProps={{ variant: TextVariant.BodySm }}
                      >
                        {strings('collectibles.pack_detail.view_odds')}
                      </ButtonBase>
                      <Box padding={5} gap={3}>
                        <Text variant={TextVariant.HeadingMd}>
                          {strings('collectibles.pack_detail.in_this_pack')}
                        </Text>
                      </Box>
                    </>
                  }
                  ListFooterComponent={
                    <InventoryFooter
                      loading={
                        inventory.isPending || inventory.isFetchingNextPage
                      }
                      failed={inventory.isError}
                      empty={inventory.cards.length === 0}
                      hasMore={inventory.hasNextPage}
                      onLoad={() => {
                        if (inventory.isFetching) return;
                        if (
                          inventory.isFetchNextPageError ||
                          (!inventory.isError && inventory.hasNextPage)
                        ) {
                          inventory.fetchNextPage().catch(() => undefined);
                        } else {
                          inventory.refetch().catch(() => undefined);
                        }
                      }}
                    />
                  }
                />
              </GestureDetector>
              <SafeAreaView
                edges={{ bottom: 'maximum' }}
                onLayout={(event) => {
                  const nextHeight = event.nativeEvent.layout.height;
                  setFooterLayout((previous) => ({
                    height: nextHeight,
                    expandedHeight: showMore
                      ? nextHeight
                      : (previous?.expandedHeight ?? nextHeight),
                  }));
                }}
                testID={IDs.FOOTER}
                style={tw.style(
                  'absolute bottom-0 left-0 right-0 border-t border-muted bg-default px-4 pt-2 pb-4 gap-2',
                )}
              >
                <PackSocialFooter
                  packCode={pack.code}
                  onProfile={(profileId) =>
                    navigation.navigate(Routes.COLLECTIBLES.EXPLORE, {
                      screen: 'profile',
                      profileId,
                    })
                  }
                />
                {!account && (
                  <Text color={TextColor.TextAlternative}>
                    {strings('collectibles.no_solana_account')}
                  </Text>
                )}
                <CtaButton
                  label={strings('collectibles_discovery.open_for', {
                    amount: formatUsd(pack.price),
                  })}
                  onPress={() => setConfirmationAccount(account)}
                  isDisabled={!account}
                  testID={IDs.BUY}
                />
                {showMore && (
                  <Button
                    variant={ButtonVariant.Tertiary}
                    isFullWidth
                    endIconName={IconName.ArrowDown}
                    onPress={() => {
                      setShowMore(false);
                      list.current?.scrollToOffset({
                        offset: heroHeight,
                        animated: animate,
                      });
                    }}
                    testID="collectibles-pack-see-more"
                  >
                    {strings('collectibles_discovery.see_more')}
                  </Button>
                )}
              </SafeAreaView>
            </>
          )}
          {selectedCard && (
            <CollectiblesPublicCard
              card={selectedCard}
              sourcePackName={name}
              onClose={() => setSelectedCard(undefined)}
              onBuyPack={
                account
                  ? () => {
                      setSelectedCard(undefined);
                      setConfirmationAccount(account);
                    }
                  : undefined
              }
            />
          )}
          {information && pack && (
            <CollectiblesPackInformation
              kind={information}
              pack={pack}
              onClose={() => setInformation(undefined)}
            />
          )}
          {confirmationAccount && pack && account && (
            <PackPurchaseSheet
              key={`${account.id}:${account.address}`}
              pack={pack}
              account={account}
              balance={balance.baseUnits}
              onClose={() => setConfirmationAccount(undefined)}
              onPurchased={openReveal}
            />
          )}
        </Animated.View>
        {hero.overlay}
      </View>
    </SafeAreaView>
  );
};
export default CollectiblesPack;
