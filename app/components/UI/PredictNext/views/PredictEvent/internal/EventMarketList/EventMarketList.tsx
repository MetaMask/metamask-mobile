import React, { useCallback, useMemo, useState } from 'react';
import { BadgeCount, Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import TabsBar from '../../../../../../../component-library/components-temp/Tabs/TabsBar';
import { strings } from '../../../../../../../../locales/i18n';
import { PREDICT_MARKET_TYPES } from '../../../../constants';
import { getEventGame } from '../../../../events/game';
import {
  MarketList,
  MarketStandardCard,
  SpreadMarketGroupCard,
  TotalMarketGroupCard,
} from '../../../../events/markets';
import type { PredictMarket } from '../../../../types';
import {
  createMarketGroupProjection,
  type MarketGroupProjection,
} from '../createMarketGroupProjection';
import { EventMarketListTestIds } from './EventMarketList.testIds';
import type { EventMarketListProps } from './EventMarketList.types';
import { useEventPositions } from './useEventPositions';

const getMarketKey = (projection: MarketGroupProjection): string =>
  projection.type === 'group'
    ? `group:${projection.key}`
    : `market:${projection.market.id}`;

const EventMarketListContent = ({
  event,
  onOrder,
  onRulesPress,
  children,
  testID = EventMarketListTestIds.ROOT,
}: EventMarketListProps) => {
  const tw = useTailwind();
  const positions = useEventPositions(event);
  const [selectedMarketIds, setSelectedMarketIds] = useState<
    Record<string, PredictMarket['id']>
  >({});
  const markets = useMemo(
    () => createMarketGroupProjection(event.markets),
    [event.markets],
  );
  const contentContainerStyle = useMemo(() => tw.style('px-4'), [tw]);
  const handleGroupMarketSelect = useCallback(
    (groupKey: string, marketId: PredictMarket['id']) => {
      setSelectedMarketIds((current) => ({ ...current, [groupKey]: marketId }));
    },
    [],
  );
  const renderMarket = useCallback(
    (projection: MarketGroupProjection) => {
      if (projection.type === 'standard') {
        return (
          <MarketStandardCard
            market={projection.market}
            onOrder={onOrder}
            onRulesPress={onRulesPress}
          />
        );
      }

      const selectedMarket =
        projection.markets.find(
          (market) => market.id === selectedMarketIds[projection.key],
        ) ?? projection.markets[0];
      if (!selectedMarket) {
        return null;
      }

      const groupProps = {
        groupKey: projection.key,
        markets: projection.markets,
        selectedMarket,
        onSelectMarket: (marketId: PredictMarket['id']) =>
          handleGroupMarketSelect(projection.key, marketId),
        onOrder,
        onRulesPress,
      };

      return projection.marketType === PREDICT_MARKET_TYPES.TOTAL ? (
        <TotalMarketGroupCard {...groupProps} />
      ) : (
        <SpreadMarketGroupCard {...groupProps} />
      );
    },
    [handleGroupMarketSelect, onOrder, onRulesPress, selectedMarketIds],
  );

  return (
    <MarketList
      testID={testID}
      data={markets}
      extraData={selectedMarketIds}
      keyExtractor={getMarketKey}
      renderItem={renderMarket}
      contentContainerStyle={contentContainerStyle}
      ListHeaderComponent={
        <Box>
          {children}
          {markets.length > 0 ? (
            <TabsBar
              testID={EventMarketListTestIds.TABS}
              twClassName="-mx-4 mb-4"
              tabs={[
                ...(positions.length > 0
                  ? [
                      {
                        key: 'positions',
                        label: strings('predict_next.portfolio.positions'),
                        content: null,
                        testID: EventMarketListTestIds.POSITIONS_TAB,
                        endAccessory: (
                          <BadgeCount count={positions.length} max={99} />
                        ),
                      },
                    ]
                  : []),
                {
                  key: 'markets',
                  label: strings(
                    getEventGame(event)
                      ? 'predict_next.event.game_lines'
                      : 'predict_next.event.outcome',
                  ),
                  content: null,
                  testID: EventMarketListTestIds.MARKETS_TAB,
                },
              ]}
              activeIndex={positions.length > 0 ? 1 : 0}
              onTabPress={() => undefined}
            />
          ) : null}
        </Box>
      }
    />
  );
};

/** Owns Event content while leaving charts, navigation, and workflows outside. */
export const EventMarketList = (props: EventMarketListProps) => (
  <EventMarketListContent
    key={JSON.stringify([props.event.venueId, props.event.id])}
    {...props}
  />
);
