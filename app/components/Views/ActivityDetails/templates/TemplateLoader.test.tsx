import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { TemplateLoader } from './TemplateLoader';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';

// The amount header relies on the redesigned list's content resolver, which
// reads many selectors; stub it so these tests focus on template dispatch.
jest.mock(
  '../../../UI/ActivityListItemRow/useActivityListItemRowContent',
  () => ({
    useActivityListItemRowContent: () => ({
      avatarTokens: [],
      primaryAmount: '-1 ETH',
      secondaryAmount: undefined,
      primaryToken: { direction: 'out' },
      secondaryToken: undefined,
      title: 'Sent',
      subtitle: undefined,
    }),
  }),
);

jest.mock('../../../../selectors/bridgeStatusController', () => ({
  selectBridgeHistoryForAccount: jest.fn(() => ({})),
}));

const sendItem: ActivityListItem = {
  type: 'send',
  chainId: 'eip155:1',
  status: 'success',
  timestamp: 1,
  hash: '0xhash',
  data: {
    from: '0xfrom',
    to: '0xto',
    token: {
      amount: '1000000000000000000',
      decimals: 18,
      symbol: 'ETH',
      direction: 'out',
    },
  },
} as ActivityListItem;

const contractItem: ActivityListItem = {
  type: 'contractInteraction',
  chainId: 'eip155:1',
  status: 'success',
  timestamp: 1,
  hash: '0xhash2',
  data: { from: '0xfrom', to: '0xto' },
} as ActivityListItem;

describe('TemplateLoader', () => {
  it('renders nothing when there is no item', () => {
    const { toJSON } = renderWithProvider(<TemplateLoader item={undefined} />);
    expect(toJSON()).toBeNull();
  });

  it('renders the SendDetails template (with total row) for send/receive', () => {
    const { getByTestId } = renderWithProvider(
      <TemplateLoader item={sendItem} />,
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.AMOUNT_HEADER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(ActivityDetailsSelectorsIDs.STATUS_ROW),
    ).toBeOnTheScreen();
    expect(
      getByTestId(ActivityDetailsSelectorsIDs.TOTAL_ROW),
    ).toBeOnTheScreen();
  });

  it('falls back to DefaultDetails for unmapped types (no total row)', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <TemplateLoader item={contractItem} />,
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.AMOUNT_HEADER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(ActivityDetailsSelectorsIDs.STATUS_ROW),
    ).toBeOnTheScreen();
    expect(queryByTestId(ActivityDetailsSelectorsIDs.TOTAL_ROW)).toBeNull();
  });
});
