import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { ActivityDetailsMetadata } from './ActivityDetailsMetadata';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';

jest.mock('../../../../core/ClipboardManager', () => ({
  setString: jest.fn(),
}));

const makeItem = (
  overrides: Partial<ActivityListItem> = {},
): ActivityListItem =>
  ({
    type: 'send',
    chainId: 'eip155:1',
    status: 'success',
    timestamp: 1,
    hash: '0xabc0000000000000000000000000000000000000000000000000000000abcdef',
    data: { from: '0xfrom', to: '0xto' },
    ...overrides,
  }) as ActivityListItem;

describe('ActivityDetailsMetadata', () => {
  it('renders a copyable transaction id', () => {
    const { getByTestId } = renderWithProvider(
      <ActivityDetailsMetadata item={makeItem()} />,
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.TRANSACTION_ID_COPY),
    ).toBeOnTheScreen();
  });

  it('shows From and To rows for a standard transfer', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <ActivityDetailsMetadata item={makeItem()} />,
    );

    expect(getByTestId(ActivityDetailsSelectorsIDs.FROM_ROW)).toBeOnTheScreen();
    expect(getByTestId(ActivityDetailsSelectorsIDs.TO_ROW)).toBeOnTheScreen();
    expect(queryByTestId(ActivityDetailsSelectorsIDs.ADDRESS_ROW)).toBeNull();
  });

  it('shows a single Address row (no From/To) for a smart account upgrade', () => {
    const item = makeItem({
      type: 'smartAccountUpgrade',
      data: { from: '0xacct', to: '0xacct' },
    } as Partial<ActivityListItem>);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <ActivityDetailsMetadata item={item} />,
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.ADDRESS_ROW),
    ).toBeOnTheScreen();
    expect(queryByTestId(ActivityDetailsSelectorsIDs.FROM_ROW)).toBeNull();
    expect(queryByTestId(ActivityDetailsSelectorsIDs.TO_ROW)).toBeNull();
  });
});
