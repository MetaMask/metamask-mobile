import React, { useEffect, useReducer, useRef } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  SectionHeader,
  Text,
  TextButton,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import { useBoolean } from '../../../hooks/useBoolean';
import { useFormatters } from '../../../hooks/useFormatters';
import { View } from '../../primitives/View';
import { collectiblesTestIds } from '../Collectibles.testIds';
import type { BuySheetParams } from '../routeNames';
import type { PackPartnerCard } from '../providers/pack-partner/types/packPartner';
import { usePackDetail } from '../hooks/usePackDetail';
import { usePackCards } from '../hooks/usePackCards';
import { CardListItem, CardListItemSkeleton } from '../components/CardListItem';
import { JustOpenedSection } from '../components/JustOpenedSection';
import { PackDetailHeader } from '../components/PackDetailHeader';
import { PackDetailSkeleton } from '../components/PackDetailSkeleton';
import { RarityRow } from '../components/RarityRow';
import { SectionMessage } from '../components/SectionMessage';

const seeMoreDelayMs = 4000;
const skeletonKeys = ['s1', 's2'];

const keyExtractor = (card: PackPartnerCard) => card.mint;
const renderItem = ({ item }: { item: PackPartnerCard }) => (
  <View className="flex-1 px-2 pb-6">
    <CardListItem card={item} />
  </View>
);

interface Props {
  packCode: string;
  onOpenPack: (params: BuySheetParams) => void;
}

export function PackDetailView({ packCode, onOpenPack }: Props) {
  const tw = useTailwind();

  const listRef = useRef<FlashListRef<PackPartnerCard>>(null);
  const scrollOffset = useRef(0);
  const sectionOffsets = useRef<Record<string, number>>({});

  const { formatCurrency, formatNumber } = useFormatters();

  const packQuery = usePackDetail(packCode);

  const cardsQuery = usePackCards(packCode);

  const { value: isSeeMoreVisible, setValue: setSeeMoreVisible } = useBoolean();

  const [idleKey, restartIdle] = useReducer((key: number) => key + 1, 0);

  useEffect(() => {
    const timer = setTimeout(() => setSeeMoreVisible(true), seeMoreDelayMs);
    return () => clearTimeout(timer);
  }, [idleKey, setSeeMoreVisible]);

  const pack = packQuery.data;
  const cards = cardsQuery.data?.pages.flatMap((page) => page.cards) ?? [];
  const priceUsd = pack?.isAvailable ? pack.priceUsd : undefined;

  const trackSection = (name: string) => (event: LayoutChangeEvent) => {
    sectionOffsets.current[name] = event.nativeEvent.layout.y;
  };

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollOffset.current = event.nativeEvent.contentOffset.y;
  }

  function handleScrollStart() {
    setSeeMoreVisible(false);
    restartIdle();
  }

  function scrollToNextSection() {
    const nextOffset = Object.values(sectionOffsets.current)
      .sort((a, b) => a - b)
      .find((offset) => offset > scrollOffset.current + 1);

    handleScrollStart();

    if (nextOffset !== undefined) {
      listRef.current?.scrollToOffset({ offset: nextOffset, animated: true });
    }
  }

  function openPack() {
    if (pack && priceUsd !== undefined) {
      onOpenPack({ packCode: pack.code, name: pack.name, priceUsd });
    }
  }

  function loadMoreCards() {
    if (
      cardsQuery.hasNextPage &&
      !cardsQuery.isFetching &&
      !cardsQuery.isError
    ) {
      void cardsQuery.fetchNextPage();
    }
  }

  function retryCards() {
    if (cardsQuery.isFetchNextPageError) {
      void cardsQuery.fetchNextPage();
    } else {
      void cardsQuery.refetch();
    }
  }

  function retryPack() {
    void packQuery.refetch();
  }

  const header = pack ? (
    <View className="gap-6 pb-2">
      <PackDetailHeader pack={pack} />
      <View onLayout={trackSection('justOpened')}>
        <JustOpenedSection packCode={packCode} />
      </View>
      <View onLayout={trackSection('sinceEpic')}>
        <SectionHeader
          title={strings('collectibles.pack_detail.since_last_epic')}
          className="px-2"
        />
        {pack.pulledSinceEpic.map(({ rarity, count }) => (
          <RarityRow
            key={rarity}
            rarity={rarity}
            label={strings(`collectibles.rarity.${rarity}`)}
            value={formatNumber(count)}
          />
        ))}
      </View>
      <View onLayout={trackSection('odds')}>
        <SectionHeader
          title={strings('collectibles.pack_detail.odds_by_rarity')}
          className="px-2"
        />
        {pack.odds.map((odds) => (
          <RarityRow
            key={odds.rarity}
            rarity={odds.rarity}
            label={strings('collectibles.pack_detail.rarity_odds', {
              rarity: strings(`collectibles.rarity.${odds.rarity}`),
              odds: formatNumber(odds.oddsPercent / 100, {
                style: 'percent',
                maximumFractionDigits: 2,
              }),
            })}
            value={
              odds.maxValueUsd === undefined
                ? strings('collectibles.pack_detail.value_from', {
                    min: formatCurrency(odds.minValueUsd, 'USD'),
                  })
                : strings('collectibles.pack_detail.value_range', {
                    min: formatCurrency(odds.minValueUsd, 'USD'),
                    max: formatCurrency(odds.maxValueUsd, 'USD'),
                  })
            }
          />
        ))}
      </View>
      <View onLayout={trackSection('inThisPack')}>
        <SectionHeader
          title={strings('collectibles.pack_detail.in_this_pack')}
          className="px-2"
        />
      </View>
    </View>
  ) : null;

  const footer =
    cardsQuery.isPending || cardsQuery.isFetchingNextPage ? (
      <View className="flex-row">
        {skeletonKeys.map((key) => (
          <CardListItemSkeleton key={key} className="flex-1 px-2 pb-6" />
        ))}
      </View>
    ) : cardsQuery.isError || !cards.length ? (
      <SectionMessage
        message={strings(
          cardsQuery.isError
            ? 'collectibles.pack_detail.cards_error'
            : 'collectibles.pack_detail.no_cards',
        )}
        onRetry={cardsQuery.isError ? retryCards : undefined}
      />
    ) : null;

  return (
    <View className="flex-1" testID={collectiblesTestIds.packDetailView}>
      {pack ? (
        <FlashList
          ref={listRef}
          data={cards}
          numColumns={2}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          onEndReached={loadMoreCards}
          onScroll={handleScroll}
          onScrollBeginDrag={handleScrollStart}
          onScrollEndDrag={restartIdle}
          onMomentumScrollEnd={restartIdle}
          scrollEventThrottle={16}
          contentContainerStyle={tw.style('px-2 pb-6')}
          testID={collectiblesTestIds.packDetailList}
        />
      ) : packQuery.isPending ? (
        <PackDetailSkeleton />
      ) : (
        <SectionMessage
          message={strings('collectibles.pack_detail.error')}
          className="flex-1 justify-center"
          onRetry={retryPack}
        />
      )}
      <SafeAreaView edges={['bottom']}>
        <View className="gap-2 border-t border-muted px-4 pt-4">
          {pack && !pack.isAvailable ? (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              className="text-center"
              testID={collectiblesTestIds.packDetailUnavailable}
            >
              {strings('collectibles.pack_detail.unavailable')}
            </Text>
          ) : null}
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={priceUsd === undefined}
            onPress={openPack}
            testID={collectiblesTestIds.packDetailOpen}
          >
            {priceUsd === undefined
              ? strings('collectibles.pack_detail.open')
              : strings('collectibles.packs.open_price', {
                  price: formatCurrency(priceUsd, 'USD'),
                })}
          </Button>
          <View className="h-6 items-center justify-center">
            {pack && isSeeMoreVisible ? (
              <TextButton
                variant={TextVariant.BodySm}
                onPress={scrollToNextSection}
                testID={collectiblesTestIds.packDetailSeeMore}
              >
                {strings('collectibles.pack_detail.see_more')}
              </TextButton>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
