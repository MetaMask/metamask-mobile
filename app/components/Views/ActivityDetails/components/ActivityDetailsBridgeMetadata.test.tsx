import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { ActivityDetailsBridgeMetadata } from './ActivityDetailsBridgeMetadata';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';

jest.mock('../../../../core/ClipboardManager', () => ({
  setString: jest.fn(),
}));

type BridgeItem = Extract<ActivityListItem, { type: 'bridge' }>;

const makeBridgeItem = (overrides: Partial<BridgeItem> = {}): BridgeItem =>
  ({
    type: 'bridge',
    chainId: 'eip155:1',
    status: 'success',
    timestamp: 1,
    hash: '0xabc0000000000000000000000000000000000000000000000000000000abcdef',
    data: {
      sourceToken: { symbol: 'ETH', amount: '0.085', direction: 'out' },
      destinationToken: { symbol: 'ETH', amount: '0.085', direction: 'in' },
    },
    ...overrides,
  }) as BridgeItem;

describe('ActivityDetailsBridgeMetadata', () => {
  it('renders status, date, network route, and a copyable transaction id', () => {
    const { getByTestId } = renderWithProvider(
      <ActivityDetailsBridgeMetadata
        item={makeBridgeItem()}
        bridgeHistoryItem={undefined}
        destinationChainId="eip155:59144"
      />,
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.STATUS_ROW),
    ).toBeOnTheScreen();
    expect(getByTestId(ActivityDetailsSelectorsIDs.DATE_ROW)).toBeOnTheScreen();
    expect(
      getByTestId(ActivityDetailsSelectorsIDs.NETWORK_ROW),
    ).toBeOnTheScreen();

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.TRANSACTION_ID_ROW),
    ).toBeOnTheScreen();
    expect(
      getByTestId(ActivityDetailsSelectorsIDs.TRANSACTION_ID_COPY),
    ).toBeOnTheScreen();
  });

  it('collapses the transaction id row when the item has no hash', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <ActivityDetailsBridgeMetadata
        item={makeBridgeItem({ hash: '' } as Partial<BridgeItem>)}
        bridgeHistoryItem={undefined}
        destinationChainId="eip155:59144"
      />,
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.STATUS_ROW),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(ActivityDetailsSelectorsIDs.TRANSACTION_ID_ROW),
    ).toBeNull();
    expect(
      queryByTestId(ActivityDetailsSelectorsIDs.TRANSACTION_ID_COPY),
    ).toBeNull();
  });
});
