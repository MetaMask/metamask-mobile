import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createUIQueryClient } from '@metamask/react-data-query';
import { KALSHI_STATIC_VENUE_CATALOG } from '../config/venueCatalogs';
import type { PredictEvent, PredictFeedId } from '../types';

export const KALSHI_SPORTS_FEED_ID = KALSHI_STATIC_VENUE_CATALOG.feeds
  .sports as PredictFeedId;

export interface DataServiceFixture {
  catalog?: unknown;
  feed?: readonly PredictEvent[] | Error;
  search?: readonly PredictEvent[] | Error;
}

/**
 * A messenger standing in for the Predict data services: it serves the
 * Venue catalog, Feeds and search, and records every call. Only
 * `PredictMarketDataService` actions reach it, as in the app.
 */
export const createDataServiceMessenger = (fixture: DataServiceFixture) => {
  const answer = (value: unknown) =>
    value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
  const call = jest.fn((action: string, ...params: unknown[]) => {
    switch (action) {
      case 'PredictMarketDataService:getVenueCatalog':
        return answer(fixture.catalog ?? KALSHI_STATIC_VENUE_CATALOG);
      case 'PredictMarketDataService:getFeed': {
        const events = fixture.feed ?? [];
        return events instanceof Error
          ? answer(events)
          : answer({
              venueId: 'kalshi',
              id: params[1],
              title: 'Feed',
              events,
            });
      }
      case 'PredictMarketDataService:searchEvents': {
        const events = fixture.search ?? [];
        return events instanceof Error
          ? answer(events)
          : answer({ venueId: 'kalshi', events });
      }
      default:
        return Promise.resolve(undefined);
    }
  });

  return { call, subscribe: jest.fn(), unsubscribe: jest.fn() };
};

export type DataServiceMessenger = ReturnType<
  typeof createDataServiceMessenger
>;

/** Calls the messenger received for one data-service action. */
export const callsTo = (messenger: DataServiceMessenger, action: string) =>
  messenger.call.mock.calls.filter(([name]) => name === action);

/**
 * Wraps hooks in the app's UI query client over `messenger`, so reads and
 * invalidations travel the same path as in the app.
 */
export const createDataServiceWrapper = (messenger: DataServiceMessenger) => {
  const queryClient = createUIQueryClient(
    ['PredictMarketDataService'],
    messenger as never,
    { defaultOptions: { queries: { retry: false, gcTime: Infinity } } },
  );
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

/** A minimal Kalshi Event with one active binary Market. */
export const makeKalshiEvent = (id: string, title = `Event ${id}`) =>
  ({
    venueId: 'kalshi',
    id,
    title,
    markets: [
      {
        id: `${id}-market`,
        question: title,
        status: 'active',
        outcomes: [
          { id: `${id}-yes`, side: 'yes', label: 'Yes', askPrice: '0.6' },
          { id: `${id}-no`, side: 'no', label: 'No', askPrice: '0.4' },
        ],
      },
    ],
  }) as unknown as PredictEvent;
