import React, { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { createUIQueryClient } from '@metamask/react-data-query';
import { QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  portfolioQueries,
  PORTFOLIO_PAGE_LIMIT,
  PORTFOLIO_POSITIONS_STALE_TIME,
} from '../../../../queries/portfolioQueries';
import type { PredictEvent, PredictPositionsPage } from '../../../../types';
import { EventMarketList } from './EventMarketList';
import {
  makeStoryGameEvent,
  makeStoryPositions,
  makeStoryStandardEvent,
} from './EventMarketList.stories-fixtures';

type PositionsScenario = 'cached' | 'delayed' | 'empty' | 'countChanges';

interface EventMarketListStoryProps {
  event: PredictEvent;
  positionsScenario: PositionsScenario;
  width?: number;
}

const createStoryQuery = (event: PredictEvent, scenario: PositionsScenario) => {
  let initialCount = event.markets.length;
  if (scenario === 'empty') {
    initialCount = 0;
  } else if (scenario === 'countChanges') {
    initialCount = 1;
  }
  let positions = makeStoryPositions(event, initialCount);
  let resolvePositions: (page: PredictPositionsPage) => void = () => undefined;
  const pendingPage = new Promise<PredictPositionsPage>((resolve) => {
    resolvePositions = resolve;
  });
  const queryKey = portfolioQueries.getPositions(event.venueId, {
    limit: PORTFOLIO_PAGE_LIMIT,
  }).queryKey;
  const client = createUIQueryClient(
    ['PredictPortfolioService'],
    {
      call: (action, _venueId, _params, cursor) => {
        if (action === 'PredictPortfolioService:invalidateQueries') {
          return undefined;
        }
        if (action !== 'PredictPortfolioService:getPositions') {
          throw new Error(`Unexpected story action: ${action}`);
        }
        if (scenario === 'delayed') {
          return pendingPage;
        }
        const offset = typeof cursor === 'string' ? Number(cursor) : 0;
        return {
          venueId: event.venueId,
          positions: positions.slice(offset, offset + PORTFOLIO_PAGE_LIMIT),
          nextCursor:
            offset + PORTFOLIO_PAGE_LIMIT < positions.length
              ? `${offset + PORTFOLIO_PAGE_LIMIT}`
              : undefined,
        };
      },
      subscribe: () => undefined,
      unsubscribe: () => undefined,
    },
    {
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: PORTFOLIO_POSITIONS_STALE_TIME,
          gcTime: Infinity,
        },
      },
    },
  );
  const cachePositions = () => {
    const pages: PredictPositionsPage[] = [];
    const pageParams: (string | undefined)[] = [];
    for (
      let offset = 0;
      offset < Math.max(positions.length, 1);
      offset += PORTFOLIO_PAGE_LIMIT
    ) {
      pages.push({
        venueId: event.venueId,
        positions: positions.slice(offset, offset + PORTFOLIO_PAGE_LIMIT),
        ...(offset + PORTFOLIO_PAGE_LIMIT < positions.length
          ? { nextCursor: `${offset + PORTFOLIO_PAGE_LIMIT}` }
          : {}),
      });
      pageParams.push(offset === 0 ? undefined : `${offset}`);
    }
    client.setQueryData<InfiniteData<PredictPositionsPage>>(queryKey, {
      pages,
      pageParams,
    });
  };
  if (scenario === 'cached' || scenario === 'countChanges') {
    cachePositions();
  }

  return {
    client,
    loadPositions: () =>
      resolvePositions({ venueId: event.venueId, positions }),
    setCount: (count: number) => {
      positions = makeStoryPositions(event, count);
      cachePositions();
    },
  };
};

const EventMarketListStory = ({
  event,
  positionsScenario,
  width,
}: EventMarketListStoryProps) => {
  const [query] = useState(() => createStoryQuery(event, positionsScenario));
  const [lastAction, setLastAction] = useState('No action selected');
  const [positionsLoaded, setPositionsLoaded] = useState(false);
  useEffect(
    () => () => {
      query.loadPositions();
      query.client.clear();
    },
    [query],
  );

  return (
    <QueryClientProvider client={query.client}>
      <Box
        twClassName="flex-1 w-full max-w-full self-center bg-default"
        style={width === undefined ? undefined : { width }}
      >
        <EventMarketList
          event={event}
          onOrder={(market, outcome) =>
            setLastAction(`Order: ${market.question} / ${outcome.label}`)
          }
          onRulesPress={(market) => setLastAction(`Rules: ${market.question}`)}
          onCashOut={(position) =>
            setLastAction(`Cash Out: ${position.marketId} / ${position.side}`)
          }
        >
          <Box paddingVertical={4} gap={3}>
            <Text variant={TextVariant.HeadingMd}>{event.title}</Text>
            <Text variant={TextVariant.BodySm} accessibilityLiveRegion="polite">
              {lastAction}. Synthetic data only; no navigation or financial
              writes.
            </Text>
            {positionsScenario === 'delayed' ? (
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Sm}
                isDisabled={positionsLoaded}
                onPress={() => {
                  query.loadPositions();
                  setPositionsLoaded(true);
                }}
              >
                Load Positions
              </Button>
            ) : null}
            {positionsScenario === 'countChanges' ? (
              <Box twClassName="flex-row flex-wrap gap-2">
                {[0, 1, 10, 99, 100].map((count) => (
                  <Button
                    key={count}
                    variant={ButtonVariant.Secondary}
                    size={ButtonSize.Sm}
                    onPress={() => query.setCount(count)}
                  >
                    {`${count} holdings`}
                  </Button>
                ))}
              </Box>
            ) : null}
          </Box>
        </EventMarketList>
      </Box>
    </QueryClientProvider>
  );
};

const standardEvent = makeStoryStandardEvent();
const gameEvent = makeStoryGameEvent();
const largeEvent = makeStoryStandardEvent(120);

const meta = {
  title: 'PredictNext / EventMarketList',
  component: EventMarketListStory,
  args: { event: standardEvent, positionsScenario: 'empty' },
  argTypes: {
    event: { control: false },
    positionsScenario: { control: false },
    width: { control: 'number' },
  },
  render: (args) => (
    <EventMarketListStory
      key={JSON.stringify([
        args.event.venueId,
        args.event.id,
        args.positionsScenario,
      ])}
      {...args}
    />
  ),
  parameters: {
    notes:
      'One vertical list with a static header. Uses the real Positions hook and an isolated messenger-backed query client. Cached holdings select Positions first; press the Market tab to inspect its cards. Test both system themes and native font scaling. Disable network to check cached-only behavior. Exact Figma, native accessibility, and performance are not verified by these stories.',
  },
} satisfies Meta<typeof EventMarketListStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StandardEmptyPositions: Story = {};
export const StandardCachedPositions: Story = {
  args: { positionsScenario: 'cached' },
};
export const SportsGameLines: Story = {
  args: { event: gameEvent },
};
export const SportsCachedPositions: Story = {
  args: { event: gameEvent, positionsScenario: 'cached' },
};
export const DelayedPositions: Story = {
  args: { event: gameEvent, positionsScenario: 'delayed' },
  parameters: {
    notes:
      'Markets stay selected when Load Positions resolves the pending query. Select Positions explicitly, then return to Game Lines and check alternate-line selection.',
  },
};
export const CountWidthChanges: Story = {
  args: { event: largeEvent, positionsScenario: 'countChanges' },
  parameters: {
    notes:
      'Select either panel, then change holdings through 1, 10, 99, and 100 (99+). A valid panel stays selected; zero removes Positions and falls back to Outcome. Only query cache data changes.',
  },
};
export const NarrowWithSystemLargeText: Story = {
  args: { event: largeEvent, positionsScenario: 'countChanges', width: 320 },
  parameters: {
    notes:
      '320-point viewport. Set the device system text size to the largest supported size; this story does not fake font scaling. Check horizontal tab reachability, count growth/shrink, one vertical scroll surface, and Cash Out/rules reachability in light and dark themes.',
  },
};
export const LargeCachedPortfolio: Story = {
  args: { event: largeEvent, positionsScenario: 'cached' },
  parameters: {
    notes:
      '120 Markets and 120 cached holdings across six pages. The fifth-page discovery cap does not truncate available cached pages. Compare repeated panel switching, scrolling, and memory on Android; record the build, hardware/network tiers, and measurements rather than inferring performance from Jest.',
  },
};
