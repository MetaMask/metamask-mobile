import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontFamily,
  FontWeight,
  HeaderStandard,
  IconName,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import {
  CRYPTO_EVENTS,
  FEED_SECTIONS,
  FEED_STATS,
  GAME_EVENTS,
  formatUsd,
  getProtoEvent,
  type ProtoCryptoEvent,
  type ProtoGameEvent,
} from '../fixtures';
import {
  FeedSectionTitle,
  GlassNav,
  IconTile,
  MarginFades,
  SheenSurface,
} from '../components';
import {
  BasketballIcon,
  BookOpenIcon,
  CaretLeftIcon,
  ChartLineUpIcon,
  CurrencyBtcIcon,
  DesktopIcon,
  DownloadSimpleIcon,
  FootballIcon,
  GlobeIcon,
  MagnifyingGlassIcon,
  MicrophoneStageIcon,
  MoneyIcon,
  PlusIcon,
  SlidersHorizontalIcon,
} from '../assets/icons';
import {
  FEED_TRENDING_HEIGHT,
  FeedCryptoCard,
  FeedGameCard,
  FeedStandardCard,
} from '../feedCards';
import { PhosphorIcon } from '../feedUi';
import { useCryptoRound } from '../simulation';
import {
  ProtoRoutes,
  useOpenCategory,
  useOpenEvent,
  useProtoNavigation,
} from '../navigation';
import { FeedScrollProvider, useFeedScroll } from '../feedScroll';
import { usePrototypeState } from '../PrototypeState';

/** Figma (393pt frame): 16pt side padding, 16pt gap between carousel cards. */
const CARD_GAP = 16;
/** Figma: the 320pt card leaves 73pt of the frame, so the next card peeks in. */
const HERO_INSET = 73;
/** Lets the feed settle before the first-time introduction slides up. */
const INTRO_DELAY_MS = 600;

const ONBOARDING_STEPS: { icon: IconName; label: string }[] = [
  { icon: IconName.SecurityTick, label: 'Quick security check' },
  { icon: IconName.UserCheck, label: 'Verify your identity with Kalshi' },
  { icon: IconName.Predictions, label: 'Add funds and make a prediction' },
];

type PhosphorSvg = React.ComponentProps<typeof PhosphorIcon>['icon'];

/** Header control: a Phosphor icon centred in the glass pill. */
const NavButton = ({
  icon,
  name,
  label,
  onPress,
}: {
  icon: PhosphorSvg;
  name: string;
  label: string;
  onPress: () => void;
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={tw.style('h-10 w-10 items-center justify-center')}
    >
      <PhosphorIcon
        icon={icon}
        label={name}
        size={20}
        color={colors.icon.default}
      />
    </Pressable>
  );
};

const ActionTile = ({
  icon,
  name,
  label,
  badge,
  onPress,
}: {
  icon: PhosphorSvg;
  name: string;
  label: string;
  badge?: number;
  onPress: () => void;
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={tw.style('flex-1')}
    >
      <SheenSurface
        radius="rounded-xl"
        twClassName="items-center gap-0.5 p-3"
        style={tw.style('flex-1')}
      >
        <Box twClassName="h-8 w-8 items-center justify-center">
          <PhosphorIcon
            icon={icon}
            label={name}
            size={24}
            color={colors.icon.default}
          />
          {badge ? (
            <Box
              testID={`action-tile-badge-${name}`}
              twClassName="absolute -right-2 -top-1 h-4 min-w-4 items-center justify-center rounded-full bg-error-default px-1"
            >
              <Text
                variant={TextVariant.BodyXs}
                fontWeight={FontWeight.Bold}
                color={TextColor.ErrorInverse}
                twClassName="leading-4"
              >
                {badge}
              </Text>
            </Box>
          ) : null}
        </Box>
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
          {label}
        </Text>
      </SheenSurface>
    </Pressable>
  );
};

interface FeedCategory {
  label: string;
  icon: PhosphorSvg;
  name: string;
  /** Category page to open. Trending is the feed itself. */
  category?: string;
}

/** Two rows of chips, as in Figma. Football and Basketball both open Sports. */
const FEED_CATEGORY_ROWS: FeedCategory[][] = [
  [
    { label: 'Trending', icon: ChartLineUpIcon, name: 'chart-line-up' },
    {
      label: 'Football',
      icon: FootballIcon,
      name: 'football',
      category: 'Sports',
    },
    {
      label: 'Basketball',
      icon: BasketballIcon,
      name: 'basketball',
      category: 'Sports',
    },
    { label: 'Finance', icon: MoneyIcon, name: 'money', category: 'Finance' },
  ],
  [
    {
      label: 'Crypto',
      icon: CurrencyBtcIcon,
      name: 'currency-btc',
      category: 'Crypto',
    },
    { label: 'Politics', icon: GlobeIcon, name: 'globe', category: 'Politics' },
    {
      label: 'Culture',
      icon: MicrophoneStageIcon,
      name: 'microphone-stage',
      category: 'Culture',
    },
    { label: 'Tech', icon: DesktopIcon, name: 'desktop', category: 'Tech' },
  ],
];

const CategoryChip = ({
  item,
  onPress,
}: {
  item: FeedCategory;
  onPress: () => void;
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) =>
        tw.style(
          'h-10 flex-row items-center gap-1.5 rounded-full border-2 border-muted px-3',
          pressed ? 'bg-pressed' : 'bg-elevated1',
        )
      }
    >
      <PhosphorIcon
        icon={item.icon}
        label={item.name}
        size={16}
        color={colors.icon.default}
      />
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {item.label}
      </Text>
    </Pressable>
  );
};

/** Sign-up as part of the feed, in the same card language as the markets around it. */
const OnboardingCard = ({ onStart }: { onStart: () => void }) => (
  <Box twClassName="gap-3 px-4">
    <Box twClassName="gap-1">
      <Text variant={TextVariant.HeadingMd}>Start predicting</Text>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
      >
        Set up takes about two minutes.
      </Text>
    </Box>
    <SheenSurface twClassName="gap-4 p-4">
      {ONBOARDING_STEPS.map((step) => (
        <Box key={step.label} twClassName="flex-row items-center gap-3">
          <IconTile iconName={step.icon} size={32} />
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            twClassName="min-w-0 flex-1"
          >
            {step.label}
          </Text>
        </Box>
      ))}
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={onStart}
      >
        Get started
      </Button>
    </SheenSurface>
  </Box>
);

const feedGame = (id: string) => getProtoEvent(id) as ProtoGameEvent;

const FeedContent = () => {
  const tw = useTailwind();
  const navigation = useProtoNavigation();
  const openEvent = useOpenEvent();
  const openCategory = useOpenCategory();
  const state = usePrototypeState();
  const { width } = useWindowDimensions();
  const [trendingIndex, setTrendingIndex] = useState(0);
  const heroWidth = width - HERO_INSET;
  const scroll = useFeedScroll();
  const { isSignedIn, hasSeenIntro, openIntro } = state;

  // One round per asset, shared by its Trending and Crypto cards so both
  // always show the same odds and clock.
  const btc: ProtoCryptoEvent = CRYPTO_EVENTS[0];
  const eth: ProtoCryptoEvent = CRYPTO_EVENTS[1];
  const btcRound = useCryptoRound(btc);
  const ethRound = useCryptoRound(eth);
  const trendingGame = feedGame('car-phi');
  const liveGame = feedGame('buf-lar');
  const upcomingGame = feedGame('nd-byu');

  useEffect(() => {
    if (isSignedIn || hasSeenIntro) return undefined;
    const id = setTimeout(openIntro, INTRO_DELAY_MS);
    return () => clearTimeout(id);
  }, [hasSeenIntro, isSignedIn, openIntro]);

  const trending = [
    <FeedGameCard
      key="game"
      variant="trending"
      event={trendingGame}
      width={heroWidth}
      stats={FEED_STATS.trendingGame}
      onPress={() => openEvent(trendingGame)}
      onOrder={state.openOrder}
      onComments={state.openComments}
    />,
    <FeedCryptoCard
      key="btc"
      variant="trending"
      event={btc}
      round={btcRound}
      width={heroWidth}
      stats={FEED_STATS.trendingBtc}
      onPress={() => openEvent(btc)}
      onOrder={state.openOrder}
      onComments={state.openComments}
    />,
    <FeedCryptoCard
      key="eth"
      variant="trending"
      event={eth}
      round={ethRound}
      width={heroWidth}
      stats={FEED_STATS.trendingEth}
      onPress={() => openEvent(eth)}
      onOrder={state.openOrder}
      onComments={state.openComments}
    />,
  ];

  const handleTrendingScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const index = Math.round(
      event.nativeEvent.contentOffset.x / (heroWidth + CARD_GAP),
    );
    setTrendingIndex(Math.max(0, Math.min(trending.length - 1, index)));
  };

  return (
    <Box twClassName="flex-1 bg-default">
      <HeaderStandard
        includesTopInset
        startAccessory={
          <GlassNav twClassName="w-10 justify-center">
            <NavButton
              icon={CaretLeftIcon}
              name="caret-left"
              label="Back"
              onPress={() => navigation.goBack()}
            />
          </GlassNav>
        }
        endAccessory={
          <GlassNav>
            <NavButton
              icon={SlidersHorizontalIcon}
              name="sliders-horizontal"
              label="Filter"
              onPress={() => undefined}
            />
            <NavButton
              icon={MagnifyingGlassIcon}
              name="magnifying-glass"
              label="Search"
              onPress={() => undefined}
            />
          </GlassNav>
        }
      />
      <ScrollView
        contentContainerStyle={tw.style('pt-2 gap-6 pb-12')}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={scroll?.notify}
      >
        <Box twClassName="gap-4">
          <Pressable
            onLongPress={state.resetPrototype}
            delayLongPress={800}
            accessibilityHint="Long press to reset the prototype"
            style={tw.style('px-4')}
          >
            <Text variant={TextVariant.HeadingLg} fontFamily={FontFamily.Hero}>
              Predictions
            </Text>
            {isSignedIn ? (
              <Box twClassName="mt-2">
                <Text
                  variant={TextVariant.AmountDisplayLg}
                  fontFamily={FontFamily.Hero}
                >
                  {formatUsd(state.balance)}
                </Text>
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Regular}
                  color={TextColor.TextAlternative}
                >
                  Available balance
                </Text>
              </Box>
            ) : null}
          </Pressable>
          {isSignedIn ? (
            <Box twClassName="flex-row gap-3 px-4">
              <ActionTile
                icon={BookOpenIcon}
                name="book-open"
                label="Positions"
                badge={state.positions.length || undefined}
                onPress={() => navigation.push(ProtoRoutes.POSITIONS)}
              />
              <ActionTile
                icon={PlusIcon}
                name="plus"
                label="Add funds"
                onPress={() => state.openFunds('add')}
              />
              <ActionTile
                icon={DownloadSimpleIcon}
                name="download-simple"
                label="Withdraw"
                onPress={() => state.openFunds('withdraw')}
              />
            </Box>
          ) : null}
        </Box>

        <SectionDivider />

        <Box twClassName="gap-4">
          <FeedSectionTitle title="Trending" />
          <Box twClassName="gap-4">
            <MarginFades>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={heroWidth + CARD_GAP}
                decelerationRate="fast"
                scrollEventThrottle={16}
                onScroll={scroll?.notify}
                onMomentumScrollEnd={handleTrendingScroll}
                contentContainerStyle={tw.style('gap-4 px-4')}
                style={{ minHeight: FEED_TRENDING_HEIGHT }}
              >
                {trending}
              </ScrollView>
            </MarginFades>
            <Box twClassName="flex-row justify-center gap-1">
              {trending.map((card, index) => (
                <Box
                  key={card.key}
                  twClassName={`h-1 rounded-full ${
                    index === trendingIndex
                      ? 'w-6 bg-icon-default'
                      : 'w-1 bg-muted'
                  }`}
                />
              ))}
            </Box>
          </Box>
        </Box>

        {isSignedIn ? null : <OnboardingCard onStart={state.startKyc} />}

        <SectionDivider />

        <MarginFades>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw.style('gap-2 px-4')}
          >
            <Box twClassName="gap-2">
              {FEED_CATEGORY_ROWS.map((row) => (
                <Box key={row[0].label} twClassName="flex-row gap-2">
                  {row.map((item) => (
                    <CategoryChip
                      key={item.label}
                      item={item}
                      onPress={() =>
                        item.category ? openCategory(item.category) : undefined
                      }
                    />
                  ))}
                </Box>
              ))}
            </Box>
          </ScrollView>
        </MarginFades>

        <Box twClassName="gap-4">
          <FeedSectionTitle
            title="Football"
            onPress={() => openCategory('Sports')}
          />
          <Box twClassName="gap-4 px-4">
            <FeedGameCard
              variant="list"
              event={liveGame}
              stats={FEED_STATS.liveGame}
              onPress={() => openEvent(liveGame)}
              onOrder={state.openOrder}
              onComments={state.openComments}
            />
            <FeedGameCard
              variant="list"
              event={upcomingGame}
              stats={FEED_STATS.upcomingGame}
              onPress={() => openEvent(upcomingGame)}
              onOrder={state.openOrder}
              onComments={state.openComments}
            />
          </Box>
        </Box>

        <SectionDivider />

        <Box twClassName="gap-4">
          <FeedSectionTitle
            title="Crypto"
            onPress={() => openCategory('Crypto')}
          />
          <Box twClassName="gap-4 px-4">
            <FeedCryptoCard
              variant="list"
              event={btc}
              round={btcRound}
              stats={FEED_STATS.cryptoBtc}
              onPress={() => openEvent(btc)}
              onOrder={state.openOrder}
              onComments={state.openComments}
            />
            <FeedCryptoCard
              variant="list"
              event={eth}
              round={ethRound}
              stats={FEED_STATS.cryptoEth}
              onPress={() => openEvent(eth)}
              onOrder={state.openOrder}
              onComments={state.openComments}
            />
          </Box>
        </Box>

        {FEED_SECTIONS.map((section) => (
          <Box key={section.title} twClassName="gap-4">
            <FeedSectionTitle
              title={section.title}
              onPress={() => openCategory(section.title)}
            />
            <Box twClassName="gap-3 px-4">
              {section.eventIds.map((id) => {
                const event = getProtoEvent(id);
                if (!event || event.kind !== 'standard') return null;
                return (
                  <FeedStandardCard
                    key={id}
                    event={event}
                    onPress={() => openEvent(event)}
                    onOrder={state.openOrder}
                  />
                );
              })}
            </Box>
          </Box>
        ))}
      </ScrollView>
    </Box>
  );
};

export const FeedScreen = () => (
  <FeedScrollProvider>
    <FeedContent />
  </FeedScrollProvider>
);
