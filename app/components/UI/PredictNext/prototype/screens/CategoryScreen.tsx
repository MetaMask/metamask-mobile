import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  CATEGORY_ICONS,
  categoryGroups,
  leagueIcon,
  type ProtoEvent,
} from '../fixtures';
import { Chip, GlassHeader, MarginFades } from '../components';
import { CryptoMarketCard, GameMarketCard } from '../cards';
import { FeedStandardCard } from '../feedCards';
import { FeedScrollProvider, useFeedScroll } from '../feedScroll';
import {
  useOpenEvent,
  useProtoNavigation,
  type ProtoRoutes,
  type ProtoStackParamList,
} from '../navigation';
import { usePrototypeState } from '../PrototypeState';

const ALL = 'All';

const EventCard = ({ event }: { event: ProtoEvent }) => {
  const openEvent = useOpenEvent();
  const { openOrder } = usePrototypeState();
  const props = { onPress: () => openEvent(event), onOrder: openOrder };
  if (event.kind === 'game') return <GameMarketCard event={event} {...props} />;
  if (event.kind === 'crypto') {
    return <CryptoMarketCard event={event} {...props} />;
  }
  return <FeedStandardCard event={event} {...props} />;
};

const CategoryContent = () => {
  const tw = useTailwind();
  const navigation = useProtoNavigation();
  const { category } =
    useRoute<RouteProp<ProtoStackParamList, typeof ProtoRoutes.CATEGORY>>()
      .params;
  const groups = categoryGroups(category);
  const [filter, setFilter] = useState(ALL);
  const hasFilters = groups.length > 1;
  const scroll = useFeedScroll();
  const visible =
    filter === ALL ? groups : groups.filter(({ title }) => title === filter);

  return (
    <Box twClassName="flex-1 bg-default">
      <GlassHeader title={category} onBack={() => navigation.goBack()} />
      <ScrollView
        stickyHeaderIndices={hasFilters ? [0] : undefined}
        contentContainerStyle={tw.style('gap-6 pb-12')}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={scroll?.notify}
      >
        {hasFilters ? (
          <Box twClassName="bg-default py-2">
            <MarginFades>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={tw.style('gap-2 px-4')}
              >
                {[ALL, ...groups.map(({ title }) => title)].map((title) => (
                  <Chip
                    key={title}
                    label={title}
                    iconName={
                      title === ALL
                        ? CATEGORY_ICONS[category]
                        : leagueIcon(title)
                    }
                    isSelected={filter === title}
                    onPress={() => setFilter(title)}
                  />
                ))}
              </ScrollView>
            </MarginFades>
          </Box>
        ) : null}
        {visible.length ? (
          visible.map((group) => (
            <Box key={group.title} twClassName="gap-3 px-4">
              {hasFilters ? (
                <Text variant={TextVariant.HeadingSm}>{group.title}</Text>
              ) : null}
              {group.events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </Box>
          ))
        ) : (
          <Box twClassName="items-center gap-1 px-4 pt-16">
            <Text variant={TextVariant.HeadingSm}>No markets yet</Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {`New ${category} markets will show up here.`}
            </Text>
          </Box>
        )}
      </ScrollView>
    </Box>
  );
};

/** Drilldown from a category pill: every event in it, filtered by group. */
export const CategoryScreen = () => (
  <FeedScrollProvider>
    <CategoryContent />
  </FeedScrollProvider>
);
